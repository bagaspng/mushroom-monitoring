# Configuration Guide

Semua konfigurasi berada di:

```text
src/AppConfig.h
```

## Threshold

```cpp
RH_ON_THRESHOLD
RH_OFF_THRESHOLD
RH_MAX_THRESHOLD

TEMP_HIGH_THRESHOLD_C

PUMP_ON_DURATION_MS
PUMP_MAX_ON_MS
PUMP_COOLDOWN_MS
```

Aturan hysteresis:

- RH aktif saat `RH_ON_THRESHOLD`, lalu baru clear saat `RH_OFF_THRESHOLD`;
- jika RH rata-rata mencapai `RH_MAX_THRESHOLD`, pompa wajib OFF;
- suhu tinggi memicu pompa saat `TEMP_HIGH_THRESHOLD_C` tercapai.

Soil sensor tidak ikut dalam keputusan pompa, hanya menjadi data monitoring.

## Pompa

```cpp
PUMP_ON_DURATION_MS
PUMP_MAX_ON_MS
PUMP_COOLDOWN_MS
```

`PUMP_MAX_ON_MS` adalah batas pengaman dan harus lebih besar atau sama dengan `PUMP_ON_DURATION_MS`.

## Relay

```cpp
RELAY_ACTIVE_LOW
```

- `true`: LOW menyalakan relay;
- `false`: HIGH menyalakan relay.

Uji tanpa pompa terlebih dahulu.

## Soil trigger

Soil sensor tetap dikalibrasi, tetapi tidak memicu misting.

## Interval

DHT22 sebaiknya tidak dibaca terlalu sering. Default pembacaan sistem adalah 5 detik.

```cpp
SENSOR_READ_INTERVAL_MS
```

## Pin final

Deklarasi pin terpusat berada di [src/AppConfig.h](../src/AppConfig.h).

```cpp
DHT1_PIN
DHT2_PIN
DHT3_PIN
DHT4_PIN
DHT5_PIN

SOIL1_PIN
SOIL2_PIN
SOIL3_PIN

RELAY_PIN
```

Pin I2C dan MUX tidak dipakai lagi.

## Status kesehatan DHT

Status yang dilaporkan firmware:

- `NORMAL` = 5/5 DHT valid
- `DEGRADED` = 1-4/5 DHT valid
- `ERROR` = 0/5 DHT valid
