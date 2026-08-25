/**
 * PumpStatus.jsx — Pump Control & Status Component
 * Placed directly below Suhu & Kelembaban cards.
 *
 * Uses custom CSS classes from index.css for guaranteed, generous spacing.
 */

import React, { useState, useEffect } from 'react';
import { Waves, Zap, Power, Timer, Info, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

const REASON_LABELS = {
  HUMIDITY_DEMAND:     { text: 'Kelembapan Rendah (Demand)',        icon: '💧' },
  TEMP_HIGH_THRESHOLD: { text: 'Suhu Tinggi (Demand)',              icon: '🌡️' },
  RH_MAX_THRESHOLD:    { text: 'Kelembapan Maksimal (Safety Lock)', icon: '🚫' },
  NO_THRESHOLD_MET:    { text: 'Kondisi Normal (Standby)',           icon: '✨' },
  NO_VALID_DHT:        { text: 'Sensor DHT Error (Safety Lock)',     icon: '⚠️' },
  COOLDOWN:            { text: 'Masa Jeda Aktif (Cooldown)',         icon: '⏱️' },
  MANUAL_ON:           { text: 'Manual Aktif (ON)',                  icon: '🖐️' },
  MANUAL_OFF:          { text: 'Manual Nonaktif (OFF)',              icon: '🖐️' },
  NONE:                { text: 'Standby',                            icon: '—'  },
};

export function PumpStatus({ telemetry, stale }) {
  const t = telemetry?.current_telemetry;
  const serverIsOn  = !stale && t?.pump === true;
  const serverMode  = telemetry?.mode ?? t?.mode ?? 'AUTO';

  const [optimisticPump, setOptimisticPump] = useState(null);
  const [optimisticMode, setOptimisticMode] = useState(null);
  const [loading, setLoading]               = useState(false);

  const currentMode = optimisticMode ?? serverMode;
  const isManual    = currentMode === 'MANUAL';
  const isOn        = optimisticPump !== null ? optimisticPump : serverIsOn;

  useEffect(() => { setOptimisticPump(null); }, [serverIsOn]);
  useEffect(() => { setOptimisticMode(null); }, [serverMode]);

  const rawReason   = t?.pump_reason ?? (isOn ? 'MANUAL_ON' : 'NONE');
  const reasonObj   = REASON_LABELS[rawReason] ?? { text: rawReason, icon: '💡' };
  const cooldownSec = t?.cooldown_remaining_s ?? 0;

  const handleModeChange = async (targetMode) => {
    if (loading || targetMode === currentMode) return;
    setOptimisticMode(targetMode);
    try {
      setLoading(true);
      await api.sendControl({ mode: targetMode });
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

  // State colors
  const stateBg    = isOn ? '#DCFCE7' : cooldownSec > 0 ? '#FEF3C7' : '#F8FAFC';
  const stateColor = isOn ? '#15803D' : cooldownSec > 0 ? '#B45309' : '#475569';
  const stateBord  = isOn ? '#16A34A' : cooldownSec > 0 ? '#D97706' : '#94A3B8';

  return (
    <div className="dashboard-card">
      <div className="card-body">
        {/* ---- Card Header ---- */}
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon" style={{ backgroundColor: '#EDE9FE' }}>
              <Waves size={22} strokeWidth={2.5} style={{ color: '#1E293B' }} />
            </div>
            <div>
              <h2 className="card-title">Kontrol &amp; Status Pompa</h2>
              <p className="card-subtitle">Sistem Penyemprotan Kabut Otomatis</p>
            </div>
          </div>

          {/* State Pill */}
          <span
            className="candy-pill"
            style={{ backgroundColor: stateBg, color: stateColor, borderColor: stateBord }}
          >
            <span className={`pop-dot ${isOn ? 'online' : cooldownSec > 0 ? 'connecting' : 'offline'}`} />
            {stale
              ? 'No Data'
              : isOn
              ? 'SEDANG MENYEMPROT'
              : cooldownSec > 0
              ? 'COOLDOWN'
              : 'STANDBY (MATI)'}
          </span>
        </div>

        {/* ---- Body Grid: State Panel (left) + Controls (right) ---- */}
        <div className="pump-body-grid">

          {/* Left: Visual Pump State Panel */}
          <div
            className="pump-state-panel"
            style={{ backgroundColor: stateBg, borderColor: stateBord }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* Emoji Icon */}
              <div
                className="pump-emoji"
                style={{
                  backgroundColor: isOn ? '#6EE7B7' : cooldownSec > 0 ? '#FDE68A' : '#E2E8F0',
                  animation: isOn ? 'pulse-dot 1.5s infinite' : 'none',
                }}
              >
                {isOn ? '💦' : cooldownSec > 0 ? '⏱️' : '💤'}
              </div>

              {/* Status Text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    fontSize: '1.0625rem',
                    color: '#1E293B',
                    lineHeight: 1.2,
                  }}
                >
                  {stale
                    ? 'Data Tidak Tersedia'
                    : isOn
                    ? 'Pompa Sedang Aktif Menyemprot'
                    : cooldownSec > 0
                    ? 'Masa Jeda Pendinginan'
                    : 'Pompa Sedang Standby (Mati)'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                  <span style={{ color: '#94A3B8' }}>Pemicu:</span>
                  <span style={{ fontWeight: 700, color: '#1E293B' }}>
                    {reasonObj.icon} {reasonObj.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Cooldown Timer */}
            {cooldownSec > 0 && !isOn && (
              <span
                className="candy-pill"
                style={{
                  backgroundColor: '#FDE68A',
                  color: '#78350F',
                  borderColor: '#F59E0B',
                  alignSelf: 'flex-start',
                  fontSize: '0.875rem',
                  padding: '7px 14px',
                }}
              >
                <Timer size={15} strokeWidth={2.5} />
                <span>Sisa Jeda: <strong>{Math.floor(cooldownSec / 60)}m {cooldownSec % 60}s</strong></span>
              </span>
            )}
          </div>

          {/* Right: Mode Switch & Action Controls */}
          <div className="pump-controls">
            {/* Segmented Mode Switch */}
            <div className="mode-switch-wrapper">
              <div className="mode-switch-label">
                <span>Mode Kontrol</span>
                <span>{isManual ? 'Mode Manual Dipilih' : 'Mode Otomatis Aktif'}</span>
              </div>
              <div className="mode-switch-track">
                <button
                  type="button"
                  onClick={() => handleModeChange('AUTO')}
                  disabled={loading}
                  className={`mode-btn ${!isManual ? 'active-auto' : ''}`}
                >
                  <Zap size={16} strokeWidth={2.5} />
                  <span>⚡ Otomatis</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('MANUAL')}
                  disabled={loading}
                  className={`mode-btn ${isManual ? 'active-manual' : ''}`}
                >
                  <Power size={16} strokeWidth={2.5} />
                  <span>⏻ Manual</span>
                </button>
              </div>
            </div>

            {/* Action Button / Auto Info */}
            {isManual ? (
              <div className="pump-action-section animate-pop-in">
                <button
                  type="button"
                  onClick={handlePumpToggle}
                  disabled={loading}
                  className="candy-btn"
                  style={{
                    width: '100%',
                    backgroundColor: isOn ? '#EF4444' : '#10B981',
                    color: '#FFFFFF',
                    boxShadow: 'var(--shadow-pop-md)',
                    fontSize: '1rem',
                    fontWeight: 800,
                    padding: '14px 24px',
                  }}
                >
                  <Power size={20} strokeWidth={2.5} />
                  <span>{isOn ? 'MATIKAN POMPA SEKARANG' : 'NYALAKAN POMPA SEKARANG'}</span>
                </button>

                <div className="pump-info-note">
                  <Info size={15} style={{ color: '#F472B6', flexShrink: 0, marginTop: 1 }} />
                  <span>Manual dibatasi maksimal 15 detik/siklus demi keamanan pompa.</span>
                </div>
              </div>
            ) : (
              <div className="auto-info-box">
                <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
                <span>Otomatis: ESP32 mengevaluasi pompa secara mandiri via sensor DHT22.</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
