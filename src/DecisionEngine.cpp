#include "DecisionEngine.h"

ControlDecision DecisionEngine::evaluate(const SensorSnapshot& snapshot) {
    ControlDecision decision;

    if (snapshot.validDhtCount == 0) {
        temperatureDemand_ = false;
        humidityDemand_ = false;
        decision.requestPump = false;
        decision.reason = PumpDecisionReason::NO_VALID_DHT;
        return decision;
    }

    if (snapshot.averageHumidityRh >= Config::RH_MAX_THRESHOLD) {
        humidityDemand_ = false;
        temperatureDemand_ = false;
        decision.requestPump = false;
        decision.reason = PumpDecisionReason::RH_MAX_THRESHOLD;
        return decision;
    }

    if (snapshot.averageHumidityRh <= Config::RH_ON_THRESHOLD) {
        humidityDemand_ = true;
    } else if (snapshot.averageHumidityRh >= Config::RH_OFF_THRESHOLD) {
        humidityDemand_ = false;
    }

    temperatureDemand_ = snapshot.averageTemperatureC >= Config::TEMP_HIGH_THRESHOLD_C;

    decision.requestPump = humidityDemand_ || temperatureDemand_;
    if (decision.requestPump) {
        decision.reason = humidityDemand_
            ? PumpDecisionReason::HUMIDITY_DEMAND
            : PumpDecisionReason::TEMP_HIGH_THRESHOLD;
    } else {
        decision.reason = PumpDecisionReason::NO_THRESHOLD_MET;
    }

    return decision;
}