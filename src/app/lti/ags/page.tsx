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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, RefreshCw, Loader2, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { AGSPageSkeleton } from "@/components/ui/page-skeletons";

interface Platform {
  id: string;
  name: string;
  issuer: string;
  supportsAGS: boolean;
  configuration: Record<string, unknown> | null;
}

interface Deployment {
  id: string;
  platformId: string;
  deploymentId: string;
  name: string;
}

interface LineItem {
  id: string;
  deploymentId: string;
  contextId: string;
  resourceLinkId: string | null;
  label: string;
  scoreMaximum: number;
  scoreMinimum: number;
  type: string;
  resourceId: string | null;
  tag: string | null;
  ltiLineItemUrl: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  _count?: { agsScores?: number };
}

interface Score {
  id: string;
  lineItemId: string;
  userId: string;
  scoreGiven: number;
  scoreMaximum: number;
  comment: string | null;
  activityProgress: string;
  gradingProgress: string;
  status: string;
  ltiScoreUrl: string | null;
  timestamp: string;
  createdAt: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userDisplayName: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function AGSPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedLineItem, setSelectedLineItem] = useState<LineItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [lineItemsLoading, setLineItemsLoading] = useState(false);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);

  // Create line item form
  const [createLabel, setCreateLabel] = useState("");
  const [createResourceLinkId, setCreateResourceLinkId] = useState("");
  const [createScoreMaximum, setCreateScoreMaximum] = useState("");
  const [createTags, setCreateTags] = useState("");
  const [createPlatformId, setCreatePlatformId] = useState("");
  const [createDeploymentId, setCreateDeploymentId] = useState("");

  // Score form
  const [scoreUserId, setScoreUserId] = useState("");
  const [scoreScoreGiven, setScoreScoreGiven] = useState("");
  const [scoreComment, setScoreComment] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  // AGS-supported platforms
  const agsPlatforms = platforms.filter((p) => p.supportsAGS);

  const fetchPlatforms = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/lti/platforms");
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data?.data ?? [];
        setPlatforms(arr);
      }
    } catch (error) {
      console.error("Failed to fetch platforms:", error);
      toast.error("Failed to fetch platforms");
    }
  }, []);

  const fetchDeployments = useCallback(async (platformId: string) => {
    try {
      const res = await fetch(`/api/admin/lti/deployments?platformId=${platformId}`);
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data?.data ?? [];
        setDeployments(arr);
      }
    } catch (error) {
      console.error("Failed to fetch deployments:", error);
      toast.error("Failed to fetch deployments");
    }
  }, []);

  const fetchLineItems = useCallback(async () => {
    setLineItemsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
      if (createPlatformId) params.set("platformId", createPlatformId);
      if (createDeploymentId) params.set("deploymentId", createDeploymentId);

      const res = await fetch(`/api/lti/ags/line-items?${params}`);
      if (res.ok) {
        const data = (await res.json()) as PaginatedResponse<LineItem>;
        setLineItems(data.data);
        setTotal(data.pagination.total);
      } else {
        toast.error("Failed to fetch line items");
      }
    } catch (error) {
      console.error("Failed to fetch line items:", error);
      toast.error("Failed to fetch line items");
    } finally {
      setLineItemsLoading(false);
    }
  }, [page, pageSize, createPlatformId, createDeploymentId]);

  const fetchScores = useCallback(async (lineItemId: string) => {
    setScoresLoading(true);
    try {
      const params = new URLSearchParams({ lineItemId, page: "1", pageSize: "100" });
      const res = await fetch(`/api/lti/ags/scores?${params}`);
      if (res.ok) {
        const data = (await res.json()) as PaginatedResponse<Score>;
        setScores(data.data);
      } else {
        toast.error("Failed to fetch scores");
      }
    } catch (error) {
      console.error("Failed to fetch scores:", error);
      toast.error("Failed to fetch scores");
    } finally {
      setScoresLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlatforms();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLineItems();
  }, [fetchPlatforms, fetchLineItems]);

  useEffect(() => {
    if (createPlatformId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDeployments(createPlatformId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCreateDeploymentId("");
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeployments([]);
    }
  }, [createPlatformId, fetchDeployments]);

  const handleCreateLineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPlatformId || !createDeploymentId || !createLabel || !createScoreMaximum) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/lti/ags/line-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId: createPlatformId,
          deploymentId: createDeploymentId,
          label: createLabel,
          resourceLinkId: createResourceLinkId || undefined,
          scoreMaximum: parseInt(createScoreMaximum, 10),
          tags: createTags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Line item created");
        setCreateLabel("");
        setCreateResourceLinkId("");
        setCreateScoreMaximum("");
        setCreateTags("");
        setCreateDialogOpen(false);
        fetchLineItems();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create line item");
      }
    } catch (error) {
      console.error("Create line item error:", error);
      toast.error("Failed to create line item");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineItem) return;
    if (!scoreUserId || !scoreScoreGiven) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/lti/ags/scores/${selectedLineItem.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: scoreUserId,
          scoreGiven: parseInt(scoreScoreGiven, 10),
          scoreMaximum: parseInt(scoreScoreGiven, 10) > selectedLineItem.scoreMaximum ? selectedLineItem.scoreMaximum : undefined,
          comment: scoreComment || undefined,
          activityProgress: "Completed",
          gradingProgress: "FullyGraded",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Score posted");
        setScoreUserId("");
        setScoreScoreGiven("");
        setScoreComment("");
        setScoreDialogOpen(false);
        fetchScores(selectedLineItem.id);
        fetchLineItems();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to post score");
      }
    } catch (error) {
      console.error("Post score error:", error);
      toast.error("Failed to post score");
    } finally {
      setLoading(false);
    }
  };

  const userLabel = (score: Score) => {
    if (score.userDisplayName) return score.userDisplayName;
    if (score.userEmail) return score.userEmail;
    return score.userId?.slice(0, 8) ?? "Unknown";
  };

  const tagsLabel = (lineItem: LineItem) => {
    if (!lineItem.tag) return "—";
    return lineItem.tag;
  };

  return (
    <div className="space-y-6 p-6">
      {loading && <AGSPageSkeleton />}
      {!loading && (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LTI AGS - Assignment & Grade Service</h1>
          <p className="text-muted-foreground">
            Manage line items and post scores to LTI platforms via AGS.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setPage(1); fetchLineItems(); }}
            disabled={lineItemsLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Platform / Deployment filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label>Platform (AGS only)</Label>
              <Select
                value={createPlatformId}
                onValueChange={(v) => { setCreatePlatformId(v); setPage(1); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Platforms</SelectItem>
                  {agsPlatforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.issuer})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Deployment</Label>
              <Select
                value={createDeploymentId}
                onValueChange={(v) => { setCreateDeploymentId(v); setPage(1); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select deployment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Deployments</SelectItem>
                  {deployments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.deploymentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => { setCreatePlatformId(""); setCreateDeploymentId(""); setPage(1); fetchLineItems(); }}
                disabled={!createPlatformId && !createDeploymentId}
              >
                Clear
              </Button>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchLineItems} disabled={lineItemsLoading} className="w-full">
                {lineItemsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Load Line Items
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line items table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Line Items</CardTitle>
            <Badge variant="secondary">{lineItems.length}</Badge>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Line Item
          </Button>
        </CardHeader>
        <CardContent>
          {lineItemsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : lineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No line items found.</p>
              {agsPlatforms.length === 0 && (
                <p className="mt-2 text-sm">No AGS-supported platforms configured.</p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Resource Link ID</TableHead>
                      <TableHead>Score Max</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Scores</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow
                        key={item.id}
                        onClick={() => {
                          setSelectedLineItem(item);
                          fetchScores(item.id);
                          setScoreDialogOpen(true);
                        }}
                        className="cursor-pointer hover:bg-accent"
                      >
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.resourceLinkId || "—"}
                        </TableCell>
                        <TableCell>{item.scoreMaximum}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {tagsLabel(item)}
                        </TableCell>
                        <TableCell>
                          {item._count?.agsScores ?? 0}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedLineItem(item); fetchScores(item.id); setScoreDialogOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Showing {lineItems.length} of {total} line items
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || lineItemsLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * pageSize >= total || lineItemsLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create line item dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Line Item</DialogTitle>
            <DialogDescription>
              Create a new AGS line item and post it to the selected LMS platform.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLineItem} className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Platform</Label>
                <Select value={createPlatformId} onValueChange={setCreatePlatformId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {agsPlatforms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Deployment</Label>
                <Select value={createDeploymentId} onValueChange={setCreateDeploymentId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select deployment" />
                  </SelectTrigger>
                  <SelectContent>
                    {deployments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.deploymentId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Label</Label>
              <Input
                placeholder="e.g. Midterm Exam"
                value={createLabel}
                onChange={(e) => setCreateLabel(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Resource Link ID (optional)</Label>
              <Input
                placeholder="Resource link ID"
                value={createResourceLinkId}
                onChange={(e) => setCreateResourceLinkId(e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Score Maximum</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={createScoreMaximum}
                  onChange={(e) => setCreateScoreMaximum(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  placeholder="exam, math"
                  value={createTags}
                  onChange={(e) => setCreateTags(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Score dialog */}
      <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scores - {selectedLineItem?.label}</DialogTitle>
            <DialogDescription>
              Add or view scores for this line item.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label>Score Maximum</Label>
                <p className="font-mono text-sm">{selectedLineItem?.scoreMaximum}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Total Scores</Label>
                <p className="font-mono text-sm">{scores.length}</p>
              </div>
            </div>

            {scores.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No scores yet. Add one below.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Score Given</TableHead>
                      <TableHead>Score Max</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Grading</TableHead>
                      <TableHead className="text-right">Posted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((score) => (
                      <TableRow key={score.id}>
                        <TableCell className="font-medium">{userLabel(score)}</TableCell>
                        <TableCell>{score.scoreGiven}</TableCell>
                        <TableCell>{score.scoreMaximum}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {score.activityProgress}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {score.gradingProgress}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {new Date(score.timestamp).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <form onSubmit={handleCreateScore} className="border-t pt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label>User ID</Label>
                  <Input
                    placeholder="User UUID"
                    value={scoreUserId}
                    onChange={(e) => setScoreUserId(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Score Given</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={scoreScoreGiven}
                    onChange={(e) => setScoreScoreGiven(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Comment (optional)</Label>
                  <Input
                    placeholder="Comment"
                    value={scoreComment}
                    onChange={(e) => setScoreComment(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={loading || !selectedLineItem}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Post Score
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {agsPlatforms.length === 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            No AGS-supported platforms found. Please configure a platform with supportsAGS enabled
            and an AGS endpoint before creating line items.
          </AlertDescription>
        </Alert>
      )}
        </>
      )}
    </div>
  );
}