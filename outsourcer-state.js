const defaultFilters = {
    timeRange: '7d',
    providerTeam: 'all',
    technician: 'all',
    actorType: 'all',
    scope: 'all',
    environment: 'all',
    ticketLinkage: 'all',
    severity: 'all'
};

const appState = {
    filters: { ...defaultFilters }
};

const listeners = new Set();

function notify() {
    listeners.forEach((listener) => listener(getAppState()));
}

function readFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const filters = { ...defaultFilters };

    Object.keys(defaultFilters).forEach((key) => {
        if (params.has(key)) {
            filters[key] = params.get(key) || defaultFilters[key];
        }
    });

    return filters;
}

function syncUrlFilters() {
    const url = new URL(window.location.href);
    Object.entries(appState.filters).forEach(([key, value]) => {
        if (value === defaultFilters[key]) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });
    history.replaceState({}, '', url);
}

export function initStateFromUrl() {
    appState.filters = readFiltersFromUrl();
    notify();
}

export function getAppState() {
    return {
        filters: { ...appState.filters }
    };
}

export function setFilter(key, value) {
    if (!Object.prototype.hasOwnProperty.call(defaultFilters, key)) {
        return;
    }
    appState.filters[key] = value;
    syncUrlFilters();
    notify();
}

export function resetFilters() {
    appState.filters = { ...defaultFilters };
    syncUrlFilters();
    notify();
}

export function onStateChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

window.addEventListener('popstate', () => {
    appState.filters = readFiltersFromUrl();
    notify();
});
