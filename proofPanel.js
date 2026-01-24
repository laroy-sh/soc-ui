function formatValue(value) {
    if (value == null) {
        return '--';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
}

function buildDefaultFields(event) {
    if (!event) {
        return [];
    }
    return [
        { label: 'Operator', value: event.operator || event.operatorName },
        { label: 'Action', value: event.action || event.type || event.summary },
        { label: 'Resource', value: event.resource || event.resourceName || event.resourceId },
        { label: 'Before', value: event.before },
        { label: 'After', value: event.after },
        { label: 'Source IP', value: event.ip || event.sourceIp },
        { label: 'Geo', value: event.geo || event.sourceGeo },
        { label: 'Result', value: event.result || event.status },
        { label: 'Ticket', value: event.ticketId || (event.ticketLinked === false ? 'Unlinked' : undefined) },
        { label: 'Session', value: event.sessionId || event.correlationId },
        { label: 'Timestamp', value: event.timestamp || event.startTime }
    ].filter((field) => field.value !== undefined);
}

function buildFieldRow(field) {
    const row = document.createElement('div');
    row.className = 'proof-field';

    const label = document.createElement('span');
    label.className = 'proof-label';
    label.textContent = field.label;

    const value = document.createElement('span');
    value.className = 'proof-value';

    if (typeof field.value === 'object') {
        const pre = document.createElement('pre');
        pre.textContent = formatValue(field.value);
        value.appendChild(pre);
    } else {
        value.textContent = formatValue(field.value);
    }

    row.appendChild(label);
    row.appendChild(value);
    return row;
}

export function createProofPanel({ title = 'Proof', event = null, fields = null, onClose } = {}) {
    const shell = document.createElement('div');
    shell.className = 'proof-panel-shell';

    const backdrop = document.createElement('div');
    backdrop.className = 'proof-panel-backdrop';
    backdrop.addEventListener('click', () => {
        shell.close();
        if (typeof onClose === 'function') {
            onClose();
        }
    });

    const panel = document.createElement('aside');
    panel.className = 'proof-panel';

    const header = document.createElement('div');
    header.className = 'proof-header';

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'proof-close';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
        shell.close();
        if (typeof onClose === 'function') {
            onClose();
        }
    });

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'proof-body';

    panel.appendChild(header);
    panel.appendChild(body);
    shell.appendChild(backdrop);
    shell.appendChild(panel);

    shell.setEvent = (nextEvent, nextFields) => {
        const fieldList = nextFields || fields || buildDefaultFields(nextEvent || event);
        body.innerHTML = '';
        fieldList.forEach((field) => body.appendChild(buildFieldRow(field)));
    };

    shell.open = () => {
        shell.classList.add('proof-panel-shell--open');
    };

    shell.close = () => {
        shell.classList.remove('proof-panel-shell--open');
    };

    shell.setEvent(event, fields);
    return shell;
}
