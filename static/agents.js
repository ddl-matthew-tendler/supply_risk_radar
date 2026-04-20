// Supply Risk Radar - Specialized Agent Runner
// Each agent has a narrow job. UI shows tool-use style steps then streams the output.
'use strict';

(function () {
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  // ── Agent catalog ──────────────────────────────────────────────────────────
  // Each agent is a specialized role. No generic "ask anything" bot.
  var AGENTS = {
    scribe: {
      name: 'Scribe',
      title: 'Supplier communications agent',
      initial: 'S',
      color: '#543FDE',
      bg: '#EDECFB',
      tagline: 'Drafts supplier-facing letters, emails, and CAPA requests grounded in this supplier\'s risk profile.',
    },
    historian: {
      name: 'Historian',
      title: 'Relationship memory agent',
      initial: 'H',
      color: '#0070CC',
      bg: '#E6F1FB',
      tagline: 'Synthesizes every past interaction - calls, audits, quality events, price changes - into a single narrative.',
    },
    scout: {
      name: 'Scout',
      title: 'Alternate sourcing agent',
      initial: 'C',
      color: '#28A464',
      bg: '#E3F5EC',
      tagline: 'Searches the AVL and external supplier intelligence for qualified alternates ranked on capacity, geography, certs.',
    },
    analyst: {
      name: 'Analyst',
      title: 'Risk-score explainer agent',
      initial: 'A',
      color: '#CCB718',
      bg: '#FBF6DB',
      tagline: 'Opens up the risk fusion score and explains exactly what signals drove it and where it is headed.',
    },
    verifier: {
      name: 'Verifier',
      title: 'Signal verification agent',
      initial: 'V',
      color: '#E06600',
      bg: '#FFF1E4',
      tagline: 'Cross-checks a news or regulatory signal against independent sources and rates its credibility.',
    },
    negotiator: {
      name: 'Negotiator',
      title: 'Contract clause agent',
      initial: 'N',
      color: '#C20A29',
      bg: '#FBE5E9',
      tagline: 'Pulls the supplier\'s MSA and flags which clauses are triggered by this risk event - remedies, cures, penalties.',
    },
    forecaster: {
      name: 'Forecaster',
      title: 'Disruption simulation agent',
      initial: 'F',
      color: '#2EDCC4',
      bg: '#DFF8F4',
      tagline: 'Runs a what-if scenario across the BOM and quantifies revenue at risk, impacted SKUs, and mitigation playbook.',
    },
    briefer: {
      name: 'Briefer',
      title: 'Executive briefing agent',
      initial: 'B',
      color: '#3B3BD3',
      bg: '#E6E5F9',
      tagline: 'Drafts the weekly executive brief from every governed signal, action, and BOM linkage.',
    },
  };

  // ── Small helpers ──────────────────────────────────────────────────────────
  function $fmt(n) {
    if (n == null) return '-';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n;
  }
  function rand(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

  // ── Task generators ────────────────────────────────────────────────────────
  // Each returns { agent, title, subtitle, steps: [{label, tool?, detail?, ms}], output }
  var TASKS = {
    // ── Scribe · supplier outreach ────────────────────────────────────────
    draftOutreach: function (ctx) {
      var s = ctx.supplier;
      var severity = s.riskLevel === 'critical' ? 'firm' : s.riskLevel === 'high' ? 'direct' : 'collaborative';
      var events = (s.activeEvents || []).slice(0, 3);
      var drugCount = (s.drugProducts || []).length;
      var steps = [
        { label: 'Reading supplier profile', tool: 'bom.lookup', detail: s.name + ' · ' + s.category + ' · ' + s.country, ms: 500 },
        { label: 'Pulling last 6 interactions from CRM', tool: 'crm.history', detail: '3 calls · 2 emails · 1 on-site audit (Nov 2025)', ms: 700 },
        { label: 'Scanning active risk signals', tool: 'signals.active', detail: events.length + ' open events · risk score ' + s.riskScore, ms: 550 },
        { label: 'Checking BOM linkage', tool: 'bom.downstream', detail: drugCount + ' drug product' + (drugCount === 1 ? '' : 's') + ' at risk', ms: 450 },
        { label: 'Selecting tone and escalation level', detail: severity + ' · legal CC not required', ms: 400 },
        { label: 'Drafting letter', ms: 350 },
      ];
      var primaryEvent = events[0] || 'elevated risk signals in your region';
      var body = '' +
        'Dear ' + (s.shortName || s.name) + ' supply continuity team,\n\n' +
        'We are writing with respect to ' + (severity === 'firm' ? 'urgent concerns' : 'developments') +
        ' in your operations that our risk monitoring has surfaced this week. Specifically, we have flagged:\n\n' +
        events.map(function (e) { return '  - ' + e; }).join('\n') + '\n\n' +
        'Given that ' + s.name + ' ' + (s.sole ? 'is currently our sole qualified source for ' : 'supplies ') +
        drugCount + ' commercial product' + (drugCount === 1 ? '' : 's') +
        ' (combined annual revenue of $' + Math.round((drugCount || 1) * 280) + 'M), ' +
        'we require a written response within 5 business days covering the following:\n\n' +
        '  1. Root cause analysis and the corrective action plan with committed dates\n' +
        '  2. Confirmation of on-time delivery for all open POs through end of Q2\n' +
        '  3. Business continuity posture if the identified risk worsens over the next 30 days\n' +
        '  4. A quality-team call scheduled within 10 business days to walk through the above\n\n' +
        (severity === 'firm'
          ? 'To be direct: without a response meeting this standard, we will be forced to activate our alternate sourcing protocol and may adjust forward purchase commitments accordingly.\n\n'
          : 'We value the relationship we have built with ' + (s.shortName || s.name) + ' and our intent is to work through this together.\n\n') +
        'Please address your response to the undersigned and copy our Quality and Procurement leads.\n\n' +
        'Regards,\n' +
        '[Your name]\n' +
        'Global Supply Chain Risk, Pharma Operations\n\n' +
        '— Drafted by Scribe agent based on live signals as of ' + dayjs().format('MMM D, YYYY') + ' · Review before sending.';
      return {
        agent: AGENTS.scribe,
        title: 'Draft supplier outreach · ' + s.name,
        subtitle: 'Tone: ' + severity + ' · grounded in ' + events.length + ' open signals and ' + drugCount + ' BOM links',
        steps: steps,
        output: body,
      };
    },

    // ── Historian · relationship timeline ─────────────────────────────────
    relationshipTimeline: function (ctx) {
      var s = ctx.supplier;
      var steps = [
        { label: 'Collecting 24 months of interactions', tool: 'crm.query', detail: 'filter: supplier=' + s.id, ms: 650 },
        { label: 'Pulling quality events from eQMS', tool: 'eqms.events', detail: rand(4, 11) + ' CAPAs · ' + rand(1, 4) + ' audits', ms: 700 },
        { label: 'Joining with PO history', tool: 'erp.po', detail: rand(38, 72) + ' purchase orders · on-time rate ' + rand(82, 97) + '%', ms: 600 },
        { label: 'Scoring each interaction tone', tool: 'nlp.sentiment', ms: 500 },
        { label: 'Building timeline narrative', ms: 400 },
      ];
      var onTime = rand(84, 96);
      var capas = rand(3, 7);
      var currentYear = 2026, prevYear = 2025;
      var output = '' +
        'Relationship summary · ' + s.name + '\n' +
        '─────────────────────────────────────────\n' +
        'Active since: 2019  ·  Total spend to date: ' + $fmt(s.spend * 5) + '  ·  Trust trend: ' +
        (s.riskScore > 80 ? 'deteriorating' : s.riskScore > 60 ? 'strained' : 'stable') + '\n\n' +

        currentYear + ' Q2 (current)\n' +
        '  · ' + (s.activeEvents && s.activeEvents[0] ? s.activeEvents[0] : 'Normal operating cadence.') + '\n' +
        '  · ' + (s.activeEvents && s.activeEvents[1] ? s.activeEvents[1] : 'No compounding signals.') + '\n' +
        '  · Last exec call: Apr 4, 2026 · tone: ' + (s.riskScore > 80 ? 'tense, defensive on timelines' : 'constructive') + '\n\n' +

        currentYear + ' Q1\n' +
        '  · Site audit completed Feb 11 · ' + capas + ' minor CAPAs opened, ' + (capas - rand(1, 2)) + ' closed on time\n' +
        '  · Price negotiation for 2026 volume closed at +' + rand(2, 6) + '% (vs. our +3% target) · went well\n' +
        '  · Two delivery slips of 4-7 days · they flagged proactively, no production impact\n\n' +

        prevYear + ' H2\n' +
        '  · QBR in Q4 · they surfaced upstream KSM constraint; we accepted a 14-day lead-time extension\n' +
        '  · New site general manager assigned in Oct · relationship with our GM is strong\n' +
        '  · Received EU GMP certification renewal Nov 2025\n\n' +

        prevYear + ' H1\n' +
        '  · Joint-effort to qualify alternate packaging vendor · on-time, on-spec\n' +
        '  · One shipment rejected on CoA discrepancy · resolved with a replacement lot in 9 days\n\n' +

        'Headline reads\n' +
        '  · On-time delivery over 24 months: ' + onTime + '%\n' +
        '  · Quality rejection rate: ' + (100 - onTime > 10 ? '2.1%' : '0.8%') + '\n' +
        '  · Responsiveness to our escalations: ' + (s.riskScore > 80 ? 'slow (avg 6 days)' : 'fast (avg 2 days)') + '\n' +
        '  · Exec relationship: ' + (s.riskScore > 80 ? 'bruised by current events - needs repair' : 'healthy') + '\n\n' +

        'Bottom line: ' + (s.riskScore > 80
          ? 'A historically reliable partner going through a rough patch. Worth trying to salvage, but do not delay alternate qualification while we wait.'
          : 'A dependable relationship with no structural concerns. Maintain current cadence.');
      return {
        agent: AGENTS.historian,
        title: 'Relationship history · ' + s.name,
        subtitle: 'Synthesized from CRM, eQMS, and ERP across 24 months',
        steps: steps,
        output: output,
      };
    },

    // ── Scout · find alternates ────────────────────────────────────────────
    findAlternates: function (ctx) {
      var s = ctx.supplier;
      var steps = [
        { label: 'Querying AVL for category match', tool: 'avl.search', detail: 'category=' + s.category + (s.hsCode ? ' · hs=' + s.hsCode : ''), ms: 550 },
        { label: 'Filtering by BOM compatibility', tool: 'bom.match', detail: (s.drugProducts || []).length + ' drug product targets', ms: 600 },
        { label: 'Pulling capacity and lead times', tool: 'supplier.capacity', detail: 'contacted 12 AVL records', ms: 700 },
        { label: 'Checking regulatory filings (DMF, CEP)', tool: 'fda.dmf', detail: '9 active DMFs found', ms: 650 },
        { label: 'Geographic diversification scoring', detail: 'prefer outside ' + s.country, ms: 400 },
        { label: 'Ranking top candidates', ms: 350 },
      ];
      var alts = [
        { n: 'Dr. Reddy\'s Laboratories CPS', c: 'India', time: 90, note: 'Already in-qualification · closest geography swap · accepts volume' },
        { n: 'Siegfried AG · Pennsville', c: 'USA', time: 150, note: 'Tariff-neutral · higher price (+11%) but removes China exposure entirely' },
        { n: 'Cambrex Corp · High Point', c: 'USA', time: 180, note: 'DMF on file · capacity limited to 40% of current volume, would need split-sourcing' },
        { n: 'Siegfried · Evionnaz', c: 'Switzerland', time: 200, note: 'Premium option · strong quality history · longest qualification timeline' },
      ];
      var output = '' +
        'Alternate sources for ' + s.name + ' (' + s.category + ')\n' +
        '─────────────────────────────────────────\n\n' +
        alts.map(function (a, i) {
          return '#' + (i + 1) + ' · ' + a.n + ' (' + a.c + ')\n' +
            '    Est. qualification: ' + a.time + ' days\n' +
            '    ' + a.note + '\n';
        }).join('\n') +
        '\nRecommended path\n' +
        '  Fast-track #1 (Dr. Reddy\'s) as primary alternate. Dual-track #2 (Siegfried Pennsville) as\n' +
        '  the geographic diversification play - this is the one that survives a China-tariff or\n' +
        '  India-regulatory scenario. Qualification capital estimated at $1.8-2.4M across both tracks.\n\n' +
        'Risks to this plan\n' +
        '  · Dr. Reddy\'s has its own FDA history - pull their 483 record before committing volume\n' +
        '  · Siegfried US site is at ~70% utilization; contract capacity early to protect slot\n\n' +
        '— Scout searched 12 AVL records and 9 DMFs. Longer list available on request.';
      return {
        agent: AGENTS.scout,
        title: 'Alternate sources · ' + s.name,
        subtitle: (s.sole ? 'Sole-source · critical gap' : 'Alt: ' + s.alternateStatus) + ' · ranked 4 of 12 candidates',
        steps: steps,
        output: output,
      };
    },

    // ── Analyst · risk score deep-dive ─────────────────────────────────────
    riskBrief: function (ctx) {
      var s = ctx.supplier;
      var weights = { reg: 0.35, weather: 0.15, tariff: 0.20, labor: 0.15, ops: 0.15 };
      var parts = [
        { k: 'Regulatory (FDA/EMA)', w: weights.reg, v: s.fda483Date ? 92 : 30 },
        { k: 'Weather / climate', w: weights.weather, v: /typhoon|flood|cyclone|hurricane|water/i.test((s.activeEvents || []).join(' ')) ? 78 : 20 },
        { k: 'Tariff exposure', w: weights.tariff, v: Math.round((s.tariffExposure || 0) * 300) },
        { k: 'Labor / civil', w: weights.labor, v: /labor|strike|unrest|staff/i.test((s.activeEvents || []).join(' ')) ? 75 : 15 },
        { k: 'Operational', w: weights.ops, v: /port|congestion|deviation|logistics/i.test((s.activeEvents || []).join(' ')) ? 65 : 25 },
      ];
      var steps = [
        { label: 'Loading risk-fusion model (champion)', tool: 'model.load', detail: 'risk-fusion-v4.2', ms: 500 },
        { label: 'Pulling feature vector for ' + s.id, tool: 'features.get', detail: '47 features across 5 signal families', ms: 550 },
        { label: 'Computing per-signal contribution', tool: 'shap.explain', ms: 750 },
        { label: 'Back-testing against prior 90 days', detail: 'trend: ' + (s.riskScore > 80 ? 'up +14' : 'stable') , ms: 600 },
        { label: 'Composing explanation', ms: 400 },
      ];
      var lines = parts.map(function (p) {
        var contrib = Math.round(p.w * p.v);
        var bar = '█'.repeat(Math.round(contrib / 3));
        return p.k.padEnd(26, ' ') + '  ' + String(contrib).padStart(3, ' ') + '  ' + bar;
      }).join('\n');
      var output = '' +
        'Risk score explainer · ' + s.name + ' · composite ' + s.riskScore + '/100\n' +
        '─────────────────────────────────────────\n\n' +
        'Signal family            contrib  weight\n' +
        lines + '\n\n' +
        'What is driving this score\n' +
        (s.fda483Date ? '  · FDA Form 483 filed ' + s.fda483Date + ' - historically a 73% precursor to a Warning Letter within 12 months. This is the single largest driver.\n' : '  · No active regulatory findings.\n') +
        (s.sole ? '  · Sole-source: any disruption has zero mitigation headroom. BOM criticality weight applied.\n' : '  · Alternate qualified or in-qualification; disruption impact is partially absorbed.\n') +
        ((s.tariffExposure || 0) > 0.15 ? '  · Tariff exposure at ' + Math.round(s.tariffExposure * 100) + '% - above the 15% flag threshold.\n' : '') +
        '\nWhere the score is heading\n' +
        (s.riskScore > 80
          ? '  Up · at current signal velocity the model projects 92-96 within 30 days unless a CAPA response or alternate action intervenes.\n'
          : '  Stable · no near-term drivers expected to tip the score above its current band.\n') +
        '\nWhat this means in plain english\n' +
        '  ' + (s.riskScore > 80
          ? 'Treat this as a supplier that could stop shipping within the quarter. Act this week.'
          : s.riskScore > 60
            ? 'Watch closely. No immediate action required, but escalate if any new signal appears.'
            : 'Healthy supplier. Current score reflects routine operational noise.') + '\n\n' +
        '— Analyst explanation · SHAP values from risk-fusion-v4.2 · AUC 0.89 on holdout.';
      return {
        agent: AGENTS.analyst,
        title: 'Explain risk score · ' + s.name,
        subtitle: 'Per-signal contributions, trajectory, and plain-english read',
        steps: steps,
        output: output,
      };
    },

    // ── Verifier · cross-check a signal ────────────────────────────────────
    verifySignal: function (ctx) {
      var a = ctx.alert;
      var steps = [
        { label: 'Re-fetching primary source', tool: 'fetch.source', detail: a.sourceLabel || 'source', ms: 500 },
        { label: 'Cross-checking against 4 independent outlets', tool: 'news.multisource', detail: 'Reuters · Bloomberg · Nikkei · local press', ms: 950 },
        { label: 'Checking regulator filings', tool: 'regulator.search', detail: 'FDA, EMA, WHO', ms: 700 },
        { label: 'Looking for retractions or corrections', ms: 450 },
        { label: 'Rating source credibility', ms: 350 },
      ];
      var verdict = (a.confidence || 0.82) > 0.7 ? 'Corroborated' : 'Partial';
      var output = '' +
        'Signal verification · ' + (a.title || 'alert') + '\n' +
        '─────────────────────────────────────────\n\n' +
        'Verdict: ' + verdict + ' · confidence ' + Math.round((a.confidence || 0.82) * 100) + '%\n\n' +
        'Corroboration\n' +
        '  · Primary source: ' + (a.sourceLabel || 'unlabeled') + ' · credibility tier A\n' +
        '  · Reuters confirmed key facts within 4 hours of original report\n' +
        '  · Bloomberg carried a near-identical timeline from independent reporting\n' +
        '  · Local press (translated) adds a detail: ' + (verdict === 'Corroborated' ? 'named plant manager quoted acknowledging the event' : 'scope may be narrower than initial headline') + '\n' +
        '  · No retractions or corrections found\n\n' +
        'Things to be careful about\n' +
        '  · Headline uses the word "halt" - the underlying reporting says "slowdown". Prefer the narrower framing.\n' +
        '  · One outlier source (uncredentialed Telegram channel) is claiming broader impact. Discounted.\n\n' +
        'Recommendation\n' +
        '  ' + (verdict === 'Corroborated'
          ? 'Treat this as a real signal. Safe to escalate and act on.'
          : 'Real underlying event but scope is narrower than the headline. Discount the impact estimate by ~30% and wait 24h for clarification before major action.') + '\n\n' +
        '— Verifier agent · 4 sources cross-checked · ran in 3.2s.';
      return {
        agent: AGENTS.verifier,
        title: 'Verify this signal',
        subtitle: a.title || 'Signal verification',
        steps: steps,
        output: output,
      };
    },

    // ── Negotiator · contract clause review ────────────────────────────────
    contractReview: function (ctx) {
      var a = ctx.alert;
      var supplierName = (a && a.supplierName) || (ctx.supplier && ctx.supplier.name) || 'supplier';
      var steps = [
        { label: 'Locating MSA in Contracts Dataset', tool: 'contracts.find', detail: 'supplier=' + supplierName, ms: 550 },
        { label: 'Extracting clauses (OCR + schema)', tool: 'contracts.parse', detail: '47 clauses · 14 pages', ms: 900 },
        { label: 'Matching event type to clause triggers', tool: 'clause.match', detail: (a.type || 'event') + ' → 4 triggers', ms: 750 },
        { label: 'Pulling remedies and cure periods', ms: 500 },
        { label: 'Summarizing leverage', ms: 400 },
      ];
      var output = '' +
        'Contract clause review · ' + supplierName + '\n' +
        '─────────────────────────────────────────\n' +
        'Event: ' + (a.title || 'Risk event') + ' · MSA signed Aug 2022 · auto-renew Aug 2026\n\n' +
        'Triggered clauses\n\n' +
        '§4.2 - Quality compliance warranty\n' +
        '  Supplier warrants continuous GMP compliance. A regulatory finding classified\n' +
        '  as Form 483 or EMA non-compliance constitutes a breach.\n' +
        '  ► Our remedy: 30-day cure period · may suspend orders during cure · costs of\n' +
        '    alternate qualification recoverable if breach is not cured.\n\n' +
        '§7.1 - Business continuity and notification\n' +
        '  Supplier must notify within 5 business days of any event materially affecting\n' +
        '  production capacity.\n' +
        '  ► If not notified: we have right to audit and require a remediation plan.\n\n' +
        '§9.3 - Force majeure exclusions\n' +
        '  Regulatory actions resulting from supplier fault are explicitly excluded from\n' +
        '  force majeure. This event does NOT qualify as force majeure.\n\n' +
        '§11.2 - Termination for cause\n' +
        '  Two or more uncured §4.2 breaches within 24 months allows termination for cause\n' +
        '  with no fee · 180-day transition period applies.\n\n' +
        'Our leverage\n' +
        '  · Cure period clock starts at formal written notice - send today to preserve options\n' +
        '  · §4.2 + §11.2 together give us a credible off-ramp if the CAPA response is weak\n' +
        '  · Alternate qualification costs are reimbursable under §4.2 - document every hour\n\n' +
        'Their leverage\n' +
        '  · §13.1 minimum volume commitment through 2026 - roughly $11M remaining\n' +
        '  · Exit costs (tooling + regulatory change fees) estimated at $1.4M\n\n' +
        '— Negotiator · extracted from the signed MSA in the Contracts Dataset. Legal should review before formal notice.';
      return {
        agent: AGENTS.negotiator,
        title: 'Contract clauses triggered · ' + supplierName,
        subtitle: 'Based on the signed MSA and this specific event type',
        steps: steps,
        output: output,
      };
    },

    // ── Forecaster · what-if scenario ──────────────────────────────────────
    scenario: function (ctx) {
      var region = ctx.region || 'All critical regions';
      var eventType = ctx.event || 'Sudden 2-week regional halt';
      var steps = [
        { label: 'Geo-indexing suppliers in ' + region, tool: 'geo.filter', detail: rand(4, 11) + ' suppliers in scope', ms: 600 },
        { label: 'Tracing BOM downstream', tool: 'bom.downstream', detail: 'walking 3 tiers', ms: 850 },
        { label: 'Running Monte Carlo x 1,000', tool: 'sim.run', detail: 'scenario=' + eventType, ms: 1100 },
        { label: 'Estimating revenue at risk', tool: 'finance.rar', ms: 700 },
        { label: 'Composing mitigation playbook', ms: 500 },
      ];
      var output = '' +
        'Scenario: ' + eventType + ' · ' + region + '\n' +
        '─────────────────────────────────────────\n\n' +
        'Exposure\n' +
        '  · 7 suppliers in scope (4 critical, 2 high, 1 medium)\n' +
        '  · 5 drug products directly affected\n' +
        '  · 2 of the 5 are sole-sourced in this region - hard outage\n\n' +
        'Revenue at risk\n' +
        '  · Week 1: $48M (inventory buffer absorbs most impact)\n' +
        '  · Week 2: $112M (safety stock depleted for Vexorin, Lumizap)\n' +
        '  · Week 3+: $280M/month run rate if outage extends\n\n' +
        'Cascade effects\n' +
        '  · Packaging CMO capacity stranded - $0.9M idle cost/week\n' +
        '  · Three customer contracts include availability penalties - $6M exposure\n' +
        '  · One FDA post-marketing commitment at risk if supply interrupted > 30 days\n\n' +
        'Mitigation playbook (priority order)\n' +
        '  1. Activate BCP protocol for Aurobindo U7 and Zhejiang Huahai today\n' +
        '  2. Accelerate Dr. Reddy\'s qualification - collapse 90-day plan to 45 by running reg and quality in parallel\n' +
        '  3. Build 60-day safety stock for the two sole-sourced SKUs · $3.2M working capital · approval needed from CFO\n' +
        '  4. Pre-stage customer communication template · do not send yet\n' +
        '  5. Engage Siegfried Pennsville for emergency spot capacity · they have ~40% slack\n\n' +
        'Confidence\n' +
        '  Week 1-2 estimates: high confidence (actual inventory and PO data).\n' +
        '  Week 3+: moderate confidence (assumes mitigation 2-3 execute on time).\n\n' +
        '— Forecaster · 1,000 Monte Carlo runs · simulation parameters logged to governed audit Dataset.';
      return {
        agent: AGENTS.forecaster,
        title: 'What-if scenario · ' + region,
        subtitle: eventType,
        steps: steps,
        output: output,
      };
    },

    // ── Briefer · regenerate exec brief ────────────────────────────────────
    regenerateBrief: function (ctx) {
      var steps = [
        { label: 'Ingesting FDA 483 and EMA filings', tool: 'regulator.pull', detail: 'last 7 days · 14 new items', ms: 700 },
        { label: 'Ingesting weather and geopolitical feeds', tool: 'news.ingest', detail: '211 headlines → 18 material', ms: 900 },
        { label: 'Joining signals to BOM', tool: 'bom.join', detail: '25 suppliers · 10 drug products', ms: 750 },
        { label: 'Scoring top 5 risks', tool: 'model.rank', ms: 650 },
        { label: 'Reviewing prior actions and their effect', tool: 'audit.read', detail: 'last 7 days', ms: 550 },
        { label: 'Composing week summary', ms: 450 },
        { label: 'Composing actions required', ms: 450 },
        { label: 'Drafting trend analysis', ms: 500 },
      ];
      var output = '' +
        'Supply Risk Radar · Weekly Executive Brief\n' +
        '─────────────────────────────────────────\n' +
        'Week ending ' + dayjs().format('MMM D, YYYY') + ' · generated just now\n\n' +
        'WEEK SUMMARY\n' +
        'Two critical events dominate this week. First, the FDA Form 483 at Aurobindo Unit VII\n' +
        'moved into CAPA response phase and the quality of that response will determine whether\n' +
        'this escalates to a Warning Letter. Second, the proposed May tariff on Chinese APIs\n' +
        'has moved from "likely" to "very likely" per USTR filings, which adds roughly $16.7M/yr\n' +
        'to COGS on Lumizap alone.\n\n' +
        'TOP 5 RISKS\n' +
        '  1. Aurobindo U7 · FDA 483 · Vexorin $2.1B · Act this week\n' +
        '  2. Zhejiang Huahai · EU GMP + tariff · Lumizap $890M · Act within 30 days\n' +
        '  3. Divi\'s Lab U2 · Warning Letter precursor · Vexorin + Renolyx · Act within 30 days\n' +
        '  4. Lonza Visp · water supply risk · Biorexin $750M sole-source · Monitor weekly\n' +
        '  5. Laurus Labs · FDA 483 (sterile) · Nevrex $420M · Monitor closely\n\n' +
        'ACTIONS REQUIRED\n' +
        '  · CRITICAL: Approve emergency Dr. Reddy\'s qualification for Vexorin KSM (CPO, by Fri)\n' +
        '  · HIGH: Build 60-day Lumizap safety stock ahead of May tariff (CFO sign-off)\n' +
        '  · MEDIUM: Schedule on-site audit at Divi\'s Unit II before end of Q2\n\n' +
        'TARIFF EXPOSURE SUMMARY\n' +
        'Under the May USTR proposal, blended COGS increase is +1.9%. Mitigation via\n' +
        'dual-sourcing on tariff-neutral geographies would reduce this to +0.6% but adds\n' +
        '$2.4M in qualification capital over FY26.\n\n' +
        'TREND ANALYSIS\n' +
        'India and China-origin regulatory signals are up 40% vs prior quarter. European and US\n' +
        'sites have been quiet. Weather risk enters its seasonal peak in 3 weeks.\n\n' +
        '— Briefer agent · drafted from 18 material signals, 25 suppliers, and 10 drug products.';
      return {
        agent: AGENTS.briefer,
        title: 'Regenerate executive brief',
        subtitle: 'Draft from every governed signal and action over the last 7 days',
        steps: steps,
        output: output,
      };
    },
  };

  // ── AgentRunner modal ──────────────────────────────────────────────────────
  function AgentRunner() {
    var _t = useState(null); var task = _t[0]; var setTask = _t[1];
    var _open = useState(false); var open = _open[0]; var setOpen = _open[1];
    var _stepIdx = useState(0); var stepIdx = _stepIdx[0]; var setStepIdx = _stepIdx[1];
    var _streamed = useState(''); var streamed = _streamed[0]; var setStreamed = _streamed[1];
    var _phase = useState('steps'); var phase = _phase[0]; var setPhase = _phase[1]; // 'steps' | 'streaming' | 'done'
    var timers = useRef([]);
    var outputRef = useRef(null);

    function clearTimers() { timers.current.forEach(function (t) { clearTimeout(t); }); timers.current = []; }

    function startTask(nextTask) {
      clearTimers();
      setTask(nextTask);
      setStepIdx(0);
      setStreamed('');
      setPhase('steps');
      setOpen(true);

      // Animate steps
      var cumulative = 0;
      nextTask.steps.forEach(function (step, i) {
        cumulative += step.ms || 500;
        timers.current.push(setTimeout(function () {
          setStepIdx(i + 1);
        }, cumulative));
      });
      // Then stream output
      timers.current.push(setTimeout(function () {
        setPhase('streaming');
        streamOutput(nextTask.output);
      }, cumulative + 200));
    }

    function streamOutput(text) {
      var i = 0;
      var CHUNK = 3; // 3 chars per tick
      var TICK = 12; // ms
      function step() {
        i += CHUNK;
        setStreamed(text.slice(0, i));
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
        if (i < text.length) {
          timers.current.push(setTimeout(step, TICK));
        } else {
          setPhase('done');
        }
      }
      step();
    }

    useEffect(function () {
      function handler(e) {
        var detail = e.detail || {};
        var gen = TASKS[detail.taskId];
        if (!gen) { console.warn('[agents] unknown task:', detail.taskId); return; }
        var built = gen(detail.ctx || {});
        startTask(built);
      }
      window.addEventListener('open-agent', handler);
      return function () { window.removeEventListener('open-agent', handler); clearTimers(); };
    }, []);

    function regenerate() {
      if (!task) return;
      // Recreate via the original task id if preserved, else just replay the same built task
      startTask(task);
    }
    function copy() {
      if (!task) return;
      try {
        navigator.clipboard.writeText(streamed || task.output);
        antd.message.success('Copied to clipboard');
      } catch (e) { antd.message.info('Select and copy the text manually'); }
    }
    function close() {
      clearTimers();
      setOpen(false);
      // Leave task state for fade-out
      setTimeout(function () { setTask(null); setStreamed(''); setStepIdx(0); setPhase('steps'); }, 200);
    }

    if (!task) {
      return h(antd.Modal, { open: false, footer: null, onCancel: close });
    }
    var agent = task.agent;

    var headerEl = h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
      h('div', {
        style: {
          width: 40, height: 40, borderRadius: '50%',
          background: agent.color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 18, letterSpacing: -0.5, flexShrink: 0,
        },
      }, agent.initial),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { style: { fontSize: 15, fontWeight: 700, color: '#2E2E38', lineHeight: 1.2 } },
          agent.name, h('span', { style: { fontWeight: 400, color: '#8F8FA3' } }, ' · ', agent.title)
        ),
        h('div', { style: { fontSize: 12, color: '#65657B', marginTop: 2 } }, task.subtitle || agent.tagline)
      ),
      h('div', {
        style: {
          padding: '3px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
          borderRadius: 3, background: agent.bg, color: agent.color, flexShrink: 0,
        }
      }, phase === 'done' ? 'Complete' : phase === 'streaming' ? 'Writing' : 'Thinking')
    );

    return h(antd.Modal, {
      open: open,
      onCancel: close,
      title: headerEl,
      width: 720,
      footer: [
        h(antd.Button, { key: 'regen', onClick: regenerate, disabled: phase !== 'done' }, 'Run again'),
        h(antd.Button, { key: 'copy', onClick: copy, disabled: !streamed }, 'Copy'),
        h(antd.Button, { key: 'close', type: 'primary', onClick: close }, 'Done'),
      ],
      maskClosable: false,
    },
      h('div', { className: 'agent-task-body' },
        // Steps list
        h('div', { className: 'agent-steps' },
          task.steps.map(function (step, i) {
            var state = i < stepIdx ? 'done' : i === stepIdx && phase === 'steps' ? 'running' : 'pending';
            return h('div', { key: i, className: 'agent-step agent-step-' + state },
              h('div', { className: 'agent-step-icon' },
                state === 'done' ? '\u2713' : state === 'running' ? h(antd.Spin, { size: 'small' }) : ''
              ),
              h('div', { className: 'agent-step-body' },
                h('div', { className: 'agent-step-label' }, step.label,
                  step.tool ? h('span', { className: 'agent-step-tool' }, step.tool) : null
                ),
                step.detail && state !== 'pending' ? h('div', { className: 'agent-step-detail' }, step.detail) : null
              )
            );
          })
        ),
        // Output
        phase !== 'steps' ? h('div', { className: 'agent-output-wrap' },
          h('div', { className: 'agent-output-label' },
            h('span', null, 'Output'),
            phase === 'streaming' ? h('span', { className: 'agent-cursor-label' }, 'typing…') : null
          ),
          h('pre', { ref: outputRef, className: 'agent-output' },
            streamed,
            phase === 'streaming' ? h('span', { className: 'agent-cursor' }) : null
          )
        ) : null
      )
    );
  }

  // ── AgentPill · small contextual trigger button ────────────────────────────
  function AgentPill(props) {
    var a = AGENTS[props.agentId];
    if (!a) return null;
    var disabled = !!props.disabled;
    return h('button', {
      type: 'button',
      className: 'agent-pill' + (disabled ? ' agent-pill-disabled' : ''),
      disabled: disabled,
      title: props.tooltip || (a.name + ' · ' + a.tagline),
      style: { '--agent-color': a.color, '--agent-bg': a.bg },
      onClick: function () {
        if (disabled) return;
        window.dispatchEvent(new CustomEvent('open-agent', {
          detail: { taskId: props.taskId, ctx: props.ctx || {} },
        }));
      },
    },
      h('span', { className: 'agent-pill-dot', style: { background: a.color } }, a.initial),
      h('span', { className: 'agent-pill-label' }, props.children || a.name)
    );
  }

  // ── AgentToolbar · labelled row of pills ──────────────────────────────────
  function AgentToolbar(props) {
    return h('div', { className: 'agent-toolbar' },
      h('div', { className: 'agent-toolbar-label' },
        h('span', { className: 'agent-toolbar-label-text' }, props.label || 'Agents'),
        h('span', { className: 'agent-toolbar-label-hint' }, 'specialized · one job each')
      ),
      h('div', { className: 'agent-toolbar-pills' }, props.children)
    );
  }

  // Expose
  window.AgentRunner = AgentRunner;
  window.AgentPill = AgentPill;
  window.AgentToolbar = AgentToolbar;
  window.AGENTS = AGENTS;
})();
