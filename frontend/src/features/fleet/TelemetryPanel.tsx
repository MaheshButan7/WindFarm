import React from 'react';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import styles from './TelemetryPanel.module.css';

export type TelemetryPanelProps = {
  turbine: any;
};

export function TelemetryPanel({ turbine }: TelemetryPanelProps) {
  const d = turbine.telemetry;
  const f = turbine.features;
  const isTurbineCritical = turbine.status === 'CRITICAL';
  const scenario = turbine.scenario;

  const getParamStatus = (label: string): 'CRITICAL' | 'WARNING' | 'NORMAL' => {
    if (label === 'Vibration RMS') {
      if (d.vibration_rms_mm_s > 4.5 || (isTurbineCritical && scenario === 'gearbox_degradation')) return 'CRITICAL';
      if (d.vibration_rms_mm_s > 2.5) return 'WARNING';
    }
    if (label === 'Gearbox Temperature') {
      if (d.gearbox_temperature_c > 80 || (isTurbineCritical && scenario === 'gearbox_degradation')) return 'CRITICAL';
      if (d.gearbox_temperature_c > 75) return 'WARNING';
    }
    if (label === 'Generator Temperature') {
      if (d.generator_temperature_c > 85 || (isTurbineCritical && scenario === 'generator_overheating')) return 'CRITICAL';
      if (d.generator_temperature_c > 78) return 'WARNING';
    }
    if (label === 'Bearing Temperature') {
      if (d.bearing_temperature_c > 75 || (isTurbineCritical && scenario === 'bearing_degradation')) return 'CRITICAL';
      if (d.bearing_temperature_c > 68) return 'WARNING';
    }
    if (label === 'Yaw Error') {
      if (Math.abs(f.yaw_error_deg) > 10 || (isTurbineCritical && scenario === 'yaw_misalignment')) return 'CRITICAL';
      if (Math.abs(f.yaw_error_deg) > 5) return 'WARNING';
    }
    if (label === 'Power Deviation') {
      if (f.power_residual_pct < -15 || (isTurbineCritical && scenario)) return 'CRITICAL';
      if (f.power_residual_pct < -8) return 'WARNING';
    }
    if (label === 'Failure Risk') {
      if (f.overall_failure_risk > 60 || isTurbineCritical) return 'CRITICAL';
      if (f.overall_failure_risk > 35) return 'WARNING';
    }
    if (label === 'Component Health') {
      if ((f.component_health_score || f.health_score) < 40 || isTurbineCritical) return 'CRITICAL';
      if ((f.component_health_score || f.health_score) < 70) return 'WARNING';
    }
    if (label === 'Pitch Imbalance' && (f.pitch_imbalance_deg || 0) > 3.0) {
      return 'CRITICAL';
    }
    return 'NORMAL';
  };

  const categories = [
    {
      name: 'Environment',
      params: [
        ['Wind Speed', d.wind_speed_mps.toFixed(1) + ' m/s'],
        ['Wind Direction', d.wind_direction_deg.toFixed(0) + '°'],
        ['Ambient Temperature', d.ambient_temperature_c.toFixed(1) + '°C'],
        ['Humidity', d.humidity_pct.toFixed(1) + '%'],
      ]
    },
    {
      name: 'Yaw / Orientation',
      params: [
        ['Yaw Angle', d.nacelle_direction_deg.toFixed(0) + '°'],
        ['Yaw Error', f.yaw_error_deg.toFixed(1) + '°'],
      ]
    },
    {
      name: 'Rotor / Generator',
      params: [
        ['Rotor RPM', d.rotor_rpm.toFixed(1) + ' RPM'],
        ['Generator RPM', d.generator_rpm.toFixed(0) + ' RPM'],
      ]
    },
    {
      name: 'Power / Electrical',
      params: [
        ['Active Power', (d.power_kw / 1000).toFixed(2) + ' MW'],
        ['Expected Power', (d.expected_power_kw / 1000).toFixed(2) + ' MW'],
        ['Power Deviation', f.power_residual_pct.toFixed(1) + '%'],
        ['Grid Voltage', (d.grid_voltage_v || 690).toFixed(1) + ' V'],
        ['Grid Frequency', (d.grid_frequency_hz || 50).toFixed(2) + ' Hz'],
        ['Grid Status', d.grid_status],
        ['Curtailment', (d.curtailment_kw || 0).toFixed(1) + ' kW'],
      ]
    },
    {
      name: 'Pitch',
      params: [
        ['Pitch A', d.pitch_a_deg.toFixed(1) + '°'],
        ['Pitch B', d.pitch_b_deg.toFixed(1) + '°'],
        ['Pitch C', d.pitch_c_deg.toFixed(1) + '°'],
        ['Pitch Imbalance', (f.pitch_imbalance_deg || 0).toFixed(1) + '°'],
      ]
    },
    {
      name: 'Mechanical',
      params: [
        ['Vibration RMS', d.vibration_rms_mm_s.toFixed(1) + ' mm/s'],
        ['Gearbox Temperature', d.gearbox_temperature_c.toFixed(1) + '°C'],
        ['Generator Temperature', d.generator_temperature_c.toFixed(1) + '°C'],
        ['Bearing Temperature', d.bearing_temperature_c.toFixed(1) + '°C'],
      ]
    },
    {
      name: 'Extras',
      params: [
        ['Oil Temperature', (d.oil_temperature_c || 58).toFixed(1) + '°C'],
        ['Availability', (turbine.status === 'OFFLINE' ? 0 : 100).toFixed(1) + '%'],
        ['Data Quality', (d.data_quality_pct || 100).toFixed(1) + '%'],
        ['Component Health', (f.component_health_score || f.health_score).toFixed(1)],
        ['Failure Risk', f.overall_failure_risk.toFixed(1) + '%'],
      ]
    }
  ];

  return (
    <Card className={styles.telemetryCard} padding="none">
      <div className={styles.header}>
        <div>
          <span className="text-tiny">LIVE PARAMETER WALL</span>
          <h3 className="text-section-heading">{turbine.id} · {turbine.farm_id}</h3>
        </div>
        <Pill variant={turbine.status.toLowerCase() as any}>{turbine.status}</Pill>
      </div>
      <div className={styles.categories}>
        {categories.map(cat => (
          <div key={cat.name} className={styles.categoryBlock}>
            <h4 className={styles.categoryTitle}>{cat.name}</h4>
            <div className={styles.grid}>
              {cat.params.map(([label, val]) => {
                const status = getParamStatus(label);
                const cellClass = status === 'CRITICAL' ? styles.cellCritical : status === 'WARNING' ? styles.cellWarning : '';
                return (
                  <div key={label} className={`${styles.cell} ${cellClass}`}>
                    <span className={styles.label}>{label}</span>
                    <span className={styles.value}>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
