#!/usr/bin/env bash
# Extract GoSungrow sensor states from Home Assistant REST API.
# Usage: ./scripts/ha_sungrow_states.sh <HA_TOKEN>

set -euo pipefail

HA_HOST="${HA_HOST:-http://192.168.51.251:8123}"
TOKEN="${1:?Usage: $0 <bearer token>}"

curl -sf -H "Authorization: Bearer ${TOKEN}" \
  "${HA_HOST}/api/states" \
  | python3 -c "
import json, sys

states = json.load(sys.stdin)

matches = []
for s in states:
    eid = s['entity_id'].lower()
    if 'gosungrow' in eid or 'sungrow' in eid:
        unit = s.get('attributes', {}).get('unit_of_measurement', '')
        friendly = s.get('attributes', {}).get('friendly_name', '')
        matches.append((s['entity_id'], s['state'], unit, friendly))

matches.sort(key=lambda x: x[0])

print('%s %s  %s  %s' % ('Entity ID'.ljust(75), 'State'.rjust(12), 'Unit'.ljust(6), 'Friendly Name'))
print('-' * 140)
for eid, state, unit, friendly in matches:
    print('%s %s  %s  %s' % (eid.ljust(75), state.rjust(12), unit.ljust(6), friendly))

print('\nTotal: %d entities' % len(matches))
"
