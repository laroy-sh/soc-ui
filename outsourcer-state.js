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

const defaultSelectedTimeWindow = null;

const appState = {
    filters: { ...defaultFilters },
    selectedTimeWindow: defaultSelectedTimeWindow
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

function readSelectedTimeWindowFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get('windowStart');
    const endParam = params.get('windowEnd');
    const start = startParam ? Number.parseInt(startParam, 10) : null;
    const end = endParam ? Number.parseInt(endParam, 10) : null;

    if (Number.isNaN(start) || Number.isNaN(end) || start == null || end == null) {
        return defaultSelectedTimeWindow;
    }

    return { start, end };
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

    if (appState.selectedTimeWindow) {
        url.searchParams.set('windowStart', appState.selectedTimeWindow.start);
        url.searchParams.set('windowEnd', appState.selectedTimeWindow.end);
    } else {
        url.searchParams.delete('windowStart');
        url.searchParams.delete('windowEnd');
    }
    history.replaceState({}, '', url);
}

export function initStateFromUrl() {
    appState.filters = readFiltersFromUrl();
    appState.selectedTimeWindow = readSelectedTimeWindowFromUrl();
    notify();
}

export function getAppState() {
    return {
        filters: { ...appState.filters },
        selectedTimeWindow: appState.selectedTimeWindow
            ? { ...appState.selectedTimeWindow }
            : defaultSelectedTimeWindow
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
    appState.selectedTimeWindow = defaultSelectedTimeWindow;
    syncUrlFilters();
    notify();
}

export function setSelectedTimeWindow(window) {
    if (!window || window.start == null || window.end == null) {
        appState.selectedTimeWindow = defaultSelectedTimeWindow;
    } else {
        appState.selectedTimeWindow = {
            start: window.start,
            end: window.end
        };
    }
    syncUrlFilters();
    notify();
}

export function onStateChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

window.addEventListener('popstate', () => {
    appState.filters = readFiltersFromUrl();
    appState.selectedTimeWindow = readSelectedTimeWindowFromUrl();
    notify();
});
