# Sistem Monitoring & Penyemprotan Otomatis Rumah Jamur (Mushroom Monitoring)

Sistem IoT terpadu untuk pemantauan iklim mikro (suhu & kelembapan udara), kelembapan media tanam (baglog), dan otomasi penyemprotan kabut (*misting pump*) pada budidaya jamur tiram.

- **Domain Produksi**: [https://sirkulalestari.com](https://sirkulalestari.com)
- **Target Server**: Ubuntu Server LTS (VPS IP: `103.245.38.68`, 2 vCPU, 2 GB RAM)
- **Stack Teknologi**: ESP32 (C++ PlatformIO) + Mosquitto MQTT (TLS 8883/1883) + FastAPI (Python Async) + SQLite (WAL Mode) + React/Vite (Tailwind + Recharts) + Nginx.

---

## 1. Arsitektur Sistem

### A. Control Path (Selalu Otonom & Prioritas Tertinggi)
```
DHT22 x4 + Soil x2
      │
      ▼
SensorManager → DecisionEngine → PumpController → Relay → Pompa DC 12V
```
> **Prinsip Utama**: Kontrol pompa berjalan 100% otonom di ESP32. Jika seluruh monitoring stack (Wi-Fi, Mosquitto, FastAPI, Nginx, Internet) mati, penyemprotan otomatis tetap bekerja normal berdasarkan sensor lokal.

### B. Monitoring Path (Non-blocking Observer)
```
ESP32 → Wi-Fi (MQTT) → Mosquitto Broker → FastAPI Backend → SQLite (WAL) + WebSocket → React Dashboard
```

---

## 2. Pin Mapping Hardware (ESP32 DevKit 38-Pin)

| Fungsi | Pin ESP32 | Keterangan |
|---|---|---|
| **DHT_Z1 DATA** | GPIO 23 | Sensor Suhu & Kelembapan Udara 1 |
| **DHT_Z2 DATA** | GPIO 19 | Sensor Suhu & Kelembapan Udara 2 |
| **DHT_Z3 DATA** | GPIO 18 | Sensor Suhu & Kelembapan Udara 3 |
| **DHT_Z4 DATA** | GPIO 17 | Sensor Suhu & Kelembapan Udara 4 |
| **SOIL_Z1 AO** | GPIO 35 / VP | Sensor Kelembapan Media Tanam 1 (Monitoring Only) |
| **SOIL_Z2 AO** | GPIO 34 | Sensor Kelembapan Media Tanam 2 (Monitoring Only) |
| **RELAY IN** | GPIO 32 | Kontrol Pompa DC 12V (Active-Low) |

---

## 3. Cara Menjalankan Project (Lokal Development)

### Prasyarat
- [Mosquitto MQTT Broker](https://mosquitto.org/download/) (v2.x)
- Python 3.11+
- Node.js 18+ & npm
- PlatformIO Core / IDE (VSCode extension)
- Board ESP32 terhubung via kabel USB

---

### Langkah 1: Jalankan Mosquitto (Broker MQTT)
Buka terminal pertama, jalankan broker dari root project:
```bash
mosquitto -c mosquitto/mosquitto.conf -v
```
*Broker akan aktif dan mendengarkan koneksi lokal di port `1883`.*

---

### Langkah 2: Jalankan Backend (FastAPI)

Buka terminal/tab baru dan jalankan langkah-langkah berikut:

#### 1. Masuk ke Direktori Backend
```bash
cd backend
```

#### 2. Buat & Aktifkan Virtual Environment (Cukup sekali saat setup awal)
- **Windows (PowerShell):**
  ```powershell
  python -m venv .venv
  # Jika muncul error policy saat aktivasi di PowerShell, jalankan dulu:
  # Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\.venv\Scripts\Activate.ps1
  ```
- **Windows (Command Prompt / CMD):**
  ```cmd
  python -m venv .venv
  .venv\Scripts\activate.bat
  ```
- **Linux / macOS:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

#### 3. Pasang Dependensi Python
```bash
pip install -r requirements.txt
```

#### 4. Konfigurasi File Environment (`.env`)
Jika belum ada file `.env`, salin dari template `.env.example`:
- **Windows:**
  ```powershell
  copy .env.example .env
  ```
- **Linux/macOS:**
  ```bash
  cp .env.example .env
  ```

#### 5. Jalankan Server FastAPI
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
> **Tips Cepat Windows (One-Liner tanpa aktivasi manual):**
> ```powershell
> cd backend; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
> ```

#### 6. Verifikasi Akses Backend
Buka browser atau uji melalui curl:
- **Root Info:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Status API & MQTT:** [http://127.0.0.1:8000/api/status](http://127.0.0.1:8000/api/status)
- **Dokumentasi Interaktif (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **WebSocket Endpoint:** `ws://127.0.0.1:8000/ws`

---

### Langkah 3: Jalankan Frontend (React + Vite)

Buka terminal/tab baru lainnya:

#### 1. Masuk ke Direktori Frontend
```bash
cd frontend
```

#### 2. Pasang Dependensi Node.js (Cukup sekali saat awal atau jika ada library baru)
```bash
npm install
```

#### 3. Konfigurasi File Environment (`.env`)
Salin template konfigurasi jika belum ada file `.env`:
- **Windows:**
  ```powershell
  copy .env.example .env
  ```
- **Linux/macOS:**
  ```bash
  cp .env.example .env
  ```
*Secara default, frontend akan otomatis mengarah ke backend lokal `http://localhost:8000` dan WebSocket `ws://localhost:8000/ws`.*

#### 4. Jalankan Development Server Vite
```bash
npm run dev
```

#### 5. Akses Dashboard
Buka browser Anda di alamat:
👉 **`http://localhost:5173`**

> **Catatan Uji Coba Production Build (Opsional di Lokal):**
> Untuk menguji hasil compile production frontend di komputer lokal:
> ```bash
> npm run build
> npm run preview
> ```

---

### 🌐 Ringkasan Menjalankan di Server VPS (Production)

Jika Anda ingin menjalankan Backend dan Frontend di server produksi (Ubuntu VPS):

1. **Backend dijalankan sebagai Background Service (systemd daemon):**
   ```bash
   sudo systemctl start mushroom-backend     # Memulai backend
   sudo systemctl restart mushroom-backend   # Me-restart backend
   sudo systemctl status mushroom-backend    # Cek status aktif
   ```
2. **Frontend di-build menjadi aset statis dan disajikan oleh Nginx:**
   ```bash
   cd /var/www/mushroom-monitoring/frontend
   npm run build
   sudo systemctl reload nginx
   ```
   *(Aset ter-build di folder `frontend/dist` dan otomatis disajikan via HTTPS di `https://sirkulalestari.com`)*.

---

### 🛠️ Solusi Masalah Umum (Troubleshooting FE & BE)

| Gejala Masalah | Penyebab | Solusi |
|---|---|---|
| PowerShell: `cannot be loaded because running scripts is disabled` | Kebijakan eksekusi script Windows terkunci | Jalankan `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` di PowerShell sebelum aktivasi `.venv`. |
| Error `Address already in use` di port 8000 | Port backend dipakai proses lain | Tutup proses lama atau matikan via Task Manager / `kill` proses uvicorn sebelumnya. |
| Badge status dashboard menampilkan **OFFLINE** | Backend FastAPI atau Mosquitto belum berjalan | Pastikan terminal Mosquitto (port 1883) dan Backend FastAPI (port 8000) menyala tanpa pesan error. |
| Logo atau perubahan UI tidak muncul di browser | Cache browser menyimpan bundle JS lama | Lakukan *Hard Refresh* dengan menekan `Ctrl + Shift + R` atau `Ctrl + F5` di browser. |

### Langkah 4: Build & Upload Firmware ESP32
Buka terminal keempat dari root project:
1. Pastikan parameter Wi-Fi dan IP laptop Anda sudah diatur di `src/AppConfig.h`:
   ```cpp
   #define WIFI_SSID     "Nama_WiFi_Anda"
   #define WIFI_PASSWORD "Password_WiFi_Anda"
   #define MQTT_BROKER   "IP_LAPTOP_ANDA" // Contoh: "192.168.1.100"
   #define MQTT_PORT     1883
   ```
2. Validasi konfigurasi pin & threshold:
   ```bash
   python tools/check_config.py
   ```
3. Upload firmware ke board ESP32:
   ```bash
   pio run --target upload
   ```
4. Buka serial monitor untuk memantau log pembacaan sensor:
   ```bash
   pio device monitor
   ```

---

## 4. Struktur Repositori

```text
mushroom-monitoring/
├── platformio.ini              ← Konfigurasi build PlatformIO ESP32
├── README.md                   ← Dokumentasi utama project
├── pytest.ini                  ← Konfigurasi automated test backend
├── .gitignore                  ← Proteksi ketat rahasia, cert, dan database
├── src/                        ← Firmware ESP32
│   ├── AppConfig.h             ← Konfigurasi pin, threshold, profil DEV/PROD
│   ├── Types.h                 ← Enum & Struct data
│   ├── DecisionEngine.h/.cpp   ← Logika evaluasi penyemprotan (otonom)
│   ├── ScheduleEngine.h        ← Otomasi jadwal misting rutin (07, 12, 17 WIB)
│   ├── SensorManager.h/.cpp    ← Pembacaan & validasi 4x DHT22 + 2x Soil
│   ├── PumpController.h/.cpp   ← State machine pompa & proteksi cooldown
│   ├── MqttPublisher.h/.cpp    ← Pengiriman telemetry non-blocking
│   ├── Logger.h/.cpp           ← Serial monitor logging
│   └── main.cpp
├── mosquitto/                  ← Konfigurasi Broker MQTT
│   ├── mosquitto.conf          ← Konfigurasi development lokal (1883)
│   ├── mosquitto.prod.conf     ← Konfigurasi production (TLS 8883 + Auth)
│   └── acl.conf                ← Hak akses least-privilege topik MQTT
├── backend/                    ← FastAPI Backend (Python Async)
│   ├── app/
│   │   ├── main.py             ← Entrypoint FastAPI + CORS + Security Headers
│   │   ├── api/routes.py       ← REST API & WebSocket + Auth Guard (/api/control)
│   │   ├── mqtt/client.py      ← MQTT subscriber & command publisher (aiomqtt)
│   │   ├── services/state.py   ← In-memory hot state & stale detection (<30s)
│   │   ├── services/telemetry.py ← Validasi payload telemetry
│   │   └── database/db.py      ← SQLite WAL mode & 12-hour rolling retention
│   ├── tests/                  ← Automated test suite (Pytest + HTTPX)
│   ├── requirements.txt
│   └── .env.example            ← Template environment variables
├── frontend/                   ← Web Dashboard (React + Vite + Recharts)
│   ├── src/
│   │   ├── components/         ← HeroEnvironment, PumpStatus, SensorChart, dll
│   │   ├── hooks/              ← useTelemetry, useWebSocket
│   │   ├── services/           ← api.js, websocket.js
│   │   └── App.jsx
│   ├── package.json
│   └── .env.example
├── nginx/                      ← Konfigurasi Web Server & Reverse Proxy
│   └── sirkulalestari.com.conf ← Nginx block (HTTP redirect, SSL, SPA, /api, /ws)
├── systemd/                    ← Unit Service Linux Daemon
│   └── mushroom-backend.service ← Daemon systemd untuk FastAPI single worker
├── tools/
│   └── check_config.py         ← Script validasi pin & threshold AppConfig.h
└── docs/                       ← Dokumentasi Lengkap Sistem
    ├── ARCHITECTURE.md         ← Arsitektur mendalam sistem & data flow
    ├── DEVELOPMENT.md          ← Panduan setup & pengujian lingkungan lokal
    ├── PRODUCTION.md           ← Standar konfigurasi & resource budget VPS
    ├── MQTT.md                 ← Spesifikasi topik, skema payload, dan ACL
    ├── SECURITY.md             ← Model ancaman, proteksi API, dan manajemen rahasia
    ├── DEPLOYMENT.md           ← Playbook deployment langkah-demi-langkah ke VPS
    ├── BACKUP.md               ← Prosedur pencadangan SQLite & disaster recovery
    ├── TROUBLESHOOTING.md      ← Matriks diagnosa masalah hardware & server
    ├── DASHBOARD.md            ← Panduan penggunaan antarmuka web
    └── WIRING.md               ← Skema pinout & pengkabelan hardware
```

---

## 5. Pengujian & Verifikasi Kualitas

### Menjalankan Backend Tests (17 Test Suites)
```bash
pytest backend/tests -v
```

### Menjalankan Frontend Linter & Production Build
```bash
cd frontend
npm run lint
npm run build
```

### Memvalidasi Firmware ESP32
```bash
python tools/check_config.py
pio run
```

---

## 6. Indeks Dokumentasi Lengkap

1. [Arsitektur Sistem (ARCHITECTURE.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/ARCHITECTURE.md)
2. [Panduan Pengembangan Lokal (DEVELOPMENT.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/DEVELOPMENT.md)
3. [Standar Produksi (PRODUCTION.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/PRODUCTION.md)
4. [Spesifikasi MQTT & ACL (MQTT.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/MQTT.md)
5. [Keamanan & Proteksi API (SECURITY.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/SECURITY.md)
6. [Panduan Deployment VPS (DEPLOYMENT.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/DEPLOYMENT.md)
7. [Strategi Pencadangan Database (BACKUP.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/BACKUP.md)
8. [Matriks Troubleshooting (TROUBLESHOOTING.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/TROUBLESHOOTING.md)
