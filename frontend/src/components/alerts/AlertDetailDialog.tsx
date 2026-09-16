"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  Info,
  Clock,
  Wind,
  User,
  CheckCircle,
  Brain,
  MessageSquare,
  Paperclip,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { Alert as AlertType } from "@/lib/types";

interface AlertDetailDialogProps {
  alert: AlertType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string, data: Partial<AlertType>) => void;
  onAssign: (alertId: string, userId: string) => void;
}

const teamMembers = [
  { id: "user1", name: "John Smith", role: "Lead Engineer" },
  { id: "user2", name: "Sarah Johnson", role: "Maintenance Tech" },
  { id: "user3", name: "Mike Davis", role: "Operations Manager" },
  { id: "user4", name: "Emily Chen", role: "Analyst" },
];

export function AlertDetailDialog({
  alert,
  open,
  onOpenChange,
  onAcknowledge,
  onResolve,
  onAssign,
}: AlertDetailDialogProps) {
  const [resolutionMethod, setResolutionMethod] = useState<string>("");
  const [rootCause, setRootCause] = useState("");
  const [actionsTaken, setActionsTaken] = useState("");
  const [preventiveMeasures, setPreventiveMeasures] = useState("");
  const [comment, setComment] = useState("");

  if (!alert) return null;

  const getSeverityIcon = (severity: AlertType["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertOctagon className="h-5 w-5" />;
      case "high":
        return <AlertTriangle className="h-5 w-5" />;
      case "medium":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: AlertType["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-rose-600 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const duration = Math.round((new Date().getTime() - alert.triggeredAt.getTime()) / (1000 * 60));

  // Generate trend data for chart
  const trendData = Array.from({ length: 60 }, (_, i) => {
    const timestamp = new Date(alert.triggeredAt.getTime() - (60 - i) * 60 * 1000);
    const baseValue = alert.currentValue;
    const variation = (Math.random() - 0.5) * baseValue * 0.1;
    return {
      time: timestamp.toISOString(),
      value: baseValue + variation,
      threshold: alert.thresholdValue,
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                {getSeverityIcon(alert.severity)}
                {alert.title}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4 mt-2">
                <Link
                  href={`/turbine/${alert.turbineId}`}
                  className="flex items-center gap-1 hover:underline"
                >
                  <Wind className="h-4 w-4" />
                  {alert.turbineId}
                </Link>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(alert.triggeredAt, "PPP p")}
                </span>
              </DialogDescription>
            </div>
            <Badge className={getSeverityColor(alert.severity)}>
              {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="space-y-4">
              {/* Alert Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Alert Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Severity</div>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {getSeverityIcon(alert.severity)}
                        <span className="ml-1 capitalize">{alert.severity}</span>
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Type</div>
                      <Badge variant="outline">{alert.type}</Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Detected At</div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(alert.triggeredAt, "PPP p")}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Duration</div>
                      <div>{duration} minutes</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Affected Turbine</div>
                      <Link href={`/turbine/${alert.turbineId}`} className="text-primary hover:underline">
                        {alert.turbineId}
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Assigned To</div>
                      <Select
                        value={alert.assignedTo || "unassigned"}
                        onValueChange={(value) => onAssign(alert.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{alert.description}</p>
                  {alert.rootCause && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4" />
                        <span className="font-medium">Root Cause Analysis</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.rootCause}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Readings */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Readings</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parameter</TableHead>
                        <TableHead>Current Value</TableHead>
                        <TableHead>Threshold</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alert.affectedParameters.map((param, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{param.name}</TableCell>
                          <TableCell>
                            {param.value} {param.unit}
                          </TableCell>
                          <TableCell>
                            {param.threshold} {param.unit}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                param.value > param.threshold ? "destructive" : "default"
                              }
                            >
                              {param.value > param.threshold ? "Exceeded" : "Normal"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Visual Context */}
              <Card>
                <CardHeader>
                  <CardTitle>Parameter Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={(time: any) => time ? format(new Date(time), "HH:mm") : ''}
                      />
                      <YAxis />
                      <RechartsTooltip
                        labelFormatter={(time: any) => time ? format(new Date(time), "PPP p") : ''}
                      />
                      <ReferenceLine
                        y={alert.thresholdValue}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        label="Threshold"
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Event Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-4">
                      {alert.timeline.map((event, idx) => (
                        <div key={idx} className="relative pl-10">
                          <div className="absolute left-2 top-1 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{event.event}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(event.timestamp, "PPP p")}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {event.user}
                              {event.userRole && ` • ${event.userRole}`}
                            </div>
                            {event.note && (
                              <div className="text-sm bg-muted p-2 rounded mt-2">
                                {event.note}
                              </div>
                            )}
                          </div>
                          {idx < alert.timeline.length - 1 && <Separator className="mt-4" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diagnostics" className="space-y-4">
              {alert.diagnostics && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Parameter Correlation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parameter</TableHead>
                            <TableHead>Value at Alert</TableHead>
                            <TableHead>Normal Range</TableHead>
                            <TableHead>Deviation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {alert.diagnostics.correlatedParams.map((param, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{param.name}</TableCell>
                              <TableCell>{param.value}</TableCell>
                              <TableCell>
                                {param.normalRange.min} - {param.normalRange.max}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={param.deviation > 50 ? "destructive" : "default"}
                                >
                                  {param.deviation.toFixed(1)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Similar Incidents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Turbine</TableHead>
                            <TableHead>Resolution</TableHead>
                            <TableHead>Time to Resolve</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {alert.diagnostics.similarIncidents.map((incident, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{format(incident.date, "PPP")}</TableCell>
                              <TableCell>{incident.turbine}</TableCell>
                              <TableCell>{incident.resolution}</TableCell>
                              <TableCell>{incident.timeToResolve} min</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              {alert.recommendations && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommended Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="list-decimal list-inside space-y-2">
                      {alert.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm">{rec}</li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}

              {alert.status !== "resolved" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resolution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={resolutionMethod} onValueChange={setResolutionMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Resolution method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="false_positive">False Positive</SelectItem>
                        <SelectItem value="duplicate">Duplicate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Root cause identified..."
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                    />
                    <Textarea
                      placeholder="Actions taken..."
                      value={actionsTaken}
                      onChange={(e) => setActionsTaken(e.target.value)}
                    />
                    <Textarea
                      placeholder="Preventive measures..."
                      value={preventiveMeasures}
                      onChange={(e) => setPreventiveMeasures(e.target.value)}
                    />
                    <Button
                      onClick={() => {
                        onResolve(alert.id, {
                          resolutionMethod: resolutionMethod as any,
                          rootCause,
                          actionsTaken,
                          preventiveMeasures,
                        });
                        onOpenChange(false);
                      }}
                      disabled={!resolutionMethod}
                    >
                      Mark as Resolved
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-4">
                      {alert.commentCount > 0 ? (
                        <div className="text-sm text-muted-foreground">
                          {alert.commentCount} comment{alert.commentCount > 1 ? "s" : ""}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          No comments yet
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <Button
                      onClick={() => {
                        // Handle comment submission
                        setComment("");
                      }}
                    >
                      Add Comment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          {alert.status === "active" && (
            <Button onClick={() => onAcknowledge(alert.id)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Acknowledge
            </Button>
          )}
          {alert.status === "acknowledged" && (
            <Button onClick={() => onResolve(alert.id, {})}>
              Start Investigation
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


