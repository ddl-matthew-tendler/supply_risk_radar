# Supply Risk Radar — Architecture & Productionization Review

**Audience:** Engineering / architecture lead evaluating the prototype for a real offering
**Prepared:** 2026-04-20
**Scope:** Current implementation state, gaps, and path to production

---

## 1. Executive summary

Supply Risk Radar is a pharma-native dashboard that fuses regulatory, weather, geopolitical, tariff, and logistics signals with the sponsor's Bill of Materials and qualified-alternate data, then surfaces ranked, BOM-aware supplier × drug-product risk pairs with LLM-drafted mitigations and a governed audit trail.

The prototype is **UI-complete and data-stubbed**. Every screen the buyer will see in a demo works end-to-end against in-memory mocks. Every integration that would make it *useful in production* — real signal feeds, risk-fusion model, LLM calls, SSO, persistence, webhooks — is either a hardcoded fallback or an `api_pending` stub.

**TL;DR for the lead:** buy the UX and information architecture, throw away the data layer, wire real Domino primitives (Datasets, Jobs, Model Registry, governed endpoints) behind the existing FastAPI shape. Two phases, ~4 months to a defensible v1.

---

## 2. What's been built

### User journeys implemented
1. **Morning triage** — world map + ranked watchlist of 10 supplier/drug pairs, each with risk score, reasoning chain, source citations, and mitigation suggestion.
2. **Agent-assisted action** — click a card → open one of 8 specialized agents (Scribe, Historian, Scout, Analyst, Verifier, Negotiator, Forecaster, Briefer); each streams a tool-use-style output and offers a "log action + rationale" flow.
3. **Tariff scenario modeling** — pick among 3 pre-built scenarios, see COGS exposure bars.
4. **Weekly executive brief** — auto-drafted, print-ready summary.
5. **Audit log** — read-only view of logged actions + rationales.
6. **Role filter** — Analyst / Quality / Regulatory / Procurement Exec swap the alert mix.

### Architecture at a glance

```
┌──────────────────────────────────────────────────────────┐
│  Browser (React 18 via CDN, no build step)               │
│  ┌────────────────────────────────────────────────────┐  │
│  │ index.html → mock_data.js → agents.js → app.js     │  │
│  │                                                    │  │
│  │  Tabs: Dashboard | Watchlist | Alerts | Tariffs |  │  │
│  │        Brief | Audit                               │  │
│  │                                                    │  │
│  │  SupplierMap (Highcharts)   AgentRunner modal      │  │
│  │  WatchlistCard              LogActionModal         │  │
│  │  AlertCard                  TariffModeler          │  │
│  └──────────────────┬─────────────────────────────────┘  │
│                     │ fetch (relative URLs)              │
└─────────────────────┼────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────┐
│  FastAPI (uvicorn, 0.0.0.0:8888)   app.py ~268 LOC       │
│                                                          │
│  GET  /api/suppliers   /api/watchlist   /api/alerts      │
│  GET  /api/tariff-scenarios   /api/exec-brief            │
│  GET  /api/user        (→ Domino /v4/users/self)         │
│  GET  /api/me          (hardcoded roles)                 │
│  GET/POST /api/actions (→ JSONL audit log)               │
│  POST /api/webhooks/{target}  (stub; JSONL)              │
│  POST /api/retraining/trigger (stub)                     │
└─────────────────────┬────────────────────────────────────┘
                      │ (only one real call today)
┌─────────────────────▼────────────────────────────────────┐
│  Domino platform — /v4/users/self only                   │
│  Everything else: MOCK_* globals in mock_data.js         │
└──────────────────────────────────────────────────────────┘
```

### Code map

| File | LOC | Role |
|---|---:|---|
| [app.py](app.py) | 267 | FastAPI routes, audit/webhook JSONL sinks, Domino auth helper |
| [static/app.js](static/app.js) | 2,018 | React app: theme, tabs, map, cards, modals, tariff modeler, brief, audit |
| [static/agents.js](static/agents.js) | 767 | 8 agent personas, hardcoded multi-step task generators, streaming UI |
| [static/mock_data.js](static/mock_data.js) | 395 | 25 suppliers, 10 drugs, 10 watchlist cards, alerts, scenarios, brief |
| [static/index.html](static/index.html) | 253 | CDN boilerplate (React, AntD 5.11.2, Day.js, Highcharts), sequential loader |
| [FDE_SupplyRiskRadar_NonGxP copy.md](FDE_SupplyRiskRadar_NonGxP%20copy.md) | 449 | Business case, personas, metrics, data-source catalog, governance |

---

## 3. What's real vs. mocked

| Capability | State | Evidence |
|---|---|---|
| UI / tabs / map / cards | ✅ Real | [app.js](static/app.js) |
| Watchlist risk scores & reasoning | ❌ Hardcoded | [mock_data.js](static/mock_data.js) |
| Alerts (reg/weather/tariff/labor) | ❌ Hardcoded | [mock_data.js](static/mock_data.js) |
| Agent outputs (outreach letters, alternate lists, analysis) | ❌ Hardcoded strings | [agents.js](static/agents.js) `TASKS[taskId]` |
| Tariff what-if | ❌ Deterministic mock | [mock_data.js](static/mock_data.js) |
| Domino user lookup | ✅ Real (with fallback) | [app.py:73](app.py) |
| Role-based access | ⚠️ FE-only cosmetic filter | [app.js:250](static/app.js) |
| Action audit log | ✅ Real (JSONL on disk) | [app.py](app.py) `/api/actions` |
| Retraining trigger | ❌ Stub returns `api_pending` | [app.py:174](app.py) |
| Webhooks (Teams/CAPA/Anaplan/SharePoint) | ❌ Stub returns `api_pending` | [app.py:187](app.py) |
| SSO / MNPI controls | ❌ Not implemented | — |

---

## 4. Gaps to close before this is a real offering

### Tier 1 — blocks any pilot

1. **No real signal ingestion.** Zero of the FDE's listed sources (openFDA, EMA EudraGMDP, NOAA, GDELT, Factiva, Panjiva, USTR, SAP/Ariba) are wired. This is the product.
2. **No risk-fusion model.** Scores are literals in [mock_data.js](static/mock_data.js). No Domino Experiment, no Model Registry, no inference endpoint, no SHAP (the "reasoning chain" is narrative, not model-derived).
3. **Agents don't call an LLM.** Every "streamed" agent output is a prewritten string with animated typing. No Claude/LLM call, no prompt templates, no source grounding, no hallucination controls.
4. **Auth is cosmetic.** The role picker is a client-side dropdown. Backend enforces nothing. For pharma supply + BOM + supplier financials this is MNPI-adjacent — it *cannot* ship this way.
5. **Persistence is `/tmp/*.jsonl`.** Audit log, webhook log, and user preferences will vanish on container restart. No DB, no Domino Dataset, no rotation.

### Tier 2 — blocks scale / enterprise buy

6. **Webhooks are fire-and-forget stubs.** Teams, CAPA, Anaplan, SharePoint all log locally and return `api_pending`. No retry, no DLQ, no delivery receipts.
7. **Rebuild triggers are stubs.** [app.py:174](app.py) logs intent but never hits Domino Jobs API.
8. **No real-time path.** Frontend polls on a 15-min timer. At 100s of suppliers × 1000s of daily signals, need an event bus (Kafka / Pub/Sub) → scoring job → pushed updates.
9. **Tariff modeler is 3 hardcoded scenarios.** Real use demands an optimizer over HS-codes × suppliers × qualified alternates × lead time × qualification cost.
10. **Map won't scale past demo.** Highcharts SVG at 25 markers is fine; at 1k+ it degrades. Needs clustering and a licensed Highcharts Maps tier.

### Tier 3 — polish

- PDF export of executive brief (currently print-to-PDF only).
- Mobile layout tested, not verified.
- No error states when APIs fail — silent fallback to mocks masks outages.
- Concurrent writes to JSONL audit log have no locking.

---

## 5. Proposed target architecture

```
┌────────────────────────────────────────────────────────────────┐
│  React SPA (same shell — preserve UX)                          │
└──────────────────┬─────────────────────────────────────────────┘
                   │ relative URLs behind Domino nginx
┌──────────────────▼─────────────────────────────────────────────┐
│  FastAPI gateway  (preserve route shapes; swap bodies)         │
│    • SSO (Okta/Azure AD) → RBAC enforced per endpoint          │
│    • MNPI gating on BOM + supplier financial fields            │
└──┬───────────────┬───────────────┬──────────────┬──────────────┘
   │               │               │              │
   ▼               ▼               ▼              ▼
┌────────┐  ┌──────────────┐ ┌────────────┐ ┌─────────────────┐
│ Domino │  │ Risk-fusion  │ │ LLM agents │ │ Webhook router  │
│Dataset │  │ model        │ │ (Claude)   │ │ Teams / CAPA /  │
│ (audit,│  │ (Model Reg)  │ │  with      │ │ Anaplan / SP    │
│ prefs, │  │ SHAP explain │ │  source-   │ │ retry + DLQ     │
│ actions│  │ champion/    │ │  grounded  │ └─────────────────┘
│ )      │  │ challenger   │ │  prompts   │
└────────┘  └──────▲───────┘ └─────▲──────┘
                   │               │
           ┌───────┴───────┐  ┌────┴──────────────────┐
           │ Feature store │  │ Prompt templates +    │
           │ (Snowflake /  │  │ citation enforcement  │
           │ Domino DS)    │  └───────────────────────┘
           └───────▲───────┘
                   │
     ┌─────────────┴──────────────────────────────┐
     │ Ingestion (Domino Jobs, scheduled)         │
     │   openFDA · EMA · NOAA · GDELT · Factiva · │
     │   Panjiva · USTR/HTS · SAP Ariba · CMC     │
     └────────────────────────────────────────────┘
```

Key design bets:
- **Keep the FastAPI contract.** The current endpoints are well-shaped; swap implementations, don't rewrite the frontend.
- **Domino-native where possible.** Datasets for audit, Jobs for ingestion + retraining, Model Registry for scoring, Experiments for champion/challenger. This is the story the platform is supposed to tell.
- **LLM behind a prompt template layer** with mandatory source citations. Agent outputs should be unable to render without a `sources[]` array attached.

---

## 6. Phased plan

### Phase 1 — defensible pilot (4–8 weeks)

Goal: one drug family, one customer, real data end-to-end on the critical path.

- [ ] SSO + backend-enforced RBAC on every route
- [ ] Replace `/tmp/*.jsonl` with a Domino Dataset (versioned, immutable)
- [ ] Wire **two** real signal sources (openFDA 483s + NOAA weather) via a scheduled Domino Job
- [ ] Wire BOM + AVL for one product family from Domino Data Catalog
- [ ] Replace 3 agents (Scribe, Analyst, Forecaster) with real Claude calls + source-grounded prompts
- [ ] Domino Jobs API for retraining trigger (kill the stub at [app.py:174](app.py))
- [ ] Error states in UI when APIs degrade (stop silently falling back to mocks)

### Phase 2 — production v1 (additional 8–12 weeks)

- [ ] Remaining signal sources (EMA, GDELT/Factiva, Panjiva, USTR)
- [ ] Risk-fusion model (XGBoost or similar) with SHAP, weekly retrain, A/B vs. static scores
- [ ] Real webhook router (Teams, CAPA, Anaplan, SharePoint) with retry + DLQ
- [ ] Tariff optimizer (LP solver over HS × supplier × alternate × cost × lead time)
- [ ] MNPI controls + audit-committee export
- [ ] Map clustering; Highcharts Maps commercial license
- [ ] PDF export of exec brief

### Cross-cutting

- Model Risk Management: validation pack, drift monitoring, change control, quarterly review.
- LLM safety: source-grounding, citation enforcement, MNPI guardrails, defamation review of supplier-named outputs.
- Data-sharing agreements with supplier data vendors; EU data residency for EMA-sourced fields.

---

## 7. Risks the lead should raise now

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Defamation / MNPI** when agents name specific suppliers in drafted outreach or briefs | Pharma GC will block launch | Citation-enforced prompts, legal review of generated supplier-named outputs, MNPI RBAC |
| **"It's all mock"** perception if demoed to engineering buyers | Erodes credibility vs. Interos/Everstream/Resilinc | Always demo Phase 1 against at least one real source before engineering audiences |
| **Model governance** for risk scores driving procurement decisions | MRM will require validation before live use | Stand up Experiments + validation pack in Phase 1, not Phase 2 |
| **Vendor-data licensing** (Factiva, Panjiva, GeoQuant) | Per-seat costs can exceed platform margin | Decide build-vs-buy per source before committing in sales motion |
| **JSONL audit log** treated as a real audit trail | Fails any regulated audit | Migrate to Domino Dataset in week 1 of Phase 1 |

---

## 8. Recommendation

Greenlight productionization, but scope the first commitment narrowly: **one drug family, one customer, two signal sources, three real LLM agents, Domino-native persistence, enforced SSO.** That is a defensible pilot that showcases Domino primitives (Datasets, Jobs, Model Registry, governed endpoints) and gives us a credible answer to "is this a prototype or a product?" Everything the prototype already gets right — the information architecture, the agent pattern, the reasoning-chain + citation UX, the action-with-rationale audit flow — should be preserved verbatim. Everything behind the API boundary should be rebuilt.
