"""Screen suppliers against the OFAC Specially Designated Nationals (SDN) list.

Source:
  US Treasury OFAC SDN XML — https://www.treasury.gov/ofac/downloads/sdn.xml
  Published data, updated frequently (checked via Publish_Date in XML).
  18,700+ entries covering sanctioned individuals, entities, and vessels.

Methodology:
  1. Download the SDN XML (~28 MB).
  2. Build a lookup of all entity lastName values + their strong AKAs.
  3. Use rapidfuzz token_set_ratio to screen our supplier names (and fda_aliases) against
     each SDN entry. Threshold: 92 (strict — avoids false positives like 'Divi' in 'division').
  4. For each supplier, record the screening result: 'clear' or 'match'.
  5. Write to ofac_signals.parquet — one row per supplier.
     - 'clear' rows have severity='info' and are informational (not alerts).
     - 'match' rows have severity='critical' and are triggered as alerts.

Writes to:
  signals_curated/ofac_signals.parquet
"""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

import httpx
import pandas as pd
from rapidfuzz import fuzz

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

VOLUME_ROOT  = Path(os.environ.get("SRR_VOLUME_ROOT", "/mnt/data/supply_risk_radar"))
CURATED_ROOT = VOLUME_ROOT / "signals_curated"
STATE_ROOT   = VOLUME_ROOT / "state"
OFAC_SIGNALS_PATH = CURATED_ROOT / "ofac_signals.parquet"

OFAC_SDN_URL   = "https://www.treasury.gov/ofac/downloads/sdn.xml"
OFAC_NS        = {"o": "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/XML"}
MATCH_THRESHOLD = 92   # rapidfuzz score 0-100; 92 = very strict


def _log(msg: str) -> None:
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    print(f"[{stamp}] {msg}", flush=True)


def _upsert_parquet(path: Path, new_df: pd.DataFrame, key: str = "signal_id") -> None:
    CURATED_ROOT.mkdir(parents=True, exist_ok=True)
    if path.exists():
        existing = pd.read_parquet(path)
        combined = pd.concat([existing, new_df], ignore_index=True)
        combined = combined.drop_duplicates(subset=[key], keep="last")
    else:
        combined = new_df
    combined.to_parquet(path, index=False)
    _log(f"wrote {len(combined)} rows to {path.name} (+{len(new_df)} this run)")


def load_suppliers() -> pd.DataFrame:
    p = CURATED_ROOT / "suppliers_master.parquet"
    if p.exists():
        return pd.read_parquet(p)
    csv = Path(__file__).resolve().parent.parent / "data" / "suppliers_master.csv"
    if csv.exists():
        return pd.read_csv(csv, dtype=str).fillna("")
    return pd.DataFrame()


def download_sdn_xml() -> bytes:
    _log("downloading OFAC SDN XML (~28 MB)...")
    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        resp = client.get(OFAC_SDN_URL)
        resp.raise_for_status()
    _log(f"downloaded {len(resp.content):,} bytes")
    return resp.content


def parse_sdn_entities(xml_bytes: bytes) -> tuple[str, list[dict]]:
    """Return (publish_date, [{name, aliases, programs}]) for Entity-type SDN entries only."""
    root = ET.fromstring(xml_bytes)
    ns = OFAC_NS

    pub_date = root.findtext("o:publshInformation/o:Publish_Date", "", ns)
    entities: list[dict] = []

    for entry in root.findall("o:sdnEntry", ns):
        sdn_type = entry.findtext("o:sdnType", "", ns)
        if sdn_type != "Entity":
            continue

        last = (entry.findtext("o:lastName", "", ns) or "").strip()
        if not last:
            continue

        # Collect strong AKAs (more reliable matches)
        akas: list[str] = []
        for aka in entry.findall("o:akaList/o:aka", ns):
            if aka.findtext("o:category", "", ns) == "strong":
                aka_name = (aka.findtext("o:lastName", "", ns) or "").strip()
                if aka_name:
                    akas.append(aka_name)

        programs = [p.text or "" for p in entry.findall("o:programList/o:program", ns)]

        entities.append({
            "uid": entry.findtext("o:uid", "", ns),
            "name": last,
            "aliases": akas,
            "programs": programs,
            "all_names": [last] + akas,
        })

    _log(f"parsed {len(entities)} Entity-type SDN entries (publish date: {pub_date})")
    return pub_date, entities


def screen_supplier(
    supplier_name: str,
    aliases: list[str],
    sdn_entities: list[dict],
) -> tuple[bool, float, dict | None]:
    """Return (matched, score, sdn_entry) — scored with strict threshold."""
    queries = [n.lower() for n in [supplier_name] + aliases if n]

    best_score = 0.0
    best_entity: dict | None = None

    for entity in sdn_entities:
        for sdn_name in entity["all_names"]:
            sdn_lower = sdn_name.lower()
            for q in queries:
                score = fuzz.token_set_ratio(q, sdn_lower)
                if score > best_score:
                    best_score = score
                    best_entity = entity

    matched = best_score >= MATCH_THRESHOLD
    return matched, best_score, best_entity if matched else None


def run_screening(suppliers: pd.DataFrame, sdn_entities: list[dict], pub_date: str) -> list[dict]:
    rows: list[dict] = []
    today = datetime.now(timezone.utc)
    today_str = today.date().isoformat()
    matches = 0

    for _, sup in suppliers.iterrows():
        sup_id = sup["supplier_id"]
        sup_name = sup["name"]
        aliases_raw = str(sup.get("fda_aliases") or "")
        aliases = [a.strip() for a in aliases_raw.split("|") if a.strip()]

        matched, score, sdn_entry = screen_supplier(sup_name, aliases, sdn_entities)

        if matched and sdn_entry:
            matches += 1
            severity = "critical"
            programs_str = ", ".join(sdn_entry.get("programs", []))
            classification = "OFAC SDN Match"
            title = f"OFAC SDN Match: {sup_name} — {sdn_entry['name']}"
            description = (
                f"Supplier '{sup_name}' matched OFAC Specially Designated National "
                f"'{sdn_entry['name']}' (UID: {sdn_entry['uid']}) with score {score:.0f}/100. "
                f"Sanction programs: {programs_str}. "
                f"SDN list published: {pub_date}. "
                f"IMMEDIATE REVIEW REQUIRED: payments to sanctioned entities may violate US law."
            )
        else:
            severity = "info"
            classification = "OFAC Screened – Clear"
            title = f"OFAC screening: {sup['short_name']} – no match (score {score:.0f}/100)"
            description = (
                f"{sup_name} screened against OFAC SDN list ({len(sdn_entities):,} entities, "
                f"published {pub_date}). No match found at threshold {MATCH_THRESHOLD}/100. "
                f"Best score: {score:.0f}. Last screened: {today_str}."
            )

        rows.append({
            "signal_id": f"ofac_{sup_id}_{today_str}",
            "source": "ofac_sdn",
            "signal_type": "Geopolitical",
            "supplier_id": sup_id,
            "match_score": score,
            "severity": severity,
            "classification": classification,
            "title": title,
            "description": description,
            "source_url": "https://home.treasury.gov/policy-issues/financial-sanctions/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists",
            "event_date": today,
            "recalling_firm": sup_name,
            "city": sup.get("city", ""),
            "country": sup.get("country", ""),
            "lat": float(sup.get("lat") or 0),
            "lng": float(sup.get("lng") or 0),
            "magnitude": score,
            "ingested_at": today.isoformat(),
        })

    _log(f"OFAC screening: {matches} matches, {len(rows) - matches} clear out of {len(rows)} suppliers")
    return rows


def main() -> int:
    _log("=== OFAC SDN screening starting ===")
    suppliers = load_suppliers()
    if suppliers.empty:
        _log("no suppliers found — aborting")
        return 1

    _log(f"loaded {len(suppliers)} suppliers")

    try:
        xml_bytes = download_sdn_xml()
        pub_date, sdn_entities = parse_sdn_entities(xml_bytes)
    except Exception as e:
        _log(f"ERROR downloading/parsing OFAC SDN: {e}")
        return 1

    rows = run_screening(suppliers, sdn_entities, pub_date)
    if not rows:
        _log("no screening results — aborting")
        return 1

    df = pd.DataFrame(rows)
    df["event_date"] = pd.to_datetime(df["event_date"], utc=True, errors="coerce")
    df = df.drop_duplicates(subset=["signal_id"], keep="last")
    _upsert_parquet(OFAC_SIGNALS_PATH, df)
    _log(f"=== OFAC screening complete: {len(df)} rows ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
