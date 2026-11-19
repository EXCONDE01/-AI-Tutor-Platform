"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/sessions/format";
import type { AnalyticsClass } from "@/lib/analytics/types";

interface AnalyticsToolbarProps {
  range: "7" | "30" | "90" | "all";
  onRangeChange: (range: "7" | "30" | "90" | "all") => void;
  classId: string;
  onClassChange: (classId: string) => void;
  classes: AnalyticsClass[];
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

const RANGE_OPTIONS: Array<{ value: "7" | "30" | "90" | "all"; label: string }> = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all", label: "All time" },
];

export function AnalyticsToolbar({
  range,
  onRangeChange,
  classId,
  onClassChange,
  classes,
  isRefreshing,
  lastUpdated,
  onRefresh,
}: AnalyticsToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3",
        "w-full"
      )}
      role="toolbar"
      aria-label="Analytics filters and actions"
    >
      <div
        className={cn(
          "flex items-center gap-2",
          "w-full sm:w-auto",
          "flex-wrap"
        )}
        role="group"
        aria-label="Time range"
      >
        {RANGE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="button"
            aria-pressed={range === value}
            onClick={() => onRangeChange(value)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md border transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:opacity-50 disabled:pointer-events-none",
              range === value
                ? "bg-background shadow-sm text-foreground border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-accent border-transparent"
            )}
            disabled={isRefreshing}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-full sm:w-auto">
        <Select
          value={classId}
          onValueChange={onClassChange}
          disabled={classes.length === 0 || isRefreshing}
        >
          <SelectTrigger className="w-full sm:w-[220px]" aria-label="Filter by class">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                <div>
                  <span className="block">{cls.name}</span>
                  {cls.subject && (
                    <span className="text-xs text-muted-foreground block">
                      {cls.subject}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {classes.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1" aria-live="polite">
            No classes available
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh analytics"
          aria-busy={isRefreshing}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4",
              isRefreshing && "animate-spin"
            )}
            aria-hidden="true"
          />
          <span className="sr-only">{isRefreshing ? "Refreshing…" : "Refresh"}</span>
        </Button>
        <span
          className="text-xs text-muted-foreground whitespace-nowrap shrink-0"
          aria-live="polite"
          aria-atomic="true"
        >
          {lastUpdated
            ? `Updated ${formatRelativeTime(lastUpdated)}`
            : "Updated —"}
        </span>
      </div>
    </div>
  );
}