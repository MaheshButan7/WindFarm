import { TurbineData, FleetSummary, Alert, MaintenanceTask, TurbineStatus } from './types';

function noise(range: number) {
  return (Math.random() * 2 - 1) * range;
}

/**
 * Core Synthetic Data Engine.
 * Simulates a realistic operational state for a fleet of wind turbines, including
 * telemetry noise, physical constraints, component degradation paths, and alert generation.
 * This acts as a mock backend for the frontend-only demonstration.
 */
export class Simulator {
  private turbines: TurbineData[] = [];
  private alerts: Alert[] = [];
  private timeStep = 0;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initTurbines();
    // Pre-populate some alerts for demo purposes
    this.injectScenario('T04', 'gearbox_degradation');
    this.injectScenario('T17', 'yaw_misalignment');
    this.injectScenario('T09', 'gearbox_degradation');
    this.injectScenario('T22', 'generator_overheating');
    this.injectScenario('T12', 'yaw_misalignment');
    
    // Run simulation tick every second to simulate 1Hz telemetry frequency
    setInterval(() => this.tick(), 1000);
  }

  private initTurbines() {
    const farms = ['Farm A', 'Farm B', 'Farm C'];
    for (let i = 1; i <= 30; i++) {
      const id = `T${i.toString().padStart(2, '0')}`;
      this.turbines.push({
        id,
        farm_id: farms[Math.floor((i - 1) / 10)],
        model: 'SZ-2.1M-114',
        status: 'NORMAL',
        telemetry: {
          wind_speed_mps: 8.0,
          wind_direction_deg: 270,
          nacelle_direction_deg: 270,
          rotor_rpm: 12.0,
          generator_rpm: 1200,
          power_kw: 1500,
          expected_power_kw: 1500,
          pitch_a_deg: 0,
          pitch_b_deg: 0,
          pitch_c_deg: 0,
          vibration_rms_mm_s: 1.2,
          gearbox_temperature_c: 65,
          generator_temperature_c: 70,
          bearing_temperature_c: 55,
          ambient_temperature_c: 25,
          humidity_pct: 45,
          grid_voltage_v: 690,
          grid_frequency_hz: 50.0,
          grid_status: 'OK',
          curtailment_kw: 0,
          oil_temperature_c: 58,
          data_quality_pct: 100,
        },
        features: {
          yaw_error_deg: 0,
          pitch_imbalance_deg: 0,
          power_residual_pct: 0,
          health_score: 95,
          component_health_score: 95,
          overall_failure_risk: 5,
          gearbox_risk: 5,
          generator_risk: 5,
          bearing_risk: 5,
          yaw_risk: 5,
          pitch_risk: 5,
          electrical_risk: 5,
          anomaly_score: 5,
        }
      });
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  private tick() {
    this.timeStep += 0.05; // speed up time slightly for sine waves
    const globalWindVariation = Math.sin(this.timeStep) * 2;

    this.turbines.forEach(t => {
      // Base wind logic
      let windSpeed = 8.0 + globalWindVariation + noise(1.5);
      if (windSpeed < 3) windSpeed = 3;
      if (windSpeed > 25) windSpeed = 25;
      
      const expectedPower = Math.pow(Math.max(0, windSpeed - 3), 3) * 10;
      let actualPower = expectedPower;
      
      let tempGbx = 65 + noise(1);
      let vibGbx = 1.2 + noise(0.1);
      let riskGbx = 5 + noise(0.1);
      let riskYaw = 5 + noise(0.1);
      let yawError = noise(0.5);
      
      // Scenario overrides
      if (t.scenario === 'gearbox_degradation') {
        tempGbx = 85 + noise(2);
        vibGbx = 5.8 + noise(0.2);
        riskGbx = 82 + noise(0.2);
        actualPower = expectedPower * 0.85; // 15% efficiency loss
      } else if (t.scenario === 'yaw_misalignment') {
        yawError = 15 + noise(1);
        riskYaw = 65 + noise(0.2);
        actualPower = expectedPower * 0.88; 
      } else if (t.scenario === 'generator_overheating') {
        actualPower = expectedPower * 0.90;
      }

      // Cap power to 2100 kW (2.1 MW)
      actualPower = Math.min(2100, Math.max(0, actualPower));
      const expPowerCap = Math.min(2100, Math.max(0, expectedPower));

      // Calculate residual
      const residualPct = ((actualPower - expPowerCap) / (expPowerCap || 1)) * 100;
      const overallRisk = Math.max(riskGbx, riskYaw, 5);
      const health = Math.max(0, 100 - (overallRisk * 1.1));

      // Status determination
      let status: TurbineStatus = 'NORMAL';
      if (health < 40) status = 'CRITICAL';
      else if (health < 70) status = 'DEGRADED';
      else if (health < 85) status = 'WARNING';

      t.status = status;
      t.telemetry.wind_speed_mps = windSpeed;
      t.telemetry.power_kw = actualPower;
      t.telemetry.expected_power_kw = expPowerCap;
      t.telemetry.gearbox_temperature_c = tempGbx;
      t.telemetry.vibration_rms_mm_s = vibGbx;
      t.telemetry.grid_voltage_v = 690 + noise(2);
      t.telemetry.grid_frequency_hz = 50.0 + noise(0.02);
      t.telemetry.oil_temperature_c = 58 + noise(0.5);
      
      t.features.power_residual_pct = residualPct;
      t.features.yaw_error_deg = yawError;
      t.features.pitch_imbalance_deg = noise(0.1);
      t.features.gearbox_risk = riskGbx;
      t.features.yaw_risk = riskYaw;
      t.features.overall_failure_risk = overallRisk;
      t.features.health_score = health;
      t.features.component_health_score = health;
      t.features.anomaly_score = overallRisk * 0.9;
    });

    this.updateAlerts();
    this.notify();
  }

  private updateAlerts() {
    this.turbines.forEach(t => {
      if (t.scenario && !this.alerts.find(a => a.turbine_id === t.id && a.status === 'OPEN')) {
        let component = 'Gearbox';
        let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' = 'CRITICAL';
        
        if (t.scenario === 'yaw_misalignment') { 
          component = 'Yaw System'; 
          severity = 'HIGH'; 
        } else if (t.scenario === 'generator_overheating') {
          component = 'Generator';
          severity = 'CRITICAL';
        } else if (t.scenario === 'bearing_degradation') {
          component = 'Bearing';
          severity = 'MEDIUM';
        } else if (t.scenario === 'sensor_drift') {
          component = 'Sensors';
          severity = 'LOW';
        } else if (t.scenario === 'grid_event') {
          component = 'Electrical';
          severity = 'INFO';
        }

        this.alerts.unshift({
          id: `ALT-${Date.now()}-${t.id}`,
          turbine_id: t.id,
          timestamp: new Date().toISOString(),
          component,
          title: `${component} Anomaly Detected`,
          description: `Synthetic scenario: ${t.scenario.replace('_', ' ')}`,
          severity,
          status: 'OPEN',
          risk_score: t.features.overall_failure_risk
        });
      }
    });
  }

  /**
   * Retrieves the current realtime state of all turbines in the fleet.
   */
  public getFleet(): TurbineData[] {
    return this.turbines;
  }

  /**
   * Retrieves a specific turbine by ID.
   */
  public getTurbine(id: string): TurbineData | undefined {
    return this.turbines.find(t => t.id === id);
  }

  /**
   * Computes top-level KPIs for the entire farm (e.g., total power, fleet health).
   */
  public getSummary(): FleetSummary {
    let online = 0;
    let critical = 0;
    let curP = 0;
    let expP = 0;
    let sumHealth = 0;

    this.turbines.forEach(t => {
      if (t.status !== 'OFFLINE') online++;
      if (t.status === 'CRITICAL') critical++;
      curP += t.telemetry.power_kw;
      expP += t.telemetry.expected_power_kw;
      sumHealth += t.features.health_score;
    });

    return {
      turbines: this.turbines.length,
      online,
      critical,
      current_power_kw: curP,
      expected_power_kw: expP,
      availability_pct: (online / this.turbines.length) * 100,
      fleet_health: sumHealth / this.turbines.length,
      active_alerts: this.alerts.filter(a => a.status === 'OPEN').length
    };
  }

  /**
   * Manually forces a failure scenario onto a turbine to demonstrate the predictive AI features.
   */
  public injectScenario(turbine_id: string, scenario: string) {
    const t = this.getTurbine(turbine_id);
    if (t) {
      t.scenario = scenario;
      this.tick(); // force update
    }
  }

  /**
   * Returns the list of active and historical operational alerts.
   */
  public getAlerts(): Alert[] {
    return this.alerts;
  }

  /**
   * Acknowledges an alert, changing its status and removing it from the active count.
   */
  public acknowledgeAlert(id: string) {
    const a = this.alerts.find(x => x.id === id);
    if (a) {
      a.status = 'ACKNOWLEDGED';
      this.notify();
    }
  }

  public getMaintenanceQueue(): MaintenanceTask[] {
    return this.turbines
      .filter(t => t.features.overall_failure_risk > 40)
      .map(t => {
        let comp = 'General';
        let action = 'Inspect component health';
        if (t.features.gearbox_risk > 50) { comp = 'Gearbox'; action = 'Schedule borescope inspection and oil analysis'; }
        else if (t.features.yaw_risk > 50) { comp = 'Yaw System'; action = 'Recalibrate wind vane and inspect yaw drives'; }
        
        return {
          turbine_id: t.id,
          risk: t.features.overall_failure_risk,
          component: comp,
          recommended_action: action
        };
      })
      .sort((a, b) => b.risk - a.risk);
  }

  // Generate detailed history for a single turbine
  public getHistory(turbine_id: string, hours = 24): any[] {
    const history = [];
    const now = Date.now();
    const turbine = this.getTurbine(turbine_id);
    const baseTemp = turbine ? turbine.telemetry.gearbox_temperature_c : 65;
    const baseVib = turbine ? turbine.telemetry.vibration_rms_mm_s : 1.2;

    for (let i = hours; i >= 0; i--) {
      const ts = new Date(now - i * 3600000);
      const hourSin = Math.sin((24 - i) / 3);
      history.push({
        timestamp: ts.toISOString(),
        timeLabel: `${ts.getHours()}:00`,
        power_kw: Math.max(0, 1400 + hourSin * 400 + noise(150)),
        expected_power_kw: Math.max(0, 1550 + hourSin * 400 + noise(50)),
        vibration_rms_mm_s: Math.max(0.5, baseVib + hourSin * 0.4 + noise(0.2)),
        gearbox_temperature_c: Math.max(40, baseTemp + hourSin * 3 + noise(1.5)),
        wind_speed_mps: Math.max(3, 8.0 + hourSin * 2 + noise(1)),
      });
    }
    return history;
  }

  // Calculate fleet-wide average component risks
  public getFleetComponentRisks() {
    if (this.turbines.length === 0) {
      return { gearbox: 5, generator: 5, bearing: 5, yaw: 5, pitch: 5, electrical: 5 };
    }
    let totalGbx = 0, totalGen = 0, totalBrg = 0, totalYaw = 0, totalPitch = 0, totalElec = 0;
    this.turbines.forEach(t => {
      totalGbx += t.features.gearbox_risk;
      totalGen += t.features.generator_risk;
      totalBrg += t.features.bearing_risk;
      totalYaw += t.features.yaw_risk;
      totalPitch += t.features.pitch_risk;
      totalElec += t.features.electrical_risk;
    });
    const n = this.turbines.length;
    return {
      gearbox: totalGbx / n,
      generator: totalGen / n,
      bearing: totalBrg / n,
      yaw: totalYaw / n,
      pitch: totalPitch / n,
      electrical: totalElec / n,
    };
  }

  // Generate fleet performance history for trends and charts
  public getFleetHistory(hours = 24) {
    const history = [];
    const now = Date.now();
    for (let i = hours; i >= 0; i -= 2) {
      const ts = new Date(now - i * 3600000);
      const timeSin = Math.sin((24 - i) / 4);
      const actualPowerMWh = Math.max(30, 42.5 + timeSin * 8 + noise(2));
      const expectedPowerMWh = Math.max(35, 45.0 + timeSin * 8 + noise(0.5));
      history.push({
        timestamp: ts.toISOString(),
        label: `${ts.getHours().toString().padStart(2, '0')}:00`,
        actualMWh: actualPowerMWh,
        expectedMWh: expectedPowerMWh,
        health: Math.max(70, 88 + timeSin * 3 + noise(1)),
      });
    }
    return history;
  }
}

// Global singleton instance for the app
export const globalSimulator = new Simulator();

