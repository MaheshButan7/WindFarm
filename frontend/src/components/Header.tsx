"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";

export function Header() {
  const kpis = useAppStore((state) => state.farm.kpis);
  const alerts = useAppStore((state) => state.alerts.items);
  const unreadCount = alerts.filter((a) => !a.isRead && (a.status === "active" || a.status === "acknowledged")).length;
  const criticalCount = alerts.filter((a) => a.severity === "critical" && a.status === "active").length;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Wind Farm</h2>
        {kpis && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Health: {kpis.farm_health_pct.toFixed(1)}%</span>
            <span>Online: {kpis.turbines_online}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Link href="/alerts" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          {criticalCount > 0 && unreadCount === 0 && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-rose-500 rounded-full animate-pulse" />
          )}
        </Link>
      </div>
    </header>
  );
}
