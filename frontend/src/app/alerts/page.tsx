"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Download, Settings, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { fetchAlerts, fetchAlertStats } from "@/lib/api";
import { AlertStats } from "@/components/alerts/AlertStats";
import { AlertFilters } from "@/components/alerts/AlertFilters";
import { AlertsList } from "@/components/alerts/AlertsList";
import { AlertDetailDialog } from "@/components/alerts/AlertDetailDialog";
import { AlertTimeline } from "@/components/alerts/AlertTimeline";
import { toast } from "sonner";
import type { Alert, AlertFilters as AlertFiltersType } from "@/lib/types";

export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid" | "timeline">("list");
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const alerts = useAppStore((state) => state.alerts.items);
  const stats = useAppStore((state) => state.alerts.stats);
  const filters = useAppStore((state) => state.alerts.filters);
  const setAlerts = useAppStore((state) => state.setAlerts);
  const setAlertStats = useAppStore((state) => state.setAlertStats);
  const setAlertFilters = useAppStore((state) => state.setAlertFilters);
  const acknowledgeAlert = useAppStore((state) => state.acknowledgeAlert);
  const resolveAlert = useAppStore((state) => state.resolveAlert);
  const dismissAlert = useAppStore((state) => state.dismissAlert);
  const markAlertsRead = useAppStore((state) => state.markAlertsRead);
  const clearAlertSelection = useAppStore((state) => state.clearAlertSelection);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true);
        const [alertsData, statsData] = await Promise.all([
          fetchAlerts(),
          fetchAlertStats(),
        ]);
        setAlerts(alertsData);
        setAlertStats(statsData);
      } catch (error) {
        console.error("Failed to load alerts:", error);
        toast.error("Failed to load alerts");
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [setAlerts, setAlertStats]);

  // Filter alerts based on filters
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter((alert) => filters.status.includes(alert.status));
    }

    // Severity filter
    if (filters.severity.length > 0) {
      filtered = filtered.filter((alert) => filters.severity.includes(alert.severity));
    }

    // Type filter
    if (filters.type.length > 0) {
      filtered = filtered.filter((alert) => filters.type.includes(alert.type));
    }

    // Turbine filter
    if (filters.turbines.length > 0) {
      filtered = filtered.filter((alert) => filters.turbines.includes(alert.turbineId));
    }

    // Date range filter
    if (filters.dateRange?.start) {
      filtered = filtered.filter(
        (alert) => alert.triggeredAt >= filters.dateRange!.start!
      );
    }
    if (filters.dateRange?.end) {
      filtered = filtered.filter(
        (alert) => alert.triggeredAt <= filters.dateRange!.end!
      );
    }

    // Assigned filter
    if (filters.assignedTo) {
      if (filters.assignedTo === "unassigned") {
        filtered = filtered.filter((alert) => !alert.assignedTo);
      } else if (filters.assignedTo === "me") {
        // In real app, would check current user
        filtered = filtered.filter((alert) => alert.assignedTo === "user1");
      } else {
        filtered = filtered.filter((alert) => alert.assignedTo === filters.assignedTo);
      }
    }

    // Priority filter
    if (filters.priority) {
      filtered = filtered.filter((alert) => alert.priority === filters.priority);
    }

    return filtered;
  }, [alerts, filters]);

  const activeAlerts = filteredAlerts.filter((a) => a.status === "active").length;
  const unacknowledgedAlerts = filteredAlerts.filter(
    (a) => a.status === "active" || a.status === "acknowledged"
  ).length;
  const criticalAlerts = filteredAlerts.filter((a) => a.severity === "critical").length;
  const latestAlert = filteredAlerts[0];

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert(alertId, "current-user");
    toast.success("Alert acknowledged");
  };

  const handleResolve = (alertId: string, data: Partial<Alert>) => {
    resolveAlert(alertId, data);
    toast.success("Alert resolved");
  };

  const handleDismiss = (alertId: string) => {
    dismissAlert(alertId);
    toast.success("Alert dismissed");
  };

  const handleAssign = (alertId: string, userId?: string) => {
    if (userId) {
      // In real app, would call API
      toast.success("Alert assigned");
    }
  };

  const handleMarkAllRead = () => {
    const unreadIds = filteredAlerts.filter((a) => !a.isRead).map((a) => a.id);
    markAlertsRead(unreadIds);
    toast.success(`Marked ${unreadIds.length} alerts as read`);
  };

  const handleExport = () => {
    // In real app, would generate CSV/PDF
    toast.info("Export functionality coming soon");
  };

  const handleResetFilters = () => {
    setAlertFilters({
      status: [],
      severity: [],
      type: [],
      turbines: [],
      dateRange: undefined,
      assignedTo: undefined,
      priority: undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Alerts & Notifications
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time monitoring and anomaly detection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Alerts
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="flex items-center gap-4 flex-wrap">
          <Badge variant="destructive" className="text-sm px-3 py-1">
            Active: {activeAlerts}
          </Badge>
          <Badge variant="outline" className="bg-amber-500 text-white border-amber-500 text-sm px-3 py-1">
            Unacknowledged: {unacknowledgedAlerts}
          </Badge>
          <Badge variant="outline" className="bg-rose-600 text-white border-rose-600 text-sm px-3 py-1">
            Critical: {criticalAlerts}
          </Badge>
          {latestAlert && (
            <span className="text-sm text-muted-foreground">
              Latest: {new Date(latestAlert.triggeredAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Alert Statistics */}
      <AlertStats stats={stats} />

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <AlertFilters
            alerts={filteredAlerts}
            filters={filters}
            onFiltersChange={(newFilters) => setAlertFilters(newFilters)}
            onReset={handleResetFilters}
          />
        </div>

        {/* Alerts List */}
        <div className="lg:col-span-3">
          {viewMode === "timeline" ? (
            <AlertTimeline
              alerts={filteredAlerts}
              onAlertClick={(alert) => setSelectedAlert(alert)}
            />
          ) : (
            <AlertsList
              alerts={filteredAlerts}
              loading={loading}
              onAlertClick={(alert) => setSelectedAlert(alert)}
              onAcknowledge={handleAcknowledge}
              onDismiss={handleDismiss}
              onAssign={(alertId) => handleAssign(alertId)}
            />
          )}
        </div>
      </div>

      {/* Alert Detail Dialog */}
      <AlertDetailDialog
        alert={selectedAlert}
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
        onAssign={(alertId, userId) => handleAssign(alertId, userId)}
      />
    </div>
  );
}
