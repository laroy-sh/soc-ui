// Configuration
const CONFIG = {
    dataPath: './soc_demo_dataset_ultimate/',
    refreshInterval: 60000, // 1 minute
    loadingDelayMin: 200,
    loadingDelayMax: 500
};

// State
let currentDashboard = 'analyst';
let refreshTimer = null;
let rocRangeDays = 30;
let rocData = null;
let hasLoadedOnce = false;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeFilterBar();
    initializeRocFilters();
    initializeMobileMenu();
    initializeKeyboardShortcuts();
    loadAllData();
    startAutoRefresh();
});

// Mobile Menu
function initializeMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!menuBtn || !sidebar) return;
    
    const openMenu = () => {
        sidebar.classList.add('open');
        overlay?.classList.add('visible');
        menuBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    };
    
    const closeMenu = () => {
        sidebar.classList.remove('open');
        overlay?.classList.remove('visible');
        menuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    };
    
    menuBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });
    
    overlay?.addEventListener('click', closeMenu);
    
    // Close menu when a nav link is clicked (mobile)
    sidebar.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMenu();
            }
        });
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeMenu();
        }
    });
    
    // Close menu when window resizes to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
            closeMenu();
        }
    });
}

// Keyboard Shortcuts
const KEYBOARD_SHORTCUTS = {
    '1': 'analyst',
    '2': 'lead',
    '3': 'telemetry',
    '4': 'customer',
    '5': 'roc',
    '8': 'essential8',
    'a': 'analyst',
    'l': 'lead',
    't': 'telemetry',
    'c': 'customer',
    'r': 'roc',
    'e': 'essential8'
};

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.matches('input, textarea, select, [contenteditable]')) {
            return;
        }
        
        // Require Alt/Option key for letter shortcuts to avoid conflicts
        const key = e.key.toLowerCase();
        const isNumberKey = /^[1-8]$/.test(key);
        const isLetterShortcut = /^[altcre]$/.test(key) && e.altKey;
        
        if (isNumberKey || isLetterShortcut) {
            const dashboard = KEYBOARD_SHORTCUTS[key];
            if (dashboard) {
                e.preventDefault();
                switchDashboard(dashboard);
                showShortcutToast(dashboard);
            }
        }
        
        // Question mark shows keyboard help
        if (e.key === '?' && !e.target.matches('input, textarea, select')) {
            e.preventDefault();
            toggleKeyboardHelp();
        }
    });
}

function showShortcutToast(dashboard) {
    const titles = {
        'analyst': 'Analyst Dashboard',
        'lead': 'SOC Lead Dashboard',
        'telemetry': 'Telemetry Health',
        'customer': 'Customer Dashboard',
        'roc': 'ROC Dashboard',
        'essential8': 'Essential Eight'
    };
    
    // Remove existing toast
    const existing = document.querySelector('.shortcut-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'shortcut-toast';
    toast.innerHTML = `<span class="shortcut-toast-icon">⌨️</span> Switched to ${titles[dashboard] || dashboard}`;
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 200);
    }, 1500);
}

function toggleKeyboardHelp() {
    let modal = document.querySelector('.keyboard-help-modal');
    
    if (modal) {
        modal.remove();
        return;
    }
    
    modal = document.createElement('div');
    modal.className = 'keyboard-help-modal';
    modal.innerHTML = `
        <div class="keyboard-help-content">
            <div class="keyboard-help-header">
                <h3>Keyboard Shortcuts</h3>
                <button class="keyboard-help-close" aria-label="Close">&times;</button>
            </div>
            <div class="keyboard-help-body">
                <div class="keyboard-shortcut-group">
                    <h4>Dashboard Navigation</h4>
                    <div class="keyboard-shortcut"><kbd>1</kbd> <span>Analyst Dashboard</span></div>
                    <div class="keyboard-shortcut"><kbd>2</kbd> <span>SOC Lead Dashboard</span></div>
                    <div class="keyboard-shortcut"><kbd>3</kbd> <span>Telemetry Health</span></div>
                    <div class="keyboard-shortcut"><kbd>4</kbd> <span>Customer Dashboard</span></div>
                    <div class="keyboard-shortcut"><kbd>5</kbd> <span>ROC Dashboard</span></div>
                    <div class="keyboard-shortcut"><kbd>8</kbd> <span>Essential Eight</span></div>
                </div>
                <div class="keyboard-shortcut-group">
                    <h4>Alt + Letter Shortcuts</h4>
                    <div class="keyboard-shortcut"><kbd>Alt</kbd>+<kbd>A</kbd> <span>Analyst</span></div>
                    <div class="keyboard-shortcut"><kbd>Alt</kbd>+<kbd>L</kbd> <span>SOC Lead</span></div>
                    <div class="keyboard-shortcut"><kbd>Alt</kbd>+<kbd>T</kbd> <span>Telemetry</span></div>
                    <div class="keyboard-shortcut"><kbd>Alt</kbd>+<kbd>R</kbd> <span>ROC</span></div>
                    <div class="keyboard-shortcut"><kbd>Alt</kbd>+<kbd>E</kbd> <span>Essential Eight</span></div>
                </div>
                <div class="keyboard-shortcut-group">
                    <h4>General</h4>
                    <div class="keyboard-shortcut"><kbd>?</kbd> <span>Toggle this help</span></div>
                    <div class="keyboard-shortcut"><kbd>Esc</kbd> <span>Close dialogs</span></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close handlers
    modal.querySelector('.keyboard-help-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    document.addEventListener('keydown', function closeOnEsc(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeOnEsc);
        }
    });
}

// Navigation
function initializeNavigation() {
    const navLinks = Array.from(document.querySelectorAll('.sidebar .nav-link'));
    navLinks.forEach(link => {
        if (link.classList.contains('nav-link-external')) {
            return;
        }
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
    enableNavKeyboardNavigation(navLinks);
}

function enableNavKeyboardNavigation(navLinks) {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;
    const links = navLinks.filter(link => !link.classList.contains('nav-section'));
    navMenu.addEventListener('keydown', event => {
        const active = document.activeElement;
        if (!links.includes(active)) return;
        let nextIndex = links.indexOf(active);

        switch (event.key) {
            case 'ArrowDown':
                nextIndex = Math.min(nextIndex + 1, links.length - 1);
                break;
            case 'ArrowUp':
                nextIndex = Math.max(nextIndex - 1, 0);
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = links.length - 1;
                break;
            case ' ':
                event.preventDefault();
                active.click();
                return;
            default:
                return;
        }

        event.preventDefault();
        links[nextIndex]?.focus();
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
        'outsourcer': 'Outsourcer Oversight SOC Dashboard',
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

function initializeFilterBar() {
    const filterInputs = Array.from(document.querySelectorAll('[data-filter-key]'));
    if (filterInputs.length === 0) return;

    const defaultValues = new Map();
    filterInputs.forEach(input => {
        defaultValues.set(input.dataset.filterKey, input.value);
    });

    const applyFiltersFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        filterInputs.forEach(input => {
            const key = input.dataset.filterKey;
            if (!key) return;
            const value = params.get(key);
            if (!value) return;
            const hasOption = Array.from(input.options || []).some(option => option.value === value);
            if (hasOption) {
                input.value = value;
            }
        });
    };

    const updateUrlParam = (key, value) => {
        const url = new URL(window.location.href);
        const defaultValue = defaultValues.get(key);
        if (!value || value === defaultValue) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
        history.replaceState(null, '', url);
    };

    filterInputs.forEach(input => {
        input.addEventListener('change', () => {
            updateUrlParam(input.dataset.filterKey, input.value);
        });
    });

    const resetButton = document.getElementById('filterReset');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            filterInputs.forEach(input => {
                const key = input.dataset.filterKey;
                const defaultValue = defaultValues.get(key);
                if (defaultValue !== undefined) {
                    input.value = defaultValue;
                    updateUrlParam(key, input.value);
                }
            });
        });
    }

    applyFiltersFromUrl();
    window.addEventListener('popstate', applyFiltersFromUrl);
}

// Data Loading
async function loadAllData() {
    const isInitialLoad = !hasLoadedOnce;
    if (isInitialLoad) {
        setLoadingState(true);
        showLoadingSkeletons();
    }

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
            slaComplianceHighSeverity,
            incidentInflow,
            incidentClosureRate,
            alertEscalationRate,
            alertToIncidentRatio,
            falsePositiveRate,
            benignPositiveRate,
            automationRate,
            truePositiveRate,
            falseNegativeRate,
            alertsPerAnalystBySeverity,
            ruleFiringVolume,
            ingestionVolume,
            detectionCoverage,
            storageTierDistribution,
            zeroIngestion,
            siemCostEffectiveness,
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
            fetchMetric('slaComplianceHighSeverity.latest.json'),
            fetchMetric('incidentInflow.24h.json'),
            fetchMetric('incidentClosureRate.24h.json'),
            fetchMetric('alertEscalationRate.7d.json'),
            fetchMetric('alertToIncidentRatio.7d.json'),
            fetchMetric('falsePositiveRate.7d.json'),
            fetchMetric('benignPositiveRate.7d.json'),
            fetchMetric('automationRate.7d.json'),
            fetchMetric('truePositiveRate.7d.json'),
            fetchMetric('falseNegativeRate.7d.json'),
            fetchMetric('alertsPerAnalystBySeverity.24h.json'),
            fetchMetric('ruleFiringVolume.24h.json'),
            fetchMetric('ingestionVolumeByTable.24h.json'),
            fetchMetric('detectionCoverage.latest.json'),
            fetchMetric('storageTierDistribution.latest.json'),
            fetchMetric('zeroIngestionTables.latest.json'),
            fetchMetric('siemCostEffectiveness.latest.json'),
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
        renderNewIncidents(newIncidents, openIncidentsBySeverity, incidentInflow);
        renderBarChart('openIncidentsBySeverity', openIncidentsBySeverity, 'severity');
        renderBarChart('openIncidentsByStatus', openIncidentsByStatus, 'status');
        renderBarChart('activeAlertsBySeverity', activeAlerts, 'severity');
        renderIncidentAging(incidentAging);
        renderTopEntities(topEntities);
        renderRepeatedDetections(repeatedDetections);
        
        // Render SOC Lead Dashboard
        renderIncidentTimings(incidentTimings, incidentDetectionTimings);
        renderSlaComplianceHighSeverity(slaComplianceHighSeverity);
        renderLineChart('incidentInflow', incidentInflow);
        renderLineChart('incidentClosureRate', incidentClosureRate);
        renderAlertEscalationRate(alertEscalationRate);
        renderAlertToIncidentRatio(alertToIncidentRatio);
        renderFalsePositiveRate(falsePositiveRate);
        renderBenignPositiveRate(benignPositiveRate);
        renderAutomationRate(automationRate);
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
        renderSiemCostEffectiveness(siemCostEffectiveness);
        
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
        
        // Update navigation badges
        updateNavBadges({
            openIncidents: openIncidentsBySeverity,
            zeroIngestion: zeroIngestion,
            riskScore: rocRiskScore
        });
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load dashboard data');
    } finally {
        if (isInitialLoad) {
            setLoadingState(false);
            hasLoadedOnce = true;
        }
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
        await sleep(getRandomDelay(CONFIG.loadingDelayMin, CONFIG.loadingDelayMax));
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

function getRandomDelay(min, max) {
    const safeMin = Number.isFinite(min) ? min : 200;
    const safeMax = Number.isFinite(max) ? max : 500;
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Rendering Functions

function renderNewIncidents(data, severityData, inflowData) {
    const card = document.getElementById('newIncidents15m')?.closest('.card');
    const el15m = document.getElementById('newIncidents15m');
    const el60m = document.getElementById('newIncidents60m');
    const el24h = document.getElementById('newIncidents24h');
    const ringEl = document.getElementById('incidentRing');
    const ringFill = document.getElementById('incidentRingFill');
    const severityMini = document.getElementById('incidentSeverityMini');
    const sparklineEl = document.getElementById('incidentSparkline');
    
    if (!data || !data.data) {
        setTextIfChanged(el15m, '—');
        if (el60m) setTextIfChanged(el60m, '—');
        if (el24h) setTextIfChanged(el24h, '—');
        setConfidenceNote(card, 'No visibility · Confidence: Low', 'low');
        return;
    }

    setConfidenceNote(card, null);
    
    const current15m = data.data.last15m ?? 0;
    const current60m = data.data.last60m ?? 0;
    const current24h = data.data.last24h ?? Math.round(current60m * 6.5);
    const prev15m = data.data.prev15m ?? null;
    
    // Update main ring value
    setTextIfChanged(el15m, String(current15m));
    if (el60m) setTextIfChanged(el60m, String(current60m));
    if (el24h) setTextIfChanged(el24h, String(current24h));
    
    // Update ring fill based on incidents (max 20 for full ring)
    if (ringFill) {
        const maxIncidents = 20;
        const fillPercent = Math.min(current15m / maxIncidents, 1);
        const circumference = 327; // 2 * PI * 52
        const offset = circumference * (1 - fillPercent);
        ringFill.style.strokeDashoffset = offset;
    }
    
    // Color ring based on severity if we have severity data
    if (ringEl && severityData?.data) {
        const severities = severityData.data;
        const hasCritical = severities.some(s => s.severity?.toLowerCase() === 'critical' && s.count > 0);
        const hasHigh = severities.some(s => s.severity?.toLowerCase() === 'high' && s.count > 0);
        const hasMedium = severities.some(s => s.severity?.toLowerCase() === 'medium' && s.count > 0);
        
        ringEl.classList.remove('severity-critical', 'severity-high', 'severity-medium', 'severity-low');
        if (hasCritical) {
            ringEl.classList.add('severity-critical');
        } else if (hasHigh) {
            ringEl.classList.add('severity-high');
        } else if (hasMedium) {
            ringEl.classList.add('severity-medium');
        } else {
            ringEl.classList.add('severity-low');
        }
    }
    
    // Render mini severity breakdown
    if (severityMini && severityData?.data) {
        const severities = severityData.data
            .filter(s => s.count > 0)
            .sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                return (order[a.severity?.toLowerCase()] ?? 4) - (order[b.severity?.toLowerCase()] ?? 4);
            })
            .slice(0, 4);
        
        const severityLabels = {
            critical: 'Crit',
            high: 'High',
            medium: 'Med',
            low: 'Low'
        };
        
        severityMini.innerHTML = `
            <div class="incident-severity-mini-title">Open by Severity</div>
            <div class="severity-pills">
                ${severities.map(s => {
                    const sev = s.severity?.toLowerCase() || '';
                    return `
                        <div class="severity-dot ${sev}">
                            <span class="severity-dot-icon"></span>
                            <span class="severity-dot-label">${severityLabels[sev] || sev}</span>
                            <span class="severity-dot-count">${s.count}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    // Render sparkline if we have inflow data
    if (sparklineEl && inflowData?.data) {
        const points = inflowData.data
            .slice(-12) // Last 12 data points
            .map(d => d.count || d.incidentCount || d.IncidentCount || 0);
        
        if (points.length > 1) {
            renderSparkline(sparklineEl, points);
        }
    }
}

function renderBarChart(elementId, data, colorType) {
    const container = document.getElementById(elementId);

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No events',
        noEventsDetail: 'No activity reported in this window',
        noVisibilityDetail: data?.message || 'Metric unavailable'
    })) {
        return;
    }
    
    const items = data.data;
    const maxValue = Math.max(...items.map(item => item.count || 0));
    const total = items.reduce((sum, item) => sum + (item.count || 0), 0);
    
    const html = `
        <div class="bar-chart">
            ${items.map(item => {
                const label = item.severity || item.status || item.category || 'Unknown';
                const count = item.count || 0;
                const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;
                const percentOfTotal = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                const colorClass = getColorClass(label, colorType);
                const tooltipText = `${label}: ${count} (${percentOfTotal}% of total)`;
                
                return `
                    <div class="bar-item" data-tooltip="${tooltipText}">
                        <div class="bar-label">${label}</div>
                        <div class="bar-track">
                            <div class="bar-fill ${colorClass}" style="width: ${percentage}%" title="${tooltipText}">
                                <span class="bar-value">${count}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    setContainerHTML(container, html);
}

function renderIncidentAging(data) {
    const container = document.getElementById('incidentAging');

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No aging events',
        noEventsDetail: 'No aging data reported in this window',
        noVisibilityDetail: data?.message || 'Aging data unavailable'
    })) {
        return;
    }

    renderBarChart('incidentAging', data, 'aging');
}

function renderTopEntities(data) {
    const container = document.getElementById('topEntities');

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No entities',
        noEventsDetail: 'No affected entities reported in this window',
        noVisibilityDetail: data?.message || 'Entity data unavailable'
    })) {
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
    
    setContainerHTML(container, html);
}

function renderIncidentTimings(data, detectionData) {
    const metricsRow = document.querySelector('#dashboard-lead .metrics-dashboard-row');
    const missingBase = !data || data.status === 'not_implemented' || !data.data;
    const missingDetection = !detectionData || detectionData.status === 'not_implemented' || !detectionData.data;

    if (missingBase) {
        setTextIfChanged(document.getElementById('mttaMedian'), '—');
        setTextIfChanged(document.getElementById('mttaP95'), '—');
        setTextIfChanged(document.getElementById('mttrMedian'), '—');
        setTextIfChanged(document.getElementById('mttrP95'), '—');
    } else {
        const mtta = data.data.mtta || {};
        const mttr = data.data.mttr || {};

        setTextIfChanged(document.getElementById('mttaMedian'), formatMinutes(mtta.medianMinutes));
        setTextIfChanged(document.getElementById('mttaP95'), formatMinutes(mtta.p95Minutes));
        setTextIfChanged(document.getElementById('mttrMedian'), formatMinutes(mttr.medianMinutes));
        setTextIfChanged(document.getElementById('mttrP95'), formatMinutes(mttr.p95Minutes));
    }

    if (missingDetection) {
        setTextIfChanged(document.getElementById('mttdMedian'), '—');
        setTextIfChanged(document.getElementById('mttdP95'), '—');
    } else {
        const mttd = detectionData.data.mttd || {};
        setTextIfChanged(document.getElementById('mttdMedian'), formatMinutes(mttd.medianMinutes));
        setTextIfChanged(document.getElementById('mttdP95'), formatMinutes(mttd.p95Minutes));
    }

    if (missingBase || missingDetection) {
        setConfidenceNote(metricsRow, 'No visibility · Confidence: Low', 'low');
        return;
    }

    setConfidenceNote(metricsRow, null);
}

function renderSlaComplianceHighSeverity(data) {
    const container = document.getElementById('slaComplianceHighSeverity');
    if (!container) return;

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No SLA events',
        noEventsDetail: 'No high severity SLA data reported in this window',
        noVisibilityDetail: data?.message || 'SLA compliance data unavailable'
    })) {
        return;
    }

    const payload = data.data || {};
    const severity = payload.severity || payload.severityLevel || 'High';
    const windowLabel = payload.windowLabel
        || (payload.windowHours ? `Last ${payload.windowHours}h` : (payload.window || 'Last 24h'));
    const sampleSize = payload.sampleSize ?? payload.totalAlerts ?? payload.alerts ?? payload.count ?? null;

    const mtta = payload.mtta || {};
    const mttr = payload.mttr || {};

    const mttaActual = mtta.p95Minutes ?? mtta.p95 ?? mtta.medianMinutes ?? mtta.median ?? null;
    const mttaMedian = mtta.medianMinutes ?? mtta.median ?? null;
    const mttaTarget = mtta.slaMinutes ?? mtta.slaThresholdMinutes ?? mtta.targetMinutes ?? null;
    const mttaWithinRate = mtta.withinTargetRate ?? mtta.withinSlaRate ?? null;

    const mttrActual = mttr.p95Minutes ?? mttr.p95 ?? mttr.medianMinutes ?? mttr.median ?? null;
    const mttrMedian = mttr.medianMinutes ?? mttr.median ?? null;
    const mttrTarget = mttr.slaMinutes ?? mttr.slaThresholdMinutes ?? mttr.targetMinutes ?? null;
    const mttrWithinRate = mttr.withinTargetRate ?? mttr.withinSlaRate ?? null;

    let overallRate = payload.overallComplianceRate ?? payload.overallRate ?? null;
    if (overallRate === null || overallRate === undefined) {
        const rates = [mttaWithinRate, mttrWithinRate].filter(value => value !== null && value !== undefined);
        if (rates.length > 0) {
            overallRate = rates.reduce((sum, value) => sum + value, 0) / rates.length;
        }
    }
    if ((overallRate === null || overallRate === undefined)
        && mttaActual !== null && mttaTarget !== null
        && mttrActual !== null && mttrTarget !== null) {
        overallRate = (mttaActual <= mttaTarget && mttrActual <= mttrTarget) ? 1 : 0;
    }

    const rateDisplay = overallRate === null || overallRate === undefined
        ? '—'
        : `${formatNumber(overallRate * 100, 1)}%`;
    const progressWidth = overallRate === null || overallRate === undefined
        ? 0
        : Math.min(100, Math.max(0, overallRate * 100));

    const getSlaStatus = (actual, target) => {
        if (actual === null || target === null) {
            return { label: 'No SLA target', className: 'sla-status-unknown' };
        }
        return actual <= target
            ? { label: 'Within SLA', className: 'sla-status-good' }
            : { label: 'Breach', className: 'sla-status-bad' };
    };

    const buildRow = (title, actual, target, median, status, withinRate) => {
        const detail = `P95 ${formatMinutes(actual)} / SLA ${formatMinutes(target)}`;
        const medianText = `Median ${formatMinutes(median)}`;
        const withinText = withinRate === null || withinRate === undefined
            ? '—'
            : `${formatNumber(withinRate * 100, 0)}% within`;

        return `
            <div class="sla-row">
                <div>
                    <div class="sla-row-title">${title}</div>
                    <div class="sla-row-detail">${detail}</div>
                    <div class="sla-row-sub">${medianText}</div>
                </div>
                <div class="sla-row-status ${status.className}">
                    <span class="sla-status-label">${status.label}</span>
                    <span class="sla-status-detail">${withinText}</span>
                </div>
            </div>
        `;
    };

    const html = `
        <div class="sla-compliance-summary">
            <div>
                <div class="sla-rate">${rateDisplay}</div>
                <div class="sla-label">${escapeHtml(severity)} severity within SLA</div>
            </div>
            <div class="sla-summary-meta">
                <span>${escapeHtml(windowLabel)}</span>
                <span>${sampleSize === null ? '—' : `${formatNumber(sampleSize)} alerts`}</span>
            </div>
        </div>
        <div class="sla-progress">
            <div class="sla-progress-bar" style="width: ${progressWidth}%"></div>
        </div>
        <div class="sla-rows">
            ${buildRow('MTTA', mttaActual, mttaTarget, mttaMedian, getSlaStatus(mttaActual, mttaTarget), mttaWithinRate)}
            ${buildRow('MTTR', mttrActual, mttrTarget, mttrMedian, getSlaStatus(mttrActual, mttrTarget), mttrWithinRate)}
        </div>
    `;

    setContainerHTML(container, html);
}

function renderLineChart(elementId, data) {
    const container = document.getElementById(elementId);

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No events',
        noEventsDetail: 'No trend data reported in this window',
        noVisibilityDetail: data?.message || 'Trend data unavailable'
    })) {
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
    
    setContainerHTML(container, html);
}

function renderMultiLineChart(elementId, series) {
    const container = document.getElementById(elementId);

    if (!Array.isArray(series) || series.length === 0) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Trend data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    const baseSeries = series[0]?.data || [];
    if (baseSeries.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No trend activity reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    setContainerHTML(container, `
        <svg class="multi-line-chart-svg" viewBox="0 0 ${width} ${height}">
            ${gridLines}
            ${paths}
            ${labels}
        </svg>
        ${legend}
    `);
}

function renderRuleFiringVolume(data) {
    const container = document.getElementById('ruleFiringVolume');

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No rule firings',
        noEventsDetail: 'No detections fired in this window',
        noVisibilityDetail: data?.message || 'Rule firing data unavailable'
    })) {
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
    
    setContainerHTML(container, html);
}

function renderAlertsPerAnalystBySeverity(data) {
    const container = document.getElementById('alertsPerAnalystBySeverity');
    if (!container) return;

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No analyst alerts',
        noEventsDetail: 'No analyst alert activity reported in this window',
        noVisibilityDetail: data?.message || 'Analyst alert data unavailable'
    })) {
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
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No severity breakdown reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    setContainerHTML(container, html);
}

function renderIngestionVolume(data) {
    const container = document.getElementById('ingestionVolumeByTable');

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No ingestion events',
        noEventsDetail: 'No ingestion data reported in this window',
        noVisibilityDetail: data?.message || 'Ingestion data unavailable'
    })) {
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

    const updated = setContainerHTML(container, html);
    if (updated) {
        requestAnimationFrame(() => {
            container.querySelectorAll('.ingestion-fill').forEach(fill => {
                fill.style.width = `${fill.dataset.width}%`;
            });
        });
    }
}

function renderCoveragePieChart(container, options) {
    if (!container) return;

    const total = Number(options.total);
    const covered = Number(options.covered);

    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(covered)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: options.emptyMessage || 'Coverage data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
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

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No coverage events',
        noEventsDetail: 'No coverage data reported in this window',
        noVisibilityDetail: data?.message || 'Detection coverage data unavailable'
    })) {
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

    setContainerHTML(container, `
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
    `);

    const overallChart = container.querySelector('[data-coverage-chart="overall"]');
    const assetsChart = container.querySelector('[data-coverage-chart="assets"]');
    const sourcesChart = container.querySelector('[data-coverage-chart="sources"]');

    if (coverageValue === null || coverageValue === undefined) {
        if (overallChart) {
            setContainerHTML(overallChart, createEmptyState('No visibility', 'no-visibility', {
                detail: 'Coverage percentage unavailable',
                confidence: 'Confidence: Low'
            }), { force: true });
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

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No storage tier events',
        noEventsDetail: 'No storage tier data reported in this window',
        noVisibilityDetail: data?.message || 'Storage tier data unavailable'
    })) {
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
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Storage tier percentages unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
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

    setContainerHTML(container, `
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
    `);
}

function renderSiemCostEffectiveness(data) {
    const container = document.getElementById('siemCostEffectiveness');
    if (!container) return;

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No cost signals',
        noEventsDetail: 'No cost effectiveness data reported in this window',
        noVisibilityDetail: data?.message || 'SIEM cost effectiveness unavailable'
    })) {
        return;
    }

    const payload = data.data || {};
    const toNumber = value => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    };
    const formatCost = (value, decimals = 0) => {
        if (value === null || value === undefined) return '—';
        return value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    };
    const formatCostAuto = value => {
        if (value === null || value === undefined) return '—';
        const decimals = value < 10 ? 2 : value < 100 ? 1 : 0;
        return formatCost(value, decimals);
    };

    const totalCost = toNumber(payload.totalCostUSD ?? payload.totalCost ?? payload.costUSD ?? payload.cost ?? payload.spendUSD ?? payload.spend);
    const totalAlerts = toNumber(payload.totalAlerts ?? payload.alerts ?? payload.alertCount ?? payload.alertsCount);
    const totalIncidents = toNumber(payload.totalIncidents ?? payload.incidents ?? payload.incidentCount ?? payload.incidentsCount);
    const ingestedGB = toNumber(payload.ingestedGB ?? payload.totalIngestedGB ?? payload.ingestionGB ?? payload.ingestionVolumeGB);

    const costPerAlert = toNumber(payload.costPerAlert ?? (totalCost !== null && totalAlerts ? totalCost / totalAlerts : null));
    const costPerIncident = toNumber(payload.costPerIncident ?? (totalCost !== null && totalIncidents ? totalCost / totalIncidents : null));
    const costPerGB = toNumber(payload.costPerGB ?? (totalCost !== null && ingestedGB ? totalCost / ingestedGB : null));

    const periodLabel = payload.periodLabel
        || (payload.periodStart && payload.periodEnd
            ? `${new Date(payload.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${new Date(payload.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : 'Last 24h');

    const html = `
        <div class="cost-effectiveness-summary">
            <div>
                <div class="cost-primary">${formatCostAuto(costPerAlert)}</div>
                <div class="cost-primary-label">Cost per alert</div>
            </div>
            <div class="cost-meta">
                <span>${escapeHtml(periodLabel)}</span>
                <span>${totalCost === null ? '—' : `${formatCurrency(totalCost)} total`}</span>
            </div>
        </div>
        <div class="cost-effectiveness-grid">
            <div class="metric">
                <span class="metric-label">Cost per incident</span>
                <span class="metric-value">${formatCostAuto(costPerIncident)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Alerts</span>
                <span class="metric-value">${totalAlerts === null ? '—' : formatNumber(totalAlerts)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Incidents</span>
                <span class="metric-value">${totalIncidents === null ? '—' : formatNumber(totalIncidents)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Cost per GB</span>
                <span class="metric-value">${formatCostAuto(costPerGB)}</span>
            </div>
        </div>
    `;

    setContainerHTML(container, html);
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
    
    if (!data || data.status === 'not_implemented') {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: data?.message || 'Ingestion coverage unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (!data.data || data.data.length === 0) {
        setContainerHTML(container, createEmptyState('All tables receiving data', 'success', {
            detail: 'No ingestion gaps detected',
            confidence: 'Confidence: High'
        }), { force: true });
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
    
    setContainerHTML(container, html);
}

function renderRepeatedDetections(data) {
    const container = document.getElementById('repeatedDetections');
    if (!container) return;
    
    if (renderEmptyState(container, data, {
        noEventsMessage: 'No repeated detections',
        noEventsDetail: 'No repeated detections reported in this window',
        noVisibilityDetail: data?.message || 'Repeated detection data unavailable'
    })) {
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

    setContainerHTML(container, html);
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

    setTextIfChanged(element, value === null ? '—' : formatCompactNumber(value));
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
        setTextIfChanged(element, '—');
        return;
    }

    const decimals = Number.isInteger(value) ? 0 : 1;
    setTextIfChanged(element, `${formatNumber(value, decimals)}d`);
}

function renderAttackSurfaceCoverage(data, options = {}) {
    const gaugeContainer = document.getElementById('rocAttackSurfaceCoverage');
    const treemapContainer = document.getElementById('rocCoverageTreemap');
    if (!gaugeContainer || !treemapContainer) return;

    if (!data || data.status === 'not_implemented' || !data.data) {
        setContainerHTML(gaugeContainer, createEmptyState('No visibility', 'no-visibility', {
            detail: data?.message || 'Coverage data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        setContainerHTML(treemapContainer, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Coverage gaps unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
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

    if (!Array.isArray(points)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Risk exposure data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (points.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No risk exposure events reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    setContainerHTML(container, `
        ${thresholdLine}
        <div class="roc-bar-trend-chart">
            ${bars}
        </div>
        <div class="roc-bar-labels">
            <span>${labels[0]}</span>
            <span>${labels[1]}</span>
            <span>${labels[2]}</span>
        </div>
    `);
}

function renderIncidentCountByTitle(data) {
    const container = document.getElementById('rocIncidentCount');

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No incidents',
        noEventsDetail: 'No incident counts reported in this window',
        noVisibilityDetail: data?.message || 'Incident count data unavailable'
    })) {
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

    setContainerHTML(container, html);
}

function renderExecutiveActions(items) {
    const container = document.getElementById('rocExecutiveActions');

    if (!Array.isArray(items)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Executive actions unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (items.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No executive actions reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    setContainerHTML(container, html);
}

function renderIncidentAgeBuckets(buckets) {
    const container = document.getElementById('rocIncidentAgeBuckets');

    if (!container) return;

    if (!Array.isArray(buckets)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Closed incident aging unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (buckets.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No closed incidents reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    if (!Array.isArray(items)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Closed incident details unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (items.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No closed incidents reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    setContainerHTML(container, html);
}

function renderWorkloadBySeverity(items) {
    const container = document.getElementById('rocWorkloadBySeverity');
    if (!container) return;

    if (!Array.isArray(items)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Workload data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (items.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No workload activity reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    if (donutItems.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No workload activity reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
        return;
    }

    renderRocDonutChart(container, donutItems, 'Incidents');
}

function renderTopHighVolumeRisks(items) {
    const container = document.getElementById('socHighVolumeRisks');
    if (!container) return;

    if (!Array.isArray(items)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'High-volume risk data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (items.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No high-volume risks reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    if (!Array.isArray(buckets)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Resolution efficiency unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (buckets.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No resolution efficiency data reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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
        setTextIfChanged(element, '—');
        return;
    }

    const total = items.reduce((sum, item) => sum + (item.AgeDays ?? item.ageDays ?? 0), 0);
    const avg = total / items.length;
    setTextIfChanged(element, Number.isFinite(avg) ? formatNumber(avg, 2) : '—');
}

function renderResolutionSpeed(items) {
    const container = document.getElementById('rocResolutionSpeed');
    if (!container) return;

    if (!Array.isArray(items)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Resolution speed data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (items.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No resolution speed data reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No resolution speed data reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
        return;
    }

    renderLineChart('rocResolutionSpeed', { data: points, labelMode: 'date', target: 2 });
}

function renderTargetOutliers(items) {
    const container = document.getElementById('rocTargetOutliers');
    if (!container) return;

    if (!Array.isArray(items)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Outlier data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (items.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No outliers reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
        return;
    }

    const outliers = items.filter(item => (item.AgeDays ?? item.ageDays ?? 0) > 2);

    if (outliers.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No outliers above 2 days',
            confidence: 'Confidence: High'
        }), { force: true });
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

    setContainerHTML(container, html);
}

function renderPrimaryRiskDrivers(items) {
    const container = document.getElementById('rocPrimaryRiskDrivers');
    if (!container) return;

    if (!Array.isArray(items)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Primary risk drivers unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (items.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No primary risk drivers reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    setContainerHTML(container, html);
}

function renderCoverageGauge(container, value) {
    const percent = Number(value);
    if (!Number.isFinite(percent)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Coverage data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    const clamped = Math.max(0, Math.min(100, percent));
    setContainerHTML(container, `
        <div>
            <svg viewBox="0 0 200 120">
                <path class="roc-gauge-track" d="M10 110 A90 90 0 0 1 190 110" pathLength="100" />
                <path class="roc-gauge-fill" d="M10 110 A90 90 0 0 1 190 110" pathLength="100" stroke-dasharray="${clamped} 100" />
            </svg>
            <div class="roc-gauge-value">${formatNumber(clamped, 2)}%</div>
        </div>
    `);
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

    setContainerHTML(container, grid);
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

    if (!Array.isArray(points)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Risk burn-down data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (points.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No risk burn-down activity reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    if (!Array.isArray(points)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Risk debt data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (points.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No risk debt activity reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    if (!Array.isArray(items)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Policy exception data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (items.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No policy exceptions reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    setContainerHTML(container, html);
}

function renderRemediationRoi(items) {
    const element = document.getElementById('rocRemediationRoi');
    if (!element) return;

    if (!Array.isArray(items) || items.length === 0) {
        setTextIfChanged(element, '—');
        return;
    }

    const total = items.reduce((sum, item) => sum + (item.LossAvoided ?? item.lossAvoided ?? 0), 0);
    setTextIfChanged(element, formatCurrency(total));
}

function renderSlaHealth(items) {
    const container = document.getElementById('rocSlaHealth');
    if (!container) return;

    if (!Array.isArray(items)) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'SLA health data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (items.length === 0) {
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No SLA health events reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    setContainerHTML(container, html);
}

function renderPlaceholder(elementId, data) {
    const container = document.getElementById(elementId);
    
    if (!data || data.status === 'not_implemented') {
        setContainerHTML(container, createEmptyState(
            data?.message || 'Not implemented',
            'placeholder'
        ), { force: true });
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
    setTextIfChanged(element, `${format(start)} - ${format(end)}`);
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

function setTextIfChanged(element, value) {
    if (!element) return false;
    const nextValue = value ?? '';
    if (element.textContent === nextValue) return false;
    element.textContent = nextValue;
    return true;
}

function createTrendIndicator(currentValue, previousValue, options = {}) {
    const { invertColors = false, showPercent = true } = options;
    
    if (previousValue == null || previousValue === 0 || currentValue == null) {
        return '';
    }
    
    const diff = currentValue - previousValue;
    const percentChange = Math.round((diff / previousValue) * 100);
    
    if (diff === 0) {
        return `<span class="trend-indicator trend-indicator-neutral" title="No change from previous period">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>0%</span>
        </span>`;
    }
    
    const isUp = diff > 0;
    // For incidents/alerts, up is bad (red), down is good (green)
    // invertColors flips this for metrics where up is good
    const colorClass = invertColors 
        ? (isUp ? 'trend-indicator-down' : 'trend-indicator-up')
        : (isUp ? 'trend-indicator-up' : 'trend-indicator-down');
    
    const arrow = isUp 
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="18 15 12 9 6 15"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 9 12 15 18 9"/></svg>';
    
    const label = showPercent 
        ? `${isUp ? '+' : ''}${percentChange}%` 
        : `${isUp ? '+' : ''}${diff}`;
    
    const title = `${isUp ? 'Increased' : 'Decreased'} by ${Math.abs(percentChange)}% from previous period`;
    
    return `<span class="trend-indicator ${colorClass}" title="${title}">
        ${arrow}
        <span>${label}</span>
    </span>`;
}

function renderValueWithTrend(element, currentValue, previousValue, formatter = String, options = {}) {
    if (!element) return;
    
    const formattedValue = formatter(currentValue);
    const trend = createTrendIndicator(currentValue, previousValue, options);
    
    element.innerHTML = `${formattedValue}${trend}`;
}

function setContainerHTML(container, html, options = {}) {
    if (!container) return false;
    const nextHtml = typeof html === 'string' ? html : String(html ?? '');
    const nextKey = hashString(nextHtml);
    if (!options.force && container.dataset.renderKey === nextKey) {
        return false;
    }
    container.dataset.renderKey = nextKey;
    container.innerHTML = nextHtml;
    initTableKeyboardNavigation(container);
    return true;
}

function hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return String(hash);
}

function setLoadingState(isLoading) {
    document.body.classList.toggle('is-loading', isLoading);
    document.body.setAttribute('aria-busy', isLoading ? 'true' : 'false');

    const valueSelectors = [
        '.counter-value',
        '.metric-value-highlight',
        '.metric-value-sub',
        '.metric-value',
        '.customer-metric-value',
        '.roc-hero-value'
    ];

    document.querySelectorAll(valueSelectors.join(',')).forEach(element => {
        element.classList.toggle('skeleton-text', isLoading);
    });
}

function showLoadingSkeletons() {
    const skeletonTargets = [
        { selector: '.chart-container', type: 'chart' },
        { selector: '.chart-line', type: 'line' },
        { selector: '.chart-trend', type: 'line' },
        { selector: '.table-container', type: 'table' },
        { selector: '.conversion-container', type: 'stats' },
        { selector: '.sla-compliance', type: 'list' }
    ];

    skeletonTargets.forEach(target => {
        document.querySelectorAll(target.selector).forEach(container => {
            setContainerHTML(container, buildSkeleton(target.type), { force: true });
        });
    });
}

function buildSkeleton(type) {
    const base = {
        chart: `
            <div class="skeleton-root">
                <div class="skeleton-bar" style="width: 70%"></div>
                <div class="skeleton-bar" style="width: 52%"></div>
                <div class="skeleton-bar" style="width: 84%"></div>
                <div class="skeleton-bar" style="width: 40%"></div>
            </div>
        `,
        line: `
            <div class="skeleton-root">
                <div class="skeleton-line" style="width: 90%"></div>
                <div class="skeleton-line" style="width: 68%"></div>
                <div class="skeleton-line" style="width: 80%"></div>
            </div>
        `,
        table: `
            <div class="skeleton-root">
                <div class="skeleton-line" style="width: 92%"></div>
                <div class="skeleton-line" style="width: 88%"></div>
                <div class="skeleton-line" style="width: 76%"></div>
                <div class="skeleton-line" style="width: 84%"></div>
            </div>
        `,
        stats: `
            <div class="skeleton-root skeleton-stats">
                <div class="skeleton-pill"></div>
                <div class="skeleton-pill"></div>
                <div class="skeleton-pill"></div>
            </div>
        `,
        list: `
            <div class="skeleton-root">
                <div class="skeleton-line" style="width: 64%"></div>
                <div class="skeleton-line" style="width: 86%"></div>
                <div class="skeleton-line" style="width: 72%"></div>
            </div>
        `
    };

    return base[type] || base.chart;
}

function isEmptyPayload(payload) {
    if (payload === null || payload === undefined) return true;
    if (Array.isArray(payload)) return payload.length === 0;
    if (typeof payload === 'object') return Object.keys(payload).length === 0;
    return false;
}

function getEmptyStateHtml(data, options = {}) {
    const {
        noEventsMessage = 'No events',
        noEventsDetail = 'No activity reported in this window',
        noVisibilityMessage = 'No visibility',
        noVisibilityDetail = 'Data source unavailable or not configured',
        confidenceHigh = 'Confidence: High',
        confidenceLow = 'Confidence: Low'
    } = options;

    if (!data) {
        return createEmptyState(noVisibilityMessage, 'no-visibility', {
            detail: noVisibilityDetail,
            confidence: confidenceLow
        });
    }

    if (data.status === 'not_implemented') {
        return createEmptyState(noVisibilityMessage, 'no-visibility', {
            detail: data.message || noVisibilityDetail,
            confidence: confidenceLow
        });
    }

    if (isEmptyPayload(data.data)) {
        return createEmptyState(noEventsMessage, 'no-events', {
            detail: noEventsDetail,
            confidence: confidenceHigh
        });
    }

    return null;
}

function renderEmptyState(container, data, options = {}) {
    const html = getEmptyStateHtml(data, options);
    if (!html) return false;
    setContainerHTML(container, html, { force: true });
    return true;
}

function initTableKeyboardNavigation(container) {
    if (!container) return;
    container.querySelectorAll('table').forEach(table => {
        if (table.dataset.keyboardReady === 'true') return;
        table.dataset.keyboardReady = 'true';
        table.setAttribute('tabindex', '0');
        table.classList.add('keyboard-table');

        const bodyRows = Array.from(table.tBodies[0]?.rows || []);
        const allCells = bodyRows.flatMap(row => Array.from(row.cells));
        allCells.forEach(cell => cell.setAttribute('tabindex', '-1'));
        if (allCells[0]) {
            allCells[0].setAttribute('tabindex', '0');
        }

        const focusCell = (rowIndex, colIndex) => {
            const row = bodyRows[rowIndex];
            if (!row) return;
            const cell = row.cells[colIndex];
            if (!cell) return;
            allCells.forEach(td => td.setAttribute('tabindex', '-1'));
            cell.setAttribute('tabindex', '0');
            cell.focus();
        };

        table.addEventListener('focus', event => {
            if (event.target === table && allCells[0]) {
                allCells[0].focus();
            }
        });

        table.addEventListener('keydown', event => {
            const activeCell = document.activeElement;
            if (!activeCell || activeCell.tagName !== 'TD') return;
            const rowIndex = activeCell.parentElement.rowIndex - 1;
            const colIndex = activeCell.cellIndex;
            let nextRow = rowIndex;
            let nextCol = colIndex;

            switch (event.key) {
                case 'ArrowRight':
                    nextCol = Math.min(colIndex + 1, activeCell.parentElement.cells.length - 1);
                    break;
                case 'ArrowLeft':
                    nextCol = Math.max(colIndex - 1, 0);
                    break;
                case 'ArrowDown':
                    nextRow = Math.min(rowIndex + 1, bodyRows.length - 1);
                    break;
                case 'ArrowUp':
                    nextRow = Math.max(rowIndex - 1, 0);
                    break;
                case 'Home':
                    nextCol = 0;
                    break;
                case 'End':
                    nextCol = activeCell.parentElement.cells.length - 1;
                    break;
                default:
                    return;
            }

            event.preventDefault();
            focusCell(nextRow, nextCol);
        });
    });
}

function setConfidenceNote(container, text, variant = 'low') {
    if (!container) return;
    let note = container.querySelector('.confidence-note');
    if (!text) {
        if (note) {
            note.remove();
        }
        return;
    }
    if (!note) {
        note = document.createElement('div');
        note.className = 'confidence-note';
        container.appendChild(note);
    }
    note.textContent = text;
    note.classList.toggle('confidence-note-low', variant === 'low');
    note.classList.toggle('confidence-note-high', variant === 'high');
}

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

function createEmptyState(message, type = 'default', options = {}) {
    const stateClassMap = {
        success: 'empty-state success-state',
        placeholder: 'empty-state placeholder-state',
        'no-events': 'empty-state no-events-state',
        'no-visibility': 'empty-state no-visibility-state',
        default: 'empty-state'
    };
    const stateClass = stateClassMap[type] || stateClassMap.default;
    const safeMessage = message || 'No data available';
    const detail = options.detail;
    const confidence = options.confidence;
    const detailHtml = detail ? `<p class="empty-state-detail">${detail}</p>` : '';
    const confidenceHtml = confidence ? `<span class="empty-state-confidence">${confidence}</span>` : '';

    const messages = {
        success: `<p class="empty-state-message">✓ ${safeMessage}</p>${detailHtml}${confidenceHtml}`,
        placeholder: `<p class="empty-state-message">${safeMessage}</p>` +
            `<p class="empty-state-detail">This metric will be available in a future release</p>` +
            confidenceHtml,
        default: `<p class="empty-state-message">${safeMessage}</p>${detailHtml}${confidenceHtml}`
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
        setContainerHTML(container, createEmptyState('No events', 'no-events', {
            detail: 'No activity reported in this window',
            confidence: 'Confidence: High'
        }), { force: true });
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

    setContainerHTML(container, `
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
    `);
}

function renderSparkline(container, points) {
    if (!container || !points || points.length < 2) return;
    
    const width = 300;
    const height = 40;
    const padding = 4;
    
    const maxVal = Math.max(...points, 1);
    const minVal = Math.min(...points, 0);
    const range = maxVal - minVal || 1;
    
    const xStep = (width - padding * 2) / (points.length - 1);
    
    const coords = points.map((val, i) => ({
        x: padding + i * xStep,
        y: height - padding - ((val - minVal) / range) * (height - padding * 2)
    }));
    
    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;
    
    container.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            <defs>
                <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent-primary)" stop-opacity="0.3" />
                    <stop offset="100%" stop-color="var(--accent-primary)" stop-opacity="0.05" />
                </linearGradient>
            </defs>
            <path class="sparkline-area" d="${areaPath}" />
            <path class="sparkline-line" d="${linePath}" />
            <circle class="sparkline-dot" cx="${coords[coords.length - 1].x}" cy="${coords[coords.length - 1].y}" r="3" />
        </svg>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

let lastRefreshTime = null;
let refreshState = 'live'; // 'live', 'refreshing', 'stale', 'error'

function updateTimestamp(isoString) {
    const badge = document.querySelector('.badge-live, .badge-stale, .badge-error, .badge-refreshing');
    const timestampEl = document.getElementById('generatedAt');
    const lastUpdatedEl = document.getElementById('lastUpdated');
    
    if (!isoString) {
        setTextIfChanged(timestampEl, '—');
        setTextIfChanged(lastUpdatedEl, 'Last updated: —');
        updateRefreshBadge(badge, 'error');
        return;
    }
    
    const date = new Date(isoString);
    lastRefreshTime = date;
    const now = new Date();
    const ageMinutes = Math.floor((now - date) / 60000);
    
    const formatted = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    });
    
    // Determine staleness
    let relativeTime = '';
    if (ageMinutes < 1) {
        relativeTime = 'just now';
    } else if (ageMinutes < 60) {
        relativeTime = `${ageMinutes}m ago`;
    } else {
        const hours = Math.floor(ageMinutes / 60);
        relativeTime = `${hours}h ago`;
    }
    
    // Update badge based on staleness
    if (ageMinutes > 15) {
        updateRefreshBadge(badge, 'error');
        refreshState = 'error';
    } else if (ageMinutes > 5) {
        updateRefreshBadge(badge, 'stale');
        refreshState = 'stale';
    } else {
        updateRefreshBadge(badge, 'live');
        refreshState = 'live';
    }
    
    setTextIfChanged(timestampEl, `${formatted} (${relativeTime})`);
    if (lastUpdatedEl) {
        lastUpdatedEl.innerHTML = `Last updated: <span class="refresh-timestamp ${refreshState === 'stale' ? 'stale' : refreshState === 'error' ? 'error' : ''}">${relativeTime}</span>`;
    }
}

function updateRefreshBadge(badge, state) {
    if (!badge) return;
    
    badge.className = badge.className.replace(/badge-(live|stale|error|refreshing)/g, '').trim();
    badge.classList.add(`badge-${state}`);
    
    const labels = {
        live: 'Live (Sentinel)',
        refreshing: 'Refreshing...',
        stale: 'Data Stale',
        error: 'Data Outdated'
    };
    
    badge.textContent = labels[state] || labels.live;
}

function setRefreshing(isRefreshing) {
    const badge = document.querySelector('.badge-live, .badge-stale, .badge-error, .badge-refreshing');
    if (isRefreshing) {
        updateRefreshBadge(badge, 'refreshing');
    } else if (lastRefreshTime) {
        const now = new Date();
        const ageMinutes = Math.floor((now - lastRefreshTime) / 60000);
        if (ageMinutes > 15) {
            updateRefreshBadge(badge, 'error');
        } else if (ageMinutes > 5) {
            updateRefreshBadge(badge, 'stale');
        } else {
            updateRefreshBadge(badge, 'live');
        }
    }
}

function updateNavBadges(data) {
    // Update Analyst badge with total open incidents
    const analystBadge = document.getElementById('navBadgeAnalyst');
    if (analystBadge && data.openIncidents?.data) {
        const total = data.openIncidents.data.reduce((sum, item) => sum + (item.count || 0), 0);
        analystBadge.textContent = total > 0 ? total : '';
        
        // Change badge color based on severity
        const hasCritical = data.openIncidents.data.some(item => 
            (item.severity?.toLowerCase() === 'critical' || item.severity?.toLowerCase() === 'high') && item.count > 0
        );
        analystBadge.className = `nav-badge${hasCritical ? '' : ' nav-badge-warning'}`;
    }
    
    // Update Telemetry badge with zero ingestion count
    const telemetryBadge = document.getElementById('navBadgeTelemetry');
    if (telemetryBadge && data.zeroIngestion?.data) {
        const count = data.zeroIngestion.data.length || 0;
        telemetryBadge.textContent = count > 0 ? count : '';
    }
    
    // Update ROC badge with risk score if high
    const rocBadge = document.getElementById('navBadgeRoc');
    if (rocBadge && data.riskScore?.data) {
        const score = data.riskScore.data.score || data.riskScore.data.totalScore || 0;
        if (score > 100) {
            rocBadge.textContent = score;
            rocBadge.className = 'nav-badge';
        } else if (score > 50) {
            rocBadge.textContent = score;
            rocBadge.className = 'nav-badge nav-badge-warning';
        } else {
            rocBadge.textContent = '';
        }
    }
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
        setRefreshing(true);
        loadAllData().finally(() => {
            setRefreshing(false);
        });
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
    
    if (renderEmptyState(container, data, {
        noEventsMessage: 'No incidents',
        noEventsDetail: 'No incidents created in this window',
        noVisibilityDetail: data?.message || 'Incident trend unavailable'
    })) {
        return;
    }
    
    renderDailyTrendChart(container, data.data, 'Incidents Created', 'customer-trend-created');
}

function renderCustomerClosureTrend(data) {
    const container = document.getElementById('customerClosureTrend');
    
    if (renderEmptyState(container, data, {
        noEventsMessage: 'No closures',
        noEventsDetail: 'No incident closures in this window',
        noVisibilityDetail: data?.message || 'Closure trend unavailable'
    })) {
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

    setContainerHTML(container, html);
}

function renderCustomerTimings(data) {
    const mttaMedianEl = document.getElementById('customerMttaMedian');
    const mttaP95El = document.getElementById('customerMttaP95');
    const mttrMedianEl = document.getElementById('customerMttrMedian');
    const mttrP95El = document.getElementById('customerMttrP95');
    const mttaCard = mttaMedianEl?.closest('.card');
    const mttrCard = mttrMedianEl?.closest('.card');
    
    if (!data || data.status === 'not_implemented' || !data.data) {
        if (mttaMedianEl) setTextIfChanged(mttaMedianEl, '—');
        if (mttaP95El) setTextIfChanged(mttaP95El, '—');
        if (mttrMedianEl) setTextIfChanged(mttrMedianEl, '—');
        if (mttrP95El) setTextIfChanged(mttrP95El, '—');
        setConfidenceNote(mttaCard, 'No visibility · Confidence: Low', 'low');
        setConfidenceNote(mttrCard, 'No visibility · Confidence: Low', 'low');
        return;
    }
    
    const mtta = data.data.mtta || {};
    const mttr = data.data.mttr || {};
    
    if (mttaMedianEl) setTextIfChanged(mttaMedianEl, formatMinutes(mtta.medianMinutes));
    if (mttaP95El) setTextIfChanged(mttaP95El, formatMinutes(mtta.p95Minutes));
    if (mttrMedianEl) setTextIfChanged(mttrMedianEl, formatMinutes(mttr.medianMinutes));
    if (mttrP95El) setTextIfChanged(mttrP95El, formatMinutes(mttr.p95Minutes));
    setConfidenceNote(mttaCard, null);
    setConfidenceNote(mttrCard, null);
}

function renderCustomerTopEntities(data) {
    const container = document.getElementById('customerTopEntities');
    
    if (renderEmptyState(container, data, {
        noEventsMessage: 'No entities',
        noEventsDetail: 'No affected entities reported in this window',
        noVisibilityDetail: data?.message || 'Entity data unavailable'
    })) {
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
    
    setContainerHTML(container, html);
}

function renderCustomerIncidentAging(data) {
    const container = document.getElementById('customerIncidentAging');
    
    if (renderEmptyState(container, data, {
        noEventsMessage: 'No aging events',
        noEventsDetail: 'No aging data reported in this window',
        noVisibilityDetail: data?.message || 'Aging data unavailable'
    })) {
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
    
    setContainerHTML(container, html);
}

// Customer Dashboard Ultimate Metrics
function renderCustomerSeverityTrend(data) {
    const container = document.getElementById('customerSeverityTrend');
    
    if (renderEmptyState(container, data, {
        noEventsMessage: 'No severity events',
        noEventsDetail: 'No severity trend activity reported in this window',
        noVisibilityDetail: data?.message || 'Severity trend unavailable'
    })) {
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
    
    setContainerHTML(container, html);
}

function renderCustomerAlertToIncidentRate(data) {
    const container = document.getElementById('customerAlertToIncidentRate');
    
    if (renderEmptyState(container, data, {
        noEventsMessage: 'No conversions',
        noEventsDetail: 'No alert-to-incident conversions reported in this window',
        noVisibilityDetail: data?.message || 'Alert-to-incident rate unavailable'
    })) {
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
    
    setContainerHTML(container, html);
}

function renderAlertToIncidentRatio(data) {
    const container = document.getElementById('alertToIncidentRatio');

    if (!container) return;

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No conversions',
        noEventsDetail: 'No alert-to-incident activity reported in this window',
        noVisibilityDetail: data?.message || 'Alert-to-incident ratio unavailable'
    })) {
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

    setContainerHTML(container, html);
}

function renderAlertEscalationRate(data) {
    const container = document.getElementById('alertEscalationRate');

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No escalations',
        noEventsDetail: 'No alert escalation activity reported in this window',
        noVisibilityDetail: data?.message || 'Alert escalation rate unavailable'
    })) {
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

    setContainerHTML(container, html);
}

function renderFalsePositiveRate(data) {
    const container = document.getElementById('falsePositiveRate');

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No false positives',
        noEventsDetail: 'No false positives reported in this window',
        noVisibilityDetail: data?.message || 'False positive rate unavailable'
    })) {
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

    setContainerHTML(container, html);
}

function renderBenignPositiveRate(data) {
    const container = document.getElementById('benignPositiveRate');

    if (!container) return;

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No benign positives',
        noEventsDetail: 'No benign positives reported in this window',
        noVisibilityDetail: data?.message || 'Benign positive rate unavailable'
    })) {
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

    setContainerHTML(container, html);
}

function renderAutomationRate(data) {
    const container = document.getElementById('automationRate');

    if (!container) return;

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No automation events',
        noEventsDetail: 'No automation activity reported in this window',
        noVisibilityDetail: data?.message || 'Automation rate unavailable'
    })) {
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

    setContainerHTML(container, html);
}

function renderTruePositiveRate(data) {
    const container = document.getElementById('truePositiveRate');

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No true positives',
        noEventsDetail: 'No true positives reported in this window',
        noVisibilityDetail: data?.message || 'True positive rate unavailable'
    })) {
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

    setContainerHTML(container, html);
}

function renderFalseNegativeRate(data) {
    const container = document.getElementById('falseNegativeRate');

    if (renderEmptyState(container, data, {
        noEventsMessage: 'No false negatives',
        noEventsDetail: 'No false negatives reported in this window',
        noVisibilityDetail: data?.message || 'False negative rate unavailable'
    })) {
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

    setContainerHTML(container, html);
}

function renderCustomerTimeBuckets(data) {
    const container = document.getElementById('customerIncidentTimeBuckets');
    
    if (renderEmptyState(container, data, {
        noEventsMessage: 'No time buckets',
        noEventsDetail: 'No incident timing buckets reported in this window',
        noVisibilityDetail: data?.message || 'Incident time buckets unavailable'
    })) {
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
    
    setContainerHTML(container, html);
}

function renderCustomerTopAlertRules(data) {
    const container = document.getElementById('customerTopAlertRules');
    
    if (renderEmptyState(container, data, {
        noEventsMessage: 'No alert rules',
        noEventsDetail: 'No alert rule activity reported in this window',
        noVisibilityDetail: data?.message || 'Alert rule data unavailable'
    })) {
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
    
    setContainerHTML(container, html);
}

function renderAlertNoiseTrend(data) {
    const container = document.getElementById('alertNoiseTrend');
    
    if (renderEmptyState(container, data, {
        noEventsMessage: 'No alert noise',
        noEventsDetail: 'No alert noise trend reported in this window',
        noVisibilityDetail: data?.message || 'Alert noise data unavailable'
    })) {
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
    
    setContainerHTML(container, html);
}

function renderAlertVolumeComparison(currentData, baselineData) {
    const container = document.getElementById('alertVolumeBaseline');
    if (!container) return;

    const baselineItems = Array.isArray(baselineData?.data) ? baselineData.data : [];
    const currentItems = Array.isArray(currentData?.data) ? currentData.data : [];

    if (baselineItems.length === 0 && currentItems.length === 0) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Alert volume data unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
        return;
    }

    if (baselineItems.length === 0) {
        setContainerHTML(container, createEmptyState('No visibility', 'no-visibility', {
            detail: 'Baseline alert volume unavailable',
            confidence: 'Confidence: Low'
        }), { force: true });
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

    setContainerHTML(container, html);
}
