/**
 * Admin Data Deletion Requests page
 * Queue with status badges, verify/schedule/execute actions
 */

"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, CheckCircle2, Clock, Play, X, Trash2, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface DeletionRequest {
  id: string;
  districtId: string | null;
  schoolId: string | null;
  userId: string;
  studentId: string | null;
  requestedBy: string;
  status: string;
  reason: string | null;
  legalBasis: string | null;
  scope: Record<string, any>;
  verificationToken: string | null;
  verifiedAt: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  deletedRecordCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  userEmail: string | null;
  studentUserId: string | null;
}

const ACTIONS_BY_STATUS: Record<string, string[]> = {
  requested: ["verify", "cancel", "reject"],
  verified: ["schedule", "cancel", "reject"],
  scheduled: ["execute", "cancel", "reject"],
  in_progress: [],
  completed: [],
  failed: [],
  cancelled: [],
  rejected: [],
};

const STATUS_VARIANTS: Record<string, string> = {
  requested: "secondary",
  verified: "warning",
  scheduled: "warning",
  in_progress: "info",
  completed: "success",
  failed: "destructive",
  cancelled: "outline",
  rejected: "destructive",
};

export default function AdminDeletionRequestsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [dialogAction, setDialogAction] = useState<"verify" | "schedule" | "execute" | "cancel" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      const res = await fetch(`/api/admin/deletion-requests?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data || []);
        setTotal(data.pagination?.total || 0);
      } else {
        toast.error("Failed to load deletion requests");
      }
    } catch (error) {
      toast.error("Failed to load deletion requests");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRequests();
  }, [fetchRequests]);

  const updateStatus = async (status: "verified" | "scheduled" | "cancelled" | "rejected", actorNote?: string) => {
    if (!selectedRequest) return;
    try {
      const body: Record<string, any> = { status };
      if (actorNote) body.note = actorNote;
      if (status === "scheduled" && scheduledAt) body.scheduledAt = scheduledAt;

      const res = await fetch(`/api/admin/deletion-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (res.ok) {
        toast.success(`Request ${status}`);
        setSelectedRequest(null);
        setDialogAction(null);
        setNote("");
        setScheduledAt("");
        fetchRequests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update request");
      }
    } catch (error) {
      toast.error("Failed to update request");
    }
  };

  const executeDeletion = async () => {
    if (!selectedRequest) return;
    try {
      const res = await fetch(`/api/admin/deletion-requests/${selectedRequest.id}/execute`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Deletion started");
        setSelectedRequest(null);
        setDialogAction(null);
        fetchRequests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to execute deletion");
      }
    } catch (error) {
      toast.error("Failed to execute deletion");
    }
  };

  const handleAction = (action: "verify" | "schedule" | "execute" | "cancel" | "reject") => {
    setDialogAction(action);
    setNote("");
    setScheduledAt("");
  };

  const statusBadge = (status: string) => (
    <Badge variant={STATUS_VARIANTS[status] || "default" as any}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );

  const availableActions = (req: DeletionRequest) => ACTIONS_BY_STATUS[req.status] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Deletion Requests</h1>
          <p className="text-muted-foreground">
            Review, verify, schedule, and execute user data deletion requests
          </p>
        </div>
        <Button onClick={() => fetchRequests()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...new Set(requests.map(r => r.status))].map(status => {
          const count = requests.filter(r => r.status === status).length;
          return (
            <Card key={status}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{status.charAt(0).toUpperCase() + status.slice(1)}</CardTitle>
                <Badge variant={STATUS_VARIANTS[status] || "default" as any}>{count}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deletion Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Clock className="animate-spin h-8 w-8" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No deletion requests found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Legal Basis</TableHead>
                      <TableHead className="text-right">Requested</TableHead>
                      <TableHead className="text-right">Records</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {req.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{req.userEmail || req.userId.slice(0, 8)}</div>
                          <div className="text-xs text-muted-foreground">ID: {req.userId.slice(0, 8)}</div>
                        </TableCell>
                        <TableCell>
                          {req.studentId ? (
                            <div className="text-sm">
                              Student {req.studentId.slice(0, 8)}
                              {req.studentUserId ? <span className="text-xs text-muted-foreground ml-1">(user {req.studentUserId.slice(0, 8)})</span> : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(req.status)}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {req.legalBasis || "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {Object.values(req.deletedRecordCounts).reduce((a, b) => a + b, 0) || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {availableActions(req).map(action => {
                              const label = action.charAt(0).toUpperCase() + action.slice(1);
                              const iconMap: Record<string, React.ElementType> = {
                                verify: CheckCircle2,
                                schedule: Clock,
                                execute: Play,
                                cancel: X,
                                reject: Trash2,
                              };
                              const Icon = iconMap[action];
                              return (
                                <Button
                                  key={action}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAction(action as any)}
                                  title={label}
                                >
                                  <Icon className="h-3 w-3" />
                                </Button>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Showing {requests.length} of {total} requests
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * pageSize >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={selectedRequest !== null && dialogAction !== null} onOpenChange={open => {
        if (!open) { setSelectedRequest(null); setDialogAction(null); setNote(""); setScheduledAt(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "verify" ? "Verify Request" :
               dialogAction === "schedule" ? "Schedule Deletion" :
               dialogAction === "execute" ? "Execute Deletion" :
               dialogAction === "cancel" ? "Cancel Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest ? `Request ${selectedRequest.id.slice(0, 8)} for user ${selectedRequest.userEmail || selectedRequest.userId}` : ""}
            </DialogDescription>
          </DialogHeader>
          {dialogAction === "schedule" && (
            <div className="space-y-4">
              <div>
                <Label>Scheduled At</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
              </div>
            </div>
          )}
          {(dialogAction === "cancel" || dialogAction === "reject") && (
            <div className="space-y-4">
              <div>
                <Label>Note / Reason</Label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full h-24 border rounded-lg p-2 text-sm"
                  placeholder={`Reason for ${dialogAction}ing this request...`}
                />
              </div>
            </div>
          )}
          {selectedRequest?.errorMessage && (
            <Alert variant="destructive">
              <AlertTitle>Previous Error</AlertTitle>
              <AlertDescription>{selectedRequest.errorMessage}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            {dialogAction === "execute" ? (
              <Button variant="destructive" onClick={executeDeletion} disabled={loading}>
                Execute Deletion
              </Button>
            ) : (
              <Button onClick={() => updateStatus(dialogAction as any, note || undefined)} disabled={loading}>
                {dialogAction === "verify" ? "Verify" : dialogAction === "schedule" ? "Schedule" : dialogAction === "cancel" ? "Cancel" : "Reject"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
