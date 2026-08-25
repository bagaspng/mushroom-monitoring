/**
 * HeroEnvironment.jsx — Primary Environmental Metrics (Suhu & Kelembapan Udara)
 *
 * Two generous KPI cards side-by-side with big numbers and clear breathing room.
 * Uses custom CSS classes from index.css for guaranteed spacing.
 */

import React from 'react';
import { Thermometer, Droplets, AlertTriangle } from 'lucide-react';

export function HeroEnvironment({ telemetry, stale }) {
  const t = telemetry?.current_telemetry;

  const temp  = t?.temperature;
  const humid = t?.humidity;

  const dhtValid = t?.dht_valid ?? 0;
  const dhtTotal = t?.dht_total ?? 4;

  // Temperature Status
  const tempStatus = temp === null || temp === undefined ? null :
    temp >= 30 ? { label: 'Panas',  bg: '#FEF3C7', color: '#B45309', border: '#F59E0B' } :
    temp <  22 ? { label: 'Sejuk',  bg: '#E0F2FE', color: '#0369A1', border: '#38BDF8' } :
    { label: 'Ideal', bg: '#DCFCE7', color: '#15803D', border: '#10B981' };

  // Humidity Status
  const humidStatus = humid === null || humid === undefined ? null :
    humid >  92 ? { label: 'Sangat Lembap', bg: '#E0F2FE', color: '#0369A1', border: '#38BDF8' } :
    humid <  85 ? { label: 'Kering',         bg: '#FEF3C7', color: '#B45309', border: '#F59E0B' } :
    { label: 'Optimal', bg: '#DCFCE7', color: '#15803D', border: '#10B981' };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stale Alert Banner */}
      {stale && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 16,
            border: '1.5px solid #F59E0B',
            backgroundColor: '#FFFBEB',
            color: '#78350F',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0 }} />
          <span>
            <strong>Data Tidak Terkini (No Recent Data)</strong> — Lebih dari 30 detik tanpa telemetri baru dari ESP32.
          </span>
        </div>
      )}

      {/* 2-Column Grid */}
      <div className="hero-grid">

        {/* Card 1 — Suhu Udara */}
        <div
          className="dashboard-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-icon" style={{ backgroundColor: '#FCE7F3' }}>
                  <Thermometer size={22} strokeWidth={2.5} style={{ color: '#1E293B' }} />
                </div>
                <div>
                  <h2 className="card-title">Suhu Udara</h2>
                  <p className="card-subtitle">Rata-rata {dhtTotal} Sensor DHT22</p>
                </div>
              </div>

              {!stale && tempStatus && (
                <span
                  className="candy-pill"
                  style={{
                    backgroundColor: tempStatus.bg,
                    color: tempStatus.color,
                    borderColor: tempStatus.border,
                  }}
                >
                  {tempStatus.label}
                </span>
              )}
            </div>

            {/* Big Value */}
            <div className="metric-value-area" style={{ flex: 1 }}>
              <span className="metric-value-primary">
                {!stale && temp !== null && temp !== undefined
                  ? Number(temp).toFixed(1)
                  : '—'}
              </span>
              {!stale && temp !== null && temp !== undefined && (
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                    fontWeight: 800,
                    color: '#94A3B8',
                    letterSpacing: '-0.02em',
                  }}
                >
                  °C
                </span>
              )}
            </div>

            {/* Footer Details */}
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
              <span>Target Ideal: <strong style={{ color: '#1E293B' }}>22–28 °C</strong></span>
              <span style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>
                Sensor: {dhtValid}/{dhtTotal} Aktif
              </span>
            </div>
          </div>
        </div>

        {/* Card 2 — Kelembapan Udara */}
        <div
          className="dashboard-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-icon" style={{ backgroundColor: '#D1FAE5' }}>
                  <Droplets size={22} strokeWidth={2.5} style={{ color: '#1E293B' }} />
                </div>
                <div>
                  <h2 className="card-title">Kelembapan Udara</h2>
                  <p className="card-subtitle">Relative Humidity (RH)</p>
                </div>
              </div>

              {!stale && humidStatus && (
                <span
                  className="candy-pill"
                  style={{
                    backgroundColor: humidStatus.bg,
                    color: humidStatus.color,
                    borderColor: humidStatus.border,
                  }}
                >
                  {humidStatus.label}
                </span>
              )}
            </div>

            {/* Big Value */}
            <div className="metric-value-area" style={{ flex: 1 }}>
              <span className="metric-value-primary">
                {!stale && humid !== null && humid !== undefined
                  ? Number(humid).toFixed(1)
                  : '—'}
              </span>
              {!stale && humid !== null && humid !== undefined && (
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

            {/* Footer Details */}
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
              <span>Target Ideal: <strong style={{ color: '#1E293B' }}>85–90 %</strong></span>
              <span style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>Pemicu Misting ≤85%</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
