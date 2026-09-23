import { TurbineData, FleetSummary, IntelligentIncident, OperationalAlarm, AlarmDefinition, WorkOrder, TurbineStatus } from './types';
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
    this.injectScenario('T09', 'main_bearing_wear');
    this.injectScenario('T22', 'generator_overheating');
    this.injectScenario('T12', 'grid_instability');
    this.injectScenario('T34', 'pitch_imbalance');
    this.injectScenario('T45', 'hydraulic_pressure_loss');
    this.injectScenario('T56', 'converter_igbt_fault');
    this.injectScenario('T78', 'anemometer_icing');
    this.injectScenario('T88', 'blade_aerodynamic_imbalance');

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
        const scenarios = ['gearbox_degradation', 'yaw_misalignment', 'generator_overheating', 'pitch_imbalance', 'blade_aerodynamic_imbalance', 'main_bearing_wear', 'hydraulic_pressure_loss', 'converter_igbt_fault', 'anemometer_icing', 'grid_instability'];
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
      let tempGen = 70 + noise(1);
      let tempBrg = 55 + noise(1);
      let vibGbx = 1.2 + noise(0.1);
      let riskGbx = 5 + noise(0.1);
      let riskYaw = 5 + noise(0.1);
      let riskGen = 5 + noise(0.1);
      let riskPitch = 5 + noise(0.1);
      let yawError = noise(0.5);
      let windDir = 270 + noise(3);
      let nacelleDir = windDir - yawError;
      let pitchA = 0 + noise(0.1);
      let pitchB = 0 + noise(0.1);
      let pitchC = 0 + noise(0.1);
      let humidity = 45 + noise(2);
      let pitchImb = noise(0.1);
      let rotorRpm = 12.0 + noise(0.5);
      let generatorRpm = rotorRpm * 100 + noise(20);
      let ambientTemp = 25 + noise(1);

      let gridVolts = 690 + noise(2);
      let gridFreq = 50.0 + noise(0.02);
      let riskElec = 5 + noise(0.1);

      // Scenario overrides
      if (t.scenario === 'gearbox_degradation') {
        tempGbx = 85 + noise(2);
        vibGbx = 5.8 + noise(0.2);
        riskGbx = 82 + noise(0.2);
        actualPower = expectedPower * 0.85; // 15% efficiency loss
      } else if (t.scenario === 'yaw_misalignment') {
        yawError = 15 + noise(1);
        nacelleDir = windDir - yawError;
        riskYaw = 65 + noise(0.2);
        actualPower = expectedPower * 0.88;
      } else if (t.scenario === 'generator_overheating') {
        tempGen = 110 + noise(3);
        tempBrg = 95 + noise(2);
        riskGen = 85 + noise(2);
        actualPower = expectedPower * 0.90;
      } else if (t.scenario === 'pitch_imbalance') {
        pitchImb = 3.2 + noise(0.5);
        pitchA = pitchImb; // Imbalance in blade A
        riskPitch = 70 + noise(2);
        actualPower = expectedPower * 0.92;
      } else if (t.scenario === 'blade_aerodynamic_imbalance') {
        vibGbx = 3.5 + noise(0.2);
        t.features.overall_failure_risk = 65 + noise(5); 
        actualPower = expectedPower * 0.89;
      } else if (t.scenario === 'main_bearing_wear') {
        tempBrg = 92 + noise(2);
        vibGbx = 4.1 + noise(0.3);
        riskGbx = 78 + noise(1);
        actualPower = expectedPower * 0.94;
      } else if (t.scenario === 'hydraulic_pressure_loss') {
        pitchA = 8 + noise(0.5);
        pitchB = 8 + noise(0.5);
        pitchC = 8 + noise(0.5);
        riskPitch = 92 + noise(2);
        actualPower = expectedPower * 0.50; // Pitch stuck, huge power drop
      } else if (t.scenario === 'converter_igbt_fault') {
        riskElec = 95 + noise(1);
        riskGen = 80 + noise(2);
        actualPower = 0; // Tripped
      } else if (t.scenario === 'anemometer_icing') {
        windSpeed = Math.max(3, windSpeed - 5); // Artificially low wind reading
        actualPower = expectedPower * 0.85; // Degraded performance due to bad control loop
      } else if (t.scenario === 'grid_instability') {
        gridVolts = 690 + noise(45); // Huge voltage swings
        gridFreq = 50.0 + noise(0.8); // Frequency swings
        riskElec = 88 + noise(3);
        actualPower = expectedPower * 0.40; // Curtailment due to grid
      }

      // Cap power to 2100 kW (2.1 MW)
      actualPower = Math.min(2100, Math.max(0, actualPower));
      const expPowerCap = Math.min(2100, Math.max(0, expectedPower));

      // Calculate residual
      const residualPct = ((actualPower - expPowerCap) / (expPowerCap || 1)) * 100;
      let overallRisk = Math.max(riskGbx, riskYaw, riskGen, riskPitch, 5);
      if (t.scenario === 'blade_aerodynamic_imbalance') {
        overallRisk = Math.max(overallRisk, 65 + noise(5));
      }
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
      t.telemetry.generator_temperature_c = tempGen;
      t.telemetry.bearing_temperature_c = tempBrg;
      t.telemetry.wind_direction_deg = windDir;
      t.telemetry.nacelle_direction_deg = nacelleDir;
      t.telemetry.pitch_a_deg = pitchA;
      t.telemetry.pitch_b_deg = pitchB;
      t.telemetry.pitch_c_deg = pitchC;
      t.telemetry.humidity_pct = humidity;
      t.telemetry.grid_voltage_v = gridVolts;
      t.telemetry.grid_frequency_hz = gridFreq;
      t.telemetry.oil_temperature_c = 58 + noise(0.5);
      t.telemetry.rotor_rpm = rotorRpm;
      t.telemetry.generator_rpm = generatorRpm;
      t.telemetry.ambient_temperature_c = ambientTemp;

      t.features.power_residual_pct = residualPct;
      t.features.yaw_error_deg = yawError;
      t.features.pitch_imbalance_deg = pitchImb;
      t.features.gearbox_risk = riskGbx;
      t.features.generator_risk = riskGen;
      t.features.yaw_risk = riskYaw;
      t.features.pitch_risk = riskPitch;
      t.features.electrical_risk = riskElec;
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
          { parameter: 'Vibration RMS', currentValue: parseFloat(t.telemetry.vibration_rms_mm_s.toFixed(2)), baselineValue: 1.2, unit: 'mm/s', trend: 'up' as const, deviationPct: Math.round(((t.telemetry.vibration_rms_mm_s - 1.2) / 1.2) * 100) },
          { parameter: 'Gearbox Temp', currentValue: Math.round(t.telemetry.gearbox_temperature_c), baselineValue: 65, unit: '°C', trend: 'up' as const, deviationPct: Math.round(((t.telemetry.gearbox_temperature_c - 65) / 65) * 100) },
          { parameter: 'Power', currentValue: parseFloat((t.telemetry.power_kw / 1000).toFixed(2)), baselineValue: parseFloat((t.telemetry.expected_power_kw / 1000).toFixed(2)), unit: 'MW', trend: 'down' as const, deviationPct: parseFloat(t.features.power_residual_pct.toFixed(1)) }
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
            { parameter: 'Yaw Error', currentValue: parseFloat(t.features.yaw_error_deg.toFixed(1)), baselineValue: 0.5, unit: 'deg', trend: 'up' as const, deviationPct: Math.round(((t.features.yaw_error_deg - 0.5) / 0.5) * 100) },
            { parameter: 'Power', currentValue: parseFloat((t.telemetry.power_kw / 1000).toFixed(2)), baselineValue: parseFloat((t.telemetry.expected_power_kw / 1000).toFixed(2)), unit: 'MW', trend: 'down' as const, deviationPct: parseFloat(t.features.power_residual_pct.toFixed(1)) }
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
            { parameter: 'Phase Temp', currentValue: Math.round(t.telemetry.generator_temperature_c), baselineValue: 70, unit: '°C', trend: 'up' as const, deviationPct: Math.round(((t.telemetry.generator_temperature_c - 70) / 70) * 100) },
            { parameter: 'Bearing Temp', currentValue: Math.round(t.telemetry.bearing_temperature_c), baselineValue: 55, unit: '°C', trend: 'up' as const, deviationPct: Math.round(((t.telemetry.bearing_temperature_c - 55) / 55) * 100) }
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
            { parameter: 'Pitch Deviation', currentValue: parseFloat(t.features.pitch_imbalance_deg.toFixed(1)), baselineValue: 0.1, unit: 'deg', trend: 'up' as const, deviationPct: Math.round(((t.features.pitch_imbalance_deg - 0.1) / 0.1) * 100) },
            { parameter: 'Power', currentValue: parseFloat((t.telemetry.power_kw / 1000).toFixed(2)), baselineValue: parseFloat((t.telemetry.expected_power_kw / 1000).toFixed(2)), unit: 'MW', trend: 'down' as const, deviationPct: parseFloat(t.features.power_residual_pct.toFixed(1)) }
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
            { parameter: 'Nacelle Vib (1P)', currentValue: parseFloat(t.telemetry.vibration_rms_mm_s.toFixed(2)), baselineValue: 1.2, unit: 'mm/s', trend: 'up' as const, deviationPct: Math.round(((t.telemetry.vibration_rms_mm_s - 1.2) / 1.2) * 100) },
          ];
          contributingSignals = [
            { name: 'Vibration', contribution: 'High' as const, score: 75 }
          ];
          relatedTelemetry = ['vibration_rms_mm_s'];
          relatedAlarms = ['Mech_DriveTrainVib_Warn'];
          assessment = 'Probable aerodynamic imbalance on the rotor. Could be icing or blade surface damage.';
          recommendedChecks = ['Visual inspection of blades', 'Check for icing conditions'];
          recommendationPriority = 'Low';
        } else if (t.scenario === 'main_bearing_wear') {
          component = 'Gearbox';
          severity = 'HIGH';
          if (incidentRisk < 75) incidentRisk = 78 + Math.random() * 5;
          title = 'Main Bearing Wear Detected';
          whyThisEvent = ['Main bearing temperature elevated beyond normal delta to ambient.', 'Low-frequency vibration signatures match spalling patterns.'];
          evidence = [
            { parameter: 'Bearing Temp', currentValue: Math.round(t.telemetry.bearing_temperature_c), baselineValue: 55, unit: '°C', trend: 'up' as const, deviationPct: Math.round(((t.telemetry.bearing_temperature_c - 55) / 55) * 100) },
            { parameter: 'Nacelle Vib', currentValue: parseFloat(t.telemetry.vibration_rms_mm_s.toFixed(2)), baselineValue: 1.2, unit: 'mm/s', trend: 'up' as const, deviationPct: Math.round(((t.telemetry.vibration_rms_mm_s - 1.2) / 1.2) * 100) }
          ];
          contributingSignals = [
            { name: 'Bearing Temp', contribution: 'High' as const, score: 85 },
            { name: 'Vibration', contribution: 'Medium' as const, score: 65 }
          ];
          relatedTelemetry = ['bearing_temperature_c', 'vibration_rms_mm_s'];
          relatedAlarms = ['Temp_GearBox_HSS_NDE_HighWarn'];
          assessment = 'Early signs of main bearing failure. Progressive wear detected.';
          recommendedChecks = ['Grease sample analysis', 'Borescope inspection of rollers'];
          recommendationPriority = 'High';
        } else if (t.scenario === 'hydraulic_pressure_loss') {
          component = 'Pitch System';
          severity = 'CRITICAL';
          if (incidentRisk < 90) incidentRisk = 92 + Math.random() * 5;
          title = 'Hydraulic Pressure Loss';
          whyThisEvent = ['Pitch hydraulic pump unable to maintain accumulator pressure.', 'Pitch actuation severely delayed.'];
          evidence = [
            { parameter: 'Pitch Angle', currentValue: parseFloat(t.telemetry.pitch_a_deg.toFixed(1)), baselineValue: 0.0, unit: 'deg', trend: 'up' as const, deviationPct: 100 },
            { parameter: 'Power', currentValue: parseFloat((t.telemetry.power_kw / 1000).toFixed(2)), baselineValue: parseFloat((t.telemetry.expected_power_kw / 1000).toFixed(2)), unit: 'MW', trend: 'down' as const, deviationPct: parseFloat(t.features.power_residual_pct.toFixed(1)) }
          ];
          contributingSignals = [
            { name: 'Pitch Angle', contribution: 'High' as const, score: 95 },
            { name: 'Power Deviation', contribution: 'High' as const, score: 90 }
          ];
          relatedTelemetry = ['pitch_a_deg', 'power_kw'];
          relatedAlarms = ['Pitch_1_OverCurrent', 'Hyd_GearOilPressure_LowStop'];
          assessment = 'Hydraulic leak or pump failure preventing pitch actuation. Major risk of overspeed if wind increases.';
          recommendedChecks = ['Check hydraulic reservoir level', 'Inspect pitch proportional valves', 'Look for hydraulic fluid leaks'];
          recommendationPriority = 'High';
        } else if (t.scenario === 'converter_igbt_fault') {
          component = 'Converter';
          severity = 'CRITICAL';
          if (incidentRisk < 90) incidentRisk = 95 + Math.random() * 4;
          title = 'Converter IGBT Fault';
          whyThisEvent = ['IGBT stack thermal runaway detected.', 'Turbine tripped offline instantly.'];
          evidence = [
            { parameter: 'Power', currentValue: 0, baselineValue: parseFloat((t.telemetry.expected_power_kw / 1000).toFixed(2)), unit: 'MW', trend: 'down' as const, deviationPct: 100 }
          ];
          contributingSignals = [
            { name: 'Power Deviation', contribution: 'High' as const, score: 98 }
          ];
          relatedTelemetry = ['power_kw', 'generator_temperature_c'];
          relatedAlarms = ['SFS_IGBT_Fail_Stop', 'Elec_GenOverCurrent'];
          assessment = 'IGBT module failure triggered electrical protection systems. Turbine isolated from grid.';
          recommendedChecks = ['Test IGBT semiconductor modules', 'Check converter cooling system', 'Verify grid filter caps'];
          recommendationPriority = 'High';
        } else if (t.scenario === 'anemometer_icing') {
          component = 'Sensor';
          severity = 'MEDIUM';
          if (incidentRisk < 50) incidentRisk = 50 + Math.random() * 10;
          title = 'Anemometer Icing';
          whyThisEvent = ['Wind speed reading dropped sharply despite power output maintaining steady levels.', 'Correlates with sub-zero ambient temperatures.'];
          evidence = [
            { parameter: 'Wind Speed', currentValue: parseFloat(t.telemetry.wind_speed_mps.toFixed(1)), baselineValue: parseFloat((t.telemetry.wind_speed_mps + 5).toFixed(1)), unit: 'm/s', trend: 'down' as const, deviationPct: 40 }
          ];
          contributingSignals = [
            { name: 'Wind Speed Anomaly', contribution: 'High' as const, score: 85 },
            { name: 'Temperature', contribution: 'Medium' as const, score: 60 }
          ];
          relatedTelemetry = ['wind_speed_mps', 'ambient_temperature_c'];
          relatedAlarms = ['Wind_Speed_HighStop']; 
          assessment = 'Icing on the ultrasonic anemometer causing artificially low wind readings, skewing pitch controller logic.';
          recommendedChecks = ['Check sensor heater element', 'Verify secondary anemometer reading'];
          recommendationPriority = 'Low';
        } else if (t.scenario === 'grid_instability') {
          component = 'Transformer';
          severity = 'HIGH';
          if (incidentRisk < 80) incidentRisk = 88 + Math.random() * 5;
          title = 'Grid Instability';
          whyThisEvent = ['Grid voltage and frequency wildly fluctuating.', 'Turbine curtailed to protect electrical drivetrain.'];
          evidence = [
            { parameter: 'Grid Voltage', currentValue: Math.round(t.telemetry.grid_voltage_v), baselineValue: 690, unit: 'V', trend: 'up' as const, deviationPct: Math.round(Math.abs(t.telemetry.grid_voltage_v - 690) / 690 * 100) },
            { parameter: 'Grid Freq', currentValue: parseFloat(t.telemetry.grid_frequency_hz.toFixed(2)), baselineValue: 50.0, unit: 'Hz', trend: 'down' as const, deviationPct: Math.round(Math.abs(t.telemetry.grid_frequency_hz - 50) / 50 * 100) }
          ];
          contributingSignals = [
            { name: 'Voltage Swing', contribution: 'High' as const, score: 92 },
            { name: 'Frequency Swing', contribution: 'High' as const, score: 89 }
          ];
          relatedTelemetry = ['grid_voltage_v', 'grid_frequency_hz', 'power_kw'];
          relatedAlarms = ['Elec_GridLoss', 'Elec_Frequency_HighStop'];
          assessment = 'Severe external grid instability detected. Controller is curtailing power to maintain LVRT compliance.';
          recommendedChecks = ['Contact grid operator', 'Verify substation logs'];
          recommendationPriority = 'Medium';
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
      
      if (status === 'RESOLVED' || status === 'DISMISSED') {
        this.operationalAlarms.forEach(op => {
          if (op.parentIncidentId === id) {
            op.state = 'Resolved';
          }
        });
      }

      a.activity.push({
        timestamp: new Date().toISOString(),
        message: msg
      });
      this.notify();
    }
  }

  public getWorkOrders(): WorkOrder[] {
    const today = new Date();
    const addDays = (d: number) => {
      const dt = new Date(today);
      dt.setDate(today.getDate() + d);
      return dt.toISOString().split('T')[0] + ' 10:00 AM';
    };

    const predictive: WorkOrder[] = this.turbines
      .filter(t => t.features.overall_failure_risk > 40)
      .map((t, index) => {
        let comp = 'General';
        let action = 'Inspect component health';
        let assignee = 'Operations';
        let priority: 'High' | 'Medium' | 'Low' = 'Medium';
        
        if (t.features.gearbox_risk > 50) { 
          comp = 'Gearbox'; 
          action = 'Schedule borescope inspection and oil analysis'; 
          assignee = 'Mechanical Team';
          priority = 'High';
        }
        else if (t.features.yaw_risk > 50) { 
          comp = 'Yaw System'; 
          action = 'Recalibrate wind vane and inspect yaw drives'; 
          assignee = 'Mechanical Team';
          priority = 'High';
        }

        return {
          id: `WO-P-${t.id}-${index}`,
          turbine_id: t.id,
          farm_id: t.farm_id,
          title: action,
          status: 'Pending',
          priority: priority,
          component: comp,
          assignee: assignee
        };
      });

    const scheduled: WorkOrder[] = [
      { id: 'WO-S-1042', turbine_id: 'T02', farm_id: 'Farm A', title: 'Annual visual inspection', status: 'Scheduled', priority: 'Medium', component: 'Rotor Blades', assignee: 'Blade Specialists', scheduled_date: addDays(2) },
      { id: 'WO-S-1043', turbine_id: 'T11', farm_id: 'Farm A', title: 'Routine filter replacement', status: 'In Progress', priority: 'Low', component: 'Hydraulics', assignee: 'Tech Team Alpha', scheduled_date: addDays(-1) },
      { id: 'WO-S-1044', turbine_id: 'T25', farm_id: 'Farm B', title: 'Grease generator bearings', status: 'Completed', priority: 'Low', component: 'Generator', assignee: 'Mechanical Team', scheduled_date: addDays(-5) },
      { id: 'WO-S-1045', turbine_id: 'T04', farm_id: 'Farm A', title: 'Gearbox endoscope', status: 'Scheduled', priority: 'High', component: 'Gearbox', assignee: 'Specialist Techs', scheduled_date: addDays(1) },
      { id: 'WO-S-1046', turbine_id: 'T17', farm_id: 'Farm A', title: 'Yaw drive calibration', status: 'In Progress', priority: 'High', component: 'Yaw System', assignee: 'Tech Team Alpha', scheduled_date: addDays(0) },
    ];

    return [...predictive, ...scheduled];
  }

  // Generate detailed history for a single turbine
  public getHistory(turbine_id: string, hours = 24): any[] {
    const history = [];
    const now = Date.now();
    const turbine = this.getTurbine(turbine_id);
    const baseTemp = turbine ? turbine.telemetry.gearbox_temperature_c : 65;
    const baseVib = turbine ? turbine.telemetry.vibration_rms_mm_s : 1.2;
    const baseRisks = turbine ? [
      turbine.features.gearbox_risk,
      turbine.features.generator_risk,
      turbine.features.bearing_risk,
      turbine.features.yaw_risk,
      turbine.features.pitch_risk,
      turbine.features.electrical_risk,
    ] : [5, 5, 5, 5, 5, 5];

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
        gearbox_risk: Math.max(0, Math.min(100, baseRisks[0] + hourSin * 4 + noise(2))),
        generator_risk: Math.max(0, Math.min(100, baseRisks[1] + hourSin * 3 + noise(1.5))),
        bearing_risk: Math.max(0, Math.min(100, baseRisks[2] + hourSin * 3 + noise(1.5))),
        yaw_risk: Math.max(0, Math.min(100, baseRisks[3] + hourSin * 4 + noise(2))),
        pitch_risk: Math.max(0, Math.min(100, baseRisks[4] + hourSin * 3 + noise(1.5))),
        electrical_risk: Math.max(0, Math.min(100, baseRisks[5] + hourSin * 2 + noise(1))),
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

