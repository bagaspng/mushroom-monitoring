#pragma once

#include "Types.h"

class DecisionEngine {
public:
    ControlDecision evaluate(const SensorSnapshot& snapshot);

private:
    bool temperatureDemand_ = false;
    bool humidityDemand_ = false;
};
