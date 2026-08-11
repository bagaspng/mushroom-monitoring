#include "PumpController.h"

PumpController::PumpController(
    uint8_t relayPin,
    bool activeLow,
    uint32_t cooldownMs,
    uint32_t maxOnMs
)
    : relayPin_(relayPin),
      activeLow_(activeLow),
      cooldownMs_(cooldownMs),
      maxOnMs_(maxOnMs) {}

void PumpController::begin() {
    pinMode(relayPin_, OUTPUT);

    // Pastikan relay OFF sebelum state lain berjalan.
    setRelay(false);
    state_ = PumpState::IDLE;
}

void PumpController::setRelay(bool on) {
    const uint8_t activeLevel = activeLow_ ? LOW : HIGH;
    const uint8_t inactiveLevel = activeLow_ ? HIGH : LOW;
    digitalWrite(relayPin_, on ? activeLevel : inactiveLevel);
}

bool PumpController::startPulse(
    uint32_t nowMs,
    uint32_t requestedDurationMs
) {
    if (state_ != PumpState::IDLE) {
        return false;
    }

    requestedDurationMs_ = min(requestedDurationMs, maxOnMs_);
    if (requestedDurationMs_ == 0) {
        return false;
    }

    startedAtMs_ = nowMs;
    state_ = PumpState::RUNNING;
    setRelay(true);
    return true;
}

void PumpController::forceStop(uint32_t nowMs) {
    setRelay(false);
    stoppedAtMs_ = nowMs;
    state_ = PumpState::COOLDOWN;
}

void PumpController::update(uint32_t nowMs) {
    if (state_ == PumpState::RUNNING) {
        const uint32_t elapsed = nowMs - startedAtMs_;

        if (elapsed >= requestedDurationMs_ || elapsed >= maxOnMs_) {
            forceStop(nowMs);
        }
        return;
    }

    if (state_ == PumpState::COOLDOWN) {
        if ((nowMs - stoppedAtMs_) >= cooldownMs_) {
            state_ = PumpState::IDLE;
        }
    }
}

PumpState PumpController::state() const {
    return state_;
}

bool PumpController::isRunning() const {
    return state_ == PumpState::RUNNING;
}

uint32_t PumpController::remainingCooldownMs(uint32_t nowMs) const {
    if (state_ != PumpState::COOLDOWN) {
        return 0;
    }

    const uint32_t elapsed = nowMs - stoppedAtMs_;
    if (elapsed >= cooldownMs_) {
        return 0;
    }

    return cooldownMs_ - elapsed;
}
