#pragma once

#include <Arduino.h>
#include "AppConfig.h"

enum class DhtHealthStatus : uint8_t {
    NORMAL,
    DEGRADED,
    ERROR
};

enum class PumpDecisionReason : uint8_t {
    NONE,
    NO_VALID_DHT,
    RH_MAX_THRESHOLD,
    HUMIDITY_DEMAND,
    TEMP_HIGH_THRESHOLD,
    NO_THRESHOLD_MET
};

enum class PumpState : uint8_t {
    IDLE,
    RUNNING,
    COOLDOWN
};

struct DhtReading {
    float temperatureC = NAN;
    float humidityRh = NAN;
    bool valid = false;
};

struct SoilReading {
    int raw = 0;
    int percent = 0;
    bool valid = false;
};

struct SensorSnapshot {
    DhtReading dht[Config::DHT_COUNT];
    SoilReading soil[Config::SOIL_COUNT];

    uint8_t validDhtCount = 0;
    uint8_t validSoilCount = 0;

    float averageTemperatureC = NAN;
    float averageHumidityRh = NAN;

    DhtHealthStatus dhtHealth = DhtHealthStatus::ERROR;

    uint32_t timestampMs = 0;
};

struct ControlDecision {
    bool requestPump = false;
    PumpDecisionReason reason = PumpDecisionReason::NONE;
};
