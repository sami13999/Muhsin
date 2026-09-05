# Grafana Cloud Setup — MUSHIN 2.0

**Status:** Ready for execution
**Estimated time:** 1-2 hours

---

## Prerequisites

- Grafana Cloud account (free tier available)
- API key with admin access

---

## 1. Create Grafana Cloud Stack

1. Go to grafana.com/cloud
2. Create new stack
3. Note the stack URL (e.g., `https://your-stack.grafana.net`)

---

## 2. Configure Data Sources

### Prometheus (Metrics)
1. Go to Configuration → Data Sources → Add data source
2. Select Prometheus
3. URL: `https://prometheus-prod-XX.grafana.net`
4. Authentication: Basic auth with stack API key

### Loki (Logs)
1. Go to Configuration → Data Sources → Add data source
2. Select Loki
3. URL: `https://loki-prod-XX.grafana.net`
4. Authentication: Basic auth with stack API key

### Tempo (Traces)
1. Go to Configuration → Data Sources → Add data source
2. Select Tempo
3. URL: `https://tempo-prod-XX.grafana.net`
4. Authentication: Basic auth with stack API key

---

## 3. Import Dashboards

### Option A: Import from JSON files
1. Go to Dashboards → Import
2. Upload each JSON file from `dashboards/` directory:
   - `api-health.json`
   - `queue-health.json`
   - `security.json`

### Option B: Provision via API
```bash
# Set credentials
GRAFANA_URL="https://your-stack.grafana.net"
GRAFANA_API_KEY="your-api-key"

# Import dashboards
for dashboard in dashboards/*.json; do
  curl -X POST "$GRAFANA_URL/api/dashboards/db" \
    -H "Authorization: Bearer $GRAFANA_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"dashboard\": $(cat $dashboard), \"overwrite\": true}"
done
```

---

## 4. Configure Alerting

### Alert Rules
1. Go to Alerting → Alert rules → New alert rule
2. Create rules matching `docs/alerting-rules.md`:
   - Workspace mismatch spike (Sev1)
   - DLQ non-empty (Sev2)
   - Queue backlog (Sev3)
   - Provider error rate (Sev2/Sev3)
   - Outbox relay lag (Sev2)
   - Sweeper rate elevated (Sev3)

### Contact Points
1. Go to Alerting → Contact points → New contact point
2. Configure:
   - Email (for Sev3/Sev4)
   - PagerDuty (for Sev1/Sev2) — see T37

### Notification Policies
1. Go to Alerting → Notification policies
2. Create policies matching severity levels

---

## 5. Configure Alertmanager

1. Go to Alerting → Alertmanager
2. Configure routing:
   - Sev1/Sev2 → PagerDuty
   - Sev3 → Slack/Email
   - Sev4 → Weekly digest

---

## 6. Verify Setup

```bash
# Test Prometheus connection
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  "$GRAFANA_URL/api/datasources/proxy/1/api/v1/query?query=up"

# Test Loki connection
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  "$GRAFANA_URL/api/datasources/proxy/2/loki/api/v1/labels"

# Test dashboard import
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  "$GRAFANA_URL/api/search?query=MUSHIN"
```

---

## 7. Environment Variables

Add to `.env`:
```bash
GRAFANA_CLOUD_URL="https://your-stack.grafana.net"
GRAFANA_CLOUD_API_KEY="your-api-key"
GRAFANA_CLOUD_INSTANCE_ID="your-instance-id"
```

---

## Post-Setup Checklist

- [ ] Grafana Cloud stack created
- [ ] Prometheus data source configured
- [ ] Loki data source configured
- [ ] Tempo data source configured
- [ ] API Health dashboard imported
- [ ] Queue Health dashboard imported
- [ ] Security dashboard imported
- [ ] Alert rules created
- [ ] Contact points configured
- [ ] Notification policies set up
