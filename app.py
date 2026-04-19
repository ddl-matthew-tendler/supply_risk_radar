import os
import json
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import httpx

app = FastAPI()

DOMINO_API_HOST = os.environ.get("DOMINO_API_HOST", "http://localhost:8899")
actions_log = []


def get_auth_headers():
    api_key = os.environ.get("API_KEY_OVERRIDE", "")
    if api_key:
        return {"X-Domino-Api-Key": api_key}
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
def get_alerts():
    return JSONResponse(content=_load_mock("alerts"))


@app.get("/api/tariff-scenarios")
def get_tariff_scenarios():
    return JSONResponse(content=_load_mock("tariff_scenarios"))


@app.get("/api/exec-brief")
def get_exec_brief():
    return JSONResponse(content=_load_mock("exec_brief"))


@app.post("/api/actions")
async def log_action(request: Request):
    body = await request.json()
    actions_log.append(body)
    print(f"[ACTION] {json.dumps(body)}")
    return {"status": "logged", "count": len(actions_log)}


@app.get("/api/actions")
def get_actions():
    return {"actions": actions_log}


def _load_mock(key):
    """Return empty fallback — frontend uses window globals from mock_data.js."""
    return {}


app.mount("/", StaticFiles(directory="static", html=True), name="static")
