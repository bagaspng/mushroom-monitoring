/**
 * pages/Dashboard.jsx — Main dashboard layout
 *
 * Layout (top to bottom):
 *   1. Header — system name + connection indicator
 *   2. HeroEnvironment — temperature + humidity + last update
 *   3. SensorChart — dual Y-axis history chart
 *   4. SoilCard + PumpStatus (side by side on desktop)
 *   5. SystemStatus
 *   6. Threshold (read-only, from ESP32 config)
 */

import { useTelemetry } from '../hooks/useTelemetry';
import { HeroEnvironment } from '../components/HeroEnvironment';
import { SensorChart } from '../components/SensorChart';
import { SoilCard } from '../components/SoilCard';
import { PumpStatus } from '../components/PumpStatus';
import { SystemStatus } from '../components/SystemStatus';

// ---- Connection indicator in header ----
function ConnectionBadge({ wsStatus, backendOnline }) {
  const connected = wsStatus === 'connected' && backendOnline;
  const label = wsStatus === 'connected'
    ? (backendOnline ? 'Live' : 'Backend Offline')
    : wsStatus === 'connecting' ? 'Connecting…'
    : 'Disconnected';

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{
        background: connected
          ? 'rgba(16,217,160,0.1)'
          : 'rgba(245,158,11,0.1)',
        border: `1px solid ${connected ? 'rgba(16,217,160,0.3)' : 'rgba(245,158,11,0.3)'}`,
        color: connected ? 'var(--accent-primary)' : 'var(--accent-warning)',
      }}
    >
      <span
        className={`status-dot ${connected ? 'online' : wsStatus === 'connecting' ? 'connecting' : 'offline'}`}
      />
      {label}
    </div>
  );
}

// ---- Threshold panel (read-only) ----
function ThresholdPanel({ telemetry }) {
  // Thresholds are not yet sent via MQTT in this version — show static defaults
  const defaults = {
    'RH ON':        '≤ 85 %',
    'RH OFF':       '≥ 90 %',
    'RH MAX':       '≥ 95 %',
    'Suhu Tinggi':  '≥ 30 °C',
    'Durasi Pompa': '8 detik',
    'Cooldown':     '300 detik',
  };

  return (
    <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '0.25s' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
          Threshold (Read-only)
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)' }}>
          Dari AppConfig.h
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {Object.entries(defaults).map(([key, val]) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{key}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{val}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Edit di <code>src/AppConfig.h</code> · Tidak ada fitur edit di dashboard
      </p>
    </div>
  );
}

// ---- Loading skeleton ----
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-card"
          style={{
            height: i === 1 ? 120 : i === 2 ? 320 : 180,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}

// ---- Error state ----
function ErrorBanner({ message }) {
  return (
    <div
      className="glass-card p-6 text-center"
      style={{ border: '1px solid rgba(239,68,68,0.3)' }}
    >
      <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</p>
      <p className="font-semibold" style={{ color: 'var(--accent-danger)' }}>
        {message}
      </p>
      <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
        Pastikan backend berjalan di localhost:8000 dan coba refresh halaman.
      </p>
    </div>
  );
}

// ---- Main Dashboard ----
export function Dashboard() {
  const {
    currentData,
    history,
    stale,
    backendOnline,
    wsStatus,
    loading,
    error,
  } = useTelemetry();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(ellipse 80% 60% at 20% -5%, rgba(16,217,160,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 80% 100%, rgba(59,130,246,0.05) 0%, transparent 60%),
          var(--bg-base)
        `,
      }}
    >
      {/* ---- Header ---- */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(20px)',
          background: 'rgba(7,13,26,0.85)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1rem' }}>
          <div className="flex items-center justify-between" style={{ height: 56 }}>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '1.5rem' }}>🍄</span>
              <div>
                <h1
                  className="font-bold text-gradient-primary"
                  style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', lineHeight: 1.2 }}
                >
                  Rumah Jamur
                </h1>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1 }}>
                  IoT Monitoring Dashboard
                </p>
              </div>
            </div>
            <ConnectionBadge wsStatus={wsStatus} backendOnline={backendOnline} />
          </div>
        </div>
      </header>

      {/* ---- Main content ---- */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
        {loading ? (
          <LoadingSkeleton />
        ) : error && !currentData ? (
          <ErrorBanner message={error} />
        ) : (
          <div className="space-y-4">

            {/* 2. Hero Environment */}
            <HeroEnvironment
              telemetry={currentData}
              stale={stale}
              lastSeenAt={currentData?.last_seen_at}
            />

            {/* 3. History Chart */}
            <SensorChart history={history} stale={stale} />

            {/* 4. Soil + Pump — side by side on desktop */}
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <SoilCard telemetry={currentData} stale={stale} />
              <PumpStatus telemetry={currentData} stale={stale} />
            </div>

            {/* 5. System status */}
            <SystemStatus
              telemetry={currentData}
              stale={stale}
              wsStatus={wsStatus}
              backendOnline={backendOnline}
            />

            {/* 6. Threshold (read-only) */}
            <ThresholdPanel telemetry={currentData} />

          </div>
        )}
      </main>
    </div>
  );
}
