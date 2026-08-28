#include "MqttPublisher.h"

#include <ArduinoJson.h>
#include <time.h>

// =============================================================
// MqttPublisher implementation
//
// Design principles:
//   - All network operations use millis()-based timers → no blocking
//   - DecisionEngine and PumpController are never touched here
//   - A failed publish/reconnect does not prevent the next attempt
//   - LWT ensures the broker marks the device offline on disconnect
// =============================================================

MqttPublisher::ControlCallback MqttPublisher::controlCallback_ = nullptr;
static bool s_triggerImmediatePublish = false;

MqttPublisher::MqttPublisher()
    : mqttClient_(wifiClient_) {}

void MqttPublisher::begin() {
    Serial.println(F("[MQTT] Publisher initializing..."));

    mqttClient_.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient_.setBufferSize(MqttConfig::JSON_DOC_SIZE + 64);
    mqttClient_.setCallback(MqttPublisher::onMqttMessage);

    connectWifi();
}

void MqttPublisher::setControlCallback(ControlCallback cb) {
    controlCallback_ = cb;
}

void MqttPublisher::triggerImmediatePublish() {
    s_triggerImmediatePublish = true;
}

// ---------------------------------------------------------------------------
// loop() — call every iteration of Arduino loop()
// ---------------------------------------------------------------------------
void MqttPublisher::loop(
    uint32_t nowMs,
    const SensorSnapshot& snapshot,
    const ControlDecision& decision,
    const PumpController& pump
) {
    // --- Wi-Fi reconnect (non-blocking) ---
    if (WiFi.status() != WL_CONNECTED) {
        if (nowMs - lastWifiAttemptMs_ >= MqttConfig::WIFI_RECONNECT_INTERVAL_MS) {
            lastWifiAttemptMs_ = nowMs;
            connectWifi();
        }
        return;  // No point trying MQTT without Wi-Fi
    }

    // --- NTP sync (once after Wi-Fi is ready) ---
    if (!ntpSynced_) {
        configTime(NTP_GMT_OFFSET_SEC, NTP_DAYLIGHT_OFFSET_SEC, NTP_SERVER);
        ntpSynced_ = true;
        Serial.println(F("[MQTT] NTP sync requested"));
    }

    // --- MQTT reconnect (non-blocking) ---
    if (!mqttClient_.connected()) {
        if (nowMs - lastMqttAttemptMs_ >= MqttConfig::MQTT_RECONNECT_INTERVAL_MS) {
            lastMqttAttemptMs_ = nowMs;
            attemptMqttConnect();
        }
        return;
    }

    mqttClient_.loop();

    // --- Publish telemetry on interval or immediately on trigger ---
    if (s_triggerImmediatePublish || (nowMs - lastPublishMs_ >= MqttConfig::PUBLISH_INTERVAL_MS)) {
        lastPublishMs_ = nowMs;
        s_triggerImmediatePublish = false;
        publishTelemetry(snapshot, decision, pump, nowMs);
    }
}

bool MqttPublisher::isWifiConnected() const {
    return WiFi.status() == WL_CONNECTED;
}

bool MqttPublisher::isMqttConnected() {
    return mqttClient_.connected();
}

// ---------------------------------------------------------------------------
// Private — Wi-Fi connection (blocking only on first call in begin())
// ---------------------------------------------------------------------------
void MqttPublisher::connectWifi() {
    if (WiFi.status() == WL_CONNECTED) return;

    Serial.print(F("[MQTT] Connecting Wi-Fi: "));
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    // Brief wait — not blocking the full connection; reconnects are async
    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 3000) {
        delay(100);
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print(F("[MQTT] Wi-Fi OK, IP: "));
        Serial.println(WiFi.localIP());
    } else {
        Serial.println(F("[MQTT] Wi-Fi not connected (will retry)"));
    }
}

// ---------------------------------------------------------------------------
// Private — MQTT connect with LWT
// ---------------------------------------------------------------------------
void MqttPublisher::attemptMqttConnect() {
    Serial.print(F("[MQTT] Connecting to broker: "));
    Serial.println(MQTT_BROKER);

    // Last Will Testament — broker publishes this if ESP32 disconnects
    const char* lwtTopic   = MqttConfig::TOPIC_STATUS;
    const char* lwtPayload = "{\"online\":false}";
    const uint8_t lwtQos   = 1;
    const bool    lwtRetain = true;

    const char* mqttUser = MQTT_USERNAME;
    const char* mqttPass = MQTT_PASSWORD;

    bool connected = mqttClient_.connect(
        MQTT_CLIENT_ID,
        mqttUser, mqttPass,
        lwtTopic, lwtQos, lwtRetain, lwtPayload
    );

    if (connected) {
        Serial.println(F("[MQTT] Broker connected"));
        publishOnlineStatus(true);
        mqttClient_.subscribe(MqttConfig::TOPIC_CONTROL);
        Serial.print(F("[MQTT] Subscribed to "));
        Serial.println(MqttConfig::TOPIC_CONTROL);
    } else {
        Serial.print(F("[MQTT] Broker connect failed, rc="));
        Serial.println(mqttClient_.state());
    }
}

void MqttPublisher::onMqttMessage(char* topic, byte* payload, unsigned int length) {
    if (strcmp(topic, MqttConfig::TOPIC_CONTROL) != 0) {
        return;
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload, length);
    if (err) {
        Serial.print(F("[MQTT] Error parsing control command: "));
        Serial.println(err.c_str());
        return;
    }

    ControlMode mode = ControlMode::AUTO;
    if (doc["mode"].is<const char*>()) {
        const char* modeStr = doc["mode"];
        if (modeStr && strcmp(modeStr, "MANUAL") == 0) {
            mode = ControlMode::MANUAL;
        }
    }

    bool pump = false;
    if (doc["pump"].is<bool>()) {
        pump = doc["pump"].as<bool>();
    }

    Serial.printf("[MQTT] Control command received -> Mode: %s, Pump: %s\n",
                  (mode == ControlMode::MANUAL ? "MANUAL" : "AUTO"),
                  (pump ? "ON" : "OFF"));

    if (controlCallback_) {
        controlCallback_(mode, pump);
    }

    s_triggerImmediatePublish = true;
}

// ---------------------------------------------------------------------------
// Private — Publish telemetry JSON
// ---------------------------------------------------------------------------
void MqttPublisher::publishTelemetry(
    const SensorSnapshot& snapshot,
    const ControlDecision& decision,
    const PumpController& pump,
    uint32_t nowMs
) {
    JsonDocument doc;

    doc["device_id"]   = DEVICE_ID;
    doc["timestamp"]   = buildTimestamp();
    doc["mode"]        = (decision.mode == ControlMode::MANUAL) ? "MANUAL" : "AUTO";

    // Temperature and humidity (NaN → JSON null)
    if (!isnan(snapshot.averageTemperatureC)) {
        doc["temperature"] = serialized(String(snapshot.averageTemperatureC, 1));
    } else {
        doc["temperature"] = nullptr;
    }

    if (!isnan(snapshot.averageHumidityRh)) {
        doc["humidity"] = serialized(String(snapshot.averageHumidityRh, 1));
    } else {
        doc["humidity"] = nullptr;
    }

    // Soil average (monitoring only)
    const float soilAvg = soilAverage(snapshot);
    doc["soil_average"] = serialized(String(soilAvg, 1));

    // DHT health counts
    doc["dht_valid"] = snapshot.validDhtCount;
    doc["dht_total"] = Config::DHT_COUNT;

    // Soil health counts
    doc["soil_valid"] = snapshot.validSoilCount;
    doc["soil_total"] = Config::SOIL_COUNT;

    // Pump state
    const PumpState pumpState = pump.state();
    doc["pump"] = pump.isRunning();

    // pump_reason — derived from PumpState first, then PumpDecisionReason
    doc["pump_reason"] = pumpReasonToStr(decision.reason, pumpState);

    // system_state — derived from DHT health
    doc["system_state"] = dhtHealthToStr(snapshot.dhtHealth);

    // Cooldown remaining
    doc["cooldown_remaining_s"] =
        static_cast<uint32_t>(pump.remainingCooldownMs(nowMs) / 1000UL);

    // Serialize and publish
    char buf[MqttConfig::JSON_DOC_SIZE];
    const size_t len = serializeJson(doc, buf, sizeof(buf));

    const bool ok = mqttClient_.publish(
        MqttConfig::TOPIC_TELEMETRY, buf, false
    );

    if (ok) {
        Serial.print(F("[MQTT] Published telemetry ("));
        Serial.print(len);
        Serial.println(F(" bytes)"));
    } else {
        Serial.println(F("[MQTT] Publish failed"));
    }
}

// ---------------------------------------------------------------------------
// Private — Publish online/offline status (retained)
// ---------------------------------------------------------------------------
void MqttPublisher::publishOnlineStatus(bool online) {
    const char* payload = online ? "{\"online\":true}" : "{\"online\":false}";
    mqttClient_.publish(MqttConfig::TOPIC_STATUS, payload, true /* retain */);
    Serial.print(F("[MQTT] Status published: "));
    Serial.println(payload);
}

// ---------------------------------------------------------------------------
// Static helpers
// ---------------------------------------------------------------------------
const char* MqttPublisher::pumpReasonToStr(
    PumpDecisionReason reason,
    PumpState pumpState
) {
    // PumpState takes precedence for COOLDOWN — it's a state, not a reason
    if (pumpState == PumpState::COOLDOWN) {
        return "COOLDOWN";
    }

    switch (reason) {
        case PumpDecisionReason::MANUAL_ON:
            return "MANUAL_ON";
        case PumpDecisionReason::MANUAL_OFF:
            return "MANUAL_OFF";
        case PumpDecisionReason::NO_VALID_DHT:
            return "NO_VALID_DHT";
        case PumpDecisionReason::RH_MAX_THRESHOLD:
            return "RH_MAX_THRESHOLD";
        case PumpDecisionReason::HUMIDITY_DEMAND:
            return "HUMIDITY_DEMAND";
        case PumpDecisionReason::TEMP_HIGH_THRESHOLD:
            return "TEMP_HIGH_THRESHOLD";
        case PumpDecisionReason::NO_THRESHOLD_MET:
            return "NO_THRESHOLD_MET";
        case PumpDecisionReason::SCHEDULED:
            return "SCHEDULED";
        case PumpDecisionReason::NONE:
        default:
            return "NONE";
    }
}

const char* MqttPublisher::dhtHealthToStr(DhtHealthStatus health) {
    switch (health) {
        case DhtHealthStatus::NORMAL:   return "NORMAL";
        case DhtHealthStatus::DEGRADED: return "DEGRADED";
        case DhtHealthStatus::ERROR:    return "ERROR";
        default:                        return "ERROR";
    }
}

String MqttPublisher::buildTimestamp() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        // NTP not yet synced — return epoch-zero as placeholder
        return String("1970-01-01T00:00:00Z");
    }
    char buf[25];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    return String(buf);
}

float MqttPublisher::soilAverage(const SensorSnapshot& snapshot) {
    if (snapshot.validSoilCount == 0) return 0.0F;
    float sum = 0.0F;
    for (uint8_t i = 0; i < Config::SOIL_COUNT; ++i) {
        if (snapshot.soil[i].valid) {
            sum += static_cast<float>(snapshot.soil[i].percent);
        }
    }
    return sum / static_cast<float>(snapshot.validSoilCount);
}
