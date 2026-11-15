"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MasteryTrendPoint {
  period: string;
  engagementScore: number;
  sessionCount: number;
}

interface InterventionFrequencyPoint {
  period: string;
  count: number;
  bySeverity: Record<string, number>;
}

interface TimeOnTaskPoint {
  period: string;
  hours: number;
  sessionCount: number;
}

interface SummaryCardsProps {
  totalSessions: number;
  avgEngagement: number;
  totalInterventions: number;
  totalHours: number;
}

function SummaryCards({ totalSessions, avgEngagement, totalInterventions, totalHours }: SummaryCardsProps) {
  const cards = [
    {
      title: "Total Sessions",
      value: totalSessions.toLocaleString(),
      icon: "📊",
      trend: null,
    },
    {
      title: "Avg Engagement",
      value: `${avgEngagement}%`,
      icon: "🎯",
      trend: null,
    },
    {
      title: "Interventions",
      value: totalInterventions.toLocaleString(),
      icon: "⚠️",
      trend: null,
    },
    {
      title: "Time on Task",
      value: `${totalHours}h`,
      icon: "⏱️",
      trend: null,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <span className="text-2xl" aria-hidden="true">{card.icon}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface MasteryTrendChartProps {
  data: MasteryTrendPoint[];
}

function MasteryTrendChart({ data }: MasteryTrendChartProps) {
  if (!data.length) {
    return (
      <Card className="h-80">
        <CardContent className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">No mastery trend data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend
  const firstHalf = data.slice(0, Math.ceil(data.length / 2));
  const secondHalf = data.slice(Math.ceil(data.length / 2));
  const firstAvg = firstHalf.reduce((sum, d) => sum + d.engagementScore, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.engagementScore, 0) / secondHalf.length;
  const trend = secondAvg > firstAvg ? "up" : secondAvg < firstAvg ? "down" : "flat";

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground";

  return (
    <Card className="h-80">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Mastery Trend (Engagement Score)</CardTitle>
        <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {trend === "up" && "Improving"}
            {trend === "down" && "Declining"}
            {trend === "flat" && "Stable"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="period"
              tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              className="text-xs"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value: number) => `${value}`}
              className="text-xs"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: any, name: any) => value !== undefined ? [`${value}%`, name] : ["", name]}
              labelFormatter={(value: any) => value ? new Date(value).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : ""}
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="engagementScore"
              name="Engagement Score"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface InterventionFrequencyChartProps {
  data: InterventionFrequencyPoint[];
}

function InterventionFrequencyChart({ data }: InterventionFrequencyChartProps) {
  if (!data.length) {
    return (
      <Card className="h-80">
        <CardContent className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">No intervention data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Intervention Frequency</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="period"
              tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              className="text-xs"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value: number) => Number.isInteger(value) ? String(value) : ""}
              className="text-xs"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: any, name: any) => value !== undefined ? [value, name] : ["", name]}
              labelFormatter={(value: any) => value ? new Date(value).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : ""}
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
            />
            <Legend />
            <Bar
              dataKey="count"
              name="Interventions"
              fill="hsl(var(--destructive))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface TimeOnTaskChartProps {
  data: TimeOnTaskPoint[];
}

function TimeOnTaskChart({ data }: TimeOnTaskChartProps) {
  if (!data.length) {
    return (
      <Card className="h-80">
        <CardContent className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">No time-on-task data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Time on Task (Hours)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="period"
              tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              className="text-xs"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value: number) => `${value}h`}
              className="text-xs"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: any, name: any) => value !== undefined ? [`${value.toFixed(1)}h`, name] : ["", name]}
              labelFormatter={(value: any) => value ? new Date(value).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : ""}
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="hours"
              name="Hours"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export interface SessionAnalyticsChartsProps {
  masteryTrends: MasteryTrendPoint[];
  interventionFrequency: InterventionFrequencyPoint[];
  timeOnTask: TimeOnTaskPoint[];
  summaryCards: {
    totalSessions: number;
    avgEngagement: number;
    totalInterventions: number;
    totalHours: number;
  };
}

export function SessionAnalyticsCharts({
  masteryTrends,
  interventionFrequency,
  timeOnTask,
  summaryCards,
}: SessionAnalyticsChartsProps) {
  return (
    <div className="space-y-6">
      <SummaryCards
        totalSessions={summaryCards.totalSessions}
        avgEngagement={summaryCards.avgEngagement}
        totalInterventions={summaryCards.totalInterventions}
        totalHours={summaryCards.totalHours}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <MasteryTrendChart data={masteryTrends} />
        <InterventionFrequencyChart data={interventionFrequency} />
      </div>
      <TimeOnTaskChart data={timeOnTask} />
    </div>
  );
}