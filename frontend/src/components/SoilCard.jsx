/**
 * SoilCard.jsx — Kelembapan Media Tanam (Baglog)
 *
 * Generous card with big numbers, clear target indicators.
 * Uses custom CSS classes from index.css for reliable spacing.
 */

import React from 'react';
import { Sprout, CheckCircle2 } from 'lucide-react';

export function SoilCard({ telemetry, stale }) {
  const t = telemetry?.current_telemetry;
  const soil      = t?.soil_average;
  const soilValid = t?.soil_valid ?? 0;
  const soilTotal = t?.soil_total ?? 2;

  const soilNum      = !stale && soil !== null && soil !== undefined ? Number(soil) : null;
  const clampedSoil  = Math.max(0, Math.min(100, soilNum ?? 0));

  const soilStatus = soilNum === null ? null :
    soilNum > 85 ? { label: 'Sangat Basah', bg: '#FEF3C7', color: '#B45309', border: '#F59E0B' } :
    soilNum < 40 ? { label: 'Kering',        bg: '#FEE2E2', color: '#B91C1C', border: '#EF4444' } :
    { label: 'Optimal', bg: '#DCFCE7', color: '#15803D', border: '#10B981' };

  const barColor = clampedSoil > 85 ? '#F59E0B' : clampedSoil < 40 ? '#EF4444' : '#10B981';

  return (
    <div
      className="dashboard-card"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <div
        className="card-body"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
      >
        {/* ---- Header ---- */}
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon" style={{ backgroundColor: '#FEF3C7' }}>
              <Sprout size={22} strokeWidth={2.5} style={{ color: '#1E293B' }} />
            </div>
            <div>
              <h2 className="card-title">Media Tanam (Baglog)</h2>
              <p className="card-subtitle">Sensor Kapasitif ADC</p>
            </div>
          </div>

          {!stale && soilStatus && (
            <span
              className="candy-pill"
              style={{
                backgroundColor: soilStatus.bg,
                color: soilStatus.color,
                borderColor: soilStatus.border,
              }}
            >
              {soilStatus.label}
            </span>
          )}
        </div>

        {/* ---- Big Value ---- */}
        <div className="metric-value-area">
          <span className="metric-value-primary">
            {soilNum !== null ? soilNum.toFixed(1) : '—'}
          </span>
          {soilNum !== null && (
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                fontWeight: 800,
                color: '#94A3B8',
                letterSpacing: '-0.02em',
              }}
            >
              %
            </span>
          )}
        </div>

        {/* ---- Range Bar ---- */}
        {soilNum !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
            {/* Track */}
            <div
              style={{
                width: '100%',
                height: 14,
                borderRadius: 9999,
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Target ideal zone (60–80%) */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '60%',
                  width: '20%',
                  backgroundColor: '#D1FAE5',
                  borderLeft: '1px solid #6EE7B7',
                  borderRight: '1px solid #6EE7B7',
                }}
                title="Zona Target Ideal: 60–80%"
              />
              {/* Fill */}
              <div
                style={{
                  height: '100%',
                  width: `${clampedSoil}%`,
                  backgroundColor: barColor,
                  borderRadius: 9999,
                  transition: 'width 0.7s ease',
                }}
              />
            </div>

            {/* Labels */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#94A3B8',
              }}
            >
              <span>0% Kering</span>
              <span style={{ color: '#10B981', fontWeight: 700 }}>Target 60–80%</span>
              <span>100% Basah</span>
            </div>
          </div>
        )}

        {/* ---- Footer ---- */}
        <div
          className="card-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: '#64748B',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <CheckCircle2 size={16} style={{ color: '#10B981' }} />
            <span>Sensor Terbaca: <strong style={{ color: '#1E293B' }}>{soilValid}/{soilTotal} Zona</strong></span>
          </div>
          <span style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>Real-time ADC</span>
        </div>
      </div>
    </div>
  );
}
