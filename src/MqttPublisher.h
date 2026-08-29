#pragma once

// =============================================================
// MqttPublisher — Non-blocking Wi-Fi + MQTT telemetry publisher
// Supports both Standard TCP (1883) and TLS / SSL (8883)
//
// Responsibilities:
//   - Connect Wi-Fi (non-blocking, millis-based retry)
//   - Connect MQTT with TLS + LWT (non-blocking, millis-based retry)
//   - Publish telemetry payload every MqttConfig::PUBLISH_INTERVAL_MS
//   - Publish online status on connect
//   - NTP sync for UTC timestamps
//
// This module does NOT affect DecisionEngine or PumpController.
// If Wi-Fi or MQTT is unavailable, pump control continues normally.
// =============================================================

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

#include "AppConfig.h"
#include "Types.h"
#include "PumpController.h"

class MqttPublisher {
public:
    MqttPublisher();

    // Call once in setup() after Serial.begin()
    void begin();

    // Call every loop() iteration — handles reconnects and publish timer
    void loop(
        uint32_t nowMs,
        const SensorSnapshot& snapshot,
        const ControlDecision& decision,
        const PumpController& pump
    );

    using ControlCallback = void (*)(ControlMode mode, bool pump);
    void setControlCallback(ControlCallback cb);
    void triggerImmediatePublish();

    bool isWifiConnected() const;
    bool isMqttConnected();

private:
    void connectWifi();
    void attemptMqttConnect();
    void publishTelemetry(
        const SensorSnapshot& snapshot,
        const ControlDecision& decision,
        const PumpController& pump,
        uint32_t nowMs
    );
    void publishOnlineStatus(bool online);

    static void onMqttMessage(char* topic, byte* payload, unsigned int length);
    static ControlCallback controlCallback_;

    // --- Conversion helpers ---
    static const char* pumpReasonToStr(PumpDecisionReason reason, PumpState pumpState);
    static const char* dhtHealthToStr(DhtHealthStatus health);
    static String buildTimestamp();
    static float soilAverage(const SensorSnapshot& snapshot);

    WiFiClient         wifiClient_;
    WiFiClientSecure   wifiSecureClient_;
    PubSubClient       mqttClient_;

    uint32_t lastWifiAttemptMs_  = 0;
    uint32_t lastMqttAttemptMs_  = 0;
    uint32_t lastPublishMs_      = 0;

    bool ntpSynced_ = false;
};
