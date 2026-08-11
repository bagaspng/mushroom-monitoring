#pragma once

#include <Arduino.h>

#include "Types.h"

class Logger {
public:
    static void printStartup();
    static void printSnapshot(
        const SensorSnapshot& snapshot,
        const ControlDecision& decision,
        PumpState pumpState,
        uint32_t cooldownRemainingMs
    );
};
