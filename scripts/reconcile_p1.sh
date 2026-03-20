#!/usr/bin/env bash
# Compare Home Assistant P1 sensor states with P1 VPS API response.
# Usage: ./scripts/reconcile_p1.sh <HA_TOKEN> <P1_API_TOKEN>
#
# HA_HOST    — Home Assistant URL       (default: http://100.72.32.1:8123)
# P1_HOST    — P1 VPS API URL           (default: https://api.p1.wimluyckx.dev)
# P1_DEVICE  — P1 device ID             (default: p1_main)

set -euo pipefail

HA_HOST="${HA_HOST:-http://192.168.51.251:8123}"
P1_HOST="${P1_HOST:-https://api.p1.wimluyckx.dev}"
P1_DEVICE="${P1_DEVICE:-p1-main}"
HA_TOKEN="${1:?Usage: $0 <HA_TOKEN> <P1_API_TOKEN>}"
P1_TOKEN="${2:?Usage: $0 <HA_TOKEN> <P1_API_TOKEN>}"

echo "Fetching Home Assistant states and P1 API data..."
echo ""

# Fetch both in parallel
export HA_FILE=$(mktemp)
export P1_FILE=$(mktemp)
export P1_HOST
trap 'rm -f "$HA_FILE" "$P1_FILE"' EXIT

curl -sf -H "Authorization: Bearer ${HA_TOKEN}" \
  "${HA_HOST}/api/states" > "$HA_FILE" &
HA_PID=$!

curl -sf -H "Authorization: Bearer ${P1_TOKEN}" \
  "${P1_HOST}/v1/realtime?device_id=${P1_DEVICE}" > "$P1_FILE" &
P1_PID=$!

wait "$HA_PID" || { echo "ERROR: Failed to fetch Home Assistant states"; exit 1; }
wait "$P1_PID" || { echo "ERROR: Failed to fetch P1 API (403 = wrong token)"; exit 1; }

python3 << 'PYEOF'
import json, sys, os

ha_file = os.environ["HA_FILE"]
p1_file = os.environ["P1_FILE"]

with open(ha_file) as f:
    ha_states = json.load(f)

with open(p1_file) as f:
    p1_data = json.load(f)

# --- Extract HA P1 sensors (only sensor.p1_meter_* entities) ---
ha_sensors = {}
for s in ha_states:
    eid = s['entity_id']
    if eid.startswith('sensor.p1_meter_'):
        unit = s.get('attributes', {}).get('unit_of_measurement', '')
        friendly = s.get('attributes', {}).get('friendly_name', '')
        ha_sensors[eid] = {
            'state': s['state'],
            'unit': unit,
            'friendly': friendly,
        }

# --- Define mapping: HA entity_id suffix -> P1 API field ---
# Keys match against sensor.p1_meter_* entity IDs
# Adjust after first run based on actual HA entity names
field_map = [
    ('p1_meter_power',                    'power_w',            'Net grid power (W)'),
    ('p1_meter_energy_import',            'energy_import_kwh',  'Cumulative import (kWh)'),
    ('p1_meter_energy_export',            'energy_export_kwh',  'Cumulative export (kWh)'),
    ('p1_meter_power_phase_1',            None,                 'Phase 1 power (W)'),
    ('p1_meter_power_phase_2',            None,                 'Phase 2 power (W)'),
    ('p1_meter_power_phase_3',            None,                 'Phase 3 power (W)'),
    ('p1_meter_peak_demand_current_month', None,                'Month peak (W)'),
    ('p1_meter_average_demand',           None,                 '15-min avg demand (W)'),
]

# --- Print P1 API response ---
print('=' * 90)
print('P1 VPS API RESPONSE  (%s/v1/realtime)' % os.environ.get('P1_HOST', ''))
print('=' * 90)
for key, val in p1_data.items():
    print('  %-25s = %s' % (key, val))

# --- Print HA sensors ---
print('')
print('=' * 90)
print('HOME ASSISTANT P1 SENSORS')
print('=' * 90)
sorted_sensors = sorted(ha_sensors.items())
for eid, info in sorted_sensors:
    print('  %-55s = %12s  %s' % (eid, info['state'], info['unit']))

# --- Side-by-side comparison ---
print('')
print('=' * 90)
print('FIELD MAPPING COMPARISON')
print('=' * 90)
print('%-30s  %15s  %15s  %s' % ('Description', 'HA Value', 'API Value', 'Match'))
print('-' * 90)

matched = 0
mismatched = 0
unmapped = 0

for ha_key, api_key, desc in field_map:
    # Find HA sensor matching this key
    ha_val = None
    ha_unit = ''
    for eid, info in ha_sensors.items():
        if ha_key in eid.lower():
            ha_val = info['state']
            ha_unit = info['unit']
            break

    # Get API value
    api_val = p1_data.get(api_key) if api_key else None

    # Format values
    ha_display = ('%s %s' % (ha_val, ha_unit)).strip() if ha_val is not None else '(not found)'
    api_display = str(api_val) if api_val is not None else ('(not in API)' if api_key else '(not captured)')

    # Compare
    if ha_val is None or api_val is None:
        status = '-'
        unmapped += 1
    else:
        try:
            ha_num = float(ha_val)
            api_num = float(api_val)
            if abs(ha_num - api_num) < 0.01 * max(abs(ha_num), abs(api_num), 1):
                status = 'OK'
                matched += 1
            else:
                status = 'DIFF'
                mismatched += 1
        except ValueError:
            status = str(ha_val) == str(api_val) and 'OK' or 'DIFF'
            if status == 'OK':
                matched += 1
            else:
                mismatched += 1

    print('%-30s  %15s  %15s  %s' % (desc, ha_display, api_display, status))

print('-' * 90)
print('Matched: %d | Different: %d | Unmapped: %d' % (matched, mismatched, unmapped))
print('')
print('Note: values may differ due to timing — HA and API are fetched concurrently')
print('      but not at the exact same instant.')
PYEOF
