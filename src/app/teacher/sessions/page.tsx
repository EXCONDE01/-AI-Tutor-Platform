"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TeacherSessionsSkeleton } from "@/components/ui/page-skeletons";
import { SessionsSummary } from "@/components/teacher/sessions/sessions-summary";
import { SessionsToolbar } from "@/components/teacher/sessions/sessions-toolbar";
import { SessionsTable } from "@/components/teacher/sessions/sessions-table";
import { SessionCardList } from "@/components/teacher/sessions/session-card-list";
import { SessionsEmptyState } from "@/components/teacher/sessions/sessions-empty-state";

interface Session {
  id: string;
  classId: string;
  className: string;
  classSubject: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: string;
  title: string | null;
  messageCount: number;
  startedAt: string;
  endedAt: string | null;
  totalDurationSeconds: number | null;
  lastMessageAt: string | null;
  lastMessageContent: string | null;
  lastMessageRole: string | null;
}

interface SessionCounts {
  all: number;
  active: number;
  paused: number;
  completed: number;
  abandoned: number;
  error: number;
}

interface SessionsResponse {
  sessions: Session[];
  total: number;
  counts: SessionCounts;
  limit: number;
  offset: number;
}

interface ClassItem {
  id: string;
  name: string;
  subject: string;
}

const EMPTY_COUNTS: SessionCounts = {
  all: 0,
  active: 0,
  paused: 0,
  completed: 0,
  abandoned: 0,
  error: 0,
};

const LIMIT = 20;

export default function TeacherSessionsPage() {
  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [total, setTotal] = React.useState(0);
  const [counts, setCounts] = React.useState<SessionCounts>(EMPTY_COUNTS);
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [classFilter, setClassFilter] = React.useState("all");
  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Debounce the search box before hitting the API
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Classes for the class filter (non-blocking; failure degrades gracefully)
  React.useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const loadClasses = async () => {
      try {
        const res = await fetch("/api/teacher/classes", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setClasses(data.classes ?? []);
      } catch {
        // Filter is optional — ignore failures.
      }
    };

    void loadClasses();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Fetch sessions whenever filters/page change
  React.useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const loadSessions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: LIMIT.toString(),
          offset: ((page - 1) * LIMIT).toString(),
        });
        if (debouncedSearchQuery.trim())
          params.append("search", debouncedSearchQuery.trim());
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (classFilter !== "all") params.append("classId", classFilter);

        const res = await fetch(`/api/teacher/sessions?${params.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }

        const data: SessionsResponse = await res.json();
        if (cancelled) return;

        setSessions(data.sessions ?? []);
        setTotal(Number(data.total) || 0);
        setCounts(data.counts ?? EMPTY_COUNTS);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsFirstLoad(false);
        }
      }
    };

    void loadSessions();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, debouncedSearchQuery, statusFilter, classFilter, reloadKey]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleClassChange = (value: string) => {
    setClassFilter(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setStatusFilter("all");
    setClassFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || classFilter !== "all";

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const showingFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingTo = Math.min(page * LIMIT, total);

  if (isFirstLoad) {
    return <TeacherSessionsSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Sessions</h1>
          <p className="text-muted-foreground mt-1">
            Monitor active and past tutoring sessions
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link href="/teacher/sessions/new">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Start session
          </Link>
        </Button>
      </div>

      <SessionsSummary
        counts={counts}
        activeStatus={statusFilter}
        onStatusChange={handleStatusChange}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Couldn&apos;t load sessions</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <SessionsToolbar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusChange}
            classFilter={classFilter}
            onClassFilterChange={handleClassChange}
            classes={classes}
            totalSessions={total}
            hasActiveFilters={hasActiveFilters}
            isLoading={isLoading}
            onClearFilters={handleClearFilters}
          />

          {total === 0 && !hasActiveFilters && !isLoading && (
            <SessionsEmptyState variant="no-sessions" onClearFilters={handleClearFilters} />
          )}

          {total === 0 && hasActiveFilters && !isLoading && (
            <SessionsEmptyState variant="no-results" onClearFilters={handleClearFilters} />
          )}

          {sessions.length > 0 && (
            <div
              className={
                isLoading
                  ? "space-y-4 opacity-60 transition-opacity"
                  : "space-y-4 transition-opacity"
              }
              aria-busy={isLoading}
            >
              <div className="hidden md:block">
                <SessionsTable sessions={sessions} />
              </div>
              <div className="md:hidden">
                <SessionCardList sessions={sessions} />
              </div>
            </div>
          )}

          {total > LIMIT && sessions.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Showing {showingFrom}–{showingTo} of {total} sessions
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page >= totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
