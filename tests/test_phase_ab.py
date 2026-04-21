"""
Phase A + B acceptance tests for Supply Risk Radar.

Run with:  python tests/test_phase_ab.py
"""
from __future__ import annotations

import importlib
import json
import os
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"

results: list[tuple[bool, str, str]] = []


def check(name: str, condition: bool, detail: str = "") -> bool:
    status = PASS if condition else FAIL
    print(f"  [{status}] {name}" + (f" — {detail}" if detail else ""))
    results.append((condition, name, detail))
    return condition


# ─────────────────────────────────────────────────────────────────────────────
print("\n=== Phase A: ingest_openfda.py ===\n")

try:
    import jobs.ingest_openfda as m
    importlib.reload(m)

    # AC-A1: module imports without error
    check("A1 module imports", True)

    # AC-A2: load_suppliers_master returns >= 25 rows with required columns
    suppliers = m.load_suppliers_master()
    check("A2 suppliers loaded ≥25", len(suppliers) >= 25, f"got {len(suppliers)}")
    required_cols = {"supplier_id", "name", "city", "country", "fda_aliases"}
    missing = required_cols - set(suppliers.columns)
    check("A2 suppliers columns", not missing, f"missing={missing}")

    # AC-A3: punctuation normalizer
    norm = m._norm("Sun Pharmaceutical Industries, Inc.")
    check("A3 _norm strips punctuation", "," not in norm and "." not in norm, repr(norm))

    # AC-A4: alias expansion — Sun Pharma US subsidiary name matches at ≥85
    import pandas as pd
    test_df = pd.DataFrame([{
        "signal_id": "x1",
        "recalling_firm": "Sun Pharmaceutical Industries, Inc.",
        "manufacturer_name": "",
        "city": "Cranbury",
        "country": "US",
    }])
    matched, _ = m.match_to_suppliers(test_df, suppliers)
    row = matched.iloc[0]
    check("A4 Sun Pharma alias match", row["supplier_id"] == "s001",
          f"sid={row['supplier_id']} score={row['match_score']:.0f}")

    # AC-A5: manufacturer_name fallback — distributor as recalling_firm, mfr matches our supplier
    test_df2 = pd.DataFrame([{
        "signal_id": "x2",
        "recalling_firm": "McKesson Corporation",
        "manufacturer_name": "Aurobindo Pharma USA Inc",
        "city": "Irving",
        "country": "US",
    }])
    matched2, _ = m.match_to_suppliers(test_df2, suppliers)
    row2 = matched2.iloc[0]
    check("A5 mfr_name fallback (McKesson→Aurobindo)", row2["supplier_id"] == "s006",
          f"sid={row2['supplier_id']} score={row2['match_score']:.0f}")

    # AC-A6: pure distributor with no mfr match stays unmatched
    test_df3 = pd.DataFrame([{
        "signal_id": "x3",
        "recalling_firm": "McKesson Corporation",
        "manufacturer_name": "Some Random LLC",
        "city": "Irving",
        "country": "US",
    }])
    matched3, review3 = m.match_to_suppliers(test_df3, suppliers)
    check("A6 unknown distributor unmatched", matched3.iloc[0]["supplier_id"] is None,
          f"sid={matched3.iloc[0]['supplier_id']}")
    check("A6 unmatched → review_queue", len(review3) == 1)

    # AC-A7: normalize() captures manufacturer_name field
    sample = [{
        "event_id": "99999",
        "recalling_firm": "Cardinal Health",
        "city": "Dublin",
        "state": "OH",
        "country": "US",
        "classification": "Class II",
        "status": "Ongoing",
        "product_description": "test product",
        "reason_for_recall": "CGMP deviation",
        "report_date": "20240101",
        "recall_initiation_date": "20240101",
        "recall_number": "D-9999-2024",
        "openfda": {"manufacturer_name": ["Cipla USA Inc"]},
    }]
    norm_df = m.normalize(sample)
    check("A7 normalize captures manufacturer_name",
          "manufacturer_name" in norm_df.columns and norm_df.iloc[0]["manufacturer_name"] == "Cipla USA Inc")

    # AC-A8: batch matching — 9/12 known aliases match (real FDA firm names)
    batch = pd.DataFrame([
        {"signal_id": f"b{i}", "recalling_firm": firm, "manufacturer_name": "", "city": city, "country": country}
        for i, (firm, city, country) in enumerate([
            ("Sun Pharmaceutical Industries, Inc.", "Cranbury", "US"),
            ("Aurobindo Pharma USA Inc", "Dayton", "US"),
            ("Cipla USA Inc", "South Plainfield", "US"),
            ("NATCO Pharma Limited", "Hyderabad", "India"),
            ("WuXi AppTec", "Shanghai", "China"),
            ("Dr Reddys Laboratories Inc", "Shreveport", "US"),
            ("Fresenius Kabi USA LLC", "Wilson", "US"),
            ("Zhejiang Huahai Pharmaceutical", "Linhai", "China"),
            ("Granules USA Inc", "Chantilly", "US"),
        ])
    ])
    matched_batch, _ = m.match_to_suppliers(batch, suppliers)
    n_matched = matched_batch["supplier_id"].notna().sum()
    check("A8 batch alias matching ≥9/9", n_matched >= 9, f"{n_matched}/9 matched")

except Exception as e:
    check("Phase A module load", False, traceback.format_exc(limit=3))


# ─────────────────────────────────────────────────────────────────────────────
print("\n=== Phase B: supplier master & drug products ===\n")

try:
    import pandas as pd

    # AC-B1: suppliers_master.csv exists and has ≥25 rows
    csv_path = Path("data/suppliers_master.csv")
    check("B1 suppliers_master.csv exists", csv_path.exists())
    if csv_path.exists():
        df_s = pd.read_csv(csv_path)
        check("B1 ≥25 suppliers", len(df_s) >= 25, f"got {len(df_s)}")
        required = {"supplier_id", "name", "country", "risk_score", "fda_aliases"}
        missing = required - set(df_s.columns)
        check("B1 required columns", not missing, f"missing={missing}")
        # fda_aliases not empty for at least half
        alias_populated = df_s["fda_aliases"].notna() & (df_s["fda_aliases"].str.strip() != "")
        check("B1 fda_aliases populated ≥50%", alias_populated.sum() >= len(df_s) // 2,
              f"{alias_populated.sum()}/{len(df_s)}")

    # AC-B2: drug_products.csv exists and has ≥10 rows with required columns
    dp_path = Path("data/drug_products.csv")
    check("B2 drug_products.csv exists", dp_path.exists())
    if dp_path.exists():
        df_d = pd.read_csv(dp_path)
        check("B2 ≥10 drug products", len(df_d) >= 10, f"got {len(df_d)}")
        required_d = {"drug_id", "name", "all_supplier_ids"}
        missing_d = required_d - set(df_d.columns)
        check("B2 drug_products columns", not missing_d, f"missing={missing_d}")

    # AC-B3: app.py _load_supplier_lookup returns non-empty dicts
    import importlib, app as app_mod
    importlib.reload(app_mod)
    names, drug_impact = app_mod._load_supplier_lookup()
    check("B3 supplier names dict non-empty", len(names) >= 25, f"got {len(names)}")
    check("B3 drug_impact dict non-empty", len(drug_impact) >= 1, f"got {len(drug_impact)}")

except Exception as e:
    check("Phase B data load", False, traceback.format_exc(limit=3))


# ─────────────────────────────────────────────────────────────────────────────
print("\n=== Phase A+B: /api/alerts ETL ===\n")

try:
    import importlib, app as app_mod
    importlib.reload(app_mod)

    # AC-E1: _signal_to_alert handles valid enforcement row
    sample_row = {
        "signal_id": "TEST001",
        "source": "openfda_enforcement",
        "supplier_id": "s001",
        "match_score": 95.0,
        "classification": "Class I",
        "reason_for_recall": "Contamination with NDMA",
        "recalling_firm": "Sun Pharmaceutical Industries, Inc.",
        "product_description": "Metformin HCl 500mg tablets",
        "recall_number": "D-0001-2024",
        "report_date": "20240115",
        "recall_initiation_date": "20240110",
        "source_url": "https://example.com",
        "event_date": pd.Timestamp("2024-01-15"),
    }
    alert = app_mod._signal_to_alert(sample_row)
    check("E1 _signal_to_alert returns dict", isinstance(alert, dict))
    if alert:
        check("E1 severity=critical for Class I", alert.get("severity") == "critical",
              f"severity={alert.get('severity')}")
        check("E1 supplierId set", alert.get("supplierId") == "s001")
        check("E1 type=Regulatory", alert.get("type") == "Regulatory")
        check("E1 has drugImpact list", isinstance(alert.get("drugImpact"), list))

    # AC-E2: _signal_to_alert returns None when supplier_id missing
    bad_row = {**sample_row, "supplier_id": None}
    result_none = app_mod._signal_to_alert(bad_row)
    check("E2 returns None if no supplier_id", result_none is None)

    # AC-E3: severity mapping
    for cls, expected in [("Class I", "critical"), ("Class II", "high"),
                           ("Class III", "medium"), ("Warning Letter", "critical")]:
        row = {**sample_row, "classification": cls}
        a = app_mod._signal_to_alert(row)
        check(f"E3 severity {cls}→{expected}", a and a.get("severity") == expected,
              f"got {a.get('severity') if a else None}")

except Exception as e:
    check("Phase ETL", False, traceback.format_exc(limit=3))


# ─────────────────────────────────────────────────────────────────────────────
print("\n=== Summary ===\n")

n_pass = sum(1 for ok, _, _ in results if ok)
n_total = len(results)
pct = 100 * n_pass // n_total if n_total else 0
print(f"  {n_pass}/{n_total} checks passed ({pct}%)")

failures = [(name, detail) for ok, name, detail in results if not ok]
if failures:
    print("\nFailed checks:")
    for name, detail in failures:
        print(f"  - {name}: {detail}")

sys.exit(0 if n_pass == n_total else 1)
