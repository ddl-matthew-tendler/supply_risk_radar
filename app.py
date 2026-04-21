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
    "/mnt/netapp-volumes/Supply_Risk_Radar",
))
SIGNALS_MATCHED = SRR_VOLUME_ROOT / "signals_curated" / "openfda_matched.parquet"
WL_MATCHED     = SRR_VOLUME_ROOT / "signals_curated" / "fda_warning_letters.parquet"
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


# ── Alert ETL: supplier/drug lookup + signal → alert schema ──────────────────
# Seeded from the demo supplier master in mock_data.js; replaced by
# suppliers_master.parquet in Phase B.
_SUPPLIER_NAMES: dict[str, str] = {
    "s001": "Aurobindo Pharma Unit VII",
    "s002": "Zhejiang Huahai Pharmaceutical",
    "s003": "Divi's Laboratories Unit II",
    "s004": "Hisun Pharmaceuticals",
    "s005": "Laurus Labs API Unit",
    "s006": "Sun Pharmaceutical Ind. Ltd",
    "s007": "Jiangsu Hengrui Medicine",
    "s008": "Almac Group Ltd",
    "s009": "Lonza AG Visp Site",
    "s010": "Boehringer Ingelheim BioXcellence",
    "s011": "Siegfried AG Hameln",
    "s012": "Cambrex Corp High Point",
    "s013": "Dr. Reddy's Laboratories CPS",
}

_SUPPLIER_DRUG_IMPACT: dict[str, list[str]] = {
    "s001": ["Vexorin (dp001) – sole KSM source, $2.1B revenue", "Cardivance (dp002) – $1.45B revenue"],
    "s002": ["Lumizap (dp003) – primary API source, $890M revenue"],
    "s003": ["Vexorin (dp001) – KSM source, $2.1B revenue", "Renolyx (dp004) – $670M revenue"],
    "s004": ["Axitrel (dp005) – $540M revenue"],
    "s005": ["Nevrex (dp006) – sole API source, $420M revenue, zero alternates"],
    "s006": ["Cardivance (dp002) – $1.45B revenue", "Inflameze (dp007) – $310M revenue"],
    "s007": ["Lumizap (dp003) – $890M revenue", "Axitrel (dp005) – $540M revenue"],
    "s008": ["Coatrix DP (dp008) – $280M revenue"],
    "s009": ["Biorexin (dp009) – sole CMO source, $750M revenue"],
    "s010": ["Zeltavir (dp010) – $195M revenue"],
}

_CLASSIFICATION_SEVERITY: dict[str, str] = {
    "Class I": "critical",
    "Class II": "high",
    "Class III": "medium",
    "Warning Letter": "critical",
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
    return JSONResponse(content=_load_mock("suppliers"))


@app.get("/api/watchlist")
def get_watchlist():
    return JSONResponse(content=_load_mock("watchlist"))


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


@app.get("/api/tariff-scenarios")
def get_tariff_scenarios():
    return JSONResponse(content=_load_mock("tariff_scenarios"))


@app.get("/api/exec-brief")
def get_exec_brief():
    return JSONResponse(content=_load_mock("exec_brief"))


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


def _ingest_scheduler() -> None:
    """Run ingest on boot, then every 24h. Survives failures."""
    time.sleep(15)  # let the app finish booting
    while True:
        try:
            _run_ingest_once()
        except Exception as e:
            print(f"[scheduler-error] {e}")
        time.sleep(24 * 60 * 60)


@app.on_event("startup")
def _start_scheduler():
    if os.environ.get("SRR_DISABLE_INGEST") == "1":
        print("[ingest] disabled via SRR_DISABLE_INGEST=1")
        return
    t = threading.Thread(target=_ingest_scheduler, daemon=True, name="openfda-ingest")
    t.start()
    print("[ingest] background scheduler started")


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
