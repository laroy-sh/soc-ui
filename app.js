// Configuration
const CONFIG = {
    dataPath: './soc_demo_dataset_ultimate/',
    refreshInterval: 60000 // 1 minute
};

// State
let currentDashboard = 'analyst';
let refreshTimer = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
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
            incidentInflow,
            incidentClosureRate,
            ruleFiringVolume,
            ingestionVolume,
            zeroIngestion,
            customerIncidents,
            repeatedDetections,
            rocRiskScore,
            rocRiskExposure,
            rocIncidentCount,
            rocExecutiveActions,
            rocAvgHighRisk,
            rocAttackSurfaceCoverage,
            rocIncidentAgeBuckets,
            rocIncidentAgingDetails,
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
            alertNoiseTrend
        ] = await Promise.all([
            fetchMetric('openIncidentsBySeverity.latest.json'),
            fetchMetric('openIncidentsByStatus.latest.json'),
            fetchMetric('newIncidents.latest.json'),
            fetchMetric('activeAlertsBySeverity.latest.json'),
            fetchMetric('incidentAging.latest.json'),
            fetchMetric('topEntities.latest.json'),
            fetchMetric('incidentTimings.latest.json'),
            fetchMetric('incidentInflow.24h.json'),
            fetchMetric('incidentClosureRate.24h.json'),
            fetchMetric('ruleFiringVolume.24h.json'),
            fetchMetric('ingestionVolumeByTable.24h.json'),
            fetchMetric('zeroIngestionTables.latest.json'),
            fetchMetric('customer_incidentsBySeverity.latest.json'),
            fetchMetric('repeatedDetections.7d.json'),
            fetchMetric('riskScore.30d.json'),
            fetchMetric('riskExposure.30d.json'),
            fetchMetric('incidentCountByTitle.30d.json'),
            fetchMetric('executiveActions.30d.json'),
            fetchMetric('avgHighRisk.30d.json'),
            fetchMetric('attackSurfaceCoverage.latest.json'),
            fetchMetric('closedIncidentAgeBuckets.30d.json'),
            fetchMetric('closedIncidentAgingDetails.30d.json'),
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
            fetchMetric('alertNoiseTrend.7d.json')
        ]);
        
        // Render SOC Analyst Dashboard
        renderNewIncidents(newIncidents);
        renderBarChart('openIncidentsBySeverity', openIncidentsBySeverity, 'severity');
        renderBarChart('openIncidentsByStatus', openIncidentsByStatus, 'status');
        renderBarChart('activeAlertsBySeverity', activeAlerts, 'severity');
        renderIncidentAging(incidentAging);
        renderTopEntities(topEntities);
        
        // Render SOC Lead Dashboard
        renderIncidentTimings(incidentTimings);
        renderLineChart('incidentInflow', incidentInflow);
        renderLineChart('incidentClosureRate', incidentClosureRate);
        renderRuleFiringVolume(ruleFiringVolume);
        
        // Render Telemetry Health Dashboard
        renderIngestionVolume(ingestionVolume);
        renderZeroIngestionTables(zeroIngestion);
        
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
        renderAlertNoiseTrend(alertNoiseTrend);
        
        // Render ROC Dashboard
        renderRepeatedDetections(repeatedDetections);
        renderRiskScore(rocRiskScore);
        renderRiskExposure(rocRiskExposure);
        renderIncidentCountByTitle(rocIncidentCount);
        renderExecutiveActions(rocExecutiveActions);
        renderAvgHighRisk(rocAvgHighRisk);
        renderAttackSurfaceCoverage(rocAttackSurfaceCoverage);
        renderIncidentAgeBuckets(rocIncidentAgeBuckets);
        renderIncidentAgingDetails(rocIncidentAgingDetails);
        renderWorkloadBySeverity(rocExecutiveActions);
        renderTopHighVolumeRisks(rocIncidentCount);
        renderResolutionEfficiency(rocIncidentAgeBuckets);
        renderAvgResolveAge(rocIncidentAgingDetails);
        renderResolutionSpeed(rocIncidentAgingDetails);
        renderTargetOutliers(rocIncidentAgingDetails);
        
        // Update last updated timestamp
        updateTimestamp(openIncidentsBySeverity?.generatedAt);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load dashboard data');
    }
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

function renderIncidentTimings(data) {
    if (!data || data.status === 'not_implemented' || !data.data) {
        document.getElementById('mttaMedian').textContent = '—';
        document.getElementById('mttaP95').textContent = '—';
        document.getElementById('mttrMedian').textContent = '—';
        document.getElementById('mttrP95').textContent = '—';
        return;
    }
    
    const mtta = data.data.mtta || {};
    const mttr = data.data.mttr || {};
    
    document.getElementById('mttaMedian').textContent = formatMinutes(mtta.medianMinutes);
    document.getElementById('mttaP95').textContent = formatMinutes(mtta.p95Minutes);
    document.getElementById('mttrMedian').textContent = formatMinutes(mttr.medianMinutes);
    document.getElementById('mttrP95').textContent = formatMinutes(mttr.p95Minutes);
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

function renderIngestionVolume(data) {
    const container = document.getElementById('ingestionVolumeByTable');
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No ingestion data available');
        return;
    }
    
    const html = `
        <table>
            <thead>
                <tr>
                    <th>Table</th>
                    <th>Ingested (GB)</th>
                </tr>
            </thead>
            <tbody>
                ${data.data.map(item => `
                    <tr>
                        <td>${escapeHtml(item.table || item.tableName || 'Unknown')}</td>
                        <td>${formatNumber(item.ingestedGB || (item.sizeBytes ? item.sizeBytes / (1024 * 1024 * 1024) : 0), 2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
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
    
    if (!data || data.status === 'not_implemented' || !data.data || data.data.length === 0) {
        container.innerHTML = createEmptyState('No repeated detections found');
        return;
    }
    
    const html = `
        <table>
            <thead>
                <tr>
                    <th>Alert Name</th>
                    <th>Detections (7d)</th>
                </tr>
            </thead>
            <tbody>
                ${data.data.map(detection => `
                    <tr>
                        <td>${escapeHtml(detection.alertName || 'Unknown')}</td>
                        <td>${detection.count || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function renderRiskScore(data) {
    const element = document.getElementById('rocRiskScore');
    if (!element) return;
    const value = getScalarMetricValue(data, ['RiskScore', 'riskScore']);
    element.textContent = value === null ? '—' : formatNumber(value);
}

function renderAvgHighRisk(data) {
    const element = document.getElementById('rocAvgHighRisk');
    if (!element) return;
    const value = getScalarMetricValue(data, ['AvgMTTR', 'avgMTTR']);
    element.textContent = value === null ? '—' : `${formatNumber(value, 1)}d`;
}

function renderAttackSurfaceCoverage(data) {
    const element = document.getElementById('rocAttackSurfaceCoverage');
    if (!element) return;
    const value = getScalarMetricValue(data, ['CoveragePercent', 'coveragePercent']);
    element.textContent = value === null ? '—' : `${formatNumber(value, 1)}%`;
}

function renderRiskExposure(data) {
    const container = document.getElementById('rocRiskExposure');
    if (!container) return;

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
        container.innerHTML = createEmptyState('No risk exposure data available');
        return;
    }

    const points = data.data.map(row => {
        const time = row.TimeGenerated || row.time || row.timestamp;
        const count = row.DailyRiskScore ?? row.dailyRiskScore ?? row.RiskScore ?? row.count ?? row.value;
        if (!time || count === null || count === undefined) return null;
        return { time, count };
    }).filter(Boolean);

    if (points.length === 0) {
        container.innerHTML = createEmptyState('No risk exposure data available');
        return;
    }

    renderLineChart('rocRiskExposure', { data: points, labelMode: 'date' });
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

function renderExecutiveActions(data) {
    const container = document.getElementById('rocExecutiveActions');

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
        container.innerHTML = createEmptyState('No executive actions available');
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Age (Days)</th>
                    <th>Severity</th>
                    <th>Owner</th>
                    <th>Risk</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.data.map(item => {
                    const age = item.Age ?? item.age ?? '—';
                    const category = escapeHtml(item.Category || item.category || '—');
                    const owner = escapeHtml(item.Owner || item.owner || '—');
                    const risk = escapeHtml(item.Risk || item.risk || '—');
                    const status = escapeHtml(item.Status || item.status || '—');
                    return `
                        <tr>
                            <td>${formatNumber(age)}</td>
                            <td>${category}</td>
                            <td>${owner}</td>
                            <td>${risk}</td>
                            <td>${status}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderIncidentAgeBuckets(data) {
    const container = document.getElementById('rocIncidentAgeBuckets');

    if (!container) return;

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
        container.innerHTML = createEmptyState('No closed incident aging data available');
        return;
    }

    const normalized = data.data.map(item => ({
        category: item.AgeBucket || item.ageBucket || 'Unknown',
        count: item.IncidentCount ?? item.count ?? 0
    }));

    renderBarChart('rocIncidentAgeBuckets', { data: normalized }, 'aging');
}

function renderIncidentAgingDetails(data) {
    const container = document.getElementById('rocIncidentAgingDetails');

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
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
                ${data.data.map(item => {
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

function renderWorkloadBySeverity(data) {
    const container = document.getElementById('rocWorkloadBySeverity');
    if (!container) return;

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
        container.innerHTML = createEmptyState('No workload data available');
        return;
    }

    const counts = data.data.reduce((acc, item) => {
        const category = (item.Category || item.category || 'Unknown').toString();
        const key = category.toLowerCase();
        if (key === 'critical') {
            acc.high = (acc.high || 0) + 1;
            return acc;
        }
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const items = [
        { label: 'Low', count: counts.low || 0, color: '#1f77b4' },
        { label: 'Medium', count: counts.medium || 0, color: '#ff7f0e' },
        { label: 'High', count: counts.high || 0, color: '#d62728' }
    ].filter(item => item.count > 0);

    renderRocDonutChart(container, items, 'Incidents');
}

function renderTopHighVolumeRisks(data) {
    const container = document.getElementById('rocHighVolumeRisks');
    if (!container) return;

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
        container.innerHTML = createEmptyState('No high-volume risk data available');
        return;
    }

    const items = data.data
        .map(item => ({
            category: item.Title || item.title || 'Unknown',
            count: item.IncidentCount ?? item.count ?? 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    renderBarChart('rocHighVolumeRisks', { data: items }, 'severity');
}

function renderResolutionEfficiency(data) {
    const container = document.getElementById('rocResolutionEfficiency');
    if (!container) return;

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
        container.innerHTML = createEmptyState('No resolution efficiency data available');
        return;
    }

    const items = data.data.map(item => {
        const label = item.AgeBucket || item.ageBucket || 'Unknown';
        let color = '#0078d4';
        const normalized = label.toLowerCase();
        if (normalized.includes('0-7')) color = '#107c10';
        if (normalized.includes('8-30')) color = '#f7630c';
        if (normalized.includes('30+')) color = '#e81123';
        return {
            label,
            count: item.IncidentCount ?? item.count ?? 0,
            color
        };
    });

    renderRocDonutChart(container, items, 'Incidents');
}

function renderAvgResolveAge(data) {
    const element = document.getElementById('rocAvgResolveAge');
    if (!element) return;

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
        element.textContent = '—';
        return;
    }

    const total = data.data.reduce((sum, item) => sum + (item.AgeDays ?? item.ageDays ?? 0), 0);
    const avg = total / data.data.length;
    element.textContent = Number.isFinite(avg) ? formatNumber(avg, 2) : '—';
}

function renderResolutionSpeed(data) {
    const container = document.getElementById('rocResolutionSpeed');
    if (!container) return;

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
        container.innerHTML = createEmptyState('No resolution speed data available');
        return;
    }

    const grouped = {};
    data.data.forEach(item => {
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

function renderTargetOutliers(data) {
    const container = document.getElementById('rocTargetOutliers');
    if (!container) return;

    if (!data || data.status === 'not_implemented' || !Array.isArray(data.data) || data.data.length === 0) {
        container.innerHTML = createEmptyState('No outliers available');
        return;
    }

    const outliers = data.data.filter(item => (item.AgeDays ?? item.ageDays ?? 0) > 2);

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

function renderPlaceholder(elementId, data) {
    const container = document.getElementById(elementId);
    
    if (!data || data.status === 'not_implemented') {
        container.innerHTML = createEmptyState(
            data?.message || 'Not implemented',
            'placeholder'
        );
    }
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

function renderRocDonutChart(container, items, label) {
    const total = items.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) {
        container.innerHTML = createEmptyState('No data available');
        return;
    }

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const segments = items.map(item => {
        const length = (item.count / total) * circumference;
        const segment = `
            <circle
                class="roc-donut-segment"
                cx="60" cy="60" r="${radius}"
                stroke="${item.color || '#0078d4'}"
                stroke-dasharray="${length} ${circumference - length}"
                stroke-dashoffset="${-offset}"
            />
        `;
        offset += length;
        return segment;
    }).join('');

    const legend = items.map(item => `
        <div class="roc-donut-legend-item">
            <span class="roc-donut-legend-dot" style="background: ${item.color || '#0078d4'}"></span>
            <span>${item.label}</span>
            <span>${formatNumber(item.count)}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="roc-donut-wrapper">
            <div class="roc-donut">
                <svg viewBox="0 0 120 120">
                    <circle class="roc-donut-hole" cx="60" cy="60" r="30"></circle>
                    <circle class="roc-donut-ring" cx="60" cy="60" r="${radius}"></circle>
                    ${segments}
                </svg>
                <div class="roc-donut-center">
                    <span class="roc-donut-value">${formatNumber(total)}</span>
                    <span class="roc-donut-label">${label}</span>
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
