# Kalibrasi Soil Sensor

Setiap soil/media moisture sensor dapat memiliki nilai ADC berbeda. Karena itu, ketiga sensor harus dikalibrasi satu per satu.

## Langkah 1 — Baca kondisi kering

1. Jalankan sistem dengan Serial Monitor 115200.
2. Letakkan sensor pada kondisi yang dianggap kering.
3. Tunggu pembacaan stabil.
4. Catat nilai `raw`.

Contoh:

```text
SOIL_Z1: raw=3185
SOIL_Z2: raw=3270
SOIL_Z3: raw=3110
```

Masukkan ke:

```cpp
SOIL_RAW_DRY
```

## Langkah 2 — Baca kondisi basah

1. Letakkan probe pada media yang sangat basah.
2. Jangan merendam bagian PCB/modul elektronik.
3. Tunggu stabil.
4. Catat nilai raw.

Masukkan ke:

```cpp
SOIL_RAW_WET
```

## Langkah 3 — Contoh hasil

```cpp
constexpr int SOIL_RAW_DRY[3] = {
    3185,
    3270,
    3110
};

constexpr int SOIL_RAW_WET[3] = {
    1420,
    1350,
    1490
};
```

## Catatan

- Nilai raw tinggi sering berarti lebih kering, tetapi tergantung jenis sensor.
- Firmware mendukung urutan dry lebih tinggi maupun lebih rendah dari wet.
- Lakukan kalibrasi menggunakan kabel dan posisi instalasi final karena kabel panjang dapat memengaruhi nilai.
- Sensor resistif mudah korosi jika diberi daya terus-menerus.
