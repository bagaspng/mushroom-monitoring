# Troubleshooting Matrix — Panduan Diagnosa & Solusi Masalah

---

## 1. Masalah Infrastruktur & Server Cloud (VPS)

### A. Dashboard Menampilkan Status "Disconnected" / WebSocket Error
1. **Penyebab**: Service backend mati atau Nginx gagal melakukan *proxy upgrade* WebSocket.
2. **Diagnosa**:
   ```bash
   sudo systemctl status mushroom-backend
   sudo journalctl -u mushroom-backend -n 50 --no-pager
   ```
3. **Solusi**:
   - Jika service mati, restart dengan `sudo systemctl restart mushroom-backend`.
   - Periksa apakah blok `location /ws` pada Nginx memiliki header `Upgrade $http_upgrade` dan `Connection "upgrade"`.

### B. Indikator "MQTT Disconnected" pada API Status
1. **Penyebab**: Backend gagal terhubung ke Mosquitto (port 1883/8883) atau password salah.
2. **Diagnosa**:
   ```bash
   sudo systemctl status mosquitto
   cat /var/log/mosquitto/mosquitto.log
   ```
3. **Solusi**:
   - Pastikan user `backend_service` terdaftar di `/etc/mosquitto/passwd` dan memiliki izin di `acl.conf`.
   - Tes koneksi manual: `mosquitto_sub -h 127.0.0.1 -p 1883 -u backend_service -P 'PASSWORD' -t 'rumahjamur/#'`.

### C. Banner "No recent data" (Stale Telemetry > 30s)
1. **Penyebab**: ESP32 mati lampu, Wi-Fi terputus, atau gagal otentikasi ke broker MQTT publik.
2. **Solusi**:
   - Cek serial monitor ESP32 (115200 baud).
   - Pastikan profil produksi pada `src/AppConfig.h` mencocokkan `MQTT_USERNAME` dan `MQTT_PASSWORD`.
   - Pastikan port `8883` atau `1883` pada firewall VPS (UFW) sudah dibuka untuk IP publik.

### D. Perintah Pompa Ditolak (401 Unauthorized)
1. **Penyebab**: API Key belum dimasukkan atau salah.
2. **Solusi**:
   - Masukkan `CONTROL_API_KEY` yang sama dengan yang disetel pada `/var/www/mushroom-monitoring/backend/.env`.

---

## 2. Masalah Perangkat Keras & Firmware ESP32

### A. Relay langsung ON saat boot
- Ubah konfigurasi `RELAY_ACTIVE_LOW` di `src/AppConfig.h`.
- Pastikan relay diuji terlebih dahulu tanpa pompa terhubung ke AC/DC 12V.

### B. ESP32 reset saat pompa menyala
- **Penyebab**: Penurunan tegangan (*voltage drop*), noise induktif dari motor pompa DC, atau ground loop.
- **Tindakan**:
  - Buat cabang power pompa dan ESP32 terpisah langsung dari terminal PSU 12V.
  - Gunakan common ground dengan distribusi bintang (*star grounding*).
  - Tambahkan kapasitor buffer 1000uF pada jalur 5V dan 12V.
  - Pasang flyback diode pada kutub motor pompa DC 12V.

### C. Status Sensor DHT: DEGRADED atau ERROR
- `DEGRADED`: Sebagian sensor gagal baca, namun sensor sehat lainnya masih cukup untuk menghitung rata-rata suhu & kelembapan.
- `ERROR`: Seluruh sensor DHT gagal dibaca. Demi keselamatan, `DecisionEngine` otomatis memblokir aktivasi pompa.
- **Tindakan**:
  - Periksa kabel DATA GPIO (23, 19, 18, 17) dan resistor pull-up 4.7kΩ - 10kΩ.
  - Pastikan VCC sensor mendapatkan 3.3V stabil dan tidak terkena embun/air langsung.
