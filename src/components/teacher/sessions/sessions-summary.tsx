"use client";

import { cn } from "@/lib/utils";

interface SessionsSummaryProps {
  counts: {
    all: number;
    active: number;
    paused: number;
    completed: number;
    abandoned: number;
    error: number;
  };
  activeStatus: string;
  onStatusChange: (status: string) => void;
}

export function SessionsSummary({
  counts,
  activeStatus,
  onStatusChange,
}: SessionsSummaryProps) {
  if (counts.all === 0) {
    return null;
  }

  const items = [
    {
      label: "Active now",
      count: counts.active,
      status: "active",
      dotClass: "bg-tutor-green",
      pulse: true,
    },
    {
      label: "Completed",
      count: counts.completed,
      status: "completed",
      dotClass: "bg-tutor-blue",
      pulse: false,
    },
    {
      label: "All sessions",
      count: counts.all,
      status: "all",
      dotClass: "bg-tutor-purple",
      pulse: false,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3" role="region" aria-label="Session summary">
      {items.map((item) => {
        const isSelected = activeStatus === item.status;
        return (
          <button
            key={item.status}
            type="button"
            onClick={() =>
              onStatusChange(isSelected && item.status !== "all" ? "all" : item.status)
            }
            aria-pressed={isSelected}
            className={cn(
              "rounded-lg border bg-card p-4 text-left transition-colors",
              "hover:border-primary/40 hover:bg-accent/40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected && "border-primary/50 bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                {item.label}
              </span>
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  item.dotClass,
                  item.pulse && "animate-pulse"
                )}
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">
              {item.count}
            </p>
          </button>
        );
      })}
    </div>
  );
}
