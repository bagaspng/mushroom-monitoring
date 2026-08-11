/**
 * SystemStatus.jsx — Overall system health indicators
 *
 * Shows: ESP32 online/offline, DHT health, soil sensor count,
 * MQTT connection status, last update timestamp.
 */

function StatusRow({ label, value, colorVar, icon, subtext }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold" style={{ color: colorVar }}>
          {value}
        </span>
        {subtext && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtext}</p>
        )}
      </div>
    </div>
  );
}

export function SystemStatus({ telemetry, stale, wsStatus, backendOnline }) {
  const t = telemetry?.current_telemetry;
  const deviceOnline = !stale && (telemetry?.device_online ?? false);
  const mqttConnected = telemetry?.mqtt_connected ?? false;

  const dhtValid = t?.dht_valid ?? 0;
  const dhtTotal = t?.dht_total ?? 5;
  const systemState = t?.system_state;

  const dhtColor =
    systemState === 'NORMAL'   ? 'var(--accent-primary)' :
    systemState === 'DEGRADED' ? 'var(--accent-warning)' :
    systemState === 'ERROR'    ? 'var(--accent-danger)'  :
                                  'var(--text-muted)';

  const soilValid = t?.soil_valid ?? 0;
  const soilTotal = t?.soil_total ?? 3;

  const wsColor =
    wsStatus === 'connected'    ? 'var(--accent-primary)' :
    wsStatus === 'connecting'   ? 'var(--accent-warning)' :
                                  'var(--accent-danger)';

  const wsLabel =
    wsStatus === 'connected'    ? 'Connected' :
    wsStatus === 'connecting'   ? 'Connecting…' :
    wsStatus === 'disconnected' ? 'Disconnected' :
                                  'Error';

  return (
    <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
        Status Sistem
      </h3>

      <StatusRow
        label="ESP32"
        icon="🔌"
        value={stale ? 'No Data' : deviceOnline ? 'Online' : 'Offline'}
        colorVar={stale ? 'var(--accent-warning)' : deviceOnline ? 'var(--accent-primary)' : 'var(--accent-danger)'}
      />

      <StatusRow
        label="Sensor DHT"
        icon="🌡️"
        value={stale ? '—' : `${dhtValid}/${dhtTotal} Aktif`}
        colorVar={stale ? 'var(--text-muted)' : dhtColor}
        subtext={systemState && !stale ? systemState : undefined}
      />

      <StatusRow
        label="Sensor Soil"
        icon="🌱"
        value={stale ? '—' : `${soilValid}/${soilTotal} Aktif`}
        colorVar={stale ? 'var(--text-muted)' : soilValid === soilTotal ? 'var(--accent-primary)' : 'var(--accent-warning)'}
      />

      <StatusRow
        label="Backend"
        icon="⚙️"
        value={backendOnline ? 'Online' : 'Offline'}
        colorVar={backendOnline ? 'var(--accent-primary)' : 'var(--accent-danger)'}
      />

      <StatusRow
        label="MQTT (Backend)"
        icon="📡"
        value={mqttConnected ? 'Connected' : 'Disconnected'}
        colorVar={mqttConnected ? 'var(--accent-primary)' : 'var(--accent-warning)'}
      />

      <div className="flex items-center justify-between py-2.5">
        <div className="flex items-center gap-2">
          <span>🔗</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>WebSocket</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-dot ${wsStatus === 'connected' ? 'online' : wsStatus === 'connecting' ? 'connecting' : 'offline'}`} />
          <span className="text-sm font-semibold" style={{ color: wsColor }}>{wsLabel}</span>
        </div>
      </div>

      {/* Last update */}
      {telemetry?.last_seen_at && (
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Last seen: {new Date(telemetry.last_seen_at).toLocaleString('id-ID')}
        </p>
      )}
    </div>
  );
}
