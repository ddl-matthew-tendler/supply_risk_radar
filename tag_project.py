"""
One-shot script to tag the Supply Risk Radar project with the reduced
4-core-namespace taxonomy.

Usage (local):
    export DOMINO_API_HOST=https://life-sciences-demo.domino-eval.com
    export DOMINO_API_KEY=<your-api-key>
    python tag_project.py

Usage (inside a Domino workspace/job): env vars are already set; just run it.
"""
import os
import sys
import requests

PROJECT_ID = "69e5168d730d5f79d9bada15"  # supply_risk_radar

HOST = os.environ.get("DOMINO_API_HOST", "https://life-sciences-demo.domino-eval.com").rstrip("/")


def auth_headers():
    key = os.environ.get("DOMINO_API_KEY") or os.environ.get("DOMINO_USER_API_KEY")
    if key:
        return {"X-Domino-Api-Key": key, "Content-Type": "application/json"}
    # Fallback: token sidecar inside Domino workspace/job
    resp = requests.get("http://localhost:8899/access-token", timeout=5)
    token = resp.text.strip()
    if not token.startswith("Bearer "):
        token = f"Bearer {token}"
    return {"Authorization": token, "Content-Type": "application/json"}


# The reduced taxonomy for this app. Namespaced as "Namespace/Value".
# Only the values that actually apply to this demo project are applied here;
# per-supplier/per-alert tagging lives in the app data, not at the project level.
TAGS = [
    # Core app namespaces
    "Supply_Category/API",
    "Supply_Category/KSM",
    "Supply_Category/Excipient",
    "Supply_Category/CMO",
    "Supply_Category/Packaging",

    "Supply_Tier/Tier-1",
    "Supply_Tier/Tier-2",
    "Supply_Tier/Tier-3",

    "Risk_Level/Critical",
    "Risk_Level/High",
    "Risk_Level/Medium",
    "Risk_Level/Low",

    "Risk_Driver/Regulatory",
    "Risk_Driver/Weather",
    "Risk_Driver/Geopolitical",
    "Risk_Driver/Tariff",
    "Risk_Driver/News",

    # Org-level context (reuse existing values if they already exist)
    "Therapeutic_Area/Oncology",
    "Therapeutic_Area/Cardiometabolic",
    "Therapeutic_Area/Immunology",

    "Data_Source/openFDA",
    "Data_Source/NOAA",
    "Data_Source/USTR",
    "Data_Source/Resilinc",
    "Data_Source/SAP",
]


def main():
    url = f"{HOST}/v4/projects/{PROJECT_ID}/tags"
    headers = auth_headers()
    print(f"POST {url}")
    print(f"  tags: {len(TAGS)}")
    resp = requests.post(url, headers=headers, json={"tagNames": TAGS}, timeout=30)
    print(f"  status: {resp.status_code}")
    print(f"  body:   {resp.text[:500]}")
    if resp.status_code >= 300:
        sys.exit(1)


if __name__ == "__main__":
    main()
