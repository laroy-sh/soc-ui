# MBCTG - SOC & ROC Dashboard

A read-only web UI for visualizing Security Operations Center (SOC) and Risk Operations Center (ROC) metrics from Microsoft Sentinel. Demo site: https://soc-ui-ejc.pages.dev

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

## Quickstart

1. Ensure `soc_demo_dataset/` exists next to `index.html`.
2. Serve the folder from `SOC UI/`:
   ```bash
   python3 -m http.server 8000
   ```
3. Open http://localhost:8000

To point at Azure Storage, update `CONFIG.dataPath` in `app.js`.
Testing checklist and project recap are in `CHANGELOG.md`.

## Deployment

### Deployment Options

This guide covers three options:
1. Azure Static Web Apps (recommended)
2. Azure Blob Storage Static Website
3. Azure App Service

### Option 1: Azure Static Web Apps (Recommended)

#### Advantages
- Built-in HTTPS and global CDN
- Easy Azure AD integration
- Free tier available
- Automatic SSL certificates
- Staging environments

#### Prerequisites
```bash
az extension add --name staticwebapp
```

#### Deployment Steps

1. Create Static Web App
```bash
# Set variables
RESOURCE_GROUP="rg-soc-dashboard"
LOCATION="eastus"
APP_NAME="mbctg-soc-dashboard"

# Create resource group (if needed)
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create static web app
az staticwebapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Free
```

2. Get deployment token
```bash
TOKEN=$(az staticwebapp secrets list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.apiKey" -o tsv)

echo $TOKEN
```

3. Deploy files
```bash
# Install Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Deploy
cd "/Users/laroy/Project/SOC UI"
swa deploy \
  --deployment-token $TOKEN \
  --app-location . \
  --output-location .
```

4. Configure custom domain (optional)
```bash
az staticwebapp hostname set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname soc.yourdomain.com
```

5. Configure authentication
Enable Azure AD in the Azure Portal:
- Navigate to your Static Web App
- Go to Configuration -> Authentication
- Add Azure AD provider
- Configure allowed users and groups

### Option 2: Azure Blob Storage Static Website

#### Advantages
- Lowest cost
- Simple setup
- High availability
- Requires separate auth solution

#### Deployment Steps

1. Create storage account
```bash
RESOURCE_GROUP="rg-soc-dashboard"
LOCATION="eastus"
STORAGE_ACCOUNT="mbctgsoc$(date +%s)"  # Must be globally unique

az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2
```

2. Enable static website
```bash
az storage blob service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --static-website \
  --404-document 404.html \
  --index-document index.html
```

3. Upload files
```bash
CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query connectionString -o tsv)

cd "/Users/laroy/Project/SOC UI"
az storage blob upload-batch \
  --account-name $STORAGE_ACCOUNT \
  --auth-mode key \
  --destination '$web' \
  --source . \
  --pattern "*" \
  --overwrite
```

4. Configure CORS
```bash
az storage cors add \
  --services b \
  --methods GET OPTIONS \
  --origins '*' \
  --allowed-headers '*' \
  --exposed-headers '*' \
  --max-age 3600 \
  --account-name $STORAGE_ACCOUNT
```

5. Get website URL
```bash
az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query "primaryEndpoints.web" -o tsv
```

6. Configure Azure Front Door (for auth)
```bash
az afd profile create \
  --profile-name mbctg-soc-afd \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_AzureFrontDoor
```

### Option 3: Azure App Service

#### Advantages
- Full control
- Easy authentication
- Supports custom runtime if needed later
- Higher cost

#### Deployment Steps

1. Create App Service plan
```bash
RESOURCE_GROUP="rg-soc-dashboard"
LOCATION="eastus"
PLAN_NAME="plan-soc-dashboard"
APP_NAME="mbctg-soc-dashboard"

az appservice plan create \
  --name $PLAN_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux
```

2. Create web app
```bash
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN_NAME \
  --runtime "NODE:18-lts"
```

3. Configure for static site
Create a `web.config` file:
```xml
<?xml version="1.0"?>
<configuration>
  <system.webServer>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
    <rewrite>
      <rules>
        <rule name="StaticContent">
          <action type="Rewrite" url="index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

4. Deploy
```bash
cd "/Users/laroy/Project/SOC UI"
zip -r deploy.zip *

az webapp deployment source config-zip \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src deploy.zip
```

5. Configure authentication
```bash
az webapp auth update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --enabled true \
  --action LoginWithAzureActiveDirectory \
  --aad-client-id <your-app-id> \
  --aad-client-secret <your-secret> \
  --aad-token-issuer-url https://sts.windows.net/<tenant-id>/
```

### Post-Deployment Configuration

1. Update data source path (see Configuration below).
2. Configure Content Security Policy in `index.html`:
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self';
               style-src 'self' 'unsafe-inline';
               connect-src 'self' https://*.blob.core.windows.net;">
```
3. Enable Application Insights:
```bash
az monitor app-insights component create \
  --app mbctg-soc-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP
```
Add your Application Insights snippet before `</head>` in `index.html`.

### Security Hardening

#### Enable HTTPS only
```bash
az webapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --https-only true

az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --https-only true
```

#### Configure network security
```bash
az webapp config access-restriction add \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --rule-name "SOC-Office" \
  --action Allow \
  --ip-address 203.0.113.0/24 \
  --priority 100
```

#### Enable audit logging
```bash
az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name soc-dashboard-logs

az monitor diagnostic-settings create \
  --name soc-dashboard-diag \
  --resource /subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app-name} \
  --workspace soc-dashboard-logs \
  --logs '[{"category": "AppServiceHTTPLogs", "enabled": true}]'
```

### Monitoring and Alerting

#### Availability test
```bash
az monitor app-insights web-test create \
  --resource-group $RESOURCE_GROUP \
  --name "soc-dashboard-availability" \
  --location $LOCATION \
  --defined-web-test-name "SOC Dashboard Health" \
  --test-url "https://$APP_NAME.azurewebsites.net" \
  --test-frequency 300 \
  --timeout 120
```

#### Alerts
```bash
az monitor metrics alert create \
  --name "soc-dashboard-down" \
  --resource-group $RESOURCE_GROUP \
  --scopes /subscriptions/{sub-id}/resourceGroups/{rg}/providers/microsoft.insights/components/mbctg-soc-insights \
  --condition "avg availabilityResults/availabilityPercentage < 100" \
  --window-size 5m \
  --evaluation-frequency 1m
```

### Sentinel Data Pipeline Setup

#### KQL query template
```kql
// Example: Open Incidents by Severity
SecurityIncident
| where Status in ("New", "Active")
| summarize count() by Severity
| project severity = Severity, count = count_
| extend metricName = "openIncidentsBySeverity",
         generatedAt = now(),
         windowStart = now(-15m),
         windowEnd = now()
| project pack_all()
```

#### Automation template
Use Logic Apps or Azure Functions to:
1. Run KQL query
2. Format as JSON
3. Write to blob storage

Example Logic App:
```json
{
  "trigger": "Recurrence (every 15 minutes)",
  "actions": [
    {
      "type": "Sentinel - Run KQL Query",
      "query": "[your KQL]"
    },
    {
      "type": "Transform - Format JSON",
      "template": "{...}"
    },
    {
      "type": "Blob Storage - Create Blob",
      "container": "soc-metrics",
      "filename": "openIncidentsBySeverity.latest.json"
    }
  ]
}
```

### Rollback Procedure

#### Static Web Apps
```bash
az staticwebapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```
Rollback via portal or redeploy previous version.

#### Blob Storage
```bash
az storage account blob-service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --enable-versioning true

az storage blob restore \
  --account-name $STORAGE_ACCOUNT \
  --container '$web' \
  --time-to-restore "2026-01-19T10:00:00Z"
```

### Cost Estimation

Azure Static Web Apps
- Free tier: $0/month (100GB bandwidth, 2 custom domains)
- Standard tier: ~$9/month

Azure Blob Storage + Front Door
- Storage: ~$1-5/month (depends on size)
- Front Door: ~$35/month (Standard tier)
- Bandwidth: pay per GB egress

Azure App Service
- B1 tier: ~$13/month
- P1V2 tier: ~$85/month

Recommendation:
- Development: Static Web Apps (Free tier)
- Production: Static Web Apps (Standard) or Blob + Front Door

### Testing Production Deployment
```bash
curl https://your-app-url.azurestaticapps.net
curl https://your-app-url.azurestaticapps.net/soc_demo_dataset/newIncidents.latest.json
curl -H "Authorization: Bearer $TOKEN" https://your-app-url.azurestaticapps.net
```

### Maintenance Schedule

Daily
- Verify dashboard accessibility
- Check last updated timestamp
- Monitor Application Insights for errors

Weekly
- Review empty states (identify missing metrics)
- Check authentication logs
- Verify data freshness

Monthly
- Review access patterns
- Test failover procedures
- Review costs and optimize

### Support Contacts

| Issue | Contact |
|-------|---------|
| Dashboard not loading | SOC Team |
| Authentication issues | Identity Team |
| Missing data | Sentinel Ops |
| Azure infrastructure | Cloud Ops |

### Deployment Checklist

Pre-deployment
- [ ] Demo data tested locally
- [ ] All dashboards render correctly
- [ ] Empty states verified
- [ ] Browser compatibility tested
- [ ] Documentation reviewed

Deployment
- [ ] Resource group created
- [ ] Application deployed
- [ ] Custom domain configured (if needed)
- [ ] HTTPS enforced
- [ ] CORS configured

Post-deployment
- [ ] Authentication enabled
- [ ] Data source path updated
- [ ] Monitoring configured
- [ ] Alerts created
- [ ] Team trained
- [ ] Documentation shared

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
├── CHANGELOG.md            # Project recap and testing checklist
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
