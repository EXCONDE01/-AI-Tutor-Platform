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
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, X, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { CreateDeploymentInput, UpdateDeploymentInput } from "@/lib/lti/platform";
import { LTIDeploymentConfig, LTIPlatformConfig } from "@/lib/lti/types";
import { AdminLtiDeploymentsSkeleton } from "@/components/ui/page-skeletons";

interface PlatformOption {
  id: string;
  name: string;
  issuer: string;
}

interface DeploymentWithPlatform extends LTIDeploymentConfig {
  platformName: string;
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
    active: "success",
    inactive: "secondary",
    pending: "warning",
  };
  return (
    <Badge variant={variants[status] || "default"} className="capitalize">
      {status}
    </Badge>
  );
}

function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

const DEFAULT_CUSTOM_PARAMS = JSON.stringify({
  course_id: "$Context.id",
  user_role: "$Person.roles",
  custom_param: "value",
}, null, 2);

export default function LTIDeploymentsClient() {
  const [deployments, setDeployments] = useState<DeploymentWithPlatform[]>([]);
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [loading, setLoading] = useState(true);
  // loadData no longer calls setLoading(true) at the start; the initial state is loading=true
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeployment, setEditingDeployment] = useState<DeploymentWithPlatform | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeploymentWithPlatform | null>(null);
  const [customParamsError, setCustomParamsError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [deploymentsRes, platformsRes] = await Promise.all([
        fetch("/api/admin/lti/deployments"),
        fetch("/api/admin/lti/platforms"),
      ]);

      const deploymentsData = deploymentsRes.ok ? await deploymentsRes.json() : [];
      const platformsData = platformsRes.ok ? await platformsRes.json() : [];

      const deploymentsList = Array.isArray(deploymentsData) ? deploymentsData : [];
      const platformsList = Array.isArray(platformsData) ? platformsData : [];

      setDeployments(
        deploymentsList.map((d: LTIDeploymentConfig) => ({
          ...d,
          platformName: platformsList.find((p: LTIPlatformConfig) => p.id === d.platformId)?.name || "Unknown",
        }))
      );
      setPlatforms(
        platformsList.map((p: LTIPlatformConfig) => ({
          id: p.id,
          name: p.name || "",
          issuer: p.issuer,
        }))
      );
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Lint cannot see through loadData(); every setState in it runs after an await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const handleCreate = () => {
    setEditingDeployment(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (deployment: DeploymentWithPlatform) => {
    setEditingDeployment(deployment);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDeployment(null);
    setCustomParamsError(null);
  };

  const validateCustomParams = (value: string): boolean => {
    try {
      JSON.parse(value);
      setCustomParamsError(null);
      return true;
    } catch {
      setCustomParamsError("Invalid JSON format");
      return false;
    }
  };

  const handleSubmit = async (data: CreateDeploymentInput | UpdateDeploymentInput) => {
    if (!validateCustomParams(JSON.stringify(data.customParameters || {}))) {
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingDeployment ? `/api/admin/lti/deployments/${editingDeployment.id}` : "/api/admin/lti/deployments";
      const method = editingDeployment ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(editingDeployment ? "Deployment updated" : "Deployment created");
        handleCloseDialog();
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save deployment");
      }
    } catch (err) {
      toast.error("Failed to save deployment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (deployment: DeploymentWithPlatform) => {
    const newStatus = deployment.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/admin/lti/deployments/${deployment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Deployment ${newStatus === "active" ? "activated" : "deactivated"}`);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update status");
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteConfirm = (deployment: DeploymentWithPlatform) => {
    setDeleteConfirm(deployment);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/admin/lti/deployments/${deleteConfirm.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Deployment deleted");
        setDeleteConfirm(null);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete deployment");
      }
    } catch (err) {
      toast.error("Failed to delete deployment");
    }
  };

  if (loading) {
    return <AdminLtiDeploymentsSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>Failed to load deployments: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LTI Deployments</h1>
          <p className="text-muted-foreground">Manage LTI deployment configurations</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Deployment
        </Button>
      </div>

      {deployments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-4 text-muted-foreground">No LTI deployments configured yet.</p>
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Deployment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Deployments ({deployments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Deployment ID</TableHead>
                    <TableHead>Target Link URI</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.map((deployment) => (
                    <TableRow key={deployment.id}>
                      <TableCell className="font-medium">{deployment.name}</TableCell>
                      <TableCell>{deployment.platformName}</TableCell>
                      <TableCell className="font-mono text-sm">{deployment.deploymentId}</TableCell>
                      <TableCell className="font-mono text-sm max-w-xs truncate" title={deployment.targetLinkUri}>
                        {truncate(deployment.targetLinkUri, 50)}
                      </TableCell>
                      <TableCell>{getStatusBadge(deployment.status || "pending")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {deployment.updatedAt ? new Date(deployment.updatedAt).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(deployment)}
                            title="Edit"
                            aria-label="Edit deployment"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(deployment)}
                            title={deployment.status === "active" ? "Deactivate" : "Activate"}
                            aria-label={deployment.status === "active" ? "Deactivate deployment" : "Activate deployment"}
                          >
                            {deployment.status === "active" ? (
                              <EyeOff className="h-4 w-4 text-warning" />
                            ) : (
                              <Eye className="h-4 w-4 text-success" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteConfirm(deployment)}
                            className="text-destructive hover:text-destructive"
                            title="Delete"
                            aria-label="Delete deployment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDeployment ? "Edit LTI Deployment" : "New LTI Deployment"}</DialogTitle>
            <DialogDescription>
              Configure LTI deployment settings
            </DialogDescription>
          </DialogHeader>
          <DeploymentForm
            key={editingDeployment?.id ?? "new"}
            editingDeployment={editingDeployment}
            platforms={platforms}
            onSubmit={handleSubmit}
            onClose={handleCloseDialog}
            isSubmitting={isSubmitting}
            customParamsError={customParamsError}
            onCustomParamsChange={validateCustomParams}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deployment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteConfirm?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DeploymentFormState {
  platformId: string;
  name: string;
  deploymentId: string;
  targetLinkUri: string;
  description: string;
  customParameters: string; // JSON string in form state
  status: "active" | "inactive" | "pending";
}

function toDeploymentFormState(deployment: DeploymentWithPlatform | null): DeploymentFormState {
  if (deployment) {
    return {
      platformId: deployment.platformId,
      name: deployment.name,
      deploymentId: deployment.deploymentId,
      targetLinkUri: deployment.targetLinkUri,
      description: deployment.description || "",
      customParameters: JSON.stringify(deployment.customParameters || {}, null, 2),
      status: deployment.status || "pending",
    };
  }
  return {
    platformId: "",
    name: "",
    deploymentId: "",
    targetLinkUri: "",
    description: "",
    customParameters: DEFAULT_CUSTOM_PARAMS,
    status: "pending",
  };
}

interface DeploymentFormProps {
  editingDeployment: DeploymentWithPlatform | null;
  platforms: PlatformOption[];
  onSubmit: (data: CreateDeploymentInput | UpdateDeploymentInput) => void;
  onClose: () => void;
  isSubmitting: boolean;
  customParamsError: string | null;
  onCustomParamsChange: (value: string) => boolean;
}

function DeploymentForm({
  editingDeployment,
  platforms,
  onSubmit,
  onClose,
  isSubmitting,
  customParamsError,
  onCustomParamsChange,
}: DeploymentFormProps) {
  const [formData, setFormData] = useState<DeploymentFormState>(() =>
    toDeploymentFormState(editingDeployment)
  );

  const handleChange = (field: keyof DeploymentFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomParamsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    handleChange("customParameters", value);
    onCustomParamsChange(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let customParams: Record<string, string> = {};
    try {
      customParams = JSON.parse(formData.customParameters || "{}");
    } catch {
      // Error already shown via onCustomParamsChange
      return;
    }

    const payload: CreateDeploymentInput | UpdateDeploymentInput = {
      platformId: formData.platformId,
      name: formData.name,
      deploymentId: formData.deploymentId,
      targetLinkUri: formData.targetLinkUri,
      customParameters: customParams,
    };

    if (formData.description) payload.description = formData.description;
    if (editingDeployment) {
      (payload as UpdateDeploymentInput).status = formData.status;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      <div>
        <Label htmlFor="platformId">Platform *</Label>
        <Select
          value={formData.platformId || ""}
          onValueChange={(value) => handleChange("platformId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({truncate(p.issuer, 50)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="e.g., Course Launch"
          />
        </div>
        <div>
          <Label htmlFor="deploymentId">Deployment ID *</Label>
          <Input
            id="deploymentId"
            value={formData.deploymentId || ""}
            onChange={(e) => handleChange("deploymentId", e.target.value)}
            required
            placeholder="Unique deployment identifier"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="targetLinkUri">Target Link URI *</Label>
        <Input
          id="targetLinkUri"
          type="url"
          value={formData.targetLinkUri || ""}
          onChange={(e) => handleChange("targetLinkUri", e.target.value)}
          required
          placeholder="https://your-app.com/lti/launch"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          value={formData.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Optional description"
        />
      </div>

      <div>
        <Label htmlFor="customParameters">Custom Parameters (JSON)</Label>
        <Textarea
          id="customParameters"
          className="font-mono text-sm"
          rows={6}
          value={formData.customParameters || ""}
          onChange={handleCustomParamsChange}
          placeholder={DEFAULT_CUSTOM_PARAMS}
          aria-invalid={customParamsError ? "true" : "false"}
          aria-describedby={customParamsError ? "custom-params-error" : undefined}
        />
        {customParamsError && (
          <p id="custom-params-error" className="text-sm text-destructive mt-1" role="alert">
            {customParamsError}
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          Use LTI variable substitutions like <code className="px-1 bg-muted rounded">$Context.id</code>,
          <code className="px-1 bg-muted rounded">$Person.roles</code>, etc.
        </p>
      </div>

      {editingDeployment && (
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status || "pending"}
            onValueChange={(value) => handleChange("status", value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : editingDeployment ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}