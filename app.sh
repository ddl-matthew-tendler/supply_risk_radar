#!/bin/bash
set -euo pipefail

# ── Supply Risk Radar — Domino App entrypoint ─────────────────────────────────
# Point the Domino App to this file as the run command.
#
# What this does:
#   1. Installs/verifies Python dependencies
#   2. Sets SRR_VOLUME_ROOT to the mounted NetApp volume
#   3. Passes the openFDA API key from Domino env vars (optional)
#   4. Starts uvicorn on port 8888 (Domino App default)

cd "$(dirname "$0")"

# ── 1. Dependencies ───────────────────────────────────────────────────────────
echo "[app.sh] installing dependencies..."
pip install -q -r requirements.txt

# ── 2. Volume root ────────────────────────────────────────────────────────────
# Domino mounts the NetApp dataset at /mnt/data/supply_risk_radar.
# Override with SRR_VOLUME_ROOT env var in the App config if the mount path differs.
export SRR_VOLUME_ROOT="${SRR_VOLUME_ROOT:-/mnt/data/supply_risk_radar}"
echo "[app.sh] SRR_VOLUME_ROOT=${SRR_VOLUME_ROOT}"

# ── 3. openFDA API key (optional but recommended) ─────────────────────────────
# Set OPENFDA_API_KEY in the Domino App environment variables to remove the
# 1,000 req/day anonymous cap. Register free at https://open.fda.gov/apis/authentication/
if [ -n "${OPENFDA_API_KEY:-}" ]; then
    echo "[app.sh] openFDA API key found"
else
    echo "[app.sh] OPENFDA_API_KEY not set — running anonymous (rate-limited)"
fi

# ── 4. Start the app ──────────────────────────────────────────────────────────
echo "[app.sh] starting uvicorn on port 8888..."
exec uvicorn app:app --host 0.0.0.0 --port 8888 --workers 1
