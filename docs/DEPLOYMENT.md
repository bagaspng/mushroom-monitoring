# Deployment Playbook — Panduan Deployment VPS Ubuntu LTS

Panduan langkah demi langkah untuk melakukan deployment sistem `mushroom-monitoring` pada VPS:
- **Alamat IP**: `103.245.38.68`
- **Domain**: `sirkulalestari.com`

---

## 1. Persiapan DNS

Sebelum menjalankan instalasi di server, pastikan DNS Record domain telah diarahkan ke IP VPS:

| Tipe | Nama Host | Target IPv4 | TTL |
|---|---|---|---|
| **A** | `@` (atau `sirkulalestari.com`) | `103.245.38.68` | 3600 (Auto) |
| **A** | `www` (atau `www.sirkulalestari.com`) | `103.245.38.68` | 3600 (Auto) |

---

## 2. Langkah Setup di Server VPS

### Langkah 1: Update OS & Instalasi Paket Sistem
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv git curl ufw nginx mosquitto mosquitto-clients certbot python3-certbot-nginx
```

---

### Langkah 2: Setup Firewall (UFW)
Buka hanya port publik yang esensial:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Let's Encrypt / Redirect)
sudo ufw allow 443/tcp   # HTTPS (Web + REST + WebSocket)
sudo ufw allow 8883/tcp  # MQTT TLS (IoT Perangkat)
sudo ufw enable
```
> **Catatan**: Port internal `8000` (FastAPI) dan `1883` (Mosquitto lokal) **TIDAK DIBUKA** ke publik.

---

### Langkah 3: Konfigurasi Mosquitto & Kredensial
1. Buat password file untuk broker:
   ```bash
   sudo mosquitto_passwd -c /etc/mosquitto/passwd esp32_device
   sudo mosquitto_passwd /etc/mosquitto/passwd backend_service
   ```
2. Salin konfigurasi ACL dan Mosquitto:
   ```bash
   sudo cp mosquitto/acl.conf /etc/mosquitto/acl.conf
   sudo cp mosquitto/mosquitto.prod.conf /etc/mosquitto/conf.d/default.conf
   ```
3. Restart service Mosquitto:
   ```bash
   sudo systemctl restart mosquitto
   sudo systemctl enable mosquitto
   ```

---

### Langkah 4: Setup Sertifikat SSL Let's Encrypt
```bash
sudo certbot certonly --nginx -d sirkulalestari.com -d www.sirkulalestari.com
```

---

### Langkah 5: Setup Backend FastAPI
1. Clone repositori ke direktori aplikasi:
   ```bash
   sudo mkdir -p /var/www/mushroom-monitoring
   sudo chown -R $USER:www-data /var/www/mushroom-monitoring
   git clone <URL_REPO_ANDA> /var/www/mushroom-monitoring
   ```
2. Masuk ke direktori backend dan buat virtual environment:
   ```bash
   cd /var/www/mushroom-monitoring/backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Buat file konfigurasi `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Isi dengan parameter produksi (APP_ENV=production, password backend_service, dan CONTROL_API_KEY acak).*
4. Pasang systemd service:
   ```bash
   sudo cp /var/www/mushroom-monitoring/systemd/mushroom-backend.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl start mushroom-backend
   sudo systemctl enable mushroom-backend
   ```

---

### Langkah 6: Build & Deploy Frontend React
1. Install Node.js (v20+ LTS via NodeSource):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
2. Build frontend:
   ```bash
   cd /var/www/mushroom-monitoring/frontend
   npm install
   npm run build
   ```
   *Hasil build akan tersimpan di `/var/www/mushroom-monitoring/frontend/dist`.*

---

### Langkah 7: Pasang Konfigurasi Nginx
1. Salin konfigurasi server block Nginx:
   ```bash
   sudo cp /var/www/mushroom-monitoring/nginx/sirkulalestari.com.conf /etc/nginx/sites-available/sirkulalestari.com
   sudo ln -s /etc/nginx/sites-available/sirkulalestari.com /etc/nginx/sites-enabled/
   ```
2. Tes sintaks Nginx dan reload:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

### Langkah 8: Verifikasi Uji Coba Deployment
1. Cek status backend:
   ```bash
   sudo systemctl status mushroom-backend
   ```
2. Tes endpoint status di browser:
   `https://sirkulalestari.com/api/status`
3. Buka dashboard web:
   `https://sirkulalestari.com` (Pastikan badge WebSocket berubah menjadi "Live" / hijau).
