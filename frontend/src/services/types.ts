export type TurbineStatus = 'NORMAL' | 'WARNING' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';

export interface TurbineData {
  id: string;
  farm_id: string;
  model: string;
  status: TurbineStatus;
  scenario?: string;
  telemetry: {
    wind_speed_mps: number;
    wind_direction_deg: number;
    nacelle_direction_deg: number;
    rotor_rpm: number;
    generator_rpm: number;
    power_kw: number;
    expected_power_kw: number;
    pitch_a_deg: number;
    pitch_b_deg: number;
    pitch_c_deg: number;
    vibration_rms_mm_s: number;
    gearbox_temperature_c: number;
    generator_temperature_c: number;
    bearing_temperature_c: number;
    ambient_temperature_c: number;
    humidity_pct: number;
    grid_voltage_v: number;
    grid_frequency_hz: number;
    grid_status: string;
    curtailment_kw: number;
    oil_temperature_c: number;
    data_quality_pct: number;
  };
  features: {
    yaw_error_deg: number;
    pitch_imbalance_deg: number;
    power_residual_pct: number;
    health_score: number;
    component_health_score: number;
    overall_failure_risk: number;
    gearbox_risk: number;
    generator_risk: number;
    bearing_risk: number;
    yaw_risk: number;
    pitch_risk: number;
    electrical_risk: number;
    anomaly_score: number;
  };
}

export interface FleetSummary {
  turbines: number;
  online: number;
  critical: number;
  current_power_kw: number;
  expected_power_kw: number;
  availability_pct: number;
  fleet_health: number;
  active_alerts: number;
}

export interface Alert {
  id: string;
  turbine_id: string;
  timestamp: string;
  component: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'OPEN' | 'ACKNOWLEDGED';
  risk_score: number;
}

export interface MaintenanceTask {
  turbine_id: string;
  risk: number;
  component: string;
  recommended_action: string;
}
