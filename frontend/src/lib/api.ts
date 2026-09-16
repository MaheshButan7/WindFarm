/**
 * REST API client functions
 */
import type { SnapshotResponse, Alert, AlertStats, AlertTimelineEvent, AlertAffectedParameter, AlertDiagnostics } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchSnapshot(
  window: string = "30m"
): Promise<SnapshotResponse> {
  const response = await fetch(`${API_BASE_URL}/api/snapshot?window=${window}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch snapshot: ${response.statusText}`);
  }
  return response.json();
}

export interface TurbineAnalyticsResponse {
  turbine_id: string;
  health_score: number;
  component_risks: Record<string, number>;
  rul: Record<string, { value: number; confidence: number }>;
  maintenance_recommendations: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    root_cause: string;
    cost_impact: string;
    action_date: string;
  }>;
  timestamp: string;
}

export async function fetchTurbineAnalytics(
  turbineId: string
): Promise<TurbineAnalyticsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/turbine/${turbineId}/analytics`);
  if (!response.ok) {
    throw new Error(`Failed to fetch analytics: ${response.statusText}`);
  }
  return response.json();
}

// Mock alert data generation
const alertTypes = {
  mechanical: [
    { type: "Vibration Anomaly", category: "mechanical" },
    { type: "Bearing Failure", category: "mechanical" },
    { type: "Gearbox Fault", category: "mechanical" },
    { type: "Blade Damage", category: "mechanical" },
  ],
  thermal: [
    { type: "Temperature Threshold Exceeded", category: "thermal" },
    { type: "Cooling System Fault", category: "thermal" },
    { type: "Overheating Warning", category: "thermal" },
  ],
  electrical: [
    { type: "Grid Connection Lost", category: "electrical" },
    { type: "Power Quality Issue", category: "electrical" },
    { type: "Generator Fault", category: "electrical" },
    { type: "Voltage Fluctuation", category: "electrical" },
  ],
  performance: [
    { type: "Underperformance", category: "performance" },
    { type: "Efficiency Drop", category: "performance" },
    { type: "Production Loss", category: "performance" },
  ],
  system: [
    { type: "Communication Failure", category: "system" },
    { type: "Sensor Malfunction", category: "system" },
    { type: "Control System Error", category: "system" },
  ],
};

const teamMembers = [
  { id: "user1", name: "John Smith", role: "Lead Engineer" },
  { id: "user2", name: "Sarah Johnson", role: "Maintenance Tech" },
  { id: "user3", name: "Mike Davis", role: "Operations Manager" },
  { id: "user4", name: "Emily Chen", role: "Analyst" },
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(startHoursAgo: number, endHoursAgo: number = 0): Date {
  const now = new Date();
  const hoursAgo = startHoursAgo + Math.random() * (endHoursAgo - startHoursAgo);
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
}

function generateTimeline(triggeredAt: Date, status: Alert["status"]): AlertTimelineEvent[] {
  const timeline: AlertTimelineEvent[] = [
    {
      timestamp: triggeredAt,
      event: "Alert triggered",
      user: "System",
      icon: "alert-triangle",
    },
    {
      timestamp: new Date(triggeredAt.getTime() + 2 * 60 * 1000),
      event: "Notification sent",
      user: "System",
      icon: "bell",
    },
  ];

  if (status !== "active") {
    const ackUser = getRandomElement(teamMembers);
    timeline.push({
      timestamp: new Date(triggeredAt.getTime() + 5 * 60 * 1000),
      event: "Alert acknowledged",
      user: ackUser.name,
      userRole: ackUser.role,
      icon: "check",
    });
  }

  if (status === "investigating") {
    timeline.push({
      timestamp: new Date(triggeredAt.getTime() + 15 * 60 * 1000),
      event: "Investigation started",
      user: getRandomElement(teamMembers).name,
      icon: "activity",
    });
  }

  if (status === "resolved") {
    timeline.push({
      timestamp: new Date(triggeredAt.getTime() + 45 * 60 * 1000),
      event: "Alert resolved",
      user: getRandomElement(teamMembers).name,
      note: "Issue fixed after component replacement",
      icon: "check-circle",
    });
  }

  return timeline;
}

function generateAffectedParameters(type: string): AlertAffectedParameter[] {
  const params: AlertAffectedParameter[] = [];
  
  if (type.includes("Vibration")) {
    params.push({
      name: "Vibration RMS",
      value: 15.2,
      threshold: 10,
      unit: "mm/s",
    });
  } else if (type.includes("Temperature")) {
    params.push({
      name: "Gearbox Temperature",
      value: 92,
      threshold: 85,
      unit: "°C",
    });
    params.push({
      name: "Generator Temperature",
      value: 98,
      threshold: 95,
      unit: "°C",
    });
  } else if (type.includes("Power")) {
    params.push({
      name: "Power Output",
      value: 1200,
      threshold: 1500,
      unit: "kW",
    });
  } else if (type.includes("Speed")) {
    params.push({
      name: "Rotor Speed",
      value: 18.5,
      threshold: 20,
      unit: "rpm",
    });
  }

  return params.length > 0 ? params : [{
    name: "System Health",
    value: 65,
    threshold: 80,
    unit: "%",
  }];
}

function generateDiagnostics(turbineId: string, type: string): AlertDiagnostics {
  return {
    correlatedParams: [
      {
        name: "Vibration RMS",
        value: 15.2,
        normalRange: { min: 2, max: 8 },
        deviation: 90,
      },
      {
        name: "Temperature",
        value: 92,
        normalRange: { min: 60, max: 80 },
        deviation: 15,
      },
    ],
    similarIncidents: [
      {
        id: "inc-001",
        date: getRandomDate(30 * 24, 25 * 24),
        turbine: turbineId,
        resolution: "Component replacement",
        timeToResolve: 120,
        reoccurred: false,
      },
      {
        id: "inc-002",
        date: getRandomDate(60 * 24, 55 * 24),
        turbine: (() => {
          const num = String(Math.floor(Math.random() * 20) + 1);
          return `WM-${num.padStart(3, "0")}`;
        })(),
        resolution: "Maintenance scheduled",
        timeToResolve: 480,
        reoccurred: true,
      },
    ],
    sensorData: {
      sensor1: { reading: 15.2, timestamp: new Date().toISOString() },
      sensor2: { reading: 14.8, timestamp: new Date().toISOString() },
    },
  };
}

export function generateMockAlerts(count: number = 75, turbineIds: string[] = []): Alert[] {
  const defaultTurbineIds = turbineIds.length > 0 
    ? turbineIds 
    : Array.from({ length: 20 }, (_, i) => {
        const num = String(i + 1);
        return `WM-${num.padStart(3, "0")}`;
      });

  const severities: Alert["severity"][] = ["critical", "high", "medium", "low", "info"];
  const statuses: Alert["status"][] = ["active", "acknowledged", "investigating", "resolved", "dismissed"];
  const priorities: Alert["priority"][] = ["immediate", "scheduled", "review", "low"];

  const alerts: Alert[] = [];

  for (let i = 0; i < count; i++) {
    const severity = getRandomElement(severities);
    const status = getRandomElement(statuses);
    const category = getRandomElement(Object.keys(alertTypes)) as keyof typeof alertTypes;
    const alertTypeData = getRandomElement(alertTypes[category]);
    const turbineId = getRandomElement(defaultTurbineIds);
    const triggeredAt = getRandomDate(168, 0); // Last 7 days
    const assigned = status !== "active" && Math.random() > 0.3;
    const assignedUser = assigned ? getRandomElement(teamMembers) : undefined;

    const affectedParams = generateAffectedParameters(alertTypeData.type);
    const currentValue = affectedParams[0]?.value || 0;
    const thresholdValue = affectedParams[0]?.threshold || 0;

    const alert: Alert = {
      id: (() => {
        const num = String(i + 1);
        return `alert-${num.padStart(4, "0")}`;
      })(),
      turbineId,
      turbineName: turbineId,
      title: `${alertTypeData.type} detected`,
      description: `${alertTypeData.type} detected on ${turbineId}. Current reading: ${currentValue}${affectedParams[0]?.unit || ""} exceeds threshold of ${thresholdValue}${affectedParams[0]?.unit || ""}.`,
      severity,
      type: alertTypeData.type,
      category: alertTypeData.category as Alert["category"],
      status,
      priority: severity === "critical" ? "immediate" : getRandomElement(priorities),
      triggeredAt,
      acknowledgedAt: status !== "active" ? new Date(triggeredAt.getTime() + 5 * 60 * 1000) : undefined,
      resolvedAt: status === "resolved" ? new Date(triggeredAt.getTime() + 45 * 60 * 1000) : undefined,
      assignedTo: assignedUser?.id,
      assignedToName: assignedUser?.name,
      currentValue,
      thresholdValue,
      unit: affectedParams[0]?.unit || "",
      affectedParameters: affectedParams,
      isRead: Math.random() > 0.3,
      hasAttachments: Math.random() > 0.7,
      attachmentCount: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0,
      commentCount: Math.floor(Math.random() * 5),
      timeline: generateTimeline(triggeredAt, status),
      diagnostics: severity === "critical" || severity === "high" ? generateDiagnostics(turbineId, alertTypeData.type) : undefined,
      recommendations: severity === "critical" || severity === "high" ? [
        "Immediately inspect affected component",
        "Review historical data for similar incidents",
        "Schedule maintenance window",
        "Update monitoring thresholds if needed",
      ] : undefined,
    };

    alerts.push(alert);
  }

  return alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
}

export function calculateAlertStats(alerts: Alert[]): AlertStats {
  const activeAlerts = alerts.filter(a => a.status === "active").length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;
  const acknowledgedAlerts = alerts.filter(a => a.status === "acknowledged").length;
  const resolvedAlerts = alerts.filter(a => a.status === "resolved").length;

  // Calculate average response time (acknowledgment time - trigger time)
  const responseTimes = alerts
    .filter(a => a.acknowledgedAt)
    .map(a => {
      const diff = a.acknowledgedAt!.getTime() - a.triggeredAt.getTime();
      return diff / (1000 * 60); // Convert to minutes
    });
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  // Calculate resolution rate (resolved within SLA / total resolved)
  const resolvedWithinSLA = alerts.filter(a => {
    if (!a.resolvedAt) return false;
    const resolutionTime = (a.resolvedAt.getTime() - a.triggeredAt.getTime()) / (1000 * 60);
    return resolutionTime <= 120; // 2 hour SLA
  }).length;
  const resolutionRate = resolvedAlerts > 0 ? (resolvedWithinSLA / resolvedAlerts) * 100 : 0;

  // Generate 24h trend (hourly counts)
  const now = new Date();
  const activeTrend = Array.from({ length: 24 }, (_, i) => {
    const hourStart = new Date(now.getTime() - (24 - i) * 60 * 60 * 1000);
    const hourEnd = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
    return alerts.filter(a => {
      const triggerTime = a.triggeredAt.getTime();
      return triggerTime >= hourStart.getTime() && triggerTime < hourEnd.getTime();
    }).length;
  });

  return {
    activeAlerts,
    criticalAlerts,
    acknowledgedAlerts,
    resolvedAlerts,
    avgResponseTime: Math.round(avgResponseTime),
    resolutionRate: Math.round(resolutionRate),
    activeTrend,
  };
}

export async function fetchAlerts(): Promise<Alert[]> {
  // In real implementation, this would fetch from API
  // For now, return mock data
  const turbineIds = Array.from({ length: 20 }, (_, i) => `WM-${String(i + 1).padStart(3, "0")}`);
  return generateMockAlerts(75, turbineIds);
}

export async function fetchAlertStats(): Promise<AlertStats> {
  const alerts = await fetchAlerts();
  return calculateAlertStats(alerts);
}

