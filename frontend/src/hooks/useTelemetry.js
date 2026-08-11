/**
 * hooks/useTelemetry.js — Telemetry state management
 *
 * - Loads initial state via REST on mount
 * - Updates in real-time via WebSocket messages
 * - Tracks stale flag: data not updated for > 30s is stale
 * - Provides history data from REST API
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useWebSocket } from './useWebSocket';

const STALE_THRESHOLD_MS = 30_000;

export function useTelemetry() {
  const [currentData, setCurrentData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isStale, setIsStale] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const lastReceivedRef = useRef(null);

  // ---- Load initial data from REST ----
  useEffect(() => {
    const load = async () => {
      try {
        const [current, hist] = await Promise.all([
          api.getCurrentTelemetry(),
          api.getHistory(12),
        ]);
        setCurrentData(current);
        setHistory(hist.data || []);
        setBackendOnline(true);
        setError(null);
      } catch (err) {
        console.error('[Telemetry] Initial load failed:', err);
        setError('Backend tidak tersedia');
        setBackendOnline(false);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ---- Handle incoming WebSocket messages ----
  const handleWsMessage = useCallback((data) => {
    setCurrentData(data);
    setBackendOnline(true);
    setError(null);
    lastReceivedRef.current = Date.now();

    // Append to history if we have a valid timestamp
    const telemetry = data?.current_telemetry;
    if (telemetry?.timestamp) {
      setHistory((prev) => {
        const next = [...prev, telemetry];
        // Keep only last 12h (≈ 4320 rows at 10s interval)
        return next.slice(-4320);
      });
    }
  }, []);

  const { wsStatus } = useWebSocket(handleWsMessage);

  // ---- Stale detection: check every 5 seconds ----
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastReceivedRef.current === null) {
        setIsStale(true);
        return;
      }
      const age = Date.now() - lastReceivedRef.current;
      setIsStale(age > STALE_THRESHOLD_MS);
    }, 5_000);

    return () => clearInterval(interval);
  }, []);

  // Also use backend-side stale flag if available
  const stale = isStale || currentData?.stale === true;

  return {
    currentData,
    history,
    stale,
    backendOnline,
    wsStatus,
    loading,
    error,
  };
}
