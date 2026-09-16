/**
 * TypeScript type definitions matching backend Pydantic models
 */

export interface PitchDeg {
  A: number;
  B: number;
  C: number;
}

export interface Limits {
  vibration_rms_mm_s?: { warn?: number; alarm?: number };
  gearbox_oil_temp_c?: { warn?: number; alarm?: number };
  generator_winding_temp_c?: { warn?: number; alarm?: number };
  rotor_speed_rpm?: { warn?: number; alarm?: number };
  power_kw?: { warn?: number; alarm?: number };
}

export interface MetaData {
  capacity_kw?: number;
  generator_type?: string;
  limits?: Limits;
}

export interface SignalData {
  vibration_rms_mm_s?: number;
  rotor_speed_rpm?: number;
  power_kw?: number;
  pitch_deg?: PitchDeg;
  yaw_deg?: number;
  wind_speed_ms?: number;
  wind_direction_deg?: number;
  gearbox_oil_temp_c?: number;
  generator_winding_temp_c?: number;
  ambient_temp_c?: number;
  humidity_pct?: number;
  grid_status?: "connected" | "tripped" | "islanded";
}

export interface IngestPayload {
  turbine_id: string;
  ts: string;
  seq: number;
  signals: SignalData;
  meta?: MetaData;
}

export interface FarmKPIs {
  current_power_kw: number;
  rotor_rpm_avg: number;
  farm_health_pct: number;
  turbines_online: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface TurbineData {
  turbine_id: string;
  status: "online" | "offline" | "warning" | "critical" | "unknown";
  health_score: number;
  last_update: string | null;
  latest_values: {
    power_kw?: number;
    rotor_speed_rpm?: number;
    vibration_rms_mm_s?: number;
    wind_speed_ms?: number;
    wind_direction_deg?: number;
    ambient_temp_c?: number;
    humidity_pct?: number;
    yaw_deg?: number;
    pitch_deg_A?: number;
    pitch_deg_B?: number;
    pitch_deg_C?: number;
    gearbox_oil_temp_c?: number;
    generator_winding_temp_c?: number;
    grid_status?: "connected" | "tripped" | "islanded";
  };
  timeseries: Record<string, [string, number][]>;
  capacity_kw?: number;
  generator_type?: string;
  blade_length_m?: number;
  height_m?: number;
  limits?: Limits;
  component_risks: Record<string, number>;
  rul: Record<string, { value: number; confidence: number }>;
}

export interface SnapshotResponse {
  farm_kpis: FarmKPIs;
  turbines: TurbineData[];
  timestamp: string;
}

// WebSocket message types
export interface WSTickMessage {
  type: "tick";
  turbine_id: string;
  ts: string;
  signals: Partial<SignalData>;
}

export interface WSAggMessage {
  type: "agg";
  turbine_id: string;
  ts: string;
  aggregates: Record<string, { min: number; max: number; avg: number }>;
  health_score: number;
}

export interface WSAlertMessage {
  type: "alert";
  turbine_id: string;
  ts: string;
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
  context: Record<string, any>;
}

export interface WSMetaMessage {
  type: "meta";
  turbine_id: string;
  ts: string;
  meta: MetaData;
}

export interface WSForecastMessage {
  type: "forecast";
  turbine_id: string;
  ts: string;
  forecast_type: "short_term" | "long_term";
  predicted_power_kw: number;
}

export type WSMessage =
  | WSTickMessage
  | WSAggMessage
  | WSAlertMessage
  | WSMetaMessage
  | WSForecastMessage;

// Store types
export interface TurbineState {
  turbine_id: string;
  status: string;
  health_score: number;
  last_update: string | null;
  latest_values: Record<string, number | string>;
  capacity_kw?: number;
  generator_type?: string;
  blade_length_m?: number;
  height_m?: number;
  limits?: Limits;
  component_risks: Record<string, number>;
  rul: Record<string, { value: number; confidence: number }>;
}

export interface TimeSeriesStore {
  [turbineId: string]: {
    [signalName: string]: TimeSeriesPoint[];
  };
}

export interface AnalyticsStore {
  health_scores: Record<string, { value: number; history: TimeSeriesPoint[] }>;
  risks: Record<string, Record<string, number>>;
  rul: Record<string, Record<string, { value: number; confidence: number }>>;
}

export interface UIState {
  selectedTurbine: string | null;
  openDialogs: Record<string, boolean>;
  filters: {
    turbine?: string;
    severity?: string;
    component?: string;
    dateRange?: { start: Date; end: Date };
  };
}

// Alert types
export interface AlertTimelineEvent {
  timestamp: Date;
  event: string;
  user: string;
  userRole?: string;
  note?: string;
  icon?: string;
}

export interface AlertAffectedParameter {
  name: string;
  value: number;
  threshold: number;
  unit: string;
}

export interface AlertDiagnostics {
  correlatedParams: Array<{
    name: string;
    value: number;
    normalRange: { min: number; max: number };
    deviation: number;
  }>;
  similarIncidents: Array<{
    id: string;
    date: Date;
    turbine: string;
    resolution: string;
    timeToResolve: number; // minutes
    reoccurred: boolean;
  }>;
  sensorData?: Record<string, any>;
}

export interface Alert {
  id: string;
  turbineId: string;
  turbineName: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  type: string;
  category: "mechanical" | "thermal" | "electrical" | "performance" | "system";
  status: "active" | "acknowledged" | "investigating" | "resolved" | "dismissed";
  priority: "immediate" | "scheduled" | "review" | "low";
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  assignedTo?: string;
  assignedToName?: string;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  affectedParameters: AlertAffectedParameter[];
  isRead: boolean;
  hasAttachments: boolean;
  attachmentCount?: number;
  commentCount: number;
  timeline: AlertTimelineEvent[];
  diagnostics?: AlertDiagnostics;
  recommendations?: string[];
  rootCause?: string;
  resolutionMethod?: "fixed" | "false_positive" | "duplicate" | "other";
  actionsTaken?: string;
  preventiveMeasures?: string;
}

export interface AlertFilters {
  status: string[];
  severity: string[];
  type: string[];
  turbines: string[];
  dateRange?: { start: Date | null; end: Date | null };
  assignedTo?: string;
  priority?: string;
}

export interface AlertStats {
  activeAlerts: number;
  criticalAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  avgResponseTime: number; // minutes
  resolutionRate: number; // percentage
  activeTrend: number[]; // 24h trend data
}

