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
    privilegedSignIns,
    elevations,
    changeEvents,
    riskEvents
} from '../mockData.js';

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

const ROLE_LOOKUP = {
    'elev-001': 'Privileged Role Admin',
    'elev-002': 'Global Administrator',
    'elev-003': 'Security Administrator',
    'elev-004': 'Break-glass Global Admin',
    'elev-005': 'Database Administrator'
};

const APPROVER_LOOKUP = {
    'elev-001': 'Ops auto-approval',
    'elev-002': 'Standing grant',
    'elev-003': 'C. Rowan',
    'elev-004': 'Emergency override',
    'elev-005': 'IAM governance'
};

const JUSTIFICATION_LOOKUP = {
    'elev-001': 'Patch enforcement window',
    'elev-002': 'Standing coverage for tier-1',
    'elev-003': 'Change ticket CHG-1033',
    'elev-004': 'Incident recovery - no ticket',
    'elev-005': 'Scheduled data resilience check'
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

function formatHourLabel(hour) {
    const safeHour = Number.isNaN(Number.parseInt(hour, 10)) ? 0 : Number.parseInt(hour, 10);
    return `${String(safeHour).padStart(2, '0')}:00`;
}

function formatDuration(minutes) {
    if (minutes == null || Number.isNaN(minutes)) {
        return '--';
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) {
        return `${mins}m`;
    }
    if (mins === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
}

function capitalize(value) {
    if (!value) {
        return '--';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getOperator(operatorId) {
    return operatorById.get(operatorId) || null;
}

function operatorMatchesFilters(operator, filters) {
    if (!operator) {
        return false;
    }
    if (filters.providerTeam !== 'all' && operator.providerTeam !== filters.providerTeam) {
        return false;
    }
    if (filters.technician !== 'all' && operator.technician !== filters.technician) {
        return false;
    }
    if (filters.actorType !== 'all' && operator.actorType !== filters.actorType) {
        return false;
    }
    return true;
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

function buildHeatmapMatrix(signIns, operatorList) {
    const matrix = operatorList.map((operator) => ({
        operator,
        hours: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            count: 0,
            anomalies: 0,
            signIns: [],
            latestTimestampMs: null
        }))
    }));

    const byOperator = new Map(matrix.map((row) => [row.operator.id, row]));

    signIns.forEach((signIn) => {
        const row = byOperator.get(signIn.operatorId);
        if (!row) {
            return;
        }
        const hour = Number.isFinite(signIn.hourOfDay)
            ? signIn.hourOfDay
            : new Date(signIn.timestamp).getUTCHours();
        const cell = row.hours[hour];
        if (!cell) {
            return;
        }
        cell.count += 1;
        if (Array.isArray(signIn.anomalyFlags) && signIn.anomalyFlags.length > 0) {
            cell.anomalies += signIn.anomalyFlags.length;
        }
        cell.signIns.push(signIn);
        const ts = Date.parse(signIn.timestamp);
        if (!Number.isNaN(ts)) {
            cell.latestTimestampMs = cell.latestTimestampMs
                ? Math.max(cell.latestTimestampMs, ts)
                : ts;
        }
    });

    const maxCount = Math.max(
        1,
        ...matrix.flatMap((row) => row.hours.map((cell) => cell.count))
    );

    return { matrix, maxCount };
}

function getHeatColor(count, max) {
    const ratio = Math.min(count / max, 1);
    const alpha = 0.12 + ratio * 0.75;
    return `rgba(56, 189, 248, ${alpha})`;
}

function buildOperatorCell(operator) {
    const wrapper = document.createElement('div');
    wrapper.className = 'operator-cell';

    const name = document.createElement('span');
    name.textContent = operator?.name || '--';

    const meta = document.createElement('span');
    meta.className = 'operator-meta';
    if (operator) {
        meta.textContent = `${capitalize(operator.affiliation)} | ${operator.providerTeam} | ${operator.region}`;
    } else {
        meta.textContent = '--';
    }

    wrapper.appendChild(name);
    wrapper.appendChild(meta);
    return wrapper;
}

function buildStartDurationCell(elevation) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cell-stack';

    const start = document.createElement('span');
    start.textContent = formatDateTime(elevation.startTime);

    const detail = document.createElement('span');
    detail.className = 'cell-sub';
    detail.textContent = `${formatDuration(elevation.durationMins)} | End ${formatDateTime(
        elevation.endTime
    )}`;

    wrapper.appendChild(start);
    wrapper.appendChild(detail);
    return wrapper;
}

function buildBadge(label, className) {
    const badge = document.createElement('span');
    badge.className = `table-badge ${className || ''}`.trim();
    badge.textContent = label;
    return badge;
}

function buildActionTags(tags) {
    const wrapper = document.createElement('div');
    wrapper.className = 'action-tags';
    tags.forEach((tag) => {
        const chip = document.createElement('span');
        chip.className = 'action-tag';
        chip.textContent = tag;
        wrapper.appendChild(chip);
    });
    return wrapper;
}

function summarizeElevationActions(elevation) {
    const start = Date.parse(elevation.startTime);
    const end = Date.parse(elevation.endTime);
    const changes = changeEvents.filter((change) => {
        const ts = Date.parse(change.timestamp);
        return (
            change.operatorId === elevation.operatorId &&
            !Number.isNaN(ts) &&
            ts >= start &&
            ts <= end
        );
    });
    const risks = riskEvents.filter((risk) => {
        const ts = Date.parse(risk.timestamp);
        return (
            risk.operatorId === elevation.operatorId &&
            !Number.isNaN(ts) &&
            ts >= start &&
            ts <= end
        );
    });

    const tags = [];
    if (changes.length > 0) {
        tags.push(`${changes.length} change${changes.length === 1 ? '' : 's'}`);
    }
    if (risks.length > 0) {
        tags.push(`${risks.length} risk flag${risks.length === 1 ? '' : 's'}`);
    }
    if (changes.length > 0) {
        const topType = changes[0].changeType || 'policy update';
        tags.push(topType.replace(/-/g, ' '));
    }
    if (tags.length === 0) {
        tags.push('No recorded actions');
    }
    return tags.slice(0, 3);
}

function getRoleLabel(elevation) {
    return ROLE_LOOKUP[elevation.id] || `${capitalize(elevation.elevationType)} access`;
}

function getApprover(elevation) {
    if (APPROVER_LOOKUP[elevation.id]) {
        return APPROVER_LOOKUP[elevation.id];
    }
    if (elevation.method === 'approval') {
        return 'Manager approval';
    }
    if (elevation.elevationType === 'break-glass') {
        return 'Emergency override';
    }
    return 'Auto-approved';
}

function getJustification(elevation) {
    if (JUSTIFICATION_LOOKUP[elevation.id]) {
        return JUSTIFICATION_LOOKUP[elevation.id];
    }
    if (elevation.ticketLinked && elevation.ticketId) {
        return `Ticket ${elevation.ticketId}`;
    }
    if (elevation.elevationType === 'break-glass') {
        return 'Emergency recovery';
    }
    return 'Operational coverage';
}

function getElevationPath(elevation) {
    if (elevation.elevationType === 'break-glass') {
        return 'Vaulted account -> Emergency elevation';
    }
    if (elevation.elevationType === 'standing') {
        return 'Standing assignment -> Role activation';
    }
    if (elevation.method === 'approval') {
        return 'PIM -> Manager approval';
    }
    if (elevation.method === 'just-in-time') {
        return 'PIM -> JIT activation';
    }
    return 'Privileged workflow';
}

function buildTimelineEvents(operatorId, windowRange, signIns, elevationsInRange) {
    if (!operatorId || !windowRange) {
        return [];
    }
    const { start, end } = windowRange;
    const events = [];

    signIns.forEach((signIn) => {
        const ts = Date.parse(signIn.timestamp);
        if (
            signIn.operatorId === operatorId &&
            !Number.isNaN(ts) &&
            ts >= start &&
            ts <= end
        ) {
            events.push({
                timestamp: ts,
                title: 'Privileged login',
                meta: `Geo ${signIn.geo} | IP ${signIn.ip}`
            });
        }
    });

    elevationsInRange.forEach((elevation) => {
        const ts = Date.parse(elevation.startTime);
        if (
            elevation.operatorId === operatorId &&
            !Number.isNaN(ts) &&
            ts >= start &&
            ts <= end
        ) {
            events.push({
                timestamp: ts,
                title: `Role elevation: ${getRoleLabel(elevation)}`,
                meta: `${formatDuration(elevation.durationMins)} | ${getElevationPath(elevation)}`
            });
        }
    });

    changeEvents.forEach((change) => {
        const ts = Date.parse(change.timestamp);
        if (
            change.operatorId === operatorId &&
            !Number.isNaN(ts) &&
            ts >= start &&
            ts <= end
        ) {
            const changeType = (change.changeType || 'change').replace(/-/g, ' ');
            events.push({
                timestamp: ts,
                title: `Change: ${changeType}`,
                meta: change.resourceName
            });
        }
    });

    riskEvents.forEach((risk) => {
        const ts = Date.parse(risk.timestamp);
        if (risk.operatorId === operatorId && !Number.isNaN(ts) && ts >= start && ts <= end) {
            const riskType = (risk.riskType || 'risk').replace(/-/g, ' ');
            events.push({
                timestamp: ts,
                title: `Risk flag: ${riskType}`,
                meta: risk.summary
            });
        }
    });

    return events.sort((a, b) => a.timestamp - b.timestamp);
}

function buildTimelineList(events) {
    const list = document.createElement('div');
    list.className = 'operator-timeline-list';

    if (!events || events.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'operator-timeline-empty';
        empty.textContent = 'Select a heatmap cell or elevation to drill into the operator timeline.';
        list.appendChild(empty);
        return list;
    }

    events.forEach((event) => {
        const item = document.createElement('div');
        item.className = 'operator-timeline-item';

        const time = document.createElement('div');
        time.className = 'operator-timeline-time';
        time.textContent = formatDateTime(event.timestamp);

        const title = document.createElement('div');
        title.className = 'operator-timeline-title';
        title.textContent = event.title;

        const meta = document.createElement('div');
        meta.className = 'operator-timeline-meta';
        meta.textContent = event.meta;

        item.appendChild(time);
        item.appendChild(title);
        item.appendChild(meta);
        list.appendChild(item);
    });

    return list;
}

export function buildPrivilegedView() {
    const wrapper = document.createElement('div');
    wrapper.className = 'privileged-shell';

    const topGrid = document.createElement('div');
    topGrid.className = 'privileged-grid';

    const heatmapCard = document.createElement('section');
    heatmapCard.className = 'heatmap-card';

    const heatmapHeader = document.createElement('div');
    heatmapHeader.className = 'heatmap-header';

    const heatmapHeading = document.createElement('div');
    const heatmapTitle = document.createElement('h3');
    heatmapTitle.textContent = 'Privileged Login Heatmap';
    const heatmapSubtitle = document.createElement('p');
    heatmapSubtitle.textContent =
        'Account-by-hour view of privileged logins. Click a cell to filter elevational activity.';
    heatmapHeading.appendChild(heatmapTitle);
    heatmapHeading.appendChild(heatmapSubtitle);

    const heatmapMeta = document.createElement('div');
    heatmapMeta.className = 'heatmap-meta';
    const selectionChip = document.createElement('span');
    selectionChip.className = 'control-chip';
    const clearSelection = document.createElement('button');
    clearSelection.type = 'button';
    clearSelection.className = 'control-chip control-chip--button';
    clearSelection.textContent = 'Clear selection';
    heatmapMeta.appendChild(selectionChip);
    heatmapMeta.appendChild(clearSelection);

    heatmapHeader.appendChild(heatmapHeading);
    heatmapHeader.appendChild(heatmapMeta);

    const heatmapWrap = document.createElement('div');
    heatmapWrap.className = 'heatmap-wrap';

    const heatmapLegend = document.createElement('div');
    heatmapLegend.className = 'heatmap-legend';
    const legendLow = document.createElement('span');
    legendLow.className = 'heatmap-legend-item';
    legendLow.textContent = 'Low activity';
    const legendPeak = document.createElement('span');
    legendPeak.className = 'heatmap-legend-item';
    legendPeak.textContent = 'Peak activity';
    const legendAnomaly = document.createElement('span');
    legendAnomaly.className = 'heatmap-legend-item heatmap-legend-item--anomaly';
    legendAnomaly.textContent = 'Anomaly flagged';
    heatmapLegend.appendChild(legendLow);
    heatmapLegend.appendChild(legendPeak);
    heatmapLegend.appendChild(legendAnomaly);

    heatmapCard.appendChild(heatmapHeader);
    heatmapCard.appendChild(heatmapWrap);
    heatmapCard.appendChild(heatmapLegend);

    const sideStack = document.createElement('div');
    sideStack.className = 'privileged-side';

    const inventoryCard = document.createElement('section');
    inventoryCard.className = 'inventory-card';
    const inventoryHeader = document.createElement('div');
    inventoryHeader.className = 'inventory-header';
    const inventoryTitle = document.createElement('h3');
    inventoryTitle.textContent = 'Standing Privilege Inventory';
    const inventorySubtitle = document.createElement('p');
    inventorySubtitle.textContent = 'Counts of standing roles, split by provider vs internal.';
    inventoryHeader.appendChild(inventoryTitle);
    inventoryHeader.appendChild(inventorySubtitle);
    const inventoryMetrics = document.createElement('div');
    inventoryMetrics.className = 'inventory-metrics';
    const inventoryTotal = document.createElement('div');
    inventoryTotal.className = 'inventory-metric';
    const inventoryTotalValue = document.createElement('span');
    inventoryTotalValue.className = 'inventory-value';
    const inventoryTotalLabel = document.createElement('span');
    inventoryTotalLabel.className = 'inventory-label';
    inventoryTotalLabel.textContent = 'Total standing';
    inventoryTotal.appendChild(inventoryTotalValue);
    inventoryTotal.appendChild(inventoryTotalLabel);
    const inventoryProvider = document.createElement('div');
    inventoryProvider.className = 'inventory-metric';
    const inventoryProviderValue = document.createElement('span');
    inventoryProviderValue.className = 'inventory-value';
    const inventoryProviderLabel = document.createElement('span');
    inventoryProviderLabel.className = 'inventory-label';
    inventoryProviderLabel.textContent = 'Provider';
    inventoryProvider.appendChild(inventoryProviderValue);
    inventoryProvider.appendChild(inventoryProviderLabel);
    const inventoryInternal = document.createElement('div');
    inventoryInternal.className = 'inventory-metric';
    const inventoryInternalValue = document.createElement('span');
    inventoryInternalValue.className = 'inventory-value';
    const inventoryInternalLabel = document.createElement('span');
    inventoryInternalLabel.className = 'inventory-label';
    inventoryInternalLabel.textContent = 'Internal';
    inventoryInternal.appendChild(inventoryInternalValue);
    inventoryInternal.appendChild(inventoryInternalLabel);
    inventoryMetrics.appendChild(inventoryTotal);
    inventoryMetrics.appendChild(inventoryProvider);
    inventoryMetrics.appendChild(inventoryInternal);
    inventoryCard.appendChild(inventoryHeader);
    inventoryCard.appendChild(inventoryMetrics);

    const breakGlassCard = document.createElement('section');
    breakGlassCard.className = 'breakglass-card';
    const breakGlassHeader = document.createElement('div');
    breakGlassHeader.className = 'breakglass-header';
    const breakGlassTitle = document.createElement('h3');
    breakGlassTitle.textContent = 'Break-glass Usage';
    const breakGlassSubtitle = document.createElement('p');
    breakGlassSubtitle.textContent =
        'Impossible-to-miss signal for emergency access.';
    breakGlassHeader.appendChild(breakGlassTitle);
    breakGlassHeader.appendChild(breakGlassSubtitle);
    const breakGlassTileWrap = document.createElement('div');
    breakGlassTileWrap.className = 'breakglass-tile-wrap';
    const breakGlassTimeline = document.createElement('div');
    breakGlassTimeline.className = 'breakglass-timeline';
    breakGlassCard.appendChild(breakGlassHeader);
    breakGlassCard.appendChild(breakGlassTileWrap);
    breakGlassCard.appendChild(breakGlassTimeline);

    sideStack.appendChild(inventoryCard);
    sideStack.appendChild(breakGlassCard);

    topGrid.appendChild(heatmapCard);
    topGrid.appendChild(sideStack);

    const elevationCard = document.createElement('section');
    elevationCard.className = 'table-card elevation-card';

    const elevationHeader = document.createElement('div');
    elevationHeader.className = 'elevation-header';
    const elevationHeading = document.createElement('div');
    const elevationTitle = document.createElement('h3');
    elevationTitle.textContent = 'Role Elevation Events (7d)';
    const elevationSubtitle = document.createElement('p');
    elevationSubtitle.textContent =
        'Identity-centric view of who elevated, why, and what they touched.';
    elevationHeading.appendChild(elevationTitle);
    elevationHeading.appendChild(elevationSubtitle);
    const elevationMeta = document.createElement('div');
    elevationMeta.className = 'elevation-meta';
    const elevationWindowChip = document.createElement('span');
    elevationWindowChip.className = 'control-chip';
    const elevationSelectionChip = document.createElement('span');
    elevationSelectionChip.className = 'control-chip';
    elevationMeta.appendChild(elevationWindowChip);
    elevationMeta.appendChild(elevationSelectionChip);
    elevationHeader.appendChild(elevationHeading);
    elevationHeader.appendChild(elevationMeta);

    const elevationTableWrap = document.createElement('div');
    elevationTableWrap.className = 'table-scroll';

    elevationCard.appendChild(elevationHeader);
    elevationCard.appendChild(elevationTableWrap);

    const timelineCard = document.createElement('section');
    timelineCard.className = 'timeline-card operator-timeline-card';
    const timelineHeader = document.createElement('div');
    timelineHeader.className = 'timeline-header';
    const timelineHeading = document.createElement('div');
    const timelineTitle = document.createElement('h3');
    timelineTitle.textContent = 'Operator Timeline';
    const timelineSubtitle = document.createElement('p');
    timelineSubtitle.textContent =
        'Drilldown of sessions and actions for the selected operator and window.';
    timelineHeading.appendChild(timelineTitle);
    timelineHeading.appendChild(timelineSubtitle);
    const timelineMeta = document.createElement('div');
    timelineMeta.className = 'timeline-meta';
    const timelineChip = document.createElement('span');
    timelineChip.className = 'control-chip';
    const timelineLink = document.createElement('a');
    timelineLink.className = 'control-chip control-chip--button';
    timelineLink.href = '#/drilldown/operator-timeline';
    timelineLink.textContent = 'Open full drilldown';
    timelineMeta.appendChild(timelineChip);
    timelineMeta.appendChild(timelineLink);
    timelineHeader.appendChild(timelineHeading);
    timelineHeader.appendChild(timelineMeta);
    const timelineBody = document.createElement('div');
    timelineBody.className = 'timeline-body';
    timelineCard.appendChild(timelineHeader);
    timelineCard.appendChild(timelineBody);

    wrapper.appendChild(topGrid);
    wrapper.appendChild(elevationCard);
    wrapper.appendChild(timelineCard);

    const proofPanel = createProofPanel({ title: 'Break-glass Proof' });
    wrapper.appendChild(proofPanel);

    let selectedCell = null;
    let selectedElevation = null;

    function focusTimeline() {
        if (!timelineCard.isConnected) {
            return;
        }
        timelineCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function clearSelectionState() {
        selectedCell = null;
        selectedElevation = null;
        setSelectedTimeWindow(null);
    }

    clearSelection.addEventListener('click', () => {
        clearSelectionState();
        render(getAppState());
    });

    function handleHeatmapSelection(cell, operator) {
        if (!cell || !operator) {
            return;
        }
        selectedCell = {
            operatorId: operator.id,
            hour: cell.hour
        };
        selectedElevation = null;

        if (TECHNICIAN_FILTER_SET.has(operator.technician)) {
            setFilter('technician', operator.technician);
        }
        if (cell.latestTimestampMs) {
            const start = new Date(cell.latestTimestampMs);
            start.setUTCMinutes(0, 0, 0);
            const startMs = start.getTime();
            setSelectedTimeWindow({ start: startMs, end: startMs + 60 * 60 * 1000 });
        } else {
            setSelectedTimeWindow(null);
        }
        render(getAppState());
        focusTimeline();
    }

    function handleElevationRow(row) {
        if (!row || !row._meta) {
            return;
        }
        const { operator, elevation } = row._meta;
        selectedElevation = elevation;
        selectedCell = {
            operatorId: elevation.operatorId,
            hour: new Date(elevation.startTime).getUTCHours()
        };

        if (operator?.technician && TECHNICIAN_FILTER_SET.has(operator.technician)) {
            setFilter('technician', operator.technician);
        }
        const start = Date.parse(elevation.startTime);
        const end = Date.parse(elevation.endTime);
        if (!Number.isNaN(start) && !Number.isNaN(end)) {
            setSelectedTimeWindow({ start, end });
        }
        render(getAppState());
        focusTimeline();
    }

    function render(state) {
        const { filters, selectedTimeWindow } = state;
        const timeRange = getTimeRange(filters);

        const visibleOperators = operators
            .filter((operator) => operatorMatchesFilters(operator, filters))
            .sort((a, b) => {
                if (a.affiliation === b.affiliation) {
                    return a.name.localeCompare(b.name);
                }
                return a.affiliation === 'provider' ? -1 : 1;
            });

        const signInsInRange = privilegedSignIns.filter((signIn) =>
            matchesFilters(signIn, filters, 'timestamp')
        );

        const { matrix, maxCount } = buildHeatmapMatrix(signInsInRange, visibleOperators);

        if (selectedCell && !visibleOperators.find((op) => op.id === selectedCell.operatorId)) {
            selectedCell = null;
        }

        heatmapWrap.innerHTML = '';

        const heatmapGrid = document.createElement('div');
        heatmapGrid.className = 'operator-heatmap';

        const headerRow = document.createElement('div');
        headerRow.className = 'heatmap-row heatmap-row--header';
        const headerLabel = document.createElement('div');
        headerLabel.className = 'heatmap-label';
        headerLabel.textContent = 'Account';
        headerRow.appendChild(headerLabel);
        for (let hour = 0; hour < 24; hour += 1) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-hour';
            cell.textContent = hour % 3 === 0 ? String(hour).padStart(2, '0') : '';
            headerRow.appendChild(cell);
        }
        heatmapGrid.appendChild(headerRow);

        matrix.forEach((row) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'heatmap-row';

            const label = document.createElement('div');
            label.className = 'heatmap-label';
            const name = document.createElement('span');
            name.textContent = row.operator.name;
            const meta = document.createElement('span');
            meta.className = 'heatmap-label-meta';
            meta.textContent = `${capitalize(row.operator.affiliation)} | ${row.operator.providerTeam}`;
            label.appendChild(name);
            label.appendChild(meta);
            rowEl.appendChild(label);

            row.hours.forEach((cell) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'heatmap-cell';
                if (
                    selectedCell &&
                    selectedCell.operatorId === row.operator.id &&
                    selectedCell.hour === cell.hour
                ) {
                    button.classList.add('heatmap-cell--selected');
                }
                if (cell.anomalies > 0) {
                    button.classList.add('heatmap-cell--anomaly');
                }
                button.style.background = getHeatColor(cell.count, maxCount);
                button.textContent = cell.count > 0 ? String(cell.count) : '';
                if (cell.anomalies > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'heatmap-badge';
                    badge.textContent = cell.anomalies > 1 ? String(cell.anomalies) : '!';
                    button.appendChild(badge);
                }
                button.setAttribute(
                    'aria-label',
                    `${row.operator.name} ${formatHourLabel(cell.hour)} ` +
                        `count ${cell.count} anomalies ${cell.anomalies}`
                );
                button.addEventListener('click', () => handleHeatmapSelection(cell, row.operator));
                rowEl.appendChild(button);
            });

            heatmapGrid.appendChild(rowEl);
        });

        heatmapWrap.appendChild(heatmapGrid);

        const selectedOperator = selectedCell ? getOperator(selectedCell.operatorId) : null;
        let selectedCellData = null;
        if (selectedCell && selectedOperator) {
            const row = matrix.find((entry) => entry.operator.id === selectedCell.operatorId);
            selectedCellData = row?.hours[selectedCell.hour] || null;
        }

        if (selectedCell && selectedOperator && selectedCellData) {
            const anomalyText =
                selectedCellData.anomalies > 0
                    ? ` | anomalies ${selectedCellData.anomalies}`
                    : '';
            selectionChip.textContent = `Selected: ${selectedOperator.name} ${formatHourLabel(
                selectedCell.hour
            )} | logins ${selectedCellData.count}${anomalyText}`;
        } else {
            selectionChip.textContent = 'Selected: none';
        }

        const elevationsInRange = elevations.filter((elevation) =>
            matchesFilters(elevation, filters, 'startTime')
        );
        if (
            selectedElevation &&
            !elevationsInRange.some((elevation) => elevation.id === selectedElevation.id)
        ) {
            selectedElevation = null;
        }
        let filteredElevations = elevationsInRange;
        if (selectedCell) {
            filteredElevations = elevationsInRange.filter((elevation) => {
                const hour = new Date(elevation.startTime).getUTCHours();
                return elevation.operatorId === selectedCell.operatorId && hour === selectedCell.hour;
            });
        }

        elevationWindowChip.textContent = selectedTimeWindow
            ? `Window: ${formatDateTime(selectedTimeWindow.start)} - ${formatDateTime(
                  selectedTimeWindow.end
              )}`
            : `Window: ${TIME_RANGE_LABELS[filters.timeRange] || 'Time range'}`;

        elevationSelectionChip.textContent = selectedCell
            ? `Filtered: ${filteredElevations.length} events`
            : `Total: ${filteredElevations.length} events`;

        const rows = filteredElevations.map((elevation) => {
            const operator = getOperator(elevation.operatorId);
            return {
                operator: buildOperatorCell(operator),
                role: getRoleLabel(elevation),
                startDuration: buildStartDurationCell(elevation),
                approvedBy: getApprover(elevation),
                justification: getJustification(elevation),
                actions: buildActionTags(summarizeElevationActions(elevation)),
                elevationPath: buildBadge(getElevationPath(elevation), 'table-badge-path'),
                scope: buildBadge(
                    `${capitalize(elevation.scope)} | ${capitalize(elevation.environment)}`,
                    'table-badge-scope'
                ),
                _meta: {
                    operator,
                    elevation
                }
            };
        });

        elevationTableWrap.innerHTML = '';
        elevationTableWrap.appendChild(
            createSortableTable({
                columns: [
                    { key: 'operator', label: 'Operator', sortable: false },
                    { key: 'role', label: 'Role activated' },
                    { key: 'startDuration', label: 'Start / duration', sortable: false },
                    { key: 'approvedBy', label: 'Approved by' },
                    { key: 'justification', label: 'Justification', sortable: false },
                    { key: 'actions', label: 'Actions while elevated', sortable: false },
                    { key: 'elevationPath', label: 'Elevation path', sortable: false },
                    { key: 'scope', label: 'Scope', sortable: false }
                ],
                rows,
                onRowClick: handleElevationRow
            })
        );

        const standingElevations = elevations.filter(
            (elevation) => elevation.elevationType === 'standing'
        );
        const providerStanding = standingElevations.filter(
            (elevation) => getOperator(elevation.operatorId)?.affiliation === 'provider'
        );
        const internalStanding = standingElevations.filter(
            (elevation) => getOperator(elevation.operatorId)?.affiliation === 'internal'
        );
        inventoryTotalValue.textContent = `${standingElevations.length}`;
        inventoryProviderValue.textContent = `${providerStanding.length}`;
        inventoryInternalValue.textContent = `${internalStanding.length}`;

        const breakGlassEvents = elevations
            .filter((elevation) => elevation.elevationType === 'break-glass')
            .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
        const breakGlassInRange = breakGlassEvents.filter((elevation) => {
            const ts = Date.parse(elevation.startTime);
            return !Number.isNaN(ts) && ts >= timeRange.start && ts <= timeRange.end;
        });

        breakGlassTileWrap.innerHTML = '';
        const breakGlassUsed = breakGlassEvents.length > 0;
        const breakGlassTile = createKpiTile({
            value: breakGlassUsed ? 'YES' : 'NO',
            label: 'Break-glass used',
            status: breakGlassUsed ? 'critical' : 'success',
            statusLabel: breakGlassUsed ? 'urgent' : 'clear',
            helper: breakGlassUsed
                ? `Last use: ${formatDateTime(breakGlassEvents[0]?.startTime)}`
                : 'No break-glass sessions recorded',
            onClick: () => {
                if (!breakGlassUsed) {
                    return;
                }
                const event = breakGlassEvents[0];
                const operator = getOperator(event.operatorId);
                const fields = [
                    { label: 'Operator', value: operator?.name || '--' },
                    { label: 'Session', value: event.id },
                    { label: 'Start', value: formatDateTime(event.startTime) },
                    { label: 'End', value: formatDateTime(event.endTime) },
                    { label: 'Ticket', value: event.ticketLinked ? event.ticketId : 'Unlinked' },
                    {
                        label: 'Actions while elevated',
                        value: summarizeElevationActions(event).join('; ')
                    }
                ];
                proofPanel.setEvent(event, fields);
                proofPanel.open();
            }
        });
        breakGlassTile.classList.add('break-glass-tile');
        breakGlassTileWrap.appendChild(breakGlassTile);

        breakGlassTimeline.innerHTML = '';
        if (breakGlassUsed) {
            const header = document.createElement('div');
            header.className = 'breakglass-timeline-header';
            header.textContent = breakGlassInRange.length
                ? 'Break-glass session timeline'
                : 'Break-glass session timeline (outside current window)';
            breakGlassTimeline.appendChild(header);
            breakGlassEvents.forEach((event) => {
                const item = document.createElement('div');
                item.className = 'breakglass-timeline-item';
                const operator = getOperator(event.operatorId);
                item.textContent = `${formatDateTime(event.startTime)} | ${
                    operator?.name || 'Unknown'
                } | ${formatDuration(event.durationMins)} | ${getElevationPath(event)}`;
                breakGlassTimeline.appendChild(item);
            });
        } else {
            const empty = document.createElement('div');
            empty.className = 'breakglass-timeline-empty';
            empty.textContent = 'No break-glass sessions recorded.';
            breakGlassTimeline.appendChild(empty);
        }

        const timelineOperatorId = selectedElevation
            ? selectedElevation.operatorId
            : selectedCell?.operatorId;
        let timelineWindow = null;
        if (selectedElevation) {
            const start = Date.parse(selectedElevation.startTime);
            const end = Date.parse(selectedElevation.endTime);
            if (!Number.isNaN(start) && !Number.isNaN(end)) {
                timelineWindow = { start, end };
            }
        } else if (selectedCellData?.latestTimestampMs) {
            const start = new Date(selectedCellData.latestTimestampMs);
            start.setUTCMinutes(0, 0, 0);
            const startMs = start.getTime();
            timelineWindow = { start: startMs, end: startMs + 60 * 60 * 1000 };
        }

        timelineChip.textContent = timelineOperatorId
            ? `Selected: ${getOperator(timelineOperatorId)?.name || '--'}`
            : 'Selected: none';

        const timelineEvents = buildTimelineEvents(
            timelineOperatorId,
            timelineWindow,
            signInsInRange,
            elevationsInRange
        );
        timelineBody.innerHTML = '';
        timelineBody.appendChild(buildTimelineList(timelineEvents));
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
