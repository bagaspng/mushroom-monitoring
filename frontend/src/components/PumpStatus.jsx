import { useState, useEffect } from 'react';
import { api } from '../services/api';

/**
 * PumpStatus.jsx — Pump state, reason display, and manual control toggles
 *
 * ⚠ In AUTO mode, pump_reason is taken verbatim from ESP32 payload.
 * In MANUAL mode, the user can toggle the pump ON / OFF manually.
 */

const REASON_LABELS = {
  HUMIDITY_DEMAND:     { text: 'Kelembapan rendah', icon: '💧', color: '59, 130, 246' },
  TEMP_HIGH_THRESHOLD: { text: 'Suhu tinggi',        icon: '🌡️', color: '239, 68, 68'  },
  RH_MAX_THRESHOLD:    { text: 'Kelembapan maks',    icon: '🚫', color: '245, 158, 11' },
  NO_THRESHOLD_MET:    { text: 'Kondisi normal',      icon: '✅', color: '16, 217, 160' },
  NO_VALID_DHT:        { text: 'Sensor DHT error',   icon: '⚠️', color: '239, 68, 68'  },
  COOLDOWN:            { text: 'Cooldown aktif',      icon: '⏱️', color: '168, 85, 247' },
  MANUAL_ON:           { text: 'Manual Aktif (ON)',   icon: '🖐️', color: '16, 217, 160' },
  MANUAL_OFF:          { text: 'Manual Nonaktif',    icon: '🖐️', color: '148, 163, 184' },
  NONE:                { text: 'Belum dievaluasi',   icon: '—',  color: '148, 163, 184' },
};

function PumpIndicator({ isOn }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 76, height: 76 }}>
      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: `2px solid ${isOn ? 'rgba(16,217,160,0.5)' : 'rgba(148,163,184,0.15)'}`,
          animation: isOn ? 'pulse-ring 2s ease-in-out infinite' : 'none',
        }}
      />
      {/* Inner circle */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 52,
          height: 52,
          background: isOn
            ? 'linear-gradient(135deg, rgba(16,217,160,0.3), rgba(59,130,246,0.2))'
            : 'rgba(148,163,184,0.05)',
          border: `2px solid ${isOn ? 'rgba(16,217,160,0.6)' : 'rgba(148,163,184,0.2)'}`,
        }}
      >
        <span style={{ fontSize: '1.4rem' }}>💦</span>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%       { transform: scale(1.1); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

export function PumpStatus({ telemetry, stale }) {
  const t = telemetry?.current_telemetry;
  const serverIsOn = !stale && t?.pump === true;
  const serverMode = telemetry?.mode ?? t?.mode ?? 'AUTO';

  const [optimisticPump, setOptimisticPump] = useState(null);
  const [optimisticMode, setOptimisticMode] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentMode = optimisticMode ?? serverMode;
  const isManual = currentMode === 'MANUAL';
  const isOn = optimisticPump !== null ? optimisticPump : serverIsOn;

  useEffect(() => {
    setOptimisticPump(null);
  }, [serverIsOn]);

  useEffect(() => {
    setOptimisticMode(null);
  }, [serverMode]);

  const reasonKey = t?.pump_reason ?? (isOn ? 'MANUAL_ON' : 'NONE');
  const pumpState = t ? (
    isOn
      ? 'RUNNING'
      : t.cooldown_remaining_s > 0
      ? 'COOLDOWN'
      : 'IDLE'
  ) : null;

  const reasonInfo = REASON_LABELS[reasonKey] ?? {
    text: reasonKey,
    icon: '?',
    color: '148, 163, 184',
  };

  const cooldownSec = t?.cooldown_remaining_s ?? 0;

  const handleModeToggle = async () => {
    if (loading) return;
    const newMode = isManual ? 'AUTO' : 'MANUAL';
    setOptimisticMode(newMode);
    try {
      setLoading(true);
      await api.sendControl({ mode: newMode });
    } catch (err) {
      console.error('Failed to change mode:', err);
      setOptimisticMode(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePumpToggle = async () => {
    if (loading || !isManual) return;
    const targetPump = !isOn;
    setOptimisticPump(targetPump);
    try {
      setLoading(true);
      await api.sendControl({ mode: 'MANUAL', pump: targetPump });
    } catch (err) {
      console.error('Failed to toggle pump:', err);
      setOptimisticPump(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`glass-card p-5 animate-slide-up ${isOn ? 'pump-on' : 'pump-off'}`}
      style={{ animationDelay: '0.15s' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
            Status & Kontrol Pompa
          </h3>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: isManual ? 'rgba(168,85,247,0.15)' : 'rgba(59,130,246,0.15)',
              color: isManual ? 'var(--accent-purple)' : 'var(--accent-secondary)',
              border: `1px solid ${isManual ? 'rgba(168,85,247,0.3)' : 'rgba(59,130,246,0.3)'}`,
            }}
          >
            {isManual ? 'MANUAL' : 'AUTO (DHT)'}
          </span>
        </div>

        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: isOn ? 'rgba(16,217,160,0.2)' : 'rgba(148,163,184,0.1)',
            color: isOn ? 'var(--accent-primary)' : 'var(--text-muted)',
            border: `1px solid ${isOn ? 'rgba(16,217,160,0.4)' : 'rgba(148,163,184,0.15)'}`,
          }}
        >
          {stale ? 'NO DATA' : isOn ? 'RUNNING' : pumpState ?? 'IDLE'}
        </span>
      </div>

      {/* Main indicator and info */}
      <div className="flex items-center gap-4 mb-4">
        <PumpIndicator isOn={isOn} />

        <div className="flex-1 min-w-0">
          {stale ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Data tidak tersedia
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: '1.1rem' }}>{reasonInfo.icon}</span>
                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  {reasonInfo.text}
                </span>
              </div>
              <code
                className="text-xs"
                style={{
                  color: `rgb(${reasonInfo.color})`,
                  background: `rgba(${reasonInfo.color},0.1)`,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {reasonKey}
              </code>

              {/* Cooldown countdown */}
              {cooldownSec > 0 && (
                <div className="mt-1.5 text-xs font-medium" style={{ color: 'var(--accent-purple)' }}>
                  ⏱ Cooldown: {Math.floor(cooldownSec / 60)}m {cooldownSec % 60}s tersisa
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Interactive Controls Panel */}
      <div
        className="p-3 rounded-xl flex flex-col gap-3"
        style={{
          background: 'rgba(7, 13, 26, 0.6)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Toggle Mode: Auto vs Manual */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Mode Kontrol
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isManual ? 'Manual via Dashboard' : 'Otomatis via Sensor DHT22'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleModeToggle}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            style={{
              background: isManual
                ? 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(168,85,247,0.15))'
                : 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.15))',
              border: `1px solid ${isManual ? 'rgba(168,85,247,0.5)' : 'rgba(59,130,246,0.5)'}`,
              color: isManual ? 'var(--accent-purple)' : 'var(--accent-secondary)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <span>{isManual ? '⚙️ Ubah ke Auto' : '🖐️ Ubah ke Manual'}</span>
          </button>
        </div>

        {/* Toggle Pump: ON / OFF (Manual Mode Only) */}
        <div
          className="flex items-center justify-between pt-2"
          style={{
            borderTop: '1px solid rgba(148, 163, 184, 0.08)',
            opacity: isManual ? 1 : 0.45,
          }}
        >
          <div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Saklar Pompa Manual
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isManual
                ? isOn
                  ? 'Pompa sedang MENYALA (Klik untuk mematikan)'
                  : 'Pompa sedang MATI (Klik untuk menyalakan)'
                : 'Hanya aktif pada Mode Manual'}
            </div>
          </div>

          <button
            type="button"
            onClick={handlePumpToggle}
            disabled={!isManual || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              cursor: isManual ? 'pointer' : 'not-allowed',
              background: isOn
                ? 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.15))'
                : 'linear-gradient(135deg, rgba(16,217,160,0.3), rgba(16,217,160,0.15))',
              border: `1px solid ${isOn ? 'rgba(239,68,68,0.5)' : 'rgba(16,217,160,0.5)'}`,
              color: isOn ? 'var(--accent-danger)' : 'var(--accent-primary)',
              opacity: loading ? 0.6 : 1,
              boxShadow: isOn ? '0 0 12px rgba(239,68,68,0.2)' : '0 0 12px rgba(16,217,160,0.2)',
            }}
          >
            <span>{isOn ? '🛑 MATIKAN' : '⚡ NYALAKAN'}</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        {isManual
          ? 'Mode Manual aktif · Dilengkapi proteksi batas waktu semprot pengaman'
          : 'Mode Otomatis aktif · Pompa dievaluasi otomatis oleh ESP32'}
      </p>
    </div>
  );
}
