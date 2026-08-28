/**
 * hooks/useTelemetry.js — Telemetry state management
 * Supports real-time WebSocket updates and dynamic historical range (1h, 6h, 12h, 24h)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useWebSocket } from './useWebSocket';

const STALE_THRESHOLD_MS = 30_000;

export function useTelemetry() {
  const [currentData, setCurrentData] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyHours, setHistoryHours] = useState(12);
  const [isStale, setIsStale] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const lastReceivedRef = useRef(null);

  // ---- Fetch history for given hours ----
  const fetchHistory = useCallback(async (hours = 12) => {
    try {
      const res = await api.getHistory(hours);
      setHistory(res.data || []);
      setHistoryHours(hours);
    } catch (err) {
      console.warn('[Telemetry] History fetch error:', err);
    }
  }, []);

  // ---- Initial Data Load ----
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
        return next.slice(-4320); // max rows
      });
    }
  }, []);

  const { wsStatus } = useWebSocket(handleWsMessage);

  // ---- Stale detection: check every 4 seconds ----
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastReceivedRef.current === null) {
        setIsStale(true);
        return;
      }
      const age = Date.now() - lastReceivedRef.current;
      setIsStale(age > STALE_THRESHOLD_MS);
    }, 4_000);

    return () => clearInterval(interval);
  }, []);

  const stale = isStale || currentData?.stale === true;

  return {
    currentData,
    history,
    historyHours,
    fetchHistory,
    stale,
    backendOnline,
    wsStatus,
    loading,
    error,
  };
}
