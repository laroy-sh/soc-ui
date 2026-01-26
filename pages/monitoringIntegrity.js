import { createSortableTable } from '../table.js';
import { createKpiTile } from '../tiles.js';
import { getAppState, onStateChange } from '../outsourcer-state.js';
import {
    mockNow,
    operators,
    monitoringIngestionStatuses,
    controlTamperingAttempts,
    changeEvents
} from '../mockData.js';

const operatorById = new Map(operators.map((operator) => [operator.id, operator]));

const TIME_RANGE_MS = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
};

const STATUS_TO_HEALTH = {
    healthy: 'healthy',
    degraded: 'delayed',
    outage: 'missing'
};

const HEALTH_LABELS = {
    healthy: 'Healthy',
    delayed: 'Delayed',
    missing: 'Missing ingestion'
};

const SCOPE_ORDER = ['identity', 'change', 'data', 'privileged', 'endpoint', 'network'];

const SCOPE_LABELS = {
    identity: 'Identity',
    change: 'Change',
    data: 'Data',
    privileged: 'Privileged',
    endpoint: 'Endpoint',
    network: 'Network'
};

const TAMPER_OUTCOMES = {
    'tamper-001': {
        label: 'Success',
        status: 'success',
        impact: 'Sensor offline 12m'
    },
    'tamper-002': {
        label: 'Blocked',
        status: 'blocked',
        impact: 'Buffer flush rejected'
    },
    'tamper-003': {
        label: 'Success',
        status: 'success',
        impact: 'Policy disabled 6m'
    },
    'tamper-004': {
        label: 'Contained',
        status: 'contained',
        impact: 'Routing reverted'
    }
};

const SEVERITY_BADGE = {
    critical: 'table-badge-fail',
    high: 'table-badge-risk',
    medium: 'table-badge-warning',
    low: 'table-badge-success'
};

const ROUTES = {
    operatorTimeline: '/drilldown/operator-timeline',
    resourceImpact: '/drilldown/resource-impact'
};

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

function formatLagMinutes(value) {
    if (value == null || Number.isNaN(value)) {
        return '--';
    }
    if (value < 60) {
        return `${value}m`;
    }
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    if (minutes === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
}

function formatLabel(value) {
    if (!value) {
        return '--';
    }
    return value
        .toString()
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeOperator(item) {
    if (!item || !item.operatorId) {
        return null;
    }
    return operatorById.get(item.operatorId) || null;
}

function matchesFilters(item, filters, timestampField) {
    const { start, end } = getTimeRange(filters);
    const timestampValue = timestampField ? Date.parse(item[timestampField]) : Number.NaN;
    if (!Number.isNaN(timestampValue) && (timestampValue < start || timestampValue > end)) {
        return false;
    }

    const operator = normalizeOperator(item);
    const providerTeam = operator?.providerTeam || item.providerTeam;

    if (filters.providerTeam !== 'all' && providerTeam !== filters.providerTeam) {
        return false;
    }

    if (filters.technician !== 'all') {
        if (!operator || operator.technician !== filters.technician) {
            return false;
        }
    }

    if (filters.actorType !== 'all') {
        if (!operator || operator.actorType !== filters.actorType) {
            return false;
        }
    }

    if (filters.scope !== 'all') {
        if (!item.scope || item.scope !== filters.scope) {
            return false;
        }
    }

    if (filters.environment !== 'all') {
        if (!item.environment || item.environment !== filters.environment) {
            return false;
        }
    }

    if (filters.ticketLinkage !== 'all') {
        if (!Object.prototype.hasOwnProperty.call(item, 'ticketLinked')) {
            return false;
        }
        if (filters.ticketLinkage === 'linked' && !item.ticketLinked) {
            return false;
        }
        if (filters.ticketLinkage === 'unlinked' && item.ticketLinked) {
            return false;
        }
    }

    if (filters.severity !== 'all') {
        if (!item.severity || item.severity !== filters.severity) {
            return false;
        }
    }

    return true;
}

function filterItems(items, filters, timestampField) {
    return items.filter((item) => matchesFilters(item, filters, timestampField));
}

function buildCellStack(primary, secondary, tertiary) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cell-stack';

    const primaryEl = document.createElement('span');
    primaryEl.textContent = primary ?? '--';
    wrapper.appendChild(primaryEl);

    if (secondary) {
        const secondaryEl = document.createElement('span');
        secondaryEl.className = 'cell-sub';
        secondaryEl.textContent = secondary;
        wrapper.appendChild(secondaryEl);
    }

    if (tertiary) {
        const tertiaryEl = document.createElement('span');
        tertiaryEl.className = 'cell-sub';
        tertiaryEl.textContent = tertiary;
        wrapper.appendChild(tertiaryEl);
    }

    return wrapper;
}

function buildOperatorCell(operator) {
    const wrapper = document.createElement('div');
    wrapper.className = 'operator-cell';

    const name = document.createElement('span');
    name.textContent = operator?.name || 'Unknown operator';

    const meta = document.createElement('span');
    meta.className = 'operator-meta';
    meta.textContent = operator
        ? `${formatLabel(operator.affiliation)} | ${operator.providerTeam} | ${operator.technician}`
        : '--';

    wrapper.appendChild(name);
    wrapper.appendChild(meta);
    return wrapper;
}

function buildBadge(label, className) {
    const badge = document.createElement('span');
    badge.className = `table-badge ${className || ''}`.trim();
    badge.textContent = label || '--';
    return badge;
}

function buildRouteButton(label, href) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-tag action-tag--button';
    button.textContent = label;
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        window.location.hash = href;
    });
    return button;
}

function mapIngestionStatus(status) {
    return STATUS_TO_HEALTH[status] || 'delayed';
}

function computeIngestionMetrics(items) {
    const counts = { healthy: 0, delayed: 0, missing: 0 };
    items.forEach((item) => {
        const mapped = mapIngestionStatus(item.status);
        counts[mapped] += 1;
    });
    const total = items.length;
    const confidence = total
        ? ((counts.healthy + counts.delayed * 0.6) / total) * 100
        : null;
    return {
        ...counts,
        total,
        confidence
    };
}

function getConfidenceStatus(confidence, missing) {
    if (confidence == null) {
        return 'neutral';
    }
    if (missing > 0) {
        return 'danger';
    }
    if (confidence < 80) {
        return 'warning';
    }
    return 'success';
}

function buildHealthMap(items) {
    const container = document.createElement('div');
    container.className = 'health-map';

    const header = document.createElement('div');
    header.className = 'health-map-row health-map-row--header';
    const headerLabel = document.createElement('div');
    headerLabel.textContent = 'Scope';
    header.appendChild(headerLabel);
    ['healthy', 'delayed', 'missing'].forEach((key) => {
        const column = document.createElement('div');
        column.textContent = HEALTH_LABELS[key];
        header.appendChild(column);
    });
    container.appendChild(header);

    const scopes = Array.from(
        new Set(items.map((item) => item.scope).filter(Boolean))
    ).sort((a, b) => {
        const aIndex = SCOPE_ORDER.indexOf(a);
        const bIndex = SCOPE_ORDER.indexOf(b);
        if (aIndex === -1 && bIndex === -1) {
            return a.localeCompare(b);
        }
        if (aIndex === -1) {
            return 1;
        }
        if (bIndex === -1) {
            return -1;
        }
        return aIndex - bIndex;
    });

    if (scopes.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'monitoring-empty';
        empty.textContent = 'No ingestion sources in the current window.';
        container.appendChild(empty);
        return container;
    }

    scopes.forEach((scope) => {
        const row = document.createElement('div');
        row.className = 'health-map-row';
        row.addEventListener('click', () => {
            window.location.hash = ROUTES.resourceImpact;
        });

        const label = document.createElement('div');
        label.className = 'health-map-label';
        label.textContent = SCOPE_LABELS[scope] || formatLabel(scope);
        row.appendChild(label);

        const scopedItems = items.filter((item) => item.scope === scope);
        const counts = { healthy: 0, delayed: 0, missing: 0 };
        scopedItems.forEach((item) => {
            const mapped = mapIngestionStatus(item.status);
            counts[mapped] += 1;
        });

        ['healthy', 'delayed', 'missing'].forEach((statusKey) => {
            const cell = document.createElement('div');
            cell.className = 'health-map-cell';
            if (statusKey === 'missing') {
                if (counts[statusKey] > 0) {
                    cell.classList.add('health-map-cell--missing');
                }
            } else {
                cell.classList.add(`health-map-cell--${statusKey}`);
            }

            const count = document.createElement('div');
            count.className = 'health-map-count';
            count.textContent = counts[statusKey];

            const labelEl = document.createElement('div');
            labelEl.className = 'health-map-state';
            labelEl.textContent = statusKey === 'missing' && counts[statusKey] > 0
                ? 'Missing'
                : HEALTH_LABELS[statusKey];

            cell.appendChild(count);
            cell.appendChild(labelEl);
            row.appendChild(cell);
        });

        container.appendChild(row);
    });

    return container;
}

function deriveRetentionSignals(change) {
    const signals = [];
    const beforeRetention = change.before?.retentionDays;
    const afterRetention = change.after?.retentionDays;
    if (beforeRetention != null || afterRetention != null) {
        signals.push(
            `Retention ${beforeRetention ?? '--'}d -> ${afterRetention ?? '--'}d`
        );
    }
    if (change.before?.storage && change.after?.storage && change.before.storage !== change.after.storage) {
        signals.push(`Storage ${change.before.storage} -> ${change.after.storage}`);
    }
    if (change.before?.auditLevel && change.after?.auditLevel && change.before.auditLevel !== change.after.auditLevel) {
        signals.push(`Audit ${change.before.auditLevel} -> ${change.after.auditLevel}`);
    }
    if (change.before?.logging && change.after?.logging && change.before.logging !== change.after.logging) {
        signals.push(`Logging ${change.before.logging} -> ${change.after.logging}`);
    }
    return signals;
}

function isRetentionDrift(change) {
    return deriveRetentionSignals(change).length > 0;
}

function getRetentionSeverity(change) {
    const beforeRetention = change.before?.retentionDays;
    const afterRetention = change.after?.retentionDays;
    const retentionDrop = beforeRetention != null && afterRetention != null
        ? beforeRetention - afterRetention
        : 0;
    const storageDowngrade =
        change.before?.storage === 'immutable' && change.after?.storage === 'standard';
    const auditDowngrade =
        change.before?.auditLevel === 'all' && change.after?.auditLevel === 'read-only';
    if (afterRetention != null && afterRetention < 90) {
        return 'critical';
    }
    if (storageDowngrade || auditDowngrade || retentionDrop > 180) {
        return 'high';
    }
    if (retentionDrop > 0) {
        return 'medium';
    }
    return change.severity || 'low';
}

function buildRetentionStatusBadge(changeOrSeverity) {
    const severity = typeof changeOrSeverity === 'string'
        ? changeOrSeverity
        : getRetentionSeverity(changeOrSeverity);
    const label = severity === 'critical'
        ? 'Below minimum'
        : severity === 'high'
            ? 'High drift'
            : severity === 'medium'
                ? 'Drift detected'
                : 'Monitor';
    return buildBadge(label, SEVERITY_BADGE[severity] || 'table-badge-warning');
}

function buildTelemetryStatusBadge(status) {
    const mapped = mapIngestionStatus(status);
    if (mapped === 'missing') {
        const badge = buildBadge('Missing ingestion', 'table-badge-fail');
        badge.classList.add('telemetry-badge--missing');
        return badge;
    }
    if (mapped === 'delayed') {
        return buildBadge('Delayed', 'table-badge-warning');
    }
    return buildBadge('Healthy', 'table-badge-success');
}

function buildOutcomeBadge(outcome) {
    if (!outcome) {
        return buildBadge('Unknown', 'table-badge-warning');
    }
    if (outcome.status === 'success') {
        const badge = buildBadge('Success', 'table-badge-fail');
        badge.classList.add('tampering-outcome--success');
        return badge;
    }
    if (outcome.status === 'blocked') {
        return buildBadge('Blocked', 'table-badge-success');
    }
    return buildBadge(outcome.label, 'table-badge-warning');
}

function buildTelemetryConfidence(entry) {
    const mapped = mapIngestionStatus(entry.status);
    if (mapped === 'missing') {
        return 0;
    }
    if (mapped === 'delayed') {
        return Math.max(40, 80 - (entry.lagMinutes || 0) / 2);
    }
    return Math.max(70, 100 - (entry.lagMinutes || 0) / 3);
}

function buildEmptyState(message) {
    const empty = document.createElement('div');
    empty.className = 'monitoring-empty';
    empty.textContent = message;
    return empty;
}

export function buildMonitoringIntegrityView() {
    const wrapper = document.createElement('div');
    wrapper.className = 'monitoring-integrity';

    const stanceBanner = document.createElement('section');
    stanceBanner.className = 'monitoring-integrity-banner';
    const stanceTitle = document.createElement('div');
    stanceTitle.className = 'monitoring-integrity-title';
    stanceTitle.textContent = 'Monitoring cannot be disabled.';
    const stanceSubtitle = document.createElement('div');
    stanceSubtitle.className = 'monitoring-integrity-subtitle';
    stanceSubtitle.textContent =
        'Audit plane signals are immutable. Gaps surface as incidents, not silence.';
    const stanceActions = document.createElement('div');
    stanceActions.className = 'monitoring-banner-actions';
    const stanceDrilldown = document.createElement('button');
    stanceDrilldown.type = 'button';
    stanceDrilldown.className = 'control-chip control-chip--button';
    stanceDrilldown.textContent = 'Open provider vs internal';
    stanceDrilldown.addEventListener('click', () => {
        window.location.hash = '#/drilldown/provider-vs-internal';
    });
    stanceActions.appendChild(stanceDrilldown);
    stanceBanner.appendChild(stanceTitle);
    stanceBanner.appendChild(stanceSubtitle);
    stanceBanner.appendChild(stanceActions);

    const planeGrid = document.createElement('div');
    planeGrid.className = 'monitoring-plane-grid';

    const auditPlane = document.createElement('section');
    auditPlane.className = 'monitoring-plane monitoring-plane--audit';

    const auditHeader = document.createElement('div');
    auditHeader.className = 'monitoring-plane-header';
    const auditHeading = document.createElement('div');
    const auditTitle = document.createElement('h3');
    auditTitle.textContent = 'Customer-controlled audit plane';
    const auditSubtitle = document.createElement('p');
    auditSubtitle.textContent =
        'Immutable audit pipelines and retention controls remain under customer custody.';
    auditHeading.appendChild(auditTitle);
    auditHeading.appendChild(auditSubtitle);
    const auditBadge = document.createElement('span');
    auditBadge.className = 'plane-tag plane-tag--audit';
    auditBadge.textContent = 'Audit plane';
    auditHeader.appendChild(auditHeading);
    auditHeader.appendChild(auditBadge);

    const auditIndicators = document.createElement('div');
    auditIndicators.className = 'monitoring-indicators';

    const healthCard = document.createElement('section');
    healthCard.className = 'monitoring-card';
    const healthHeader = document.createElement('div');
    healthHeader.className = 'monitoring-card-header';
    const healthHeading = document.createElement('div');
    const healthTitle = document.createElement('h4');
    healthTitle.textContent = 'Audit pipeline health map';
    const healthSubtitle = document.createElement('p');
    healthSubtitle.textContent = 'Scope-level ingestion states across the audit plane.';
    healthHeading.appendChild(healthTitle);
    healthHeading.appendChild(healthSubtitle);
    const healthMeta = document.createElement('div');
    healthMeta.className = 'monitoring-card-meta';
    const healthChip = document.createElement('span');
    healthChip.className = 'control-chip';
    const healthDrilldown = document.createElement('button');
    healthDrilldown.type = 'button';
    healthDrilldown.className = 'control-chip control-chip--button';
    healthDrilldown.textContent = 'Open resource impact';
    healthDrilldown.addEventListener('click', () => {
        window.location.hash = '#/drilldown/resource-impact';
    });
    healthMeta.appendChild(healthChip);
    healthMeta.appendChild(healthDrilldown);
    healthHeader.appendChild(healthHeading);
    healthHeader.appendChild(healthMeta);
    const healthMapWrap = document.createElement('div');
    healthMapWrap.className = 'health-map-wrap';
    healthCard.appendChild(healthHeader);
    healthCard.appendChild(healthMapWrap);

    const retentionCard = document.createElement('section');
    retentionCard.className = 'monitoring-card';
    const retentionHeader = document.createElement('div');
    retentionHeader.className = 'monitoring-card-header';
    const retentionHeading = document.createElement('div');
    const retentionTitle = document.createElement('h4');
    retentionTitle.textContent = 'Log retention drift monitor';
    const retentionSubtitle = document.createElement('p');
    retentionSubtitle.textContent = 'Detects retention shrinkage and audit-control downgrades.';
    retentionHeading.appendChild(retentionTitle);
    retentionHeading.appendChild(retentionSubtitle);
    const retentionMeta = document.createElement('div');
    retentionMeta.className = 'monitoring-card-meta';
    const retentionChip = document.createElement('span');
    retentionChip.className = 'control-chip';
    const retentionDrilldown = document.createElement('button');
    retentionDrilldown.type = 'button';
    retentionDrilldown.className = 'control-chip control-chip--button';
    retentionDrilldown.textContent = 'Open resource impact';
    retentionDrilldown.addEventListener('click', () => {
        window.location.hash = '#/drilldown/resource-impact';
    });
    retentionMeta.appendChild(retentionChip);
    retentionMeta.appendChild(retentionDrilldown);
    retentionHeader.appendChild(retentionHeading);
    retentionHeader.appendChild(retentionMeta);
    const retentionTableWrap = document.createElement('div');
    retentionTableWrap.className = 'table-scroll';
    retentionCard.appendChild(retentionHeader);
    retentionCard.appendChild(retentionTableWrap);

    auditPlane.appendChild(auditHeader);
    auditPlane.appendChild(auditIndicators);
    auditPlane.appendChild(healthCard);
    auditPlane.appendChild(retentionCard);

    const providerPlane = document.createElement('section');
    providerPlane.className = 'monitoring-plane monitoring-plane--provider';

    const providerHeader = document.createElement('div');
    providerHeader.className = 'monitoring-plane-header';
    const providerHeading = document.createElement('div');
    const providerTitle = document.createElement('h3');
    providerTitle.textContent = 'Provider-operated management plane';
    const providerSubtitle = document.createElement('p');
    providerSubtitle.textContent =
        'Provider control activity is continuously mirrored into the audit plane.';
    providerHeading.appendChild(providerTitle);
    providerHeading.appendChild(providerSubtitle);
    const providerBadge = document.createElement('span');
    providerBadge.className = 'plane-tag plane-tag--provider';
    providerBadge.textContent = 'Management plane';
    providerHeader.appendChild(providerHeading);
    providerHeader.appendChild(providerBadge);

    const providerIndicators = document.createElement('div');
    providerIndicators.className = 'monitoring-indicators';

    const tamperCard = document.createElement('section');
    tamperCard.className = 'monitoring-card monitoring-card--alert';
    const tamperHeader = document.createElement('div');
    tamperHeader.className = 'monitoring-card-header';
    const tamperHeading = document.createElement('div');
    const tamperTitle = document.createElement('h4');
    tamperTitle.textContent = 'Critical control tampering alerts';
    const tamperSubtitle = document.createElement('p');
    tamperSubtitle.textContent = 'Attempts to blind sensors or modify security controls.';
    tamperHeading.appendChild(tamperTitle);
    tamperHeading.appendChild(tamperSubtitle);
    const tamperMeta = document.createElement('div');
    tamperMeta.className = 'monitoring-card-meta';
    const tamperChip = document.createElement('span');
    tamperChip.className = 'control-chip';
    const tamperDrilldown = document.createElement('button');
    tamperDrilldown.type = 'button';
    tamperDrilldown.className = 'control-chip control-chip--button';
    tamperDrilldown.textContent = 'Open no-ticket view';
    tamperDrilldown.addEventListener('click', () => {
        window.location.hash = '#/drilldown/no-ticket';
    });
    tamperMeta.appendChild(tamperChip);
    tamperMeta.appendChild(tamperDrilldown);
    tamperHeader.appendChild(tamperHeading);
    tamperHeader.appendChild(tamperMeta);
    const tamperTableWrap = document.createElement('div');
    tamperTableWrap.className = 'table-scroll';
    tamperCard.appendChild(tamperHeader);
    tamperCard.appendChild(tamperTableWrap);

    const telemetryCard = document.createElement('section');
    telemetryCard.className = 'monitoring-card';
    const telemetryHeader = document.createElement('div');
    telemetryHeader.className = 'monitoring-card-header';
    const telemetryHeading = document.createElement('div');
    const telemetryTitle = document.createElement('h4');
    telemetryTitle.textContent = 'Last-seen telemetry signals';
    const telemetrySubtitle = document.createElement('p');
    telemetrySubtitle.textContent = 'Provider-side telemetry freshness and lag watchlist.';
    telemetryHeading.appendChild(telemetryTitle);
    telemetryHeading.appendChild(telemetrySubtitle);
    const telemetryMeta = document.createElement('div');
    telemetryMeta.className = 'monitoring-card-meta';
    const telemetryChip = document.createElement('span');
    telemetryChip.className = 'control-chip';
    const telemetryDrilldown = document.createElement('button');
    telemetryDrilldown.type = 'button';
    telemetryDrilldown.className = 'control-chip control-chip--button';
    telemetryDrilldown.textContent = 'Open provider vs internal';
    telemetryDrilldown.addEventListener('click', () => {
        window.location.hash = '#/drilldown/provider-vs-internal';
    });
    telemetryMeta.appendChild(telemetryChip);
    telemetryMeta.appendChild(telemetryDrilldown);
    telemetryHeader.appendChild(telemetryHeading);
    telemetryHeader.appendChild(telemetryMeta);
    const telemetryTableWrap = document.createElement('div');
    telemetryTableWrap.className = 'table-scroll';
    telemetryCard.appendChild(telemetryHeader);
    telemetryCard.appendChild(telemetryTableWrap);

    providerPlane.appendChild(providerHeader);
    providerPlane.appendChild(providerIndicators);
    providerPlane.appendChild(tamperCard);
    providerPlane.appendChild(telemetryCard);

    planeGrid.appendChild(auditPlane);
    planeGrid.appendChild(providerPlane);
    wrapper.appendChild(stanceBanner);
    wrapper.appendChild(planeGrid);

    function render(state) {
        const { filters } = state;
        const ingestion = filterItems(monitoringIngestionStatuses, filters, 'lastSeen');
        const tampering = filterItems(controlTamperingAttempts, filters, 'timestamp');
        const retentionCandidates = filterItems(changeEvents, filters, 'timestamp');
        const retention = retentionCandidates.filter((change) => isRetentionDrift(change));
        const telemetry = [...ingestion].sort((a, b) => (b.lagMinutes || 0) - (a.lagMinutes || 0));

        const ingestionMetrics = computeIngestionMetrics(ingestion);
        const telemetryMetrics = computeIngestionMetrics(telemetry);
        const tamperSuccessCount = tampering.filter(
            (item) => TAMPER_OUTCOMES[item.id]?.status === 'success'
        ).length;

        auditIndicators.innerHTML = '';
        auditIndicators.appendChild(
            createKpiTile({
                label: 'Coverage confidence',
                value: ingestionMetrics.confidence == null
                    ? '--'
                    : `${Math.round(ingestionMetrics.confidence)}%`,
                status: getConfidenceStatus(ingestionMetrics.confidence, ingestionMetrics.missing),
                helper: ingestionMetrics.total
                    ? `${ingestionMetrics.healthy} healthy | ${ingestionMetrics.delayed} delayed | ${ingestionMetrics.missing} missing`
                    : 'No ingestion sources',
                href: ROUTES.resourceImpact
            })
        );
        auditIndicators.appendChild(
            createKpiTile({
                label: 'Missing ingestion',
                value: ingestionMetrics.missing,
                status: ingestionMetrics.missing > 0 ? 'danger' : 'success',
                helper: ingestionMetrics.total
                    ? `${ingestionMetrics.total} audit feeds monitored`
                    : 'Audit feed coverage unknown',
                href: ROUTES.resourceImpact
            })
        );

        providerIndicators.innerHTML = '';
        providerIndicators.appendChild(
            createKpiTile({
                label: 'Telemetry confidence',
                value: telemetryMetrics.confidence == null
                    ? '--'
                    : `${Math.round(telemetryMetrics.confidence)}%`,
                status: getConfidenceStatus(telemetryMetrics.confidence, telemetryMetrics.missing),
                helper: telemetryMetrics.total
                    ? `${telemetryMetrics.missing} missing | ${telemetryMetrics.delayed} delayed`
                    : 'No telemetry feeds',
                href: '/drilldown/provider-vs-internal'
            })
        );
        providerIndicators.appendChild(
            createKpiTile({
                label: 'Tampering success',
                value: tamperSuccessCount,
                status: tamperSuccessCount > 0 ? 'danger' : 'success',
                helper: tampering.length ? `${tampering.length} attempts observed` : 'No tampering attempts',
                href: ROUTES.operatorTimeline
            })
        );

        healthChip.textContent = ingestionMetrics.missing
            ? `Missing ingestion: ${ingestionMetrics.missing}`
            : 'All scopes reporting';
        healthChip.classList.toggle('control-chip--button', false);

        retentionChip.textContent = retention.length
            ? `${retention.length} drift signal(s)`
            : 'Retention stable';
        retentionChip.classList.toggle('control-chip--button', false);

        tamperChip.textContent = tamperSuccessCount
            ? `${tamperSuccessCount} success signal(s)`
            : 'No successful tampering';
        tamperChip.classList.toggle('control-chip--button', false);

        telemetryChip.textContent = telemetryMetrics.missing
            ? `${telemetryMetrics.missing} missing feeds`
            : 'Telemetry healthy';
        telemetryChip.classList.toggle('control-chip--button', false);

        healthMapWrap.innerHTML = '';
        healthMapWrap.appendChild(buildHealthMap(ingestion));

        retentionTableWrap.innerHTML = '';
        if (retention.length === 0) {
            retentionTableWrap.appendChild(buildEmptyState('No retention drift detected.'));
        } else {
            const retentionRows = retention.map((change) => {
                const operator = normalizeOperator(change);
                const signals = deriveRetentionSignals(change);
                const driftDelta = change.before?.retentionDays != null && change.after?.retentionDays != null
                    ? change.before.retentionDays - change.after.retentionDays
                    : null;
                return {
                    resource: { change, operator },
                    drift: {
                        signals,
                        driftDelta
                    },
                    severity: getRetentionSeverity(change),
                    observed: {
                        label: formatDateTime(change.timestamp),
                        sortValue: Date.parse(change.timestamp)
                    },
                    route: ROUTES.resourceImpact
                };
            });

            const retentionTable = createSortableTable({
                columns: [
                    {
                        key: 'resource',
                        label: 'Log surface',
                        render: (value) => {
                            const change = value?.change;
                            if (!change) {
                                return document.createTextNode('--');
                            }
                            const envLabel = change.environment ? change.environment.toUpperCase() : 'n/a';
                            return buildCellStack(
                                change.resourceName || 'Unknown resource',
                                `${change.resourceId || change.changeType} | ${envLabel}`,
                                value?.operator ? `Operator: ${value.operator.name}` : 'Operator: --'
                            );
                        }
                    },
                    {
                        key: 'drift',
                        label: 'Drift signal',
                        render: (value) => {
                            if (!value) {
                                return document.createTextNode('--');
                            }
                            const driftText = value.driftDelta != null
                                ? `Delta ${value.driftDelta}d`
                                : 'Drift signal';
                            return buildCellStack(value.signals?.[0] || '--', value.signals?.[1], driftText);
                        }
                    },
                    {
                        key: 'severity',
                        label: 'Status',
                        render: (value) => buildRetentionStatusBadge(value)
                    },
                    {
                        key: 'observed',
                        label: 'Observed',
                        render: (value) => document.createTextNode(value?.label || '--')
                    },
                    {
                        key: 'route',
                        label: 'Route',
                        sortable: false,
                        render: () => buildRouteButton('Resource impact', ROUTES.resourceImpact)
                    }
                ],
                rows: retentionRows,
                onRowClick: () => {
                    window.location.hash = ROUTES.resourceImpact;
                },
                initialSort: { key: 'observed', direction: 'desc' }
            });
            retentionTableWrap.appendChild(retentionTable);
        }

        tamperTableWrap.innerHTML = '';
        if (tampering.length === 0) {
            tamperTableWrap.appendChild(buildEmptyState('No tampering alerts in this window.'));
        } else {
            const tamperRows = tampering.map((entry) => {
                const operator = normalizeOperator(entry);
                return {
                    alert: { entry },
                    operator: operator,
                    outcome: TAMPER_OUTCOMES[entry.id],
                    severity: entry.severity,
                    observed: {
                        label: formatDateTime(entry.timestamp),
                        sortValue: Date.parse(entry.timestamp)
                    },
                    route: ROUTES.operatorTimeline
                };
            });

            const tamperTable = createSortableTable({
                columns: [
                    {
                        key: 'alert',
                        label: 'Control + method',
                        render: (value) => {
                            const entry = value?.entry;
                            if (!entry) {
                                return document.createTextNode('--');
                            }
                            const envLabel = entry.environment ? entry.environment.toUpperCase() : 'n/a';
                            const ticket = entry.ticketLinked ? `Ticketed (${entry.ticketId || 'linked'})` : 'No ticket';
                            return buildCellStack(
                                `${entry.control} | ${entry.method}`,
                                `${formatLabel(entry.scope)} | ${envLabel}`,
                                ticket
                            );
                        }
                    },
                    {
                        key: 'operator',
                        label: 'Operator',
                        render: (value) => buildOperatorCell(value)
                    },
                    {
                        key: 'outcome',
                        label: 'Outcome',
                        render: (value) => {
                            const wrapper = document.createElement('div');
                            wrapper.className = 'cell-stack';
                            wrapper.appendChild(buildOutcomeBadge(value));
                            if (value?.impact) {
                                const impact = document.createElement('span');
                                impact.className = 'cell-sub';
                                impact.textContent = value.impact;
                                wrapper.appendChild(impact);
                            }
                            return wrapper;
                        }
                    },
                    {
                        key: 'severity',
                        label: 'Severity',
                        render: (value) => buildBadge(formatLabel(value), SEVERITY_BADGE[value] || 'table-badge-warning')
                    },
                    {
                        key: 'observed',
                        label: 'Observed',
                        render: (value) => document.createTextNode(value?.label || '--')
                    },
                    {
                        key: 'route',
                        label: 'Route',
                        sortable: false,
                        render: () => buildRouteButton('Operator timeline', ROUTES.operatorTimeline)
                    }
                ],
                rows: tamperRows,
                onRowClick: () => {
                    window.location.hash = ROUTES.operatorTimeline;
                },
                initialSort: { key: 'observed', direction: 'desc' }
            });
            tamperTableWrap.appendChild(tamperTable);
        }

        telemetryTableWrap.innerHTML = '';
        if (telemetry.length === 0) {
            telemetryTableWrap.appendChild(buildEmptyState('No telemetry sources reporting.'));
        } else {
            const telemetryRows = telemetry.map((entry) => ({
                source: entry,
                status: entry.status,
                lag: entry.lagMinutes,
                lastSeen: {
                    label: formatDateTime(entry.lastSeen),
                    sortValue: Date.parse(entry.lastSeen)
                },
                confidence: buildTelemetryConfidence(entry),
                route: ROUTES.resourceImpact
            }));

            const telemetryTable = createSortableTable({
                columns: [
                    {
                        key: 'source',
                        label: 'Source',
                        render: (value) => {
                            if (!value) {
                                return document.createTextNode('--');
                            }
                            const envLabel = value.environment ? value.environment.toUpperCase() : 'n/a';
                            return buildCellStack(
                                value.source,
                                `${formatLabel(value.scope)} | ${envLabel}`,
                                `Provider team: ${value.providerTeam || '--'}`
                            );
                        }
                    },
                    {
                        key: 'lastSeen',
                        label: 'Last seen',
                        render: (value) => document.createTextNode(value?.label || '--')
                    },
                    {
                        key: 'lag',
                        label: 'Lag',
                        render: (value) => document.createTextNode(formatLagMinutes(value))
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        render: (value) => buildTelemetryStatusBadge(value)
                    },
                    {
                        key: 'confidence',
                        label: 'Coverage confidence',
                        render: (value) => {
                            const badge = value === 0
                                ? buildBadge('0%', 'table-badge-fail')
                                : value < 70
                                    ? buildBadge(`${Math.round(value)}%`, 'table-badge-warning')
                                    : buildBadge(`${Math.round(value)}%`, 'table-badge-success');
                            return badge;
                        }
                    },
                    {
                        key: 'route',
                        label: 'Route',
                        sortable: false,
                        render: () => buildRouteButton('Resource impact', ROUTES.resourceImpact)
                    }
                ],
                rows: telemetryRows,
                onRowClick: () => {
                    window.location.hash = ROUTES.resourceImpact;
                },
                initialSort: { key: 'lag', direction: 'desc' }
            });
            telemetryTableWrap.appendChild(telemetryTable);
        }
    }

    render(getAppState());
    const unsubscribe = onStateChange((state) => {
        if (!wrapper.isConnected) {
            unsubscribe();
            return;
        }
        render(state);
    });

    return wrapper;
}
