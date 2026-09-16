"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Area,
  Legend,
} from "recharts";
import {
  Activity,
  Settings,
  Zap,
  Fan,
  Circle,
  Plug,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wrench,
  Info,
  Brain,
  XCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { TurbineData } from "@/lib/types";
import { format, subDays } from "date-fns";
import { fetchTurbineAnalytics, type TurbineAnalyticsResponse } from "@/lib/api";

interface AnalyticsTabProps {
  turbine: TurbineData | null;
  timeseries: Record<string, Array<{ timestamp: string; value: number }>>;
}

// Helper function to safely format dates
function safeFormatDate(dateInput: string | Date | null | undefined, formatStr: string = "MMM d, yyyy"): string {
  if (!dateInput) return "TBD";
  
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
  }
  
  if (isNaN(date.getTime())) return "TBD";
  
  try {
    return format(date, formatStr);
  } catch {
    return "TBD";
  }
}

export function AnalyticsTab({ turbine, timeseries }: AnalyticsTabProps) {
  const [comparisonMode, setComparisonMode] = useState<"fleet" | "best" | "similar">("fleet");
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<TurbineAnalyticsResponse | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Fetch analytics data from API (includes OpenAI-generated recommendations)
  useEffect(() => {
    if (!turbine?.turbine_id) return;

    setIsLoadingAnalytics(true);
    setAnalyticsError(null);
    
    fetchTurbineAnalytics(turbine.turbine_id)
      .then((data) => {
        setAnalyticsData(data);
        setIsLoadingAnalytics(false);
      })
      .catch((error) => {
        console.error("Failed to fetch analytics:", error);
        setAnalyticsError(error.message);
        setIsLoadingAnalytics(false);
      });
  }, [turbine?.turbine_id]);

  if (!turbine) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading analytics data...</p>
      </div>
    );
  }

  const components = [
    { name: "Gearbox", icon: Settings, health: turbine.component_risks?.gearbox ? 100 - turbine.component_risks.gearbox : 85 },
    { name: "Generator", icon: Zap, health: turbine.component_risks?.generator ? 100 - turbine.component_risks.generator : 90 },
    { name: "Blades", icon: Fan, health: turbine.component_risks?.blades ? 100 - turbine.component_risks.blades : 92 },
    { name: "Bearings", icon: Circle, health: turbine.component_risks?.bearings ? 100 - turbine.component_risks.bearings : 88 },
    { name: "Electrical", icon: Plug, health: turbine.component_risks?.power_panel ? 100 - turbine.component_risks.power_panel : 95 },
  ];

  // Use RUL data from API if available, otherwise fallback to turbine data
  const rulData = analyticsData?.rul || turbine.rul || {
    gearbox: { value: 180, confidence: 0.85 },
    blades: { value: 450, confidence: 0.90 },
    generator: { value: 1095, confidence: 0.80 },
    bearings: { value: 120, confidence: 0.75 },
    power_panel: { value: 320, confidence: 0.85 },
  };

  // Use risk data from API if available, otherwise fallback to turbine data
  const componentRisks = analyticsData?.component_risks || turbine.component_risks || {};
  const riskData = [
    {
      component: "Gearbox",
      riskScore: componentRisks.gearbox || 15,
      prob30d: 2.5,
      prob60d: 5.0,
      prob90d: 8.5,
      trend: "up" as const,
    },
    {
      component: "Blades",
      riskScore: componentRisks.blades || 8,
      prob30d: 0.5,
      prob60d: 1.2,
      prob90d: 2.5,
      trend: "down" as const,
    },
    {
      component: "Generator",
      riskScore: componentRisks.generator || 10,
      prob30d: 1.5,
      prob60d: 3.0,
      prob90d: 5.5,
      trend: "stable" as const,
    },
    {
      component: "Bearings",
      riskScore: componentRisks.bearings || 25,
      prob30d: 4.5,
      prob60d: 9.0,
      prob90d: 15.0,
      trend: "up" as const,
    },
    {
      component: "Power Panel",
      riskScore: componentRisks.power_panel || 5,
      prob30d: 0.2,
      prob60d: 0.5,
      prob90d: 1.0,
      trend: "stable" as const,
    },
  ];

  // Use AI-generated recommendations from API, fallback to empty array
  const maintenanceRecommendations = analyticsData?.maintenance_recommendations?.map((rec) => ({
    priority: rec.priority,
    title: rec.title,
    date: rec.action_date,
    description: rec.description,
    rootCause: rec.root_cause, // This is the AI-generated text!
    costImpact: rec.cost_impact,
    actionDate: rec.action_date,
    impact: rec.description, // Using description as impact for now
  })) || [];

  const anomalies = [
    {
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      parameter: "Vibration RMS",
      type: "Vibration Anomaly",
      severity: "warning" as const,
      status: "new" as const,
      value: 11.2,
      threshold: 7.0,
    },
    {
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      parameter: "Gearbox Temperature",
      type: "Temperature Spike",
      severity: "info" as const,
      status: "acknowledged" as const,
      value: 85.5,
      threshold: 80.0,
    },
    {
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      parameter: "Power Output",
      type: "Performance Drop",
      severity: "info" as const,
      status: "resolved" as const,
      value: 1200,
      threshold: 1500,
    },
  ];

  const filteredAnomalies = selectedSeverity
    ? anomalies.filter((a) => a.severity === selectedSeverity)
    : anomalies;

  const radarData = useMemo(() => [
    { subject: "Power Output", this: 85, fleet: 82 },
    { subject: "Availability", this: 98, fleet: 96 },
    { subject: "Efficiency", this: 92, fleet: 90 },
    { subject: "Health Score", this: turbine.health_score || 94, fleet: 91 },
    { subject: "Vibration", this: 88, fleet: 85 },
    { subject: "Temp Control", this: 90, fleet: 88 },
  ], [turbine.health_score]);

  const healthHistory = useMemo(() => {
    const baseHealth = turbine.health_score || 94;
    return Array.from({ length: 90 }, (_, i) => ({
      date: subDays(new Date(), 90 - i),
      health: baseHealth - (i * 0.02),
      projected: i > 75 ? baseHealth - (i * 0.02) : null,
    }));
  }, [turbine.health_score]);

  return (
    <div className="space-y-6">
      {/* Health Score Dashboard */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health Score Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-muted"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${turbine.health_score}, 100`}
                  className={
                    turbine.health_score >= 90
                      ? "text-emerald-500"
                      : turbine.health_score >= 70
                      ? "text-amber-500"
                      : "text-rose-500"
                  }
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-3xl font-bold ${
                    turbine.health_score >= 90
                      ? "text-emerald-500"
                      : turbine.health_score >= 70
                      ? "text-amber-500"
                      : "text-rose-500"
                  }`}
                >
                  {turbine.health_score.toFixed(1)}%
                </span>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                turbine.health_score >= 90
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                  : turbine.health_score >= 70
                  ? "bg-amber-500/10 text-amber-700 border-amber-200"
                  : "bg-rose-500/10 text-rose-700 border-rose-200"
              }
            >
              {turbine.status.charAt(0).toUpperCase() + turbine.status.slice(1)}
            </Badge>
          </div>
          <div className="grid grid-cols-5 gap-4 mt-6">
            {components.map((comp) => {
              const Icon = comp.icon;
              const healthColor =
                comp.health >= 90
                  ? "text-emerald-500"
                  : comp.health >= 70
                  ? "text-amber-500"
                  : "text-rose-500";
              return (
                <Card key={comp.name} className="text-center">
                  <CardContent className="pt-6">
                    <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">{comp.name}</p>
                    <p className={`text-xl font-bold ${healthColor}`}>{comp.health.toFixed(0)}%</p>
                    <Badge
                      variant="outline"
                      className={`mt-2 ${
                        comp.health >= 90
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                          : comp.health >= 70
                          ? "bg-amber-500/10 text-amber-700 border-amber-200"
                          : "bg-rose-500/10 text-rose-700 border-rose-200"
                      }`}
                    >
                      {comp.health >= 90 ? "Good" : comp.health >= 70 ? "Fair" : "Poor"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Predictive Maintenance Panel */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Remaining Useful Life (RUL)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(rulData).map(([component, data]) => {
            const days = data.value;
            const maxDays = component === "gearbox" ? 365 : component === "blades" ? 730 : component === "generator" ? 1095 : 540;
            const percent = (days / maxDays) * 100;
            const color =
              days > 180
                ? "bg-emerald-500"
                : days > 90
                ? "bg-amber-500"
                : "bg-rose-500";
            return (
              <div key={component} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {days < 90 && <AlertTriangle className="h-4 w-4 text-rose-500" />}
                    <span className="font-medium capitalize">{component.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(days)} days
                    </span>
                    <Badge variant="outline" className="text-xs">
                      ±{Math.floor(days * (1 - data.confidence))} days
                    </Badge>
                  </div>
                </div>
                <Progress value={percent} className={`h-3 ${color}`} />
                <p className="text-xs text-muted-foreground">
                  Confidence: {(data.confidence * 100).toFixed(0)}%
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>30-day Failure Prob.</TableHead>
                <TableHead>60-day</TableHead>
                <TableHead>90-day</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riskData.map((risk) => {
                const riskColor =
                  risk.riskScore >= 80
                    ? "bg-rose-500"
                    : risk.riskScore >= 50
                    ? "bg-amber-500"
                    : risk.riskScore >= 20
                    ? "bg-yellow-500"
                    : "bg-emerald-500";
                return (
                  <TableRow key={risk.component} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{risk.component}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${riskColor} text-white border-0`}
                      >
                        {risk.riskScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>{risk.prob30d}%</TableCell>
                    <TableCell>{risk.prob60d}%</TableCell>
                    <TableCell>{risk.prob90d}%</TableCell>
                    <TableCell>
                      {risk.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-rose-500" />
                      ) : risk.trend === "down" ? (
                        <TrendingDown className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Maintenance Recommendations */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Maintenance Recommendations
            {isLoadingAnalytics && <Loader2 className="h-4 w-4 animate-spin" />}
            {analyticsData?.maintenance_recommendations && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">
                <Brain className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error loading recommendations</AlertTitle>
              <AlertDescription>{analyticsError}</AlertDescription>
            </Alert>
          )}
          {isLoadingAnalytics ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading AI recommendations...</span>
            </div>
          ) : maintenanceRecommendations.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No maintenance recommendations at this time.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {maintenanceRecommendations.map((rec, idx) => {
              const priorityColor =
                rec.priority === "high"
                  ? "bg-rose-500"
                  : rec.priority === "medium"
                  ? "bg-amber-500"
                  : "bg-blue-500";
              return (
                <AccordionItem key={idx} value={`item-${idx}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`${priorityColor} text-white border-0`}>
                        {rec.priority.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{rec.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {safeFormatDate(rec.date)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <p className="text-sm">{rec.description}</p>
                      <div>
                        <p className="text-sm font-medium mb-1">Root Cause / Reasoning:</p>
                        <p className="text-sm text-muted-foreground">{rec.rootCause}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Estimated Cost Impact</p>
                          <p className="text-sm text-muted-foreground">{rec.costImpact}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Suggested Action Date</p>
                          <p className="text-sm text-muted-foreground">
                            {safeFormatDate(rec.actionDate)}
                          </p>
                        </div>
                      </div>
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Impact if Ignored</AlertTitle>
                        <AlertDescription className="text-sm">{rec.impact}</AlertDescription>
                      </Alert>
                      <Button>
                        <Wrench className="h-4 w-4 mr-2" />
                        Create Maintenance Task
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Anomaly Detection Log */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Anomaly Detection Log</CardTitle>
            <div className="flex items-center gap-2">
              <ToggleGroup type="single" value={selectedSeverity || undefined} onValueChange={(value) => setSelectedSeverity(value || null)}>
                <ToggleGroupItem value="info">Info</ToggleGroupItem>
                <ToggleGroupItem value="warning">Warning</ToggleGroupItem>
                <ToggleGroupItem value="critical">Critical</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Parameter</TableHead>
                <TableHead>Anomaly Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnomalies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No anomalies detected</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnomalies.map((anomaly, idx) => {
                  const severityColors = {
                    info: "bg-blue-500",
                    warning: "bg-amber-500",
                    critical: "bg-rose-500",
                  };
                  const statusColors = {
                    new: "bg-blue-500/10 text-blue-700 border-blue-200",
                    acknowledged: "bg-amber-500/10 text-amber-700 border-amber-200",
                    investigating: "bg-purple-500/10 text-purple-700 border-purple-200",
                    resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
                  };
                  return (
                    <TableRow key={idx} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>{safeFormatDate(anomaly.timestamp, "MMM d, HH:mm")}</TableCell>
                      <TableCell className="font-medium">{anomaly.parameter}</TableCell>
                      <TableCell>{anomaly.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${severityColors[anomaly.severity]} text-white border-0`}
                        >
                          {anomaly.severity.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[anomaly.status]}>
                          {anomaly.status.charAt(0).toUpperCase() + anomaly.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">View Details</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{anomaly.type}</DialogTitle>
                              <DialogDescription>
                                {safeFormatDate(anomaly.timestamp, "MMM d, yyyy HH:mm:ss")}
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[400px]">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm font-medium">Parameter: {anomaly.parameter}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Value: {anomaly.value} (Threshold: {anomaly.threshold})
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">AI Analysis:</p>
                                  <p className="text-sm text-muted-foreground">
                                    This anomaly was detected through pattern analysis. The parameter exceeded
                                    its normal operating range, indicating potential equipment stress or wear.
                                    Further investigation recommended.
                                  </p>
                                </div>
                              </div>
                            </ScrollArea>
                            <DialogFooter>
                              <Button variant="outline">Close</Button>
                              <Button>Mark as Resolved</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Performance Comparison */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Performance vs Fleet Average</CardTitle>
            <ToggleGroup type="single" value={comparisonMode} onValueChange={(value) => value && setComparisonMode(value as typeof comparisonMode)}>
              <ToggleGroupItem value="fleet">Fleet Avg</ToggleGroupItem>
              <ToggleGroupItem value="best">Best Performer</ToggleGroupItem>
              <ToggleGroupItem value="similar">Similar Turbines</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                name="This Turbine"
                dataKey="this"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                isAnimationActive={false}
              />
              <Radar
                name="Fleet Average"
                dataKey="fleet"
                stroke="#94a3b8"
                fill="#94a3b8"
                fillOpacity={0.3}
                isAnimationActive={false}
              />
              <RechartsTooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

