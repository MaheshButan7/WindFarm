"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Zap,
  Gauge,
  Wind,
  Activity,
  Compass,
  Cloud,
  Move,
  Navigation,
  CircleDot,
  Flame,
  Plug,
  Lock,
  Unlock,
  AlertTriangle,
} from "lucide-react";
import type { TurbineData } from "@/lib/types";

interface LiveTabProps {
  turbine: TurbineData | null;
  timeseries: Record<string, Array<{ timestamp: string; value: number }>>;
}

export function LiveTab({ turbine, timeseries }: LiveTabProps) {
  const [liveData, setLiveData] = useState<any>(null);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!turbine) return;

    const updateLiveData = () => {
      setLiveData({
        power: turbine.latest_values.power_kw || 0,
        rotorSpeed: turbine.latest_values.rotor_speed_rpm || 0,
        windSpeed: turbine.latest_values.wind_speed_ms || 0,
        windDirection: turbine.latest_values.wind_direction_deg || 0,
        vibration: turbine.latest_values.vibration_rms_mm_s || 0,
        gearboxTemp: turbine.latest_values.gearbox_oil_temp_c || 0,
        generatorTemp: turbine.latest_values.generator_winding_temp_c || 0,
        ambientTemp: turbine.latest_values.ambient_temp_c || 0,
        humidity: turbine.latest_values.humidity_pct || 0,
        yaw: turbine.latest_values.yaw_deg || 0,
        pitchA: turbine.latest_values.pitch_deg_A || 0,
        pitchB: turbine.latest_values.pitch_deg_B || 0,
        pitchC: turbine.latest_values.pitch_deg_C || 0,
      });
    };

    updateLiveData();
    const interval = setInterval(updateLiveData, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [turbine]);

  // Prepare chart data (last hour)
  const chartData = useMemo(() => {
    if (!timeseries.power_kw) return [];
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    return timeseries.power_kw
      .filter((p) => new Date(p.timestamp).getTime() >= oneHourAgo)
      .map((p, idx) => ({
        time: new Date(p.timestamp).getTime(),
        power: p.value,
        rotorSpeed: timeseries.rotor_speed_rpm?.[idx]?.value || 0,
        gearboxTemp: timeseries.gearbox_oil_temp_c?.[idx]?.value || 0,
        generatorTemp: timeseries.generator_winding_temp_c?.[idx]?.value || 0,
        ambientTemp: timeseries.ambient_temp_c?.[idx]?.value || 0,
        vibration: timeseries.vibration_rms_mm_s?.[idx]?.value || 0,
      }))
      .slice(-60); // Last 60 points
  }, [timeseries]);

  if (!turbine || !liveData) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading live data...</p>
      </div>
    );
  }

  const getCompassDirection = (degrees: number) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return directions[Math.round(degrees / 45) % 8];
  };

  const getTempColor = (temp: number, warn: number, alarm: number) => {
    if (temp >= alarm) return "bg-rose-500";
    if (temp >= warn) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="space-y-6">
      {/* Live Indicator */}
      {isLive && (
        <div className="flex items-center justify-end gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
            Live
          </Badge>
        </div>
      )}

      {/* Hero Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-medium">Current Power</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {liveData.power.toFixed(0)} <span className="text-lg text-muted-foreground">kW</span>
            </div>
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={chartData.slice(-10)}>
                  <Area
                    type="monotone"
                    dataKey="power"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-medium">Rotor Speed</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {liveData.rotorSpeed.toFixed(1)} <span className="text-lg text-muted-foreground">RPM</span>
            </div>
            <Progress
              value={(liveData.rotorSpeed / 20) * 100}
              className="h-2"
            />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-medium">Wind Speed</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {liveData.windSpeed.toFixed(1)} <span className="text-lg text-muted-foreground">m/s</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind
                className="h-6 w-6 text-muted-foreground"
                style={{ transform: `rotate(${liveData.windDirection}deg)` }}
              />
              <span className="text-sm text-muted-foreground">
                {getCompassDirection(liveData.windDirection)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-medium">Operational Status</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {turbine.status === "online" ? "99.2" : "0"}%
            </div>
            <p className="text-sm text-muted-foreground">Uptime today</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Parameter Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Wind Conditions */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wind className="h-4 w-4" />
              Wind Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Wind Speed</span>
                <span className="text-sm font-medium">{liveData.windSpeed.toFixed(1)} m/s</span>
              </div>
              {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={chartData.slice(-10)}>
                    <Line
                      type="monotone"
                      dataKey="power"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Compass className="h-3 w-3" />
                  Wind Direction
                </span>
                <span className="text-sm font-medium">{liveData.windDirection.toFixed(0)}°</span>
              </div>
              <div className="relative h-16 w-16 mx-auto">
                <Compass className="h-full w-full text-muted-foreground" />
                <div
                  className="absolute top-1/2 left-1/2 w-0.5 h-6 bg-primary origin-top"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${liveData.windDirection}deg)`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Cloud className="h-3 w-3" />
                  Air Density
                </span>
                <span className="text-sm font-medium">1.225 kg/m³</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mechanical Parameters */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4" />
              Mechanical Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Rotor Speed</span>
                <span className="text-sm font-medium">{liveData.rotorSpeed.toFixed(1)} RPM</span>
              </div>
              <Progress value={(liveData.rotorSpeed / 20) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Move className="h-3 w-3" />
                  Blade Pitch
                </span>
                <span className="text-sm font-medium">
                  {(liveData.pitchA + liveData.pitchB + liveData.pitchC) / 3}°
                </span>
              </div>
              <Progress
                value={Math.abs((liveData.pitchA + liveData.pitchB + liveData.pitchC) / 3 / 90) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  Yaw Angle
                </span>
                <span className="text-sm font-medium">{liveData.yaw.toFixed(0)}°</span>
              </div>
              <div className="relative h-12 w-12 mx-auto">
                <Navigation
                  className="h-full w-full text-primary"
                  style={{ transform: `rotate(${liveData.yaw}deg)` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <CircleDot className="h-3 w-3" />
                  Nacelle Position
                </span>
                <span className="text-sm font-medium">{liveData.yaw.toFixed(0)}°</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thermal Readings */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4" />
              Thermal Readings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                label: "Gearbox Oil Temp",
                value: liveData.gearboxTemp,
                warn: turbine.limits?.gearbox_oil_temp_c?.warn || 80,
                alarm: turbine.limits?.gearbox_oil_temp_c?.alarm || 90,
              },
              {
                label: "Gearbox Bearing Temp",
                value: liveData.gearboxTemp + 5,
                warn: 85,
                alarm: 95,
              },
              {
                label: "Generator Winding Temp",
                value: liveData.generatorTemp,
                warn: turbine.limits?.generator_winding_temp_c?.warn || 95,
                alarm: turbine.limits?.generator_winding_temp_c?.alarm || 110,
              },
              {
                label: "Generator Bearing Temp",
                value: liveData.generatorTemp - 10,
                warn: 90,
                alarm: 105,
              },
              {
                label: "Nacelle Temp",
                value: liveData.ambientTemp + 5,
                warn: 50,
                alarm: 60,
              },
              {
                label: "Ambient Temp",
                value: liveData.ambientTemp,
                warn: 40,
                alarm: 50,
              },
            ].map((temp) => (
              <div key={temp.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{temp.label}</span>
                  <Badge
                    variant="outline"
                    className={
                      temp.value >= temp.alarm
                        ? "bg-rose-500/10 text-rose-700 border-rose-200"
                        : temp.value >= temp.warn
                        ? "bg-amber-500/10 text-amber-700 border-amber-200"
                        : ""
                    }
                  >
                    {temp.value.toFixed(1)}°C
                  </Badge>
                </div>
                <Progress
                  value={temp.value}
                  max={120}
                  className={`h-2 ${getTempColor(temp.value, temp.warn, temp.alarm)}`}
                />
                {temp.value >= temp.alarm && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      {temp.label} exceeds alarm threshold
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Electrical Parameters */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4" />
              Electrical Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Power Output</span>
                <span className="text-sm font-medium">{liveData.power.toFixed(0)} kW</span>
              </div>
              <Progress value={(liveData.power / (turbine.capacity_kw || 2000)) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Voltage</span>
                <span className="text-sm font-medium">690 V</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current</span>
                <span className="text-sm font-medium">{(liveData.power / 690).toFixed(1)} A</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Power Factor</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
                  Good
                </Badge>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Grid Frequency</span>
                <Badge variant="outline">50.0 Hz</Badge>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reactive Power</span>
                <span className="text-sm font-medium">{(liveData.power * 0.1).toFixed(0)} kVAR</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Indicators */}
        <Card className="shadow-lg md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Health Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vibration X-axis</span>
                  <span className="font-medium">{liveData.vibration.toFixed(2)} mm/s</span>
                </div>
                <Progress
                  value={liveData.vibration}
                  max={10}
                  className={`h-2 ${
                    liveData.vibration >= 10
                      ? "bg-rose-500"
                      : liveData.vibration >= 7
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vibration Y-axis</span>
                  <span className="font-medium">{(liveData.vibration * 0.9).toFixed(2)} mm/s</span>
                </div>
                <Progress
                  value={liveData.vibration * 0.9}
                  max={10}
                  className={`h-2 ${
                    liveData.vibration * 0.9 >= 10
                      ? "bg-rose-500"
                      : liveData.vibration * 0.9 >= 7
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vibration Z-axis</span>
                  <span className="font-medium">{(liveData.vibration * 0.85).toFixed(2)} mm/s</span>
                </div>
                <Progress
                  value={liveData.vibration * 0.85}
                  max={10}
                  className={`h-2 ${
                    liveData.vibration * 0.85 >= 10
                      ? "bg-rose-500"
                      : liveData.vibration * 0.85 >= 7
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Oil Pressure</span>
                  <span className="font-medium">4.2 bar</span>
                </div>
                <Progress value={84} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hydraulic Pressure</span>
                  <span className="font-medium">210 bar</span>
                </div>
                <Progress value={84} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Brake Status</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 flex items-center gap-1">
                    <Unlock className="h-3 w-3" />
                    Released
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Trend Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm">Power Output</CardTitle>
            <p className="text-xs text-muted-foreground">Last 1 hour</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  labelFormatter={(time) => new Date(time).toLocaleTimeString()}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="power"
                  stroke="#10b981"
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
            <CardTitle className="text-sm">Rotor Speed</CardTitle>
            <p className="text-xs text-muted-foreground">Last 1 hour</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  labelFormatter={(time) => new Date(time).toLocaleTimeString()}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="rotorSpeed"
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
            <CardTitle className="text-sm">Temperatures</CardTitle>
            <p className="text-xs text-muted-foreground">Last 1 hour</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  labelFormatter={(time) => new Date(time).toLocaleTimeString()}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="gearboxTemp"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="generatorTemp"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="ambientTemp"
                  stroke="#10b981"
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
            <CardTitle className="text-sm">Vibration RMS</CardTitle>
            <p className="text-xs text-muted-foreground">Last 1 hour</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  labelFormatter={(time) => new Date(time).toLocaleTimeString()}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="vibration"
                  stroke="#8b5cf6"
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
  );
}

