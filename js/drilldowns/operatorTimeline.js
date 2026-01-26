import { createKpiTile } from '../../tiles.js';
import { createProofPanel } from '../../proofPanel.js';
import {
    changeEvents,
    controlTamperingAttempts,
    elevations,
    operators,
    privilegedSignIns,
    riskEvents
} from '../../mockData.js';
import { getAppState, onStateChange, setFilter, setSelectedTimeWindow } from '../../outsourcer-state.js';
import {
    buildChip,
    buildDrilldownHeader,
    buildEmptyState,
    buildSectionHeader,
    buildSelectField,
    downloadJson,
    filterByWindow,
    formatDateTime,
    formatList,
    formatRangeLabel,
    getOperatorById,
    getOperatorLabel,
    getTimeRange,
    severityRank
} from './shared.js';

const EVENT_TYPES = {
    signIn: 'Privileged sign-in',
    change: 'Change',
    risk: 'Risk event',
    elevation: 'Elevation',
    tamper: 'Control tamper'
};

function matchesFilters(item, filters, timestampField) {
    const operator = getOperatorById(item.operatorId);
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
    if (filters.severity !== 'all' && item.severity && item.severity !== filters.severity) {
        return false;
    }
    if (timestampField && !item[timestampField]) {
        return false;
    }
    return true;
}

function buildTimelineEvents(filters) {
    const events = [];

    riskEvents
        .filter((item) => matchesFilters(item, filters, 'timestamp'))
        .forEach((item) => {
            events.push({
                id: item.id,
                operatorId: item.operatorId,
                timestamp: item.timestamp,
                severity: item.severity,
                sessionId: item.sessionId,
                ticketLinked: item.ticketLinked,
                ticketId: item.ticketId,
                type: 'risk',
                summary: item.summary,
                resource: item.resourceName || item.resourceId,
                source: item
            });
        });

    changeEvents
        .filter((item) => matchesFilters(item, filters, 'timestamp'))
        .forEach((item) => {
            events.push({
                id: item.id,
                operatorId: item.operatorId,
                timestamp: item.timestamp,
                severity: item.severity,
                sessionId: item.sessionId,
                ticketLinked: item.ticketLinked,
                ticketId: item.ticketId,
                type: 'change',
                summary: `${item.changeType} • ${item.resourceName}`,
                resource: item.resourceName,
                source: item
            });
        });

    privilegedSignIns
        .filter((item) => matchesFilters(item, filters, 'timestamp'))
        .forEach((item) => {
            events.push({
                id: item.id,
                operatorId: item.operatorId,
                timestamp: item.timestamp,
                severity: item.severity,
                sessionId: item.sessionId,
                ticketLinked: item.ticketLinked,
                ticketId: item.ticketId,
                type: 'signIn',
                summary: `Sign-in ${formatList(item.anomalyFlags)}`,
                resource: item.geo,
                source: item
            });
        });

    elevations
        .filter((item) => matchesFilters(item, filters, 'startTime'))
        .forEach((item) => {
            events.push({
                id: item.id,
                operatorId: item.operatorId,
                timestamp: item.startTime,
                severity: item.severity,
                sessionId: item.sessionId,
                ticketLinked: item.ticketLinked,
                ticketId: item.ticketId,
                type: 'elevation',
                summary: `${item.elevationType} • ${item.method}`,
                resource: item.scope,
                source: item
            });
        });

    controlTamperingAttempts
        .filter((item) => matchesFilters(item, filters, 'timestamp'))
        .forEach((item) => {
            events.push({
                id: item.id,
                operatorId: item.operatorId,
                timestamp: item.timestamp,
                severity: item.severity,
                sessionId: item.sessionId,
                ticketLinked: item.ticketLinked,
                ticketId: item.ticketId,
                type: 'tamper',
                summary: `${item.control} • ${item.method}`,
                resource: item.control,
                source: item
            });
        });

    return events;
}

function groupBySession(events) {
    const groups = new Map();

    events.forEach((event) => {
        const key = event.sessionId || 'unlinked';
        if (!groups.has(key)) {
            groups.set(key, {
                sessionId: key,
                events: []
            });
        }
        groups.get(key).events.push(event);
    });

    const grouped = Array.from(groups.values()).map((group) => {
        const sorted = [...group.events].sort((a, b) => {
            const aTime = Date.parse(a.timestamp);
            const bTime = Date.parse(b.timestamp);
            return aTime - bTime;
        });
        const times = sorted.map((event) => Date.parse(event.timestamp)).filter((val) => !Number.isNaN(val));
        const start = times.length ? Math.min(...times) : null;
        const end = times.length ? Math.max(...times) : null;
        const highestSeverity = sorted.reduce(
            (max, event) => (severityRank(event.severity) > severityRank(max) ? event.severity : max),
            'low'
        );
        return {
            ...group,
            events: sorted,
            start,
            end,
            highestSeverity
        };
    });

    return grouped.sort((a, b) => {
        const aTime = a.end || 0;
        const bTime = b.end || 0;
        return bTime - aTime;
    });
}

function buildEventRow(event, proofPanel) {
    const row = document.createElement('div');
    row.className = 'session-item';

    const time = document.createElement('span');
    time.className = 'session-time';
    time.textContent = formatDateTime(event.timestamp);

    const detail = document.createElement('div');
    detail.className = 'session-detail';
    const title = document.createElement('strong');
    title.textContent = EVENT_TYPES[event.type] || 'Event';
    const summary = document.createElement('span');
    summary.textContent = event.summary || '--';
    detail.appendChild(title);
    detail.appendChild(summary);

    const resource = document.createElement('span');
    resource.className = 'session-resource';
    resource.textContent = event.resource || '--';

    const severity = document.createElement('span');
    severity.className = `session-severity session-severity--${event.severity || 'low'}`;
    severity.textContent = event.severity ? event.severity.toUpperCase() : 'LOW';

    row.appendChild(time);
    row.appendChild(detail);
    row.appendChild(resource);
    row.appendChild(severity);

    row.addEventListener('click', () => {
        proofPanel.setEvent(event.source, [
            { label: 'Operator', value: getOperatorLabel(getOperatorById(event.operatorId)) },
            { label: 'Event type', value: EVENT_TYPES[event.type] || 'Event' },
            { label: 'Summary', value: event.summary },
            { label: 'Resource', value: event.resource },
            { label: 'Severity', value: event.severity },
            { label: 'Ticket', value: event.ticketId || (event.ticketLinked === false ? 'Unlinked' : '--') },
            { label: 'Session', value: event.sessionId || 'Unlinked' },
            { label: 'Timestamp', value: event.timestamp }
        ]);
        proofPanel.open();
    });

    return row;
}

export function buildOperatorTimelineDrilldown() {
    const shell = document.createElement('div');
    shell.className = 'drilldown-shell';

    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'drilldown-grid';

    const timelineSection = document.createElement('section');
    timelineSection.className = 'drilldown-section';

    const sessionList = document.createElement('div');
    sessionList.className = 'session-list';

    const filtersWrap = document.createElement('div');
    filtersWrap.className = 'drilldown-filters';

    const proofPanel = createProofPanel({ title: 'Proof Panel' });

    const header = buildDrilldownHeader({
        title: 'Operator Timeline View',
        subtitle: 'Ordered event sequence for one technician, grouped by session and time window.',
        onExport: () => {
            const { filters, selectedTimeWindow } = getAppState();
            const windowRange = selectedTimeWindow || getTimeRange(filters);
            const exportEvents = buildTimelineEvents(filters).filter((event) => {
                if (!filterByWindow(event.timestamp, windowRange)) {
                    return false;
                }
                const operator = getOperatorById(event.operatorId);
                return operator?.technician === filters.technician;
            });
            downloadJson('operator-timeline.json', exportEvents);
        }
    });

    const state = getAppState();
    if (state.filters.technician === 'all' && operators[0]) {
        setFilter('technician', operators[0].technician);
    }

    function render(currentState) {
        const { filters, selectedTimeWindow } = currentState;
        const windowRange = selectedTimeWindow || getTimeRange(filters);

        const technicianOptions = operators.map((operator) => ({
            value: operator.technician,
            label: `${operator.name} (${operator.technician})`
        }));

        const technicianField = buildSelectField({
            id: 'timelineTechnician',
            label: 'Technician',
            options: technicianOptions,
            value: filters.technician,
            onChange: (value) => setFilter('technician', value)
        });

        const timeChip = document.createElement('div');
        timeChip.className = 'drilldown-time';
        const windowLabel = document.createElement('span');
        windowLabel.textContent = `Window: ${formatRangeLabel(windowRange.start, windowRange.end)}`;
        timeChip.appendChild(windowLabel);

        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'control-chip control-chip--button';
        clear.textContent = 'Clear window';
        clear.style.display = selectedTimeWindow ? 'inline-flex' : 'none';
        clear.addEventListener('click', () => setSelectedTimeWindow(null));

        filtersWrap.innerHTML = '';
        filtersWrap.appendChild(technicianField);
        filtersWrap.appendChild(timeChip);
        filtersWrap.appendChild(clear);

        const events = buildTimelineEvents(filters)
            .filter((event) => filterByWindow(event.timestamp, windowRange))
            .filter((event) => {
                const operator = getOperatorById(event.operatorId);
                return operator?.technician === filters.technician;
            });

        const grouped = groupBySession(events);

        const totalEvents = events.length;
        const sessionsCount = grouped.length;
        const unlinkedSessions = grouped.filter((group) => group.sessionId === 'unlinked').length;
        const highestSeverity = events.reduce(
            (max, event) => (severityRank(event.severity) > severityRank(max) ? event.severity : max),
            'low'
        );

        summaryGrid.innerHTML = '';
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Events',
                value: `${totalEvents}`,
                status: totalEvents === 0 ? 'neutral' : 'warning'
            })
        );
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Sessions',
                value: `${sessionsCount}`,
                status: sessionsCount === 0 ? 'neutral' : 'success'
            })
        );
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Unlinked sessions',
                value: `${unlinkedSessions}`,
                status: unlinkedSessions === 0 ? 'success' : 'warning'
            })
        );
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Peak severity',
                value: highestSeverity.toUpperCase(),
                status: highestSeverity === 'critical' || highestSeverity === 'high' ? 'danger' : 'warning'
            })
        );

        sessionList.innerHTML = '';
        if (grouped.length === 0) {
            sessionList.appendChild(
                buildEmptyState('No sessions in window', 'Adjust technician or time window to load events.')
            );
        } else {
            grouped.forEach((group) => {
                const card = document.createElement('div');
                card.className = 'session-group';

                const header = document.createElement('div');
                header.className = 'session-header';

                const title = document.createElement('div');
                const name = document.createElement('strong');
                name.textContent = group.sessionId === 'unlinked' ? 'Unlinked session' : `Session ${group.sessionId}`;
                const meta = document.createElement('span');
                meta.textContent = formatRangeLabel(group.start, group.end);
                title.appendChild(name);
                title.appendChild(meta);

                const badges = document.createElement('div');
                badges.className = 'session-meta';
                badges.appendChild(buildChip(`${group.events.length} events`));
                badges.appendChild(buildChip(`${group.highestSeverity.toUpperCase()} severity`));

                header.appendChild(title);
                header.appendChild(badges);
                card.appendChild(header);

                const list = document.createElement('div');
                list.className = 'session-event-list';
                group.events.forEach((event) => list.appendChild(buildEventRow(event, proofPanel)));
                card.appendChild(list);

                sessionList.appendChild(card);
            });
        }
    }

    const sectionHeader = buildSectionHeader(
        'Session timeline',
        'Ordered event sequence for the selected technician with proof panel support.'
    );

    timelineSection.appendChild(sectionHeader);
    timelineSection.appendChild(filtersWrap);
    timelineSection.appendChild(sessionList);

    shell.appendChild(header);
    shell.appendChild(summaryGrid);
    shell.appendChild(timelineSection);
    shell.appendChild(proofPanel);

    const unsubscribe = onStateChange((nextState) => {
        if (!shell.isConnected) {
            unsubscribe();
            return;
        }
        render(nextState);
    });

    render(getAppState());

    return shell;
}
