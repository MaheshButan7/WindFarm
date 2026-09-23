import { globalSimulator } from './simulator';
import { TurbineData } from './types';

export async function queryCopilot(question: string) {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 600));

  const q = question.toLowerCase();
  const tMatch = q.match(/t\d{1,3}/);
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
    const queue = globalSimulator.getWorkOrders();
    if (queue.length > 0) {
      const top = queue[0];
      const t = globalSimulator.getTurbine(top.turbine_id);
      if (t) {
        result = {
          finding: `${t.id} requires immediate attention due to ${top.component} risk.`,
          evidence: [`Overall failure risk is ${Math.round(t.features.overall_failure_risk)}%`],
          impact: `Could lead to complete ${top.component} failure and prolonged downtime.`,
          risk: `Critical risk detected in ${top.component}.`,
          historical: 'Similar patterns preceded major failures last quarter.',
          recommendation: top.title,
          confidence: 91
        };
      }
    }
  } else if (q.includes('compare')) {
    const ids = [...q.matchAll(/t\d{1,3}/g)].map(m => m[0].toUpperCase());
    if (ids.length >= 2) {
      const t1 = globalSimulator.getTurbine(ids[0]);
      const t2 = globalSimulator.getTurbine(ids[1]);
      if (t1 && t2) {
        result = {
          finding: `Comparing ${t1.id} and ${t2.id}: ${t1.id} health is ${Math.round(t1.features.health_score)}, ${t2.id} health is ${Math.round(t2.features.health_score)}.`,
          evidence: [
            `${t1.id} power: ${(t1.telemetry.power_kw/1000).toFixed(2)} MW, Status: ${t1.status}`,
            `${t2.id} power: ${(t2.telemetry.power_kw/1000).toFixed(2)} MW, Status: ${t2.status}`
          ],
          impact: '',
          risk: '',
          historical: '',
          recommendation: t1.features.health_score < t2.features.health_score ? `Investigate ${t1.id}.` : `Investigate ${t2.id}.`,
          confidence: 95
        };
      }
    }
  } else if (q.includes('critical count') || q.includes('how many critical')) {
    const fleet = globalSimulator.getFleet();
    const critical = fleet.filter(t => t.status === 'CRITICAL');
    result = {
      finding: `There are currently ${critical.length} critical turbines in the fleet.`,
      evidence: critical.length > 0 ? critical.map(c => `${c.id} (${c.farm_id}): ${c.scenario?.replace(/_/g, ' ') || 'Unknown Issue'}`) : ['No critical turbines.'],
      impact: `High priority maintenance required for ${critical.length} assets.`,
      risk: '',
      historical: '',
      recommendation: 'Review active incidents for critical assets.',
      confidence: 100
    };
  } else if (q.includes('summarize')) {
    const farmMatch = q.match(/farm (a|b|c)/);
    const farm = farmMatch ? `Farm ${farmMatch[1].toUpperCase()}` : 'the fleet';
    const fleet = globalSimulator.getFleet();
    const targetFleet = farm === 'the fleet' ? fleet : fleet.filter(t => t.farm_id === farm);
    const avgHealth = targetFleet.reduce((acc, t) => acc + t.features.health_score, 0) / (targetFleet.length || 1);
    const totalPower = targetFleet.reduce((acc, t) => acc + t.telemetry.power_kw, 0) / 1000;
    
    result = {
      finding: `Summary for ${farm}: Overall health is ${Math.round(avgHealth)}/100.`,
      evidence: [
        `Active Power: ${totalPower.toFixed(2)} MW`,
        `Turbines Online: ${targetFleet.filter(t => t.status !== 'OFFLINE').length} / ${targetFleet.length}`,
        `Critical Alerts: ${targetFleet.filter(t => t.status === 'CRITICAL').length}`
      ],
      impact: '',
      risk: '',
      historical: '',
      recommendation: '',
      confidence: 98
    };
  } else {
    // Fallback intent
    result = {
      finding: "I didn't quite catch that. Try asking about a specific turbine (e.g., 'What's wrong with T04?'), comparing turbines ('Compare T01 and T02'), or summarizing ('Summarize Farm A').",
      evidence: [],
      impact: "",
      risk: "",
      historical: "",
      recommendation: "Rephrase your question.",
      confidence: 0
    };
  }

  return {
    ...result,
    turbine
  };
}
