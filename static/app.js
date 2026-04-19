// SupplyRiskRadar — Main App
'use strict';

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

// ── API_GAPS ──────────────────────────────────────────────────────────────────
var API_GAPS = {
  distributeBrief:  { label: 'Distribute Brief',  message: 'Coming soon — SharePoint/Teams write integration is pending.', ready: false },
  exportTariff:     { label: 'Export to Anaplan',  message: 'Coming soon — FP&A export API is in development.', ready: false },
  bulkDismiss:      { label: 'Bulk Dismiss',       message: 'Coming soon — bulk write API is pending.', ready: false },
  liveScoring:      { label: 'Live Re-score',      message: 'Coming soon — real-time ML scoring service is in development.', ready: false },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt$(n) {
  if (!n && n !== 0) return '—';
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
  var flags = { India: '🇮🇳', China: '🇨🇳', UK: '🇬🇧', Germany: '🇩🇪', Switzerland: '🇨🇭', USA: '🇺🇸', Belgium: '🇧🇪', Ireland: '🇮🇪', Singapore: '🇸🇬' };
  return flags[country] || '🌐';
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

// ════════════════════════════════════════════════════════════════════════════════
// TAB 1 — World Map
// ════════════════════════════════════════════════════════════════════════════════
function WorldMapTab(props) {
  var suppliers = props.suppliers;
  var mapRef = useRef(null);
  var leafletMap = useRef(null);
  var markersRef = useRef([]);

  var _dr = useState(null); var drawerSupplier = _dr[0]; var setDrawerSupplier = _dr[1];
  var _cf = useState('All'); var catFilter = _cf[0]; var setCatFilter = _cf[1];
  var _rf = useState('All'); var riskFilter = _rf[0]; var setRiskFilter = _rf[1];

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

  useEffect(function() {
    if (!window.L) return;
    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
    }
    var map = L.map('supply-map', { center: [25, 30], zoom: 2, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);
    leafletMap.current = map;
    return function() { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, []);

  useEffect(function() {
    var map = leafletMap.current;
    if (!map || !window.L) return;
    markersRef.current.forEach(function(m) { map.removeLayer(m); });
    markersRef.current = [];

    filtered.forEach(function(s) {
      var color = riskColor(s.riskLevel);
      var size = s.riskLevel === 'critical' ? 16 : s.riskLevel === 'high' ? 13 : 10;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (size * 2 + 4) + '" height="' + (size * 2 + 4) + '">' +
        (s.riskLevel === 'critical' ? '<circle cx="' + (size + 2) + '" cy="' + (size + 2) + '" r="' + (size + 2) + '" fill="' + color + '" opacity="0.25"/>' : '') +
        '<circle cx="' + (size + 2) + '" cy="' + (size + 2) + '" r="' + size + '" fill="' + color + '" stroke="#fff" stroke-width="2"/>' +
        '</svg>';
      var icon = L.divIcon({
        html: svg,
        className: '',
        iconSize: [size * 2 + 4, size * 2 + 4],
        iconAnchor: [size + 2, size + 2],
      });
      var marker = L.marker([s.lat, s.lng], { icon: icon }).addTo(map);
      marker.on('click', function() { setDrawerSupplier(s); });
      marker.bindTooltip(s.shortName + ' (' + s.country + ') — Risk: ' + s.riskScore, { permanent: false, direction: 'top' });
      markersRef.current.push(marker);
    });
  }, [filtered]);

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
        value: catFilter, onChange: setCatFilter, style: { width: 160 },
        options: ['All', 'API', 'KSM', 'Excipient', 'CMO', 'Packaging'].map(function(v) { return { label: v === 'All' ? 'All Categories' : v, value: v }; })
      }),
      h(Select, {
        value: riskFilter, onChange: setRiskFilter, style: { width: 160 },
        options: [
          { label: 'All Risk Levels', value: 'All' },
          { label: '🔴 Critical', value: 'critical' },
          { label: '🟠 High', value: 'high' },
          { label: '🟡 Medium', value: 'medium' },
          { label: '🟢 Low', value: 'low' },
        ]
      }),
      h('div', { className: 'map-legend', style: { marginLeft: 'auto' } },
        h('span', { style: { fontSize: 11, fontWeight: 600, color: '#8F8FA3', marginRight: 4 } }, 'LEGEND:'),
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
      extra: drawerSupplier ? h(Tag, { color: drawerSupplier.riskLevel === 'critical' ? 'error' : drawerSupplier.riskLevel === 'high' ? 'warning' : 'default' }, 'Risk: ' + (drawerSupplier.riskScore || '—')) : null,
    },
      drawerSupplier ? h('div', null,
        h('div', { style: { display: 'flex', gap: 12, marginBottom: 16 } },
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 11, color: '#8F8FA3', fontWeight: 600, textTransform: 'uppercase' } }, 'Risk Score'),
            h('div', { className: 'risk-score ' + drawerSupplier.riskLevel }, drawerSupplier.riskScore)
          ),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 11, color: '#8F8FA3', fontWeight: 600, textTransform: 'uppercase' } }, 'Category'),
            h('div', { style: { fontSize: 16, fontWeight: 600, marginTop: 4 } }, drawerSupplier.category)
          ),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 11, color: '#8F8FA3', fontWeight: 600, textTransform: 'uppercase' } }, 'Annual Spend'),
            h('div', { style: { fontSize: 16, fontWeight: 600, marginTop: 4 } }, fmt$(drawerSupplier.spend))
          )
        ),

        drawerSupplier.sole ? h(Alert, { type: 'error', message: 'Sole-Source Supplier — No Qualified Alternate', showIcon: true, style: { marginBottom: 12 } }) : null,

        h(Divider, { orientation: 'left', plain: true }, 'Alternate Status'),
        alternateTag(drawerSupplier.alternateStatus),

        drawerSupplier.activeEvents && drawerSupplier.activeEvents.length > 0 ? h('div', null,
          h(Divider, { orientation: 'left', plain: true }, 'Active Risk Events'),
          drawerSupplier.activeEvents.map(function(ev, i) {
            return h('div', { key: i, style: { background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 4, padding: '8px 10px', marginBottom: 6, fontSize: 12, color: '#2E2E38' } }, '⚠ ', ev);
          })
        ) : h('div', null, h(Divider, { orientation: 'left', plain: true }, 'Active Risk Events'), h('div', { style: { color: '#8F8FA3', fontSize: 12 } }, 'No active events')),

        h(Divider, { orientation: 'left', plain: true }, 'Drug Products at Risk'),
        drawerSupplier.drugProducts && drawerSupplier.drugProducts.length > 0
          ? drawerSupplier.drugProducts.map(function(dpId) {
              var dp = (typeof MOCK_DRUG_PRODUCTS !== 'undefined' ? MOCK_DRUG_PRODUCTS : []).find(function(d) { return d.id === dpId; });
              if (!dp) return null;
              return h('div', { key: dpId, style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F5F5F5', fontSize: 13 } },
                h('div', null, h('div', { style: { fontWeight: 500 } }, dp.name), h('div', { style: { fontSize: 11, color: '#8F8FA3' } }, dp.therapyArea)),
                h('div', { style: { textAlign: 'right' } }, h('div', { style: { fontWeight: 600, color: '#C20A29' } }, fmt$(dp.revenue)), h('div', { style: { fontSize: 11, color: '#8F8FA3' } }, 'annual revenue'))
              );
            })
          : h('div', { style: { color: '#8F8FA3', fontSize: 12 } }, 'No drug product linkage'),

        drawerSupplier.hsCode ? h('div', null,
          h(Divider, { orientation: 'left', plain: true }, 'Tariff Exposure'),
          h('div', { style: { display: 'flex', gap: 16, fontSize: 13 } },
            h('div', null, h('div', { style: { color: '#8F8FA3', fontSize: 11 } }, 'HS Code'), h('div', { style: { fontWeight: 600 } }, drawerSupplier.hsCode)),
            h('div', null, h('div', { style: { color: '#8F8FA3', fontSize: 11 } }, 'Tariff Exposure'), h('div', { style: { fontWeight: 600, color: drawerSupplier.tariffExposure > 0.15 ? '#C20A29' : '#2E2E38' } }, (drawerSupplier.tariffExposure * 100).toFixed(0) + '%'))
          )
        ) : null
      ) : null
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 2 — Daily Watchlist
// ════════════════════════════════════════════════════════════════════════════════
function WatchlistTab(props) {
  var watchlist = props.watchlist;
  var _items = useState(watchlist); var items = _items[0]; var setItems = _items[1];
  var _ef = useState(null); var expandedId = _ef[0]; var setExpandedId = _ef[1];
  var _af = useState('all'); var altFilter = _af[0]; var setAltFilter = _af[1];
  var _modal = useState(null); var actionModal = _modal[0]; var setActionModal = _modal[1];
  var _form = Form.useForm(); var form = _form[0];

  useEffect(function() { setItems(watchlist); }, [watchlist]);

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
    var entry = { type: 'watchlist_action', rank: actionModal.rank, supplier: actionModal.supplierName, drug: actionModal.drugProductName, rationale: values.rationale, action: values.action, timestamp: new Date().toISOString() };
    try { var log = JSON.parse(localStorage.getItem('srr_audit_log') || '[]'); log.push(entry); localStorage.setItem('srr_audit_log', JSON.stringify(log)); } catch(e) {}
    fetch('/api/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).catch(function() {});
    message.success('Action logged to audit trail');
    markReviewed(actionModal);
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
      h('span', { style: { fontSize: 12, color: '#8F8FA3', fontWeight: 600 } }, 'FILTER:'),
      h(Select, {
        value: altFilter, onChange: setAltFilter, style: { width: 200 },
        options: [
          { label: 'All Alternate Statuses', value: 'all' },
          { label: 'No Alternate', value: 'None' },
          { label: 'Alt: In Qualification', value: 'In Qualification' },
          { label: 'Alternate Qualified', value: 'Qualified' },
        ]
      }),
      h('div', { style: { marginLeft: 'auto', fontSize: 12, color: '#8F8FA3' } }, 'Showing ', filtered.length, ' of ', items.length, ' cards today')
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
              card.reviewedAt ? h(Tag, { color: 'success', style: { fontSize: 11 } }, '✓ Reviewed') : null
            ),
            h('div', { style: { marginTop: 8 } },
              card.riskDrivers.map(function(d) { return h(Tag, { key: d, color: 'purple', style: { fontSize: 10, marginBottom: 2 } }, d); })
            )
          ),
          h('div', { className: 'card-actions' },
            h('div', { className: 'risk-score ' + card.riskLevel, style: { fontSize: 22 } }, card.riskScore),
            h(Button, { size: 'small', type: 'primary', onClick: function() { openActionModal(card); } }, 'Take Action'),
            h(Button, { size: 'small', onClick: function() { setExpandedId(expanded ? null : card.rank); } }, expanded ? 'Collapse ▲' : 'Details ▼')
          )
        ),

        expanded ? h('div', null,
          h('div', { className: 'card-events' },
            h('div', { style: { fontSize: 11, fontWeight: 600, color: '#8F8FA3', textTransform: 'uppercase', marginBottom: 4 } }, 'Source Events'),
            card.sourceEvents.map(function(ev, i) { return h('div', { key: i, className: 'card-event-item' }, '• ', ev); })
          ),
          h('div', { style: { padding: '0 16px 8px' } },
            h('div', { style: { fontSize: 11, fontWeight: 600, color: '#8F8FA3', textTransform: 'uppercase', marginBottom: 4 } }, 'Reasoning Chain'),
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
            h('div', { style: { fontSize: 11, fontWeight: 600, color: '#543FDE', textTransform: 'uppercase', padding: '0 16px 4px' } }, 'LLM Mitigation Suggestion'),
            h('div', { className: 'mitigation-box' }, card.mitigationSuggestion)
          )
        ) : null
      );
    }),

    // Action Modal
    h(Modal, {
      open: !!actionModal,
      onCancel: function() { setActionModal(null); },
      title: actionModal ? 'Log Action — ' + actionModal.supplierName : '',
      onOk: function() { form.submit(); },
      okText: 'Log to Audit Trail',
      okButtonProps: { type: 'primary' },
    },
      actionModal ? h(Form, { form: form, layout: 'vertical', onFinish: submitAction },
        h('div', { style: { background: '#F5F5F5', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12 } },
          h('div', null, h('b', null, 'Supplier: '), actionModal.supplierName, ' (', actionModal.country, ')'),
          h('div', null, h('b', null, 'Drug: '), actionModal.drugProductName),
          h('div', null, h('b', null, 'Risk Score: '), actionModal.riskScore, ' · ', h('b', null, 'Revenue at Risk: '), fmt$(actionModal.revenueAtRisk))
        ),
        h(Form.Item, { label: 'Action Taken', name: 'action', rules: [{ required: true, message: 'Required' }] },
          h(Select, {
            options: [
              { label: 'Requested CAPA from supplier quality team', value: 'capa_request' },
              { label: 'Initiated alternate qualification project', value: 'alt_qual' },
              { label: 'Authorized safety stock build', value: 'safety_stock' },
              { label: 'Escalated to CPO / Procurement Leadership', value: 'escalated' },
              { label: 'Engaged regulatory affairs for DMF review', value: 'regulatory' },
              { label: 'Activated BCP — business continuity protocol', value: 'bcp' },
              { label: 'Switched order to alternate supplier', value: 'switch' },
              { label: 'Monitored — no action required', value: 'monitor' },
            ]
          })
        ),
        h(Form.Item, { label: 'Rationale (required for audit)', name: 'rationale', rules: [{ required: true, message: 'Rationale is required for audit trail' }] },
          h(Input.TextArea, { rows: 3, placeholder: 'Describe why this action was taken and what data informed the decision...' })
        )
      ) : null
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 3 — Alert Detail
// ════════════════════════════════════════════════════════════════════════════════
function AlertsTab(props) {
  var alerts = props.alerts;
  var _items = useState(alerts); var items = _items[0]; var setItems = _items[1];
  var _tf = useState('All'); var typeFilter = _tf[0]; var setTypeFilter = _tf[1];
  var _sf = useState('All'); var sevFilter = _sf[0]; var setSevFilter = _sf[1];
  var _modal = useState(null); var actionModal = _modal[0]; var setActionModal = _modal[1];
  var _form = Form.useForm(); var form = _form[0];
  var _auditLog = useState([]); var auditLog = _auditLog[0]; var setAuditLog = _auditLog[1];

  useEffect(function() { setItems(alerts); }, [alerts]);
  useEffect(function() {
    try { var log = JSON.parse(localStorage.getItem('srr_audit_log') || '[]'); setAuditLog(log); } catch(e) {}
  }, []);

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
    var entry = { type: 'alert_action', alertId: alert.id, supplier: alert.supplierName, alertTitle: alert.title, action: values.action, rationale: values.rationale, timestamp: new Date().toISOString() };
    try { var log = JSON.parse(localStorage.getItem('srr_audit_log') || '[]'); log.push(entry); localStorage.setItem('srr_audit_log', JSON.stringify(log)); setAuditLog(log); } catch(e) {}
    fetch('/api/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).catch(function() {});
    message.success('Action logged to audit trail');
    markReviewed(alert.id);
    setActionModal(null);
  }

  function typeClass(type) {
    var map = { Regulatory: 'alert-type-regulatory', Weather: 'alert-type-weather', Tariff: 'alert-type-tariff', Labor: 'alert-type-labor', Environmental: 'alert-type-environmental', Operational: 'alert-type-operational' };
    return map[type] || 'alert-type-operational';
  }

  return h('div', { className: 'tab-pane' },
    h('div', { className: 'alert-fatigue-header' },
      h('span', { style: { fontSize: 16 } }, '🎯'),
      h('span', null, h('b', null, filtered.length + ' alerts today'), ' — calibrated to 3–7 high-signal events per user per day. Every alert is BOM-mapped and source-cited.')
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
          { label: '🔴 Critical', value: 'critical' },
          { label: '🟠 High', value: 'high' },
          { label: '🟡 Medium', value: 'medium' },
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
            h('div', { style: { fontWeight: 600, fontSize: 14, color: '#2E2E38', marginTop: 6 } }, alert.title),
            h('div', { style: { fontSize: 12, color: '#65657B', marginTop: 2 } }, countryFlag(alert.supplierName.includes('India') || alert.supplierName.includes('Laurus') || alert.supplierName.includes('Aurobindo') || alert.supplierName.includes('Divi') || alert.supplierName.includes('Sun') ? 'India' : alert.supplierName.includes('Zhejiang') || alert.supplierName.includes('Hisun') || alert.supplierName.includes('Jiangsu') ? 'China' : alert.supplierName.includes('Lonza') ? 'Switzerland' : alert.supplierName.includes('Almac') ? 'UK' : ''), ' ', alert.supplierName, ' · ', alert.date)
          ),
          h('div', { style: { marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 } },
            h(Tag, { color: alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'default' }, alert.severity.toUpperCase()),
            alert.reviewedAt ? h(Tag, { color: 'success', style: { fontSize: 10 } }, '✓ Reviewed') : null
          )
        ),
        h('div', { className: 'alert-body' },
          h('div', { className: 'alert-description' }, alert.description),
          h('div', { className: 'alert-source' }, '📎 Source: ', alert.sourceLabel, alert.sourceUrl ? h('a', { href: '#', style: { marginLeft: 4, color: '#543FDE' }, onClick: function(e) { e.preventDefault(); message.info('Source: ' + alert.sourceLabel); } }, '[View Source]') : null),
          alert.drugImpact && alert.drugImpact.length > 0 ? h('div', { className: 'alert-drug-impact' },
            h('div', { style: { fontSize: 11, fontWeight: 600, color: '#8F8FA3', textTransform: 'uppercase', marginBottom: 4, marginTop: 8 } }, 'Drug Product Impact'),
            alert.drugImpact.map(function(d, i) { return h('div', { key: i, style: { fontSize: 12, color: '#C20A29', fontWeight: 500 } }, '⚠ ', d); })
          ) : null
        ),
        h('div', { className: 'alert-action-row' },
          h(Button, { size: 'small', type: 'primary', onClick: function() { setActionModal(alert); form.resetFields(); } }, 'Take Action'),
          h(Button, { size: 'small', onClick: function() { markReviewed(alert.id); } }, alert.reviewedAt ? '✓ Reviewed' : 'Mark Reviewed'),
          h(Button, { size: 'small', danger: true, onClick: function() { dismiss(alert.id); } }, 'Dismiss'),
          h('div', { style: { marginLeft: 'auto', fontSize: 11, color: '#8F8FA3' } }, 'Confidence: ', h('b', null, Math.round((alert.confidence || 0.8) * 100) + '%'))
        )
      );
    }),

    auditLog.length > 0 ? h('div', { style: { marginTop: 24 } },
      h('div', { style: { fontSize: 12, fontWeight: 600, color: '#8F8FA3', textTransform: 'uppercase', marginBottom: 6 } }, '🔒 Audit Log (localStorage)'),
      h('div', { className: 'audit-log' },
        auditLog.slice().reverse().map(function(entry, i) {
          return h('div', { key: i, className: 'audit-log-entry' },
            h('span', { style: { color: '#6A8FA8' } }, entry.timestamp ? entry.timestamp.slice(0, 19).replace('T', ' ') : ''),
            ' · ',
            h('span', { style: { color: '#A8E6CF' } }, entry.supplier),
            ' · ',
            h('span', null, entry.rationale)
          );
        })
      )
    ) : null,

    h(Modal, {
      open: !!actionModal,
      onCancel: function() { setActionModal(null); },
      title: actionModal ? 'Log Action — ' + (actionModal.title || '') : '',
      onOk: function() { form.submit(); },
      okText: 'Log to Audit Trail',
    },
      actionModal ? h(Form, { form: form, layout: 'vertical', onFinish: submitAction },
        h('div', { style: { background: '#F5F5F5', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12 } },
          h('div', null, h('b', null, 'Alert: '), actionModal.title),
          h('div', null, h('b', null, 'Supplier: '), actionModal.supplierName)
        ),
        h(Form.Item, { label: 'Action Taken', name: 'action', rules: [{ required: true }] },
          h(Select, { options: [
            { label: 'Requested CAPA from supplier', value: 'capa' },
            { label: 'Initiated alternate qualification', value: 'alt_qual' },
            { label: 'Authorized safety stock build', value: 'safety_stock' },
            { label: 'Escalated to leadership', value: 'escalated' },
            { label: 'Monitored — no action', value: 'monitor' },
          ]})
        ),
        h(Form.Item, { label: 'Rationale', name: 'rationale', rules: [{ required: true }] },
          h(Input.TextArea, { rows: 3, placeholder: 'Audit rationale...' })
        )
      ) : null
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 4 — Tariff Modeler
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
    { title: 'Scenario Rate', dataIndex: 'scenarioRate', key: 'scen', width: 120, render: function(v) { return h('span', { style: { fontWeight: 600, color: v > 0 ? '#C20A29' : '#2E2E38' } }, (v * 100).toFixed(0) + '%'); } },
    { title: 'COGS Delta', dataIndex: 'delta', key: 'delta', width: 130, sorter: function(a, b) { return a.delta - b.delta; }, render: function(v) { return h('span', { style: { fontWeight: 700, color: v > 0 ? '#C20A29' : '#28A464' } }, v > 0 ? '+' + fmt$(v) : fmt$(v)); } },
  ];

  return h('div', { className: 'tab-pane' },
    h('div', { className: 'scenario-selector' },
      h('div', { style: { fontSize: 12, fontWeight: 600, color: '#8F8FA3', textTransform: 'uppercase', marginBottom: 8 } }, 'Select Tariff Scenario'),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        scenarios.map(function(s) {
          return h(Button, {
            key: s.id,
            type: scenarioId === s.id ? 'primary' : 'default',
            onClick: function() { setScenarioId(s.id); },
            size: 'small',
          }, s.scenarioName);
        })
      ),
      h('div', { style: { marginTop: 10, fontSize: 12, color: '#65657B' } }, scenario.description)
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
              h('span', { style: { fontWeight: 500 } }, dp.productName),
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
// TAB 5 — Executive Brief
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
      h(Button, { type: 'primary', onClick: regenerate, loading: loading }, '↻ Regenerate Brief'),
      h(Tooltip, { title: API_GAPS.distributeBrief.message },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
          h(Button, { disabled: true }, 'Approve & Distribute'),
          h(ApiPendingBadge)
        )
      ),
      h('div', { style: { marginLeft: 'auto', fontSize: 12, color: '#8F8FA3' } },
        '🤖 Auto-generated ', dayjs(currentBrief.generatedAt).fromNow(), ' · Week ending ', currentBrief.weekEnding
      )
    ),

    loading ? h('div', { style: { textAlign: 'center', padding: 60 } }, h(Spin, { size: 'large', tip: 'Drafting executive brief from 10 risk sources and BOM data...' })) :

    h('div', { className: 'brief-doc' },
      h('div', { className: 'brief-header' },
        h('div', { className: 'brief-title' }, 'Supplier Risk Radar — Weekly Executive Brief'),
        h('div', { className: 'brief-meta' }, 'Auto-generated by SupplyRiskRadar · Week ending ', currentBrief.weekEnding, ' · Confidential — Internal Distribution Only')
      ),

      h('div', { className: 'brief-section' },
        h('div', { className: 'brief-section-title' }, 'Week Summary'),
        h('div', { style: { fontSize: 14, color: '#2E2E38', lineHeight: 1.6 } }, currentBrief.weekSummary)
      ),

      h('div', { className: 'brief-section' },
        h('div', { className: 'brief-section-title' }, 'Top 5 Risks This Week'),
        currentBrief.top5Risks.map(function(risk) {
          return h('div', { key: risk.rank, className: 'brief-risk-item' },
            h('div', { className: 'brief-risk-rank', style: { background: risk.rank <= 2 ? '#C20A29' : risk.rank <= 4 ? '#E06600' : '#CCB718' } }, risk.rank),
            h('div', { style: { flex: 1 } },
              h('div', { style: { fontWeight: 600, fontSize: 13, color: '#2E2E38' } }, risk.headline),
              h('div', { style: { fontSize: 12, color: '#65657B', marginTop: 2 } }, risk.impact),
              h(Tag, { color: risk.urgency.startsWith('Act') ? 'error' : 'warning', style: { fontSize: 10, marginTop: 4 } }, risk.urgency)
            )
          );
        })
      ),

      h('div', { className: 'brief-section' },
        h('div', { className: 'brief-section-title' }, 'Actions Required'),
        currentBrief.actionsRequired.map(function(action, i) {
          return h('div', { key: i, className: 'brief-action-item' },
            h('span', { className: 'brief-action-priority ' + action.priority }, action.priority),
            h('div', { style: { flex: 1 } },
              h('div', { style: { fontWeight: 500 } }, action.action),
              h('div', { style: { fontSize: 12, color: '#8F8FA3', marginTop: 2 } }, 'Owner: ', action.owner, ' · Due: ', action.dueDate)
            )
          );
        })
      ),

      h('div', { className: 'brief-section' },
        h('div', { className: 'brief-section-title' }, 'Tariff Exposure Summary'),
        h('div', { style: { fontSize: 13, color: '#2E2E38', lineHeight: 1.6 } }, currentBrief.tariffExposureSummary)
      ),

      h('div', { className: 'brief-section' },
        h('div', { className: 'brief-section-title' }, 'Trend Analysis'),
        h('div', { style: { fontSize: 13, color: '#2E2E38', lineHeight: 1.6 } }, currentBrief.trendAnalysis)
      ),

      h('div', { style: { marginTop: 24, padding: '12px 0', borderTop: '1px solid #E0E0E0', fontSize: 11, color: '#8F8FA3' } },
        'This brief was auto-generated by SupplyRiskRadar using AI-assisted synthesis of public risk signals and internal BOM/AVL data. All assertions are source-cited. Procurement leads should review before distribution. Not for trading-desk use.'
      )
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

  var _sup = useState([]); var suppliers = _sup[0]; var setSuppliers = _sup[1];
  var _wl = useState([]); var watchlist = _wl[0]; var setWatchlist = _wl[1];
  var _al = useState([]); var alerts = _al[0]; var setAlerts = _al[1];
  var _ts = useState([]); var tariffScenarios = _ts[0]; var setTariffScenarios = _ts[1];
  var _eb = useState(null); var execBrief = _eb[0]; var setExecBrief = _eb[1];

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

  var unreviewed = watchlist.filter(function(c) { return !c.reviewedAt; }).length;
  var activeAlerts = alerts.filter(function(a) { return !a.dismissedAt; }).length;

  var tabItems = [
    {
      key: 'map',
      label: h('span', null, '🗺 World Map'),
      children: loading ? h('div', { style: { textAlign: 'center', padding: 60 } }, h(Spin, { size: 'large' })) : h(WorldMapTab, { suppliers: suppliers }),
    },
    {
      key: 'watchlist',
      label: h('span', null, '📋 Daily Watchlist', unreviewed > 0 ? h(Badge, { count: unreviewed, size: 'small', style: { marginLeft: 6, background: '#C20A29' } }) : null),
      children: h(WatchlistTab, { watchlist: watchlist }),
    },
    {
      key: 'alerts',
      label: h('span', null, '⚠ Alerts', activeAlerts > 0 ? h(Badge, { count: activeAlerts, size: 'small', style: { marginLeft: 6 } }) : null),
      children: h(AlertsTab, { alerts: alerts }),
    },
    {
      key: 'tariff',
      label: '📊 Tariff Modeler',
      children: h(TariffTab, { scenarios: tariffScenarios }),
    },
    {
      key: 'brief',
      label: '📄 Executive Brief',
      children: h(ExecBriefTab, { brief: execBrief }),
    },
  ];

  return h(ConfigProvider, { theme: dominoTheme },
    h('div', { className: 'app-layout' },
      h('div', { className: 'app-topnav' },
        h('div', { className: 'app-topnav-logo' },
          h('div', { className: 'app-topnav-logo-icon' }, '⬡'),
          'SupplyRiskRadar'
        ),
        h('div', { className: 'app-topnav-spacer' }),
        h('div', { className: 'app-topnav-meta' }, 'Portfolio: All Categories · 25 Suppliers Monitored'),
        !connected ? h('div', { className: 'dummy-data-toggle' },
          h('span', null, 'Dummy Data'),
          h(Switch, { checked: useDummy, onChange: handleToggle, size: 'small' })
        ) : null
      ),
      h('div', { className: 'app-content' },
        h(Tabs, {
          className: 'main-tabs',
          activeKey: activeTab,
          onChange: setActiveTab,
          items: tabItems,
          style: { flex: 1, display: 'flex', flexDirection: 'column' },
        })
      )
    )
  );
}

var root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(App));
