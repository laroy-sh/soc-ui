import { createKpiTile } from '../tiles.js';
import { createStackedTimelineChart } from '../charts.js';
import { createSortableTable } from '../table.js';
import {
    getAppState,
    onStateChange,
    setFilter,
    setSelectedTimeWindow
} from '../outsourcer-state.js';
import {
    mockNow,
    operators,
    riskEvents,
    changeEvents,
    privilegedSignIns,
    controlTamperingAttempts,
    monitoringIngestionStatuses,
    elevations
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

const SEVERITY_ORDER = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
};

const EXPECTED_SCOPES = ['identity', 'change', 'data', 'privileged', 'endpoint', 'network'];
const PROVIDER_AUDIT_WRITE_ACCESS = false;

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

function formatPercent(value) {
    if (value == null || Number.isNaN(value)) {
        return '--';
    }
    return `${Math.round(value)}%`;
}

function formatDateLabel(timestampMs) {
    if (!timestampMs) {
        return '--';
    }
    const date = new Date(timestampMs);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function formatRangeLabel(start, end) {
    if (!start || !end) {
        return '--';
    }
    return `${formatDateLabel(start)} - ${formatDateLabel(end)}`;
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
    if (!item) {
        return null;
    }
    if (item.operatorId) {
        return operatorById.get(item.operatorId) || null;
    }
    return null;
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

function buildBuckets(events, range, bucketCount = 8) {
    const duration = Math.max(range.end - range.start, 1);
    const bucketSize = duration / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
        const start = Math.round(range.start + bucketSize * index);
        const end = Math.round(start + bucketSize);
        return {
            index,
            start,
            end,
            label: formatDateLabel(start),
            counts: { low: 0, medium: 0, high: 0, critical: 0 }
        };
    });

    events.forEach((event) => {
        const time = Date.parse(event.timestamp);
        if (Number.isNaN(time)) {
            return;
        }
        const bucketIndex = Math.min(
            buckets.length - 1,
            Math.max(0, Math.floor((time - range.start) / bucketSize))
        );
        const bucket = buckets[bucketIndex];
        const severity = event.severity || 'low';
        if (bucket && bucket.counts[severity] !== undefined) {
            bucket.counts[severity] += 1;
        }
    });

    return buckets;
}

function severityBadge(severity) {
    const label = severity ? severity.replace(/(^|-)\w/g, (value) => value.toUpperCase()) : '--';
    if (!severity) {
        return label;
    }
    if (severity === 'low') {
        return { badge: 'success', label, sortValue: SEVERITY_ORDER[severity] };
    }
    if (severity === 'medium') {
        return { badge: 'warning', label, sortValue: SEVERITY_ORDER[severity] };
    }
    return { badge: 'risk', label, sortValue: SEVERITY_ORDER[severity] || 0 };
}

function statusBadge(status) {
    const label = status ? status.replace(/-/g, ' ') : '--';
    if (!status) {
        return label;
    }
    if (status === 'closed') {
        return { badge: 'success', label: 'Closed', sortValue: 0 };
    }
    if (status === 'escalated') {
        return { badge: 'risk', label: 'Escalated', sortValue: 3 };
    }
    if (status === 'review') {
        return { badge: 'warning', label: 'Review', sortValue: 2 };
    }
    return { badge: 'warning', label, sortValue: 1 };
}

function buildControlGroup(title, tiles) {
    const group = document.createElement('div');
    group.className = 'control-group';

    const heading = document.createElement('h4');
    heading.textContent = title;
    group.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'control-group-tiles';
    tiles.forEach((tile) => grid.appendChild(tile));
    group.appendChild(grid);

    return group;
}

function createOperatorLabel(operator) {
    if (!operator) {
        return 'Unknown';
    }
    if (operator.affiliation === 'provider') {
        return `${operator.name} (${operator.providerTeam})`;
    }
    return operator.name;
}

function mapChangeToRow(change) {
    const operator = normalizeOperator(change);
    const technician = operator ? operator.technician : null;
    return {
        technician: createOperatorLabel(operator),
        actionType: change.changeType?.replace(/-/g, ' ') || '--',
        resourceImpacted: change.resourceName || change.resourceId || '--',
        riskScore: severityBadge(change.severity),
        ticketPresent: change.ticketLinked
            ? { badge: 'success', label: 'Linked', sortValue: 1 }
            : { badge: 'no-ticket', label: 'Missing', sortValue: 0 },
        status: statusBadge(change.currentState),
        _meta: {
            technician,
            timestamp: change.timestamp,
            operator
        }
    };
}

function isProviderOperator(change) {
    const operator = normalizeOperator(change);
    return operator?.affiliation === 'provider';
}

function buildConfidenceItem({ label, value, status, helper, linkLabel, onClick }) {
    const item = document.createElement('div');
    item.className = 'confidence-item';

    const top = document.createElement('div');
    top.className = 'confidence-item-top';

    const labelEl = document.createElement('span');
    labelEl.className = 'confidence-label';
    labelEl.textContent = label || '--';

    const valueEl = document.createElement('span');
    valueEl.className = `confidence-value confidence-value--${status || 'neutral'}`;
    valueEl.textContent = value || '--';

    top.appendChild(labelEl);
    top.appendChild(valueEl);
    item.appendChild(top);

    if (helper) {
        const helperEl = document.createElement('div');
        helperEl.className = 'confidence-helper';
        helperEl.textContent = helper;
        item.appendChild(helperEl);
    }

    if (linkLabel && onClick) {
        const link = document.createElement('button');
        link.type = 'button';
        link.className = 'action-tag action-tag--button';
        link.textContent = linkLabel;
        link.addEventListener('click', (event) => {
            event.stopPropagation();
            onClick();
        });
        item.appendChild(link);
    }

    return item;
}

function summarizeIngestion(items) {
    const counts = { healthy: 0, degraded: 0, outage: 0 };
    items.forEach((item) => {
        if (!item?.status) {
            return;
        }
        counts[item.status] = (counts[item.status] || 0) + 1;
    });
    const maxLag = Math.max(0, ...items.map((item) => item.lagMinutes || 0));
    return { counts, maxLag };
}

function deriveIdentityConfidence(items) {
    const identitySources = items.filter((item) => item.scope === 'identity');
    if (identitySources.length === 0) {
        return {
            value: 'Low',
            status: 'bad',
            helper: 'No identity telemetry in view'
        };
    }
    const { counts, maxLag } = summarizeIngestion(identitySources);
    if (counts.outage > 0 || maxLag > 120) {
        return {
            value: 'Low',
            status: 'bad',
            helper: `${counts.outage} outage | max lag ${maxLag}m`
        };
    }
    if (counts.degraded > 0 || maxLag > 30) {
        return {
            value: 'Med',
            status: 'warn',
            helper: `${counts.degraded} delayed | max lag ${maxLag}m`
        };
    }
    return {
        value: 'High',
        status: 'good',
        helper: `${counts.healthy} healthy | max lag ${maxLag}m`
    };
}

function deriveFreshnessStatus(items) {
    if (items.length === 0) {
        return {
            value: 'Unknown',
            status: 'neutral',
            helper: 'No ingestion sources in view'
        };
    }
    const { counts, maxLag } = summarizeIngestion(items);
    if (counts.outage > 0 || maxLag > 120) {
        return {
            value: 'Stale',
            status: 'bad',
            helper: `${counts.outage} outage | max lag ${maxLag}m`
        };
    }
    if (counts.degraded > 0 || maxLag > 60) {
        return {
            value: 'Delayed',
            status: 'warn',
            helper: `${counts.degraded} delayed | max lag ${maxLag}m`
        };
    }
    return {
        value: 'Fresh',
        status: 'good',
        helper: `${counts.healthy} healthy | max lag ${maxLag}m`
    };
}

function deriveUnmonitoredScopes(items) {
    const presentScopes = new Set(items.map((item) => item.scope).filter(Boolean));
    const missing = EXPECTED_SCOPES.filter((scope) => !presentScopes.has(scope));
    if (missing.length === 0) {
        return {
            value: 'No',
            status: 'good',
            helper: 'All core scopes monitored'
        };
    }
    const label = missing.map((scope) => formatLabel(scope)).join(', ');
    return {
        value: 'Yes',
        status: 'bad',
        helper: `${missing.length} scope(s) unmonitored: ${label}`
    };
}

function deriveVisibilitySummary(items) {
    if (items.some((item) => item.status === 'bad')) {
        return { label: 'Visibility degraded', status: 'bad' };
    }
    if (items.some((item) => item.status === 'warn')) {
        return { label: 'Visibility reduced', status: 'warn' };
    }
    return { label: 'Visibility strong', status: 'good' };
}

export function buildHomeView() {
    const wrapper = document.createElement('div');
    wrapper.className = 'home-shell';

    const confidenceBanner = document.createElement('section');
    confidenceBanner.className = 'confidence-banner';

    const confidenceHeader = document.createElement('div');
    confidenceHeader.className = 'confidence-banner-header';
    const confidenceHeading = document.createElement('div');
    const confidenceTitle = document.createElement('h3');
    confidenceTitle.textContent = 'Control Evidence Confidence';
    const confidenceSubtitle = document.createElement('p');
    confidenceSubtitle.textContent = 'Visibility grade for identity attribution and monitoring coverage.';
    confidenceHeading.appendChild(confidenceTitle);
    confidenceHeading.appendChild(confidenceSubtitle);

    const confidenceMeta = document.createElement('div');
    confidenceMeta.className = 'confidence-banner-meta';
    const confidenceSummary = document.createElement('span');
    confidenceSummary.className = 'confidence-summary';
    const confidenceDrilldown = document.createElement('button');
    confidenceDrilldown.type = 'button';
    confidenceDrilldown.className = 'control-chip control-chip--button';
    confidenceDrilldown.textContent = 'Open monitoring integrity';
    confidenceDrilldown.addEventListener('click', () => {
        window.location.hash = '#/monitoring-integrity';
    });
    confidenceMeta.appendChild(confidenceSummary);
    confidenceMeta.appendChild(confidenceDrilldown);

    confidenceHeader.appendChild(confidenceHeading);
    confidenceHeader.appendChild(confidenceMeta);
    confidenceBanner.appendChild(confidenceHeader);

    const confidenceGrid = document.createElement('div');
    confidenceGrid.className = 'confidence-grid';
    confidenceBanner.appendChild(confidenceGrid);

    const banner = document.createElement('section');
    banner.className = 'control-banner';

    const bannerHeader = document.createElement('div');
    bannerHeader.className = 'control-banner-header';

    const bannerHeading = document.createElement('div');
    const bannerTitle = document.createElement('h3');
    bannerTitle.textContent = 'Control Integrity Banner';
    const bannerSubtitle = document.createElement('p');
    bannerSubtitle.textContent = 'Third-party operator control health at a glance.';
    bannerHeading.appendChild(bannerTitle);
    bannerHeading.appendChild(bannerSubtitle);

    const bannerMeta = document.createElement('div');
    bannerMeta.className = 'control-banner-meta';
    const timeRangeChip = document.createElement('span');
    timeRangeChip.className = 'control-chip';
    const bannerDrilldown = document.createElement('button');
    bannerDrilldown.type = 'button';
    bannerDrilldown.className = 'control-chip control-chip--button';
    bannerDrilldown.textContent = 'Open provider vs internal';
    bannerDrilldown.addEventListener('click', () => {
        window.location.hash = '#/drilldown/provider-vs-internal';
    });
    bannerMeta.appendChild(timeRangeChip);
    bannerMeta.appendChild(bannerDrilldown);

    bannerHeader.appendChild(bannerHeading);
    bannerHeader.appendChild(bannerMeta);
    banner.appendChild(bannerHeader);

    const controlGroups = document.createElement('div');
    controlGroups.className = 'control-groups';
    banner.appendChild(controlGroups);

    const timelineCard = document.createElement('section');
    timelineCard.className = 'timeline-card';

    const timelineHeader = document.createElement('div');
    timelineHeader.className = 'timeline-header';

    const timelineHeading = document.createElement('div');
    const timelineTitle = document.createElement('h3');
    timelineTitle.textContent = 'Risk Timeline';
    const timelineSubtitle = document.createElement('p');
    timelineSubtitle.textContent = 'Stacked by severity. Click a bar to isolate the review window.';
    timelineHeading.appendChild(timelineTitle);
    timelineHeading.appendChild(timelineSubtitle);

    const timelineMeta = document.createElement('div');
    timelineMeta.className = 'timeline-meta';
    const selectionChip = document.createElement('span');
    selectionChip.className = 'control-chip';
    const clearSelection = document.createElement('button');
    clearSelection.type = 'button';
    clearSelection.className = 'control-chip control-chip--button';
    clearSelection.textContent = 'Clear window';
    clearSelection.addEventListener('click', () => setSelectedTimeWindow(null));
    const timelineDrilldown = document.createElement('button');
    timelineDrilldown.type = 'button';
    timelineDrilldown.className = 'control-chip control-chip--button';
    timelineDrilldown.textContent = 'Open operator timeline';
    timelineDrilldown.addEventListener('click', () => {
        window.location.hash = '#/drilldown/operator-timeline';
    });
    timelineMeta.appendChild(selectionChip);
    timelineMeta.appendChild(clearSelection);
    timelineMeta.appendChild(timelineDrilldown);

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

    const reviewCard = document.createElement('section');
    reviewCard.className = 'review-card';

    const reviewHeader = document.createElement('div');
    reviewHeader.className = 'review-header';

    const reviewHeading = document.createElement('div');
    const reviewTitle = document.createElement('h3');
    reviewTitle.textContent = 'Provider Actions Requiring Review';
    const reviewSubtitle = document.createElement('p');
    reviewSubtitle.textContent = 'Focused list of high-impact changes awaiting validation.';
    reviewHeading.appendChild(reviewTitle);
    reviewHeading.appendChild(reviewSubtitle);

    const reviewMeta = document.createElement('div');
    reviewMeta.className = 'review-meta';
    const reviewChip = document.createElement('span');
    reviewChip.className = 'control-chip';
    const reviewDrilldown = document.createElement('button');
    reviewDrilldown.type = 'button';
    reviewDrilldown.className = 'control-chip control-chip--button';
    reviewDrilldown.textContent = 'Open resource impact';
    reviewDrilldown.addEventListener('click', () => {
        window.location.hash = '#/drilldown/resource-impact';
    });
    reviewMeta.appendChild(reviewChip);
    reviewMeta.appendChild(reviewDrilldown);

    reviewHeader.appendChild(reviewHeading);
    reviewHeader.appendChild(reviewMeta);

    const reviewTableWrap = document.createElement('div');
    reviewTableWrap.className = 'review-table';

    reviewCard.appendChild(reviewHeader);
    reviewCard.appendChild(reviewTableWrap);

    wrapper.appendChild(confidenceBanner);
    wrapper.appendChild(banner);
    wrapper.appendChild(timelineCard);
    wrapper.appendChild(reviewCard);

    function render(state) {
        const { filters, selectedTimeWindow } = state;
        const timeRange = getTimeRange(filters);
        timeRangeChip.textContent = TIME_RANGE_LABELS[filters.timeRange] || 'Time window';

        const ingestion = filterItems(monitoringIngestionStatuses, filters, 'lastSeen');
        const identityConfidence = deriveIdentityConfidence(ingestion);
        const freshness = deriveFreshnessStatus(ingestion);
        const unmonitored = deriveUnmonitoredScopes(ingestion);
        const auditWrite = {
            value: PROVIDER_AUDIT_WRITE_ACCESS ? 'Yes' : 'No',
            status: PROVIDER_AUDIT_WRITE_ACCESS ? 'bad' : 'good',
            helper: 'Mocked field'
        };
        const summary = deriveVisibilitySummary([
            identityConfidence,
            freshness,
            unmonitored,
            auditWrite
        ]);
        confidenceSummary.textContent = summary.label;
        confidenceSummary.className = `confidence-summary confidence-summary--${summary.status}`;

        confidenceGrid.innerHTML = '';
        confidenceGrid.appendChild(
            buildConfidenceItem({
                label: 'Identity attribution confidence',
                value: identityConfidence.value,
                status: identityConfidence.status,
                helper: identityConfidence.helper,
                linkLabel: 'Monitoring integrity',
                onClick: () => {
                    window.location.hash = '#/monitoring-integrity';
                }
            })
        );
        confidenceGrid.appendChild(
            buildConfidenceItem({
                label: 'Ingestion freshness status',
                value: freshness.value,
                status: freshness.status,
                helper: freshness.helper,
                linkLabel: 'Monitoring integrity',
                onClick: () => {
                    window.location.hash = '#/monitoring-integrity';
                }
            })
        );
        confidenceGrid.appendChild(
            buildConfidenceItem({
                label: 'Unmonitored scope present',
                value: unmonitored.value,
                status: unmonitored.status,
                helper: unmonitored.helper,
                linkLabel: 'Monitoring integrity',
                onClick: () => {
                    window.location.hash = '#/monitoring-integrity';
                }
            })
        );
        confidenceGrid.appendChild(
            buildConfidenceItem({
                label: 'Provider audit-plane write access',
                value: auditWrite.value,
                status: auditWrite.status,
                helper: auditWrite.helper,
                linkLabel: 'Monitoring integrity',
                onClick: () => {
                    window.location.hash = '#/monitoring-integrity';
                }
            })
        );

        const healthySources = ingestion.filter((item) => item.status === 'healthy').length;
        const totalSources = ingestion.length;
        const coverage = totalSources ? (healthySources / totalSources) * 100 : null;
        const laggingSources = ingestion.filter((item) => item.status !== 'healthy').length;
        const maxLag = Math.max(0, ...ingestion.map((item) => item.lagMinutes || 0));

        const signIns = filterItems(privilegedSignIns, filters, 'timestamp');
        const ticketedSessions = signIns.filter((item) => item.ticketLinked).length;
        const ticketedPct = signIns.length ? (ticketedSessions / signIns.length) * 100 : null;
        const breakGlassSessions = signIns.filter((item) => {
            const operator = normalizeOperator(item);
            return operator?.actorType === 'emergency' || item.anomalyFlags?.includes('break-glass');
        }).length;
        const unlinkedSessions = signIns.filter((item) => !item.ticketLinked).length;

        const changes = filterItems(changeEvents, filters, 'timestamp');
        const highRiskChanges = changes.filter((item) => ['high', 'critical'].includes(item.severity));
        const openHighRisk = highRiskChanges.filter((item) => item.currentState !== 'closed').length;
        const ticketlessCritical = changes.filter(
            (item) => item.severity === 'critical' && !item.ticketLinked
        ).length;

        const activityEvents = [
            ...filterItems(riskEvents, filters, 'timestamp'),
            ...changes,
            ...signIns
        ];
        const providerActivity = activityEvents.filter((item) => {
            const operator = normalizeOperator(item);
            return operator?.affiliation === 'provider';
        });
        const activeOperators = new Set(
            providerActivity.map((item) => normalizeOperator(item)?.id).filter(Boolean)
        );

        controlGroups.innerHTML = '';
        controlGroups.appendChild(
            buildControlGroup('Logging Coverage', [
                createKpiTile({
                    label: 'Healthy sources',
                    value: coverage == null ? '--' : formatPercent(coverage),
                    status: coverage == null ? 'neutral' : coverage >= 90 ? 'success' : coverage >= 75 ? 'warning' : 'danger',
                    helper: totalSources ? `${healthySources} of ${totalSources}` : 'No telemetry',
                    href: '/monitoring-integrity'
                }),
                createKpiTile({
                    label: 'Max ingestion lag',
                    value: `${maxLag}m`,
                    status: maxLag === 0 ? 'success' : maxLag > 120 ? 'danger' : 'warning',
                    helper: laggingSources ? `${laggingSources} source(s) lagging` : 'All sources healthy',
                    href: '/monitoring-integrity'
                })
            ])
        );

        controlGroups.appendChild(
            buildControlGroup('Privileged Access Under Control', [
                createKpiTile({
                    label: 'Ticketed sessions',
                    value: ticketedPct == null ? '--' : formatPercent(ticketedPct),
                    status: ticketedPct == null ? 'neutral' : ticketedPct >= 85 ? 'success' : ticketedPct >= 70 ? 'warning' : 'danger',
                    helper: signIns.length ? `${ticketedSessions} of ${signIns.length}` : 'No sessions',
                    href: '/drilldown/operator-timeline'
                }),
                createKpiTile({
                    label: 'Break-glass usage',
                    value: `${breakGlassSessions}`,
                    status: breakGlassSessions === 0 ? 'success' : 'danger',
                    helper: unlinkedSessions ? `${unlinkedSessions} unlinked sessions` : 'No unlinked sessions',
                    href: '/drilldown/no-ticket'
                })
            ])
        );

        controlGroups.appendChild(
            buildControlGroup('High-Risk Changes', [
                createKpiTile({
                    label: 'Open high-risk changes',
                    value: `${openHighRisk}`,
                    status: openHighRisk === 0 ? 'success' : openHighRisk > 2 ? 'danger' : 'warning',
                    helper: `${highRiskChanges.length} total`,
                    href: '/drilldown/resource-impact'
                }),
                createKpiTile({
                    label: 'Critical without ticket',
                    value: `${ticketlessCritical}`,
                    status: ticketlessCritical === 0 ? 'success' : 'danger',
                    helper: ticketlessCritical ? 'Immediate escalation' : 'Ticketed',
                    href: '/drilldown/no-ticket'
                })
            ])
        );

        controlGroups.appendChild(
            buildControlGroup('Provider Activity Level', [
                createKpiTile({
                    label: 'Provider actions',
                    value: `${providerActivity.length}`,
                    status: providerActivity.length < 6 ? 'success' : providerActivity.length < 12 ? 'warning' : 'danger',
                    helper: `${activeOperators.size} active operators`,
                    href: '/drilldown/provider-vs-internal'
                }),
                createKpiTile({
                    label: 'Privileged elevations',
                    value: `${filterItems(elevations, filters, 'startTime').length}`,
                    status: 'neutral',
                    helper: 'Provider + internal',
                    href: '/drilldown/operator-timeline'
                })
            ])
        );

        const timelineEvents = [
            ...filterItems(riskEvents, filters, 'timestamp').map((item) => ({
                timestamp: item.timestamp,
                severity: item.severity
            })),
            ...changes.map((item) => ({
                timestamp: item.timestamp,
                severity: item.severity
            })),
            ...filterItems(controlTamperingAttempts, filters, 'timestamp').map((item) => ({
                timestamp: item.timestamp,
                severity: item.severity
            }))
        ];

        const buckets = buildBuckets(timelineEvents, timeRange, 8);
        timelineChartWrap.innerHTML = '';
        const timelineChart = createStackedTimelineChart({
            buckets,
            width: 680,
            height: 200,
            onSelect: ({ bucket }) => {
                if (!bucket) {
                    return;
                }
                setSelectedTimeWindow({
                    start: Math.round(bucket.start),
                    end: Math.round(bucket.end)
                });
            }
        });

        if (selectedTimeWindow) {
            const selectedIndex = buckets.findIndex(
                (bucket) =>
                    bucket.start === selectedTimeWindow.start && bucket.end === selectedTimeWindow.end
            );
            if (selectedIndex >= 0) {
                const overlays = timelineChart.querySelectorAll('.timeline-overlay');
                if (overlays[selectedIndex]) {
                    overlays[selectedIndex].classList.add('timeline-overlay--selected');
                }
            }
        }

        timelineChartWrap.appendChild(timelineChart);

        if (selectedTimeWindow) {
            selectionChip.textContent = `Selected: ${formatRangeLabel(
                selectedTimeWindow.start,
                selectedTimeWindow.end
            )}`;
            selectionChip.style.display = 'inline-flex';
            clearSelection.style.display = 'inline-flex';
        } else {
            selectionChip.textContent = 'Selected: none';
            selectionChip.style.display = 'inline-flex';
            clearSelection.style.display = 'none';
        }

        const reviewRange = selectedTimeWindow || timeRange;
        reviewChip.textContent = selectedTimeWindow
            ? `Window: ${formatRangeLabel(reviewRange.start, reviewRange.end)}`
            : `Window: ${TIME_RANGE_LABELS[filters.timeRange] || 'Time window'}`;

        const reviewCandidates = changes
            .filter(isProviderOperator)
            .filter((item) => ['open', 'review', 'escalated', 'monitoring'].includes(item.currentState))
            .filter((item) => {
                const timestamp = Date.parse(item.timestamp);
                if (Number.isNaN(timestamp)) {
                    return false;
                }
                return timestamp >= reviewRange.start && timestamp <= reviewRange.end;
            });

        const rows = reviewCandidates.map(mapChangeToRow);
        reviewTableWrap.innerHTML = '';
        reviewTableWrap.appendChild(
            createSortableTable({
                columns: [
                    { key: 'technician', label: 'Technician' },
                    { key: 'actionType', label: 'Action type' },
                    { key: 'resourceImpacted', label: 'Resource impacted' },
                    { key: 'riskScore', label: 'Risk score', numeric: true },
                    { key: 'ticketPresent', label: 'Ticket present' },
                    { key: 'status', label: 'Status' }
                ],
                rows,
                initialSort: { key: 'riskScore', direction: 'desc' },
                onRowClick: (row) => {
                    if (!row?._meta) {
                        return;
                    }
                    if (row._meta.technician) {
                        setFilter('technician', row._meta.technician);
                    }
                    if (!selectedTimeWindow) {
                        setSelectedTimeWindow({ start: reviewRange.start, end: reviewRange.end });
                    }
                    window.location.hash = '#/drilldown/operator-timeline';
                }
            })
        );
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
