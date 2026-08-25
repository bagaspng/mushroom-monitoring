#include "Logger.h"

#include "AppConfig.h"

namespace {

const char* healthName(DhtHealthStatus status) {
    switch (status) {
        case DhtHealthStatus::NORMAL:
            return "NORMAL";
        case DhtHealthStatus::DEGRADED:
            return "DEGRADED";
        case DhtHealthStatus::ERROR:
            return "ERROR";
        default:
            return "UNKNOWN";
    }
}

const char* pumpDecisionReasonName(
    PumpDecisionReason reason,
    PumpState pumpState,
    bool requestPump
) {
    if (requestPump && pumpState == PumpState::COOLDOWN) {
        return "Cooldown active";
    }

    if (requestPump && pumpState == PumpState::RUNNING) {
        return "Pump already running";
    }

    switch (reason) {
        case PumpDecisionReason::MANUAL_ON:
            return "Manual Override ON";
        case PumpDecisionReason::MANUAL_OFF:
            return "Manual Override OFF";
        case PumpDecisionReason::NO_VALID_DHT:
            return "No valid DHT sensor";
        case PumpDecisionReason::RH_MAX_THRESHOLD:
            return "RH max threshold reached";
        case PumpDecisionReason::HUMIDITY_DEMAND:
            return "Humidity threshold reached";
        case PumpDecisionReason::TEMP_HIGH_THRESHOLD:
            return "Temperature threshold reached";
        case PumpDecisionReason::NO_THRESHOLD_MET:
            return "No threshold reached";
        default:
            return "Unknown";
    }
}

const char* pumpOnOff(PumpState state) {
    return state == PumpState::RUNNING ? "ON" : "OFF";
}

}  // namespace

void Logger::printStartup() {
    Serial.println();
    Serial.println(F("============================================================"));
    Serial.println(F(" SISTEM MONITORING & MISTING OTOMATIS RUMAH JAMUR"));
    Serial.println(F(" ESP32 + DHT22 x4 + Soil ADC x2 + Relay"));
    Serial.println(F("============================================================"));
    Serial.printf("Relay pin      : GPIO%u\n", RELAY_PIN);
    Serial.printf(
        "Relay logic    : %s\n",
        Config::RELAY_ACTIVE_LOW ? "ACTIVE LOW" : "ACTIVE HIGH"
    );
    for (uint8_t i = 0; i < Config::DHT_COUNT; ++i) {
        Serial.printf("DHT_Z%u pin     : GPIO%u\n", i + 1, Config::DHT_PINS[i]);
    }
    for (uint8_t i = 0; i < Config::SOIL_COUNT; ++i) {
        Serial.printf("SOIL_Z%u pin    : GPIO%u\n", i + 1, Config::SOIL_PINS[i]);
    }
    Serial.printf(
        "Pump pulse     : %lu ms\n",
        static_cast<unsigned long>(Config::PUMP_ON_DURATION_MS)
    );
    Serial.printf(
        "Pump cooldown  : %lu ms\n",
        static_cast<unsigned long>(Config::PUMP_COOLDOWN_MS)
    );
    Serial.printf(
        "RH on/off      : %.1f %% / %.1f %%\n",
        Config::RH_ON_THRESHOLD,
        Config::RH_OFF_THRESHOLD
    );
    Serial.printf(
        "RH max         : %.1f %%\n",
        Config::RH_MAX_THRESHOLD
    );
    Serial.printf(
        "Temp high      : %.1f C\n",
        Config::TEMP_HIGH_THRESHOLD_C
    );
    Serial.printf(
        "Active DHT     : Z%u (GPIO%u)\n",
        Config::ACTIVE_DHT_INDEX + 1,
        Config::DHT_PINS[Config::ACTIVE_DHT_INDEX]
    );
    Serial.println(F("============================================================"));
}

void Logger::printSnapshot(
    const SensorSnapshot& snapshot,
    const ControlDecision& decision,
    PumpState pumpState,
    uint32_t cooldownRemainingMs
) {
    Serial.println();
    Serial.println(F("===================================="));
    Serial.println(F("SENSOR STATUS"));
    Serial.println(F("===================================="));

    for (uint8_t i = 0; i < Config::DHT_COUNT; ++i) {
        if (snapshot.dht[i].valid) {
            Serial.printf(
                "DHT%u : %5.1f C | %5.1f %% | VALID\n",
                i + 1,
                snapshot.dht[i].temperatureC,
                snapshot.dht[i].humidityRh
            );
        } else {
            Serial.printf(
                "DHT%u : ERROR\n",
                i + 1
            );
        }
    }

    Serial.printf(
        "DHT VALID : %u/%u\n",
        snapshot.validDhtCount,
        Config::DHT_COUNT
    );
    Serial.printf(
        "DHT HEALTH: %s (%u/%u)\n",
        healthName(snapshot.dhtHealth),
        snapshot.validDhtCount,
        Config::DHT_COUNT
    );

    if (snapshot.validDhtCount > 0) {
        Serial.printf("AVG TEMP  : %5.2f C\n", snapshot.averageTemperatureC);
        Serial.printf("AVG HUMID : %5.2f %%\n", snapshot.averageHumidityRh);
    } else {
        Serial.println(F("AVG TEMP  : N/A"));
        Serial.println(F("AVG HUMID : N/A"));
    }

    for (uint8_t i = 0; i < Config::SOIL_COUNT; ++i) {
        if (snapshot.soil[i].valid) {
            Serial.printf(
                "SOIL%u : %3d %%\n",
                i + 1,
                snapshot.soil[i].percent
            );
        } else {
            Serial.printf(
                "SOIL%u : ERROR\n",
                i + 1
            );
        }
    }

    Serial.printf("PUMP      : %s\n", pumpOnOff(pumpState));
    Serial.printf("STATE     : %s\n", healthName(snapshot.dhtHealth));
    Serial.println(F("===================================="));

    Serial.println(F("PUMP DECISION:"));
    Serial.printf(
        "Reason: %s\n",
        pumpDecisionReasonName(decision.reason, pumpState, decision.requestPump)
    );
    Serial.println(F("PUMP:"));
    Serial.println(decision.requestPump ? F("ON") : F("OFF"));

    if (pumpState == PumpState::COOLDOWN) {
        Serial.printf(
            "Cooldown remaining: %lu s\n",
            static_cast<unsigned long>(cooldownRemainingMs / 1000UL)
        );
    }
}
