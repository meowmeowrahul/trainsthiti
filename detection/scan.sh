#!/bin/bash

# Bluetooth scan
bluetoothctl scan on &
sleep 10
bluetoothctl scan off
bluetoothctl devices | awk '/Device/{print $2}' > bt_macs.txt

# WiFi (monitor mode)
sudo airmon-ng start wlo1
sudo airodump-ng wlo1mon -w capture --output-format csv &
sleep 20
sudo pkill airodump-ng
sudo airmon-ng stop wlo1mon
tail -n +2 capture-01.csv | cut -d',' -f1 | sort -u > wifi_macs.txt

# Count unique Station MACs (clients)
CLIENTS=$(tail -n +2 capture-01.csv | awk -F',' 'NR>1 && $14 != "" {print $14}' | sort -u | wc -l)
DENSITY=$(if [ $CLIENTS -lt 20 ]; then echo "low"; elif [ $CLIENTS -lt 60 ]; then echo "medium"; else echo "high"; fi)

BT_COUNT=$(wc -l < bt_macs.txt)

# JSON payload
JSON_DATA=$(cat <<EOF
{
  "clients": $CLIENTS,
  "density": "$DENSITY",
  "bt_devices": $BT_COUNT,
  "timestamp": "$(date -Iseconds)"
}
EOF
)

# Send to Express
RESPONSE=$(curl -s -X POST http://localhost:3000/api/crowd \
  -H "Content-Type: application/json" \
  -d "$JSON_DATA" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

echo "Sent: $CLIENTS clients, $BT_COUNT BT, $DENSITY density → HTTP $HTTP_CODE"

# Cleanup: Delete files after successful POST (200 OK)
if [ "$HTTP_CODE" -eq 200 ]; then
  rm -f capture-*.csv bt_macs.txt wifi_macs.txt
  echo "✓ Files cleaned"
else
  echo "✗ POST failed, keeping logs for debug"
fi
