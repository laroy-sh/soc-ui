import { createKpiTile } from '../tiles.js';
import { createSortableTable } from '../table.js';
import { createProofPanel } from '../proofPanel.js';
import {
    getAppState,
    onStateChange,
    setFilter,
    setSelectedTimeWindow
} from '../outsourcer-state.js';
import {
    mockNow,
    operators,
    changeEvents,
    riskEvents,
    controlTamperingAttempts
} from '../mockData.js';

const operatorById = new Map(operators.map((operator) => [operator.id, operator]));

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

const LEDGER_TABS = [
    { id: 'identity-access', label: 'Identity & Access' },
    { id: 'network-exposure', label: 'Network Exposure' },
    { id: 'data-security', label: 'Data Security' },
    { id: 'monitoring-controls', label: 'Monitoring & Controls' },
    { id: 'destructive-actions', label: 'Destructive Actions' }
];

const TAB_PARAM = 'ledgerTab';
const DEFAULT_TAB = LEDGER_TABS[0].id;

const CATEGORY_LABELS = LEDGER_TABS.reduce((acc, tab) => {
    acc[tab.id] = tab.label;
    return acc;
}, {});

const RISK_ORDER = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
};

const RISK_STATE = {
    critical: 'open',
    high: 'review',
    medium: 'monitoring',
    low: 'closed'
};

const RISK_RESOURCES = {
    'policy-change': 'Conditional Access Policies',
    'mass-delete': 'Storage containers (48)',
    'automation-burst': 'Privileged session broker',
    'patch-drift': 'Production patch cadence',
    'snapshot-gap': 'Backup snapshot coverage',
    'jit-overshoot': 'JIT elevation controller',
    'provider-overlap': 'Provider admin policy',
    'break-glass': 'Break-glass account'
};

const RISK_BEFORE_AFTER = {
    'policy-change': {
        before: 'Baseline enforcement',
        after: 'Legacy admin exclusions'
    },
    'mass-delete': {
        before: 'Retention hold in place',
        after: 'Delete queue initiated'
    },
    'automation-burst': {
        before: '2 sessions/hour',
        after: '12 sessions in 20m'
    },
    'patch-drift': {
        before: 'Approved patch window',
        after: 'Off-cycle hotfix'
    },
    'snapshot-gap': {
        before: 'Daily snapshots',
        after: '2 clusters missed'
    },
    'jit-overshoot': {
        before: '60m max elevation',
        after: '120m elevation'
    },
    'provider-overlap': {
        before: 'Single admin owner',
        after: 'Dual admin edits'
    },
    'break-glass': {
        before: 'Emergency-only use',
        after: 'Off-window access'
    }
};

const SUPPLEMENTAL_EVENTS = [
    {
        id: 'supp-001',
        operatorId: 'op-prov-004',
        timestamp: '2026-01-22T09:15:00Z',
        categoryId: 'network-exposure',
        changeCategory: 'public ingress',
        resourceId: 'res-k8s-ing-044',
        resourceName: 'Kubernetes Ingress - Payments API',
        before: {
            exposure: 'internal-only',
            auth: 'mTLS'
        },
        after: {
            exposure: 'public',
            auth: 'ip-allowlist'
        },
        riskRating: 'high',
        severity: 'high',
        ticketLinked: false,
        ticketId: null,
        currentState: 'open',
        scope: 'change',
        environment: 'prod',
        exposureTags: ['public-endpoint', 'unauthenticated']
    },
    {
        id: 'supp-002',
        operatorId: 'op-int-002',
        timestamp: '2026-01-19T16:40:00Z',
        categoryId: 'network-exposure',
        changeCategory: 'firewall allowlist',
        resourceId: 'res-fw-009',
        resourceName: 'Edge Firewall Allowlist',
        before: {
            allowlist: 12,
            geoFence: 'US-only'
        },
        after: {
            allowlist: 0,
            geoFence: 'global'
        },
        riskRating: 'medium',
        severity: 'medium',
        ticketLinked: true,
        ticketId: 'CHG-1057',
        currentState: 'review',
        scope: 'change',
        environment: 'prod',
        exposureTags: ['public-endpoint']
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

function formatInlineValue(value) {
    if (value == null) {
        return '--';
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

function truncate(value, max = 42) {
    if (!value) {
        return value;
    }
    if (value.length <= max) {
        return value;
    }
    return `${value.slice(0, max - 3)}...`;
}

function summarizeDiff(before, after, fallback) {
    if (before == null && after == null) {
        return fallback || '--';
    }
    if (typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) || Array.isArray(after)) {
        return `${truncate(formatInlineValue(before))} -> ${truncate(formatInlineValue(after))}`;
    }

    const keys = new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {})
    ]);
    const changes = [];
    keys.forEach((key) => {
        const beforeValue = before ? before[key] : undefined;
        const afterValue = after ? after[key] : undefined;
        if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
            return;
        }
        changes.push(
            `${key}: ${truncate(formatInlineValue(beforeValue))} -> ${truncate(
                formatInlineValue(afterValue)
            )}`
        );
    });
    if (changes.length === 0) {
        return fallback || 'No delta captured';
    }
    const summary = changes.slice(0, 2).join('; ');
    if (changes.length > 2) {
        return `${summary} +${changes.length - 2} more`;
    }
    return summary;
}

function getCategoryIdForChange(change) {
    const name = (change.resourceName || '').toLowerCase();
    if (change.changeType === 'emergency-disable') {
        return 'destructive-actions';
    }
    if (
        change.changeType === 'role-permission' ||
        name.includes('conditional access') ||
        name.includes('mfa') ||
        name.includes('iam') ||
        name.includes('okta') ||
        name.includes('entra')
    ) {
        return 'identity-access';
    }
    if (change.changeType === 'key-rotation' || name.includes('kms') || name.includes('key')) {
        return 'data-security';
    }
    if (name.includes('audit') || name.includes('logging') || name.includes('guardrail')) {
        return 'monitoring-controls';
    }
    return 'monitoring-controls';
}

function getCategoryIdForRisk(risk) {
    if (risk.riskType === 'mass-delete') {
        return 'destructive-actions';
    }
    if (risk.scope === 'identity') {
        return 'identity-access';
    }
    if (risk.scope === 'data') {
        return 'data-security';
    }
    if (risk.scope === 'privileged') {
        return 'identity-access';
    }
    return 'monitoring-controls';
}

function getCategoryIdForTamper(tamper) {
    if (tamper.method === 'service-stop' || tamper.method === 'policy-disable') {
        return 'destructive-actions';
    }
    if (tamper.scope === 'identity') {
        return 'identity-access';
    }
    if (tamper.scope === 'data') {
        return 'data-security';
    }
    return 'monitoring-controls';
}

function buildEvidence(entry, operator) {
    const refBase = (entry.id || 'ledger').toUpperCase();
    const ticketLabel = entry.ticketLinked
        ? `Ticket ${entry.ticketId || refBase}`
        : 'No ticket record';
    return {
        logRef: `AUD-${refBase}`,
        snapshotRef: `CFG-${refBase}`,
        approval: ticketLabel,
        attestation: operator?.affiliation === 'provider' ? 'Provider attestation pending' : 'Customer validated'
    };
}

function buildChangeEntry(change) {
    const categoryId = getCategoryIdForChange(change);
    return {
        id: change.id,
        type: 'change',
        operatorId: change.operatorId,
        timestamp: change.timestamp,
        categoryId,
        categoryLabel: CATEGORY_LABELS[categoryId],
        changeCategory: change.changeType,
        resourceId: change.resourceId,
        resourceName: change.resourceName,
        before: change.before,
        after: change.after,
        summary: summarizeDiff(change.before, change.after),
        riskRating: change.riskRating || change.severity || 'medium',
        severity: change.severity || change.riskRating || 'medium',
        ticketLinked: change.ticketLinked,
        ticketId: change.ticketId,
        currentState: change.currentState || RISK_STATE[change.severity] || 'review',
        scope: change.scope,
        environment: change.environment,
        exposureTags: buildExposureTags(categoryId, change)
    };
}

function buildRiskEntry(risk) {
    const categoryId = getCategoryIdForRisk(risk);
    const beforeAfter = RISK_BEFORE_AFTER[risk.riskType] || {};
    const riskState = RISK_STATE[risk.severity] || 'monitoring';
    return {
        id: risk.id,
        type: 'risk',
        operatorId: risk.operatorId,
        timestamp: risk.timestamp,
        categoryId,
        categoryLabel: CATEGORY_LABELS[categoryId],
        changeCategory: risk.riskType,
        resourceId: risk.sessionId || risk.riskType,
        resourceName: RISK_RESOURCES[risk.riskType] || 'Risk signal',
        before: beforeAfter.before || 'Baseline',
        after: beforeAfter.after || risk.summary,
        summary: summarizeDiff(beforeAfter.before, beforeAfter.after, risk.summary),
        riskRating: risk.severity,
        severity: risk.severity,
        ticketLinked: risk.ticketLinked,
        ticketId: risk.ticketId,
        currentState: riskState,
        scope: risk.scope,
        environment: risk.environment,
        exposureTags: buildExposureTags(categoryId, risk),
        sessionId: risk.sessionId
    };
}

function buildTamperEntry(tamper) {
    const categoryId = getCategoryIdForTamper(tamper);
    const riskState = RISK_STATE[tamper.severity] || 'review';
    return {
        id: tamper.id,
        type: 'tamper',
        operatorId: tamper.operatorId,
        timestamp: tamper.timestamp,
        categoryId,
        categoryLabel: CATEGORY_LABELS[categoryId],
        changeCategory: `control ${tamper.method}`,
        resourceId: tamper.control,
        resourceName: tamper.control,
        before: 'Control active',
        after: formatLabel(tamper.method),
        summary: summarizeDiff('Control active', formatLabel(tamper.method), tamper.method),
        riskRating: tamper.severity,
        severity: tamper.severity,
        ticketLinked: tamper.ticketLinked,
        ticketId: tamper.ticketId,
        currentState: riskState,
        scope: tamper.scope,
        environment: tamper.environment,
        exposureTags: buildExposureTags(categoryId, tamper)
    };
}

function buildSupplementalEntry(supplemental) {
    return {
        ...supplemental,
        categoryLabel: CATEGORY_LABELS[supplemental.categoryId],
        summary: summarizeDiff(supplemental.before, supplemental.after)
    };
}

function buildExposureTags(categoryId, entry) {
    const tags = new Set(entry.exposureTags || []);
    if (categoryId === 'network-exposure') {
        tags.add('public-endpoint');
    }
    if (categoryId === 'identity-access' && ['critical', 'high'].includes(entry.severity || entry.riskRating)) {
        tags.add('external-admin');
    }
    if (categoryId === 'data-security' && ['critical', 'high'].includes(entry.severity || entry.riskRating)) {
        tags.add('data-exfil');
    }
    if (categoryId === 'destructive-actions') {
        tags.add('destructive');
    }
    return Array.from(tags);
}

function finalizeEntry(entry) {
    const operator = operatorById.get(entry.operatorId) || null;
    const timestampMs = Date.parse(entry.timestamp);
    const riskRating = entry.riskRating || 'medium';
    const currentState = entry.currentState || RISK_STATE[riskRating] || 'review';
    const stillExposed = currentState !== 'closed';
    return {
        ...entry,
        operator,
        timestampMs: Number.isNaN(timestampMs) ? null : timestampMs,
        riskRating,
        currentState,
        stillExposed,
        evidence: entry.evidence || buildEvidence(entry, operator)
    };
}

const LEDGER_ENTRIES = [
    ...changeEvents.map(buildChangeEntry),
    ...riskEvents.map(buildRiskEntry),
    ...controlTamperingAttempts.map(buildTamperEntry),
    ...SUPPLEMENTAL_EVENTS.map(buildSupplementalEntry)
].map(finalizeEntry);

function getTabFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get(TAB_PARAM);
    if (LEDGER_TABS.some((item) => item.id === tab)) {
        return tab;
    }
    return DEFAULT_TAB;
}

function setTabInUrl(tabId) {
    const url = new URL(window.location.href);
    if (!tabId || tabId === DEFAULT_TAB) {
        url.searchParams.delete(TAB_PARAM);
    } else {
        url.searchParams.set(TAB_PARAM, tabId);
    }
    history.replaceState({}, '', url);
}

function matchesFilters(entry, filters, range) {
    if (range && entry.timestampMs != null) {
        if (entry.timestampMs < range.start || entry.timestampMs > range.end) {
            return false;
        }
    }

    const operator = entry.operator;
    if (filters.providerTeam !== 'all' && operator?.providerTeam !== filters.providerTeam) {
        return false;
    }
    if (filters.technician !== 'all' && operator?.technician !== filters.technician) {
        return false;
    }
    if (filters.actorType !== 'all' && operator?.actorType !== filters.actorType) {
        return false;
    }
    if (filters.scope !== 'all' && entry.scope !== filters.scope) {
        return false;
    }
    if (filters.environment !== 'all' && entry.environment !== filters.environment) {
        return false;
    }
    if (filters.ticketLinkage !== 'all') {
        if (filters.ticketLinkage === 'linked' && !entry.ticketLinked) {
            return false;
        }
        if (filters.ticketLinkage === 'unlinked' && entry.ticketLinked) {
            return false;
        }
    }
    if (filters.severity !== 'all' && entry.severity !== filters.severity) {
        return false;
    }
    return true;
}

function buildBadge(label, className) {
    const badge = document.createElement('span');
    badge.className = `table-badge ${className || ''}`.trim();
    badge.textContent = label;
    return badge;
}

function buildOperatorCell(value) {
    const operator = value?.operator;
    const wrapper = document.createElement('div');
    wrapper.className = 'operator-cell';

    const name = document.createElement('span');
    name.textContent = operator?.name || 'Unknown operator';

    const meta = document.createElement('span');
    meta.className = 'operator-meta';
    if (operator) {
        meta.textContent = `${formatLabel(operator.affiliation)} | ${operator.providerTeam} | ${operator.technician}`;
    } else {
        meta.textContent = '--';
    }

    wrapper.appendChild(name);
    wrapper.appendChild(meta);
    return wrapper;
}

function buildCategoryCell(value) {
    return buildBadge(formatLabel(value?.label || value), 'table-badge-category');
}

function buildResourceCell(value) {
    const entry = value?.entry;
    if (!entry) {
        return document.createTextNode('--');
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'cell-stack';

    const name = document.createElement('span');
    name.textContent = entry.resourceName || 'Unknown resource';

    const meta = document.createElement('span');
    meta.className = 'cell-sub';
    const envLabel = entry.environment ? entry.environment.toUpperCase() : 'n/a';
    meta.textContent = `${entry.resourceId || entry.changeCategory || 'resource'} | ${envLabel}`;

    const actions = document.createElement('div');
    actions.className = 'action-tags';

    const timelineBtn = document.createElement('button');
    timelineBtn.type = 'button';
    timelineBtn.className = 'action-tag action-tag--button';
    timelineBtn.textContent = 'Operator timeline';
    timelineBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        jumpToTimeline(entry);
    });

    const impactBtn = document.createElement('button');
    impactBtn.type = 'button';
    impactBtn.className = 'action-tag action-tag--button';
    impactBtn.textContent = 'Resource impact';
    impactBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        jumpToResource(entry);
    });

    actions.appendChild(timelineBtn);
    actions.appendChild(impactBtn);

    wrapper.appendChild(name);
    wrapper.appendChild(meta);
    wrapper.appendChild(actions);

    return wrapper;
}

function buildSummaryCell(value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ledger-summary';
    wrapper.textContent = value?.text || value || '--';
    return wrapper;
}

function buildStateCell(value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cell-stack';

    const stateLabel = formatLabel(value?.currentState || 'review');
    const stateClass = ['open', 'escalated'].includes(value?.currentState)
        ? 'table-badge-risk'
        : value?.currentState === 'closed'
            ? 'table-badge-success'
            : 'table-badge-warning';

    const stateBadge = buildBadge(stateLabel, stateClass);

    const exposure = document.createElement('span');
    exposure.className = `ledger-exposure ${value?.stillExposed ? 'ledger-exposure--yes' : 'ledger-exposure--no'}`;
    exposure.textContent = `Still exposed: ${value?.stillExposed ? 'Yes' : 'No'}`;

    wrapper.appendChild(stateBadge);
    wrapper.appendChild(exposure);
    return wrapper;
}

function buildRiskBadge(risk) {
    if (!risk) {
        return { badge: 'warning', label: 'Medium', sortValue: RISK_ORDER.medium };
    }
    if (risk === 'critical' || risk === 'high') {
        return { badge: 'risk', label: formatLabel(risk), sortValue: RISK_ORDER[risk] };
    }
    if (risk === 'medium') {
        return { badge: 'warning', label: 'Medium', sortValue: RISK_ORDER.medium };
    }
    return { badge: 'success', label: formatLabel(risk), sortValue: RISK_ORDER[risk] || 0 };
}

function buildTicketBadge(ticketLinked) {
    return ticketLinked
        ? { badge: 'success', label: 'Yes', sortValue: 1 }
        : { badge: 'no-ticket', label: 'No', sortValue: 0 };
}

function buildProofFields(entry) {
    const operator = entry.operator;
    return [
        { label: 'Change ID', value: entry.id },
        { label: 'Timestamp', value: formatDateTime(entry.timestamp) },
        { label: 'Operator', value: operator?.name || 'Unknown operator' },
        {
            label: 'Operator Context',
            value: operator
                ? `${formatLabel(operator.affiliation)} | ${operator.providerTeam} | ${operator.actorType}`
                : '--'
        },
        { label: 'Category', value: entry.categoryLabel },
        { label: 'Change Category', value: formatLabel(entry.changeCategory) },
        { label: 'Resource', value: entry.resourceName },
        { label: 'Before', value: entry.before },
        { label: 'After', value: entry.after },
        { label: 'Risk Rating', value: formatLabel(entry.riskRating) },
        {
            label: 'Ticket',
            value: entry.ticketLinked ? entry.ticketId || 'Linked' : 'No ticket'
        },
        {
            label: 'Current State',
            value: `${formatLabel(entry.currentState)} (Still exposed: ${
                entry.stillExposed ? 'Yes' : 'No'
            })`
        },
        { label: 'Evidence Log', value: entry.evidence?.logRef },
        { label: 'Evidence Snapshot', value: entry.evidence?.snapshotRef },
        { label: 'Evidence Approval', value: entry.evidence?.approval },
        { label: 'Evidence Attestation', value: entry.evidence?.attestation }
    ].filter((field) => field.value !== undefined && field.value !== null);
}

function jumpToTimeline(entry) {
    const timestamp = entry.timestampMs;
    if (!Number.isNaN(timestamp) && timestamp != null) {
        setSelectedTimeWindow({
            start: timestamp - 60 * 60 * 1000,
            end: timestamp + 60 * 60 * 1000
        });
    }
    if (entry.operator?.technician) {
        setFilter('technician', entry.operator.technician);
    }
    window.location.hash = '#/drilldown/operator-timeline';
}

function jumpToResource(entry) {
    const timestamp = entry.timestampMs;
    if (!Number.isNaN(timestamp) && timestamp != null) {
        setSelectedTimeWindow({
            start: timestamp - 2 * 60 * 60 * 1000,
            end: timestamp + 2 * 60 * 60 * 1000
        });
    }
    window.location.hash = '#/drilldown/resource-impact';
}

function buildLedgerRows(entries) {
    return entries.map((entry) => ({
        timestamp: {
            value: formatDateTime(entry.timestamp),
            sortValue: entry.timestampMs ?? 0
        },
        operator: {
            operator: entry.operator,
            sortValue: entry.operator?.name || 'Unknown'
        },
        category: {
            label: entry.changeCategory,
            sortValue: entry.changeCategory
        },
        resource: {
            entry,
            sortValue: entry.resourceName || entry.resourceId
        },
        summary: {
            text: entry.summary,
            sortValue: entry.summary
        },
        risk: buildRiskBadge(entry.riskRating),
        ticket: buildTicketBadge(entry.ticketLinked),
        state: {
            currentState: entry.currentState,
            stillExposed: entry.stillExposed,
            sortValue: entry.stillExposed ? 1 : 0
        },
        _meta: entry
    }));
}

function buildTopRiskRows(entries) {
    return entries.map((entry) => ({
        headline: {
            entry,
            sortValue: entry.resourceName || entry.changeCategory
        },
        risk: buildRiskBadge(entry.riskRating),
        when: {
            value: formatDateTime(entry.timestamp),
            sortValue: entry.timestampMs ?? 0
        },
        _meta: entry
    }));
}

function buildHeadlineCell(value) {
    const entry = value?.entry;
    if (!entry) {
        return document.createTextNode('--');
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'cell-stack';

    const title = document.createElement('span');
    title.textContent = entry.resourceName || formatLabel(entry.changeCategory);

    const meta = document.createElement('span');
    meta.className = 'cell-sub';
    meta.textContent = `${entry.categoryLabel} | ${formatLabel(entry.changeCategory)}`;

    wrapper.appendChild(title);
    wrapper.appendChild(meta);
    return wrapper;
}

function buildExposureMetrics(entries) {
    const openEntries = entries.filter((entry) => entry.stillExposed);
    const byTag = (tag) => openEntries.filter((entry) => entry.exposureTags?.includes(tag)).length;

    return {
        publicEndpoints: byTag('public-endpoint'),
        unauthenticated: byTag('unauthenticated'),
        externalAdmins: byTag('external-admin'),
        dataExfil: byTag('data-exfil')
    };
}

export function buildChangeLedgerView() {
    const wrapper = document.createElement('div');
    wrapper.className = 'change-ledger-shell';

    const headerCard = document.createElement('section');
    headerCard.className = 'ledger-banner';

    const headerTop = document.createElement('div');
    headerTop.className = 'ledger-banner-header';

    const headerCopy = document.createElement('div');
    const headerTitle = document.createElement('h3');
    headerTitle.textContent = 'High-Risk Change Ledger';
    const headerSubtitle = document.createElement('p');
    headerSubtitle.textContent =
        'Review high-risk configuration changes, tamper attempts, and exposure deltas with proof-ready evidence.';
    headerCopy.appendChild(headerTitle);
    headerCopy.appendChild(headerSubtitle);

    const headerMeta = document.createElement('div');
    headerMeta.className = 'ledger-meta';

    const windowChip = document.createElement('span');
    windowChip.className = 'control-chip';

    const tabChip = document.createElement('span');
    tabChip.className = 'control-chip';

    const exposureChip = document.createElement('span');
    exposureChip.className = 'control-chip';

    const ledgerDrilldown = document.createElement('button');
    ledgerDrilldown.type = 'button';
    ledgerDrilldown.className = 'control-chip control-chip--button';
    ledgerDrilldown.textContent = 'Open resource impact';
    ledgerDrilldown.addEventListener('click', () => {
        window.location.hash = '#/drilldown/resource-impact';
    });

    headerMeta.appendChild(windowChip);
    headerMeta.appendChild(tabChip);
    headerMeta.appendChild(exposureChip);
    headerMeta.appendChild(ledgerDrilldown);

    headerTop.appendChild(headerCopy);
    headerTop.appendChild(headerMeta);
    headerCard.appendChild(headerTop);

    const layout = document.createElement('div');
    layout.className = 'ledger-grid';

    const mainPanel = document.createElement('section');
    mainPanel.className = 'ledger-panel ledger-panel--main';

    const tabs = document.createElement('div');
    tabs.className = 'ledger-tabs';

    const tabButtons = new Map();
    LEDGER_TABS.forEach((tab) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ledger-tab';
        button.dataset.tabId = tab.id;
        button.textContent = tab.label;
        button.addEventListener('click', () => {
            if (button.dataset.tabId === currentTab) {
                return;
            }
            currentTab = tab.id;
            setTabInUrl(currentTab);
            render(getAppState());
        });
        tabButtons.set(tab.id, button);
        tabs.appendChild(button);
    });

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-scroll ledger-table-wrap';

    mainPanel.appendChild(tabs);
    mainPanel.appendChild(tableWrap);

    const sidePanel = document.createElement('aside');
    sidePanel.className = 'ledger-panel ledger-panel--side';

    const exposureCard = document.createElement('section');
    exposureCard.className = 'ledger-side-card';
    const exposureHeader = document.createElement('div');
    exposureHeader.className = 'ledger-side-header';
    const exposureTitle = document.createElement('h4');
    exposureTitle.textContent = 'Public exposure tracker';
    const exposureSubtitle = document.createElement('p');
    exposureSubtitle.textContent = 'Live exposure counts from open changes.';
    const exposureDrilldown = document.createElement('button');
    exposureDrilldown.type = 'button';
    exposureDrilldown.className = 'control-chip control-chip--button';
    exposureDrilldown.textContent = 'Open resource impact';
    exposureDrilldown.addEventListener('click', () => {
        window.location.hash = '#/drilldown/resource-impact';
    });
    exposureHeader.appendChild(exposureTitle);
    exposureHeader.appendChild(exposureSubtitle);
    exposureHeader.appendChild(exposureDrilldown);
    const exposureTiles = document.createElement('div');
    exposureTiles.className = 'exposure-tiles';
    exposureCard.appendChild(exposureHeader);
    exposureCard.appendChild(exposureTiles);

    const topRiskCard = document.createElement('section');
    topRiskCard.className = 'ledger-side-card';
    const topRiskHeader = document.createElement('div');
    topRiskHeader.className = 'ledger-side-header';
    const topRiskTitle = document.createElement('h4');
    topRiskTitle.textContent = 'Top 10 riskiest changes this week';
    const topRiskSubtitle = document.createElement('p');
    topRiskSubtitle.textContent = 'Prioritized by severity and recency.';
    const topRiskDrilldown = document.createElement('button');
    topRiskDrilldown.type = 'button';
    topRiskDrilldown.className = 'control-chip control-chip--button';
    topRiskDrilldown.textContent = 'Open no-ticket view';
    topRiskDrilldown.addEventListener('click', () => {
        window.location.hash = '#/drilldown/no-ticket';
    });
    topRiskHeader.appendChild(topRiskTitle);
    topRiskHeader.appendChild(topRiskSubtitle);
    topRiskHeader.appendChild(topRiskDrilldown);
    const topRiskBody = document.createElement('div');
    topRiskBody.className = 'ledger-risk-table';
    topRiskCard.appendChild(topRiskHeader);
    topRiskCard.appendChild(topRiskBody);

    sidePanel.appendChild(exposureCard);
    sidePanel.appendChild(topRiskCard);

    layout.appendChild(mainPanel);
    layout.appendChild(sidePanel);

    const proofPanel = createProofPanel({ title: 'Change Proof' });

    wrapper.appendChild(headerCard);
    wrapper.appendChild(layout);
    wrapper.appendChild(proofPanel);

    let currentTab = getTabFromUrl();
    setTabInUrl(currentTab);

    function render(state) {
        const { filters, selectedTimeWindow } = state;
        const timeRange = selectedTimeWindow || getTimeRange(filters);

        const filteredEntries = LEDGER_ENTRIES.filter((entry) =>
            matchesFilters(entry, filters, timeRange)
        );

        const tabCounts = LEDGER_TABS.reduce((acc, tab) => {
            acc[tab.id] = filteredEntries.filter((entry) => entry.categoryId === tab.id).length;
            return acc;
        }, {});

        LEDGER_TABS.forEach((tab) => {
            const button = tabButtons.get(tab.id);
            if (!button) {
                return;
            }
            button.classList.toggle('ledger-tab--active', tab.id === currentTab);
            button.innerHTML = '';
            const label = document.createElement('span');
            label.textContent = tab.label;
            const count = document.createElement('span');
            count.className = 'ledger-tab-count';
            count.textContent = tabCounts[tab.id] || 0;
            button.appendChild(label);
            button.appendChild(count);
        });

        const activeTab = LEDGER_TABS.find((tab) => tab.id === currentTab) || LEDGER_TABS[0];
        const tabEntries = filteredEntries.filter((entry) => entry.categoryId === activeTab.id);
        const openCount = tabEntries.filter((entry) => entry.stillExposed).length;

        const rangeLabel = selectedTimeWindow
            ? `${formatDateTime(timeRange.start)} - ${formatDateTime(timeRange.end)}`
            : TIME_RANGE_LABELS[filters.timeRange] || 'Time window';
        windowChip.textContent = `Window: ${rangeLabel}`;
        tabChip.textContent = `Tab: ${activeTab.label}`;
        exposureChip.textContent = `Still exposed: ${openCount}`;

        const ledgerRows = buildLedgerRows(tabEntries);
        tableWrap.innerHTML = '';
        tableWrap.appendChild(
            createSortableTable({
                columns: [
                    {
                        key: 'timestamp',
                        label: 'Timestamp',
                        render: (value) => document.createTextNode(value?.value || '--')
                    },
                    {
                        key: 'operator',
                        label: 'Operator identity',
                        render: buildOperatorCell
                    },
                    {
                        key: 'category',
                        label: 'Change category',
                        render: buildCategoryCell
                    },
                    {
                        key: 'resource',
                        label: 'Resource',
                        render: buildResourceCell
                    },
                    {
                        key: 'summary',
                        label: 'Before -> After summary',
                        render: buildSummaryCell
                    },
                    {
                        key: 'risk',
                        label: 'Risk rating'
                    },
                    {
                        key: 'ticket',
                        label: 'Ticket linked?'
                    },
                    {
                        key: 'state',
                        label: 'Current state (Still exposed?)',
                        render: buildStateCell
                    }
                ],
                rows: ledgerRows,
                initialSort: { key: 'timestamp', direction: 'desc' },
                onRowClick: (row) => {
                    if (!row?._meta) {
                        return;
                    }
                    proofPanel.setEvent(row._meta, buildProofFields(row._meta));
                    proofPanel.open();
                }
            })
        );

        const exposureMetrics = buildExposureMetrics(filteredEntries);
        exposureTiles.innerHTML = '';
        exposureTiles.appendChild(
            createKpiTile({
                label: 'Public endpoints open',
                value: exposureMetrics.publicEndpoints,
                status: exposureMetrics.publicEndpoints === 0 ? 'success' : 'danger',
                helper: 'External ingress changes',
                href: '/drilldown/resource-impact'
            })
        );
        exposureTiles.appendChild(
            createKpiTile({
                label: 'Unauthenticated services',
                value: exposureMetrics.unauthenticated,
                status: exposureMetrics.unauthenticated === 0 ? 'success' : 'warning',
                helper: 'Missing auth controls',
                href: '/drilldown/resource-impact'
            })
        );
        exposureTiles.appendChild(
            createKpiTile({
                label: 'External admin roles',
                value: exposureMetrics.externalAdmins,
                status: exposureMetrics.externalAdmins === 0 ? 'success' : 'warning',
                helper: 'Privilege expansion',
                href: '/drilldown/provider-vs-internal'
            })
        );
        exposureTiles.appendChild(
            createKpiTile({
                label: 'Data exfil risk',
                value: exposureMetrics.dataExfil,
                status: exposureMetrics.dataExfil === 0 ? 'success' : 'danger',
                helper: 'High-risk data actions',
                href: '/drilldown/no-ticket'
            })
        );

        const weekRange = {
            start: getNowMs() - TIME_RANGE_MS['7d'],
            end: getNowMs()
        };
        const weeklyEntries = LEDGER_ENTRIES.filter((entry) =>
            matchesFilters(entry, { ...filters, timeRange: '7d' }, weekRange)
        ).sort((a, b) => {
            const riskDiff = (RISK_ORDER[b.riskRating] || 0) - (RISK_ORDER[a.riskRating] || 0);
            if (riskDiff !== 0) {
                return riskDiff;
            }
            return (b.timestampMs || 0) - (a.timestampMs || 0);
        });

        const topTen = weeklyEntries.slice(0, 10);
        topRiskBody.innerHTML = '';
        topRiskBody.appendChild(
            createSortableTable({
                columns: [
                    { key: 'headline', label: 'Change', render: buildHeadlineCell },
                    { key: 'risk', label: 'Risk' },
                    {
                        key: 'when',
                        label: 'When',
                        render: (value) => document.createTextNode(value?.value || '--')
                    }
                ],
                rows: buildTopRiskRows(topTen),
                initialSort: { key: 'risk', direction: 'desc' },
                onRowClick: (row) => {
                    if (!row?._meta) {
                        return;
                    }
                    proofPanel.setEvent(row._meta, buildProofFields(row._meta));
                    proofPanel.open();
                }
            })
        );
    }

    const handlePopState = () => {
        if (!wrapper.isConnected) {
            window.removeEventListener('popstate', handlePopState);
            return;
        }
        const nextTab = getTabFromUrl();
        if (nextTab !== currentTab) {
            currentTab = nextTab;
            render(getAppState());
        }
    };

    render(getAppState());

    const unsubscribe = onStateChange((state) => {
        if (!wrapper.isConnected) {
            unsubscribe();
            window.removeEventListener('popstate', handlePopState);
            return;
        }
        render(state);
    });

    window.addEventListener('popstate', handlePopState);

    return wrapper;
}
