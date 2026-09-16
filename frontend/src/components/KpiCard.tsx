"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  unit: string;
  sparklineData: { time: number; value: number }[];
  badge: "online" | "offline" | "normal" | "healthy" | "warning" | "critical";
  icon?: LucideIcon;
  trend?: number;
}

export function KpiCard({ title, value, unit, sparklineData, badge, icon: Icon, trend }: KpiCardProps) {
  const badgeConfig = {
    online: { color: "bg-emerald-500", label: "Online" },
    offline: { color: "bg-slate-400", label: "Offline" },
    normal: { color: "bg-blue-500", label: "Normal" },
    healthy: { color: "bg-emerald-500", label: "Healthy" },
    warning: { color: "bg-amber-500", label: "Warning" },
    critical: { color: "bg-rose-500", label: "Critical" },
  };

  const config = badgeConfig[badge];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            )}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
          </div>
          <Badge variant="outline" className={`${config.color} text-white border-0 px-2 py-0.5`}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">{value}</span>
            <span className="text-sm font-medium text-muted-foreground">{unit}</span>
            {trend !== undefined && (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
          </div>
          {sparklineData.length > 0 && (
            <div className="h-[60px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="currentColor" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="currentColor" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="currentColor"
                    strokeWidth={2}
                    fill={`url(#gradient-${title.replace(/\s+/g, '-')})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
