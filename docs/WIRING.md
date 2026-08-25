# Wiring Reference

## 1. Power

```text
AC 220V
→ PSU 12V

PSU V+
├── 12V_BUS → relay/pompa
└── LM2596 IN+

PSU V-
└── GND_BUS → semua ground DC

LM2596 OUT+
└── 5V_BUS → ESP32 5V

LM2596 OUT-
└── GND_BUS
```

Ukur LM2596 dan pastikan `5.0V` sebelum menyambungkannya ke ESP32.

---

## 2. ESP32 ke DHT22

| Sensor | DATA | VCC | GND |
|---|---:|---|---|
| DHT_Z1 | GPIO23 | 3V3_SENSOR_BUS | GND_BUS |
| DHT_Z2 | GPIO19 | 3V3_SENSOR_BUS | GND_BUS |
| DHT_Z3 | GPIO18 | 3V3_SENSOR_BUS | GND_BUS |
| DHT_Z4 | GPIO17 | 3V3_SENSOR_BUS | GND_BUS |

Jika DHT22 bare sensor, tambahkan pull-up 4.7k–10k dari DATA ke 3V3_SENSOR_BUS.

---

## 3. Soil sensor

| Soil | SIGNAL | VCC | GND |
|---|---|---|---|
| SOIL_Z1 | GPIO36 / VP | 3V3_SENSOR_BUS | GND_BUS |
| SOIL_Z2 | GPIO35 | 3V3_SENSOR_BUS | GND_BUS |

Gunakan SIGNAL/AO. Jangan gunakan DO untuk pembacaan persentase.

---

## 4. Relay dan pompa

Sisi kontrol:

| Relay | Sambungan |
|---|---|
| VCC | sesuai modul relay 12V / 12V_BUS |
| GND | GND_BUS |
| IN | ESP32 GPIO32 |

Sisi daya:

```text
12V_BUS
→ Fuse pompa
→ Relay COM
→ Relay NO
→ Pompa merah (+)

Pompa hitam (-)
→ GND_BUS
```

Relay NC dibiarkan kosong.

---

## 5. Warna kabel dokumentasi

| Warna | Fungsi |
|---|---|
| Merah | 12V DC |
| Oranye | 5V DC |
| Kuning | 3.3V |
| Hitam | GND |
| Biru | DATA DHT/I2C |
| Hijau | Analog soil/MUX SIG |
| Ungu | Kontrol relay |
