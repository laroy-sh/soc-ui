import { createSortableTable } from '../table.js';
import { getAppState, onStateChange, setFilter } from '../outsourcer-state.js';
import { mockNow, operators, riskEvents } from '../mockData.js';

const operatorById = new Map(operators.map((operator) => [operator.id, operator]));

const TECHNICIAN_FILTER_SET = new Set(['taylor.m', 'r.singh', 'svc-bastion', 'night-shift']);

const TIME_RANGE_MS = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
};

const TIME_RANGE_LABELS = {
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days'
};

const RISK_SCORE_DATA = [
    {
        operatorId: 'op-prov-001',
        baselinePrivActions: 12,
        currentPrivActions: 26,
        distinctSystems: ['Entra ID', 'Privileged Access Workstation', 'Key Vault', 'Policy Engine', 'K8s'],
        anomalyScore: 72,
        severity: 'medium',
        scope: 'privileged',
        environment: 'prod',
        sampleTime: '2026-01-24T09:30:00Z',
        riskTypes: ['policy-change', 'jit-overshoot', 'provider-overlap'],
        ticketLinked: false
    },
    {
        operatorId: 'op-prov-002',
        baselinePrivActions: 9,
        currentPrivActions: 21,
        distinctSystems: ['S3 Logs', 'Data Lake', 'Key Vault', 'Backup Vault'],
        anomalyScore: 81,
        severity: 'high',
        scope: 'privileged',
        environment: 'prod',
        sampleTime: '2026-01-23T18:10:00Z',
        riskTypes: ['mass-delete', 'snapshot-gap', 'policy-change'],
        ticketLinked: false
    },
    {
        operatorId: 'op-prov-003',
        baselinePrivActions: 16,
        currentPrivActions: 19,
        distinctSystems: ['CI Runner', 'Artifact Registry', 'KMS'],
        anomalyScore: 44,
        severity: 'low',
        scope: 'privileged',
        environment: 'dev',
        sampleTime: '2026-01-22T03:10:00Z',
        riskTypes: ['jit-overshoot'],
        ticketLinked: true
    },
    {
        operatorId: 'op-prov-004',
        baselinePrivActions: 10,
        currentPrivActions: 23,
        distinctSystems: ['Patch Orchestrator', 'VM Fleet', 'Config Store'],
        anomalyScore: 68,
        severity: 'high',
        scope: 'privileged',
        environment: 'prod',
        sampleTime: '2026-01-20T16:12:00Z',
        riskTypes: ['patch-drift', 'policy-change'],
        ticketLinked: true
    }
];

const FIRST_TIME_ACTIONS = [
    {
        id: 'fta-001',
        operatorId: 'op-prov-001',
        action: 'Created new CA exclusion group',
        system: 'Entra ID',
        baselineWindow: '0 in last 180d',
        firstSeen: '2026-01-24T08:41:00Z',
        sessionId: 'sess-101',
        scope: 'identity',
        environment: 'prod',
        severity: 'high',
        ticketLinked: false
    },
    {
        id: 'fta-002',
        operatorId: 'op-prov-002',
        action: 'Queued bulk storage delete',
        system: 'S3 Logs',
        baselineWindow: '0 in last 90d',
        firstSeen: '2026-01-23T19:01:00Z',
        sessionId: 'sess-104',
        scope: 'data',
        environment: 'prod',
        severity: 'critical',
        ticketLinked: false
    },
    {
        id: 'fta-003',
        operatorId: 'op-prov-003',
        action: 'Created service principal key',
        system: 'GCP KMS',
        baselineWindow: '0 in last 120d',
        firstSeen: '2026-01-22T03:05:00Z',
        sessionId: 'sess-112',
        scope: 'identity',
        environment: 'dev',
        severity: 'medium',
        ticketLinked: true
    },
    {
        id: 'fta-004',
        operatorId: 'op-prov-004',
        action: 'Applied off-window hotfix',
        system: 'Patch Orchestrator',
        baselineWindow: '0 in last 30d',
        firstSeen: '2026-01-20T16:05:00Z',
        sessionId: 'sess-097',
        scope: 'change',
        environment: 'prod',
        severity: 'high',
        ticketLinked: true
    }
];

const LOCATION_DRIFT = [
    {
        id: 'travel-001',
        operatorId: 'op-prov-001',
        from: 'New York, US',
        to: 'Frankfurt, DE',
        fromTime: '2026-01-24T03:20:00Z',
        toTime: '2026-01-24T07:05:00Z',
        distanceKm: 6200,
        minHours: 7.5,
        observedHours: 3.8,
        scope: 'identity',
        environment: 'prod',
        severity: 'high'
    },
    {
        id: 'travel-002',
        operatorId: 'op-prov-002',
        from: 'Singapore, SG',
        to: 'Los Angeles, US',
        fromTime: '2026-01-23T12:40:00Z',
        toTime: '2026-01-23T16:10:00Z',
        distanceKm: 14100,
        minHours: 15.1,
        observedHours: 3.5,
        scope: 'privileged',
        environment: 'prod',
        severity: 'critical'
    },
    {
        id: 'travel-003',
        operatorId: 'op-prov-004',
        from: 'London, UK',
        to: 'Sao Paulo, BR',
        fromTime: '2026-01-20T11:20:00Z',
        toTime: '2026-01-20T15:05:00Z',
        distanceKm: 9460,
        minHours: 11.2,
        observedHours: 3.7,
        scope: 'change',
        environment: 'prod',
        severity: 'high'
    }
];

const SESSION_CHAINS = [
    {
        sessionId: 'sess-101',
        operatorId: 'op-prov-001',
        startTime: '2026-01-24T08:18:00Z',
        scope: 'identity',
        environment: 'prod',
        ticketLinked: false,
        riskNote: 'Conditional access exclusions expanded without ticket.',
        steps: [
            { label: 'Login', time: '2026-01-24T08:18:00Z', detail: 'MFA from NA region' },
            { label: 'Elevation', time: '2026-01-24T08:20:00Z', detail: 'Privileged Role Admin (2h)' },
            { label: 'Key Creation', time: '2026-01-24T08:24:00Z', detail: 'New app secret (180d)' },
            { label: 'Data Access', time: '2026-01-24T08:31:00Z', detail: 'Downloaded 4 CA policy objects' }
        ]
    },
    {
        sessionId: 'sess-104',
        operatorId: 'op-prov-002',
        startTime: '2026-01-23T18:55:00Z',
        scope: 'data',
        environment: 'prod',
        ticketLinked: false,
        riskNote: 'Bulk delete queued after elevation.',
        steps: [
            { label: 'Login', time: '2026-01-23T18:55:00Z', detail: 'SSO from APAC' },
            { label: 'Elevation', time: '2026-01-23T18:57:00Z', detail: 'Storage Admin (90m)' },
            { label: 'Key Creation', time: '2026-01-23T18:59:00Z', detail: 'KMS key alias created' },
            { label: 'Data Access', time: '2026-01-23T19:05:00Z', detail: '48 storage containers targeted' }
        ]
    },
    {
        sessionId: 'sess-097',
        operatorId: 'op-prov-004',
        startTime: '2026-01-20T16:00:00Z',
        scope: 'change',
        environment: 'prod',
        ticketLinked: true,
        riskNote: 'Hotfix applied outside approved window.',
        steps: [
            { label: 'Login', time: '2026-01-20T16:00:00Z', detail: 'PAM jump host' },
            { label: 'Elevation', time: '2026-01-20T16:02:00Z', detail: 'Patch Operator (60m)' },
            { label: 'Key Creation', time: '2026-01-20T16:08:00Z', detail: 'Temporary signing key' },
            { label: 'Data Access', time: '2026-01-20T16:12:00Z', detail: 'Config store read + patch apply' }
        ]
    }
];

function getNowMs() {
    const parsed = Date.parse(mockNow);
    return Number.isNaN(parsed) ? Date.now() : parsed;
}

function getTimeRange(filters) {
    const rangeMs = TIME_RANGE_MS[filters.timeRange] || TIME_RANGE_MS['7d'];
    const end = getNowMs();
    return {
        start: end - rangeMs,
        end
    };
}

function formatDateTime(value) {
    if (!value) {
        return '--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '--';
    }
    return `${date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
    })} UTC`;
}

function formatLabel(value) {
    if (!value) {
        return '--';
    }
    return value
        .toString()
        .replace(/-/g, ' ')
        .replace(/(^|\s)\w/g, (char) => char.toUpperCase());
}

function formatHours(value) {
    if (value == null || Number.isNaN(value)) {
        return '--';
    }
    return `${value.toFixed(1)}h`;
}

function formatDistance(km) {
    if (km == null || Number.isNaN(km)) {
        return '--';
    }
    return `${Math.round(km).toLocaleString('en-US')} km`;
}

function getOperator(operatorId) {
    return operatorById.get(operatorId) || null;
}

function applyTechnicianFilter(operatorId) {
    const operator = getOperator(operatorId);
    if (!operator?.technician) {
        return;
    }
    if (TECHNICIAN_FILTER_SET.has(operator.technician)) {
        setFilter('technician', operator.technician);
    }
}

function matchesFilters(item, filters, timeKey) {
    const { start, end } = getTimeRange(filters);
    const timestamp = timeKey ? Date.parse(item[timeKey]) : Date.parse(item.sampleTime || item.firstSeen || item.startTime || item.fromTime || item.toTime || '');
    if (!Number.isNaN(timestamp) && (timestamp < start || timestamp > end)) {
        return false;
    }

    const operator = getOperator(item.operatorId);
    if (filters.providerTeam !== 'all' && operator?.providerTeam !== filters.providerTeam) {
        return false;
    }
    if (filters.technician !== 'all' && operator?.technician !== filters.technician) {
        return false;
    }
    if (filters.actorType !== 'all' && operator?.actorType !== filters.actorType) {
        return false;
    }
    if (filters.scope !== 'all' && item.scope && item.scope !== filters.scope) {
        return false;
    }
    if (filters.environment !== 'all' && item.environment && item.environment !== filters.environment) {
        return false;
    }
    if (filters.ticketLinkage !== 'all' && item.ticketLinked !== undefined) {
        if (filters.ticketLinkage === 'linked' && !item.ticketLinked) {
            return false;
        }
        if (filters.ticketLinkage === 'unlinked' && item.ticketLinked) {
            return false;
        }
    }
    if (filters.severity !== 'all') {
        const severity = item.severity || item.riskRating;
        if (!severity || severity !== filters.severity) {
            return false;
        }
    }
    return true;
}

function buildOperatorCell(operator) {
    const wrapper = document.createElement('div');
    wrapper.className = 'operator-cell';

    const name = document.createElement('span');
    name.textContent = operator?.name || '--';

    const meta = document.createElement('span');
    meta.className = 'operator-meta';
    if (operator) {
        meta.textContent = `${formatLabel(operator.affiliation)} | ${operator.providerTeam} | ${operator.region}`;
    } else {
        meta.textContent = '--';
    }

    wrapper.appendChild(name);
    wrapper.appendChild(meta);
    return wrapper;
}

function buildDeltaCell(baseline, current, label) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cell-stack';

    const main = document.createElement('span');
    main.textContent = `${baseline} -> ${current}`;
    const delta = current - baseline;
    const deltaLabel = `${delta > 0 ? '+' : ''}${delta}`;

    const sub = document.createElement('span');
    sub.className = 'cell-sub';
    sub.textContent = `${label} ${deltaLabel}`;

    wrapper.appendChild(main);
    wrapper.appendChild(sub);
    return wrapper;
}

function buildSystemsCell(systems = []) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cell-stack';

    const main = document.createElement('span');
    main.textContent = `${systems.length}`;

    const sub = document.createElement('span');
    sub.className = 'cell-sub';
    sub.textContent = systems.length ? systems.join(', ') : '--';

    wrapper.appendChild(main);
    wrapper.appendChild(sub);
    return wrapper;
}

function buildRiskTypesCell(types) {
    if (!types || types.length === 0) {
        const empty = document.createElement('span');
        empty.textContent = '--';
        return empty;
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'action-tags';
    types.forEach((type) => {
        const tag = document.createElement('span');
        tag.className = 'action-tag';
        tag.textContent = formatLabel(type);
        wrapper.appendChild(tag);
    });
    return wrapper;
}

function buildScoreCell(score, severity) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cell-stack';

    const main = document.createElement('span');
    main.className = 'ueba-score';
    main.textContent = `${score}`;

    const chip = document.createElement('span');
    chip.className = `ueba-score-chip ueba-score-chip--${severity || 'low'}`;
    chip.textContent = severity ? formatLabel(severity) : 'Low';

    wrapper.appendChild(main);
    wrapper.appendChild(chip);
    return wrapper;
}

function buildRouteVisual(from, to) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ueba-route';

    const fromLabel = document.createElement('span');
    fromLabel.textContent = from;
    fromLabel.className = 'ueba-route-label';

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    line.setAttribute('viewBox', '0 0 80 6');
    line.classList.add('ueba-route-line');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    path.setAttribute('x1', '4');
    path.setAttribute('y1', '3');
    path.setAttribute('x2', '76');
    path.setAttribute('y2', '3');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    line.appendChild(path);

    const toLabel = document.createElement('span');
    toLabel.textContent = to;
    toLabel.className = 'ueba-route-label';

    wrapper.appendChild(fromLabel);
    wrapper.appendChild(line);
    wrapper.appendChild(toLabel);
    return wrapper;
}

function buildRouteCell(entry) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cell-stack';

    const route = document.createElement('div');
    route.className = 'ueba-route-wrap';
    route.appendChild(buildRouteVisual(entry.from, entry.to));

    const meta = document.createElement('span');
    meta.className = 'cell-sub';
    meta.textContent = `${formatDistance(entry.distanceKm)} • min ${formatHours(entry.minHours)} vs observed ${formatHours(entry.observedHours)}`;

    wrapper.appendChild(route);
    wrapper.appendChild(meta);
    return wrapper;
}

function resolveRiskTypes(operatorId, filters, fallback) {
    const types = new Set();
    riskEvents.forEach((event) => {
        if (event.operatorId === operatorId && matchesFilters(event, filters, 'timestamp')) {
            types.add(event.riskType);
        }
    });
    const list = [...types];
    return list.length ? list : fallback || [];
}

function buildSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'ueba-session';

    const header = document.createElement('div');
    header.className = 'ueba-session-header';

    const title = document.createElement('div');
    title.className = 'ueba-session-title';

    const id = document.createElement('span');
    id.className = 'ueba-session-id';
    id.textContent = session.sessionId;

    const operator = getOperator(session.operatorId);
    const operatorName = document.createElement('button');
    operatorName.type = 'button';
    operatorName.className = 'ueba-operator-button';
    operatorName.textContent = operator?.name || 'Unknown operator';
    operatorName.addEventListener('click', () => applyTechnicianFilter(session.operatorId));

    const time = document.createElement('span');
    time.className = 'cell-sub';
    time.textContent = formatDateTime(session.startTime);

    title.appendChild(operatorName);
    title.appendChild(id);
    title.appendChild(time);

    const actions = document.createElement('div');
    actions.className = 'ueba-session-actions';

    const drilldown = document.createElement('button');
    drilldown.type = 'button';
    drilldown.className = 'control-chip control-chip--button';
    drilldown.textContent = 'Open operator timeline';
    drilldown.addEventListener('click', () => {
        applyTechnicianFilter(session.operatorId);
        window.location.hash = '#/drilldown/operator-timeline';
    });

    const ticket = document.createElement('span');
    ticket.className = `table-badge ${session.ticketLinked ? 'table-badge-success' : 'table-badge-no-ticket'}`;
    ticket.textContent = session.ticketLinked ? 'Ticket linked' : 'No ticket';

    actions.appendChild(ticket);
    actions.appendChild(drilldown);

    header.appendChild(title);
    header.appendChild(actions);

    const summary = document.createElement('div');
    summary.className = 'ueba-chain-summary';
    summary.textContent = session.steps.map((step) => step.label).join(' -> ');

    const note = document.createElement('div');
    note.className = 'ueba-session-note';
    note.textContent = session.riskNote;

    const steps = document.createElement('div');
    steps.className = 'ueba-chain-steps';

    session.steps.forEach((step) => {
        const item = document.createElement('div');
        item.className = 'ueba-chain-step';

        const label = document.createElement('div');
        label.className = 'ueba-chain-label';
        label.textContent = step.label;

        const detail = document.createElement('div');
        detail.className = 'ueba-chain-detail';
        detail.textContent = step.detail;

        const timeLabel = document.createElement('div');
        timeLabel.className = 'cell-sub';
        timeLabel.textContent = formatDateTime(step.time);

        item.appendChild(label);
        item.appendChild(detail);
        item.appendChild(timeLabel);
        steps.appendChild(item);
    });

    card.appendChild(header);
    card.appendChild(summary);
    card.appendChild(note);
    card.appendChild(steps);
    return card;
}

export function buildUebaView() {
    const wrapper = document.createElement('div');
    wrapper.className = 'ueba-shell';

    const banner = document.createElement('section');
    banner.className = 'ueba-banner';

    const bannerTitle = document.createElement('h3');
    bannerTitle.textContent = 'Outsourcer Insider Lens';
    const bannerSubtitle = document.createElement('p');
    bannerSubtitle.textContent =
        'Abnormal operator behavior patterns with baseline deltas, first-time actions, and session chains.';

    const bannerMeta = document.createElement('div');
    bannerMeta.className = 'ueba-banner-meta';
    const filterChip = document.createElement('span');
    filterChip.className = 'control-chip';
    const rangeChip = document.createElement('span');
    rangeChip.className = 'control-chip';
    bannerMeta.appendChild(filterChip);
    bannerMeta.appendChild(rangeChip);

    banner.appendChild(bannerTitle);
    banner.appendChild(bannerSubtitle);
    banner.appendChild(bannerMeta);

    const topGrid = document.createElement('div');
    topGrid.className = 'ueba-grid';

    const riskCard = document.createElement('section');
    riskCard.className = 'table-card ueba-card';
    const riskHeader = document.createElement('div');
    riskHeader.className = 'ueba-card-header';
    const riskHeading = document.createElement('div');
    const riskTitle = document.createElement('h3');
    riskTitle.textContent = 'Technician Risk Scoring Board';
    const riskSubtitle = document.createElement('p');
    riskSubtitle.textContent =
        'Privileged activity deltas vs 7d baseline and composite anomaly scoring.';
    riskHeading.appendChild(riskTitle);
    riskHeading.appendChild(riskSubtitle);
    const riskMeta = document.createElement('div');
    riskMeta.className = 'ueba-card-meta';
    const riskCountChip = document.createElement('span');
    riskCountChip.className = 'control-chip';
    const riskDeltaChip = document.createElement('span');
    riskDeltaChip.className = 'control-chip';
    riskMeta.appendChild(riskCountChip);
    riskMeta.appendChild(riskDeltaChip);
    riskHeader.appendChild(riskHeading);
    riskHeader.appendChild(riskMeta);
    const riskTableWrap = document.createElement('div');
    riskTableWrap.className = 'table-scroll';
    riskCard.appendChild(riskHeader);
    riskCard.appendChild(riskTableWrap);

    const firstTimeCard = document.createElement('section');
    firstTimeCard.className = 'table-card ueba-card';
    const firstHeader = document.createElement('div');
    firstHeader.className = 'ueba-card-header';
    const firstHeading = document.createElement('div');
    const firstTitle = document.createElement('h3');
    firstTitle.textContent = 'First-time Actions';
    const firstSubtitle = document.createElement('p');
    firstSubtitle.textContent =
        'Operations that have no prior baseline within the lookback window.';
    firstHeading.appendChild(firstTitle);
    firstHeading.appendChild(firstSubtitle);
    const firstMeta = document.createElement('div');
    firstMeta.className = 'ueba-card-meta';
    const firstCountChip = document.createElement('span');
    firstCountChip.className = 'control-chip';
    const firstWindowChip = document.createElement('span');
    firstWindowChip.className = 'control-chip';
    firstMeta.appendChild(firstCountChip);
    firstMeta.appendChild(firstWindowChip);
    firstHeader.appendChild(firstHeading);
    firstHeader.appendChild(firstMeta);
    const firstTableWrap = document.createElement('div');
    firstTableWrap.className = 'table-scroll';
    firstTimeCard.appendChild(firstHeader);
    firstTimeCard.appendChild(firstTableWrap);

    topGrid.appendChild(riskCard);
    topGrid.appendChild(firstTimeCard);

    const bottomGrid = document.createElement('div');
    bottomGrid.className = 'ueba-grid ueba-grid--wide';

    const travelCard = document.createElement('section');
    travelCard.className = 'table-card ueba-card';
    const travelHeader = document.createElement('div');
    travelHeader.className = 'ueba-card-header';
    const travelHeading = document.createElement('div');
    const travelTitle = document.createElement('h3');
    travelTitle.textContent = 'Impossible Travel / Location Drift';
    const travelSubtitle = document.createElement('p');
    travelSubtitle.textContent =
        'Suspicious geo sequences where observed travel time breaks physical limits.';
    travelHeading.appendChild(travelTitle);
    travelHeading.appendChild(travelSubtitle);
    const travelMeta = document.createElement('div');
    travelMeta.className = 'ueba-card-meta';
    const travelCountChip = document.createElement('span');
    travelCountChip.className = 'control-chip';
    travelMeta.appendChild(travelCountChip);
    travelHeader.appendChild(travelHeading);
    travelHeader.appendChild(travelMeta);
    const travelTableWrap = document.createElement('div');
    travelTableWrap.className = 'table-scroll';
    travelCard.appendChild(travelHeader);
    travelCard.appendChild(travelTableWrap);

    const sessionCard = document.createElement('section');
    sessionCard.className = 'ueba-session-card';
    const sessionHeader = document.createElement('div');
    sessionHeader.className = 'ueba-card-header';
    const sessionHeading = document.createElement('div');
    const sessionTitle = document.createElement('h3');
    sessionTitle.textContent = 'Session Chaining';
    const sessionSubtitle = document.createElement('p');
    sessionSubtitle.textContent =
        'Grouped by session id. Click to open the operator timeline drilldown.';
    sessionHeading.appendChild(sessionTitle);
    sessionHeading.appendChild(sessionSubtitle);
    const sessionMeta = document.createElement('div');
    sessionMeta.className = 'ueba-card-meta';
    const sessionCountChip = document.createElement('span');
    sessionCountChip.className = 'control-chip';
    sessionMeta.appendChild(sessionCountChip);
    sessionHeader.appendChild(sessionHeading);
    sessionHeader.appendChild(sessionMeta);
    const sessionList = document.createElement('div');
    sessionList.className = 'ueba-session-list';
    sessionCard.appendChild(sessionHeader);
    sessionCard.appendChild(sessionList);

    bottomGrid.appendChild(travelCard);
    bottomGrid.appendChild(sessionCard);

    wrapper.appendChild(banner);
    wrapper.appendChild(topGrid);
    wrapper.appendChild(bottomGrid);

    function render(state) {
        const { filters } = state;

        const operatorFilter = filters.technician === 'all' ? 'All operators' : `Technician: ${filters.technician}`;
        filterChip.textContent = operatorFilter;
        rangeChip.textContent = TIME_RANGE_LABELS[filters.timeRange] || 'Last 7 days';

        const filteredScores = RISK_SCORE_DATA.filter((item) => matchesFilters(item, filters, 'sampleTime'));
        riskCountChip.textContent = `${filteredScores.length} technicians`;
        riskDeltaChip.textContent = 'Baseline vs now';

        const riskRows = filteredScores.map((item) => {
            const operator = getOperator(item.operatorId);
            return {
                technician: { operator, sortValue: operator?.name || '' },
                actions: {
                    baseline: item.baselinePrivActions,
                    current: item.currentPrivActions,
                    sortValue: item.currentPrivActions
                },
                systems: {
                    systems: item.distinctSystems,
                    sortValue: item.distinctSystems.length
                },
                riskTypes: {
                    types: resolveRiskTypes(item.operatorId, filters, item.riskTypes),
                    sortValue: item.riskTypes?.length || 0
                },
                score: {
                    score: item.anomalyScore,
                    severity: item.severity,
                    sortValue: item.anomalyScore
                },
                _meta: { operatorId: item.operatorId }
            };
        });

        const riskTable = createSortableTable({
            columns: [
                {
                    key: 'technician',
                    label: 'Technician',
                    render: (value) => buildOperatorCell(value.operator)
                },
                {
                    key: 'actions',
                    label: 'Privileged actions (7d)',
                    render: (value) => buildDeltaCell(value.baseline, value.current, 'Delta'),
                    numeric: true
                },
                {
                    key: 'systems',
                    label: 'Distinct systems touched',
                    render: (value) => buildSystemsCell(value.systems),
                    numeric: true
                },
                {
                    key: 'riskTypes',
                    label: 'Risk event types triggered',
                    render: (value) => buildRiskTypesCell(value.types)
                },
                {
                    key: 'score',
                    label: 'Composite anomaly score',
                    render: (value) => buildScoreCell(value.score, value.severity),
                    numeric: true
                }
            ],
            rows: riskRows,
            onRowClick: (row) => applyTechnicianFilter(row._meta.operatorId),
            initialSort: { key: 'score', direction: 'desc' }
        });

        riskTableWrap.innerHTML = '';
        riskTableWrap.appendChild(riskTable);

        const filteredFirstTime = FIRST_TIME_ACTIONS.filter((item) =>
            matchesFilters(item, filters, 'firstSeen')
        );
        firstCountChip.textContent = `${filteredFirstTime.length} first-time events`;
        firstWindowChip.textContent = 'Baseline = 0';

        const firstRows = filteredFirstTime.map((item) => {
            const operator = getOperator(item.operatorId);
            return {
                technician: { operator, sortValue: operator?.name || '' },
                action: { action: item.action, system: item.system, sortValue: item.action },
                baseline: { baselineWindow: item.baselineWindow, sortValue: 0 },
                firstSeen: { value: item.firstSeen, sortValue: Date.parse(item.firstSeen) },
                ticket: item.ticketLinked
                    ? { badge: 'success', label: 'Linked' }
                    : { badge: 'no-ticket', label: 'No ticket' },
                _meta: { operatorId: item.operatorId }
            };
        });

        const firstTable = createSortableTable({
            columns: [
                {
                    key: 'technician',
                    label: 'Technician',
                    render: (value) => buildOperatorCell(value.operator)
                },
                {
                    key: 'action',
                    label: 'First-time action',
                    render: (value) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'cell-stack';
                        const main = document.createElement('span');
                        main.textContent = value.action;
                        const sub = document.createElement('span');
                        sub.className = 'cell-sub';
                        sub.textContent = value.system;
                        wrapper.appendChild(main);
                        wrapper.appendChild(sub);
                        return wrapper;
                    }
                },
                {
                    key: 'baseline',
                    label: 'Prior baseline',
                    render: (value) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'cell-stack';
                        const main = document.createElement('span');
                        main.textContent = '0 -> 1';
                        const sub = document.createElement('span');
                        sub.className = 'cell-sub';
                        sub.textContent = value.baselineWindow;
                        wrapper.appendChild(main);
                        wrapper.appendChild(sub);
                        return wrapper;
                    },
                    numeric: true
                },
                {
                    key: 'firstSeen',
                    label: 'First seen (UTC)',
                    render: (value) => document.createTextNode(formatDateTime(value.value))
                },
                {
                    key: 'ticket',
                    label: 'Ticket linkage',
                    sortable: false
                }
            ],
            rows: firstRows,
            onRowClick: (row) => applyTechnicianFilter(row._meta.operatorId),
            initialSort: { key: 'firstSeen', direction: 'desc' }
        });

        firstTableWrap.innerHTML = '';
        firstTableWrap.appendChild(firstTable);

        const filteredTravel = LOCATION_DRIFT.filter((item) =>
            matchesFilters(item, filters, 'toTime')
        );
        travelCountChip.textContent = `${filteredTravel.length} sequences`;

        const travelRows = filteredTravel.map((item) => {
            const operator = getOperator(item.operatorId);
            return {
                technician: { operator, sortValue: operator?.name || '' },
                route: { entry: item, sortValue: item.distanceKm },
                gap: {
                    observed: item.observedHours,
                    min: item.minHours,
                    sortValue: item.observedHours
                },
                window: { from: item.fromTime, to: item.toTime, sortValue: Date.parse(item.toTime) },
                _meta: { operatorId: item.operatorId }
            };
        });

        const travelTable = createSortableTable({
            columns: [
                {
                    key: 'technician',
                    label: 'Technician',
                    render: (value) => buildOperatorCell(value.operator)
                },
                {
                    key: 'route',
                    label: 'Suspicious sequence',
                    render: (value) => buildRouteCell(value.entry)
                },
                {
                    key: 'gap',
                    label: 'Observed gap',
                    render: (value) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'cell-stack';
                        const main = document.createElement('span');
                        main.textContent = `${formatHours(value.observed)} observed`;
                        const sub = document.createElement('span');
                        sub.className = 'cell-sub';
                        sub.textContent = `${formatHours(value.min)} minimum`;
                        wrapper.appendChild(main);
                        wrapper.appendChild(sub);
                        return wrapper;
                    },
                    numeric: true
                },
                {
                    key: 'window',
                    label: 'Window (UTC)',
                    render: (value) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'cell-stack';
                        const main = document.createElement('span');
                        main.textContent = formatDateTime(value.from);
                        const sub = document.createElement('span');
                        sub.className = 'cell-sub';
                        sub.textContent = `-> ${formatDateTime(value.to)}`;
                        wrapper.appendChild(main);
                        wrapper.appendChild(sub);
                        return wrapper;
                    }
                }
            ],
            rows: travelRows,
            onRowClick: (row) => applyTechnicianFilter(row._meta.operatorId),
            initialSort: { key: 'gap', direction: 'asc' }
        });

        travelTableWrap.innerHTML = '';
        travelTableWrap.appendChild(travelTable);

        const filteredSessions = SESSION_CHAINS.filter((item) =>
            matchesFilters(item, filters, 'startTime')
        );
        sessionCountChip.textContent = `${filteredSessions.length} sessions`;

        sessionList.innerHTML = '';
        if (filteredSessions.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'ueba-session-empty';
            empty.textContent = 'No session chains match the current filters.';
            sessionList.appendChild(empty);
        } else {
            filteredSessions.forEach((session) => {
                sessionList.appendChild(buildSessionCard(session));
            });
        }
    }

    render(getAppState());
    onStateChange(render);

    return wrapper;
}
