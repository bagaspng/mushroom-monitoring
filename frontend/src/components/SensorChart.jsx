/**
 * SensorChart.jsx — Dual Y-axis temperature + humidity line chart
 *
 * Uses Recharts ComposedChart with two Line series and two YAxis.
 * One chart only — NOT two separate charts.
 * Temperature on the left Y-axis, humidity on the right Y-axis.
 */

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const TEMP_COLOR  = '#3b82f6';  // blue
const HUMID_COLOR = '#10d9a0';  // teal

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
        background: 'rgba(13, 22, 40, 0.95)',
        border: '1px solid rgba(148,163,184,0.15)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '0.8rem',
        backdropFilter: 'blur(8px)',
      }}
    >
      <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
        {label ? new Date(label).toLocaleString('id-ID') : ''}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, margin: '2px 0' }}>
          {entry.name === 'temperature'
            ? `🌡 Suhu: ${Number(entry.value).toFixed(1)} °C`
            : `💧 RH: ${Number(entry.value).toFixed(1)} %`}
        </p>
      ))}
    </div>
  );
}

export function SensorChart({ history, stale }) {
  // Prepare chart data — one point per telemetry row
  const chartData = (history || [])
    .filter((row) => row.timestamp)
    .map((row) => ({
      timestamp: row.timestamp,
      temperature: row.temperature !== null ? Number(row.temperature) : null,
      humidity: row.humidity !== null ? Number(row.humidity) : null,
    }));

  const hasData = chartData.length > 0;

  return (
    <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Grafik Suhu &amp; Kelembapan
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            12 jam terakhir · diperbarui real-time
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 12, height: 2, background: TEMP_COLOR, display: 'inline-block', borderRadius: 1 }} />
            Suhu (°C)
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 12, height: 2, background: HUMID_COLOR, display: 'inline-block', borderRadius: 1 }} />
            RH (%)
          </span>
        </div>
      </div>

      {!hasData ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 260, color: 'var(--text-muted)', fontSize: '0.9rem' }}
        >
          {stale ? '⚠ Data tidak tersedia' : 'Menunggu data historis…'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.07)"
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            {/* Left Y-axis — Temperature */}
            <YAxis
              yAxisId="temp"
              orientation="left"
              tick={{ fill: TEMP_COLOR, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}°`}
              domain={['auto', 'auto']}
              width={36}
            />
            {/* Right Y-axis — Humidity */}
            <YAxis
              yAxisId="humidity"
              orientation="right"
              tick={{ fill: HUMID_COLOR, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Temperature line */}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              name="temperature"
              stroke={TEMP_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: TEMP_COLOR }}
              connectNulls={false}
            />
            {/* Humidity line */}
            <Line
              yAxisId="humidity"
              type="monotone"
              dataKey="humidity"
              name="humidity"
              stroke={HUMID_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: HUMID_COLOR }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
