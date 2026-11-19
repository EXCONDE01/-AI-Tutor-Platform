"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopicRankList } from "./topic-rank-list";
import { SectionEmpty } from "./section-empty";
import { ShieldCheck } from "lucide-react";
import type { InterventionRow } from "@/lib/analytics/types";

function humanise(label: string): string {
  return label.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function aggregateByField(
  rows: InterventionRow[],
  field: keyof InterventionRow
): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[field]);
    map.set(key, (map.get(key) ?? 0) + row.count);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label: humanise(label), count }))
    .sort((a, b) => b.count - a.count);
}

interface InterventionsBreakdownProps {
  interventions: InterventionRow[];
}

export function InterventionsBreakdown({ interventions }: InterventionsBreakdownProps) {
  if (interventions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            Intervention breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SectionEmpty
            title="No interventions yet"
            description="Interventions raised during tutoring sessions will be summarised here."
            icon={ShieldCheck}
          />
        </CardContent>
      </Card>
    );
  }

  const byType = aggregateByField(interventions, "type");
  const bySeverity = aggregateByField(interventions, "severity");
  const byStatus = aggregateByField(interventions, "status");

  const groups = [
    { title: "By type", rows: byType, tone: "primary" as const },
    { title: "By severity", rows: bySeverity, tone: "warning" as const },
    { title: "By status", rows: byStatus, tone: "primary" as const },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          Intervention breakdown
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Grouped by type, severity, and resolution status
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          {groups.map((group) => {
            const total = group.rows.reduce((sum, row) => sum + row.count, 0);
            return (
              <section key={group.title} aria-label={group.title}>
                <div className="mb-2 flex items-baseline justify-between gap-2 px-4">
                  <h3 className="text-sm font-semibold">{group.title}</h3>
                  <span className="text-xs font-mono tabular-nums text-muted-foreground">
                    {total} total
                  </span>
                </div>
                <TopicRankList
                  items={group.rows}
                  title={group.title}
                  emptyTitle="Nothing recorded"
                  emptyDescription="No interventions were logged for this grouping."
                  tone={group.tone}
                  variant="bare"
                />
              </section>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
