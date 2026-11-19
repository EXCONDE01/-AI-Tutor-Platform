"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronRight } from "lucide-react";

interface AnalyticsEmptyStateProps {
  /** Human-readable range, e.g. "the last 30 days" or "all time". */
  range: string;
  hasClassFilter: boolean;
  onWidenRange: () => void;
  onClearClassFilter: () => void;
}

export function AnalyticsEmptyState({
  range,
  hasClassFilter,
  onWidenRange,
  onClearClassFilter,
}: AnalyticsEmptyStateProps) {
  return (
    <Card>
      <CardContent className="space-y-6 px-6 py-14 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted"
          aria-hidden="true"
        >
          <BarChart3 className="h-7 w-7 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">No sessions in {range}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Analytics appear once your students have tutoring sessions. You&apos;ll then
            see engagement, session activity, topic insights, and more.
          </p>
        </div>

        <div
          className="flex flex-col items-center justify-center gap-3 sm:flex-row"
          role="group"
          aria-label="Empty state actions"
        >
          <Button variant="outline" onClick={onWidenRange} className="w-full sm:w-auto">
            Show last 90 days
            <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
          {hasClassFilter && (
            <Button variant="ghost" onClick={onClearClassFilter} className="w-full sm:w-auto">
              Clear class filter
            </Button>
          )}
        </div>

        <Button asChild variant="link" className="h-auto p-0 text-xs">
          <Link href="/teacher/sessions">View all sessions</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
