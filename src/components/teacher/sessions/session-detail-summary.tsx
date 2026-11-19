"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Clock, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatRelativeTime, sessionElapsedSeconds } from "@/lib/sessions/format";

interface SessionDetailSummaryProps {
  session: {
    messageCount: number;
    startedAt: string;
    endedAt?: string | null;
    tokenUsage?: {
      prompt?: number;
      completion?: number;
      total?: number;
      cost?: number;
    };
    status: string;
    totalDurationSeconds: number;
  };
}

export function SessionDetailSummary({ session }: SessionDetailSummaryProps) {
  const totalTokens = session.tokenUsage?.total ?? 0;

  const stats = [
    {
      label: "Messages",
      value: session.messageCount.toLocaleString("en-US"),
      icon: MessageSquare,
      iconClass: "text-primary",
    },
    {
      label: "Duration",
      value: formatDuration(sessionElapsedSeconds(session)),
      icon: Clock,
      iconClass: "text-tutor-orange",
    },
    {
      label: "Started",
      value: formatRelativeTime(session.startedAt),
      icon: Play,
      iconClass: "text-tutor-green",
    },
    {
      label: "Tokens",
      value: totalTokens > 0 ? totalTokens.toLocaleString("en-US") : "—",
      icon: Sparkles,
      iconClass: "text-tutor-purple",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <stat.icon className={cn("h-4 w-4", stat.iconClass)} aria-hidden="true" />
              <span className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <div className="text-2xl font-bold tracking-tight tabular-nums">
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
