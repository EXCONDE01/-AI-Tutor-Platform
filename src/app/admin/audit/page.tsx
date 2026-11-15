"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Download, Calendar, AlertTriangle, Info, AlertCircle, FileText, User, Building2, Shield } from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { AUDIT_RESOURCE_TYPES, AUDIT_RESOURCE_TYPE_LABELS, AUDIT_DB_ACTIONS } from "@/lib/compliance/audit-options";

interface AuditLog {
  id: string;
  districtId: string | null;
  districtName: string | null;
  schoolId: string | null;
  schoolName: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  severity: "info" | "warning" | "critical";
  description: string;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  sessionId: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

interface ComplianceStats {
  totalEvents: number;
  bySeverity: Array<{ severity: string; count: number }>;
  byAction: Array<{ action: string; count: number }>;
  byResourceType: Array<{ resourceType: string; count: number }>;
  daily: Array<{ date: string; count: number }>;
}

const SEVERITIES = ["info", "warning", "critical"] as const;

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"logs" | "stats">("logs");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.set("search", search);
      if (actionFilter) params.set("action", actionFilter);
      if (resourceTypeFilter) params.set("resourceType", resourceTypeFilter);
      if (severityFilter) params.set("severity", severityFilter);
      if (userIdFilter) params.set("userId", userIdFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
        setTotal(data.pagination.total);
      } else {
        toast.error("Failed to fetch audit logs");
      }
    } catch (error) {
      toast.error("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, actionFilter, resourceTypeFilter, severityFilter, userIdFilter, startDate, endDate]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      if (actionFilter) params.set("action", actionFilter);
      if (resourceTypeFilter) params.set("resourceType", resourceTypeFilter);

      const res = await fetch(`/api/admin/audit/stats?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, [actionFilter, resourceTypeFilter, startDate, endDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: "csv",
        startDate,
        endDate,
      });
      if (actionFilter) params.set("action", actionFilter);
      if (resourceTypeFilter) params.set("resourceType", resourceTypeFilter);
      if (severityFilter) params.set("severity", severityFilter);
      if (userIdFilter) params.set("userId", userIdFilter);

      const res = await fetch(`/api/admin/audit/export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Export downloaded");
      } else {
        toast.error("Failed to export");
      }
    } catch (error) {
      toast.error("Failed to export");
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple"> = {
      info: "info",
      warning: "warning",
      critical: "destructive",
    };
    const icons = {
      info: Info,
      warning: AlertTriangle,
      critical: AlertCircle,
    };
    const Icon = icons[severity as keyof typeof icons] || Info;
    return (
      <Badge variant={variants[severity] || "default"} className="gap-1">
        <Icon className="h-3 w-3" />
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const getActionLabel = (action: string) => {
    return action
      .split("_")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Audit Logs</h1>
          <p className="text-muted-foreground">Monitor and review compliance-related activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value: "logs" | "stats") => setActiveTab(value)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">
            <FileText className="mr-2 h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Shield className="mr-2 h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="pl-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Actions</SelectItem>
                    {AUDIT_DB_ACTIONS.map(action => (
                      <SelectItem key={action} value={action}>{getActionLabel(action)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={resourceTypeFilter} onValueChange={v => { setResourceTypeFilter(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    {AUDIT_RESOURCE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{AUDIT_RESOURCE_TYPE_LABELS[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={v => { setSeverityFilter(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Severities</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid gap-2 grid-cols-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setPage(1); }}
                    max={endDate}
                    placeholder="Start date"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setPage(1); }}
                    min={startDate}
                    max={format(new Date(), "yyyy-MM-dd")}
                    placeholder="End date"
                  />
                </div>
                <Input
                  placeholder="User ID"
                  value={userIdFilter}
                  onChange={e => { setUserIdFilter(e.target.value); setPage(1); }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs ({total})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Resource</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Scope</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map(log => (
                          <TableRow
                            key={log.id}
                            onClick={() => { setSelectedLog(log); setIsDetailOpen(true); }}
                            className="cursor-pointer hover:bg-accent"
                          >
                            <TableCell className="font-mono text-sm whitespace-nowrap">
                              {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{getActionLabel(log.action)}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{log.resourceType}</span>
                              {log.resourceId && <span className="text-muted-foreground ml-1 text-sm">#{log.resourceId.slice(0, 8)}</span>}
                            </TableCell>
                            <TableCell>
                              {log.userEmail ? (
                                <div>
                                  <span className="font-medium">{log.userName || log.userEmail}</span>
                                  <span className="text-muted-foreground text-xs ml-1">({log.userEmail})</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">System</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.districtName && <span className="text-sm text-muted-foreground">{log.districtName}</span>}
                              {log.schoolName && <span className="text-sm text-muted-foreground ml-1">→ {log.schoolName}</span>}
                              {!log.districtName && !log.schoolName && <span className="text-muted-foreground text-sm">Global</span>}
                            </TableCell>
                            <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                            <TableCell className="max-w-md truncate">{log.description}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setSelectedLog(log); setIsDetailOpen(true); }}>
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">
                      Showing {logs.length} of {total} logs
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total}>
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          {stats && (
            <div className="grid gap-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {stats.bySeverity.find(s => s.severity === "critical")?.count || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Require attention</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Warnings</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">
                      {stats.bySeverity.find(s => s.severity === "warning")?.count || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Review recommended</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Info Events</CardTitle>
                    <Info className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {stats.bySeverity.find(s => s.severity === "info")?.count || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Informational</p>
                  </CardContent>
                </Card>
              </div>

              {/* By Severity */}
              <Card>
                <CardHeader>
                  <CardTitle>Events by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {stats.bySeverity.map(s => (
                      <div key={s.severity} className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{s.severity}</span>
                          <Badge variant={s.severity === "critical" ? "destructive" : s.severity === "warning" ? "warning" : "info"}>
                            {s.count}
                          </Badge>
                        </div>
                        <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(s.count / stats.totalEvents) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* By Action */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.byAction.slice(0, 10).map((a, i) => (
                      <div key={a.action} className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground w-8">{i + 1}.</span>
                        <span className="font-mono text-sm flex-1">{getActionLabel(a.action)}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(a.count / stats.byAction[0]?.count || 1) * 100}%` }}
                          />
                        </div>
                        <Badge variant="secondary" className="w-16 text-right">{a.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* By Resource Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Events by Resource Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.byResourceType.map(r => (
                      <div key={r.resourceType} className="flex items-center gap-4">
                        <span className="font-mono text-sm w-40">{r.resourceType}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(r.count / stats.byResourceType[0]?.count || 1) * 100}%` }}
                          />
                        </div>
                        <Badge variant="secondary" className="w-16 text-right">{r.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Daily Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.daily.slice(-14).map(d => (
                      <div key={d.date} className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground w-24">{format(new Date(d.date), "MMM d")}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(d.count / Math.max(...stats.daily.map(x => x.count), 1)) * 100}%` }}
                          />
                        </div>
                        <Badge variant="secondary" className="w-16 text-right">{d.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>{selectedLog ? getActionLabel(selectedLog.action) : ""}</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>ID</Label>
                  <p className="font-mono text-sm">{selectedLog.id}</p>
                </div>
                <div>
                  <Label>Timestamp</Label>
                  <p>{format(new Date(selectedLog.createdAt), "PPpp")}</p>
                </div>
                <div>
                  <Label>Action</Label>
                  <Badge variant="outline">{getActionLabel(selectedLog.action)}</Badge>
                </div>
                <div>
                  <Label>Severity</Label>
                  {getSeverityBadge(selectedLog.severity)}
                </div>
                <div>
                  <Label>Resource Type</Label>
                  <p className="font-mono text-sm">{selectedLog.resourceType}</p>
                </div>
                <div>
                  <Label>Resource ID</Label>
                  <p className="font-mono text-sm">{selectedLog.resourceId || "—"}</p>
                </div>
                <div>
                  <Label>User</Label>
                  <p>{selectedLog.userName || selectedLog.userEmail || "System"}</p>
                </div>
                <div>
                  <Label>User ID</Label>
                  <p className="font-mono text-sm">{selectedLog.userId || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Scope</Label>
                  <p>
                    {selectedLog.districtName && <span>{selectedLog.districtName}</span>}
                    {selectedLog.schoolName && <span className="ml-2">→ {selectedLog.schoolName}</span>}
                    {!selectedLog.districtName && !selectedLog.schoolName && <span className="text-muted-foreground">Global</span>}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <p>{selectedLog.description}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>IP Address</Label>
                  <p className="font-mono text-sm">{selectedLog.ipAddress || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Request ID</Label>
                  <p className="font-mono text-sm">{selectedLog.requestId || "—"}</p>
                </div>
                {selectedLog.oldValues && (
                  <div className="md:col-span-2">
                    <Label>Old Values</Label>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.oldValues, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.newValues && (
                  <div className="md:col-span-2">
                    <Label>New Values</Label>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.newValues, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="md:col-span-2">
                    <Label>Metadata</Label>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}