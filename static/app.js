// Supply Risk Radar - Main App
'use strict';

// ── Debug instrumentation (runs before anything else) ─────────────────────────
var __debug = (function() {
  var MAX_ENTRIES = 200;
  var logs = [];
  var netReqs = [];
  var listeners = [];

  function notify() { listeners.forEach(function(fn) { fn(); }); }

  function addLog(level, args) {
    var msg;
    try { msg = Array.from(args).map(function(a) { return typeof a === 'object' ? JSON.stringify(a, null, 0) : String(a); }).join(' '); } catch(e) { msg = String(args[0]); }
    logs.push({ ts: new Date().toISOString().slice(11, 23), level: level, msg: msg });
    if (logs.length > MAX_ENTRIES) logs.shift();
    notify();
  }

  // Intercept console
  var _log = console.log.bind(console);
  var _warn = console.warn.bind(console);
  var _err = console.error.bind(console);
  var _info = console.info.bind(console);
  console.log   = function() { _log.apply(console, arguments);  addLog('log',   arguments); };
  console.warn  = function() { _warn.apply(console, arguments); addLog('warn',  arguments); };
  console.error = function() { _err.apply(console, arguments);  addLog('error', arguments); };
  console.info  = function() { _info.apply(console, arguments); addLog('info',  arguments); };
  window.addEventListener('error', function(e) { addLog('error', ['\u274C ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')']); });
  window.addEventListener('unhandledrejection', function(e) { addLog('error', ['\u274C Unhandled rejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))]); });

  // Intercept fetch
  var _fetch = window.fetch;
  window.fetch = function(url, opts) {
    var method = (opts && opts.method) || 'GET';
    var entry = { ts: new Date().toISOString().slice(11, 23), method: method, url: String(url), status: '…', duration: null };
    var t0 = Date.now();
    netReqs.push(entry);
    if (netReqs.length > MAX_ENTRIES) netReqs.shift();
    notify();
    return _fetch.apply(window, arguments).then(function(resp) {
      entry.status = resp.status;
      entry.duration = Date.now() - t0;
      notify();
      return resp;
    }, function(err) {
      entry.status = 'ERR';
      entry.duration = Date.now() - t0;
      notify();
      throw err;
    });
  };

  function getGlobals() {
    return [
      { name: 'React',      ok: typeof React !== 'undefined',          val: typeof React !== 'undefined' ? 'v' + (React.version || '?') : 'missing' },
      { name: 'ReactDOM',   ok: typeof ReactDOM !== 'undefined',       val: typeof ReactDOM !== 'undefined' ? 'loaded' : 'missing' },
      { name: 'antd',       ok: typeof antd !== 'undefined',           val: typeof antd !== 'undefined' ? Object.keys(antd).length + ' exports' : 'missing' },
      { name: 'dayjs',      ok: typeof dayjs !== 'undefined',          val: typeof dayjs !== 'undefined' ? dayjs().format('HH:mm') : 'missing' },
      { name: 'Leaflet',    ok: typeof L !== 'undefined',              val: typeof L !== 'undefined' ? 'v' + (L.version || '?') : 'missing' },
      { name: 'MOCK_SUPPLIERS',      ok: typeof MOCK_SUPPLIERS !== 'undefined',      val: typeof MOCK_SUPPLIERS !== 'undefined' ? MOCK_SUPPLIERS.length + ' records' : 'missing' },
      { name: 'MOCK_WATCHLIST',      ok: typeof MOCK_WATCHLIST !== 'undefined',      val: typeof MOCK_WATCHLIST !== 'undefined' ? MOCK_WATCHLIST.length + ' records' : 'missing' },
      { name: 'MOCK_ALERTS',         ok: typeof MOCK_ALERTS !== 'undefined',         val: typeof MOCK_ALERTS !== 'undefined' ? MOCK_ALERTS.length + ' records' : 'missing' },
      { name: 'MOCK_TARIFF_SCENARIOS', ok: typeof MOCK_TARIFF_SCENARIOS !== 'undefined', val: typeof MOCK_TARIFF_SCENARIOS !== 'undefined' ? MOCK_TARIFF_SCENARIOS.length + ' records' : 'missing' },
      { name: 'MOCK_EXEC_BRIEF',     ok: typeof MOCK_EXEC_BRIEF !== 'undefined',     val: typeof MOCK_EXEC_BRIEF !== 'undefined' ? 'loaded' : 'missing' },
    ];
  }

  return {
    getLogs: function() { return logs.slice(); },
    getNetReqs: function() { return netReqs.slice(); },
    getGlobals: getGlobals,
    clearLogs: function() { logs = []; notify(); },
    clearNet: function() { netReqs = []; notify(); },
    subscribe: function(fn) { listeners.push(fn); return function() { listeners = listeners.filter(function(l) { return l !== fn; }); }; },
  };
}());

var _antd = antd;
var ConfigProvider = _antd.ConfigProvider;
var Tabs = _antd.Tabs;
var Tag = _antd.Tag;
var Button = _antd.Button;
var Switch = _antd.Switch;
var Drawer = _antd.Drawer;
var Modal = _antd.Modal;
var Tooltip = _antd.Tooltip;
var Select = _antd.Select;
var Badge = _antd.Badge;
var Progress = _antd.Progress;
var Collapse = _antd.Collapse;
var Table = _antd.Table;
var Input = _antd.Input;
var Form = _antd.Form;
var message = _antd.message;
var Spin = _antd.Spin;
var Divider = _antd.Divider;
var Alert = _antd.Alert;

var h = React.createElement;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;

// ── Domino theme ─────────────────────────────────────────────────────────────
var dominoTheme = {
  token: {
    colorPrimary: '#543FDE',
    colorPrimaryHover: '#3B23D1',
    colorPrimaryActive: '#311EAE',
    colorText: '#2E2E38',
    colorTextSecondary: '#65657B',
    colorTextTertiary: '#8F8FA3',
    colorSuccess: '#28A464',
    colorWarning: '#CCB718',
    colorError: '#C20A29',
    colorInfo: '#0070CC',
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#FAFAFA',
    colorBorder: '#E0E0E0',
    fontFamily: 'Inter, Lato, Helvetica Neue, Arial, sans-serif',
    fontSize: 14,
    borderRadius: 4,
    borderRadiusLG: 8,
  },
  components: {
    Button: { primaryShadow: 'none', defaultShadow: 'none' },
    Table: { headerBg: '#FAFAFA', rowHoverBg: '#F5F5F5' },
  },
};

// ── Highcharts Domino palette ────────────────────────────────────────────────
if (typeof Highcharts !== 'undefined') {
  Highcharts.setOptions({
    colors: ['#543FDE', '#0070CC', '#28A464', '#CCB718', '#FF6543', '#E835A7', '#2EDCC4', '#A9734C'],
    chart: { style: { fontFamily: 'Inter, Lato, Helvetica Neue, Arial, sans-serif' } },
    credits: { enabled: false },
  });
}

// ── API_GAPS ──────────────────────────────────────────────────────────────────
var API_GAPS = {
  distributeBrief:  { label: 'Distribute Brief',  message: 'Coming soon - SharePoint/Teams write integration is pending.', ready: false },
  exportTariff:     { label: 'Export to Anaplan',  message: 'Coming soon - FP&A export API is in development.', ready: false },
  bulkDismiss:      { label: 'Bulk Dismiss',       message: 'Coming soon - bulk write API is pending.', ready: false },
  liveScoring:      { label: 'Live Re-score',      message: 'Coming soon - real-time ML scoring service is in development.', ready: false },
  triggerRetrain:   { label: 'Trigger Retraining', message: 'Coming soon - Domino Job trigger API is pending deployment.', ready: false },
  promoteChallenger:{ label: 'Promote Challenger', message: 'Coming soon - Model Registry promotion requires human approval workflow.', ready: false },
  capaWebhook:      { label: 'Send to CAPA',       message: 'Coming soon - procurement CAPA system webhook is pending.', ready: false },
  teamsWebhook:     { label: 'Post to Teams',      message: 'Coming soon - Teams channel webhook is pending configuration.', ready: false },
  anaplanWebhook:   { label: 'Export to Anaplan',  message: 'Coming soon - Anaplan export connector is pending.', ready: false },
  ssoRbac:          { label: 'SSO role binding',   message: 'Coming soon - SSO (Okta / Azure AD) role mapping is pending.', ready: false },
};

// ── P3A/P3C: Action + webhook helpers ─────────────────────────────────────────
function postAction(entry) {
  return fetch('/api/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
}

function dispatchWebhook(target, payload) {
  return fetch('/api/webhooks/' + target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
}

// Pharma supply-chain category glossary. "API" here means active
// pharmaceutical ingredient (not the software term); "KSM" means key starting
// material. Surface the long form everywhere these show up.
var CATEGORY_META = {
  API:       { full: 'Active Pharmaceutical Ingredient',    short: 'API',       desc: 'The biologically active molecule in a finished drug product.' },
  KSM:       { full: 'Key Starting Material',               short: 'KSM',       desc: 'An upstream chemical used to synthesize the API.' },
  Excipient: { full: 'Excipient',                           short: 'Excipient', desc: 'Inactive ingredients in the formulation (binders, fillers, stabilizers).' },
  CMO:       { full: 'Contract Manufacturing Organization', short: 'CMO',       desc: 'A third-party manufacturer that produces or fills drug product on behalf of the sponsor.' },
  Packaging: { full: 'Packaging',                           short: 'Packaging', desc: 'Primary or secondary container components (vials, blisters, labels).' },
};
function categoryFull(cat) { var m = CATEGORY_META[cat]; return m ? m.full + ' (' + m.short + ')' : (cat || ''); }
function categoryDesc(cat) { var m = CATEGORY_META[cat]; return m ? m.desc : ''; }

// Demo-only: how much an action reduces a supplier's risk score, plus any
// alternate-status change. Applied locally so users see their action stick.
function actionImpact(action) {
  var map = {
    switch:       { delta: 42, altStatus: 'Qualified',       note: 'Source switched to qualified alternate' },
    alt_qual:     { delta: 22, altStatus: 'In Qualification', note: 'Alternate qualification initiated' },
    safety_stock: { delta: 20, note: 'Safety stock authorized' },
    capa_request: { delta: 16, note: 'CAPA requested from supplier' },
    bcp:          { delta: 18, note: 'BCP activated' },
    escalated:    { delta: 10, note: 'Escalated to leadership' },
    regulatory:   { delta: 12, note: 'Regulatory affairs engaged' },
    monitor:      { delta: 3,  note: 'Monitoring — no change' },
  };
  return map[action] || { delta: 5, note: 'Action logged' };
}

function riskLevelFromScore(s) {
  if (s >= 80) return 'critical';
  if (s >= 60) return 'high';
  if (s >= 40) return 'medium';
  return 'low';
}

// Apply an action's risk-reduction to a supplier (by id). Updates score, level,
// alternate status, and clears active events so the bubble stops pulsing.
function applyActionToSupplier(setSuppliers, supplierId, action) {
  if (!setSuppliers || !supplierId) return;
  var impact = actionImpact(action);
  setSuppliers(function(prev) {
    return prev.map(function(s) {
      if (s.id !== supplierId) return s;
      var newScore = Math.max(10, (s.riskScore || 0) - impact.delta);
      return Object.assign({}, s, {
        riskScore: newScore,
        riskLevel: riskLevelFromScore(newScore),
        alternateStatus: impact.altStatus || s.alternateStatus,
        activeEvents: [],
        actionTakenAt: new Date().toISOString(),
        lastAction: action,
      });
    });
  });
}

// Map action type (from action dropdowns) to an outbound webhook target.
function webhookTargetForAction(action) {
  if (!action) return null;
  if (action.indexOf('capa') === 0) return 'capa';
  if (action === 'escalated') return 'teams';
  if (action === 'alt_qual' || action === 'switch') return 'teams';
  return null;
}

// ── P3D: Role definitions (client-side mirror of /api/me) ─────────────────────
var APP_ROLES = [
  { id: 'supply_chain_analyst', label: 'Supply Chain Analyst',  scope: 'All supplier risk, watchlist, tariff' },
  { id: 'quality_lead',         label: 'Quality Lead',          scope: 'Regulatory + FDA 483 + CAPA alerts' },
  { id: 'regulatory_affairs',   label: 'Regulatory Affairs',    scope: 'Regulatory alerts + DMF-impacting findings' },
  { id: 'procurement_exec',     label: 'Procurement Executive', scope: 'Exec brief + tariff + top-5 risks' },
];

// Which alert types a role cares about. Used as a view filter, not as access control.
function alertTypesForRole(roleId) {
  if (roleId === 'quality_lead')      return ['Regulatory', 'Operational'];
  if (roleId === 'regulatory_affairs') return ['Regulatory'];
  if (roleId === 'procurement_exec')   return ['Tariff', 'Geopolitical', 'Regulatory'];
  return null; // analyst sees all
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt$(n) {
  if (!n && n !== 0) return '-';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toLocaleString();
}

function riskColor(level) {
  if (level === 'critical') return '#C20A29';
  if (level === 'high') return '#E06600';
  if (level === 'medium') return '#CCB718';
  return '#28A464';
}

function riskBg(level) {
  if (level === 'critical') return '#FEF2F2';
  if (level === 'high') return '#FFF4ED';
  if (level === 'medium') return '#FFFBEB';
  return '#F0FDF4';
}

function alternateTag(status) {
  if (status === 'None') return h(Tag, { color: 'error', style: { fontSize: 11 } }, 'No Alternate');
  if (status === 'In Qualification') return h(Tag, { color: 'warning', style: { fontSize: 11 } }, 'Alt: In Qualification');
  return h(Tag, { color: 'success', style: { fontSize: 11 } }, 'Alternate Qualified');
}

function countryFlag(country) {
  var codes = { India: 'IN', China: 'CN', UK: 'GB', Germany: 'DE', Switzerland: 'CH', USA: 'US', Belgium: 'BE', Ireland: 'IE', Singapore: 'SG' };
  return codes[country] || '';
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard(props) {
  var cls = 'stat-card' + (props.onClick ? ' stat-card-clickable' : '') + (props.active ? ' stat-card-active' : '');
  return h('div', { className: cls, onClick: props.onClick || null },
    h('div', { className: 'stat-card-label' }, props.label),
    h('div', { className: 'stat-card-value ' + (props.color || '') }, props.value),
    props.sub ? h('div', { className: 'stat-card-sub' }, props.sub) : null
  );
}

// ── ApiPendingBadge ───────────────────────────────────────────────────────────
function ApiPendingBadge() {
  return h('span', { className: 'api-pending-badge' }, 'API Pending');
}

// ── AboutModal ────────────────────────────────────────────────────────────────
function AboutModal(props) {
  function sec(title, children) {
    return h('div', { className: 'about-section' },
      h('h4', { className: 'about-section-heading' }, title),
      children
    );
  }
  function row(label, body) {
    return h('div', { className: 'about-row' },
      h('div', { className: 'about-row-label' }, label),
      h('div', { className: 'about-row-body' }, body)
    );
  }

  return h(Modal, {
    open: props.open,
    onCancel: props.onClose,
    footer: h(Button, { type: 'primary', onClick: props.onClose }, 'Close'),
    title: h('span', { style: { fontSize: 16, fontWeight: 700 } }, 'About Supply Risk Radar'),
    width: 760,
  },
    h('div', { className: 'about-body' },
      h('p', { className: 'about-tagline' },
        'Continuous supply risk monitoring for pharma. Fuses regulatory, weather, tariff, and geopolitical signals against the sponsor\'s drug portfolio so procurement and quality leads see what matters first, at the ingredient and supplier level.'
      ),

      h(Divider, { style: { margin: '12px 0' } }),

      sec('The problem it solves', h('p', { className: 'about-para' },
        'Pharma supply risk today is scattered across FDA databases, weather feeds, news wires, tariff notices, and internal spreadsheets listing every ingredient and its approved supplier. A labor strike in Hyderabad or a new FDA inspection finding at a sole-source ingredient site can sit un-triaged for days. Supply Risk Radar unifies these signals, ties each one to the specific drugs at risk, and proposes a mitigation path with source citations.'
      )),

      sec('Key terms',
        h('ul', { className: 'about-list' },
          h('li', null, h('strong', null, 'FDA Form 483'), ': a written notice an FDA inspector leaves at the end of a site inspection listing observations where the manufacturing site appears to not meet good-manufacturing-practice requirements. A 483 is a strong leading indicator of a Warning Letter or import ban.'),
          h('li', null, h('strong', null, 'Ingredient supplier (API / KSM)'), ': the active pharmaceutical ingredient (API) is the molecule that makes a drug work. A key starting material (KSM) is an upstream precursor used to synthesize the API. Both are heavily regulated and often sole-sourced.'),
          h('li', null, h('strong', null, 'Qualified alternate'), ': a second supplier the regulator has already accepted as an equivalent source. Having a qualified alternate is what makes a risk recoverable.'),
          h('li', null, h('strong', null, 'Ingredient list (product recipe)'), ': for each drug product, the list of ingredients, their suppliers, and the approved manufacturing sites. This is the map the app scores risk against.')
        )
      ),

      sec('Data sources (where the signal comes from)',
        h('ul', { className: 'about-list' },
          h('li', null, h('strong', null, 'FDA inspection outcomes'), ': Form 483s, Warning Letters, Import Alerts pulled daily from the openFDA API and FDA FOIA feeds. Raw JSON is written to storage, parsed into structured observations.'),
          h('li', null, h('strong', null, 'EMA and MHRA GMP findings'), ': European and UK non-compliance notices from EudraGMDP and MHRA inspection reports.'),
          h('li', null, h('strong', null, 'Weather and natural hazard'), ': NOAA, JMA, and national meteorological APIs for cyclones, flooding, river levels, wildfire.'),
          h('li', null, h('strong', null, 'Geopolitical and labor'), ': Reuters, Bloomberg, and local-language news via a licensed aggregator (GDELT, Factiva). An entity resolution step maps free-text supplier mentions to the internal supplier list.'),
          h('li', null, h('strong', null, 'Tariffs and trade policy'), ': USTR notices, WTO rulings, HS-code-indexed duty schedules.'),
          h('li', null, h('strong', null, 'Internal enterprise data'), ': ingredient lists, approved suppliers, qualified alternates, procurement spend, and revenue at risk, pulled nightly from SAP, Oracle, and the Snowflake warehouse.')
        )
      ),

      sec('Where this data actually comes from in the real world',
        h('p', { className: 'about-para' },
          'Real pharma supply risk data is sourced across four layers. A production deployment of Supply Risk Radar would subscribe to a mix of these, then let Domino handle the fusion.'
        ),
        h('div', null,
          row('Free public APIs',
            'openFDA, FDA FOIA, EMA EudraGMDP, MHRA inspection feeds, NOAA and JMA weather, USGS seismic, USTR and WTO tariff schedules, ClinicalTrials.gov. Pulled directly by scheduled ingestion jobs, no broker needed.'
          ),
          row('Licensed news and trade data',
            'Bloomberg Terminal, LSEG (Refinitiv), Factiva, LexisNexis for global news. GDELT for open-source event data. S&P Panjiva for import-export shipment records derived from customs filings, which tell you who ships what to whom at the bill-of-lading level.'
          ),
          row('Supply-chain risk intelligence vendors',
            'This is the "broker" layer. Everstream Analytics, Resilinc, Interos, Exiger, Sphera (formerly riskmethods), and Sayari scrape, enrich, entity-resolve, and score supplier risk. Pharma-specific: IQVIA and Clarivate Cortellis. Financial health and sanctions: Dun & Bradstreet. Most large pharmas subscribe to one or two of these.'
          ),
          row('Internal enterprise systems',
            'The half no vendor can give you: SAP or Oracle ERP for the ingredient list, approved suppliers, spend, and purchase orders. LIMS and quality systems for historical CAPAs and deviations. The commercial data warehouse for revenue and demand plans.'
          )
        ),
        h('p', { className: 'about-para', style: { marginTop: 10 } },
          'The real value of this app is the fusion across those layers: taking a 483 from openFDA, resolving "Aurobindo Unit VII" to the sponsor\'s internal supplier ID via a broker like Resilinc, then joining to the SAP ingredient list to answer "which of our drugs is exposed, and how much revenue is at risk." That fusion is what Domino orchestrates. It is not something you buy off the shelf.'
        )
      ),

      sec('Where the AI and ML sit',
        h('ul', { className: 'about-list' },
          h('li', null, h('strong', null, 'Risk fusion scorer'), ': an XGBoost gradient-boosted model that turns the raw signals (inspection findings, weather severity, news sentiment, tariff delta, spend, sole-source flag) into a 0-100 risk score for every supplier-drug pair.'),
          h('li', null, h('strong', null, 'LLM reasoning and mitigation writer'), ': a large language model (served as a Model API) produces the plain-English reasoning chain you see in the Watchlist and drafts mitigation suggestions. Every claim is grounded in the source documents pulled by the ingestion jobs, so citations are real.'),
          h('li', null, h('strong', null, 'News and social signal classifier'), ': a transformer-based classifier triages incoming news articles into risk types (labor, regulatory, logistics, cyber) and filters noise before anything reaches the scorer.'),
          h('li', null, h('strong', null, 'Tariff impact model'), ': a deterministic what-if calculator that prices scenario deltas against the ingredient list and annualizes the cost-of-goods impact per drug.')
        )
      ),

      sec('How user feedback improves the models',
        h('p', { className: 'about-para' },
          'Every action a user takes in the Watchlist and Alerts tabs (mark reviewed, dismiss, request CAPA, start alternate qualification, add rationale) is appended to a labeled feedback table. That feedback drives the models two ways:'
        ),
        h('ul', { className: 'about-list' },
          h('li', null, h('strong', null, 'Weekly retraining of the risk scorer'), ': a scheduled job in Domino uses the latest feedback (true positives and false positives judged by humans) plus realized outcomes (did the 483 escalate to a Warning Letter, did the cyclone actually halt production) as new training labels. The retrained model is compared to the live one as a Domino Experiment; if it beats the champion, it is promoted.'),
          h('li', null, h('strong', null, 'Preference tuning of the LLM'), ': when a user edits or rejects a mitigation suggestion, the pair (original suggestion, preferred version) becomes a preference pair used to periodically fine-tune the reasoner via reinforcement learning from human feedback.'),
          h('li', null, h('strong', null, 'Alert fatigue control'), ': the classifier learns which alert types a given role routinely dismisses and suppresses them at the source, so each user sees 3-7 high-signal alerts per day instead of dozens.')
        )
      ),

      sec('Domino platform tie-ins (how this becomes real)',
        h('div', null,
          row('Domino Datasets (file storage)',
            'Yes, every ingestion job lands raw files in Domino Datasets - JSON from openFDA, CSV weather extracts, news article text, PDF 483s. Datasets are the versioned file store. A second job parses those files into unified tables (suppliers, signals, scores) which are written back as Dataset snapshots, giving a reproducible, auditable trail for every scoring run.'
          ),
          row('External Data Volumes',
            'Live enterprise data (SAP ingredient extracts, Coupa spend, Snowflake revenue tables) is mounted read-only from the source system so the app reflects current portfolio state without copying sensitive commercial data into Domino.'
          ),
          row('Scheduled Jobs',
            'Nightly ingestion jobs pull openFDA, NOAA, USTR, and the licensed news feed. A second job batch-scores every supplier-drug pair. A weekly job retrains the risk scorer on the latest feedback.'
          ),
          row('Model APIs',
            'Three models are deployed as Domino Model APIs the app calls in real time: the risk-fusion scorer, the LLM reasoner that writes mitigation suggestions, and the tariff impact calculator.'
          ),
          row('Experiments and Model Registry',
            'Every retraining run is tracked as a Domino Experiment with metrics and data lineage. The champion risk scorer is registered in the Model Registry. Drift monitors watch for shifts in signal distribution or prediction calibration and page the owning team.'
          ),
          row('Domino Governance',
            'Each model is wrapped in a governance bundle with a policy pack covering data lineage, bias review, validation evidence, and periodic review sign-offs. Compliance can audit any risk score end to end, back to the raw source files.'
          ),
          row('Flows and Launchers',
            'A Domino Flow orchestrates ingest to score to notify. Launchers let a procurement lead re-score the portfolio on demand or kick off an alternate-qualification workspace pre-loaded with the qualification protocol.'
          ),
          row('App Hosting',
            'This interface is served as a Domino App with platform SSO, nginx routing, and workspace-level access inherited from the hosting project.'
          ),
          row('Audit logging',
            'Every action logged from this UI persists to a governed Dataset and the Domino audit log, so action history is reviewable for CAPA closure and regulatory inspection.'
          )
        )
      ),

      sec('One-click actions from the app into Domino',
        h('ul', { className: 'about-list' },
          h('li', null, h('strong', null, 'Log action'), ' (Watchlist): writes a reviewed record + rationale to the governed action Dataset and triggers a Flow that notifies the named supplier quality lead.'),
          h('li', null, h('strong', null, 'Start alternate qualification'), ': launches a pre-configured Domino workspace from a Launcher, pre-loaded with the qualification protocol notebook and the target supplier record.'),
          h('li', null, h('strong', null, 'Request CAPA from supplier'), ': calls an outbound webhook that opens a CAPA ticket in the procurement system and writes the ticket ID back to the action Dataset.'),
          h('li', null, h('strong', null, 'Re-score portfolio'), ': triggers the risk-fusion Launcher so the scorer re-runs with the latest signals within ~2 minutes.'),
          h('li', null, h('strong', null, 'Approve and distribute Executive Brief'), ': pushes the generated brief to SharePoint and Teams via the distribution webhook (currently API Pending).'),
          h('li', null, h('strong', null, 'Export tariff scenario'), ': writes the scenario delta table to the shared Anaplan export Dataset (currently API Pending).')
        )
      ),

      sec('What needs to happen to go live',
        h('ol', { className: 'about-list' },
          h('li', null, 'Mount the sponsor ingredient list, approved supplier list, and qualified-alternates tables as Datasets or External Data Volumes.'),
          h('li', null, 'Publish the three models (risk-fusion scorer, LLM reasoner, tariff calculator) as Domino Model APIs from governance-approved bundles.'),
          h('li', null, 'Configure scheduled jobs for openFDA, NOAA, USTR, and news ingestion, with credentials in the Domino secret store.'),
          h('li', null, 'Promote outbound webhooks (CAPA, Teams, Anaplan, SharePoint) from API Pending to production - see Feedback and Models tab for current webhook delivery status.'),
          h('li', null, 'Wire SSO and role-based access so procurement, quality, and regulatory see role-appropriate views.')
        )
      ),

      sec('Known gaps (shown as API Pending in the UI)',
        h('ul', { className: 'about-list' },
          h('li', null, 'Approve and distribute Executive Brief to SharePoint or Teams'),
          h('li', null, 'Export tariff scenario to Anaplan'),
          h('li', null, 'Bulk dismiss alerts'),
          h('li', null, 'Real-time re-score on new signal arrival'),
          h('li', null, 'Role propagation from SSO into the governance audit log')
        )
      ),

      h('p', { className: 'about-footer-note' },
        'Demo mode uses curated mock data across 25 supplier sites and 10 drug products. Toggle Dummy data off to connect live Domino APIs.'
      )
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 1 - World Map
// ════════════════════════════════════════════════════════════════════════════════
function WorldMapTab(props) {
  var suppliers = props.suppliers;
  var hcMap = useRef(null);
  var _mapReady = useState(false); var mapReady = _mapReady[0]; var setMapReady = _mapReady[1];
  var _mapData = useState(null); var mapData = _mapData[0]; var setMapData = _mapData[1];

  var _dr = useState(null); var drawerSupplierId = _dr[0]; var setDrawerSupplierId = _dr[1];
  var _cf = useState('All'); var catFilter = _cf[0]; var setCatFilter = _cf[1];
  var _rf = useState('All'); var riskFilter = _rf[0]; var setRiskFilter = _rf[1];
  var _dam = useState(false); var drawerActionOpen = _dam[0]; var setDrawerActionOpen = _dam[1];
  var _drawerForm = Form.useForm(); var drawerForm = _drawerForm[0];

  // Resolve drawer supplier from live suppliers so map updates reflect in the drawer.
  var drawerSupplier = drawerSupplierId ? suppliers.find(function(s) { return s.id === drawerSupplierId; }) : null;
  function setDrawerSupplier(s) { setDrawerSupplierId(s ? s.id : null); }

  function submitDrawerAction(values) {
    if (!drawerSupplier) return;
    var impact = actionImpact(values.action);
    var entry = {
      kind: 'map_action',
      supplierId: drawerSupplier.id,
      supplier: drawerSupplier.name,
      action: values.action,
      rationale: values.rationale,
      role: props.role || 'supply_chain_analyst',
      user: (props.user && props.user.userName) || 'demo_user',
    };
    postAction(entry).then(function(resp) {
      var target = webhookTargetForAction(values.action);
      if (target) {
        dispatchWebhook(target, { actionId: resp && resp.actionId, supplier: drawerSupplier.name, action: values.action, rationale: values.rationale }).then(function() {
          message.success('Logged. ' + impact.note + ' - risk reduced by ' + impact.delta + '. Webhook queued to ' + target + '.');
        });
      } else {
        message.success('Logged. ' + impact.note + ' - risk reduced by ' + impact.delta + '.');
      }
      if (props.onActionLogged) props.onActionLogged();
    });
    applyActionToSupplier(props.setSuppliers, drawerSupplier.id, values.action);
    setDrawerActionOpen(false);
    drawerForm.resetFields();
  }

  var filtered = useMemo(function() {
    return suppliers.filter(function(s) {
      return (catFilter === 'All' || s.category === catFilter) &&
             (riskFilter === 'All' || s.riskLevel === riskFilter);
    });
  }, [suppliers, catFilter, riskFilter]);

  var stats = useMemo(function() {
    var c = 0, hi = 0, med = 0, lo = 0;
    suppliers.forEach(function(s) {
      if (s.riskLevel === 'critical') c++;
      else if (s.riskLevel === 'high') hi++;
      else if (s.riskLevel === 'medium') med++;
      else lo++;
    });
    return { critical: c, high: hi, medium: med, low: lo };
  }, [suppliers]);

  // Load world topology once
  useEffect(function() {
    if (mapData) return;
    fetch('https://code.highcharts.com/mapdata/custom/world.topo.json')
      .then(function(r) { return r.json(); })
      .then(function(data) { setMapData(data); })
      .catch(function(err) { console.error('Map data fetch failed:', err); });
  }, []);

  // Build chart once mapData is loaded
  useEffect(function() {
    if (!mapData || !window.Highcharts || !Highcharts.mapChart) return;
    if (hcMap.current) { try { hcMap.current.destroy(); } catch(e) {} hcMap.current = null; }

    var points = filtered.map(function(s) {
      var baseRadius = s.riskLevel === 'critical' ? 13 : s.riskLevel === 'high' ? 10 : s.riskLevel === 'medium' ? 8 : 6;
      var cls = s.riskLevel === 'critical' ? 'risk-pulse risk-pulse-critical' : '';
      return {
        name: s.shortName || s.name,
        lat: s.lat,
        lon: s.lng,
        color: riskColor(s.riskLevel),
        className: cls,
        marker: {
          radius: baseRadius,
          fillColor: riskColor(s.riskLevel),
          lineColor: '#fff',
          lineWidth: 2,
          symbol: 'circle',
        },
        _supplier: s,
      };
    });

    hcMap.current = Highcharts.mapChart('supply-map', {
      chart: {
        map: mapData,
        backgroundColor: '#F5F7FA',
        spacing: [0, 0, 0, 0],
        animation: { duration: 400 },
      },
      title: { text: null },
      credits: { enabled: false },
      mapNavigation: {
        enabled: true,
        enableMouseWheelZoom: false,
        buttonOptions: { verticalAlign: 'bottom', theme: { fill: '#fff', 'stroke-width': 1, stroke: '#DBE4E8', r: 4 } },
      },
      legend: { enabled: false },
      tooltip: {
        useHTML: true,
        backgroundColor: '#2E2E38',
        borderWidth: 0,
        borderRadius: 6,
        style: { color: '#fff', fontSize: '12px' },
        formatter: function() {
          var p = this.point;
          if (!p._supplier) return false;
          var s = p._supplier;
          return '<div style="padding:4px 2px;">' +
            '<div style="font-weight:700;font-size:13px;margin-bottom:4px;">' + (s.name || s.shortName) + '</div>' +
            '<div style="color:#C4C4D4;font-size:11px;margin-bottom:6px;">' + (s.country || '') + ' · ' + (s.category || '') + '</div>' +
            '<div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + riskColor(s.riskLevel) + ';margin-right:6px;"></span>Risk score <b>' + s.riskScore + '</b></div>' +
            (s.sole ? '<div style="color:#FCA5A5;font-size:11px;margin-top:4px;">Sole-source · No qualified alternate</div>' : '') +
          '</div>';
        },
      },
      plotOptions: {
        map: { enableMouseTracking: false },
        mappoint: {
          cursor: 'pointer',
          states: { hover: { halo: { size: 10, attributes: { fill: 'rgba(84,63,222,0.25)' } } } },
          point: {
            events: {
              click: function() { if (this._supplier) setDrawerSupplier(this._supplier); },
            },
          },
        },
      },
      series: [
        {
          name: 'World',
          nullColor: '#E6EAF0',
          borderColor: '#C9D2DB',
          borderWidth: 0.5,
          states: { hover: { color: '#E6EAF0', borderColor: '#C9D2DB' } },
          enableMouseTracking: false,
          showInLegend: false,
        },
        {
          type: 'mappoint',
          name: 'Suppliers',
          data: points,
          dataLabels: { enabled: false },
          animation: { duration: 600 },
        },
      ],
    });
    setMapReady(true);
    return function() { if (hcMap.current) { try { hcMap.current.destroy(); } catch(e) {} hcMap.current = null; } };
  }, [mapData]);

  // Update points when filter changes
  useEffect(function() {
    if (!hcMap.current || !mapReady) return;
    var points = filtered.map(function(s) {
      var baseRadius = s.riskLevel === 'critical' ? 13 : s.riskLevel === 'high' ? 10 : s.riskLevel === 'medium' ? 8 : 6;
      var cls = s.riskLevel === 'critical' ? 'risk-pulse risk-pulse-critical' : '';
      return {
        name: s.shortName || s.name,
        lat: s.lat,
        lon: s.lng,
        color: riskColor(s.riskLevel),
        className: cls,
        marker: { radius: baseRadius, fillColor: riskColor(s.riskLevel), lineColor: '#fff', lineWidth: 2, symbol: 'circle' },
        _supplier: s,
      };
    });
    try { hcMap.current.series[1].setData(points, true, { duration: 400 }); } catch(e) {}
  }, [filtered, mapReady]);

  return h('div', { className: 'tab-pane' },
    h('div', { className: 'stats-row' },
      h(StatCard, { label: 'Critical', value: stats.critical, color: 'danger', active: riskFilter === 'critical', onClick: function() { setRiskFilter(riskFilter === 'critical' ? 'All' : 'critical'); } }),
      h(StatCard, { label: 'High Risk', value: stats.high, color: 'warning', active: riskFilter === 'high', onClick: function() { setRiskFilter(riskFilter === 'high' ? 'All' : 'high'); } }),
      h(StatCard, { label: 'Medium Risk', value: stats.medium, color: 'info', active: riskFilter === 'medium', onClick: function() { setRiskFilter(riskFilter === 'medium' ? 'All' : 'medium'); } }),
      h(StatCard, { label: 'Low Risk', value: stats.low, color: 'success', active: riskFilter === 'low', onClick: function() { setRiskFilter(riskFilter === 'low' ? 'All' : 'low'); } }),
      h(StatCard, { label: 'Sole-Source', value: suppliers.filter(function(s) { return s.sole; }).length, color: 'danger', sub: 'No qualified alternate' })
    ),

    h('div', { className: 'map-controls' },
      h(Select, {
        value: catFilter, onChange: setCatFilter, style: { width: 260 },
        optionLabelProp: 'label',
        options: [
          { label: 'All categories', value: 'All' },
          { label: 'Active pharmaceutical ingredient (API)', value: 'API', title: CATEGORY_META.API.desc },
          { label: 'Key starting material (KSM)', value: 'KSM', title: CATEGORY_META.KSM.desc },
          { label: 'Excipient', value: 'Excipient', title: CATEGORY_META.Excipient.desc },
          { label: 'Contract manufacturing organization (CMO)', value: 'CMO', title: CATEGORY_META.CMO.desc },
          { label: 'Packaging', value: 'Packaging', title: CATEGORY_META.Packaging.desc },
        ]
      }),
      h(Select, {
        value: riskFilter, onChange: setRiskFilter, style: { width: 160 },
        options: [
          { label: 'All risk levels', value: 'All' },
          { label: 'Critical', value: 'critical' },
          { label: 'High', value: 'high' },
          { label: 'Medium', value: 'medium' },
          { label: 'Low', value: 'low' },
        ]
      }),
      h('div', { style: { fontSize: 11, color: '#7F8385', lineHeight: 1.4, maxWidth: 420 } },
        h('b', null, 'In pharma supply chains: '),
        'API = active pharmaceutical ingredient (the drug molecule), KSM = key starting material (upstream input), CMO = contract manufacturer.'
      ),
      h('div', { className: 'map-legend', style: { marginLeft: 'auto' } },
        h('span', { style: { fontSize: 11, fontWeight: 600, color: '#8F8FA3', marginRight: 4 } }, 'Legend'),
        ['critical', 'high', 'medium', 'low'].map(function(lvl) {
          return h('div', { key: lvl, className: 'legend-item' },
            h('span', { className: 'legend-dot', style: { background: riskColor(lvl) } }),
            lvl.charAt(0).toUpperCase() + lvl.slice(1)
          );
        })
      )
    ),

    h('div', { id: 'supply-map' }),

    // Supplier Drawer
    h(Drawer, {
      open: !!drawerSupplier,
      onClose: function() { setDrawerSupplier(null); },
      title: drawerSupplier ? h('span', null, countryFlag(drawerSupplier.country), ' ', drawerSupplier.name) : '',
      width: 420,
      extra: drawerSupplier ? h(Tag, { color: drawerSupplier.riskLevel === 'critical' ? 'error' : drawerSupplier.riskLevel === 'high' ? 'warning' : drawerSupplier.riskLevel === 'low' ? 'success' : 'default' }, 'Risk: ' + (drawerSupplier.riskScore || '-')) : null,
      footer: drawerSupplier ? h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
        h(Button, { onClick: function() { setDrawerSupplier(null); } }, 'Close'),
        h(Button, { type: 'primary', onClick: function() { setDrawerActionOpen(true); drawerForm.resetFields(); } }, 'Take action')
      ) : null,
    },
      drawerSupplier ? h('div', null,
        drawerSupplier.actionTakenAt ? h(Alert, {
          type: 'success', showIcon: true,
          message: 'Mitigation logged',
          description: 'Risk score dropped to ' + drawerSupplier.riskScore + '. ' + (actionImpact(drawerSupplier.lastAction).note) + '.',
          style: { marginBottom: 12 }
        }) : null,
        h('div', { style: { display: 'flex', gap: 12, marginBottom: 16 } },
          h('div', { style: { flex: 1 } },
            h('div', { className: 'section-label' }, 'Risk score'),
            h('div', { className: 'risk-score ' + drawerSupplier.riskLevel }, drawerSupplier.riskScore)
          ),
          h('div', { style: { flex: 1 } },
            h('div', { className: 'section-label' }, 'Category'),
            h('div', { style: { fontSize: 14, fontWeight: 600, marginTop: 4, lineHeight: 1.3 } }, categoryFull(drawerSupplier.category)),
            h('div', { style: { fontSize: 11, color: '#7F8385', marginTop: 2, lineHeight: 1.4 } }, categoryDesc(drawerSupplier.category))
          ),
          h('div', { style: { flex: 1 } },
            h('div', { className: 'section-label' }, 'Annual spend'),
            h('div', { style: { fontSize: 16, fontWeight: 600, marginTop: 4 } }, fmt$(drawerSupplier.spend))
          )
        ),

        drawerSupplier.sole ? h(Alert, { type: 'error', message: 'Sole-Source Supplier - No Qualified Alternate', showIcon: true, style: { marginBottom: 12 } }) : null,

        h(Divider, { orientation: 'left', plain: true }, 'Alternate Status'),
        alternateTag(drawerSupplier.alternateStatus),

        drawerSupplier.activeEvents && drawerSupplier.activeEvents.length > 0 ? h('div', null,
          h(Divider, { orientation: 'left', plain: true }, 'Active Risk Events'),
          drawerSupplier.activeEvents.map(function(ev, i) {
            return h('div', { key: i, style: { background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 4, padding: '8px 10px', marginBottom: 6, fontSize: 12, color: '#2E2E38' } }, '', ev);
          })
        ) : h('div', null, h(Divider, { orientation: 'left', plain: true }, 'Active Risk Events'), h('div', { style: { color: '#8F8FA3', fontSize: 12 } }, 'No active events')),

        h(Divider, { orientation: 'left', plain: true }, 'Drug Products at Risk'),
        drawerSupplier.drugProducts && drawerSupplier.drugProducts.length > 0
          ? drawerSupplier.drugProducts.map(function(dpId) {
              var dp = (typeof MOCK_DRUG_PRODUCTS !== 'undefined' ? MOCK_DRUG_PRODUCTS : []).find(function(d) { return d.id === dpId; });
              if (!dp) return null;
              return h('div', { key: dpId, style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F5F5F5', fontSize: 13 } },
                h('div', null, h('div', { style: { fontWeight: 500 } }, dp.name), h('div', { style: { fontSize: 11, color: '#7F8385' } }, dp.therapyArea)),
                h('div', { style: { textAlign: 'right' } }, h('div', { style: { fontWeight: 600, color: '#C20A29' } }, fmt$(dp.revenue)), h('div', { style: { fontSize: 11, color: '#7F8385' } }, 'annual revenue'))
              );
            })
          : h('div', { style: { color: '#8F8FA3', fontSize: 12 } }, 'No drug product linkage'),

        drawerSupplier.hsCode ? h('div', null,
          h(Divider, { orientation: 'left', plain: true }, 'Tariff Exposure'),
          h('div', { style: { display: 'flex', gap: 16, fontSize: 13 } },
            h('div', null, h('div', { style: { color: '#8F8FA3', fontSize: 11 } }, 'HS code'), h('div', { style: { fontWeight: 600 } }, drawerSupplier.hsCode)),
            h('div', null, h('div', { style: { color: '#8F8FA3', fontSize: 11 } }, 'Tariff exposure'), h('div', { style: { fontWeight: 600, color: drawerSupplier.tariffExposure > 0.15 ? '#C20A29' : '#3F4547' } }, (drawerSupplier.tariffExposure * 100).toFixed(0) + '%'))
          )
        ) : null
      ) : null
    ),

    // Map drawer action modal
    h(Modal, {
      open: drawerActionOpen,
      onCancel: function() { setDrawerActionOpen(false); },
      title: drawerSupplier ? 'Take action - ' + drawerSupplier.name : '',
      onOk: function() { drawerForm.submit(); },
      okText: 'Log action',
    },
      drawerSupplier ? h(Form, { form: drawerForm, layout: 'vertical', onFinish: submitDrawerAction },
        h('div', { style: { background: '#F5F5F5', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12 } },
          h('div', null, h('b', null, 'Supplier: '), drawerSupplier.name, ' (', drawerSupplier.country, ')'),
          h('div', null, h('b', null, 'Current risk: '), drawerSupplier.riskScore, ' · ', h('b', null, 'Category: '), drawerSupplier.category)
        ),
        h(Form.Item, { label: 'Action taken', name: 'action', rules: [{ required: true, message: 'Select an action' }] },
          h(Select, {
            placeholder: 'Select an action...',
            options: [
              { label: 'Switch order to alternate supplier (-42 risk)', value: 'switch' },
              { label: 'Initiate alternate qualification project (-22)', value: 'alt_qual' },
              { label: 'Authorize safety stock build (-20)', value: 'safety_stock' },
              { label: 'Activate BCP - business continuity protocol (-18)', value: 'bcp' },
              { label: 'Request CAPA from supplier quality team (-16)', value: 'capa_request' },
              { label: 'Engage regulatory affairs for DMF review (-12)', value: 'regulatory' },
              { label: 'Escalate to CPO / procurement leadership (-10)', value: 'escalated' },
              { label: 'Monitor - no action required', value: 'monitor' },
            ]
          })
        ),
        h(Form.Item, { label: 'Rationale', name: 'rationale', rules: [{ required: true, message: 'Rationale is required for the audit trail' }] },
          h(Input.TextArea, { rows: 3, placeholder: 'Describe why this action was taken and what data informed the decision...' })
        )
      ) : null
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 2 - Daily Watchlist
// ════════════════════════════════════════════════════════════════════════════════
function WatchlistTab(props) {
  var items = props.watchlist;
  var setItems = props.setWatchlist;
  var _ef = useState(null); var expandedId = _ef[0]; var setExpandedId = _ef[1];
  var _af = useState('all'); var altFilter = _af[0]; var setAltFilter = _af[1];
  var _modal = useState(null); var actionModal = _modal[0]; var setActionModal = _modal[1];
  var _form = Form.useForm(); var form = _form[0];

  var filtered = useMemo(function() {
    if (altFilter === 'all') return items;
    return items.filter(function(c) { return c.alternateStatus === altFilter; });
  }, [items, altFilter]);

  var unreviewed = useMemo(function() { return items.filter(function(c) { return !c.reviewedAt; }).length; }, [items]);

  function markReviewed(card) {
    setItems(function(prev) {
      return prev.map(function(c) { return c.rank === card.rank ? Object.assign({}, c, { reviewedAt: new Date().toISOString() }) : c; });
    });
  }

  function openActionModal(card) {
    setActionModal(card);
    form.resetFields();
  }

  function submitAction(values) {
    var card = actionModal;
    var impact = actionImpact(values.action);
    var entry = {
      kind: 'watchlist_action',
      rank: card.rank,
      supplier: card.supplierName,
      drug: card.drugProductName,
      action: values.action,
      rationale: values.rationale,
      role: props.role || 'supply_chain_analyst',
      user: (props.user && props.user.userName) || 'demo_user',
    };
    postAction(entry).then(function(resp) {
      var target = webhookTargetForAction(values.action);
      if (target) {
        dispatchWebhook(target, { actionId: resp && resp.actionId, supplier: card.supplierName, action: values.action, rationale: values.rationale }).then(function() {
          message.success('Logged. ' + impact.note + ' - risk reduced by ' + impact.delta + '. Webhook queued to ' + target + '.');
        });
      } else {
        message.success('Logged. ' + impact.note + ' - risk reduced by ' + impact.delta + '.');
      }
      if (props.onActionLogged) props.onActionLogged();
    });
    // Drop the card's own risk score + mark reviewed + action-taken
    setItems(function(prev) {
      return prev.map(function(c) {
        if (c.rank !== card.rank) return c;
        var newScore = Math.max(10, (c.riskScore || 0) - impact.delta);
        return Object.assign({}, c, {
          riskScore: newScore,
          riskLevel: riskLevelFromScore(newScore),
          alternateStatus: impact.altStatus || c.alternateStatus,
          reviewedAt: new Date().toISOString(),
          actionTakenAt: new Date().toISOString(),
          lastAction: values.action,
        });
      });
    });
    // Mutate the matching supplier so the map bubble updates (color + pulse).
    applyActionToSupplier(props.setSuppliers, card.supplierId, values.action);
    setActionModal(null);
  }

  return h('div', { className: 'tab-pane' },
    h('div', { className: 'stats-row' },
      h(StatCard, { label: 'On Watchlist', value: items.length, color: 'primary' }),
      h(StatCard, { label: 'Unreviewed', value: unreviewed, color: 'danger' }),
      h(StatCard, { label: 'No Alternate', value: items.filter(function(c) { return c.alternateStatus === 'None'; }).length, color: 'warning', sub: 'Sole-source exposure' }),
      h(StatCard, { label: 'Revenue at Risk', value: fmt$(items.reduce(function(s, c) { return s + (c.revenueAtRisk || 0); }, 0)), color: 'danger' })
    ),

    h('div', { style: { display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' } },
      h(Select, {
        value: altFilter, onChange: setAltFilter, style: { width: 200 },
        options: [
          { label: 'All alternate statuses', value: 'all' },
          { label: 'No alternate', value: 'None' },
          { label: 'Alt: in qualification', value: 'In Qualification' },
          { label: 'Alternate qualified', value: 'Qualified' },
        ]
      }),
      h('div', { style: { marginLeft: 'auto', fontSize: 12, color: '#7F8385' } }, 'Showing ', filtered.length, ' of ', items.length, ' items')
    ),

    filtered.map(function(card) {
      var expanded = expandedId === card.rank;
      return h('div', { key: card.rank, className: 'watchlist-card' },
        h('div', { className: 'watchlist-card-header' },
          h('div', { className: 'rank-badge ' + card.riskLevel }, '#' + card.rank),
          h('div', { className: 'card-body' },
            h('div', { className: 'card-supplier-name' }, countryFlag(card.country), ' ', card.supplierName),
            h('div', { className: 'card-drug-name' }, card.drugProductName, ' · ', fmt$(card.revenueAtRisk), ' at risk'),
            h('div', { className: 'card-meta-row' },
              h(Tag, { color: card.riskScore >= 80 ? 'error' : card.riskScore >= 60 ? 'warning' : 'default', style: { fontWeight: 700 } }, 'Risk ' + card.riskScore),
              alternateTag(card.alternateStatus),
              h(Tag, { style: { fontSize: 11 } }, card.leadTimeDays + '-day lead time'),
              card.reviewedAt ? h(Tag, { color: 'success', style: { fontSize: 11 } }, 'Reviewed') : null
            ),
            h('div', { style: { marginTop: 8 } },
              card.riskDrivers.map(function(d) { return h(Tag, { key: d, color: 'purple', style: { fontSize: 10, marginBottom: 2 } }, d); })
            )
          ),
          h('div', { className: 'card-actions' },
            h('div', { className: 'risk-score ' + card.riskLevel, style: { fontSize: 22 } }, card.riskScore),
            h(Button, { size: 'small', onClick: function() { openActionModal(card); } }, 'Log action'),
            h(Button, { size: 'small', type: 'text', onClick: function() { setExpandedId(expanded ? null : card.rank); } }, expanded ? 'Hide details' : 'View details')
          )
        ),

        expanded ? h('div', null,
          h('div', { className: 'card-events' },
            h('div', { className: 'section-label' }, 'Source events'),
            card.sourceEvents.map(function(ev, i) { return h('div', { key: i, className: 'card-event-item' }, '• ', ev); })
          ),
          h('div', { style: { padding: '0 16px 8px' } },
            h('div', { className: 'section-label' }, 'Reasoning chain'),
            h('div', { className: 'reasoning-chain' },
              card.reasoningChain.map(function(step, i) {
                return h('div', { key: i, className: 'reasoning-step' },
                  h('div', { className: 'reasoning-step-num' }, i + 1),
                  h('div', null, step.replace(/^Step \d+: /, ''))
                );
              })
            ),
            h('div', { style: { fontSize: 11, color: '#8F8FA3', marginTop: 4 } }, 'Confidence: ', h('b', null, Math.round(card.confidence * 100) + '%'))
          ),
          h('div', { style: { padding: '0 0 0 0' } },
            h('div', { style: { fontSize: 11, fontWeight: 600, color: '#3B3BD3', padding: '0 16px 4px' } }, 'Mitigation suggestion'),
            h('div', { className: 'mitigation-box' }, card.mitigationSuggestion)
          )
        ) : null
      );
    }),

    // Action Modal
    h(Modal, {
      open: !!actionModal,
      onCancel: function() { setActionModal(null); },
      title: actionModal ? 'Log action - ' + actionModal.supplierName : '',
      onOk: function() { form.submit(); },
      okText: 'Save action',
    },
      actionModal ? h(Form, { form: form, layout: 'vertical', onFinish: submitAction },
        h('div', { style: { background: '#F5F5F5', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12 } },
          h('div', null, h('b', null, 'Supplier: '), actionModal.supplierName, ' (', actionModal.country, ')'),
          h('div', null, h('b', null, 'Drug: '), actionModal.drugProductName),
          h('div', null, h('b', null, 'Risk score: '), actionModal.riskScore, ' · ', h('b', null, 'Revenue at risk: '), fmt$(actionModal.revenueAtRisk))
        ),
        h(Form.Item, { label: 'Action taken', name: 'action', rules: [{ required: true, message: 'Select an action' }] },
          h(Select, {
            placeholder: 'Select an action...',
            options: [
              { label: 'Request CAPA from supplier quality team', value: 'capa_request' },
              { label: 'Initiate alternate qualification project', value: 'alt_qual' },
              { label: 'Authorize safety stock build', value: 'safety_stock' },
              { label: 'Escalate to CPO / procurement leadership', value: 'escalated' },
              { label: 'Engage regulatory affairs for DMF review', value: 'regulatory' },
              { label: 'Activate BCP - business continuity protocol', value: 'bcp' },
              { label: 'Switch order to alternate supplier', value: 'switch' },
              { label: 'Monitor - no action required', value: 'monitor' },
            ]
          })
        ),
        h(Form.Item, { label: 'Rationale', name: 'rationale', rules: [{ required: true, message: 'Rationale is required for the audit trail' }] },
          h(Input.TextArea, { rows: 3, placeholder: 'Describe why this action was taken and what data informed the decision...' })
        )
      ) : null
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 3 - Alert Detail
// ════════════════════════════════════════════════════════════════════════════════
function AlertsTab(props) {
  var alerts = props.alerts;
  var items = alerts;
  var setItems = props.setAlerts;
  var _tf = useState('All'); var typeFilter = _tf[0]; var setTypeFilter = _tf[1];
  var _sf = useState('All'); var sevFilter = _sf[0]; var setSevFilter = _sf[1];
  var _modal = useState(null); var actionModal = _modal[0]; var setActionModal = _modal[1];
  var _form = Form.useForm(); var form = _form[0];
  var _auditLog = useState([]); var auditLog = _auditLog[0]; var setAuditLog = _auditLog[1];
  function refreshAudit() {
    fetch('/api/actions').then(function(r) { return r.ok ? r.json() : { actions: [] }; })
      .then(function(d) { setAuditLog(d.actions || []); }).catch(function() {});
  }
  useEffect(function() { refreshAudit(); }, []);

  var filtered = useMemo(function() {
    return items.filter(function(a) {
      return (typeFilter === 'All' || a.type === typeFilter) &&
             (sevFilter === 'All' || a.severity === sevFilter) &&
             !a.dismissedAt;
    });
  }, [items, typeFilter, sevFilter]);

  var types = useMemo(function() {
    var t = {}; alerts.forEach(function(a) { t[a.type] = true; }); return Object.keys(t);
  }, [alerts]);

  function dismiss(id) {
    setItems(function(prev) { return prev.map(function(a) { return a.id === id ? Object.assign({}, a, { dismissedAt: new Date().toISOString() }) : a; }); });
    message.info('Alert dismissed');
  }

  function markReviewed(id) {
    setItems(function(prev) { return prev.map(function(a) { return a.id === id ? Object.assign({}, a, { reviewedAt: new Date().toISOString() }) : a; }); });
  }

  function submitAction(values) {
    var alert = actionModal;
    var impact = actionImpact(values.action);
    var entry = {
      kind: 'alert_action',
      alertId: alert.id,
      supplier: alert.supplierName,
      alertTitle: alert.title,
      action: values.action,
      rationale: values.rationale,
      role: props.role || 'supply_chain_analyst',
      user: (props.user && props.user.userName) || 'demo_user',
    };
    postAction(entry).then(function(resp) {
      var target = webhookTargetForAction(values.action);
      if (target) {
        dispatchWebhook(target, { actionId: resp && resp.actionId, supplier: alert.supplierName, alertTitle: alert.title, action: values.action }).then(function() {
          message.success('Logged. ' + impact.note + ' - risk reduced by ' + impact.delta + '. Webhook queued to ' + target + '.');
        });
      } else {
        message.success('Logged. ' + impact.note + ' - risk reduced by ' + impact.delta + '.');
      }
      refreshAudit();
      if (props.onActionLogged) props.onActionLogged();
    });
    // Mark alert as actioned (counts as reviewed) so badge and stats drop.
    setItems(function(prev) {
      return prev.map(function(a) {
        return a.id === alert.id ? Object.assign({}, a, { reviewedAt: new Date().toISOString(), actionTakenAt: new Date().toISOString(), lastAction: values.action }) : a;
      });
    });
    applyActionToSupplier(props.setSuppliers, alert.supplierId, values.action);
    setActionModal(null);
  }

  function typeClass(type) {
    var map = { Regulatory: 'alert-type-regulatory', Weather: 'alert-type-weather', Tariff: 'alert-type-tariff', Labor: 'alert-type-labor', Environmental: 'alert-type-environmental', Operational: 'alert-type-operational' };
    return map[type] || 'alert-type-operational';
  }

  return h('div', { className: 'tab-pane' },
    h('div', { className: 'alert-fatigue-header' },
      h('span', null, h('b', null, filtered.length + ' alerts today'), '. Calibrated to 3 to 7 high-signal events per user per day. Every alert is mapped to the affected ingredient and drug product, with source citations.')
    ),

    h('div', { className: 'stats-row' },
      h(StatCard, { label: 'Total Alerts', value: filtered.length, color: 'primary' }),
      h(StatCard, { label: 'Critical', value: filtered.filter(function(a) { return a.severity === 'critical'; }).length, color: 'danger' }),
      h(StatCard, { label: 'High', value: filtered.filter(function(a) { return a.severity === 'high'; }).length, color: 'warning' }),
      h(StatCard, { label: 'Reviewed', value: items.filter(function(a) { return a.reviewedAt; }).length, color: 'success' })
    ),

    h('div', { style: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' } },
      h(Select, {
        value: typeFilter, onChange: setTypeFilter, style: { width: 160 },
        options: ['All'].concat(types).map(function(t) { return { label: t === 'All' ? 'All Types' : t, value: t }; })
      }),
      h(Select, {
        value: sevFilter, onChange: setSevFilter, style: { width: 160 },
        options: [
          { label: 'All Severities', value: 'All' },
          { label: 'Critical', value: 'critical' },
          { label: 'High', value: 'high' },
          { label: 'Medium', value: 'medium' },
        ]
      }),
      h(Tooltip, { title: API_GAPS.bulkDismiss.message },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
          h(Button, { size: 'small', disabled: true }, 'Bulk Dismiss'),
          h(ApiPendingBadge)
        )
      )
    ),

    filtered.map(function(alert) {
      return h('div', { key: alert.id, className: 'alert-card' },
        h('div', { className: 'alert-card-header' },
          h('div', null,
            h('span', { className: 'alert-type-badge ' + typeClass(alert.type) }, alert.type),
            h('div', { style: { fontWeight: 600, fontSize: 14, color: '#3F4547', marginTop: 6 } }, alert.title),
            h('div', { style: { fontSize: 12, color: '#7F8385', marginTop: 2 } }, countryFlag(alert.supplierName.includes('India') || alert.supplierName.includes('Laurus') || alert.supplierName.includes('Aurobindo') || alert.supplierName.includes('Divi') || alert.supplierName.includes('Sun') ? 'India' : alert.supplierName.includes('Zhejiang') || alert.supplierName.includes('Hisun') || alert.supplierName.includes('Jiangsu') ? 'China' : alert.supplierName.includes('Lonza') ? 'Switzerland' : alert.supplierName.includes('Almac') ? 'UK' : ''), ' ', alert.supplierName, ' · ', alert.date)
          ),
          h('div', { style: { marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 } },
            h(Tag, { color: alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'default' }, alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)),
            alert.reviewedAt ? h(Tag, { color: 'success', style: { fontSize: 10 } }, 'Reviewed') : null
          )
        ),
        h('div', { className: 'alert-body' },
          h('div', { className: 'alert-description' }, alert.description),
          h('div', { className: 'alert-source' }, 'Source: ', alert.sourceLabel, alert.sourceUrl ? h('a', { href: '#', style: { marginLeft: 4, color: '#3B3BD3' }, onClick: function(e) { e.preventDefault(); message.info('Source: ' + alert.sourceLabel); } }, 'View source') : null),
          alert.drugImpact && alert.drugImpact.length > 0 ? h('div', { className: 'alert-drug-impact' },
            h('div', { className: 'section-label', style: { marginTop: 8 } }, 'Drug products affected'),
            alert.drugImpact.map(function(d, i) { return h('div', { key: i, style: { fontSize: 12, color: '#C20A29', fontWeight: 500 } }, '', d); })
          ) : null
        ),
        h('div', { className: 'alert-action-row' },
          h(Button, { size: 'small', onClick: function() { setActionModal(alert); form.resetFields(); } }, 'Log action'),
          h(Button, { size: 'small', type: 'text', onClick: function() { markReviewed(alert.id); } }, alert.reviewedAt ? 'Reviewed' : 'Mark reviewed'),
          h(Button, { size: 'small', type: 'text', danger: true, onClick: function() { dismiss(alert.id); } }, 'Dismiss'),
          h('div', { style: { marginLeft: 'auto', fontSize: 11, color: '#8F8FA3' } }, 'Confidence: ', h('b', null, Math.round((alert.confidence || 0.8) * 100) + '%'))
        )
      );
    }),

    auditLog.length > 0 ? h('div', { style: { marginTop: 24 } },
      h('div', { className: 'section-label', style: { marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 } },
        h('span', null, 'Audit log'),
        h(Tag, { color: 'purple', style: { fontSize: 10 } }, 'Governed audit Dataset'),
        h('span', { style: { fontSize: 11, color: '#8F8FA3', fontWeight: 400 } }, auditLog.length + ' entries, inspector-ready')
      ),
      h('div', { className: 'audit-log' },
        auditLog.slice().reverse().slice(0, 20).map(function(entry, i) {
          return h('div', { key: i, className: 'audit-log-entry' },
            h('span', { style: { color: '#6A8FA8' } }, entry.timestamp ? entry.timestamp.slice(0, 19).replace('T', ' ') : ''),
            ' · ',
            h('span', { style: { color: '#A8E6CF' } }, entry.supplier || '-'),
            ' · ',
            h('span', { style: { color: '#C0C0D8' } }, entry.role || 'supply_chain_analyst'),
            ' · ',
            h('span', null, entry.rationale || entry.action || '')
          );
        })
      )
    ) : null,

    h(Modal, {
      open: !!actionModal,
      onCancel: function() { setActionModal(null); },
      title: actionModal ? 'Log action - ' + (actionModal.title || '') : '',
      onOk: function() { form.submit(); },
      okText: 'Save action',
    },
      actionModal ? h(Form, { form: form, layout: 'vertical', onFinish: submitAction },
        h('div', { style: { background: '#F5F5F5', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12 } },
          h('div', null, h('b', null, 'Alert: '), actionModal.title),
          h('div', null, h('b', null, 'Supplier: '), actionModal.supplierName)
        ),
        h(Form.Item, { label: 'Action taken', name: 'action', rules: [{ required: true, message: 'Select an action' }] },
          h(Select, { placeholder: 'Select an action...', options: [
            { label: 'Request CAPA from supplier', value: 'capa' },
            { label: 'Initiate alternate qualification', value: 'alt_qual' },
            { label: 'Authorize safety stock build', value: 'safety_stock' },
            { label: 'Escalate to leadership', value: 'escalated' },
            { label: 'Monitor - no action required', value: 'monitor' },
          ]})
        ),
        h(Form.Item, { label: 'Rationale', name: 'rationale', rules: [{ required: true, message: 'Rationale is required for the audit trail' }] },
          h(Input.TextArea, { rows: 3, placeholder: 'Describe why this action was taken and what data informed the decision...' })
        )
      ) : null
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 4 - Tariff Modeler
// ════════════════════════════════════════════════════════════════════════════════
function TariffTab(props) {
  var scenarios = props.scenarios;
  var _sc = useState(scenarios[0] ? scenarios[0].id : 'baseline'); var scenarioId = _sc[0]; var setScenarioId = _sc[1];

  var scenario = useMemo(function() {
    return scenarios.find(function(s) { return s.id === scenarioId; }) || scenarios[0];
  }, [scenarios, scenarioId]);

  var maxExposure = useMemo(function() {
    if (!scenario || !scenario.byDrugProduct) return 1;
    return Math.max.apply(null, scenario.byDrugProduct.map(function(d) { return d.exposure || 0; })) || 1;
  }, [scenario]);

  if (!scenario) return h('div', { className: 'tab-pane' }, h(Spin, null));

  var supplierColumns = [
    { title: 'Supplier', dataIndex: 'supplierName', key: 'name', sorter: function(a, b) { return a.supplierName.localeCompare(b.supplierName); } },
    { title: 'Country', dataIndex: 'country', key: 'country', width: 100, filters: [{ text: 'China', value: 'China' }, { text: 'India', value: 'India' }], onFilter: function(v, r) { return r.country === v; } },
    { title: 'HS Code', dataIndex: 'hsCode', key: 'hs', width: 100 },
    { title: 'Annual Spend', dataIndex: 'annualSpend', key: 'spend', width: 130, sorter: function(a, b) { return a.annualSpend - b.annualSpend; }, render: function(v) { return fmt$(v); } },
    { title: 'Current Rate', dataIndex: 'currentRate', key: 'curr', width: 110, render: function(v) { return (v * 100).toFixed(0) + '%'; } },
    { title: 'Scenario rate', dataIndex: 'scenarioRate', key: 'scen', width: 120, render: function(v) { return h('span', { style: { fontWeight: 600, color: v > 0 ? '#C20A29' : '#3F4547' } }, (v * 100).toFixed(0) + '%'); } },
    { title: 'COGS delta', dataIndex: 'delta', key: 'delta', width: 130, sorter: function(a, b) { return a.delta - b.delta; }, render: function(v) { return h('span', { style: { fontWeight: 700, color: v > 0 ? '#C20A29' : '#28A464' } }, v > 0 ? '+' + fmt$(v) : fmt$(v)); } },
  ];

  return h('div', { className: 'tab-pane' },
    h('div', { className: 'scenario-selector' },
      h('div', { className: 'section-label', style: { marginBottom: 8 } }, 'Select tariff scenario'),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        scenarios.map(function(s) {
          return h('button', {
            key: s.id,
            className: 'scenario-btn' + (scenarioId === s.id ? ' active' : ''),
            onClick: function() { setScenarioId(s.id); },
          }, s.scenarioName);
        })
      ),
      h('div', { style: { marginTop: 10, fontSize: 12, color: '#7F8385' } }, scenario.description)
    ),

    h('div', { className: 'stats-row' },
      h(StatCard, { label: 'Total Tariff Exposure', value: scenario.totalExposure > 0 ? '+' + fmt$(scenario.totalExposure) + '/yr' : '$0', color: scenario.totalExposure > 0 ? 'danger' : 'success', sub: 'Annual incremental COGS' }),
      h(StatCard, { label: 'Blended COGS Delta', value: scenario.cogsDeltaPct > 0 ? '+' + scenario.cogsDeltaPct.toFixed(1) + '%' : '0%', color: scenario.cogsDeltaPct > 1 ? 'danger' : scenario.cogsDeltaPct > 0 ? 'warning' : 'success' }),
      h(StatCard, { label: 'Suppliers Affected', value: scenario.bySupplier ? scenario.bySupplier.filter(function(s) { return s.delta > 0; }).length : 0, color: 'primary' }),
      h(StatCard, { label: 'Products Impacted', value: scenario.byDrugProduct ? scenario.byDrugProduct.filter(function(d) { return d.exposure > 0; }).length : 0, color: 'warning' })
    ),

    scenario.byDrugProduct && scenario.byDrugProduct.length > 0 ? h('div', { className: 'panel', style: { marginBottom: 16 } },
      h('div', { className: 'panel-header' }, h('span', { className: 'panel-title' }, 'Exposure by Drug Product')),
      h('div', { style: { padding: '14px 16px' } },
        scenario.byDrugProduct.filter(function(d) { return d.exposure >= 0; }).sort(function(a, b) { return b.exposure - a.exposure; }).map(function(dp) {
          return h('div', { key: dp.productId, style: { marginBottom: 12 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 } },
              h('span', { style: { fontWeight: 500, color: '#3F4547' } }, dp.productName),
              h('span', { style: { fontWeight: 700, color: dp.exposure > 0 ? '#C20A29' : '#28A464' } }, dp.exposure > 0 ? '+' + fmt$(dp.exposure) + '/yr' : '$0')
            ),
            h('div', { className: 'exposure-bar' },
              h('div', { className: 'exposure-bar-fill', style: { width: (dp.exposure / maxExposure * 100) + '%', background: dp.exposure > 5000000 ? '#C20A29' : dp.exposure > 1000000 ? '#E06600' : '#543FDE' } })
            ),
            dp.cogsDelta > 0 ? h('div', { style: { fontSize: 11, color: '#8F8FA3', marginTop: 2 } }, 'COGS impact: +' + dp.cogsDelta.toFixed(2) + '%') : null
          );
        })
      )
    ) : null,

    h('div', { className: 'panel' },
      h('div', { className: 'panel-header' },
        h('span', { className: 'panel-title' }, 'Supplier Tariff Detail'),
        h(Tooltip, { title: API_GAPS.exportTariff.message },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
            h(Button, { size: 'small', disabled: true }, 'Export to Anaplan'),
            h(ApiPendingBadge)
          )
        )
      ),
      scenario.bySupplier && scenario.bySupplier.length > 0
        ? h(Table, { dataSource: scenario.bySupplier, columns: supplierColumns, rowKey: 'supplierId', size: 'small', pagination: false })
        : h('div', { style: { padding: '20px 16px', color: '#8F8FA3', fontSize: 13 } }, 'No tariff exposure under this scenario.')
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 5 - Executive Brief
// ════════════════════════════════════════════════════════════════════════════════
function ExecBriefTab(props) {
  var brief = props.brief;
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];
  var _brief = useState(brief); var currentBrief = _brief[0]; var setCurrentBrief = _brief[1];

  useEffect(function() { setCurrentBrief(brief); }, [brief]);

  function regenerate() {
    setLoading(true);
    setTimeout(function() { setLoading(false); setCurrentBrief(brief); message.success('Executive brief regenerated'); }, 2200);
  }

  if (!currentBrief) return h('div', { className: 'tab-pane' }, h(Spin, null));

  return h('div', { className: 'tab-pane' },
    h('div', { style: { display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' } },
      h(Button, { type: 'primary', onClick: regenerate, loading: loading }, 'Regenerate brief'),
      h(Tooltip, { title: API_GAPS.distributeBrief.message },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
          h(Button, { disabled: true }, 'Approve and distribute'),
          h(ApiPendingBadge)
        )
      ),
      h('div', { style: { marginLeft: 'auto', fontSize: 12, color: '#8F8FA3' } },
        'Auto-generated ', dayjs(currentBrief.generatedAt).fromNow(), ' · Week ending ', currentBrief.weekEnding
      )
    ),

    loading ? h('div', { style: { textAlign: 'center', padding: 60 } }, h(Spin, { size: 'large', tip: 'Drafting executive brief from 10 risk sources and BOM data...' })) :

    h('div', { className: 'brief-doc' },
      h('div', { className: 'brief-header' },
        h('div', { className: 'brief-title' }, 'Supplier Risk Radar - Weekly Executive Brief'),
        h('div', { className: 'brief-meta' }, 'Auto-generated by Supply Risk Radar · Week ending ', currentBrief.weekEnding, ' · Confidential - Internal Distribution Only')
      ),

      h('div', { className: 'brief-section' },
        h('div', { className: 'brief-section-title' }, 'Week summary'),
        h('div', { style: { fontSize: 14, color: '#3F4547', lineHeight: 1.6 } }, currentBrief.weekSummary)
      ),

      h('div', { className: 'brief-section' },
        h('div', { className: 'brief-section-title' }, 'Top 5 risks this week'),
        currentBrief.top5Risks.map(function(risk) {
          return h('div', { key: risk.rank, className: 'brief-risk-item' },
            h('div', { className: 'brief-risk-rank', style: { background: risk.rank <= 2 ? '#C20A29' : risk.rank <= 4 ? '#E06600' : '#CCB718' } }, risk.rank),
            h('div', { style: { flex: 1 } },
              h('div', { style: { fontWeight: 600, fontSize: 13, color: '#3F4547' } }, risk.headline),
              h('div', { style: { fontSize: 12, color: '#7F8385', marginTop: 2 } }, risk.impact),
              h(Tag, { color: risk.urgency.startsWith('Act') ? 'error' : 'warning', style: { fontSize: 10, marginTop: 4 } }, risk.urgency)
            )
          );
        })
      ),

      h('div', { className: 'brief-section' },
        h('div', { className: 'brief-section-title' }, 'Actions required'),
        currentBrief.actionsRequired.map(function(action, i) {
          return h('div', { key: i, className: 'brief-action-item' },
            h('span', { className: 'brief-action-priority ' + action.priority }, action.priority),
            h('div', { style: { flex: 1 } },
              h('div', { style: { fontWeight: 500, color: '#3F4547' } }, action.action),
              h('div', { style: { fontSize: 12, color: '#8F8FA3', marginTop: 2 } }, 'Owner: ', action.owner, ' · Due: ', action.dueDate)
            )
          );
        })
      ),

      h('div', { className: 'brief-section' },
        h('div', { className: 'brief-section-title' }, 'Tariff exposure summary'),
        h('div', { style: { fontSize: 13, color: '#3F4547', lineHeight: 1.6 } }, currentBrief.tariffExposureSummary)
      ),

      h('div', { className: 'brief-section' },
        h('div', { className: 'brief-section-title' }, 'Trend analysis'),
        h('div', { style: { fontSize: 13, color: '#3F4547', lineHeight: 1.6 } }, currentBrief.trendAnalysis)
      ),

      h('div', { style: { marginTop: 24, padding: '12px 0', borderTop: '1px solid #DBE4E8', fontSize: 11, color: '#8F8FA3' } },
        'This brief was auto-generated by Supply Risk Radar using AI-assisted synthesis of public risk signals and internal BOM/AVL data. All assertions are source-cited. Procurement leads should review before distribution. Not for trading-desk use.'
      )
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 6 - Feedback and Models (Phase 3)
// ════════════════════════════════════════════════════════════════════════════════
function FeedbackModelsTab(props) {
  var _s = useState(null); var status = _s[0]; var setStatus = _s[1];
  var _a = useState([]); var actions = _a[0]; var setActions = _a[1];
  var _w = useState([]); var webhooks = _w[0]; var setWebhooks = _w[1];

  function refresh() {
    fetch('/api/retraining/status').then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) { if (d) setStatus(d); }).catch(function() {});
    fetch('/api/actions').then(function(r) { return r.ok ? r.json() : { actions: [] }; })
      .then(function(d) { setActions(d.actions || []); }).catch(function() {});
    fetch('/api/webhooks').then(function(r) { return r.ok ? r.json() : { deliveries: [] }; })
      .then(function(d) { setWebhooks(d.deliveries || []); }).catch(function() {});
  }
  useEffect(function() { refresh(); }, [props.refreshTick]);

  if (!status) return h('div', { className: 'tab-pane' }, h(Spin, { size: 'large' }));

  function triggerRetrain() {
    fetch('/api/retraining/trigger', { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        message.warning((d && d.message) || API_GAPS.triggerRetrain.message);
        refresh();
      });
  }

  return h('div', { className: 'tab-pane' },
    h('div', { className: 'alert-fatigue-header' },
      h('span', null, h('b', null, 'Closed-loop feedback. '), 'User actions land in a governed audit Dataset. A weekly Domino Job retrains the risk-fusion scorer on labeled feedback and drifts the challenger against the champion. Outbound webhooks push approved actions to CAPA, Teams, and Anaplan.')
    ),

    h('div', { className: 'stats-row' },
      h(StatCard, { label: 'Feedback samples', value: status.feedback.totalSamples, color: 'primary', sub: 'Since last retrain: ' + status.feedback.newSinceLastRun }),
      h(StatCard, { label: 'True positive rate', value: (status.feedback.truePositiveRate * 100).toFixed(0) + '%', color: 'success', sub: 'False positive ' + (status.feedback.falsePositiveRate * 100).toFixed(0) + '%' }),
      h(StatCard, { label: 'Preference pairs', value: status.feedback.preferencePairs, color: 'info', sub: 'For LLM RLHF tuning' }),
      h(StatCard, { label: 'Signal drift (PSI)', value: status.drift.signalDistributionPsi.toFixed(2), color: status.drift.status === 'within-tolerance' ? 'success' : 'danger', sub: status.drift.status.replace(/-/g, ' ') })
    ),

    h('div', { className: 'panel', style: { marginBottom: 16 } },
      h('div', { className: 'panel-header' },
        h('span', { className: 'panel-title' }, 'Risk fusion scorer - champion vs challenger'),
        h(Tag, { color: 'blue' }, status.cadence)
      ),
      h('div', { style: { padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
        h('div', { style: { border: '1px solid #E0E0E0', borderRadius: 6, padding: 12, background: '#FAFAFA' } },
          h('div', { style: { fontSize: 11, color: '#65657B', fontWeight: 600, marginBottom: 4 } }, 'CHAMPION (in production)'),
          h('div', { style: { fontSize: 15, fontWeight: 600, color: '#3F4547' } }, status.champion.modelName + ' ' + status.champion.version),
          h('div', { style: { fontSize: 12, color: '#7F8385', marginBottom: 8 } }, status.champion.registryUri),
          h('div', { style: { fontSize: 12, color: '#3F4547' } },
            'AUC ', h('b', null, status.champion.metrics.aucRoc), ' · P@10 ', h('b', null, status.champion.metrics.precisionAt10), ' · Brier ', h('b', null, status.champion.metrics.brierScore)
          ),
          h('div', { style: { fontSize: 11, color: '#8F8FA3', marginTop: 6 } }, 'Registered ', dayjs(status.champion.registeredAt).format('MMM D, YYYY'))
        ),
        h('div', { style: { border: '1px solid #C9C5F2', borderRadius: 6, padding: 12, background: '#F5F3FD' } },
          h('div', { style: { fontSize: 11, color: '#1820A0', fontWeight: 600, marginBottom: 4 } }, 'CHALLENGER (awaiting promotion)'),
          h('div', { style: { fontSize: 15, fontWeight: 600, color: '#3F4547' } }, status.challenger.modelName + ' ' + status.challenger.version),
          h('div', { style: { fontSize: 12, color: '#7F8385', marginBottom: 8 } }, status.challenger.status),
          h('div', { style: { fontSize: 12, color: '#3F4547' } },
            'AUC ', h('b', null, status.challenger.metrics.aucRoc), ' · P@10 ', h('b', null, status.challenger.metrics.precisionAt10), ' · Brier ', h('b', null, status.challenger.metrics.brierScore)
          ),
          h('div', { style: { fontSize: 11, color: '#28A464', fontWeight: 600, marginTop: 6 } }, status.challenger.delta)
        )
      ),
      h('div', { style: { display: 'flex', gap: 10, padding: '0 16px 14px', alignItems: 'center', flexWrap: 'wrap' } },
        h('div', { style: { fontSize: 12, color: '#65657B' } },
          'Last retrained ', h('b', null, dayjs(status.lastRetrainedAt).format('MMM D')), ' · Next ', h('b', null, dayjs(status.nextScheduledAt).format('MMM D'))
        ),
        h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' } },
          h(Tooltip, { title: API_GAPS.triggerRetrain.message },
            h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
              h(Button, { size: 'small', onClick: triggerRetrain }, 'Trigger retrain now'),
              h(ApiPendingBadge)
            )
          ),
          h(Tooltip, { title: API_GAPS.promoteChallenger.message },
            h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
              h(Button, { size: 'small', disabled: true }, 'Promote challenger'),
              h(ApiPendingBadge)
            )
          )
        )
      )
    ),

    h('div', { className: 'panel', style: { marginBottom: 16 } },
      h('div', { className: 'panel-header' },
        h('span', { className: 'panel-title' }, 'LLM mitigation writer - preference tuning'),
        h(Tag, { color: 'blue' }, 'RLHF')
      ),
      h('div', { style: { padding: '14px 16px', fontSize: 13, color: '#3F4547', lineHeight: 1.6 } },
        h('b', null, status.llmReasoner.modelName + ' ' + status.llmReasoner.version),
        '. ',
        h('b', null, status.llmReasoner.preferencePairsSinceLastTune),
        ' preference pairs collected since last tune (user edits and rejections of mitigation suggestions). Next tuning run scheduled for ',
        h('b', null, dayjs(status.llmReasoner.nextTuneScheduled).format('MMM D, YYYY')),
        '.'
      )
    ),

    h('div', { className: 'panel', style: { marginBottom: 16 } },
      h('div', { className: 'panel-header' },
        h('span', { className: 'panel-title' }, 'Outbound webhook deliveries'),
        h(Tag, { color: 'orange' }, webhooks.length + ' total')
      ),
      webhooks.length === 0
        ? h('div', { style: { padding: '20px 16px', color: '#8F8FA3', fontSize: 13 } }, 'No webhook deliveries yet. Log an action in Watchlist or Alerts to trigger one.')
        : h(Table, {
            dataSource: webhooks.slice().reverse().slice(0, 25),
            rowKey: function(r, i) { return r.timestamp + '-' + i; },
            size: 'small',
            pagination: false,
            columns: [
              { title: 'Timestamp', dataIndex: 'timestamp', key: 't', width: 170, render: function(v) { return v ? dayjs(v).format('MMM D HH:mm:ss') : '-'; } },
              { title: 'Target', dataIndex: 'system', key: 's', width: 180 },
              { title: 'Status', dataIndex: 'status', key: 'st', width: 140, render: function(v) { return v === 'api_pending' ? h(Tag, { color: 'orange' }, 'API pending') : h(Tag, { color: 'success' }, v); } },
              { title: 'Supplier', dataIndex: ['payload', 'supplier'], key: 'sup', render: function(_, r) { return (r.payload && r.payload.supplier) || '-'; } },
              { title: 'Action', dataIndex: ['payload', 'action'], key: 'a', render: function(_, r) { return (r.payload && r.payload.action) || '-'; } },
            ],
          })
    ),

    h('div', { className: 'panel' },
      h('div', { className: 'panel-header' },
        h('span', { className: 'panel-title' }, 'Governed audit Dataset - recent actions'),
        h(Tag, { color: 'purple' }, actions.length + ' entries')
      ),
      actions.length === 0
        ? h('div', { style: { padding: '20px 16px', color: '#8F8FA3', fontSize: 13 } }, 'No actions logged yet.')
        : h(Table, {
            dataSource: actions.slice().reverse().slice(0, 25),
            rowKey: 'actionId',
            size: 'small',
            pagination: false,
            columns: [
              { title: 'Timestamp', dataIndex: 'timestamp', key: 't', width: 170, render: function(v) { return v ? dayjs(v).format('MMM D HH:mm:ss') : '-'; } },
              { title: 'User', dataIndex: 'user', key: 'u', width: 130 },
              { title: 'Role', dataIndex: 'role', key: 'r', width: 170, render: function(v) { return v ? v.replace(/_/g, ' ') : '-'; } },
              { title: 'Kind', dataIndex: 'kind', key: 'k', width: 140 },
              { title: 'Supplier', dataIndex: 'supplier', key: 'sup' },
              { title: 'Action', dataIndex: 'action', key: 'a', width: 160 },
              { title: 'Rationale', dataIndex: 'rationale', key: 'ra', ellipsis: true },
            ],
          })
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// DEBUG PANEL
// ════════════════════════════════════════════════════════════════════════════════
function DebugPanel(props) {
  var appState = props.appState;
  var _open = useState(false); var open = _open[0]; var setOpen = _open[1];
  var _tab = useState('logs'); var tab = _tab[0]; var setTab = _tab[1];
  var _tick = useState(0); var setTick = _tick[1];
  var _logs = useState([]); var logs = _logs[0]; var setLogs = _logs[1];
  var _net = useState([]); var netReqs = _net[0]; var setNetReqs = _net[1];
  var logEndRef = useRef(null);

  // Subscribe to debug updates
  useEffect(function() {
    var unsub = __debug.subscribe(function() {
      setLogs(__debug.getLogs());
      setNetReqs(__debug.getNetReqs());
      setTick(function(t) { return t + 1; });
    });
    setLogs(__debug.getLogs());
    setNetReqs(__debug.getNetReqs());
    return unsub;
  }, []);

  // Ctrl+Shift+D toggles panel
  useEffect(function() {
    function onKey(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') { e.preventDefault(); setOpen(function(o) { return !o; }); }
    }
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  // Auto-scroll logs
  useEffect(function() {
    if (open && tab === 'logs' && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, open, tab]);

  var globals = __debug.getGlobals();
  var _aud = useState([]); var auditLog = _aud[0]; var setAuditLog = _aud[1];
  useEffect(function() {
    if (!open) return;
    fetch('/api/actions').then(function(r) { return r.ok ? r.json() : { actions: [] }; })
      .then(function(d) { setAuditLog(d.actions || []); }).catch(function() {});
  }, [open, tab]);

  var logColor = { log: '#A8C4E0', info: '#80D4B0', warn: '#FFD080', error: '#FF8080' };

  var panelStyle = {
    position: 'fixed', bottom: 0, right: 0, width: open ? 620 : 'auto',
    height: open ? 400 : 'auto', zIndex: 9999,
    background: open ? '#1A1A2E' : 'transparent',
    border: open ? '1px solid #3A3A5A' : 'none',
    borderRadius: open ? '8px 0 0 0' : 0,
    boxShadow: open ? '0 -4px 24px rgba(0,0,0,0.4)' : 'none',
    fontFamily: "'Courier New', monospace",
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  };

  var triggerStyle = {
    position: 'fixed', bottom: 8, right: 8, zIndex: 9999,
    background: '#1A1A2E', border: '1px solid #3B3BD3', borderRadius: 6,
    padding: '4px 10px', fontSize: 11, color: '#7A7AEE', cursor: 'pointer',
    fontFamily: "'Courier New', monospace", userSelect: 'none',
    boxShadow: '0 2px 8px rgba(59,59,211,0.3)',
  };

  if (!open) {
    return h('div', { style: triggerStyle, onClick: function() { setOpen(true); }, title: 'Open Debug Panel (Ctrl+Shift+D)' },
      'DBG ' + (logs.filter(function(l){return l.level==='error';}).length > 0 ? '' + logs.filter(function(l){return l.level==='error';}).length : 'ok')
    );
  }

  var tabBtnStyle = function(t) { return {
    padding: '4px 12px', fontSize: 11, cursor: 'pointer', border: 'none',
    background: tab === t ? '#3B3BD3' : 'transparent',
    color: tab === t ? '#fff' : '#8080A0',
    borderRadius: 4, fontFamily: "'Courier New', monospace",
  }; };

  return h('div', { style: panelStyle },
    // Header bar
    h('div', { style: { background: '#0D0D1A', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #2A2A4A', flexShrink: 0 } },
      h('span', { style: { color: '#7A7AEE', fontWeight: 700, fontSize: 12 } }, 'Supply Risk Radar Debug'),
      h('span', { style: { fontSize: 10, color: '#4A4A6A', marginLeft: 4 } }, 'Ctrl+Shift+D'),
      h('button', { style: tabBtnStyle('globals'), onClick: function() { setTab('globals'); } }, 'Globals'),
      h('button', { style: tabBtnStyle('logs'), onClick: function() { setTab('logs'); } }, 'Console (' + logs.length + ')'),
      h('button', { style: tabBtnStyle('network'), onClick: function() { setTab('network'); } }, 'Network (' + netReqs.length + ')'),
      h('button', { style: tabBtnStyle('state'), onClick: function() { setTab('state'); } }, 'App State'),
      h('button', { style: tabBtnStyle('audit'), onClick: function() { setTab('audit'); } }, 'Audit (' + auditLog.length + ')'),
      h('div', { style: { flex: 1 } }),
      logs.filter(function(l){return l.level==='error';}).length > 0
        ? h('span', { style: { fontSize: 10, color: '#FF8080', marginRight: 8 } }, '' + logs.filter(function(l){return l.level==='error';}).length + ' errors')
        : h('span', { style: { fontSize: 10, color: '#80D4B0', marginRight: 8 } }, 'no errors'),
      h('button', { style: { background: 'transparent', border: 'none', color: '#8080A0', cursor: 'pointer', fontSize: 14, padding: '0 4px' }, onClick: function() { setOpen(false); } }, 'x')
    ),

    // Content
    h('div', { style: { flex: 1, overflow: 'auto', padding: 8 } },

      // GLOBALS TAB
      tab === 'globals' ? h('div', null,
        h('div', { style: { color: '#4A6A8A', fontSize: 10, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 } }, 'Library & Mock Data Status'),
        globals.map(function(g) {
          return h('div', { key: g.name, style: { display: 'flex', gap: 8, padding: '3px 0', borderBottom: '1px solid #1E1E3A', fontSize: 11 } },
            h('span', { style: { color: g.ok ? '#80D4B0' : '#FF8080', width: 16 } }, g.ok ? 'ok' : 'x'),
            h('span', { style: { color: '#A0A0C0', width: 200 } }, g.name),
            h('span', { style: { color: g.ok ? '#C0D4E0' : '#FF6060' } }, g.val)
          );
        }),
        h('div', { style: { marginTop: 12, color: '#4A6A8A', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 } }, 'Environment'),
        h('div', { style: { fontSize: 11, color: '#A0A0C0', marginTop: 4, lineHeight: 1.7 } },
          h('div', null, 'User Agent: ' + navigator.userAgent.slice(0, 80)),
          h('div', null, 'Origin: ' + window.location.origin),
          h('div', null, 'Page load: ' + (window.performance ? Math.round(window.performance.now()) + 'ms' : 'n/a')),
          h('div', null, 'localStorage entries: ' + localStorage.length),
          h('div', null, 'antd UMD binding: ' + (typeof antd !== 'undefined' ? 'OK (dynamic load)' : 'FAILED'))
        )
      ) : null,

      // LOGS TAB
      tab === 'logs' ? h('div', null,
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 6 } },
          h('button', { style: { background: '#2A1A1A', border: '1px solid #4A2A2A', color: '#FF8080', borderRadius: 3, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }, onClick: function() { __debug.clearLogs(); } }, 'Clear'),
          h('span', { style: { fontSize: 10, color: '#4A4A6A', alignSelf: 'center' } }, logs.length + ' entries · scroll to bottom for latest')
        ),
        logs.length === 0
          ? h('div', { style: { color: '#4A4A6A', fontSize: 11, padding: 8 } }, 'No console output yet.')
          : logs.map(function(entry, i) {
            return h('div', { key: i, style: { display: 'flex', gap: 6, padding: '2px 0', borderBottom: '1px solid #1A1A2E', fontSize: 11, lineHeight: 1.4 } },
              h('span', { style: { color: '#4A4A6A', flexShrink: 0, width: 82 } }, entry.ts),
              h('span', { style: { color: logColor[entry.level] || '#A0A0C0', flexShrink: 0, width: 36, textTransform: 'uppercase', fontSize: 10, paddingTop: 1 } }, entry.level),
              h('span', { style: { color: '#C0C0D8', wordBreak: 'break-all' } }, entry.msg)
            );
          }),
        h('div', { ref: logEndRef })
      ) : null,

      // NETWORK TAB
      tab === 'network' ? h('div', null,
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 6 } },
          h('button', { style: { background: '#1A2A1A', border: '1px solid #2A4A2A', color: '#80D4B0', borderRadius: 3, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }, onClick: function() { __debug.clearNet(); } }, 'Clear'),
          h('span', { style: { fontSize: 10, color: '#4A4A6A', alignSelf: 'center' } }, netReqs.length + ' requests')
        ),
        netReqs.length === 0
          ? h('div', { style: { color: '#4A4A6A', fontSize: 11, padding: 8 } }, 'No fetch calls yet.')
          : netReqs.slice().reverse().map(function(r, i) {
            var ok = typeof r.status === 'number' && r.status < 400;
            return h('div', { key: i, style: { display: 'flex', gap: 6, padding: '3px 0', borderBottom: '1px solid #1A1A2E', fontSize: 11, alignItems: 'flex-start' } },
              h('span', { style: { color: '#4A4A6A', flexShrink: 0, width: 82 } }, r.ts),
              h('span', { style: { color: '#A0A0FF', flexShrink: 0, width: 36 } }, r.method),
              h('span', { style: { color: r.status === '…' ? '#808080' : ok ? '#80D4B0' : '#FF8080', flexShrink: 0, width: 32 } }, String(r.status)),
              h('span', { style: { color: '#C0C0D8', flex: 1, wordBreak: 'break-all' } }, r.url),
              r.duration != null ? h('span', { style: { color: '#4A6A8A', flexShrink: 0 } }, r.duration + 'ms') : null
            );
          })
      ) : null,

      // APP STATE TAB
      tab === 'state' ? h('div', null,
        h('div', { style: { color: '#4A6A8A', fontSize: 10, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 } }, 'Live App State'),
        [
          ['Mode',          appState.useDummy ? 'Dummy Data' : 'Live Data'],
          ['Connected',     appState.connected ? 'Yes' : 'No'],
          ['Loading',       appState.loading ? '...' : 'done'],
          ['Active Tab',    appState.activeTab],
          ['Suppliers',     appState.supplierCount + ' loaded'],
          ['Watchlist',     appState.watchlistCount + ' cards'],
          ['Alerts',        appState.alertCount + ' alerts'],
          ['Tariff Scenarios', appState.scenarioCount + ' scenarios'],
          ['Exec Brief',    appState.hasBrief ? 'loaded' : 'not loaded'],
          ['Audit Log',     appState.auditCount + ' entries (governed Dataset)'],
          ['Role (view-as)', appState.role || 'supply_chain_analyst'],
        ].map(function(row) {
          return h('div', { key: row[0], style: { display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #1E1E3A', fontSize: 11 } },
            h('span', { style: { color: '#6A6A8A', width: 160 } }, row[0]),
            h('span', { style: { color: '#C0D4E0' } }, row[1])
          );
        }),
        h('div', { style: { marginTop: 12 } },
          h('button', { style: { background: '#1A1A3A', border: '1px solid #3A3A6A', color: '#A0A0D0', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }, onClick: function() { window.location.reload(); } }, 'Hard Reload'),
          h('button', { style: { background: '#2A1A1A', border: '1px solid #5A2A2A', color: '#D08080', borderRadius: 3, padding: '4px 10px', fontSize: 11, cursor: 'pointer', marginLeft: 8 }, onClick: function() { localStorage.clear(); window.location.reload(); } }, 'Clear Storage + Reload')
        )
      ) : null,

      // AUDIT LOG TAB
      tab === 'audit' ? h('div', null,
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 6 } },
          h('span', { style: { fontSize: 10, color: '#4A4A6A', alignSelf: 'center' } }, auditLog.length + ' actions logged (governed Dataset)')
        ),
        auditLog.length === 0
          ? h('div', { style: { color: '#4A4A6A', fontSize: 11, padding: 8 } }, 'No audit actions yet. Take an action on a watchlist card or alert.')
          : auditLog.slice().reverse().map(function(entry, i) {
            return h('div', { key: i, style: { padding: '6px 0', borderBottom: '1px solid #1E1E3A', fontSize: 11 } },
              h('div', { style: { display: 'flex', gap: 8 } },
                h('span', { style: { color: '#4A4A6A' } }, entry.timestamp ? entry.timestamp.slice(0,19).replace('T',' ') : ''),
                h('span', { style: { color: '#7A7AEE' } }, entry.type)
              ),
              h('div', { style: { color: '#A8C4E0', marginTop: 2 } }, entry.supplier + (entry.alertTitle ? ' · ' + entry.alertTitle : '')),
              h('div', { style: { color: '#80D4B0', marginTop: 2 } }, 'Action: ' + (entry.action || '-')),
              h('div', { style: { color: '#C0C0D8', marginTop: 2 } }, 'Rationale: ' + (entry.rationale || '-'))
            );
          })
      ) : null
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════════
function App() {
  var _u = useState(true); var useDummy = _u[0]; var setUseDummy = _u[1];
  var _c = useState(false); var connected = _c[0]; var setConnected = _c[1];
  var _l = useState(true); var loading = _l[0]; var setLoading = _l[1];
  var _at = useState('map'); var activeTab = _at[0]; var setActiveTab = _at[1];
  var _ab = useState(false); var aboutOpen = _ab[0]; var setAboutOpen = _ab[1];

  var _sup = useState([]); var suppliers = _sup[0]; var setSuppliers = _sup[1];
  var _wl = useState([]); var watchlist = _wl[0]; var setWatchlist = _wl[1];
  var _al = useState([]); var alerts = _al[0]; var setAlerts = _al[1];
  var _ts = useState([]); var tariffScenarios = _ts[0]; var setTariffScenarios = _ts[1];
  var _eb = useState(null); var execBrief = _eb[0]; var setExecBrief = _eb[1];

  // P3D: role + user
  var _role = useState('supply_chain_analyst'); var role = _role[0]; var setRole = _role[1];
  var _me = useState(null); var me = _me[0]; var setMe = _me[1];
  var _fbTick = useState(0); var feedbackTick = _fbTick[0]; var setFeedbackTick = _fbTick[1];
  function bumpFeedback() { setFeedbackTick(function(t) { return t + 1; }); }

  useEffect(function() {
    fetch('/api/me').then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) { if (d) setMe(d); }).catch(function() {});
  }, []);

  function loadMockData() {
    if (typeof MOCK_SUPPLIERS !== 'undefined') setSuppliers(MOCK_SUPPLIERS);
    if (typeof MOCK_WATCHLIST !== 'undefined') setWatchlist(MOCK_WATCHLIST);
    if (typeof MOCK_ALERTS !== 'undefined') setAlerts(MOCK_ALERTS);
    if (typeof MOCK_TARIFF_SCENARIOS !== 'undefined') setTariffScenarios(MOCK_TARIFF_SCENARIOS);
    if (typeof MOCK_EXEC_BRIEF !== 'undefined') setExecBrief(MOCK_EXEC_BRIEF);
    setLoading(false);
  }

  function fetchLiveData() {
    setLoading(true);
    Promise.all([
      fetch('/api/health').then(function(r) { return r.json(); }),
    ])
    .then(function() {
      setConnected(true);
      setUseDummy(false);
      // Live data would be fetched here; for now fall back to mock
      loadMockData();
    })
    .catch(function() {
      setConnected(false);
      setUseDummy(true);
      loadMockData();
    });
  }

  useEffect(function() { fetchLiveData(); }, []);

  function handleToggle(checked) {
    setUseDummy(checked);
    if (checked) loadMockData();
    else fetchLiveData();
  }

  var unreviewed = watchlist.filter(function(c) { return !c.reviewedAt && !c.dismissedAt; }).length;
  // P3D: filter alerts by role (view filter, not access control)
  var roleAlertTypes = alertTypesForRole(role);
  var roleFilteredAlerts = roleAlertTypes
    ? alerts.filter(function(a) { return roleAlertTypes.indexOf(a.type) !== -1; })
    : alerts;
  var activeAlerts = roleFilteredAlerts.filter(function(a) { return !a.dismissedAt && !a.reviewedAt; }).length;
  var userObj = me && me.user ? me.user : null;

  var tabItems = [
    {
      key: 'map',
      label: h('span', null, 'World Map'),
      children: loading ? h('div', { style: { textAlign: 'center', padding: 60 } }, h(Spin, { size: 'large' })) : h(WorldMapTab, { suppliers: suppliers, setSuppliers: setSuppliers, role: role, user: userObj, onActionLogged: bumpFeedback }),
    },
    {
      key: 'watchlist',
      label: h('span', null, 'Daily Watchlist', unreviewed > 0 ? h(Badge, { count: unreviewed, size: 'small', style: { marginLeft: 6, background: '#C20A29' } }) : null),
      children: h(WatchlistTab, { watchlist: watchlist, setWatchlist: setWatchlist, setSuppliers: setSuppliers, role: role, user: userObj, onActionLogged: bumpFeedback }),
    },
    {
      key: 'alerts',
      label: h('span', null, 'Alerts', activeAlerts > 0 ? h(Badge, { count: activeAlerts, size: 'small', style: { marginLeft: 6 } }) : null),
      children: h(AlertsTab, { alerts: roleFilteredAlerts, setAlerts: setAlerts, setSuppliers: setSuppliers, role: role, user: userObj, onActionLogged: bumpFeedback }),
    },
    {
      key: 'tariff',
      label: 'Tariff Modeler',
      children: h(TariffTab, { scenarios: tariffScenarios }),
    },
    {
      key: 'brief',
      label: 'Executive Brief',
      children: h(ExecBriefTab, { brief: execBrief }),
    },
    {
      key: 'feedback',
      label: h('span', null, 'Feedback & Models'),
      children: h(FeedbackModelsTab, { refreshTick: feedbackTick }),
    },
  ];

  var _ac = useState(0); var auditCount = _ac[0]; var setAuditCount = _ac[1];
  useEffect(function() {
    fetch('/api/actions').then(function(r) { return r.ok ? r.json() : { count: 0 }; })
      .then(function(d) { setAuditCount(d.count || 0); }).catch(function() {});
  }, [feedbackTick]);

  var debugState = {
    useDummy: useDummy, connected: connected, loading: loading, activeTab: activeTab,
    supplierCount: suppliers.length, watchlistCount: watchlist.length,
    alertCount: alerts.length, scenarioCount: tariffScenarios.length,
    hasBrief: !!execBrief, auditCount: auditCount, role: role,
  };

  return h(ConfigProvider, { theme: dominoTheme },
    h('div', { className: 'app-layout app-layout-no-topnav' },
      h(DebugPanel, { appState: debugState }),
      h('div', { className: 'app-content' },
        h('div', { style: { padding: '16px 20px 0' } },
          h('div', { className: 'search-card' },
            h('div', null,
              h('div', { className: 'search-card-title' }, 'Supply Risk Radar'),
              h('div', { className: 'search-card-sub' }, 'Pharma supply chain risk fusion across FDA 483s, weather, tariffs, and geopolitics')
            ),
            h('div', { className: 'search-card-right' },
              h('div', { style: { fontSize: 12, color: '#65657B' } }, suppliers.length + ' suppliers monitored'),
              h(Tooltip, { title: API_GAPS.ssoRbac.message },
                h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
                  h('span', { style: { fontSize: 12, color: '#65657B' } }, 'View as'),
                  h(Select, {
                    size: 'small', value: role, onChange: setRole, style: { minWidth: 180 },
                    options: APP_ROLES.map(function(r) { return { label: r.label, value: r.id, title: r.scope }; })
                  }),
                  h(ApiPendingBadge)
                )
              ),
              !connected ? h('div', { className: 'dummy-data-toggle', style: { color: '#65657B' } },
                h('span', null, 'Dummy data'),
                h(Switch, { checked: useDummy, onChange: handleToggle, size: 'small' })
              ) : null,
              h(Button, { size: 'small', onClick: function() { setAboutOpen(true); } }, 'About')
            )
          )
        ),
        h(Tabs, {
          className: 'main-tabs',
          activeKey: activeTab,
          onChange: setActiveTab,
          items: tabItems,
          style: { flex: 1, display: 'flex', flexDirection: 'column' },
        })
      ),
      h(AboutModal, { open: aboutOpen, onClose: function() { setAboutOpen(false); } })
    )
  );
}

var root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(App));
