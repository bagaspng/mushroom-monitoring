#pragma once

#include <Arduino.h>
#include <DHT.h>

#include "AppConfig.h"
#include "Types.h"

class SensorManager {
public:
    SensorManager();
    void begin();
    SensorSnapshot readAll(uint32_t nowMs);

private:
    static bool isDhtValueValid(float temperatureC, float humidityRh);
    static int rawToPercent(int raw, int dryRaw, int wetRaw);

    DHT dht1_;
    DHT dht2_;
    DHT dht3_;
    DHT dht4_;

    DHT* dhtSensors_[Config::DHT_COUNT];
};
