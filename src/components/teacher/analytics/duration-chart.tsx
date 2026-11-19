"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDurationShort, formatDayLabel, chartTickIndices } from "@/lib/analytics/format";
import { SectionEmpty } from "./section-empty";
import { Clock } from "lucide-react";
import type { SessionDay } from "@/lib/analytics/types";

interface DurationChartProps {
  data: SessionDay[];
}

export function DurationChart({ data }: DurationChartProps) {
  const maxDuration = Math.max(...data.map((day) => day.avgDuration), 0);
  const tickIndices = chartTickIndices(data.length, 5);

  const emptyCard = (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" aria-hidden="true" />
          Session length
        </CardTitle>
        <p className="text-sm text-muted-foreground">Average duration per day</p>
      </CardHeader>
      <CardContent>
        <SectionEmpty
          title="No duration recorded yet"
          description="Session length is recorded when a session ends."
          icon={Clock}
        />
      </CardContent>
    </Card>
  );

  if (data.length === 0 || maxDuration === 0) {
    return emptyCard;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" aria-hidden="true" />
          Session length
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Average per day · peak {formatDurationShort(maxDuration)}
        </p>
      </CardHeader>
      <CardContent>
        <div
          className="relative h-40 w-full"
          role="img"
          aria-label={`Average session duration per day. Peak average: ${formatDurationShort(maxDuration)}.`}
        >
          <div className="absolute inset-x-0 bottom-6 top-0 flex items-end gap-[2px]">
            {data.map((day) => {
              const heightPercent = (day.avgDuration / maxDuration) * 100;
              return (
                <div
                  key={day.date}
                  className="min-w-0 flex-1 rounded-t bg-tutor-orange/80 transition-all duration-300"
                  style={{ height: `${Math.max(heightPercent, day.avgDuration > 0 ? 3 : 0)}%` }}
                  title={`${formatDayLabel(day.date)} · ${formatDurationShort(day.avgDuration)}`}
                />
              );
            })}
          </div>

          {tickIndices.map((index) => (
            <span
              key={index}
              className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground"
              style={{ left: `${((index + 0.5) / data.length) * 100}%` }}
            >
              {formatDayLabel(data[index].date)}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-2 font-mono text-[10px] text-muted-foreground">
          <span>0</span>
          <span>{formatDurationShort(maxDuration)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
