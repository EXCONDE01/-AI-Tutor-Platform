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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Download, AlertTriangle, CheckCircle, XCircle, Clock, User, Building2, MoreVertical, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ConsentRecord {
  id: string;
  districtId: string | null;
  districtName: string | null;
  schoolId: string | null;
  schoolName: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  studentId: string | null;
  studentName: string | null;
  type: string;
  status: "granted" | "denied" | "withdrawn" | "expired" | "pending";
  version: string;
  policyUrl: string | null;
  consentText: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  witnessId: string | null;
  grantedAt: string | null;
  withdrawnAt: string | null;
  expiresAt: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export default function AdminConsentPage() {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [studentIdFilter, setStudentIdFilter] = useState("");
  const [districtIdFilter, setDistrictIdFilter] = useState("");
  const [schoolIdFilter, setSchoolIdFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<ConsentRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"records" | "ferpa">("records");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (userIdFilter) params.set("userId", userIdFilter);
      if (studentIdFilter) params.set("studentId", studentIdFilter);
      if (districtIdFilter) params.set("districtId", districtIdFilter);
      if (schoolIdFilter) params.set("schoolId", schoolIdFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/compliance/consent?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.data);
        setTotal(data.pagination.total);
      } else {
        toast.error("Failed to fetch consent records");
      }
    } catch (error) {
      toast.error("Failed to fetch consent records");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, typeFilter, statusFilter, userIdFilter, studentIdFilter, districtIdFilter, schoolIdFilter, startDate, endDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecords();
  }, [fetchRecords]);

  const handleFerpaAction = async (recordId: string, approved: boolean) => {
    try {
      const res = await fetch("/api/admin/compliance/consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, action: approved ? "approve_ferpa_optout" : "deny_ferpa_optout" }),
      });
      if (res.ok) {
        toast.success(approved ? "FERPA opt-out approved" : "FERPA opt-out denied");
        fetchRecords();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to process");
      }
    } catch (error) {
      toast.error("Failed to process");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple"> = {
      granted: "success",
      denied: "destructive",
      withdrawn: "warning",
      expired: "warning",
      pending: "secondary",
    };
    const icons = {
      granted: CheckCircle,
      denied: XCircle,
      withdrawn: AlertTriangle,
      expired: Clock,
      pending: Clock,
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    return (
      <Badge variant={variants[status] || "default"} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Consent Records</h1>
          <p className="text-muted-foreground">Monitor and manage user consent records</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value: "records" | "ferpa") => setActiveTab(value)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">
            <FileText className="mr-2 h-4 w-4" />
            All Records
          </TabsTrigger>
          <TabsTrigger value="ferpa">
            <Building2 className="mr-2 h-4 w-4" />
            FERPA Opt-Outs
          </TabsTrigger>
        </TabsList>

        {/* All Records Tab */}
        <TabsContent value="records">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Consent type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="terms_of_service">Terms of Service</SelectItem>
                    <SelectItem value="privacy_policy">Privacy Policy</SelectItem>
                    <SelectItem value="data_processing">Data Processing</SelectItem>
                    <SelectItem value="ai_interaction">AI Interaction</SelectItem>
                    <SelectItem value="data_sharing">Data Sharing</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="third_party_services">Third Party Services</SelectItem>
                    <SelectItem value="parental_consent">Parental Consent (COPPA)</SelectItem>
                    <SelectItem value="ferpa_consent">FERPA Consent</SelectItem>
                    <SelectItem value="coppa_consent">COPPA Consent</SelectItem>
                    <SelectItem value="gdpr_consent">GDPR Consent</SelectItem>
                    <SelectItem value="state_privacy_law">State Privacy Law</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="granted">Granted</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="User ID"
                  value={userIdFilter}
                  onChange={e => { setUserIdFilter(e.target.value); setPage(1); }}
                />
                <Input
                  placeholder="Student ID"
                  value={studentIdFilter}
                  onChange={e => { setStudentIdFilter(e.target.value); setPage(1); }}
                />
                <div className="grid gap-2 grid-cols-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setPage(1); }}
                    max={endDate || format(new Date(), "yyyy-MM-dd")}
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
              </div>
            </CardContent>
          </Card>

          {/* Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Consent Records ({total})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No consent records found
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>User / Student</TableHead>
                          <TableHead>Scope</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Granted</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map(record => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{getTypeLabel(record.type)}</Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell>
                              <div>
                                {record.userName && <span className="font-medium">{record.userName}</span>}
                                {record.userEmail && <span className="text-muted-foreground text-xs ml-1">({record.userEmail})</span>}
                                {record.studentName && (
                                  <div className="text-sm text-muted-foreground">
                                    Student: {record.studentName}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {record.districtName && <span className="text-sm text-muted-foreground">{record.districtName}</span>}
                              {record.schoolName && <span className="text-sm text-muted-foreground ml-1">→ {record.schoolName}</span>}
                              {!record.districtName && !record.schoolName && <span className="text-muted-foreground text-sm">Global</span>}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{record.version}</TableCell>
                            <TableCell>
                              {record.grantedAt ? format(new Date(record.grantedAt), "MMM d, yyyy") : "—"}
                            </TableCell>
                            <TableCell>
                              {record.expiresAt ? format(new Date(record.expiresAt), "MMM d, yyyy") : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => { setSelectedRecord(record); setIsDetailOpen(true); }}
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {record.type === "ferpa_consent" && record.status === "pending" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleFerpaAction(record.id, true)}
                                        className="text-success"
                                      >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approve Opt-Out
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleFerpaAction(record.id, false)}
                                        className="text-destructive"
                                      >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Deny Opt-Out
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">
                      Showing {records.length} of {total} records
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

        {/* FERPA Opt-Outs Tab */}
        <TabsContent value="ferpa">
          <Card>
            <CardHeader>
              <CardTitle>FERPA Directory Information Opt-Outs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Review and approve/deny directory information opt-out requests from parents or eligible students.
              </p>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : records.filter(r => r.type === "ferpa_consent").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No FERPA opt-out requests
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Fields</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Effective</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.filter(r => r.type === "ferpa_consent").map(record => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {record.studentName || record.studentId ? (
                              <div>
                                <span className="font-medium">{record.studentName || record.studentId}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.userName || record.userEmail || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {record.metadata?.fields?.join(", ") || "—"}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            {record.metadata?.effectiveFrom ? format(new Date(record.metadata.effectiveFrom), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {record.status === "pending" && (
                              <div className="flex items-center justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleFerpaAction(record.id, false)}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Deny
                                </Button>
                                <Button size="sm" onClick={() => handleFerpaAction(record.id, true)}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consent Record Details</DialogTitle>
            <DialogDescription>{selectedRecord ? getTypeLabel(selectedRecord.type) : ""}</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>ID</Label>
                  <p className="font-mono text-sm">{selectedRecord.id}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge variant="outline">{getTypeLabel(selectedRecord.type)}</Badge>
                </div>
                <div>
                  <Label>Status</Label>
                  {getStatusBadge(selectedRecord.status)}
                </div>
                <div>
                  <Label>Version</Label>
                  <p className="font-mono text-sm">{selectedRecord.version}</p>
                </div>
                <div>
                  <Label>User</Label>
                  <p>{selectedRecord.userName || selectedRecord.userEmail || "—"}</p>
                </div>
                <div>
                  <Label>User ID</Label>
                  <p className="font-mono text-sm">{selectedRecord.userId || "—"}</p>
                </div>
                <div>
                  <Label>Student</Label>
                  <p>{selectedRecord.studentName || selectedRecord.studentId || "—"}</p>
                </div>
                <div>
                  <Label>Student ID</Label>
                  <p className="font-mono text-sm">{selectedRecord.studentId || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Scope</Label>
                  <p>
                    {selectedRecord.districtName && <span>{selectedRecord.districtName}</span>}
                    {selectedRecord.schoolName && <span className="ml-2">→ {selectedRecord.schoolName}</span>}
                    {!selectedRecord.districtName && !selectedRecord.schoolName && <span className="text-muted-foreground">Global</span>}
                  </p>
                </div>
                <div>
                  <Label>Granted At</Label>
                  <p>{selectedRecord.grantedAt ? format(new Date(selectedRecord.grantedAt), "PPp") : "—"}</p>
                </div>
                <div>
                  <Label>Withdrawn At</Label>
                  <p>{selectedRecord.withdrawnAt ? format(new Date(selectedRecord.withdrawnAt), "PPp") : "—"}</p>
                </div>
                <div>
                  <Label>Expires At</Label>
                  <p>{selectedRecord.expiresAt ? format(new Date(selectedRecord.expiresAt), "PPp") : "—"}</p>
                </div>
                <div>
                  <Label>Created At</Label>
                  <p>{format(new Date(selectedRecord.createdAt), "PPp")}</p>
                </div>
                <div>
                  <Label>IP Address</Label>
                  <p className="font-mono text-sm">{selectedRecord.ipAddress || "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Consent Text</Label>
                  <p className="text-sm">{selectedRecord.consentText || "—"}</p>
                </div>
                {selectedRecord.metadata && Object.keys(selectedRecord.metadata).length > 0 && (
                  <div className="md:col-span-2">
                    <Label>Metadata</Label>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedRecord.metadata, null, 2)}
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