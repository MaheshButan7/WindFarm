"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, AlertOctagon, Clock, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { AlertStats as AlertStatsType } from "@/lib/types";

interface AlertStatsProps {
  stats: AlertStatsType | null;
}

export function AlertStats({ stats }: AlertStatsProps) {
  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
              <div className="h-2 w-full bg-slate-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getActiveColor = () => {
    if (stats.activeAlerts > 10) return "text-rose-600";
    if (stats.activeAlerts >= 5) return "text-amber-600";
    return "text-emerald-600";
  };

  const getResolutionColor = () => {
    if (stats.resolutionRate >= 90) return "text-emerald-600";
    if (stats.resolutionRate >= 70) return "text-amber-600";
    return "text-rose-600";
  };

  const sparklineData = stats.activeTrend.map((value, index) => ({
    time: index,
    value,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Active Alerts Card */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Alerts
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${getActiveColor()}`} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={`text-3xl font-bold ${getActiveColor()}`}>
            {stats.activeAlerts}
          </div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={stats.activeAlerts > 10 ? "#dc2626" : stats.activeAlerts >= 5 ? "#f59e0b" : "#10b981"}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">Last 24 hours trend</p>
        </CardContent>
      </Card>

      {/* Critical Severity Card */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical Severity
            </CardTitle>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold text-rose-600">
            {stats.criticalAlerts}
          </div>
          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-200">
            {stats.criticalAlerts > 0
              ? `${Math.round((stats.criticalAlerts / stats.activeAlerts) * 100)}% of active`
              : "0%"}
          </Badge>
        </CardContent>
      </Card>

      {/* Avg Response Time Card */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold">
              {stats.avgResponseTime}
            </div>
            <span className="text-sm text-muted-foreground">min</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {stats.avgResponseTime < 10 ? (
              <>
                <TrendingDown className="h-3 w-3 text-emerald-600" />
                <span>Improving</span>
              </>
            ) : (
              <>
                <TrendingUp className="h-3 w-3 text-rose-600" />
                <span>Needs attention</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resolution Rate Card */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolution Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={`text-3xl font-bold ${getResolutionColor()}`}>
            {stats.resolutionRate}%
          </div>
          <Progress
            value={stats.resolutionRate}
            className={`h-2 ${
              stats.resolutionRate >= 90
                ? "[&>div]:bg-emerald-500"
                : stats.resolutionRate >= 70
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-rose-500"
            }`}
          />
          <p className="text-xs text-muted-foreground">
            Resolved within SLA
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


