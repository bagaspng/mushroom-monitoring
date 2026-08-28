/**
 * services/websocket.js — Resilient WebSocket wrapper with auto-reconnect
 *
 * Production Resilient:
 *   - Auto-resolves wss:// on HTTPS and ws:// on HTTP
 *   - Defaults to same-origin reverse-proxy (/ws) in production
 *   - Exponential reconnection backoff with jitter
 */

const INITIAL_RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 10000;

function getWebSocketBaseUrl() {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL.replace(/\/+$/, '');
  }

  const isProd = import.meta.env.PROD;
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const wsProto = isHttps ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' && window.location.host ? window.location.host : 'localhost:8000';
  const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';

  if (isProd) {
    // Production: connect to same origin via Nginx reverse proxy
    return `${wsProto}//${host}`;
  }

  // Development fallback: direct to FastAPI port 8000
  return `${wsProto}//${hostname}:8000`;
}

export function createWebSocket(onMessage, onStatusChange) {
  const baseUrl = getWebSocketBaseUrl();
  const url = `${baseUrl}/ws`;

  let socket = null;
  let destroyed = false;
  let reconnectTimer = null;
  let currentDelay = INITIAL_RECONNECT_DELAY_MS;

  function connect() {
    if (destroyed) return;
    onStatusChange?.('connecting');

    try {
      socket = new WebSocket(url);
    } catch (err) {
      console.warn('[WS] Socket construction error:', err);
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      currentDelay = INITIAL_RECONNECT_DELAY_MS; // reset backoff on success
      onStatusChange?.('connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (err) {
        console.warn('[WS] Failed to parse message:', err);
      }
    };

    socket.onclose = () => {
      if (destroyed) return;
      onStatusChange?.('disconnected');
      scheduleReconnect();
    };

    socket.onerror = () => {
      onStatusChange?.('error');
      try {
        socket.close();
      } catch {
        // Ignored
      }
    };
  }

  function scheduleReconnect() {
    if (destroyed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      currentDelay = Math.min(currentDelay * 1.5, MAX_RECONNECT_DELAY_MS);
      connect();
    }, currentDelay);
  }

  connect();

  return {
    close() {
      destroyed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      try {
        socket?.close();
      } catch {
        // Ignored
      }
    },
  };
}
