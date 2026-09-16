"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { fetchSnapshot } from "@/lib/api";
import { wsManager } from "@/lib/ws";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { Wind, Zap, Activity, ArrowRight, Gauge } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function TurbinesPage() {
  const router = useRouter();
  const farm = useAppStore((state) => state.farm);
  const setFarmKPIs = useAppStore((state) => state.setFarmKPIs);
  const setTurbines = useAppStore((state) => state.setTurbines);
  const setTimeSeries = useAppStore((state) => state.setTimeSeries);

  const [selectedTurbine, setSelectedTurbine] = useState<string>("all");

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

  const filteredTurbines =
    selectedTurbine === "all"
      ? farm.turbines
      : farm.turbines.filter((t) => t.turbine_id === selectedTurbine);

  const handleTurbineClick = (turbineId: string) => {
    router.push(`/turbine/${turbineId}`);
  };

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
                  : farm.turbines.find((t) => t.turbine_id === selectedTurbine)?.turbine_id || "All Turbines"}
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
                          turbine.status === "online"
                            ? "bg-emerald-500"
                            : turbine.status === "warning"
                            ? "bg-amber-500"
                            : turbine.status === "critical"
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

      {/* Turbines Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTurbines.map((turbine) => {
          const statusColors = {
            online: "bg-emerald-500",
            warning: "bg-amber-500",
            critical: "bg-rose-500",
            offline: "bg-slate-400",
            unknown: "bg-slate-400",
          };

          return (
            <Card
              key={turbine.turbine_id}
              className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => handleTurbineClick(turbine.turbine_id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wind className="h-5 w-5" />
                    {turbine.turbine_id}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`${statusColors[turbine.status]} text-white border-0 flex items-center gap-1.5`}
                  >
                    <span className="h-2 w-2 rounded-full bg-white" />
                    {turbine.status.charAt(0).toUpperCase() + turbine.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Power Output</div>
                    <div className="text-2xl font-bold flex items-center gap-1">
                      {turbine.latest_values.power_kw?.toFixed(0) || "0"}
                      <span className="text-sm font-normal text-muted-foreground">kW</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Health Score</div>
                    <div className="text-2xl font-bold flex items-center gap-1">
                      {turbine.health_score.toFixed(1)}
                      <span className="text-sm font-normal text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rotor Speed</span>
                    <span className="font-medium flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      {turbine.latest_values.rotor_speed_rpm?.toFixed(1) || "0"} RPM
                    </span>
                  </div>
                  <Progress value={turbine.health_score} className="h-2" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    Capacity: {turbine.capacity_kw?.toFixed(0) || "2000"} kW
                  </span>
                  <Button variant="ghost" size="sm" className="gap-1">
                    View Details
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Table */}
      {selectedTurbine === "all" && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Turbine Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turbine ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Power (kW)</TableHead>
                  <TableHead>Health Score</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farm.turbines.map((turbine) => (
                  <TableRow key={turbine.turbine_id}>
                    <TableCell className="font-medium">{turbine.turbine_id}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          turbine.status === "online"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                            : turbine.status === "warning"
                            ? "bg-amber-500/10 text-amber-700 border-amber-200"
                            : turbine.status === "critical"
                            ? "bg-rose-500/10 text-rose-700 border-rose-200"
                            : ""
                        }
                      >
                        {turbine.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {turbine.latest_values.power_kw?.toFixed(0) || "0"} / {turbine.capacity_kw?.toFixed(0) || "2000"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={turbine.health_score} className="h-2 w-20" />
                        <span className="text-sm">{turbine.health_score.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {turbine.last_update
                        ? new Date(turbine.last_update).toLocaleString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTurbineClick(turbine.turbine_id)}
                      >
                        View <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
