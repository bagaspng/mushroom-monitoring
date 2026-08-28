#!/usr/bin/env python3
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
config = root / "src" / "AppConfig.h"

text = config.read_text(encoding="utf-8")

def number(name: str) -> float:
    match = re.search(
        rf"{re.escape(name)}\s*=\s*([0-9.]+)",
        text
    )
    if not match:
        raise ValueError(f"Konfigurasi {name} tidak ditemukan")
    return float(match.group(1))


def integer(name: str) -> int:
    match = re.search(
        rf"(?:#define\s+{re.escape(name)}\s+([0-9]+)|{re.escape(name)}\s*=\s*([0-9]+))",
        text,
    )
    if not match:
        raise ValueError(f"Konfigurasi {name} tidak ditemukan")
    val = match.group(1) or match.group(2)
    return int(val)

errors = []

if number("RH_OFF_THRESHOLD") < number("RH_ON_THRESHOLD"):
    errors.append("RH_OFF_THRESHOLD harus lebih besar atau sama dengan RH_ON_THRESHOLD")

if number("RH_MAX_THRESHOLD") < number("RH_OFF_THRESHOLD"):
    errors.append("RH_MAX_THRESHOLD harus lebih besar atau sama dengan RH_OFF_THRESHOLD")

if number("PUMP_ON_DURATION_MS") > number("PUMP_MAX_ON_MS"):
    errors.append("PUMP_ON_DURATION_MS tidak boleh melebihi PUMP_MAX_ON_MS")

pin_values = {
    "DHT1_PIN": integer("DHT1_PIN"),
    "DHT2_PIN": integer("DHT2_PIN"),
    "DHT3_PIN": integer("DHT3_PIN"),
    "DHT4_PIN": integer("DHT4_PIN"),
    "SOIL1_PIN": integer("SOIL1_PIN"),
    "SOIL2_PIN": integer("SOIL2_PIN"),
    "RELAY_PIN": integer("RELAY_PIN"),
}

duplicates = {}
for name, value in pin_values.items():
    duplicates.setdefault(value, []).append(name)

for value, names in duplicates.items():
    if len(names) > 1:
        errors.append(
            f"GPIO{value} dipakai lebih dari sekali: {', '.join(names)}"
        )

reserved_unused = {21, 22, 25, 26, 27, 33, 13, 14, 12}
for name, value in pin_values.items():
    if value in reserved_unused:
        errors.append(f"{name} tidak boleh memakai GPIO{value} pada wiring final")

if errors:
    print("CONFIG ERROR:")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("Config check OK")
