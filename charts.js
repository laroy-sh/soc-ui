const SEVERITY_COLORS = {
    low: '#22d3ee',
    medium: '#fbbf24',
    high: '#fb7185',
    critical: '#f87171'
};

const GRID_COLOR = 'rgba(148, 163, 184, 0.22)';

function createSvg(width, height, className) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', `${width}`);
    svg.setAttribute('height', `${height}`);
    if (className) {
        svg.setAttribute('class', className);
    }
    return svg;
}

function buildBucketsFromEvents(events, bucketCount = 8) {
    if (!events || events.length === 0) {
        return [];
    }
    const times = events
        .map((event) => Date.parse(event.timestamp))
        .filter((value) => !Number.isNaN(value));
    const min = Math.min(...times);
    const max = Math.max(...times);
    const range = Math.max(max - min, 1);
    const bucketSize = range / bucketCount;

    const buckets = Array.from({ length: bucketCount }, (_, index) => {
        const start = min + bucketSize * index;
        const end = start + bucketSize;
        return {
            index,
            start,
            end,
            label: new Date(start).toISOString().slice(5, 10),
            counts: { low: 0, medium: 0, high: 0, critical: 0 }
        };
    });

    events.forEach((event) => {
        const time = Date.parse(event.timestamp);
        if (Number.isNaN(time)) {
            return;
        }
        const bucketIndex = Math.min(
            buckets.length - 1,
            Math.max(0, Math.floor((time - min) / bucketSize))
        );
        const severity = event.severity || 'low';
        const bucket = buckets[bucketIndex];
        if (bucket && bucket.counts[severity] !== undefined) {
            bucket.counts[severity] += 1;
        }
    });

    return buckets;
}

export function createStackedTimelineChart({
    events = [],
    buckets = null,
    width = 640,
    height = 180,
    onSelect
}) {
    const chartBuckets = buckets && buckets.length > 0 ? buckets : buildBucketsFromEvents(events);
    const svg = createSvg(width, height, 'timeline-chart');
    const padding = { top: 20, right: 16, bottom: 30, left: 24 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const barWidth = chartBuckets.length > 0 ? innerWidth / chartBuckets.length : innerWidth;

    const maxTotal = Math.max(
        1,
        ...chartBuckets.map((bucket) =>
            Object.values(bucket.counts || {}).reduce((sum, value) => sum + value, 0)
        )
    );

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i += 1) {
        const y = padding.top + innerHeight - (innerHeight / gridLines) * i;
        const line = document.createElementNS(svg.namespaceURI, 'line');
        line.setAttribute('x1', `${padding.left}`);
        line.setAttribute('x2', `${width - padding.right}`);
        line.setAttribute('y1', `${y}`);
        line.setAttribute('y2', `${y}`);
        line.setAttribute('stroke', GRID_COLOR);
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);
    }

    chartBuckets.forEach((bucket, index) => {
        const x = padding.left + index * barWidth;
        let yOffset = padding.top + innerHeight;
        const order = ['low', 'medium', 'high', 'critical'];
        order.forEach((severity) => {
            const value = bucket.counts?.[severity] || 0;
            if (value === 0) {
                return;
            }
            const barHeight = (value / maxTotal) * innerHeight;
            yOffset -= barHeight;
            const rect = document.createElementNS(svg.namespaceURI, 'rect');
            rect.setAttribute('x', `${x + 4}`);
            rect.setAttribute('y', `${yOffset}`);
            rect.setAttribute('width', `${Math.max(barWidth - 8, 6)}`);
            rect.setAttribute('height', `${barHeight}`);
            rect.setAttribute('rx', '3');
            rect.setAttribute('fill', SEVERITY_COLORS[severity] || '#94a3b8');
            rect.classList.add('timeline-bar');
            rect.addEventListener('click', () => {
                if (typeof onSelect === 'function') {
                    onSelect({
                        bucket,
                        severity,
                        value
                    });
                }
            });
            svg.appendChild(rect);
        });

        const label = document.createElementNS(svg.namespaceURI, 'text');
        label.setAttribute('x', `${x + barWidth / 2}`);
        label.setAttribute('y', `${height - 10}`);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', 'chart-label');
        label.textContent = bucket.label || `B${index + 1}`;
        svg.appendChild(label);

        const overlay = document.createElementNS(svg.namespaceURI, 'rect');
        overlay.setAttribute('x', `${x}`);
        overlay.setAttribute('y', `${padding.top}`);
        overlay.setAttribute('width', `${barWidth}`);
        overlay.setAttribute('height', `${innerHeight}`);
        overlay.setAttribute('fill', 'transparent');
        overlay.classList.add('timeline-overlay');
        overlay.addEventListener('click', () => {
            if (typeof onSelect === 'function') {
                onSelect({
                    bucket,
                    severity: null,
                    value: Object.values(bucket.counts || {}).reduce((sum, val) => sum + val, 0)
                });
            }
        });
        svg.appendChild(overlay);
    });

    return svg;
}

export function createHeatmap({
    data = [],
    width = 520,
    height = 140,
    onSelect
}) {
    const svg = createSvg(width, height, 'heatmap-chart');
    const padding = { top: 16, right: 16, bottom: 24, left: 30 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const cols = 24;
    const rows = 7;
    const cellWidth = innerWidth / cols;
    const cellHeight = innerHeight / rows;

    const maxValue = Math.max(1, ...data.map((item) => item.count || 0));

    const getIntensity = (value) => {
        const ratio = Math.min(value / maxValue, 1);
        const alpha = 0.15 + ratio * 0.7;
        return `rgba(56, 189, 248, ${alpha})`;
    };

    for (let hour = 0; hour < cols; hour += 1) {
        const label = document.createElementNS(svg.namespaceURI, 'text');
        label.setAttribute('x', `${padding.left + hour * cellWidth + cellWidth / 2}`);
        label.setAttribute('y', `${height - 8}`);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', 'chart-label');
        if (hour % 3 === 0) {
            label.textContent = `${hour}`;
        }
        svg.appendChild(label);
    }

    const byKey = new Map();
    data.forEach((item) => {
        const day = item.day ?? 0;
        const hour = item.hour ?? 0;
        byKey.set(`${day}-${hour}`, item);
    });

    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const key = `${row}-${col}`;
            const entry = byKey.get(key) || { day: row, hour: col, count: 0 };
            const rect = document.createElementNS(svg.namespaceURI, 'rect');
            rect.setAttribute('x', `${padding.left + col * cellWidth}`);
            rect.setAttribute('y', `${padding.top + row * cellHeight}`);
            rect.setAttribute('width', `${Math.max(cellWidth - 2, 6)}`);
            rect.setAttribute('height', `${Math.max(cellHeight - 2, 6)}`);
            rect.setAttribute('rx', '3');
            rect.setAttribute('fill', getIntensity(entry.count || 0));
            rect.setAttribute('stroke', entry.risky ? '#f87171' : 'rgba(148, 163, 184, 0.3)');
            rect.setAttribute('stroke-width', entry.risky ? '2' : '1');
            rect.classList.add('heatmap-cell');
            rect.addEventListener('click', () => {
                if (typeof onSelect === 'function') {
                    onSelect(entry);
                }
            });
            svg.appendChild(rect);
        }
    }

    return svg;
}

export function createSparkline({
    points = [],
    width = 120,
    height = 32,
    stroke = '#38bdf8',
    fill = 'rgba(56, 189, 248, 0.2)'
}) {
    const svg = createSvg(width, height, 'sparkline-chart');
    if (!points || points.length === 0) {
        return svg;
    }
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = Math.max(max - min, 1);
    const step = width / (points.length - 1 || 1);

    const linePoints = points.map((value, index) => {
        const x = index * step;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
    });

    const area = document.createElementNS(svg.namespaceURI, 'path');
    area.setAttribute('d', `M 0 ${height} L ${linePoints.join(' ')} L ${width} ${height} Z`);
    area.setAttribute('fill', fill);
    svg.appendChild(area);

    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', `M ${linePoints.join(' L ')}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', '2');
    svg.appendChild(path);

    return svg;
}
