// Configuration
const CONFIG = {
    dataPath: './soc_demo_dataset_ultimate/',
    refreshInterval: 60000 // 1 minute
};

// State
let currentDashboard = 'analyst';
let refreshTimer = null;
let rocRangeDays = 30;
let rocData = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeRocFilters();
    loadAllData();
    startAutoRefresh();
});

// Navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const dashboard = link.dataset.dashboard;
            const rocTab = link.dataset.rocTab;
            if (dashboard === 'roc' && rocTab) {
                currentRocTab = rocTab;
            }
            switchDashboard(dashboard);
        });
    });
}

function switchDashboard(dashboardName) {
    // Update dashboard visibility
    document.querySelectorAll('.dashboard').forEach(dashboard => {
        dashboard.classList.toggle('active', dashboard.id === `dashboard-${dashboardName}`);
    });
    
    currentDashboard = dashboardName;

    if (dashboardName === 'roc') {
        setRocTab(currentRocTab);
        return;
    }

    updateNavActive(dashboardName);

    const titles = {
        'analyst': 'SOC Analyst Dashboard',
        'lead': 'SOC Lead Dashboard',
        'telemetry': 'SOC Telemetry Health Dashboard',
        'customer': 'SOC Customer Dashboard',
        'roc': 'Risk Operations Center Dashboard',
        'essential8': 'Essential Eight Framework'
    };
    document.getElementById('dashboardTitle').textContent = titles[dashboardName];
}

let currentRocTab = 'executive';

function updateNavActive(dashboardName) {
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkDashboard = link.dataset.dashboard;
        const linkRocTab = link.dataset.rocTab;

        if (dashboardName === 'roc' && linkDashboard === 'roc' && linkRocTab) {
            link.classList.toggle('active', linkRocTab === currentRocTab);
            return;
        }

        link.classList.toggle('active', linkDashboard === dashboardName);
    });
}

function setRocTab(tabName) {
    if (!tabName) return;
    currentRocTab = tabName;

    document.querySelectorAll('.roc-tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.rocPanel === tabName);
    });

    updateNavActive('roc');
    updateRocTitle();
}

function updateRocTitle() {
    const titles = {
        executive: 'Risk Operations: Executive Overview',
        actions: 'Risk Operations: Actions',
        aging: 'Risk Operations: Risk Aging'
    };
    const title = titles[currentRocTab] || 'Risk Operations Center Dashboard';
    const titleElement = document.getElementById('dashboardTitle');
    if (titleElement) {
        titleElement.textContent = title;
    }
}

function initializeRocFilters() {
    const rangeSelect = document.getElementById('rocRangePreset');
    if (!rangeSelect) return;
    rocRangeDays = parseInt(rangeSelect.value, 10) || rocRangeDays;
    rangeSelect.addEventListener('change', () => {
        rocRangeDays = parseInt(rangeSelect.value, 10) || 30;
        renderRocDashboard();
    });
}

// Data Loading
async function loadAllData() {
    try {
        // Load all metrics in parallel
        const [
            openIncidentsBySeverity,
            openIncidentsByStatus,
            newIncidents,
            activeAlerts,
            incidentAging,
            topEntities,
            incidentTimings,
            incidentDetectionTimings,
            incidentInflow,
            incidentClosureRate,
            alertEscalationRate,
            alertToIncidentRatio,
            falsePositiveRate,
            benignPositiveRate,
            truePositiveRate,
            falseNegativeRate,
            alertsPerAnalystBySeverity,
            ruleFiringVolume,
            ingestionVolume,
            detectionCoverage,
            storageTierDistribution,
            zeroIngestion,
            customerIncidents,
            repeatedDetections,
            rocRiskScore,
            rocRiskExposure,
            rocIncidentCount,
            rocRiskDriversDaily,
            rocExecutiveActions,
            rocWorkloadBySeverity,
            rocHighVolumeRisks,
            rocAvgHighRisk,
            rocAttackSurfaceCoverage,
            rocIncidentAgeBuckets,
            rocIncidentAgingDetails,
            rocRiskBurndown,
            rocRiskDebtTrend,
            rocPolicyExceptions,
            rocRemediationRoi,
            rocSlaHealthByBu,
            // Customer Dashboard Extended Metrics
            customerIncidentTrend,
            customerIncidentClosureTrend,
            customerIncidentTimings,
            customerActiveAlerts,
            customerTopEntities,
            customerIncidentAging,
            // Customer Dashboard Ultimate Metrics
            customerSeverityTrend,
            customerAlertToIncidentRate,
            customerIncidentTimeBuckets,
            customerTopAlertRules,
            customerIncidentsByStatus,
            alertNoiseTrend,
            alertVolumeBaseline
        ] = await Promise.all([
            fetchMetric('openIncidentsBySeverity.latest.json'),
            fetchMetric('openIncidentsByStatus.latest.json'),
            fetchMetric('newIncidents.latest.json'),
            fetchMetric('activeAlertsBySeverity.latest.json'),
            fetchMetric('incidentAging.latest.json'),
            fetchMetric('topEntities.latest.json'),
            fetchMetric('incidentTimings.latest.json'),
            fetchMetric('incidentDetectionTimings.latest.json'),
            fetchMetric('incidentInflow.24h.json'),
            fetchMetric('incidentClosureRate.24h.json'),
            fetchMetric('alertEscalationRate.7d.json'),
            fetchMetric('alertToIncidentRatio.7d.json'),
            fetchMetric('falsePositiveRate.7d.json'),
            fetchMetric('benignPositiveRate.7d.json'),
            fetchMetric('truePositiveRate.7d.json'),
            fetchMetric('falseNegativeRate.7d.json'),
            fetchMetric('alertsPerAnalystBySeverity.24h.json'),
            fetchMetric('ruleFiringVolume.24h.json'),
            fetchMetric('ingestionVolumeByTable.24h.json'),
            fetchMetric('detectionCoverage.latest.json'),
            fetchMetric('storageTierDistribution.latest.json'),
            fetchMetric('zeroIngestionTables.latest.json'),
            fetchMetric('customer_incidentsBySeverity.latest.json'),
            fetchMetric('repeatedDetections.7d.json'),
            fetchMetric('riskScore.30d.json'),
            fetchMetric('riskExposure.30d.json'),
            fetchMetric('incidentCountByTitle.30d.json'),
            fetchMetric('riskDriversDaily.30d.json'),
            fetchMetric('executiveActions.30d.json'),
            fetchMetric('workloadBySeverity.30d.json'),
            fetchMetric('highVolumeRisks.30d.json'),
            fetchMetric('avgHighRisk.30d.json'),
            fetchMetric('attackSurfaceCoverage.latest.json'),
            fetchMetric('closedIncidentAgeBuckets.30d.json'),
            fetchMetric('closedIncidentAgingDetails.30d.json'),
            fetchMetric('riskBurndown.30d.json'),
            fetchMetric('riskDebtTrend.30d.json'),
            fetchMetric('policyExceptions.30d.json'),
            fetchMetric('remediationRoi.30d.json'),
            fetchMetric('slaHealthByBusinessUnit.30d.json'),
            // Customer Dashboard Extended Metrics
            fetchMetric('customer_incidentTrend.7d.json'),
            fetchMetric('customer_incidentClosureTrend.7d.json'),
            fetchMetric('customer_incidentTimings.latest.json'),
            fetchMetric('customer_activeAlertsBySeverity.latest.json'),
            fetchMetric('customer_topEntities.latest.json'),
            fetchMetric('customer_incidentAging.latest.json'),
            // Customer Dashboard Ultimate Metrics
            fetchMetric('customerSeverityTrend.7d.json'),
            fetchMetric('customerAlertToIncidentRate.7d.json'),
            fetchMetric('customerIncidentTimeBuckets.latest.json'),
            fetchMetric('customerTopAlertRules.latest.json'),
            fetchMetric('customerIncidentsByStatus.latest.json'),
            fetchMetric('alertNoiseTrend.7d.json'),
            fetchMetric('alertVolumeBaseline.30d.json')
        ]);
        
        // Render SOC Analyst Dashboard
        renderNewIncidents(newIncidents);
        renderBarChart('openIncidentsBySeverity', openIncidentsBySeverity, 'severity');
        renderBarChart('openIncidentsByStatus', openIncidentsByStatus, 'status');
        renderBarChart('activeAlertsBySeverity', activeAlerts, 'severity');
        renderIncidentAging(incidentAging);
        renderTopEntities(topEntities);
        renderRepeatedDetections(repeatedDetections);
        
        // Render SOC Lead Dashboard
        renderIncidentTimings(incidentTimings, incidentDetectionTimings);
        renderLineChart('incidentInflow', incidentInflow);
        renderLineChart('incidentClosureRate', incidentClosureRate);
        renderAlertEscalationRate(alertEscalationRate);
        renderAlertToIncidentRatio(alertToIncidentRatio);
        renderFalsePositiveRate(falsePositiveRate);
        renderBenignPositiveRate(benignPositiveRate);
        renderTruePositiveRate(truePositiveRate);
        renderFalseNegativeRate(falseNegativeRate);
        renderAlertsPerAnalystBySeverity(alertsPerAnalystBySeverity);
        renderRuleFiringVolume(ruleFiringVolume);
        
        // Render Telemetry Health Dashboard
        renderIngestionVolume(ingestionVolume);
        renderDetectionCoverage(detectionCoverage);
        renderStorageTierDistribution(storageTierDistribution);
        renderZeroIngestionTables(zeroIngestion);
        renderAlertNoiseTrend(alertNoiseTrend);
        renderAlertVolumeComparison(alertNoiseTrend, alertVolumeBaseline);
        
        // Render Customer Dashboard
        renderBarChart('customerIncidentsBySeverity', customerIncidents, 'severity');
        renderBarChart('customerIncidentsByStatus', customerIncidentsByStatus, 'status');
        renderCustomerIncidentTrend(customerIncidentTrend);
        renderCustomerClosureTrend(customerIncidentClosureTrend);
        renderCustomerSeverityTrend(customerSeverityTrend);
        renderCustomerAlertToIncidentRate(customerAlertToIncidentRate);
        renderCustomerTimings(customerIncidentTimings);
        renderCustomerTimeBuckets(customerIncidentTimeBuckets);
        renderBarChart('customerActiveAlertsBySeverity', customerActiveAlerts, 'severity');
        renderCustomerTopEntities(customerTopEntities);
        renderCustomerTopAlertRules(customerTopAlertRules);
        renderCustomerIncidentAging(customerIncidentAging);
        
        // Render ROC Dashboard
        rocData = {
            riskScore: rocRiskScore,
            riskExposure: rocRiskExposure,
            riskDriversDaily: rocRiskDriversDaily,
            incidentCountByTitle: rocIncidentCount,
            executiveActions: rocExecutiveActions,
            workloadBySeverity: rocWorkloadBySeverity,
            highVolumeRisks: rocHighVolumeRisks,
            avgHighRisk: rocAvgHighRisk,
            attackSurfaceCoverage: rocAttackSurfaceCoverage,
            incidentAgeBuckets: rocIncidentAgeBuckets,
            incidentAgingDetails: rocIncidentAgingDetails,
            riskBurndown: rocRiskBurndown,
            riskDebtTrend: rocRiskDebtTrend,
            policyExceptions: rocPolicyExceptions,
            remediationRoi: rocRemediationRoi,
            slaHealthByBusinessUnit: rocSlaHealthByBu,
            repeatedDetections
        };
        renderRocDashboard();
        
        // Update last updated timestamp
        updateTimestamp(openIncidentsBySeverity?.generatedAt);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load dashboard data');
    }
}

// Centralized ROC rendering so range changes reuse the same data pipeline.
function renderRocDashboard() {
    if (!rocData) return;

    const windowEnd = getRocWindowEnd();
    if (!windowEnd) return;

    const { start, end } = getDateRange(windowEnd, rocRangeDays);
    updateRocDateRangeDisplay(start, end);

    const exposurePoints = filterByRange(rocData.riskExposure?.data, ['TimeGenerated'], start, end)
        .map(row => ({
            time: row.TimeGenerated || row.time || row.timestamp,
            count: row.DailyRiskScore ?? row.dailyRiskScore ?? row.RiskScore ?? row.count ?? row.value
        }))
        .filter(point => point.time && point.count !== null && point.count !== undefined)
        .sort((a, b) => new Date(a.time) - new Date(b.time));
    renderRiskScore(rocData.riskScore, { exposurePoints });
    renderRiskExposure(exposurePoints, rocData.riskExposure?.threshold);

    renderAvgHighRisk(rocData.avgHighRisk, { start, end });
    renderAttackSurfaceCoverage(rocData.attackSurfaceCoverage, { start, end });

    const driverEntries = filterByRange(rocData.riskDriversDaily?.data, ['TimeGenerated'], start, end);
    const driverTotals = getDriverTotals(driverEntries, rocData.incidentCountByTitle, rocRangeDays);
    renderPrimaryRiskDrivers(driverTotals);

    const highVolumeItems = Array.isArray(rocData.highVolumeRisks?.data)
        ? rocData.highVolumeRisks.data.map(item => ({
            title: item.Title || item.title || 'Unknown',
            count: scaleCount(item.IncidentCount ?? item.count ?? 0, rocRangeDays)
        }))
        : driverTotals;
    renderTopHighVolumeRisks(highVolumeItems);

    const execActions = filterByRange(rocData.executiveActions?.data, ['ClosedTime', 'closedTime'], start, end);
    const workloadItems = Array.isArray(rocData.workloadBySeverity?.data)
        ? rocData.workloadBySeverity.data.map(item => ({
            ...item,
            Count: scaleCount(item.Count ?? item.count ?? 0, rocRangeDays)
        }))
        : execActions;
    renderExecutiveActions(execActions);
    renderWorkloadBySeverity(workloadItems);

    const agingDetails = filterByRange(rocData.incidentAgingDetails?.data, ['ClosedTime', 'closedTime'], start, end);
    const ageBuckets = getAgeBucketCounts(agingDetails, rocData.incidentAgeBuckets?.data);
    renderIncidentAgeBuckets(ageBuckets);
    renderResolutionEfficiency(ageBuckets);
    renderIncidentAgingDetails(agingDetails);
    renderAvgResolveAge(agingDetails);
    renderResolutionSpeed(agingDetails);
    renderTargetOutliers(agingDetails);

    const burndownPoints = filterByRange(rocData.riskBurndown?.data, ['TimeGenerated'], start, end);
    renderRiskBurndown(burndownPoints);

    const debtPoints = filterByRange(rocData.riskDebtTrend?.data, ['TimeGenerated'], start, end);
    renderRiskDebtTrend(debtPoints);

    const exceptions = filterByRange(rocData.policyExceptions?.data, ['ApprovedDate'], start, end);
    renderPolicyExceptions(exceptions);

    const roiEntries = filterByRange(rocData.remediationRoi?.data, ['ClosedTime'], start, end);
    renderRemediationRoi(roiEntries);

    const slaEntries = filterByRange(rocData.slaHealthByBusinessUnit?.data, ['TimeGenerated'], start, end);
    renderSlaHealth(slaEntries);

    renderRepeatedDetections(rocData.repeatedDetections);
}

async function fetchMetric(filename) {
    try {
        const response = await fetch(`${CONFIG.dataPath}${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.warn(`Failed to load ${filename}:`, error);
        return null;
    }
}

// Rendering Functions

function renderNewIncidents(data) {
    if (!data || !data.data) {
        showEmptyState('newIncidents15m', '—');
        showEmptyState('newIncidents60m', '—');
        return;
    }
    
    document.getElementById('newIncidents15m').textContent = data.data.last15m || 0;
    document.getElementById('newIncidents60m').textContent = data.data.last60m || 0;
}

function renderBarChart(elementId, data, colorType) {
    const container = document.getElementById(elementId);
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState(data?.message || 'No data available');
        return;
    }
    
    const items = data.data;
    const maxValue = Math.max(...items.map(item => item.count || 0));
    
    const html = `
        <div class="bar-chart">
            ${items.map(item => {
                const label = item.severity || item.status || item.category || 'Unknown';
                const count = item.count || 0;
                const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;
                const colorClass = getColorClass(label, colorType);
                
                return `
                    <div class="bar-item">
                        <div class="bar-label">${label}</div>
                        <div class="bar-track">
                            <div class="bar-fill ${colorClass}" style="width: ${percentage}%">
                                <span class="bar-value">${count}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

function renderIncidentAging(data) {
    const container = document.getElementById('incidentAging');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No aging data available');
        return;
    }
    
    renderBarChart('incidentAging', data, 'aging');
}

function renderTopEntities(data) {
    const container = document.getElementById('topEntities');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No entity data available');
        return;
    }
    
    const html = `
        <table>
            <thead>
                <tr>
                    <th>Entity</th>
                    <th>Type</th>
                    <th>Incidents</th>
                </tr>
            </thead>
            <tbody>
                ${data.data.map(entity => `
                    <tr>
                        <td>${escapeHtml(entity.name)}</td>
                        <td><span class="entity-type">${entity.type}</span></td>
                        <td>${entity.incidentCount}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function renderIncidentTimings(data, detectionData) {
    if (!data || data.status === 'not_implemented' || !data.data) {
        document.getElementById('mttaMedian').textContent = '—';
        document.getElementById('mttaP95').textContent = '—';
        document.getElementById('mttrMedian').textContent = '—';
        document.getElementById('mttrP95').textContent = '—';
    } else {
        const mtta = data.data.mtta || {};
        const mttr = data.data.mttr || {};

        document.getElementById('mttaMedian').textContent = formatMinutes(mtta.medianMinutes);
        document.getElementById('mttaP95').textContent = formatMinutes(mtta.p95Minutes);
        document.getElementById('mttrMedian').textContent = formatMinutes(mttr.medianMinutes);
        document.getElementById('mttrP95').textContent = formatMinutes(mttr.p95Minutes);
    }

    if (!detectionData || detectionData.status === 'not_implemented' || !detectionData.data) {
        document.getElementById('mttdMedian').textContent = '—';
        document.getElementById('mttdP95').textContent = '—';
        return;
    }

    const mttd = detectionData.data.mttd || {};
    document.getElementById('mttdMedian').textContent = formatMinutes(mttd.medianMinutes);
    document.getElementById('mttdP95').textContent = formatMinutes(mttd.p95Minutes);
}

function renderLineChart(elementId, data) {
    const container = document.getElementById(elementId);
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState(data?.message || 'No data available');
        return;
    }
    
    const points = data.data;
    const labelMode = data.labelMode || 'time';
    const target = data.target;
    const maxValue = Math.max(...points.map(p => p.count || 0), 1);
    const width = 800;
    const height = 200;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // Calculate points
    const step = chartWidth / (points.length - 1 || 1);
    const svgPoints = points.map((p, i) => {
        const x = padding + (i * step);
        const y = padding + chartHeight - ((p.count / maxValue) * chartHeight);
        return { x, y, count: p.count, time: p.time };
    });
    
    // Create path
    const pathData = svgPoints.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
    ).join(' ');
    
    // Create area path
    const areaData = `
        M ${padding},${padding + chartHeight}
        L ${svgPoints[0].x},${svgPoints[0].y}
        ${svgPoints.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')}
        L ${svgPoints[svgPoints.length - 1].x},${padding + chartHeight}
        Z
    `;
    
    const html = `
        <svg class="line-chart-svg" viewBox="0 0 ${width} ${height}">
            <!-- Grid lines -->
            ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                const y = padding + (chartHeight * (1 - ratio));
                return `
                    <line class="line-chart-grid" 
                          x1="${padding}" y1="${y}" 
                          x2="${width - padding}" y2="${y}" />
                    <text class="line-chart-label" 
                          x="${padding - 5}" y="${y + 4}" 
                          text-anchor="end">${Math.round(maxValue * ratio)}</text>
                `;
            }).join('')}
            
            <!-- Area -->
            <path class="line-chart-area" d="${areaData}" />
            
            <!-- Line -->
            <path class="line-chart-path" d="${pathData}" />

            ${Number.isFinite(target) ? (() => {
                const clamped = Math.max(0, Math.min(target, maxValue));
                const y = padding + chartHeight - ((clamped / maxValue) * chartHeight);
                return `
                <line class="line-chart-target"
                      x1="${padding}" y1="${y}"
                      x2="${width - padding}" y2="${y}" />
            `;
            })() : ''}
            
            <!-- Points -->
            ${svgPoints.map(p => `
                <circle class="line-chart-dot" cx="${p.x}" cy="${p.y}" r="3" />
            `).join('')}
            
            <!-- Time labels (first, middle, last) -->
            ${[0, Math.floor(points.length / 2), points.length - 1].map(i => {
                const p = svgPoints[i];
                const date = new Date(points[i].time);
                const label = labelMode === 'date'
                    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                return `
                    <text class="line-chart-label" 
                          x="${p.x}" y="${height - 10}" 
                          text-anchor="middle">${label}</text>
                `;
            }).join('')}
        </svg>
    `;
    
    container.innerHTML = html;
}

function renderMultiLineChart(elementId, series) {
    const container = document.getElementById(elementId);

    if (!Array.isArray(series) || series.length === 0) {
        container.innerHTML = createEmptyState('No data available');
        return;
    }

    const baseSeries = series[0]?.data || [];
    if (baseSeries.length === 0) {
        container.innerHTML = createEmptyState('No data available');
        return;
    }

    const allValues = series.flatMap(item => item.data.map(point => point.count || 0));
    const maxValue = Math.max(...allValues, 1);
    const width = 800;
    const height = 200;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    const step = chartWidth / (baseSeries.length - 1 || 1);

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const y = padding + (chartHeight * (1 - ratio));
        return `
            <line class="line-chart-grid"
                  x1="${padding}" y1="${y}"
                  x2="${width - padding}" y2="${y}" />
            <text class="line-chart-label"
                  x="${padding - 5}" y="${y + 4}"
                  text-anchor="end">${Math.round(maxValue * ratio)}</text>
        `;
    }).join('');

    const paths = series.map(item => {
        const svgPoints = item.data.map((point, index) => {
            const x = padding + (index * step);
            const y = padding + chartHeight - ((point.count / maxValue) * chartHeight);
            return { x, y };
        });

        const pathData = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
        return `<path class="multi-line-path series-${item.id}" d="${pathData}" />`;
    }).join('');

    const labels = [0, Math.floor(baseSeries.length / 2), baseSeries.length - 1].map(index => {
        const point = baseSeries[index];
        const date = new Date(point.time);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const x = padding + (index * step);
        return `
            <text class="line-chart-label" x="${x}" y="${height - 10}" text-anchor="middle">${label}</text>
        `;
    }).join('');

    const legend = `
        <div class="multi-line-legend">
            ${series.map(item => `
                <span><i class="${item.id}"></i>${item.name}</span>
            `).join('')}
        </div>
    `;

    container.innerHTML = `
        <svg class="multi-line-chart-svg" viewBox="0 0 ${width} ${height}">
            ${gridLines}
            ${paths}
            ${labels}
        </svg>
        ${legend}
    `;
}

function renderRuleFiringVolume(data) {
    const container = document.getElementById('ruleFiringVolume');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No rule firing data available');
        return;
    }
    
    const html = `
        <table>
            <thead>
                <tr>
                    <th>Rule Name</th>
                    <th>Firings</th>
                    <th>Incidents Created</th>
                </tr>
            </thead>
            <tbody>
                ${data.data.slice(0, 10).map(rule => `
                    <tr>
                        <td>${escapeHtml(rule.ruleName || 'Unknown')}</td>
                        <td>${rule.fireCount || 0}</td>
                        <td>${rule.incidentCount || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function renderAlertsPerAnalystBySeverity(data) {
    const container = document.getElementById('alertsPerAnalystBySeverity');
    if (!container) return;

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
        container.innerHTML = createEmptyState('No analyst alert data available');
        return;
    }

    const severityOrder = Array.isArray(data.severityOrder)
        ? data.severityOrder
        : ['Critical', 'High', 'Medium', 'Low', 'Informational'];

    const sample = data.data[0] || {};
    const reservedKeys = new Set(['analyst', 'analystName', 'name', 'user']);
    const severityKeys = severityOrder.filter(key => Object.prototype.hasOwnProperty.call(sample, key));
    const extraKeys = Object.keys(sample).filter(key => !reservedKeys.has(key) && !severityOrder.includes(key));
    const severities = [...severityKeys, ...extraKeys];

    if (severities.length === 0) {
        container.innerHTML = createEmptyState('No severity breakdown available');
        return;
    }

    const rows = data.data.map(item => {
        const analyst = item.analyst || item.analystName || item.name || item.user || 'Unknown';
        const counts = severities.map(severity => Number(item[severity] ?? 0));
        const total = counts.reduce((sum, value) => sum + value, 0);
        return { analyst, counts, total };
    });

    const totalsBySeverity = severities.map((_, index) =>
        rows.reduce((sum, row) => sum + (row.counts[index] || 0), 0)
    );
    const grandTotal = totalsBySeverity.reduce((sum, value) => sum + value, 0);

    const html = `
        <table class="alerts-analyst-table">
            <thead>
                <tr>
                    <th>Analyst</th>
                    ${severities.map(severity => `<th class="table-numeric">${severity}</th>`).join('')}
                    <th class="table-numeric">Total</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(row => `
                    <tr>
                        <td>${escapeHtml(row.analyst)}</td>
                        ${row.counts.map(count => `<td class="table-numeric">${formatNumber(count)}</td>`).join('')}
                        <td class="table-numeric">${formatNumber(row.total)}</td>
                    </tr>
                `).join('')}
                <tr class="table-total">
                    <td>Total</td>
                    ${totalsBySeverity.map(total => `<td class="table-numeric">${formatNumber(total)}</td>`).join('')}
                    <td class="table-numeric">${formatNumber(grandTotal)}</td>
                </tr>
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderIngestionVolume(data) {
    const container = document.getElementById('ingestionVolumeByTable');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No ingestion data available');
        return;
    }
    
    const items = data.data.map(item => {
        const label = item.table || item.tableName || 'Unknown';
        const gb = Number(item.ingestedGB ?? (item.sizeBytes ? item.sizeBytes / (1024 * 1024 * 1024) : 0));
        return {
            label: String(label),
            gb: Number.isFinite(gb) ? gb : 0
        };
    }).sort((a, b) => b.gb - a.gb);

    const maxVolume = Math.max(...items.map(item => item.gb), 0);

    const html = `
        <div class="bar-chart ingestion-chart">
            ${items.map(item => {
                const width = maxVolume > 0 ? (item.gb / maxVolume) * 100 : 0;
                const label = escapeHtml(item.label);
                return `
                    <div class="bar-item">
                        <div class="bar-label" title="${label}">${label}</div>
                        <div class="bar-track">
                            <div class="bar-fill ingestion-fill" style="width: 0%;" data-width="${width}">
                                <span class="bar-value">${formatNumber(item.gb, 2)} GB</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;

    requestAnimationFrame(() => {
        container.querySelectorAll('.ingestion-fill').forEach(fill => {
            fill.style.width = `${fill.dataset.width}%`;
        });
    });
}

function renderCoveragePieChart(container, options) {
    if (!container) return;

    const total = Number(options.total);
    const covered = Number(options.covered);

    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(covered)) {
        container.innerHTML = createEmptyState(options.emptyMessage || 'No coverage data available');
        return;
    }

    const safeCovered = Math.min(Math.max(covered, 0), total);
    const uncovered = Math.max(0, total - safeCovered);
    const percent = total > 0 ? (safeCovered / total) * 100 : 0;

    const items = [
        {
            label: options.coveredLabel || 'Covered',
            count: safeCovered,
            color: options.coveredColor || getCssVar('--severity-low', '#22c55e')
        },
        {
            label: options.uncoveredLabel || 'Uncovered',
            count: uncovered,
            color: options.uncoveredColor || getCssVar('--severity-high', '#f97316')
        }
    ];

    renderRocDonutChart(container, items, options.label, {
        centerValue: options.centerValue || `${formatNumber(percent, Number.isInteger(percent) ? 0 : 1)}%`,
        centerLabel: options.centerLabel || options.label
    });
}

function renderDetectionCoverage(data) {
    const container = document.getElementById('detectionCoverage');
    if (!container) return;

    if (!data || data.status === 'not_implemented' || !data.data) {
        container.innerHTML = createEmptyState('No detection coverage data available');
        applyCoverageStatusClass(container, null);
        return;
    }

    const payload = data.data || {};
    let coverageValue = getScalarMetricValue(data, ['coveragePercent', 'CoveragePercent']);
    const coveredAssets = payload.coveredCriticalAssets ?? payload.coveredAssets ?? payload.criticalAssetsCovered;
    const totalAssets = payload.totalCriticalAssets ?? payload.totalAssets ?? payload.criticalAssetsTotal;
    const coveredSources = payload.coveredTelemetrySources ?? payload.coveredSources ?? payload.sourcesCovered;
    const totalSources = payload.totalTelemetrySources ?? payload.totalSources ?? payload.sourcesTotal;

    if (coverageValue === null || coverageValue === undefined) {
        const coveredTotal = (Number(coveredAssets) || 0) + (Number(coveredSources) || 0);
        const totalTotal = (Number(totalAssets) || 0) + (Number(totalSources) || 0);
        if (totalTotal > 0) {
            coverageValue = (coveredTotal / totalTotal) * 100;
        } else if (Number(totalAssets) > 0) {
            coverageValue = ((Number(coveredAssets) || 0) / Number(totalAssets)) * 100;
        }
    }

    const status = getCoverageStatus(coverageValue);
    applyCoverageStatusClass(container, status);

    const coverageDisplay = coverageValue === null || coverageValue === undefined
        ? '—'
        : `${formatNumber(coverageValue, Number.isInteger(coverageValue) ? 0 : 1)}%`;

    const coverageColor = status === 'good'
        ? getCssVar('--severity-low', '#22c55e')
        : status === 'warn'
            ? getCssVar('--severity-medium', '#f59e0b')
            : status === 'bad'
                ? getCssVar('--severity-critical', '#ef4444')
                : getCssVar('--accent-primary', '#6366f1');

    container.innerHTML = `
        <div class="coverage-pie-grid">
            <div class="coverage-pie-card">
                <div class="coverage-pie-title">Overall coverage</div>
                <div class="coverage-pie-chart" data-coverage-chart="overall"></div>
            </div>
            <div class="coverage-pie-card">
                <div class="coverage-pie-title">Critical assets</div>
                <div class="coverage-pie-chart" data-coverage-chart="assets"></div>
            </div>
            <div class="coverage-pie-card">
                <div class="coverage-pie-title">Telemetry sources</div>
                <div class="coverage-pie-chart" data-coverage-chart="sources"></div>
            </div>
        </div>
    `;

    const overallChart = container.querySelector('[data-coverage-chart="overall"]');
    const assetsChart = container.querySelector('[data-coverage-chart="assets"]');
    const sourcesChart = container.querySelector('[data-coverage-chart="sources"]');

    if (coverageValue === null || coverageValue === undefined) {
        if (overallChart) {
            overallChart.innerHTML = createEmptyState('No coverage data available');
        }
    } else {
        const clampedCoverage = Math.min(100, Math.max(0, Number(coverageValue)));
        renderCoveragePieChart(overallChart, {
            covered: clampedCoverage,
            total: 100,
            label: 'Coverage',
            centerValue: coverageDisplay,
            centerLabel: 'Coverage',
            coveredColor: coverageColor,
            uncoveredColor: getCssVar('--text-muted', '#6b7280'),
            coveredLabel: 'Covered',
            uncoveredLabel: 'Gap'
        });
    }

    renderCoveragePieChart(assetsChart, {
        covered: coveredAssets ?? 0,
        total: totalAssets ?? 0,
        label: 'Assets',
        centerLabel: 'Assets',
        coveredLabel: 'Covered',
        uncoveredLabel: 'Uncovered',
        coveredColor: getCssVar('--severity-low', '#22c55e'),
        uncoveredColor: getCssVar('--severity-high', '#f97316'),
        emptyMessage: 'No asset coverage data available'
    });

    renderCoveragePieChart(sourcesChart, {
        covered: coveredSources ?? 0,
        total: totalSources ?? 0,
        label: 'Sources',
        centerLabel: 'Sources',
        coveredLabel: 'Covered',
        uncoveredLabel: 'Uncovered',
        coveredColor: getCssVar('--severity-low', '#22c55e'),
        uncoveredColor: getCssVar('--severity-high', '#f97316'),
        emptyMessage: 'No source coverage data available'
    });
}

function renderStorageTierDistribution(data) {
    const container = document.getElementById('storageTierDistribution');
    if (!container) return;

    if (!data || data.status === 'not_implemented' || !data.data) {
        container.innerHTML = createEmptyState('No storage tier data available');
        return;
    }

    const payload = data.data || {};
    const parsePercent = value => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    };

    let hotValue = parsePercent(getScalarMetricValue(data, [
        'hotPercent',
        'hotStoragePercent',
        'hotStoragePct',
        'hotStoragePercentage',
        'hotStorageShare',
        'hotPercentOfLogs',
        'hotPct'
    ]));
    let coldValue = parsePercent(getScalarMetricValue(data, [
        'coldPercent',
        'coldStoragePercent',
        'coldStoragePct',
        'coldStoragePercentage',
        'coldStorageShare',
        'coldPercentOfLogs',
        'coldPct',
        'costEffectiveStoragePercent',
        'costEffectivePercent',
        'costEffectivePct'
    ]));

    const tierEntries = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.tiers)
            ? payload.tiers
            : Array.isArray(payload.storageTiers)
                ? payload.storageTiers
                : Array.isArray(payload.distribution)
                    ? payload.distribution
                    : Array.isArray(payload.tierDistribution)
                        ? payload.tierDistribution
                        : null;

    if (tierEntries) {
        tierEntries.forEach(entry => {
            const name = String(entry.tier ?? entry.name ?? entry.storageTier ?? entry.label ?? '').toLowerCase();
            const percentValue = parsePercent(entry.percent ?? entry.percentage ?? entry.pct ?? entry.value);
            if (!Number.isFinite(hotValue) && name.includes('hot')) {
                hotValue = percentValue;
            }
            if (!Number.isFinite(coldValue) && (name.includes('cold') || name.includes('cool') || name.includes('cost'))) {
                coldValue = percentValue;
            }
        });
    }

    const hotVolume = parsePercent(payload.hotGB ?? payload.hotStorageGB ?? payload.hotVolumeGB ?? payload.hotStorageGiB);
    const coldVolume = parsePercent(payload.coldGB ?? payload.coldStorageGB ?? payload.costEffectiveGB ?? payload.costEffectiveStorageGB ?? payload.coldStorageGiB ?? payload.costEffectiveStorageGiB);
    const hotBytes = parsePercent(payload.hotBytes ?? payload.hotStorageBytes ?? payload.hotStorageSizeBytes);
    const coldBytes = parsePercent(payload.coldBytes ?? payload.coldStorageBytes ?? payload.coldStorageSizeBytes ?? payload.costEffectiveBytes ?? payload.costEffectiveStorageBytes ?? payload.costEffectiveStorageSizeBytes);

    if ((!Number.isFinite(hotValue) || !Number.isFinite(coldValue)) && Number.isFinite(hotVolume) && Number.isFinite(coldVolume)) {
        const totalVolume = hotVolume + coldVolume;
        if (totalVolume > 0) {
            hotValue = (hotVolume / totalVolume) * 100;
            coldValue = (coldVolume / totalVolume) * 100;
        }
    }

    if ((!Number.isFinite(hotValue) || !Number.isFinite(coldValue)) && Number.isFinite(hotBytes) && Number.isFinite(coldBytes)) {
        const totalBytes = hotBytes + coldBytes;
        if (totalBytes > 0) {
            hotValue = (hotBytes / totalBytes) * 100;
            coldValue = (coldBytes / totalBytes) * 100;
        }
    }

    if (Number.isFinite(hotValue) && !Number.isFinite(coldValue)) {
        coldValue = Math.max(0, 100 - hotValue);
    }
    if (Number.isFinite(coldValue) && !Number.isFinite(hotValue)) {
        hotValue = Math.max(0, 100 - coldValue);
    }

    if (!Number.isFinite(hotValue) && !Number.isFinite(coldValue)) {
        container.innerHTML = createEmptyState('No storage tier data available');
        return;
    }

    const total = (Number.isFinite(hotValue) ? hotValue : 0) + (Number.isFinite(coldValue) ? coldValue : 0);
    const hotDisplay = Number.isFinite(hotValue)
        ? `${formatNumber(hotValue, Number.isInteger(hotValue) ? 0 : 1)}%`
        : '—';
    const coldDisplay = Number.isFinite(coldValue)
        ? `${formatNumber(coldValue, Number.isInteger(coldValue) ? 0 : 1)}%`
        : '—';
    const totalDisplay = total > 0
        ? `${formatNumber(total, Number.isInteger(total) ? 0 : 1)}%`
        : '—';

    const hotColor = getCssVar('--severity-high', '#f97316');
    const coldColor = getCssVar('--severity-low', '#22c55e');

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const segments = [
        { label: 'Hot', value: Number.isFinite(hotValue) ? hotValue : 0, color: hotColor },
        { label: 'Cost-effective', value: Number.isFinite(coldValue) ? coldValue : 0, color: coldColor }
    ].map(item => {
        const length = total > 0 ? (item.value / total) * circumference : 0;
        const segment = `
            <circle
                class="roc-donut-segment"
                cx="60" cy="60" r="${radius}"
                stroke="${item.color}"
                stroke-dasharray="${length} ${circumference - length}"
                stroke-dashoffset="${-offset}"
            />
        `;
        offset += length;
        return segment;
    }).join('');

    container.innerHTML = `
        <div class="storage-tier-metrics">
            <div class="storage-tier-row">
                <div class="storage-tier-chart">
                    <div class="roc-donut storage-tier-donut" role="img" aria-label="Storage tier distribution: Hot ${hotDisplay}, Cost-effective ${coldDisplay}">
                        <svg viewBox="0 0 120 120">
                            <circle class="roc-donut-hole" cx="60" cy="60" r="30"></circle>
                            <circle class="roc-donut-ring" cx="60" cy="60" r="${radius}"></circle>
                            ${segments}
                        </svg>
                        <div class="roc-donut-center">
                            <span class="roc-donut-value">${totalDisplay}</span>
                            <span class="roc-donut-label">Total logs</span>
                        </div>
                    </div>
                </div>
                <div class="metrics-group storage-tier-metrics-group">
                    <div class="metric">
                        <span class="metric-label">Hot storage</span>
                        <span class="metric-value">${hotDisplay}</span>
                        <div class="metric" style="margin-top: var(--spacing-md);">
                            <span class="metric-label">Cost-effective storage</span>
                            <span class="metric-value">${coldDisplay}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="storage-tier-legend">
                <div class="storage-tier-legend-item">
                    <span class="storage-tier-legend-dot hot" style="background: ${hotColor};"></span>
                    <span>Hot</span>
                </div>
                <div class="storage-tier-legend-item">
                    <span class="storage-tier-legend-dot cold" style="background: ${coldColor};"></span>
                    <span>Cost-effective</span>
                </div>
            </div>
        </div>
    `;
}

function getCoverageStatus(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    if (numeric >= 90) return 'good';
    if (numeric >= 75) return 'warn';
    return 'bad';
}

function applyCoverageStatusClass(element, status) {
    if (!element) return;
    element.classList.remove('coverage-good', 'coverage-warn', 'coverage-bad');
    if (status) {
        element.classList.add(`coverage-${status}`);
    }
}

function renderZeroIngestionTables(data) {
    const container = document.getElementById('zeroIngestionTables');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('All tables receiving data', 'success');
        return;
    }
    
    const html = `
        <div class="alert-list">
            ${data.data.map(item => `
                <div class="alert-item error">
                    ${escapeHtml(item.table || item.tableName || 'Unknown')}
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

function renderRepeatedDetections(data) {
    const container = document.getElementById('repeatedDetections');
    if (!container) return;
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No repeated detections found');
        return;
    }

    const items = data.data;
    const maxValue = Math.max(...items.map(item => item.count || 0), 0);

    const html = `
        <div class="bar-chart repeated-detections-chart">
            ${items.map(detection => {
                const label = escapeHtml(detection.alertName || 'Unknown');
                const count = detection.count || 0;
                const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;

                return `
                    <div class="bar-item">
                        <div class="bar-label repeated-detections-label">${label}</div>
                        <div class="bar-track">
                            <div class="bar-fill repeated-detections-fill" style="width: ${percentage}%">
                                <span class="bar-value">${count}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;
}

function renderRiskScore(data, options = {}) {
    const element = document.getElementById('rocRiskScore');
    if (!element) return;
    let value = null;

    if (Array.isArray(options.exposurePoints) && options.exposurePoints.length > 0) {
        value = options.exposurePoints.reduce((sum, point) => sum + (point.count || 0), 0);
    } else {
        value = getScalarMetricValue(data, ['RiskScore', 'riskScore']);
    }

    element.textContent = value === null ? '—' : formatCompactNumber(value);
}

function renderAvgHighRisk(data, options = {}) {
    const element = document.getElementById('rocAvgHighRisk');
    if (!element) return;

    let value = null;
    const history = data?.data?.history;
    if (Array.isArray(history) && options.start && options.end) {
        const points = filterByRange(history, ['TimeGenerated'], options.start, options.end);
        if (points.length > 0) {
            const total = points.reduce((sum, item) => sum + (item.AvgMTTR ?? item.avgMTTR ?? 0), 0);
            value = total / points.length;
        }
    }

    if (value === null) {
        value = getScalarMetricValue(data, ['AvgMTTR', 'avgMTTR']);
    }

    if (value === null) {
        element.textContent = '—';
        return;
    }

    const decimals = Number.isInteger(value) ? 0 : 1;
    element.textContent = `${formatNumber(value, decimals)}d`;
}

function renderAttackSurfaceCoverage(data, options = {}) {
    const gaugeContainer = document.getElementById('rocAttackSurfaceCoverage');
    const treemapContainer = document.getElementById('rocCoverageTreemap');
    if (!gaugeContainer || !treemapContainer) return;

    if (!data || data.status === 'not_implemented' || !data.data) {
        gaugeContainer.innerHTML = createEmptyState('No coverage data available');
        treemapContainer.innerHTML = createEmptyState('No gap data available');
        return;
    }

    const history = data.data.coverageHistory || [];
    let coverageValue = getScalarMetricValue(data, ['CoveragePercent', 'coveragePercent']);

    if (Array.isArray(history) && options.start && options.end) {
        const filtered = filterByRange(history, ['TimeGenerated'], options.start, options.end);
        if (filtered.length > 0) {
            coverageValue = filtered[filtered.length - 1].CoveragePercent ?? coverageValue;
        }
    }

    renderCoverageGauge(gaugeContainer, coverageValue);
    renderCoverageTreemap(treemapContainer, data.data.gapBreakdown || [], coverageValue);
}

function renderRiskExposure(points, threshold) {
    const container = document.getElementById('rocRiskExposure');
    if (!container) return;

    if (!Array.isArray(points) || points.length === 0) {
        container.innerHTML = createEmptyState('No risk exposure data available');
        return;
    }

    const maxValue = Math.max(...points.map(point => point.count || 0), 1);
    const bars = points.map(point => {
        const count = Number(point.count) || 0;
        const height = Math.max(2, (count / maxValue) * 100);
        const isAlert = Number.isFinite(threshold) && count >= threshold;
        return `
            <div class="roc-bar ${isAlert ? 'is-alert' : ''}" style="height: ${height}%;">
                <span class="roc-bar-value">${formatNumber(count)}</span>
            </div>
        `;
    }).join('');

    // SLA threshold overlay for the daily risk intensity chart.
    const thresholdLine = Number.isFinite(threshold) ? (() => {
        const rawPosition = 100 - ((threshold / maxValue) * 100);
        const position = Math.min(100, Math.max(0, rawPosition));
        return `
            <div class="roc-bar-threshold" style="top: ${position}%;">
                <span>SLA ${formatNumber(threshold)}</span>
            </div>
        `;
    })() : '';

    const labels = [0, Math.floor(points.length / 2), points.length - 1].map(index => {
        const date = new Date(points[index].time);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    container.innerHTML = `
        ${thresholdLine}
        <div class="roc-bar-trend-chart">
            ${bars}
        </div>
        <div class="roc-bar-labels">
            <span>${labels[0]}</span>
            <span>${labels[1]}</span>
            <span>${labels[2]}</span>
        </div>
    `;
}

function renderIncidentCountByTitle(data) {
    const container = document.getElementById('rocIncidentCount');

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
        container.innerHTML = createEmptyState('No incident count data available');
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Incident Title</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                ${data.data.map(item => {
                    const title = escapeHtml(item.Title || item.title || 'Unknown');
                    const count = item.IncidentCount ?? item.count ?? 0;
                    return `
                        <tr>
                            <td>${title}</td>
                            <td>${formatNumber(count)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderExecutiveActions(items) {
    const container = document.getElementById('rocExecutiveActions');

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = createEmptyState('No executive actions available');
        return;
    }

    const sorted = items
        .slice()
        .sort((a, b) => new Date(b.ApprovedDate || b.approvedDate) - new Date(a.ApprovedDate || a.approvedDate));

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Risk</th>
                    <th>Owner</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => {
                    const owner = escapeHtml(item.Owner || item.owner || '—');
                    const risk = escapeHtml(item.Risk || item.risk || '—');
                    const status = escapeHtml(item.Status || item.status || 'Closed');
                    return `
                        <tr>
                            <td>${risk}</td>
                            <td>${owner}</td>
                            <td>${status}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderIncidentAgeBuckets(buckets) {
    const container = document.getElementById('rocIncidentAgeBuckets');

    if (!container) return;

    if (!Array.isArray(buckets) || buckets.length === 0) {
        container.innerHTML = createEmptyState('No closed incident aging data available');
        return;
    }

    const normalized = buckets.map(item => ({
        category: item.category || item.AgeBucket || item.ageBucket || 'Unknown',
        count: item.count ?? item.IncidentCount ?? 0
    }));

    renderBarChart('rocIncidentAgeBuckets', { data: normalized }, 'aging');
}

function renderIncidentAgingDetails(items) {
    const container = document.getElementById('rocIncidentAgingDetails');

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = createEmptyState('No closed incident details available');
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Incident</th>
                    <th>Age (Days)</th>
                    <th>Age Bucket</th>
                    <th>Closed</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => {
                    const title = escapeHtml(item.IncidentTitle || item.Title || item.title || '—');
                    const ageDays = item.AgeDays ?? item.ageDays ?? '—';
                    const bucket = escapeHtml(item.AgeBucket || item.ageBucket || '—');
                    const closed = formatDateTime(item.ClosedTime || item.closedTime);
                    return `
                        <tr>
                            <td>${title}</td>
                            <td>${formatNumber(ageDays)}</td>
                            <td>${bucket}</td>
                            <td>${closed}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderWorkloadBySeverity(items) {
    const container = document.getElementById('rocWorkloadBySeverity');
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = createEmptyState('No workload data available');
        return;
    }

    const counts = items.reduce((acc, item) => {
        const category = (item.Category || item.category || item.severity || 'Unknown').toString();
        const countValue = item.Count ?? item.count;
        const key = category.toLowerCase();
        const increment = Number.isFinite(countValue) ? countValue : 1;
        if (key === 'critical') {
            acc.high = (acc.high || 0) + increment;
            return acc;
        }
        acc[key] = (acc[key] || 0) + increment;
        return acc;
    }, {});

    const donutItems = [
        { label: 'Low', count: counts.low || 0, color: getCssVar('--severity-low', '#22c55e') },
        { label: 'Medium', count: counts.medium || 0, color: getCssVar('--severity-medium', '#f59e0b') },
        { label: 'High', count: counts.high || 0, color: getCssVar('--severity-high', '#f97316') }
    ].filter(item => item.count > 0);

    renderRocDonutChart(container, donutItems, 'Incidents');
}

function renderTopHighVolumeRisks(items) {
    const container = document.getElementById('socHighVolumeRisks');
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = createEmptyState('No high-volume risk data available');
        return;
    }

    const normalized = items
        .slice()
        .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
        .slice(0, 5)
        .map(item => ({
            category: item.title || item.Title || 'Unknown',
            count: item.count ?? item.IncidentCount ?? 0
        }));

    renderBarChart('socHighVolumeRisks', { data: normalized }, 'severity');
}

function renderResolutionEfficiency(buckets) {
    const container = document.getElementById('rocResolutionEfficiency');
    if (!container) return;

    if (!Array.isArray(buckets) || buckets.length === 0) {
        container.innerHTML = createEmptyState('No resolution efficiency data available');
        return;
    }

    const items = buckets.map(item => {
        const label = item.category || item.AgeBucket || item.ageBucket || 'Unknown';
        let color = getCssVar('--severity-informational', '#3b82f6');
        const normalized = label.toLowerCase();
        if (normalized.includes('0-7')) color = getCssVar('--severity-low', '#22c55e');
        if (normalized.includes('8-30')) color = getCssVar('--severity-medium', '#f59e0b');
        if (normalized.includes('30+')) color = getCssVar('--severity-high', '#f97316');
        return {
            label,
            count: item.count ?? item.IncidentCount ?? 0,
            color
        };
    });

    const total = items.reduce((sum, item) => sum + item.count, 0);
    const efficient = items.find(item => item.label.toLowerCase().includes('0-7'));
    const efficiencyPercent = total > 0 ? (efficient?.count || 0) / total * 100 : 0;

    renderRocDonutChart(container, items, 'Incidents', {
        centerValue: `${formatNumber(efficiencyPercent, 2)}%`,
        centerLabel: '0-7 Days'
    });
}

function renderAvgResolveAge(items) {
    const element = document.getElementById('rocAvgResolveAge');
    if (!element) return;

    if (!Array.isArray(items) || items.length === 0) {
        element.textContent = '—';
        return;
    }

    const total = items.reduce((sum, item) => sum + (item.AgeDays ?? item.ageDays ?? 0), 0);
    const avg = total / items.length;
    element.textContent = Number.isFinite(avg) ? formatNumber(avg, 2) : '—';
}

function renderResolutionSpeed(items) {
    const container = document.getElementById('rocResolutionSpeed');
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = createEmptyState('No resolution speed data available');
        return;
    }

    const grouped = {};
    items.forEach(item => {
        const dateValue = item.ClosedTime || item.closedTime;
        const age = item.AgeDays ?? item.ageDays;
        if (!dateValue || age === null || age === undefined) return;
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return;
        const key = date.toISOString().slice(0, 10);
        grouped[key] = grouped[key] || [];
        grouped[key].push(age);
    });

    const points = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, ages]) => ({
            time: `${date}T00:00:00Z`,
            count: ages.reduce((sum, value) => sum + value, 0) / ages.length
        }));

    if (points.length === 0) {
        container.innerHTML = createEmptyState('No resolution speed data available');
        return;
    }

    renderLineChart('rocResolutionSpeed', { data: points, labelMode: 'date', target: 2 });
}

function renderTargetOutliers(items) {
    const container = document.getElementById('rocTargetOutliers');
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = createEmptyState('No outliers available');
        return;
    }

    const outliers = items.filter(item => (item.AgeDays ?? item.ageDays ?? 0) > 2);

    if (outliers.length === 0) {
        container.innerHTML = createEmptyState('No outliers above 2 days');
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Risk</th>
                    <th>Age</th>
                    <th>Category</th>
                </tr>
            </thead>
            <tbody>
                ${outliers.map(item => {
                    const title = escapeHtml(item.IncidentTitle || item.Title || '—');
                    const age = item.AgeDays ?? item.ageDays ?? '—';
                    const category = escapeHtml(item.Category || item.category || item.AgeBucket || item.ageBucket || '—');
                    return `
                        <tr>
                            <td>${title}</td>
                            <td>${formatNumber(age)}</td>
                            <td>${category}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderPrimaryRiskDrivers(items) {
    const container = document.getElementById('rocPrimaryRiskDrivers');
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = createEmptyState('No primary risk drivers available');
        return;
    }

    const topItems = items.slice(0, 5);
    const maxValue = Math.max(...topItems.map(item => item.count || 0), 1);
    const html = `
        <div class="roc-primary-list">
            ${topItems.map(item => {
                const percentage = (item.count / maxValue) * 100;
                return `
                    <div class="roc-primary-item">
                        <div class="roc-primary-label">
                            <span>${escapeHtml(item.title)}</span>
                            <strong>${formatNumber(item.count)}</strong>
                        </div>
                        <div class="roc-primary-track">
                            <div class="roc-primary-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;
}

function renderCoverageGauge(container, value) {
    const percent = Number(value);
    if (!Number.isFinite(percent)) {
        container.innerHTML = createEmptyState('No coverage data available');
        return;
    }

    const clamped = Math.max(0, Math.min(100, percent));
    container.innerHTML = `
        <div>
            <svg viewBox="0 0 200 120">
                <path class="roc-gauge-track" d="M10 110 A90 90 0 0 1 190 110" pathLength="100" />
                <path class="roc-gauge-fill" d="M10 110 A90 90 0 0 1 190 110" pathLength="100" stroke-dasharray="${clamped} 100" />
            </svg>
            <div class="roc-gauge-value">${formatNumber(clamped, 2)}%</div>
        </div>
    `;
}

function renderCoverageTreemap(container, breakdown, coverageValue) {
    const gap = Math.max(0, 100 - (Number(coverageValue) || 0));
    const expanded = container.dataset.expanded === 'true';
    container.classList.toggle('is-collapsed', !expanded);
    container.setAttribute('aria-pressed', expanded ? 'true' : 'false');

    const items = expanded && Array.isArray(breakdown) && breakdown.length > 0
        ? breakdown
        : [{ label: 'Coverage Gap', percent: gap }];

    const grid = `
        <div class="roc-treemap-grid">
            ${items.map(item => `
                <div class="roc-treemap-item">
                    <strong>${formatNumber(item.percent, 2)}%</strong>
                    <span>${escapeHtml(item.label)}</span>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = grid;
    // Toggle between the single gap tile and the expanded breakdown view.
    container.onclick = () => {
        container.dataset.expanded = expanded ? 'false' : 'true';
        renderCoverageTreemap(container, breakdown, coverageValue);
    };
    container.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            container.click();
        }
    };
}

function renderRiskBurndown(points) {
    const container = document.getElementById('rocRiskBurndown');
    if (!container) return;

    if (!Array.isArray(points) || points.length === 0) {
        container.innerHTML = createEmptyState('No burn-down data available');
        return;
    }

    const sorted = points
        .slice()
        .sort((a, b) => new Date(a.TimeGenerated) - new Date(b.TimeGenerated));
    const identified = sorted.map(point => ({ time: point.TimeGenerated, count: point.Identified }));
    const remediated = sorted.map(point => ({ time: point.TimeGenerated, count: point.Remediated }));

    renderMultiLineChart('rocRiskBurndown', [
        { id: 'identified', name: 'Risks Identified', data: identified },
        { id: 'remediated', name: 'Risks Remediated', data: remediated }
    ]);
}

function renderRiskDebtTrend(points) {
    const container = document.getElementById('rocRiskDebtTrend');
    if (!container) return;

    if (!Array.isArray(points) || points.length === 0) {
        container.innerHTML = createEmptyState('No risk debt data available');
        return;
    }

    const formatted = points
        .slice()
        .sort((a, b) => new Date(a.TimeGenerated) - new Date(b.TimeGenerated))
        .map(point => ({
            time: point.TimeGenerated,
            count: point.RiskDebt ?? point.riskDebt ?? 0
        }));

    renderLineChart('rocRiskDebtTrend', { data: formatted, labelMode: 'date' });
}

function renderPolicyExceptions(items) {
    const container = document.getElementById('rocPolicyExceptions');
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = createEmptyState('No policy exceptions available');
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Risk</th>
                    <th>Owner</th>
                    <th>Approved By</th>
                    <th>Decision Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${sorted.map(item => `
                    <tr>
                        <td>${escapeHtml(item.Risk || item.risk || '—')}</td>
                        <td>${escapeHtml(item.Owner || item.owner || '—')}</td>
                        <td>${escapeHtml(item.ApprovedBy || item.approvedBy || '—')}</td>
                        <td>${formatDateTime(item.ApprovedDate || item.approvedDate)}</td>
                        <td>${escapeHtml(item.Status || item.status || 'Accepted')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderRemediationRoi(items) {
    const element = document.getElementById('rocRemediationRoi');
    if (!element) return;

    if (!Array.isArray(items) || items.length === 0) {
        element.textContent = '—';
        return;
    }

    const total = items.reduce((sum, item) => sum + (item.LossAvoided ?? item.lossAvoided ?? 0), 0);
    element.textContent = formatCurrency(total);
}

function renderSlaHealth(items) {
    const container = document.getElementById('rocSlaHealth');
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = createEmptyState('No SLA health data available');
        return;
    }

    const totals = {};
    items.forEach(item => {
        const dept = item.Department || item.department || 'Unknown';
        totals[dept] = totals[dept] || { total: 0, within: 0 };
        totals[dept].total += item.Total ?? item.total ?? 0;
        totals[dept].within += item.WithinTarget ?? item.withinTarget ?? 0;
    });

    const rows = Object.entries(totals).map(([dept, value]) => {
        const rawPercent = value.total > 0 ? (value.within / value.total) * 100 : 0;
        const percent = Math.min(100, Math.max(0, rawPercent));
        return { category: dept, percent };
    }).sort((a, b) => b.percent - a.percent);

    const html = `
        <div class="bar-chart">
            ${rows.map(item => `
                <div class="bar-item">
                    <div class="bar-label">${escapeHtml(item.category)}</div>
                    <div class="bar-track">
                        <div class="bar-fill severity-informational" style="width: ${item.percent}%">
                            <span class="bar-value">${formatNumber(item.percent, 0)}%</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;
}

function renderPlaceholder(elementId, data) {
    const container = document.getElementById(elementId);
    
    if (!data || data.status === 'not_implemented') {
        container.innerHTML = createEmptyState(
            data?.message || 'Not implemented',
            'placeholder'
        );
    }
}

function getRocWindowEnd() {
    const sources = [
        rocData?.riskExposure,
        rocData?.riskBurndown,
        rocData?.riskScore
    ].filter(Boolean);

    for (const source of sources) {
        const value = source.windowEnd || source.generatedAt;
        if (value) {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
                return date;
            }
        }
    }

    return null;
}

function getDateRange(windowEnd, days) {
    const end = new Date(windowEnd);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - Math.max(0, days - 1));
    return { start, end };
}

function updateRocDateRangeDisplay(start, end) {
    const element = document.getElementById('rocDateRange');
    if (!element || !start || !end) return;
    const format = (value) => value.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    element.textContent = `${format(start)} - ${format(end)}`;
}

function filterByRange(items, timeKeys, start, end) {
    if (!Array.isArray(items) || !start || !end) return [];
    return items.filter(item => {
        const dateValue = getItemDate(item, timeKeys);
        if (!dateValue) return false;
        return dateValue >= start && dateValue <= end;
    });
}

function getItemDate(item, keys) {
    for (const key of keys) {
        const value = item[key];
        if (!value) continue;
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date;
        }
    }
    return null;
}

function getDriverTotals(entries, fallback, rangeDays) {
    if (Array.isArray(entries) && entries.length > 0) {
        const totals = {};
        entries.forEach(item => {
            const title = item.Title || item.title || 'Unknown';
            const count = item.IncidentCount ?? item.count ?? 0;
            totals[title] = (totals[title] || 0) + count;
        });
        return Object.entries(totals)
            .map(([title, count]) => ({ title, count }))
            .sort((a, b) => b.count - a.count);
    }

    if (fallback && Array.isArray(fallback.data)) {
        const ratio = Math.min(1, rangeDays / 30);
        return fallback.data.map(item => ({
            title: item.Title || item.title || 'Unknown',
            count: Math.round((item.IncidentCount ?? item.count ?? 0) * ratio)
        })).sort((a, b) => b.count - a.count);
    }

    return [];
}

function scaleCount(value, rangeDays, baseDays = 30) {
    const ratio = Math.min(1, rangeDays / baseDays);
    return Math.round(value * ratio);
}

function getAgeBucketCounts(details, fallbackBuckets) {
    if (Array.isArray(details) && details.length > 0) {
        const counts = {};
        details.forEach(item => {
            const bucket = item.AgeBucket || item.ageBucket || 'Unknown';
            counts[bucket] = (counts[bucket] || 0) + 1;
        });
        const ordered = ['0-7 Days', '8-30 Days', '30+ Days'];
        return ordered.map(bucket => ({
            category: bucket,
            count: counts[bucket] || 0
        })).filter(item => item.count > 0);
    }

    if (Array.isArray(fallbackBuckets)) {
        return fallbackBuckets.map(item => ({
            category: item.AgeBucket || item.ageBucket || 'Unknown',
            count: item.IncidentCount ?? item.count ?? 0
        }));
    }

    return [];
}

// Utility Functions

function getColorClass(label, type) {
    const normalized = label.toLowerCase();
    
    if (type === 'severity') {
        if (normalized === 'critical') return 'severity-critical';
        if (normalized === 'high') return 'severity-high';
        if (normalized === 'medium') return 'severity-medium';
        if (normalized === 'low') return 'severity-low';
        if (normalized === 'informational') return 'severity-informational';
    }
    
    if (type === 'status') {
        if (normalized === 'new') return 'status-new';
        if (normalized === 'active') return 'status-active';
        if (normalized === 'investigating') return 'status-investigating';
        if (normalized === 'closed') return 'status-closed';
    }

    if (type === 'aging') {
        if (normalized.includes('0-7')) return 'severity-high';
        if (normalized.includes('8-30')) return 'severity-medium';
        if (normalized.includes('30+')) return 'severity-low';
    }
    
    return 'severity-informational';
}

function createEmptyState(message, type = 'default') {
    const stateClass = type === 'success' ? 'empty-state success-state' : 'empty-state';
    const messages = {
        'success': '<p class="empty-state-message">✓ ' + message + '</p>',
        'placeholder': '<p class="empty-state-message">' + message + '</p><p class="empty-state-detail">This metric will be available in a future release</p>',
        'default': '<p class="empty-state-message">' + message + '</p>'
    };
    
    return `<div class="${stateClass}">${messages[type] || messages.default}</div>`;
}

function formatMinutes(minutes) {
    if (minutes === null || minutes === undefined) return '—';
    
    if (minutes < 60) {
        return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined) return '—';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatCompactNumber(num) {
    if (num === null || num === undefined) return '—';
    if (num >= 1000) {
        return `${(num / 1000).toFixed(2)}K`;
    }
    return formatNumber(num);
}

function formatCurrency(value) {
    if (value === null || value === undefined) return '—';
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });
}

function getCssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getScalarMetricValue(data, keys) {
    if (!data || data.status === 'not_implemented') return null;

    if (typeof data.data === 'number') {
        return data.data;
    }

    if (data.data && !Array.isArray(data.data)) {
        for (const key of keys) {
            if (data.data[key] !== undefined && data.data[key] !== null) {
                return data.data[key];
            }
        }
    }

    if (Array.isArray(data.data) && data.data.length > 0) {
        const row = data.data[0];
        for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null) {
                return row[key];
            }
        }
    }

    return null;
}

function renderRocDonutChart(container, items, label, options = {}) {
    const total = items.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) {
        container.innerHTML = createEmptyState('No data available');
        return;
    }

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const fallbackColor = getCssVar('--accent-primary', '#6366f1');
    const segments = items.map(item => {
        const length = (item.count / total) * circumference;
        const segment = `
            <circle
                class="roc-donut-segment"
                cx="60" cy="60" r="${radius}"
                stroke="${item.color || fallbackColor}"
                stroke-dasharray="${length} ${circumference - length}"
                stroke-dashoffset="${-offset}"
            />
        `;
        offset += length;
        return segment;
    }).join('');

    const legend = items.map(item => {
        const percent = total > 0 ? (item.count / total) * 100 : 0;
        return `
            <div class="roc-donut-legend-item">
                <span class="roc-donut-legend-dot" style="background: ${item.color || fallbackColor}"></span>
                <span>${item.label}</span>
                <span>${formatNumber(item.count)} (${formatNumber(percent, 2)}%)</span>
            </div>
        `;
    }).join('');

    const centerValue = options.centerValue || formatNumber(total);
    const centerLabel = options.centerLabel || label;

    container.innerHTML = `
        <div class="roc-donut-wrapper">
            <div class="roc-donut">
                <svg viewBox="0 0 120 120">
                    <circle class="roc-donut-hole" cx="60" cy="60" r="30"></circle>
                    <circle class="roc-donut-ring" cx="60" cy="60" r="${radius}"></circle>
                    ${segments}
                </svg>
                <div class="roc-donut-center">
                    <span class="roc-donut-value">${centerValue}</span>
                    <span class="roc-donut-label">${centerLabel}</span>
                </div>
            </div>
            <div class="roc-donut-legend">
                ${legend}
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateTimestamp(isoString) {
    if (!isoString) {
        document.getElementById('generatedAt').textContent = '—';
        document.getElementById('lastUpdated').textContent = 'Last updated: —';
        return;
    }
    
    const date = new Date(isoString);
    const formatted = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    });
    
    document.getElementById('generatedAt').textContent = formatted;
    document.getElementById('lastUpdated').textContent = `Last updated: ${formatted}`;
}

function showError(message) {
    console.error(message);
    // Could add a toast notification here
}

function showEmptyState(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// Auto-refresh
function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    refreshTimer = setInterval(() => {
        loadAllData();
    }, CONFIG.refreshInterval);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
});

// Customer Dashboard Extended Rendering Functions

function renderCustomerIncidentTrend(data) {
    const container = document.getElementById('customerIncidentTrend');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No incident trend data available');
        return;
    }
    
    renderDailyTrendChart(container, data.data, 'Incidents Created', 'customer-trend-created');
}

function renderCustomerClosureTrend(data) {
    const container = document.getElementById('customerClosureTrend');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No closure trend data available');
        return;
    }
    
    renderDailyTrendChart(container, data.data, 'Incidents Closed', 'customer-trend-closed');
}

function renderDailyTrendChart(container, data, label, chartClass) {
    const maxValue = Math.max(...data.map(d => d.count || 0), 1);
    const barWidth = 100 / data.length;
    
    const html = `
        <div class="daily-trend-chart ${chartClass}">
            <div class="trend-bars">
                ${data.map(item => {
                    const height = maxValue > 0 ? ((item.count || 0) / maxValue) * 100 : 0;
                    const date = new Date(item.date);
                    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    
                    return `
                        <div class="trend-bar-group" style="width: ${barWidth}%">
                            <div class="trend-bar-container">
                                <div class="trend-bar" style="height: ${height}%">
                                    <span class="trend-bar-value">${item.count}</span>
                                </div>
                            </div>
                            <div class="trend-bar-label">
                                <div class="trend-day">${dayLabel}</div>
                                <div class="trend-date">${dateLabel}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="trend-label">${label}</div>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderCustomerTimings(data) {
    const mttaMedianEl = document.getElementById('customerMttaMedian');
    const mttaP95El = document.getElementById('customerMttaP95');
    const mttrMedianEl = document.getElementById('customerMttrMedian');
    const mttrP95El = document.getElementById('customerMttrP95');
    
    if (!data || data.status === 'not_implemented' || !data.data) {
        if (mttaMedianEl) mttaMedianEl.textContent = '—';
        if (mttaP95El) mttaP95El.textContent = '—';
        if (mttrMedianEl) mttrMedianEl.textContent = '—';
        if (mttrP95El) mttrP95El.textContent = '—';
        return;
    }
    
    const mtta = data.data.mtta || {};
    const mttr = data.data.mttr || {};
    
    if (mttaMedianEl) mttaMedianEl.textContent = formatMinutes(mtta.medianMinutes);
    if (mttaP95El) mttaP95El.textContent = formatMinutes(mtta.p95Minutes);
    if (mttrMedianEl) mttrMedianEl.textContent = formatMinutes(mttr.medianMinutes);
    if (mttrP95El) mttrP95El.textContent = formatMinutes(mttr.p95Minutes);
}

function renderCustomerTopEntities(data) {
    const container = document.getElementById('customerTopEntities');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No entity data available');
        return;
    }
    
    const html = `
        <table class="customer-table">
            <thead>
                <tr>
                    <th>Entity</th>
                    <th>Type</th>
                    <th>Incidents</th>
                </tr>
            </thead>
            <tbody>
                ${data.data.map(entity => `
                    <tr>
                        <td>${escapeHtml(entity.name)}</td>
                        <td><span class="entity-type">${entity.type}</span></td>
                        <td>${entity.incidentCount}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function renderCustomerIncidentAging(data) {
    const container = document.getElementById('customerIncidentAging');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No aging data available');
        return;
    }
    
    const items = data.data;
    const maxValue = Math.max(...items.map(item => item.count || 0));
    
    const html = `
        <div class="bar-chart customer-aging-chart">
            ${items.map(item => {
                const label = item.bucket || 'Unknown';
                const count = item.count || 0;
                const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;
                
                return `
                    <div class="bar-item">
                        <div class="bar-label">${label}</div>
                        <div class="bar-track">
                            <div class="bar-fill severity-informational" style="width: ${percentage}%">
                                <span class="bar-value">${count}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Customer Dashboard Ultimate Metrics
function renderCustomerSeverityTrend(data) {
    const container = document.getElementById('customerSeverityTrend');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No severity trend data available');
        return;
    }
    
    const items = data.data;
    const maxTotal = Math.max(...items.map(item => (item.High || 0) + (item.Medium || 0) + (item.Low || 0)));
    
    const html = `
        <div class="severity-trend-chart">
            <div class="severity-legend">
                <span class="legend-item"><span class="legend-dot severity-high"></span> High</span>
                <span class="legend-item"><span class="legend-dot severity-medium"></span> Medium</span>
                <span class="legend-item"><span class="legend-dot severity-low"></span> Low</span>
            </div>
            <div class="stacked-bars">
                ${items.map(item => {
                    const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }) : '';
                    const high = item.High || 0;
                    const medium = item.Medium || 0;
                    const low = item.Low || 0;
                    const total = high + medium + low;
                    const heightPercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                    const highPct = total > 0 ? (high / total) * 100 : 0;
                    const mediumPct = total > 0 ? (medium / total) * 100 : 0;
                    const lowPct = total > 0 ? (low / total) * 100 : 0;
                    
                    return `
                        <div class="stacked-bar-column">
                            <div class="stacked-bar" style="height: ${heightPercent}%">
                                <div class="stacked-segment severity-high" style="height: ${highPct}%" title="High: ${high}"></div>
                                <div class="stacked-segment severity-medium" style="height: ${mediumPct}%" title="Medium: ${medium}"></div>
                                <div class="stacked-segment severity-low" style="height: ${lowPct}%" title="Low: ${low}"></div>
                            </div>
                            <div class="stacked-bar-label">${date}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderCustomerAlertToIncidentRate(data) {
    const container = document.getElementById('customerAlertToIncidentRate');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No alert-to-incident rate data available');
        return;
    }
    
    const items = data.data;
    const maxRate = Math.max(...items.map(item => item.rate || 0));
    const avgRate = items.reduce((sum, item) => sum + (item.rate || 0), 0) / items.length;
    
    const html = `
        <div class="rate-trend-chart">
            <div class="rate-summary">
                <span class="rate-avg">7-Day Avg: <strong>${(avgRate * 100).toFixed(1)}%</strong></span>
            </div>
            <div class="rate-bars">
                ${items.map(item => {
                    const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }) : '';
                    const rate = item.rate || 0;
                    const heightPercent = maxRate > 0 ? (rate / maxRate) * 100 : 0;
                    
                    return `
                        <div class="rate-bar-column">
                            <div class="rate-bar-value">${(rate * 100).toFixed(0)}%</div>
                            <div class="rate-bar-track">
                                <div class="rate-bar-fill" style="height: ${heightPercent}%"></div>
                            </div>
                            <div class="rate-bar-label">${date}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderAlertToIncidentRatio(data) {
    const container = document.getElementById('alertToIncidentRatio');

    if (!container) return;

    if (!data || data.status === 'not_implemented' || !data.data) {
        container.innerHTML = createEmptyState('No alert-to-incident ratio data available');
        return;
    }

    const payload = Array.isArray(data.data) ? data.data[0] : data.data;
    const alerts = payload.alerts ?? payload.totalAlerts ?? payload.alertCount ?? payload.alertsCount ?? payload.Alerts ?? payload.AlertCount ?? null;
    const incidents = payload.incidents ?? payload.totalIncidents ?? payload.incidentCount ?? payload.incidentsCount ?? payload.Incidents ?? payload.IncidentCount ?? null;
    let ratio = payload.ratio ?? payload.conversionRate ?? payload.alertToIncidentRatio ?? null;

    if ((ratio === null || ratio === undefined) && alerts !== null && incidents !== null) {
        ratio = alerts > 0 ? incidents / alerts : 0;
    }

    const priorRatio = payload.priorRatio ?? payload.previousRatio ?? payload.baselineRatio ?? null;
    const delta = ratio !== null && priorRatio !== null ? ratio - priorRatio : null;
    const deltaText = delta === null
        ? (alerts !== null && incidents ? `1 incident per ${formatNumber(Math.round(alerts / incidents))} alerts` : '—')
        : `${delta >= 0 ? 'Up' : 'Down'} ${formatNumber(Math.abs(delta) * 100, 1)} pts vs prior`;
    const deltaClass = delta === null ? 'muted' : (delta >= 0 ? 'positive' : 'negative');
    const ratioDisplay = ratio === null ? '—' : `${formatNumber(ratio * 100, 1)}%`;

    const html = `
        <div class="conversion-summary">
            <div class="metrics-group conversion-metrics">
                <div class="metric conversion-primary">
                    <span class="metric-label">Conversion</span>
                    <span class="metric-value conversion-value">${ratioDisplay}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Alerts</span>
                    <span class="metric-value">${alerts === null ? '—' : formatNumber(alerts)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Incidents</span>
                    <span class="metric-value">${incidents === null ? '—' : formatNumber(incidents)}</span>
                </div>
            </div>
            <div class="conversion-footnote ${deltaClass}">${deltaText}</div>
        </div>
    `;

    container.innerHTML = html;
}

function renderAlertEscalationRate(data) {
    const container = document.getElementById('alertEscalationRate');

    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No alert escalation rate data available');
        return;
    }

    const items = data.data;
    const maxRate = Math.max(...items.map(item => item.rate || 0));
    const avgRate = items.reduce((sum, item) => sum + (item.rate || 0), 0) / items.length;

    const html = `
        <div class="rate-trend-chart">
            <div class="rate-summary">
                <span class="rate-avg">7-Day Avg: <strong>${(avgRate * 100).toFixed(1)}%</strong></span>
            </div>
            <div class="rate-bars">
                ${items.map(item => {
                    const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }) : '';
                    const rate = item.rate || 0;
                    const heightPercent = maxRate > 0 ? (rate / maxRate) * 100 : 0;

                    return `
                        <div class="rate-bar-column">
                            <div class="rate-bar-value">${(rate * 100).toFixed(0)}%</div>
                            <div class="rate-bar-track">
                                <div class="rate-bar-fill" style="height: ${heightPercent}%"></div>
                            </div>
                            <div class="rate-bar-label">${date}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderFalsePositiveRate(data) {
    const container = document.getElementById('falsePositiveRate');

    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No false positive rate data available');
        return;
    }

    const items = data.data;
    const maxRate = Math.max(...items.map(item => item.rate || 0));
    const avgRate = items.reduce((sum, item) => sum + (item.rate || 0), 0) / items.length;

    const html = `
        <div class="rate-trend-chart">
            <div class="rate-summary">
                <span class="rate-avg">7-Day Avg: <strong>${(avgRate * 100).toFixed(1)}%</strong></span>
            </div>
            <div class="rate-bars">
                ${items.map(item => {
                    const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }) : '';
                    const rate = item.rate || 0;
                    const heightPercent = maxRate > 0 ? (rate / maxRate) * 100 : 0;

                    return `
                        <div class="rate-bar-column">
                            <div class="rate-bar-value">${(rate * 100).toFixed(0)}%</div>
                            <div class="rate-bar-track">
                                <div class="rate-bar-fill" style="height: ${heightPercent}%"></div>
                            </div>
                            <div class="rate-bar-label">${date}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderBenignPositiveRate(data) {
    const container = document.getElementById('benignPositiveRate');

    if (!container) return;

    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No benign positive rate data available');
        return;
    }

    const items = data.data;
    const maxRate = Math.max(...items.map(item => item.rate || 0));
    const avgRate = items.reduce((sum, item) => sum + (item.rate || 0), 0) / items.length;

    const html = `
        <div class="rate-trend-chart">
            <div class="rate-summary">
                <span class="rate-avg">7-Day Avg: <strong>${(avgRate * 100).toFixed(1)}%</strong></span>
            </div>
            <div class="rate-bars">
                ${items.map(item => {
                    const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }) : '';
                    const rate = item.rate || 0;
                    const heightPercent = maxRate > 0 ? (rate / maxRate) * 100 : 0;

                    return `
                        <div class="rate-bar-column">
                            <div class="rate-bar-value">${(rate * 100).toFixed(0)}%</div>
                            <div class="rate-bar-track">
                                <div class="rate-bar-fill" style="height: ${heightPercent}%"></div>
                            </div>
                            <div class="rate-bar-label">${date}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderTruePositiveRate(data) {
    const container = document.getElementById('truePositiveRate');

    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No true positive rate data available');
        return;
    }

    const items = data.data;
    const maxRate = Math.max(...items.map(item => item.rate || 0));
    const avgRate = items.reduce((sum, item) => sum + (item.rate || 0), 0) / items.length;

    const html = `
        <div class="rate-trend-chart">
            <div class="rate-summary">
                <span class="rate-avg">7-Day Avg: <strong>${(avgRate * 100).toFixed(1)}%</strong></span>
            </div>
            <div class="rate-bars">
                ${items.map(item => {
                    const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }) : '';
                    const rate = item.rate || 0;
                    const heightPercent = maxRate > 0 ? (rate / maxRate) * 100 : 0;

                    return `
                        <div class="rate-bar-column">
                            <div class="rate-bar-value">${(rate * 100).toFixed(0)}%</div>
                            <div class="rate-bar-track">
                                <div class="rate-bar-fill" style="height: ${heightPercent}%"></div>
                            </div>
                            <div class="rate-bar-label">${date}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderFalseNegativeRate(data) {
    const container = document.getElementById('falseNegativeRate');

    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No false negative rate data available');
        return;
    }

    const items = data.data;
    const maxRate = Math.max(...items.map(item => item.rate || 0));
    const avgRate = items.reduce((sum, item) => sum + (item.rate || 0), 0) / items.length;

    const html = `
        <div class="rate-trend-chart">
            <div class="rate-summary">
                <span class="rate-avg">7-Day Avg: <strong>${(avgRate * 100).toFixed(1)}%</strong></span>
            </div>
            <div class="rate-bars">
                ${items.map(item => {
                    const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }) : '';
                    const rate = item.rate || 0;
                    const heightPercent = maxRate > 0 ? (rate / maxRate) * 100 : 0;

                    return `
                        <div class="rate-bar-column">
                            <div class="rate-bar-value">${(rate * 100).toFixed(0)}%</div>
                            <div class="rate-bar-track">
                                <div class="rate-bar-fill" style="height: ${heightPercent}%"></div>
                            </div>
                            <div class="rate-bar-label">${date}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderCustomerTimeBuckets(data) {
    const container = document.getElementById('customerIncidentTimeBuckets');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No time bucket data available');
        return;
    }
    
    const items = data.data;
    const maxValue = Math.max(...items.map(item => item.count || 0));
    
    // Color coding based on bucket type
    const getBucketColor = (bucket) => {
        if (bucket.includes('<1h')) return 'severity-low';
        if (bucket.includes('1-4h')) return 'severity-medium';
        if (bucket.includes('4-24h')) return 'severity-high';
        return 'severity-critical';
    };
    
    const html = `
        <div class="time-buckets-chart">
            ${items.map(item => {
                const label = item.bucket || 'Unknown';
                const count = item.count || 0;
                const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;
                const colorClass = getBucketColor(label);
                
                return `
                    <div class="bucket-item">
                        <div class="bucket-label">${label}</div>
                        <div class="bucket-track">
                            <div class="bucket-fill ${colorClass}" style="width: ${percentage}%">
                                <span class="bucket-value">${count}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

function renderCustomerTopAlertRules(data) {
    const container = document.getElementById('customerTopAlertRules');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No alert rule data available');
        return;
    }
    
    const html = `
        <table class="customer-table">
            <thead>
                <tr>
                    <th>Alert Rule</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                ${data.data.map(rule => `
                    <tr>
                        <td class="alert-rule-name">${escapeHtml(rule.alertName)}</td>
                        <td class="alert-rule-count">${rule.count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function renderAlertNoiseTrend(data) {
    const container = document.getElementById('alertNoiseTrend');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No alert noise data available');
        return;
    }
    
    const items = data.data;
    const maxValue = Math.max(...items.map(item => item.alertCount || 0));
    const avgValue = items.reduce((sum, item) => sum + (item.alertCount || 0), 0) / items.length;
    
    const html = `
        <div class="noise-trend-chart de-emphasized">
            <div class="noise-summary">
                <span class="noise-avg">7-Day Avg: <strong>${Math.round(avgValue)}</strong> alerts/day</span>
            </div>
            <div class="noise-bars">
                ${items.map(item => {
                    const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }) : '';
                    const count = item.alertCount || 0;
                    const heightPercent = maxValue > 0 ? (count / maxValue) * 100 : 0;
                    
                    return `
                        <div class="noise-bar-column">
                            <div class="noise-bar-value">${count}</div>
                            <div class="noise-bar-track">
                                <div class="noise-bar-fill" style="height: ${heightPercent}%"></div>
                            </div>
                            <div class="noise-bar-label">${date}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderAlertVolumeComparison(currentData, baselineData) {
    const container = document.getElementById('alertVolumeBaseline');
    if (!container) return;

    const baselineItems = Array.isArray(baselineData?.data) ? baselineData.data : [];
    const currentItems = Array.isArray(currentData?.data) ? currentData.data : [];

    if (baselineItems.length === 0 && currentItems.length === 0) {
        container.innerHTML = createEmptyState('No alert volume data available');
        return;
    }

    if (baselineItems.length === 0) {
        container.innerHTML = createEmptyState('No baseline alert volume available');
        return;
    }

    const baselineAvg = baselineItems.reduce((sum, item) => sum + (item.alertCount || 0), 0) / baselineItems.length;
    const currentAvg = currentItems.length
        ? currentItems.reduce((sum, item) => sum + (item.alertCount || 0), 0) / currentItems.length
        : null;

    const maxValue = Math.max(baselineAvg, currentAvg || 0);
    const baselineWidth = maxValue > 0 ? (baselineAvg / maxValue) * 100 : 0;
    const currentWidth = maxValue > 0 ? ((currentAvg || 0) / maxValue) * 100 : 0;

    const delta = currentAvg === null ? null : currentAvg - baselineAvg;
    const percentChange = delta === null || baselineAvg === 0 ? null : (delta / baselineAvg) * 100;
    const deltaClass = delta === null ? 'neutral' : (delta < 0 ? 'improved' : (delta > 0 ? 'worse' : 'neutral'));
    const deltaPill = percentChange === null ? '—' : `${delta < 0 ? '↓' : '↑'} ${Math.abs(percentChange).toFixed(1)}%`;
    const deltaText = delta === null
        ? 'Current data unavailable'
        : `${delta < 0 ? 'Reduction' : 'Increase'} of ${formatNumber(Math.abs(Math.round(delta)))} alerts/day`;

    const baselineLabel = `Pre-tuning (${baselineItems.length}d avg)`;
    const currentLabel = currentItems.length ? `Current (${currentItems.length}d avg)` : 'Current (no data)';

    const html = `
        <div class="alert-volume-compare">
            <div class="alert-volume-summary">
                <div class="volume-block baseline">
                    <span class="volume-label">${baselineLabel}</span>
                    <span class="volume-value">${formatNumber(Math.round(baselineAvg))}</span>
                </div>
                <div class="volume-block current">
                    <span class="volume-label">${currentLabel}</span>
                    <span class="volume-value">${currentAvg === null ? '—' : formatNumber(Math.round(currentAvg))}</span>
                </div>
            </div>
            <div class="volume-bars">
                <div class="volume-bar">
                    <span class="volume-bar-label">Baseline</span>
                    <div class="volume-bar-track">
                        <div class="volume-bar-fill baseline" style="width: ${baselineWidth}%"></div>
                    </div>
                </div>
                <div class="volume-bar">
                    <span class="volume-bar-label">Current</span>
                    <div class="volume-bar-track">
                        <div class="volume-bar-fill current" style="width: ${currentWidth}%"></div>
                    </div>
                </div>
            </div>
            <div class="volume-delta ${deltaClass}">
                <span class="delta-pill">${deltaPill}</span>
                <span class="delta-text">${deltaText}</span>
            </div>
        </div>
    `;

    container.innerHTML = html;
}
