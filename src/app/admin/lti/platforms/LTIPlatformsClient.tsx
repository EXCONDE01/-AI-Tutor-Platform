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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, RotateCcw, Loader2, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { CreatePlatformInput, UpdatePlatformInput } from "@/lib/lti/platform";
import { LTIPlatformConfig, LTIDeploymentConfig } from "@/lib/lti/types";
import { AdminLtiPlatformsSkeleton } from "@/components/ui/page-skeletons";

interface District {
  id: string;
  name: string;
}

interface PlatformWithDistrict extends LTIPlatformConfig {
  districtName: string;
}

const DEFAULT_SCOPES = [
  "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
  "https://purl.imsglobal.org/spec/lti-ags/scope/score",
  "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
  "openid",
].join("\n");

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
    active: "success",
    inactive: "secondary",
    pending: "warning",
    error: "destructive",
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

export default function LTIPlatformsClient() {
  const [platforms, setPlatforms] = useState<PlatformWithDistrict[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  // loadData no longer calls setLoading(true) at the start; the initial state is loading=true
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<PlatformWithDistrict | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PlatformWithDistrict | null>(null);
  const [rotateConfirm, setRotateConfirm] = useState<PlatformWithDistrict | null>(null);
  const [rotatedPublicKey, setRotatedPublicKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [platformsRes, districtsRes] = await Promise.all([
        fetch("/api/admin/lti/platforms"),
        fetch("/api/admin/districts"),
      ]);

      const platformsData = platformsRes.ok ? await platformsRes.json() : [];
      const districtsPayload = districtsRes.ok ? await districtsRes.json() : [];

      const platformsList = Array.isArray(platformsData) ? platformsData : [];
      const districtsList = Array.isArray(districtsPayload) ? districtsPayload : districtsPayload?.data ?? [];

      setPlatforms(
        platformsList.map((p: LTIPlatformConfig) => ({
          ...p,
          districtName: districtsList.find((d: District) => d.id === p.districtId)?.name || "Unknown",
        }))
      );
      setDistricts(districtsList);
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
    setEditingPlatform(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (platform: PlatformWithDistrict) => {
    setEditingPlatform(platform);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlatform(null);
  };

  const handleSubmit = async (data: CreatePlatformInput | UpdatePlatformInput) => {
    setIsSubmitting(true);
    try {
      const url = editingPlatform ? `/api/admin/lti/platforms/${editingPlatform.id}` : "/api/admin/lti/platforms";
      const method = editingPlatform ? "PATCH" : "POST";

      // For PATCH, only send fields that are provided and not empty strings for keys
      const payload = { ...data };
      if (editingPlatform) {
        if (payload.publicKey === "") delete payload.publicKey;
        if (payload.privateKey === "") delete payload.privateKey;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingPlatform ? "Platform updated" : "Platform created");
        handleCloseDialog();
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save platform");
      }
    } catch (err) {
      toast.error("Failed to save platform");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (platform: PlatformWithDistrict) => {
    const newStatus = platform.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/admin/lti/platforms/${platform.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Platform ${newStatus === "active" ? "activated" : "deactivated"}`);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update status");
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteConfirm = (platform: PlatformWithDistrict) => {
    setDeleteConfirm(platform);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/admin/lti/platforms/${deleteConfirm.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Platform deleted");
        setDeleteConfirm(null);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete platform");
      }
    } catch (err) {
      toast.error("Failed to delete platform");
    }
  };

  const handleRotateKeys = async (platform: PlatformWithDistrict) => {
    try {
      const res = await fetch(`/api/admin/lti/platforms/${platform.id}/rotate-keys`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setRotatedPublicKey(data.publicKey);
        setShowKeyDialog(true);
        toast.success("Keys rotated successfully");
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to rotate keys");
      }
    } catch (err) {
      toast.error("Failed to rotate keys");
    }
  };

  if (loading) {
    return <AdminLtiPlatformsSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>Failed to load platforms: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LTI Platforms</h1>
          <p className="text-muted-foreground">Manage LTI 1.3 platform configurations</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Platform
        </Button>
      </div>

      {platforms.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="mt-4 text-muted-foreground">No LTI platforms configured yet.</p>
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Platform
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Platforms ({platforms.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Issuer</TableHead>
                    <TableHead>Client ID</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platforms.map((platform) => (
                    <TableRow key={platform.id}>
                      <TableCell className="font-medium">{platform.name}</TableCell>
                      <TableCell className="font-mono text-sm max-w-xs truncate" title={platform.issuer}>
                        {truncate(platform.issuer, 40)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{platform.clientId}</TableCell>
                      <TableCell>{platform.districtName}</TableCell>
                      <TableCell>{getStatusBadge(platform.status || "pending")}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {platform.supportsNRPS && <Badge variant="outline" className="text-xs">NRPS</Badge>}
                          {platform.supportsAGS && <Badge variant="outline" className="text-xs">AGS</Badge>}
                          {platform.supportsDeepLinking && <Badge variant="outline" className="text-xs">Deep Link</Badge>}
                          {platform.supportsAssignmentSelection && <Badge variant="outline" className="text-xs">Assign Sel</Badge>}
                          {platform.supportsResourceLinkMessage && <Badge variant="outline" className="text-xs">Resource Link</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {platform.updatedAt ? new Date(platform.updatedAt).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(platform)} title="Edit" aria-label="Edit platform">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(platform)}
                            title={platform.status === "active" ? "Deactivate" : "Activate"}
                            aria-label={platform.status === "active" ? "Deactivate platform" : "Activate platform"}
                          >
                            {platform.status === "active" ? (
                              <EyeOff className="h-4 w-4 text-warning" />
                            ) : (
                              <Eye className="h-4 w-4 text-success" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRotateKeys(platform)}
                            title="Rotate Keys"
                            aria-label="Rotate platform keys"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteConfirm(platform)}
                            className="text-destructive hover:text-destructive"
                            title="Delete"
                            aria-label="Delete platform"
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
            <DialogTitle>{editingPlatform ? "Edit LTI Platform" : "New LTI Platform"}</DialogTitle>
            <DialogDescription>
              Configure LTI 1.3 platform connection settings
            </DialogDescription>
          </DialogHeader>
          <PlatformForm
            key={editingPlatform?.id ?? "new"}
            editingPlatform={editingPlatform}
            districts={districts}
            onSubmit={handleSubmit}
            onClose={handleCloseDialog}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Platform</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteConfirm?.name}&rdquo;? This will also delete all associated deployments. This action cannot be undone.
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

      {/* Rotated Public Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Keys Rotated Successfully</DialogTitle>
            <DialogDescription>
              The platform keys have been rotated. Copy the new public key below and configure it in your LTI platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Public Key (PEM)</Label>
              <Textarea
                className="font-mono text-sm"
                rows={8}
                value={rotatedPublicKey || ""}
                readOnly
              />
            </div>
            <p className="text-sm text-muted-foreground">
              The private key is stored securely and never displayed. Save this public key now.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PlatformFormState {
  name: string;
  districtId: string;
  issuer: string;
  clientId: string;
  deploymentId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  jwksUrl: string;
  scopes: string; // Multiline string in form state
  publicKey: string;
  privateKey: string;
  supportsNRPS: boolean;
  supportsAGS: boolean;
  supportsDeepLinking: boolean;
  supportsAssignmentSelection: boolean;
  supportsResourceLinkMessage: boolean;
  keyRotationUrl: string;
}

function toPlatformFormState(platform: PlatformWithDistrict | null): PlatformFormState {
  if (platform) {
    return {
      name: platform.name || "",
      districtId: platform.districtId || "",
      issuer: platform.issuer,
      clientId: platform.clientId,
      deploymentId: platform.deploymentId || "",
      authLoginUrl: platform.authLoginUrl,
      authTokenUrl: platform.authTokenUrl,
      jwksUrl: platform.jwksUrl,
      scopes: (platform.scopes || []).join("\n"),
      publicKey: "",
      privateKey: "",
      supportsNRPS: platform.supportsNRPS,
      supportsAGS: platform.supportsAGS,
      supportsDeepLinking: platform.supportsDeepLinking,
      supportsAssignmentSelection: platform.supportsAssignmentSelection,
      supportsResourceLinkMessage: platform.supportsResourceLinkMessage,
      keyRotationUrl: platform.keyRotationUrl || "",
    };
  }
  return {
    name: "",
    districtId: "",
    issuer: "",
    clientId: "",
    deploymentId: "",
    authLoginUrl: "",
    authTokenUrl: "",
    jwksUrl: "",
    scopes: DEFAULT_SCOPES,
    publicKey: "",
    privateKey: "",
    supportsNRPS: true,
    supportsAGS: true,
    supportsDeepLinking: false,
    supportsAssignmentSelection: false,
    supportsResourceLinkMessage: true,
    keyRotationUrl: "",
  };
}

interface PlatformFormProps {
  editingPlatform: PlatformWithDistrict | null;
  districts: District[];
  onSubmit: (data: CreatePlatformInput | UpdatePlatformInput) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

function PlatformForm({ editingPlatform, districts, onSubmit, onClose, isSubmitting }: PlatformFormProps) {
  const [formData, setFormData] = useState<PlatformFormState>(() =>
    toPlatformFormState(editingPlatform)
  );

  const handleChange = (field: keyof PlatformFormState, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scopes = formData.scopes.split("\n").map((s: string) => s.trim()).filter(Boolean);

    const payload: CreatePlatformInput | UpdatePlatformInput = {
      name: formData.name,
      districtId: formData.districtId,
      issuer: formData.issuer,
      clientId: formData.clientId,
      authLoginUrl: formData.authLoginUrl,
      authTokenUrl: formData.authTokenUrl,
      jwksUrl: formData.jwksUrl,
      scopes,
      supportsNRPS: formData.supportsNRPS,
      supportsAGS: formData.supportsAGS,
      supportsDeepLinking: formData.supportsDeepLinking,
      supportsAssignmentSelection: formData.supportsAssignmentSelection,
      supportsResourceLinkMessage: formData.supportsResourceLinkMessage,
    };

    if (formData.deploymentId) payload.deploymentId = formData.deploymentId;
    if (formData.publicKey) payload.publicKey = formData.publicKey;
    if (formData.privateKey) payload.privateKey = formData.privateKey;
    if (formData.keyRotationUrl) payload.keyRotationUrl = formData.keyRotationUrl;

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="e.g., Canvas LMS"
          />
        </div>
        <div>
          <Label htmlFor="districtId">District *</Label>
          <Select
            value={formData.districtId || ""}
            onValueChange={(value) => handleChange("districtId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select district" />
            </SelectTrigger>
            <SelectContent>
              {districts.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="issuer">Issuer URL *</Label>
        <Input
          id="issuer"
          type="url"
          value={formData.issuer || ""}
          onChange={(e) => handleChange("issuer", e.target.value)}
          required
          placeholder="https://canvas.example.com"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="clientId">Client ID *</Label>
          <Input
            id="clientId"
            value={formData.clientId || ""}
            onChange={(e) => handleChange("clientId", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="deploymentId">Deployment ID</Label>
          <Input
            id="deploymentId"
            value={formData.deploymentId || ""}
            onChange={(e) => handleChange("deploymentId", e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="authLoginUrl">Auth Login URL *</Label>
          <Input
            id="authLoginUrl"
            type="url"
            value={formData.authLoginUrl || ""}
            onChange={(e) => handleChange("authLoginUrl", e.target.value)}
            required
            placeholder="https://canvas.example.com/login/oauth2/auth"
          />
        </div>
        <div>
          <Label htmlFor="authTokenUrl">Auth Token URL *</Label>
          <Input
            id="authTokenUrl"
            type="url"
            value={formData.authTokenUrl || ""}
            onChange={(e) => handleChange("authTokenUrl", e.target.value)}
            required
            placeholder="https://canvas.example.com/login/oauth2/token"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="jwksUrl">JWKS URL *</Label>
        <Input
          id="jwksUrl"
          type="url"
          value={formData.jwksUrl || ""}
          onChange={(e) => handleChange("jwksUrl", e.target.value)}
          required
          placeholder="https://canvas.example.com/api/lti/security/jwks"
        />
      </div>

      <div>
        <Label htmlFor="scopes">Scopes (one per line)</Label>
        <Textarea
          id="scopes"
          rows={4}
          value={formData.scopes || ""}
          onChange={(e) => handleChange("scopes", e.target.value)}
          placeholder={DEFAULT_SCOPES}
        />
      </div>

      <div>
        <Label htmlFor="publicKey">Public Key (PEM)</Label>
        <Textarea
          id="publicKey"
          className="font-mono text-sm"
          rows={6}
          value={formData.publicKey || ""}
          onChange={(e) => handleChange("publicKey", e.target.value)}
          placeholder="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
        />
        {editingPlatform && (
          <p className="text-sm text-muted-foreground mt-1">
            Leave blank to keep existing key
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="privateKey">Private Key (PEM) - Keep Secure!</Label>
        <Textarea
          id="privateKey"
          className="font-mono text-sm"
          rows={6}
          value={formData.privateKey || ""}
          onChange={(e) => handleChange("privateKey", e.target.value)}
          placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
        />
        {editingPlatform && (
          <p className="text-sm text-muted-foreground mt-1">
            Leave blank to keep existing key
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="keyRotationUrl">Key Rotation URL (optional)</Label>
        <Input
          id="keyRotationUrl"
          type="url"
          value={formData.keyRotationUrl || ""}
          onChange={(e) => handleChange("keyRotationUrl", e.target.value)}
          placeholder="https://canvas.example.com/api/lti/security/rotate"
        />
      </div>

      <div className="border-t pt-6">
        <Label className="block mb-3 font-medium">Features</Label>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="supportsNRPS"
              checked={formData.supportsNRPS as boolean}
              onCheckedChange={(checked) => handleChange("supportsNRPS", checked as boolean)}
            />
            <Label htmlFor="supportsNRPS" className="cursor-pointer mb-0">
              Support NRPS (Names & Roles)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="supportsAGS"
              checked={formData.supportsAGS as boolean}
              onCheckedChange={(checked) => handleChange("supportsAGS", checked as boolean)}
            />
            <Label htmlFor="supportsAGS" className="cursor-pointer mb-0">
              Support AGS (Assignment & Grade)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="supportsDeepLinking"
              checked={formData.supportsDeepLinking as boolean}
              onCheckedChange={(checked) => handleChange("supportsDeepLinking", checked as boolean)}
            />
            <Label htmlFor="supportsDeepLinking" className="cursor-pointer mb-0">
              Support Deep Linking
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="supportsAssignmentSelection"
              checked={formData.supportsAssignmentSelection as boolean}
              onCheckedChange={(checked) => handleChange("supportsAssignmentSelection", checked as boolean)}
            />
            <Label htmlFor="supportsAssignmentSelection" className="cursor-pointer mb-0">
              Support Assignment Selection
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="supportsResourceLinkMessage"
              checked={formData.supportsResourceLinkMessage as boolean}
              onCheckedChange={(checked) => handleChange("supportsResourceLinkMessage", checked as boolean)}
            />
            <Label htmlFor="supportsResourceLinkMessage" className="cursor-pointer mb-0">
              Support Resource Link Message
            </Label>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : editingPlatform ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}