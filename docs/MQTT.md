# MQTT Specification & Access Control List (ACL)

Dokumentasi detail mengenai kontrak MQTT, skema topik, otentikasi, dan aturan hak akses (*least privilege*).

---

## 1. Topik & Kontrak Payload

### Topik 1: Telemetry Sensor
- **Topik**: `rumahjamur/{device_id}/telemetry` (Contoh: `rumahjamur/rumah-jamur-01/telemetry`)
- **Publisher**: ESP32 (setiap 10 detik)
- **Subscriber**: FastAPI Backend
- **QoS**: 0 atau 1
- **Payload Schema**:
  ```json
  {
    "device_id": "rumah-jamur-01",
    "timestamp": "2026-08-28T14:00:00Z",
    "mode": "AUTO",
    "temperature": 28.4,
    "humidity": 87.2,
    "soil_average": 61.7,
    "dht_valid": 4,
    "dht_total": 4,
    "soil_valid": 2,
    "soil_total": 2,
    "pump": false,
    "pump_reason": "NO_THRESHOLD_MET",
    "system_state": "NORMAL",
    "cooldown_remaining_s": 0
  }
  ```

### Topik 2: Device Online / Offline Status (LWT)
- **Topik**: `rumahjamur/{device_id}/status`
- **Publisher**: ESP32 (saat connect) & Mosquitto LWT (saat disconnect)
- **Subscriber**: FastAPI Backend
- **Retained**: `true`
- **QoS**: 1
- **Payload**:
  - Saat online: `{"online": true}`
  - Saat offline (LWT): `{"online": false}`

### Topik 3: Kontrol Mode & Pompa
- **Topik**: `rumahjamur/{device_id}/control`
- **Publisher**: FastAPI Backend (hanya saat menerima `POST /api/control` yang terotorisasi)
- **Subscriber**: ESP32
- **QoS**: 1
- **Payload**:
  ```json
  {
    "mode": "AUTO",
    "pump": false
  }
  ```

---

## 2. Aturan Hak Akses (ACL) — Least Privilege

Konfigurasi ACL berada di file `/etc/mosquitto/acl.conf`:

```conf
# --------------------------------------------------------
# Klien IoT Fisik (ESP32)
# --------------------------------------------------------
user esp32_device
topic write rumahjamur/rumah-jamur-01/telemetry
topic write rumahjamur/rumah-jamur-01/status
topic read  rumahjamur/rumah-jamur-01/control

# --------------------------------------------------------
# Backend Service (FastAPI di localhost)
# --------------------------------------------------------
user backend_service
topic read  rumahjamur/#
topic write rumahjamur/+/control
```

### Penjelasan Keamanan ACL:
1. Akun `esp32_device` **hanya bisa menulis** ke topiknya sendiri dan **hanya bisa membaca** instruksi kontrol miliknya. Klien ESP32 tidak bisa mengintip atau menyabotase perangkat lain.
2. Akun `backend_service` dapat membaca seluruh telemetry (`rumahjamur/#`) dan mengirim perintah kontrol (`rumahjamur/+/control`).
3. Pengguna tanpa autentikasi (*anonymous*) diblokir sepenuhnya di lingkungan produksi.
