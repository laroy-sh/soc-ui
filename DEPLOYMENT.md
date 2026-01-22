# MBCTG SOC Dashboard - Production Deployment Guide

## Deployment Options

This guide covers three deployment options for the SOC & ROC Dashboard:

1. Azure Static Web Apps (Recommended)
2. Azure Blob Storage Static Website
3. Azure App Service

---

## Option 1: Azure Static Web Apps (Recommended)

### Advantages
- ✅ Built-in HTTPS
- ✅ Global CDN
- ✅ Easy Azure AD integration
- ✅ Free tier available
- ✅ Automatic SSL certificates
- ✅ Built-in staging environments

### Prerequisites
```bash
az extension add --name staticwebapp
```

### Deployment Steps

#### 1. Create Static Web App

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

#### 2. Get Deployment Token

```bash
TOKEN=$(az staticwebapp secrets list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.apiKey" -o tsv)

echo $TOKEN
```

#### 3. Deploy Files

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

#### 4. Configure Custom Domain (Optional)

```bash
az staticwebapp hostname set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname soc.yourdomain.com
```

#### 5. Configure Authentication

Enable Azure AD in the Azure Portal:
1. Navigate to your Static Web App
2. Go to "Configuration" → "Authentication"
3. Add Azure AD provider
4. Configure allowed users/groups

---

## Option 2: Azure Blob Storage Static Website

### Advantages
- ✅ Lowest cost
- ✅ Simple setup
- ✅ High availability
- ⚠️ Requires separate auth solution

### Deployment Steps

#### 1. Create Storage Account

```bash
RESOURCE_GROUP="rg-soc-dashboard"
LOCATION="eastus"
STORAGE_ACCOUNT="mbctgsoc$(date +%s)"  # Must be globally unique

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2
```

#### 2. Enable Static Website

```bash
az storage blob service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --static-website \
  --404-document 404.html \
  --index-document index.html
```

#### 3. Upload Files

```bash
# Get connection string
CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query connectionString -o tsv)

# Upload files
cd "/Users/laroy/Project/SOC UI"
az storage blob upload-batch \
  --account-name $STORAGE_ACCOUNT \
  --auth-mode key \
  --destination '$web' \
  --source . \
  --pattern "*" \
  --overwrite
```

#### 4. Configure CORS

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

#### 5. Get Website URL

```bash
az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query "primaryEndpoints.web" -o tsv
```

#### 6. Configure Azure Front Door (for auth)

For authentication with blob storage, use Azure Front Door with WAF:

```bash
# Create Front Door
az afd profile create \
  --profile-name mbctg-soc-afd \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_AzureFrontDoor

# Configure origin (your blob storage)
# Add WAF policies for authentication
```

---

## Option 3: Azure App Service

### Advantages
- ✅ Full control
- ✅ Easy authentication
- ✅ Supports custom runtime if needed later
- ⚠️ Higher cost

### Deployment Steps

#### 1. Create App Service Plan

```bash
RESOURCE_GROUP="rg-soc-dashboard"
LOCATION="eastus"
PLAN_NAME="plan-soc-dashboard"
APP_NAME="mbctg-soc-dashboard"

# Create plan
az appservice plan create \
  --name $PLAN_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux
```

#### 2. Create Web App

```bash
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN_NAME \
  --runtime "NODE:18-lts"
```

#### 3. Configure for Static Site

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

#### 4. Deploy

```bash
cd "/Users/laroy/Project/SOC UI"
zip -r deploy.zip *

az webapp deployment source config-zip \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src deploy.zip
```

#### 5. Configure Authentication

```bash
# Enable Azure AD authentication
az webapp auth update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --enabled true \
  --action LoginWithAzureActiveDirectory \
  --aad-client-id <your-app-id> \
  --aad-client-secret <your-secret> \
  --aad-token-issuer-url https://sts.windows.net/<tenant-id>/
```

---

## Post-Deployment Configuration

### 1. Update Data Source Path

After deploying, update [app.js](app.js) to point to your production data:

```javascript
const CONFIG = {
    // Point to your Azure Storage with Sentinel data
    dataPath: 'https://yoursentineldata.blob.core.windows.net/soc-metrics/',
    refreshInterval: 60000
};
```

### 2. Configure Content Security Policy

Add to [index.html](index.html) `<head>`:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               connect-src 'self' https://*.blob.core.windows.net;">
```

### 3. Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app mbctg-soc-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app mbctg-soc-insights \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)
```

Add to [index.html](index.html) before `</head>`:

```html
<script type="text/javascript">
    var sdkInstance="appInsightsSDK";window[sdkInstance]="appInsights";
    var aiName=window[sdkInstance];
    // ... (full Application Insights snippet)
    instrumentationKey: "YOUR_INSTRUMENTATION_KEY"
</script>
```

---

## Security Hardening

### 1. Enable HTTPS Only

```bash
# For App Service
az webapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --https-only true

# For Storage Account
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --https-only true
```

### 2. Configure Network Security

```bash
# Restrict to specific IPs or VNets
az webapp config access-restriction add \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --rule-name "SOC-Office" \
  --action Allow \
  --ip-address 203.0.113.0/24 \
  --priority 100
```

### 3. Enable Audit Logging

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name soc-dashboard-logs

# Enable diagnostic settings
az monitor diagnostic-settings create \
  --name soc-dashboard-diag \
  --resource /subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app-name} \
  --workspace soc-dashboard-logs \
  --logs '[{"category": "AppServiceHTTPLogs", "enabled": true}]'
```

---

## Monitoring & Alerting

### Create Availability Test

```bash
# Create availability test
az monitor app-insights web-test create \
  --resource-group $RESOURCE_GROUP \
  --name "soc-dashboard-availability" \
  --location $LOCATION \
  --defined-web-test-name "SOC Dashboard Health" \
  --test-url "https://$APP_NAME.azurewebsites.net" \
  --test-frequency 300 \
  --timeout 120
```

### Create Alerts

```bash
# Alert on availability < 100%
az monitor metrics alert create \
  --name "soc-dashboard-down" \
  --resource-group $RESOURCE_GROUP \
  --scopes /subscriptions/{sub-id}/resourceGroups/{rg}/providers/microsoft.insights/components/mbctg-soc-insights \
  --condition "avg availabilityResults/availabilityPercentage < 100" \
  --window-size 5m \
  --evaluation-frequency 1m
```

---

## Sentinel Data Pipeline Setup

### KQL Query Template

Create scheduled queries in Sentinel to generate JSON files:

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

### Automation Template

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

---

## Rollback Procedure

### For Static Web Apps

```bash
# List deployments
az staticwebapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP

# Rollback via portal or redeploy previous version
```

### For Blob Storage

```bash
# Enable versioning first
az storage account blob-service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --enable-versioning true

# Restore from version
az storage blob restore \
  --account-name $STORAGE_ACCOUNT \
  --container '$web' \
  --time-to-restore "2026-01-19T10:00:00Z"
```

---

## Cost Estimation

### Azure Static Web Apps
- **Free tier**: $0/month (100GB bandwidth, 2 custom domains)
- **Standard tier**: ~$9/month (unlimited bandwidth, 5 custom domains)

### Azure Blob Storage + Front Door
- **Storage**: ~$1-5/month (depends on size)
- **Front Door**: ~$35/month (Standard tier)
- **Bandwidth**: Pay per GB egress

### Azure App Service
- **B1 tier**: ~$13/month (1 core, 1.75GB RAM)
- **P1V2 tier**: ~$85/month (production grade)

### Recommendation
- **Development**: Static Web Apps (Free tier)
- **Production**: Static Web Apps (Standard) or Blob + Front Door

---

## Testing Production Deployment

```bash
# Test endpoint
curl https://your-app-url.azurestaticapps.net

# Test JSON loading
curl https://your-app-url.azurestaticapps.net/soc_demo_dataset/newIncidents.latest.json

# Test with authentication
curl -H "Authorization: Bearer $TOKEN" https://your-app-url.azurestaticapps.net
```

---

## Maintenance Schedule

### Daily
- ✅ Verify dashboard is accessible
- ✅ Check last updated timestamp
- ✅ Monitor Application Insights for errors

### Weekly
- ✅ Review empty states (identify missing metrics)
- ✅ Check authentication logs
- ✅ Verify data freshness

### Monthly
- ✅ Review access patterns
- ✅ Update dependencies (if any)
- ✅ Test failover procedures
- ✅ Review costs and optimize

---

## Support Contacts

| Issue | Contact |
|-------|---------|
| Dashboard not loading | SOC Team |
| Authentication issues | Identity Team |
| Missing data | Sentinel Ops |
| Azure infrastructure | Cloud Ops |

---

## Checklist

### Pre-Deployment
- [ ] Demo data tested locally
- [ ] All dashboards render correctly
- [ ] Empty states verified
- [ ] Browser compatibility tested
- [ ] Documentation reviewed

### Deployment
- [ ] Resource group created
- [ ] Application deployed
- [ ] Custom domain configured (if needed)
- [ ] HTTPS enforced
- [ ] CORS configured

### Post-Deployment
- [ ] Authentication enabled
- [ ] Data source path updated
- [ ] Monitoring configured
- [ ] Alerts created
- [ ] Team trained
- [ ] Documentation shared

---

**Document Version**: 1.0  
**Last Updated**: January 19, 2026  
**Maintained By**: MBCTG SOC Team
