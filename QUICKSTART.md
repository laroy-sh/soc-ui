# MBCTG SOC & ROC Dashboard - Quick Start Guide

## Getting Started

Your SOC and ROC Dashboard is now ready! Follow these steps to view and use it.

## Running the Dashboard Locally

The dashboard is currently running at: **http://localhost:8000**

### Starting the Server (if not already running)

```bash
cd "/Users/laroy/Project/SOC UI"
python3 -m http.server 8000
```

Then open your browser to: http://localhost:8000

### Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Dashboard Navigation

### Available Dashboards

1. **SOC Analyst Dashboard** (Default Landing Page)
   - Quick view of what needs immediate attention
   - New incidents, open cases, active alerts
   - Top affected entities

2. **SOC Lead Dashboard**
   - Performance metrics (MTTA/MTTR)
   - Incident flow and closure trends
   - Rule effectiveness analysis

3. **SOC Telemetry Health Dashboard**
   - Data ingestion health monitoring
   - Table-level metrics
   - Alerts for zero ingestion

4. **SOC Customer Dashboard**
   - Customer-facing incident view
   - Pre-filtered to customer scope

5. **ROC Dashboard**
   - Risk operations center view
   - Repeated detections (live)
   - Placeholders for future risk metrics

### Using the Navigation

- Click any dashboard name in the left sidebar to switch views
- The active dashboard is highlighted with a blue indicator
- Last update time is shown in the sidebar footer

## Understanding the Data

### Live vs Planned Metrics

- **Green badge "Live (Sentinel)"**: Real data from Microsoft Sentinel
- **Gray badge "Planned"**: Placeholder for future implementation

### Severity Colors

- **Dark Red**: Critical
- **Red**: High  
- **Orange**: Medium
- **Light Orange**: Low
- **Blue**: Informational

### Empty States

If you see "No data available" or "Not implemented":
- The metric file doesn't exist, or
- The metric is marked as not_implemented, or
- The data array is empty

This is intentional - the dashboard never fabricates data.

## Demo Dataset

The current dashboard uses demo data from:
```
/Users/laroy/Project/SOC UI/soc_demo_dataset/
```

This dataset contains:
- ✅ 15 JSON metric files
- ✅ Realistic SOC activity data
- ✅ Some metrics marked as "not_implemented"
- ✅ All required data fields

## Testing Scenarios

### Test 1: View Active Incidents
1. Open dashboard (default: SOC Analyst)
2. Check "New Incidents" counter (top left)
3. Review "Open Incidents by Severity" chart
4. Verify severity colors match the legend

### Test 2: Check SOC Performance
1. Click "SOC Lead" in sidebar
2. View MTTA and MTTR metrics
3. Observe incident inflow trend (24h)
4. Review closure rate chart

### Test 3: Monitor Telemetry Health
1. Click "Telemetry Health" in sidebar
2. Check ingestion volume table
3. Look for zero-ingestion alerts (should show tables with no data)

### Test 4: Verify Empty States
1. Click "ROC" in sidebar
2. View "Repeated Detections" (should show data)
3. Check "Business Risk Posture" (should show placeholder)
4. Verify other placeholders display "Not implemented"

### Test 5: Auto-Refresh
1. Keep dashboard open
2. Watch "Last updated" timestamp in sidebar
3. Should refresh every 60 seconds
4. (Demo data won't change, but timestamp will update)

## Customization

### Change Data Source Path

Edit [app.js](app.js):

```javascript
const CONFIG = {
    dataPath: './soc_demo_dataset/',  // Change this
    refreshInterval: 60000
};
```

### Change Refresh Interval

```javascript
const CONFIG = {
    dataPath: './soc_demo_dataset/',
    refreshInterval: 300000  // 5 minutes (in milliseconds)
};
```

### Add Custom Branding

Edit [index.html](index.html) sidebar header:

```html
<div class="sidebar-header">
    <h1>MBCTG</h1>  <!-- Change company name -->
    <p class="subtitle">Security Operations</p>
</div>
```

### Modify Colors

Edit [styles.css](styles.css) color variables:

```css
:root {
    --severity-high: #e81123;      /* Change severity colors */
    --severity-medium: #f7630c;
    --bg-sidebar: #1f1f1f;         /* Change sidebar color */
    /* ... more variables ... */
}
```

## Connecting to Production Sentinel Data

### Prerequisites

1. Scheduled KQL queries writing JSON to Azure Storage
2. JSON files following the data contract
3. Publicly accessible storage or SAS token

### Steps

1. **Update data path** in [app.js](app.js):
   ```javascript
   const CONFIG = {
       dataPath: 'https://youraccount.blob.core.windows.net/yourcontainer/',
       refreshInterval: 60000
   };
   ```

2. **Configure CORS** on your Azure Storage Account:
   ```bash
   az storage cors add \
       --services b \
       --methods GET OPTIONS \
       --origins '*' \
       --allowed-headers '*' \
       --exposed-headers '*' \
       --max-age 3600 \
       --account-name <storage-account>
   ```

3. **Deploy the dashboard** to Azure Static Web Apps, App Service, or Storage Static Website

4. **Test** with production data

5. **Set up authentication** (Azure AD, etc.)

## Troubleshooting

### Dashboard Not Loading

**Check browser console** (F12 → Console tab):
- Look for network errors (404, CORS, etc.)
- Verify JSON files are loading

**Common fixes**:
- Ensure server is running (`python3 -m http.server 8000`)
- Check file paths in CONFIG
- Verify JSON files exist and are valid

### Data Not Displaying

**Verify JSON structure**:
```bash
cat soc_demo_dataset/openIncidentsBySeverity.latest.json
```

Should include:
- `metricName`
- `generatedAt`
- `data` (array or object)

**Check empty states**:
- Empty data shows "No data available" (intentional)
- not_implemented shows custom message

### Styling Issues

1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check that [styles.css](styles.css) is loading

### Performance Issues

**Reduce refresh interval**:
```javascript
refreshInterval: 300000  // 5 minutes instead of 1
```

**Limit data points** in JSON files (server-side)

## File Reference

| File | Purpose |
|------|---------|
| [index.html](index.html) | Main structure and dashboards |
| [styles.css](styles.css) | All styling and layouts |
| [app.js](app.js) | Data loading and rendering |
| [README.md](README.md) | Full documentation |
| `soc_demo_dataset/*.json` | Demo metric files |

## Next Steps

### For Development

1. ✅ Test all dashboards
2. ✅ Verify empty state handling
3. ✅ Check responsive design (resize browser)
4. 🔄 Customize branding/colors as needed
5. 🔄 Add any custom metrics

### For Production

1. 🔄 Set up Sentinel KQL queries
2. 🔄 Configure Azure Storage
3. 🔄 Deploy dashboard to Azure
4. 🔄 Set up authentication
5. 🔄 Configure monitoring/alerts

## Support & Feedback

- Review [README.md](README.md) for detailed documentation
- Check browser console for errors
- Verify JSON file structure matches contract
- Contact SOC team for operational questions

---

## Quick Command Reference

```bash
# Start server
cd "/Users/laroy/Project/SOC UI"
python3 -m http.server 8000

# Stop server
Ctrl+C

# Open in browser
http://localhost:8000

# View logs (browser console)
F12 → Console tab

# Check JSON files
ls -la soc_demo_dataset/
cat soc_demo_dataset/newIncidents.latest.json
```

---

**Dashboard Status**: ✅ Ready for Testing  
**Server Running**: http://localhost:8000  
**Demo Data**: ✅ Loaded  
**Last Updated**: January 19, 2026
