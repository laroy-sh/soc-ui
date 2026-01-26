import { createSortableTable } from '../../table.js';
import { createKpiTile } from '../../tiles.js';
import { createProofPanel } from '../../proofPanel.js';
import {
    changeEvents,
    controlTamperingAttempts,
    elevations,
    privilegedSignIns,
    riskEvents
} from '../../mockData.js';
import { getAppState, onStateChange } from '../../outsourcer-state.js';
import {
    buildChip,
    buildDrilldownHeader,
    buildEmptyState,
    buildSectionHeader,
    compareSeverityDesc,
    downloadJson,
    filterByWindow,
    formatDateTime,
    formatList,
    getBadgeForSeverity,
    getOperatorById,
    getOperatorLabel,
    getTimeRange,
    severityRank
} from './shared.js';

const TYPE_LABELS = {
    change: 'Change',
    risk: 'Risk event',
    signIn: 'Privileged sign-in',
    elevation: 'Elevation',
    tamper: 'Control tamper'
};

function matchesFilters(item, filters) {
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
    if (filters.severity !== 'all' && item.severity && item.severity !== filters.severity) {
        return false;
    }
    return true;
}

function buildNoTicketEvents(filters) {
    const events = [];

    riskEvents
        .filter((item) => !item.ticketLinked)
        .filter((item) => matchesFilters(item, filters))
        .forEach((item) => {
            events.push({
                id: item.id,
                operatorId: item.operatorId,
                timestamp: item.timestamp,
                severity: item.severity,
                type: 'risk',
                summary: item.summary,
                resource: item.resourceName || item.resourceId,
                source: item
            });
        });

    changeEvents
        .filter((item) => !item.ticketLinked)
        .filter((item) => matchesFilters(item, filters))
        .forEach((item) => {
            events.push({
                id: item.id,
                operatorId: item.operatorId,
                timestamp: item.timestamp,
                severity: item.severity,
                type: 'change',
                summary: `${item.changeType} • ${item.resourceName}`,
                resource: item.resourceName,
                source: item
            });
        });

    privilegedSignIns
        .filter((item) => !item.ticketLinked)
        .filter((item) => matchesFilters(item, filters))
        .forEach((item) => {
            events.push({
                id: item.id,
                operatorId: item.operatorId,
                timestamp: item.timestamp,
                severity: item.severity,
                type: 'signIn',
                summary: `Sign-in ${formatList(item.anomalyFlags)}`,
                resource: item.geo,
                source: item
            });
        });

    elevations
        .filter((item) => !item.ticketLinked)
        .filter((item) => matchesFilters(item, filters))
        .forEach((item) => {
            events.push({
                id: item.id,
                operatorId: item.operatorId,
                timestamp: item.startTime,
                severity: item.severity,
                type: 'elevation',
                summary: `${item.elevationType} • ${item.method}`,
                resource: item.scope,
                source: item
            });
        });

    controlTamperingAttempts
        .filter((item) => !item.ticketLinked)
        .filter((item) => matchesFilters(item, filters))
        .forEach((item) => {
            events.push({
                id: item.id,
                operatorId: item.operatorId,
                timestamp: item.timestamp,
                severity: item.severity,
                type: 'tamper',
                summary: `${item.control} • ${item.method}`,
                resource: item.control,
                source: item
            });
        });

    return events;
}

export function buildNoTicketDrilldown() {
    const shell = document.createElement('div');
    shell.className = 'drilldown-shell';

    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'drilldown-grid';

    const groupsWrap = document.createElement('div');
    groupsWrap.className = 'ticketless-groups';

    const proofPanel = createProofPanel({ title: 'Unlinked action proof' });

    const header = buildDrilldownHeader({
        title: 'Change Without Ticket View',
        subtitle: 'All privileged actions or risky changes without ticket linkage, grouped by technician.',
        onExport: () => {
            const { filters, selectedTimeWindow } = getAppState();
            const windowRange = selectedTimeWindow || getTimeRange(filters);
            const exportEvents = buildNoTicketEvents(filters).filter((event) =>
                filterByWindow(event.timestamp, windowRange)
            );
            downloadJson('no-ticket-actions.json', exportEvents);
        }
    });

    function render(state) {
        const { filters, selectedTimeWindow } = state;
        const windowRange = selectedTimeWindow || getTimeRange(filters);

        const events = buildNoTicketEvents(filters).filter((event) =>
            filterByWindow(event.timestamp, windowRange)
        );

        const totalEvents = events.length;
        const uniqueTechs = new Set(events.map((event) => event.operatorId)).size;
        const criticalCount = events.filter((event) => event.severity === 'critical').length;
        const highCount = events.filter((event) => event.severity === 'high').length;

        summaryGrid.innerHTML = '';
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Unlinked actions',
                value: `${totalEvents}`,
                status: totalEvents ? 'danger' : 'success'
            })
        );
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Technicians',
                value: `${uniqueTechs}`,
                status: uniqueTechs ? 'warning' : 'neutral'
            })
        );
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Critical',
                value: `${criticalCount}`,
                status: criticalCount ? 'danger' : 'success'
            })
        );
        summaryGrid.appendChild(
            createKpiTile({
                label: 'High risk',
                value: `${highCount}`,
                status: highCount ? 'warning' : 'success'
            })
        );

        const grouped = new Map();
        events.forEach((event) => {
            if (!grouped.has(event.operatorId)) {
                grouped.set(event.operatorId, []);
            }
            grouped.get(event.operatorId).push(event);
        });

        const groups = Array.from(grouped.entries()).map(([operatorId, items]) => {
            const peak = items.reduce(
                (max, item) => (severityRank(item.severity) > severityRank(max) ? item.severity : max),
                'low'
            );
            return {
                operatorId,
                items,
                peak
            };
        });

        groups.sort((a, b) => {
            const severityDiff = severityRank(b.peak) - severityRank(a.peak);
            if (severityDiff !== 0) {
                return severityDiff;
            }
            return b.items.length - a.items.length;
        });

        groupsWrap.innerHTML = '';

        if (groups.length === 0) {
            groupsWrap.appendChild(
                buildEmptyState('No unlinked actions', 'All privileged activity has ticket coverage.')
            );
        } else {
            groups.forEach((group) => {
                const operator = getOperatorById(group.operatorId);
                const card = document.createElement('section');
                card.className = 'ticketless-card';

                const headerRow = document.createElement('div');
                headerRow.className = 'ticketless-header';

                const title = document.createElement('div');
                const name = document.createElement('strong');
                name.textContent = getOperatorLabel(operator);
                const subtitle = document.createElement('span');
                subtitle.textContent = `${group.items.length} actions • Peak ${group.peak.toUpperCase()}`;
                title.appendChild(name);
                title.appendChild(subtitle);

                const meta = document.createElement('div');
                meta.className = 'ticketless-meta';
                meta.appendChild(buildChip(`${group.items.length} items`));
                meta.appendChild(buildChip(`Peak ${group.peak.toUpperCase()}`));

                headerRow.appendChild(title);
                headerRow.appendChild(meta);
                card.appendChild(headerRow);

                const rows = group.items
                    .slice()
                    .sort((a, b) => {
                        const severityDiff = compareSeverityDesc(a.severity, b.severity);
                        if (severityDiff !== 0) {
                            return severityDiff;
                        }
                        return Date.parse(b.timestamp) - Date.parse(a.timestamp);
                    })
                    .map((item) => ({
                        timestamp: formatDateTime(item.timestamp),
                        type: TYPE_LABELS[item.type] || 'Event',
                        summary: item.summary,
                        risk: getBadgeForSeverity(item.severity),
                        _meta: item
                    }));

                const table = createSortableTable({
                    columns: [
                        { key: 'timestamp', label: 'Timestamp' },
                        { key: 'type', label: 'Type' },
                        { key: 'summary', label: 'Summary' },
                        { key: 'risk', label: 'Risk' }
                    ],
                    rows,
                    initialSort: { key: 'risk', direction: 'desc' },
                    onRowClick: (row) => {
                        const event = row?._meta;
                        if (!event) {
                            return;
                        }
                        proofPanel.setEvent(event.source, [
                            { label: 'Operator', value: getOperatorLabel(getOperatorById(event.operatorId)) },
                            { label: 'Type', value: TYPE_LABELS[event.type] },
                            { label: 'Summary', value: event.summary },
                            { label: 'Resource', value: event.resource },
                            { label: 'Severity', value: event.severity },
                            { label: 'Timestamp', value: event.timestamp }
                        ]);
                        proofPanel.open();
                    }
                });

                card.appendChild(table);
                groupsWrap.appendChild(card);
            });
        }
    }

    const sectionHeader = buildSectionHeader(
        'Risk-first technician groups',
        'Grouped by technician, ordered by peak risk severity.'
    );

    const groupsSection = document.createElement('section');
    groupsSection.className = 'drilldown-section';
    groupsSection.appendChild(sectionHeader);
    groupsSection.appendChild(groupsWrap);

    shell.appendChild(header);
    shell.appendChild(summaryGrid);
    shell.appendChild(groupsSection);
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
