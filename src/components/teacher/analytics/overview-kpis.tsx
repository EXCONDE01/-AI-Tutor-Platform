"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MessageSquare, Users, Clock, Sparkles } from "lucide-react";
import { formatCompactNumber } from "@/lib/analytics/format";
import { formatDuration } from "@/lib/sessions/format";
import type { AnalyticsOverview, TokenStats } from "@/lib/analytics/types";

interface OverviewKpisProps {
  overview: AnalyticsOverview;
  classesCount: number;
}

const STAT_COLORS = {
  sessions: "text-tutor-blue",
  students: "text-tutor-green",
  messages: "text-tutor-purple",
  time: "text-tutor-orange",
} as const;

const DOT_COLORS = {
  sessions: "bg-tutor-blue",
  students: "bg-tutor-green",
  messages: "bg-tutor-purple",
  time: "bg-tutor-orange",
} as const;

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  pulse = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof STAT_COLORS;
  pulse?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-5 w-5", STAT_COLORS[color])} aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-3xl font-bold tracking-tight tabular-nums">{value}</div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {pulse && (
            <span
              className={cn("h-1.5 w-1.5 shrink-0 animate-pulse rounded-full", DOT_COLORS[color])}
              aria-hidden="true"
            />
          )}
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

export function OverviewKpis({ overview, classesCount }: OverviewKpisProps) {
  const avgMessagesPerSession =
    overview.total > 0 ? Math.round(overview.messages / overview.total) : 0;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" role="region" aria-label="Key metrics">
      <KpiCard
        title="Sessions"
        value={formatCompactNumber(overview.total)}
        subtitle={
          overview.active > 0
            ? `${overview.active} active now`
            : `${overview.completed} completed`
        }
        icon={MessageSquare}
        color="sessions"
        pulse={overview.active > 0}
      />
      <KpiCard
        title="Students"
        value={formatCompactNumber(overview.students)}
        subtitle={`across ${classesCount} ${classesCount === 1 ? "class" : "classes"}`}
        icon={Users}
        color="students"
      />
      <KpiCard
        title="Messages"
        value={formatCompactNumber(overview.messages)}
        subtitle={`avg ${avgMessagesPerSession} per session`}
        icon={MessageSquare}
        color="messages"
      />
      <KpiCard
        title="Time tutoring"
        value={overview.totalDuration > 0 ? formatDuration(overview.totalDuration) : "—"}
        subtitle={
          overview.totalDuration > 0
            ? `${overview.completedRate}% of sessions completed`
            : "Recorded when sessions end"
        }
        icon={Clock}
        color="time"
      />
    </div>
  );
}

export function TokenUsageCard({ tokens }: { tokens: TokenStats }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-5 w-5 text-tutor-purple" aria-hidden="true" />
          Token usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tokens.hasTokenData ? (
          <dl className="grid grid-cols-3 gap-3">
            <div>
              <dd className="text-2xl font-bold tracking-tight tabular-nums">
                {formatCompactNumber(tokens.totalTokens)}
              </dd>
              <dt className="text-xs text-muted-foreground">Total</dt>
            </div>
            <div>
              <dd className="text-2xl font-bold tracking-tight tabular-nums">
                {formatCompactNumber(tokens.avgTokensPerMessage)}
              </dd>
              <dt className="text-xs text-muted-foreground">Avg / reply</dt>
            </div>
            <div>
              <dd className="text-2xl font-bold tracking-tight tabular-nums">
                {formatCompactNumber(tokens.messageCount)}
              </dd>
              <dt className="text-xs text-muted-foreground">Tutor replies</dt>
            </div>
          </dl>
        ) : (
          <div className="space-y-2 py-2">
            <p className="text-sm">Token usage isn&apos;t recorded yet</p>
            <p className="text-xs text-muted-foreground">
              It appears here once tutoring responses report token counts.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
