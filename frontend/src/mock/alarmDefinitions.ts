import { AlarmDefinition } from '../services/types';

export const syntheticAlarmCatalogue: AlarmDefinition[] = [
  {
    id: 'ALM-1000',
    rawName: 'Temp_GearBox_HSS_NDE_HighWarn',
    displayName: 'Gearbox HSS NDE High Temperature Warning',
    category: 'Temperature',
    component: 'Gearbox',
    severity: 'HIGH',
    action: 'Warning',
    description: 'High speed shaft non-drive end temperature exceeded warning threshold.',
    index: 0,
    enabled: true
  },
  {
    id: 'ALM-1001',
    rawName: 'Temp_GearBox_HSS_NDE_HighStop',
    displayName: 'Gearbox HSS NDE High Temperature Stop',
    category: 'Temperature',
    component: 'Gearbox',
    severity: 'CRITICAL',
    action: 'Stop',
    description: 'High speed shaft non-drive end temperature exceeded critical stop threshold.',
    index: 1,
    enabled: true
  },
  {
    id: 'ALM-1002',
    rawName: 'Mech_DriveTrainVib_Warn',
    displayName: 'Drive Train Vibration Warning',
    category: 'Mechanical',
    component: 'Gearbox',
    severity: 'HIGH',
    action: 'Warning',
    description: 'Vibration levels in drivetrain exceeded warning limits.',
    index: 2,
    enabled: true
  },
  {
    id: 'ALM-1003',
    rawName: 'Mech_DriveTrainVib_Stop',
    displayName: 'Drive Train Vibration Stop',
    category: 'Mechanical',
    component: 'Gearbox',
    severity: 'CRITICAL',
    action: 'Stop',
    description: 'Critical vibration levels detected in drivetrain.',
    index: 3,
    enabled: true
  },
  {
    id: 'ALM-1004',
    rawName: 'Hyd_GearOilPressure_LowStop',
    displayName: 'Gear Oil Pressure Low Stop',
    category: 'Hydraulic',
    component: 'Gearbox',
    severity: 'CRITICAL',
    action: 'Stop',
    description: 'Gearbox oil pressure fell below safe operating limit.',
    index: 4,
    enabled: true
  },
  {
    id: 'ALM-1005',
    rawName: 'WireBreak_GearOilPressure',
    displayName: 'Gear Oil Pressure Sensor Wire Break',
    category: 'Sensor',
    component: 'Gearbox',
    severity: 'MEDIUM',
    action: 'Warning',
    description: 'Loss of signal from gear oil pressure sensor.',
    index: 5,
    enabled: true
  },
  {
    id: 'ALM-1006',
    rawName: 'Temp_Gen_PhaseV_HighWarn',
    displayName: 'Generator Phase V High Temperature',
    category: 'Temperature',
    component: 'Generator',
    severity: 'HIGH',
    action: 'Warning',
    description: 'Generator phase V winding temperature high.',
    index: 6,
    enabled: true
  },
  {
    id: 'ALM-1007',
    rawName: 'Temp_Gen_Bearing_NDE_HighWarn',
    displayName: 'Generator NDE Bearing Temperature High',
    category: 'Temperature',
    component: 'Generator',
    severity: 'HIGH',
    action: 'Warning',
    description: 'Generator non-drive end bearing temperature elevated.',
    index: 7,
    enabled: true
  },
  {
    id: 'ALM-1008',
    rawName: 'SFS_IGBT_Fail_Stop',
    displayName: 'Converter IGBT Failure Stop',
    category: 'Electrical',
    component: 'Converter',
    severity: 'CRITICAL',
    action: 'Stop',
    description: 'IGBT module failure detected in converter.',
    index: 8,
    enabled: true
  },
  {
    id: 'ALM-1009',
    rawName: 'Elec_GenOverCurrent',
    displayName: 'Generator Overcurrent',
    category: 'Electrical',
    component: 'Generator',
    severity: 'CRITICAL',
    action: 'Stop',
    description: 'Generator current exceeded maximum limit.',
    index: 9,
    enabled: true
  },
  {
    id: 'ALM-1010',
    rawName: 'Pitch_1_OverCurrent',
    displayName: 'Pitch 1 Motor Overcurrent',
    category: 'Pitch',
    component: 'Pitch Drive',
    severity: 'HIGH',
    action: 'Warning',
    description: 'Pitch axis 1 motor drawing excessive current.',
    index: 10,
    enabled: true
  },
  {
    id: 'ALM-1011',
    rawName: 'Pitch_2_EncoderError',
    displayName: 'Pitch 2 Encoder Error',
    category: 'Pitch',
    component: 'Pitch Drive',
    severity: 'HIGH',
    action: 'Stop',
    description: 'Loss of position feedback from pitch axis 2 encoder.',
    index: 11,
    enabled: true
  },
  {
    id: 'ALM-1012',
    rawName: 'Pitch_Imbalance_Warn',
    displayName: 'Aerodynamic Pitch Imbalance',
    category: 'Pitch',
    component: 'Pitch Drive',
    severity: 'MEDIUM',
    action: 'Warning',
    description: 'Significant deviation between pitch axis positions detected.',
    index: 12,
    enabled: true
  },
  {
    id: 'ALM-1013',
    rawName: 'Yaw_Encoder_Direction_Err',
    displayName: 'Yaw Encoder Direction Error',
    category: 'Yaw',
    component: 'Yaw System',
    severity: 'HIGH',
    action: 'Stop',
    description: 'Yaw position encoder direction mismatch.',
    index: 13,
    enabled: true
  },
  {
    id: 'ALM-1014',
    rawName: 'Mech_YawBrake_Fail',
    displayName: 'Yaw Brake Failure',
    category: 'Mechanical',
    component: 'Yaw System',
    severity: 'CRITICAL',
    action: 'Stop',
    description: 'Yaw brake hydraulic pressure lost.',
    index: 14,
    enabled: true
  },
  {
    id: 'ALM-1015',
    rawName: 'Yaw_Untwist_Timeout',
    displayName: 'Cable Untwist Timeout',
    category: 'Yaw',
    component: 'Yaw System',
    severity: 'HIGH',
    action: 'Stop',
    description: 'Cable untwisting procedure timed out.',
    index: 15,
    enabled: true
  },
  {
    id: 'ALM-1016',
    rawName: 'Elec_GridLoss',
    displayName: 'Grid Loss Detected',
    category: 'Grid',
    component: 'Transformer',
    severity: 'CRITICAL',
    action: 'Stop',
    description: 'Loss of grid voltage or frequency outside limits.',
    index: 16,
    enabled: true
  },
  {
    id: 'ALM-1017',
    rawName: 'Elec_Frequency_HighStop',
    displayName: 'Grid Frequency High Stop',
    category: 'Grid',
    component: 'Transformer',
    severity: 'CRITICAL',
    action: 'Stop',
    description: 'Grid frequency exceeded maximum threshold.',
    index: 17,
    enabled: true
  },
  {
    id: 'ALM-1018',
    rawName: 'Temp_Nacelle_HighWarn',
    displayName: 'Nacelle High Temperature Warning',
    category: 'Temperature',
    component: 'Sensor',
    severity: 'MEDIUM',
    action: 'Warning',
    description: 'Ambient nacelle temperature is elevated.',
    index: 18,
    enabled: true
  },
  {
    id: 'ALM-1019',
    rawName: 'Wind_Speed_HighStop',
    displayName: 'High Wind Speed Stop',
    category: 'Wind',
    component: 'Controller',
    severity: 'HIGH',
    action: 'Stop',
    description: 'Wind speed exceeded operational cut-out limit.',
    index: 19,
    enabled: true
  },
  {
    id: 'ALM-1020',
    rawName: 'Sfty_EStop_Pressed',
    displayName: 'Emergency Stop Pressed',
    category: 'Safety',
    component: 'Controller',
    severity: 'CRITICAL',
    action: 'Stop',
    description: 'Emergency stop button was activated.',
    index: 20,
    enabled: true
  }
];

// Add 100 more synthetic alarms dynamically to flesh out the catalogue
const categories = ['Temperature', 'Mechanical', 'Electrical', 'Pitch', 'Yaw', 'Wind', 'Hydraulic', 'Safety', 'Controller', 'Grid'];
const components = ['Gearbox', 'Generator', 'Bearing', 'Pitch Drive', 'Yaw System', 'Brake', 'Transformer', 'Converter'];
const severities: any[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const actions = ['Stop', 'Warning', 'Info', 'Pause', 'Derate'];
const prefixes: any = { 'Temperature': 'Temp_', 'Mechanical': 'Mech_', 'Electrical': 'Elec_', 'Pitch': 'Pitch_', 'Yaw': 'Yaw_', 'Wind': 'Wind_', 'Hydraulic': 'Hyd_', 'Safety': 'Sfty_', 'Controller': 'Ctrl_', 'Grid': 'Grid_' };

for (let i = 21; i < 221; i++) {
  const cat = categories[i % categories.length];
  const comp = components[i % components.length];
  const sev = severities[i % severities.length];
  const act = actions[i % actions.length];
  const prefix = prefixes[cat] || 'Sys_';
  const type = ['HighWarn', 'HighStop', 'LowWarn', 'LowStop', 'Err', 'Fail', 'SensorFault', 'Timeout'][i % 8];
  
  syntheticAlarmCatalogue.push({
    id: 'ALM-' + (1000 + i),
    rawName: prefix + comp.replace(' ', '') + '_' + type + '_' + i,
    displayName: comp + ' ' + type.replace(/([A-Z])/g, ' $1').trim() + ' (' + i + ')',
    category: cat,
    component: comp,
    severity: sev,
    action: act,
    description: 'Auto-generated synthetic alarm for ' + comp + ' ' + type,
    index: i,
    enabled: true
  });
}
