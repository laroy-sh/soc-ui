# MBCTG - SOC & ROC Dashboard

A read-only web UI for visualizing Security Operations Center (SOC) and Risk Operations Center (ROC) metrics from Microsoft Sentinel.

## Overview

This dashboard provides real-time visibility into security operations, displaying pre-aggregated metrics extracted from Microsoft Sentinel. The application reads JSON files directly from storage without any backend or API layer.

## Features

### SOC Dashboards

#### 1. **SOC Analyst Dashboard** (Default)
Primary question: "What do I need to work on right now?"

- Open incidents by severity and status
- New incidents (15m and 60m windows)
- Active alerts by severity
- Incident aging buckets
- Top affected entities

#### 2. **SOC Lead Dashboard**
Primary question: "Is the SOC keeping up?"

- Mean Time to Acknowledge (MTTA) - median and P95
- Mean Time to Resolve (MTTR) - median and P95
- Incident inflow trends (24h)
- Incident closure rate (24h)
- Rule firing volume (top rules)

#### 3. **Telemetry Health Dashboard**
Primary question: "Is Sentinel healthy?"

- Ingestion volume by table (24h)
- Detection coverage (critical assets + telemetry sources)
- Storage tier distribution (hot vs cost-effective)
- Tables with zero ingestion (alerts)

#### 4. **Customer Dashboard**
Customer-facing visibility with pre-filtered data

- Incidents by severity (customer-scoped)

### ROC Dashboard

Risk operations visibility with limited initial implementation:

- **Implemented**: Repeated detections from Sentinel
- **Placeholders**: Business risk posture, control effectiveness, financial exposure

Placeholder metrics are clearly marked as "Planned" and show appropriate empty states.

## Architecture

### Data Flow

```
Microsoft Sentinel 
    → KQL Scheduled Queries (5-15 min)
    → Azure Storage (JSON blobs)
    → Direct Read by Frontend
    → Dashboard Visualization
```

### Design Principles

- **No client-side computation**: UI only renders what's in the JSON files
- **No data joining**: Each widget binds to exactly one JSON file
- **Explicit empty states**: Missing data shows clear messaging, never zeros
- **Semantic fidelity**: Metrics retain their Sentinel meaning
- **Fast and minimal**: Low cognitive load, consistent severity colors

## Data Contract

### File Naming Convention

```
<metricName>.<window>.json
```

Examples:
- `openIncidentsBySeverity.latest.json`
- `incidentInflow.24h.json`
- `repeatedDetections.7d.json`

### Common Fields

All JSON files include:
- `metricName`: Identifier for the metric
- `generatedAt`: ISO 8601 timestamp (UTC)
- `windowStart` / `windowEnd`: Time window (if applicable)
- `data`: Array or object containing the metric values

### Not Implemented Metrics

Files marked as not implemented return:
```json
{
  "metricName": "businessRiskPosture",
  "status": "not_implemented",
  "message": "Business risk metrics require external data sources..."
}
```

## Installation & Usage

### Local Development

1. **Clone or download** this repository

2. **Ensure the demo dataset is in place**:
   ```
   SOC UI/
   ├── index.html
   ├── styles.css
   ├── app.js
   └── soc_demo_dataset/
       ├── openIncidentsBySeverity.latest.json
       ├── newIncidents.latest.json
       └── ...
   ```

3. **Serve the application** using any static web server:

   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Python 2
   python -m SimpleHTTPServer 8000
   
   # Using Node.js
   npx http-server -p 8000
   
   # Using PHP
   php -S localhost:8000
   ```

4. **Open in browser**: http://localhost:8000

### Production Deployment

#### Azure Static Web Apps

```bash
# Build (no build step required - static files only)
# Deploy
az staticwebapp create \
  --name mbctg-soc-dashboard \
  --resource-group <resource-group> \
  --source . \
  --location <location>
```

#### Azure Blob Storage Static Website

```bash
# Enable static website hosting
az storage blob service-properties update \
  --account-name <storage-account> \
  --static-website \
  --index-document index.html

# Upload files
az storage blob upload-batch \
  --account-name <storage-account> \
  --destination '$web' \
  --source .
```

## Configuration

Update the data path in [app.js](app.js) if your JSON files are hosted elsewhere:

```javascript
const CONFIG = {
    dataPath: './soc_demo_dataset/',  // Change this path
    refreshInterval: 60000             // Refresh interval in ms
};
```

### Connecting to Azure Blob Storage

To read directly from Azure Blob Storage:

1. Make your container publicly accessible (or use SAS tokens)
2. Update the `dataPath` to your blob URL:

```javascript
const CONFIG = {
    dataPath: 'https://<account>.blob.core.windows.net/<container>/',
    refreshInterval: 60000
};
```

## File Structure

```
SOC UI/
├── index.html              # Main HTML structure
├── styles.css              # All styling and layouts
├── app.js                  # Data loading and rendering logic
├── README.md               # This file
└── soc_demo_dataset/       # Demo data (JSON files)
    ├── activeAlertsBySeverity.latest.json
    ├── businessRiskPosture.latest.json
    ├── customer_incidentsBySeverity.latest.json
    ├── incidentAging.latest.json
    ├── incidentClosureRate.24h.json
    ├── detectionCoverage.latest.json
    ├── incidentDetectionTimings.latest.json
    ├── incidentInflow.24h.json
    ├── incidentTimings.latest.json
    ├── ingestionVolumeByTable.24h.json
    ├── newIncidents.latest.json
    ├── openIncidentsBySeverity.latest.json
    ├── openIncidentsByStatus.latest.json
    ├── repeatedDetections.7d.json
    ├── ruleFiringVolume.24h.json
    ├── topEntities.latest.json
    └── zeroIngestionTables.latest.json
```

## Severity and Status Color Coding

### Severity Levels
- **Critical**: Dark Red (#d13438)
- **High**: Red (#e81123)
- **Medium**: Orange (#f7630c)
- **Low**: Light Orange (#ffaa44)
- **Informational**: Blue (#0078d4)

### Status
- **New**: Blue (#0078d4)
- **Active**: Green (#107c10)
- **Investigating**: Orange (#f7630c)
- **Closed**: Gray (#605e5c)

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Modern browsers with ES6+ support required.

## Empty State Handling

The UI handles three types of empty states:

1. **Missing file**: Shows "No data available"
2. **Not implemented metric**: Shows custom message from JSON
3. **Empty data array**: Shows "No data available"

Example empty state rendering:
```javascript
// In JSON
{
  "status": "not_implemented",
  "message": "Business risk metrics require external data sources"
}

// Renders as
┌─────────────────────────────────┐
│ Not implemented                 │
│ This metric will be available   │
│ in a future release             │
└─────────────────────────────────┘
```

## Switching from Demo to Production

The UI is designed to work with both demo data and real Sentinel output without code changes:

1. Ensure your production JSON files follow the same contract
2. Update `CONFIG.dataPath` to point to your production storage
3. Redeploy

No other changes needed.

## Auto-Refresh

The dashboard automatically refreshes every 60 seconds (configurable). This aligns with typical Sentinel query schedules (5-15 minutes).

To change the refresh interval:

```javascript
const CONFIG = {
    dataPath: './soc_demo_dataset/',
    refreshInterval: 300000  // 5 minutes
};
```

## Troubleshooting

### Dashboard shows "No data available"

1. Check browser console for network errors
2. Verify JSON files exist in the data path
3. Check CORS settings if loading from external storage
4. Verify JSON files are valid JSON format

### Data not updating

1. Check that files are being refreshed in storage
2. Verify auto-refresh is working (check console)
3. Clear browser cache
4. Check `generatedAt` timestamp in JSON files

### Styling issues

1. Ensure [styles.css](styles.css) is loading (check Network tab)
2. Check for CSS conflicts with other stylesheets
3. Verify browser compatibility

## Security Considerations

### Production Deployment

- Deploy behind authentication (Azure AD, WAF, etc.)
- Use SAS tokens for blob storage access
- Enable HTTPS only
- Implement CSP headers
- Monitor access logs

### Data Sensitivity

This dashboard displays operational security metrics. Ensure:

- Proper access controls are in place
- Data is scoped appropriately (customer separation)
- Audit logging is enabled
- Compliance requirements are met

## Customization

### Adding New Metrics

1. Create JSON file following the contract
2. Add fetch call in `loadAllData()`
3. Create rendering function
4. Add HTML container in appropriate dashboard
5. Call rendering function with fetched data

Example:
```javascript
// 1. Fetch
const newMetric = await fetchMetric('newMetric.latest.json');

// 2. Render
function renderNewMetric(data) {
    const container = document.getElementById('newMetric');
    if (!data || !data.data) {
        container.innerHTML = createEmptyState('No data');
        return;
    }
    // ... rendering logic
}

// 3. Call
renderNewMetric(newMetric);
```

### Changing Layout

Grid layout is defined in [styles.css](styles.css):

```css
.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);  /* 3 columns */
    gap: var(--spacing-lg);
}

.card-span-2 {
    grid-column: span 2;  /* Card spans 2 columns */
}
```

## Performance

- Initial load: ~200ms (local)
- Refresh: ~100ms (incremental updates)
- Memory: ~15MB
- No client-side aggregation or heavy computation

## License

Internal use - MBCTG. All rights reserved.

## Support

For issues or questions, contact the SOC team or security operations.

---

**Version**: 1.0.0  
**Last Updated**: January 19, 2026  
**Data Source**: Microsoft Sentinel  
**Maintained by**: MBCTG Security Operations Team
