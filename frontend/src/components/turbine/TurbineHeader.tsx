"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, Download, Share2, Settings, AlertTriangle, RotateCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import type { TurbineData } from "@/lib/types";

interface TurbineHeaderProps {
  turbine: TurbineData | null;
  onRefresh?: () => void;
  lastUpdated?: Date;
}

export function TurbineHeader({ turbine, onRefresh, lastUpdated }: TurbineHeaderProps) {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>("");

  useEffect(() => {
    if (!lastUpdated) {
      setTimeSinceUpdate("Never");
      return;
    }
    
    // Validate that lastUpdated is a valid Date
    const date = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
    if (isNaN(date.getTime())) {
      setTimeSinceUpdate("Invalid date");
      return;
    }
    
    const updateTime = () => {
      try {
        setTimeSinceUpdate(formatDistanceToNow(date, { addSuffix: true }));
      } catch (error) {
        setTimeSinceUpdate("Unknown");
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (!turbine) {
    return (
      <div className="border-b bg-white dark:bg-slate-900 shadow-sm -mx-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  const statusColors = {
    online: "bg-emerald-500",
    warning: "bg-amber-500",
    critical: "bg-rose-500",
    offline: "bg-slate-400",
    unknown: "bg-slate-400",
  };

  const healthColor =
    turbine.health_score >= 90
      ? "text-emerald-500"
      : turbine.health_score >= 70
      ? "text-amber-500"
      : "text-rose-500";

  // Calculate next maintenance (mock - 12 days from now)
  const nextMaintenance = new Date();
  nextMaintenance.setDate(nextMaintenance.getDate() + 12);
  const daysUntilMaintenance = Math.ceil(
    (nextMaintenance.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Mock alert count
  const alertCount = turbine.status === "critical" ? 3 : turbine.status === "warning" ? 1 : 0;

  return (
    <div className="border-b bg-white dark:bg-slate-900 shadow-sm -mx-6 px-6 py-4">
      <div className="flex flex-col gap-4">
        {/* Top Row: Title and Actions */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">
                TURBINE {turbine.turbine_id} - North Wing A
              </h1>
              <Badge
                variant="outline"
                className={`${statusColors[turbine.status]} text-white border-0 flex items-center gap-1.5`}
              >
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                {turbine.status.charAt(0).toUpperCase() + turbine.status.slice(1)}
              </Badge>
              {alertCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {alertCount} Alert{alertCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Last updated: {timeSinceUpdate || (lastUpdated ? "Calculating..." : "Never")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RotateCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Bottom Row: Health Score, Maintenance, etc */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Health Score */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
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
                  className={healthColor}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${healthColor}`}>
                  {turbine.health_score.toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Health Score</p>
              <p className="text-xs text-muted-foreground">Overall system health</p>
            </div>
          </div>

          {/* Next Maintenance */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Next Maintenance</p>
              <p className="text-xs text-muted-foreground">
                {daysUntilMaintenance} day{daysUntilMaintenance !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Capacity */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <span className="text-emerald-500 font-bold text-lg">⚡</span>
            </div>
            <div>
              <p className="text-sm font-medium">Capacity</p>
              <p className="text-xs text-muted-foreground">
                {turbine.capacity_kw?.toFixed(0) || "2000"} kW
              </p>
            </div>
          </div>

          {/* Uptime Today */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <span className="text-blue-500 font-bold text-lg">⏱</span>
            </div>
            <div>
              <p className="text-sm font-medium">Uptime Today</p>
              <p className="text-xs text-muted-foreground">
                {turbine.status === "online" ? "99.2%" : "0%"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

