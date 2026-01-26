import { createKpiTile } from '../../tiles.js';
import { createSortableTable } from '../../table.js';
import { createProofPanel } from '../../proofPanel.js';
import { changeEvents } from '../../mockData.js';
import { getAppState, onStateChange } from '../../outsourcer-state.js';
import {
    buildDrilldownHeader,
    buildEmptyState,
    buildSectionHeader,
    buildSelectField,
    downloadJson,
    formatDateTime,
    getBadgeForSeverity,
    getOperatorById,
    getOperatorLabel,
    getQueryParam,
    getNowMs,
    setQueryParam,
    severityRank
} from './shared.js';

const CATEGORY_MAP = {
    'policy-update': 'Policy',
    'role-permission': 'Access',
    'key-rotation': 'Key Management',
    'emergency-disable': 'Emergency',
    'configuration-update': 'Configuration',
    'policy-delete': 'Policy'
};

function getCategory(change) {
    return CATEGORY_MAP[change.changeType] || 'Change';
}

function matchesFilters(change, filters) {
    const operator = getOperatorById(change.operatorId);
    if (filters.providerTeam !== 'all' && operator?.providerTeam !== filters.providerTeam) {
        return false;
    }
    if (filters.actorType !== 'all' && operator?.actorType !== filters.actorType) {
        return false;
    }
    if (filters.scope !== 'all' && change.scope && change.scope !== filters.scope) {
        return false;
    }
    if (filters.environment !== 'all' && change.environment && change.environment !== filters.environment) {
        return false;
    }
    if (filters.severity !== 'all' && change.severity && change.severity !== filters.severity) {
        return false;
    }
    if (filters.ticketLinkage !== 'all') {
        if (filters.ticketLinkage === 'linked' && !change.ticketLinked) {
            return false;
        }
        if (filters.ticketLinkage === 'unlinked' && change.ticketLinked) {
            return false;
        }
    }
    return true;
}

function withinLast30Days(change) {
    const end = getNowMs();
    const start = end - 30 * 24 * 60 * 60 * 1000;
    const timestamp = Date.parse(change.timestamp);
    return !Number.isNaN(timestamp) && timestamp >= start && timestamp <= end;
}

export function buildResourceImpactDrilldown() {
    const shell = document.createElement('div');
    shell.className = 'drilldown-shell';

    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'drilldown-grid';

    const summarySection = document.createElement('section');
    summarySection.className = 'drilldown-section';

    const tableSection = document.createElement('section');
    tableSection.className = 'drilldown-section';

    const categoryGrid = document.createElement('div');
    categoryGrid.className = 'category-grid';

    const tableWrap = document.createElement('div');
    tableWrap.className = 'drilldown-table';

    const filterRow = document.createElement('div');
    filterRow.className = 'drilldown-filters';

    const proofPanel = createProofPanel({ title: 'Change proof' });

    const header = buildDrilldownHeader({
        title: 'Resource Impact View',
        subtitle: 'Everything changed on the resource in the last 30 days with categories and risk.',
        onExport: () => {
            const urlResource = getQueryParam('resource');
            const exportChanges = changeEvents
                .filter(withinLast30Days)
                .filter((change) => !urlResource || change.resourceId === urlResource);
            downloadJson('resource-impact.json', exportChanges);
        }
    });

    function render(state) {
        const { filters } = state;
        const last30Changes = changeEvents.filter(withinLast30Days).filter((change) => matchesFilters(change, filters));

        const resourceOptions = Array.from(
            new Map(
                last30Changes.map((change) => [change.resourceId, change.resourceName || change.resourceId])
            ).entries()
        ).map(([value, label]) => ({ value, label }));

        const urlResource = getQueryParam('resource');
        const selectedResource =
            resourceOptions.find((option) => option.value === urlResource)?.value ||
            resourceOptions[0]?.value ||
            '';

        if (selectedResource && selectedResource !== urlResource) {
            setQueryParam('resource', selectedResource);
        }

        const selectedChanges = last30Changes.filter(
            (change) => !selectedResource || change.resourceId === selectedResource
        );

        filterRow.innerHTML = '';
        filterRow.appendChild(
            buildSelectField({
                id: 'resourceSelect',
                label: 'Resource (last 30 days)',
                options: resourceOptions.length
                    ? resourceOptions
                    : [{ value: '', label: 'No changes in window' }],
                value: selectedResource,
                onChange: (value) => {
                    setQueryParam('resource', value);
                    render(getAppState());
                }
            })
        );

        summaryGrid.innerHTML = '';
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Changes',
                value: `${selectedChanges.length}`,
                status: selectedChanges.length ? 'warning' : 'neutral'
            })
        );

        const uniqueOperators = new Set(selectedChanges.map((change) => change.operatorId));
        summaryGrid.appendChild(
            createKpiTile({
                label: 'Operators',
                value: `${uniqueOperators.size}`,
                status: uniqueOperators.size ? 'success' : 'neutral'
            })
        );

        const highRisk = selectedChanges.filter((change) => ['high', 'critical'].includes(change.severity));
        summaryGrid.appendChild(
            createKpiTile({
                label: 'High risk',
                value: `${highRisk.length}`,
                status: highRisk.length ? 'danger' : 'success'
            })
        );

        const unlinked = selectedChanges.filter((change) => !change.ticketLinked).length;
        summaryGrid.appendChild(
            createKpiTile({
                label: 'No ticket',
                value: `${unlinked}`,
                status: unlinked ? 'warning' : 'success'
            })
        );

        categoryGrid.innerHTML = '';
        if (selectedChanges.length === 0) {
            categoryGrid.appendChild(buildEmptyState('No resource changes', 'Select another resource.'));
        } else {
            const byCategory = new Map();
            selectedChanges.forEach((change) => {
                const category = getCategory(change);
                if (!byCategory.has(category)) {
                    byCategory.set(category, []);
                }
                byCategory.get(category).push(change);
            });

            Array.from(byCategory.entries()).forEach(([category, changes]) => {
                const card = document.createElement('div');
                card.className = 'category-card';

                const title = document.createElement('strong');
                title.textContent = category;
                const count = document.createElement('span');
                count.textContent = `${changes.length} changes`;

                const peak = changes.reduce(
                    (max, change) => (severityRank(change.severity) > severityRank(max) ? change.severity : max),
                    'low'
                );
                const peakLabel = document.createElement('span');
                peakLabel.className = `category-risk category-risk--${peak}`;
                peakLabel.textContent = `${peak.toUpperCase()} risk`;

                card.appendChild(title);
                card.appendChild(count);
                card.appendChild(peakLabel);
                categoryGrid.appendChild(card);
            });
        }

        const rows = selectedChanges.map((change) => {
            const operator = getOperatorById(change.operatorId);
            return {
                timestamp: formatDateTime(change.timestamp),
                action: change.changeType,
                operator: getOperatorLabel(operator),
                category: getCategory(change),
                risk: getBadgeForSeverity(change.severity),
                ticket: change.ticketLinked ? 'Linked' : 'Missing',
                _meta: change
            };
        });

        tableWrap.innerHTML = '';
        if (rows.length === 0) {
            tableWrap.appendChild(
                buildEmptyState('No changes found', 'Try a different resource or broaden filters.')
            );
        } else {
            tableWrap.appendChild(
                createSortableTable({
                    columns: [
                        { key: 'timestamp', label: 'Timestamp' },
                        { key: 'action', label: 'Change type' },
                        { key: 'operator', label: 'Changed by' },
                        { key: 'category', label: 'Category' },
                        { key: 'risk', label: 'Risk' },
                        { key: 'ticket', label: 'Ticket' }
                    ],
                    rows,
                    initialSort: { key: 'timestamp', direction: 'desc' },
                    onRowClick: (row) => {
                        if (!row?._meta) {
                            return;
                        }
                        const change = row._meta;
                        proofPanel.setEvent(change, [
                            { label: 'Resource', value: change.resourceName },
                            { label: 'Change type', value: change.changeType },
                            { label: 'Operator', value: getOperatorLabel(getOperatorById(change.operatorId)) },
                            { label: 'Ticket', value: change.ticketId || (change.ticketLinked ? 'Linked' : 'Missing') },
                            { label: 'Risk', value: change.severity },
                            { label: 'Before', value: change.before },
                            { label: 'After', value: change.after },
                            { label: 'Timestamp', value: change.timestamp }
                        ]);
                        proofPanel.open();
                    }
                })
            );
        }
    }

    summarySection.appendChild(
        buildSectionHeader('Category + risk map', 'Categorized changes and peak risk on the selected resource.')
    );
    summarySection.appendChild(categoryGrid);

    tableSection.appendChild(
        buildSectionHeader('Change ledger', 'Full list of changes within the last 30 days with proof details.')
    );
    tableSection.appendChild(tableWrap);

    shell.appendChild(header);
    shell.appendChild(summaryGrid);
    shell.appendChild(filterRow);
    shell.appendChild(summarySection);
    shell.appendChild(tableSection);
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
