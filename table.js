const BADGE_CLASSES = {
    risk: 'table-badge-risk',
    'no-ticket': 'table-badge-no-ticket',
    success: 'table-badge-success',
    fail: 'table-badge-fail',
    warning: 'table-badge-warning'
};

function createBadge({ type, label }) {
    const badge = document.createElement('span');
    badge.className = `table-badge ${BADGE_CLASSES[type] || ''}`;
    badge.textContent = label || type;
    return badge;
}

function getSortableValue(value) {
    if (value == null) {
        return '';
    }
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
        return Number.isNaN(parsed) ? value.toLowerCase() : parsed;
    }
    if (typeof value === 'object') {
        if (value.sortValue !== undefined) {
            return value.sortValue;
        }
        if (value.label !== undefined) {
            return value.label.toLowerCase();
        }
        if (value.value !== undefined) {
            return getSortableValue(value.value);
        }
    }
    return value;
}

function renderCellValue(value, column) {
    if (column && typeof column.render === 'function') {
        return column.render(value);
    }
    if (value && typeof value === 'object' && value.badge) {
        return createBadge({
            type: value.badge,
            label: value.label || value.value || value.badge
        });
    }
    if (value instanceof Node) {
        return value;
    }
    const span = document.createElement('span');
    span.textContent = value ?? '--';
    return span;
}

function setSortIndicator(th, direction) {
    const indicator = th.querySelector('.sort-indicator');
    if (!indicator) {
        return;
    }
    if (!direction) {
        indicator.textContent = '';
        return;
    }
    indicator.textContent = direction === 'asc' ? '▲' : '▼';
}

export function createSortableTable({
    columns = [],
    rows = [],
    onRowClick,
    initialSort = null
}) {
    const table = document.createElement('table');
    table.className = 'data-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const tbody = document.createElement('tbody');

    const sortState = {
        key: initialSort?.key || null,
        direction: initialSort?.direction || 'asc'
    };

    const originalRows = rows.map((row, index) => ({
        row,
        index
    }));

    function sortRows(data) {
        if (!sortState.key) {
            return data;
        }
        const column = columns.find((col) => col.key === sortState.key);
        const direction = sortState.direction === 'asc' ? 1 : -1;

        return [...data].sort((a, b) => {
            const aVal = getSortableValue(a.row[sortState.key]);
            const bVal = getSortableValue(b.row[sortState.key]);
            if (aVal === bVal) {
                return a.index - b.index;
            }
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return (aVal - bVal) * direction;
            }
            return String(aVal).localeCompare(String(bVal)) * direction;
        });
    }

    function renderBody() {
        tbody.innerHTML = '';
        const sorted = sortRows(originalRows);
        sorted.forEach(({ row }) => {
            const tr = document.createElement('tr');
            if (typeof onRowClick === 'function') {
                tr.classList.add('table-row--clickable');
                tr.addEventListener('click', () => onRowClick(row));
            }
            columns.forEach((column) => {
                const td = document.createElement('td');
                if (column.numeric) {
                    td.classList.add('cell-numeric');
                }
                const rendered = renderCellValue(row[column.key], column);
                td.appendChild(rendered);
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    columns.forEach((column) => {
        const th = document.createElement('th');
        th.textContent = column.label || column.key;
        th.dataset.key = column.key;
        if (column.numeric) {
            th.classList.add('cell-numeric');
        }
        if (column.sortable !== false) {
            th.classList.add('sortable');
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            th.appendChild(indicator);
            th.addEventListener('click', () => {
                if (sortState.key === column.key) {
                    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    sortState.key = column.key;
                    sortState.direction = 'asc';
                }
                headerRow.querySelectorAll('th').forEach((header) => setSortIndicator(header, null));
                setSortIndicator(th, sortState.direction);
                renderBody();
            });
        }
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);

    if (sortState.key) {
        const active = headerRow.querySelector(`th[data-key="${sortState.key}"]`);
        if (active) {
            setSortIndicator(active, sortState.direction);
        }
    }

    renderBody();
    return table;
}
