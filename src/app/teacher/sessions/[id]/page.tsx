"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionStatusBadge } from "@/components/teacher/sessions/session-status-badge";
import { SessionTranscript } from "@/components/teacher/sessions/session-transcript";
import { SessionDetailSummary } from "@/components/teacher/sessions/session-detail-summary";
import { ArrowLeft, AlertTriangle, LayoutDashboard, UserX } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { formatRelativeTime, formatDateTime } from "@/lib/sessions/format";

interface SessionData {
  id: string;
  classId: string;
  className: string;
  classSubject: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: "active" | "paused" | "completed" | "abandoned" | "error";
  title: string | null;
  messageCount: number;
  startedAt: string;
  endedAt: string | null;
  totalDurationSeconds: number;
  tokenUsage?: {
    prompt?: number;
    completion?: number;
    total?: number;
    cost?: number;
  };
  metadata: Record<string, unknown>;
  summary: string | null;
}

interface TranscriptMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  contentType: string;
  sequence: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ApiResponse {
  session: SessionData;
  messages: TranscriptMessage[];
}

const POLL_INTERVAL_MS = 15000;

function SessionDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-8 w-36" variant="rectangular" />
      <div className="space-y-3">
        <Skeleton className="h-9 w-2/3" variant="text" />
        <Skeleton className="h-4 w-1/3" variant="text" />
      </div>
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <Skeleton className="h-12 w-12" variant="circular" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/4" variant="text" />
            <Skeleton className="h-3 w-1/3" variant="text" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((index) => (
          <Card key={index}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-1/2" variant="text" />
              <Skeleton className="h-7 w-1/3" variant="text" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" variant="text" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-16 w-full" variant="rectangular" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id;

  const [session, setSession] = React.useState<SessionData | null>(null);
  const [messages, setMessages] = React.useState<TranscriptMessage[]>([]);
  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const statusRef = React.useRef<string | null>(null);

  const fetchData = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!sessionId) return;

      const res = await fetch(`/api/teacher/sessions/${sessionId}`, {
        credentials: "include",
        signal,
      });

      if (res.status === 404) {
        setNotFound(true);
        setError(null);
        return;
      }

      if (res.status === 401 || res.status === 403) {
        setError("You don't have permission to view this session.");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load session");
      }

      const data: ApiResponse = await res.json();
      statusRef.current = data.session.status;
      setSession(data.session);
      setMessages(data.messages ?? []);
      setError(null);
      setNotFound(false);
    },
    [sessionId]
  );

  React.useEffect(() => {
    if (!sessionId) return;

    const controller = new AbortController();
    let cancelled = false;

    const load = async () => {
      try {
        await fetchData(controller.signal);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load session");
        }
      } finally {
        if (!cancelled) setIsFirstLoad(false);
      }
    };

    void load();

    // Keep an active session's transcript fresh, without re-running this effect.
    const interval = setInterval(() => {
      if (statusRef.current === "active") {
        fetchData(controller.signal).catch(() => {
          // Polling errors are non-fatal; the next tick retries.
        });
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      controller.abort();
    };
  }, [sessionId, fetchData, reloadKey]);

  const isPolling = session?.status === "active";

  if (!sessionId) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Invalid session</AlertTitle>
          <AlertDescription>No session ID provided.</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/teacher/sessions">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to sessions
          </Link>
        </Button>
      </div>
    );
  }

  if (isFirstLoad) {
    return <SessionDetailSkeleton />;
  }

  if (notFound) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <UserX
              className="h-16 w-16 mx-auto text-muted-foreground/50"
              aria-hidden="true"
            />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Session not found</h2>
              <p className="text-muted-foreground">
                This session may have been deleted, or it belongs to another teacher.
              </p>
            </div>
            <Button asChild>
              <Link href="/teacher/sessions">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to sessions
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Couldn&apos;t load this session</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/teacher/sessions">Back to sessions</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back + header */}
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link href="/teacher/sessions">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to sessions
          </Link>
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
              {session.title || "Tutoring session"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Started {formatDateTime(session.startedAt)} (
              {formatRelativeTime(session.startedAt)})
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <SessionStatusBadge status={session.status} showDot={isPolling} />
            {isPolling && (
              <span className="text-xs text-muted-foreground">Auto-updating</span>
            )}
          </div>
        </div>
      </div>

      {/* Student & class */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className="text-base">
                  {getInitials(session.studentName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{session.studentName}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {session.studentEmail}
                </p>
                <p className="text-sm text-muted-foreground">
                  {session.classId ? (
                    <Link
                      href={`/teacher/classes/${session.classId}`}
                      className="hover:underline underline-offset-4"
                    >
                      {session.className}
                    </Link>
                  ) : (
                    session.className
                  )}
                  {session.classSubject ? ` · ${session.classSubject}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button asChild variant="outline">
                <Link href="/teacher/sessions">All sessions</Link>
              </Button>
              {isPolling && (
                <Button asChild>
                  <Link href="/teacher/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true" />
                    Live dashboard
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {session.summary && session.summary.trim() !== "" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {session.summary}
            </p>
          </CardContent>
        </Card>
      )}

      <SessionDetailSummary session={session} />

      <SessionTranscript
        session={{ status: session.status, messageCount: session.messageCount }}
        messages={messages}
      />
    </div>
  );
}
