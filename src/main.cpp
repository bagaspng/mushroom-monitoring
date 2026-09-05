#include <Arduino.h>

#include "AppConfig.h"
#include "DecisionEngine.h"
#include "Logger.h"
#include "MqttPublisher.h"
#include "PumpController.h"
#include "ScheduleEngine.h"
#include "SensorManager.h"

namespace {

SensorManager  sensorManager;
DecisionEngine decisionEngine;
ScheduleEngine scheduleEngine;
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
//
// Kontrol otomatis pompa (AUTO mode):
//   - Berjalan murni berdasarkan jadwal waktu WIB (07:00, 12:00, 17:00 WIB).
//   - Durasi penyemprotan: 15 menit.
//   - Tidak dipicu oleh ambang batas suhu atau kelembaban.
//   - Sensor DHT22 dan Soil tetap dibaca secara berkala untuk pemantauan/telemetri.
// ---------------------------------------------------------------
void readAndApplyControl(uint32_t nowMs) {
  snapshot = sensorManager.readAll(nowMs);
  hasSnapshot = true;

  if (currentMode == ControlMode::AUTO) {
    decision.mode = ControlMode::AUTO;

    // Jika pompa sedang aktif berjalan dalam mode AUTO (karena jadwal)
    if (pumpController.isRunning()) {
      decision.requestPump = true;
      decision.reason      = PumpDecisionReason::SCHEDULED;
    }
    // Jika pompa tidak sedang berjalan, cek apakah saatnya memicu jadwal
    else if (Config::SCHEDULE_ENABLED && scheduleEngine.shouldSprayNow()) {
      decision.requestPump = true;
      decision.reason      = PumpDecisionReason::SCHEDULED;

      const bool started = pumpController.startPulse(nowMs, Config::SCHEDULE_PUMP_DURATION_MS);
      if (!started) {
        Serial.println(F("[SCHED] Jadwal aktif namun pompa sedang cooldown — ditunda."));
      } else {
        Serial.println(F("[SCHED] Penyemprotan terjadwal dimulai (15 menit)."));
      }
    }
    // Di luar jam jadwal: pompa OFF (murni penjadwalan, tidak dipicu suhu)
    else {
      decision.requestPump = false;
      if (pumpController.state() == PumpState::COOLDOWN) {
        decision.reason = PumpDecisionReason::NONE; // Diserialisasi sebagai "COOLDOWN" oleh MqttPublisher
      } else {
        decision.reason = PumpDecisionReason::NO_THRESHOLD_MET;
      }
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
      pumpController.startManual(nowMs, Config::PUMP_MANUAL_DURATION_MS);
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