"use client";

import Link from "next/link";
import { MessageSquare, Clock, ExternalLink, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SessionStatusBadge } from "./session-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatRelativeTime,
  formatDateTime,
  formatDuration,
  sessionElapsedSeconds,
} from "@/lib/sessions/format";

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

interface SessionCardListProps {
  sessions: Session[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function SessionCardList({ sessions }: SessionCardListProps) {
  const now = new Date();

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
        <p className="text-muted-foreground">No sessions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden" role="list" aria-label="Sessions">
      {sessions.map((session) => {
        const isActive = session.status === "active";
        const elapsedSeconds = sessionElapsedSeconds(session, now);
        const startedRelative = formatRelativeTime(session.startedAt, now);
        const startedAbsolute = formatDateTime(session.startedAt);
        const lastActivityRelative = formatRelativeTime(session.lastMessageAt, now);
        const lastActivityAbsolute = formatDateTime(session.lastMessageAt);
        const duration = formatDuration(elapsedSeconds);

        return (
          <Card
            key={session.id}
            className={isActive ? "border-tutor-green/30 bg-tutor-green/5" : ""}
            role="listitem"
          >
            <CardContent className="p-4">
              {/* Student + Status */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="text-sm">
                      {getInitials(session.studentName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{session.studentName}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {session.studentEmail}
                    </p>
                  </div>
                </div>
                <SessionStatusBadge status={session.status} showDot={isActive} />
              </div>

              {/* Class */}
              <div className="mb-3">
                <p className="font-medium text-sm">{session.className}</p>
                <p className="text-xs text-muted-foreground">{session.classSubject}</p>
              </div>

              {/* Meta row: Started | Duration | Messages */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <time dateTime={session.startedAt} title={startedAbsolute}>
                    {startedRelative}
                  </time>
                </div>
                <div className="flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{session.messageCount} messages</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-tutor-green hover:bg-tutor-green/10 flex-1 justify-center"
                  >
                    <Link href="/teacher/dashboard">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                      View live
                    </Link>
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className={isActive ? "flex-1" : "w-full"}
                >
                  <Link href={`/teacher/sessions/${session.id}`}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    View transcript
                    <span className="sr-only"> for {session.studentName}</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}