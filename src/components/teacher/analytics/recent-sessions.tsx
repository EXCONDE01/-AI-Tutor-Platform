"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { cn, getInitials } from "@/lib/utils";
import { formatRelativeTime, formatDateTime } from "@/lib/sessions/format";
import { SessionStatusBadge } from "@/components/teacher/sessions/session-status-badge";
import type { RecentSession } from "@/lib/analytics/types";

interface RecentSessionsProps {
  sessions: RecentSession[];
}

function SessionRow({ session }: { session: RecentSession }) {
  const initials = getInitials(session.studentName);

  return (
    <Link
      href={`/teacher/sessions/${session.id}`}
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0"
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate" title={session.title || "Tutoring session"}>
            {session.title || "Tutoring session"}
          </p>
          <SessionStatusBadge status={session.status} showDot />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="truncate" title={session.studentName}>{session.studentName}</span>
          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{session.className}</span>
          <span className="text-xs">{session.messageCount} messages</span>
          <time
            dateTime={session.startedAt}
            title={formatDateTime(session.startedAt)}
            className="text-xs whitespace-nowrap"
          >
            {formatRelativeTime(session.startedAt)}
          </time>
        </div>
      </div>
    </Link>
  );
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  const displaySessions = sessions.slice(0, 8);

  if (displaySessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4" aria-live="polite">
        No recent sessions in this range
      </p>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Recent sessions
        </CardTitle>
        <Link
          href="/teacher/sessions"
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-1" role="list" aria-label="Recent tutoring sessions">
        {displaySessions.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </CardContent>
    </Card>
  );
}