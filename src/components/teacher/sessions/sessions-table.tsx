"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SessionStatusBadge } from "./session-status-badge";
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

interface SessionsTableProps {
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

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

export function SessionsTable({ sessions }: SessionsTableProps) {
  const now = new Date();

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Last activity</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Messages</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                No sessions found
              </TableCell>
            </TableRow>
          ) : (
            sessions.map((session) => {
              const isActive = session.status === "active";
              const elapsedSeconds = sessionElapsedSeconds(session, now);
              const startedRelative = formatRelativeTime(session.startedAt, now);
              const startedAbsolute = formatDateTime(session.startedAt);
              const lastActivityRelative = formatRelativeTime(session.lastMessageAt, now);
              const lastActivityAbsolute = formatDateTime(session.lastMessageAt);
              const duration = formatDuration(elapsedSeconds);

              return (
                <TableRow
                  key={session.id}
                  className={
                    isActive
                      ? "bg-tutor-green/5 border-l-[3px] border-l-tutor-green hover:bg-tutor-green/10"
                      : "hover:bg-muted/40"
                  }
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(session.studentName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate max-w-xs">{session.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {session.studentEmail}
                        </p>
                        {session.lastMessageContent && (
                          <p className="text-xs text-muted-foreground truncate max-w-[300px] line-clamp-1">
                            {truncate(session.lastMessageContent, 80)}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{session.className}</div>
                    <div className="text-sm text-muted-foreground">{session.classSubject}</div>
                  </TableCell>
                  <TableCell>
                    <SessionStatusBadge status={session.status} showDot={isActive} />
                  </TableCell>
                  <TableCell>
                    <time
                      dateTime={session.startedAt}
                      title={startedAbsolute}
                    >
                      {startedRelative}
                    </time>
                  </TableCell>
                  <TableCell>
                    <time
                      dateTime={session.lastMessageAt ?? ""}
                      title={lastActivityAbsolute}
                    >
                      {lastActivityRelative}
                    </time>
                  </TableCell>
                  <TableCell>{duration}</TableCell>
                  <TableCell>{session.messageCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-tutor-green hover:bg-tutor-green/10"
                        >
                          <Link href="/teacher/dashboard">
                            <ExternalLink className="h-3 w-3 mr-1" aria-hidden="true" />
                            <span>View live</span>
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/teacher/sessions/${session.id}`}>
                          <MessageSquare className="h-3 w-3 mr-1" aria-hidden="true" />
                          <span className="hidden sm:inline">Transcript</span>
                          <span className="sr-only">View transcript for {session.studentName}</span>
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}