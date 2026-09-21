import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { KPI } from '../components/KPI';
import { globalSimulator } from '../services/simulator';
import { TurbineData } from '../services/types';
import styles from './Analytics.module.css';

export function Analytics() {
  const [view, setView] = useState<'FLEET' | 'INDIVIDUAL'>('FLEET');
  const [selectedId, setSelectedId] = useState('T04');
  const [turbine, setTurbine] = useState<TurbineData | undefined>(undefined);
  const [summary, setSummary] = useState(globalSimulator.getSummary());

  useEffect(() => {
    const update = () => {
      setTurbine(globalSimulator.getTurbine(selectedId));
      setSummary(globalSimulator.getSummary());
    };
    update();
    const unsubscribe = globalSimulator.subscribe(update);
    return () => { unsubscribe(); };
  }, [selectedId]);

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
          <div className={styles.barChart}>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Healthy</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '85%', background: 'var(--status-healthy)' }}/></div>
              <div className={styles.barValue}>{summary.online - summary.critical - 3}</div>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Warning</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '10%', background: 'var(--status-warning)' }}/></div>
              <div className={styles.barValue}>3</div>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Critical</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '5%', background: 'var(--status-critical)' }}/></div>
              <div className={styles.barValue}>{summary.critical}</div>
            </div>
          </div>
        </Card>

        <Card className={styles.chartPlaceholder}>
          <h3 className="text-section-heading">Component Risk Distribution</h3>
          <div className={styles.barChart}>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Gearbox</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '60%', background: 'var(--brand-primary)' }}/></div>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Generator</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '30%', background: 'var(--brand-primary)' }}/></div>
            </div>
            <div className={styles.barGroup}>
              <div className={styles.barLabel}>Yaw</div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '45%', background: 'var(--brand-primary)' }}/></div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );

  const renderIndividualView = () => {
    if (!turbine) return null;
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
            <h3 className="text-section-heading">Power Curve Profile</h3>
            <p className="text-muted text-body mt-2">Expected power output against live telemetry.</p>
            <div className={styles.mockCurveChart}>
              <div className={styles.curveLine} />
              <div className={styles.mockPoint} style={{ bottom: `${(turbine.telemetry.power_kw / 2100) * 100}%`, left: `${(turbine.telemetry.wind_speed_mps / 25) * 100}%` }} />
            </div>
          </Card>

          <Card className={styles.chartPlaceholder}>
            <h3 className="text-section-heading">Mechanical Trends (24h)</h3>
            <div className={styles.trendChart}>
              <div className={styles.trendLabel}>Vibration</div>
              <div className={styles.trendLineWarning} />
              <div className={styles.trendLabel}>Temperature</div>
              <div className={styles.trendLineNormal} />
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
