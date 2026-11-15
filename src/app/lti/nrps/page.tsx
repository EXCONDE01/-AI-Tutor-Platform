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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Loader2, X, Eye, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface NRPSMember {
  id: string;
  deploymentId: string;
  contextId: string;
  userId: string;
  roles: string[];
  lisPersonSourcedId: string | null;
  lisPersonNameGiven: string | null;
  lisPersonNameFamily: string | null;
  lisPersonNameFull: string | null;
  lisPersonEmail: string | null;
  userImage: string | null;
  status: string;
  membershipId: string | null;
  rawData: Record<string, unknown>;
  lastSyncedAt: string | null;
  expiresAt: string | null;
}

interface NRPSContext {
  deploymentId: string;
  contextId: string;
  memberCount: number;
  fetchedAt: string | null;
}

interface Platform {
  id: string;
  name: string;
  issuer: string;
  supportsNRPS: boolean;
}

interface Deployment {
  id: string;
  platformId: string;
  name: string;
  deploymentId: string;
  status: string;
}

export default function NRPSPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("");
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>("");
  const [contexts, setContexts] = useState<NRPSContext[]>([]);
  const [members, setMembers] = useState<NRPSMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedMember, setSelectedMember] = useState<NRPSMember | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchPlatforms = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/lti/platforms");
      if (res.ok) {
        const data = await res.json();
        setPlatforms(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch platforms:", err);
    }
  }, []);

  const fetchDeployments = useCallback(async (platformId: string) => {
    try {
      const res = await fetch(`/api/admin/lti/deployments`);
      if (res.ok) {
        const data = await res.json();
        const allDeployments = Array.isArray(data) ? data : [];
        const filtered = allDeployments.filter((d: Deployment) => d.platformId === platformId);
        setDeployments(filtered);
        if (filtered.length > 0 && filtered[0].id !== selectedDeploymentId) {
          setSelectedDeploymentId(filtered[0].id);
        } else if (filtered.length === 0) {
          setSelectedDeploymentId("");
        }
      }
    } catch (err) {
      console.error("Failed to fetch deployments:", err);
    }
  }, [selectedDeploymentId]);

  const fetchContexts = useCallback(async () => {
    if (!selectedDeploymentId) return;
    try {
      const res = await fetch(`/api/lti/nrps/contexts`);
      if (res.ok) {
        const data = await res.json();
        const allContexts = data.data ?? [];
        const filtered = allContexts.filter((c: NRPSContext) => c.deploymentId === selectedDeploymentId);
        setContexts(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch contexts:", err);
    }
  }, [selectedDeploymentId]);

  const fetchMembers = useCallback(async () => {
    if (!selectedDeploymentId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        deploymentId: selectedDeploymentId,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);

      const res = await fetch(`/api/lti/nrps/members?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.data ?? []);
        setTotal(data.pagination?.total ?? 0);
      } else {
        toast.error("Failed to fetch members");
      }
    } catch (err) {
      toast.error("Failed to fetch members");
    } finally {
      setLoading(false);
    }
  }, [selectedDeploymentId, page, pageSize, search, roleFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlatforms();
  }, [fetchPlatforms]);

  useEffect(() => {
    if (selectedPlatformId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDeployments(selectedPlatformId);
    } else {
      setDeployments([]);
      setSelectedDeploymentId("");
    }
  }, [selectedPlatformId, fetchDeployments]);

  useEffect(() => {
    if (selectedDeploymentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchContexts();
      fetchMembers();
    } else {
      setContexts([]);
      setMembers([]);
      setTotal(0);
    }
  }, [selectedDeploymentId, fetchContexts, fetchMembers]);

  useEffect(() => {
    if (selectedDeploymentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMembers();
    }
  }, [page, pageSize, search, roleFilter, fetchMembers, selectedDeploymentId]);

  const handleSync = async () => {
    if (!selectedPlatformId || !selectedDeploymentId) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/lti/nrps/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId: selectedPlatformId,
          deploymentId: selectedDeploymentId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Synced ${data.membersTotal} members across ${data.syncedContexts} contexts`);
        fetchContexts();
        fetchMembers();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Sync failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setError(message);
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  const getRoleBadge = (roles: string[]) => {
    if (roles.length === 0) return <Badge variant="secondary">—</Badge>;
    return roles.map(r => (
      <Badge key={r} variant="outline" className="mr-1 mb-1">{r}</Badge>
    ));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
      active: "success",
      inactive: "secondary",
      deleted: "destructive",
    };
    return <Badge variant={variants[status] || "default"} className="capitalize">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NRPS Roster Sync</h1>
          <p className="text-muted-foreground">
            Sync and view LTI Names & Roles Provisioning Service memberships
          </p>
        </div>
      </div>

      {/* Selection Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPlatformId} onValueChange={setSelectedPlatformId}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.supportsNRPS ? "✓" : "✗"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {platforms.find(p => p.id === selectedPlatformId)?.supportsNRPS === false && (
              <p className="text-sm text-warning mt-2">Platform does not support NRPS</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deployment</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedDeploymentId} onValueChange={setSelectedDeploymentId} disabled={!selectedPlatformId}>
              <SelectTrigger>
                <SelectValue placeholder="Select deployment" />
              </SelectTrigger>
              <SelectContent>
                {deployments.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.deploymentId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlatformId && deployments.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">No deployments for this platform</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSync}
              disabled={!selectedPlatformId || !selectedDeploymentId || syncing}
              className="w-full"
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync NRPS Roster
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Contexts Summary */}
      {contexts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Synced Contexts ({contexts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Context ID</TableHead>
                    <TableHead>Member Count</TableHead>
                    <TableHead>Last Fetched</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contexts.map(ctx => (
                    <TableRow key={ctx.contextId}>
                      <TableCell className="font-mono text-sm">{ctx.contextId}</TableCell>
                      <TableCell>{ctx.memberCount}</TableCell>
                      <TableCell>
                        {ctx.fetchedAt ? format(new Date(ctx.fetchedAt), "PPpp") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Members ({total})</CardTitle>
          <div className="flex gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                <SelectItem value="instructor">Instructor</SelectItem>
                <SelectItem value="learner">Learner</SelectItem>
                <SelectItem value="administrator">Administrator</SelectItem>
                <SelectItem value="teaching_assistant">Teaching Assistant</SelectItem>
                <SelectItem value="content_developer">Content Developer</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="observer">Observer</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-[250px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members found. Select a platform/deployment and click &quot;Sync NRPS Roster&quot;.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email / User ID</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Context</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map(member => (
                      <TableRow
                        key={member.id}
                        onClick={() => { setSelectedMember(member); setIsDetailOpen(true); }}
                        className="cursor-pointer hover:bg-accent"
                      >
                        <TableCell>
                          {member.lisPersonNameFull || (
                            <>
                              {member.lisPersonNameGiven || ""}{" "}
                              {member.lisPersonNameFamily || ""}
                            </>
                          ) || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{member.lisPersonEmail || member.userId}</div>
                        </TableCell>
                        <TableCell>{getRoleBadge(member.roles)}</TableCell>
                        <TableCell className="font-mono text-sm">{member.contextId}</TableCell>
                        <TableCell>{getStatusBadge(member.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => { e.stopPropagation(); setSelectedMember(member); setIsDetailOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
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
                  Showing {members.length} of {total} members
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

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>{selectedMember?.lisPersonNameFull || selectedMember?.userId}</DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>ID</Label>
                  <p className="font-mono text-sm">{selectedMember.id}</p>
                </div>
                <div>
                  <Label>Membership ID</Label>
                  <p className="font-mono text-sm">{selectedMember.membershipId || "—"}</p>
                </div>
                <div>
                  <Label>User ID (LTI sub)</Label>
                  <p className="font-mono text-sm">{selectedMember.userId}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p>{selectedMember.lisPersonEmail || "—"}</p>
                </div>
                <div>
                  <Label>Sourced ID</Label>
                  <p className="font-mono text-sm">{selectedMember.lisPersonSourcedId || "—"}</p>
                </div>
                <div>
                  <Label>Given Name</Label>
                  <p>{selectedMember.lisPersonNameGiven || "—"}</p>
                </div>
                <div>
                  <Label>Family Name</Label>
                  <p>{selectedMember.lisPersonNameFamily || "—"}</p>
                </div>
                <div>
                  <Label>Full Name</Label>
                  <p>{selectedMember.lisPersonNameFull || "—"}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  {getStatusBadge(selectedMember.status)}
                </div>
                <div className="md:col-span-2">
                  <Label>Roles</Label>
                  <div className="flex flex-wrap gap-1">{getRoleBadge(selectedMember.roles)}</div>
                </div>
                <div>
                  <Label>Context</Label>
                  <p className="font-mono text-sm">{selectedMember.contextId}</p>
                </div>
                <div>
                  <Label>Deployment</Label>
                  <p className="font-mono text-sm">{selectedMember.deploymentId}</p>
                </div>
                <div>
                  <Label>Last Synced</Label>
                  <p>{selectedMember.lastSyncedAt ? format(new Date(selectedMember.lastSyncedAt), "PPpp") : "—"}</p>
                </div>
                <div>
                  <Label>Expires At</Label>
                  <p>{selectedMember.expiresAt ? format(new Date(selectedMember.expiresAt), "PPpp") : "—"}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Raw Data</Label>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(selectedMember.rawData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}