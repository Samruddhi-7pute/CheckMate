import psutil
import requests
import wmi
import time
import datetime
import winsound
import socket
import subprocess
import sys

# ── CONFIG ────────────────────────────────────────────────────────────────────
SERVER_URL = "http://localhost:3000/alert"
MACHINE_ID = "PC-07"
CHECK_INTERVAL = 2  # seconds

# Penalty codes matched to server's PENALTY_MAP
# 1 = Tab Switch (-5)  |  2 = USB (-10)  |  3 = WiFi/Hotspot (-15)
PENALTY_CODES = {
    "Tab Switch":        1,
    "USB Device":        2,
    "Unauthorized WiFi": 3,
    "Hotspot":           3,
}

# ── HELPERS ───────────────────────────────────────────────────────────────────
def get_timestamp():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def send_alert(violation_type):
    """Send a structured violation + penalty payload to the CheckMate server."""
    penalty_code = PENALTY_CODES.get(violation_type, None)
    try:
        payload = {
            # New field names (server primary)
            "machine_id":     MACHINE_ID,
            "violation_type": violation_type,
            "penalty_code":   penalty_code,
            # Legacy field names (backward compatibility)
            "machineId":      MACHINE_ID,
            "type":           violation_type,
            "timestamp":      get_timestamp(),
        }
        response = requests.post(SERVER_URL, json=payload, timeout=5)
        print(f"🚨 Alert sent: {violation_type} | penalty_code={penalty_code} | {response.status_code}")
    except Exception as e:
        print(f"⚠️  Server unreachable, saving locally: {e}")
        save_locally(violation_type, penalty_code)

def save_locally(violation_type, penalty_code=None):
    """Queue violation to offline file when server is unavailable."""
    with open("offline_queue.txt", "a") as f:
        f.write(f"{MACHINE_ID},{violation_type},{penalty_code},{get_timestamp()}\n")

def play_alarm():
    for _ in range(3):
        winsound.Beep(1000, 500)
        time.sleep(0.2)

def sync_offline_queue():
    """Re-send any violations that were saved while server was down."""
    try:
        with open("offline_queue.txt", "r") as f:
            lines = f.readlines()
        if not lines:
            return
        for line in lines:
            parts = line.strip().split(",")
            if len(parts) >= 3:
                machine_id     = parts[0]
                violation_type = parts[1]
                penalty_code   = int(parts[2]) if parts[2] and parts[2] != "None" else None
                ts             = parts[3] if len(parts) > 3 else get_timestamp()
                payload = {
                    "machine_id":     machine_id,
                    "violation_type": violation_type,
                    "penalty_code":   penalty_code,
                    "machineId":      machine_id,
                    "type":           violation_type,
                    "timestamp":      ts,
                }
                requests.post(SERVER_URL, json=payload, timeout=5)
        open("offline_queue.txt", "w").close()
        print("✅ Offline queue synced!")
    except FileNotFoundError:
        pass

# ── DETECTION ─────────────────────────────────────────────────────────────────
def get_usb_devices():
    c = wmi.WMI()
    return set([disk.DeviceID for disk in c.Win32_DiskDrive() if 'USB' in disk.InterfaceType])

def get_connected_ssid():
    try:
        result = subprocess.check_output(
            ['netsh', 'wlan', 'show', 'interfaces'],
            encoding='utf-8'
        )
        for line in result.split('\n'):
            if 'SSID' in line and 'BSSID' not in line:
                return line.split(':')[1].strip()
    except:
        pass
    return None

def get_network_adapters():
    adapters = set()
    for name, addrs in psutil.net_if_addrs().items():
        for addr in addrs:
            if addr.family == 2:
                adapters.add((name, addr.address))
    return adapters

# ── MAIN MONITORING LOOP ──────────────────────────────────────────────────────
def monitor():
    print(f"✅ CheckMate Agent running on {MACHINE_ID}")
    print("🔍 Monitoring USB and Network adapters...")

    known_usb      = get_usb_devices()
    known_adapters = get_network_adapters()
    known_ssid     = get_connected_ssid()

    print(f"📡 Current WiFi: {known_ssid}")
    print(f"💾 Current USB devices: {known_usb}")
    print(f"🌐 Current Network adapters: {known_adapters}")

    while True:
        try:
            sync_offline_queue()

            # ── CHECK USB ─────────────────────────────────────────────────────
            current_usb = get_usb_devices()
            new_usb = current_usb - known_usb
            if new_usb:
                print(f"🔴 USB Detected: {new_usb}")
                play_alarm()
                send_alert("USB Device")   # penalty_code=2, -10 marks
            known_usb = current_usb        # always update so each plug is detected

            # ── CHECK NETWORK ADAPTERS ────────────────────────────────────────
            current_adapters = get_network_adapters()
            new_adapters = current_adapters - known_adapters
            if new_adapters:
                print(f"🔴 New Network Adapter: {new_adapters}")
                play_alarm()
                send_alert("Unauthorized WiFi")  # penalty_code=3, -15 marks
            known_adapters = current_adapters

            # ── CHECK WIFI SSID CHANGE ────────────────────────────────────────
            current_ssid = get_connected_ssid()
            if current_ssid != known_ssid:
                print(f"🔴 WiFi Changed! Was: {known_ssid} → Now: {current_ssid}")
                play_alarm()
                send_alert("Hotspot")            # penalty_code=3, -15 marks
                known_ssid = current_ssid

            time.sleep(CHECK_INTERVAL)

        except KeyboardInterrupt:
            print("🛑 CheckMate Agent stopped.")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    monitor()