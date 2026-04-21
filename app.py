import os
import sys
import json
import time
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import httpx

# Make sibling jobs/ importable so the app can run the ingest in-process.
# (NetApp volume mounts RW on the App but RO on Domino Jobs, so ingest
# must run inside this process to land data on the shared volume.)
sys.path.insert(0, str(Path(__file__).parent))

# Lazy pandas import so the app still boots in envs without pandas installed.
try:
    import pandas as pd
except Exception:
    pd = None

SRR_VOLUME_ROOT = Path(os.environ.get(
    "SRR_VOLUME_ROOT",
    "/mnt/data/supply_risk_radar",
))
SIGNALS_MATCHED   = SRR_VOLUME_ROOT / "signals_curated" / "openfda_matched.parquet"
WL_MATCHED        = SRR_VOLUME_ROOT / "signals_curated" / "fda_warning_letters.parquet"
GEO_SIGNALS       = SRR_VOLUME_ROOT / "signals_curated" / "geo_signals.parquet"
TARIFF_SIGNALS    = SRR_VOLUME_ROOT / "signals_curated" / "tariff_signals.parquet"
OFAC_SIGNALS      = SRR_VOLUME_ROOT / "signals_curated" / "ofac_signals.parquet"
OPENFDA_WATERMARK = SRR_VOLUME_ROOT / "state" / "openfda_watermark.json"

app = FastAPI()

DOMINO_API_HOST = os.environ.get("DOMINO_API_HOST", "http://localhost:8899")

# ── P3A: Governed audit log ──────────────────────────────────────────────────
# In production this writes to a Domino Dataset. For now we persist to a local
# JSONL file so actions survive reloads and can be inspected by compliance.
AUDIT_PATH = Path(os.environ.get("SRR_AUDIT_PATH", "/tmp/srr_audit_log.jsonl"))
WEBHOOK_PATH = Path(os.environ.get("SRR_WEBHOOK_PATH", "/tmp/srr_webhook_log.jsonl"))


def _append_jsonl(path: Path, entry: dict) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        print(f"[audit-write-error] {e}")


def _read_jsonl(path: Path) -> list:
    if not path.exists():
        return []
    out = []
    try:
        with path.open("r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    out.append(json.loads(line))
                except Exception:
                    continue
    except Exception as e:
        print(f"[audit-read-error] {e}")
    return out


# ── Alert ETL: supplier/drug lookup built from data/suppliers_master.csv ──────
_CLASSIFICATION_SEVERITY: dict[str, str] = {
    "Class I": "critical",
    "Class II": "high",
    "Class III": "medium",
    "Warning Letter": "critical",
}


def _load_supplier_lookup() -> tuple[dict[str, str], dict[str, list[str]]]:
    """Build supplier name and drug impact dicts from the checked-in CSVs.

    Priority: volume parquet > data/*.csv > empty dicts (graceful degradation).
    Called once at startup; result is cached in module-level vars below.
    """
    names: dict[str, str] = {}
    drug_impact: dict[str, list[str]] = {}

    # Load suppliers
    sup_parquet = SRR_VOLUME_ROOT / "signals_curated" / "suppliers_master.parquet"
    sup_csv = Path(__file__).parent / "data" / "suppliers_master.csv"
    sup_df = None
    if pd is not None:
        if sup_parquet.exists():
            try:
                sup_df = pd.read_parquet(sup_parquet)
            except Exception:
                pass
        if sup_df is None and sup_csv.exists():
            try:
                sup_df = pd.read_csv(sup_csv, dtype=str).fillna("")
            except Exception:
                pass
    if sup_df is not None:
        for _, row in sup_df.iterrows():
            names[row["supplier_id"]] = row["name"]

    # Load drug products and build supplier → [drug impact strings]
    dp_csv = Path(__file__).parent / "data" / "drug_products.csv"
    if pd is not None and dp_csv.exists():
        try:
            dp_df = pd.read_csv(dp_csv, dtype=str).fillna("")
            for _, row in dp_df.iterrows():
                revenue = int(row["revenue"]) if row.get("revenue") else 0
                rev_str = f"${revenue / 1e6:.0f}M revenue" if revenue else ""
                name = row["name"]
                sole_ids = [s.strip() for s in row.get("sole_supplier_ids", "").split("|") if s.strip()]
                all_ids = [s.strip() for s in row.get("all_supplier_ids", "").split("|") if s.strip()]
                for sid in all_ids:
                    sole_flag = " – sole source" if sid in sole_ids else ""
                    impact = f"{name}{sole_flag}, {rev_str}".strip(", ")
                    drug_impact.setdefault(sid, []).append(impact)
        except Exception as e:
            print(f"[lookup-load] drug_products.csv error: {e}")

    return names, drug_impact


_SUPPLIER_NAMES, _SUPPLIER_DRUG_IMPACT = _load_supplier_lookup()

# ── Risk score delta from recent FDA signals ──────────────────────────────────
_SIGNAL_RISK_BUMP: dict[str, int] = {
    "Class I": 15, "Class II": 10, "Class III": 5, "Warning Letter": 15,
}


def _build_real_suppliers() -> list[dict] | None:
    """Return the supplier list with dynamically recalculated risk scores.

    Risk score = base score from CSV + cumulative bumps from matched FDA signals
    in the last 90 days, capped at 100.  Active FDA events populate activeEvents.
    Falls back to None if pandas or data is unavailable.
    """
    if pd is None:
        return None

    sup_parquet = SRR_VOLUME_ROOT / "signals_curated" / "suppliers_master.parquet"
    sup_csv = Path(__file__).parent / "data" / "suppliers_master.csv"
    sup_df = None
    if sup_parquet.exists():
        try:
            sup_df = pd.read_parquet(sup_parquet)
        except Exception:
            pass
    if sup_df is None and sup_csv.exists():
        try:
            sup_df = pd.read_csv(sup_csv, dtype=str).fillna("")
        except Exception:
            pass
    if sup_df is None or sup_df.empty:
        return None

    dp_csv = Path(__file__).parent / "data" / "drug_products.csv"
    dp_df = None
    if dp_csv.exists():
        try:
            dp_df = pd.read_csv(dp_csv, dtype=str).fillna("")
        except Exception:
            pass

    # Build supplier → drug product IDs map
    sup_to_drugs: dict[str, list[str]] = {}
    if dp_df is not None:
        for _, drow in dp_df.iterrows():
            all_ids = [s.strip() for s in str(drow.get("all_supplier_ids", "")).split("|") if s.strip()]
            for sid in all_ids:
                sup_to_drugs.setdefault(sid, []).append(drow["drug_id"])

    # Aggregate FDA signals per supplier (last 90 days)
    cutoff90 = datetime.now(timezone.utc) - timedelta(days=90)
    sig_bumps: dict[str, int] = {}
    sig_events: dict[str, list[str]] = {}
    for path in (SIGNALS_MATCHED, WL_MATCHED, GEO_SIGNALS, TARIFF_SIGNALS):
        if not path.exists():
            continue
        try:
            sdf = pd.read_parquet(path)
            if sdf.empty:
                continue
            sdf["event_date"] = pd.to_datetime(sdf["event_date"], errors="coerce", utc=True)
            sdf = sdf[sdf["supplier_id"].notna() & (sdf["event_date"] >= cutoff90)]
            for _, srow in sdf.iterrows():
                sid = srow["supplier_id"]
                cls = str(srow.get("classification") or "")
                bump = _SIGNAL_RISK_BUMP.get(cls, 5)
                sig_bumps[sid] = sig_bumps.get(sid, 0) + bump
                # Build short active-event string
                product = str(srow.get("product_description") or "")[:60]
                date_raw = srow.get("event_date")
                date_s = date_raw.strftime("%b %Y") if hasattr(date_raw, "strftime") else ""
                if cls == "Warning Letter":
                    label = f"FDA Warning Letter – {product or srow.get('recalling_firm', '')}"
                else:
                    label = f"FDA {cls} Recall – {product}"
                if date_s:
                    label += f" ({date_s})"
                sig_events.setdefault(sid, []).append(label[:120])
        except Exception as e:
            print(f"[build-suppliers] signal read error: {e}")

    def _risk_level(score: int) -> str:
        if score >= 75:
            return "critical"
        if score >= 60:
            return "high"
        if score >= 40:
            return "medium"
        return "low"

    suppliers_out = []
    for _, row in sup_df.iterrows():
        sid = str(row["supplier_id"])
        base_score = int(float(row.get("risk_score") or 50))
        bump = sig_bumps.get(sid, 0)
        risk_score = min(100, base_score + bump)
        risk_level = _risk_level(risk_score)

        try:
            sole_val = str(row.get("sole", "false")).lower()
            sole = sole_val in ("true", "1", "yes")
        except Exception:
            sole = False

        suppliers_out.append({
            "id": sid,
            "name": str(row.get("name", "")),
            "shortName": str(row.get("short_name", "")),
            "country": str(row.get("country", "")),
            "city": str(row.get("city", "")),
            "lat": float(row.get("lat") or 0),
            "lng": float(row.get("lng") or 0),
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "category": str(row.get("category", "")),
            "sole": sole,
            "drugProducts": sup_to_drugs.get(sid, []),
            "spend": int(float(row.get("spend") or 0)),
            "activeEvents": sig_events.get(sid, []),
            "alternateStatus": str(row.get("alternate_status", "None")),
            "leadTimeDays": int(float(row.get("lead_time_days") or 0)),
            "fda483Date": None,
            "hsCode": str(row.get("hs_code", "")) or None,
            "tariffExposure": float(row.get("tariff_exposure") or 0),
        })

    # Sort by riskScore descending
    suppliers_out.sort(key=lambda s: -s["riskScore"])
    return suppliers_out


def _build_real_watchlist(suppliers: list[dict]) -> list[dict]:
    """Derive watchlist from sole-source or critical/high suppliers with drug linkage."""
    dp_csv = Path(__file__).parent / "data" / "drug_products.csv"
    dp_map: dict[str, dict] = {}
    sole_drug_map: dict[str, str] = {}  # supplier_id → sole drug name
    if dp_csv.exists() and pd is not None:
        try:
            dp_df = pd.read_csv(dp_csv, dtype=str).fillna("")
            for _, row in dp_df.iterrows():
                dp_map[row["drug_id"]] = row.to_dict()
                sole_ids = [s.strip() for s in str(row.get("sole_supplier_ids", "")).split("|") if s.strip()]
                for sid in sole_ids:
                    sole_drug_map[sid] = row["drug_id"]
        except Exception:
            pass

    watchlist = []
    rank = 0
    for sup in suppliers:
        sid = sup["id"]
        # Include sole-source suppliers or those with critical/high risk
        if not sup["sole"] and sup["riskLevel"] not in ("critical", "high"):
            continue
        # Find highest-revenue drug product this supplier is linked to
        best_drug: dict | None = None
        best_rev = 0
        for dpid in sup.get("drugProducts", []):
            dp = dp_map.get(dpid)
            if dp:
                rev = int(float(dp.get("revenue") or 0))
                if rev > best_rev:
                    best_rev = rev
                    best_drug = dp
        if best_drug is None and not sup.get("drugProducts"):
            continue
        rank += 1
        drug_name = best_drug["name"] if best_drug else "Unknown"
        revenue = int(float(best_drug.get("revenue") or 0)) if best_drug else 0
        sole_flag = sid in sole_drug_map
        watchlist.append({
            "rank": rank,
            "supplierId": sid,
            "supplierName": sup["name"],
            "country": sup["country"],
            "drugProductId": best_drug["drug_id"] if best_drug else None,
            "drugProductName": drug_name,
            "revenue": revenue,
            "riskScore": sup["riskScore"],
            "riskDrivers": sup["activeEvents"][:3] or (["Sole-source supplier"] if sole_flag else ["High risk score"]),
            "alternateStatus": sup["alternateStatus"],
            "leadTimeDays": sup.get("leadTimeDays", 0),
            "revenueAtRisk": revenue if sole_flag else int(revenue * sup["riskScore"] / 100),
            "mitigationSuggestion": (
                f"Review CAPA status with {sup['shortName']}. "
                f"Alternate qualification status: {sup['alternateStatus']}. "
                f"Lead time: {sup.get('leadTimeDays', 'N/A')} days."
            ),
        })
        if rank >= 10:
            break
    return watchlist


def _build_real_exec_brief(suppliers: list[dict], alerts: list[dict]) -> dict:
    """Generate an exec brief summary from real supplier + alert data."""
    now = datetime.now(timezone.utc)
    critical = [s for s in suppliers if s["riskLevel"] == "critical"]
    high = [s for s in suppliers if s["riskLevel"] == "high"]
    sole_critical = [s for s in critical if s["sole"]]

    dp_csv = Path(__file__).parent / "data" / "drug_products.csv"
    total_revenue_at_risk = 0
    if dp_csv.exists() and pd is not None:
        try:
            dp_df = pd.read_csv(dp_csv, dtype=str).fillna("")
            sole_sids = {s["id"] for s in sole_critical}
            for _, row in dp_df.iterrows():
                sole_ids = {s.strip() for s in str(row.get("sole_supplier_ids", "")).split("|") if s.strip()}
                if sole_ids & sole_sids:
                    total_revenue_at_risk += int(float(row.get("revenue") or 0))
        except Exception:
            pass

    recent_recalls = [a for a in alerts if a.get("type") == "Regulatory" and "Recall" in a.get("title", "")]
    top5 = []
    for i, sup in enumerate(suppliers[:5]):
        events = sup.get("activeEvents", [])
        top_event = events[0] if events else f"Risk score {sup['riskScore']}"
        drug_ids = sup.get("drugProducts", [])
        top5.append({
            "rank": i + 1,
            "headline": f"{sup['shortName']} ({sup['country']}) – {top_event[:80]}",
            "impact": f"{len(drug_ids)} drug product(s) affected, {'sole-source' if sup['sole'] else 'multi-source'}",
            "urgency": "Act within 48h" if sup["riskLevel"] == "critical" else "Monitor weekly",
        })

    summary = (
        f"Supply Risk Radar as of {now.strftime('%B %d, %Y')}: "
        f"{len(critical)} critical-risk suppliers ({len(sole_critical)} sole-source), "
        f"{len(high)} high-risk suppliers. "
        f"{len(recent_recalls)} active FDA recall signal(s) in the last 90 days. "
        f"Estimated revenue at risk from sole-source critical suppliers: "
        f"${total_revenue_at_risk / 1e6:.0f}M."
    )

    return {
        "generatedAt": now.isoformat(),
        "weekEnding": now.strftime("%Y-%m-%d"),
        "weekSummary": summary,
        "top5Risks": top5,
        "criticalCount": len(critical),
        "highCount": len(high),
        "revenueAtRisk": total_revenue_at_risk,
        "recentRecallCount": len(recent_recalls),
        "source": "real_data",
    }


def _signal_to_alert(row: dict) -> dict | None:
    """Transform a curated-parquet row into the alert schema expected by the UI."""
    supplier_id = row.get("supplier_id")
    if not supplier_id:
        return None  # skip signals with no supplier match

    source = row.get("source", "")
    classification = row.get("classification") or ""
    severity = _CLASSIFICATION_SEVERITY.get(classification, "high")

    firm = (row.get("recalling_firm") or "").strip()
    product = (row.get("product_description") or "").strip()
    reason = (row.get("reason_for_recall") or "").strip()

    if source == "fda_warning_letter":
        subject = product or reason
        title = f"FDA Warning Letter – {subject[:80]}" if subject else f"FDA Warning Letter – {firm}"
        description = reason or f"FDA issued a Warning Letter to {firm}."
        source_label = "FDA Warning Letters"
        confidence_base = 0.90
    else:
        body = (product[:70] if product else reason[:70]) or firm
        title = f"FDA {classification} Recall – {body}" if classification else f"FDA Enforcement – {body}"
        parts = [reason] if reason else []
        if firm:
            parts.append(f"Recalling firm: {firm}.")
        if row.get("status"):
            parts.append(f"Status: {row['status']}.")
        if row.get("recall_initiation_date"):
            parts.append(f"Recall initiated: {row['recall_initiation_date']}.")
        description = " ".join(parts)
        source_label = "openFDA Enforcement"
        confidence_base = 0.80

    match_score = float(row.get("match_score") or 0)
    confidence = round(min(confidence_base, match_score / 100 * confidence_base), 2)

    event_date = row.get("event_date") or row.get("report_date") or ""
    if hasattr(event_date, "strftime"):
        date_str = event_date.strftime("%Y-%m-%d")
    else:
        date_str = str(event_date)[:10] if event_date else ""

    return {
        "id": f"{source}_{row.get('signal_id', '')}",
        "supplierId": supplier_id,
        "supplierName": _SUPPLIER_NAMES.get(supplier_id, firm),
        "type": "Regulatory",
        "severity": severity,
        "title": title,
        "description": description,
        "sourceUrl": row.get("source_url"),
        "sourceLabel": source_label,
        "date": date_str,
        "drugImpact": _SUPPLIER_DRUG_IMPACT.get(supplier_id, []),
        "confidence": confidence,
        "reviewedAt": None,
        "dismissedAt": None,
        "actionTakenAt": None,
    }


def _geo_signal_to_alert(row: dict) -> dict | None:
    """Transform a geo_signals parquet row into the UI alert schema."""
    supplier_id = row.get("supplier_id")
    if not supplier_id:
        return None

    signal_type = str(row.get("signal_type") or "Environmental")
    severity    = str(row.get("severity") or "medium")
    title       = str(row.get("title") or "")
    description = str(row.get("description") or "")
    source      = str(row.get("source") or "")

    source_labels = {
        "usgs_earthquake":  "USGS Earthquake Hazards",
        "openmeteo_weather": "OpenMeteo Forecast",
        "fx_rate":          "FX Rate Monitor",
    }
    source_label = source_labels.get(source, source)

    event_date = row.get("event_date") or ""
    if hasattr(event_date, "strftime"):
        date_str = event_date.strftime("%Y-%m-%d")
    else:
        date_str = str(event_date)[:10] if event_date else ""

    return {
        "id": f"{source}_{row.get('signal_id', '')}",
        "supplierId": supplier_id,
        "supplierName": _SUPPLIER_NAMES.get(supplier_id, str(row.get("recalling_firm", ""))),
        "type": signal_type,
        "severity": severity,
        "title": title,
        "description": description,
        "sourceUrl": row.get("source_url"),
        "sourceLabel": source_label,
        "date": date_str,
        "drugImpact": _SUPPLIER_DRUG_IMPACT.get(supplier_id, []),
        "confidence": 0.95,
        "reviewedAt": None,
        "dismissedAt": None,
        "actionTakenAt": None,
    }


def get_auth_headers():
    """Fetch a short-lived bearer token from the Domino sidecar.

    This is the recommended pattern inside a Domino workspace or App — the
    sidecar at localhost:8899 issues a token scoped to the current user
    session, equivalent to a PAT but without static credential management.
    Falls back to empty headers (graceful degradation for local dev).
    """
    try:
        resp = httpx.get("http://localhost:8899/access-token", timeout=2)
        token = resp.text.strip()
        if token.startswith("Bearer "):
            return {"Authorization": token}
        return {"Authorization": f"Bearer {token}"}
    except Exception:
        return {}


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "demo"}


@app.get("/api/user")
def get_user():
    try:
        headers = get_auth_headers()
        resp = httpx.get(f"{DOMINO_API_HOST}/v4/users/self", headers=headers, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {"userName": "demo_user", "fullName": "Demo User", "email": "demo@example.com"}


@app.get("/api/suppliers")
def get_suppliers():
    suppliers = _build_real_suppliers()
    if suppliers is None:
        return JSONResponse(content={"suppliers": [], "source": "no_data"})
    return JSONResponse(content={"suppliers": suppliers, "source": "real_data", "count": len(suppliers)})


@app.get("/api/watchlist")
def get_watchlist():
    suppliers = _build_real_suppliers()
    if suppliers is None:
        return JSONResponse(content={"watchlist": [], "source": "no_data"})
    watchlist = _build_real_watchlist(suppliers)
    return JSONResponse(content={"watchlist": watchlist, "source": "real_data"})


@app.get("/api/alerts")
def get_alerts(since_days: int = 180):
    """Return real FDA regulatory alerts from the curated signal parquets.

    Reads openFDA enforcement signals and FDA Warning Letters, transforms them
    to the alert schema the UI expects, and returns them sorted by severity
    then date.  Returns an empty list (not an error) when the ingest job has
    not yet produced data — the UI falls back to MOCK_ALERTS in that case.
    """
    if pd is None:
        return {"alerts": [], "count": 0, "source": "pandas_unavailable"}

    cutoff = datetime.now(timezone.utc) - timedelta(days=since_days)
    all_alerts: list[dict] = []
    sources_used: list[str] = []

    # FDA regulatory signals
    for path, label in [(SIGNALS_MATCHED, "enforcement"), (WL_MATCHED, "warning_letters")]:
        if not path.exists():
            continue
        try:
            df = pd.read_parquet(path)
            if df.empty:
                continue
            df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce", utc=True)
            df = df[df["event_date"] >= cutoff]
            df = df[df["supplier_id"].notna()]
            for _, row in df.iterrows():
                alert = _signal_to_alert(row.to_dict())
                if alert:
                    all_alerts.append(alert)
            sources_used.append(label)
        except Exception as e:
            print(f"[alerts-read-error] {label}: {e}")

    # Geo / macro signals (earthquakes, weather, FX)
    if GEO_SIGNALS.exists():
        try:
            gdf = pd.read_parquet(GEO_SIGNALS)
            if not gdf.empty:
                gdf["event_date"] = pd.to_datetime(gdf["event_date"], errors="coerce", utc=True)
                gdf = gdf[gdf["event_date"] >= cutoff]
                gdf = gdf[gdf["supplier_id"].notna()]
                for _, row in gdf.iterrows():
                    alert = _geo_signal_to_alert(row.to_dict())
                    if alert:
                        all_alerts.append(alert)
                geo_types = gdf["source"].unique().tolist() if "source" in gdf.columns else []
                sources_used.extend(geo_types)
        except Exception as e:
            print(f"[alerts-read-error] geo_signals: {e}")

    # Tariff signals
    if TARIFF_SIGNALS.exists():
        try:
            tdf = pd.read_parquet(TARIFF_SIGNALS)
            if not tdf.empty:
                tdf["event_date"] = pd.to_datetime(tdf["event_date"], errors="coerce", utc=True)
                tdf = tdf[tdf["supplier_id"].notna()]
                for _, row in tdf.iterrows():
                    alert = _geo_signal_to_alert(row.to_dict())
                    if alert:
                        all_alerts.append(alert)
                sources_used.append("us_tariff_schedule")
        except Exception as e:
            print(f"[alerts-read-error] tariff_signals: {e}")

    # OFAC sanctions screening — only surface matches (not 'clear' rows)
    if OFAC_SIGNALS.exists():
        try:
            odf = pd.read_parquet(OFAC_SIGNALS)
            if not odf.empty:
                odf = odf[odf["severity"] == "critical"]  # only actual matches
                odf = odf[odf["supplier_id"].notna()]
                for _, row in odf.iterrows():
                    alert = _geo_signal_to_alert(row.to_dict())
                    if alert:
                        all_alerts.append(alert)
                if not odf.empty:
                    sources_used.append("ofac_sdn")
        except Exception as e:
            print(f"[alerts-read-error] ofac_signals: {e}")

    sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    all_alerts.sort(
        key=lambda a: (
            sev_order.get(a["severity"], 9),
            -(int(a["date"].replace("-", "")) if a.get("date") else 0),
        ),
    )

    return {
        "alerts": all_alerts,
        "count": len(all_alerts),
        "sources": sources_used,
        "source": "real_data" if all_alerts else "no_data",
    }


@app.get("/api/drug-products")
def get_drug_products():
    """Return drug product list from drug_products.csv."""
    dp_csv = Path(__file__).parent / "data" / "drug_products.csv"
    if pd is None or not dp_csv.exists():
        return JSONResponse(content={"drugProducts": [], "source": "no_data"})
    try:
        df = pd.read_csv(dp_csv, dtype=str).fillna("")
        products = []
        for _, row in df.iterrows():
            sole_ids = [s.strip() for s in str(row.get("sole_supplier_ids", "")).split("|") if s.strip()]
            all_ids  = [s.strip() for s in str(row.get("all_supplier_ids", "")).split("|") if s.strip()]
            products.append({
                "id":           row["drug_id"],
                "name":         row["name"],
                "inn":          row.get("inn", ""),
                "revenue":      int(float(row.get("revenue") or 0)),
                "therapyArea":  row.get("therapy_area", ""),
                "dosageForm":   row.get("dosage_form", ""),
                "stage":        row.get("stage", ""),
                "soleSupplierIds": sole_ids,
                "allSupplierIds":  all_ids,
            })
        return JSONResponse(content={"drugProducts": products, "source": "real_data", "count": len(products)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/tariff-scenarios")
def get_tariff_scenarios():
    """Return real tariff scenarios derived from tariff_signals.parquet."""
    if pd is None or not TARIFF_SIGNALS.exists():
        return JSONResponse(content={"scenarios": [], "source": "no_data"})
    try:
        df = pd.read_parquet(TARIFF_SIGNALS)
        if df.empty:
            return JSONResponse(content={"scenarios": [], "source": "no_data"})

        # Aggregate by country for scenario view
        scenarios = []
        for country, grp in df.groupby("country"):
            total_spend = grp["magnitude"].apply(lambda _: 0).sum()  # magnitude=rate
            # Re-read spend from suppliers_master
            sup_csv = Path(__file__).parent / "data" / "suppliers_master.csv"
            if sup_csv.exists():
                sdf = pd.read_csv(sup_csv, dtype=str).fillna("")
                country_spend = sdf[sdf["country"] == country]["spend"].astype(float).sum()
            else:
                country_spend = 0
            first = grp.iloc[0]
            rate = float(first.get("magnitude", 0))
            severity = str(first.get("severity", "medium"))
            classification = str(first.get("classification", ""))
            scenarios.append({
                "country":       country,
                "tariffRate":    rate,
                "classification": classification,
                "severity":      severity,
                "totalSpend":    int(country_spend),
                "estimatedImpact": int(country_spend * rate / 100),
                "supplierCount": len(grp),
                "description":   str(first.get("description", ""))[:300],
                "sourceUrl":     str(first.get("source_url", "")),
                "effectiveDate": str(first.get("event_date", ""))[:10],
            })
        scenarios.sort(key=lambda s: -s["estimatedImpact"])
        return JSONResponse(content={"scenarios": scenarios, "source": "real_data", "count": len(scenarios)})
    except Exception as e:
        print(f"[tariff-scenarios] {e}")
        return JSONResponse(content={"scenarios": [], "source": "error", "error": str(e)})


@app.get("/api/exec-brief")
def get_exec_brief():
    suppliers = _build_real_suppliers()
    if suppliers is None:
        return JSONResponse(content={"source": "no_data"})
    try:
        _ar = get_alerts(since_days=90)
        alerts_data = _ar["alerts"] if isinstance(_ar, dict) else []
    except Exception:
        alerts_data = []
    brief = _build_real_exec_brief(suppliers, alerts_data)
    return JSONResponse(content=brief)


# ── P3A: Governed audit Dataset (JSONL stand-in) ─────────────────────────────
@app.post("/api/actions")
async def log_action(request: Request):
    body = await request.json()
    body.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
    body.setdefault("actionId", f"act_{int(time.time() * 1000)}")
    _append_jsonl(AUDIT_PATH, body)
    print(f"[ACTION] {json.dumps(body)}")
    return {"status": "logged", "actionId": body["actionId"], "persistedTo": "governed-audit-dataset"}


@app.get("/api/actions")
def get_actions():
    entries = _read_jsonl(AUDIT_PATH)
    return {"actions": entries, "count": len(entries), "source": str(AUDIT_PATH)}


# ── P3B: Weekly retraining status ────────────────────────────────────────────
@app.get("/api/retraining/status")
def retraining_status():
    """Status of the weekly risk-fusion retraining Job.

    In production this pulls from Domino Experiments + Model Registry.
    Here we synthesize plausible values that tie to the audit log volume.
    """
    actions = _read_jsonl(AUDIT_PATH)
    feedback_samples = len(actions)
    now = datetime.now(timezone.utc)

    return {
        "champion": {
            "modelName": "risk-fusion-scorer",
            "version": "v3.4.1",
            "registryUri": "mlflow://models/risk-fusion-scorer/3.4.1",
            "registeredAt": "2026-04-12T03:14:00Z",
            "metrics": {"aucRoc": 0.891, "precisionAt10": 0.78, "brierScore": 0.112},
        },
        "challenger": {
            "modelName": "risk-fusion-scorer",
            "version": "v3.5.0-rc",
            "status": "awaiting-promotion-review",
            "metrics": {"aucRoc": 0.902, "precisionAt10": 0.81, "brierScore": 0.104},
            "delta": "+1.1 AUC, +3pp P@10 vs champion",
        },
        "lastRetrainedAt": "2026-04-13T02:00:00Z",
        "nextScheduledAt": "2026-04-20T02:00:00Z",
        "cadence": "weekly (Sunday 02:00 UTC)",
        "feedback": {
            "totalSamples": feedback_samples,
            "newSinceLastRun": feedback_samples,
            "truePositiveRate": 0.74,
            "falsePositiveRate": 0.11,
            "preferencePairs": max(0, feedback_samples - 3),
        },
        "drift": {
            "signalDistributionPsi": 0.08,
            "status": "within-tolerance",
            "threshold": 0.2,
        },
        "llmReasoner": {
            "modelName": "mitigation-writer-llm",
            "version": "v2.1",
            "preferencePairsSinceLastTune": max(0, feedback_samples - 3),
            "nextTuneScheduled": "2026-04-27T04:00:00Z",
        },
    }


@app.post("/api/retraining/trigger")
def retraining_trigger():
    """API_PENDING: In production this kicks off a Domino Job.
    The UI shows 'API Pending' — we log the intent for audit only."""
    entry = {
        "kind": "retraining-trigger",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "api_pending",
    }
    _append_jsonl(AUDIT_PATH, entry)
    return {"status": "api_pending", "message": "Domino Job trigger API is pending deployment."}


# ── P3C: Outbound webhooks (CAPA, Teams, Anaplan, SharePoint) ────────────────
_WEBHOOK_TARGETS = {
    "capa": {
        "system": "Procurement CAPA",
        "statusOnSend": "api_pending",
        "note": "Outbound webhook to procurement CAPA system is pending.",
    },
    "teams": {
        "system": "Microsoft Teams",
        "statusOnSend": "api_pending",
        "note": "Teams channel webhook is pending configuration.",
    },
    "anaplan": {
        "system": "Anaplan FP&A",
        "statusOnSend": "api_pending",
        "note": "Anaplan export connector is pending.",
    },
    "sharepoint": {
        "system": "SharePoint",
        "statusOnSend": "api_pending",
        "note": "SharePoint distribution webhook is pending.",
    },
}


@app.post("/api/webhooks/{target}")
async def dispatch_webhook(target: str, request: Request):
    body = await request.json()
    cfg = _WEBHOOK_TARGETS.get(target)
    if not cfg:
        return JSONResponse(status_code=404, content={"error": f"unknown webhook target: {target}"})
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "target": target,
        "system": cfg["system"],
        "status": cfg["statusOnSend"],
        "payload": body,
    }
    _append_jsonl(WEBHOOK_PATH, entry)
    print(f"[WEBHOOK] {json.dumps(entry)}")
    return {"status": cfg["statusOnSend"], "system": cfg["system"], "note": cfg["note"]}


@app.get("/api/webhooks")
def list_webhook_deliveries():
    return {"deliveries": _read_jsonl(WEBHOOK_PATH), "targets": _WEBHOOK_TARGETS}


# ── P3D: Role / RBAC scaffold ────────────────────────────────────────────────
@app.get("/api/me")
def get_me():
    """Current user + inferred role.

    In production this reads SSO claims (Okta / Azure AD groups) and maps them
    to app roles. For now we return the logged-in Domino user and let the
    client pick a role for demo purposes.
    """
    user = get_user()
    return {
        "user": user,
        "defaultRole": "supply_chain_analyst",
        "availableRoles": [
            {"id": "supply_chain_analyst", "label": "Supply Chain Analyst",
             "scope": "All supplier risk + watchlist + tariff"},
            {"id": "quality_lead", "label": "Quality Lead",
             "scope": "Regulatory + FDA 483 + CAPA-track alerts"},
            {"id": "regulatory_affairs", "label": "Regulatory Affairs",
             "scope": "Regulatory alerts + DMF-impacting findings"},
            {"id": "procurement_exec", "label": "Procurement Executive",
             "scope": "Exec brief + tariff scenarios + top-5 risks"},
        ],
        "ssoStatus": "api_pending",
    }


# ── openFDA signals (Phase A) ────────────────────────────────────────────────
@app.get("/api/signals/openfda")
def get_openfda_signals(supplier_id: str | None = None, since_days: int = 90, limit: int = 200):
    """Read the curated openFDA enforcement parquet landed by jobs/ingest_openfda.py.

    Returns { status, source, count, lastRun, signals: [...] }. Falls back to
    `status: no_data` when the job has not run yet — the app can keep rendering
    its mock events until real data shows up.
    """
    if pd is None:
        return {"status": "pandas_unavailable", "signals": [], "count": 0}
    if not SIGNALS_MATCHED.exists():
        return {
            "status": "no_data",
            "message": "openFDA ingest job has not produced data yet.",
            "expectedAt": str(SIGNALS_MATCHED),
            "signals": [],
            "count": 0,
        }
    try:
        df = pd.read_parquet(SIGNALS_MATCHED)
        if df.empty:
            return {"status": "empty", "signals": [], "count": 0}
        cutoff = datetime.now(timezone.utc) - timedelta(days=since_days)
        df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce", utc=True)
        df = df[df["event_date"] >= cutoff]
        if supplier_id:
            df = df[df["supplier_id"] == supplier_id]
        df = df.sort_values("event_date", ascending=False).head(limit)
        df["event_date"] = df["event_date"].dt.strftime("%Y-%m-%d")
        signals = json.loads(df.to_json(orient="records", date_format="iso"))
        last_run = None
        if OPENFDA_WATERMARK.exists():
            try:
                last_run = json.loads(OPENFDA_WATERMARK.read_text())
            except Exception:
                pass
        return {
            "status": "ok",
            "source": "openFDA /drug/enforcement.json",
            "count": len(signals),
            "lastRun": last_run,
            "signals": signals,
        }
    except Exception as e:
        print(f"[signals-read-error] {e}")
        return JSONResponse(status_code=500, content={"status": "error", "error": str(e)})


def _load_mock(key):
    """Return empty fallback — frontend uses window globals from mock_data.js."""
    return {}


# ── In-process openFDA ingest (Jobs can't write the volume; App can) ────────
_ingest_state = {
    "running": False,
    "lastStartedAt": None,
    "lastFinishedAt": None,
    "lastStatus": None,
    "lastError": None,
    "lastCount": None,
}


def _run_ingest_once() -> dict:
    _ingest_state["running"] = True
    _ingest_state["lastStartedAt"] = datetime.now(timezone.utc).isoformat()
    _ingest_state["lastError"] = None
    try:
        from jobs import ingest_openfda  # lazy import
        rc = ingest_openfda.main()
        _ingest_state["lastStatus"] = "ok" if rc == 0 else f"exit_{rc}"
        if OPENFDA_WATERMARK.exists():
            try:
                wm = json.loads(OPENFDA_WATERMARK.read_text())
                _ingest_state["lastCount"] = wm.get("reports_ingested_last_run")
            except Exception:
                pass
    except Exception as e:
        _ingest_state["lastStatus"] = "error"
        _ingest_state["lastError"] = str(e)
        print(f"[ingest-error] {e}")
    finally:
        _ingest_state["lastFinishedAt"] = datetime.now(timezone.utc).isoformat()
        _ingest_state["running"] = False
    return dict(_ingest_state)


def _run_geo_ingest_once() -> None:
    try:
        from jobs import ingest_geo_signals
        ingest_geo_signals.main()
    except Exception as e:
        print(f"[geo-ingest-error] {e}")


def _run_tariff_ingest_once() -> None:
    try:
        from jobs import ingest_tariff_signals
        ingest_tariff_signals.main()
    except Exception as e:
        print(f"[tariff-ingest-error] {e}")


def _run_ofac_ingest_once() -> None:
    try:
        from jobs import ingest_ofac
        ingest_ofac.main()
    except Exception as e:
        print(f"[ofac-ingest-error] {e}")


def _ingest_scheduler() -> None:
    """Run all ingest jobs on boot, then on staggered schedules. Survives failures.

    FDA enforcement + WL: every 24h (data updates ~daily)
    Geo signals (USGS, weather, FX): every 6h (weather/FX refresh frequently)
    Tariff signals: every 24h (tariff schedule rarely changes)
    OFAC SDN: every 24h (OFAC updates ~daily)
    """
    time.sleep(15)  # let the app finish booting
    geo_interval    = 6  * 60 * 60   # 6 hours
    fda_interval    = 24 * 60 * 60   # 24 hours
    tariff_interval = 24 * 60 * 60   # 24 hours
    ofac_interval   = 24 * 60 * 60   # 24 hours
    last_geo     = 0.0
    last_fda     = 0.0
    last_tariff  = 0.0
    last_ofac    = 0.0
    while True:
        now = time.time()
        if now - last_fda >= fda_interval:
            try:
                _run_ingest_once()
            except Exception as e:
                print(f"[fda-scheduler-error] {e}")
            last_fda = time.time()
        if now - last_geo >= geo_interval:
            _run_geo_ingest_once()
            last_geo = time.time()
        if now - last_tariff >= tariff_interval:
            _run_tariff_ingest_once()
            last_tariff = time.time()
        if now - last_ofac >= ofac_interval:
            _run_ofac_ingest_once()
            last_ofac = time.time()
        time.sleep(60)  # check every minute


@app.on_event("startup")
def _start_scheduler():
    if os.environ.get("SRR_DISABLE_INGEST") == "1":
        print("[ingest] disabled via SRR_DISABLE_INGEST=1")
        return
    t = threading.Thread(target=_ingest_scheduler, daemon=True, name="ingest-scheduler")
    t.start()
    print("[ingest] background scheduler started (FDA: 24h, geo: 6h, tariff: 24h, OFAC: 24h)")


@app.post("/api/signals/openfda/ingest")
def trigger_ingest():
    if _ingest_state["running"]:
        return {"status": "already_running", "state": _ingest_state}
    t = threading.Thread(target=_run_ingest_once, daemon=True)
    t.start()
    return {"status": "started", "state": _ingest_state}


@app.get("/api/signals/openfda/ingest/status")
def ingest_status():
    return _ingest_state


app.mount("/", StaticFiles(directory="static", html=True), name="static")
