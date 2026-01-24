import { getAppState, onStateChange, setFilter, resetFilters } from './outsourcer-state.js';

const filterConfig = [
    {
        key: 'timeRange',
        label: 'Time Range',
        options: [
            { value: '24h', label: 'Last 24h' },
            { value: '7d', label: 'Last 7d' },
            { value: '30d', label: 'Last 30d' },
            { value: '90d', label: 'Last 90d' }
        ]
    },
    {
        key: 'providerTeam',
        label: 'Provider Team',
        options: [
            { value: 'all', label: 'All teams' },
            { value: 'tier-1', label: 'Tier 1 ops' },
            { value: 'tier-2', label: 'Tier 2 ops' },
            { value: 'platform', label: 'Platform' },
            { value: 'db', label: 'Database' }
        ]
    },
    {
        key: 'technician',
        label: 'Technician',
        options: [
            { value: 'all', label: 'All operators' },
            { value: 'taylor.m', label: 'Taylor M.' },
            { value: 'r.singh', label: 'R. Singh' },
            { value: 'svc-bastion', label: 'svc-bastion' },
            { value: 'night-shift', label: 'Night shift' }
        ]
    },
    {
        key: 'actorType',
        label: 'Actor Type',
        options: [
            { value: 'all', label: 'All actors' },
            { value: 'human', label: 'Human' },
            { value: 'automation', label: 'Automation' },
            { value: 'emergency', label: 'Break-glass' }
        ]
    },
    {
        key: 'scope',
        label: 'Scope',
        options: [
            { value: 'all', label: 'All scopes' },
            { value: 'privileged', label: 'Privileged access' },
            { value: 'change', label: 'Security-impacting change' },
            { value: 'identity', label: 'Identity control' },
            { value: 'data', label: 'Data plane' }
        ]
    },
    {
        key: 'environment',
        label: 'Environment',
        options: [
            { value: 'all', label: 'All envs' },
            { value: 'prod', label: 'Production' },
            { value: 'staging', label: 'Staging' },
            { value: 'dev', label: 'Development' }
        ]
    },
    {
        key: 'ticketLinkage',
        label: 'Ticket Linkage',
        options: [
            { value: 'all', label: 'All tickets' },
            { value: 'linked', label: 'Linked to ticket' },
            { value: 'unlinked', label: 'No ticket' }
        ]
    },
    {
        key: 'severity',
        label: 'Severity',
        options: [
            { value: 'all', label: 'All severities' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' }
        ]
    }
];

function buildFilterGroup(config, stateFilters) {
    const wrapper = document.createElement('div');
    wrapper.className = 'filter-group';

    const label = document.createElement('label');
    label.textContent = config.label;
    label.setAttribute('for', `filter-${config.key}`);

    const select = document.createElement('select');
    select.id = `filter-${config.key}`;
    select.dataset.filterKey = config.key;

    config.options.forEach((option) => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        select.appendChild(optionEl);
    });

    select.value = stateFilters[config.key] ?? config.options[0].value;

    select.addEventListener('change', () => {
        setFilter(config.key, select.value);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);

    return wrapper;
}

export function renderFilterBar(mountEl) {
    const bar = document.createElement('div');
    bar.className = 'filter-bar';

    const { filters } = getAppState();
    filterConfig.forEach((config) => {
        bar.appendChild(buildFilterGroup(config, filters));
    });

    const actions = document.createElement('div');
    actions.className = 'filter-actions';

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'filter-reset';
    resetButton.textContent = 'Reset';
    resetButton.addEventListener('click', () => resetFilters());

    actions.appendChild(resetButton);
    bar.appendChild(actions);

    mountEl.innerHTML = '';
    mountEl.appendChild(bar);

    onStateChange((state) => {
        bar.querySelectorAll('select[data-filter-key]').forEach((select) => {
            const key = select.dataset.filterKey;
            if (key && state.filters[key]) {
                select.value = state.filters[key];
            }
        });
    });
}
