# Production Guide — Standar Konfigurasi Lingkungan Produksi

Dokumen spesifikasi produksi untuk sistem `mushroom-monitoring` pada server VPS publik.

---

## 1. Spesifikasi Server Produksi

| Parameter | Nilai / Konfigurasi |
|---|---|
| **Domain Produksi** | `sirkulalestari.com` (dan `www.sirkulalestari.com`) |
| **Alamat IPv4 Publik** | `103.245.38.68` |
| **Sistem Operasi** | Ubuntu Server 22.04 LTS / 24.04 LTS |
| **Kapasitas CPU** | 2 vCPU |
| **Kapasitas RAM** | 2 GB RAM |
| **Kapasitas Disk** | 40 GB NVMe / SSD |

---

## 2. Alokasi Sumber Daya (*Resource Budgeting*)

Dalam batasan RAM 2 GB, alokasi memori dirancang secara hemat dan stabil:

| Layanan | Estimasi Penggunaan RAM | Peran |
|---|---|---|
| **OS Ubuntu Base** | ~200 MB | Kernel, systemd, sshd |
| **Nginx Web Server** | ~30 MB | SSL termination, reverse proxy, static file serving |
| **Mosquitto MQTT** | ~25 MB | Pub/Sub message broker (persisten + TLS) |
| **FastAPI Backend (1 worker)** | ~120 MB | asyncio runtime, aiomqtt, in-memory state, SQLite |
| **Buffer & OS Disk Cache** | ~1.6 GB | File system cache untuk SQLite WAL & query cepat |
| **Total** | **< 400 MB RAM Aktif** | Sisa RAM > 1.5 GB tersedia untuk kestabilan sistem |

---

## 3. Matriks Environment Variable Produksi

### Backend (`/var/www/mushroom-monitoring/backend/.env`)

| Variable | Nilai Produksi Contoh | Keterangan |
|---|---|---|
| `APP_ENV` | `production` | Menonaktifkan Swagger docs publik & debug logs |
| `CORS_ORIGINS` | `https://sirkulalestari.com,https://www.sirkulalestari.com` | Whitelist domain frontend resmi |
| `CONTROL_API_KEY` | *(String acak 32+ karakter)* | Kunci rahasia untuk otorisasi `POST /api/control` |
| `MQTT_BROKER_HOST` | `127.0.0.1` | Koneksi internal ke broker Mosquitto di VPS |
| `MQTT_BROKER_PORT` | `1883` | Port listener lokal internal |
| `MQTT_USERNAME` | `backend_service` | Username khusus backend |
| `MQTT_PASSWORD` | *(Password kuat)* | Password user `backend_service` di `passwd` Mosquitto |
| `DATABASE_URL` | `/var/www/mushroom-monitoring/backend/jamur_dashboard.db` | Jalur file database SQLite persisten |

### Frontend (`/var/www/mushroom-monitoring/frontend/.env`)

| Variable | Nilai Produksi | Keterangan |
|---|---|---|
| `VITE_API_URL` | *(Kosong)* | Menggunakan jalur relatif (`/api`) via Nginx reverse proxy |
| `VITE_WS_URL` | *(Kosong)* | Otomatis me-resolve ke `wss://sirkulalestari.com` |
| `VITE_CONTROL_API_KEY` | *(Kosong)* | Dikosongkan agar secret tidak bocor dalam bundle JS |

---

## 4. Konfigurasi Firmware ESP32 Produksi

Pada file `src/AppConfig.h`, aktifkan profil produksi:
```cpp
#define USE_PRODUCTION_CONFIG

#ifdef USE_PRODUCTION_CONFIG
  #define WIFI_SSID     "WiFi_Kumbung_Produksi"
  #define WIFI_PASSWORD "Password_WiFi_Kumbung"
  #define MQTT_BROKER   "sirkulalestari.com"
  #define MQTT_PORT     1883 // Atau 8883 jika menggunakan TLS
  #define MQTT_USERNAME "esp32_device"
  #define MQTT_PASSWORD "Password_Akun_ESP32_Device"
#endif
```
