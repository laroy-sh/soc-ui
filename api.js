import {
    mockNow,
    operators,
    riskEvents,
    changeEvents,
    privilegedSignIns,
    elevations,
    monitoringIngestionStatuses,
    controlTamperingAttempts,
    uebaSummaries,
    blastRadiusEvents
} from './mockData.js';

const MOCK_DELAY_MS = 120;
const DEFAULT_FILTERS = {
    timeRange: '7d',
    providerTeam: 'all',
    technician: 'all',
    actorType: 'all',
    scope: 'all',
    environment: 'all',
    ticketLinkage: 'all',
    severity: 'all'
};

const operatorById = new Map(operators.map((operator) => [operator.id, operator]));
const nowMs = Date.parse(mockNow);

function withDelay(value) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(value), MOCK_DELAY_MS);
    });
}

function normalizeFilters(state) {
    const candidate = state && state.filters ? state.filters : state || {};
    return {
        ...DEFAULT_FILTERS,
        ...candidate
    };
}

function timeRangeToMs(timeRange) {
    if (!timeRange || timeRange === 'all') {
        return null;
    }
    if (timeRange.endsWith('h')) {
        const hours = Number.parseInt(timeRange, 10);
        return Number.isNaN(hours) ? null : hours * 60 * 60 * 1000;
    }
    if (timeRange.endsWith('d')) {
        const days = Number.parseInt(timeRange, 10);
        return Number.isNaN(days) ? null : days * 24 * 60 * 60 * 1000;
    }
    return null;
}

function resolveOperatorFields(item) {
    const operator = item.operatorId ? operatorById.get(item.operatorId) : null;
    return {
        providerTeam: item.providerTeam || operator?.providerTeam || 'unknown',
        technician: item.technician || operator?.technician || 'unknown',
        actorType: item.actorType || operator?.actorType || 'unknown',
        affiliation: item.affiliation || operator?.affiliation || 'unknown',
        operator
    };
}

function getItemTimestamp(item) {
    return (
        item.timestamp ||
        item.startTime ||
        item.endTime ||
        item.lastSeen ||
        item.sampleTime ||
        null
    );
}

function matchesTicketFilter(item, ticketLinkage) {
    if (ticketLinkage === 'all') {
        return true;
    }
    const linked = item.ticketLinked ?? Boolean(item.ticketId);
    if (ticketLinkage === 'linked') {
        return linked === true;
    }
    if (ticketLinkage === 'unlinked') {
        return linked === false;
    }
    return true;
}

function applyFilters(items, filters) {
    const timeWindow = timeRangeToMs(filters.timeRange);
    return items.filter((item) => {
        const { providerTeam, technician, actorType } = resolveOperatorFields(item);
        if (filters.providerTeam !== 'all' && providerTeam !== filters.providerTeam) {
            return false;
        }
        if (filters.technician !== 'all' && technician !== filters.technician) {
            return false;
        }
        if (filters.actorType !== 'all' && actorType !== filters.actorType) {
            return false;
        }
        if (filters.scope !== 'all' && item.scope && item.scope !== filters.scope) {
            return false;
        }
        if (filters.environment !== 'all' && item.environment && item.environment !== filters.environment) {
            return false;
        }
        if (filters.severity !== 'all') {
            const severity = item.severity || item.riskRating || 'low';
            if (severity !== filters.severity) {
                return false;
            }
        }
        if (!matchesTicketFilter(item, filters.ticketLinkage)) {
            return false;
        }
        if (timeWindow) {
            const timestamp = getItemTimestamp(item);
            const timeMs = timestamp ? Date.parse(timestamp) : null;
            if (timeMs && timeMs < nowMs - timeWindow) {
                return false;
            }
        }
        return true;
    });
}

function countBySeverity(items) {
    const counts = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
    };
    items.forEach((item) => {
        const severity = item.severity || item.riskRating || 'low';
        if (counts[severity] !== undefined) {
            counts[severity] += 1;
        }
    });
    return counts;
}

function sortByTimestampDesc(items) {
    return [...items].sort((a, b) => {
        const aTime = Date.parse(getItemTimestamp(a) || 0);
        const bTime = Date.parse(getItemTimestamp(b) || 0);
        return bTime - aTime;
    });
}

function filterOperators(filters) {
    return operators.filter((operator) => {
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
    });
}

export function getSummary(state) {
    const filters = normalizeFilters(state);
    const filteredRisk = applyFilters(riskEvents, filters);
    const filteredChanges = applyFilters(changeEvents, filters);
    const filteredSignIns = applyFilters(privilegedSignIns, filters);
    const filteredElevations = applyFilters(elevations, filters);
    const filteredTampering = applyFilters(controlTamperingAttempts, filters);
    const filteredBlast = applyFilters(blastRadiusEvents, filters);
    const severityCounts = countBySeverity([
        ...filteredRisk,
        ...filteredChanges,
        ...filteredTampering,
        ...filteredBlast
    ]);

    const operatorCounts = new Map();
    filteredRisk.forEach((event) => {
        if (!event.operatorId) {
            return;
        }
        operatorCounts.set(event.operatorId, (operatorCounts.get(event.operatorId) || 0) + 1);
    });

    const topOperators = [...operatorCounts.entries()]
        .map(([operatorId, count]) => ({
            operatorId,
            name: operatorById.get(operatorId)?.name || 'Unknown',
            count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    return withDelay({
        totals: {
            riskEvents: filteredRisk.length,
            changes: filteredChanges.length,
            privilegedSignIns: filteredSignIns.length,
            elevations: filteredElevations.length,
            tamperingAttempts: filteredTampering.length,
            blastRadius: filteredBlast.length
        },
        severity: severityCounts,
        topOperators,
        windowStart: filters.timeRange
    });
}

export function getRiskTimeline(state) {
    const filters = normalizeFilters(state);
    const filtered = applyFilters(riskEvents, filters);
    return withDelay(sortByTimestampDesc(filtered));
}

export function getActionsRequiringReview(state) {
    const filters = normalizeFilters(state);
    const riskReview = applyFilters(riskEvents, filters).filter(
        (item) => item.severity === 'high' || item.severity === 'critical' || item.ticketLinked === false
    );
    const changeReview = applyFilters(changeEvents, filters).filter(
        (item) =>
            item.severity === 'high' ||
            item.severity === 'critical' ||
            item.ticketLinked === false ||
            item.currentState === 'open'
    );
    const tamperReview = applyFilters(controlTamperingAttempts, filters);
    const blastReview = applyFilters(blastRadiusEvents, filters).filter(
        (item) => item.severity === 'high' || item.severity === 'critical' || item.ticketLinked === false
    );

    const combined = [
        ...riskReview.map((item) => ({
            ...item,
            category: 'risk'
        })),
        ...changeReview.map((item) => ({
            ...item,
            category: 'change'
        })),
        ...tamperReview.map((item) => ({
            ...item,
            category: 'tamper'
        })),
        ...blastReview.map((item) => ({
            ...item,
            category: 'blast'
        }))
    ];

    return withDelay(sortByTimestampDesc(combined));
}

export function getChanges(state) {
    const filters = normalizeFilters(state);
    return withDelay(sortByTimestampDesc(applyFilters(changeEvents, filters)));
}

export function getPrivilegedHeatmap(state) {
    const filters = normalizeFilters(state);
    const signIns = applyFilters(privilegedSignIns, filters);
    const byHour = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: 0,
        risky: 0
    }));

    const geoCounts = new Map();
    signIns.forEach((session) => {
        const hour = session.hourOfDay;
        if (byHour[hour]) {
            byHour[hour].count += 1;
            if (session.anomalyFlags && session.anomalyFlags.length > 0) {
                byHour[hour].risky += 1;
            }
        }
        const geo = session.geo || 'unknown';
        geoCounts.set(geo, (geoCounts.get(geo) || 0) + 1);
    });

    const byGeo = [...geoCounts.entries()].map(([geo, count]) => ({ geo, count }));

    return withDelay({
        byHour,
        byGeo,
        sessions: sortByTimestampDesc(signIns)
    });
}

export function getElevations(state) {
    const filters = normalizeFilters(state);
    return withDelay(sortByTimestampDesc(applyFilters(elevations, filters)));
}

export function getIngestionHealth(state) {
    const filters = normalizeFilters(state);
    const filtered = applyFilters(monitoringIngestionStatuses, filters);
    const statusCounts = filtered.reduce(
        (acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        },
        { healthy: 0, degraded: 0, outage: 0 }
    );
    return withDelay({
        statusCounts,
        feeds: sortByTimestampDesc(filtered)
    });
}

export function getUebaScores(state) {
    const filters = normalizeFilters(state);
    const filtered = applyFilters(uebaSummaries, filters);
    return withDelay(
        sortByTimestampDesc(filtered).map((item) => ({
            ...item,
            operatorName: resolveOperatorFields(item).operator?.name || 'Unknown'
        }))
    );
}

export function getBlastRadius(state) {
    const filters = normalizeFilters(state);
    return withDelay(sortByTimestampDesc(applyFilters(blastRadiusEvents, filters)));
}

export function getOperatorTimeline(state, operatorId) {
    const filters = normalizeFilters(state);
    const availableOperators = filterOperators(filters);
    const resolvedOperatorId = operatorId || availableOperators[0]?.id || operators[0]?.id;
    const operator = operatorById.get(resolvedOperatorId) || null;

    const timelineItems = [
        ...applyFilters(riskEvents, filters),
        ...applyFilters(changeEvents, filters),
        ...applyFilters(privilegedSignIns, filters),
        ...applyFilters(elevations, filters),
        ...applyFilters(controlTamperingAttempts, filters),
        ...applyFilters(blastRadiusEvents, filters)
    ]
        .filter((item) => item.operatorId === resolvedOperatorId)
        .map((item) => ({
            id: item.id,
            operatorId: item.operatorId,
            timestamp: getItemTimestamp(item),
            severity: item.severity || item.riskRating || 'low',
            ticketLinked: item.ticketLinked,
            type: item.eventType || item.changeType || item.elevationType || item.riskType || 'session',
            summary: item.summary || item.resourceName || item.control || item.method || 'Privileged activity',
            resourceId: item.resourceId || null,
            sessionId: item.sessionId || null
        }));

    return withDelay({
        operator,
        timeline: sortByTimestampDesc(timelineItems)
    });
}

export function getResourceImpact(state, resourceId) {
    const filters = normalizeFilters(state);
    const filteredChanges = applyFilters(changeEvents, filters);
    const candidateResourceId = resourceId || filteredChanges[0]?.resourceId;

    const changes = filteredChanges.filter((item) => item.resourceId === candidateResourceId);
    const blastEvents = applyFilters(blastRadiusEvents, filters).filter((item) =>
        item.resourceIds?.includes(candidateResourceId)
    );

    return withDelay({
        resourceId: candidateResourceId || null,
        resourceName: changes[0]?.resourceName || blastEvents[0]?.resourceIds?.[0] || 'Unknown',
        changes: sortByTimestampDesc(changes),
        blastEvents: sortByTimestampDesc(blastEvents)
    });
}

export function getNoTicket(state) {
    const filters = normalizeFilters(state);
    const byNoTicket = (items) => applyFilters(items, filters).filter((item) => item.ticketLinked === false);

    return withDelay({
        riskEvents: sortByTimestampDesc(byNoTicket(riskEvents)),
        changes: sortByTimestampDesc(byNoTicket(changeEvents)),
        elevations: sortByTimestampDesc(byNoTicket(elevations)),
        tampering: sortByTimestampDesc(byNoTicket(controlTamperingAttempts)),
        blastRadius: sortByTimestampDesc(byNoTicket(blastRadiusEvents))
    });
}

export function getProviderVsInternal(state) {
    const filters = normalizeFilters(state);
    const summarize = (items) => {
        const counts = { provider: 0, internal: 0, unknown: 0 };
        applyFilters(items, filters).forEach((item) => {
            const affiliation = resolveOperatorFields(item).affiliation || 'unknown';
            if (counts[affiliation] === undefined) {
                counts.unknown += 1;
            } else {
                counts[affiliation] += 1;
            }
        });
        return counts;
    };

    const operatorCounts = filterOperators(filters).reduce(
        (acc, operator) => {
            acc[operator.affiliation] = (acc[operator.affiliation] || 0) + 1;
            return acc;
        },
        { provider: 0, internal: 0 }
    );

    return withDelay({
        operators: operatorCounts,
        riskEvents: summarize(riskEvents),
        changes: summarize(changeEvents),
        elevations: summarize(elevations),
        signIns: summarize(privilegedSignIns),
        tampering: summarize(controlTamperingAttempts),
        blastRadius: summarize(blastRadiusEvents)
    });
}
