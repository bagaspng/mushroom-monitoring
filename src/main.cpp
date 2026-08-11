#include <Arduino.h>

#include "AppConfig.h"
#include "DecisionEngine.h"
#include "Logger.h"
#include "MqttPublisher.h"
#include "PumpController.h"
#include "SensorManager.h"

namespace {

SensorManager sensorManager;
DecisionEngine decisionEngine;
PumpController pumpController(
    RELAY_PIN,
    Config::RELAY_ACTIVE_LOW,
    Config::PUMP_COOLDOWN_MS,
    Config::PUMP_MAX_ON_MS
);
MqttPublisher mqttPublisher;

SensorSnapshot snapshot;
ControlDecision decision;
uint32_t lastSensorReadMs = 0;
bool hasSnapshot = false;

// ---------------------------------------------------------------
// Control path — completely independent from monitoring stack.
// Runs on every sensor read interval regardless of Wi-Fi/MQTT.
// ---------------------------------------------------------------
void readAndApplyControl(uint32_t nowMs) {
  snapshot = sensorManager.readAll(nowMs);
  decision = decisionEngine.evaluate(snapshot);
  hasSnapshot = true;

  if (decision.requestPump) {
    pumpController.startPulse(nowMs, Config::PUMP_ON_DURATION_MS);
  }

  Logger::printSnapshot(
      snapshot,
      decision,
      pumpController.state(),
      pumpController.remainingCooldownMs(nowMs)
  );
}

}  // namespace

// ---------------------------------------------------------------
void setup() {
  Serial.begin(Config::SERIAL_BAUD);
  delay(2000);

  Logger::printStartup();

  sensorManager.begin();
  pumpController.begin();

  // Monitoring stack — optional, does not affect pump control
  mqttPublisher.begin();
}

// ---------------------------------------------------------------
void loop() {
  const uint32_t nowMs = millis();

  // 1. Keep pump state machine up to date (control path)
  pumpController.update(nowMs);

  // 2. Read sensors and make control decisions
  if (!hasSnapshot || (nowMs - lastSensorReadMs) >= Config::SENSOR_READ_INTERVAL_MS) {
    lastSensorReadMs = nowMs;
    readAndApplyControl(nowMs);
  }

  // 3. Non-blocking monitoring: publish latest snapshot via MQTT
  //    This path is completely optional — pump works without it
  if (hasSnapshot) {
    mqttPublisher.loop(nowMs, snapshot, decision, pumpController);
  }

  delay(10);
}