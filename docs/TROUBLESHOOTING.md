# Troubleshooting

## Relay langsung ON saat boot

Ubah:

```cpp
RELAY_ACTIVE_LOW
```

Pastikan relay diuji tanpa pompa.

## ESP32 reset saat pompa menyala

Kemungkinan:
- tegangan 5V turun;
- pompa menimbulkan noise;
- jalur ground buruk;
- kabel pompa terlalu kecil;
- tidak ada proteksi motor.

Tindakan:
- buat cabang pompa dan kontrol terpisah dari PSU;
- gunakan common ground dengan distribusi bintang;
- tambahkan kapasitor pada jalur kontrol;
- tambahkan diode/TVS sesuai jenis pompa;
- jangan lewatkan arus pompa melalui breadboard/PCB tipis.

## DHT ERROR

Periksa:
- pin DATA sesuai GPIO;
- VCC 3.3V;
- GND;
- resistor pull-up;
- sensor tidak terkena air;
- kabel tidak berdekatan dengan kabel pompa.

Jika hanya sebagian DHT yang error, sistem tetap berjalan. Jika semua DHT error, pompa akan tetap OFF.

## Status sensor DEGRADED

`DEGRADED` berarti masih ada DHT valid, tetapi tidak semua sensor sehat.

Tindakan:
- cek sensor yang error satu per satu;
- pastikan koneksi DATA tidak longgar;
- pastikan pull-up dan ground stabil;
- lihat apakah status kembali ke `NORMAL` setelah sensor diperbaiki.

## Soil selalu 0% atau 100%

- Kalibrasi RAW_DRY dan RAW_WET.
- Pastikan AO masuk ke GPIO36, GPIO35, dan GPIO34.
- Periksa VCC sensor 3.3V.
- Lihat nilai raw di Serial Monitor.

## Pembacaan soil berubah saat pompa ON

- Pisahkan kabel analog dari kabel pompa.
- Gunakan twisted pair signal + GND.
- Tambah averaging.
- Perbaiki distribusi ground.
- Gunakan regulator sensor yang lebih stabil.
