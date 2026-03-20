#!/usr/bin/env bash
# Run P1 reconciliation every 2 seconds for 30 seconds.
# Usage: ./scripts/reconcile_p1_loop.sh <HA_TOKEN> <P1_API_TOKEN>

set -euo pipefail

HA_HOST="${HA_HOST:-http://192.168.51.251:8123}"
P1_HOST="${P1_HOST:-https://api.p1.wimluyckx.dev}"
P1_DEVICE="${P1_DEVICE:-p1-main}"
HA_TOKEN="${1:?Usage: $0 <HA_TOKEN> <P1_API_TOKEN>}"
P1_TOKEN="${2:?Usage: $0 <HA_TOKEN> <P1_API_TOKEN>}"

ITERATIONS=15
INTERVAL=2

export HA_HOST P1_HOST

echo "P1 Reconciliation — ${ITERATIONS} samples, every ${INTERVAL}s"
echo ""
printf "%-8s  %6s  %10s %10s %6s  %15s %15s %6s  %15s %15s %6s\n" \
  "Time" "Age(s)" "HA_power" "API_power" "delta" "HA_import" "API_import" "delta" "HA_export" "API_export" "delta"
printf '%0.s-' {1..120}
echo ""

for i in $(seq 1 $ITERATIONS); do
  HA_FILE=$(mktemp)
  P1_FILE=$(mktemp)

  curl -sf -H "Authorization: Bearer ${HA_TOKEN}" \
    "${HA_HOST}/api/states" > "$HA_FILE" &
  HA_PID=$!

  curl -sf -H "Authorization: Bearer ${P1_TOKEN}" \
    "${P1_HOST}/v1/realtime?device_id=${P1_DEVICE}" > "$P1_FILE" &
  P1_PID=$!

  wait "$HA_PID" 2>/dev/null || { echo "HA fetch failed"; rm -f "$HA_FILE" "$P1_FILE"; sleep $INTERVAL; continue; }
  wait "$P1_PID" 2>/dev/null || { echo "P1 fetch failed"; rm -f "$HA_FILE" "$P1_FILE"; sleep $INTERVAL; continue; }

  python3 - "$HA_FILE" "$P1_FILE" << 'PYEOF'
import json, sys
from datetime import datetime

ha_file = sys.argv[1]
p1_file = sys.argv[2]

with open(ha_file) as f:
    ha_states = json.load(f)
with open(p1_file) as f:
    p1 = json.load(f)

ha = {}
for s in ha_states:
    if s['entity_id'].startswith('sensor.p1_meter_'):
        ha[s['entity_id']] = s['state']

def get_ha(suffix):
    key = 'sensor.p1_meter_' + suffix
    val = ha.get(key)
    if val is None:
        return None
    try:
        return float(val)
    except ValueError:
        return None

ha_power = get_ha('power')
ha_import = get_ha('energy_import')
ha_export = get_ha('energy_export')

api_power = p1.get('power_w')
api_import = p1.get('energy_import_kwh')
api_export = p1.get('energy_export_kwh')
api_ts = p1.get('ts', '')

now = datetime.now().strftime('%H:%M:%S')

# Compute API sample age in seconds
api_age = ''
if api_ts:
    from datetime import timezone
    try:
        # Parse ISO timestamp with timezone
        ts_str = api_ts.replace('+00:00', '+0000').replace('Z', '+0000')
        if '+' in ts_str[10:]:
            dt_part, tz_part = ts_str.rsplit('+', 1)
            from datetime import timedelta
            api_dt = datetime.fromisoformat(dt_part.replace('T', ' '))
            tz_offset = timedelta(hours=int(tz_part[:2]), minutes=int(tz_part[2:4] if len(tz_part) >= 4 else 0))
            api_dt = api_dt.replace(tzinfo=timezone(tz_offset))
        else:
            api_dt = datetime.fromisoformat(api_ts)
        now_utc = datetime.now(timezone.utc)
        age_s = (now_utc - api_dt).total_seconds()
        api_age = '%d' % age_s
    except Exception:
        api_age = '?'

def fmt(v, decimals=1):
    if v is None:
        return 'N/A'
    if decimals == 0:
        return '%d' % v
    return '%.*f' % (decimals, v)

def delta(a, b, decimals=1):
    if a is None or b is None:
        return 'N/A'
    d = a - b
    return '%+.*f' % (decimals, d)

print('%-8s  %6s  %10s %10s %6s  %15s %15s %6s  %15s %15s %6s' % (
    now,
    api_age,
    fmt(ha_power, 0), fmt(api_power, 0), delta(ha_power, api_power, 0),
    fmt(ha_import, 3), fmt(api_import, 3), delta(ha_import, api_import, 3),
    fmt(ha_export, 3), fmt(api_export, 3), delta(ha_export, api_export, 3),
))
PYEOF

  rm -f "$HA_FILE" "$P1_FILE"

  if [ "$i" -lt "$ITERATIONS" ]; then
    sleep $INTERVAL
  fi
done

echo ""
echo "Done."
