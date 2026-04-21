"""Ingest real US tariff signals for Supply Risk Radar.

Sources / methodology:
  - US Section 301 tariffs on China (USTR published lists)
  - IEEPA "reciprocal tariff" Executive Orders (Apr 2025)
  - ITA Pharmaceutical Appendix (WTO/USTR tariff elimination list)
  - HTS chapter 29 (organic chemicals/APIs) and 30 (pharma preparations)

Current tariff environment (as of Q2 2026):
  - China HTS 29xx APIs: 25% Section 301 (List 3) + 10% IEEPA baseline = 35% above MFN
    (escalated to 145% in Apr 2025, then paused back to ~35% for 90 days; status volatile)
  - China HTS 30xx bio-pharma: same + additional scrutiny
  - India: 10% IEEPA baseline tariff in effect (26% reciprocal suspended Apr 9, 2025 for 90 days)
  - EU/Switzerland/UK/Japan: ITA pharmaceutical annex covers most HTS 29xx/30xx → 0% tariff
  - USA domestic suppliers: 0% tariff

Writes to:
  signals_curated/tariff_signals.parquet
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

VOLUME_ROOT  = Path(os.environ.get("SRR_VOLUME_ROOT", "/mnt/data/supply_risk_radar"))
CURATED_ROOT = VOLUME_ROOT / "signals_curated"
TARIFF_SIGNALS_PATH = CURATED_ROOT / "tariff_signals.parquet"


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


# ── Tariff schedule ───────────────────────────────────────────────────────────
# Sources:
#   China Section 301: https://ustr.gov/trade-agreements/trade-agreements/section-301-investigations
#   IEEPA EO 14257 (Apr 2, 2025): 34% "reciprocal" → escalated → 90-day pause at 10% IEEPA
#   ITA Pharmaceutical Appendix: https://www.trade.gov/pharmaceutical-tariff-elimination
#
# Format: {country: {hs_chapter: (rate_pct, severity, notes, effective_date)}}
# rate_pct = total additional duty above MFN baseline (not including MFN itself)

TARIFF_SCHEDULE: dict[str, dict] = {
    "China": {
        "default": {
            "additional_pct": 35.0,
            "peak_pct": 145.0,
            "severity": "critical",
            "status": "active",
            "notes": (
                "US Section 301 List 3 (+25%) and IEEPA EO 14257 (+10% paused baseline). "
                "Escalated to 145% total duty in Apr 2025; 90-day pause at ~35% effective May 2025. "
                "ITA pharmaceutical annex exemptions removed for HTS 29xx APIs under List 3. "
                "Status remains highly volatile — further escalation possible."
            ),
            "effective_date": "2025-04-10",
            "source_url": "https://ustr.gov/issue-areas/enforcement/section-301-investigations/tariff-actions",
        },
        "30": {
            "additional_pct": 35.0,
            "peak_pct": 145.0,
            "severity": "critical",
            "status": "active",
            "notes": (
                "HTS Chapter 30 (pharmaceutical preparations) subject to same Section 301 + IEEPA duties. "
                "Biologics and finished dose forms included. FDA import alert risk elevated."
            ),
            "effective_date": "2025-04-10",
            "source_url": "https://ustr.gov/issue-areas/enforcement/section-301-investigations/tariff-actions",
        },
    },
    "India": {
        "default": {
            "additional_pct": 10.0,
            "peak_pct": 26.0,
            "severity": "medium",
            "status": "suspended",
            "notes": (
                "IEEPA EO 14257 (Apr 2, 2025): 26% reciprocal tariff on Indian goods. "
                "90-day suspension announced Apr 9, 2025 — reduced to 10% IEEPA baseline. "
                "10% baseline tariff remains in effect. Full 26% could resume after suspension period. "
                "Indian APIs (HTS 29xx) previously entered at 0% MFN duty."
            ),
            "effective_date": "2025-04-09",
            "source_url": "https://www.whitehouse.gov/presidential-actions/2025/04/regulating-imports-with-a-reciprocal-tariff-to-rectify-trade-practices-that-contribute-to-large-and-persistent-annual-united-states-goods-trade-deficits/",
        },
    },
    "United Kingdom": {
        "default": {
            "additional_pct": 10.0,
            "peak_pct": 10.0,
            "severity": "low",
            "status": "active",
            "notes": (
                "IEEPA baseline 10% tariff applies. UK–US trade deal negotiations ongoing. "
                "ITA pharmaceutical annex covers most HTS 29xx/30xx — net impact depends on HS code. "
                "Post-Brexit UK MHRA divergence adds separate regulatory compliance cost."
            ),
            "effective_date": "2025-04-09",
            "source_url": "https://ustr.gov/countries-regions/europe-middle-east/europe/united-kingdom",
        },
    },
    "Germany": {
        "default": {
            "additional_pct": 10.0,
            "peak_pct": 20.0,
            "severity": "low",
            "status": "active",
            "notes": (
                "IEEPA 10% baseline tariff applies to EU origin goods. "
                "EC announced retaliatory measures under WTO dispute resolution. "
                "ITA Pharmaceutical Appendix provides duty-free treatment for most pharma HTS codes "
                "but subject to IEEPA override. Net cost impact low but trajectory uncertain."
            ),
            "effective_date": "2025-04-09",
            "source_url": "https://ustr.gov/countries-regions/europe-middle-east/europe/european-union",
        },
    },
    "Belgium": {
        "default": {
            "additional_pct": 10.0,
            "peak_pct": 20.0,
            "severity": "low",
            "status": "active",
            "notes": (
                "EU origin — same 10% IEEPA baseline as Germany. "
                "ITA pharmaceutical annex coverage applies for most HTS 30xx CMO/finished dose products."
            ),
            "effective_date": "2025-04-09",
            "source_url": "https://ustr.gov/countries-regions/europe-middle-east/europe/european-union",
        },
    },
    "Switzerland": {
        "default": {
            "additional_pct": 31.0,
            "peak_pct": 31.0,
            "severity": "medium",
            "status": "active",
            "notes": (
                "Switzerland not in EU — IEEPA EO set 31% reciprocal tariff on Swiss goods. "
                "Partially offset by ITA pharmaceutical annex for HTS 30xx biologic CMO products. "
                "High absolute rate creates cost pass-through risk on biologics CMO contracts."
            ),
            "effective_date": "2025-04-09",
            "source_url": "https://www.whitehouse.gov/presidential-actions/2025/04/regulating-imports-with-a-reciprocal-tariff-to-rectify-trade-practices-that-contribute-to-large-and-persistent-annual-united-states-goods-trade-deficits/",
        },
    },
}

# Countries with no significant tariff exposure (domestic + very-low-tariff partners)
TARIFF_EXEMPT = {"United States", "Japan"}


def build_tariff_signals(suppliers: pd.DataFrame) -> list[dict]:
    """Generate per-supplier tariff signals based on country and HS code."""
    rows: list[dict] = []
    today = datetime.now(timezone.utc)
    today_str = today.date().isoformat()
    seen_country: set[str] = set()

    for _, sup in suppliers.iterrows():
        country = sup.get("country", "")
        if country in TARIFF_EXEMPT or country not in TARIFF_SCHEDULE:
            continue

        hs = str(sup.get("hs_code") or "")
        hs_chapter = hs[:2] if len(hs) >= 2 else ""
        spend = int(float(sup.get("spend") or 0))
        sup_id = sup["supplier_id"]

        schedule = TARIFF_SCHEDULE[country]
        # Pick chapter-specific entry if exists, else default
        tariff = schedule.get(hs_chapter, schedule.get("default"))
        if not tariff:
            continue

        rate = tariff["additional_pct"]
        peak = tariff["peak_pct"]
        status = tariff["status"]
        severity = tariff["severity"]
        effective_date = tariff["effective_date"]
        notes = tariff["notes"]
        source_url = tariff["source_url"]

        impact_usd = int(spend * rate / 100)
        peak_impact_usd = int(spend * peak / 100)

        status_label = "Active" if status == "active" else "Suspended (risk remains)"
        title = (
            f"{country} tariff {rate:.0f}% additional duty – "
            f"est. ${impact_usd:,} impact on {sup['short_name']}"
        )

        rows.append({
            "signal_id": f"tariff_{sup_id}_{today_str}",
            "source": "us_tariff_schedule",
            "signal_type": "Tariff",
            "supplier_id": sup_id,
            "match_score": 100.0,
            "severity": severity,
            "classification": f"US Tariff +{rate:.0f}% ({status_label})",
            "title": title,
            "description": (
                f"{notes} "
                f"Annual spend with {sup['name']}: ${spend:,}. "
                f"Estimated tariff cost at current rate ({rate:.0f}%): ~${impact_usd:,}/yr. "
                f"Peak exposure if escalated to {peak:.0f}%: ~${peak_impact_usd:,}/yr."
            ),
            "source_url": source_url,
            "event_date": datetime.fromisoformat(effective_date).replace(tzinfo=timezone.utc),
            "recalling_firm": sup["name"],
            "city": sup.get("city", ""),
            "country": country,
            "lat": float(sup.get("lat") or 0),
            "lng": float(sup.get("lng") or 0),
            "magnitude": rate,
            "ingested_at": today.isoformat(),
        })

    _log(f"Tariff: {len(rows)} signals across {len(suppliers)} suppliers")
    return rows


def main() -> int:
    _log("=== tariff_signals ingest starting ===")
    suppliers = load_suppliers()
    if suppliers.empty:
        _log("no suppliers found — aborting")
        return 1

    _log(f"loaded {len(suppliers)} suppliers")
    rows = build_tariff_signals(suppliers)

    if not rows:
        _log("no tariff signals generated")
        return 0

    df = pd.DataFrame(rows)
    df["event_date"] = pd.to_datetime(df["event_date"], utc=True, errors="coerce")
    df = df.drop_duplicates(subset=["signal_id"], keep="last")
    _upsert_parquet(TARIFF_SIGNALS_PATH, df)
    _log(f"=== tariff_signals ingest complete: {len(df)} signals ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
