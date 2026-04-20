"""Ingest openFDA Drug Enforcement (recall) reports into the Supply Risk Radar NetApp volume.

Run as a Domino Job on a daily schedule. Uses a watermark so each run only
pulls reports newer than the last successful run.

Layout on the NetApp volume:

    /mnt/netapp-volumes/Supply_Risk_Radar/
      signals_raw/openfda/enforcement/YYYY/MM/DD/<run_id>.jsonl   raw API pages
      signals_curated/openfda_enforcement.parquet                  normalized
      signals_curated/openfda_matched.parquet                      joined to suppliers
      signals_curated/review_queue_openfda.parquet                 low-confidence matches
      state/openfda_watermark.json                                 last run + last date
      state/last_run_openfda.log                                   human-readable log

Writes are idempotent per day: the same (signal_id) key overwrites any earlier
normalized row for that signal.
"""

from __future__ import annotations

import json
import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import pandas as pd
from rapidfuzz import process, fuzz


# ── Configuration ────────────────────────────────────────────────────────────
VOLUME_ROOT = Path(os.environ.get(
    "SRR_VOLUME_ROOT",
    "/mnt/netapp-volumes/Supply_Risk_Radar",
))
RAW_ROOT = VOLUME_ROOT / "signals_raw" / "openfda" / "enforcement"
CURATED_ROOT = VOLUME_ROOT / "signals_curated"
STATE_ROOT = VOLUME_ROOT / "state"

ENFORCEMENT_URL = "https://api.fda.gov/drug/enforcement.json"
PAGE_LIMIT = 100
MAX_PAGES_PER_RUN = 50  # safety cap; 5000 reports per run is plenty
DEFAULT_LOOKBACK_DAYS = 90  # first-ever run backfills this far
MATCH_SCORE_THRESHOLD = 85  # rapidfuzz token_set_ratio cutoff


def _log(msg: str) -> None:
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    line = f"[{stamp}] {msg}"
    print(line, flush=True)
    STATE_ROOT.mkdir(parents=True, exist_ok=True)
    with (STATE_ROOT / "last_run_openfda.log").open("a") as f:
        f.write(line + "\n")


# ── Watermark ────────────────────────────────────────────────────────────────
def read_watermark() -> str:
    path = STATE_ROOT / "openfda_watermark.json"
    if not path.exists():
        default = (datetime.now(timezone.utc) - timedelta(days=DEFAULT_LOOKBACK_DAYS)).strftime("%Y%m%d")
        return default
    try:
        data = json.loads(path.read_text())
        return data.get("last_report_date", "")
    except Exception as e:
        _log(f"watermark read failed, using default lookback: {e}")
        return (datetime.now(timezone.utc) - timedelta(days=DEFAULT_LOOKBACK_DAYS)).strftime("%Y%m%d")


def write_watermark(last_report_date: str, reports_ingested: int) -> None:
    STATE_ROOT.mkdir(parents=True, exist_ok=True)
    (STATE_ROOT / "openfda_watermark.json").write_text(json.dumps({
        "last_report_date": last_report_date,
        "reports_ingested_last_run": reports_ingested,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }, indent=2))


# ── Fetch ────────────────────────────────────────────────────────────────────
def fetch_enforcement_reports(since_yyyymmdd: str, run_id: str) -> list[dict]:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    # openFDA's Lucene parser expects literal spaces around TO. httpx will
    # URL-encode spaces as %20 which openFDA accepts.
    search = f"report_date:[{since_yyyymmdd} TO {today}]"
    all_results: list[dict] = []
    raw_dir = RAW_ROOT / datetime.now(timezone.utc).strftime("%Y/%m/%d")
    raw_dir.mkdir(parents=True, exist_ok=True)

    with httpx.Client(timeout=30.0) as client:
        for page in range(MAX_PAGES_PER_RUN):
            skip = page * PAGE_LIMIT
            params = {"search": search, "limit": PAGE_LIMIT, "skip": skip}
            _log(f"fetching openFDA enforcement page {page} (skip={skip})")
            try:
                resp = client.get(ENFORCEMENT_URL, params=params)
            except Exception as e:
                _log(f"request failed on page {page}: {e}; aborting this run")
                break

            if resp.status_code == 404:
                _log(f"no more results at page {page} (404)")
                break
            if resp.status_code != 200:
                _log(f"HTTP {resp.status_code} on page {page}: {resp.text[:300]}")
                break

            payload = resp.json()
            results = payload.get("results", [])
            if not results:
                break

            # persist raw page
            raw_file = raw_dir / f"{run_id}_p{page:03d}.jsonl"
            with raw_file.open("w") as f:
                for r in results:
                    f.write(json.dumps(r) + "\n")

            all_results.extend(results)
            if len(results) < PAGE_LIMIT:
                break
            time.sleep(0.3)  # be polite to the API

    _log(f"fetched {len(all_results)} enforcement reports since {since_yyyymmdd}")
    return all_results


# ── Normalize ────────────────────────────────────────────────────────────────
def normalize(results: list[dict]) -> pd.DataFrame:
    rows = []
    for r in results:
        rows.append({
            "signal_id": r.get("event_id") or r.get("recall_number") or str(uuid.uuid4()),
            "source": "openfda_enforcement",
            "recalling_firm": (r.get("recalling_firm") or "").strip(),
            "city": (r.get("city") or "").strip(),
            "state": (r.get("state") or "").strip(),
            "country": (r.get("country") or "").strip(),
            "classification": r.get("classification"),
            "status": r.get("status"),
            "product_description": r.get("product_description"),
            "reason_for_recall": r.get("reason_for_recall"),
            "report_date": r.get("report_date"),
            "recall_initiation_date": r.get("recall_initiation_date"),
            "recall_number": r.get("recall_number"),
            "source_url": (
                f"https://api.fda.gov/drug/enforcement.json?search=recall_number:{r.get('recall_number')}"
                if r.get("recall_number") else None
            ),
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        })
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df["event_date"] = pd.to_datetime(df["report_date"], format="%Y%m%d", errors="coerce")
    return df.drop_duplicates(subset=["signal_id"], keep="last")


# ── Supplier matching ────────────────────────────────────────────────────────
def load_suppliers_master() -> pd.DataFrame:
    """Suppliers live at signals_curated/suppliers_master.parquet.

    For first-run bootstrapping, fall back to the app's mock_data.js so this
    job is self-sufficient until Phase 1.1 lands.
    """
    master = CURATED_ROOT / "suppliers_master.parquet"
    if master.exists():
        return pd.read_parquet(master)

    # Bootstrap fallback: read the 25 seeded sites from mock_data.js
    mock_js = Path(__file__).resolve().parent.parent / "static" / "mock_data.js"
    if not mock_js.exists():
        _log("no suppliers_master.parquet and no mock_data.js fallback found")
        return pd.DataFrame(columns=["supplier_id", "name", "city", "country"])

    import re
    text = mock_js.read_text()
    # Extract the MOCK_SUPPLIERS array blob and parse id/name/city/country via regex
    pattern = re.compile(
        r"id:\s*'([^']+)'.*?name:\s*'([^']+)'.*?country:\s*'([^']+)'.*?city:\s*'([^']+)'",
        re.DOTALL,
    )
    rows = []
    for m in pattern.finditer(text):
        rows.append({"supplier_id": m.group(1), "name": m.group(2), "country": m.group(3), "city": m.group(4)})
    df = pd.DataFrame(rows)
    _log(f"bootstrapped {len(df)} suppliers from mock_data.js")
    return df


def match_to_suppliers(signals: pd.DataFrame, suppliers: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    if signals.empty or suppliers.empty:
        return signals.assign(supplier_id=None, match_score=0.0), pd.DataFrame()

    candidates = (suppliers["name"] + " | " + suppliers["city"] + " | " + suppliers["country"]).tolist()
    id_lookup = suppliers["supplier_id"].tolist()

    supplier_ids: list[str | None] = []
    scores: list[float] = []
    for _, row in signals.iterrows():
        query = f"{row['recalling_firm']} | {row['city']} | {row['country']}"
        if not row["recalling_firm"]:
            supplier_ids.append(None)
            scores.append(0.0)
            continue
        match = process.extractOne(query, candidates, scorer=fuzz.token_set_ratio)
        if match and match[1] >= MATCH_SCORE_THRESHOLD:
            supplier_ids.append(id_lookup[match[2]])
            scores.append(float(match[1]))
        else:
            supplier_ids.append(None)
            scores.append(float(match[1]) if match else 0.0)

    out = signals.copy()
    out["supplier_id"] = supplier_ids
    out["match_score"] = scores
    review_queue = out[out["supplier_id"].isna() & (out["recalling_firm"].str.len() > 0)].copy()
    return out, review_queue


# ── Persist curated parquet (upsert by signal_id) ────────────────────────────
def upsert_parquet(path: Path, new_df: pd.DataFrame, key: str = "signal_id") -> None:
    CURATED_ROOT.mkdir(parents=True, exist_ok=True)
    if path.exists():
        existing = pd.read_parquet(path)
        combined = pd.concat([existing, new_df], ignore_index=True)
        combined = combined.drop_duplicates(subset=[key], keep="last")
    else:
        combined = new_df
    combined.to_parquet(path, index=False)
    _log(f"wrote {len(combined)} rows to {path} (+{len(new_df)} this run)")


# ── Main ─────────────────────────────────────────────────────────────────────
def main() -> int:
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "_" + uuid.uuid4().hex[:6]
    _log(f"=== openFDA ingest run {run_id} starting ===")

    for p in (RAW_ROOT, CURATED_ROOT, STATE_ROOT):
        p.mkdir(parents=True, exist_ok=True)

    since = read_watermark()
    _log(f"watermark: since={since}")

    results = fetch_enforcement_reports(since, run_id)
    if not results:
        _log("no new reports; exiting clean")
        return 0

    df = normalize(results)
    _log(f"normalized {len(df)} unique signals")

    upsert_parquet(CURATED_ROOT / "openfda_enforcement.parquet", df)

    suppliers = load_suppliers_master()
    matched, review = match_to_suppliers(df, suppliers)
    upsert_parquet(CURATED_ROOT / "openfda_matched.parquet", matched)
    if not review.empty:
        upsert_parquet(CURATED_ROOT / "review_queue_openfda.parquet", review)

    matched_count = int(matched["supplier_id"].notna().sum())
    _log(f"matched {matched_count}/{len(matched)} signals to known suppliers")

    if df["report_date"].notna().any():
        latest = df["report_date"].dropna().max()
        write_watermark(str(latest), len(df))
        _log(f"watermark advanced to {latest}")

    _log(f"=== openFDA ingest run {run_id} complete ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
