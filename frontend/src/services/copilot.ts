import { globalSimulator } from './simulator';
import { TurbineData } from './types';

export async function queryCopilot(question: string) {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 600));

  const q = question.toLowerCase();
  const tMatch = q.match(/t\d{2}/);
  const turbineId = tMatch ? tMatch[0].toUpperCase() : null;
  const turbine = turbineId ? globalSimulator.getTurbine(turbineId) : null;
  
  let result = {
    finding: "I'm sorry, I don't understand that query.",
    evidence: [] as string[],
    impact: "",
    risk: "",
    historical: "",
    recommendation: "",
    confidence: 0
  };

  if (q.includes('underperforming') || q.includes('wrong with')) {
    if (turbine) {
      if (turbine.scenario === 'gearbox_degradation') {
        result = {
          finding: `${turbine.id} is currently underperforming due to possible gearbox degradation.`,
          evidence: [
            `Vibration increased to ${turbine.telemetry.vibration_rms_mm_s.toFixed(1)} mm/s`,
            `Gearbox temperature is elevated at ${Math.round(turbine.telemetry.gearbox_temperature_c)}°C`,
            `Actual power is ${Math.abs(turbine.features.power_residual_pct).toFixed(1)}% below expected`
          ],
          impact: `Estimated ${Math.round((turbine.telemetry.expected_power_kw - turbine.telemetry.power_kw))} kW lost power.`,
          risk: `Gearbox risk is critical at ${Math.round(turbine.features.gearbox_risk)}%.`,
          historical: '2 similar incidents found in Farm A historical data.',
          recommendation: 'Inspect gearbox and bearing condition immediately.',
          confidence: 87
        };
      } else if (turbine.scenario === 'yaw_misalignment') {
        result = {
          finding: `${turbine.id} is suffering from yaw misalignment.`,
          evidence: [`Yaw error is persistently ${turbine.features.yaw_error_deg.toFixed(1)}°`],
          impact: `Estimated ${Math.round((turbine.telemetry.expected_power_kw - turbine.telemetry.power_kw))} kW lost power.`,
          risk: `Yaw system risk is elevated to ${Math.round(turbine.features.yaw_risk)}%.`,
          historical: 'Common occurrence post-storm. Usually requires recalibration.',
          recommendation: 'Recalibrate wind vane and inspect yaw drives.',
          confidence: 93
        };
      } else {
        result = {
          finding: `${turbine.id} is currently operating normally.`,
          evidence: [`Health score is ${Math.round(turbine.features.health_score)}/100`],
          impact: 'No measurable performance impact.',
          risk: 'All component risks are within normal parameters.',
          historical: 'N/A',
          recommendation: 'Continue standard monitoring.',
          confidence: 99
        };
      }
    }
  } else if (q.includes('attention first') || q.includes('worst')) {
    const queue = globalSimulator.getMaintenanceQueue();
    if (queue.length > 0) {
      const top = queue[0];
      const t = globalSimulator.getTurbine(top.turbine_id);
      if (t) {
        result = {
          finding: `${t.id} requires immediate attention due to ${top.component} risk.`,
          evidence: [`Overall failure risk is ${Math.round(top.risk)}%`],
          impact: `Could lead to complete ${top.component} failure and prolonged downtime.`,
          risk: `Critical risk detected in ${top.component}.`,
          historical: 'Similar patterns preceded major failures last quarter.',
          recommendation: top.recommended_action,
          confidence: 91
        };
      }
    }
  }

  return {
    ...result,
    turbine
  };
}
