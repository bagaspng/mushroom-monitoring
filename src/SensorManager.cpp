#include "SensorManager.h"

#include <math.h>

namespace {

int readAverageAnalog(uint8_t pin, uint8_t samples) {
    if (samples == 0) {
        samples = 1;
    }

    uint32_t total = 0;
    for (uint8_t i = 0; i < samples; ++i) {
        total += static_cast<uint32_t>(analogRead(pin));
        delayMicroseconds(100);
    }

    return static_cast<int>(total / samples);
}

}  // namespace

SensorManager::SensorManager()
    : dht1_(Config::DHT_PINS[0], DHT22, 15),
      dht2_(Config::DHT_PINS[1], DHT22, 15),
      dht3_(Config::DHT_PINS[2], DHT22, 15),
      dht4_(Config::DHT_PINS[3], DHT22, 15),
      dhtSensors_{&dht1_, &dht2_, &dht3_, &dht4_} {}

void SensorManager::begin() {
    for (uint8_t i = 0; i < Config::DHT_COUNT; ++i) {
        dhtSensors_[i]->begin(80);
    }

    analogReadResolution(12);

    for (uint8_t i = 0; i < Config::SOIL_COUNT; ++i) {
        analogSetPinAttenuation(Config::SOIL_PINS[i], ADC_11db);
    }
}

bool SensorManager::isDhtValueValid(
    float temperatureC,
    float humidityRh
) {
    if (isnan(temperatureC) || isnan(humidityRh)) {
        return false;
    }

    if (temperatureC < Config::DHT_MIN_TEMP_C ||
        temperatureC > Config::DHT_MAX_TEMP_C) {
        return false;
    }

    if (humidityRh < Config::DHT_MIN_RH ||
        humidityRh > Config::DHT_MAX_RH) {
        return false;
    }

    return true;
}

int SensorManager::rawToPercent(int raw, int dryRaw, int wetRaw) {
    if (dryRaw == wetRaw) {
        return 0;
    }

    const float percentage =
        100.0F * static_cast<float>(raw - dryRaw) /
        static_cast<float>(wetRaw - dryRaw);

    return constrain(static_cast<int>(roundf(percentage)), 0, 100);
}

SensorSnapshot SensorManager::readAll(uint32_t nowMs) {
    SensorSnapshot snapshot;
    snapshot.timestampMs = nowMs;

    float temperatureSum = 0.0F;
    float humiditySum = 0.0F;

    for (uint8_t i = 0; i < Config::DHT_COUNT; ++i) {
        bool readOk = dhtSensors_[i]->read(true);
        if (!readOk) {
            delay(60);
            readOk = dhtSensors_[i]->read(true);
        }

        const float humidity = dhtSensors_[i]->readHumidity(false);
        const float temperature = dhtSensors_[i]->readTemperature(false, false);
        const bool valid = readOk && isDhtValueValid(temperature, humidity);

        snapshot.dht[i].temperatureC = temperature;
        snapshot.dht[i].humidityRh = humidity;
        snapshot.dht[i].valid = valid;

        if (!valid) {
            delay(20);
            continue;
        }

        ++snapshot.validDhtCount;
        temperatureSum += temperature;
        humiditySum += humidity;

        delay(30);  // Jeda stabilisasi antar sensor
    }

    if (snapshot.validDhtCount > 0) {
        snapshot.averageTemperatureC =
            temperatureSum / static_cast<float>(snapshot.validDhtCount);
        snapshot.averageHumidityRh =
            humiditySum / static_cast<float>(snapshot.validDhtCount);
    }

    if (snapshot.validDhtCount == Config::DHT_COUNT) {
        snapshot.dhtHealth = DhtHealthStatus::NORMAL;
    } else if (snapshot.validDhtCount == 0) {
        snapshot.dhtHealth = DhtHealthStatus::ERROR;
    } else {
        snapshot.dhtHealth = DhtHealthStatus::DEGRADED;
    }

    for (uint8_t i = 0; i < Config::SOIL_COUNT; ++i) {
        // Data dummy random di rentang 70 - 80% (tanpa membaca sensor fisik)
        const int dummyPercent = constrain(static_cast<int>(random(72, 79)), 70, 80);

        snapshot.soil[i].raw = 1850;
        snapshot.soil[i].valid = true;
        snapshot.soil[i].percent = dummyPercent;
        ++snapshot.validSoilCount;
    }

    return snapshot;
}
