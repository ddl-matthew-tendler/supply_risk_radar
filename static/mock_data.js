// SupplyRiskRadar - Mock Data
// All window.MOCK_* globals used by app.js in dummy mode

var MOCK_SUPPLIERS = [
  // CRITICAL - sole-source KSMs
  { id: 's001', name: 'Aurobindo Pharma Unit VII', shortName: 'Aurobindo U7', country: 'India', city: 'Hyderabad', lat: 17.38, lng: 78.47, riskScore: 94, riskLevel: 'critical', category: 'API', sole: true, drugProducts: ['dp001', 'dp002'], spend: 42000000, activeEvents: ['FDA Form 483 - Data Integrity Observation (Mar 2026)', 'Labor unrest reported at Hyderabad industrial estate'], alternateStatus: 'None', fda483Date: '2026-03-12', hsCode: '2934.99', tariffExposure: 0.31 },
  { id: 's002', name: 'Zhejiang Huahai Pharmaceutical', shortName: 'Zhejiang Huahai', country: 'China', city: 'Linhai', lat: 28.85, lng: 121.13, riskScore: 91, riskLevel: 'critical', category: 'API', sole: true, drugProducts: ['dp003'], spend: 67000000, activeEvents: ['EU GMP Non-Compliance Notice (Feb 2026)', 'Typhoon Doksuri track within 200km (Apr 2026)', '+25% US Tariff on Chinese APIs effective May 2026'], alternateStatus: 'In Qualification', fda483Date: null, hsCode: '2933.59', tariffExposure: 0.25 },
  { id: 's003', name: 'Divi\'s Laboratories Unit II', shortName: 'Divi\'s Lab U2', country: 'India', city: 'Visakhapatnam', lat: 17.69, lng: 83.22, riskScore: 88, riskLevel: 'critical', category: 'KSM', sole: true, drugProducts: ['dp001', 'dp004'], spend: 28000000, activeEvents: ['FDA Warning Letter precursor observation filed Jan 2026', 'Cyclone risk - Bay of Bengal seasonal outlook elevated'], alternateStatus: 'None', fda483Date: '2026-01-18', hsCode: '2934.10', tariffExposure: 0.10 },
  { id: 's004', name: 'Hisun Pharmaceuticals', shortName: 'Hisun Pharma', country: 'China', city: 'Taizhou', lat: 28.66, lng: 121.43, riskScore: 86, riskLevel: 'critical', category: 'API', sole: false, drugProducts: ['dp005'], spend: 31000000, activeEvents: ['+25% US Tariff proposed on Chinese pharmaceutical imports', 'Port of Shanghai congestion +40% dwell time'], alternateStatus: 'Qualified', fda483Date: null, hsCode: '2941.10', tariffExposure: 0.25 },
  { id: 's005', name: 'Laurus Labs API Unit', shortName: 'Laurus Labs', country: 'India', city: 'Hyderabad', lat: 17.45, lng: 78.39, riskScore: 82, riskLevel: 'critical', category: 'API', sole: true, drugProducts: ['dp006'], spend: 19000000, activeEvents: ['FDA 483 - Three observations (sterile fill area) Feb 2026', 'Flooding risk - Musi River catchment elevated'], alternateStatus: 'None', fda483Date: '2026-02-07', hsCode: '2935.90', tariffExposure: 0.10 },

  // HIGH
  { id: 's006', name: 'Sun Pharmaceutical Ind. Ltd', shortName: 'Sun Pharma', country: 'India', city: 'Mumbai', lat: 19.08, lng: 72.88, riskScore: 74, riskLevel: 'high', category: 'API', sole: false, drugProducts: ['dp002', 'dp007'], spend: 55000000, activeEvents: ['SEBI investigation - potential management change risk', 'Monsoon season logistics delays'], alternateStatus: 'Qualified', fda483Date: null, hsCode: '2934.99', tariffExposure: 0.10 },
  { id: 's007', name: 'Jiangsu Hengrui Medicine', shortName: 'Hengrui Medicine', country: 'China', city: 'Lianyungang', lat: 34.60, lng: 119.16, riskScore: 71, riskLevel: 'high', category: 'KSM', sole: false, drugProducts: ['dp003', 'dp005'], spend: 22000000, activeEvents: ['+25% US Tariff exposure on Jiangsu-origin APIs', 'New customs inspection protocol - 3-day delay reported'], alternateStatus: 'In Qualification', fda483Date: null, hsCode: '2933.99', tariffExposure: 0.25 },
  { id: 's008', name: 'Almac Group Ltd', shortName: 'Almac Group', country: 'UK', city: 'Craigavon', lat: 54.44, lng: -6.38, riskScore: 68, riskLevel: 'high', category: 'CMO', sole: false, drugProducts: ['dp008'], spend: 38000000, activeEvents: ['Post-Brexit import tariffs on EU excipients increasing 2026', 'Staff shortfall - qualified persons vacancy open 6+ months'], alternateStatus: 'Qualified', fda483Date: null, hsCode: null, tariffExposure: 0.05 },
  { id: 's009', name: 'Lonza AG Visp Site', shortName: 'Lonza Visp', country: 'Switzerland', city: 'Visp', lat: 46.30, lng: 7.88, riskScore: 65, riskLevel: 'high', category: 'CMO', sole: true, drugProducts: ['dp009'], spend: 91000000, activeEvents: ['Rhône river water levels - manufacturing water supply risk', 'EU AI Act compliance review pending for automated QC systems'], alternateStatus: 'None', fda483Date: null, hsCode: null, tariffExposure: 0.03 },
  { id: 's010', name: 'Boehringer Ingelheim BioXcellence', shortName: 'BI BioXcellence', country: 'Germany', city: 'Biberach', lat: 48.10, lng: 9.78, riskScore: 62, riskLevel: 'high', category: 'CMO', sole: false, drugProducts: ['dp010'], spend: 47000000, activeEvents: ['German energy costs +18% - COGS impact on biologics CMO fee'], alternateStatus: 'Qualified', fda483Date: null, hsCode: null, tariffExposure: 0.02 },
  { id: 's011', name: 'Siegfried AG Hameln', shortName: 'Siegfried Hameln', country: 'Germany', city: 'Hameln', lat: 52.10, lng: 9.36, riskScore: 61, riskLevel: 'high', category: 'CMO', sole: false, drugProducts: ['dp007'], spend: 29000000, activeEvents: ['MHRA GMP inspection - minor observations outstanding'], alternateStatus: 'In Qualification', fda483Date: null, hsCode: null, tariffExposure: 0.02 },
  { id: 's012', name: 'Cambrex Corp High Point', shortName: 'Cambrex HP', country: 'USA', city: 'High Point, NC', lat: 35.96, lng: -80.01, riskScore: 58, riskLevel: 'high', category: 'API', sole: false, drugProducts: ['dp004'], spend: 34000000, activeEvents: ['Hurricane season elevated risk - SE coastal manufacturing corridor'], alternateStatus: 'Qualified', fda483Date: null, hsCode: '2934.99', tariffExposure: 0.00 },

  // MEDIUM
  { id: 's013', name: 'Dr. Reddy\'s Laboratories CPS', shortName: 'Dr. Reddy\'s CPS', country: 'India', city: 'Hyderabad', lat: 17.36, lng: 78.51, riskScore: 49, riskLevel: 'medium', category: 'API', sole: false, drugProducts: ['dp001', 'dp006'], spend: 18000000, activeEvents: ['New CEO transition - sourcing strategy review expected'], alternateStatus: 'Qualified', fda483Date: null, hsCode: '2934.99', tariffExposure: 0.10 },
  { id: 's014', name: 'BASF SE Ludwigshafen', shortName: 'BASF SE', country: 'Germany', city: 'Ludwigshafen', lat: 49.49, lng: 8.44, riskScore: 47, riskLevel: 'medium', category: 'Excipient', sole: false, drugProducts: ['dp002', 'dp008'], spend: 12000000, activeEvents: ['Rhine river low water levels - barge logistics disruption risk Q3'], alternateStatus: 'Qualified', fda483Date: null, hsCode: '3824.99', tariffExposure: 0.03 },
  { id: 's015', name: 'Ashland Specialty Ingredients', shortName: 'Ashland SI', country: 'USA', city: 'Wilmington, DE', lat: 39.75, lng: -75.55, riskScore: 44, riskLevel: 'medium', category: 'Excipient', sole: false, drugProducts: ['dp003', 'dp005'], spend: 8000000, activeEvents: [], alternateStatus: 'Qualified', fda483Date: null, hsCode: '3912.11', tariffExposure: 0.00 },
  { id: 's016', name: 'Aesica Pharmaceuticals Cramlington', shortName: 'Aesica Cram.', country: 'UK', city: 'Cramlington', lat: 55.07, lng: -1.59, riskScore: 43, riskLevel: 'medium', category: 'CMO', sole: false, drugProducts: ['dp009'], spend: 21000000, activeEvents: ['Post-Brexit certificate of conformity delays - avg 5 days added'], alternateStatus: 'Qualified', fda483Date: null, hsCode: null, tariffExposure: 0.05 },
  { id: 's017', name: 'Siegfried Evionnaz', shortName: 'Siegfried Evio.', country: 'Switzerland', city: 'Evionnaz', lat: 46.14, lng: 7.03, riskScore: 41, riskLevel: 'medium', category: 'API', sole: false, drugProducts: ['dp010'], spend: 14000000, activeEvents: [], alternateStatus: 'Qualified', fda483Date: null, hsCode: '2934.99', tariffExposure: 0.03 },
  { id: 's018', name: 'Jubilant Biosys Noida', shortName: 'Jubilant Biosys', country: 'India', city: 'Noida', lat: 28.53, lng: 77.39, riskScore: 38, riskLevel: 'medium', category: 'KSM', sole: false, drugProducts: ['dp002'], spend: 9000000, activeEvents: [], alternateStatus: 'Qualified', fda483Date: null, hsCode: '2934.10', tariffExposure: 0.10 },
  { id: 's019', name: 'Evonik Nutrition & Care', shortName: 'Evonik N&C', country: 'Germany', city: 'Essen', lat: 51.46, lng: 7.01, riskScore: 36, riskLevel: 'medium', category: 'Excipient', sole: false, drugProducts: ['dp006', 'dp007'], spend: 7000000, activeEvents: [], alternateStatus: 'Qualified', fda483Date: null, hsCode: '3914.00', tariffExposure: 0.02 },
  { id: 's020', name: 'Catalent Pharma Solutions Brussels', shortName: 'Catalent BRU', country: 'Belgium', city: 'Brussels', lat: 50.85, lng: 4.35, riskScore: 34, riskLevel: 'medium', category: 'CMO', sole: false, drugProducts: ['dp008'], spend: 26000000, activeEvents: [], alternateStatus: 'Qualified', fda483Date: null, hsCode: null, tariffExposure: 0.02 },

  // LOW
  { id: 's021', name: 'Thermo Fisher Scientific Pharma', shortName: 'ThermoFisher', country: 'USA', city: 'San Diego, CA', lat: 32.72, lng: -117.15, riskScore: 22, riskLevel: 'low', category: 'CMO', sole: false, drugProducts: ['dp010'], spend: 33000000, activeEvents: [], alternateStatus: 'Qualified', fda483Date: null, hsCode: null, tariffExposure: 0.00 },
  { id: 's022', name: 'Pfizer CentreOne Kalamazoo', shortName: 'Pfizer C1', country: 'USA', city: 'Kalamazoo, MI', lat: 42.29, lng: -85.59, riskScore: 19, riskLevel: 'low', category: 'API', sole: false, drugProducts: ['dp004'], spend: 15000000, activeEvents: [], alternateStatus: 'Qualified', fda483Date: null, hsCode: '2941.10', tariffExposure: 0.00 },
  { id: 's023', name: 'Merck KGaA Darmstadt', shortName: 'Merck KGaA', country: 'Germany', city: 'Darmstadt', lat: 49.87, lng: 8.65, riskScore: 17, riskLevel: 'low', category: 'Excipient', sole: false, drugProducts: ['dp001', 'dp003'], spend: 11000000, activeEvents: [], alternateStatus: 'Qualified', fda483Date: null, hsCode: '2942.00', tariffExposure: 0.02 },
  { id: 's024', name: 'Capsugel Bornem', shortName: 'Capsugel', country: 'Belgium', city: 'Bornem', lat: 51.10, lng: 4.24, riskScore: 15, riskLevel: 'low', category: 'Packaging', sole: false, drugProducts: ['dp002', 'dp005'], spend: 6000000, activeEvents: [], alternateStatus: 'Qualified', fda483Date: null, hsCode: '3923.50', tariffExposure: 0.02 },
  { id: 's025', name: 'West Pharmaceutical Services', shortName: 'West Pharma', country: 'USA', city: 'Lionville, PA', lat: 40.04, lng: -75.64, riskScore: 12, riskLevel: 'low', category: 'Packaging', sole: false, drugProducts: ['dp009'], spend: 9000000, activeEvents: [], alternateStatus: 'Qualified', fda483Date: null, hsCode: '3923.50', tariffExposure: 0.00 }
];

var MOCK_DRUG_PRODUCTS = [
  { id: 'dp001', name: 'Vexorin (vexlostatide)', revenue: 2100000000, therapyArea: 'Oncology', dosageForm: 'Oral Tablet', stage: 'Commercial', keySuppliers: ['s001', 's003', 's013'], alternateCount: 1 },
  { id: 'dp002', name: 'Cardivance (cardexolol)', revenue: 1450000000, therapyArea: 'Cardiovascular', dosageForm: 'Oral Capsule', stage: 'Commercial', keySuppliers: ['s001', 's006', 's018'], alternateCount: 2 },
  { id: 'dp003', name: 'Lumizap (lumifenazide)', revenue: 890000000, therapyArea: 'CNS', dosageForm: 'IV Infusion', stage: 'Commercial', keySuppliers: ['s002', 's007', 's023'], alternateCount: 1 },
  { id: 'dp004', name: 'Renolyx (renoluzumab)', revenue: 670000000, therapyArea: 'Nephrology', dosageForm: 'SC Injection', stage: 'Commercial', keySuppliers: ['s003', 's012', 's022'], alternateCount: 2 },
  { id: 'dp005', name: 'Axitrel (axinibrel)', revenue: 540000000, therapyArea: 'Autoimmune', dosageForm: 'Oral Tablet', stage: 'Commercial', keySuppliers: ['s004', 's007', 's015'], alternateCount: 3 },
  { id: 'dp006', name: 'Nevrex (nevrostatide)', revenue: 420000000, therapyArea: 'Neurology', dosageForm: 'Oral Capsule', stage: 'Commercial', keySuppliers: ['s005', 's013'], alternateCount: 0 },
  { id: 'dp007', name: 'Inflameze (inflamedizole)', revenue: 310000000, therapyArea: 'Immunology', dosageForm: 'Oral Tablet', stage: 'Commercial', keySuppliers: ['s006', 's011', 's019'], alternateCount: 2 },
  { id: 'dp008', name: 'Coatrix DP (Formulation)', revenue: 280000000, therapyArea: 'Oncology', dosageForm: 'DP Manufacturing', stage: 'Commercial', keySuppliers: ['s008', 's014', 's020'], alternateCount: 1 },
  { id: 'dp009', name: 'Biorexin (biorexumab)', revenue: 750000000, therapyArea: 'Biologics', dosageForm: 'IV Infusion', stage: 'Commercial', keySuppliers: ['s009', 's016', 's025'], alternateCount: 0 },
  { id: 'dp010', name: 'Zeltavir (zeltavirine)', revenue: 195000000, therapyArea: 'Antiviral', dosageForm: 'Oral Tablet', stage: 'Commercial', keySuppliers: ['s010', 's017', 's021'], alternateCount: 2 }
];

var MOCK_WATCHLIST = [
  {
    rank: 1, supplierId: 's001', supplierName: 'Aurobindo Pharma Unit VII', country: 'India',
    drugProductId: 'dp001', drugProductName: 'Vexorin (vexlostatide)', revenue: 2100000000,
    riskScore: 94, riskDrivers: ['FDA Form 483 - Data Integrity', 'Labor Unrest', 'Sole-source KSM'],
    alternateStatus: 'None', leadTimeDays: 18, revenueAtRisk: 2100000000,
    mitigationSuggestion: 'Immediate actions: (1) Request CAPA response timeline from Aurobindo quality team within 48h. (2) Initiate emergency qualification of Dr. Reddy\'s CPS (s013) as alternate KSM source - estimated 90-day qualification timeline. (3) Build 60-day safety stock at current run rate - estimated $3.2M working capital. (4) Engage regulatory affairs to assess impact on drug master file if site change required.',
    sourceEvents: ['FDA Form 483 observed at Aurobindo Unit VII (2026-03-12) - data integrity observations in LIMS system', 'Times of India: Labor unrest at Hyderabad Pharma City - 3-day strike threat (2026-04-17)'],
    reasoningChain: [
      'Step 1: FDA Form 483 filed 2026-03-12 - data integrity observation class (historically 73% precursor to Warning Letter within 12 months)',
      'Step 2: Entity resolution - "Aurobindo Unit VII" → supplier ID s001 (confidence 0.97)',
      'Step 3: BOM linkage - s001 is sole qualified KSM source for Vexorin (dp001, $2.1B revenue)',
      'Step 4: Alternate check - zero qualified alternates; Dr. Reddy\'s CPS in-progress qualification (est. 90 days to completion)',
      'Step 5: Compounding signal - labor unrest further elevates supply continuity risk within 30-day window',
      'Step 6: Priority score = 94/100 (regulatory signal weight 0.45 × severity 0.95 + BOM criticality 0.35 × sole-source 1.0 + financial exposure 0.20 × $2.1B)'
    ],
    confidence: 0.91, reviewedAt: null
  },
  {
    rank: 2, supplierId: 's002', supplierName: 'Zhejiang Huahai Pharmaceutical', country: 'China',
    drugProductId: 'dp003', drugProductName: 'Lumizap (lumifenazide)', revenue: 890000000,
    riskScore: 91, riskDrivers: ['EU GMP Non-Compliance', 'Typhoon Risk', 'China +25% Tariff'],
    alternateStatus: 'In Qualification', leadTimeDays: 24, revenueAtRisk: 890000000,
    mitigationSuggestion: 'Actions: (1) Accelerate alternate supplier qualification - Jiangsu Hengrui (s007) estimated 45 days remaining. (2) Review tariff classification - HS 2933.59 exposure under proposed May 2026 tariff would add $16.7M/year to COGS. (3) Monitor Typhoon Doksuri track - if within 150km of Linhai, activate BCP protocol. (4) Request EMA GMP non-compliance response letter review from Zhejiang Huahai.',
    sourceEvents: ['EMA EudraGMDP: Zhejiang Huahai - EU GMP Non-Compliance Notice (2026-02-14)', 'NOAA/JMA: Typhoon Doksuri track within 200km of Linhai (forecast 2026-04-22)', 'USTR Notice 2026-031: Proposed +25% tariff on Chinese API imports HS Chapter 29'],
    reasoningChain: [
      'Step 1: EU GMP Non-Compliance (Feb 2026) - manufacturing process deviations observed, CAPA deadline May 2026',
      'Step 2: Entity resolution - "Zhejiang Huahai" → s002 (confidence 0.99)',
      'Step 3: BOM linkage - s002 is sole active source for Lumizap API (dp003, $890M revenue)',
      'Step 4: Typhoon forecast - Linhai facility lat 28.85°N in JMA track cone for Apr 22',
      'Step 5: Tariff overlay - HS 2933.59 × $67M annual spend = $16.7M incremental COGS under +25% scenario',
      'Step 6: Stacked risk - regulatory + weather + tariff × sole-source = 91/100'
    ],
    confidence: 0.88, reviewedAt: null
  },
  {
    rank: 3, supplierId: 's003', supplierName: 'Divi\'s Laboratories Unit II', country: 'India',
    drugProductId: 'dp001', drugProductName: 'Vexorin (vexlostatide)', revenue: 2100000000,
    riskScore: 88, riskDrivers: ['FDA Warning Letter Precursor', 'Cyclone Risk', 'Sole-source'],
    alternateStatus: 'None', leadTimeDays: 21, revenueAtRisk: 2100000000,
    mitigationSuggestion: 'Actions: (1) Warning Letter watch - 483 from Jan 2026 elevates WL probability to ~65% by Q3 2026. (2) Dual sourcing initiative - initiate RFP for Vizag-region alternate KSM supplier. (3) Bay of Bengal cyclone season (May–Nov) - ensure 45-day safety stock minimum at central DC. (4) Coordinate with CMC team on DMF update timeline.',
    sourceEvents: ['FDA Inspection Database: Divi\'s Unit II, Visakhapatnam - Form 483 (2026-01-18)', 'IMD Seasonal Outlook: Bay of Bengal cyclone season - above-normal activity forecast 2026'],
    reasoningChain: [
      'Step 1: FDA 483 filed Jan 2026 - manufacturing process observations (Class II severity)',
      'Step 2: Historical base rate: Class II 483 → Warning Letter within 12 months = 61%',
      'Step 3: BOM - s003 is sole KSM source for Vexorin (dp001) - also supplies Renolyx (dp004)',
      'Step 4: Cyclone exposure - Visakhapatnam lat 17.69°N - above-normal 2026 Bay of Bengal season',
      'Step 5: Priority score = 88/100'
    ],
    confidence: 0.85, reviewedAt: null
  },
  {
    rank: 4, supplierId: 's005', supplierName: 'Laurus Labs API Unit', country: 'India',
    drugProductId: 'dp006', drugProductName: 'Nevrex (nevrostatide)', revenue: 420000000,
    riskScore: 82, riskDrivers: ['FDA 483 - Sterile Fill', 'Flooding Risk', 'Sole-source'],
    alternateStatus: 'None', leadTimeDays: 30, revenueAtRisk: 420000000,
    mitigationSuggestion: 'Actions: (1) FDA sterile-fill observations - engage quality team for CAPA status. (2) Musi River flood risk - confirm flood barrier certifications at Laurus Hyderabad site. (3) Zero qualified alternates for Nevrex API - initiate alternate sourcing project immediately.',
    sourceEvents: ['FDA 483: Laurus Labs Hyderabad Unit - 3 sterile fill observations (2026-02-07)', 'Hyderabad Municipal: Musi River catchment at 78% capacity - flood advisory issued'],
    reasoningChain: [
      'Step 1: FDA 483 sterile fill observations - highest severity class for sterile products',
      'Step 2: Sole source for Nevrex API - $420M revenue, zero qualified alternates',
      'Step 3: Flooding risk - Hyderabad Musi River advisory compounds supply continuity risk',
      'Step 4: Priority score = 82/100'
    ],
    confidence: 0.83, reviewedAt: null
  },
  {
    rank: 5, supplierId: 's009', supplierName: 'Lonza AG Visp Site', country: 'Switzerland',
    drugProductId: 'dp009', drugProductName: 'Biorexin (biorexumab)', revenue: 750000000,
    riskScore: 65, riskDrivers: ['Water Supply Risk', 'Sole CMO Source', 'No Alternate'],
    alternateStatus: 'None', leadTimeDays: 45, revenueAtRisk: 750000000,
    mitigationSuggestion: 'Actions: (1) Confirm Lonza Visp alternative water supply protocol - Rhône low-level threshold triggers manufacturing pause. (2) Biorexin is sole-source CMO - $750M biologics revenue. Initiate CMO backup qualification immediately (12–18 month timeline). (3) Escalate to CPO given revenue exposure.',
    sourceEvents: ['Swiss Federal Office for the Environment: Rhône river level at 31% annual average - drought outlook Q2 2026'],
    reasoningChain: [
      'Step 1: Rhône water level at 31% - Lonza Visp requires river water for cooling and manufacturing',
      'Step 2: Sole CMO source for Biorexin biologics ($750M) - no qualified backup',
      'Step 3: Biologics CMO tech transfer timeline = 12–18 months minimum',
      'Step 4: Priority score = 65/100'
    ],
    confidence: 0.78, reviewedAt: null
  },
  {
    rank: 6, supplierId: 's004', supplierName: 'Hisun Pharmaceuticals', country: 'China',
    drugProductId: 'dp005', drugProductName: 'Axitrel (axinibrel)', revenue: 540000000,
    riskScore: 62, riskDrivers: ['China +25% Tariff', 'Port Congestion'],
    alternateStatus: 'Qualified', leadTimeDays: 28, revenueAtRisk: 162000000,
    mitigationSuggestion: 'Tariff scenario: +25% on HS 2941.10 adds $7.75M/year to Axitrel COGS. Alternate supplier (Cambrex HP, s012) is qualified - model switch economics at 28-day lead time. Port congestion adds ~8 days to current lead time; consider air freight for next 2 shipments.',
    sourceEvents: ['USTR Notice 2026-031: +25% tariff proposed on Chinese APIs', 'Shanghai Port Authority: Dwell time +40% vs. Q4 2025 average'],
    reasoningChain: [
      'Step 1: Tariff exposure - Hisun HS 2941.10 × $31M spend × 0.25 = $7.75M/year COGS impact',
      'Step 2: Qualified alternate available (Cambrex HP) - reduces risk from critical to manageable',
      'Step 3: Port congestion - 8-day additional lead time overlaps with upcoming batch schedule',
      'Step 4: Priority score = 62/100'
    ],
    confidence: 0.82, reviewedAt: null
  },
  {
    rank: 7, supplierId: 's002', supplierName: 'Zhejiang Huahai Pharmaceutical', country: 'China',
    drugProductId: 'dp003', drugProductName: 'Lumizap (lumifenazide)', revenue: 890000000,
    riskScore: 58, riskDrivers: ['China +25% Tariff', 'HS 2933.59 exposure'],
    alternateStatus: 'In Qualification', leadTimeDays: 24, revenueAtRisk: 267000000,
    mitigationSuggestion: 'Model tariff pass-through vs. alternate sourcing economics. At +25% tariff, switching to qualified-in-progress Jiangsu Hengrui (s007) saves $16.7M/year once qualification completes in ~45 days.',
    sourceEvents: ['USTR Notice 2026-031: HS Chapter 29 tariff proposal (2026-04-10)'],
    reasoningChain: ['Step 1: Tariff exposure calc - $67M × 0.25 = $16.7M annual COGS delta', 'Step 2: Alternate in qualification (45 days) - transition plan feasible'],
    confidence: 0.79, reviewedAt: null
  },
  {
    rank: 8, supplierId: 's008', supplierName: 'Almac Group Ltd', country: 'UK',
    drugProductId: 'dp008', drugProductName: 'Coatrix DP (Formulation)', revenue: 280000000,
    riskScore: 52, riskDrivers: ['QP Vacancy', 'Brexit Import Delays'],
    alternateStatus: 'Qualified', leadTimeDays: 35, revenueAtRisk: 84000000,
    mitigationSuggestion: 'Confirm Almac QP contingency plan - 6-month vacancy increases batch release risk. Brexit EU excipient tariffs adding ~£180K/year. Alternate Catalent Brussels (s020) is qualified - consider split batch strategy.',
    sourceEvents: ['Almac Group HR: Qualified Person vacancy 6+ months unfilled', 'UK HMRC: EU pharmaceutical excipient imports duty rate change 2026'],
    reasoningChain: ['Step 1: QP vacancy elevates batch release delay risk', 'Step 2: Brexit tariff impact on excipient COGS', 'Step 3: Alternate available - risk partially mitigated'],
    confidence: 0.74, reviewedAt: null
  },
  {
    rank: 9, supplierId: 's007', supplierName: 'Jiangsu Hengrui Medicine', country: 'China',
    drugProductId: 'dp005', drugProductName: 'Axitrel (axinibrel)', revenue: 540000000,
    riskScore: 48, riskDrivers: ['China +25% Tariff', 'Customs Delay'],
    alternateStatus: 'In Qualification', leadTimeDays: 32, revenueAtRisk: 54000000,
    mitigationSuggestion: 'Hengrui qualification progressing - accelerate if Hisun tariff impact confirmed. Customs protocol adds 3-day clearance delay; pre-position inventory.',
    sourceEvents: ['USTR Notice 2026-031: HS Chapter 29 tariff', 'CBP: New pharmaceutical import inspection protocol - avg 3-day delay'],
    reasoningChain: ['Step 1: Tariff overlay on KSM spend', 'Step 2: Customs delay - inventory buffer needed'],
    confidence: 0.72, reviewedAt: null
  },
  {
    rank: 10, supplierId: 's006', supplierName: 'Sun Pharmaceutical Ind. Ltd', country: 'India',
    drugProductId: 'dp002', drugProductName: 'Cardivance (cardexolol)', revenue: 1450000000,
    riskScore: 44, riskDrivers: ['Management Change Risk', 'Monsoon Delays'],
    alternateStatus: 'Qualified', leadTimeDays: 22, revenueAtRisk: 58000000,
    mitigationSuggestion: 'Monitor SEBI investigation - management transition could disrupt sourcing contracts. Monsoon season (Jun–Sep) logistics delays - build 30-day buffer. Alternate Aurobindo (s001) is qualified but currently elevated-risk itself.',
    sourceEvents: ['Economic Times: SEBI investigation - Sun Pharma board changes expected', 'IMD Monsoon Forecast: Above-normal monsoon 2026 - Mumbai logistics impact'],
    reasoningChain: ['Step 1: Management change risk during SEBI investigation', 'Step 2: Monsoon disruption - Mumbai logistics corridor'],
    confidence: 0.69, reviewedAt: null
  }
];

var MOCK_ALERTS = [
  {
    id: 'a001', supplierId: 's001', supplierName: 'Aurobindo Pharma Unit VII',
    type: 'Regulatory', severity: 'critical', title: 'FDA Form 483 - Data Integrity Observations',
    description: 'FDA inspection at Aurobindo Unit VII (Hyderabad) completed March 12, 2026. Three observations issued: (1) LIMS audit trail disabled for production records 2024–2025; (2) Out-of-specification investigation procedures inadequate; (3) Analyst training records incomplete for critical QC methods. Historical base rate: data-integrity 483 → Warning Letter within 12 months = 73%.',
    sourceUrl: 'https://www.fda.gov/inspections-compliance-enforcement/warning-letters',
    sourceLabel: 'FDA Inspection Database',
    date: '2026-03-12',
    drugImpact: ['Vexorin (dp001) - sole KSM source, $2.1B revenue'],
    confidence: 0.97,
    reviewedAt: null, dismissedAt: null, actionTakenAt: null
  },
  {
    id: 'a002', supplierId: 's002', supplierName: 'Zhejiang Huahai Pharmaceutical',
    type: 'Regulatory', severity: 'critical', title: 'EU GMP Non-Compliance Notice',
    description: 'EMA EudraGMDP database updated Feb 14, 2026: Zhejiang Huahai Linhai site issued EU GMP Non-Compliance Notice. Manufacturing process deviations noted in sterile API production. CAPA deadline: May 31, 2026. If CAPA unsatisfactory, import restriction for EU-bound product expected.',
    sourceUrl: 'https://eudragmdp.ema.europa.eu/inspections/gmpc/searchGMPCompliance.do',
    sourceLabel: 'EMA EudraGMDP',
    date: '2026-02-14',
    drugImpact: ['Lumizap (dp003) - primary API source, $890M revenue'],
    confidence: 0.99,
    reviewedAt: null, dismissedAt: null, actionTakenAt: null
  },
  {
    id: 'a003', supplierId: 's002', supplierName: 'Zhejiang Huahai Pharmaceutical',
    type: 'Weather', severity: 'high', title: 'Typhoon Doksuri - Track Within 200km of Linhai',
    description: 'JMA (Japan Meteorological Agency) forecast updated April 18, 2026: Typhoon Doksuri track cone includes Linhai (Zhejiang Province) at landfall probability 34% by April 22–23. Wind speed forecast 85–110 knots at landfall. Linhai industrial zone historically impacted: 2023 Doksuri caused 14-day manufacturing shutdown at pharmaceutical facilities.',
    sourceUrl: 'https://www.jma.go.jp/en/typh/',
    sourceLabel: 'JMA Typhoon Center',
    date: '2026-04-18',
    drugImpact: ['Lumizap (dp003) - Linhai primary production site'],
    confidence: 0.84,
    reviewedAt: null, dismissedAt: null, actionTakenAt: null
  },
  {
    id: 'a004', supplierId: 's001', supplierName: 'Aurobindo Pharma Unit VII',
    type: 'Labor', severity: 'high', title: 'Labor Unrest - Hyderabad Pharma City Strike Threat',
    description: 'Times of India report (April 17, 2026): Hyderabad Pharma City workers union issued 3-day strike notice effective April 21, 2026. Wage dispute unresolved after 6 weeks of negotiations. Aurobindo Unit VII is located within Hyderabad Pharma City industrial estate. Management in mediation.',
    sourceUrl: 'https://timesofindia.indiatimes.com',
    sourceLabel: 'Times of India',
    date: '2026-04-17',
    drugImpact: ['Vexorin (dp001)', 'Cardivance (dp002)'],
    confidence: 0.82,
    reviewedAt: null, dismissedAt: null, actionTakenAt: null
  },
  {
    id: 'a005', supplierId: 's003', supplierName: 'Divi\'s Laboratories Unit II',
    type: 'Regulatory', severity: 'critical', title: 'FDA Form 483 - Warning Letter Precursor Watch',
    description: 'FDA issued 483 at Divi\'s Laboratories Unit II (Visakhapatnam) on January 18, 2026. Two observations: (1) manufacturing process validation inadequate for crystallization step; (2) CAPA system gaps identified. Divi\'s has 30 days to respond. Based on 483 classification and observation severity, estimated Warning Letter probability: 61% within 12 months.',
    sourceUrl: 'https://www.accessdata.fda.gov/scripts/inspsearch/',
    sourceLabel: 'FDA Inspection Classification DB',
    date: '2026-01-18',
    drugImpact: ['Vexorin (dp001) - KSM source', 'Renolyx (dp004) - secondary supplier'],
    confidence: 0.91,
    reviewedAt: null, dismissedAt: null, actionTakenAt: null
  },
  {
    id: 'a006', supplierId: 's004', supplierName: 'Hisun Pharmaceuticals',
    type: 'Tariff', severity: 'high', title: '+25% US Tariff Proposed - HS 2941.10 (Antibiotics)',
    description: 'USTR Notice 2026-031 (April 10, 2026): Proposed 25% tariff on Chinese pharmaceutical imports including HS Chapter 2941 (antibiotics). Comment period closes May 15, 2026. If enacted effective July 1, 2026, Hisun Pharmaceuticals (HS 2941.10 supplier) would incur $7.75M/year incremental COGS on Axitrel (axinibrel) supply chain.',
    sourceUrl: 'https://ustr.gov/trade-agreements/trade-enforcement/tariff-actions',
    sourceLabel: 'USTR',
    date: '2026-04-10',
    drugImpact: ['Axitrel (dp005) - $7.75M/year COGS increase at +25% scenario'],
    confidence: 0.93,
    reviewedAt: null, dismissedAt: null, actionTakenAt: null
  },
  {
    id: 'a007', supplierId: 's005', supplierName: 'Laurus Labs API Unit',
    type: 'Regulatory', severity: 'critical', title: 'FDA 483 - Sterile Fill Observations (3 counts)',
    description: 'FDA inspection at Laurus Labs Hyderabad API Unit (February 7, 2026): Three observations in sterile fill area - environmental monitoring inadequacy, media fill failure documentation, aseptic technique deviation. Sterile fill observations carry highest Warning Letter conversion rate (78%). Laurus is sole API source for Nevrex (nevrostatide).',
    sourceUrl: 'https://www.accessdata.fda.gov/scripts/inspsearch/',
    sourceLabel: 'FDA Inspection Classification DB',
    date: '2026-02-07',
    drugImpact: ['Nevrex (dp006) - sole API source, $420M revenue, zero alternates'],
    confidence: 0.95,
    reviewedAt: null, dismissedAt: null, actionTakenAt: null
  },
  {
    id: 'a008', supplierId: 's009', supplierName: 'Lonza AG Visp Site',
    type: 'Environmental', severity: 'high', title: 'Rhône River Drought - Water Supply Risk',
    description: 'Swiss Federal Office for the Environment (April 15, 2026): Rhône river level at Visp station is 31% of annual average - lowest April reading since 2003. Lonza Visp manufacturing requires river water for cooling towers and manufacturing processes. Factory operations protocol: reduce biologics batch size by 20% when river level <35%, pause manufacturing when <25%.',
    sourceUrl: 'https://www.hydrodaten.admin.ch/en/',
    sourceLabel: 'Swiss FOEN Hydro Data',
    date: '2026-04-15',
    drugImpact: ['Biorexin (dp009) - sole CMO source, $750M revenue'],
    confidence: 0.88,
    reviewedAt: null, dismissedAt: null, actionTakenAt: null
  },
  {
    id: 'a009', supplierId: 's002', supplierName: 'Zhejiang Huahai Pharmaceutical',
    type: 'Tariff', severity: 'high', title: '+25% Tariff - HS 2933.59 Exposure $16.7M/year',
    description: 'USTR Notice 2026-031 tariff proposal covers HS 2933.59 (heterocyclic compounds with nitrogen). Zhejiang Huahai API for Lumizap (lumifenazide) classified under 2933.59. Annual spend $67M × 25% = $16.7M incremental COGS. Alternate qualification for Jiangsu Hengrui expected complete in ~45 days, which would enable tariff-driven source switch.',
    sourceUrl: 'https://ustr.gov/trade-agreements/trade-enforcement/tariff-actions',
    sourceLabel: 'USTR',
    date: '2026-04-10',
    drugImpact: ['Lumizap (dp003) - $16.7M annual COGS increase'],
    confidence: 0.91,
    reviewedAt: null, dismissedAt: null, actionTakenAt: null
  },
  {
    id: 'a010', supplierId: 's008', supplierName: 'Almac Group Ltd',
    type: 'Operational', severity: 'medium', title: 'Qualified Person Vacancy - 6+ Months Unfilled',
    description: 'Almac Group Craigavon site has had a Qualified Person (QP) vacancy for 6+ months. Under EU GMP Article 51, a QP must certify each batch before release. Contingency QP arrangements are in place but at increased risk of capacity constraint. Post-Brexit, EU-reciprocal QP recognition removed, adding complexity. Current assessment: batch release delays of 5–10 days likely if contingency QP unavailable.',
    sourceUrl: null,
    sourceLabel: 'Almac Supplier Communication',
    date: '2026-04-01',
    drugImpact: ['Coatrix DP (dp008) - batch release delay risk'],
    confidence: 0.74,
    reviewedAt: null, dismissedAt: null, actionTakenAt: null
  }
];

var MOCK_TARIFF_SCENARIOS = [
  {
    id: 'baseline', scenarioName: 'Baseline (Current)', description: 'Current tariff rates as of April 2026',
    totalExposure: 0, cogsDeltaPct: 0,
    byDrugProduct: [
      { productId: 'dp001', productName: 'Vexorin', exposure: 0, cogsDelta: 0 },
      { productId: 'dp003', productName: 'Lumizap', exposure: 0, cogsDelta: 0 },
      { productId: 'dp005', productName: 'Axitrel', exposure: 0, cogsDelta: 0 },
      { productId: 'dp004', productName: 'Renolyx', exposure: 0, cogsDelta: 0 },
      { productId: 'dp009', productName: 'Biorexin', exposure: 0, cogsDelta: 0 }
    ],
    bySupplier: [
      { supplierId: 's002', supplierName: 'Zhejiang Huahai', country: 'China', hsCode: '2933.59', annualSpend: 67000000, currentRate: 0.0, scenarioRate: 0.0, delta: 0 },
      { supplierId: 's004', supplierName: 'Hisun Pharmaceuticals', country: 'China', hsCode: '2941.10', annualSpend: 31000000, currentRate: 0.0, scenarioRate: 0.0, delta: 0 },
      { supplierId: 's007', supplierName: 'Jiangsu Hengrui', country: 'China', hsCode: '2933.99', annualSpend: 22000000, currentRate: 0.0, scenarioRate: 0.0, delta: 0 },
      { supplierId: 's001', supplierName: 'Aurobindo Pharma', country: 'India', hsCode: '2934.99', annualSpend: 42000000, currentRate: 0.0, scenarioRate: 0.0, delta: 0 },
      { supplierId: 's003', supplierName: 'Divi\'s Laboratories', country: 'India', hsCode: '2934.10', annualSpend: 28000000, currentRate: 0.0, scenarioRate: 0.0, delta: 0 }
    ]
  },
  {
    id: 'china25', scenarioName: '+25% China API Tariff', description: 'USTR proposed +25% on Chinese pharmaceutical imports (HS Chapter 29)',
    totalExposure: 30000000, cogsDeltaPct: 1.8,
    byDrugProduct: [
      { productId: 'dp003', productName: 'Lumizap', exposure: 16750000, cogsDelta: 1.88 },
      { productId: 'dp005', productName: 'Axitrel', exposure: 7750000, cogsDelta: 1.43 },
      { productId: 'dp004', productName: 'Renolyx', exposure: 3200000, cogsDelta: 0.48 },
      { productId: 'dp001', productName: 'Vexorin', exposure: 1800000, cogsDelta: 0.09 },
      { productId: 'dp009', productName: 'Biorexin', exposure: 500000, cogsDelta: 0.07 }
    ],
    bySupplier: [
      { supplierId: 's002', supplierName: 'Zhejiang Huahai', country: 'China', hsCode: '2933.59', annualSpend: 67000000, currentRate: 0.0, scenarioRate: 0.25, delta: 16750000 },
      { supplierId: 's004', supplierName: 'Hisun Pharmaceuticals', country: 'China', hsCode: '2941.10', annualSpend: 31000000, currentRate: 0.0, scenarioRate: 0.25, delta: 7750000 },
      { supplierId: 's007', supplierName: 'Jiangsu Hengrui', country: 'China', hsCode: '2933.99', annualSpend: 22000000, currentRate: 0.0, scenarioRate: 0.25, delta: 5500000 }
    ]
  },
  {
    id: 'india10', scenarioName: '+10% India API Tariff', description: 'Hypothetical +10% tariff on Indian pharmaceutical imports',
    totalExposure: 9000000, cogsDeltaPct: 0.54,
    byDrugProduct: [
      { productId: 'dp001', productName: 'Vexorin', exposure: 4200000, cogsDelta: 0.20 },
      { productId: 'dp004', productName: 'Renolyx', exposure: 2800000, cogsDelta: 0.42 },
      { productId: 'dp006', productName: 'Nevrex', exposure: 1900000, cogsDelta: 0.45 },
      { productId: 'dp002', productName: 'Cardivance', exposure: 100000, cogsDelta: 0.01 }
    ],
    bySupplier: [
      { supplierId: 's001', supplierName: 'Aurobindo Pharma', country: 'India', hsCode: '2934.99', annualSpend: 42000000, currentRate: 0.0, scenarioRate: 0.10, delta: 4200000 },
      { supplierId: 's003', supplierName: 'Divi\'s Laboratories', country: 'India', hsCode: '2934.10', annualSpend: 28000000, currentRate: 0.0, scenarioRate: 0.10, delta: 2800000 },
      { supplierId: 's005', supplierName: 'Laurus Labs', country: 'India', hsCode: '2935.90', annualSpend: 19000000, currentRate: 0.0, scenarioRate: 0.10, delta: 1900000 }
    ]
  },
  {
    id: 'combined', scenarioName: 'Combined China+India Tariffs', description: '+25% China AND +10% India simultaneously',
    totalExposure: 39000000, cogsDeltaPct: 2.34,
    byDrugProduct: [
      { productId: 'dp003', productName: 'Lumizap', exposure: 16750000, cogsDelta: 1.88 },
      { productId: 'dp001', productName: 'Vexorin', exposure: 6000000, cogsDelta: 0.29 },
      { productId: 'dp005', productName: 'Axitrel', exposure: 7750000, cogsDelta: 1.43 },
      { productId: 'dp004', productName: 'Renolyx', exposure: 6000000, cogsDelta: 0.90 },
      { productId: 'dp006', productName: 'Nevrex', exposure: 1900000, cogsDelta: 0.45 },
      { productId: 'dp002', productName: 'Cardivance', exposure: 100000, cogsDelta: 0.01 }
    ],
    bySupplier: [
      { supplierId: 's002', supplierName: 'Zhejiang Huahai', country: 'China', hsCode: '2933.59', annualSpend: 67000000, currentRate: 0.0, scenarioRate: 0.25, delta: 16750000 },
      { supplierId: 's004', supplierName: 'Hisun Pharmaceuticals', country: 'China', hsCode: '2941.10', annualSpend: 31000000, currentRate: 0.0, scenarioRate: 0.25, delta: 7750000 },
      { supplierId: 's001', supplierName: 'Aurobindo Pharma', country: 'India', hsCode: '2934.99', annualSpend: 42000000, currentRate: 0.0, scenarioRate: 0.10, delta: 4200000 },
      { supplierId: 's007', supplierName: 'Jiangsu Hengrui', country: 'China', hsCode: '2933.99', annualSpend: 22000000, currentRate: 0.0, scenarioRate: 0.25, delta: 5500000 },
      { supplierId: 's003', supplierName: 'Divi\'s Laboratories', country: 'India', hsCode: '2934.10', annualSpend: 28000000, currentRate: 0.0, scenarioRate: 0.10, delta: 2800000 },
      { supplierId: 's005', supplierName: 'Laurus Labs', country: 'India', hsCode: '2935.90', annualSpend: 19000000, currentRate: 0.0, scenarioRate: 0.10, delta: 1900000 }
    ]
  }
];

var MOCK_EXEC_BRIEF = {
  generatedAt: '2026-04-20T23:45:00Z',
  weekEnding: '2026-04-20',
  weekSummary: 'This week\'s Supplier Risk Radar highlights three compounding critical risks that require immediate Procurement Leadership attention before Monday\'s committee meeting. A cluster of regulatory and geopolitical signals has elevated risk for 5 of our top-20 revenue-generating drug products. The most urgent action is confirmation of CAPA timelines from Aurobindo Unit VII and Divi\'s Laboratories, both of whom have active FDA observations that statistically precede Warning Letters. Simultaneously, USTR\'s proposed +25% tariff on Chinese APIs (comment period closes May 15) creates a $30M annual COGS exposure that requires a go/no-go decision on accelerated alternate qualification by end of week.',
  top5Risks: [
    { rank: 1, headline: 'Aurobindo Unit VII (India) - FDA 483 data-integrity + labor unrest', impact: '$2.1B Vexorin at risk - sole KSM source, zero alternates', urgency: 'Act within 48h' },
    { rank: 2, headline: 'Zhejiang Huahai (China) - EU GMP non-compliance + Typhoon Doksuri track', impact: '$890M Lumizap - CAPA deadline May 31 + weather event Apr 22', urgency: 'Monitor daily' },
    { rank: 3, headline: 'Divi\'s Laboratories Unit II (India) - FDA 483 Warning Letter watch', impact: '$2.1B Vexorin + $670M Renolyx KSM source', urgency: 'CAPA response due' },
    { rank: 4, headline: 'Laurus Labs (India) - FDA 483 sterile fill (3 observations)', impact: '$420M Nevrex - sole API source, zero alternates', urgency: 'Alternate sourcing RFP' },
    { rank: 5, headline: 'Lonza Visp (Switzerland) - Rhône river drought CMO shutdown risk', impact: '$750M Biorexin biologics - sole CMO, 12–18mo tech transfer', urgency: 'Escalate to CPO' }
  ],
  actionsRequired: [
    { action: 'Request CAPA timeline from Aurobindo quality team within 48 hours', owner: 'Head of External Supply', dueDate: '2026-04-22', priority: 'Critical' },
    { action: 'Initiate emergency alternate qualification - Dr. Reddy\'s CPS as Vexorin KSM backup', owner: 'Category Manager, APIs', dueDate: '2026-04-25', priority: 'Critical' },
    { action: 'USTR tariff comment - CFO sign-off on $30M exposure memo', owner: 'Trade Compliance + Finance', dueDate: '2026-05-01', priority: 'High' },
    { action: 'Lonza Visp - escalate biologics CMO backup to CPO for executive sponsor', owner: 'Category Manager, CMO', dueDate: '2026-04-26', priority: 'High' },
    { action: 'Typhoon Doksuri BCP - confirm Lumizap safety stock position before April 22', owner: 'Category Manager, APIs', dueDate: '2026-04-21', priority: 'High' }
  ],
  tariffExposureSummary: 'Under the proposed +25% China tariff scenario (USTR Notice 2026-031), total annual COGS exposure is $30.0M (1.8% blended COGS increase). Lumizap ($16.7M) and Axitrel ($7.75M) carry the highest exposure. Alternate qualification for Zhejiang Huahai (Jiangsu Hengrui, ~45 days) and Hisun (Cambrex HP, qualified) would reduce exposure by ~$22M if fully executed. Finance review of tariff pass-through vs. margin impact is requested by May 2.',
  trendAnalysis: '4-week trend: regulatory signal volume +34% vs. Q1 2026 average (FDA 483 publication rate elevated post-pandemic inspection catch-up). Tariff-driven risk cards now represent 31% of watchlist vs. 8% in Q4 2025. China-origin supplier risk concentration has increased from 22% to 29% of total weighted risk score. Alternate qualification backlog grew 18% - CMC team capacity is the bottleneck.'
};
