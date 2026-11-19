"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { formatRelativeTime, formatDateTime } from "@/lib/sessions/format";
import { formatDurationShort, formatCompactNumber } from "@/lib/analytics/format";
import { SectionEmpty } from "./section-empty";
import { Users } from "lucide-react";
import { type StudentEngagement } from "@/lib/analytics/types";

interface StudentEngagementTableProps {
  students: StudentEngagement[];
}

export function StudentEngagementTable({ students }: StudentEngagementTableProps) {
  // Sort by sessionCount DESC then name ASC
  const sortedStudents = [...students].sort((a, b) => {
    if (b.sessionCount !== a.sessionCount) {
      return b.sessionCount - a.sessionCount;
    }
    return a.studentName.localeCompare(b.studentName);
  });

  // Limit to 25 rows
  const displayStudents = sortedStudents.slice(0, 25);

  if (displayStudents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SectionEmpty
            title="No students yet"
            description="Students appear here once they are enrolled and start sessions."
            icon={Users}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Student engagement
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="w-48">Student</TableHead>
                <TableHead className="text-right w-24">Sessions</TableHead>
                <TableHead className="text-right w-32">Messages</TableHead>
                <TableHead className="text-right w-32">Total time</TableHead>
                <TableHead className="text-right w-32">Avg session</TableHead>
                <TableHead className="text-right w-40">Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayStudents.map((student, i) => (
                <TableRow
                  key={student.studentId}
                  className={cn("border-t", i % 2 === 0 && "bg-muted/30")}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
                        aria-hidden="true"
                      >
                        {getInitials(student.studentName)}
                      </div>
                      <div>
                        <div>{student.studentName}</div>
                        <div className="text-xs text-muted-foreground">{student.studentEmail}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {student.sessionCount}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCompactNumber(student.messageCount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatDurationShort(student.totalDuration)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatDurationShort(student.avgDuration)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className="text-sm text-muted-foreground"
                      title={student.lastSession ? formatDateTime(student.lastSession) : "—"}
                    >
                      {student.lastSession ? formatRelativeTime(student.lastSession) : "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3 p-4">
          {displayStudents.map((student, i) => (
            <div
              key={student.studentId}
              className="rounded-lg border bg-card p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
                  aria-hidden="true"
                >
                  {getInitials(student.studentName)}
                </div>
                <div>
                  <div className="font-medium">{student.studentName}</div>
                  <div className="text-xs text-muted-foreground">{student.studentEmail}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Sessions</div>
                  <div className="font-mono tabular-nums font-medium">{student.sessionCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Messages</div>
                  <div className="font-mono tabular-nums font-medium">{formatCompactNumber(student.messageCount)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total time</div>
                  <div className="font-mono tabular-nums font-medium">{formatDurationShort(student.totalDuration)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground">Avg session</div>
                  <div className="font-mono tabular-nums font-medium">{formatDurationShort(student.avgDuration)}</div>
                </div>
                <div className="col-span-3">
                  <div className="text-muted-foreground">Last active</div>
                  <div className="font-mono tabular-nums font-medium" title={student.lastSession ? formatDateTime(student.lastSession) : "—"}>
                    {student.lastSession ? formatRelativeTime(student.lastSession) : "—"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="border-t px-4 py-3 text-sm text-muted-foreground">
          Showing {displayStudents.length} student{displayStudents.length !== 1 ? "s" : ""}
        </p>
      </CardContent>
    </Card>
  );
}