import { createSortableTable } from '../table.js';
import { createKpiTile } from '../tiles.js';
import { createStackedTimelineChart } from '../charts.js';
import {
    getAppState,
    onStateChange,
    setFilter,
    setSelectedTimeWindow
} from '../outsourcer-state.js';
import { mockNow, operators, blastRadiusEvents } from '../mockData.js';

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

const SEVERITY_ORDER = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
};

const SEVERITY_BADGE = {
    critical: 'table-badge-fail',
    high: 'table-badge-risk',
    medium: 'table-badge-warning',
    low: 'table-badge-success'
};

const EVENT_META = {
    'mass-delete': {
        label: 'Mass delete',
        detail: 'Bulk data termination'
    },
    'backup-disable': {
        label: 'Backup disabled',
        detail: 'Recovery chain broken'
    },
    'key-rotation': {
        label: 'Key rotation drift',
        detail: 'Key material reset'
    },
    'identity-shutdown': {
        label: 'Identity shutdown',
        detail: 'Access vault disabled'
    }
};

const BACKUP_VAULT_TYPES = new Set(['backup-disable', 'identity-shutdown']);
const KEY_MGMT_TYPES = new Set(['key-rotation']);
const DESTRUCTIVE_TYPES = new Set(['mass-delete', 'identity-shutdown']);

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

function formatShortDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '--';
    }
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
    });
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

function getOperator(operatorId) {
    return operatorById.get(operatorId) || null;
}

function matchesFilters(item, filters, timestampField) {
    const { start, end } = getTimeRange(filters);
    const timestampValue = timestampField ? Date.parse(item[timestampField]) : Number.NaN;
    if (!Number.isNaN(timestampValue) && (timestampValue < start || timestampValue > end)) {
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
    if (filters.scope !== 'all' && item.scope !== filters.scope) {
        return false;
    }
    if (filters.environment !== 'all' && item.environment !== filters.environment) {
        return false;
    }
    if (filters.ticketLinkage !== 'all') {
        if (filters.ticketLinkage === 'linked' && !item.ticketLinked) {
            return false;
        }
        if (filters.ticketLinkage === 'unlinked' && item.ticketLinked) {
            return false;
        }
    }
    if (filters.severity !== 'all' && item.severity !== filters.severity) {
        return false;
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

function buildTag(label, variant) {
    const tag = document.createElement('span');
    tag.className = `action-tag${variant ? ` action-tag--${variant}` : ''}`;
    tag.textContent = label;
    return tag;
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

function buildEmptyState(message) {
    const empty = document.createElement('div');
    empty.className = 'monitoring-empty';
    empty.textContent = message;
    return empty;
}

function getSeverityOrder(severity) {
    return SEVERITY_ORDER[severity] || 0;
}

function getEventLabel(eventType) {
    return EVENT_META[eventType]?.label || formatLabel(eventType);
}

function getEventDetail(eventType) {
    return EVENT_META[eventType]?.detail || 'Destructive activity';
}

function getResourcesImpacted(entry) {
    if (!entry) {
        return 0;
    }
    if (Number.isFinite(entry.resourcesImpacted)) {
        return entry.resourcesImpacted;
    }
    if (Array.isArray(entry.resourceIds)) {
        return entry.resourceIds.length;
    }
    return 0;
}

function getPriorityEvent(events) {
    if (!events.length) {
        return null;
    }
    return [...events].sort((a, b) => {
        const severityDelta = getSeverityOrder(b.severity) - getSeverityOrder(a.severity);
        if (severityDelta !== 0) {
            return severityDelta;
        }
        return Date.parse(b.timestamp) - Date.parse(a.timestamp);
    })[0];
}

function jumpToOperatorTimeline(entry, windowOverride) {
    if (!entry) {
        return;
    }
    const operator = getOperator(entry.operatorId);
    if (operator?.technician) {
        setFilter('technician', operator.technician);
    }
    const timestamp = Date.parse(entry.timestamp);
    const defaultWindow = Number.isNaN(timestamp)
        ? null
        : {
            start: timestamp - 60 * 60 * 1000,
            end: timestamp + 60 * 60 * 1000
        };
    if (windowOverride) {
        setSelectedTimeWindow(windowOverride);
    } else if (defaultWindow) {
        setSelectedTimeWindow(defaultWindow);
    }
    window.location.hash = `#${ROUTES.operatorTimeline}`;
}

function buildDeleteBuckets(events, timeRange, bucketCount = 8) {
    if (!timeRange) {
        return [];
    }
    const range = Math.max(timeRange.end - timeRange.start, 1);
    const bucketSize = range / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
        const start = timeRange.start + bucketSize * index;
        const end = start + bucketSize;
        return {
            index,
            start,
            end,
            label: formatShortDate(start),
            counts: {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0
            }
        };
    });

    events.forEach((event) => {
        const time = Date.parse(event.timestamp);
        if (Number.isNaN(time)) {
            return;
        }
        if (time < timeRange.start || time > timeRange.end) {
            return;
        }
        const index = Math.min(
            buckets.length - 1,
            Math.max(0, Math.floor((time - timeRange.start) / bucketSize))
        );
        const severity = event.severity || 'low';
        const volume = Math.max(1, getResourcesImpacted(event));
        if (buckets[index]?.counts?.[severity] !== undefined) {
            buckets[index].counts[severity] += volume;
        } else {
            buckets[index].counts.low += volume;
        }
    });

    return buckets;
}

function buildDeleteBursts(events, windowMinutes = 90) {
    const grouped = new Map();
    events.forEach((event) => {
        const key = `${event.operatorId || 'unknown'}-${event.scope || 'scope'}`;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key).push(event);
    });

    const bursts = [];
    grouped.forEach((list) => {
        const sorted = [...list].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
        let current = null;
        sorted.forEach((event) => {
            const time = Date.parse(event.timestamp);
            if (Number.isNaN(time)) {
                return;
            }
            if (!current) {
                current = {
                    operatorId: event.operatorId,
                    scope: event.scope,
                    start: time,
                    end: time + windowMinutes * 60 * 1000,
                    volume: getResourcesImpacted(event),
                    severity: event.severity || 'low',
                    eventTypes: new Set([event.eventType])
                };
                return;
            }

            if (time <= current.end) {
                current.end = Math.max(current.end, time + windowMinutes * 60 * 1000);
                current.volume += getResourcesImpacted(event);
                if (getSeverityOrder(event.severity) > getSeverityOrder(current.severity)) {
                    current.severity = event.severity;
                }
                current.eventTypes.add(event.eventType);
                return;
            }

            bursts.push(current);
            current = {
                operatorId: event.operatorId,
                scope: event.scope,
                start: time,
                end: time + windowMinutes * 60 * 1000,
                volume: getResourcesImpacted(event),
                severity: event.severity || 'low',
                eventTypes: new Set([event.eventType])
            };
        });
        if (current) {
            bursts.push(current);
        }
    });

    return bursts;
}

export function buildBlastRadiusView() {
    const wrapper = document.createElement('div');
    wrapper.className = 'blast-shell';

    const banner = document.createElement('section');
    banner.className = 'blast-banner';
    const bannerTitle = document.createElement('h3');
    bannerTitle.textContent = 'Blast radius protection';
    const bannerSubtitle = document.createElement('p');
    bannerSubtitle.textContent =
        'Detect destructive, irreversible actions and validate recovery controls before escalation.';
    const bannerMeta = document.createElement('div');
    bannerMeta.className = 'blast-banner-meta';
    const timeRangeChip = document.createElement('span');
    timeRangeChip.className = 'control-chip';
    const criticalChip = document.createElement('span');
    criticalChip.className = 'control-chip';
    bannerMeta.appendChild(timeRangeChip);
    bannerMeta.appendChild(criticalChip);
    banner.appendChild(bannerTitle);
    banner.appendChild(bannerSubtitle);
    banner.appendChild(bannerMeta);

    const grid = document.createElement('div');
    grid.className = 'blast-grid';

    const backupCard = document.createElement('section');
    backupCard.className = 'monitoring-card monitoring-card--alert';
    const backupHeader = document.createElement('div');
    backupHeader.className = 'monitoring-card-header';
    const backupHeading = document.createElement('div');
    const backupTitle = document.createElement('h4');
    backupTitle.textContent = 'Backup + vault integrity';
    const backupSubtitle = document.createElement('p');
    backupSubtitle.textContent = 'Recovery chains, vault locks, and disablement attempts.';
    backupHeading.appendChild(backupTitle);
    backupHeading.appendChild(backupSubtitle);
    const backupMeta = document.createElement('div');
    backupMeta.className = 'monitoring-card-meta';
    const backupChip = document.createElement('span');
    backupChip.className = 'control-chip';
    backupMeta.appendChild(backupChip);
    backupHeader.appendChild(backupHeading);
    backupHeader.appendChild(backupMeta);
    const backupTiles = document.createElement('div');
    backupTiles.className = 'blast-tiles';
    const backupTableWrap = document.createElement('div');
    backupTableWrap.className = 'table-scroll';
    backupCard.appendChild(backupHeader);
    backupCard.appendChild(backupTiles);
    backupCard.appendChild(backupTableWrap);

    const keyCard = document.createElement('section');
    keyCard.className = 'monitoring-card';
    const keyHeader = document.createElement('div');
    keyHeader.className = 'monitoring-card-header';
    const keyHeading = document.createElement('div');
    const keyTitle = document.createElement('h4');
    keyTitle.textContent = 'Key management alerts';
    const keySubtitle = document.createElement('p');
    keySubtitle.textContent = 'Key rotations, custody overrides, and drift from policy.';
    keyHeading.appendChild(keyTitle);
    keyHeading.appendChild(keySubtitle);
    const keyMeta = document.createElement('div');
    keyMeta.className = 'monitoring-card-meta';
    const keyChip = document.createElement('span');
    keyChip.className = 'control-chip';
    keyMeta.appendChild(keyChip);
    keyHeader.appendChild(keyHeading);
    keyHeader.appendChild(keyMeta);
    const keyTiles = document.createElement('div');
    keyTiles.className = 'blast-tiles';
    const keyTableWrap = document.createElement('div');
    keyTableWrap.className = 'table-scroll';
    keyCard.appendChild(keyHeader);
    keyCard.appendChild(keyTiles);
    keyCard.appendChild(keyTableWrap);

    grid.appendChild(backupCard);
    grid.appendChild(keyCard);

    const timelineCard = document.createElement('section');
    timelineCard.className = 'timeline-card';
    const timelineHeader = document.createElement('div');
    timelineHeader.className = 'timeline-header';
    const timelineHeading = document.createElement('div');
    const timelineTitle = document.createElement('h3');
    timelineTitle.textContent = 'Mass delete / termination detection';
    const timelineSubtitle = document.createElement('p');
    timelineSubtitle.textContent = 'Delete volume stacked by risk. Click a bar to drill into the operator window.';
    timelineHeading.appendChild(timelineTitle);
    timelineHeading.appendChild(timelineSubtitle);
    const timelineMeta = document.createElement('div');
    timelineMeta.className = 'timeline-meta';
    const timelineChip = document.createElement('span');
    timelineChip.className = 'control-chip';
    const timelineLink = document.createElement('button');
    timelineLink.type = 'button';
    timelineLink.className = 'control-chip control-chip--button';
    timelineLink.textContent = 'Open operator timeline';
    timelineLink.addEventListener('click', () => {
        window.location.hash = `#${ROUTES.operatorTimeline}`;
    });
    timelineMeta.appendChild(timelineChip);
    timelineMeta.appendChild(timelineLink);
    timelineHeader.appendChild(timelineHeading);
    timelineHeader.appendChild(timelineMeta);
    const timelineChartWrap = document.createElement('div');
    timelineChartWrap.className = 'timeline-chart-wrap';
    const timelineLegend = document.createElement('div');
    timelineLegend.className = 'timeline-legend';
    ['Low', 'Medium', 'High', 'Critical'].forEach((label) => {
        const item = document.createElement('div');
        item.className = 'timeline-legend-item';
        const swatch = document.createElement('span');
        swatch.className = `legend-swatch legend-${label.toLowerCase()}`;
        const text = document.createElement('span');
        text.textContent = label;
        item.appendChild(swatch);
        item.appendChild(text);
        timelineLegend.appendChild(item);
    });
    timelineCard.appendChild(timelineHeader);
    timelineCard.appendChild(timelineChartWrap);
    timelineCard.appendChild(timelineLegend);

    const burstCard = document.createElement('section');
    burstCard.className = 'monitoring-card monitoring-card--alert';
    const burstHeader = document.createElement('div');
    burstHeader.className = 'monitoring-card-header';
    const burstHeading = document.createElement('div');
    const burstTitle = document.createElement('h4');
    burstTitle.textContent = 'Deletion bursts by operator';
    const burstSubtitle = document.createElement('p');
    burstSubtitle.textContent = 'Grouped delete spikes by operator, scope, and activity window.';
    burstHeading.appendChild(burstTitle);
    burstHeading.appendChild(burstSubtitle);
    const burstMeta = document.createElement('div');
    burstMeta.className = 'monitoring-card-meta';
    const burstChip = document.createElement('span');
    burstChip.className = 'control-chip';
    burstMeta.appendChild(burstChip);
    burstHeader.appendChild(burstHeading);
    burstHeader.appendChild(burstMeta);
    const burstTableWrap = document.createElement('div');
    burstTableWrap.className = 'table-scroll';
    burstCard.appendChild(burstHeader);
    burstCard.appendChild(burstTableWrap);

    wrapper.appendChild(banner);
    wrapper.appendChild(grid);
    wrapper.appendChild(timelineCard);
    wrapper.appendChild(burstCard);

    function render(state) {
        const { filters, selectedTimeWindow } = state;
        const timeRange = getTimeRange(filters);
        timeRangeChip.textContent = TIME_RANGE_LABELS[filters.timeRange] || 'Time window';

        const filtered = filterItems(blastRadiusEvents, filters, 'timestamp');
        const criticalCount = filtered.filter((event) => event.severity === 'critical').length;
        criticalChip.textContent = criticalCount
            ? `${criticalCount} critical destructive event(s)`
            : 'No critical destructive events';

        const backupEvents = filtered.filter((event) => BACKUP_VAULT_TYPES.has(event.eventType));
        const keyEvents = filtered.filter((event) => KEY_MGMT_TYPES.has(event.eventType));
        const deleteEvents = filtered.filter((event) => DESTRUCTIVE_TYPES.has(event.eventType));

        const backupCritical = backupEvents.filter((event) =>
            ['critical', 'high'].includes(event.severity)
        );
        const backupUnlinked = backupEvents.filter((event) => !event.ticketLinked);
        const backupImpact = backupEvents.reduce(
            (sum, event) => sum + getResourcesImpacted(event),
            0
        );
        const backupPriority = getPriorityEvent(backupEvents);

        backupChip.textContent = backupEvents.length
            ? `${backupEvents.length} integrity signal(s)`
            : 'No integrity alerts';

        backupTiles.innerHTML = '';
        backupTiles.appendChild(
            createKpiTile({
                label: 'Recovery blockers',
                value: backupCritical.length,
                status: backupCritical.length ? 'danger' : 'success',
                helper: backupEvents.length
                    ? `${backupEvents.length} total integrity alerts`
                    : 'No backup/vault alerts in window',
                onClick: backupPriority ? () => jumpToOperatorTimeline(backupPriority) : null
            })
        );
        backupTiles.appendChild(
            createKpiTile({
                label: 'Unapproved actions',
                value: backupUnlinked.length,
                status: backupUnlinked.length ? 'warning' : 'success',
                helper: backupUnlinked.length
                    ? 'Ticket linkage missing'
                    : 'All alerts ticketed',
                onClick: backupPriority ? () => jumpToOperatorTimeline(backupPriority) : null
            })
        );
        backupTiles.appendChild(
            createKpiTile({
                label: 'Assets exposed',
                value: backupImpact,
                status: backupImpact > 10 ? 'high' : 'neutral',
                helper: backupPriority
                    ? `Most recent: ${formatDateTime(backupPriority.timestamp)}`
                    : 'No impact recorded',
                onClick: backupPriority ? () => jumpToOperatorTimeline(backupPriority) : null
            })
        );

        backupTableWrap.innerHTML = '';
        if (backupEvents.length === 0) {
            backupTableWrap.appendChild(buildEmptyState('No backup or vault integrity events detected.'));
        } else {
            const rows = backupEvents.map((entry) => {
                const operator = getOperator(entry.operatorId);
                return {
                    event: entry,
                    operator,
                    impact: entry,
                    severity: {
                        label: formatLabel(entry.severity),
                        sortValue: getSeverityOrder(entry.severity)
                    },
                    observed: {
                        label: formatDateTime(entry.timestamp),
                        sortValue: Date.parse(entry.timestamp)
                    },
                    route: entry,
                    _entry: entry
                };
            });

            const table = createSortableTable({
                columns: [
                    {
                        key: 'event',
                        label: 'Integrity event',
                        render: (value) => {
                            if (!value) {
                                return document.createTextNode('--');
                            }
                            const envLabel = value.environment ? value.environment.toUpperCase() : 'n/a';
                            const tags = document.createElement('div');
                            tags.className = 'action-tags';
                            tags.appendChild(buildTag('Recovery risk', 'danger'));
                            if (!value.ticketLinked) {
                                tags.appendChild(buildTag('No ticket', 'warning'));
                            }
                            const stack = buildCellStack(
                                getEventLabel(value.eventType),
                                `${formatLabel(value.scope)} | ${envLabel}`,
                                getEventDetail(value.eventType)
                            );
                            stack.appendChild(tags);
                            return stack;
                        }
                    },
                    {
                        key: 'operator',
                        label: 'Operator',
                        render: (value) => buildOperatorCell(value)
                    },
                    {
                        key: 'impact',
                        label: 'Impact',
                        render: (value) => {
                            const impacted = getResourcesImpacted(value);
                            const ticket = value.ticketLinked
                                ? `Ticketed (${value.ticketId || 'linked'})`
                                : 'No ticket';
                            const sample = value.resourceIds?.[0]
                                ? `Sample: ${value.resourceIds[0]}`
                                : 'No resource id';
                            return buildCellStack(
                                `${impacted} assets`,
                                ticket,
                                sample
                            );
                        }
                    },
                    {
                        key: 'severity',
                        label: 'Risk',
                        render: (value) => buildBadge(
                            value?.label,
                            SEVERITY_BADGE[value?.label?.toLowerCase()] || SEVERITY_BADGE.low
                        )
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
                rows,
                onRowClick: (row) => jumpToOperatorTimeline(row._entry),
                initialSort: { key: 'severity', direction: 'desc' }
            });
            backupTableWrap.appendChild(table);
        }

        const keyCritical = keyEvents.filter((event) => ['critical', 'high'].includes(event.severity));
        const keyUnlinked = keyEvents.filter((event) => !event.ticketLinked);
        const keyImpact = keyEvents.reduce((sum, event) => sum + getResourcesImpacted(event), 0);
        const keyPriority = getPriorityEvent(keyEvents);

        keyChip.textContent = keyEvents.length
            ? `${keyEvents.length} key custody alert(s)`
            : 'Key custody stable';

        keyTiles.innerHTML = '';
        keyTiles.appendChild(
            createKpiTile({
                label: 'Key rotations',
                value: keyEvents.length,
                status: keyEvents.length ? 'warning' : 'success',
                helper: keyEvents.length ? 'Policy deviations detected' : 'No key alerts in window',
                onClick: keyPriority ? () => jumpToOperatorTimeline(keyPriority) : null
            })
        );
        keyTiles.appendChild(
            createKpiTile({
                label: 'High risk keys',
                value: keyCritical.length,
                status: keyCritical.length ? 'danger' : 'success',
                helper: keyCritical.length ? 'Escalate custody review' : 'No high risk key events',
                onClick: keyPriority ? () => jumpToOperatorTimeline(keyPriority) : null
            })
        );
        keyTiles.appendChild(
            createKpiTile({
                label: 'Unapproved custody',
                value: keyUnlinked.length,
                status: keyUnlinked.length ? 'warning' : 'success',
                helper: keyUnlinked.length ? 'Missing change ticket' : 'All key events ticketed',
                onClick: keyPriority ? () => jumpToOperatorTimeline(keyPriority) : null
            })
        );

        keyTableWrap.innerHTML = '';
        if (keyEvents.length === 0) {
            keyTableWrap.appendChild(buildEmptyState('No key management alerts in this window.'));
        } else {
            const rows = keyEvents.map((entry) => {
                const operator = getOperator(entry.operatorId);
                return {
                    event: entry,
                    operator,
                    impact: entry,
                    severity: {
                        label: formatLabel(entry.severity),
                        sortValue: getSeverityOrder(entry.severity)
                    },
                    observed: {
                        label: formatDateTime(entry.timestamp),
                        sortValue: Date.parse(entry.timestamp)
                    },
                    route: entry,
                    _entry: entry
                };
            });

            const table = createSortableTable({
                columns: [
                    {
                        key: 'event',
                        label: 'Key event',
                        render: (value) => {
                            if (!value) {
                                return document.createTextNode('--');
                            }
                            const envLabel = value.environment ? value.environment.toUpperCase() : 'n/a';
                            const tags = document.createElement('div');
                            tags.className = 'action-tags';
                            tags.appendChild(buildTag('Key custody', 'warning'));
                            if (!value.ticketLinked) {
                                tags.appendChild(buildTag('No ticket', 'danger'));
                            }
                            const stack = buildCellStack(
                                getEventLabel(value.eventType),
                                `${formatLabel(value.scope)} | ${envLabel}`,
                                getEventDetail(value.eventType)
                            );
                            stack.appendChild(tags);
                            return stack;
                        }
                    },
                    {
                        key: 'operator',
                        label: 'Operator',
                        render: (value) => buildOperatorCell(value)
                    },
                    {
                        key: 'impact',
                        label: 'Impact',
                        render: (value) => {
                            const impacted = getResourcesImpacted(value);
                            const ticket = value.ticketLinked
                                ? `Ticketed (${value.ticketId || 'linked'})`
                                : 'No ticket';
                            const resource = value.resourceIds?.[0]
                                ? `Key ring: ${value.resourceIds[0]}`
                                : 'Key resource not listed';
                            return buildCellStack(
                                `${impacted} keys`,
                                ticket,
                                resource
                            );
                        }
                    },
                    {
                        key: 'severity',
                        label: 'Risk',
                        render: (value) => buildBadge(
                            value?.label,
                            SEVERITY_BADGE[value?.label?.toLowerCase()] || SEVERITY_BADGE.low
                        )
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
                rows,
                onRowClick: (row) => jumpToOperatorTimeline(row._entry),
                initialSort: { key: 'severity', direction: 'desc' }
            });
            keyTableWrap.appendChild(table);
        }

        const deleteBuckets = buildDeleteBuckets(deleteEvents, timeRange, 8);
        const deleteVolume = deleteEvents.reduce((sum, event) => sum + getResourcesImpacted(event), 0);
        timelineChip.textContent = deleteEvents.length
            ? `${deleteVolume} deletes across ${deleteEvents.length} event(s)`
            : 'No destructive deletes detected';

        timelineChartWrap.innerHTML = '';
        if (deleteEvents.length === 0) {
            timelineChartWrap.appendChild(buildEmptyState('No delete or termination activity in this window.'));
        } else {
            const timelineChart = createStackedTimelineChart({
                buckets: deleteBuckets,
                width: 640,
                height: 180,
                onSelect: ({ bucket }) => {
                    if (!bucket) {
                        return;
                    }
                    setSelectedTimeWindow({ start: bucket.start, end: bucket.end });
                    window.location.hash = `#${ROUTES.operatorTimeline}`;
                }
            });

            if (selectedTimeWindow) {
                const overlays = timelineChart.querySelectorAll('.timeline-overlay');
                deleteBuckets.forEach((bucket, index) => {
                    if (!overlays[index]) {
                        return;
                    }
                    const overlaps =
                        selectedTimeWindow.start <= bucket.end && selectedTimeWindow.end >= bucket.start;
                    if (overlaps) {
                        overlays[index].classList.add('timeline-overlay--selected');
                    }
                });
            }
            timelineChartWrap.appendChild(timelineChart);
        }

        const bursts = buildDeleteBursts(deleteEvents);
        burstChip.textContent = bursts.length
            ? `${bursts.length} burst window(s)`
            : 'No burst windows';

        burstTableWrap.innerHTML = '';
        if (bursts.length === 0) {
            burstTableWrap.appendChild(buildEmptyState('No delete bursts detected in this window.'));
        } else {
            const rows = bursts.map((burst) => {
                const operator = getOperator(burst.operatorId);
                const types = Array.from(burst.eventTypes)
                    .map((type) => getEventLabel(type))
                    .join(', ');
                return {
                    operator,
                    scope: {
                        label: formatLabel(burst.scope),
                        detail: types
                    },
                    count: {
                        value: burst.volume,
                        severity: burst.severity,
                        sortValue: getSeverityOrder(burst.severity) * 100000 + burst.volume
                    },
                    window: {
                        label: `${formatDateTime(burst.start)} -> ${formatDateTime(burst.end)}`,
                        sortValue: burst.start
                    },
                    _burst: burst
                };
            });

            const table = createSortableTable({
                columns: [
                    {
                        key: 'operator',
                        label: 'Operator',
                        render: (value) => buildOperatorCell(value)
                    },
                    {
                        key: 'scope',
                        label: 'Scope',
                        render: (value) => buildCellStack(value?.label, value?.detail)
                    },
                    {
                        key: 'count',
                        label: 'Count',
                        numeric: true,
                        render: (value) => {
                            const stack = document.createElement('div');
                            stack.className = 'cell-stack';
                            const main = document.createElement('span');
                            main.textContent = value?.value ?? '--';
                            const sub = document.createElement('span');
                            sub.className = 'cell-sub';
                            sub.textContent = `Risk: ${formatLabel(value?.severity)}`;
                            stack.appendChild(main);
                            stack.appendChild(sub);
                            return stack;
                        }
                    },
                    {
                        key: 'window',
                        label: 'Window',
                        render: (value) => document.createTextNode(value?.label || '--')
                    }
                ],
                rows,
                onRowClick: (row) => {
                    const burst = row._burst;
                    if (!burst) {
                        return;
                    }
                    jumpToOperatorTimeline(
                        { operatorId: burst.operatorId, timestamp: new Date(burst.start).toISOString() },
                        { start: burst.start, end: burst.end }
                    );
                },
                initialSort: { key: 'count', direction: 'desc' }
            });
            burstTableWrap.appendChild(table);
        }
    }

    render(getAppState());
    onStateChange(render);

    return wrapper;
}
