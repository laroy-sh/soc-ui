import { createSortableTable } from '../../table.js';
import { createKpiTile } from '../../tiles.js';
import {
    changeEvents,
    controlTamperingAttempts,
    elevations,
    privilegedSignIns,
    riskEvents
} from '../../mockData.js';
import { getAppState, onStateChange } from '../../outsourcer-state.js';
import {
    buildDrilldownHeader,
    buildSectionHeader,
    downloadJson,
    filterByWindow,
    getOperatorById,
    getTimeRange,
    severityRank
} from './shared.js';

const ACTION_TYPES = [
    { key: 'change', label: 'Changes' },
    { key: 'risk', label: 'Risk events' },
    { key: 'signIn', label: 'Privileged sign-ins' },
    { key: 'elevation', label: 'Elevations' },
    { key: 'tamper', label: 'Control tampering' }
];

function matchesFilters(item, filters) {
    const operator = getOperatorById(item.operatorId);
    if (filters.providerTeam !== 'all' && operator?.providerTeam !== filters.providerTeam) {
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

function collectEvents(filters, windowRange) {
    const events = [];

    riskEvents.filter((item) => matchesFilters(item, filters)).forEach((item) => {
        events.push({
            id: item.id,
            operatorId: item.operatorId,
            timestamp: item.timestamp,
            severity: item.severity,
            ticketLinked: item.ticketLinked,
            type: 'risk',
            source: item
        });
    });

    changeEvents.filter((item) => matchesFilters(item, filters)).forEach((item) => {
        events.push({
            id: item.id,
            operatorId: item.operatorId,
            timestamp: item.timestamp,
            severity: item.severity,
            ticketLinked: item.ticketLinked,
            type: 'change',
            source: item
        });
    });

    privilegedSignIns.filter((item) => matchesFilters(item, filters)).forEach((item) => {
        events.push({
            id: item.id,
            operatorId: item.operatorId,
            timestamp: item.timestamp,
            severity: item.severity,
            ticketLinked: item.ticketLinked,
            type: 'signIn',
            source: item
        });
    });

    elevations.filter((item) => matchesFilters(item, filters)).forEach((item) => {
        events.push({
            id: item.id,
            operatorId: item.operatorId,
            timestamp: item.startTime,
            severity: item.severity,
            ticketLinked: item.ticketLinked,
            type: 'elevation',
            source: item
        });
    });

    controlTamperingAttempts.filter((item) => matchesFilters(item, filters)).forEach((item) => {
        events.push({
            id: item.id,
            operatorId: item.operatorId,
            timestamp: item.timestamp,
            severity: item.severity,
            ticketLinked: item.ticketLinked,
            type: 'tamper',
            source: item
        });
    });

    return events.filter((event) => filterByWindow(event.timestamp, windowRange));
}

function buildSummary(events) {
    const summary = new Map();
    ACTION_TYPES.forEach((action) => summary.set(action.key, { ...action, count: 0, high: 0, noTicket: 0 }));

    events.forEach((event) => {
        if (!summary.has(event.type)) {
            summary.set(event.type, { key: event.type, label: event.type, count: 0, high: 0, noTicket: 0 });
        }
        const row = summary.get(event.type);
        row.count += 1;
        if (severityRank(event.severity) >= severityRank('high')) {
            row.high += 1;
        }
        if (event.ticketLinked === false) {
            row.noTicket += 1;
        }
    });

    return Array.from(summary.values());
}

function buildComparisonCard({ title, summary, maxCount }) {
    const card = document.createElement('div');
    card.className = 'comparison-card';

    const heading = document.createElement('strong');
    heading.textContent = title;
    card.appendChild(heading);

    const table = createSortableTable({
        columns: [
            { key: 'label', label: 'Action type' },
            { key: 'count', label: 'Count', numeric: true },
            { key: 'high', label: 'High/Critical', numeric: true },
            { key: 'noTicket', label: 'No ticket', numeric: true }
        ],
        rows: summary,
        initialSort: { key: 'count', direction: 'desc' }
    });

    const chart = document.createElement('div');
    chart.className = 'comparison-chart';
    summary.forEach((row) => {
        const item = document.createElement('div');
        item.className = 'comparison-row';
        const label = document.createElement('span');
        label.textContent = row.label;
        const track = document.createElement('div');
        track.className = 'bar-track';
        const fill = document.createElement('div');
        fill.className = 'bar-fill';
        const width = maxCount ? (row.count / maxCount) * 100 : 0;
        fill.style.width = `${width}%`;
        track.appendChild(fill);
        const value = document.createElement('span');
        value.textContent = `${row.count}`;
        item.appendChild(label);
        item.appendChild(track);
        item.appendChild(value);
        chart.appendChild(item);
    });

    card.appendChild(table);
    card.appendChild(chart);
    return card;
}

export function buildProviderVsInternalDrilldown() {
    const shell = document.createElement('div');
    shell.className = 'drilldown-shell';

    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'drilldown-grid';

    const comparisonSection = document.createElement('section');
    comparisonSection.className = 'drilldown-section';

    const comparisonGrid = document.createElement('div');
    comparisonGrid.className = 'comparison-grid';

    const header = buildDrilldownHeader({
        title: 'Provider vs Internal Comparison',
        subtitle: 'Same actions split by actor type with side-by-side tables and charts.',
        onExport: () => {
            const { filters, selectedTimeWindow } = getAppState();
            const windowRange = selectedTimeWindow || getTimeRange(filters);
            const exportPayload = collectEvents(filters, windowRange).map((event) => ({
                type: event.type,
                operatorId: event.operatorId,
                affiliation: getOperatorById(event.operatorId)?.affiliation,
                severity: event.severity,
                ticketLinked: event.ticketLinked,
                timestamp: event.timestamp
            }));
            downloadJson('provider-vs-internal.json', exportPayload);
        }
    });

    function render(state) {
        const { filters, selectedTimeWindow } = state;
        const windowRange = selectedTimeWindow || getTimeRange(filters);

        const allEvents = collectEvents(filters, windowRange);
        const providerEvents = allEvents.filter((event) => getOperatorById(event.operatorId)?.affiliation === 'provider');
        const internalEvents = allEvents.filter((event) => getOperatorById(event.operatorId)?.affiliation === 'internal');

        const providerSummary = buildSummary(providerEvents);
        const internalSummary = buildSummary(internalEvents);

        const maxCount = Math.max(
            1,
            ...providerSummary.map((row) => row.count),
            ...internalSummary.map((row) => row.count)
        );

        summaryGrid.innerHTML = '';
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Provider actions',
                value: `${providerEvents.length}`,
                status: providerEvents.length > internalEvents.length ? 'warning' : 'neutral'
            })
        );
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Internal actions',
                value: `${internalEvents.length}`,
                status: internalEvents.length >= providerEvents.length ? 'success' : 'warning'
            })
        );

        const providerRisk = providerEvents.filter((event) => severityRank(event.severity) >= severityRank('high'))
            .length;
        const internalRisk = internalEvents.filter((event) => severityRank(event.severity) >= severityRank('high'))
            .length;

        summaryGrid.appendChild(
            createKpiTile({
                label: 'Provider high/critical',
                value: `${providerRisk}`,
                status: providerRisk ? 'danger' : 'success'
            })
        );
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Internal high/critical',
                value: `${internalRisk}`,
                status: internalRisk ? 'warning' : 'success'
            })
        );

        comparisonGrid.innerHTML = '';
        comparisonGrid.appendChild(
            buildComparisonCard({ title: 'Provider', summary: providerSummary, maxCount })
        );
        comparisonGrid.appendChild(
            buildComparisonCard({ title: 'Internal', summary: internalSummary, maxCount })
        );
    }

    comparisonSection.appendChild(
        buildSectionHeader('Side-by-side action mix', 'Tables and charts share the same scale for comparison.')
    );
    comparisonSection.appendChild(comparisonGrid);

    shell.appendChild(header);
    shell.appendChild(summaryGrid);
    shell.appendChild(comparisonSection);

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
