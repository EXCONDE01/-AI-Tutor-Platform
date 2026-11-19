"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertCircle, Users, CheckCircle2, Mail, GraduationCap } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { formatGradeLevel } from "@/lib/classes/format";

export interface ClassStudentOption {
  id: string;
  name: string;
  email: string;
  gradeLevel: number | null;
  enrolledAt: string;
  isActive: boolean;
}

interface StudentSelectorProps {
  students: ClassStudentOption[];
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string) => void;
  isLoading?: boolean;
  error?: string | null;
  classId?: string | null;
  onRetry?: () => void;
}

export function StudentSelector({
  students,
  selectedStudentId,
  onSelectStudent,
  isLoading = false,
  error = null,
  classId = null,
  onRetry,
}: StudentSelectorProps) {
  const activeStudents = students.filter((student) => student.isActive);
  const inactiveCount = students.length - activeStudents.length;

  if (isLoading) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            Select a student
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            Unable to load students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (activeStudents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            Select a student
          </CardTitle>
        </CardHeader>
        <CardContent className="py-10 text-center">
          <Users
            className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50"
            aria-hidden="true"
          />
          <p className="mb-1 font-medium">No active students enrolled</p>
          <p className="mb-4 text-sm text-muted-foreground">
            A student must be actively enrolled in this class before you can start a session.
          </p>
          {classId && (
            <Button asChild variant="outline">
              <Link href={`/teacher/classes/${classId}`}>View class details</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          Select a student
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose an actively enrolled student for this tutoring session.
        </p>
      </CardHeader>
      <CardContent className="space-y-3" role="radiogroup" aria-label="Students">
        {activeStudents.map((student) => {
          const isSelected = selectedStudentId === student.id;

          return (
            <button
              key={student.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectStudent(student.id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:border-primary/50 hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="text-sm font-medium">
                    {getInitials(student.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className={cn("truncate font-medium", isSelected && "text-primary")}>
                    {student.name}
                  </p>
                  <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{student.email}</span>
                  </p>
                  {student.gradeLevel != null && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <GraduationCap className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {formatGradeLevel(student.gradeLevel)}
                    </p>
                  )}
                </div>

                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                )}
              </div>
            </button>
          );
        })}

        {inactiveCount > 0 && (
          <p className="border-t pt-2 text-center text-xs text-muted-foreground">
            {inactiveCount} inactive student{inactiveCount === 1 ? "" : "s"} not shown
          </p>
        )}
      </CardContent>
    </Card>
  );
}