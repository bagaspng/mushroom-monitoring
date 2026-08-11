# Test Plan

## Tahap 1 — Power tanpa ESP32

- Set LM2596 ke 5.0V menggunakan multimeter.
- Pastikan polaritas OUT+ dan OUT- benar.
- Matikan sumber sebelum menyambungkan ESP32.

## Tahap 2 — ESP32 saja

- Sambungkan LM2596 ke pin 5V dan GND ESP32.
- Pastikan ESP32 boot stabil.
- Buka Serial Monitor 115200.

## Tahap 3 — Relay tanpa pompa

- Sambungkan VCC/GND/IN relay.
- Jangan sambungkan terminal pompa dulu.
- Pastikan relay OFF saat boot.
- Ubah `RELAY_ACTIVE_LOW` jika perilakunya terbalik.

## Tahap 4 — DHT

Uji satu DHT dulu pada GPIO23, lalu tambah sensor lain satu per satu.

Harapan:

```text
DHT_Z5: T=... RH=...
```

Jika `ERROR`, periksa:
- DATA;
- pull-up;
- 3.3V;
- GND;
- kabel panjang.

Sensor DHT lain yang belum dipasang boleh tetap terbaca `ERROR` sementara, karena firmware memang masih menyiapkan lima slot DHT untuk ekspansi nanti.
Jika sebagian DHT gagal, sistem tetap berjalan dan akan melaporkan status `DEGRADED`.

## Tahap 5 — Soil ADC langsung

- Uji hanya SOIL_Z1 di GPIO36.
- Setelah stabil, tambah GPIO35 dan GPIO34.
- Pastikan pembacaan tampil sebagai data monitoring, bukan pemicu pompa.
- Kalibrasikan raw dry dan wet.

## Tahap 6 — Pompa

- Pasang fuse.
- Uji pompa dengan jalur 12V terpisah.
- Pastikan ESP32 tidak reset saat pompa ON.
- Jika reset, periksa voltage drop, noise, kabel, dan grounding.

## Tahap 7 — Endurance test

Jalankan sistem minimal:
- 2 jam;
- 8 jam;
- 24 jam.

Amati:
- reset;
- DHT invalid dan perubahan status NORMAL/DEGRADED/ERROR;
- noise ADC;
- relay panas;
- kebocoran air;
- suhu PSU dan kabel.
