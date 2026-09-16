/**
 * Zustand store for global application state
 */
import { create } from "zustand";
import type {
  FarmKPIs,
  TurbineState,
  TimeSeriesStore,
  AnalyticsStore,
  UIState,
  TimeSeriesPoint,
  Alert,
  AlertStats,
  AlertFilters,
} from "./types";

interface AppState {
  // Farm state
  farm: {
    kpis: FarmKPIs | null;
    turbines: TurbineState[];
    selectedTurbineIds: string[];
  };

  // Time series data
  timeseries: TimeSeriesStore;

  // Analytics
  analytics: AnalyticsStore;

  // UI state
  ui: UIState;

  // Alerts state
  alerts: {
    items: Alert[];
    stats: AlertStats | null;
    filters: AlertFilters;
    selectedAlertIds: string[];
  };

  // Actions
  setFarmKPIs: (kpis: FarmKPIs) => void;
  setTurbines: (turbines: TurbineState[]) => void;
  updateTurbine: (turbineId: string, updates: Partial<TurbineState>) => void;
  addTimeSeriesPoint: (
    turbineId: string,
    signalName: string,
    point: TimeSeriesPoint
  ) => void;
  setTimeSeries: (
    turbineId: string,
    signalName: string,
    points: TimeSeriesPoint[]
  ) => void;
  updateAnalytics: (
    turbineId: string,
    updates: Partial<AnalyticsStore>
  ) => void;
  setSelectedTurbine: (turbineId: string | null) => void;
  toggleDialog: (dialogId: string, open?: boolean) => void;
  setFilters: (filters: Partial<UIState["filters"]>) => void;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (alertId: string, updates: Partial<Alert>) => void;
  acknowledgeAlert: (alertId: string, userId: string) => void;
  resolveAlert: (alertId: string, resolutionData: Partial<Alert>) => void;
  dismissAlert: (alertId: string) => void;
  markAlertsRead: (alertIds: string[]) => void;
  setAlertFilters: (filters: Partial<AlertFilters>) => void;
  setAlertStats: (stats: AlertStats) => void;
  toggleAlertSelection: (alertId: string) => void;
  selectAllAlerts: (alertIds: string[]) => void;
  clearAlertSelection: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  farm: {
    kpis: null,
    turbines: [],
    selectedTurbineIds: [],
  },

  timeseries: {},

  analytics: {
    health_scores: {},
    risks: {},
    rul: {},
  },

  ui: {
    selectedTurbine: null,
    openDialogs: {},
    filters: {},
  },

  alerts: {
    items: [],
    stats: null,
    filters: {
      status: [],
      severity: [],
      type: [],
      turbines: [],
    },
    selectedAlertIds: [],
  },

  setFarmKPIs: (kpis) =>
    set((state) => ({
      farm: { ...state.farm, kpis },
    })),

  setTurbines: (turbines) =>
    set((state) => ({
      farm: { ...state.farm, turbines },
    })),

  updateTurbine: (turbineId, updates) =>
    set((state) => ({
      farm: {
        ...state.farm,
        turbines: state.farm.turbines.map((t) =>
          t.turbine_id === turbineId ? { ...t, ...updates } : t
        ),
      },
    })),

  addTimeSeriesPoint: (turbineId, signalName, point) =>
    set((state) => {
      const turbineSeries = state.timeseries[turbineId] || {};
      const signalSeries = turbineSeries[signalName] || [];
      const updated = [...signalSeries, point];
      
      // Keep only last 1800 points (1 hour at 2s cadence)
      const trimmed = updated.slice(-1800);

      return {
        timeseries: {
          ...state.timeseries,
          [turbineId]: {
            ...turbineSeries,
            [signalName]: trimmed,
          },
        },
      };
    }),

  setTimeSeries: (turbineId, signalName, points) =>
    set((state) => ({
      timeseries: {
        ...state.timeseries,
        [turbineId]: {
          ...state.timeseries[turbineId],
          [signalName]: points,
        },
      },
    })),

  updateAnalytics: (turbineId, updates) =>
    set((state) => ({
      analytics: {
        health_scores: updates.health_scores
          ? { ...state.analytics.health_scores, [turbineId]: updates.health_scores[turbineId] }
          : state.analytics.health_scores,
        risks: updates.risks
          ? { ...state.analytics.risks, [turbineId]: updates.risks[turbineId] }
          : state.analytics.risks,
        rul: updates.rul
          ? { ...state.analytics.rul, [turbineId]: updates.rul[turbineId] }
          : state.analytics.rul,
      },
    })),

  setSelectedTurbine: (turbineId) =>
    set((state) => ({
      ui: { ...state.ui, selectedTurbine: turbineId },
    })),

  toggleDialog: (dialogId, open) =>
    set((state) => ({
      ui: {
        ...state.ui,
        openDialogs: {
          ...state.ui.openDialogs,
          [dialogId]: open ?? !state.ui.openDialogs[dialogId],
        },
      },
    })),

  setFilters: (filters) =>
    set((state) => ({
      ui: {
        ...state.ui,
        filters: { ...state.ui.filters, ...filters },
      },
    })),

  setAlerts: (alerts) =>
    set((state) => ({
      alerts: { ...state.alerts, items: alerts },
    })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        items: [alert, ...state.alerts.items],
      },
    })),

  updateAlert: (alertId, updates) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        items: state.alerts.items.map((alert) =>
          alert.id === alertId ? { ...alert, ...updates } : alert
        ),
      },
    })),

  acknowledgeAlert: (alertId, userId) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        items: state.alerts.items.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status: "acknowledged" as const,
                acknowledgedAt: new Date(),
                assignedTo: userId,
                timeline: [
                  ...alert.timeline,
                  {
                    timestamp: new Date(),
                    event: "Alert acknowledged",
                    user: userId,
                    icon: "check",
                  },
                ],
              }
            : alert
        ),
      },
    })),

  resolveAlert: (alertId, resolutionData) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        items: state.alerts.items.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status: "resolved" as const,
                resolvedAt: new Date(),
                ...resolutionData,
                timeline: [
                  ...alert.timeline,
                  {
                    timestamp: new Date(),
                    event: "Alert resolved",
                    user: resolutionData.assignedTo || alert.assignedTo || "System",
                    note: resolutionData.actionsTaken,
                    icon: "check-circle",
                  },
                ],
              }
            : alert
        ),
      },
    })),

  dismissAlert: (alertId) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        items: state.alerts.items.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status: "dismissed" as const,
                timeline: [
                  ...alert.timeline,
                  {
                    timestamp: new Date(),
                    event: "Alert dismissed",
                    user: alert.assignedTo || "System",
                    icon: "x",
                  },
                ],
              }
            : alert
        ),
      },
    })),

  markAlertsRead: (alertIds) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        items: state.alerts.items.map((alert) =>
          alertIds.includes(alert.id) ? { ...alert, isRead: true } : alert
        ),
      },
    })),

  setAlertFilters: (filters) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        filters: { ...state.alerts.filters, ...filters },
      },
    })),

  setAlertStats: (stats) =>
    set((state) => ({
      alerts: { ...state.alerts, stats },
    })),

  toggleAlertSelection: (alertId) =>
    set((state) => {
      const isSelected = state.alerts.selectedAlertIds.includes(alertId);
      return {
        alerts: {
          ...state.alerts,
          selectedAlertIds: isSelected
            ? state.alerts.selectedAlertIds.filter((id) => id !== alertId)
            : [...state.alerts.selectedAlertIds, alertId],
        },
      };
    }),

  selectAllAlerts: (alertIds) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        selectedAlertIds: alertIds,
      },
    })),

  clearAlertSelection: () =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        selectedAlertIds: [],
      },
    })),
}));

