"""Ingest non-FDA geospatial and macro signals for Supply Risk Radar.

Sources:
  - USGS Earthquake Hazards Program  (free, no auth, geospatial)
  - OpenMeteo forecast API            (free, no auth, global weather)
  - open.er-api.com FX rates          (free, no auth, daily refresh)

Writes to:
  signals_curated/geo_signals.parquet  — matched to supplier_id, same
                                         column conventions as openfda_matched.parquet
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

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

VOLUME_ROOT = Path(os.environ.get("SRR_VOLUME_ROOT", "/mnt/data/supply_risk_radar"))
CURATED_ROOT = VOLUME_ROOT / "signals_curated"
STATE_ROOT   = VOLUME_ROOT / "state"

GEO_SIGNALS_PATH = CURATED_ROOT / "geo_signals.parquet"

# ── USGS ─────────────────────────────────────────────────────────────────────
USGS_URL      = "https://earthquake.usgs.gov/fdsnws/event/1/query"
EQ_RADIUS_KM  = 500     # search radius around each supplier site
EQ_MIN_MAG    = 4.5     # only flag earthquakes >= this magnitude
EQ_LOOKBACK   = 30      # days

# ── OpenMeteo ────────────────────────────────────────────────────────────────
METEO_URL       = "https://api.open-meteo.com/v1/forecast"
METEO_DAYS      = 7
WIND_ALERT_KPH  = 60    # sustained wind >= this → weather alert
RAIN_ALERT_MM   = 30    # daily precip >= this   → flood risk

# WMO code → (label, severity)
WMO_SEVERE: dict[int, tuple[str, str]] = {
    65: ("Heavy Rain",                "high"),
    75: ("Heavy Snowfall",            "medium"),
    82: ("Violent Rain Showers",      "high"),
    86: ("Heavy Snow Showers",        "medium"),
    95: ("Thunderstorm",              "high"),
    96: ("Thunderstorm with Hail",    "critical"),
    99: ("Thunderstorm+Heavy Hail",   "critical"),
}

# ── FX rates ─────────────────────────────────────────────────────────────────
FX_URL = "https://open.er-api.com/v6/latest/USD"

# Approximate rates from ~90 days ago (Jan 2026); used to calculate % change.
# Update quarterly.  Source: open.er-api.com historical reference.
FX_BASELINE: dict[str, float] = {
    "INR": 84.50,
    "CNY": 7.28,
    "CHF": 0.89,
    "EUR": 0.93,
    "GBP": 0.80,
    "JPY": 155.0,
}

# Country ISO code → currency (covers our 25 suppliers)
COUNTRY_CURRENCY: dict[str, str] = {
    "India":        "INR",
    "China":        "CNY",
    "Switzerland":  "CHF",
    "Germany":      "EUR",
    "United Kingdom": "GBP",
    "Japan":        "JPY",
}

# Depreciation threshold that triggers an alert (% weakening vs baseline)
FX_ALERT_PCT = 3.0


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


# ── USGS earthquakes ──────────────────────────────────────────────────────────
def fetch_earthquakes(suppliers: pd.DataFrame) -> list[dict]:
    """Return earthquake rows for each supplier within EQ_RADIUS_KM."""
    rows: list[dict] = []
    since = (datetime.now(timezone.utc) - timedelta(days=EQ_LOOKBACK)).strftime("%Y-%m-%d")

    with httpx.Client(timeout=15.0) as client:
        for _, sup in suppliers.iterrows():
            lat = float(sup.get("lat") or 0)
            lng = float(sup.get("lng") or 0)
            if not lat and not lng:
                continue
            try:
                params = {
                    "format": "geojson",
                    "latitude": lat,
                    "longitude": lng,
                    "maxradiuskm": EQ_RADIUS_KM,
                    "minmagnitude": EQ_MIN_MAG,
                    "starttime": since,
                    "orderby": "magnitude",
                    "limit": 5,
                }
                resp = client.get(USGS_URL, params=params)
                resp.raise_for_status()
                features = resp.json().get("features", [])
                for f in features:
                    p = f["properties"]
                    mag = float(p.get("mag") or 0)
                    if mag < EQ_MIN_MAG:
                        continue
                    eq_time = datetime.fromtimestamp(p["time"] / 1000, tz=timezone.utc)
                    if mag >= 6.0:
                        severity = "critical"
                    elif mag >= 5.5:
                        severity = "high"
                    elif mag >= 5.0:
                        severity = "medium"
                    else:
                        severity = "low"
                    rows.append({
                        "signal_id": f"usgs_{f['id']}_{sup['supplier_id']}",
                        "source": "usgs_earthquake",
                        "signal_type": "Environmental",
                        "supplier_id": sup["supplier_id"],
                        "match_score": 100.0,
                        "severity": severity,
                        "classification": f"M{mag:.1f} Earthquake",
                        "title": f"M{mag:.1f} Earthquake – {p.get('place', 'near supplier site')}",
                        "description": (
                            f"Magnitude {mag:.1f} earthquake {p.get('place','')}. "
                            f"Within {EQ_RADIUS_KM}km of {sup['name']} ({sup['city']}, {sup['country']}). "
                            f"Tsunami alert: {'yes' if p.get('tsunami') else 'no'}."
                        ),
                        "source_url": p.get("url"),
                        "event_date": eq_time,
                        "recalling_firm": sup["name"],
                        "city": sup.get("city", ""),
                        "country": sup.get("country", ""),
                        "lat": lat,
                        "lng": lng,
                        "magnitude": mag,
                        "ingested_at": datetime.now(timezone.utc).isoformat(),
                    })
                time.sleep(0.1)  # polite rate limiting
            except Exception as e:
                _log(f"USGS error for {sup['name']}: {e}")

    _log(f"USGS: {len(rows)} earthquake signals across {len(suppliers)} suppliers")
    return rows


# ── OpenMeteo weather ─────────────────────────────────────────────────────────
def fetch_weather_alerts(suppliers: pd.DataFrame) -> list[dict]:
    """Return severe weather rows for each supplier based on 7-day forecast."""
    rows: list[dict] = []

    with httpx.Client(timeout=15.0) as client:
        for _, sup in suppliers.iterrows():
            lat = float(sup.get("lat") or 0)
            lng = float(sup.get("lng") or 0)
            if not lat and not lng:
                continue
            try:
                params = {
                    "latitude": lat,
                    "longitude": lng,
                    "daily": "weathercode,windspeed_10m_max,precipitation_sum",
                    "timezone": "auto",
                    "forecast_days": METEO_DAYS,
                }
                resp = client.get(METEO_URL, params=params)
                resp.raise_for_status()
                daily = resp.json().get("daily", {})
                dates      = daily.get("time", [])
                wmocodes   = daily.get("weathercode", [])
                windspeeds = daily.get("windspeed_10m_max", [])
                precips    = daily.get("precipitation_sum", [])

                for date_str, wmo, wind, rain in zip(dates, wmocodes, windspeeds, precips):
                    wmo   = int(wmo or 0)
                    wind  = float(wind or 0)
                    rain  = float(rain or 0)
                    event_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)

                    alerts_this_day: list[tuple[str, str]] = []
                    if wmo in WMO_SEVERE:
                        alerts_this_day.append(WMO_SEVERE[wmo])
                    if wind >= WIND_ALERT_KPH:
                        alerts_this_day.append((f"High Winds ({wind:.0f} km/h)", "high"))
                    if rain >= RAIN_ALERT_MM:
                        alerts_this_day.append((f"Heavy Precipitation ({rain:.0f} mm)", "high"))

                    for label, severity in alerts_this_day:
                        rows.append({
                            "signal_id": f"meteo_{sup['supplier_id']}_{date_str}_{label[:12].replace(' ','_')}",
                            "source": "openmeteo_weather",
                            "signal_type": "Weather",
                            "supplier_id": sup["supplier_id"],
                            "match_score": 100.0,
                            "severity": severity,
                            "classification": label,
                            "title": f"{label} forecast near {sup['short_name']} site ({date_str})",
                            "description": (
                                f"OpenMeteo 7-day forecast for {sup['name']} ({sup['city']}, {sup['country']}): "
                                f"{label} expected on {date_str}. "
                                f"Wind: {wind:.0f} km/h, Precipitation: {rain:.0f} mm."
                            ),
                            "source_url": "https://open-meteo.com",
                            "event_date": event_date,
                            "recalling_firm": sup["name"],
                            "city": sup.get("city", ""),
                            "country": sup.get("country", ""),
                            "lat": lat,
                            "lng": lng,
                            "magnitude": 0.0,
                            "ingested_at": datetime.now(timezone.utc).isoformat(),
                        })
                time.sleep(0.05)
            except Exception as e:
                _log(f"OpenMeteo error for {sup['name']}: {e}")

    _log(f"OpenMeteo: {len(rows)} weather alerts across {len(suppliers)} suppliers")
    return rows


# ── FX rate signals ───────────────────────────────────────────────────────────
def fetch_fx_alerts(suppliers: pd.DataFrame) -> list[dict]:
    """Flag currencies that have depreciated >= FX_ALERT_PCT vs the baseline."""
    rows: list[dict] = []
    try:
        resp = httpx.get(FX_URL, timeout=10.0)
        resp.raise_for_status()
        current_rates = resp.json().get("rates", {})
    except Exception as e:
        _log(f"FX fetch error: {e}")
        return []

    today = datetime.now(timezone.utc).date().isoformat()
    alerted_currencies: set[str] = set()

    for _, sup in suppliers.iterrows():
        country = sup.get("country", "")
        currency = COUNTRY_CURRENCY.get(country)
        if not currency or currency in alerted_currencies:
            continue
        baseline = FX_BASELINE.get(currency)
        current  = current_rates.get(currency)
        if not baseline or not current:
            continue

        # Positive pct = currency weakened vs USD (costs more USD per unit)
        pct_change = (current - baseline) / baseline * 100
        if abs(pct_change) < FX_ALERT_PCT:
            continue

        alerted_currencies.add(currency)
        direction = "weakened" if pct_change > 0 else "strengthened"
        severity = "high" if abs(pct_change) >= 8 else "medium"

        # Find all suppliers in this country
        country_sups = suppliers[suppliers["country"] == country]
        for _, cs in country_sups.iterrows():
            spend = int(float(cs.get("spend") or 0))
            impact_usd = int(spend * abs(pct_change) / 100)
            rows.append({
                "signal_id": f"fx_{currency}_{today}_{cs['supplier_id']}",
                "source": "fx_rate",
                "signal_type": "Tariff",
                "supplier_id": cs["supplier_id"],
                "match_score": 100.0,
                "severity": severity,
                "classification": f"FX {direction.title()} {abs(pct_change):.1f}%",
                "title": f"{currency} {direction} {abs(pct_change):.1f}% vs USD – cost impact on {cs['short_name']}",
                "description": (
                    f"{currency} has {direction} {abs(pct_change):.1f}% against USD since Q1 2026 baseline "
                    f"({baseline:.4f} → {current:.4f}). "
                    f"Estimated spend impact for {cs['name']}: ~${impact_usd:,} on ${spend:,} annual spend."
                ),
                "source_url": "https://open.er-api.com",
                "event_date": datetime.now(timezone.utc),
                "recalling_firm": cs["name"],
                "city": cs.get("city", ""),
                "country": country,
                "lat": float(cs.get("lat") or 0),
                "lng": float(cs.get("lng") or 0),
                "magnitude": abs(pct_change),
                "ingested_at": datetime.now(timezone.utc).isoformat(),
            })

    _log(f"FX: {len(rows)} currency-impact signals (currencies flagged: {alerted_currencies})")
    return rows


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> int:
    _log("=== geo_signals ingest starting ===")
    suppliers = load_suppliers()
    if suppliers.empty:
        _log("no suppliers found — aborting")
        return 1

    _log(f"loaded {len(suppliers)} suppliers")
    all_rows: list[dict] = []
    all_rows.extend(fetch_earthquakes(suppliers))
    all_rows.extend(fetch_weather_alerts(suppliers))
    all_rows.extend(fetch_fx_alerts(suppliers))

    if not all_rows:
        _log("no geo signals found this run")
        return 0

    df = pd.DataFrame(all_rows)
    df["event_date"] = pd.to_datetime(df["event_date"], utc=True, errors="coerce")
    df = df.drop_duplicates(subset=["signal_id"], keep="last")
    _upsert_parquet(GEO_SIGNALS_PATH, df)
    _log(f"=== geo_signals ingest complete: {len(df)} total signals ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
