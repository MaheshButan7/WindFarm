"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { fetchSnapshot } from "@/lib/api";
import { wsManager } from "@/lib/ws";
import { KpiCard } from "@/components/KpiCard";
import { TurbineMap } from "@/components/TurbineMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import {
  Wind,
  Zap,
  Activity,
  Gauge,
  AlertTriangle,
  Compass,
  Thermometer,
  Droplets,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Flame,
  Ruler,
  ArrowUpFromLine,
  Settings,
  CircleDot,
  Navigation,
  Plug,
  MapPin,
} from "lucide-react";

// Helper function to get compass direction from degrees
function getCompassDirection(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

// Helper function to safely get numeric value from latest_values
function getNumericValue(
  value: number | string | undefined,
  defaultValue: number = 0
): number {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "number") return value;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
}

export default function DashboardPage() {
  const [selectedTurbine, setSelectedTurbine] = useState<string>("all");
  const [timeline, setTimeline] = useState<"week" | "month">("week");
  const farm = useAppStore((state) => state.farm);
  const timeseries = useAppStore((state) => state.timeseries);
  const setFarmKPIs = useAppStore((state) => state.setFarmKPIs);
  const setTurbines = useAppStore((state) => state.setTurbines);
  const setTimeSeries = useAppStore((state) => state.setTimeSeries);

  useEffect(() => {
    // Fetch initial snapshot
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
      })
      .catch((error) => {
        console.error("Failed to fetch snapshot:", error);
      });

    return () => {
      wsManager.disconnect();
    };
  }, [setFarmKPIs, setTurbines, setTimeSeries]);

  // Filter turbines based on selection
  const filteredTurbines = useMemo(() => {
    if (selectedTurbine === "all") {
      return farm.turbines;
    }
    return farm.turbines.filter((t) => t.turbine_id === selectedTurbine);
  }, [selectedTurbine, farm.turbines]);

  // Get selected turbine data
  const selectedTurbineData = useMemo(() => {
    if (selectedTurbine === "all") return null;
    return farm.turbines.find((t) => t.turbine_id === selectedTurbine);
  }, [selectedTurbine, farm.turbines]);

  // Calculate aggregated environmental data
  const environmentalData = useMemo(() => {
    const turbines = filteredTurbines;
    if (turbines.length === 0) {
      return {
        windSpeed: 0,
        windDirection: 0,
        ambientTemp: 0,
        humidity: 0,
      };
    }

    const windSpeeds = turbines
      .map((t) => getNumericValue(t.latest_values.wind_speed_ms))
      .filter((v) => v > 0);
    const windDirs = turbines
      .map((t) => getNumericValue(t.latest_values.wind_direction_deg))
      .filter((v) => v >= 0);
    const temps = turbines
      .map((t) => getNumericValue(t.latest_values.ambient_temp_c))
      .filter((v) => v !== 0);
    const humidities = turbines
      .map((t) => getNumericValue(t.latest_values.humidity_pct))
      .filter((v) => v > 0);

    return {
      windSpeed: windSpeeds.length > 0 ? windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length : 0,
      windDirection: windDirs.length > 0 ? windDirs.reduce((a, b) => a + b, 0) / windDirs.length : 0,
      ambientTemp: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0,
      humidity: humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : 0,
    };
  }, [filteredTurbines]);

  // Calculate thermal data
  const thermalData = useMemo(() => {
    const turbines = filteredTurbines;
    if (turbines.length === 0) {
      return {
        gearboxTemp: 0,
        generatorTemp: 0,
      };
    }

    const gearboxTemps = turbines
      .map((t) => getNumericValue(t.latest_values.gearbox_oil_temp_c))
      .filter((v) => v > 0);
    const generatorTemps = turbines
      .map((t) => getNumericValue(t.latest_values.generator_winding_temp_c))
      .filter((v) => v > 0);

    return {
      gearboxTemp: gearboxTemps.length > 0 ? gearboxTemps.reduce((a, b) => a + b, 0) / gearboxTemps.length : 0,
      generatorTemp: generatorTemps.length > 0 ? generatorTemps.reduce((a, b) => a + b, 0) / generatorTemps.length : 0,
    };
  }, [filteredTurbines]);

  // Calculate predicted power (simplified - using recent wind average)
  const predictedPower = useMemo(() => {
    if (filteredTurbines.length === 0) return 0;
    const avgWind = environmentalData.windSpeed;
    const avgCapacity = filteredTurbines.reduce((sum, t) => sum + (t.capacity_kw || 2000), 0) / filteredTurbines.length;
    // Simple prediction: power ≈ wind³ × 0.1, capped at capacity
    return Math.min(avgCapacity, Math.pow(avgWind, 3) * 0.1);
  }, [filteredTurbines, environmentalData.windSpeed]);

  // Calculate variance
  const powerVariance = useMemo(() => {
    const current = farm.kpis?.current_power_kw || 0;
    if (predictedPower === 0) return 0;
    return ((current - predictedPower) / predictedPower) * 100;
  }, [farm.kpis?.current_power_kw, predictedPower]);

  // Get operational parameters
  const operationalData = useMemo(() => {
    if (!selectedTurbineData) {
      return {
        pitchAngle: 0,
        yawAngle: 0,
        gridStatus: "connected" as const,
      };
    }
    
    // Get grid status from latest_values
    const gridStatus = (selectedTurbineData.latest_values.grid_status as "connected" | "tripped" | "islanded") || "connected";
    
    return {
      pitchAngle: getNumericValue(selectedTurbineData.latest_values.pitch_deg_A),
      yawAngle: getNumericValue(selectedTurbineData.latest_values.yaw_deg),
      gridStatus,
    };
  }, [selectedTurbineData]);

  // Filter chart data based on timeline
  const chartDataDays = timeline === "week" ? 7 : 30;
  const chartCutoffTime = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - chartDataDays);
    return cutoff.getTime();
  }, [chartDataDays]);

  // Memoize sparkline data to prevent unnecessary recalculations
  const powerData = useMemo(() => {
    return filteredTurbines
      .flatMap((t) =>
        (timeseries[t.turbine_id]?.power_kw || [])
          .filter((p) => new Date(p.timestamp).getTime() >= chartCutoffTime)
          .map((p) => ({
            time: new Date(p.timestamp).getTime(),
            value: p.value,
          }))
      )
      .sort((a, b) => a.time - b.time);
  }, [filteredTurbines, timeseries, chartCutoffTime]);

  const rpmData = useMemo(() => {
    return filteredTurbines
      .flatMap((t) =>
        (timeseries[t.turbine_id]?.rotor_speed_rpm || [])
          .filter((p) => new Date(p.timestamp).getTime() >= chartCutoffTime)
          .map((p) => ({
            time: new Date(p.timestamp).getTime(),
            value: p.value,
          }))
      )
      .sort((a, b) => a.time - b.time);
  }, [filteredTurbines, timeseries, chartCutoffTime]);

  const vibrationData = useMemo(() => {
    return filteredTurbines
      .flatMap((t) =>
        (timeseries[t.turbine_id]?.vibration_rms_mm_s || [])
          .filter((p) => new Date(p.timestamp).getTime() >= chartCutoffTime)
          .map((p) => ({
            time: new Date(p.timestamp).getTime(),
            value: p.value,
          }))
      )
      .sort((a, b) => a.time - b.time);
  }, [filteredTurbines, timeseries, chartCutoffTime]);

  // Calculate status summary
  const statusSummary = useMemo(() => {
    const online = farm.turbines.filter((t) => t.status === "online").length;
    const warning = farm.turbines.filter((t) => t.status === "warning").length;
    const critical = farm.turbines.filter((t) => t.status === "critical").length;
    const offline = farm.turbines.filter((t) => t.status === "offline" || t.status === "unknown").length;
    
    return { online, warning, critical, offline };
  }, [farm.turbines]);

  return (
    <div className="space-y-6">
      {/* Turbine Selection Bar */}
      <div className="border-b bg-white dark:bg-slate-900 shadow-sm -mx-6 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">Select Turbine:</span>
          <Menubar className="border-0 bg-transparent">
            <MenubarMenu>
              <MenubarTrigger className="data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800">
                {selectedTurbine === "all" 
                  ? "All Turbines" 
                  : farm.turbines.find(t => t.turbine_id === selectedTurbine)?.turbine_id || "All Turbines"}
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => setSelectedTurbine("all")}>
                  <Wind className="h-4 w-4 mr-2" />
                  All Turbines
                </MenubarItem>
                {farm.turbines.map((turbine) => (
                  <MenubarItem key={turbine.turbine_id} onClick={() => setSelectedTurbine(turbine.turbine_id)}>
                    <div className="flex items-center justify-between w-full">
                      <span>{turbine.turbine_id}</span>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 h-2 w-2 p-0 ${
                          turbine.status === 'online' ? 'bg-emerald-500' :
                          turbine.status === 'warning' ? 'bg-amber-500' : 
                          turbine.status === 'critical' ? 'bg-rose-500' : 'bg-slate-400'
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

      {/* KPI Cards - Now 5 cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Current Power"
          value={farm.kpis?.current_power_kw.toFixed(0) || "0"}
          unit="kW"
          sparklineData={powerData.slice(-30)}
          badge={farm.kpis && farm.kpis.current_power_kw > 0 ? "online" : "offline"}
          icon={Zap}
        />
        <KpiCard
          title="Rotor Speed"
          value={farm.kpis?.rotor_rpm_avg.toFixed(1) || "0"}
          unit="rpm"
          sparklineData={rpmData.slice(-30)}
          badge="normal"
          icon={Gauge}
        />
        <KpiCard
          title="Farm Health"
          value={farm.kpis?.farm_health_pct.toFixed(1) || "100"}
          unit="%"
          sparklineData={[]}
          badge={
            farm.kpis && farm.kpis.farm_health_pct >= 90
              ? "healthy"
              : farm.kpis && farm.kpis.farm_health_pct >= 70
              ? "warning"
              : "critical"
          }
          icon={Activity}
        />
        <KpiCard
          title="Turbines Online"
          value={farm.kpis?.turbines_online.toString() || "0"}
          unit={`/ ${farm.turbines.length || 0}`}
          sparklineData={[]}
          badge="online"
          icon={Wind}
        />
        {/* Current vs Predicted Output */}
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Power Output
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Current</div>
                <div className="text-2xl font-bold tracking-tight">
                  {farm.kpis?.current_power_kw.toFixed(0) || "0"} <span className="text-sm font-normal text-muted-foreground">kW</span>
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Predicted
                </div>
                <div className="text-xl font-semibold">
                  {predictedPower.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">kW</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge 
                        variant="outline" 
                        className={`mt-2 flex items-center gap-1 w-fit ${
                          powerVariance >= 0 
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-200" 
                            : "bg-rose-500/10 text-rose-700 border-rose-200"
                        }`}
                      >
                        {powerVariance >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(powerVariance).toFixed(1)}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Variance from predicted output based on wind conditions</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environmental Parameters Strip */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Wind Speed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg font-semibold">
                {environmentalData.windSpeed.toFixed(1)} m/s
              </Badge>
              <Wind 
                className="h-5 w-5 text-muted-foreground" 
                style={{ transform: `rotate(${environmentalData.windDirection}deg)` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Wind Direction</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg font-semibold">
                {environmentalData.windDirection.toFixed(0)}°
              </Badge>
              <span className="text-sm text-muted-foreground">
                {getCompassDirection(environmentalData.windDirection)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Ambient Temp</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-lg font-semibold">
              {environmentalData.ambientTemp.toFixed(1)}°C
            </Badge>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Humidity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-lg font-semibold">
              {environmentalData.humidity.toFixed(1)}%
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Map and Operational Status Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Turbine Map - Spans 2 columns */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wind className="h-5 w-5" />
                Turbine Map
              </CardTitle>
              <Badge variant="outline">{farm.turbines.length} Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <TurbineMap turbines={filteredTurbines} />
          </CardContent>
        </Card>

        {/* Operational Status Panel */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Operational Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTurbineData ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CircleDot className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Blade Pitch</span>
                    </div>
                    <Badge variant="outline">
                      {getNumericValue(selectedTurbineData.latest_values.pitch_deg_A).toFixed(1)}°
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.abs(getNumericValue(selectedTurbineData.latest_values.pitch_deg_A) / 90 * 100)} 
                    className="h-2"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Yaw Angle</span>
                    </div>
                    <Badge variant="outline">
                      {getNumericValue(selectedTurbineData.latest_values.yaw_deg).toFixed(0)}°
                    </Badge>
                  </div>
                  <div className="relative h-20 w-20 mx-auto">
                    <Navigation
                      className="h-full w-full text-primary transition-transform"
                      style={{ transform: `rotate(${getNumericValue(selectedTurbineData.latest_values.yaw_deg)}deg)` }}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plug className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Grid Connection</span>
                  </div>
                  <Badge 
                    variant="outline"
                    className={
                      operationalData.gridStatus === "connected"
                        ? "bg-emerald-500 text-white border-0"
                        : "bg-rose-500 text-white border-0"
                    }
                  >
                    {operationalData.gridStatus === "connected" ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Select a turbine to view operational parameters
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Thermal Monitoring, Turbine Specs, and Limits */}
      {selectedTurbine !== "all" && selectedTurbineData && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Thermal Monitoring */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5" />
                Thermal Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Gearbox Oil Temperature</span>
                  <Badge variant="outline">
                    {getNumericValue(selectedTurbineData.latest_values.gearbox_oil_temp_c).toFixed(1)}°C
                  </Badge>
                </div>
                {(() => {
                  const temp = getNumericValue(selectedTurbineData.latest_values.gearbox_oil_temp_c);
                  return (
                    <>
                      <Progress 
                        value={temp} 
                        max={100}
                        className={`h-3 ${
                          temp < 70
                            ? "[&>div]:bg-emerald-500"
                            : temp <= 85
                            ? "[&>div]:bg-amber-500"
                            : "[&>div]:bg-rose-500"
                        }`}
                      />
                      {temp > 80 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Gearbox temperature exceeds warning threshold (80°C)
                      </AlertDescription>
                    </Alert>
                  )}
                    </>
                  );
                })()}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Generator Winding Temperature</span>
                  <Badge variant="outline">
                    {getNumericValue(selectedTurbineData.latest_values.generator_winding_temp_c).toFixed(1)}°C
                  </Badge>
                </div>
                {(() => {
                  const temp = getNumericValue(selectedTurbineData.latest_values.generator_winding_temp_c);
                  return (
                    <>
                      <Progress 
                        value={temp} 
                        max={110}
                        className={`h-3 ${
                          temp < 70
                            ? "[&>div]:bg-emerald-500"
                            : temp <= 85
                            ? "[&>div]:bg-amber-500"
                            : "[&>div]:bg-rose-500"
                        }`}
                      />
                      {temp > 95 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Generator temperature exceeds warning threshold (95°C)
                      </AlertDescription>
                    </Alert>
                  )}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Turbine Specifications */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Turbine Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Blade Length</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {selectedTurbineData.blade_length_m?.toFixed(1) || "N/A"} m
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="flex items-center gap-2">
                      <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Height</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {selectedTurbineData.height_m?.toFixed(1) || "N/A"} m
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Generation Capacity</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {selectedTurbineData.capacity_kw?.toFixed(0) || "2000"} kW
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Generator Type</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {selectedTurbineData.generator_type || "N/A"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Limits Panel */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Operating Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTurbineData.limits ? (
                <div className="space-y-4">
                  {/* Vibration Limits */}
                  {selectedTurbineData.limits.vibration_rms_mm_s && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Vibration (mm/s RMS)</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Warning:</span>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200">
                            {selectedTurbineData.limits.vibration_rms_mm_s.warn || "N/A"} mm/s
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Alarm:</span>
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-200">
                            {selectedTurbineData.limits.vibration_rms_mm_s.alarm || "N/A"} mm/s
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gearbox Temperature Limits */}
                  {selectedTurbineData.limits.gearbox_oil_temp_c && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Gearbox Temp (°C)</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Warning:</span>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200">
                            {selectedTurbineData.limits.gearbox_oil_temp_c.warn || "N/A"}°C
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Alarm:</span>
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-200">
                            {selectedTurbineData.limits.gearbox_oil_temp_c.alarm || "N/A"}°C
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generator Temperature Limits */}
                  {selectedTurbineData.limits.generator_winding_temp_c && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Generator Temp (°C)</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Warning:</span>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200">
                            {selectedTurbineData.limits.generator_winding_temp_c.warn || "N/A"}°C
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Alarm:</span>
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-200">
                            {selectedTurbineData.limits.generator_winding_temp_c.alarm || "N/A"}°C
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No limits configured
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts & Status Summary */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alerts & Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {statusSummary.critical > 0 && (
              <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-rose-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Critical</span>
                </div>
                <Badge variant="outline" className="bg-rose-500 text-white border-0">
                  {statusSummary.critical}
                </Badge>
              </div>
            )}
            
            {statusSummary.warning > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Warning</span>
                </div>
                <Badge variant="outline" className="bg-amber-500 text-white border-0">
                  {statusSummary.warning}
                </Badge>
              </div>
            )}

            {statusSummary.offline > 0 && (
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-slate-400 rounded-full" />
                  <span className="text-sm font-medium">Offline</span>
                </div>
                <Badge variant="outline" className="bg-slate-400 text-white border-0">
                  {statusSummary.offline}
                </Badge>
              </div>
            )}

            {statusSummary.critical === 0 && statusSummary.warning === 0 && statusSummary.offline === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                All systems operational
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Online</span>
                  <span className="font-medium">{statusSummary.online}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Capacity</span>
                  <span className="font-medium">
                    {farm.turbines.reduce((sum, t) => sum + (t.capacity_kw || 0), 0).toFixed(0)} kW
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Selector and Performance Charts */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <ToggleGroup type="single" value={timeline} onValueChange={(value) => value && setTimeline(value as "week" | "month")}>
            <ToggleGroupItem value="week" aria-label="Week">
              Week
            </ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="Month">
              Month
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Power Output</CardTitle>
              <p className="text-xs text-muted-foreground">Last {chartDataDays} days</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={powerData}>
                  <defs>
                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(time) => new Date(time).toLocaleDateString()}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    labelFormatter={(time) => new Date(time).toLocaleString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorPower)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Rotor Speed</CardTitle>
              <p className="text-xs text-muted-foreground">Last {chartDataDays} days</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={rpmData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(time) => new Date(time).toLocaleDateString()}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    labelFormatter={(time) => new Date(time).toLocaleString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Vibration RMS</CardTitle>
              <p className="text-xs text-muted-foreground">Last {chartDataDays} days</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={vibrationData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(time) => new Date(time).toLocaleDateString()}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    labelFormatter={(time) => new Date(time).toLocaleString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
