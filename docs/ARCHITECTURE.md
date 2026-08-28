# Architecture Overview — Sistem Monitoring & Otomasi Rumah Jamur

## 1. Executive Summary

Sistem ini adalah arsitektur IoT terpadu yang dirancang untuk memantau iklim mikro (suhu dan kelembapan udara) serta kelembapan media tanam (baglog) pada budidaya jamur tiram, sekaligus mengendalikan sistem pengabutan (*misting pump*) secara otomatis dan terjadwal.

Target sistem produksi:
- **Domain Produksi**: `sirkulalestari.com` (dan `www.sirkulalestari.com`)
- **VPS Public IPv4**: `103.245.38.68`
- **Spesifikasi Server**: Ubuntu Server LTS (2 vCPU, 2 GB RAM, 40 GB Storage)

---

## 2. Diagram Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             KUMBUNG JAMUR (EDGE)                            │
│                                                                             │
│   4x DHT22 (GPIO 23, 19, 18, 17)        2x Soil Moisture (GPIO 35, 34)      │
│                 │                                     │                     │
│                 └──────────────────┬──────────────────┘                     │
│                                    ▼                                        │
│                      [ ESP32: SensorManager.cpp ]                           │
│                                    │                                        │
│                   ┌────────────────┴────────────────┐                       │
│                   ▼                                 ▼                       │
│    [ Control Path (SELALU OTONOM) ]     [ Monitoring Path (Non-blocking) ]  │
│    ├── DecisionEngine.cpp               └── MqttPublisher.cpp               │
│    ├── ScheduleEngine.h (07,12,17 WIB)              │ (JSON via Wi-Fi)      │
│    ├── PumpController.cpp                           │                       │
│    └── 12V Relay -> Pompa DC 12V                   │                       │
└─────────────────────────────────────────────────────┼───────────────────────┘
                                                      │ MQTT (Port 1883/8883)
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VPS PRODUCTION (103.245.38.68)                           │
│                                                                             │
│   [ Mosquitto Broker ] ◄── Autentikasi User & ACL Least-Privilege           │
│         │ (Internal IPC via 127.0.0.1:1883)                                 │
│         ▼                                                                   │
│   [ FastAPI Backend (Single Worker) ]                                       │
│   ├── In-Memory Hot State (app_state) ──► Stale Detection (<30s)            │
│   ├── SQLite (WAL Mode, Retensi 12 Jam Rolling Window)                      │
│   ├── Token Authentication Guard (POST /api/control)                        │
│   └── WebSocket Manager (Broadcast real-time frame)                         │
│         │                                                                   │
│         ▼ (Reverse Proxy via 127.0.0.1:8000)                                │
│   [ Nginx Web Server ] ◄── SSL / TLS Let's Encrypt                          │
│   ├── Servis Berkas Statis React Frontend (/var/www/.../dist)               │
│   ├── Proxy /api/ ke FastAPI                                                │
│   └── Proxy /ws (Upgrade Connection) ke WebSocket FastAPI                   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ HTTPS / WSS
                                      ▼
                      [ Klien Web Dashboard (Browser) ]
```

---

## 3. Prinsip Desain Utama

### 1. Otonomi Penuh ESP32 (*Hardware Autonomy*)
ESP32 adalah pemilik tunggal keputusan penyiraman. Seluruh monitoring stack (Wi-Fi, Mosquitto, FastAPI, WebSocket, Database, Dashboard) bersifat *read-only observer*. Jika koneksi internet, VPS, atau broker MQTT mati total, kontrol pompa pada ESP32 **tetap berjalan 100% normal** tanpa gangguan.

### 2. Kepemilikan `pump_reason` dan `system_state`
- `pump_reason` dan `system_state` diproduksi langsung oleh ESP32.
- Backend dan frontend **dilarang memanipulasi, menyimpulkan, atau mengarang** alasan pompa. Nilai dari payload ditampilkan secara *verbatim*.

### 3. Single Worker FastAPI
Karena WebSocket connection manager dan active telemetry snapshot disimpan dalam memori RAM (`app_state`), backend dirancang menggunakan **1 worker Uvicorn**. Menjalankan multiple worker tanpa Redis IPC akan menyebabkan *state splitting*. Untuk VPS 2 GB RAM, 1 worker adalah konfigurasi paling stabil dan hemat sumber daya.

### 4. SQLite dengan Mode WAL (*Write-Ahead Logging*)
SQLite digunakan sebagai database time-series lokal dengan mode WAL (`PRAGMA journal_mode = WAL;`) dan `PRAGMA synchronous = NORMAL;`. Ini memungkinkan pembacaan (query grafik histori) dan penulisan (insert telemetry) berjalan secara bersamaan tanpa lock contention.

---

## 4. Struktur Topik MQTT

| Topik | Arah | Format Payload | Keterangan |
|---|---|---|---|
| `rumahjamur/{device_id}/telemetry` | ESP32 $\rightarrow$ Broker $\rightarrow$ Backend | JSON | Telemetry sensor, status pompa, reason (tiap 10s) |
| `rumahjamur/{device_id}/status` | ESP32 / LWT $\rightarrow$ Broker $\rightarrow$ Backend | `{"online": bool}` | Status online/offline perangkat (retained) |
| `rumahjamur/{device_id}/control` | Backend $\rightarrow$ Broker $\rightarrow$ ESP32 | `{"mode":"AUTO"/"MANUAL", "pump":bool}` | Perintah kontrol pompa manual/otomatis |
