import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLive } from '../contexts/LiveContext';
import { KPI } from '../components/KPI';
import { Card } from '../components/Card';
import styles from './Overview.module.css';
import { Wind, Droplets, Thermometer, Compass, Gauge, Activity } from 'lucide-react';
import { Pill } from '../components/Pill';
import { globalSimulator } from '../services/simulator';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Leaflet imports
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Map bounds auto-fitter component
function MapBounds({ fleet, triggerToken }: { fleet: any[], triggerToken: string }) {
  const map = useMap();
  const hasFitted = useRef<string | null>(null);

  useEffect(() => {
    if (fleet.length > 0 && hasFitted.current !== triggerToken) {
      const lats = fleet.map(t => t.lat ?? 0);
      const lons = fleet.map(t => t.lon ?? 0);
      const bounds = L.latLngBounds(
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)]
      );
      map.fitBounds(bounds, { padding: [30, 30] });
      hasFitted.current = triggerToken;
    }
  }, [fleet, map, triggerToken]);
  return null;
}

const createWindmillIcon = (status: string) => {
  const color = status === 'CRITICAL' ? '#EF4444' : status === 'DEGRADED' ? '#F97316' : '#10B981';
  return L.divIcon({
    html: `<div style="color: ${color}; width: 28px; height: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); display: block;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 22L12 10L13 22Z" fill="currentColor"/><circle cx="12" cy="10" r="2" fill="currentColor"/><path d="M12 10 L12 2 L14 4 Z M12 10 L4 14 L6 16 Z M12 10 L20 14 L18 16 Z" fill="currentColor"/></svg></div>`,
    className: 'custom-windmill-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

export function Overview() {
  const { fleet, summary, loading, globalFarmFilter } = useLive();
  const navigate = useNavigate();

  const [mapFitTrigger, setMapFitTrigger] = useState('');

  // Dynamic calculations from simulator history and telemetry
  const fleetHistory = useMemo(() => globalSimulator.getFleetHistory(24) || [], [summary]);

  const totalActual24h = useMemo(() => {
    return fleetHistory.reduce((acc, item) => acc + (item.actualMWh || 0), 0);
  }, [fleetHistory]);

  const totalExpected24h = useMemo(() => {
    return fleetHistory.reduce((acc, item) => acc + (item.expectedMWh || 0), 0);
  }, [fleetHistory]);

  const filteredFleet = useMemo(() => {
    if (globalFarmFilter === 'All Farms') return fleet;
    return fleet.filter(t => t.farm_id === globalFarmFilter);
  }, [fleet, globalFarmFilter]);

  const filteredSummary = useMemo(() => {
    if (globalFarmFilter === 'All Farms' && summary) return summary;
    if (!summary) return null;
    
    const online = filteredFleet.filter(t => t.status !== 'OFFLINE').length;
    const critical = filteredFleet.filter(t => t.status === 'CRITICAL').length;
    
    const current_power_kw = filteredFleet.reduce((acc, t) => acc + t.telemetry.power_kw, 0);
    const expected_power_kw = filteredFleet.reduce((acc, t) => acc + t.telemetry.expected_power_kw, 0);
    
    const availability_pct = filteredFleet.length > 0 
      ? (online / filteredFleet.length) * 100 
      : 0;
      
    const fleet_health = filteredFleet.length > 0
      ? filteredFleet.reduce((acc, t) => acc + t.features.health_score, 0) / filteredFleet.length
      : 0;

    return {
      turbines: filteredFleet.length,
      online,
      critical,
      current_power_kw,
      expected_power_kw,
      availability_pct,
      fleet_health
    };
  }, [summary, filteredFleet, globalFarmFilter]);

  if (loading || !summary || !filteredSummary) {
    return <div className="empty-state"><div className="spinner" /><div>Synchronizing live fleet telemetry...</div></div>;
  }

  const powerDeviation = filteredSummary.expected_power_kw > 0 ? ((filteredSummary.current_power_kw / filteredSummary.expected_power_kw) - 1) * 100 : 0;
  const energyLoss = (filteredSummary.expected_power_kw - filteredSummary.current_power_kw) * 24 / 1000;

  const avgWind = filteredFleet.reduce((acc, t) => acc + t.telemetry.wind_speed_mps, 0) / (filteredFleet.length || 1);
  const avgTemp = filteredFleet.reduce((acc, t) => acc + t.telemetry.ambient_temperature_c, 0) / (filteredFleet.length || 1);
  const avgHumidity = filteredFleet.reduce((acc, t) => acc + (t.telemetry.humidity_pct || 45), 0) / (filteredFleet.length || 1);
  const avgWindDir = filteredFleet.reduce((acc, t) => acc + (t.telemetry.wind_direction_deg || 270), 0) / (filteredFleet.length || 1);

  const airDensity = 1.225 - ((avgTemp - 15) * 0.004);
  const turbulence = 8.4 + (Math.sin(Date.now() / 5000) * 0.2);

  const getCardinal = (deg: number) => {
    const val = Math.floor((deg / 22.5) + 0.5);
    const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[(val % 16)];
  };

  const perfPct = totalExpected24h > 0 ? ((totalActual24h / totalExpected24h) * 100).toFixed(1) : '100.0';
  const lossMWh = Math.max(0, totalExpected24h - totalActual24h).toFixed(1);

  const chartBrandColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#EAB308';
  const chartMutedColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748B';
  const chartTextColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#0F172A';
  const chartGridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#E2E8F0';
  const chartTooltipColor = getComputedStyle(document.documentElement).getPropertyValue('--surface-elevated').trim() || '#FFFFFF';

  // ChartJS Data Setup
  const performanceChartData = {
    labels: fleetHistory.map(h => h.label),
    datasets: [
      {
        label: 'Actual Generation (MWh)',
        data: fleetHistory.map(h => h.actualMWh),
        borderColor: chartBrandColor,
        backgroundColor: `${chartBrandColor}20`,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 10,
        borderWidth: 2,
      },
      {
        label: 'Expected Potential (MWh)',
        data: fleetHistory.map(h => h.expectedMWh),
        borderColor: chartMutedColor,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 10,
        borderWidth: 1.5,
      },
    ],
  };

  const performanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: chartTooltipColor,
        titleColor: chartTextColor,
        bodyColor: chartTextColor,
        borderColor: chartGridColor,
        borderWidth: 1,
        cornerRadius: 6,
        padding: 10,
        titleFont: { size: 13, family: 'Inter' },
        bodyFont: { size: 13, family: 'Inter' },
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: chartGridColor,
        },
        ticks: { color: chartTextColor, padding: 8 },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 8, maxRotation: 0, color: chartTextColor },
        border: { display: false }
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. KPI STRIP */}
      <section className={styles.kpiStrip}>
        <KPI label="TURBINES" value={String(filteredSummary.turbines)} secondary={`${filteredSummary.online} online · ${filteredSummary.critical} critical`} />
        <KPI label="ACTIVE POWER" value={(filteredSummary.current_power_kw / 1000).toFixed(1)} unit="MW" trend={powerDeviation > 0 ? 'up' : 'down'} trendValue={`${powerDeviation.toFixed(1)}% vs expected`} />
        <KPI label="EXPECTED POWER" value={(filteredSummary.expected_power_kw / 1000).toFixed(1)} unit="MW" secondary="Current wind conditions" />
        <KPI label="AVAILABILITY" value={filteredSummary.availability_pct.toFixed(1)} unit="%" secondary="Live operating state" accent={filteredSummary.availability_pct > 95 ? 'healthy' : 'warning'} />
        <KPI label="FARM HEALTH" value={filteredSummary.fleet_health.toFixed(1)} secondary="Weighted score / 100" />
        <KPI label="ENERGY LOSS" value={energyLoss.toFixed(1)} unit="MWh" secondary="Estimated daily loss" accent="degraded" />
      </section>

      {/* 2. FARM PERFORMANCE (ChartJS) */}
      <section className={styles.performanceSection}>
        <Card padding="large" className={styles.heroChart}>
          <div className={styles.sectionHeader}>
            <h2 className="text-section-heading">Real-Time Farm Performance</h2>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ background: 'var(--brand-primary)' }} /> Actual Generation
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ background: 'var(--text-muted)', borderStyle: 'dashed' }} /> Expected Potential
              </div>
            </div>
          </div>
          <div className={styles.heroLayout}>
            <div className={styles.heroSummary}>
              <div className={styles.heroRow}>
                <span className="text-muted">Actual Generation</span>
                <strong className="text-telemetry">{Math.round(totalActual24h).toLocaleString()} MWh</strong>
              </div>
              <div className={styles.heroRow}>
                <span className="text-muted">Expected</span>
                <strong className="text-telemetry">{Math.round(totalExpected24h).toLocaleString()} MWh</strong>
              </div>
              <div className={styles.heroRow}>
                <span className="text-muted">Performance</span>
                <strong className="text-telemetry text-brand">{perfPct}%</strong>
              </div>
              <div className={styles.heroRow}>
                <span className="text-muted">Estimated Loss</span>
                <strong className="text-telemetry text-status-critical">{lossMWh} MWh</strong>
              </div>
            </div>

            <div className={styles.chartArea}>
              <Line data={performanceChartData} options={performanceChartOptions} />
            </div>
          </div>
        </Card>
      </section>

      {/* 3. GIS MAP AND ALERTS */}
      <section className={styles.twoColumnMapAlerts}>
        <Card padding="none" className={styles.mapCard}>
          <div className={styles.mapHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="text-section-heading">Live GIS Map</h3>
            <button 
              onClick={() => setMapFitTrigger(Date.now().toString())}
              className="text-tiny text-brand"
              style={{ background: 'transparent', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Reset Map View
            </button>
          </div>
          <div className={styles.gisMapContainer}>
            <MapContainer center={[22.5, 75.5]} zoom={6} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles"
              />
              <MapBounds fleet={filteredFleet} triggerToken={`${globalFarmFilter}-${mapFitTrigger}`} />
              {filteredFleet.map(t => {
                const lat = t.lat ?? 0;
                const lon = t.lon ?? 0;
                return (
                  <Marker key={t.id} position={[lat, lon]} icon={createWindmillIcon(t.status)}>
                    <Popup>
                      <div className={styles.tooltipHeader}>
                        <span>{t.id}</span>
                        <Pill variant={t.status.toLowerCase() as any}>{t.status}</Pill>
                      </div>
                      <div className={styles.tooltipMetrics} style={{ marginTop: '8px' }}>
                        <span>Power: {(t.telemetry.power_kw / 1000).toFixed(2)} MW</span><br />
                        <span>Health: {Math.round(t.features.health_score)}%</span><br />
                        <span>Wind: {t.telemetry.wind_speed_mps.toFixed(1)} m/s</span>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <button className="text-tiny text-brand" onClick={() => navigate(`/turbines/${t.id}`)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>View Details</button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </Card>

        <Card padding="compact" className={styles.recentAlertsCard}>
          <div className={styles.alertsHeader}>
            <h3 className="text-section-heading">Recent Open Incidents</h3>
            <button className="text-tiny text-brand" onClick={() => navigate('/events')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>View All</button>
          </div>
          <div className={styles.alertsList}>
            {filteredFleet.filter(t => t.scenario).slice(0, 6).map(t => (
              <div key={t.id} className={styles.compactAlert}>
                <Pill variant="critical">CRITICAL</Pill>
                <div className={styles.compactAlertInfo}>
                  <strong>{t.id} — {t.scenario?.replace('_', ' ')}</strong>
                  <span className="text-tiny text-muted">Risk {Math.round(t.features.overall_failure_risk)}%</span>
                </div>
              </div>
            ))}
            {filteredFleet.filter(t => t.scenario).length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No critical incidents active.</div>
            )}
          </div>
        </Card>
      </section>

      {/* 4. ENVIRONMENT AND HEALTH */}
      <section className={styles.twoColumnEnvHealth}>
        <Card padding="compact" className={styles.envCard}>
          <h3 className="text-section-heading mb-4">Current Farm Environment & Forecast</h3>
          <div className={styles.envGrid}>
            <div className={styles.envTile}>
              <div className={styles.envIconWrapper}><Wind size={20} /></div>
              <div className={styles.envContent}>
                <span className={styles.envLabel}>Wind Speed</span>
                <strong className={styles.envValue}>{avgWind.toFixed(1)} m/s</strong>
                <span className={styles.envSubtext}>Optimal Generation</span>
              </div>
            </div>

            <div className={styles.envTile}>
              <div className={styles.envIconWrapper}><Compass size={20} /></div>
              <div className={styles.envContent}>
                <span className={styles.envLabel}>Wind Vector</span>
                <strong className={styles.envValue}>{avgWindDir.toFixed(0)}° {getCardinal(avgWindDir)}</strong>
                <span className={styles.envSubtext}>Steady Direction</span>
              </div>
            </div>

            <div className={styles.envTile}>
              <div className={styles.envIconWrapper}><Thermometer size={20} /></div>
              <div className={styles.envContent}>
                <span className={styles.envLabel}>Ambient Temp</span>
                <strong className={styles.envValue}>{avgTemp.toFixed(1)}°C</strong>
                <span className={styles.envSubtext}>Nominal Thermal</span>
              </div>
            </div>

            <div className={styles.envTile}>
              <div className={styles.envIconWrapper}><Droplets size={20} /></div>
              <div className={styles.envContent}>
                <span className={styles.envLabel}>Humidity</span>
                <strong className={styles.envValue}>{avgHumidity.toFixed(0)}% RH</strong>
                <span className={styles.envSubtext}>Low Condensation</span>
              </div>
            </div>

            <div className={styles.envTile}>
              <div className={styles.envIconWrapper}><Gauge size={20} /></div>
              <div className={styles.envContent}>
                <span className={styles.envLabel}>Air Density</span>
                <strong className={styles.envValue}>{airDensity.toFixed(3)} kg/m³</strong>
                <span className={styles.envSubtext}>ISA Standard</span>
              </div>
            </div>

            <div className={styles.envTile}>
              <div className={styles.envIconWrapper}><Activity size={20} /></div>
              <div className={styles.envContent}>
                <span className={styles.envLabel}>Turbulence</span>
                <strong className={styles.envValue}>{turbulence.toFixed(1)}% I<sub>ref</sub></strong>
                <span className={styles.envSubtext}>Class A Airflow</span>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="standard" className={styles.healthCard}>
          <h3 className="text-card-heading mb-4">Overall WindFarm Health</h3>
          <div className={styles.mockHealthChart}>
            <div className={styles.healthScore}>
              <strong style={{ fontSize: '48px', color: 'var(--status-healthy)', lineHeight: 1 }}>{filteredSummary.fleet_health.toFixed(1)}</strong>
              <span className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>Weighted Score / 100</span>
            </div>
            <div style={{ flex: 1, paddingLeft: '24px' }}>
              <div className={styles.healthStats}>
                <div className={styles.healthStatBox}>
                  <div className={styles.statLine}>
                    <span className="text-tiny text-muted">Normal</span>
                    <span className="text-tiny font-bold">{filteredFleet.filter(t => t.status === 'NORMAL').length}</span>
                  </div>
                  <div className={styles.barWrap}>
                    <div style={{ width: `${(filteredFleet.filter(t => t.status === 'NORMAL').length / (filteredFleet.length || 1)) * 100}%`, height: '100%', background: 'var(--status-healthy)' }} />
                  </div>
                </div>
                <div className={styles.healthStatBox}>
                  <div className={styles.statLine}>
                    <span className="text-tiny text-muted">Critical</span>
                    <span className="text-tiny font-bold">{filteredFleet.filter(t => t.status === 'CRITICAL').length}</span>
                  </div>
                  <div className={styles.barWrap}>
                    <div style={{ width: `${(filteredFleet.filter(t => t.status === 'CRITICAL').length / (filteredFleet.length || 1)) * 100}%`, height: '100%', background: 'var(--status-critical)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

    </div>
  );
}
