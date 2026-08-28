#pragma once

// ============================================================
// ScheduleEngine.h — Mesin Penyemprotan Terjadwal (Hybrid)
//
// Fungsi:
//   Memeriksa waktu lokal WIB (via NTP) dan memutuskan apakah
//   saatnya memicu penyemprotan terjadwal (07:00 / 12:00 / 17:00).
//
// Prinsip:
//   - Menyemprot tepat 1 kali per slot jam pada menit ke-00.
//   - Anti-re-trigger: tidak berulang sepanjang menit yang sama.
//   - Hanya menyemprot jika NTP sudah tersinkronisasi.
//   - Tidak bergantung pada kondisi sensor DHT maupun threshold.
//   - Tidak memengaruhi logika DecisionEngine yang sudah ada.
// ============================================================

#include <time.h>
#include "AppConfig.h"

class ScheduleEngine {
public:
    ScheduleEngine() : lastSprayedHour_(-1) {}

    // Panggil setiap sensor read interval.
    // Mengembalikan true jika ini saat yang tepat untuk memulai
    // penyemprotan terjadwal.
    bool shouldSprayNow() {
        if (!Config::SCHEDULE_ENABLED) {
            return false;
        }

        struct tm timeinfo;
        if (!getLocalTime(&timeinfo, 100 /* timeout ms */)) {
            // NTP belum sinkron — skip jadwal, jangan spray
            return false;
        }

        const int currentHour   = timeinfo.tm_hour;
        const int currentMinute = timeinfo.tm_min;

        // Hanya pada menit ke-00 (00:00 – 00:59 dalam menit)
        if (currentMinute != 0) {
            // Keluar dari menit ke-00: reset flag agar jam berikutnya bisa terpicu
            if (lastSprayedHour_ == currentHour) {
                // Masih di jam yang sama tapi sudah menit > 0, tidak perlu reset dulu
                // Reset terjadi saat memasuki jam jadwal berikutnya
            }
            return false;
        }

        // Periksa apakah jam ini termasuk dalam daftar jadwal
        bool isScheduledHour = false;
        for (uint8_t i = 0; i < Config::SCHEDULE_HOURS_COUNT; ++i) {
            if (currentHour == Config::SCHEDULE_HOURS[i]) {
                isScheduledHour = true;
                break;
            }
        }

        if (!isScheduledHour) {
            return false;
        }

        // Anti-re-trigger: hanya sekali per jam jadwal
        if (lastSprayedHour_ == currentHour) {
            return false;
        }

        // Saatnya menyemprot — catat jam ini agar tidak terpicu lagi
        lastSprayedHour_ = currentHour;
        return true;
    }

    // Reset flag agar dapat diuji ulang (opsional, untuk pengujian)
    void reset() {
        lastSprayedHour_ = -1;
    }

private:
    int lastSprayedHour_;  // Jam terakhir penyemprotan jadwal terpicu (-1 = belum ada)
};
