/**
 * Defines the operational state of a wind turbine.
 */
export type TurbineStatus = 'NORMAL' | 'WARNING' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';

/**
 * Represents the complete state and telemetry payload of a single wind turbine asset.
 * This is the primary data structure powering the realtime asset twin visualization.
 */
export interface TurbineData {
  /** Unique asset identifier (e.g. T-01) */
  id: string;
  /** Identifier for the wind farm cluster the turbine belongs to */
  farm_id: string;
  /** Hardware model designation */
  model: string;
  /** Current operational health status */
  status: TurbineStatus;
  /** Active synthetic data scenario, if any (for simulation purposes) */
  scenario?: string;
  /** Latitude coordinate */
  lat?: number;
  /** Longitude coordinate */
  lon?: number;

  /** 
   * Raw, high-frequency sensor readings straight from the turbine SCADA system
   */
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

  /**
   * Computed features derived from raw telemetry by the AI edge engine
   * for predictive maintenance and deep diagnosis.
   */
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

/**
 * Aggregated key performance indicators for an entire wind farm fleet.
 */
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

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type EventStatus = 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';

export interface EvidenceItem {
  parameter: string;
  currentValue: number;
  baselineValue: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  deviationPct: number;
}

export interface ContributingSignal {
  name: string;
  contribution: 'High' | 'Medium' | 'Low';
  score: number; // 0-100 for bar width
}

export interface TimelineItem {
  timestamp: string;
  message: string;
  isImportant?: boolean;
}

export interface ImpactData {
  currentLostPowerKw: number;
  estimatedDailyLossMwh: number;
  performanceDeviationPct: number;
}

export interface ActivityItem {
  timestamp: string;
  message: string;
}

export interface IntelligentIncident {
  id: string;
  turbineId: string;
  farm: string;
  component: string;
  title: string;
  severity: Severity;
  risk: number;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  assignee?: string;
  confidence?: number;
  status: EventStatus;
  eventType: string;
  source: string;
  firstDetected: string;
  lastUpdated: string;
  whyThisEvent: string[];
  evidence: EvidenceItem[];
  contributingSignals: ContributingSignal[];
  relatedAlarmIds: string[];
  relatedTelemetry: string[];
  timeline: TimelineItem[];
  impact?: ImpactData;
  assessment?: string;
  recommendedChecks?: string[];
  recommendationPriority?: 'High' | 'Medium' | 'Low';
  activity: ActivityItem[];
}

export interface OperationalAlarm {
  id: string;
  turbineId: string;
  farm: string;
  rawName: string;
  displayName: string;
  component: string;
  category: string;
  severity: Severity;
  state: 'Active' | 'Resolved';
  firstDetected: string;
  lastSeen: string;
  occurrences: number;
  source: string;
  parentIncidentId?: string;
}

export interface AlarmDefinition {
  id: string;
  rawName: string;
  displayName: string;
  category: string;
  component: string;
  severity: Severity;
  action: string;
  description: string;
  index: number;
  enabled: boolean;
}

// Alias for backwards compatibility where necessary
export type Alert = IntelligentIncident;

/**
 * An actionable work order for the maintenance Kanban board.
 */
export interface WorkOrder {
  id: string;
  turbine_id: string;
  farm_id: string;
  title: string;
  status: 'Pending' | 'Scheduled' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  component: string;
  assignee?: string;
  scheduled_date?: string;
}
