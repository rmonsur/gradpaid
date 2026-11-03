#!/usr/bin/env sh
# Triggers the hosted disbursement agent. Used by the Render cron job.
set -eu
: "${APP_URL:?APP_URL is required}"
: "${CRON_SECRET:?CRON_SECRET is required}"
curl -fsS -X POST "$APP_URL/api/disburse" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"trigger":"cron","dryRun":false}'
