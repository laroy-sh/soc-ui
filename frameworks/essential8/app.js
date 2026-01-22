/**
 * Essential Eight Dashboard - Interactive Demo
 * Simulates Power BI dashboard with live data visualization
 * 
 * ARCHITECTURE NOTE:
 * In production, this dashboard connects to Microsoft Sentinel via Power BI.
 * Data flows: Sentinel Watchlists → KQL Query → Power BI Import Mode → Dashboard
 * 
 * The controls and assessments are stored in Sentinel Watchlists and queried
 * using KQL (Kusto Query Language). See EssentialEight_Dashboard_Query.kql
 * for the actual query that powers this dashboard.
 */

// ===========================================
// Data Configuration (Simulating Sentinel Data)
// ===========================================

// Strategy name mapping for display (short names for chart labels)
const strategyShortNames = {
    "Application Control": "Application Control",
    "Patch Applications": "Patch Applications",
    "Configure Microsoft Office Macro Settings": "Office Macro Settings",
    "User Application Hardening": "App Hardening",
    "Restrict Administrative Privileges": "Admin Privileges",
    "Patch Operating Systems": "Patch OS",
    "Multi-factor Authentication": "MFA",
    "Regular Backups": "Regular Backups"
};

// Historical quarterly data for trend analysis
const historicalData = {
    quarters: ["Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026"],
    // Compliance scores per quarter
    complianceScores: [38, 50, 50, 63],
    // Effective controls per quarter
    effectiveControls: [3, 4, 4, 5],
    // Automated tests per quarter
    automatedTests: [2, 3, 3, 4],
    // Detailed history per control
    controlHistory: {
        "E8-ML1-01": { // Application Control
            statuses: ["Implemented", "Implemented", "Effective", "Effective"],
            dates: ["2025-04-15", "2025-07-20", "2025-10-10", "2026-01-15"]
        },
        "E8-ML1-02": { // Patch Applications
            statuses: ["Not Implemented", "Not Effective", "Not Effective", "Not Effective"],
            dates: ["2025-04-15", "2025-07-20", "2025-10-10", "2026-01-15"]
        },
        "E8-ML1-03": { // Office Macros
            statuses: ["Implemented", "Implemented", "Implemented", "Implemented"],
            dates: ["2025-04-15", "2025-07-20", "2025-10-10", "2026-01-15"]
        },
        "E8-ML1-04": { // App Hardening
            statuses: ["Not Effective", "Implemented", "Effective", "Effective"],
            dates: ["2025-04-15", "2025-07-20", "2025-10-10", "2026-01-15"]
        },
        "E8-ML1-05": { // Admin Privileges
            statuses: ["Effective", "Effective", "Effective", "Effective"],
            dates: ["2025-04-15", "2025-07-20", "2025-10-10", "2026-01-15"]
        },
        "E8-ML1-06": { // Patch OS
            statuses: ["Not Implemented", "Not Implemented", "Not Effective", "Not Effective"],
            dates: ["2025-04-15", "2025-07-20", "2025-10-10", "2026-01-15"]
        },
        "E8-ML1-07": { // MFA
            statuses: ["Implemented", "Effective", "Effective", "Effective"],
            dates: ["2025-04-15", "2025-07-20", "2025-10-10", "2026-01-15"]
        },
        "E8-ML1-08": { // Backups
            statuses: ["Not Implemented", "Not Implemented", "Not Implemented", "Not Implemented"],
            dates: ["2025-04-15", "2025-07-20", "2025-10-10", "2026-01-15"]
        }
    }
};

// Sentinel integration configuration (for demonstration)
const sentinelConfig = {
    workspaceName: "SecOps-Sentinel-Prod",
    subscriptionId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    resourceGroup: "rg-security-prod",
    watchlists: {
        controls: "EssentialEight_Controls",
        assessments: "EssentialEight_Assessment"
    },
    refreshInterval: "15 minutes",
    lastSync: new Date().toISOString(),
    queryFile: "EssentialEight_Dashboard_Query.kql"
};

const dashboardData = {
    controls: [
        {
            id: "E8-ML1-01",
            strategy: "Application Control",
            title: "Prevent Execution of Unapproved Code",
            description: "Restrict execution of executables to an approved set.",
            guidance: "Ensure AppLocker or WDAC is in enforcement mode.",
            status: "Effective",
            evidence: "Excellent",
            testType: "Automated",
            justification: "Policy enforcement verified via logs.",
            lastUpdated: "2026-01-15T10:00:00Z",
            assessor: "ServicePrincipal:Automation"
        },
        {
            id: "E8-ML1-02",
            strategy: "Patch Applications",
            title: "Patch High Risk Apps within 48h",
            description: "Patch vulnerabilities in high risk applications within 48 hours.",
            guidance: "Check update cadence for browsers, Office, PDF readers.",
            status: "Not Effective",
            evidence: "Good",
            testType: "Manual",
            justification: "Patching cycle is currently 72 hours.",
            lastUpdated: "2026-01-15T10:00:00Z",
            assessor: "User:Admin@example.com"
        },
        {
            id: "E8-ML1-03",
            strategy: "Configure Microsoft Office Macro Settings",
            title: "Block Macros from Internet",
            description: "Block macros in files originating from the internet.",
            guidance: "Verify GPO 'Block macros from running in Office files from the Internet'.",
            status: "Implemented",
            evidence: "Good",
            testType: "Automated",
            justification: "GPO confirmed active.",
            lastUpdated: "2026-01-15T10:00:00Z",
            assessor: "ServicePrincipal:Automation"
        },
        {
            id: "E8-ML1-04",
            strategy: "User Application Hardening",
            title: "Block Flash and Java",
            description: "Web browsers do not process Java or Flash content.",
            guidance: "Ensure plugins are disabled via policy.",
            status: "Effective",
            evidence: "Fair",
            testType: "Manual",
            justification: "Visual check of browser settings.",
            lastUpdated: "2026-01-15T10:00:00Z",
            assessor: "User:Admin@example.com"
        },
        {
            id: "E8-ML1-05",
            strategy: "Restrict Administrative Privileges",
            title: "Validate Admin Requests",
            description: "Requests for administrative privileges are validated.",
            guidance: "Check approval workflow for PIM or local admin requests.",
            status: "Effective",
            evidence: "Excellent",
            testType: "Automated",
            justification: "PIM audit logs confirm workflow.",
            lastUpdated: "2026-01-15T10:00:00Z",
            assessor: "ServicePrincipal:Automation"
        },
        {
            id: "E8-ML1-06",
            strategy: "Patch Operating Systems",
            title: "Patch OS within 48h",
            description: "Patch critical OS vulnerabilities within 48 hours.",
            guidance: "Query Windows Update compliance logs.",
            status: "Not Effective",
            evidence: "Poor",
            testType: "Manual",
            justification: "Pending audit.",
            lastUpdated: "2026-01-15T10:00:00Z",
            assessor: "User:Admin@example.com"
        },
        {
            id: "E8-ML1-07",
            strategy: "Multi-factor Authentication",
            title: "MFA for Remote Access",
            description: "MFA is enforced for all remote access users.",
            guidance: "Check Conditional Access policies for VPN/Remote connectivity.",
            status: "Effective",
            evidence: "Excellent",
            testType: "Automated",
            justification: "CA Policy matches requirement.",
            lastUpdated: "2026-01-15T10:00:00Z",
            assessor: "ServicePrincipal:Automation"
        },
        {
            id: "E8-ML1-08",
            strategy: "Regular Backups",
            title: "Backups of Important Data",
            description: "Daily backups of important data are performed.",
            guidance: "Verify backup success logs in Azure Backup or similar.",
            status: "Not Implemented",
            evidence: "Fair",
            testType: "Manual",
            justification: "Backup solution under review.",
            lastUpdated: "2026-01-15T10:00:00Z",
            assessor: "User:Admin@example.com"
        }
    ],
    insights: [
        {
            type: "critical",
            title: "Backup Solution Required",
            description: "Regular Backups control is not implemented. This is a high-priority gap that should be addressed immediately."
        },
        {
            type: "warning",
            title: "Patching SLA Breach",
            description: "Both Application and OS patching are exceeding the 48-hour SLA. Current cycle is 72 hours."
        },
        {
            type: "warning",
            title: "Poor Evidence Quality",
            description: "OS Patching has poor evidence quality. Recommend implementing automated compliance reporting."
        },
        {
            type: "success",
            title: "Strong MFA Implementation",
            description: "Multi-factor Authentication is effectively implemented with excellent evidence from Conditional Access policies."
        },
        {
            type: "success",
            title: "50% Automation Coverage",
            description: "Half of all controls are verified through automated testing, reducing manual audit burden."
        },
        {
            type: "success",
            title: "Application Control Active",
            description: "AppLocker/WDAC enforcement is active and verified, protecting against unauthorized code execution."
        }
    ]
};

// ===========================================
// Utility Functions
// ===========================================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getStatusClass(status) {
    const map = {
        "Effective": "effective",
        "Implemented": "implemented",
        "Not Effective": "not-effective",
        "Not Implemented": "not-implemented"
    };
    return map[status] || "not-implemented";
}

function getEvidenceClass(evidence) {
    return evidence.toLowerCase();
}

function getStatusIcon(status) {
    if (status === "Effective" || status === "Implemented") {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
        </svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`;
}

function getTestTypeIcon(type) {
    if (type === "Automated") {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>`;
}

function getInsightIcon(type) {
    const icons = {
        critical: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`,
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>`
    };
    return icons[type] || icons.warning;
}

// ===========================================
// Dashboard Initialization
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
    animateOnScroll();
});

function initializeDashboard() {
    updateLastUpdated();
    updateSentinelSync();
    renderKPIs();
    renderTrendChart();
    renderStrategyChart();
    renderStatusDonut();
    renderEvidenceBars();
    renderControlsTable();
    renderInsights();
}

// ===========================================
// KPI Rendering
// ===========================================

function renderKPIs() {
    const controls = dashboardData.controls;

    // Calculate metrics
    const effective = controls.filter(c => c.status === "Effective" || c.status === "Implemented").length;
    const automated = controls.filter(c => c.testType === "Automated").length;
    const actionRequired = controls.filter(c => c.status === "Not Effective" || c.status === "Not Implemented").length;
    const complianceScore = Math.round((effective / controls.length) * 100);

    // Update KPI values with animation
    animateValue('complianceScore', 0, complianceScore, 1000, '%');
    animateValue('effectiveCount', 0, effective, 800);
    animateValue('automatedCount', 0, automated, 800);
    animateValue('actionRequired', 0, actionRequired, 800);

    // Animate circular progress
    setTimeout(() => {
        const progress = document.getElementById('scoreProgress');
        if (progress) {
            const circumference = 2 * Math.PI * 15.9155;
            const offset = circumference - (complianceScore / 100) * circumference;
            progress.style.strokeDasharray = circumference;
            progress.style.strokeDashoffset = offset;
            progress.style.stroke = complianceScore >= 70 ? '#10b981' : complianceScore >= 50 ? '#f59e0b' : '#ef4444';
        }
    }, 100);
}

function animateValue(elementId, start, end, duration, suffix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        const current = Math.round(start + range * easeProgress);
        element.textContent = current + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function updateLastUpdated() {
    const element = document.getElementById('lastUpdated');
    if (element) {
        const now = new Date();
        element.textContent = now.toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function updateSentinelSync() {
    const element = document.getElementById('sentinelLastSync');
    if (element) {
        const now = new Date();
        element.textContent = now.toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// ===========================================
// Trend Chart
// ===========================================

function renderTrendChart(selectedQuarter = 3) {
    const container = document.getElementById('trendChart');
    if (!container) return;

    const quarters = historicalData.quarters;
    const scores = historicalData.complianceScores;
    const maxScore = 100;

    container.innerHTML = quarters.map((quarter, index) => {
        const score = scores[index];
        const heightPercent = (score / maxScore) * 100;
        const isCurrent = index === selectedQuarter;

        return `
            <div class="trend-bar-group">
                <div class="trend-bar-container">
                    <div class="trend-bar ${isCurrent ? 'current' : ''}" 
                         style="height: 0%;" 
                         data-height="${heightPercent}"
                         title="${quarter}: ${score}% compliance">
                        <span class="trend-bar-value">${score}%</span>
                    </div>
                </div>
                <span class="trend-bar-label">${quarter}</span>
            </div>
        `;
    }).join('');

    // Animate bars
    setTimeout(() => {
        container.querySelectorAll('.trend-bar').forEach(bar => {
            bar.style.height = bar.dataset.height + '%';
        });
    }, 300);
}

// ===========================================
// Strategy Chart
// ===========================================

function renderStrategyChart() {
    const container = document.getElementById('strategyChart');
    if (!container) return;

    const controls = dashboardData.controls;
    const strategies = [...new Set(controls.map(c => c.strategy))];

    const strategyColors = {
        "Application Control": "#6366f1",
        "Patch Applications": "#8b5cf6",
        "Configure Microsoft Office Macro Settings": "#a855f7",
        "User Application Hardening": "#d946ef",
        "Restrict Administrative Privileges": "#ec4899",
        "Patch Operating Systems": "#f43f5e",
        "Multi-factor Authentication": "#10b981",
        "Regular Backups": "#14b8a6"
    };

    container.innerHTML = strategies.map(strategy => {
        const control = controls.find(c => c.strategy === strategy);
        const isEffective = control.status === "Effective" || control.status === "Implemented";
        const fillWidth = isEffective ? "100" : (control.status === "Not Effective" ? "60" : "20");
        const color = strategyColors[strategy] || "#6366f1";

        return `
            <div class="strategy-bar">
                <span class="strategy-label" title="${strategy}">${strategyShortNames[strategy] || strategy}</span>
                <div class="strategy-track">
                    <div class="strategy-fill" style="width: 0%; background: ${color};" data-width="${fillWidth}">
                        <span>${control.status}</span>
                    </div>
                </div>
                <div class="strategy-status ${isEffective ? 'effective' : 'not-effective'}">
                    ${isEffective ?
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>` :
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
            }
                </div>
            </div>
        `;
    }).join('');

    // Animate bars
    setTimeout(() => {
        container.querySelectorAll('.strategy-fill').forEach(fill => {
            fill.style.width = fill.dataset.width + '%';
        });
    }, 300);
}

function truncate(str, length) {
    return str.length > length ? str.substring(0, length) + '...' : str;
}

// ===========================================
// Status Donut Chart
// ===========================================

function renderStatusDonut() {
    const container = document.getElementById('statusDonut');
    const legend = document.getElementById('statusLegend');
    if (!container || !legend) return;

    const controls = dashboardData.controls;
    const statusCounts = {
        "Effective": controls.filter(c => c.status === "Effective").length,
        "Implemented": controls.filter(c => c.status === "Implemented").length,
        "Not Effective": controls.filter(c => c.status === "Not Effective").length,
        "Not Implemented": controls.filter(c => c.status === "Not Implemented").length
    };

    const colors = {
        "Effective": "#10b981",
        "Implemented": "#3b82f6",
        "Not Effective": "#f59e0b",
        "Not Implemented": "#ef4444"
    };

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const svg = container.querySelector('svg');
    const radius = 35;
    const circumference = 2 * Math.PI * radius;

    let currentOffset = 0;
    const segments = [];

    Object.entries(statusCounts).forEach(([status, count]) => {
        if (count === 0) return;

        const percentage = count / total;
        const length = circumference * percentage;

        segments.push(`
            <circle 
                class="donut-segment"
                cx="50" cy="50" r="${radius}"
                stroke="${colors[status]}"
                stroke-dasharray="${length} ${circumference - length}"
                stroke-dashoffset="${-currentOffset}"
                style="animation: donutFadeIn 1s ease-out forwards; animation-delay: ${segments.length * 0.1}s;"
            />
        `);

        currentOffset += length;
    });

    // Add segments to SVG
    const existingSegments = svg.querySelectorAll('.donut-segment');
    existingSegments.forEach(s => s.remove());
    svg.innerHTML += segments.join('');

    // Render legend
    legend.innerHTML = Object.entries(statusCounts)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => `
            <div class="legend-item">
                <span class="legend-dot" style="background: ${colors[status]}"></span>
                <span class="legend-label">${status}</span>
                <span class="legend-value">${count}</span>
            </div>
        `).join('');
}

// ===========================================
// Evidence Bars
// ===========================================

function renderEvidenceBars() {
    const container = document.getElementById('evidenceBars');
    if (!container) return;

    const controls = dashboardData.controls;
    const evidenceCounts = {
        "Excellent": controls.filter(c => c.evidence === "Excellent").length,
        "Good": controls.filter(c => c.evidence === "Good").length,
        "Fair": controls.filter(c => c.evidence === "Fair").length,
        "Poor": controls.filter(c => c.evidence === "Poor").length
    };

    const total = controls.length;

    container.innerHTML = Object.entries(evidenceCounts).map(([quality, count]) => `
        <div class="evidence-item">
            <div class="evidence-header">
                <span class="evidence-label">${quality}</span>
                <span class="evidence-count">${count} control${count !== 1 ? 's' : ''}</span>
            </div>
            <div class="evidence-track">
                <div class="evidence-fill ${quality.toLowerCase()}" style="width: 0%;" data-width="${(count / total) * 100}"></div>
            </div>
        </div>
    `).join('');

    // Animate bars
    setTimeout(() => {
        container.querySelectorAll('.evidence-fill').forEach(fill => {
            fill.style.width = fill.dataset.width + '%';
        });
    }, 500);
}

// ===========================================
// Controls Table
// ===========================================

function renderControlsTable(filteredControls = null) {
    const tbody = document.getElementById('controlsTableBody');
    if (!tbody) return;

    const controls = filteredControls || dashboardData.controls;

    tbody.innerHTML = controls.map(control => `
        <tr data-id="${control.id}">
            <td>
                <div class="control-title">
                    <span class="control-id">${control.id}</span>
                    <span class="control-name">${control.title}</span>
                </div>
            </td>
            <td>
                <span class="strategy-tag">${truncate(control.strategy, 20)}</span>
            </td>
            <td>
                <span class="status-badge ${getStatusClass(control.status)}">
                    ${getStatusIcon(control.status)}
                    ${control.status}
                </span>
            </td>
            <td>
                <span class="evidence-badge ${getEvidenceClass(control.evidence)}">${control.evidence}</span>
            </td>
            <td>
                <span class="test-type ${control.testType.toLowerCase()}">
                    ${getTestTypeIcon(control.testType)}
                    ${control.testType}
                </span>
            </td>
            <td>
                <span class="date-value">${formatDate(control.lastUpdated)}</span>
            </td>
            <td>
                <button class="action-btn" onclick="showControlDetails('${control.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

// ===========================================
// Insights
// ===========================================

function renderInsights() {
    const container = document.getElementById('insightsGrid');
    if (!container) return;

    container.innerHTML = dashboardData.insights.map(insight => `
        <div class="insight-item ${insight.type}">
            <div class="insight-icon">
                ${getInsightIcon(insight.type)}
            </div>
            <h4 class="insight-title">${insight.title}</h4>
            <p class="insight-description">${insight.description}</p>
        </div>
    `).join('');
}

// ===========================================
// Modal & Control Details
// ===========================================

function showControlDetails(controlId) {
    const control = dashboardData.controls.find(c => c.id === controlId);
    if (!control) return;

    const modal = document.getElementById('detailModal');
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = control.title;
    body.innerHTML = `
        <div class="detail-section">
            <div class="detail-label">Control ID</div>
            <div class="detail-value">${control.id}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">Description</div>
            <div class="detail-value">${control.description}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">Assessment Guidance</div>
            <div class="detail-value">${control.guidance}</div>
        </div>
        
        <div class="detail-meta">
            <div>
                <div class="detail-label">Status</div>
                <span class="status-badge ${getStatusClass(control.status)}">
                    ${getStatusIcon(control.status)}
                    ${control.status}
                </span>
            </div>
            <div>
                <div class="detail-label">Evidence Quality</div>
                <span class="evidence-badge ${getEvidenceClass(control.evidence)}">${control.evidence}</span>
            </div>
            <div>
                <div class="detail-label">Test Type</div>
                <span class="test-type ${control.testType.toLowerCase()}">
                    ${getTestTypeIcon(control.testType)}
                    ${control.testType}
                </span>
            </div>
            <div>
                <div class="detail-label">Last Updated</div>
                <span class="date-value">${formatDate(control.lastUpdated)}</span>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">Justification</div>
            <div class="detail-value">${control.justification}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">Assessor</div>
            <div class="detail-value">${control.assessor}</div>
        </div>
        
        ${renderControlHistory(control.id)}
    `;

    overlay.classList.add('active');
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('active');
}

function renderControlHistory(controlId) {
    const history = historicalData.controlHistory[controlId];
    if (!history) return '';

    const quarters = historicalData.quarters;

    return `
        <div class="control-history">
            <h4>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                Status History
            </h4>
            <div class="history-timeline">
                ${quarters.map((quarter, index) => {
        const status = history.statuses[index];
        return `
                        <div class="history-item">
                            <span class="history-quarter">${quarter}</span>
                            <span class="history-status">
                                <span class="status-badge ${getStatusClass(status)}">
                                    ${getStatusIcon(status)}
                                    ${status}
                                </span>
                            </span>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

// ===========================================
// Event Listeners
// ===========================================

function setupEventListeners() {
    // Modal close
    document.getElementById('modalClose')?.addEventListener('click', closeModal);
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') closeModal();
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Quarter selector
    document.getElementById('quarterSelector')?.addEventListener('change', (e) => {
        const quarterIndex = parseInt(e.target.value);
        renderTrendChart(quarterIndex);
    });

    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        // Simulate refresh with loading animation
        const btn = document.getElementById('refreshBtn');
        btn.classList.add('loading');
        btn.disabled = true;

        setTimeout(() => {
            updateLastUpdated();
            renderKPIs();
            renderStrategyChart();
            renderStatusDonut();
            renderEvidenceBars();

            btn.classList.remove('loading');
            btn.disabled = false;
        }, 1000);
    });

    // Filters
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('testFilter')?.addEventListener('change', applyFilters);
    document.getElementById('searchInput')?.addEventListener('input', applyFilters);

    // Navigation smooth scroll
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    updateActiveLink(link);
                }
            }
        });
    });

    // Update active nav on scroll
    window.addEventListener('scroll', updateNavOnScroll);
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const testFilter = document.getElementById('testFilter')?.value || 'all';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

    let filtered = dashboardData.controls;

    if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (testFilter !== 'all') {
        filtered = filtered.filter(c => c.testType === testFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(c =>
            c.title.toLowerCase().includes(searchTerm) ||
            c.strategy.toLowerCase().includes(searchTerm) ||
            c.id.toLowerCase().includes(searchTerm)
        );
    }

    renderControlsTable(filtered);
}

function updateActiveLink(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

function updateNavOnScroll() {
    const sections = ['overview', 'controls', 'insights'];
    const scrollPos = window.scrollY + 100;

    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            const top = section.offsetTop;
            const height = section.offsetHeight;

            if (scrollPos >= top && scrollPos < top + height) {
                const link = document.querySelector(`.nav-link[href="#${id}"]`);
                if (link) updateActiveLink(link);
            }
        }
    });
}

// ===========================================
// Animations
// ===========================================

function animateOnScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .kpi-card, .insight-item').forEach(el => {
        observer.observe(el);
    });
}

// Add CSS animation keyframe dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes donutFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .btn-primary.loading svg {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
