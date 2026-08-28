/**
 * services/api.js — REST API client for Rumah Jamur Dashboard
 *
 * Production Resilient:
 *   - In production, defaults to relative same-origin calls (reverse-proxied by Nginx via /api)
 *   - In development, falls back to http://localhost:8000
 *   - Attaches X-API-Key for authenticated control actions if configured
 */

const isProd = import.meta.env.PROD;
const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';

const customBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = customBase ? customBase.replace(/\/+$/, '') : (isProd ? '' : `http://${host}:8000`);

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errBody = await res.json();
      if (errBody?.detail) {
        errorDetail = errBody.detail;
      }
    } catch {
      // Ignored if body is not JSON
    }
    const err = new Error(errorDetail);
    err.status = res.status;
    throw err;
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
  sendControl: ({ mode, pump, apiKey }) => {
    const key = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('control_api_key') : '') || import.meta.env.VITE_CONTROL_API_KEY || '';
    const headers = key ? { 'X-API-Key': key } : {};

    return apiFetch('/api/control', {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode, pump }),
    });
  },
};
