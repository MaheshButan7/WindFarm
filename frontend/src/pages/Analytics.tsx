import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Card';
import { KPI } from '../components/KPI';
import { globalSimulator } from '../services/simulator';
import { TurbineData } from '../services/types';
import styles from './Analytics.module.css';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler,
  ScatterController
} from 'chart.js';
import { Line, Doughnut, Radar, Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Helper to get CSS variable value for charts
const getComputedVar = (varName: string) => {
  if (typeof window === 'undefined') return '#000';
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};

export function Analytics() {
  const [view, setView] = useState<'FLEET' | 'INDIVIDUAL'>('FLEET');
  const [selectedId, setSelectedId] = useState('T04');
  const [turbine, setTurbine] = useState<TurbineData | undefined>(undefined);
  const [fleet, setFleet] = useState<TurbineData[]>(globalSimulator.getFleet());
  const [summary, setSummary] = useState(globalSimulator.getSummary());
  const [themeTick, setThemeTick] = useState(0);

  // Re-render charts when dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeTick(t => t + 1);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

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

  // Chart Theme Options
  const chartOptions = useMemo(() => {
    const textColor = getComputedVar('--text-primary') || '#0F172A';
    const gridColor = getComputedVar('--border') || '#E2E8F0';
    const tooltipBg = getComputedVar('--surface-elevated') || '#FFFFFF';

    return {
      responsive: true,
      maintainAspectRatio: false,
      color: textColor,
      animation: { duration: 0 }, // Disable animation for real-time updates
      plugins: {
        legend: {
          labels: { color: textColor }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: gridColor,
          borderWidth: 1,
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor }
        }
      }
    };
  }, [themeTick]);

  // Fleet distribution metrics
  const healthDist = useMemo(() => {
    const counts = { healthy: 0, warning: 0, degraded: 0, critical: 0 };
    fleet.forEach(t => {
      if (t.status === 'NORMAL') counts.healthy++;
      else if (t.status === 'WARNING') counts.warning++;
      else if (t.status === 'DEGRADED') counts.degraded++;
      else if (t.status === 'CRITICAL') counts.critical++;
    });
    return counts;
  }, [fleet]);

  const componentRisks = useMemo(() => {
    return globalSimulator.getFleetComponentRisks();
  }, [fleet]);

  // 24h history for selected turbine
  const history24h = useMemo(() => {
    return globalSimulator.getHistory(selectedId, 24);
  }, [selectedId, turbine]);

  const fleetHistory24h = useMemo(() => {
    return globalSimulator.getFleetHistory(24);
  }, [fleet]);

  const renderFleetView = () => {
    const c_healthy = getComputedVar('--status-healthy') || '#10B981';
    const c_warning = getComputedVar('--status-warning') || '#F59E0B';
    const c_degraded = getComputedVar('--status-degraded') || '#F97316';
    const c_critical = getComputedVar('--status-critical') || '#EF4444';
    const c_brand = getComputedVar('--brand-primary') || '#EAB308';

    const doughnutData = {
      labels: ['Healthy', 'Warning', 'Degraded', 'Critical'],
      datasets: [
        {
          data: [healthDist.healthy, healthDist.warning, healthDist.degraded, healthDist.critical],
          backgroundColor: [c_healthy, c_warning, c_degraded, c_critical],
          borderWidth: 0,
        },
      ],
    };

    const radarData = {
      labels: ['Gearbox', 'Generator', 'Bearing', 'Yaw System', 'Pitch Drive', 'Electrical'],
      datasets: [
        {
          label: 'Average Risk %',
          data: [
            componentRisks.gearbox,
            componentRisks.generator,
            componentRisks.bearing,
            componentRisks.yaw,
            componentRisks.pitch,
            componentRisks.electrical
          ],
          backgroundColor: `${c_brand}40`,
          borderColor: c_brand,
          pointBackgroundColor: c_brand,
          borderWidth: 2,
        },
      ],
    };

    const fleetTrendData = {
      labels: fleetHistory24h.map(h => h.label).reverse(),
      datasets: [
        {
          label: 'Actual Power (MWh)',
          data: fleetHistory24h.map(h => h.actualMWh).reverse(),
          borderColor: c_brand,
          backgroundColor: `${c_brand}20`,
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Expected Power (MWh)',
          data: fleetHistory24h.map(h => h.expectedMWh).reverse(),
          borderColor: c_healthy,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
        }
      ]
    };

    const radarOptions = {
      ...chartOptions,
      animation: { duration: 500 },
      plugins: {
        ...chartOptions.plugins,
        legend: { display: false } // Hide legend to maximize radar size
      },
      scales: {
        r: {
          angleLines: { color: getComputedVar('--border') },
          grid: { color: getComputedVar('--border') },
          pointLabels: { color: getComputedVar('--text-primary'), font: { size: 12 } },
          ticks: { display: false, max: 100, min: 0 }
        }
      }
    };

    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      layout: { padding: 20 },
      plugins: {
        legend: {
          position: 'right' as const,
          labels: { color: getComputedVar('--text-primary'), padding: 20, font: { size: 13 } }
        }
      },
      cutout: '75%'
    };

    return (
      <>
        <div className={styles.kpiStrip}>
          <KPI label="FARM POWER" value={(summary.current_power_kw / 1000).toFixed(2)} unit="MW" secondary="Total active power" />
          <KPI label="FARM EXPECTED" value={(summary.expected_power_kw / 1000).toFixed(2)} unit="MW" secondary="Based on conditions" />
          <KPI label="AVAILABILITY" value={summary.availability_pct.toFixed(1)} unit="%" secondary="Farm wide" accent={summary.availability_pct > 95 ? 'healthy' : 'warning'} />
          <KPI label="LOSS ESTIMATE" value={((summary.expected_power_kw - summary.current_power_kw) * 24 / 1000).toFixed(2)} unit="MWh" secondary="24h projection" accent="degraded" />
        </div>

        <div className={styles.grid}>
          <Card className={styles.chartPlaceholder}>
            <h3 className="text-section-heading">Farm Health Distribution</h3>
            <p className="text-muted text-tiny mt-1 mb-2">Breakdown of operational health status across {fleet.length} assets</p>
            <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: 0 }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </Card>

          <Card className={styles.chartPlaceholder}>
            <h3 className="text-section-heading">Component Risk Distribution</h3>
            <p className="text-muted text-tiny mt-1 mb-2">Farm-wide average risk percentages by subsystem</p>
            <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: 0 }}>
              <Radar data={radarData} options={radarOptions} />
            </div>
          </Card>

          <Card className={styles.heatmapCard}>
            <div className={styles.heatmapHeader} style={{ padding: '20px 24px 0', borderBottom: 'none' }}>
              <div>
                <h3 className="text-section-heading">Farm Generation Trend (24h)</h3>
                <p className="text-muted text-tiny mt-1">Actual vs Expected Generation MWh</p>
              </div>
            </div>
            <div style={{ height: '260px', width: '100%', padding: '0 24px 24px' }}>
              <Line data={fleetTrendData} options={{ ...chartOptions, animation: { duration: 500 } }} />
            </div>
          </Card>

          {/* 30 TURBINE x 6 COMPONENT RISK & ANOMALY HEATMAP MATRIX */}
          <Card className={styles.heatmapCard}>
            <div className={styles.heatmapHeader}>
              <div>
                <h3 className="text-section-heading">Farm Risk & Anomaly Heatmap Matrix</h3>
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
  };

  const renderIndividualView = () => {
    if (!turbine) return null;

    const c_healthy = getComputedVar('--status-healthy') || '#10B981';
    const c_warning = getComputedVar('--status-warning') || '#F59E0B';
    const c_muted = getComputedVar('--text-muted') || '#64748B';
    const c_brand = getComputedVar('--brand-primary') || '#EAB308';

    // Scatter Data for Power Curve
    const scatterCurvePoints = [];
    for (let v = 0; v <= 25; v += 0.5) {
      let p = Math.pow(Math.max(0, v - 3), 3) * 10;
      p = Math.min(2100, Math.max(0, p));
      scatterCurvePoints.push({ x: v, y: p / 1000 }); // MW
    }

    const currentWind = turbine.telemetry.wind_speed_mps;
    const currentPower = turbine.telemetry.power_kw / 1000;

    const powerCurveData = {
      datasets: [
        {
          label: 'Theoretical Curve',
          data: scatterCurvePoints,
          borderColor: c_muted,
          borderDash: [5, 5],
          showLine: true,
          fill: false,
          pointRadius: 0,
          tension: 0.4
        },
        {
          label: 'Live Operating Point',
          data: [{ x: currentWind, y: currentPower }],
          backgroundColor: c_brand,
          borderColor: getComputedVar('--surface'),
          showLine: false,
          pointRadius: 8,
          pointHoverRadius: 10,
        }
      ]
    };

    const powerCurveOptions = {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        x: {
          ...chartOptions.scales?.x,
          type: 'linear' as const,
          title: { display: true, text: 'Wind Speed (m/s)', color: getComputedVar('--text-secondary') },
          min: 0,
          max: 25
        },
        y: {
          ...chartOptions.scales?.y,
          title: { display: true, text: 'Power (MW)', color: getComputedVar('--text-secondary') },
          min: 0,
          max: 2.2
        }
      }
    };

    // Mechanical Trends Line Data
    const revHistory = [...(history24h || [])].reverse();
    const trendData = {
      labels: revHistory.map(h => h.timeLabel),
      datasets: [
        {
          label: 'Vibration RMS (mm/s)',
          data: revHistory.map(h => h.vibration_rms_mm_s),
          borderColor: c_warning,
          backgroundColor: c_warning,
          yAxisID: 'y',
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 10,
        },
        {
          label: 'Gearbox Temp (°C)',
          data: revHistory.map(h => h.gearbox_temperature_c),
          borderColor: c_healthy,
          backgroundColor: c_healthy,
          yAxisID: 'y1',
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 10,
        }
      ]
    };

    const trendOptions = {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: { display: true, text: 'Vibration (mm/s)', color: c_warning },
          grid: { color: getComputedVar('--border') }
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: { display: true, text: 'Temperature (°C)', color: c_healthy },
          grid: { drawOnChartArea: false },
        },
      }
    };

    return (
      <>
        <div className={styles.kpiStrip}>
          <KPI label="ACTUAL POWER" value={(turbine.telemetry.power_kw / 1000).toFixed(2)} unit="MW" />
          <KPI label="EXPECTED POWER" value={(turbine.telemetry.expected_power_kw / 1000).toFixed(2)} unit="MW" />
          <KPI label="YAW ERROR" value={turbine.features.yaw_error_deg.toFixed(1)} unit="°" accent={turbine.features.yaw_error_deg > 5 ? 'degraded' : 'healthy'} />
          <KPI label="DAILY LOSS" value={((turbine.telemetry.expected_power_kw - turbine.telemetry.power_kw) * 24 / 1000).toFixed(2)} unit="MWh" accent="degraded" />
        </div>

        <div className={styles.grid}>
          <Card className={styles.chartPlaceholder}>
            <h3 className="text-section-heading">Power Curve Profile ({turbine.id})</h3>
            <p className="text-muted text-body mt-1 mb-2">Theoretical power curve vs live operating point</p>
            <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: 0 }}>
              <Scatter data={powerCurveData} options={powerCurveOptions} />
            </div>
          </Card>

          <Card className={styles.chartPlaceholder}>
            <h3 className="text-section-heading">Mechanical Trends 24h ({turbine.id})</h3>
            <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: 0, marginTop: '20px' }}>
              <Line data={trendData} options={trendOptions} />
            </div>
          </Card>
        </div>
      </>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.controls} style={{ flex: 1, justifyContent: 'flex-start' }}>
          <div className={styles.tabs}>
            <button className={view === 'FLEET' ? styles.activeTab : styles.tab} onClick={() => setView('FLEET')}>Farm Analytics</button>
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
