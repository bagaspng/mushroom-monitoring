/**
 * PumpStatus.jsx — Pump Control & Status Component
 * Placed directly below Suhu & Kelembaban cards.
 *
 * Uses custom CSS classes from index.css for guaranteed, generous spacing.
 * Includes authentication prompting for protected control endpoints in production.
 */

import React, { useState, useEffect } from 'react';
import { Waves, Zap, Power, Timer, Info, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../services/api';

const REASON_LABELS = {
  HUMIDITY_DEMAND:     { text: 'Kelembapan Rendah (Demand)',        icon: '💧' },
  TEMP_HIGH_THRESHOLD: { text: 'Suhu Tinggi (Demand)',              icon: '🌡️' },
  RH_MAX_THRESHOLD:    { text: 'Kelembapan Maksimal (Safety Lock)', icon: '🚫' },
  NO_THRESHOLD_MET:    { text: 'Kondisi Normal (Standby)',           icon: '✨' },
  NO_VALID_DHT:        { text: 'Sensor DHT Error (Safety Lock)',     icon: '⚠️' },
  COOLDOWN:            { text: 'Masa Jeda Aktif (Cooldown)',         icon: '⏱️' },
  SCHEDULED:           { text: 'Penyemprotan Terjadwal (Jadwal Rutin)', icon: '🗓️' },
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
  const [authError, setAuthError]           = useState(null);

  const currentMode = optimisticMode ?? serverMode;
  const isManual    = currentMode === 'MANUAL';
  const isOn        = optimisticPump !== null ? optimisticPump : serverIsOn;

  useEffect(() => { setOptimisticPump(null); }, [serverIsOn]);
  useEffect(() => { setOptimisticMode(null); }, [serverMode]);

  const rawReason   = t?.pump_reason ?? (isOn ? 'MANUAL_ON' : 'NONE');
  const reasonObj   = REASON_LABELS[rawReason] ?? { text: rawReason, icon: '💡' };
  const cooldownSec = t?.cooldown_remaining_s ?? 0;

  const promptForApiKey = () => {
    const entered = window.prompt('Masukkan Control API Key server untuk mengotorisasi aksi pompa:');
    if (entered && entered.trim()) {
      localStorage.setItem('control_api_key', entered.trim());
      setAuthError(null);
      return entered.trim();
    }
    return null;
  };

  const handleModeChange = async (targetMode) => {
    if (loading || targetMode === currentMode) return;
    setOptimisticMode(targetMode);
    setAuthError(null);
    try {
      setLoading(true);
      await api.sendControl({ mode: targetMode });
    } catch (err) {
      console.error('Failed to change mode:', err);
      if (err.status === 401) {
        setAuthError('Otorisasi diperlukan untuk mengubah mode.');
        const newKey = promptForApiKey();
        if (newKey) {
          try {
            await api.sendControl({ mode: targetMode, apiKey: newKey });
            setAuthError(null);
            return;
          } catch (retryErr) {
            console.error('Retry failed:', retryErr);
          }
        }
      }
      setOptimisticMode(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePumpToggle = async () => {
    if (loading || !isManual) return;
    const targetPump = !isOn;
    setOptimisticPump(targetPump);
    setAuthError(null);
    try {
      setLoading(true);
      await api.sendControl({ mode: 'MANUAL', pump: targetPump });
    } catch (err) {
      console.error('Failed to toggle pump:', err);
      if (err.status === 401) {
        setAuthError('Otorisasi diperlukan untuk mengontrol pompa.');
        const newKey = promptForApiKey();
        if (newKey) {
          try {
            await api.sendControl({ mode: 'MANUAL', pump: targetPump, apiKey: newKey });
            setAuthError(null);
            return;
          } catch (retryErr) {
            console.error('Retry failed:', retryErr);
          }
        }
      }
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
              ? 'STALE'
              : isOn
              ? 'POMPA AKTIF'
              : cooldownSec > 0
              ? 'COOLDOWN'
              : 'IDLE (OFF)'}
          </span>
        </div>

        {authError && (
          <div className="alert-banner" style={{ backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#F87171', marginBottom: 16 }}>
            <Lock size={16} />
            <span>{authError}</span>
            <button
              type="button"
              onClick={promptForApiKey}
              style={{ marginLeft: 'auto', textDecoration: 'underline', fontWeight: 700, background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer' }}
            >
              Masukkan Kunci
            </button>
          </div>
        )}

        {/* ---- Main Status Row ---- */}
        <div className="pump-main-grid">

          {/* Kolom Kiri: Display Status & Alasan */}
          <div className="pump-status-col">
            {/* Visual Pompa Besar */}
            <div className={`pump-hero-badge ${isOn ? 'pump-active-pulse' : ''}`}>
              <div
                className="pump-hero-icon"
                style={{
                  backgroundColor: isOn ? '#22C55E' : cooldownSec > 0 ? '#F59E0B' : '#64748B',
                }}
              >
                <Power size={32} color="#FFFFFF" strokeWidth={2.5} />
              </div>
              <div className="pump-hero-text">
                <span className="pump-hero-label">Status Relay Fisik</span>
                <span className="pump-hero-val" style={{ color: isOn ? '#15803D' : '#334155' }}>
                  {isOn ? 'MENYEMPROT' : 'MATI (STANDBY)'}
                </span>
              </div>
            </div>

            {/* Reason Box */}
            <div className="pump-reason-box">
              <div className="reason-box-header">
                <span className="reason-box-icon">{reasonObj.icon}</span>
                <span className="reason-box-title">Alasan Keputusan Pompa</span>
              </div>
              <div className="reason-box-body">
                <p className="reason-text">{reasonObj.text}</p>
                <code className="reason-raw-code">source: {rawReason}</code>
              </div>
            </div>

            {/* Cooldown Timer (bila aktif) */}
            {cooldownSec > 0 && !isOn && (
              <div className="cooldown-box animate-pulse-gentle">
                <Timer size={18} style={{ color: '#D97706', flexShrink: 0 }} />
                <div className="cooldown-text-group">
                  <span className="cooldown-title">Masa Jeda Pompa (Cooldown)</span>
                  <span className="cooldown-timer">{cooldownSec} detik tersisa</span>
                </div>
              </div>
            )}
          </div>

          {/* Kolom Kanan: Mode Switcher & Tombol Manual */}
          <div className="pump-control-col">
            {/* Mode Switcher Buttons */}
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
