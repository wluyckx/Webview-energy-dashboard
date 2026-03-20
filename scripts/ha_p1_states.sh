#!/usr/bin/env bash
# Extract P1/energy sensor states from Home Assistant REST API.
# Usage: ./scripts/ha_p1_states.sh <HA_TOKEN>
#
# Get a Long-Lived Access Token at:
#   http://100.72.32.1:8123/profile/security

set -euo pipefail

HA_HOST="${HA_HOST:-http://192.168.51.251:8123}"
TOKEN="${1:?Usage: $0 <bearer token>}"

curl -sf -H "Authorization: Bearer ${TOKEN}" \
  "${HA_HOST}/api/states" \
  | python3 -c "
import json, sys

states = json.load(sys.stdin)
keywords = ['p1', 'homewizard', 'power', 'energy_import', 'energy_export', 'voltage', 'current_l', 'frequency']

matches = []
for s in states:
    eid = s['entity_id'].lower()
    if any(k in eid for k in keywords):
        unit = s.get('attributes', {}).get('unit_of_measurement', '')
        friendly = s.get('attributes', {}).get('friendly_name', '')
        matches.append((s['entity_id'], s['state'], unit, friendly))

matches.sort(key=lambda x: x[0])

header = '%s %s  %s  %s' % ('Entity ID'.ljust(55), 'State'.rjust(12), 'Unit'.ljust(6), 'Friendly Name')
print(header)
print('-' * 110)
for eid, state, unit, friendly in matches:
    print('%s %s  %s  %s' % (eid.ljust(55), state.rjust(12), unit.ljust(6), friendly))

print('\nTotal: %d entities' % len(matches))
"
