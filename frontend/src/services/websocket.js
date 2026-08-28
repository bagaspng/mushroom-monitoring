/**
 * services/websocket.js — WebSocket wrapper with auto-reconnect
 *
 * Usage:
 *   const ws = createWebSocket(url, onMessage, onStatusChange);
 *   ws.close();  // clean disconnect
 */

const RECONNECT_DELAY_MS = 3000;
const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const wsProto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_BASE = import.meta.env.VITE_WS_URL || `${wsProto}//${host}:8000`;

export function createWebSocket(onMessage, onStatusChange) {
  const url = `${WS_BASE}/ws`;
  let socket = null;
  let destroyed = false;
  let reconnectTimer = null;

  function connect() {
    if (destroyed) return;
    onStatusChange?.('connecting');

    socket = new WebSocket(url);

    socket.onopen = () => {
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
      // Auto-reconnect
      reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    socket.onerror = () => {
      onStatusChange?.('error');
      socket.close();
    };
  }

  connect();

  return {
    close() {
      destroyed = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}
