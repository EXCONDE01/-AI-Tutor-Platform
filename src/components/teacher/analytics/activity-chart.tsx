"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactNumber, formatDayLabel, chartTickIndices } from "@/lib/analytics/format";
import { SectionEmpty } from "./section-empty";
import { Activity } from "lucide-react";
import type { SessionDay } from "@/lib/analytics/types";

interface ActivityChartProps {
  data: SessionDay[];
}

const WIDTH = 600;
const HEIGHT = 240;
const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 34;

export function ActivityChart({ data }: ActivityChartProps) {
  const chartId = React.useId();
  const sessionsGradientId = `sessions-gradient-${chartId}`;
  const messagesGradientId = `messages-gradient-${chartId}`;

  const totalSessions = data.reduce((sum, day) => sum + day.count, 0);
  const totalMessages = data.reduce((sum, day) => sum + day.messages, 0);

  const header = (
    <CardHeader>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" aria-hidden="true" />
            Session activity
          </CardTitle>
          <p className="text-sm text-muted-foreground">Sessions and messages per day</p>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-tutor-blue" aria-hidden="true" />
            Sessions
            <span className="ml-1 font-mono tabular-nums text-muted-foreground">
              {formatCompactNumber(totalSessions)}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-tutor-purple" aria-hidden="true" />
            Messages
            <span className="ml-1 font-mono tabular-nums text-muted-foreground">
              {formatCompactNumber(totalMessages)}
            </span>
          </span>
        </div>
      </div>
    </CardHeader>
  );

  if (data.length === 0) {
    return (
      <Card>
        {header}
        <CardContent>
          <SectionEmpty
            title="No activity yet"
            description="Sessions will appear here as students start tutoring."
            icon={Activity}
          />
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.flatMap((day) => [day.count, day.messages]), 1);
  const chartWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baselineY = PAD_TOP + chartHeight;
  const tickIndices = chartTickIndices(data.length, 6);

  const xScale = (index: number) =>
    data.length <= 1 ? PAD_LEFT + chartWidth / 2 : PAD_LEFT + (index / (data.length - 1)) * chartWidth;

  // Always scale from zero so line differences stay honest.
  const yScale = (value: number) => baselineY - (value / maxValue) * chartHeight;

  const buildPath = (key: "count" | "messages") =>
    data
      .map((day, index) => `${index === 0 ? "M" : "L"} ${xScale(index)} ${yScale(day[key])}`)
      .join(" ");

  const sessionsPath = buildPath("count");
  const messagesPath = buildPath("messages");
  const areaPath = (line: string) =>
    `${line} L${xScale(data.length - 1)} ${baselineY} L${xScale(0)} ${baselineY} Z`;

  // 5 gridlines from 0 to maxValue
  const gridValues = Array.from({ length: 5 }, (_, index) => (maxValue * index) / 4);

  const hoverWidth =
    data.length <= 1 ? chartWidth : Math.max(chartWidth / (data.length - 1), 6);

  const ariaLabel = `Session activity for ${data.length} days: ${totalSessions} sessions and ${totalMessages} messages.`;

  return (
    <Card>
      {header}
      <CardContent className="px-2 pb-2 pt-0 sm:px-4">
        <div className="w-full" role="img" aria-label={ariaLabel}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="block h-auto w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={sessionsGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--tutor-blue))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(var(--tutor-blue))" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={messagesGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--tutor-purple))" stopOpacity="0.18" />
                <stop offset="100%" stopColor="hsl(var(--tutor-purple))" stopOpacity="0" />
              </linearGradient>
            </defs>

            {gridValues.map((value, index) => {
              const y = yScale(value);
              return (
                <g key={index}>
                  <line
                    x1={PAD_LEFT}
                    x2={WIDTH - PAD_RIGHT}
                    y1={y}
                    y2={y}
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                    strokeDasharray={index === 0 ? undefined : "4 4"}
                  />
                  <text
                    x={PAD_LEFT - 8}
                    y={y}
                    dominantBaseline="middle"
                    textAnchor="end"
                    className="fill-muted-foreground font-mono text-[10px] tabular-nums"
                  >
                    {formatCompactNumber(Math.round(value))}
                  </text>
                </g>
              );
            })}

            <path d={areaPath(sessionsPath)} fill={`url(#${sessionsGradientId})`} stroke="none" />
            <path d={areaPath(messagesPath)} fill={`url(#${messagesGradientId})`} stroke="none" />

            <path
              d={sessionsPath}
              stroke="hsl(var(--tutor-blue))"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={messagesPath}
              stroke="hsl(var(--tutor-purple))"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {data.map((day, index) => {
              const x = xScale(index);
              const tooltip = `${formatDayLabel(day.date)} · ${day.count} ${
                day.count === 1 ? "session" : "sessions"
              } · ${day.messages} ${day.messages === 1 ? "message" : "messages"}`;

              return (
                <g key={day.date}>
                  <rect
                    x={x - hoverWidth / 2}
                    y={PAD_TOP}
                    width={hoverWidth}
                    height={chartHeight}
                    fill="transparent"
                  >
                    <title>{tooltip}</title>
                  </rect>
                  <circle cx={x} cy={yScale(day.count)} r={2.5} fill="hsl(var(--tutor-blue))">
                    <title>{tooltip}</title>
                  </circle>
                  <circle cx={x} cy={yScale(day.messages)} r={2.5} fill="hsl(var(--tutor-purple))">
                    <title>{tooltip}</title>
                  </circle>
                </g>
              );
            })}

            {tickIndices.map((index) => {
              const anchor =
                data.length <= 1 ? "middle" : index === 0 ? "start" : index === data.length - 1 ? "end" : "middle";
              return (
                <text
                  key={index}
                  x={xScale(index)}
                  y={HEIGHT - 10}
                  textAnchor={anchor}
                  className="fill-muted-foreground font-mono text-[10px]"
                >
                  {formatDayLabel(data[index].date)}
                </text>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
