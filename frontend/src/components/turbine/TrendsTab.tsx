"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  Calendar,
  RefreshCw,
  LineChart as LineChartIcon,
  BarChart as BarChartIcon,
  TrendingUp,
  Download,
  FileText,
  Image as ImageIcon,
  CheckCircle,
} from "lucide-react";
import type { TurbineData } from "@/lib/types";
import { format, subDays, startOfDay } from "date-fns";

interface TrendsTabProps {
  turbine: TurbineData | null;
  timeseries: Record<string, Array<{ timestamp: string; value: number }>>;
}

type TimeRange = "24h" | "7d" | "30d" | "custom";
type ChartType = "line" | "bar" | "area";

export function TrendsTab({ turbine, timeseries }: TrendsTabProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [selectedParams, setSelectedParams] = useState<string[]>(["power_kw", "wind_speed_ms"]);

  const chartData = useMemo(() => {
    if (!timeseries.power_kw) return [];
    
    const now = Date.now();
    let cutoffTime: number;
    
    switch (timeRange) {
      case "24h":
        cutoffTime = now - 24 * 60 * 60 * 1000;
        break;
      case "7d":
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
    }

    // Aggregate data points by hour for better visualization
    const powerData = timeseries.power_kw
      .filter((p) => new Date(p.timestamp).getTime() >= cutoffTime)
      .map((p) => ({
        time: new Date(p.timestamp).getTime(),
        power: p.value,
        windSpeed: timeseries.wind_speed_ms?.find(
          (w) => Math.abs(new Date(w.timestamp).getTime() - new Date(p.timestamp).getTime()) < 60000
        )?.value || 0,
        rotorSpeed: timeseries.rotor_speed_rpm?.find(
          (r) => Math.abs(new Date(r.timestamp).getTime() - new Date(p.timestamp).getTime()) < 60000
        )?.value || 0,
        gearboxTemp: timeseries.gearbox_oil_temp_c?.find(
          (t) => Math.abs(new Date(t.timestamp).getTime() - new Date(p.timestamp).getTime()) < 60000
        )?.value || 0,
        generatorTemp: timeseries.generator_winding_temp_c?.find(
          (t) => Math.abs(new Date(t.timestamp).getTime() - new Date(p.timestamp).getTime()) < 60000
        )?.value || 0,
        vibration: timeseries.vibration_rms_mm_s?.find(
          (v) => Math.abs(new Date(v.timestamp).getTime() - new Date(p.timestamp).getTime()) < 60000
        )?.value || 0,
      }));

    // Group by hour for aggregation
    const grouped = powerData.reduce((acc, point) => {
      const hour = Math.floor(point.time / (60 * 60 * 1000));
      if (!acc[hour]) {
        acc[hour] = [];
      }
      acc[hour].push(point);
      return acc;
    }, {} as Record<number, typeof powerData>);

    return Object.entries(grouped).map(([hour, points]) => {
      const avg = (key: string) => {
        const values = points.map((p: any) => p[key]).filter((v: any) => v > 0);
        return values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
      };
      return {
        time: parseInt(hour) * 60 * 60 * 1000,
        power: avg("power"),
        windSpeed: avg("windSpeed"),
        rotorSpeed: avg("rotorSpeed"),
        gearboxTemp: avg("gearboxTemp"),
        generatorTemp: avg("generatorTemp"),
        vibration: avg("vibration"),
        energy: avg("power") * 0.001, // Convert to MWh (approximate)
      };
    }).sort((a, b) => a.time - b.time);
  }, [timeseries, timeRange]);

  const statisticalSummary = useMemo(() => {
    if (chartData.length === 0) return [];
    
    const params = [
      { key: "power", label: "Power Output", unit: "kW" },
      { key: "windSpeed", label: "Wind Speed", unit: "m/s" },
      { key: "rotorSpeed", label: "Rotor Speed", unit: "RPM" },
      { key: "gearboxTemp", label: "Gearbox Temp", unit: "°C" },
      { key: "generatorTemp", label: "Generator Temp", unit: "°C" },
      { key: "vibration", label: "Vibration", unit: "mm/s" },
    ];

    return params.map((param) => {
      const values = chartData.map((d: any) => d[param.key]).filter((v: number) => v > 0);
      if (values.length === 0) return null;
      
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      return {
        ...param,
        avg: avg.toFixed(2),
        min: min.toFixed(2),
        max: max.toFixed(2),
        stdDev: stdDev.toFixed(2),
      };
    }).filter(Boolean);
  }, [chartData]);

  const totalEnergy = useMemo(() => {
    return chartData.reduce((sum, d: any) => sum + (d.energy || 0), 0).toFixed(2);
  }, [chartData]);

  const ChartComponent = chartType === "line" ? LineChart : chartType === "bar" ? BarChart : AreaChart;

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <ToggleGroup type="single" value={timeRange} onValueChange={(value) => value && setTimeRange(value as TimeRange)}>
            <ToggleGroupItem value="24h">24 Hours</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 Days</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 Days</ToggleGroupItem>
            <ToggleGroupItem value="custom">Custom</ToggleGroupItem>
          </ToggleGroup>
          <span className="text-sm text-muted-foreground">
            Showing data: {format(subDays(new Date(), timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30), "MMM d")} - {format(new Date(), "MMM d, yyyy")}
          </span>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Chart Type Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Chart Type:</span>
        <ToggleGroup type="single" value={chartType} onValueChange={(value) => value && setChartType(value as ChartType)}>
          <ToggleGroupItem value="line">
            <LineChartIcon className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="bar">
            <BarChartIcon className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="area">
            <TrendingUp className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Power Production Analysis */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Power Production Analysis</CardTitle>
            <CardAction>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CardAction>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                tickFormatter={(time) => format(new Date(time), "MMM d HH:mm")}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <RechartsTooltip
                labelFormatter={(time) => format(new Date(time), "MMM d, yyyy HH:mm")}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="power"
                stroke="#10b981"
                fill="url(#colorPower)"
                name="Power (kW)"
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="windSpeed"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Wind Speed (m/s)"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Correlation */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Performance Correlation</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="windSpeed"
                name="Wind Speed"
                unit=" m/s"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                dataKey="power"
                name="Power"
                unit=" kW"
                tick={{ fontSize: 12 }}
              />
              <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter dataKey="power" fill="#10b981" />
              <ReferenceLine
                y={(turbine?.capacity_kw || 2000) * 0.8}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label="Expected Power"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Temperature Trends */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Temperature Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                tickFormatter={(time) => format(new Date(time), "MMM d HH:mm")}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip
                labelFormatter={(time) => format(new Date(time), "MMM d, yyyy HH:mm")}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="gearboxTemp"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Gearbox Temp (°C)"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="generatorTemp"
                stroke="#ef4444"
                strokeWidth={2}
                name="Generator Temp (°C)"
                dot={false}
                isAnimationActive={false}
              />
              {turbine?.limits?.gearbox_oil_temp_c?.warn && (
                <ReferenceLine
                  y={turbine.limits.gearbox_oil_temp_c.warn}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label="Warning"
                />
              )}
              {turbine?.limits?.gearbox_oil_temp_c?.alarm && (
                <ReferenceLine
                  y={turbine.limits.gearbox_oil_temp_c.alarm}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label="Alarm"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Statistical Summary */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Statistical Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Std Dev</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statisticalSummary.map((stat: any) => (
                <TableRow key={stat.key}>
                  <TableCell className="font-medium">{stat.label}</TableCell>
                  <TableCell>{stat.avg}</TableCell>
                  <TableCell>{stat.min}</TableCell>
                  <TableCell>{stat.max}</TableCell>
                  <TableCell>{stat.stdDev}</TableCell>
                  <TableCell>{stat.unit}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={4}>Total Energy Generated</TableCell>
                <TableCell colSpan={2}>{totalEnergy} MWh</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data (CSV)
            </Button>
            <Button variant="outline">
              <ImageIcon className="h-4 w-4 mr-2" />
              Export Charts (PNG)
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report (PDF)
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate PDF Report</DialogTitle>
                  <DialogDescription>
                    Configure the PDF report options for this turbine.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Report generation feature coming soon...
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Generate Report</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

