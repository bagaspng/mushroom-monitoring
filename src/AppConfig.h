#pragma once

#include <Arduino.h>

#define DHT1_PIN 23
#define DHT2_PIN 19
#define DHT3_PIN 18
#define DHT4_PIN 16
#define DHT5_PIN 17

#define SOIL1_PIN 36  // VP / ADC1_CH0
#define SOIL2_PIN 35  // ADC1_CH7
#define SOIL3_PIN 34  // ADC1_CH6

#define RELAY_PIN 32

namespace Config {

constexpr uint32_t SERIAL_BAUD = 115200UL;

constexpr uint8_t DHT_COUNT = 5;
constexpr uint8_t SOIL_COUNT = 3;

constexpr uint8_t ACTIVE_DHT_INDEX = 0;

constexpr uint8_t DHT_PINS[DHT_COUNT] = {
	DHT1_PIN,
	DHT2_PIN,
	DHT3_PIN,
	DHT4_PIN,
	DHT5_PIN,
};

constexpr uint8_t SOIL_PINS[SOIL_COUNT] = {
	SOIL1_PIN,
	SOIL2_PIN,
	SOIL3_PIN,
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

constexpr int SOIL_RAW_DRY[SOIL_COUNT] = {3200, 3200, 3200};
constexpr int SOIL_RAW_WET[SOIL_COUNT] = {1300, 1300, 1300};

constexpr float DHT_MIN_TEMP_C = 0.0F;
constexpr float DHT_MAX_TEMP_C = 60.0F;
constexpr float DHT_MIN_RH = 0.0F;
constexpr float DHT_MAX_RH = 100.0F;

}  // namespace Config

// ============================================================
// Wi-Fi + MQTT Configuration
// Replace WIFI_SSID, WIFI_PASSWORD, and MQTT_BROKER with your
// actual values before uploading. Do NOT commit real credentials.
// ============================================================

#ifndef WIFI_SSID
#define WIFI_SSID     "YOUR_WIFI_SSID"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#endif

// IP address or hostname of your Mosquitto broker
#ifndef MQTT_BROKER
#define MQTT_BROKER   "192.168.1.100"
#endif

#ifndef MQTT_PORT
#define MQTT_PORT     1883
#endif

#ifndef MQTT_CLIENT_ID
#define MQTT_CLIENT_ID "rumah-jamur-01"
#endif

#ifndef DEVICE_ID
#define DEVICE_ID      "rumah-jamur-01"
#endif

// NTP server for UTC timestamps in telemetry payload
#define NTP_SERVER              "pool.ntp.org"
#define NTP_GMT_OFFSET_SEC      0
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

// JSON document capacity (bytes) for telemetry payload
constexpr size_t JSON_DOC_SIZE = 512;

}  // namespace MqttConfig