"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatWeekLabel, type WeeklyProgress } from "@/lib/analytics/format";
import { SectionEmpty } from "./section-empty";
import { CalendarDays } from "lucide-react";

interface WeeklyProgressListProps {
  data: WeeklyProgress[];
}

export function WeeklyProgressList({ data }: WeeklyProgressListProps) {
  // Limit to last 8 weeks, newest at the bottom
  const displayData = data.slice(-8);

  if (displayData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Weekly progress
          </CardTitle>
          <p className="text-sm text-muted-foreground">Sessions per week</p>
        </CardHeader>
        <CardContent>
          <SectionEmpty
            title="No weekly data yet"
            description="Weekly totals appear once sessions are recorded in this range."
            icon={CalendarDays}
          />
        </CardContent>
      </Card>
    );
  }

  // Find max sessions for progress bar scaling
  const maxSessions = Math.max(...displayData.map((d) => d.sessions), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Weekly progress
        </CardTitle>
        <p className="text-sm text-muted-foreground">Sessions per week</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayData.map((week) => {
          const progressPercent = (week.sessions / maxSessions) * 100;
          return (
            <div key={week.week} className="flex items-center gap-3">
              <div className="w-28 text-[11px] text-muted-foreground font-mono shrink-0">
                {formatWeekLabel(week.week)}
              </div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-tutor-green/70 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="w-36 text-right text-sm font-mono tabular-nums text-foreground">
                {week.sessions} session{week.sessions !== 1 ? "s" : ""}
              </div>
              <div className="w-24 text-right text-[11px] text-muted-foreground font-mono tabular-nums">
                {week.completedSessions} completed
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}