# Security Architecture & Hardening Guide

Dokumen panduan keamanan, perlindungan endpoint, manajemen rahasia (*secret management*), dan proteksi jaringan untuk sistem `mushroom-monitoring`.

---

## 1. Model Ancaman & Mitigasi (*Threat Model*)

| Vektor Serangan | Risiko | Mitigasi yang Diimplementasikan |
|---|---|---|
| **Eksekusi Pompa Ilegal** | Penyerang mengirim instruksi `POST /api/control` untuk mematikan pompa atau membanjiri kumbung. | Proteksi `CONTROL_API_KEY` menggunakan header `X-API-Key` dengan verifikasi *timing-attack-safe* (`secrets.compare_digest`). Permintaan tanpa kunci ditolak dengan `401 Unauthorized`. |
| **Injeksi Data MQTT Palsu** | Orang asing mem-publish angka suhu palsu ke broker publik. | Mosquitto `allow_anonymous false`, autentikasi username & password, serta ACL berbasis topik per pengguna. |
| **Penyadapan Jaringan (Sniffing)** | Kredensial atau data disadap di jaringan publik. | Enkripsi SSL/TLS HTTPS untuk Web & REST API, WSS untuk WebSocket, dan TLS port 8883 untuk MQTT. |
| **Cross-Origin Hijacking (CSRF/CORS)** | Situs pihak ketiga memanggil API backend. | CORS dibatasi secara ketat hanya pada domain resmi `https://sirkulalestari.com` dan `https://www.sirkulalestari.com`. |
| **Kebocoran Rahasia (Secret Leakage)** | Password atau API Key ter-commit ke repositori publik. | Seluruh file `.env`, file sertifikat `*.pem`/`*.key`, dan database `*.db` dilindungi secara ketat di `.gitignore`. Repositori hanya menyediakan file template `.env.example`. |

---

## 2. Mekanisme Autentikasi Kontrol (`POST /api/control`)

### Cara Kerja:
1. Administrator mengatur `CONTROL_API_KEY` pada backend `.env` di server VPS.
2. Ketika operator ingin mengubah mode atau menyalakan pompa dari dashboard:
   - Header `X-API-Key: <KUNCI>` dikirimkan ke endpoint `POST /api/control`.
   - Backend memverifikasi kunci menggunakan `secrets.compare_digest()`.
   - Jika kunci salah atau tidak ada, server mengembalikan status `401 Unauthorized`.
   - Frontend akan memunculkan prompt input kunci kepada operator dan menyimpannya di `localStorage` browser.

### Pengujian Autentikasi:
```bash
# Permintaan ditolak (401):
curl -X POST https://sirkulalestari.com/api/control \
  -H "Content-Type: application/json" \
  -d '{"mode": "MANUAL", "pump": true}'

# Permintaan diterima (200):
curl -X POST https://sirkulalestari.com/api/control \
  -H "Content-Type: application/json" \
  -H "X-API-Key: KUNCI_RAHASIA_ANDA" \
  -d '{"mode": "MANUAL", "pump": true}'
```

---

## 3. Kebijakan CORS & Header Keamanan

Backend FastAPI secara otomatis menyertakan header proteksi browser modern:
- `X-Content-Type-Options: nosniff` (mencegah MIME-sniffing)
- `X-Frame-Options: DENY` (mencegah serangan Clickjacking)
- `X-XSS-Protection: 1; mode=block` (proteksi XSS bawaan browser)
- `Strict-Transport-Security: max-age=31536000` (memaksa komunikasi selalu via HTTPS)
