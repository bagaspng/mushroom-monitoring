#pragma once

#include <Arduino.h>

#define DHT1_PIN 23
#define DHT2_PIN 19
#define DHT3_PIN 18
#define DHT4_PIN 17

#define SOIL1_PIN 35  // VP / ADC1_CH0
#define SOIL2_PIN 34  // ADC1_CH7

#define RELAY_PIN 32

namespace Config {

constexpr uint32_t SERIAL_BAUD = 115200UL;

constexpr uint8_t DHT_COUNT = 4;
constexpr uint8_t SOIL_COUNT = 2;

constexpr uint8_t ACTIVE_DHT_INDEX = 0;

constexpr uint8_t DHT_PINS[DHT_COUNT] = {
	DHT1_PIN,
	DHT2_PIN,
	DHT3_PIN,
	DHT4_PIN,
};

constexpr uint8_t SOIL_PINS[SOIL_COUNT] = {
	SOIL1_PIN,
	SOIL2_PIN,
};

constexpr bool RELAY_ACTIVE_LOW = true;

constexpr float RH_ON_THRESHOLD = 85.0F;
constexpr float RH_OFF_THRESHOLD = 90.0F;
constexpr float TEMP_HIGH_THRESHOLD_C = 30.0F;
constexpr float RH_MAX_THRESHOLD = 95.0F;

constexpr uint32_t PUMP_ON_DURATION_MS = 8UL * 1000UL;
constexpr uint32_t PUMP_MAX_ON_MS = 15UL * 1000UL;
constexpr uint32_t PUMP_COOLDOWN_MS = 300UL * 1000UL;

constexpr uint32_t SENSOR_READ_INTERVAL_MS = 5UL * 1000UL;
constexpr uint32_t SERIAL_REPORT_INTERVAL_MS = 10UL * 1000UL;

constexpr uint8_t SOIL_ADC_SAMPLES = 5;

constexpr int SOIL_RAW_DRY[SOIL_COUNT] = {3200, 3200};
constexpr int SOIL_RAW_WET[SOIL_COUNT] = {1300, 1300};

constexpr float DHT_MIN_TEMP_C = 0.0F;
constexpr float DHT_MAX_TEMP_C = 60.0F;
constexpr float DHT_MIN_RH = 0.0F;
constexpr float DHT_MAX_RH = 100.0F;

// ============================================================
// Scheduled Misting — Penyemprotan Terjadwal (Hybrid Mode)
// Jadwal berjalan selalu (07:00, 12:00, 17:00 WIB), bersamaan
// dengan kontrol adaptif sensor DHT22 yang tetap aktif.
// ============================================================
constexpr bool     SCHEDULE_ENABLED          = true;
constexpr uint8_t  SCHEDULE_HOURS_COUNT      = 3;
constexpr uint8_t  SCHEDULE_HOURS[SCHEDULE_HOURS_COUNT] = {7, 12, 17}; // WIB
constexpr uint32_t SCHEDULE_PUMP_DURATION_MS = 15UL * 1000UL; // 15 Detik

}  // namespace Config

// ============================================================
// Wi-Fi + MQTT Environment Profiles (DEV / PROD)
// To activate production build profile, uncomment USE_PRODUCTION_CONFIG
// or define it in platformio.ini build_flags = -D USE_PRODUCTION_CONFIG
// ============================================================

// #define USE_PRODUCTION_CONFIG

#ifdef USE_PRODUCTION_CONFIG
  // Production Profile (Target: sirkulalestari.com / VPS 103.245.38.68)
  #ifndef WIFI_SSID
  #define WIFI_SSID         "KUMBUNG_WIFI_SSID"
  #endif

  #ifndef WIFI_PASSWORD
  #define WIFI_PASSWORD     "KUMBUNG_WIFI_PASSWORD"
  #endif

  #ifndef MQTT_BROKER
  #define MQTT_BROKER       "sirkulalestari.com"
  #endif

  #ifndef MQTT_PORT
  #define MQTT_PORT         1883 // Or 8883 for TLS
  #endif

  #ifndef MQTT_USERNAME
  #define MQTT_USERNAME     "esp32_device"
  #endif

  #ifndef MQTT_PASSWORD
  #define MQTT_PASSWORD     "ESP32_MQTT_PASSWORD_PLACEHOLDER"
  #endif

#else
  // Development Profile (Local LAN Testing)
  #ifndef WIFI_SSID
  #define WIFI_SSID         "DEV_WIFI_SSID"
  #endif

  #ifndef WIFI_PASSWORD
  #define WIFI_PASSWORD     "DEV_WIFI_PASSWORD"
  #endif

  #ifndef MQTT_BROKER
  #define MQTT_BROKER       "127.0.0.1"
  #endif

  #ifndef MQTT_PORT
  #define MQTT_PORT         1883
  #endif

  #ifndef MQTT_USERNAME
  #define MQTT_USERNAME     nullptr
  #endif

  #ifndef MQTT_PASSWORD
  #define MQTT_PASSWORD     nullptr
  #endif
#endif

#ifndef MQTT_CLIENT_ID
#define MQTT_CLIENT_ID "rumah-jamur-01"
#endif

#ifndef DEVICE_ID
#define DEVICE_ID      "rumah-jamur-01"
#endif

// NTP — UTC+7 (WIB / Waktu Indonesia Barat)
#define NTP_SERVER              "pool.ntp.org"
#define NTP_GMT_OFFSET_SEC      (7 * 3600)  // WIB = UTC+7
#define NTP_DAYLIGHT_OFFSET_SEC 0

namespace MqttConfig {

// Publish telemetry every 10 seconds
constexpr uint32_t PUBLISH_INTERVAL_MS     = 10UL * 1000UL;

// Retry intervals for Wi-Fi and MQTT reconnect (non-blocking)
constexpr uint32_t WIFI_RECONNECT_INTERVAL_MS = 5UL * 1000UL;
constexpr uint32_t MQTT_RECONNECT_INTERVAL_MS = 5UL * 1000UL;

// MQTT topic templates (format: prefix/device_id/suffix)
constexpr const char* TOPIC_PREFIX     = "rumahjamur";
constexpr const char* TOPIC_TELEMETRY  = "rumahjamur/" DEVICE_ID "/telemetry";
constexpr const char* TOPIC_STATUS     = "rumahjamur/" DEVICE_ID "/status";
constexpr const char* TOPIC_CONTROL    = "rumahjamur/" DEVICE_ID "/control";

// JSON document capacity (bytes) for telemetry payload
constexpr size_t JSON_DOC_SIZE = 512;

}  // namespace MqttConfig