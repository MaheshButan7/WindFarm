"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
// import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AlertFilters as AlertFiltersType, Alert } from "@/lib/types";
import { useAppStore } from "@/lib/store";

interface AlertFiltersProps {
  alerts: Alert[];
  filters: AlertFiltersType;
  onFiltersChange: (filters: Partial<AlertFiltersType>) => void;
  onReset: () => void;
}

const alertTypeCategories = {
  mechanical: [
    "Vibration Anomaly",
    "Bearing Failure",
    "Gearbox Fault",
    "Blade Damage",
  ],
  thermal: [
    "Temperature Threshold Exceeded",
    "Cooling System Fault",
    "Overheating Warning",
  ],
  electrical: [
    "Grid Connection Lost",
    "Power Quality Issue",
    "Generator Fault",
    "Voltage Fluctuation",
  ],
  performance: [
    "Underperformance",
    "Efficiency Drop",
    "Production Loss",
  ],
  system: [
    "Communication Failure",
    "Sensor Malfunction",
    "Control System Error",
  ],
};

const teamMembers = [
  { id: "user1", name: "John Smith" },
  { id: "user2", name: "Sarah Johnson" },
  { id: "user3", name: "Mike Davis" },
  { id: "user4", name: "Emily Chen" },
];

export function AlertFilters({ alerts, filters, onFiltersChange, onReset }: AlertFiltersProps) {
  const turbines = useAppStore((state) => state.farm.turbines);
  const [turbineSearchOpen, setTurbineSearchOpen] = useState(false);

  const statusOptions = [
    { value: "active", label: "Active", count: alerts.filter(a => a.status === "active").length },
    { value: "acknowledged", label: "Acknowledged", count: alerts.filter(a => a.status === "acknowledged").length },
    { value: "investigating", label: "Investigating", count: alerts.filter(a => a.status === "investigating").length },
    { value: "resolved", label: "Resolved", count: alerts.filter(a => a.status === "resolved").length },
    { value: "dismissed", label: "Dismissed", count: alerts.filter(a => a.status === "dismissed").length },
  ];

  const severityOptions = [
    { value: "critical", label: "Critical", color: "bg-rose-600" },
    { value: "high", label: "High", color: "bg-orange-500" },
    { value: "medium", label: "Medium", color: "bg-yellow-500" },
    { value: "low", label: "Low", color: "bg-blue-500" },
    { value: "info", label: "Info", color: "bg-slate-500" },
  ];

  const toggleStatus = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ status: newStatuses });
  };

  const toggleSeverity = (severity: string) => {
    const newSeverities = filters.severity.includes(severity)
      ? filters.severity.filter(s => s !== severity)
      : [...filters.severity, severity];
    onFiltersChange({ severity: newSeverities });
  };

  const toggleType = (type: string) => {
    const newTypes = filters.type.includes(type)
      ? filters.type.filter(t => t !== type)
      : [...filters.type, type];
    onFiltersChange({ type: newTypes });
  };

  const toggleTurbine = (turbineId: string) => {
    const newTurbines = filters.turbines.includes(turbineId)
      ? filters.turbines.filter(t => t !== turbineId)
      : [...filters.turbines, turbineId];
    onFiltersChange({ turbines: newTurbines });
  };

  const activeFilterCount = 
    filters.status.length +
    filters.severity.length +
    filters.type.length +
    filters.turbines.length +
    (filters.dateRange?.start ? 1 : 0) +
    (filters.dateRange?.end ? 1 : 0) +
    (filters.assignedTo ? 1 : 0) +
    (filters.priority ? 1 : 0);

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ScrollArea className="h-[calc(100vh-300px)] pr-4">
          <div className="space-y-6">
            {/* Status Filter */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Status</h4>
              <div className="space-y-2">
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={filters.status.includes(option.value)}
                      onCheckedChange={() => toggleStatus(option.value)}
                    />
                    <label
                      htmlFor={`status-${option.value}`}
                      className="text-sm font-normal cursor-pointer flex-1 flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      <Badge variant="outline" className="ml-2">
                        {option.count}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Severity Filter */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Severity</h4>
              <div className="space-y-2">
                {severityOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`severity-${option.value}`}
                      checked={filters.severity.includes(option.value)}
                      onCheckedChange={() => toggleSeverity(option.value)}
                    />
                    <label
                      htmlFor={`severity-${option.value}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      <Badge
                        variant="outline"
                        className={`${option.color} text-white border-0`}
                      >
                        {option.label}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Alert Type Filter */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Alert Type</h4>
              <Accordion type="multiple" className="w-full">
                {Object.entries(alertTypeCategories).map(([category, types]) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger className="text-sm capitalize">
                      {category} Issues
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {types.map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={`type-${type}`}
                              checked={filters.type.includes(type)}
                              onCheckedChange={() => toggleType(type)}
                            />
                            <label
                              htmlFor={`type-${type}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {type}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <Separator />

            {/* Turbine Selection */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Turbine</h4>
              <Popover open={turbineSearchOpen} onOpenChange={setTurbineSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                  >
                    {filters.turbines.length === 0
                      ? "Select turbines..."
                      : `${filters.turbines.length} selected`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-2">
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        if (filters.turbines.length === turbines.length) {
                          onFiltersChange({ turbines: [] });
                        } else {
                          onFiltersChange({ turbines: turbines.map(t => t.turbine_id) });
                        }
                      }}
                    >
                      {filters.turbines.length === turbines.length ? "Clear All" : "Select All"}
                    </Button>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {turbines.map((turbine) => (
                          <div
                            key={turbine.turbine_id}
                            className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer"
                            onClick={() => toggleTurbine(turbine.turbine_id)}
                          >
                            <Checkbox
                              checked={filters.turbines.includes(turbine.turbine_id)}
                              onCheckedChange={() => toggleTurbine(turbine.turbine_id)}
                            />
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm">{turbine.turbine_id}</span>
                              <Badge
                                variant="outline"
                                className={`h-2 w-2 p-0 ${
                                  turbine.status === 'online' ? 'bg-emerald-500' :
                                  turbine.status === 'warning' ? 'bg-amber-500' :
                                  turbine.status === 'critical' ? 'bg-rose-500' : 'bg-slate-400'
                                }`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
              {filters.turbines.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {filters.turbines.slice(0, 3).map((turbineId) => (
                    <Badge key={turbineId} variant="secondary" className="text-xs">
                      {turbineId}
                    </Badge>
                  ))}
                  {filters.turbines.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{filters.turbines.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Date Range Filter */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Date Range</h4>
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateRange?.start && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.start ? (
                        format(filters.dateRange.start, "PPP")
                      ) : (
                        <span>Start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.start || undefined}
                      onSelect={(date) =>
                        onFiltersChange({
                          dateRange: {
                            start: date || null,
                            end: filters.dateRange?.end || null,
                          },
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateRange?.end && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.end ? (
                        format(filters.dateRange.end, "PPP")
                      ) : (
                        <span>End date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.end || undefined}
                      onSelect={(date) =>
                        onFiltersChange({
                          dateRange: {
                            start: filters.dateRange?.start || null,
                            end: date || null,
                          },
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const today = new Date();
                      onFiltersChange({
                        dateRange: { start: today, end: today },
                      });
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(start.getDate() - 7);
                      onFiltersChange({ dateRange: { start, end } });
                    }}
                  >
                    Last 7d
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(start.getDate() - 30);
                      onFiltersChange({ dateRange: { start, end } });
                    }}
                  >
                    Last 30d
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Assigned To Filter */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Assigned To</h4>
              <Select
                value={filters.assignedTo || "all"}
                onValueChange={(value) =>
                  onFiltersChange({ assignedTo: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="me">Me</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Priority Filter */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Priority</h4>
              <ToggleGroup
                type="single"
                value={filters.priority || "all"}
                onValueChange={(value) =>
                  onFiltersChange({ priority: value === "all" ? undefined : value })
                }
                className="flex flex-col gap-2"
              >
                <ToggleGroupItem value="all" aria-label="All" className="w-full justify-start">
                  All
                </ToggleGroupItem>
                <ToggleGroupItem value="immediate" aria-label="Immediate" className="w-full justify-start">
                  Immediate Action Required
                </ToggleGroupItem>
                <ToggleGroupItem value="scheduled" aria-label="Scheduled" className="w-full justify-start">
                  Scheduled Maintenance
                </ToggleGroupItem>
                <ToggleGroupItem value="review" aria-label="Review" className="w-full justify-start">
                  For Review
                </ToggleGroupItem>
                <ToggleGroupItem value="low" aria-label="Low" className="w-full justify-start">
                  Low Priority
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </ScrollArea>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={() => {
              // Apply filters - already applied via onFiltersChange
            }}
            className="w-full"
          >
            Apply Filters
          </Button>
          <Button
            variant="outline"
            onClick={onReset}
            className="w-full"
          >
            Reset All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

