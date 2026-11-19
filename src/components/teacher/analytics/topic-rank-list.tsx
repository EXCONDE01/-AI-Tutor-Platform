"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/lib/analytics/format";
import { SectionEmpty } from "./section-empty";
import { Tag, AlertTriangle } from "lucide-react";

interface TopicRankListProps {
  items: Array<{ label: string; count: number }>;
  /** Card heading (card variant only). */
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  tone?: "primary" | "warning";
  /** "card" renders its own Card shell; "bare" renders only the list. */
  variant?: "card" | "bare";
}

export function TopicRankList({
  items,
  title,
  emptyTitle,
  emptyDescription,
  tone = "primary",
  variant = "card",
}: TopicRankListProps) {
  const displayItems = items.slice(0, 10);

  if (displayItems.length === 0) {
    const empty = (
      <SectionEmpty title={emptyTitle} description={emptyDescription} icon={emptyIcon(tone)} />
    );

    if (variant === "bare") {
      return empty;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{empty}</CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...displayItems.map((d) => d.count), 1);
  const barColor = tone === "warning" ? "bg-tutor-orange/70" : "bg-tutor-blue/70";

  const list = (
    <ol className="divide-y" role="list" aria-label={title}>
      {displayItems.map((item, index) => {
        const barWidth = (item.count / maxCount) * 100;
        return (
          <li
            key={item.label}
            className="flex items-center gap-3 py-2 px-4 hover:bg-muted/50 transition-colors"
          >
            <span
              className="w-6 shrink-0 text-right text-sm font-medium text-muted-foreground tabular-nums"
              aria-label={`Rank ${index + 1}`}
            >
              #{index + 1}
            </span>
            <span className="flex-1 truncate text-sm" title={item.label}>
              {item.label}
            </span>
            <div
              className="h-3 w-32 shrink-0 overflow-hidden rounded-full bg-muted"
              aria-hidden="true"
            >
              <div
                className={cn("h-full rounded-full transition-all duration-500", barColor)}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span
              className="w-16 shrink-0 text-right text-sm font-mono tabular-nums text-foreground"
              aria-label={`${item.count} occurrences`}
            >
              {formatCompactNumber(item.count)}
            </span>
          </li>
        );
      })}
    </ol>
  );

  if (variant === "bare") {
    return list;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">{list}</CardContent>
    </Card>
  );
}

function emptyIcon(tone: "primary" | "warning") {
  return tone === "warning" ? AlertTriangle : Tag;
}
