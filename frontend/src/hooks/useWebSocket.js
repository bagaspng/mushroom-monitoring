/**
 * hooks/useWebSocket.js — React hook for WebSocket connection management
 *
 * Returns: { wsStatus }  ('connecting' | 'connected' | 'disconnected' | 'error')
 * Calls onMessage whenever a new message arrives from the server.
 */

import { useEffect, useRef, useState } from 'react';
import { createWebSocket } from '../services/websocket';

export function useWebSocket(onMessage) {
  const [wsStatus, setWsStatus] = useState('disconnected');
  const onMessageRef = useRef(onMessage);

  // Keep ref current without re-creating socket on every render
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const ws = createWebSocket(
      (data) => onMessageRef.current?.(data),
      setWsStatus,
    );

    return () => ws.close();
  }, []); // Connect once, auto-reconnect internally

  return { wsStatus };
}
