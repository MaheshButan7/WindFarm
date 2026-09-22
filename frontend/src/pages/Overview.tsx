import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLive } from '../contexts/LiveContext';
import { KPI } from '../components/KPI';
import { Card } from '../components/Card';
import styles from './Overview.module.css';
import { Wind, Droplets, Thermometer, Compass, Gauge, Activity } from 'lucide-react';
import { Pill } from '../components/Pill';
import { globalSimulator } from '../services/simulator';

export function Overview() {
  const { fleet, summary, loading } = useLive();
  const navigate = useNavigate();
  const [hoveredTurbine, setHoveredTurbine] = useState<any>(null);

  // Dynamic calculations from simulator history and telemetry (MUST be called before any conditional returns)
  const fleetHistory = useMemo(() => globalSimulator.getFleetHistory(24) || [], [summary]);

  const totalActual24h = useMemo(() => {
    return fleetHistory.reduce((acc, item) => acc + (item.actualMWh || 0), 0);
  }, [fleetHistory]);

  const totalExpected24h = useMemo(() => {
    return fleetHistory.reduce((acc, item) => acc + (item.expectedMWh || 0), 0);
  }, [fleetHistory]);

  if (loading || !summary) {
    return <div className={styles.loading}>Synchronizing live fleet telemetry...</div>;
  }

  const powerDeviation = ((summary.current_power_kw / summary.expected_power_kw) - 1) * 100;
  const energyLoss = (summary.expected_power_kw - summary.current_power_kw) * 24 / 1000;
  
  // Calculate average environment for the "Common Environment" panel
  const avgWind = fleet.reduce((acc, t) => acc + t.telemetry.wind_speed_mps, 0) / (fleet.length || 1);
  const avgTemp = fleet.reduce((acc, t) => acc + t.telemetry.ambient_temperature_c, 0) / (fleet.length || 1);

  const perfPct = totalExpected24h > 0 ? ((totalActual24h / totalExpected24h) * 100).toFixed(1) : '100.0';
  const lossMWh = Math.max(0, totalExpected24h - totalActual24h).toFixed(1);

  // SVG polyline points generation (0..100 viewBox)
  const maxMWh = fleetHistory.length > 0 ? Math.max(...fleetHistory.map(h => Math.max(h.actualMWh || 0, h.expectedMWh || 0)), 60) : 60;
  const minMWh = fleetHistory.length > 0 ? Math.min(...fleetHistory.map(h => Math.min(h.actualMWh || 0, h.expectedMWh || 0)), 20) : 20;
  const rangeMWh = (maxMWh - minMWh) || 1;

  const denominator = fleetHistory.length > 1 ? fleetHistory.length - 1 : 1;

  const expectedPoints = fleetHistory.map((h, idx) => {
    const x = (idx / denominator) * 100;
    const y = 100 - (((h.expectedMWh || 0) - minMWh) / rangeMWh) * 80 - 10;
    return `${isFinite(x) ? x.toFixed(1) : '0'},${isFinite(y) ? y.toFixed(1) : '50'}`;
  }).join(' ');

  const actualPoints = fleetHistory.map((h, idx) => {
    const x = (idx / denominator) * 100;
    const y = 100 - (((h.actualMWh || 0) - minMWh) / rangeMWh) * 80 - 10;
    return `${isFinite(x) ? x.toFixed(1) : '0'},${isFinite(y) ? y.toFixed(1) : '50'}`;
  }).join(' ');

  const recentBars = fleetHistory.slice(-5);

  return (
    <div className={styles.container}>
      {/* KPI STRIP */}
      <section className={styles.kpiStrip}>
        <KPI label="FLEET ASSETS" value={String(summary.turbines)} secondary={`${summary.online} online · ${summary.critical} critical`} />
        <KPI label="ACTIVE POWER" value={(summary.current_power_kw / 1000).toFixed(1)} unit="MW" trend={powerDeviation > 0 ? 'up' : 'down'} trendValue={`${powerDeviation.toFixed(1)}% vs expected`} />
        <KPI label="EXPECTED POWER" value={(summary.expected_power_kw / 1000).toFixed(1)} unit="MW" secondary="Current wind conditions" />
        <KPI label="AVAILABILITY" value={summary.availability_pct.toFixed(1)} unit="%" secondary="Live operating state" accent={summary.availability_pct > 95 ? 'healthy' : 'warning'} />
        <KPI label="FLEET HEALTH" value={summary.fleet_health.toFixed(1)} secondary="Weighted score / 100" />
        <KPI label="ENERGY LOSS" value={energyLoss.toFixed(1)} unit="MWh" secondary="Estimated daily loss" accent="degraded" />
      </section>

      {/* THREE COLUMN WIDGETS */}
      <section className={styles.threeColumn}>
        <Card padding="compact" className={styles.envCard}>
          <h3 className="text-section-heading mb-4">Current Farm Environment</h3>
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
                <strong className={styles.envValue}>241° WSW</strong>
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
                <strong className={styles.envValue}>61% RH</strong>
                <span className={styles.envSubtext}>Low Condensation</span>
              </div>
            </div>

            <div className={styles.envTile}>
              <div className={styles.envIconWrapper}><Gauge size={20} /></div>
              <div className={styles.envContent}>
                <span className={styles.envLabel}>Air Density</span>
                <strong className={styles.envValue}>1.225 kg/m³</strong>
                <span className={styles.envSubtext}>ISA Standard</span>
              </div>
            </div>

            <div className={styles.envTile}>
              <div className={styles.envIconWrapper}><Activity size={20} /></div>
              <div className={styles.envContent}>
                <span className={styles.envLabel}>Turbulence</span>
                <strong className={styles.envValue}>8.4% I<sub>ref</sub></strong>
                <span className={styles.envSubtext}>Class A Airflow</span>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="none" className={styles.mapCard}>
           <div className={styles.alertsHeader} style={{ padding: '16px 16px 0' }}>
             <div style={{ display: 'flex', flexDirection: 'column' }}>
               <h3 className="text-section-heading">Live GIS Map</h3>
               <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                 {hoveredTurbine 
                   ? `📍 ${hoveredTurbine.id}: ${hoveredTurbine.lat}° N, ${hoveredTurbine.lon}° E (${hoveredTurbine.farm_id})` 
                   : 'Hover any turbine pin to inspect GPS coordinates'}
               </span>
             </div>
           </div>
           <div className={styles.gisMap}>
             {fleet.map((t, i) => {
               // Pseudo-random deterministic placement based on ID
               const topPct = 15 + ((i * 37) % 70);
               const top = topPct + '%';
               const left = 10 + ((i * 29) % 80) + '%';
               const lat = (54.3500 + ((i * 137) % 70) * 0.0012).toFixed(4);
               const lon = (8.5800 + ((i * 199) % 80) * 0.0018).toFixed(4);
               const isNearTop = topPct < 25;

               return (
                 <div 
                   key={t.id} 
                   className={styles.mapDot} 
                   style={{ top, left }}
                   onClick={() => navigate(`/turbines/${t.id}`)}
                   onMouseEnter={() => setHoveredTurbine({ ...t, lat, lon })}
                   onMouseLeave={() => setHoveredTurbine(null)}
                 >
                   <div className={`${styles.dotCore} ${styles['dot' + t.status]}`} />
                   <span className={styles.dotLabel}>{t.id}</span>

                   <div className={`${styles.tooltip} ${isNearTop ? styles.tooltipBelow : styles.tooltipAbove}`}>
                     <div className={styles.tooltipHeader}>
                       <span>{t.id}</span>
                       <Pill variant={t.status.toLowerCase() as any}>{t.status}</Pill>
                     </div>
                     <div className={styles.tooltipCoords}>
                       <span>📍 {lat}° N, {lon}° E</span>
                     </div>
                     <div className={styles.tooltipMetrics}>
                       <span>{(t.telemetry.power_kw / 1000).toFixed(2)} MW · Health {Math.round(t.features.health_score)}%</span>
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
        </Card>

        <Card padding="compact" className={styles.recentAlertsCard}>
           <div className={styles.alertsHeader}>
             <h3 className="text-section-heading">Recent Critical Alerts</h3>
             <button className="text-tiny text-brand" onClick={() => navigate('/alerts')}>View All</button>
           </div>
           <div className={styles.alertsList}>
             {fleet.filter(t => t.scenario).slice(0, 5).map(t => (
               <div key={t.id} className={styles.compactAlert}>
                 <Pill variant="critical">CRITICAL</Pill>
                 <div className={styles.compactAlertInfo}>
                   <strong>{t.id} — {t.scenario?.replace('_', ' ')}</strong>
                   <span className="text-tiny text-muted">Risk {Math.round(t.features.overall_failure_risk)}%</span>
                 </div>
               </div>
             ))}
           </div>
        </Card>
      </section>

      {/* HISTORICAL CHARTS */}
      <section className={styles.historicalSection}>
        <div className={styles.sectionHeader}>
          <h2 className="text-section-heading">Fleet Performance</h2>
          <select className={styles.timeSelect} defaultValue="30D">
            <option value="1D">Today</option>
            <option value="7D">7 Days</option>
            <option value="30D">30 Days</option>
            <option value="90D">90 Days</option>
          </select>
        </div>

        <Card padding="standard" className={styles.heroChart}>
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
              <div className={styles.chartLegend}>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{background: 'var(--brand-primary)'}} /> Actual Generation
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{background: 'var(--text-muted)', borderStyle: 'dashed'}} /> Expected Potential
                </div>
              </div>
              {/* Dynamic Telemetry Chart */}
              <div className={styles.mockPowerChart}>
                <div className={styles.chartGrid}></div>
                <div className={styles.chartLineExpected}>
                  <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                    <polyline points={expectedPoints} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="4" />
                  </svg>
                </div>
                <div className={styles.chartLineActual}>
                  <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                    <polyline points={actualPoints} fill="none" stroke="var(--brand-primary)" strokeWidth="3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className={styles.bottomCharts}>
          <Card padding="standard" className={styles.subChart}>
            <h3 className="text-card-heading mb-4">Energy Generation (Recent Windows)</h3>
            <div className={styles.mockBarChart}>
              {recentBars.map((bar, idx) => {
                const expPct = Math.min(100, Math.max(10, (bar.expectedMWh / maxMWh) * 100));
                const actPct = Math.min(100, Math.max(10, (bar.actualMWh / maxMWh) * 100));
                return (
                  <div key={idx} className={styles.barGroup} title={`${bar.label}: Actual ${bar.actualMWh.toFixed(1)} MWh / Expected ${bar.expectedMWh.toFixed(1)} MWh`}>
                    <div className={styles.barExp} style={{ height: `${expPct}%` }}></div>
                    <div className={styles.barAct} style={{ height: `${actPct}%` }}></div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card padding="standard" className={styles.subChart}>
            <h3 className="text-card-heading mb-4">Fleet Health & Risk</h3>
            <div className={styles.mockHealthChart}>
              <div className={styles.healthScore}>
                <strong>{summary.fleet_health.toFixed(1)}</strong>
                <span>Avg Fleet Health</span>
              </div>
              <div className={styles.healthTrend}>
                <svg preserveAspectRatio="none" viewBox="0 0 100 50">
                  <path d="M0,35 Q25,25 50,30 T100,15" fill="none" stroke="var(--status-healthy)" strokeWidth="3" />
                  <path d="M0,15 Q25,20 50,12 T100,25" fill="none" stroke="var(--status-critical)" strokeWidth="2" strokeDasharray="4" opacity="0.5" />
                </svg>
              </div>
            </div>
          </Card>
        </div>
      </section>

    </div>
  );
}
