const STATUS_CLASSES = {
    neutral: 'kpi-status-neutral',
    low: 'kpi-status-low',
    medium: 'kpi-status-medium',
    high: 'kpi-status-high',
    critical: 'kpi-status-critical',
    success: 'kpi-status-success',
    warning: 'kpi-status-warning',
    danger: 'kpi-status-danger'
};

function buildStatusBadge(status, labelOverride) {
    if (!status || status === 'none') {
        return null;
    }
    const badge = document.createElement('span');
    badge.className = `kpi-status ${STATUS_CLASSES[status] || STATUS_CLASSES.neutral}`;
    badge.textContent = labelOverride || status.replace(/-/g, ' ');
    return badge;
}

function applyInteractiveStyles(node, onClick, href) {
    if (typeof onClick !== 'function' && !href) {
        return;
    }
    node.classList.add('kpi-tile--interactive');
    node.setAttribute('role', 'button');
    node.tabIndex = 0;
    if (href) {
        node.dataset.href = href;
    }
    node.addEventListener('click', (event) => {
        if (href) {
            window.location.hash = href;
        }
        if (typeof onClick === 'function') {
            onClick(event);
        }
    });
    node.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            node.click();
        }
    });
}

export function createKpiTile({
    value,
    label,
    status = 'neutral',
    statusLabel,
    helper,
    onClick,
    href
}) {
    const tile = document.createElement('div');
    tile.className = 'kpi-tile';
    tile.dataset.status = status;

    const header = document.createElement('div');
    header.className = 'kpi-header';

    const labelEl = document.createElement('span');
    labelEl.className = 'kpi-label';
    labelEl.textContent = label || '';
    header.appendChild(labelEl);

    const badge = buildStatusBadge(status, statusLabel);
    if (badge) {
        header.appendChild(badge);
    }

    const valueEl = document.createElement('div');
    valueEl.className = 'kpi-value';
    valueEl.textContent = value ?? '--';

    tile.appendChild(header);
    tile.appendChild(valueEl);

    if (helper) {
        const helperEl = document.createElement('div');
        helperEl.className = 'kpi-helper';
        helperEl.textContent = helper;
        tile.appendChild(helperEl);
    }

    applyInteractiveStyles(tile, onClick, href);
    return tile;
}
