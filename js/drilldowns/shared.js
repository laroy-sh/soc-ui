import { mockNow, operators } from '../../mockData.js';

const TIME_RANGE_MS = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
};

const SEVERITY_ORDER = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
};

const operatorById = new Map(operators.map((operator) => [operator.id, operator]));

export function getOperatorById(id) {
    return operatorById.get(id) || null;
}

export function getOperatorLabel(operator) {
    if (!operator) {
        return '--';
    }
    return operator.name || operator.technician || operator.id;
}

export function getNowMs() {
    const parsed = Date.parse(mockNow);
    return Number.isNaN(parsed) ? Date.now() : parsed;
}

export function getTimeRange(filters) {
    const rangeMs = TIME_RANGE_MS[filters?.timeRange] || TIME_RANGE_MS['7d'];
    const end = getNowMs();
    return {
        start: end - rangeMs,
        end
    };
}

export function formatDateTime(timestamp) {
    if (!timestamp) {
        return '--';
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return '--';
    }
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatDate(timestamp) {
    if (!timestamp) {
        return '--';
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return '--';
    }
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

export function formatRangeLabel(start, end) {
    if (!start || !end) {
        return '--';
    }
    return `${formatDate(start)} - ${formatDate(end)}`;
}

export function formatSeverity(severity) {
    if (!severity) {
        return '--';
    }
    return severity.replace(/(^|-|_)+\w/g, (match) => match.replace(/[-_]/g, '').toUpperCase());
}

export function severityRank(severity) {
    return SEVERITY_ORDER[severity] || 0;
}

export function compareSeverityDesc(a, b) {
    return severityRank(b) - severityRank(a);
}

export function getQueryParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
}

export function setQueryParam(key, value) {
    const url = new URL(window.location.href);
    if (value == null || value === '') {
        url.searchParams.delete(key);
    } else {
        url.searchParams.set(key, value);
    }
    history.replaceState({}, '', url);
}

export function buildChip(label, isButton = false) {
    const chip = document.createElement(isButton ? 'button' : 'span');
    if (isButton) {
        chip.type = 'button';
    }
    chip.className = `control-chip${isButton ? ' control-chip--button' : ''}`;
    chip.textContent = label;
    return chip;
}

function copyToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        resolve();
    });
}

export function buildDrilldownHeader({ title, subtitle, onExport } = {}) {
    const header = document.createElement('div');
    header.className = 'drilldown-header';

    const intro = document.createElement('div');
    intro.className = 'drilldown-intro';
    const heading = document.createElement('h3');
    heading.textContent = title || 'Drilldown';
    const sub = document.createElement('p');
    sub.textContent = subtitle || 'Audit-ready drilldown view.';
    intro.appendChild(heading);
    intro.appendChild(sub);

    const actions = document.createElement('div');
    actions.className = 'drilldown-actions';

    const back = buildChip('Back', true);
    back.addEventListener('click', () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.hash = '#/home';
        }
    });

    const copy = buildChip('Copy link', true);
    copy.addEventListener('click', async () => {
        try {
            await copyToClipboard(window.location.href);
            copy.textContent = 'Copied';
            setTimeout(() => {
                copy.textContent = 'Copy link';
            }, 1200);
        } catch (error) {
            copy.textContent = 'Copy failed';
            setTimeout(() => {
                copy.textContent = 'Copy link';
            }, 1400);
        }
    });

    const exportBtn = buildChip('Export', true);
    exportBtn.addEventListener('click', () => {
        if (typeof onExport === 'function') {
            onExport();
        }
    });

    actions.appendChild(back);
    actions.appendChild(copy);
    actions.appendChild(exportBtn);

    header.appendChild(intro);
    header.appendChild(actions);
    return header;
}

export function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function buildSelectField({ id, label, options, value, onChange }) {
    const wrapper = document.createElement('label');
    wrapper.className = 'drilldown-select';
    const text = document.createElement('span');
    text.textContent = label;
    const select = document.createElement('select');
    select.id = id;

    options.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        if (option.value === value) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });

    if (typeof onChange === 'function') {
        select.addEventListener('change', (event) => onChange(event.target.value));
    }

    wrapper.appendChild(text);
    wrapper.appendChild(select);
    return wrapper;
}

export function buildEmptyState(title, detail) {
    const empty = document.createElement('div');
    empty.className = 'drilldown-empty';
    const heading = document.createElement('strong');
    heading.textContent = title || 'No results';
    const body = document.createElement('p');
    body.textContent = detail || 'No data matched the current selection.';
    empty.appendChild(heading);
    empty.appendChild(body);
    return empty;
}

export function filterByWindow(itemTimestamp, window) {
    if (!window || window.start == null || window.end == null) {
        return true;
    }
    const time = Date.parse(itemTimestamp);
    if (Number.isNaN(time)) {
        return false;
    }
    return time >= window.start && time <= window.end;
}

export function getBadgeForSeverity(severity) {
    if (!severity) {
        return { badge: 'success', label: 'Low' };
    }
    if (severity === 'low') {
        return { badge: 'success', label: 'Low', sortValue: 1 };
    }
    if (severity === 'medium') {
        return { badge: 'warning', label: 'Medium', sortValue: 2 };
    }
    if (severity === 'high') {
        return { badge: 'risk', label: 'High', sortValue: 3 };
    }
    if (severity === 'critical') {
        return { badge: 'risk', label: 'Critical', sortValue: 4 };
    }
    return { badge: 'risk', label: formatSeverity(severity), sortValue: 0 };
}

export function formatList(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return '--';
    }
    return values.join(', ');
}

export function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export function buildPill(label) {
    const pill = document.createElement('span');
    pill.className = 'drilldown-pill';
    pill.textContent = label;
    return pill;
}

export function buildSectionHeader(title, subtitle, metaNodes = []) {
    const header = document.createElement('div');
    header.className = 'drilldown-section-header';
    const text = document.createElement('div');
    const heading = document.createElement('h4');
    heading.textContent = title;
    text.appendChild(heading);
    if (subtitle) {
        const detail = document.createElement('p');
        detail.textContent = subtitle;
        text.appendChild(detail);
    }
    header.appendChild(text);
    if (metaNodes && metaNodes.length) {
        const meta = document.createElement('div');
        meta.className = 'drilldown-section-meta';
        metaNodes.forEach((node) => meta.appendChild(node));
        header.appendChild(meta);
    }
    return header;
}

export { operatorById };
