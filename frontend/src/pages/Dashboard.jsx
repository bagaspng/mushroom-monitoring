/**
 * pages/Dashboard.jsx — Master IoT Control Dashboard "Rumah Jamur"
 *
 * Layout Hierarchy:
 * 1. Header (Brand, Live Status, Last Update)
 * 2. Suhu & Kelembapan Udara (2 Spacious KPI Cards)
 * 3. Kontrol & Status Pompa (Directly underneath Suhu & Kelembaban)
 * 4. Grafik Suhu & Kelembapan (Left 8 cols) + Kelembapan Media Tanam (Right 4 cols)
 * 5. Status Sistem & Perangkat (Left 6 cols) + Threshold Ambang Batas (Right 6 cols)
 */

import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { HeroEnvironment } from '../components/HeroEnvironment';
import { SensorChart } from '../components/SensorChart';
import { PumpStatus } from '../components/PumpStatus';
import { SoilCard } from '../components/SoilCard';
import { SystemStatus } from '../components/SystemStatus';
import { ThresholdPanel } from '../components/ThresholdPanel';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';
import bimaLogo from '../assets/bima.webp';
import diktisaintekLogo from '../assets/Logo Tersier - Diktisaintek Berdampak 1.png';
import beStrongLogo from '../assets/Logo-Be-Strong-Unila-2023.png';
import kwtLogo from '../assets/KWT.webp';

// ---- Header Connection Indicator ----
function HeaderStatus({ wsStatus, backendOnline, lastSeenAt, stale }) {
  const isLive = wsStatus === 'connected' && backendOnline && !stale;
  const isConnecting = wsStatus === 'connecting';

  const [secondsAgo, setSecondsAgo] = useState(null);

  useEffect(() => {
    if (!lastSeenAt) return;
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000);
      setSecondsAgo(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lastSeenAt]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {/* Live Badge */}
      <div
        className="candy-pill"
        style={{
          backgroundColor: isLive ? '#DCFCE7' : isConnecting ? '#FEF3C7' : '#FEE2E2',
          color:           isLive ? '#15803D' : isConnecting ? '#B45309' : '#B91C1C',
          borderColor:     isLive ? '#16A34A' : isConnecting ? '#D97706' : '#DC2626',
          fontSize: '0.8125rem',
          padding: '6px 14px',
        }}
      >
        <span
          className={`pop-dot ${isLive ? 'online' : isConnecting ? 'connecting' : 'offline'}`}
          style={{ width: 9, height: 9 }}
        />
        <span>{isLive ? 'LIVE' : isConnecting ? 'Connecting…' : 'OFFLINE'}</span>
      </div>

      {/* Subtle Last Update Info */}
      <div
        style={{
          display: 'none',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.75rem',
          color: '#64748B',
          fontWeight: 500,
        }}
        className="sm-flex-override"
      >
        <Clock size={14} style={{ color: '#94A3B8' }} />
        <span>
          {secondsAgo !== null
            ? secondsAgo < 5
              ? 'Updated just now'
              : `Updated ${secondsAgo}s ago`
            : 'Connecting…'}
        </span>
      </div>
    </div>
  );
}

// ---- Loading Skeleton ----
function LoadingSkeleton() {
  return (
    <div className="dashboard-flow" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div className="hero-grid">
        {[1, 2].map((i) => (
          <div key={i} className="dashboard-card" style={{ height: 200, backgroundColor: 'rgba(255,255,255,0.7)' }} />
        ))}
      </div>
      <div className="dashboard-card" style={{ height: 176, backgroundColor: 'rgba(255,255,255,0.7)' }} />
      <div className="col-grid-12">
        <div className="col-8 dashboard-card" style={{ height: 320, backgroundColor: 'rgba(255,255,255,0.7)' }} />
        <div className="col-4 dashboard-card" style={{ height: 320, backgroundColor: 'rgba(255,255,255,0.7)' }} />
      </div>
    </div>
  );
}

// ---- Error State ----
function ErrorBanner({ message }) {
  return (
    <div
      className="dashboard-card"
      style={{
        padding: 40,
        textAlign: 'center',
        backgroundColor: '#FEF2F2',
        maxWidth: 520,
        margin: '64px auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: '#FEE2E2',
          border: '1.5px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#B91C1C',
        }}
      >
        <AlertCircle size={30} strokeWidth={2.5} />
      </div>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.125rem', color: '#1E293B' }}>
        {message || 'Koneksi ke Backend Gagal'}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
        Pastikan backend FastAPI aktif berjalan di port 8000 dan Mosquitto broker terhubung.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="candy-btn"
        style={{ backgroundColor: '#FBBF24', color: '#1E293B', fontSize: '0.875rem' }}
      >
        <RefreshCw size={16} strokeWidth={2.5} />
        <span>Muat Ulang Dashboard</span>
      </button>
    </div>
  );
}

export function Dashboard() {
  const {
    currentData,
    history,
    historyHours,
    fetchHistory,
    stale,
    backendOnline,
    wsStatus,
    loading,
    error,
  } = useTelemetry();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ---- Header ---- */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: 'rgba(255,253,245,0.96)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1.5px solid #1E293B',
          boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
        }}
      >
        <div className="dashboard-container header-layout">
          {/* Brand Left */}
          <div className="header-brand">
            <div className="header-brand-icon">
              🍄
            </div>
            <div>
              <h1 className="header-brand-title">
                Rumah Jamur
              </h1>
              <p className="header-brand-subtitle">
                Monitoring &amp; Otomasi Mikroklimat
              </p>
            </div>
          </div>

          {/* Center Partner Logos (BIMA, Diktisaintek, Be Strong Unila, KWT) */}
          <div className="header-logos-wrapper" title="Kemitraan: BIMA Kemendikbudristek, Diktisaintek Berdampak, Be Strong Unila, KWT">
            <img src={bimaLogo} alt="Logo BIMA" className="header-logo-img" />
            <img src={diktisaintekLogo} alt="Logo Diktisaintek Berdampak" className="header-logo-img" />
            <img src={beStrongLogo} alt="Logo Be Strong Unila" className="header-logo-img header-logo-bestrong" />
            <img src={kwtLogo} alt="Logo KWT" className="header-logo-img" />
          </div>

          {/* Status Right */}
          <HeaderStatus
            wsStatus={wsStatus}
            backendOnline={backendOnline}
            lastSeenAt={currentData?.last_seen_at}
            stale={stale}
          />
        </div>
      </header>

      {/* ---- Main Dashboard Layout ---- */}
      <main
        className="dashboard-container"
        style={{ paddingTop: 40, paddingBottom: 56, flex: 1 }}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : error && !currentData ? (
          <ErrorBanner message={error} />
        ) : (
          <div className="dashboard-flow">

            {/* 1. TOP ROW: Suhu & Kelembapan Udara */}
            <HeroEnvironment telemetry={currentData} stale={stale} />

            {/* 2. ROW 2: Kontrol & Status Pompa */}
            <PumpStatus telemetry={currentData} stale={stale} />

            {/* 3. ROW 3: Grafik (8 cols) + Media Tanam (4 cols) */}
            <div className="col-grid-12">
              <div className="col-8">
                <SensorChart
                  history={history}
                  stale={stale}
                  historyHours={historyHours}
                  onSelectRange={fetchHistory}
                />
              </div>
              <div className="col-4">
                <SoilCard telemetry={currentData} stale={stale} />
              </div>
            </div>

            {/* 4. ROW 4: Status Sistem (6 cols) + Threshold (6 cols) */}
            <div className="col-grid-12">
              <div className="col-6">
                <SystemStatus
                  telemetry={currentData}
                  stale={stale}
                  wsStatus={wsStatus}
                  backendOnline={backendOnline}
                />
              </div>
              <div className="col-6">
                <ThresholdPanel />
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ---- Footer ---- */}
      <footer
        style={{
          borderTop: '1px solid #E2E8F0',
          paddingTop: 24,
          paddingBottom: 24,
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: '#94A3B8',
          fontWeight: 500,
        }}
      >
        <div className="dashboard-container">
          <p>Rumah Jamur · IoT Mikroklimat Monitoring &amp; Automatic Misting Control · ESP32 + FastAPI + React</p>
        </div>
      </footer>
    </div>
  );
}
