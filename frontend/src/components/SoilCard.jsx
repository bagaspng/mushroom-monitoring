/**
 * SoilCard.jsx — Soil moisture average display
 *
 * Shows only the average soil moisture value.
 * Individual soil sensor readings are NOT displayed.
 * Labeled clearly as "Monitoring Only" — not pump control input.
 */

function SoilBar({ percent }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const hue = Math.round(120 * (clamped / 100)); // green at wet, red at dry... reversed for soil
  const color =
    clamped > 60
      ? '16, 217, 160'  // teal = moist
      : clamped > 30
      ? '245, 158, 11'  // amber = medium
      : '239, 68, 68';  // red = dry

  return (
    <div className="relative mt-4">
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: '10px', background: 'rgba(148,163,184,0.1)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${clamped}%`,
            background: `linear-gradient(90deg, rgba(${color},0.6), rgba(${color},1))`,
            boxShadow: `0 0 8px rgba(${color},0.5)`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <span>Kering</span>
        <span>Basah</span>
      </div>
    </div>
  );
}

export function SoilCard({ telemetry, stale }) {
  const soilAvg = telemetry?.current_telemetry?.soil_average;
  const soilValid = telemetry?.current_telemetry?.soil_valid;
  const soilTotal = telemetry?.current_telemetry?.soil_total ?? 3;

  const hasData = !stale && soilAvg !== null && soilAvg !== undefined;
  const displayValue = hasData ? Number(soilAvg).toFixed(1) : '—';

  return (
    <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
            Kelembapan Media Tanam
          </h3>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
            style={{
              background: 'rgba(168,85,247,0.15)',
              color: 'var(--accent-purple)',
              border: '1px solid rgba(168,85,247,0.25)',
            }}
          >
            Monitoring Only
          </span>
        </div>
        <span className="text-2xl">🌱</span>
      </div>

      <div className="flex items-end gap-2 mt-4">
        <span
          className="font-extrabold"
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            color: hasData ? 'var(--accent-purple)' : 'var(--text-muted)',
            lineHeight: 1,
          }}
        >
          {displayValue}
        </span>
        {hasData && (
          <span className="text-lg font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            %
          </span>
        )}
      </div>

      {hasData && <SoilBar percent={Number(soilAvg)} />}

      <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Sensor aktif: {soilValid ?? '—'}/{soilTotal}
        {' '}· Rata-rata dari {soilTotal} zona
      </div>
    </div>
  );
}
