"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, School, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TeacherClassesSkeleton } from "@/components/ui/page-skeletons";
import { ClassCard } from "@/components/teacher/classes/class-card";
import { CreateClassDialog } from "@/components/teacher/classes/create-class-dialog";
import { ClassesToolbar } from "@/components/teacher/classes/classes-toolbar";
import { ClassesEmptyState } from "@/components/teacher/classes/classes-empty-state";
import { matchesClassQuery, type ClassData } from "@/lib/classes/format";

export default function TeacherClassesPage() {
  const [classes, setClasses] = React.useState<ClassData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [createOpen, setCreateOpen] = React.useState(false);

  const fetchClasses = React.useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await fetch("/api/teacher/classes", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to load classes");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchClasses();
  }, [fetchClasses]);

  // Filter classes client-side
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = matchesClassQuery(cls, searchQuery);
    const matchesStatus = statusFilter === "all" || cls.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const handleCreateSuccess = () => {
    void fetchClasses({ silent: true });
  };

  const handleDeleted = (id: string) => {
    setClasses((prev) => prev.filter((cls) => cls.id !== id));
  };

  // Summary stats
  const totalClasses = classes.length;
  const activeClasses = classes.filter((cls) => cls.status === "active").length;
  const totalStudents = classes.reduce((sum, cls) => sum + (cls.studentCount ?? 0), 0);

  if (loading) {
    return <TeacherClassesSkeleton />;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Shared dialog instance: opened from the header or the empty state */}
      <CreateClassDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreateSuccess}
        hideTrigger
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
          <p className="text-muted-foreground mt-1">
            Manage your classes, students, and join codes
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="w-full sm:w-auto shrink-0"
        >
          <School className="h-4 w-4 mr-2" aria-hidden="true" />
          Create class
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Couldn&apos;t load your classes</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void fetchClasses()}>
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && totalClasses > 0 && (
        <>
          {/* Summary Strip */}
          <div className="grid gap-4 sm:grid-cols-3" role="region" aria-label="Class summary">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <School className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{totalClasses}</p>
                  <p className="text-xs text-muted-foreground">Total classes</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tutor-green/10">
                  <CheckCircle2 className="h-5 w-5 text-tutor-green" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{activeClasses}</p>
                  <p className="text-xs text-muted-foreground">Active classes</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tutor-blue/10">
                  <Users className="h-5 w-5 text-tutor-blue" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Total students</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar */}
          <ClassesToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalClasses={totalClasses}
            filteredClasses={filteredClasses.length}
            onClearFilters={handleClearFilters}
          />

          {/* Class Cards Grid */}
          {filteredClasses.length > 0 ? (
            <div
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              role="list"
              aria-label="Classes"
            >
              {filteredClasses.map((cls) => (
                <div key={cls.id} role="listitem" className="h-full">
                  <ClassCard class={cls} onDeleted={handleDeleted} />
                </div>
              ))}
            </div>
          ) : (
            <ClassesEmptyState
              variant="no-results"
              onCreateClass={handleClearFilters}
            />
          )}
        </>
      )}

      {!error && totalClasses === 0 && (
        <ClassesEmptyState onCreateClass={() => setCreateOpen(true)} />
      )}
    </div>
  );
}
