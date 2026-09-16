"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { fetchSnapshot } from "@/lib/api";
import { wsManager } from "@/lib/ws";
import { TurbineHeader } from "@/components/turbine/TurbineHeader";
import { LiveTab } from "@/components/turbine/LiveTab";
import { TrendsTab } from "@/components/turbine/TrendsTab";
import { AnalyticsTab } from "@/components/turbine/AnalyticsTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, TrendingUp, Brain, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { Badge } from "@/components/ui/badge";
import type { TurbineData } from "@/lib/types";

export default function TurbineDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const turbineId = params.id as string;
  const tab = searchParams.get("tab") || "live";

  const farm = useAppStore((state) => state.farm);
  const timeseries = useAppStore((state) => state.timeseries);
  const setFarmKPIs = useAppStore((state) => state.setFarmKPIs);
  const setTurbines = useAppStore((state) => state.setTurbines);
  const setTimeSeries = useAppStore((state) => state.setTimeSeries);
  const updateTurbine = useAppStore((state) => state.updateTurbine);

  const [selectedTurbineId, setSelectedTurbineId] = useState<string>(turbineId);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const turbineTimeseries = useMemo(() => {
    return timeseries[selectedTurbineId] || {};
  }, [timeseries, selectedTurbineId]);

  const turbine = useMemo(() => {
    const found = farm.turbines.find((t) => t.turbine_id === selectedTurbineId);
    if (!found) return null;
    // Convert TurbineState to TurbineData by adding timeseries
    // Convert timeseries format from TimeSeriesPoint[] to [string, number][]
    const formattedTimeseries: Record<string, [string, number][]> = {};
    Object.entries(turbineTimeseries).forEach(([signalName, points]) => {
      formattedTimeseries[signalName] = points.map((p) => [p.timestamp, p.value]);
    });
    return {
      ...found,
      timeseries: formattedTimeseries,
    } as TurbineData;
  }, [farm.turbines, selectedTurbineId, turbineTimeseries]);

  // Get turbine index for navigation
  const turbineIndex = useMemo(() => {
    return farm.turbines.findIndex((t) => t.turbine_id === selectedTurbineId);
  }, [farm.turbines, selectedTurbineId]);

  const previousTurbine = useMemo(() => {
    if (turbineIndex > 0) {
      return farm.turbines[turbineIndex - 1];
    }
    return null;
  }, [farm.turbines, turbineIndex]);

  const nextTurbine = useMemo(() => {
    if (turbineIndex < farm.turbines.length - 1) {
      return farm.turbines[turbineIndex + 1];
    }
    return null;
  }, [farm.turbines, turbineIndex]);

  useEffect(() => {
    // Update URL when turbine selection changes
    if (selectedTurbineId !== turbineId) {
      router.push(`/turbine/${selectedTurbineId}?tab=${tab}`);
    }
  }, [selectedTurbineId, turbineId, tab, router]);

  useEffect(() => {
    // Fetch initial snapshot
    setIsLoading(true);
    fetchSnapshot("30m")
      .then((data) => {
        setFarmKPIs(data.farm_kpis);
        setTurbines(data.turbines);

        // Convert timeseries data to store format
        data.turbines.forEach((turbine) => {
          Object.entries(turbine.timeseries).forEach(([signalName, points]) => {
            const formattedPoints = points.map(([timestamp, value]) => ({
              timestamp,
              value,
            }));
            setTimeSeries(turbine.turbine_id, signalName, formattedPoints);
          });
        });

        // Connect WebSocket
        wsManager.connect();
        wsManager.subscribe(data.turbines.map((t) => t.turbine_id));

        setLastUpdated(new Date());
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch snapshot:", error);
        setIsLoading(false);
      });

    return () => {
      wsManager.disconnect();
    };
  }, [setFarmKPIs, setTurbines, setTimeSeries]);

  // Handle WebSocket updates - messages are handled by wsManager internally
  // Update lastUpdated only when turbine's last_update timestamp changes
  useEffect(() => {
    if (turbine?.last_update) {
      const updateTime = new Date(turbine.last_update);
      // Validate the date before using it
      if (!isNaN(updateTime.getTime())) {
        // Only update if the timestamp is actually different
        setLastUpdated((prev) => {
          if (prev.getTime() !== updateTime.getTime()) {
            return updateTime;
          }
          return prev;
        });
      }
    }
  }, [turbine?.last_update]);

  const handleTabChange = (value: string) => {
    router.push(`/turbine/${selectedTurbineId}?tab=${value}`);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchSnapshot("30m")
      .then((data) => {
        setFarmKPIs(data.farm_kpis);
        setTurbines(data.turbines);
        setLastUpdated(new Date());
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to refresh:", error);
        setIsLoading(false);
      });
  };

  const navigateToTurbine = (newTurbineId: string) => {
    setSelectedTurbineId(newTurbineId);
    router.push(`/turbine/${newTurbineId}?tab=${tab}`);
  };

  if (isLoading && !turbine) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading turbine data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Turbine Selection Bar */}
      <div className="border-b bg-white dark:bg-slate-900 shadow-sm -mx-6 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">Select Turbine:</span>
          <Menubar className="border-0 bg-transparent">
            <MenubarMenu>
              <MenubarTrigger className="data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800">
                {selectedTurbineId}
              </MenubarTrigger>
              <MenubarContent>
                {farm.turbines.map((t) => (
                  <MenubarItem
                    key={t.turbine_id}
                    onClick={() => navigateToTurbine(t.turbine_id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{t.turbine_id}</span>
                      <Badge
                        variant="outline"
                        className={`ml-2 h-2 w-2 p-0 ${
                          t.status === "online"
                            ? "bg-emerald-500"
                            : t.status === "warning"
                            ? "bg-amber-500"
                            : t.status === "critical"
                            ? "bg-rose-500"
                            : "bg-slate-400"
                        }`}
                      />
                    </div>
                  </MenubarItem>
                ))}
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>
      </div>

      {/* Navigation Arrows */}
      {previousTurbine && (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50"
          onClick={() => navigateToTurbine(previousTurbine.turbine_id)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      {nextTurbine && (
        <Button
          variant="outline"
          size="icon"
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50"
          onClick={() => navigateToTurbine(nextTurbine.turbine_id)}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}

      {/* Turbine Header */}
      <TurbineHeader turbine={turbine} onRefresh={handleRefresh} lastUpdated={lastUpdated} />

      {/* Tabs */}
      <div className="sticky top-0 z-40 bg-background pb-2">
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full md:w-auto h-auto p-1">
            <TabsTrigger 
              value="live" 
              className="flex-1 md:flex-none px-6 py-3 min-w-[120px] cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <Activity className="h-4 w-4 mr-2" />
              Live
            </TabsTrigger>
            <TabsTrigger 
              value="trends" 
              className="flex-1 md:flex-none px-6 py-3 min-w-[120px] cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="flex-1 md:flex-none px-6 py-3 min-w-[120px] cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <Brain className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

        <TabsContent value="live" className="mt-6">
          {turbine && <LiveTab turbine={turbine} timeseries={turbineTimeseries} />}
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          {turbine && <TrendsTab turbine={turbine} timeseries={turbineTimeseries} />}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {turbine && <AnalyticsTab turbine={turbine} timeseries={turbineTimeseries} />}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

