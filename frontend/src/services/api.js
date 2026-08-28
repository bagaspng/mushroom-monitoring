/**
 * services/api.js — REST API helper
 * Uses environment variable VITE_API_URL (default: http://localhost:8000)
 */

const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const API_BASE = import.meta.env.VITE_API_URL || `http://${host}:8000`;

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  /** GET /api/status → backend + device health */
  getStatus: () => apiFetch('/api/status'),

  /** GET /api/telemetry/current → latest snapshot from memory */
  getCurrentTelemetry: () => apiFetch('/api/telemetry/current'),

  /** GET /api/history?hours=12 → historical rows from SQLite */
  getHistory: (hours = 12) => apiFetch(`/api/history?hours=${hours}`),

  /** GET /api/config → static configuration */
  getConfig: () => apiFetch('/api/config'),

  /** POST /api/control → send manual/auto mode or pump toggle */
  sendControl: ({ mode, pump }) =>
    apiFetch('/api/control', {
      method: 'POST',
      body: JSON.stringify({ mode, pump }),
    }),
};
