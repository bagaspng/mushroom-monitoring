# Development Guide — Panduan Lingkungan Pengembangan Lokal

Panduan menjalankan dan menguji sistem `mushroom-monitoring` di komputer lokal (Windows / Linux / macOS).

---

## 1. Prasyarat Perangkat Lunak

- **Python**: Versi 3.11+
- **Node.js**: Versi 18+ (dengan npm)
- **Mosquitto MQTT Broker**: Versi 2.x
- **PlatformIO Core / IDE**: Untuk build & flash firmware ESP32

---

## 2. Menjalankan Komponen Secara Lokal

### Langkah 1: Jalankan Mosquitto (Broker MQTT)
Gunakan file konfigurasi development bawaan:
```bash
# Dari direktori root project:
mosquitto -c mosquitto/mosquitto.conf -v
```
Broker akan mendengarkan koneksi lokal di port `1883`.

---

### Langkah 2: Setup & Jalankan FastAPI Backend
1. Masuk ke direktori `backend/`:
   ```bash
   cd backend
   ```
2. Buat virtual environment (jika belum ada):
   ```bash
   python -m venv .venv
   ```
3. Aktifkan virtual environment:
   - **Windows**: `.venv\Scripts\activate`
   - **Linux/macOS**: `source .venv/bin/activate`
4. Install dependensi:
   ```bash
   pip install -r requirements.txt
   ```
5. Salin template konfigurasi:
   ```bash
   copy .env.example .env   # Windows
   # atau
   cp .env.example .env     # Linux/macOS
   ```
6. Jalankan server FastAPI development:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
API akan aktif di `http://127.0.0.1:8000` dengan Swagger UI di `http://127.0.0.1:8000/docs`.

---

### Langkah 3: Setup & Jalankan React Frontend
1. Masuk ke direktori `frontend/`:
   ```bash
   cd frontend
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Salin environment template:
   ```bash
   copy .env.example .env   # Windows
   ```
   Isi file `frontend/.env` untuk development:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000
   ```
4. Jalankan Vite dev server:
   ```bash
   npm run dev
   ```
Buka browser di `http://localhost:5173`.

---

### Langkah 4: Build & Flash Firmware ESP32
1. Buka project di PlatformIO / VSCode.
2. Pastikan file `src/AppConfig.h` menggunakan profil development (default):
   ```cpp
   #define WIFI_SSID     "Nama_WiFi_Anda"
   #define WIFI_PASSWORD "Password_WiFi_Anda"
   #define MQTT_BROKER   "IP_LAPTOP_ANDA" // Contoh: "192.168.1.100"
   #define MQTT_PORT     1883
   ```
3. Jalankan validasi konfigurasi:
   ```bash
   python tools/check_config.py
   ```
4. Build dan upload firmware:
   ```bash
   pio run --target upload
   ```
5. Buka serial monitor (115200 baud):
   ```bash
   pio device monitor
   ```

---

## 3. Menjalankan Pengujian Otomatis (Automated Testing)

### Backend Tests
```bash
# Dari root project:
pytest backend/tests -v
```

### Frontend Linting & Build Test
```bash
cd frontend
npm run lint
npm run build
```
