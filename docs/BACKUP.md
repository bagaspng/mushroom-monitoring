# Backup & Disaster Recovery Strategy

Dokumentasi strategi pencadangan data SQLite dan pemulihan bencana (*disaster recovery*).

---

## 1. Karakteristik Data & Kebutuhan Cadangan

- **Jenis Database**: SQLite (File tunggal: `jamur_dashboard.db` dengan file WAL `jamur_dashboard.db-wal`).
- **Retensi Data**: 12 jam (~4.320 baris per hari).
- **Ukuran File Rata-rata**: < 5 MB.
- **Risiko Kerusakan**: Rendah (SQLite WAL mode + `PRAGMA synchronous = NORMAL`).

---

## 2. Prosedur Pencadangan Aman (SQLite Online Backup)

Jangan menyalin file database secara langsung dengan `cp` saat aplikasi sedang aktif karena file WAL berpotensi dalam status penulisan. Gunakan perintah `.backup` bawaan `sqlite3` CLI yang aman secara transaksional:

```bash
sqlite3 /var/www/mushroom-monitoring/backend/jamur_dashboard.db ".backup '/var/backups/jamur_backup_$(date +%Y%m%d_%H%M%S).db'"
```

---

## 3. Otomatisasi via Cron Job (Setiap 6 Jam)

Buat script backup di `/usr/local/bin/backup-jamur.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/mushroom-monitoring"
DB_PATH="/var/www/mushroom-monitoring/backend/jamur_dashboard.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/jamur_${TIMESTAMP}.db.gz"

mkdir -p "${BACKUP_DIR}"

# Buat snapshot online dan kompresi
sqlite3 "${DB_PATH}" ".backup /tmp/jamur_temp.db"
gzip -c /tmp/jamur_temp.db > "${BACKUP_FILE}"
rm -f /tmp/jamur_temp.db

# Hapus backup yang lebih lama dari 7 hari
find "${BACKUP_DIR}" -name "jamur_*.db.gz" -type f -mtime +7 -delete

echo "[$(date)] Backup completed: ${BACKUP_FILE}"
```

Beri izin eksekusi:
```bash
sudo chmod +x /usr/local/bin/backup-jamur.sh
```

Daftarkan di crontab (`sudo crontab -e`):
```cron
0 */6 * * * /usr/local/bin/backup-jamur.sh >> /var/log/mushroom-backup.log 2>&1
```

---

## 4. Rencana Cadangan Luar (*Offsite Backup*)

Sebagai *best practice*, cadangan tidak boleh hanya tersimpan di VPS yang sama.
- **Rekomendasi**: Gunakan `rclone` untuk menyalin file cadangan setiap hari ke S3 / Google Drive / Cloudflare R2:
  ```bash
  rclone sync /var/backups/mushroom-monitoring remote:jamur-backups/
  ```
