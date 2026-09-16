"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  Info,
  Clock,
  Wind,
  Check,
  UserPlus,
  Eye,
  X,
  Paperclip,
  MessageSquare,
  Search,
  List,
  Grid3x3,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAppStore } from "@/lib/store";
import type { Alert } from "@/lib/types";

interface AlertsListProps {
  alerts: Alert[];
  loading?: boolean;
  onAlertClick: (alert: Alert) => void;
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
  onAssign: (alertId: string) => void;
}

type SortOption = "recent" | "oldest" | "severity" | "turbine" | "status";
type ViewMode = "list" | "grid" | "timeline";

export function AlertsList({
  alerts,
  loading,
  onAlertClick,
  onAcknowledge,
  onDismiss,
  onAssign,
}: AlertsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const selectedAlertIds = useAppStore((state) => state.alerts.selectedAlertIds);
  const toggleAlertSelection = useAppStore((state) => state.toggleAlertSelection);
  const selectAllAlerts = useAppStore((state) => state.selectAllAlerts);
  const clearAlertSelection = useAppStore((state) => state.clearAlertSelection);

  const filteredAndSortedAlerts = useMemo(() => {
    let filtered = alerts;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (alert) =>
          alert.title.toLowerCase().includes(query) ||
          alert.turbineId.toLowerCase().includes(query) ||
          alert.type.toLowerCase().includes(query) ||
          alert.description.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return b.triggeredAt.getTime() - a.triggeredAt.getTime();
        case "oldest":
          return a.triggeredAt.getTime() - b.triggeredAt.getTime();
        case "severity":
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        case "turbine":
          return a.turbineId.localeCompare(b.turbineId);
        case "status":
          const statusOrder = { active: 0, acknowledged: 1, investigating: 2, resolved: 3, dismissed: 4 };
          return statusOrder[a.status] - statusOrder[b.status];
        default:
          return 0;
      }
    });

    return sorted;
  }, [alerts, sortBy, searchQuery]);

  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedAlerts.slice(start, start + itemsPerPage);
  }, [filteredAndSortedAlerts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedAlerts.length / itemsPerPage);

  const getSeverityIcon = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertOctagon className="h-4 w-4" />;
      case "high":
        return <AlertTriangle className="h-4 w-4" />;
      case "medium":
        return <AlertCircle className="h-4 w-4" />;
      case "low":
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-rose-600 text-white border-rose-600";
      case "high":
        return "bg-orange-500 text-white border-orange-500";
      case "medium":
        return "bg-yellow-500 text-white border-yellow-500";
      case "low":
        return "bg-blue-500 text-white border-blue-500";
      default:
        return "bg-slate-500 text-white border-slate-500";
    }
  };

  const getStatusDot = (status: Alert["status"]) => {
    switch (status) {
      case "active":
        return <div className="h-2 w-2 bg-rose-500 rounded-full animate-pulse" />;
      case "acknowledged":
        return <div className="h-2 w-2 bg-amber-500 rounded-full" />;
      case "investigating":
        return <div className="h-2 w-2 bg-blue-500 rounded-full" />;
      case "resolved":
        return <div className="h-2 w-2 bg-emerald-500 rounded-full" />;
      default:
        return <div className="h-2 w-2 bg-slate-400 rounded-full" />;
    }
  };

  const getBorderColor = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return "border-l-4 border-rose-600";
      case "high":
        return "border-l-4 border-orange-500";
      case "medium":
        return "border-l-4 border-yellow-500";
      case "low":
        return "border-l-4 border-blue-500";
      default:
        return "border-l-4 border-slate-500";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="severity">Severity (High to Low)</SelectItem>
              <SelectItem value="turbine">Turbine ID</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as ViewMode)}>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <Grid3x3 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="timeline" aria-label="Timeline view">
              <Calendar className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Results Count and Bulk Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {paginatedAlerts.length} of {filteredAndSortedAlerts.length} alerts
        </p>
        {selectedAlertIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                selectedAlertIds.forEach((id) => onAcknowledge(id));
                clearAlertSelection();
              }}
            >
              <Check className="h-4 w-4 mr-2" />
              Acknowledge Selected ({selectedAlertIds.length})
            </Button>
            <Button variant="outline" size="sm" onClick={clearAlertSelection}>
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      {/* Select All Checkbox */}
      {alerts.length > 0 && (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={selectedAlertIds.length === paginatedAlerts.length && paginatedAlerts.length > 0}
            onCheckedChange={(checked) => {
              if (checked) {
                selectAllAlerts(paginatedAlerts.map((a) => a.id));
              } else {
                clearAlertSelection();
              }
            }}
          />
          <label className="text-sm text-muted-foreground cursor-pointer">
            Select all on this page
          </label>
        </div>
      )}

      {/* Alerts List */}
      {paginatedAlerts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="space-y-2">
            <Check className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-semibold">No alerts found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search query" : "All systems operating normally"}
            </p>
          </div>
        </Card>
      ) : (
        <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
          {paginatedAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`${getBorderColor(alert.severity)} hover:shadow-lg transition-all duration-200 hover:scale-[1.01] cursor-pointer ${
                !alert.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""
              }`}
              onClick={() => onAlertClick(alert)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <Checkbox
                    checked={selectedAlertIds.includes(alert.id)}
                    onCheckedChange={(e) => {
                      e.stopPropagation();
                      toggleAlertSelection(alert.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {getSeverityIcon(alert.severity)}
                          <span className="ml-1 capitalize">{alert.severity}</span>
                        </Badge>
                        <Link
                          href={`/turbine/${alert.turbineId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-sm font-medium hover:underline"
                        >
                          <Wind className="h-3 w-3" />
                          {alert.turbineId}
                        </Link>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(alert.triggeredAt, { addSuffix: true })}
                        </div>
                      </div>
                      {getStatusDot(alert.status)}
                    </div>

                    {/* Title and Description */}
                    <div>
                      <h3 className="font-semibold text-base mb-1">{alert.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{alert.description}</p>
                    </div>

                    {/* Affected Parameters */}
                    {alert.affectedParameters.length > 0 && (
                      <div className="space-y-1">
                        {alert.affectedParameters.slice(0, 2).map((param, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{param.name}:</span>
                            <span className="font-medium">
                              {param.value} {param.unit} / {param.threshold} {param.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tags and Metadata */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {alert.type}
                      </Badge>
                      {alert.assignedToName && (
                        <Badge variant="outline" className="text-xs">
                          <UserPlus className="h-3 w-3 mr-1" />
                          {alert.assignedToName}
                        </Badge>
                      )}
                      {alert.hasAttachments && alert.attachmentCount && (
                        <Badge variant="outline" className="text-xs">
                          <Paperclip className="h-3 w-3 mr-1" />
                          {alert.attachmentCount}
                        </Badge>
                      )}
                      {alert.commentCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {alert.commentCount}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAcknowledge(alert.id);
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Acknowledge
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssign(alert.id);
                        }}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAlertClick(alert);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(alert.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Items per page:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


