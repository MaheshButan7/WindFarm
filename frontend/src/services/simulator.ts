import { TurbineData, FleetSummary, IntelligentIncident, OperationalAlarm, AlarmDefinition, MaintenanceTask, TurbineStatus } from './types';
import { syntheticAlarmCatalogue } from '../mock/alarmDefinitions';

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
  private incidents: IntelligentIncident[] = [];
  private operationalAlarms: OperationalAlarm[] = [];
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
    const farms = [
      { id: 'Farm A', baseLat: 21.3198, baseLon: 74.3094 }, // Maharashtra
      { id: 'Farm B', baseLat: 23.9343, baseLon: 76.1452 }, // Madhya Pradesh
      { id: 'Farm C', baseLat: 23.3707, baseLon: 76.6205 } // Madhya Pradesh
    ];
    for (let i = 1; i <= 90; i++) {
      const id = `T${i.toString().padStart(2, '0')}`;
      const farmIndex = Math.floor((i - 1) / 30);
      const farm = farms[farmIndex];
      const turbineIndex = (i - 1) % 30;
      
      // Arrange in a grid pattern
      const row = Math.floor(turbineIndex / 5);
      const col = turbineIndex % 5;
      
      const lat = farm.baseLat + (row * 0.015);
      const lon = farm.baseLon + (col * 0.02);

      this.turbines.push({
        id,
        farm_id: farm.id,
        model: 'SZ-2.1M-114',
        status: 'NORMAL',
        lat,
        lon,
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

    // Random live event generation (e.g., 2% chance per tick to inject a scenario)
    if (Math.random() < 0.02) {
      const randomTurbine = this.turbines[Math.floor(Math.random() * this.turbines.length)];
      if (!randomTurbine.scenario) {
        const scenarios = ['gearbox_degradation', 'yaw_misalignment', 'generator_overheating', 'pitch_imbalance', 'blade_aerodynamic_imbalance'];
        randomTurbine.scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      }
    }

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
      } else if (t.scenario === 'pitch_imbalance') {
        t.features.pitch_imbalance_deg = 3 + noise(0.5);
        t.features.pitch_risk = 70 + noise(2);
        actualPower = expectedPower * 0.92;
      } else if (t.scenario === 'blade_aerodynamic_imbalance') {
        vibGbx = 3.5 + noise(0.2);
        t.features.overall_failure_risk = 65 + noise(5);
        actualPower = expectedPower * 0.89;
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
      if (t.scenario && !this.incidents.find(a => a.turbineId === t.id && a.status === 'OPEN')) {
        let component = 'Gearbox';
        let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' = 'HIGH';
        let title = 'Possible Gearbox Degradation';
        
        // Ensure critical scenarios have appropriate high risk, while normal ones stay moderate
        let incidentRisk = t.features.overall_failure_risk;
        if ((severity as string) === 'CRITICAL' && incidentRisk < 80) incidentRisk = 80 + Math.random() * 15;
        if ((severity as string) === 'HIGH' && incidentRisk < 60) incidentRisk = 60 + Math.random() * 20;

        let whyThisEvent = [
          'Gearbox vibration increased 31% above baseline.',
          'Gearbox temperature increased 12%.',
          'Power output dropped 13.2% below expected.',
          'The pattern persisted for 18 minutes.'
        ];
        let evidence = [
          { parameter: 'Vibration RMS', currentValue: 5.8, baselineValue: 3.2, unit: 'mm/s', trend: 'up' as const, deviationPct: 31 },
          { parameter: 'Gearbox Temp', currentValue: 71, baselineValue: 61, unit: '°C', trend: 'up' as const, deviationPct: 12 },
          { parameter: 'Power', currentValue: 1.58, baselineValue: 1.82, unit: 'MW', trend: 'down' as const, deviationPct: -13.2 }
        ];
        let contributingSignals = [
          { name: 'Vibration', contribution: 'High' as const, score: 85 },
          { name: 'Gearbox Temperature', contribution: 'High' as const, score: 70 },
          { name: 'Power Deviation', contribution: 'Medium' as const, score: 45 },
          { name: 'Yaw Error', contribution: 'Low' as const, score: 15 }
        ];
        let relatedTelemetry = ['vibration_rms_mm_s', 'gearbox_temperature_c', 'power_kw'];
        let relatedAlarms = ['Temp_GearBox_HSS_NDE_HighWarn', 'Mech_DriveTrainVib_Warn'];
        let assessment = 'Multiple correlated signals indicate a possible gearbox degradation pattern.';
        let recommendedChecks = [
          'Review vibration trend',
          'Check gearbox lubrication',
          'Inspect bearing temperature',
          'Check oil pressure'
        ];
        let recommendationPriority: 'High' | 'Medium' | 'Low' = 'High';

        if (t.scenario === 'yaw_misalignment') {
          component = 'Yaw System';
          severity = 'MEDIUM';
          if (incidentRisk < 40) incidentRisk = 40 + Math.random() * 15;
          title = 'Yaw Misalignment Anomaly';
          whyThisEvent = [
            'Yaw error deviation of 15° sustained over 20 minutes.',
            'Wind vane disagreement detected.',
            'Suboptimal power capture observed relative to wind speed.'
          ];
          evidence = [
            { parameter: 'Yaw Error', currentValue: 15.2, baselineValue: 2.0, unit: 'deg', trend: 'up' as const, deviationPct: 45 },
            { parameter: 'Power', currentValue: 1.62, baselineValue: 1.82, unit: 'MW', trend: 'down' as const, deviationPct: -10.9 }
          ];
          contributingSignals = [
            { name: 'Yaw Error', contribution: 'High' as const, score: 90 },
            { name: 'Power Deviation', contribution: 'Medium' as const, score: 60 }
          ];
          relatedTelemetry = ['yaw_error_deg', 'power_kw', 'wind_speed_mps'];
          relatedAlarms = ['Yaw_Encoder_Direction_Err'];
          assessment = 'Likely pattern associated with sustained yaw misalignment causing reduced energy capture.';
          recommendedChecks = [
            'Inspect wind vane calibration',
            'Verify yaw encoder feedback',
            'Check yaw drive hydraulic pressure'
          ];
          recommendationPriority = 'Medium';
        } else if (t.scenario === 'generator_overheating') {
          component = 'Generator';
          severity = 'CRITICAL';
          if (incidentRisk < 80) incidentRisk = 85 + Math.random() * 10;
          title = 'Generator Overheating';
          whyThisEvent = [
            'Generator Phase V temperature exceeded safety baseline.',
            'NDE bearing temperature rising rapidly.',
            'No external ambient temperature explanation.'
          ];
          evidence = [
            { parameter: 'Phase Temp', currentValue: 110, baselineValue: 80, unit: '°C', trend: 'up' as const, deviationPct: 37.5 },
            { parameter: 'Bearing Temp', currentValue: 95, baselineValue: 70, unit: '°C', trend: 'up' as const, deviationPct: 35.7 }
          ];
          contributingSignals = [
            { name: 'Phase V Temp', contribution: 'High' as const, score: 95 },
            { name: 'Bearing Temp', contribution: 'High' as const, score: 85 },
            { name: 'Coolant Flow', contribution: 'Medium' as const, score: 50 }
          ];
          relatedTelemetry = ['generator_temperature_c', 'power_kw'];
          relatedAlarms = ['Temp_Gen_PhaseV_HighWarn', 'Temp_Gen_Bearing_NDE_HighWarn'];
          assessment = 'Critical thermal event in generator. Immediate inspection required to prevent insulation damage.';
          recommendedChecks = [
            'Check active cooling system status',
            'Inspect generator coolant levels',
            'Verify thermal sensor integrity'
          ];
          recommendationPriority = 'High';
        } else if (t.scenario === 'pitch_imbalance') {
          component = 'Pitch System';
          severity = 'HIGH';
          if (incidentRisk < 70) incidentRisk = 75 + Math.random() * 5;
          title = 'Pitch Imbalance Detected';
          whyThisEvent = ['Pitch angle deviation across blades detected.', 'Performance drop corresponds to pitch anomaly.'];
          evidence = [
            { parameter: 'Pitch Deviation', currentValue: 3.2, baselineValue: 0.1, unit: 'deg', trend: 'up' as const, deviationPct: 55 },
            { parameter: 'Power', currentValue: 1.65, baselineValue: 1.82, unit: 'MW', trend: 'down' as const, deviationPct: -9.3 }
          ];
          contributingSignals = [
            { name: 'Pitch Imbalance', contribution: 'High' as const, score: 88 },
            { name: 'Power Deviation', contribution: 'Medium' as const, score: 55 }
          ];
          relatedTelemetry = ['pitch_a_deg', 'pitch_b_deg', 'pitch_c_deg'];
          relatedAlarms = [];
          assessment = 'Pitch system is failing to maintain synchronized blade angles.';
          recommendedChecks = ['Check pitch motor calibration', 'Inspect pitch bearings'];
          recommendationPriority = 'Medium';
        } else if (t.scenario === 'blade_aerodynamic_imbalance') {
          component = 'Rotor';
          severity = 'MEDIUM';
          if (incidentRisk < 50) incidentRisk = 55 + Math.random() * 10;
          title = 'Aerodynamic Imbalance';
          whyThisEvent = ['1P frequency vibration detected in drivetrain.', 'Correlates with performance degradation.'];
          evidence = [
            { parameter: 'Nacelle Vib (1P)', currentValue: 3.5, baselineValue: 1.2, unit: 'mm/s', trend: 'up' as const, deviationPct: 40 },
          ];
          contributingSignals = [
            { name: 'Vibration', contribution: 'High' as const, score: 75 }
          ];
          relatedTelemetry = ['vibration_rms_mm_s'];
          relatedAlarms = ['Mech_DriveTrainVib_Warn'];
          assessment = 'Probable aerodynamic imbalance on the rotor. Could be icing or blade surface damage.';
          recommendedChecks = ['Visual inspection of blades', 'Check for icing conditions'];
          recommendationPriority = 'Low';
        }

        const now = new Date();
        const tenMinsAgo = new Date(now.getTime() - 10 * 60000);
        const twentyMinsAgo = new Date(now.getTime() - 20 * 60000);
        const incidentId = `INC-${Date.now()}-${t.id}`;

        // Inject related operational alarms if not exist
        relatedAlarms.forEach(rawName => {
          if (!this.operationalAlarms.find(a => a.turbineId === t.id && a.rawName === rawName && a.state === 'Active')) {
            const def = syntheticAlarmCatalogue.find(d => d.rawName === rawName) || syntheticAlarmCatalogue[0];
            this.operationalAlarms.unshift({
              id: `OP-${Date.now()}-${t.id}-${rawName}`,
              turbineId: t.id,
              farm: t.farm_id,
              rawName: def.rawName,
              displayName: def.displayName,
              component: def.component,
              category: def.category,
              severity: def.severity,
              state: 'Active',
              firstDetected: twentyMinsAgo.toISOString(),
              lastSeen: now.toISOString(),
              occurrences: Math.floor(Math.random() * 5) + 1,
              source: 'Synthetic Controller',
              parentIncidentId: incidentId
            });
          }
        });

        // Add the incident
        this.incidents.unshift({
          id: incidentId,
          turbineId: t.id,
          farm: t.farm_id,
          component,
          title,
          severity,
          risk: incidentRisk,
          confidence: 85 + Math.floor(Math.random() * 10),
          status: 'OPEN',
          eventType: 'Predictive',
          source: 'Intelligence Engine',
          firstDetected: twentyMinsAgo.toISOString(),
          lastUpdated: now.toISOString(),
          whyThisEvent,
          evidence,
          contributingSignals,
          relatedAlarmIds: relatedAlarms,
          relatedTelemetry,
          timeline: [
            { timestamp: twentyMinsAgo.toISOString(), message: 'Initial parameter deviation detected' },
            { timestamp: tenMinsAgo.toISOString(), message: 'Operational warnings generated by controller' },
            { timestamp: now.toISOString(), message: 'Multivariate anomaly confirmed', isImportant: true }
          ],
          impact: {
            currentLostPowerKw: t.telemetry.expected_power_kw - t.telemetry.power_kw,
            estimatedDailyLossMwh: ((t.telemetry.expected_power_kw - t.telemetry.power_kw) * 24) / 1000,
            performanceDeviationPct: t.features.power_residual_pct
          },
          assessment,
          recommendedChecks,
          recommendationPriority,
          priority: severity === 'CRITICAL' ? 'P1' : severity === 'HIGH' ? 'P2' : severity === 'MEDIUM' ? 'P3' : 'P4',
          assignee: component === 'Gearbox' || component === 'Yaw System' ? 'Mechanical Team' : component === 'Generator' ? 'Electrical Team' : 'Operations',
          activity: [
            { timestamp: twentyMinsAgo.toISOString(), message: 'Event detected by Intelligence Engine' }
          ]
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
      active_alerts: this.incidents.filter(a => a.status === 'OPEN').length
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

  public getAlerts(): IntelligentIncident[] {
    return this.incidents;
  }

  public getIncidents(): IntelligentIncident[] {
    return this.incidents;
  }

  public getOperationalAlarms(): OperationalAlarm[] {
    return this.operationalAlarms;
  }

  public getAlarmCatalogue(): AlarmDefinition[] {
    return syntheticAlarmCatalogue;
  }

  public acknowledgeAlert(id: string) {
    const a = this.incidents.find(x => x.id === id);
    if (a) {
      a.status = 'ACKNOWLEDGED';
      this.notify();
    }
  }

  public updateIncidentStatus(id: string, status: 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED') {
    const a = this.incidents.find(x => x.id === id);
    if (a) {
      a.status = status;
      let msg = `Status updated to ${status}`;
      if (status === 'ACKNOWLEDGED') msg = 'Acknowledged by Operations';
      if (status === 'INVESTIGATING') msg = 'Investigation started';
      if (status === 'RESOLVED') msg = `Resolved by ${a.assignee || 'Operations'}`;
      if (status === 'OPEN') msg = 'Reopened';
      
      a.activity.push({
        timestamp: new Date().toISOString(),
        message: msg
      });
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

