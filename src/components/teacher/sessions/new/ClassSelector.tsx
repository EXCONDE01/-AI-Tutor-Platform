"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClassMeta, formatTermYear, classStatusVariant, type ClassData } from "@/lib/classes/format";

interface ClassSelectorProps {
  classes: ClassData[];
  selectedClassId: string | null;
  onSelectClass: (classId: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ClassSelector({
  classes,
  selectedClassId,
  onSelectClass,
  isLoading = false,
  error = null,
  onRetry,
}: ClassSelectorProps) {
  if (isLoading) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            Select a class
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
              >
                <div className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
                <div className="h-6 w-20 rounded-full bg-muted" />
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
            Unable to load classes
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

  if (classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            Select a class
          </CardTitle>
        </CardHeader>
        <CardContent className="py-10 text-center">
          <Users
            className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50"
            aria-hidden="true"
          />
          <p className="mb-4 text-muted-foreground">You don&apos;t have any classes yet.</p>
          <Button asChild>
            <Link href="/teacher/classes">Go to classes</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          Select a class
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose the class you want to start a tutoring session in.
        </p>
      </CardHeader>
      <CardContent className="space-y-3" role="radiogroup" aria-label="Classes">
        {classes.map((cls) => {
          const isSelected = selectedClassId === cls.id;
          const isActive = cls.status === "active";
          const termYear = formatTermYear(cls.term, cls.year);

          return (
            <button
              key={cls.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                if (isActive) onSelectClass(cls.id);
              }}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:border-primary/50 hover:bg-accent",
                !isActive && "cursor-not-allowed opacity-60"
              )}
              disabled={!isActive}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  <Users className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("truncate font-medium", isSelected && "text-primary")}>
                      {cls.name}
                    </p>
                    <Badge variant={classStatusVariant(cls.status)}>{cls.status}</Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {formatClassMeta(cls.subject, cls.gradeLevel)}
                    {termYear ? ` · ${termYear}` : ""}
                  </p>
                  {!isActive && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Only active classes can be used to start a session.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {cls.studentCount} student{cls.studentCount === 1 ? "" : "s"}
                  </Badge>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}