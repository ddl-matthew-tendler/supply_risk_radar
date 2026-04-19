# FDE Spec: SupplyRiskRadar (Non-GxP)
*Classification: **Non-GxP** — commercial / manufacturing procurement risk monitoring*
*Source: Extension #78, Domino_NonGxP_Extensions_100.xlsx (Manufacturing & Supply Analytics)*
*Generated: April 19, 2026 | Target Persona: Procurement Lead | Phase: Manufacturing & Supply Analytics*

> **Scoping note:** This is the literal #78 extension from the non-GxP 100 list: "Monitors tier-n supplier risk (weather, geopolitics, news) and surfaces prioritized alerts with mitigation suggestions." Comparable tools per the list: Everstream, Riskmethods. Persona: Procurement Lead. This is the **commercial / external-supplier** risk radar — it watches the outside world (weather, geopolitics, news, regulatory actions, customs/tariffs) for signals that threaten the tier-n suppliers of APIs, KSMs, excipients, primary packaging, comparators, and contract manufacturing — i.e., the raw material and external-manufacturing stack behind commercial and pipeline drug products. It is **not** the GxP clinical trial drug supply tool (see `FDE_ClinicalSupplyRiskRadar_GxP.md` for that adjacent concept). It is also a **TOP 5** demo in the non-GxP event scoring (BC=9, Bottom-Line 11.18) — the "live world-map risk alerts" is the visual hero moment.

---

## Competitive Landscape Summary

- **Everstream Analytics**: The predictive AI leader in supply chain risk. Monitors global events, logistics, geopolitical, and environmental risks in real time. Strong at shipment-delay forecasting and AI-driven geopolitical scoring. Gap: **industry-agnostic**. A pharma procurement lead gets the same risk feed as a CPG or automotive buyer. Doesn't know that "Supplier X in Hyderabad" is the sole qualified source of the KSM for your top-three revenue molecule.

- **Resilinc**: The deep-mapping specialist. Multi-tier supplier visibility down to sub-tier 10, supplier-verified data, 100+ risk categories, pre-event scenario planning and stress tests. The closest competitor for pharma buyers who've done multi-year supplier-mapping work. Gap: **mapping is a heavy lift, refreshed slowly**. The moment a new KSM source is qualified by the CMC team, the Resilinc map is stale until a supplier-verification cycle runs. Also pharma-agnostic in its risk ontology — no native linkage to FDA 483s, EU GMP Warning Letters, or DMF (Drug Master File) changes, which are the *leading* pharma-specific risk indicators.

- **Interos.ai**: AI-first multi-tier mapping using 80,000+ risk datasets, real-time ML scoring, strong SAP/Oracle integrations, strong on cybersecurity and ESG. Gap: pharma-specific coverage is shallow — doesn't parse FDA orange-book / purple-book linkage, doesn't know which of your CMOs is on a Form 483 that was redacted last week.

- **Sphera (formerly riskmethods)**: N-Tier network mapping, Supplier 360 AI summaries, 1.1M+ mapped suppliers, 500M datasets/day. Strong at combining risk signal with Sphera's broader EHS/ESG data. Gap: **enterprise feel and pricing** — aimed at Fortune 100 industrials; pharma-specific workflows (tech transfer, CMO qualification, comparator sourcing) aren't first-class.

- **Prewave**: NLP-first, 150+ risk categories, predictive alerts from news, reports, social. Strong at early weak-signal detection (strikes, labor unrest, environmental citations). Gap: lighter on deep supplier mapping and on quantified impact analysis.

- **Everstream / Resilinc / Interos / Sphera / Prewave — universal gaps for pharma**:
  1. **No native drug-product linkage.** They see "Supplier X is at risk" but not "Supplier X makes the KSM for Drug Y, which has zero qualified alternates and ships $2.1B/year."
  2. **No regulatory-signal fusion.** FDA 483s, EU GMP Warning Letters, DEA events, and MHRA actions are the *strongest* leading indicators for pharma supply disruption — 60% of 2025 drug shortages trace to just three factories in Asia, all with prior regulatory observations — yet generic SCRM tools either don't ingest these feeds or surface them buried in ESG/compliance categories.
  3. **No tariff/customs/HTS-aware view.** 2025's tariff policy shift materially re-priced Chinese-sourced APIs overnight; generic tools do not surface tariff exposure as a first-class risk dimension by API/HS code.
  4. **Limited integration with SAP Ariba / Coupa spend and the CMC quality/DMF systems** — risk signals exist in one tool, qualified-alternate data lives in CMC/quality, and the procurement lead reconciles them in PowerPoint.

- **Internal / build-your-own**: Many top-20 pharma have stood up procurement risk scorecards in PowerBI or Tableau, fed by Factiva/Dow Jones news and internal spend extracts. Gap: brittle, requires a full-time analyst to maintain, no AI reasoning on the unstructured signal.

**Key insight for SupplyRiskRadar (non-GxP):** The wedge is **pharma-native risk fusion**. Fold the best-of-breed public risk signals (geopolitics, weather, logistics, news) *together with* pharma-specific regulatory signals (FDA 483s, EU GMP, DMF changes, DEA events), tariff/customs/HS-code exposure, and the sponsor's own Bill of Materials + qualified-alternate data from CMC. Run it inside Domino where the sponsor's data science team already curates spend and BOM data. The result is a procurement-lead dashboard that says not "Supplier X is at risk" but "Drug Y is at 18-day risk because Supplier X (sole qualified KSM source) is in a region with active labor unrest AND received a Form 483 last month AND has 30% tariff exposure under the new tariff policy."

---

## Persona Context

**Procurement Lead** (titles vary: "Head of Strategic Sourcing — API & Raw Materials," "Director, External Supply," "Category Manager, APIs & Excipients," "VP, Global Procurement Pharma"). 10–20 years in pharma sourcing; often came up through CMC or manufacturing before moving to procurement. Reports to a CPO / Head of External Supply; dotted line to CMC, Quality, and Finance. Owns a category (APIs, excipients, primary packaging, contract manufacturing services, comparators) or a product family across categories.

- **Daily reality:** Mornings start with Factiva news sweep and a scan of FDA enforcement feeds and EMA GMP non-compliance database — looking for anything that names a supplier, a country/region where suppliers operate, or a facility on the approved vendor list. Cross-references with the current price lists from three primary APIs where tariff rulings just dropped. Midday: a call with the Resilinc analyst about the latest sub-tier map refresh for the top-20 KSMs; another call with a CMO in Hyderabad whose quarterly quality metric slipped. Afternoon: builds a tariff-exposure slide for the CFO showing the Q2 impact on COGS of a proposed 25% pharmaceutical import tariff. End of day: files a supplier risk update into the internal risk committee's SharePoint deck. Every Monday, the Procurement Leadership Team reviews a "Top 10 Supplier Watchlist" that takes 4 hours of analyst prep over the weekend.

- **Top 3 frustrations:**
  1. **Risk signal comes in a hundred channels, none of them fused.** News sits in Factiva, weather sits in the Everstream feed, FDA 483s sit in the FDA enforcement tracker, tariff changes sit in USTR rulings, and the sponsor's own Bill of Materials sits in SAP. No single view says "of the 47 suppliers flagged by public risk signals this week, these 6 are on the critical path for revenue products and 2 have no qualified alternate." The Monday briefing is a weekly reconstruction exercise.
  2. **Regulatory signals are more predictive than generic risk scores — but the SCRM tools don't prioritize them.** A Form 483 with a data-integrity observation is a near-certain precursor to Warning Letter and supply disruption 90–180 days out. The procurement lead knows this in their bones. But the incumbent SCRM tools bury FDA observations under "compliance" and score them the same as a labor strike.
  3. **"What does this mean for *our* drugs?"** is the question every CFO, Head of Operations, and BU head asks when news breaks. The procurement lead has no tool that translates "Supplier X has a risk event" into "impact on Drug Y revenue, downtime, and qualified-alternate lead time" in under an hour. PowerPoint reconstruction eats days, which is how the lead ends up working weekends when a geopolitical event hits.

- **Language they use:** "Tier-n," "sub-tier visibility," "sole-source," "dual-source," "qualified alternate," "KSM" (key starting material), "API" (active pharmaceutical ingredient), "excipient," "DMF" (Drug Master File), "CEP" (Certificate of Suitability), "Form 483," "Warning Letter," "EU GMP non-compliance report," "HTS code," "tariff classification," "bonded warehouse," "approved vendor list," "supplier qualification," "audit cadence," "LTA" (long-term agreement), "spend under management," "price-per-kilo," "NPV of supplier relationship," "VMI" (vendor-managed inventory), "business continuity plan," "tabletop exercise."

- **Winning looks like:** A single dashboard, opened first thing every morning, that surfaces: (1) Overnight risk events mapped against the sponsor's active Bill of Materials and qualified-alternate data — so only the events that actually matter float up; (2) A ranked watchlist of supplier/product pairs where risk × financial exposure × lack-of-alternate is highest; (3) LLM-drafted mitigation suggestions with source citations (redirect to alternate X, accelerate qualification of Y, build safety stock of Z); (4) Auto-drafted CFO/executive brief for the Monday procurement leadership review — so the weekend reconstruction goes away. When the procurement lead picks up a card, the mitigation suggestion is accompanied by a cost/lead-time/qualification-effort estimate so the decision is defensible.

- **AI/automation fears:** "The last AI tool we bought gave us an alert every 12 minutes on things our category managers already knew about, and we turned it off in 90 days. Will this one be different?" And: "Can I defend an AI-generated recommendation to the CFO and the audit committee? Who's accountable if we divert spend based on an AI alert that was wrong?" Needs reassurance that alerts are prioritized against *this company's* BOM and spend (not generic severity), that the reasoning is auditable, and that the tool can explain *why* each card beat the others — because alert fatigue is the #1 killer.

---

## SECTION 1: Submitter Information

| Field | Value |
|-------|-------|
| Full name | Matthew Tendler |
| Work email | matthew.tendler@dominodatalab.com |
| Role | — fill in — |
| Submission date | [auto-populated by portal] |
| Notes | SupplyRiskRadar extension (non-GxP, #78 on Domino_NonGxP_Extensions_100). Phase: Manufacturing & Supply Analytics. Target persona: Procurement Lead (API/KSM/excipient/CMO categories). Comparable tools per list: Everstream, Riskmethods. Differentiator: pharma-native risk fusion (regulatory + tariff + news + weather + geopolitics) tied to the sponsor's own BOM and qualified-alternate data. TOP 5 demo candidate (Business Case = 9/10, Bottom-Line score 11.18). "World map of supplier risk lights up in real time" is the visual hero. |

---

## SECTION 2: Prospect Overview

| Field | Value |
|-------|-------|
| Company / prospect name | [fill in per customer engagement] |
| Region | [fill in per customer engagement] |
| Industry vertical | [fill in per customer engagement] — typically Pharma / Biotech, mid-to-large (≥$2B revenue); generics makers especially exposed (high Chinese API dependence) |
| Relationship stage | [fill in per customer engagement] (Early discovery / Active evaluation / POC / trial / Late stage / negotiation) |
| Primary prospect contact name | [fill in per customer engagement] |
| Primary contact title / role | [fill in per customer engagement] — typically CPO / Head of External Supply / VP Global Procurement / Director, Strategic Sourcing (API & Raw Materials) |
| Estimated data science team size | [fill in per customer engagement] |
| Additional context | [fill in per customer engagement] — Incumbent SCRM tool (Everstream vs. Resilinc vs. Interos vs. Sphera vs. none — decisive for displacement vs. augment positioning), existing Domino footprint in manufacturing/operations analytics, SAP Ariba or Coupa for spend (integration anchor), recent supply disruption incidents (pandemic hangover, API shortages, tariff-driven re-shoring conversations), BOM digitization maturity (do they have a structured BOM data set for APIs and KSMs, or is it spreadsheets?), generics vs. originator profile, Chinese/Indian API exposure %. |

---

## SECTION 3: Business Problem

### High-level problem description

Pharma procurement leads operate with the highest-stakes risk exposure of any procurement category in the economy: 60% of 2025 drug shortages trace to just three Asian factories, more than a quarter of essential medicines share a single upstream KSM point of failure, and U.S. dependence on Chinese APIs for some molecules exceeds 80%. Despite this, most pharma procurement teams monitor risk through a fragmented stack — generic SCRM tools (Everstream, Resilinc, Sphera) that don't understand pharma-specific signals like FDA 483s or DMF changes, separate tariff/customs feeds, manual news scans, and weekend PowerPoint reconstruction exercises to answer the question "what does this mean for *our* drugs?" SupplyRiskRadar closes this gap by fusing public risk signals (news, weather, geopolitics, logistics) with pharma-specific regulatory signals (FDA 483s, EU GMP non-compliance, DEA events, DMF changes), tariff/HS-code exposure, and the sponsor's own Bill of Materials and qualified-alternate data — producing a ranked, BOM-aware watchlist of supplier-product pairs that actually threaten revenue, with LLM-drafted mitigation suggestions and an auto-generated executive brief.

### Business objectives

- **Reduce time-to-first-insight** on a breaking supply disruption event from 24–72 hours (current state: weekend analyst reconstruction) to **under 15 minutes** (from signal detection to BOM-mapped, ranked watchlist entry).
- **Eliminate weekend procurement analyst prep** for the Monday Supplier Watchlist review — target: analyst time on Monday prep drops from 4 hours to 30 minutes (review + sign-off only).
- **Detect 75%+ of FDA Warning Letters and EU GMP major non-compliance events** for suppliers on the sponsor's Approved Vendor List within 24 hours of publication, with automatic impact analysis.
- **Quantify tariff exposure** across the full API/KSM/excipient footprint for any proposed tariff scenario in **under 1 hour** (current state: 2–3 weeks of ad-hoc analyst work to build a CFO-ready view).
- **Drive 1 avoided supply disruption per year** with quantified revenue protection (typical avoided-disruption value at a top-20 pharma: $20M–$200M per event — ROI story is "one avoided disruption pays for the tool for a decade").
- **Cross-functional alignment:** shift the weekly Supplier Risk Committee from "what happened last week" to "what are we going to do about these 6 ranked risks next" — by providing a shared, BOM-aware risk view.

### Current state

The sponsor typically has: (1) An incumbent generic SCRM tool (Everstream, Resilinc, Sphera, or none); (2) A Factiva or Dow Jones news subscription for manual curation; (3) FDA enforcement tracker and EU GMP non-compliance feeds as manual browser bookmarks; (4) SAP (Ariba/Coupa) spend data and an internal supplier master; (5) CMC-managed BOM and DMF data often in a separate quality system or SharePoint; (6) Finance/trade compliance team tracking tariffs and HS codes in their own stack. Every Monday, a procurement analyst spends 4+ hours stitching these sources into a weekly brief and Watchlist deck. Ad-hoc tariff scenarios or disruption analyses take 2–3 weeks each. Recent pandemic, geopolitical, and tariff shocks have put procurement risk on the board agenda, but the tooling hasn't caught up with the visibility expectation.

### Pain points

- **Generic SCRM tools miss pharma-native signals.** A Form 483 with a data-integrity observation is the single most predictive pharma-specific risk signal (90–180 day precursor to Warning Letter and supply disruption). Generic tools bury it under a generic "compliance" category. Procurement leads do their own FDA-tracker scanning on top of the expensive SCRM subscription.
- **"Of these 200 risk events, which matter to *our* products?"** The question is asked weekly by the CPO, daily when news breaks, and never answered without hours of manual work. No tool fuses risk events with the sponsor's own BOM + qualified-alternate data.
- **Tariff shocks re-price the supplier base overnight.** In 2025, the pharmaceutical tariff policy shift created material cost exposure that no SCRM tool quantified at HS-code × supplier × drug-product granularity. Finance and trade compliance built the analysis in Excel over 3 weeks, missing the CFO's weekly call for a refresh.
- **Tier-n mapping is stale.** Resilinc and Interos maps are refreshed on a long cycle; newly qualified KSM sources take months to appear, so the risk view lags reality. Meanwhile, the CMC team has the real-time qualified-alternate list — but it's not in the risk tool.
- **Alert fatigue killed the last AI tool.** Category managers got dozens of alerts per day, 80% of which they already knew about or didn't matter. The tool was turned off within 90 days. The next tool has to be ruthlessly prioritized.
- **Executive brief production is a weekend job.** The Monday Procurement Leadership Committee and monthly Supplier Risk Committee each need an executive-level brief. These are hand-assembled from the same underlying data every week, with no systematic drafting help.
- **Audit defensibility of AI-driven recommendations is unclear.** If the procurement lead diverts spend or accelerates an alternate-qualification program based on a SupplyRiskRadar recommendation, the CFO and audit committee will ask: "Show me the reasoning and the source data." Generic AI tools with black-box scoring fail this test.

### Success metrics

- **Operational / leading:**
  - Median time from public risk event (e.g., FDA 483 posting) to ranked, BOM-aware watchlist entry: **≤ 15 minutes**.
  - % of FDA Warning Letters and EU GMP major non-compliances for AVL suppliers surfaced within 24 hours: **≥ 75%** (target ramping to 95% within 12 months).
  - Weekly analyst prep time for Monday Watchlist: reduced from ~4 hours to **≤ 30 minutes**.
  - Time to answer "what is our tariff exposure under scenario X" at drug-product × supplier granularity: **≤ 1 hour** (from 2–3 weeks).
- **Adoption / UX:**
  - % of procurement category managers opening the dashboard daily: **≥ 80%**.
  - Alerts per user per day: **3–7** (ruthlessly prioritized — alert fatigue killer watched carefully).
  - User-reported "action taken" rate on alerts: **≥ 40%** (vs. typical SCRM tool where <10% of alerts drive action).
- **Financial / lagging:**
  - ≥ 1 avoided supply disruption per year with quantified revenue protection ($20M–$200M typical event value at top-20 pharma).
  - 15–30% reduction in analyst hours spent on manual risk briefing production.
  - 20–40% faster tech-transfer / alternate-qualification decisions (enabled by always-current risk + alternate view).
- **Governance:**
  - 100% of risk-driven procurement actions logged with source-event citation, BOM impact analysis, and LLM reasoning chain retained for audit committee review.

### Key stakeholders

`Chief Procurement Officer (economic buyer)` `Head of External Supply / Director Strategic Sourcing (primary daily user)` `Category Managers — API, KSM, Excipients, Primary Packaging, CMO Services (daily users)` `CMC / External Manufacturing Lead (partner — supplies BOM and qualified-alternate data)` `Quality / Supplier Quality Assurance (partner — regulatory signal context)` `Trade Compliance / Customs (partner — tariff/HS-code data)` `Finance / CFO office (consumer of executive brief + tariff scenario analysis)` `BU Heads / Commercial Ops (consumers of drug-product-level impact analysis)` `Risk Committee / BCP Committee (consumers of weekly watchlist)` `Data Engineering / Enterprise Architecture (integration partner)`

### Urgency and timeline drivers

- **2025 pharmaceutical tariff policy shift.** Executive-level demand for continuous tariff exposure visibility at SKU × supplier × HS-code granularity is now a CFO-level agenda item at most top-20 pharmas.
- **WHO 2025 report naming antibiotic shortages among top-5 global drug shortages.** Board-level ESG/access commitments now depend on demonstrable supply resilience for essential medicines.
- **Post-pandemic supplier-resilience investments maturing into consolidation.** Sponsors that stood up 3–5 disparate risk tools after COVID are looking to consolidate into a single BOM-aware fusion layer.
- **FDA & EMA increasing inspection cadence post-pandemic.** Form 483 and EU GMP non-compliance volume is materially higher than pre-2020; the signal-to-noise advantage of pharma-native fusion grows.
- **Generics pricing pressure + geographic re-shoring.** Both US (BIOSECURE Act dynamics, India/Hyderabad migration) and EU (EU API manufacturing sovereignty push) are driving multi-year re-sourcing programs that need continuous risk visibility to execute.
- **Private equity in pharma.** PE-backed pharma rollups have less CMC continuity and thinner supplier-relationship capital than originator pharma; they are disproportionately risk-exposed and often the most receptive buyers.

---

## SECTION 4: Data Assets

### Data overview

SupplyRiskRadar ingests three categories of data: (1) **External risk signal feeds** (news, weather, geopolitics, regulatory, tariff, logistics) — some public, some licensed; (2) **Internal sponsor data** (BOM, qualified-alternate master, spend, AVL, Bill-of-Materials-to-drug-product linkage) — pulled from SAP Ariba/Coupa and CMC/quality systems; (3) **Reference/ontology data** (pharma supplier master with site-level geocoding, API/KSM/excipient ontology with HS-code mapping, drug-product master with commercial value) — maintained inside the extension. The fusion happens inside Domino, leveraging Domino's data-orchestration and LLM-reasoning primitives.

### Data sources

**Source 1: News & unstructured event feeds**
- Source name: Factiva / Dow Jones Newswires / GDELT / NewsAPI / Reuters Connect
- System type: REST / GraphQL API
- Data formats: Unstructured text + Semi-structured (JSON, XML)
- Access status: Requires procurement / licensing *(most top-20 pharma already have Factiva or equivalent; extension reuses the sponsor's existing license)*
- Notes: Primary source for supplier-named events (strikes, fires, financial distress, management changes, M&A rumors). LLM-based NER and entity resolution to supplier master is the heavy lift.

**Source 2: Weather & geospatial event feeds**
- Source name: NOAA weather APIs + commercial weather provider (Tomorrow.io / AccuWeather) + USGS earthquake feed + commercial geopolitical risk data (GeoQuant / Verisk Maplecroft)
- System type: Streaming / event bus + REST API
- Data formats: Semi-structured (JSON, XML) + Time-series
- Access status: Mixed — NOAA/USGS public; commercial feeds require procurement
- Notes: Geocoded to supplier site lat/long for proximity-based risk. Cyclone paths, flood zones, seismic events, and geopolitical instability indices.

**Source 3: Regulatory enforcement feeds (pharma-specific wedge)**
- Source name: FDA Enforcement & Inspection databases (483 observations, Warning Letters, import alerts, drug shortage database, Orange Book), EMA GMP Non-Compliance Reports, MHRA inspection reports, WHO prequalification delistings, DEA enforcement actions, China NMPA inspection feeds, India CDSCO actions
- System type: REST / GraphQL API *(for public feeds)* + Document store *(for scraped PDFs where no API exists)*
- Data formats: Structured (tabular) + Unstructured text (PDF)
- Access status: Already accessible *(public)* — some feeds require PDF scraping
- Notes: **The pharma-native wedge.** LLM extraction normalizes inspection observations to a standard pharma risk ontology (data integrity, cross-contamination, CAPA failure, etc.) and links to the supplier site in the sponsor's AVL.

**Source 4: Tariff, customs, and trade data**
- Source name: USTR tariff rulings, U.S. HTS schedule, CBP ACE export data, EU TARIC, S&P Global Market Intelligence (Panjiva) shipment data
- System type: REST API + SaaS *(Panjiva)*
- Data formats: Structured (tabular) + Semi-structured (JSON)
- Access status: Mixed — public US/EU feeds free; Panjiva requires licensing
- Notes: Enables tariff-exposure scenario modeling at HS-code × country-of-origin × supplier × drug-product granularity.

**Source 5: Logistics & shipment event data**
- Source name: Port congestion feeds, AIS vessel tracking (MarineTraffic / Windward), air-freight capacity (IATA/industry feeds), Suez/Panama Canal operational status
- System type: Streaming / event bus + REST API
- Data formats: Semi-structured (JSON) + Time-series
- Access status: Requires procurement / licensing
- Notes: Provides lead-time and cost-volatility signals.

**Source 6: Sponsor internal — Spend & supplier master**
- Source name: SAP Ariba / Coupa / SAP MDG (supplier master)
- System type: On-prem relational database + SaaS *(Ariba/Coupa)*
- Data formats: Structured (tabular)
- Access status: Access pending *(requires data contract with the sponsor's P2P team)*
- Notes: Approved Vendor List, spend under management, contract terms, LTA status. Joins to external risk signals via supplier master.

**Source 7: Sponsor internal — Bill of Materials & qualified-alternate master**
- Source name: CMC / Quality systems (Veeva Vault QualityDocs, MasterControl, TrackWise, or sponsor-built PLM)
- System type: Document store + On-prem relational database
- Data formats: Structured (tabular) + Unstructured text *(for qualification reports)*
- Access status: Access pending *(requires CMC/Quality partnership; this is the hardest-to-integrate source but the highest-value)*
- Notes: Drug product ↔ API ↔ KSM ↔ excipient ↔ supplier linkage. Qualified-alternate status for each BOM node. This is what transforms "Supplier X is at risk" into "Drug Y has 0 qualified alternates and is 14 days from depletion."

**Source 8: Pharma supplier master & pharma risk ontology (extension-maintained)**
- Source name: SupplyRiskRadar pharma supplier master (built from FDA registration, EMA EudraGMDP, WHO prequalification, EDQM CEP holder list) + pharma-specific risk ontology (API/KSM/excipient categories, HS-code mapping, therapeutic-area mapping)
- System type: Document store
- Data formats: Structured (tabular)
- Access status: Already accessible *(extension-shipped reference data, updated by Domino on a release cadence)*
- Notes: The "Rosetta stone" that lets an unstructured news event resolve to a specific supplier site on the AVL.

### Estimated total data volume

**10–100 GB** steady-state working set (external feeds accumulated over ~12 months + sponsor's BOM/spend/AVL data). News + shipment data grows over time — with 3+ years of historical retention for pattern detection, **>100 GB** likely.

### Data velocity / freshness

**Mixed.** News and social: near real-time (minutes). Weather and logistics: near real-time to hourly. Regulatory enforcement feeds: daily (FDA/EMA post in batches). Tariff rulings: event-driven. Sponsor internal BOM/spend/AVL: daily or weekly batch. The dashboard is designed to re-score **every 15 minutes** as new signals arrive, with sponsor-internal data refreshing nightly.

### Known data quality issues

- **Supplier entity resolution is genuinely hard.** "Dr. Reddy's Hyderabad Unit 3" in a news article ↔ "Dr. Reddy's Laboratories Ltd., Site ID 08472, FDA FEI 3002808341" in the AVL is a fuzzy-match + LLM-disambiguation problem that requires explicit confidence scoring and a human-in-the-loop feedback workflow.
- **News feed duplication and misinformation.** Primary-source weighting, deduplication, and LLM-based claim verification are required.
- **Tier-n mapping decay.** Sub-tier relationships change without public announcement; the extension must degrade gracefully with stale mapping and flag low-confidence inferences.
- **BOM completeness.** Many sponsors have BOM data for commercial products but gaps for pipeline; extension must handle known-unknowns explicitly.
- **Regulatory feed structure drift.** FDA and EMA periodically reformat data feeds; parsers need versioning and automated monitoring.

### Data access notes

- **No patient data.** This is the non-GxP commercial/manufacturing risk tool — no patient PHI anywhere in the pipeline.
- **Commercial sensitivity.** Sponsor BOM, AVL, and spend data are highly confidential; deployment keeps them inside the sponsor's Domino environment. External risk feeds are ingested and join happens internally.
- **Licensed-feed terms of use.** Factiva, Panjiva, GeoQuant, etc. may have redistribution restrictions that require per-user license accounting; extension respects those terms via access control.

---

## SECTION 5: Governance & Compliance

### Applicable regulatory frameworks

- [ ] HIPAA *(N/A — no patient data)*
- [x] GDPR *(if sponsor operates in EU — supplier contacts may be EU data subjects)*
- [x] CCPA/CPRA *(California sponsor/supplier contact data may apply)*
- [x] SOC 2 *(customer expectation for a shared-signal SaaS-feel deployment; applies to Domino hosting posture)*
- [ ] FedRAMP
- [ ] PCI-DSS
- [ ] FINRA/SEC *(potentially relevant for publicly-traded sponsor's MNPI handling around tariff/supply events — see notes)*
- [ ] BASEL/BCBS
- [ ] DORA
- [x] EU AI Act *(likely applies to LLM-driven alert prioritization if sponsor operates in EU; non-high-risk classification expected — decision support, human in the loop)*
- [ ] None identified
- [x] **Other:** Sponsor's internal procurement & risk policies; trade compliance (BIS/OFAC/EAR for any export-controlled items in BOM — rare for pharma APIs but possible); DEA controlled-substance handling for any Schedule I–V ingredients; supplier data-sharing agreements; corporate M&A MNPI controls around supplier financial signals.

### Data residency requirements

Sponsor-specific. For EU-operating sponsors, EU-sourced data (supplier contact data, EU regulatory feeds, BOM for EU-produced drugs) must remain in EU region — SupplyRiskRadar inherits Domino's region-scoped deployment. External public risk feeds are region-agnostic.

### Data access restrictions

- Role-based: category managers see their category's BOM/spend only; procurement leadership sees portfolio view; finance/trade compliance sees tariff exposure view; CFO/executive sees the auto-generated brief.
- **Material Non-Public Information (MNPI) handling:** supplier financial distress signals combined with the sponsor's BOM exposure may constitute MNPI for a publicly-traded sponsor (e.g., "Supplier Z, which makes API for Drug Y, is in financial distress — which will force an earnings-material supply disruption"). Access to this combination is restricted and logged; the tool is *not* authorized for trading-desk access.
- Licensed-feed access (Factiva, Panjiva, GeoQuant) is user-entitlement-gated per the sponsor's licensing terms.

### Input/output logging requirements

Every ranked alert card logs: the source events that contributed, the BOM/AVL/alternate-data snapshot used, the LLM prompts and outputs, the ranking rationale, and the user actions taken. Logs retained per sponsor's corporate retention policy (typically 7 years). This is not 21 CFR Part 11 because it's non-GxP — but the *audit committee* and *internal audit* functions need equivalent rigor for procurement decisions.

### Decision audit trail requirements

Every procurement action taken in response to a SupplyRiskRadar card (e.g., "accelerate qualification of alternate supplier Z," "build 90-day safety stock of API Y," "switch order from Supplier X to Supplier W") must be captured with: acting user, timestamp, source alert, underlying data snapshot, LLM reasoning chain, and user-entered rationale. Exportable to the sponsor's P2P system (Ariba/Coupa) and to the Risk Committee's SharePoint / Diligent boards platform.

### Explainability requirements

**High.** Every ranked alert must show: (1) which source events contributed and their citation links; (2) which BOM/AVL/alternate-data entries drove the ranking; (3) the reasoning chain from event → supplier entity resolution → BOM linkage → financial exposure → alternate availability → final priority score. No black-box scoring. LLM-generated mitigation suggestions must cite every source claim.

### Result consumer access restrictions

- Internal procurement & risk teams only.
- CFO / Finance has dedicated view for tariff and macro-scenario analysis.
- External vendors / auditors: controlled export only; audit committee gets anonymized summary if needed.
- No redistribution of licensed-feed content outside the sponsor (Factiva/Panjiva terms).

### Additional governance notes

- **Model risk management:** the LLM-driven ranking and reasoning is subject to the sponsor's Model Risk Management (MRM) framework — typically annual validation, periodic drift monitoring, and change-control on prompt/model updates. SupplyRiskRadar ships with MRM documentation templates.
- **Change control:** pharma-risk ontology updates (new FDA inspection signal category, new regulatory feed source) version-controlled and released on a quarterly cadence with release notes.
- **EU AI Act classification:** procurement decision support with human-in-the-loop; expected to classify as limited-risk under Article 52 (transparency obligations) rather than high-risk. Confirmed per sponsor's legal review.

---

## SECTION 6: Solution Requirements

### Deployment environment

**AWS** or **Microsoft Azure** (wherever the sponsor's Domino is deployed) — most common. **Domino Cloud (Domino-managed)** for sponsors without an existing deployment. **Hybrid** supported for sponsors with on-prem SAP / quality systems. **Air-gapped** not recommended (kills the external-signal ingest).

### Prototype timeline expectation

**4–8 weeks** to a first live POC, assuming (a) the sponsor can provide an AVL + 12 months of spend data + BOM for one commercial product family, (b) the sponsor has or can procure Factiva or equivalent news feed, and (c) at least the public regulatory/weather feeds are ingested from day one (licensed feeds can be layered in later).

### Deployment notes

- **POC scope:** 1 product family (e.g., top 5 revenue drugs), top-50 AVL suppliers, public risk signals (news via Factiva/GDELT, FDA 483s, EU GMP feed, weather, tariffs), LLM-ranked daily watchlist, exec brief auto-generation. Demonstrates pharma-native wedge.
- **Phase 2:** full AVL, licensed feeds (Panjiva/GeoQuant), CMC BOM/alternate data integration, full tariff scenario modeling, MNPI access controls.
- **Event-demo deployment:** standalone instance with synthetic supplier network on a world map — for live demos at industry events (the "world map lights up" moment noted in the Event Demo Scoring as a TOP 5 visual).

### Integration requirements

**Integration 1: News / content feed**
- System / tool name: Factiva / Dow Jones Newswires / Reuters Connect / GDELT / NewsAPI
- Integration type: Read data from it *(via API)*
- Notes: Primary unstructured-event source. Sponsor typically has existing Factiva license; extension plugs into it.

**Integration 2: Commercial risk feeds**
- System / tool name: GeoQuant / Verisk Maplecroft / Everstream API *(complementary, not replacement)* / Panjiva / commercial weather
- Integration type: Read data from it *(via API)*
- Notes: Layered in Phase 2. Positioning note: if sponsor already runs Everstream or Resilinc, SupplyRiskRadar can ingest their alert feed as an additional input rather than replacing — pragmatic displacement path.

**Integration 3: FDA / EMA / global regulatory feeds**
- System / tool name: FDA openFDA API, FDA Inspection Classification Database, EudraGMDP (EMA), MHRA site-inspection feed, WHO prequalification, DEA enforcement
- Integration type: Read data from it *(mix of API + PDF scrape)*
- Notes: The pharma-native wedge; extension-maintained parsers.

**Integration 4: Tariff / trade data**
- System / tool name: USTR / U.S. HTS / EU TARIC / Panjiva / CBP ACE
- Integration type: Read data from it
- Notes: Drives tariff scenario modeling.

**Integration 5: SAP Ariba / Coupa (spend & supplier master)**
- System / tool name: SAP Ariba or Coupa
- Integration type: Read data from it *(nightly batch or API)*
- Notes: AVL, spend, contract terms.

**Integration 6: CMC / Quality system (BOM + qualified alternates)**
- System / tool name: Veeva Vault QualityDocs / MasterControl / TrackWise / sponsor PLM
- Integration type: Read data from it *(nightly batch)*
- Notes: Hardest integration, highest-value. Drives drug-product linkage.

**Integration 7: Notification / collaboration**
- System / tool name: Microsoft Teams / Slack / email
- Integration type: Write data to it *(push high-severity alerts)*
- Notes: Per-user severity filter. Routed to procurement leadership channels.

**Integration 8: Executive brief distribution**
- System / tool name: Microsoft SharePoint / Diligent / board portal
- Integration type: Write data to it *(upload auto-generated weekly/monthly brief)*
- Notes: Monday Procurement Leadership and monthly Risk Committee consumption.

**Integration 9: SSO**
- System / tool name: Okta / Azure AD / Ping
- Integration type: Authentication / SSO
- Notes: Role-based access via group membership; MNPI access controls enforced here.

**Integration 10: CFO office / FP&A (tariff scenario outputs)**
- System / tool name: Anaplan / Workday Adaptive Planning / Excel export
- Integration type: Write data to it
- Notes: Tariff scenario outputs flow to FP&A for COGS impact modeling.

### UX and delivery requirements

- **World-map hero view** (demo gold): live global risk heatmap with supplier sites as dots, color-coded by risk; click to drill into supplier → BOM linkage → drug-product impact.
- **Ranked daily watchlist** (daily driver): top 10–20 risk cards, each with source events, BOM impact, alternate status, and LLM-drafted mitigation suggestion.
- **Alert cards**: every card shows source citations, reasoning chain, confidence, and "act" button that captures rationale and routes to procurement/CMC workflow.
- **Tariff scenario modeler**: CFO-facing tool for modeling tariff policy scenarios at HS-code × supplier × drug-product granularity.
- **Monday executive brief**: auto-drafted every Sunday evening; procurement lead reviews and signs off Monday morning.
- **Monthly Supplier Risk Committee brief**: auto-drafted; includes trend analysis and mitigation-action tracking.
- **Mobile-responsive**: procurement leads travel; high-severity alerts need to render on phone.
- **Low alert fatigue**: calibration per user and per category; clear "why am I seeing this" on every card; explicit feedback loop ("this wasn't useful" → model learns).

### Target user personas

`Chief Procurement Officer (economic buyer, weekly brief consumer)` `Head of External Supply / Director Strategic Sourcing (primary daily user)` `Category Manager — APIs / KSMs / Excipients / Primary Packaging / CMO Services (daily users)` `CMC / External Manufacturing Lead (BOM + alternates contributor, alerted on direct-supplier events)` `Quality / Supplier Quality (regulatory signal consumer)` `Trade Compliance / Customs (tariff modeler user)` `CFO / FP&A (tariff scenario & executive brief consumer)` `BU Heads / Commercial Operations (drug-product impact consumer)` `Internal Audit / Risk Committee (audit trail consumer)`

### Priority level

**High** — TOP 5 demo candidate and highest-BC pharma-applicable non-GxP extension in the portfolio (BC=9).

### Technology constraints

- Must run inside the sponsor's Domino environment — sponsor BOM, AVL, and spend data never leave.
- Must integrate with the sponsor's existing news/SCRM licenses (respects licensing terms, doesn't require displacement).
- Must handle MNPI access controls for publicly-traded sponsors.
- Must be vendor-agnostic across SCRM incumbents (Everstream/Resilinc/Interos/Sphera) — can augment or displace depending on sponsor preference.
- Must ship pharma-native risk ontology and keep it current via a Domino release cadence.
- Must comply with EU AI Act transparency obligations for EU-deployed sponsors.

### Predictive ML models toggle

**Yes.**

Models used:
- **Entity resolution / supplier disambiguation**: fuzzy match + LLM disambiguation of news-mentioned entities to AVL suppliers.
- **Event severity scoring**: supervised classification on historical event→disruption outcome data (trained on public FDA inspection→supply shortage correlations).
- **Impact estimation**: revenue-exposure × alternate-availability × lead-time modeling.
- **Tariff scenario modeling**: deterministic BOM-walk + stochastic demand modeling for what-if analysis.
- **Anomaly detection on shipment / port data**: detect emerging logistics disruptions.

All models chosen for explainability; feature contributions surfaceable per card.

### Generative AI / LLMs toggle

**Yes.**

**GenAI use case types:**
- [x] Text generation / drafting *(alert-card narrative, mitigation suggestions, executive briefs)*
- [x] Summarization *(daily/weekly/monthly rollups; supplier 360 summaries)*
- [x] Document Q&A *(procurement lead: "what's our exposure in Hyderabad?" with grounded answer)*
- [x] Classification *(news-article categorization into pharma risk ontology)*
- [x] Entity / info extraction *(supplier names, sites, regulatory observation types from unstructured text)*
- [x] Agents / autonomous tasks *(limited — e.g., auto-draft the Monday brief; auto-route alerts to category managers; always human-approved before action)*
- [x] RAG *(grounding every reasoning step in cited source events + BOM/AVL snapshots)*
- [ ] Code generation
- [x] Conversational chat *(NL Q&A over the risk + BOM data — bounded, cited)*
- [ ] Other

**Preferred LLM providers:**
- [x] Anthropic Claude *(primary — strong at grounded, cited reasoning; tool use for the agent workflow)*
- [x] AWS Bedrock *(for AWS-deployed sponsors)*
- [x] Azure OpenAI *(for Azure-deployed sponsors)*
- [x] OpenAI *(if sponsor has direct license and approved policy)*
- [x] Open source / self-hosted *(Llama-class for sponsors requiring full on-prem / strict-isolation)*
- [ ] No preference

**Must use self-hosted / open-source models only:** No (most sponsors accept private-tenant commercial models; self-hosted is configurable).

**Approach:**
- [x] RAG *(primary — every alert grounded in cited source events + BOM data)*
- [ ] Fine-tuning / PEFT *(not initially; possible Phase 2 for pharma-specific entity resolution accuracy)*
- [x] Prompt engineering only
- [x] Agentic workflows / tool use *(limited agents for brief drafting, alert routing, scenario generation — always human-approved)*
- [ ] Mixture / not yet determined

**Context window / document size needs:** Moderate-to-large. Monthly brief generation may pull 100+ alert cards + historical context (50–100K tokens). Claude Sonnet / Opus class preferred for brief drafting; smaller/faster models for real-time alert-card narration.

**Streaming responses required:** No (batch and near-real-time alerting; not conversational chat with strict latency SLA). Streaming for in-product chat is a nice-to-have.

**Content safety / guardrails required:** Yes. (1) **Source grounding** — no hallucinated supplier names, event details, or numerical claims; every assertion cites a source event or BOM record. (2) **MNPI handling** — outputs that combine supplier financial distress + sponsor BOM exposure are access-restricted and watermarked. (3) **No trading/investment advice** — the tool is not authorized for trading-desk use. (4) **Defamation protection** — supplier-naming claims based on unverified news are flagged as unverified; weighting favors primary sources. (5) **Prompt injection defense** — external news content is treated as untrusted input and parsed defensively.

**Specific model version requirements:** Models version-pinned for Model Risk Management compliance; version changes require re-validation of alert-prioritization outputs. Sponsor's MRM / AI-governance team approves the pinned version list.

### Real-time / online inference toggle

**Yes — near real-time.** The dashboard re-scores every 15 minutes as new signals arrive; push alerts to Teams/Slack sub-minute from signal ingest for high-severity cards. Not sub-second; latency SLA is "within minutes, not hours."

### Additional solution notes

- **Positioning vs. incumbent SCRM tools:** SupplyRiskRadar is *pharma-native risk fusion*. It can augment Everstream/Resilinc/Interos/Sphera (ingest their feeds as one input among many) or displace them where the sponsor has not yet standardized. Conversations with the prospect should start with "what do you already have and what does it miss for *pharma*?" — the answer is always the same: pharma-native regulatory signals, BOM linkage, tariff-at-HS-code granularity.
- **Pricing anchor:** one avoided disruption pays for the tool for a decade ($20M–$200M per avoided event at a top-20 pharma). Analyst time savings (weekend brief production) and CFO tariff-scenario acceleration are additional ROI vectors.
- **Demo strategy (per Event Demo Scoring = TOP 5, Sizzle=9):** world-map hero with public data only (FDA 483s, weather, news, GDELT, tariffs); synthetic supplier network of 200+ sites; live "overnight events" replay showing the dashboard lighting up; LLM-drafted mitigation card and executive brief as the closer. Business case anchor: "one avoided disruption pays for this for a decade."
- **Competitive moats we're building on:** (1) Domino is where the sponsor's manufacturing/operations analytics data already lives; (2) pharma-native ontology + regulatory feed fusion; (3) BOM-aware prioritization (generic SCRM tools cannot do this without the sponsor's own data); (4) tariff + HS-code granularity tied to drug product; (5) executive-brief auto-generation as a daily-habit hook.
- **Known risks / open questions for the FDE engagement:**
  - Will the sponsor's CMC/Quality team share BOM + qualified-alternate data? (Historically protective; requires executive sponsorship.) Mitigation: start with public-signal-only POC and earn the BOM integration as Phase 2.
  - How will the sponsor's trading-desk/MNPI policy treat combined supplier-financial + BOM signal? (Legal review early.) Mitigation: strict role-based access and audit-committee-defensible design.
  - Will the incumbent SCRM vendor (Everstream, Resilinc, etc.) react to augmentation vs. displacement positioning? Mitigation: lead with augmentation; displacement happens when the sponsor sees the pharma-native advantage over time.
  - Alert-fatigue discipline — the last AI tool got turned off in 90 days. The entire UX must be engineered to produce 3–7 high-quality cards per user per day, not 30. This is a product-management discipline, not a technical one.
