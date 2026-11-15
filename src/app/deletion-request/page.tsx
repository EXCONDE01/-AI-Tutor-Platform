/**
 * User-facing Data Deletion Request page
 * Request deletion form + own request history
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, CheckCircle2, Clock, FileText, Trash2, Activity } from "lucide-react";
import { toast } from "sonner";
import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { DeletionRequestSkeleton } from "@/components/ui/page-skeletons";

const LEGAL_BASES = [
  { value: "gdpr", label: "GDPR (Right to Erasure - Art. 17)" },
  { value: "ccpa", label: "CCPA (Right to Delete)" },
  { value: "coppa", label: "COPPA (Parental Deletion Request)" },
  { value: "ferpa", label: "FERPA (Record Amendment/Deletion)" },
] as const;

interface DeletionRequestSummary {
  id: string;
  status: string;
  reason: string | null;
  legalBasis: string | null;
  scope: Record<string, any>;
  verificationExpiresAt: string | null;
  verifiedAt: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  deletedRecordCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export default function DeletionRequestPage() {
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requests, setRequests] = useState<DeletionRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [legalBasis, setLegalBasis] = useState("gdpr");
  const [reason, setReason] = useState("");
  const [includeBackups, setIncludeBackups] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deletion-request", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data || []);
      } else {
        toast.error("Failed to load requests");
      }
    } catch (error) {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, any> = {
        reason: reason || undefined,
        legalBasis,
        scope: { includeBackups },
      };

      const res = await fetch("/api/deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.verificationToken);
        setRequestId(data.id);
        setReason("");
        setIncludeBackups(false);
        toast.success("Deletion request submitted");
        fetchRequests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit request");
      }
    } catch (error) {
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      requested: "secondary",
      verified: "warning",
      scheduled: "warning",
      in_progress: "info",
      completed: "success",
      failed: "destructive",
      cancelled: "outline",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default" as any}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      {initialLoading && <DeletionRequestSkeleton />}
      {!initialLoading && (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Request Data Deletion</h1>
          <p className="text-muted-foreground">
            Request deletion of your personal data under GDPR, CCPA, COPPA, or FERPA.
          </p>
        </div>
      </div>

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Deletion Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Legal Basis</Label>
                <Select value={legalBasis} onValueChange={setLegalBasis}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select legal basis" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_BASES.map(b => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Checkbox
                  checked={includeBackups}
                  onCheckedChange={(checked) => setIncludeBackups(checked === true)}
                />
                <Label htmlFor="include-backups" className="text-sm ml-2">
                  Include backups in deletion scope
                </Label>
              </div>
            </div>

            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Why are you requesting deletion of your data?"
                className="min-h-[100px]"
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Request Deletion"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Verification Token Display */}
      {token && (
        <Card className="border-green-500 bg-green-50/50">
          <CardHeader className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle>Verification Token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              A verification token has been generated. An admin will review your request. Save this token — it will not be shown again.
            </p>
            <div className="flex gap-2">
              <Input value={token} readOnly className="font-mono text-sm flex-1" />
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(token)}>
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Token expires in 24 hours. Reference ID: {requestId?.slice(0, 8)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Your Deletion Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Activity className="animate-spin h-8 w-8" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No deletion requests yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Legal Basis</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Records Deleted</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.legalBasis || "—"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {r.reason || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {Object.values(r.deletedRecordCounts).reduce((a, b) => a + b, 0) || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
