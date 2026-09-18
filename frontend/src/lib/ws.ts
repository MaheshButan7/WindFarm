/**
 * WebSocket connection manager for live updates
 */
import { io, Socket } from "socket.io-client";
import type { WSMessage } from "./types";
import { useAppStore } from "./store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080";

class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.socket.on("connect", () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      this.reconnectAttempts++;
    });

    this.socket.on("message", (message: WSMessage) => {
      this.handleMessage(message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(turbineIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit("subscribe", { turbine_ids: turbineIds });
    }
  }

  private handleMessage(message: WSMessage): void {
    const store = useAppStore.getState();

    switch (message.type) {
      case "tick":
        // Update time series with tick data
        Object.entries(message.signals).forEach(([signalName, value]) => {
          if (value !== undefined && value !== null) {
            if (signalName === "pitch_deg" && typeof value === "object") {
              // Handle pitch_deg separately
              const pitch = value as { A: number; B: number; C: number };
              store.addTimeSeriesPoint(message.turbine_id, "pitch_deg_A", {
                timestamp: message.ts,
                value: pitch.A,
              });
              store.addTimeSeriesPoint(message.turbine_id, "pitch_deg_B", {
                timestamp: message.ts,
                value: pitch.B,
              });
              store.addTimeSeriesPoint(message.turbine_id, "pitch_deg_C", {
                timestamp: message.ts,
                value: pitch.C,
              });
            } else if (typeof value === "number") {
              store.addTimeSeriesPoint(message.turbine_id, signalName, {
                timestamp: message.ts,
                value,
              });
            }
          }
        });

        // Update latest values in turbine state
        store.updateTurbine(message.turbine_id, {
          latest_values: {
            ...store.farm.turbines.find(
              (t) => t.turbine_id === message.turbine_id
            )?.latest_values,
            ...Object.fromEntries(
              Object.entries(message.signals).filter(
                ([_, v]) => typeof v === "number"
              )
            ),
          } as Record<string, number>,
        });
        break;

      case "agg":
        // Update health score
        store.updateTurbine(message.turbine_id, {
          health_score: message.health_score,
        });

        // Update health score history
        const healthHistory =
          store.analytics.health_scores[message.turbine_id]?.history || [];
        healthHistory.push({
          timestamp: message.ts,
          value: message.health_score,
        });
        store.updateAnalytics(message.turbine_id, {
          health_scores: {
            [message.turbine_id]: {
              value: message.health_score,
              history: healthHistory.slice(-1440), // Keep last 24h
            },
          },
        });
        break;

      case "alert":
        // Handle alerts (could trigger toast notifications)
        console.warn("Alert received:", message);
        // You can integrate with toast/sonner here
        break;

      case "meta":
        // Update metadata
        store.updateTurbine(message.turbine_id, {
          capacity_kw: message.meta.capacity_kw,
          generator_type: message.meta.generator_type || undefined,
        });
        break;

      case "forecast":
        // Handle forecast updates
        console.log("Forecast received:", message);
        break;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();

