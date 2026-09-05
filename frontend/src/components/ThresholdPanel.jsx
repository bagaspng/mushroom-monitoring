/**
 * ThresholdPanel.jsx — Operating Threshold Parameters
 *
 * Uses custom CSS classes from index.css for reliable, generous spacing.
 */

import React from 'react';
import { SlidersHorizontal, Lock } from 'lucide-react';

const THRESHOLD_ITEMS = [
  { key: 'JADWAL PAGI',    value: '07:00 WIB', purpose: 'Durasi 15 Menit',      color: '#8B5CF6' },
  { key: 'JADWAL SIANG',   value: '12:00 WIB', purpose: 'Durasi 15 Menit',      color: '#10B981' },
  { key: 'JADWAL SORE',    value: '17:00 WIB', purpose: 'Durasi 15 Menit',      color: '#F59E0B' },
  { key: 'DURASI JADWAL',  value: '15 Menit',  purpose: 'Waktu per Siklus',     color: '#F472B6' },
  { key: 'BATAS MANUAL',   value: '5 Menit',   purpose: 'Proteksi Maks Pompa',  color: '#0284C7' },
  { key: 'JEDA COOLDOWN',  value: '300 Detik', purpose: 'Istirahat 5 Menit',    color: '#EC4899' },
];

export function ThresholdPanel() {
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
            <div className="card-icon" style={{ backgroundColor: '#FCE7F3' }}>
              <SlidersHorizontal size={22} strokeWidth={2.5} style={{ color: '#1E293B' }} />
            </div>
            <div>
              <h2 className="card-title">Jadwal &amp; Parameter</h2>
              <p className="card-subtitle">Waktu Operasional &amp; Limit Pompa</p>
            </div>
          </div>

          <span
            className="candy-pill"
            style={{
              backgroundColor: '#F1F5F9',
              color: '#475569',
              borderColor: '#CBD5E1',
              boxShadow: 'none',
              fontSize: '0.75rem',
            }}
          >
            <Lock size={12} strokeWidth={2.5} />
            <span>AppConfig.h</span>
          </span>
        </div>

        {/* ---- Threshold Tiles Grid ---- */}
        <div className="threshold-grid" style={{ flex: 1 }}>
          {THRESHOLD_ITEMS.map((item) => (
            <div key={item.key} className="threshold-tile">
              {/* Key label + color dot */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    lineHeight: 1,
                  }}
                >
                  {item.key}
                </span>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    border: '1px solid #1E293B',
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Value */}
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.125rem, 2vw, 1.375rem)',
                  fontWeight: 900,
                  color: '#0F172A',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {item.value}
              </span>

              {/* Purpose label */}
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#94A3B8',
                  fontWeight: 500,
                  lineHeight: 1.3,
                }}
              >
                {item.purpose}
              </span>
            </div>
          ))}
        </div>

        {/* ---- Footer ---- */}
        <div
          className="card-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem',
            color: '#94A3B8',
            fontWeight: 500,
          }}
        >
          <span>Evaluasi mandiri pada firmware ESP32</span>
          <span>Read-Only</span>
        </div>
      </div>
    </div>
  );
}
