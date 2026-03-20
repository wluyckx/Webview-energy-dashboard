#!/usr/bin/env bash
# Compare Sungrow VPS API responses with GoSungrow HA sensor states.
# VPS API reflects edge device's Modbus reads; HA reflects Sungrow cloud API.
# Usage: ./scripts/reconcile_sungrow_loop.sh <HA_TOKEN> <SUNGROW_API_TOKEN>
#
# HA_HOST       — Home Assistant URL           (default: http://192.168.51.251:8123)
# SUNGROW_HOST  — Sungrow VPS API URL          (default: https://api.sungrow.wimluyckx.dev)
# SUNGROW_DEVICE — Sungrow device ID           (default: sungrow-main)

set -euo pipefail

HA_HOST="${HA_HOST:-http://192.168.51.251:8123}"
SUNGROW_HOST="${SUNGROW_HOST:-https://api.sungrow.wimluyckx.dev}"
SUNGROW_DEVICE="${SUNGROW_DEVICE:-sungrow-223}"
HA_TOKEN="${1:?Usage: $0 <HA_TOKEN> <SUNGROW_API_TOKEN>}"
SUNGROW_TOKEN="${2:?Usage: $0 <HA_TOKEN> <SUNGROW_API_TOKEN>}"

ITERATIONS=15
INTERVAL=2

export HA_HOST SUNGROW_HOST SUNGROW_DEVICE

echo "Sungrow Reconciliation — ${ITERATIONS} samples, every ${INTERVAL}s"
echo "VPS API: ${SUNGROW_HOST} (device: ${SUNGROW_DEVICE})"
echo ""
printf "%-8s  %6s  %8s %8s %6s  %8s %8s %6s  %6s %6s %5s  %8s %8s %6s  %8s %8s %6s  %5s %5s %4s\n" \
  "Time" "Age(s)" "API_pv" "HA_pv" "delta" "API_bat" "HA_bat" "delta" "A_soc" "H_soc" "delta" "API_ld" "HA_ld" "delta" "API_ex" "HA_ex" "delta" "A_t" "H_t" "d"
printf '%0.s-' {1..160}
echo ""

for i in $(seq 1 $ITERATIONS); do
  HA_FILE=$(mktemp)
  API_FILE=$(mktemp)

  curl -sf -H "Authorization: Bearer ${HA_TOKEN}" \
    "${HA_HOST}/api/states" > "$HA_FILE" &
  HA_PID=$!

  curl -sf -H "Authorization: Bearer ${SUNGROW_TOKEN}" \
    "${SUNGROW_HOST}/v1/realtime?device_id=${SUNGROW_DEVICE}" > "$API_FILE" &
  API_PID=$!

  wait "$HA_PID" 2>/dev/null || { echo "HA fetch failed"; rm -f "$HA_FILE" "$API_FILE"; sleep $INTERVAL; continue; }
  wait "$API_PID" 2>/dev/null || { echo "API fetch failed"; rm -f "$HA_FILE" "$API_FILE"; sleep $INTERVAL; continue; }

  python3 - "$HA_FILE" "$API_FILE" << 'PYEOF'
import json, sys, os
from datetime import datetime, timezone, timedelta

ha_file = sys.argv[1]
api_file = sys.argv[2]

with open(ha_file) as f:
    ha_states = json.load(f)
with open(api_file) as f:
    api = json.load(f)

# --- API values (from edge Modbus reads, in W) ---
api_pv = api.get('pv_power_w')
api_batt = api.get('battery_power_w')
api_soc = api.get('battery_soc_pct')
api_load = api.get('load_power_w')
api_export = api.get('export_power_w')
api_temp = api.get('battery_temp_c')
api_ts = api.get('ts', '')

# Compute API sample age
api_age = ''
if api_ts:
    try:
        ts_str = api_ts.replace('+00:00', '+0000').replace('Z', '+0000')
        if '+' in ts_str[10:]:
            dt_part, tz_part = ts_str.rsplit('+', 1)
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

# --- HA GoSungrow sensors ---
ha = {}
for s in ha_states:
    eid = s['entity_id']
    if 'gosungrow' in eid:
        try:
            ha[eid] = float(s['state'])
        except (ValueError, TypeError):
            ha[eid] = None

# Exact entity ID matching based on actual HA dump
def get_ha_exact(entity_id):
    """Get value by exact entity_id."""
    return ha.get(entity_id)

# Use the specific entity IDs from the HA dump
# Virtual sensors are in kW — multiply by 1000 to get W
PREFIX = 'sensor.gosungrow_virtual_5186512_14_1_1_'

ha_pv_kw = get_ha_exact(PREFIX + 'pv_power')           # p13003, kW
ha_batt_kw = get_ha_exact(PREFIX + 'battery_power')     # Calc, kW (signed: -=discharge)
ha_soc = get_ha_exact(PREFIX + 'p13141')                # Battery level SOC, %
ha_load_kw = get_ha_exact(PREFIX + 'load_power')        # p13119, kW
ha_export_kw = get_ha_exact(PREFIX + 'pv_to_grid_power')  # p13121, kW (feed-in)
ha_temp = get_ha_exact(PREFIX + 'p13143')               # Battery temp, °C

# Convert kW to W
ha_pv = ha_pv_kw * 1000 if ha_pv_kw is not None else None
ha_batt = ha_batt_kw * 1000 if ha_batt_kw is not None else None
ha_load = ha_load_kw * 1000 if ha_load_kw is not None else None
ha_export = ha_export_kw * 1000 if ha_export_kw is not None else None

now = datetime.now().strftime('%H:%M:%S')

def fmt(v, decimals=0):
    if v is None:
        return 'N/A'
    if decimals == 0:
        return '%d' % v
    return '%.*f' % (decimals, v)

def delta(a, b, decimals=0):
    if a is None or b is None:
        return 'N/A'
    d = a - b
    return '%+.*f' % (decimals, d)

print('%-8s  %6s  %8s %8s %6s  %8s %8s %6s  %6s %6s %5s  %8s %8s %6s  %8s %8s %6s  %5s %5s %4s' % (
    now,
    api_age,
    fmt(api_pv), fmt(ha_pv), delta(api_pv, ha_pv),
    fmt(api_batt), fmt(ha_batt), delta(api_batt, ha_batt),
    fmt(api_soc, 1), fmt(ha_soc, 1), delta(api_soc, ha_soc, 1),
    fmt(api_load), fmt(ha_load), delta(api_load, ha_load),
    fmt(api_export), fmt(ha_export), delta(api_export, ha_export),
    fmt(api_temp, 1), fmt(ha_temp, 1), delta(api_temp, ha_temp, 1),
))
PYEOF

  rm -f "$HA_FILE" "$API_FILE"

  if [ "$i" -lt "$ITERATIONS" ]; then
    sleep $INTERVAL
  fi
done

echo ""
echo "Done."
echo ""
echo "Legend: API=Sungrow VPS API (edge Modbus), HA=GoSungrow HA sensor (cloud)"
echo "Units: power in W, SOC in %, temp in °C"
echo "Sign: battery +=charging/−=discharging, export +=exporting/−=importing"
echo ""
echo "Known issue: API data may be stale if edge spool is draining backlog."
echo "Check Age(s) column — values >60s indicate stale data."
