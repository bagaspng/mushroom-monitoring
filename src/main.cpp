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
ControlMode currentMode = ControlMode::AUTO;
bool manualPumpState = false;
uint32_t lastSensorReadMs = 0;
bool hasSnapshot = false;

// ---------------------------------------------------------------
// Control path — completely independent from monitoring stack.
// Runs on every sensor read interval regardless of Wi-Fi/MQTT.
// ---------------------------------------------------------------
void readAndApplyControl(uint32_t nowMs) {
  snapshot = sensorManager.readAll(nowMs);
  hasSnapshot = true;

  if (currentMode == ControlMode::AUTO) {
    decision = decisionEngine.evaluate(snapshot);
    decision.mode = ControlMode::AUTO;

    if (decision.requestPump) {
      pumpController.startPulse(nowMs, Config::PUMP_ON_DURATION_MS);
    }
  } else {
    // In MANUAL mode, keep DHT averages/health updated for telemetry,
    // but pump state and reason follow manual command.
    decision.mode = ControlMode::MANUAL;
    decision.requestPump = pumpController.isRunning();
    decision.reason = pumpController.isRunning()
        ? PumpDecisionReason::MANUAL_ON
        : PumpDecisionReason::MANUAL_OFF;
  }

  Logger::printSnapshot(
      snapshot,
      decision,
      pumpController.state(),
      pumpController.remainingCooldownMs(nowMs)
  );
}

void handleControlCommand(ControlMode mode, bool pump) {
  const uint32_t nowMs = millis();
  currentMode = mode;
  manualPumpState = pump;
  decision.mode = mode;

  if (mode == ControlMode::MANUAL) {
    if (pump) {
      decision.requestPump = true;
      decision.reason = PumpDecisionReason::MANUAL_ON;
      pumpController.startManual(nowMs, Config::PUMP_MAX_ON_MS);
    } else {
      decision.requestPump = false;
      decision.reason = PumpDecisionReason::MANUAL_OFF;
      pumpController.stopManual(nowMs);
    }
  } else {
    // Switching back to AUTO: if pump was on from manual, stop it
    if (pumpController.isRunning() && manualPumpState) {
      pumpController.stopManual(nowMs);
    }
    readAndApplyControl(nowMs);
  }
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
  mqttPublisher.setControlCallback(handleControlCommand);
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