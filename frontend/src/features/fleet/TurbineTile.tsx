import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { cn } from '../../utils/cn';
import styles from './TurbineTile.module.css';

export type TurbineTileProps = {
  turbine: any;
};

export function TurbineTile({ turbine }: TurbineTileProps) {
  const navigate = useNavigate();
  const t = turbine.telemetry;
  const f = turbine.features;

  return (
    <Card
      className={cn(styles.tile, styles[turbine.status.toLowerCase()])}
      onClick={() => navigate(`/turbines/${turbine.id}`)}
      padding="compact"
    >
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={cn(styles.statusRing, styles[`bg-${turbine.status.toLowerCase()}`])} />
          <span className="text-card-heading">{turbine.id}</span>
        </div>
        <Pill variant={turbine.status.toLowerCase() as any}>{turbine.status}</Pill>
      </div>

      <div className={styles.healthRow}>
        <div className={styles.healthLabel}>Health</div>
        <div className={styles.healthValue}>{Math.round(f.health_score)}</div>
      </div>

      <div className={styles.healthBar}>
        <div
          className={cn(styles.healthFill, styles[`bg-${turbine.status.toLowerCase()}`])}
          style={{ width: `${f.health_score}%` }}
        />
      </div>

      <div className={styles.metrics}>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Power</span>
          <span className={styles.metricValue}>{(t.power_kw / 1000).toFixed(2)} MW</span>
        </div>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Wind</span>
          <span className={styles.metricValue}>{t.wind_speed_mps.toFixed(1)} m/s</span>
        </div>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Vibration</span>
          <span className={cn(styles.metricValue, (t.vibration_rms_mm_s > 4.5 || (turbine.status === 'CRITICAL' && turbine.scenario === 'gearbox_degradation')) && styles.highRisk)}>
            {t.vibration_rms_mm_s.toFixed(1)} mm/s
          </span>
        </div>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Gearbox</span>
          <span className={cn(styles.metricValue, (t.gearbox_temperature_c > 80 || (turbine.status === 'CRITICAL' && turbine.scenario === 'gearbox_degradation')) && styles.highRisk)}>
            {Math.round(t.gearbox_temperature_c)}°C
          </span>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.riskRow}>
          <span className={styles.metricLabel}>Risk</span>
          <span className={cn(styles.riskValue, (f.overall_failure_risk > 50 || turbine.status === 'CRITICAL') && styles.highRisk)}>
            {Math.round(f.overall_failure_risk)}%
          </span>
        </div>
      </div>
    </Card>
  );
}
