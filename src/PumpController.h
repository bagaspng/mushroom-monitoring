#pragma once

#include <Arduino.h>
#include "Types.h"

class PumpController {
public:
    PumpController(
        uint8_t relayPin,
        bool activeLow,
        uint32_t cooldownMs,
        uint32_t maxOnMs
    );

    void begin();
    void update(uint32_t nowMs);

    bool startPulse(uint32_t nowMs, uint32_t requestedDurationMs);
    bool startManual(uint32_t nowMs, uint32_t maxDurationMs = 0);
    void forceStop(uint32_t nowMs);
    void stopManual(uint32_t nowMs);

    PumpState state() const;
    bool isRunning() const;
    uint32_t remainingCooldownMs(uint32_t nowMs) const;

private:
    void setRelay(bool on);

    uint8_t relayPin_;
    bool activeLow_;
    uint32_t cooldownMs_;
    uint32_t maxOnMs_;

    PumpState state_ = PumpState::IDLE;
    uint32_t startedAtMs_ = 0;
    uint32_t stoppedAtMs_ = 0;
    uint32_t requestedDurationMs_ = 0;
};
