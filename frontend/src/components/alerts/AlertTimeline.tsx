"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import type { Alert } from "@/lib/types";

interface AlertTimelineProps {
  alerts: Alert[];
  onAlertClick: (alert: Alert) => void;
}

export function AlertTimeline({ alerts, onAlertClick }: AlertTimelineProps) {
  const groupedAlerts = useMemo(() => {
    const groups: Record<string, Alert[]> = {
      "Today": [],
      "Yesterday": [],
      "This Week": [],
      "This Month": [],
      "Older": [],
    };

    alerts.forEach((alert) => {
      if (isToday(alert.triggeredAt)) {
        groups["Today"].push(alert);
      } else if (isYesterday(alert.triggeredAt)) {
        groups["Yesterday"].push(alert);
      } else if (isThisWeek(alert.triggeredAt)) {
        groups["This Week"].push(alert);
      } else if (isThisMonth(alert.triggeredAt)) {
        groups["This Month"].push(alert);
      } else {
        groups["Older"].push(alert);
      }
    });

    return Object.entries(groups).filter(([_, alerts]) => alerts.length > 0);
  }, [alerts]);

  const getSeverityColor = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-rose-600";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-400px)]">
      <div className="space-y-6 pr-4">
        {groupedAlerts.map(([dateLabel, dateAlerts]) => (
          <div key={dateLabel} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{dateLabel}</h3>
              <Separator className="flex-1" />
              <Badge variant="outline">{dateAlerts.length}</Badge>
            </div>
            <div className="relative pl-6">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-3">
                {dateAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${getSeverityColor(alert.severity)}`}
                    onClick={() => onAlertClick(alert)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {alert.severity}
                            </Badge>
                            <span className="text-sm font-medium">{alert.turbineId}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(alert.triggeredAt, "HH:mm")}
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {alert.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}


