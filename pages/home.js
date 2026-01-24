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

export function buildHomeView() {
    const wrapper = document.createElement('div');
    wrapper.className = 'home-shell';

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
    bannerMeta.appendChild(timeRangeChip);

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
    timelineMeta.appendChild(selectionChip);
    timelineMeta.appendChild(clearSelection);

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
    reviewMeta.appendChild(reviewChip);

    reviewHeader.appendChild(reviewHeading);
    reviewHeader.appendChild(reviewMeta);

    const reviewTableWrap = document.createElement('div');
    reviewTableWrap.className = 'review-table';

    reviewCard.appendChild(reviewHeader);
    reviewCard.appendChild(reviewTableWrap);

    wrapper.appendChild(banner);
    wrapper.appendChild(timelineCard);
    wrapper.appendChild(reviewCard);

    function render(state) {
        const { filters, selectedTimeWindow } = state;
        const timeRange = getTimeRange(filters);
        timeRangeChip.textContent = TIME_RANGE_LABELS[filters.timeRange] || 'Time window';

        const ingestion = filterItems(monitoringIngestionStatuses, filters, 'lastSeen');
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
                    href: '/privileged'
                }),
                createKpiTile({
                    label: 'Break-glass usage',
                    value: `${breakGlassSessions}`,
                    status: breakGlassSessions === 0 ? 'success' : 'danger',
                    helper: unlinkedSessions ? `${unlinkedSessions} unlinked sessions` : 'No unlinked sessions',
                    href: '/privileged'
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
                    href: '/change-ledger'
                }),
                createKpiTile({
                    label: 'Critical without ticket',
                    value: `${ticketlessCritical}`,
                    status: ticketlessCritical === 0 ? 'success' : 'danger',
                    helper: ticketlessCritical ? 'Immediate escalation' : 'Ticketed',
                    href: '/change-ledger'
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
                    href: '/ueba'
                }),
                createKpiTile({
                    label: 'Privileged elevations',
                    value: `${filterItems(elevations, filters, 'startTime').length}`,
                    status: 'neutral',
                    helper: 'Provider + internal',
                    href: '/privileged'
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
