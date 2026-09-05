/**
 * SensorChart.jsx — Dual Y-axis Temperature, Humidity, & Pump State Chart
 *
 * Upgrades:
 * - Accurate WIB (UTC+7) clock time parsing & formatting (no +7h timezone skew)
 * - Added 3rd parameter: Monitoring Status Pompa (Hidup/Mati) with active shaded stepped zone
 * - Interactive parameter toggle chips (Suhu, Kelembaban, Status Pompa)
 * - Detailed tooltip showing Suhu, Kelembaban, Status Pompa, and Pump Reason
 * - Summary badge showing detected pump spraying cycles in selected time range
 */

import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  LineChart as LineChartIcon,
  Thermometer,
  Droplets,
  Waves,
  Calendar,
  Check,
} from 'lucide-react';

const TEMP_COLOR  = '#8B5CF6';  // Vivid Violet
const HUMID_COLOR = '#10B981';  // Emerald Mint
const PUMP_COLOR  = '#0284C7';  // Sky Blue

const REASON_LABELS = {
  HUMIDITY_DEMAND:     { text: 'Kelembapan Rendah (Demand)',   icon: '💧' },
  TEMP_HIGH_THRESHOLD: { text: 'Suhu Tinggi (Threshold)',      icon: '🌡️' },
  RH_MAX_THRESHOLD:    { text: 'Batas Maksimal RH',            icon: '🚫' },
  NO_THRESHOLD_MET:    { text: 'Kondisi Normal (Standby)',     icon: '✨' },
  NO_VALID_DHT:        { text: 'Sensor Error (Safety Lock)',   icon: '⚠️' },
  COOLDOWN:            { text: 'Masa Jeda (Cooldown)',         icon: '⏱️' },
  SCHEDULED:           { text: 'Jadwal Rutin',                 icon: '🗓️' },
  MANUAL_ON:           { text: 'Manual Aktif (ON)',            icon: '🖐️' },
  MANUAL_OFF:          { text: 'Manual Nonaktif (OFF)',        icon: '🖐️' },
  AKTIF:               { text: 'Pompa Menyemprot (ON)',        icon: '⚡' },
  NONE:                { text: 'Standby (Mati)',               icon: '—'  },
};

/**
 * Parse timestamp correctly as local WIB clock time.
 * ESP32 internal clock is already synced to UTC+7 (WIB).
 * Stripping trailing 'Z' or '+07:00' prevents JavaScript from incorrectly
 * applying a double timezone conversion (+7h skew).
 */
function parseLocalWibTime(timestamp) {
  if (!timestamp) return null;
  const clean = String(timestamp).replace(/(Z|\+07:00)$/, '');
  const d = new Date(clean);
  return isNaN(d.getTime()) ? new Date(timestamp) : d;
}

function formatXAxisTime(timestamp) {
  const d = parseLocalWibTime(timestamp);
  if (!d) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatFullWibDateTime(timestamp) {
  const d = parseLocalWibTime(timestamp);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const mo = months[d.getMonth()] || '';
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd} ${mo} ${yyyy}, ${hh}:${mm}:${ss} WIB`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !label) return null;

  // Retrieve current point data from payload
  const pointData = payload?.[0]?.payload;
  if (!pointData) return null;

  const { temperature, humidity, pump_status, pump_reason } = pointData;
  const reasonObj = REASON_LABELS[pump_reason] || { text: pump_reason || 'Standby', icon: '💡' };

  return (
    <div
      style={{
        padding: '14px 18px',
        borderRadius: 16,
        border: '1.5px solid #1E293B',
        backgroundColor: '#FFFFFF',
        boxShadow: '3px 3px 0px #1E293B',
        fontSize: '0.8125rem',
        minWidth: 220,
        maxWidth: 290,
      }}
    >
      {/* Time Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          color: '#475569',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px dashed #E2E8F0',
          fontSize: '0.75rem',
        }}
      >
        <Calendar size={13} style={{ color: '#0284C7' }} />
        <span>{formatFullWibDateTime(label)}</span>
      </div>

      {/* Metrics List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Suhu */}
        {temperature !== null && !isNaN(temperature) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: TEMP_COLOR,
                  border: '1px solid #1E293B',
                }}
              />
              <span style={{ fontWeight: 600, color: '#475569' }}>Suhu Udara</span>
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#0F172A', fontSize: '0.9375rem' }}>
              {Number(temperature).toFixed(1)} °C
            </span>
          </div>
        )}

        {/* Kelembapan */}
        {humidity !== null && !isNaN(humidity) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: HUMID_COLOR,
                  border: '1px solid #1E293B',
                }}
              />
              <span style={{ fontWeight: 600, color: '#475569' }}>Kelembapan RH</span>
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#0F172A', fontSize: '0.9375rem' }}>
              {Number(humidity).toFixed(1)} %
            </span>
          </div>
        )}

        {/* Status Pompa */}
        <div
          style={{
            marginTop: 4,
            paddingTop: 8,
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: pump_status ? '#22C55E' : '#94A3B8',
                  border: '1px solid #1E293B',
                }}
              />
              <span style={{ fontWeight: 700, color: pump_status ? '#15803D' : '#64748B' }}>
                Status Pompa
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '0.8125rem',
                padding: '2px 8px',
                borderRadius: 6,
                backgroundColor: pump_status ? '#DCFCE7' : '#F1F5F9',
                color: pump_status ? '#15803D' : '#475569',
                border: `1px solid ${pump_status ? '#16A34A' : '#CBD5E1'}`,
              }}
            >
              {pump_status ? 'MENYEMPROT' : 'MATI'}
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 18 }}>
            <span>{reasonObj.icon}</span>
            <span style={{ fontWeight: 500 }}>{reasonObj.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SensorChart({ history, stale, historyHours = 12, onSelectRange }) {
  // Toggle states for parameters
  const [showTemp, setShowTemp]   = useState(true);
  const [showHumid, setShowHumid] = useState(true);
  const [showPump, setShowPump]   = useState(true);

  // Transform and map history data
  const chartData = useMemo(() => {
    return (history || [])
      .filter((row) => row && row.timestamp)
      .map((row) => {
        const isPumpActive = row.pump_status === 1 || row.pump === true;
        return {
          timestamp:   row.timestamp,
          temperature: row.temperature !== null && !isNaN(row.temperature) ? Number(row.temperature) : null,
          humidity:    row.humidity    !== null && !isNaN(row.humidity)    ? Number(row.humidity)    : null,
          pump_active: isPumpActive ? 1 : 0,
          pump_status: isPumpActive,
          pump_reason: row.pump_reason || (isPumpActive ? 'AKTIF' : 'NONE'),
          cooldown_remaining_s: row.cooldown_remaining_s || 0,
        };
      });
  }, [history]);

  // Calculate detected pump spraying cycles in current history range
  const pumpStats = useMemo(() => {
    let cycles = 0;
    let totalActivePoints = 0;
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].pump_active === 1) {
        totalActivePoints++;
        if (i === 0 || chartData[i - 1].pump_active === 0) {
          cycles++;
        }
      }
    }
    return { cycles, totalActivePoints };
  }, [chartData]);

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
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="card-title-group">
            <div className="card-icon" style={{ backgroundColor: '#FEF9C3' }}>
              <LineChartIcon size={22} strokeWidth={2.5} style={{ color: '#1E293B' }} />
            </div>
            <div>
              <h2 className="card-title">Grafik Suhu, Kelembapan &amp; Pompa</h2>
              <p className="card-subtitle">Pemantauan Tren Time-Series &amp; Siklus Semprot</p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F1F5F9',
              padding: '4px 5px',
              borderRadius: 12,
              border: '1.5px solid #CBD5E1',
              gap: 3,
            }}
          >
            {timeRanges.map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => onSelectRange && onSelectRange(hours)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: historyHours === hours ? '1.5px solid #1E293B' : '1.5px solid transparent',
                  backgroundColor: historyHours === hours ? '#FFFFFF' : 'transparent',
                  color: historyHours === hours ? '#0F172A' : '#64748B',
                  boxShadow: historyHours === hours ? '1px 1px 0px #1E293B' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {hours} Jam
              </button>
            ))}
          </div>
        </div>

        {/* ---- Interactive Parameter Toggles & Summary ---- */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          {/* Legend Parameter Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            {/* Toggle Suhu */}
            <button
              type="button"
              onClick={() => setShowTemp(!showTemp)}
              className="candy-pill"
              style={{
                cursor: 'pointer',
                backgroundColor: showTemp ? '#F3E8FF' : '#F8FAFC',
                color: showTemp ? '#6B21A8' : '#94A3B8',
                borderColor: showTemp ? TEMP_COLOR : '#CBD5E1',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                boxShadow: showTemp ? '1.5px 1.5px 0px #1E293B' : 'none',
                opacity: showTemp ? 1 : 0.6,
              }}
              title="Klik untuk tampil/sembunyikan garis Suhu"
            >
              <Thermometer size={14} strokeWidth={2.5} style={{ color: showTemp ? TEMP_COLOR : '#94A3B8' }} />
              <span>Suhu (°C)</span>
              {showTemp && <Check size={12} strokeWidth={3} />}
            </button>

            {/* Toggle Kelembapan */}
            <button
              type="button"
              onClick={() => setShowHumid(!showHumid)}
              className="candy-pill"
              style={{
                cursor: 'pointer',
                backgroundColor: showHumid ? '#DCFCE7' : '#F8FAFC',
                color: showHumid ? '#15803D' : '#94A3B8',
                borderColor: showHumid ? HUMID_COLOR : '#CBD5E1',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                boxShadow: showHumid ? '1.5px 1.5px 0px #1E293B' : 'none',
                opacity: showHumid ? 1 : 0.6,
              }}
              title="Klik untuk tampil/sembunyikan garis Kelembapan"
            >
              <Droplets size={14} strokeWidth={2.5} style={{ color: showHumid ? HUMID_COLOR : '#94A3B8' }} />
              <span>Kelembapan RH (%)</span>
              {showHumid && <Check size={12} strokeWidth={3} />}
            </button>

            {/* Toggle Pompa */}
            <button
              type="button"
              onClick={() => setShowPump(!showPump)}
              className="candy-pill"
              style={{
                cursor: 'pointer',
                backgroundColor: showPump ? '#E0F2FE' : '#F8FAFC',
                color: showPump ? '#0369A1' : '#94A3B8',
                borderColor: showPump ? PUMP_COLOR : '#CBD5E1',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                boxShadow: showPump ? '1.5px 1.5px 0px #1E293B' : 'none',
                opacity: showPump ? 1 : 0.6,
              }}
              title="Klik untuk tampil/sembunyikan parameter Status Pompa"
            >
              <Waves size={14} strokeWidth={2.5} style={{ color: showPump ? PUMP_COLOR : '#94A3B8' }} />
              <span>Status Pompa (Zona Biru)</span>
              {showPump && <Check size={12} strokeWidth={3} />}
            </button>
          </div>

          {/* Quick Pump Activity Indicator */}
          {hasData && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.75rem',
                color: '#64748B',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  backgroundColor: pumpStats.cycles > 0 ? '#E0F2FE' : '#F1F5F9',
                  color: pumpStats.cycles > 0 ? '#0284C7' : '#64748B',
                  border: '1px solid #BAE6FD',
                  fontWeight: 700,
                }}
              >
                {pumpStats.cycles > 0 ? `⚡ ${pumpStats.cycles}x Siklus Semprot Aktif` : '💤 Pompa Belum Pernah Menyemprot'}
              </span>
            </div>
          )}
        </div>

        {/* ---- Chart Canvas ---- */}
        {!hasData ? (
          <div
            style={{
              flex: 1,
              minHeight: 280,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              fontSize: '0.9375rem',
              fontWeight: 500,
              gap: 8,
            }}
          >
            <LineChartIcon size={36} strokeWidth={1.5} style={{ opacity: 0.5 }} />
            <p>{stale ? 'Data telemetri tidak tersedia' : 'Menunggu riwayat telemetri ESP32…'}</p>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 280, paddingTop: 4 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 12, right: 4, left: -16, bottom: 0 }}>
                {/* Gradients */}
                <defs>
                  <linearGradient id="pumpAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.38} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

                {/* X Axis — Accurate WIB Local Time */}
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxisTime}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                  minTickGap={40}
                />

                {/* Left Y Axis — Temperature */}
                <YAxis
                  yAxisId="temp"
                  orientation="left"
                  tick={{ fill: TEMP_COLOR, fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}°`}
                  domain={['auto', 'auto']}
                  width={38}
                  hide={!showTemp}
                />

                {/* Right Y Axis — Humidity */}
                <YAxis
                  yAxisId="humidity"
                  orientation="right"
                  tick={{ fill: HUMID_COLOR, fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                  width={38}
                  hide={!showHumid}
                />

                {/* Hidden Y Axis for Pump Stepped State (0 - 1) */}
                <YAxis
                  yAxisId="pump"
                  orientation="left"
                  domain={[0, 1]}
                  hide={true}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* Shaded Area for Pump ON periods */}
                {showPump && (
                  <Area
                    yAxisId="pump"
                    type="stepAfter"
                    dataKey="pump_active"
                    name="pump_status"
                    stroke="#0284C7"
                    strokeWidth={2}
                    fill="url(#pumpAreaGrad)"
                    isAnimationActive={false}
                  />
                )}

                {/* Suhu Line */}
                {showTemp && (
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="temperature"
                    name="temperature"
                    stroke={TEMP_COLOR}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: TEMP_COLOR, stroke: '#1E293B', strokeWidth: 1.5 }}
                    connectNulls={true}
                  />
                )}

                {/* Kelembapan Line */}
                {showHumid && (
                  <Line
                    yAxisId="humidity"
                    type="monotone"
                    dataKey="humidity"
                    name="humidity"
                    stroke={HUMID_COLOR}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: HUMID_COLOR, stroke: '#1E293B', strokeWidth: 1.5 }}
                    connectNulls={true}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
