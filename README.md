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
> **Prinsip Utama**: Kontrol pompa berjalan 100% otonom di ESP32. Jika seluruh monitoring stack (Wi-Fi, Mosquitto, FastAPI, Nginx, Internet) mati, penyemprotan otomatis tetap bekerja normal.

### B. Monitoring Path (Non-blocking Observer)
```
ESP32 → Wi-Fi (MQTT) → Mosquitto Broker → FastAPI Backend → SQLite (WAL) + WebSocket → React Dashboard
```

---

## 2. Struktur Repositori

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

## 3. Indeks Dokumentasi Lengkap

1. [Arsitektur Sistem (ARCHITECTURE.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/ARCHITECTURE.md)
2. [Panduan Pengembangan Lokal (DEVELOPMENT.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/DEVELOPMENT.md)
3. [Standar Produksi (PRODUCTION.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/PRODUCTION.md)
4. [Spesifikasi MQTT & ACL (MQTT.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/MQTT.md)
5. [Keamanan & Proteksi API (SECURITY.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/SECURITY.md)
6. [Panduan Deployment VPS (DEPLOYMENT.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/DEPLOYMENT.md)
7. [Strategi Pencadangan Database (BACKUP.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/BACKUP.md)
8. [Matriks Troubleshooting (TROUBLESHOOTING.md)](file:///d:/Documents/PlatformIO/Projects/jamur-dashboard/docs/TROUBLESHOOTING.md)

---

## 4. Pengujian & Verifikasi Kualitas

### Menjalankan Backend Tests
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
