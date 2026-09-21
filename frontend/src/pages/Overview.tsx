import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLive } from '../contexts/LiveContext';
import { KPI } from '../components/KPI';
import { Card } from '../components/Card';
import styles from './Overview.module.css';
import { Wind, Droplets, Thermometer, Compass } from 'lucide-react';
import { Pill } from '../components/Pill';

export function Overview() {
  const { fleet, summary, loading } = useLive();
  const navigate = useNavigate();

  if (loading || !summary) {
    return <div className={styles.loading}>Synchronizing live fleet telemetry...</div>;
  }

  const powerDeviation = ((summary.current_power_kw / summary.expected_power_kw) - 1) * 100;
  const energyLoss = (summary.expected_power_kw - summary.current_power_kw) * 24 / 1000;
  
  // Calculate average environment for the "Common Environment" panel
  const avgWind = fleet.reduce((acc, t) => acc + t.telemetry.wind_speed_mps, 0) / fleet.length;
  const avgTemp = fleet.reduce((acc, t) => acc + t.telemetry.ambient_temperature_c, 0) / fleet.length;
  
  // For the active/inactive visual
  const inactiveCount = fleet.length - summary.online;

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
            <div className={styles.envItem}>
              <Wind size={16} className="text-muted" />
              <span>Wind Speed</span>
              <strong>{avgWind.toFixed(1)} m/s</strong>
            </div>
            <div className={styles.envItem}>
              <Compass size={16} className="text-muted" />
              <span>Direction</span>
              <strong>241°</strong>
            </div>
            <div className={styles.envItem}>
              <Thermometer size={16} className="text-muted" />
              <span>Ambient Temp</span>
              <strong>{avgTemp.toFixed(1)}°C</strong>
            </div>
            <div className={styles.envItem}>
              <Droplets size={16} className="text-muted" />
              <span>Humidity</span>
              <strong>61%</strong>
            </div>
          </div>
        </Card>

        <Card padding="none" className={styles.mapCard}>
           <div className={styles.alertsHeader} style={{ padding: '16px 16px 0' }}>
             <h3 className="text-section-heading">Live GIS Map</h3>
           </div>
           <div className={styles.gisMap}>
             {fleet.map((t, i) => {
               // Pseudo-random deterministic placement based on ID
               const top = 15 + ((i * 37) % 70) + '%';
               const left = 10 + ((i * 29) % 80) + '%';
               return (
                 <div key={t.id} className={styles.mapDot} style={{ top, left }}>
                   <div className={`${styles.dotCore} ${styles['dot' + t.status]}`} />
                   <span className={styles.dotLabel}>{t.id}</span>
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
                <strong className="text-telemetry">1,284 MWh</strong>
              </div>
              <div className={styles.heroRow}>
                <span className="text-muted">Expected</span>
                <strong className="text-telemetry">1,356 MWh</strong>
              </div>
              <div className={styles.heroRow}>
                <span className="text-muted">Performance</span>
                <strong className="text-telemetry text-brand">94.7%</strong>
              </div>
              <div className={styles.heroRow}>
                <span className="text-muted">Estimated Loss</span>
                <strong className="text-telemetry text-status-critical">72 MWh</strong>
              </div>
            </div>
            
            <div className={styles.chartArea}>
              <div className={styles.chartLegend}>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{background: 'var(--brand-primary)'}} /> Actual
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{background: 'var(--text-muted)', borderStyle: 'dashed'}} /> Expected
                </div>
              </div>
              {/* Mock Chart Visualization */}
              <div className={styles.mockPowerChart}>
                <div className={styles.chartGrid}></div>
                <div className={styles.chartLineExpected}>
                  <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                    <polyline points="0,50 20,30 40,35 60,20 80,40 100,10" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="4" />
                  </svg>
                </div>
                <div className={styles.chartLineActual}>
                  <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                    <polyline points="0,52 20,38 40,40 60,32 80,50 100,20" fill="none" stroke="var(--brand-primary)" strokeWidth="3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className={styles.bottomCharts}>
          <Card padding="standard" className={styles.subChart}>
            <h3 className="text-card-heading mb-4">Energy Generation</h3>
            <div className={styles.mockBarChart}>
              <div className={styles.barGroup}><div className={styles.barExp} style={{height: '60%'}}></div><div className={styles.barAct} style={{height: '55%'}}></div></div>
              <div className={styles.barGroup}><div className={styles.barExp} style={{height: '80%'}}></div><div className={styles.barAct} style={{height: '70%'}}></div></div>
              <div className={styles.barGroup}><div className={styles.barExp} style={{height: '40%'}}></div><div className={styles.barAct} style={{height: '38%'}}></div></div>
              <div className={styles.barGroup}><div className={styles.barExp} style={{height: '90%'}}></div><div className={styles.barAct} style={{height: '85%'}}></div></div>
              <div className={styles.barGroup}><div className={styles.barExp} style={{height: '70%'}}></div><div className={styles.barAct} style={{height: '60%'}}></div></div>
            </div>
          </Card>

          <Card padding="standard" className={styles.subChart}>
            <h3 className="text-card-heading mb-4">Fleet Health & Risk</h3>
            <div className={styles.mockHealthChart}>
              <div className={styles.healthScore}>
                <strong>88.4</strong>
                <span>Avg Health</span>
              </div>
              <div className={styles.healthTrend}>
                <svg preserveAspectRatio="none" viewBox="0 0 100 50">
                  <path d="M0,40 Q25,30 50,45 T100,20" fill="none" stroke="var(--status-healthy)" strokeWidth="3" />
                  <path d="M0,10 Q25,20 50,5 T100,30" fill="none" stroke="var(--status-critical)" strokeWidth="2" strokeDasharray="4" opacity="0.5" />
                </svg>
              </div>
            </div>
          </Card>
        </div>
      </section>

    </div>
  );
}
