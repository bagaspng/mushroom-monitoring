/**
 * SystemStatus.jsx — System & Device Status Grid
 *
 * Uses custom CSS classes from index.css for reliable, generous spacing.
 */

import React from 'react';
import { Cpu, Thermometer, Sprout, Server, Radio, Wifi } from 'lucide-react';

function StatusTile({ icon: Icon, name, status, dotColor, badgeBg, badgeColor, subtext }) {
  return (
    <div className="status-tile">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div className="status-tile-icon">
          <Icon size={17} strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.9375rem',
              color: '#1E293B',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.2,
            }}
          >
            {name}
          </p>
          {subtext && (
            <p
              style={{
                fontSize: '0.75rem',
                color: '#94A3B8',
                marginTop: 3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtext}
            </p>
          )}
        </div>
      </div>

      <div
        className="status-tile-badge"
        style={{ backgroundColor: badgeBg, color: badgeColor }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: dotColor,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span>{status}</span>
      </div>
    </div>
  );
}

export function SystemStatus({ telemetry, stale, wsStatus, backendOnline }) {
  const t             = telemetry?.current_telemetry;
  const deviceOnline  = !stale && (telemetry?.device_online ?? false);
  const mqttConnected = telemetry?.mqtt_connected ?? false;

  const dhtValid    = t?.dht_valid ?? 0;
  const dhtTotal    = t?.dht_total ?? 4;
  const systemState = t?.system_state;

  const soilValid = t?.soil_valid ?? 0;
  const soilTotal = t?.soil_total ?? 2;

  // DHT Status
  const dhtStatus =
    stale ? { text: 'No Data',                        dot: '#F59E0B', bg: '#FEF3C7', color: '#B45309' } :
    systemState === 'NORMAL'   ? { text: `Healthy (${dhtValid}/${dhtTotal})`,  dot: '#10B981', bg: '#DCFCE7', color: '#15803D' } :
    systemState === 'DEGRADED' ? { text: `Degraded (${dhtValid}/${dhtTotal})`, dot: '#F59E0B', bg: '#FEF3C7', color: '#B45309' } :
    { text: 'Error (0/4)', dot: '#EF4444', bg: '#FEE2E2', color: '#B91C1C' };

  // Soil Status
  const soilStatus =
    stale           ? { text: 'No Data',                           dot: '#F59E0B', bg: '#FEF3C7', color: '#B45309' } :
    soilValid === soilTotal ? { text: `Active (${soilValid}/${soilTotal})`,  dot: '#10B981', bg: '#DCFCE7', color: '#15803D' } :
    soilValid > 0   ? { text: `Partial (${soilValid}/${soilTotal})`, dot: '#F59E0B', bg: '#FEF3C7', color: '#B45309' } :
    { text: 'Inactive', dot: '#EF4444', bg: '#FEE2E2', color: '#B91C1C' };

  // WebSocket
  const wsInfo =
    wsStatus === 'connected'  ? { text: 'Live',          dot: '#10B981', bg: '#DCFCE7', color: '#15803D' } :
    wsStatus === 'connecting' ? { text: 'Connecting…',   dot: '#F59E0B', bg: '#FEF3C7', color: '#B45309' } :
    { text: 'Disconnected', dot: '#EF4444', bg: '#FEE2E2', color: '#B91C1C' };

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
            <div className="card-icon" style={{ backgroundColor: '#EDE9FE' }}>
              <Cpu size={22} strokeWidth={2.5} style={{ color: '#1E293B' }} />
            </div>
            <div>
              <h2 className="card-title">Status Sistem &amp; Perangkat</h2>
              <p className="card-subtitle">Diagnostik IoT &amp; Jaringan</p>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#94A3B8',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Health Matrix
          </span>
        </div>

        {/* ---- Status Tiles Grid ---- */}
        <div className="status-grid" style={{ flex: 1 }}>
          <StatusTile
            icon={Cpu}
            name="ESP32 MCU"
            status={stale ? 'No Data' : deviceOnline ? 'Online' : 'Offline'}
            dotColor={stale ? '#F59E0B' : deviceOnline ? '#10B981' : '#EF4444'}
            badgeBg={stale ? '#FEF3C7' : deviceOnline ? '#DCFCE7' : '#FEE2E2'}
            badgeColor={stale ? '#B45309' : deviceOnline ? '#15803D' : '#B91C1C'}
            subtext="Controller Utama"
          />
          <StatusTile
            icon={Thermometer}
            name="Sensor DHT22"
            status={dhtStatus.text}
            dotColor={dhtStatus.dot}
            badgeBg={dhtStatus.bg}
            badgeColor={dhtStatus.color}
            subtext="Suhu & Kelembapan"
          />
          <StatusTile
            icon={Sprout}
            name="Sensor Media"
            status={soilStatus.text}
            dotColor={soilStatus.dot}
            badgeBg={soilStatus.bg}
            badgeColor={soilStatus.color}
            subtext="Kapasitif Baglog"
          />
          <StatusTile
            icon={Radio}
            name="Mosquitto MQTT"
            status={mqttConnected ? 'Connected' : 'Disconnected'}
            dotColor={mqttConnected ? '#10B981' : '#EF4444'}
            badgeBg={mqttConnected ? '#DCFCE7' : '#FEE2E2'}
            badgeColor={mqttConnected ? '#15803D' : '#B91C1C'}
            subtext="Broker 1883"
          />
          <StatusTile
            icon={Server}
            name="Backend API"
            status={backendOnline ? 'Online' : 'Offline'}
            dotColor={backendOnline ? '#10B981' : '#EF4444'}
            badgeBg={backendOnline ? '#DCFCE7' : '#FEE2E2'}
            badgeColor={backendOnline ? '#15803D' : '#B91C1C'}
            subtext="FastAPI + SQLite"
          />
          <StatusTile
            icon={Wifi}
            name="WebSocket"
            status={wsInfo.text}
            dotColor={wsInfo.dot}
            badgeBg={wsInfo.bg}
            badgeColor={wsInfo.color}
            subtext="Live Push Data"
          />
        </div>

        {/* ---- Footer ---- */}
        {telemetry?.last_seen_at && (
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
            <span>
              Sinkronisasi:{' '}
              <strong style={{ color: '#64748B' }}>
                {new Date(telemetry.last_seen_at).toLocaleTimeString('id-ID')}
              </strong>
            </span>
            <span>ID: rumah-jamur-01</span>
          </div>
        )}
      </div>
    </div>
  );
}
