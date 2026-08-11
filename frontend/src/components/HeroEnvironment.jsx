/**
 * HeroEnvironment.jsx — Primary temperature + humidity display
 *
 * Shows the two most important environmental metrics with large,
 * easy-to-read numbers. Displays "No recent data" when stale.
 */

import { useEffect, useState } from 'react';

function MetricCard({ label, value, unit, color, icon, stale }) {
  return (
    <div
      className="glass-card p-6 flex-1 min-w-0"
      style={{
        borderColor: stale ? 'rgba(245,158,11,0.2)' : `rgba(${color}, 0.25)`,
        boxShadow: stale ? 'none' : `0 0 40px rgba(${color}, 0.1)`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span className="text-2xl">{icon}</span>
      </div>

      {stale || value === null || value === undefined ? (
        <div className="metric-value" style={{ color: 'var(--text-muted)', fontSize: '2rem' }}>
          —
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <span
            className="metric-value"
            style={{ color: `rgb(${color})` }}
          >
            {Number(value).toFixed(1)}
          </span>
          <span
            className="text-xl font-semibold mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {unit}
          </span>
        </div>
      )}
    </div>
  );
}

export function HeroEnvironment({ telemetry, stale, lastSeenAt }) {
  const [secondsAgo, setSecondsAgo] = useState(null);

  useEffect(() => {
    if (!lastSeenAt) return;
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000);
      setSecondsAgo(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lastSeenAt]);

  const temp = telemetry?.current_telemetry?.temperature;
  const humid = telemetry?.current_telemetry?.humidity;

  return (
    <section className="animate-slide-up">
      {/* Stale banner */}
      {stale && (
        <div className="no-data-banner mb-4">
          <span>⚠</span>
          <span>
            <strong>No recent data</strong> — Data lebih dari 30 detik tidak diterima.
            Pastikan ESP32 dan backend aktif.
          </span>
        </div>
      )}

      <div className="flex gap-4 flex-col sm:flex-row">
        <MetricCard
          label="Suhu Rata-rata"
          value={temp}
          unit="°C"
          color="59, 130, 246"
          icon="🌡️"
          stale={stale}
        />
        <MetricCard
          label="Kelembapan Rata-rata"
          value={humid}
          unit="%"
          color="16, 217, 160"
          icon="💧"
          stale={stale}
        />
      </div>

      {/* Last update indicator */}
      <div className="mt-3 flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <span>Last update:</span>
        {secondsAgo !== null ? (
          <span style={{ color: stale ? 'var(--accent-warning)' : 'var(--accent-primary)' }}>
            {secondsAgo < 60
              ? `${secondsAgo}s yang lalu`
              : `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s yang lalu`}
          </span>
        ) : (
          <span>Belum ada data</span>
        )}
      </div>
    </section>
  );
}
