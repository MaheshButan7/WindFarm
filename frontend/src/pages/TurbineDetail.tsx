import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { KPI } from '../components/KPI';
import { TelemetryPanel } from '../features/fleet/TelemetryPanel';
import styles from './TurbineDetail.module.css';
import { globalSimulator } from '../services/simulator';

export function TurbineDetail() {
  const { id } = useParams();
  const [t, setT] = useState<any>(null);
  const [scenario, setScenario] = useState('gearbox_degradation');

  useEffect(() => {
    const update = () => {
      const turbine = globalSimulator.getTurbine(id || '');
      // Clone to ensure re-render
      if (turbine) setT(JSON.parse(JSON.stringify(turbine)));
    };
    update();
    const unsubscribe = globalSimulator.subscribe(update);
    return () => { unsubscribe(); };
  }, [id]);

  if (!t) return <div className="text-muted p-8">Loading turbine analysis...</div>;

  const f = t.features;
  const cmp = ['gearbox', 'generator', 'bearing', 'yaw', 'pitch', 'electrical'];

  const injectScenario = () => {
    if (id) {
      globalSimulator.injectScenario(id, scenario);
    }
  };

  const orbClass = t.status === 'CRITICAL' || f.health_score < 40 
    ? styles.orbCritical 
    : t.status === 'DEGRADED' || f.health_score < 60 
    ? styles.orbDegraded 
    : t.status === 'WARNING' || f.health_score < 80 
    ? styles.orbWarning 
    : styles.orbNormal;

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div>
          <span className="text-tiny">TURBINE DEEP ANALYSIS</span>
          <h1 className="text-page-title">{t.id} <Pill variant={t.status.toLowerCase()}>{t.status}</Pill></h1>
          <p className="text-muted">{t.farm_id} · {t.model} · synthetic operating context</p>
        </div>
        <div className={styles.scenarioInjector}>
          <select value={scenario} onChange={e => setScenario(e.target.value)} className={styles.select}>
            {['gearbox_degradation', 'generator_overheating', 'bearing_degradation', 'yaw_misalignment', 'pitch_imbalance', 'grid_event', 'sensor_drift', 'performance_degradation'].map(x => (
              <option key={x} value={x}>{x.replace('_', ' ')}</option>
            ))}
          </select>
          <button onClick={injectScenario} className={styles.btnInject}>Inject Scenario</button>
        </div>
        <div className={`${styles.orb} ${orbClass}`}>
          <strong style={{ color: t.status === 'CRITICAL' || f.health_score < 40 ? 'var(--status-critical)' : undefined }}>
            {Math.round(f.health_score)}
          </strong>
          <span>HEALTH</span>
        </div>
      </div>

      <div className={styles.kpiStrip}>
        <KPI label="ACTIVE POWER" value={(t.telemetry.power_kw / 1000).toFixed(2)} unit="MW" secondary={`Expected ${(t.telemetry.expected_power_kw / 1000).toFixed(2)} MW`} />
        <KPI label="FAILURE RISK" value={Math.round(f.overall_failure_risk).toString()} unit="%" secondary="Synthetic component model" accent={f.overall_failure_risk > 75 ? 'critical' : 'warning'} />
        <KPI label="ANOMALY SCORE" value={Math.round(f.anomaly_score).toString()} secondary="Multivariate score / 100" />
        <KPI label="ENERGY LOSS" value={((t.telemetry.expected_power_kw - t.telemetry.power_kw) * 24 / 1000).toFixed(2)} unit="MWh" secondary="Estimated daily impact" accent="degraded" />
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.leftColumn}>
          <TelemetryPanel turbine={t} />
        </div>

        <div className={styles.rightColumn}>
          <Card className={styles.componentsCard}>
            <h3 className="text-section-heading">Component Health</h3>
            <p className="text-tiny text-muted mb-4">Explainable Condition</p>
            
            <div className={styles.componentList}>
              {cmp.map(c => {
                const risk = f[`${c}_risk`];
                const health = 100 - risk;
                const isCompCritical = risk > 50;
                return (
                  <div key={c} className={styles.componentRow}>
                    <span className={styles.componentName} style={{ color: isCompCritical ? 'var(--status-critical)' : undefined, fontWeight: isCompCritical ? 700 : 500 }}>{c}</span>
                    <div className={styles.healthBarBg}>
                      <div className={styles.healthBarFill} style={{ width: `${health}%`, backgroundColor: isCompCritical ? 'var(--status-critical)' : 'var(--status-healthy)' }} />
                    </div>
                    <span className={styles.healthScore} style={{ color: isCompCritical ? 'var(--status-critical)' : undefined }}>{Math.round(health)}</span>
                    <span className={styles.riskLabel} style={{ color: isCompCritical ? 'var(--status-critical)' : undefined, fontWeight: isCompCritical ? 600 : 400 }}>risk {Math.round(risk)}%</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className={styles.aiPanel}>
            <h3 className="text-section-heading">AI Diagnosis</h3>
            <p className="text-body text-muted mb-4">Observed → Predicted → Recommended</p>
            <div className={styles.diagnosisContent}>
              <p><strong>Observed:</strong> power is {f.power_residual_pct.toFixed(1)}% below expected; vibration is {t.telemetry.vibration_rms_mm_s.toFixed(1)} mm/s and yaw error is {f.yaw_error_deg.toFixed(1)}°.</p>
              <p><strong>Predicted:</strong> synthetic model has elevated component risk, supported by correlated performance and condition signals.</p>
              <p><strong>Recommended:</strong> inspect component condition, lubrication and alignment in the next safe maintenance window.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
