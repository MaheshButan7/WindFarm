"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TurbineState } from "@/lib/types";
import { MapPin, CircleDot } from "lucide-react";

interface TurbineMapProps {
  turbines: TurbineState[];
}

export function TurbineMap({ turbines }: TurbineMapProps) {
  const [selectedTurbine, setSelectedTurbine] = useState<string | null>(null);
  const setSelectedTurbineStore = useAppStore((state) => state.setSelectedTurbine);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "border-emerald-500 bg-emerald-500/10";
      case "warning":
        return "border-amber-500 bg-amber-500/10";
      case "critical":
        return "border-rose-500 bg-rose-500/10";
      default:
        return "border-slate-400 bg-slate-400/10";
    }
  };

  const getStatusRingColor = (status: string) => {
    switch (status) {
      case "online":
        return "ring-emerald-500";
      case "warning":
        return "ring-amber-500";
      case "critical":
        return "ring-rose-500";
      default:
        return "ring-slate-400";
    }
  };

  const handleTurbineClick = (turbineId: string) => {
    setSelectedTurbine(turbineId);
    setSelectedTurbineStore(turbineId);
  };

  const selectedTurbineData = turbines.find((t) => t.turbine_id === selectedTurbine);

  // Simple grid layout (10x10 grid for up to 100 turbines)
  const gridSize = Math.ceil(Math.sqrt(turbines.length));
  const gridCols = gridSize <= 10 ? gridSize : 10;

  return (
    <>
      <div
        className="grid gap-2 p-4"
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
      >
        {turbines.map((turbine) => (
          <Popover key={turbine.turbine_id}>
            <PopoverTrigger asChild>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button
                    onClick={() => handleTurbineClick(turbine.turbine_id)}
                    className={cn(
                      "relative flex h-16 w-16 items-center justify-center rounded-lg border-2 transition-all hover:scale-110",
                      getStatusColor(turbine.status)
                    )}
                  >
                    <Avatar className={cn("h-12 w-12 border-2", getStatusRingColor(turbine.status))}>
                      <AvatarFallback className="text-xs font-semibold bg-transparent">
                        {turbine.turbine_id.split("-")[1]}
                      </AvatarFallback>
                    </Avatar>
                    {turbine.health_score < 70 && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-600 animate-pulse" />
                    )}
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-64">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{turbine.turbine_id}</span>
                      </div>
                      <Badge 
                        className={
                          turbine.status === 'online' ? 'bg-emerald-500' :
                          turbine.status === 'warning' ? 'bg-amber-500' : 
                          turbine.status === 'critical' ? 'bg-rose-500' : 'bg-slate-400'
                        }
                      >
                        {turbine.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Health</div>
                        <div className="font-medium">{Number(turbine.health_score ?? 0).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Power</div>
                        <div className="font-medium">{Number(turbine.latest_values.power_kw ?? 0).toFixed(0)} kW</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">RPM</div>
                        <div className="font-medium">{Number(turbine.latest_values.rotor_speed_rpm ?? 0).toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Capacity</div>
                        <div className="font-medium">{Number(turbine.capacity_kw ?? 2000).toFixed(0)} kW</div>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div>
                  <div className="font-semibold text-lg mb-2">{turbine.turbine_id}</div>
                  <Badge 
                    className={
                      turbine.status === 'online' ? 'bg-emerald-500' :
                      turbine.status === 'warning' ? 'bg-amber-500' : 
                      turbine.status === 'critical' ? 'bg-rose-500' : 'bg-slate-400'
                    }
                  >
                    {turbine.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Health Score</div>
                    <div className="text-xl font-bold">{Number(turbine.health_score ?? 0).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Current Power</div>
                    <div className="text-xl font-bold">{Number(turbine.latest_values.power_kw ?? 0).toFixed(0)} kW</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Rotor Speed</div>
                    <div className="text-xl font-bold">{Number(turbine.latest_values.rotor_speed_rpm ?? 0).toFixed(1)} rpm</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Capacity</div>
                    <div className="text-xl font-bold">{Number(turbine.capacity_kw ?? 2000).toFixed(0)} kW</div>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm mb-1">Generator Type</div>
                  <div className="font-medium">{turbine.generator_type || "N/A"}</div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>

      <Sheet open={!!selectedTurbine} onOpenChange={(open) => !open && setSelectedTurbine(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {selectedTurbineData?.turbine_id || "Turbine Details"}
            </SheetTitle>
          </SheetHeader>
          {selectedTurbineData && (
            <div className="mt-6 space-y-4">
              <div>
                <div className="text-sm font-medium">Status</div>
                <Badge 
                  className={
                    selectedTurbineData.status === 'online' ? 'bg-emerald-500' :
                    selectedTurbineData.status === 'warning' ? 'bg-amber-500' : 
                    selectedTurbineData.status === 'critical' ? 'bg-rose-500' : 'bg-slate-400'
                  }
                >
                  {selectedTurbineData.status}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium">Health Score</div>
                <div className="text-2xl font-bold">
                  {Number(selectedTurbineData.health_score ?? 0).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Current Power</div>
                <div className="text-xl">
                  {Number(selectedTurbineData.latest_values.power_kw ?? 0).toFixed(0)} kW
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Rotor Speed</div>
                <div className="text-xl">
                  {Number(selectedTurbineData.latest_values.rotor_speed_rpm ?? 0).toFixed(1)} rpm
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Capacity</div>
                <div className="text-xl">
                  {Number(selectedTurbineData.capacity_kw ?? 2000).toFixed(0)} kW
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Generator Type</div>
                <div className="text-xl">{selectedTurbineData.generator_type || "N/A"}</div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
