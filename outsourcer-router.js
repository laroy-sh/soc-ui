import { buildHomeView } from './pages/home.js';
import { buildPrivilegedView } from './pages/privileged.js';
import { buildChangeLedgerView } from './pages/changeLedger.js';
import { buildMonitoringIntegrityView } from './pages/monitoringIntegrity.js';
import { buildUebaView } from './pages/ueba.js';
import { buildBlastRadiusView } from './pages/blastRadius.js';
import { buildEvidenceExportView } from './pages/evidenceExport.js';
import { buildOperatorTimelineDrilldown } from './js/drilldowns/operatorTimeline.js';
import { buildResourceImpactDrilldown } from './js/drilldowns/resourceImpact.js';
import { buildNoTicketDrilldown } from './js/drilldowns/noTicket.js';
import { buildProviderVsInternalDrilldown } from './js/drilldowns/providerVsInternal.js';

const drilldownTargets = [
    {
        path: '/drilldown/operator-timeline',
        title: 'Operator Timeline',
        description: 'Session chain, identity context, and privileged sequence.'
    },
    {
        path: '/drilldown/resource-impact',
        title: 'Resource Impact',
        description: 'What changed, who approved, and blast radius by asset.'
    },
    {
        path: '/drilldown/no-ticket',
        title: 'No Ticket',
        description: 'Privileged actions missing ticket linkage.'
    },
    {
        path: '/drilldown/provider-vs-internal',
        title: 'Provider vs Internal',
        description: 'Overlap and conflicts across control planes.'
    }
];

const routes = {
    '/home': {
        title: 'Outsourcer Oversight SOC Dashboard',
        subtitle: 'Identity-first monitoring of outsourced privileged behavior.',
        content: () => buildHomeView()
    },
    '/privileged': {
        title: 'Privileged Access',
        subtitle: 'Monitor outsourced privileged behavior and deviations from baseline.',
        content: () => buildPrivilegedView()
    },
    '/change-ledger': {
        title: 'Change Ledger',
        subtitle: 'Security-impacting changes and loss-of-control signals.',
        content: () => buildChangeLedgerView()
    },
    '/monitoring-integrity': {
        title: 'Monitoring Integrity',
        subtitle: 'Audit plane continuity and provider telemetry gaps.',
        content: () => buildMonitoringIntegrityView()
    },
    '/ueba': {
        title: 'UEBA',
        subtitle: 'Operator-centric anomaly patterns across providers.',
        content: () => buildUebaView()
    },
    '/blast-radius': {
        title: 'Blast Radius',
        subtitle: 'Control drift and impact surface of provider actions.',
        content: () => buildBlastRadiusView()
    },
    '/evidence-export': {
        title: 'Evidence Export',
        subtitle: 'Curated audit-ready extracts and verification trails.',
        content: () => buildEvidenceExportView()
    },
    '/drilldown/operator-timeline': {
        title: 'Drilldown: Operator Timeline',
        subtitle: 'Sequence of privileged actions by operator/technician.',
        content: () => buildOperatorTimelineDrilldown()
    },
    '/drilldown/resource-impact': {
        title: 'Drilldown: Resource Impact',
        subtitle: 'Impacted resources and blast radius by change set.',
        content: () => buildResourceImpactDrilldown()
    },
    '/drilldown/no-ticket': {
        title: 'Drilldown: No Ticket',
        subtitle: 'Unlinked privileged actions requiring escalation.',
        content: () => buildNoTicketDrilldown()
    },
    '/drilldown/provider-vs-internal': {
        title: 'Drilldown: Provider vs Internal',
        subtitle: 'Overlap between provider operations and internal controls.',
        content: () => buildProviderVsInternalDrilldown()
    }
};

function buildStandardContent(sectionTitle) {
    return `
        <div class="route-header">
            <h3>${sectionTitle}</h3>
            <span class="route-pill">Risk delta</span>
        </div>
        <div class="route-grid">
            ${drilldownTargets
                .map(
                    (target) => `
                        <a class="tile" href="#${target.path}">
                            <span class="tile-title">${target.title}</span>
                            <span class="tile-meta">${target.description}</span>
                            <span class="tile-meta">Click to drill down</span>
                        </a>
                    `
                )
                .join('')}
        </div>
        <div class="table-card">
            <div class="table-row">
                <strong>Operator</strong>
                <strong>Provider Team</strong>
                <strong>Risk Delta</strong>
                <strong>Route</strong>
            </div>
            ${drilldownTargets
                .map(
                    (target) => `
                        <div class="table-row">
                            <a href="#${target.path}">${target.title}</a>
                            <span>Tier 2 ops</span>
                            <span>+18%</span>
                            <a href="#${target.path}">Open</a>
                        </div>
                    `
                )
                .join('')}
        </div>
    `;
}

function getRouteFromHash() {
    const rawHash = window.location.hash || '#/home';
    const cleaned = rawHash.replace(/^#/, '');
    if (cleaned === '' || cleaned === '/') {
        return '/home';
    }
    return cleaned;
}

function updateNavActive(routePath) {
    document.querySelectorAll('.nav-link').forEach((link) => {
        link.classList.toggle('active', link.dataset.route === routePath);
    });
}

function renderRoute(routePath) {
    const route = routes[routePath] || routes['/home'];
    const view = document.getElementById('routeView');
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitle');

    if (titleEl) {
        titleEl.textContent = route.title;
    }
    if (subtitleEl) {
        subtitleEl.textContent = route.subtitle;
    }

    if (view) {
        const content = route.content();
        if (typeof content === 'string') {
            view.innerHTML = content;
        } else if (content instanceof Node) {
            view.innerHTML = '';
            view.appendChild(content);
        } else {
            view.innerHTML = '';
        }
    }

    updateNavActive(routePath in routes ? routePath : '/home');
}

export function initRouter() {
    if (!window.location.hash) {
        window.location.hash = '#/home';
    }
    renderRoute(getRouteFromHash());
    window.addEventListener('hashchange', () => {
        renderRoute(getRouteFromHash());
    });
}
