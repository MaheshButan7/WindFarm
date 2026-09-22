import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Card';
import { KPI } from '../components/KPI';
import { globalSimulator } from '../services/simulator';
import { TurbineData } from '../services/types';
import styles from './Analytics.module.css';

export function Analytics() {
  const [view, setView] = useState<'FLEET' | 'INDIVIDUAL'>('FLEET');
  const [selectedId, setSelectedId] = useState('T04');
  const [turbine, setTurbine] = useState<TurbineData | undefined>(undefined);
  const [fleet, setFleet] = useState<TurbineData[]>(globalSimulator.getFleet());
  const [summary, setSummary] = useState(globalSimulator.getSummary());

  useEffect(() => {
    const update = () => {
      setFleet([...globalSimulator.getFleet()]);
      setTurbine(globalSimulator.getTurbine(selectedId));
      setSummary(globalSimulator.getSummary());
    };
    update();
    const unsubscribe = globalSimulator.subscribe(update);
    return () => { unsubscribe(); };
  }, [selectedId]);

  // Fleet distribution metrics
  const healthDist = useMemo(() => {
    const counts = { healthy: 0, warning: 0, degraded: 0, critical: 0 };
    fleet.forEach(t => {
      if (t.status === 'NORMAL') counts.healthy++;
      else if (t.status === 'WARNING') counts.warning++;
      else if (t.status === 'DEGRADED') counts.degraded++;
      else if (t.status === 'CRITICAL') counts.critical++;
    });
    const total = fleet.length || 1;
    return {
      counts,
      pcts: {
        healthy: (counts.healthy / total) * 100,
        warning: (counts.warning / total) * 100,
        degraded: (counts.degraded / total) * 100,
        critical: (counts.critical / total) * 100,
      }
    };
  }, [fleet]);

  const componentRisks = useMemo(() => {
    return globalSimulator.getFleetComponentRisks();
  }, [fleet]);

  // 24h history for selected turbine
  const history24h = useMemo(() => {
    return globalSimulator.getHistory(selectedId, 24);
  }, [selectedId, turbine]);

  const renderFleetView = () => (
    <>
      <div className={styles.kpiStrip}>
        <KPI label="FLEET POWER" value={(summary.current_power_kw / 1000).toFixed(2)} unit="MW" secondary="Total active power" />
        <KPI label="FLEET EXPECTED" value={(summary.expected_power_kw / 1000).toFixed(2)} unit="MW" secondary="Based on conditions" />
        <KPI label="AVAILABILITY" value={summary.availability_pct.toFixed(1)} unit="%" secondary="Fleet wide" accent={summary.availability_pct > 95 ? 'healthy' : 'warning'} />
        <KPI label="LOSS ESTIMATE" value={((summary.expected_power_kw - summary.current_power_kw) * 24 / 1000).toFixed(2)} unit="MWh" secondary="24h projection" accent="degraded" />
      </div>

      <div className={styles.grid}>
        <Card className={styles.chartPlaceholder}>
          <h3 className="text-section-heading">Fleet Health Distribution</h3>
          <p className="text-muted text-tiny mt-1 mb-4">Breakdown of operational health status across {fleet.length} assets</p>
          <div className={styles.barChart}>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Healthy ({healthDist.counts.healthy})</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${healthDist.pcts.healthy}%`, background: 'var(--status-healthy)' }}/></div>
              <div className={styles.barValue}>{Math.round(healthDist.pcts.healthy)}%</div>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Warning ({healthDist.counts.warning})</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${healthDist.pcts.warning}%`, background: 'var(--status-warning)' }}/></div>
              <div className={styles.barValue}>{Math.round(healthDist.pcts.warning)}%</div>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Degraded ({healthDist.counts.degraded})</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${healthDist.pcts.degraded}%`, background: 'var(--status-degraded)' }}/></div>
              <div className={styles.barValue}>{Math.round(healthDist.pcts.degraded)}%</div>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Critical ({healthDist.counts.critical})</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${healthDist.pcts.critical}%`, background: 'var(--status-critical)' }}/></div>
              <div className={styles.barValue}>{Math.round(healthDist.pcts.critical)}%</div>
            </div>
          </div>
        </Card>

        <Card className={styles.chartPlaceholder}>
          <h3 className="text-section-heading">Component Risk Distribution</h3>
          <p className="text-muted text-tiny mt-1 mb-4">Fleet-wide average risk percentages by subsystem</p>
          <div className={styles.barChart}>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Gearbox</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${Math.min(100, Math.max(5, componentRisks.gearbox))}%`, background: componentRisks.gearbox > 30 ? 'var(--status-critical)' : 'var(--brand-primary)' }}/></div>
              <div className={styles.barValue}>{componentRisks.gearbox.toFixed(1)}%</div>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Generator</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${Math.min(100, Math.max(5, componentRisks.generator))}%`, background: componentRisks.generator > 30 ? 'var(--status-critical)' : 'var(--brand-primary)' }}/></div>
              <div className={styles.barValue}>{componentRisks.generator.toFixed(1)}%</div>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Bearing</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${Math.min(100, Math.max(5, componentRisks.bearing))}%`, background: componentRisks.bearing > 30 ? 'var(--status-critical)' : 'var(--brand-primary)' }}/></div>
              <div className={styles.barValue}>{componentRisks.bearing.toFixed(1)}%</div>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Yaw System</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${Math.min(100, Math.max(5, componentRisks.yaw))}%`, background: componentRisks.yaw > 30 ? 'var(--status-warning)' : 'var(--brand-primary)' }}/></div>
              <div className={styles.barValue}>{componentRisks.yaw.toFixed(1)}%</div>
            </div>
          </div>
        </Card>

        {/* 30 TURBINE x 6 COMPONENT RISK & ANOMALY HEATMAP MATRIX */}
        <Card className={styles.heatmapCard}>
          <div className={styles.heatmapHeader}>
            <div>
              <h3 className="text-section-heading">Fleet Risk & Anomaly Heatmap Matrix</h3>
              <p className="text-muted text-tiny mt-1">Single-screen control-center view: 30 Turbines (T01 → T30) × 6 Component Subsystems</p>
            </div>
            <div className={styles.heatmapLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendBox} style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid var(--status-healthy)' }} />
                <span>Normal (&lt;30%)</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendBox} style={{ background: 'rgba(234, 179, 8, 0.25)', border: '1px solid var(--status-warning)' }} />
                <span>Warning (30–60%)</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendBox} style={{ background: 'rgba(239, 68, 68, 0.3)', border: '1px solid var(--status-critical)' }} />
                <span>Critical (&gt;60%)</span>
              </div>
            </div>
          </div>

          <div className={styles.heatmapGridWrapper}>
            <table className={styles.heatmapTable}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingLeft: '16px' }}>Asset ID</th>
                  <th>Gearbox</th>
                  <th>Generator</th>
                  <th>Bearing</th>
                  <th>Yaw System</th>
                  <th>Pitch Drive</th>
                  <th>Electrical</th>
                </tr>
              </thead>
              <tbody>
                {fleet.map((t) => {
                  const components = [
                    { key: 'gearbox', name: 'Gearbox', risk: t.features.gearbox_risk },
                    { key: 'generator', name: 'Generator', risk: t.scenario === 'generator_overheating' ? 88 : (t.features.gearbox_risk > 50 ? 45 : 5) },
                    { key: 'bearing', name: 'Bearing', risk: t.scenario === 'bearing_degradation' ? 78 : (t.features.gearbox_risk > 50 ? 55 : 5) },
                    { key: 'yaw', name: 'Yaw System', risk: t.features.yaw_risk },
                    { key: 'pitch', name: 'Pitch Drive', risk: t.features.pitch_imbalance_deg > 2 ? 65 : 5 },
                    { key: 'electrical', name: 'Electrical', risk: t.scenario === 'grid_event' ? 72 : 5 },
                  ];

                  return (
                    <tr key={t.id}>
                      <td 
                        className={styles.turbineCell}
                        onClick={() => {
                          setSelectedId(t.id);
                          setView('INDIVIDUAL');
                        }}
                      >
                        {t.id} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>({t.farm_id})</span>
                      </td>
                      {components.map((c) => {
                        const r = Math.round(c.risk);
                        const tileClass = r > 60 ? styles.riskCritical : r > 30 ? styles.riskWarning : styles.riskNormal;
                        return (
                          <td key={c.key}>
                            <div 
                              className={`${styles.riskTile} ${tileClass}`}
                              title={`${t.id} ${c.name}: ${r}% Failure Risk`}
                              onClick={() => {
                                setSelectedId(t.id);
                                setView('INDIVIDUAL');
                              }}
                            >
                              {r}%
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );

  const renderIndividualView = () => {
    if (!turbine) return null;

    // Wind speed cut-in 3 to 25 m/s power curve points generator
    const curvePoints: string[] = [];
    for (let v = 0; v <= 25; v += 0.5) {
      let p = Math.pow(Math.max(0, v - 3), 3) * 10;
      p = Math.min(2100, Math.max(0, p));
      const x = (v / 25) * 100;
      const y = 100 - (p / 2100) * 90 - 5;
      curvePoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    // Operating point coordinates
    const opX = Math.min(100, Math.max(0, (turbine.telemetry.wind_speed_mps / 25) * 100));
    const opY = Math.min(100, Math.max(0, 100 - (turbine.telemetry.power_kw / 2100) * 90 - 5));

    // Trend SVG paths
    const hDenom = (history24h && history24h.length > 1) ? history24h.length - 1 : 1;
    const vibPoints = (history24h || []).map((h, i) => {
      const x = (i / hDenom) * 100;
      const y = 100 - Math.min(100, ((h.vibration_rms_mm_s || 0) / 8) * 100);
      return `${isFinite(x) ? x.toFixed(1) : '0'},${isFinite(y) ? y.toFixed(1) : '50'}`;
    }).join(' ');

    const tempPoints = (history24h || []).map((h, i) => {
      const x = (i / hDenom) * 100;
      const y = 100 - Math.min(100, ((((h.gearbox_temperature_c || 65) - 30) / 70) * 100));
      return `${isFinite(x) ? x.toFixed(1) : '0'},${isFinite(y) ? y.toFixed(1) : '50'}`;
    }).join(' ');

    return (
      <>
        <div className={styles.kpiStrip}>
          <KPI label="ACTUAL POWER" value={(turbine.telemetry.power_kw / 1000).toFixed(2)} unit="MW" />
          <KPI label="EXPECTED POWER" value={(turbine.telemetry.expected_power_kw / 1000).toFixed(2)} unit="MW" />
          <KPI label="YAW ERROR" value={turbine.features.yaw_error_deg.toFixed(1)} unit="°" accent={turbine.features.yaw_error_deg > 5 ? 'degraded' : 'healthy'}/>
          <KPI label="DAILY LOSS" value={((turbine.telemetry.expected_power_kw - turbine.telemetry.power_kw) * 24 / 1000).toFixed(2)} unit="MWh" accent="degraded" />
        </div>

        <div className={styles.grid}>
          <Card className={styles.chartPlaceholder}>
            <h3 className="text-section-heading">Power Curve Profile ({turbine.id})</h3>
            <p className="text-muted text-body mt-1 mb-2">Theoretical power curve vs live operating point</p>
            <div className={styles.mockCurveChart}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                <polyline points={curvePoints.join(' ')} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="3" />
              </svg>
              <div 
                className={styles.mockPoint} 
                style={{ top: `${opY}%`, left: `${opX}%` }} 
                title={`${turbine.id}: ${turbine.telemetry.wind_speed_mps.toFixed(1)} m/s, ${(turbine.telemetry.power_kw / 1000).toFixed(2)} MW`}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
              <span>0 m/s (Cut-in 3m/s)</span>
              <span>12.5 m/s (Rated)</span>
              <span>25 m/s (Cut-out)</span>
            </div>
          </Card>

          <Card className={styles.chartPlaceholder}>
            <h3 className="text-section-heading">Mechanical Trends 24h ({turbine.id})</h3>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', marginTop: '4px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--status-warning)' }}>─ Vibration RMS (mm/s)</span>
              <span style={{ color: 'var(--status-healthy)' }}>─ Gearbox Temp (°C)</span>
            </div>
            <div className={styles.trendChart}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '180px' }}>
                <polyline points={vibPoints} fill="none" stroke="var(--status-warning)" strokeWidth="2.5" />
                <polyline points={tempPoints} fill="none" stroke="var(--status-healthy)" strokeWidth="2.5" />
              </svg>
            </div>
          </Card>
        </div>
      </>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className="text-page-title">Analytics</h1>
          <p className="text-muted">Analyze fleet performance and component trends</p>
        </div>
        <div className={styles.controls}>
          <div className={styles.tabs}>
            <button className={view === 'FLEET' ? styles.activeTab : styles.tab} onClick={() => setView('FLEET')}>Fleet Analytics</button>
            <button className={view === 'INDIVIDUAL' ? styles.activeTab : styles.tab} onClick={() => setView('INDIVIDUAL')}>Individual Analytics</button>
          </div>
          {view === 'INDIVIDUAL' && (
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className={styles.select}>
              {Array.from({ length: 30 }, (_, i) => {
                const id = `T${(i + 1).toString().padStart(2, '0')}`;
                return <option key={id} value={id}>{id}</option>;
              })}
            </select>
          )}
        </div>
      </div>
      {view === 'FLEET' ? renderFleetView() : renderIndividualView()}
    </div>
  );
}

