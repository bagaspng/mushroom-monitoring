# Dashboard Monitoring Rumah Jamur

Dokumentasi khusus sistem monitoring IoT berbasis web untuk Rumah Jamur.  
Mencakup penjelasan setiap bagian dashboard, cara menjalankan semua server, dan troubleshooting.

---

## Daftar Isi

1. [Arsitektur Monitoring](#1-arsitektur-monitoring)
2. [Tampilan Dashboard](#2-tampilan-dashboard)
3. [Cara Menjalankan](#3-cara-menjalankan)
4. [Environment Variables](#4-environment-variables)
5. [MQTT Contract](#5-mqtt-contract)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Arsitektur Monitoring

```
ESP32 (control path — SELALU aktif)
  DHT22 x5 + Soil x3
       │
       ▼
  SensorManager → DecisionEngine → PumpController → Relay → Pompa DC

ESP32 (monitoring path — opsional)
       │
       ▼ Wi-Fi (non-blocking)
  Mosquitto (MQTT broker, port 1883)
       │
       ▼ aiomqtt subscribe
  FastAPI backend (port 8000)
   ├── SQLite (telemetry 12 jam)
   ├── In-memory current state
   └── WebSocket broadcast
            │
            ▼ WebSocket / REST
  React Dashboard (port 5173)
```

> **Prinsip utama**: Jika seluruh monitoring stack mati (Wi-Fi, Mosquitto, backend, frontend), 
> pompa tetap bekerja normal berdasarkan keputusan ESP32 sendiri.

---

## 2. Tampilan Dashboard

### 2.1 Header
- Nama sistem **Rumah Jamur** dengan ikon 🍄
- Badge koneksi real-time: `Live` / `Connecting…` / `Disconnected`
- Sticky di atas layar saat scroll

### 2.2 Hero Environment
Menampilkan dua metrik paling penting:

| Metrik | Sumber | Satuan |
|--------|--------|--------|
| Suhu Rata-rata | AVG dari semua DHT valid | °C |
| Kelembapan Rata-rata | AVG dari semua DHT valid | % |

- Indikator waktu terakhir update (detik/menit yang lalu)
- Jika data tidak diterima > 30 detik: banner **"No recent data"** muncul
- Nilai ditampilkan `—` saat stale

### 2.3 Grafik Suhu & Kelembapan
- Library: **Recharts** `ComposedChart`
- **Satu grafik, dua garis, dua sumbu Y**:
  - Suhu → sumbu kiri (biru, `°C`)
  - Kelembapan → sumbu kanan (teal, `%`)
- Data: 12 jam terakhir dari SQLite via `GET /api/history`
- Tooltip interaktif dengan waktu & nilai
- Update real-time via WebSocket

### 2.4 Kelembapan Media Tanam (Soil)
- Nilai: **average** dari semua soil sensor valid
- Badge **"Monitoring Only"** (ungu) — tidak mempengaruhi keputusan pompa
- Progress bar warna: merah (kering) → amber → teal (basah)
- **Tidak menampilkan** nilai individual Soil Z1, Z2, Z3

### 2.5 Status Pompa
- Indikator **ON** / **OFF** / **COOLDOWN** / **IDLE**
- Reason ditampilkan persis dari ESP32, tanpa modifikasi:

  | Reason (dari Types.h) | Artinya |
  |---|---|
  | `HUMIDITY_DEMAND` | RH ≤ RH_ON → pompa hidup |
  | `TEMP_HIGH_THRESHOLD` | Suhu ≥ batas → pompa hidup |
  | `NO_THRESHOLD_MET` | Kondisi normal, pompa OFF |
  | `RH_MAX_THRESHOLD` | RH ≥ 95%, pompa diblokir |
  | `NO_VALID_DHT` | Semua DHT gagal, pompa OFF |
  | `COOLDOWN` | Sedang dalam cooldown |

- Countdown cooldown jika `cooldown_remaining_s > 0`
- **Frontend tidak menghitung atau mengarang reason**

### 2.6 Status Sistem
- **ESP32**: Online / Offline (dari LWT retained message)
- **Sensor DHT**: `N/5 Aktif` + label `NORMAL` / `DEGRADED` / `ERROR`
- **Sensor Soil**: `N/3 Aktif`
- **Backend**: Online (jika REST berhasil) / Offline
- **MQTT** (backend side): Connected / Disconnected
- **WebSocket**: status animasi + label

### 2.7 Threshold (Read-only)
- Nilai dari `src/AppConfig.h`:
  - RH ON: ≤ 85%
  - RH OFF: ≥ 90%
  - RH MAX: ≥ 95%
  - Suhu Tinggi: ≥ 30°C
  - Durasi Pompa: 8 detik
  - Cooldown: 300 detik
- **Tidak ada fitur edit** di dashboard
- Edit langsung di `src/AppConfig.h` dan upload ulang ke ESP32

---

## 3. Cara Menjalankan

### Prasyarat
- [Mosquitto](https://mosquitto.org/download/) (MQTT broker)
- Python 3.11+
- Node.js 18+
- ESP32 dengan firmware ter-upload

### 3.1 Mosquitto (MQTT Broker)

**Install Mosquitto di Windows:**
```bash
# Download installer dari https://mosquitto.org/download/
# Atau via winget:
winget install mosquitto
```

**Jalankan broker:**
```bash
# Dari root project:
mosquitto -c mosquitto/mosquitto.conf
```

Output yang diharapkan:
```
1720000000: mosquitto version 2.x.x starting
1720000000: Opening ipv4 listen socket on port 1883.
```

**Verifikasi broker:**
```bash
# Subscribe semua topic
mosquitto_sub -h localhost -t "rumahjamur/#" -v

# Publish test manual
mosquitto_pub -h localhost -t "rumahjamur/test/hello" -m '{"test":1}'
```

### 3.2 Backend (FastAPI)

**Setup:**
```bash
cd backend

# Salin dan sesuaikan .env
copy .env.example .env
# Edit .env: set MQTT_BROKER_HOST, MQTT_BROKER_PORT, DATABASE_URL

# Install dependencies
pip install -r requirements.txt
```

**Jalankan:**
```bash
# Dari folder backend/
uvicorn app.main:app --reload --port 8000
```

Output yang diharapkan:
```
INFO     Initializing database...
INFO     Database ready
INFO     MQTT listener task started
INFO     Connecting to MQTT broker localhost:1883
INFO     MQTT connected
INFO:     Application startup complete.
```

**Verifikasi endpoint:**
```bash
curl http://localhost:8000/api/status
curl http://localhost:8000/api/telemetry/current
curl http://localhost:8000/api/history?hours=12
curl http://localhost:8000/api/config
```

Dokumentasi interaktif API tersedia di:  
`http://localhost:8000/docs`

### 3.3 Frontend (React + Vite)

**Setup:**
```bash
cd frontend

# Salin dan sesuaikan .env
copy .env.example .env
# Defaultnya sudah benar untuk localhost

# Install dependencies (hanya pertama kali)
npm install
```

**Jalankan:**
```bash
npm run dev
```

Buka browser: **http://localhost:5173**

### 3.4 ESP32

**Edit kredensial Wi-Fi dan MQTT di `src/AppConfig.h`:**
```cpp
#define WIFI_SSID     "nama_wifi_anda"
#define WIFI_PASSWORD "password_wifi"
#define MQTT_BROKER   "192.168.1.xxx"  // IP komputer yang menjalankan Mosquitto
```

**Upload firmware:**
```bash
# Dari root project:
pio run --target upload
pio device monitor
```

**Verifikasi ESP32 terhubung (lihat di subscriber):**
```
rumahjamur/rumah-jamur-01/status {"online":true}
rumahjamur/rumah-jamur-01/telemetry {"device_id":"rumah-jamur-01",...}
```

### 3.5 Urutan Startup yang Benar

```
1. Mosquitto    → harus pertama (broker harus siap sebelum ESP32 dan backend)
2. Backend      → subscribe ke Mosquitto
3. Frontend     → connect ke backend via HTTP + WebSocket
4. ESP32        → publish ke Mosquitto (bisa dijalankan kapan saja, tidak bergantung backend)
```

---

## 4. Environment Variables

### Backend (`backend/.env`)

| Variabel | Default | Keterangan |
|---|---|---|
| `MQTT_BROKER_HOST` | `localhost` | IP/hostname Mosquitto |
| `MQTT_BROKER_PORT` | `1883` | Port Mosquitto |
| `DATABASE_URL` | `./jamur_dashboard.db` | Path file SQLite |

### Frontend (`frontend/.env`)

| Variabel | Default | Keterangan |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend REST base URL |
| `VITE_WS_URL` | `ws://localhost:8000` | Backend WebSocket base URL |

---

## 5. MQTT Contract

### Topics

| Topic | Publisher | Keterangan |
|---|---|---|
| `rumahjamur/{device_id}/telemetry` | ESP32 | Payload sensor + pompa setiap 10 detik |
| `rumahjamur/{device_id}/status` | ESP32 + Broker LWT | `{"online":true/false}` retained |

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
| `HUMIDITY_DEMAND` | RH ≤ RH_ON_THRESHOLD → pompa ON |
| `TEMP_HIGH_THRESHOLD` | Suhu ≥ TEMP_HIGH_THRESHOLD_C → pompa ON |
| `NO_THRESHOLD_MET` | Tidak ada threshold terpenuhi → pompa OFF |
| `RH_MAX_THRESHOLD` | RH ≥ RH_MAX_THRESHOLD → pompa diblokir |
| `NO_VALID_DHT` | 0 DHT valid → pompa diblokir |
| `COOLDOWN` | PumpState::COOLDOWN aktif |
| `NONE` | Belum dievaluasi |

---

## 6. Troubleshooting

### Dashboard menampilkan "No recent data"
1. Cek ESP32 terhubung ke Wi-Fi (Serial Monitor)
2. Cek Mosquitto berjalan: `mosquitto_sub -h localhost -t "rumahjamur/#" -v`
3. Cek backend: `curl http://localhost:8000/api/status`
4. Cek IP Mosquitto di `AppConfig.h` sudah benar

### Backend tidak terhubung ke Mosquitto
```
ERROR    MQTT disconnected: ... retrying in 5s
```
- Pastikan Mosquitto sudah berjalan sebelum backend
- Cek `MQTT_BROKER_HOST` di `.env`

### WebSocket terus "Connecting…"
- Pastikan backend berjalan di port 8000
- Cek `VITE_WS_URL` di `.env` frontend
- Cek CORS: `allow_origins` di `backend/app/main.py` harus include URL frontend

### ESP32 tidak publish
- Serial Monitor: cari `[MQTT]` log
- Pastikan `WIFI_SSID`, `WIFI_PASSWORD`, `MQTT_BROKER` benar di `AppConfig.h`
- Pastikan firewall Windows tidak memblokir port 1883

### Timestamp 1970-01-01T00:00:00Z di payload
- NTP belum tersync; butuh beberapa detik setelah Wi-Fi connect
- Pastikan ESP32 punya akses internet untuk `pool.ntp.org`

### Grafik kosong / tidak ada data historis
- Periksa SQLite file ada di `backend/jamur_dashboard.db`
- Test: `curl http://localhost:8000/api/history?hours=12`
- Tunggu minimal 1 telemetry tersimpan (10 detik setelah ESP32 connect)
