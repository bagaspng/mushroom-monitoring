/**
 * SensorChart.jsx — Dual Y-axis Temperature & Humidity Chart
 *
 * Uses custom CSS classes from index.css for reliable, generous spacing.
 */

import React from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';

const TEMP_COLOR  = '#8B5CF6';  // Vivid Violet
const HUMID_COLOR = '#10B981';  // Emerald Mint

function formatTime(timestamp) {
  if (!timestamp) return '';
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 14,
        border: '1.5px solid #1E293B',
        backgroundColor: '#FFFFFF',
        boxShadow: '2px 2px 0px #1E293B',
        fontSize: '0.8125rem',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          color: '#64748B',
          marginBottom: 10,
          fontSize: '0.75rem',
        }}
      >
        {label
          ? new Date(label).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : ''}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {payload.map((entry) => (
          <div
            key={entry.name}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: entry.color,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontWeight: 600, color: '#475569' }}>
                {entry.name === 'temperature' ? 'Suhu' : 'Kelembapan'}
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                color: '#0F172A',
                fontSize: '0.9375rem',
              }}
            >
              {entry.name === 'temperature'
                ? `${Number(entry.value).toFixed(1)} °C`
                : `${Number(entry.value).toFixed(1)} %`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SensorChart({ history, stale, historyHours = 12, onSelectRange }) {
  const chartData = (history || [])
    .filter((row) => row.timestamp)
    .map((row) => ({
      timestamp:   row.timestamp,
      temperature: row.temperature !== null ? Number(row.temperature) : null,
      humidity:    row.humidity    !== null ? Number(row.humidity)    : null,
    }));

  const hasData    = chartData.length > 0;
  const timeRanges = [1, 6, 12, 24];

  return (
    <div
      className="dashboard-card"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <div
        className="card-body"
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        {/* ---- Header ---- */}
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon" style={{ backgroundColor: '#FEF9C3' }}>
              <LineChartIcon size={22} strokeWidth={2.5} style={{ color: '#1E293B' }} />
            </div>
            <div>
              <h2 className="card-title">Grafik Suhu &amp; Kelembapan</h2>
              <p className="card-subtitle">Tren Time-Series Historis</p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F1F5F9',
              padding: '5px 6px',
              borderRadius: 12,
              border: '1.5px solid #CBD5E1',
              gap: 4,
            }}
          >
            {timeRanges.map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => onSelectRange && onSelectRange(hours)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: historyHours === hours ? '1.5px solid #94A3B8' : '1.5px solid transparent',
                  backgroundColor: historyHours === hours ? '#FFFFFF' : 'transparent',
                  color: historyHours === hours ? '#0F172A' : '#64748B',
                  boxShadow: historyHours === hours ? '1px 1px 0px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {hours} Jam
              </button>
            ))}
          </div>
        </div>

        {/* ---- Legend ---- */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 20,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600,
              color: '#475569',
              fontSize: '0.875rem',
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: TEMP_COLOR,
                border: '1px solid #1E293B',
                display: 'inline-block',
              }}
            />
            Suhu (°C)
          </span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600,
              color: '#475569',
              fontSize: '0.875rem',
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: HUMID_COLOR,
                border: '1px solid #1E293B',
                display: 'inline-block',
              }}
            />
            Kelembapan RH (%)
          </span>
        </div>

        {/* ---- Chart Canvas ---- */}
        {!hasData ? (
          <div
            style={{
              flex: 1,
              minHeight: 260,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              fontSize: '0.9375rem',
              fontWeight: 500,
            }}
          >
            <p>{stale ? 'Data sensor tidak tersedia' : 'Menunggu data telemetri historis…'}</p>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 260, paddingTop: 4 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                  minTickGap={50}
                />
                <YAxis
                  yAxisId="temp"
                  orientation="left"
                  tick={{ fill: TEMP_COLOR, fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}°`}
                  domain={['auto', 'auto']}
                  width={36}
                />
                <YAxis
                  yAxisId="humidity"
                  orientation="right"
                  tick={{ fill: HUMID_COLOR, fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                  width={36}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature"
                  name="temperature"
                  stroke={TEMP_COLOR}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, fill: TEMP_COLOR, stroke: '#1E293B', strokeWidth: 1.5 }}
                  connectNulls={false}
                />
                <Line
                  yAxisId="humidity"
                  type="monotone"
                  dataKey="humidity"
                  name="humidity"
                  stroke={HUMID_COLOR}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, fill: HUMID_COLOR, stroke: '#1E293B', strokeWidth: 1.5 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
