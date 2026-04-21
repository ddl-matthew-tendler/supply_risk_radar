"""Ingest openFDA Drug Enforcement (recall) reports into the Supply Risk Radar NetApp volume.

Run as a Domino Job on a daily schedule. Uses a watermark so each run only
pulls reports newer than the last successful run.

Layout on the NetApp volume:

    /mnt/data/supply_risk_radar/
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
    "/mnt/data/supply_risk_radar",
))
RAW_ROOT = VOLUME_ROOT / "signals_raw" / "openfda" / "enforcement"
CURATED_ROOT = VOLUME_ROOT / "signals_curated"
STATE_ROOT = VOLUME_ROOT / "state"

ENFORCEMENT_URL = "https://api.fda.gov/drug/enforcement.json"
# Free openFDA API key removes the 1,000 req/day anonymous cap (→ unlimited).
# Register at https://open.fda.gov/apis/authentication/ then store as the
# OPENFDA_API_KEY environment variable in Domino.  Falls back to anonymous.
OPENFDA_API_KEY = os.environ.get("OPENFDA_API_KEY", "")

PAGE_LIMIT = 100
MAX_PAGES_PER_RUN = 50  # safety cap; 5000 reports per run is plenty
DEFAULT_LOOKBACK_DAYS = 90  # first-ever run backfills this far
MATCH_SCORE_THRESHOLD = 85  # rapidfuzz token_set_ratio cutoff

# FDA Warning Letters — CDER-filtered search page, public, no auth required.
# Structure: cols = [posted_date, issued_date, company(+link), office, subject, ...]
FDA_WL_URL = (
    "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/"
    "compliance-actions-and-activities/warning-letters"
    "?action_type=Warning+Letter"
    "&issuing_office=Center+for+Drug+Evaluation+and+Research+%28CDER%29"
    "&page={page}"
)
WL_LOOKBACK_DAYS = 365
WL_MAX_PAGES = 20  # 10 rows/page → up to 200 recent WLs


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

    # Track whether we've already fallen back to anonymous (key invalid/unactivated).
    _use_key = bool(OPENFDA_API_KEY)

    with httpx.Client(timeout=30.0) as client:
        for page in range(MAX_PAGES_PER_RUN):
            skip = page * PAGE_LIMIT
            params: dict = {"search": search, "limit": PAGE_LIMIT, "skip": skip}
            if _use_key:
                params["api_key"] = OPENFDA_API_KEY
            _log(f"fetching openFDA enforcement page {page} (skip={skip}, key={'yes' if _use_key else 'anon'})")
            try:
                resp = client.get(ENFORCEMENT_URL, params=params)
            except Exception as e:
                _log(f"request failed on page {page}: {e}; aborting this run")
                break

            # Detect invalid / not-yet-activated API key and fall back to anonymous.
            if resp.status_code in (400, 401, 403):
                body = resp.text[:300]
                if _use_key and "API_KEY_INVALID" in body:
                    _log("API key invalid or not yet activated — falling back to anonymous access")
                    _use_key = False
                    params.pop("api_key", None)
                    try:
                        resp = client.get(ENFORCEMENT_URL, params=params)
                    except Exception as e:
                        _log(f"anonymous retry failed: {e}; aborting")
                        break
                else:
                    _log(f"HTTP {resp.status_code} on page {page}: {body}")
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
        openfda = r.get("openfda") or {}
        # manufacturer_name is a list in the embedded openfda object; join if multiple
        mfr_names: list[str] = openfda.get("manufacturer_name") or []
        mfr_name = "; ".join(str(m).strip() for m in mfr_names if m)
        rows.append({
            "signal_id": r.get("event_id") or r.get("recall_number") or str(uuid.uuid4()),
            "source": "openfda_enforcement",
            "recalling_firm": (r.get("recalling_firm") or "").strip(),
            "manufacturer_name": mfr_name,
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


# ── FDA Warning Letters ───────────────────────────────────────────────────────
def fetch_warning_letters() -> list[dict]:
    """Scrape CDER Warning Letters from the FDA compliance search page.

    Page structure (cols): posted_date | issued_date | company(+link) | office | subject | ...
    Paginates via ?page=N (10 rows/page).  Uses stdlib html.parser — no extra deps.
    """
    from html.parser import HTMLParser

    class _TableParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.records: list[list[dict]] = []
            self._in_table = self._in_row = self._in_cell = False
            self._text = ""
            self._link: str | None = None
            self._row: list[dict] = []

        def handle_starttag(self, tag, attrs):
            a = dict(attrs)
            if tag == "table":
                self._in_table = True
            elif tag == "tr" and self._in_table:
                self._in_row, self._row = True, []
            elif tag in ("td", "th") and self._in_row:
                self._in_cell, self._text, self._link = True, "", None
            elif tag == "a" and self._in_cell:
                href = a.get("href", "")
                if href and not href.startswith("http"):
                    href = "https://www.fda.gov" + href
                if href:
                    self._link = href

        def handle_endtag(self, tag):
            if tag == "table":
                self._in_table = False
            elif tag == "tr" and self._in_row:
                if self._row:
                    self.records.append(self._row[:])
                self._in_row = False
            elif tag in ("td", "th") and self._in_cell:
                self._row.append({"text": self._text.strip(), "link": self._link})
                self._in_cell = False

        def handle_data(self, data):
            if self._in_cell:
                self._text += data

    cutoff = (datetime.now(timezone.utc) - timedelta(days=WL_LOOKBACK_DAYS)).date()
    letters: list[dict] = []

    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        for page in range(WL_MAX_PAGES):
            url = FDA_WL_URL.format(page=page)
            try:
                resp = client.get(url)
            except Exception as e:
                _log(f"WL fetch page {page} error: {e} — stopping")
                break
            if resp.status_code != 200:
                _log(f"WL fetch page {page}: HTTP {resp.status_code} — stopping")
                break

            parser = _TableParser()
            try:
                parser.feed(resp.text)
            except Exception as e:
                _log(f"WL HTML parse error page {page}: {e}")
                break

            # Filter out header rows (cells where text looks like a column label)
            _SKIP = {"posted date", "issue date", "subject", "issuing office", "company / individual"}
            new_this_page = 0
            stopped_early = False
            for row in parser.records:
                if len(row) < 3:
                    continue
                # col[0]=posted, col[1]=issued, col[2]=company+link, col[3]=office, col[4]=subject
                issued_text = row[1]["text"].strip()
                company_cell = row[2]
                company = company_cell["text"].strip()
                subject = row[4]["text"].strip() if len(row) > 4 else ""

                if not company or company.lower() in _SKIP:
                    continue

                issued_date = None
                for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
                    try:
                        issued_date = datetime.strptime(issued_text, fmt).date()
                        break
                    except ValueError:
                        continue
                if issued_date is None:
                    continue
                if issued_date < cutoff:
                    stopped_early = True
                    break

                letters.append({
                    "company": company,
                    "date": issued_date.isoformat(),
                    "subject": subject,
                    "url": company_cell.get("link"),
                })
                new_this_page += 1

            _log(f"WL page {page}: {new_this_page} letters")
            if new_this_page == 0 or stopped_early:
                break
            time.sleep(0.5)  # be polite to fda.gov

    _log(f"parsed {len(letters)} CDER Warning Letters within last {WL_LOOKBACK_DAYS} days")
    return letters


def normalize_warning_letters(letters: list[dict]) -> pd.DataFrame:
    if not letters:
        return pd.DataFrame()
    rows = []
    for wl in letters:
        company = wl["company"]
        date = wl["date"]
        subject = wl.get("subject", "")
        rows.append({
            "signal_id": f"wl_{company[:40]}_{date}".replace(" ", "_").replace("/", "_"),
            "source": "fda_warning_letter",
            "recalling_firm": company,
            "city": "",
            "state": "",
            "country": "",
            "classification": "Warning Letter",
            "status": "Active",
            "product_description": subject,
            "reason_for_recall": (
                f"FDA Warning Letter issued to {company}. Subject: {subject}."
                if subject else f"FDA Warning Letter issued to {company}."
            ),
            "report_date": date.replace("-", ""),
            "recall_initiation_date": date,
            "recall_number": None,
            "source_url": wl.get("url"),
            "ingested_at": datetime.now(timezone.utc).isoformat(),
            "event_date": pd.Timestamp(date),
        })
    df = pd.DataFrame(rows)
    return df.drop_duplicates(subset=["signal_id"], keep="last")


# ── Supplier matching ────────────────────────────────────────────────────────
def load_suppliers_master() -> pd.DataFrame:
    """Load the supplier master, in priority order:

    1. signals_curated/suppliers_master.parquet on the NetApp volume (production)
    2. data/suppliers_master.csv in the code repo (checked-in real data, Phase B)
    3. mock_data.js regex parse (legacy bootstrap, will be removed in Phase C)
    """
    # 1. Volume parquet
    master = CURATED_ROOT / "suppliers_master.parquet"
    if master.exists():
        df = pd.read_parquet(master)
        _log(f"loaded {len(df)} suppliers from volume parquet")
        return df

    # 2. CSV in code repo (real supplier master, Phase B)
    csv_path = Path(__file__).resolve().parent.parent / "data" / "suppliers_master.csv"
    if csv_path.exists():
        df = pd.read_csv(csv_path, dtype=str).fillna("")
        # Persist to volume so subsequent runs use the faster parquet path
        try:
            CURATED_ROOT.mkdir(parents=True, exist_ok=True)
            df.to_parquet(master, index=False)
            _log(f"promoted {len(df)} suppliers from CSV to volume parquet")
        except Exception as e:
            _log(f"could not promote CSV to parquet (volume may be RO): {e}")
        _log(f"loaded {len(df)} suppliers from data/suppliers_master.csv")
        return df

    # 3. Legacy: parse mock_data.js
    mock_js = Path(__file__).resolve().parent.parent / "static" / "mock_data.js"
    if not mock_js.exists():
        _log("no supplier source found — returning empty frame")
        return pd.DataFrame(columns=["supplier_id", "name", "city", "country"])

    import re
    text = mock_js.read_text()
    pattern = re.compile(
        r"id:\s*'([^']+)'.*?name:\s*'([^']+)'.*?country:\s*'([^']+)'.*?city:\s*'([^']+)'",
        re.DOTALL,
    )
    rows = [
        {"supplier_id": m.group(1), "name": m.group(2), "country": m.group(3), "city": m.group(4)}
        for m in pattern.finditer(text)
    ]
    df = pd.DataFrame(rows)
    _log(f"bootstrapped {len(df)} suppliers from mock_data.js (legacy)")
    return df


def _norm(s: str) -> str:
    """Lowercase and strip punctuation so token_set_ratio splits cleanly."""
    import re
    return re.sub(r"[^\w\s]", " ", s.lower())


def match_to_suppliers(signals: pd.DataFrame, suppliers: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    if signals.empty or suppliers.empty:
        return signals.assign(supplier_id=None, match_score=0.0), pd.DataFrame()

    # Build candidate list from canonical name + any FDA aliases (US subsidiary names, etc.)
    # Normalise to lowercase + strip punctuation — rapidfuzz v3 splits on whitespace only,
    # so "industries," != "industries" unless punctuation is removed first.
    cand_names: list[str] = []
    id_lookup: list[str] = []
    for _, sup_row in suppliers.iterrows():
        base = _norm(f"{sup_row['name']} {sup_row.get('city','')} {sup_row.get('country','')}")
        cand_names.append(base)
        id_lookup.append(sup_row["supplier_id"])
        # Expand aliases (pipe-separated in fda_aliases column)
        for alias in str(sup_row.get("fda_aliases", "") or "").split("|"):
            alias = alias.strip()
            if alias:
                cand_names.append(_norm(alias))
                id_lookup.append(sup_row["supplier_id"])
    candidates = cand_names

    supplier_ids: list[str | None] = []
    scores: list[float] = []
    for _, row in signals.iterrows():
        firm = str(row["recalling_firm"] or "").strip()
        city = str(row["city"] or "").strip()
        country = str(row["country"] or "").strip()
        mfr = str(row.get("manufacturer_name") or "").strip()
        if not firm and not mfr:
            supplier_ids.append(None)
            scores.append(0.0)
            continue

        # Try recalling_firm first; fall back to openfda.manufacturer_name.
        # This catches distributor-initiated recalls (e.g. McKesson recalls a drug
        # manufactured by one of our suppliers) — the manufacturer name is embedded
        # in the openfda sub-object even when the recalling firm is a distributor.
        best_sid: str | None = None
        best_score: float = 0.0
        for query_str in filter(None, [
            _norm(f"{firm} {city} {country}") if firm else None,
            _norm(mfr) if mfr else None,
        ]):
            match = process.extractOne(query_str, candidates, scorer=fuzz.token_set_ratio)
            if match and float(match[1]) > best_score:
                best_score = float(match[1])
                if match[1] >= MATCH_SCORE_THRESHOLD:
                    best_sid = id_lookup[match[2]]

        supplier_ids.append(best_sid)
        scores.append(best_score)

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

    suppliers = load_suppliers_master()

    # ── Enforcement / Recalls ─────────────────────────────────────────────────
    results = fetch_enforcement_reports(since, run_id)
    if results:
        df = normalize(results)
        _log(f"normalized {len(df)} unique enforcement signals")
        upsert_parquet(CURATED_ROOT / "openfda_enforcement.parquet", df)
        matched, review = match_to_suppliers(df, suppliers)
        upsert_parquet(CURATED_ROOT / "openfda_matched.parquet", matched)
        if not review.empty:
            upsert_parquet(CURATED_ROOT / "review_queue_openfda.parquet", review)
        matched_count = int(matched["supplier_id"].notna().sum())
        _log(f"matched {matched_count}/{len(matched)} enforcement signals to known suppliers")
        if df["report_date"].notna().any():
            latest = df["report_date"].dropna().max()
            write_watermark(str(latest), len(df))
            _log(f"watermark advanced to {latest}")
    else:
        _log("no new enforcement reports this run")

    # ── Warning Letters ───────────────────────────────────────────────────────
    wl_letters = fetch_warning_letters()
    if wl_letters:
        wl_df = normalize_warning_letters(wl_letters)
        _log(f"normalized {len(wl_df)} Warning Letters")
        wl_matched, wl_review = match_to_suppliers(wl_df, suppliers)
        upsert_parquet(CURATED_ROOT / "fda_warning_letters.parquet", wl_matched)
        if not wl_review.empty:
            upsert_parquet(CURATED_ROOT / "review_queue_wl.parquet", wl_review)
        wl_matched_count = int(wl_matched["supplier_id"].notna().sum())
        _log(f"matched {wl_matched_count}/{len(wl_matched)} Warning Letters to known suppliers")
    else:
        _log("no Warning Letters parsed this run")

    _log(f"=== openFDA ingest run {run_id} complete ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
