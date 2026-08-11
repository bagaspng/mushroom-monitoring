/**
 * PumpStatus.jsx — Pump state and reason display
 *
 * ⚠ pump_reason is taken verbatim from ESP32 payload.
 * Frontend NEVER calculates or infers the reason.
 *
 * Reason values (from Types.h source of truth):
 *   NONE, NO_VALID_DHT, RH_MAX_THRESHOLD,
 *   HUMIDITY_DEMAND, TEMP_HIGH_THRESHOLD,
 *   NO_THRESHOLD_MET, COOLDOWN
 */

// Human-readable labels for each pump reason enum
const REASON_LABELS = {
  HUMIDITY_DEMAND:     { text: 'Kelembapan rendah', icon: '💧', color: '59, 130, 246' },
  TEMP_HIGH_THRESHOLD: { text: 'Suhu tinggi',        icon: '🌡️', color: '239, 68, 68'  },
  RH_MAX_THRESHOLD:    { text: 'Kelembapan maks',    icon: '🚫', color: '245, 158, 11' },
  NO_THRESHOLD_MET:    { text: 'Kondisi normal',      icon: '✅', color: '16, 217, 160' },
  NO_VALID_DHT:        { text: 'Sensor DHT error',   icon: '⚠️', color: '239, 68, 68'  },
  COOLDOWN:            { text: 'Cooldown aktif',      icon: '⏱️', color: '168, 85, 247' },
  NONE:                { text: 'Belum dievaluasi',   icon: '—',  color: '148, 163, 184' },
};

function PumpIndicator({ isOn }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
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
          width: 56,
          height: 56,
          background: isOn
            ? 'linear-gradient(135deg, rgba(16,217,160,0.3), rgba(59,130,246,0.2))'
            : 'rgba(148,163,184,0.05)',
          border: `2px solid ${isOn ? 'rgba(16,217,160,0.6)' : 'rgba(148,163,184,0.2)'}`,
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>💦</span>
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
  const isOn = !stale && t?.pump === true;
  const reasonKey = t?.pump_reason ?? 'NONE';
  const pumpState = t ? (
    t.pump
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

  return (
    <div
      className={`glass-card p-5 animate-slide-up ${isOn ? 'pump-on' : 'pump-off'}`}
      style={{ animationDelay: '0.15s' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
          Status Pompa
        </h3>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: isOn ? 'rgba(16,217,160,0.2)' : 'rgba(148,163,184,0.1)',
            color: isOn ? 'var(--accent-primary)' : 'var(--text-muted)',
            border: `1px solid ${isOn ? 'rgba(16,217,160,0.4)' : 'rgba(148,163,184,0.15)'}`,
          }}
        >
          {stale ? 'NO DATA' : isOn ? 'ON' : pumpState ?? 'IDLE'}
        </span>
      </div>

      <div className="flex items-center gap-5">
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
                <div className="mt-2 text-xs" style={{ color: 'var(--accent-purple)' }}>
                  ⏱ Cooldown: {Math.floor(cooldownSec / 60)}m {cooldownSec % 60}s tersisa
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        Alasan dari ESP32 · Frontend tidak menghitung reason
      </p>
    </div>
  );
}
