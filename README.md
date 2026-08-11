# Sistem Monitoring & Penyemprotan Otomatis Rumah Jamur

Firmware modular untuk:

- ESP32 DevKit 38-pin/CP2102
- DHT22 sebanyak 5 sensor
- soil/media moisture sensor sebanyak 3 sensor langsung ke ADC ESP32 untuk monitoring
- relay pompa pada GPIO32
- pompa DC 12V
- PSU 12V dan LM2596 5V

Proyek ini ditata sebagai firmware **PlatformIO** untuk ESP32 DevKit 38-pin/CP2102 dengan sistem monitoring IoT berbasis web.

---

## 1. Arsitektur Sistem

### Control Path (selalu aktif, tidak bergantung monitoring)

```
DHT22 x5 + Soil x3
      │
      ▼
SensorManager → DecisionEngine → PumpController → Relay → Pompa DC 12V
```

### Monitoring Path (opsional, tidak mempengaruhi kontrol pompa)

```
ESP32 → Wi-Fi → Mosquitto (MQTT) → FastAPI Backend → WebSocket → React Dashboard
```

> **Aturan utama**: Seluruh monitoring stack bersifat opsional.
> Jika Wi-Fi, Mosquitto, backend, atau frontend mati, pompa tetap bekerja normal.

---

## 2. Struktur Folder

```text
jamur-dashboard/
├── platformio.ini
├── README.md
├── AGENTS.md
├── LICENSE
├── src/                        ← Firmware ESP32 (existing)
│   ├── AppConfig.h             ← Konfigurasi user (pin, threshold, WiFi/MQTT)
│   ├── Types.h                 ← Enum dan struct
│   ├── DecisionEngine.h/.cpp   ← Logika kontrol pompa (jangan diubah)
│   ├── SensorManager.h/.cpp    ← Baca DHT + soil
│   ├── PumpController.h/.cpp   ← State machine pompa
│   ├── MqttPublisher.h/.cpp    ← Publish telemetry (non-blocking)
│   ├── Logger.h/.cpp           ← Serial logging
│   └── main.cpp
├── mosquitto/
│   └── mosquitto.conf          ← Konfigurasi broker MQTT
├── backend/                    ← FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── api/routes.py       ← REST + WebSocket
│   │   ├── mqtt/client.py      ← MQTT subscriber
│   │   ├── services/state.py   ← In-memory state
│   │   ├── services/telemetry.py
│   │   └── database/db.py      ← SQLite
│   ├── requirements.txt
│   └── .env.example
├── frontend/                   ← React + Vite + Tailwind + Recharts
│   ├── src/
│   │   ├── components/         ← HeroEnvironment, SensorChart, dll
│   │   ├── hooks/              ← useTelemetry, useWebSocket
│   │   ├── services/           ← api.js, websocket.js
│   │   ├── pages/Dashboard.jsx
│   │   └── App.jsx
│   └── .env.example
└── docs/
    ├── DASHBOARD.md            ← Dokumentasi dashboard (baru)
    ├── WIRING.md
    ├── CONFIGURATION.md
    ├── CALIBRATION.md
    ├── TEST_PLAN.md
    └── TROUBLESHOOTING.md
```

---

## 3. Pin Mapping Firmware

| Fungsi | ESP32 |
|---|---:|
| DHT_Z1 DATA | GPIO23 |
| DHT_Z2 DATA | GPIO19 |
| DHT_Z3 DATA | GPIO18 |
| DHT_Z4 DATA | GPIO16 |
| DHT_Z5 DATA | GPIO17 |
| SOIL_Z1 AO | GPIO36 / VP |
| SOIL_Z2 AO | GPIO35 |
| SOIL_Z3 AO | GPIO34 |
| Relay IN | GPIO32 |

LCD I2C dan CD74HC4067 tidak digunakan pada wiring final.  
Soil sensor tidak mempengaruhi keputusan pompa, hanya data monitoring.

---

## 4. MQTT Topics & Payload

### Topics

| Topic | Publisher | Keterangan |
|---|---|---|
| `rumahjamur/{device_id}/telemetry` | ESP32 | Setiap 10 detik |
| `rumahjamur/{device_id}/status` | ESP32 + LWT | `{"online":true/false}` retained |

### Telemetry Payload

```json
{
  "device_id":           "rumah-jamur-01",
  "timestamp":           "2025-01-01T00:00:00Z",
  "temperature":         28.4,
  "humidity":            87.2,
  "soil_average":        61.7,
  "dht_valid":           5,
  "dht_total":           5,
  "soil_valid":          3,
  "soil_total":          3,
  "pump":                false,
  "pump_reason":         "NO_THRESHOLD_MET",
  "system_state":        "NORMAL",
  "cooldown_remaining_s": 0
}
```

### Nilai `pump_reason` (dari `Types.h` — source of truth)

| Nilai | Kondisi |
|---|---|
| `HUMIDITY_DEMAND` | RH ≤ RH_ON_THRESHOLD |
| `TEMP_HIGH_THRESHOLD` | Suhu ≥ TEMP_HIGH_THRESHOLD_C |
| `NO_THRESHOLD_MET` | Kondisi normal, pompa OFF |
| `RH_MAX_THRESHOLD` | RH ≥ RH_MAX_THRESHOLD, pompa diblokir |
| `NO_VALID_DHT` | 0 DHT valid, pompa diblokir |
| `COOLDOWN` | PumpState::COOLDOWN aktif |

### LWT (Last Will Testament)

ESP32 mengkonfigurasi LWT pada saat connect ke Mosquitto.  
Jika ESP32 disconnect, broker otomatis publish:

```json
{ "online": false }
```

ke topic `rumahjamur/rumah-jamur-01/status` sebagai retained message.

---

## 5. Cara Menjalankan

### Prasyarat

- [Mosquitto](https://mosquitto.org/download/)
- Python 3.11+
- Node.js 18+
- PlatformIO (VS Code extension atau CLI)

### 5.1 Mosquitto

```bash
mosquitto -c mosquitto/mosquitto.conf
```

Subscribe semua topic untuk debug:
```bash
mosquitto_sub -h localhost -t "rumahjamur/#" -v
```

### 5.2 Backend

```bash
cd backend
copy .env.example .env      # Windows
# cp .env.example .env      # Linux/macOS
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Endpoint tersedia di `http://localhost:8000/docs`

### 5.3 Frontend

```bash
cd frontend
copy .env.example .env      # Windows
npm install
npm run dev
```

Buka: **http://localhost:5173**

### 5.4 ESP32

1. Edit `src/AppConfig.h` — isi `WIFI_SSID`, `WIFI_PASSWORD`, `MQTT_BROKER` (IP lokal)
2. Upload:

```bash
pio run --target upload
pio device monitor
```

### Urutan Startup yang Benar

```
1. Mosquitto → 2. Backend → 3. Frontend → 4. ESP32 upload
```

Lihat [docs/DASHBOARD.md](docs/DASHBOARD.md) untuk panduan lengkap.

---

## 6. Cara Menjalankan di PlatformIO

1. Install extension PlatformIO di VS Code.
2. Buka folder root project.
3. Tunggu PlatformIO mengunduh library dari `platformio.ini`.
4. Edit `src/AppConfig.h` untuk konfigurasi Wi-Fi dan MQTT.
5. **Build**, **Upload**, **Monitor**.

```bash
pio run
pio run --target upload
pio device monitor
```

---

## 7. Cara Menjalankan di Arduino IDE

1. Install board ESP32 melalui Boards Manager.
2. Pilih board **ESP32 Dev Module**.
3. Install library:
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor`
   - `PubSubClient` by Nick O'Leary
   - `ArduinoJson` by Benoit Blanchon
4. Salin semua file dari `src/` ke folder sketch Arduino.
5. Edit `AppConfig.h` untuk kredensial Wi-Fi dan MQTT.
6. Compile dan upload.
7. Buka Serial Monitor pada `115200 baud`.

---

## 8. Konfigurasi

### Wi-Fi & MQTT (AppConfig.h)

```cpp
#define WIFI_SSID     "nama_wifi"
#define WIFI_PASSWORD "password_wifi"
#define MQTT_BROKER   "192.168.1.xxx"  // IP Mosquitto
#define MQTT_PORT     1883
#define MQTT_CLIENT_ID "rumah-jamur-01"
#define DEVICE_ID      "rumah-jamur-01"
```

### Threshold Pompa (AppConfig.h)

| Parameter | Nilai awal |
|---|---:|
| RH ON | 85% |
| RH OFF | 90% |
| RH maksimum | 95% |
| Suhu tinggi | 30 °C |
| Pompa ON | 8 detik |
| Cooldown | 300 detik |
| Maksimum ON pengaman | 15 detik |
| Interval pembacaan | 5 detik |

Nilai ini adalah **nilai awal pengujian**, bukan angka final untuk semua kondisi.

### Environment Variables Backend

Lihat `backend/.env.example`

### Environment Variables Frontend

Lihat `frontend/.env.example`

---

## 9. REST API Backend

| Endpoint | Keterangan |
|---|---|
| `GET /api/status` | Status backend, MQTT, device |
| `GET /api/telemetry/current` | State telemetry terkini dari memory |
| `GET /api/history?hours=12` | Data historis dari SQLite |
| `GET /api/config` | Konfigurasi statis |
| `WS /ws` | Real-time push setiap telemetry baru |

---

## 10. Cara Kerja Kontrol

```text
AVG TEMP  = rata-rata suhu dari DHT valid
AVG HUMID = rata-rata kelembapan dari DHT valid
```

Pompa diminta menyala jika:

```text
AVG HUMID <= RH ON threshold (85%)
ATAU
AVG TEMP >= threshold suhu tinggi (30°C)
```

Jika RH >= RH_MAX (95%), pompa diblokir meskipun ada demand.  
Jika 0 DHT valid, pompa wajib OFF.

Siklus pompa:
```text
ON 8 detik → OFF → Cooldown 300 detik → evaluasi ulang
```

Hysteresis RH mencegah on/off cepat di sekitar ambang.

---

## 11. Relay Aktif LOW/HIGH

```cpp
constexpr bool RELAY_ACTIVE_LOW = true;
```

Ubah ke `false` jika relay terbalik (aktif HIGH).

---

## 12. Daya ESP32 dan Sensor

```text
PSU 12V
├── 12V_BUS → relay/pompa
└── LM2596 5V → 5V_BUS → ESP32 pin 5V

3V3_SENSOR_BUS
├── DHT22 x5
└── soil sensor x3 (langsung ke ADC ESP32)
```

---

## 13. Kalibrasi Soil

```cpp
constexpr int SOIL_RAW_DRY[] = {3200, 3200, 3200};
constexpr int SOIL_RAW_WET[] = {1300, 1300, 1300};
```

Lihat [docs/CALIBRATION.md](docs/CALIBRATION.md) untuk prosedur kalibrasi.

---

## 14. Troubleshooting

Lihat [docs/DASHBOARD.md](docs/DASHBOARD.md) untuk troubleshooting monitoring stack.  
Lihat [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) untuk troubleshooting hardware/firmware.

---

## 15. Batasan Versi Saat Ini

- Manual pump command dari dashboard: belum aktif (arsitektur disiapkan, tidak diimplementasi)
- Threshold read-only di dashboard (tidak bisa diedit via web)
- Belum ada solenoid per zona
- Semua nozzle menyemprot bersamaan
- Belum ada deteksi tangki kosong atau flow sensor
- Config publish via MQTT: opsional, belum diimplementasi

## 16. Status Kesehatan DHT

| Status | Kondisi |
|---|---|
| `NORMAL` | 5/5 DHT valid |
| `DEGRADED` | 1-4/5 DHT valid |
| `ERROR` | 0/5 DHT valid |

---

## 17. Catatan Penting Lingkungan Lembap

- Panel AC/DC ditempatkan di area kering
- DHT tidak boleh terkena semprotan langsung
- Modul elektronik soil harus dilindungi
- Gunakan cable gland dan drip loop
- Jangan menyalurkan arus pompa melalui breadboard
- Gunakan fuse sesuai arus pompa
