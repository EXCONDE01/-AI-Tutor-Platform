"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, Search, Filter, Play, AlertTriangle, Clock, Archive, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminRetentionSkeleton } from "@/components/ui/page-skeletons";
import { RetentionCategory } from "@/lib/compliance/types";

const categories = [
  "audit_logs",
  "tutor_sessions",
  "messages",
  "interventions",
  "generated_artifacts",
  "export_jobs",
  "nrps_cache",
  "ags_scores",
  "oauth_tokens",
  "consent_records",
  "user_profiles",
  "lti_data",
  "analytics",
  "backups",
  "custom",
] as const satisfies RetentionCategory[];

const categoryLabels: Record<string, string> = {
  audit_logs: "Audit Logs",
  tutor_sessions: "Tutor Sessions",
  messages: "Messages",
  interventions: "Interventions",
  generated_artifacts: "Generated Artifacts",
  export_jobs: "Export Jobs",
  nrps_cache: "NRPS Cache",
  ags_scores: "AGS Scores",
  oauth_tokens: "OAuth Tokens",
  consent_records: "Consent Records",
  user_profiles: "User Profiles",
  lti_data: "LTI Data",
  analytics: "Analytics",
  backups: "Backups",
  custom: "Custom",
};

const formSchema = z.object({
  districtId: z.string().optional(),
  schoolId: z.string().optional(),
  category: z.enum(categories),
  description: z.string().min(1, "Description is required"),
  retentionDays: z.coerce.number().int().min(0, "Must be a non-negative integer"),
  archiveAfterDays: z.coerce.number().int().min(0).optional().nullable(),
  deleteAfterDays: z.coerce.number().int().min(0, "Must be a non-negative integer"),
  legalBasis: z.string().optional(),
  appliesTo: z.string().optional(),
  exceptions: z.string().optional(),
}).refine(data => data.retentionDays <= data.deleteAfterDays, {
  message: "Retention days cannot exceed delete after days",
  path: ["retentionDays"],
}).refine(data => !data.archiveAfterDays || data.archiveAfterDays <= data.deleteAfterDays, {
  message: "Archive after days cannot exceed delete after days",
  path: ["archiveAfterDays"],
});

type FormData = z.infer<typeof formSchema>;

interface RetentionPolicy {
  id: string;
  districtId: string | null;
  districtName: string | null;
  schoolId: string | null;
  schoolName: string | null;
  category: string;
  description: string;
  retentionDays: number;
  archiveAfterDays: number | null;
  deleteAfterDays: number;
  legalBasis: string | null;
  appliesTo: Record<string, any>;
  exceptions: any[];
  isActive: boolean;
  priority: number;
  createdBy: string;
  createdByName: string;
  approvedBy: string | null;
  approvedAt: string | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export default function RetentionPage() {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "audit_logs",
      description: "",
      retentionDays: 365,
      archiveAfterDays: null,
      deleteAfterDays: 730,
      legalBasis: "",
      appliesTo: "{}",
      exceptions: "[]",
    },
  });

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (isActiveFilter) params.set("isActive", isActiveFilter);

      const res = await fetch(`/api/admin/retention?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.data);
        setTotal(data.pagination.total);
      } else {
        toast.error("Failed to fetch retention policies");
      }
    } catch (error) {
      toast.error("Failed to fetch retention policies");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPolicies();
  }, [page, pageSize, search, categoryFilter, isActiveFilter]);

  React.useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        appliesTo: JSON.parse(data.appliesTo || "{}"),
        exceptions: JSON.parse(data.exceptions || "[]"),
      };

      const url = editingPolicy ? `/api/admin/retention/${editingPolicy.id}` : "/api/admin/retention";
      const method = editingPolicy ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingPolicy ? "Policy updated" : "Policy created");
        setIsDialogOpen(false);
        setEditingPolicy(null);
        form.reset({
          category: "audit_logs",
          description: "",
          retentionDays: 365,
          archiveAfterDays: null,
          deleteAfterDays: 730,
          legalBasis: "",
          appliesTo: "{}",
          exceptions: "[]",
        });
        fetchPolicies();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save policy");
      }
    } catch (error) {
      toast.error("Failed to save policy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunJob = async (policyId: string) => {
    try {
      const res = await fetch("/api/admin/compliance/retention/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyId }),
      });

      if (res.ok) {
        toast.success("Retention job completed");
        fetchPolicies();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to run job");
      }
    } catch (error) {
      toast.error("Failed to run job");
    }
  };

  const handleEdit = (policy: RetentionPolicy) => {
    setEditingPolicy(policy);
    form.reset({
      districtId: policy.districtId || "",
      schoolId: policy.schoolId || "",
      category: policy.category as any,
      description: policy.description,
      retentionDays: policy.retentionDays,
      archiveAfterDays: policy.archiveAfterDays,
      deleteAfterDays: policy.deleteAfterDays,
      legalBasis: policy.legalBasis || "",
      appliesTo: JSON.stringify(policy.appliesTo || {}),
      exceptions: JSON.stringify(policy.exceptions || []),
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingPolicy(null);
    form.reset({
      category: "audit_logs",
      description: "",
      retentionDays: 365,
      archiveAfterDays: null,
      deleteAfterDays: 730,
      legalBasis: "",
      appliesTo: "{}",
      exceptions: "[]",
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "success" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );

  const getCategoryBadge = (category: string) => (
    <Badge variant="outline">{categoryLabels[category] || category}</Badge>
  );

  if (initialLoading) {
    return <AdminRetentionSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Retention Policies</h1>
          <p className="text-muted-foreground">Manage data retention, archival, and deletion policies</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Policy
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={isActiveFilter} onValueChange={v => { setIsActiveFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { fetchPolicies(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Policies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No retention policies found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead className="text-right">Retention</TableHead>
                      <TableHead className="text-right">Archive</TableHead>
                      <TableHead className="text-right">Delete</TableHead>
                      <TableHead>Legal Basis</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map(policy => (
                      <TableRow key={policy.id}>
                        <TableCell>{getCategoryBadge(policy.category)}</TableCell>
                        <TableCell className="max-w-xs truncate">{policy.description}</TableCell>
                        <TableCell>
                          {policy.districtName && <span className="text-sm text-muted-foreground">{policy.districtName}</span>}
                          {policy.schoolName && <span className="text-sm text-muted-foreground ml-2">→ {policy.schoolName}</span>}
                          {!policy.districtName && !policy.schoolName && <span className="text-sm text-muted-foreground">Global</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <Clock className="inline h-3 w-3 mr-1 text-muted-foreground" />
                          {policy.retentionDays}d
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {policy.archiveAfterDays ? (
                            <>
                              <Archive className="inline h-3 w-3 mr-1 text-muted-foreground" />
                              {policy.archiveAfterDays}d
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <Trash2 className="inline h-3 w-3 mr-1 text-destructive" />
                          {policy.deleteAfterDays}d
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {policy.legalBasis || "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(policy.isActive)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleRunJob(policy.id)} disabled={!policy.isActive} title="Run retention job">
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(policy)} title="Edit">
                              <Filter className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Showing {policies.length} of {total} policies
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? "Edit Retention Policy" : "New Retention Policy"}</DialogTitle>
            <DialogDescription>
              Configure data retention, archival, and deletion rules
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Category</Label>
                  <Select onValueChange={(value: RetentionCategory) => form.setValue("category", value)} defaultValue={form.watch("category") as RetentionCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && (
                    <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
                  )}
                </div>
                <div>
                  <Label>Retention Days</Label>
                  <Input type="number" {...form.register("retentionDays", { valueAsNumber: true })} min={0} />
                  {form.formState.errors.retentionDays && (
                    <p className="text-sm text-destructive">{form.formState.errors.retentionDays.message}</p>
                  )}
                </div>
                <div>
                  <Label>Archive After Days (optional)</Label>
                  <Input type="number" {...form.register("archiveAfterDays", { valueAsNumber: true })} min={0} placeholder="Leave empty to skip archival" />
                  {form.formState.errors.archiveAfterDays && (
                    <p className="text-sm text-destructive">{form.formState.errors.archiveAfterDays.message}</p>
                  )}
                </div>
                <div>
                  <Label>Delete After Days</Label>
                  <Input type="number" {...form.register("deleteAfterDays", { valueAsNumber: true })} min={0} />
                  {form.formState.errors.deleteAfterDays && (
                    <p className="text-sm text-destructive">{form.formState.errors.deleteAfterDays.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Input {...form.register("description")} placeholder="Describe this retention policy" />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div>
                <Label>Legal Basis (optional)</Label>
                <Input {...form.register("legalBasis")} placeholder="e.g., FERPA, GDPR Art. 5, State law" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Applies To (JSON)</Label>
                  <Input {...form.register("appliesTo")} placeholder='{"roles": ["student"], "dataTypes": ["pii"]}' />
                </div>
                <div>
                  <Label>Exceptions (JSON array)</Label>
                  <Input {...form.register("exceptions")} placeholder='[{"condition": "legal_hold", "extendedDays": 365}]' />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingPolicy ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}