import { createSortableTable } from '../table.js';
import { getAppState, onStateChange } from '../outsourcer-state.js';
import {
    mockNow,
    operators,
    privilegedSignIns,
    changeEvents,
    monitoringIngestionStatuses,
    controlTamperingAttempts,
    riskEvents
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

const PROVIDER_LABELS = {
    all: 'All teams',
    'tier-1': 'Tier 1 ops',
    'tier-2': 'Tier 2 ops',
    platform: 'Platform',
    db: 'Database'
};

const SCOPE_LABELS = {
    all: 'All scopes',
    privileged: 'Privileged access',
    change: 'Security-impacting change',
    identity: 'Identity control',
    data: 'Data plane'
};

const ACTOR_LABELS = {
    all: 'All actors',
    human: 'Human',
    automation: 'Automation',
    emergency: 'Break-glass'
};

const ENV_LABELS = {
    all: 'All envs',
    prod: 'Production',
    staging: 'Staging',
    dev: 'Development'
};

const TICKET_LABELS = {
    all: 'All tickets',
    linked: 'Linked to ticket',
    unlinked: 'No ticket'
};

const SEVERITY_LABELS = {
    all: 'All severities',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
};

const TAMPER_OUTCOMES = {
    'tamper-001': {
        label: 'Success',
        impact: 'Sensor offline 12m'
    },
    'tamper-002': {
        label: 'Blocked',
        impact: 'Buffer flush rejected'
    },
    'tamper-003': {
        label: 'Success',
        impact: 'Policy disabled 6m'
    },
    'tamper-004': {
        label: 'Contained',
        impact: 'Routing reverted'
    }
};

function getNowMs() {
    const parsed = Date.parse(mockNow);
    return Number.isNaN(parsed) ? Date.now() : parsed;
}

function resolveWindow(filters, selectedTimeWindow) {
    if (selectedTimeWindow && selectedTimeWindow.start != null && selectedTimeWindow.end != null) {
        return {
            start: selectedTimeWindow.start,
            end: selectedTimeWindow.end,
            label: `${formatDateTime(selectedTimeWindow.start)} - ${formatDateTime(
                selectedTimeWindow.end
            )}`,
            isCustom: true
        };
    }
    const rangeMs = TIME_RANGE_MS[filters.timeRange] || TIME_RANGE_MS['7d'];
    const end = getNowMs();
    const start = end - rangeMs;
    return {
        start,
        end,
        label: TIME_RANGE_LABELS[filters.timeRange] || 'Time range',
        isCustom: false
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

function formatLabel(value) {
    if (!value) {
        return '--';
    }
    return value
        .toString()
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRangeLabel(windowRange) {
    if (!windowRange) {
        return '--';
    }
    const detail = `${formatDateTime(windowRange.start)} - ${formatDateTime(windowRange.end)}`;
    if (windowRange.isCustom) {
        return detail;
    }
    return `${windowRange.label} (${detail})`;
}

function resolveOperator(item) {
    if (!item || !item.operatorId) {
        return null;
    }
    return operatorById.get(item.operatorId) || null;
}

function matchesFilters(item, filters, timestampField, windowRange) {
    const timestampValue = timestampField ? Date.parse(item[timestampField]) : Number.NaN;
    if (!Number.isNaN(timestampValue)) {
        if (timestampValue < windowRange.start || timestampValue > windowRange.end) {
            return false;
        }
    }

    const operator = resolveOperator(item);
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
        const linked = item.ticketLinked ?? Boolean(item.ticketId);
        if (filters.ticketLinkage === 'linked' && !linked) {
            return false;
        }
        if (filters.ticketLinkage === 'unlinked' && linked) {
            return false;
        }
    }

    if (filters.severity !== 'all') {
        const severity = item.severity || item.riskRating || 'low';
        if (severity !== filters.severity) {
            return false;
        }
    }

    return true;
}

function summarizeDelta(before, after) {
    if (!before && !after) {
        return '--';
    }
    const keys = new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {})
    ]);
    if (keys.size === 0) {
        return '--';
    }
    return [...keys]
        .map((key) => `${key}: ${before?.[key] ?? '--'} -> ${after?.[key] ?? '--'}`)
        .join('; ');
}

function buildSessionEvidence(filters, windowRange) {
    const riskBySession = new Map();
    const filteredRisks = riskEvents.filter((event) =>
        matchesFilters(event, filters, 'timestamp', windowRange)
    );
    filteredRisks.forEach((event) => {
        if (!event.sessionId) {
            return;
        }
        const list = riskBySession.get(event.sessionId) || [];
        list.push(event);
        riskBySession.set(event.sessionId, list);
    });

    const filtered = privilegedSignIns.filter((entry) =>
        matchesFilters(entry, filters, 'timestamp', windowRange)
    );

    const records = filtered.map((entry) => {
        const operator = resolveOperator(entry);
        const sessionRisks = riskBySession.get(entry.sessionId) || [];
        return {
            id: entry.id,
            sessionId: entry.sessionId,
            operatorId: entry.operatorId,
            operatorName: operator?.name || 'Unknown',
            providerTeam: operator?.providerTeam || 'unknown',
            technician: operator?.technician || 'unknown',
            actorType: operator?.actorType || 'unknown',
            affiliation: operator?.affiliation || 'unknown',
            signInTime: entry.timestamp,
            geo: entry.geo,
            ip: entry.ip,
            anomalyFlags: entry.anomalyFlags || [],
            severity: entry.severity,
            scope: entry.scope,
            environment: entry.environment,
            ticketLinked: entry.ticketLinked,
            ticketId: entry.ticketId || null,
            riskSignals: sessionRisks.map((event) => ({
                id: event.id,
                riskType: event.riskType,
                severity: event.severity,
                summary: event.summary
            }))
        };
    });

    const rows = records.map((record) => ({
        session: record.sessionId,
        operator: `${record.operatorName} (${record.providerTeam})`,
        signIn: {
            label: formatDateTime(record.signInTime),
            sortValue: Date.parse(record.signInTime)
        },
        location: `${record.geo || '--'} | ${record.ip || '--'}`,
        anomalies: record.anomalyFlags.length ? record.anomalyFlags.join(', ') : 'None',
        riskSignals: record.riskSignals.length
            ? record.riskSignals.map((event) => formatLabel(event.riskType)).join(', ')
            : '--',
        ticket: record.ticketLinked ? record.ticketId || 'Linked' : 'No ticket',
        severity: formatLabel(record.severity),
        scope: `${formatLabel(record.scope)} | ${formatLabel(record.environment)}`
    }));

    return { records, rows };
}

function buildChangeEvidence(filters, windowRange) {
    const filtered = changeEvents.filter((entry) =>
        matchesFilters(entry, filters, 'timestamp', windowRange)
    );

    const records = filtered.map((entry) => {
        const operator = resolveOperator(entry);
        return {
            id: entry.id,
            operatorId: entry.operatorId,
            operatorName: operator?.name || 'Unknown',
            providerTeam: operator?.providerTeam || 'unknown',
            technician: operator?.technician || 'unknown',
            actorType: operator?.actorType || 'unknown',
            resourceId: entry.resourceId,
            resourceName: entry.resourceName,
            changeType: entry.changeType,
            before: entry.before || null,
            after: entry.after || null,
            riskRating: entry.riskRating,
            severity: entry.severity,
            ticketLinked: entry.ticketLinked,
            ticketId: entry.ticketId || null,
            currentState: entry.currentState,
            timestamp: entry.timestamp,
            scope: entry.scope,
            environment: entry.environment
        };
    });

    const rows = records.map((record) => ({
        change: `${formatLabel(record.changeType)} | ${record.resourceName}`,
        operator: `${record.operatorName} (${record.providerTeam})`,
        delta: summarizeDelta(record.before, record.after),
        risk: formatLabel(record.riskRating),
        state: formatLabel(record.currentState),
        ticket: record.ticketLinked ? record.ticketId || 'Linked' : 'No ticket',
        observed: {
            label: formatDateTime(record.timestamp),
            sortValue: Date.parse(record.timestamp)
        },
        scope: `${formatLabel(record.scope)} | ${formatLabel(record.environment)}`
    }));

    return { records, rows };
}

function buildMonitoringEvidence(filters, windowRange) {
    const ingestion = monitoringIngestionStatuses
        .filter((entry) => matchesFilters(entry, filters, 'lastSeen', windowRange))
        .map((entry) => ({
            id: entry.id,
            evidenceType: 'Ingestion feed',
            source: entry.source,
            status: entry.status,
            impact: entry.lagMinutes != null ? `${entry.lagMinutes}m lag` : null,
            observedAt: entry.lastSeen,
            severity: entry.severity,
            scope: entry.scope,
            environment: entry.environment,
            providerTeam: entry.providerTeam || 'unknown',
            ticketLinked: entry.ticketLinked,
            ticketId: entry.ticketId || null
        }));

    const tampering = controlTamperingAttempts
        .filter((entry) => matchesFilters(entry, filters, 'timestamp', windowRange))
        .map((entry) => {
            const operator = resolveOperator(entry);
            const outcome = TAMPER_OUTCOMES[entry.id];
            return {
                id: entry.id,
                evidenceType: 'Tamper attempt',
                source: `${entry.control} | ${entry.method}`,
                status: outcome?.label || 'Observed',
                impact: outcome?.impact || null,
                observedAt: entry.timestamp,
                severity: entry.severity,
                scope: entry.scope,
                environment: entry.environment,
                providerTeam: operator?.providerTeam || 'unknown',
                operatorName: operator?.name || 'Unknown',
                ticketLinked: entry.ticketLinked,
                ticketId: entry.ticketId || null
            };
        });

    const records = [...ingestion, ...tampering].sort((a, b) => {
        const aTime = Date.parse(a.observedAt || 0);
        const bTime = Date.parse(b.observedAt || 0);
        return bTime - aTime;
    });

    const rows = records.map((record) => {
        const operatorLabel = record.operatorName
            ? `${record.operatorName} (${record.providerTeam})`
            : formatLabel(record.providerTeam);
        const statusText = record.impact ? `${formatLabel(record.status)} · ${record.impact}` : formatLabel(record.status);
        return {
            type: record.evidenceType,
            subject: record.source,
            operator: operatorLabel,
            status: statusText,
            observed: {
                label: formatDateTime(record.observedAt),
                sortValue: Date.parse(record.observedAt)
            },
            severity: formatLabel(record.severity),
            ticket: record.ticketLinked ? record.ticketId || 'Linked' : 'No ticket',
            scope: `${formatLabel(record.scope)} | ${formatLabel(record.environment)}`
        };
    });

    return { records, rows };
}

function buildExportMeta(filters, windowRange, generatedAt) {
    return {
        generatedAt,
        timeRange: {
            label: formatRangeLabel(windowRange),
            start: windowRange.start,
            end: windowRange.end
        },
        filters: {
            ...filters,
            labels: {
                providerTeam: PROVIDER_LABELS[filters.providerTeam] || filters.providerTeam,
                scope: SCOPE_LABELS[filters.scope] || filters.scope,
                actorType: ACTOR_LABELS[filters.actorType] || filters.actorType,
                environment: ENV_LABELS[filters.environment] || filters.environment,
                ticketLinkage: TICKET_LABELS[filters.ticketLinkage] || filters.ticketLinkage,
                severity: SEVERITY_LABELS[filters.severity] || filters.severity
            }
        }
    };
}

function toCsvValue(value) {
    if (value == null) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return JSON.stringify(value);
}

function escapeCsv(value) {
    const stringValue = toCsvValue(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

function buildCsvPayload(datasets, meta) {
    const rows = [];
    const metaColumns = {
        exportGeneratedAt: meta.generatedAt,
        exportTimeRange: meta.timeRange.label,
        exportWindowStart: meta.timeRange.start,
        exportWindowEnd: meta.timeRange.end,
        exportProviderTeam: meta.filters.labels.providerTeam,
        exportScope: meta.filters.labels.scope,
        exportEnvironment: meta.filters.labels.environment,
        exportActorType: meta.filters.labels.actorType,
        exportTechnician: meta.filters.technician,
        exportTicketLinkage: meta.filters.labels.ticketLinkage,
        exportSeverity: meta.filters.labels.severity
    };

    const allRecords = [];
    Object.entries(datasets).forEach(([datasetName, entries]) => {
        entries.forEach((entry) => {
            allRecords.push({
                dataset: datasetName,
                ...metaColumns,
                ...entry
            });
        });
    });

    const headers = Array.from(
        allRecords.reduce((acc, record) => {
            Object.keys(record).forEach((key) => acc.add(key));
            return acc;
        }, new Set(['dataset', ...Object.keys(metaColumns)]))
    );

    rows.push(headers.map(escapeCsv).join(','));

    allRecords.forEach((record) => {
        const line = headers.map((key) => escapeCsv(record[key]));
        rows.push(line.join(','));
    });

    return rows.join('\n');
}

function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function renderTable({ wrapper, columns, rows, emptyMessage }) {
    wrapper.innerHTML = '';
    if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'table-empty';
        empty.textContent = emptyMessage || 'No evidence matches the current filters.';
        wrapper.appendChild(empty);
        return;
    }
    wrapper.appendChild(createSortableTable({ columns, rows }));
}

export function buildEvidenceExportView() {
    const wrapper = document.createElement('div');
    wrapper.className = 'evidence-export';

    const header = document.createElement('div');
    header.className = 'route-header';

    const headerIntro = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = 'Evidence export bundle';
    const subtitle = document.createElement('p');
    subtitle.className = 'evidence-subtitle';
    subtitle.textContent = 'Proof-ready extracts aligned to the current filter scope.';
    headerIntro.appendChild(title);
    headerIntro.appendChild(subtitle);

    const actionWrap = document.createElement('div');
    actionWrap.className = 'evidence-export-actions';

    const csvButton = document.createElement('button');
    csvButton.type = 'button';
    csvButton.className = 'control-chip control-chip--button';
    csvButton.textContent = 'Download CSV';

    const jsonButton = document.createElement('button');
    jsonButton.type = 'button';
    jsonButton.className = 'control-chip control-chip--button';
    jsonButton.textContent = 'Download JSON';

    const printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.className = 'control-chip control-chip--button';
    printButton.textContent = 'Print view';

    actionWrap.appendChild(csvButton);
    actionWrap.appendChild(jsonButton);
    actionWrap.appendChild(printButton);

    header.appendChild(headerIntro);
    header.appendChild(actionWrap);

    const printHeader = document.createElement('div');
    printHeader.className = 'evidence-print-header';
    printHeader.innerHTML = `
        <div class="evidence-print-title">Evidence export</div>
        <div class="evidence-print-meta">
            <div>
                <span class="evidence-print-label">Time range</span>
                <span data-print="timeRange">--</span>
            </div>
            <div>
                <span class="evidence-print-label">Scope</span>
                <span data-print="scope">--</span>
            </div>
            <div>
                <span class="evidence-print-label">Provider</span>
                <span data-print="provider">--</span>
            </div>
            <div>
                <span class="evidence-print-label">Generated</span>
                <span data-print="generated">--</span>
            </div>
        </div>
    `;

    const sessionCard = document.createElement('section');
    sessionCard.className = 'table-card evidence-card';
    const sessionHeader = document.createElement('div');
    sessionHeader.className = 'evidence-card-header';
    const sessionHeading = document.createElement('div');
    const sessionTitle = document.createElement('h4');
    sessionTitle.textContent = 'Operator session evidence';
    const sessionSubtitle = document.createElement('p');
    sessionSubtitle.textContent = 'Privileged sign-in telemetry with anomaly linkage.';
    sessionHeading.appendChild(sessionTitle);
    sessionHeading.appendChild(sessionSubtitle);
    const sessionMeta = document.createElement('div');
    sessionMeta.className = 'evidence-card-meta';
    const sessionCount = document.createElement('span');
    sessionCount.className = 'control-chip';
    sessionMeta.appendChild(sessionCount);
    sessionHeader.appendChild(sessionHeading);
    sessionHeader.appendChild(sessionMeta);
    const sessionTableWrap = document.createElement('div');
    sessionTableWrap.className = 'table-scroll';
    sessionCard.appendChild(sessionHeader);
    sessionCard.appendChild(sessionTableWrap);

    const changeCard = document.createElement('section');
    changeCard.className = 'table-card evidence-card';
    const changeHeader = document.createElement('div');
    changeHeader.className = 'evidence-card-header';
    const changeHeading = document.createElement('div');
    const changeTitle = document.createElement('h4');
    changeTitle.textContent = 'Change ledger extract';
    const changeSubtitle = document.createElement('p');
    changeSubtitle.textContent = 'Security-impacting configuration deltas with risk ratings.';
    changeHeading.appendChild(changeTitle);
    changeHeading.appendChild(changeSubtitle);
    const changeMeta = document.createElement('div');
    changeMeta.className = 'evidence-card-meta';
    const changeCount = document.createElement('span');
    changeCount.className = 'control-chip';
    changeMeta.appendChild(changeCount);
    changeHeader.appendChild(changeHeading);
    changeHeader.appendChild(changeMeta);
    const changeTableWrap = document.createElement('div');
    changeTableWrap.className = 'table-scroll';
    changeCard.appendChild(changeHeader);
    changeCard.appendChild(changeTableWrap);

    const monitoringCard = document.createElement('section');
    monitoringCard.className = 'table-card evidence-card';
    const monitoringHeader = document.createElement('div');
    monitoringHeader.className = 'evidence-card-header';
    const monitoringHeading = document.createElement('div');
    const monitoringTitle = document.createElement('h4');
    monitoringTitle.textContent = 'Monitoring integrity evidence';
    const monitoringSubtitle = document.createElement('p');
    monitoringSubtitle.textContent = 'Ingestion continuity and tamper alerts.';
    monitoringHeading.appendChild(monitoringTitle);
    monitoringHeading.appendChild(monitoringSubtitle);
    const monitoringMeta = document.createElement('div');
    monitoringMeta.className = 'evidence-card-meta';
    const monitoringCount = document.createElement('span');
    monitoringCount.className = 'control-chip';
    monitoringMeta.appendChild(monitoringCount);
    monitoringHeader.appendChild(monitoringHeading);
    monitoringHeader.appendChild(monitoringMeta);
    const monitoringTableWrap = document.createElement('div');
    monitoringTableWrap.className = 'table-scroll';
    monitoringCard.appendChild(monitoringHeader);
    monitoringCard.appendChild(monitoringTableWrap);

    wrapper.appendChild(header);
    wrapper.appendChild(printHeader);
    wrapper.appendChild(sessionCard);
    wrapper.appendChild(changeCard);
    wrapper.appendChild(monitoringCard);

    function render(state) {
        const { filters, selectedTimeWindow } = state;
        const windowRange = resolveWindow(filters, selectedTimeWindow);

        const sessionEvidence = buildSessionEvidence(filters, windowRange);
        const changeEvidence = buildChangeEvidence(filters, windowRange);
        const monitoringEvidence = buildMonitoringEvidence(filters, windowRange);

        sessionCount.textContent = `${sessionEvidence.records.length} sessions`;
        changeCount.textContent = `${changeEvidence.records.length} changes`;
        monitoringCount.textContent = `${monitoringEvidence.records.length} signals`;

        renderTable({
            wrapper: sessionTableWrap,
            emptyMessage: 'No session evidence matches the current filters.',
            columns: [
                { key: 'session', label: 'Session' },
                { key: 'operator', label: 'Operator', sortable: false },
                {
                    key: 'signIn',
                    label: 'Sign-in',
                    render: (value) => document.createTextNode(value?.label || '--')
                },
                { key: 'location', label: 'Geo / IP', sortable: false },
                { key: 'anomalies', label: 'Anomalies', sortable: false },
                { key: 'riskSignals', label: 'Risk signals', sortable: false },
                { key: 'ticket', label: 'Ticket', sortable: false },
                { key: 'severity', label: 'Severity', sortable: false },
                { key: 'scope', label: 'Scope', sortable: false }
            ],
            rows: sessionEvidence.rows
        });

        renderTable({
            wrapper: changeTableWrap,
            emptyMessage: 'No change ledger events match the current filters.',
            columns: [
                { key: 'change', label: 'Change' },
                { key: 'operator', label: 'Operator', sortable: false },
                { key: 'delta', label: 'Before / after', sortable: false },
                { key: 'risk', label: 'Risk', sortable: false },
                { key: 'state', label: 'State', sortable: false },
                { key: 'ticket', label: 'Ticket', sortable: false },
                {
                    key: 'observed',
                    label: 'Observed',
                    render: (value) => document.createTextNode(value?.label || '--')
                },
                { key: 'scope', label: 'Scope', sortable: false }
            ],
            rows: changeEvidence.rows
        });

        renderTable({
            wrapper: monitoringTableWrap,
            emptyMessage: 'No monitoring integrity signals match the current filters.',
            columns: [
                { key: 'type', label: 'Evidence type' },
                { key: 'subject', label: 'Signal' },
                { key: 'operator', label: 'Operator / team', sortable: false },
                { key: 'status', label: 'Status / impact', sortable: false },
                {
                    key: 'observed',
                    label: 'Observed',
                    render: (value) => document.createTextNode(value?.label || '--')
                },
                { key: 'severity', label: 'Severity', sortable: false },
                { key: 'ticket', label: 'Ticket', sortable: false },
                { key: 'scope', label: 'Scope', sortable: false }
            ],
            rows: monitoringEvidence.rows
        });

        const printRange = printHeader.querySelector('[data-print="timeRange"]');
        const printScope = printHeader.querySelector('[data-print="scope"]');
        const printProvider = printHeader.querySelector('[data-print="provider"]');
        const printGenerated = printHeader.querySelector('[data-print="generated"]');

        if (printRange) {
            printRange.textContent = formatRangeLabel(windowRange);
        }
        if (printScope) {
            printScope.textContent = SCOPE_LABELS[filters.scope] || formatLabel(filters.scope);
        }
        if (printProvider) {
            printProvider.textContent = PROVIDER_LABELS[filters.providerTeam] || formatLabel(filters.providerTeam);
        }
        if (printGenerated) {
            printGenerated.textContent = formatDateTime(new Date());
        }

        return {
            sessionEvidence,
            changeEvidence,
            monitoringEvidence,
            windowRange
        };
    }

    function handleExport(action) {
        const state = getAppState();
        const generatedAt = new Date().toISOString();
        const windowRange = resolveWindow(state.filters, state.selectedTimeWindow);
        const sessionEvidence = buildSessionEvidence(state.filters, windowRange);
        const changeEvidence = buildChangeEvidence(state.filters, windowRange);
        const monitoringEvidence = buildMonitoringEvidence(state.filters, windowRange);
        const meta = buildExportMeta(state.filters, windowRange, generatedAt);

        const datasets = {
            operatorSessionEvidence: sessionEvidence.records,
            changeLedgerExtract: changeEvidence.records,
            monitoringIntegrityEvidence: monitoringEvidence.records
        };

        if (action === 'json') {
            const payload = {
                meta,
                datasets
            };
            downloadFile('evidence-export.json', JSON.stringify(payload, null, 2), 'application/json');
            return;
        }

        if (action === 'csv') {
            const csv = buildCsvPayload(datasets, meta);
            downloadFile('evidence-export.csv', csv, 'text/csv');
        }
    }

    csvButton.addEventListener('click', () => handleExport('csv'));
    jsonButton.addEventListener('click', () => handleExport('json'));
    printButton.addEventListener('click', () => {
        render(getAppState());
        window.print();
    });

    render(getAppState());
    onStateChange((state) => render(state));

    return wrapper;
}
