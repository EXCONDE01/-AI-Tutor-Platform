"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Brain,
  BarChart3,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCardSkeleton, CardSkeleton, ChartSkeleton, TableSkeleton, Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  overview: {
    total: number;
    active: number;
    completed: number;
    avgDuration: number | null;
    totalDuration: number | null;
  };
  sessionsByDay: Array<{ date: string; count: number; avgDuration: number | null }>;
  studentEngagement: Array<{
    studentId: string;
    studentName: string;
    studentEmail: string;
    sessionCount: number;
    totalDuration: number | null;
    avgDuration: number | null;
    lastSession: string | null;
  }>;
  topics: Array<{ topic: string; count: number }>;
  struggles: Array<{ struggle: string; count: number }>;
  interventions: Array<{ type: string; severity: string; status: string; count: number }>;
  tokens: {
    totalTokens: number | null;
    avgTokensPerMessage: number | null;
    messageCount: number;
  };
  weeklyProgress: Array<{ week: string; sessions: number; avgDuration: number | null; completedSessions: number }>;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

function formatNumber(num: number | null): string {
  if (num === null || num === undefined) return "—";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function StatCard({ title, value, icon: Icon, trend, color = "primary" }: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", `text-${color}-500`)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
      </CardContent>
    </Card>
  );
}

function SimpleBarChart({ data, labelKey, valueKey, maxBars = 8, height = 200 }: {
  data: Record<string, any>[];
  labelKey: string;
  valueKey: string;
  maxBars?: number;
  height?: number;
}) {
  const displayData = data.slice(0, maxBars);
  const maxValue = Math.max(...displayData.map(d => d[valueKey] || 0), 1);

  return (
    <div className="space-y-3" style={{ height }}>
      {displayData.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground w-32 truncate" title={item[labelKey]}>
            {item[labelKey]}
          </div>
          <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
            <div
              className="h-full bg-primary rounded transition-all duration-500"
              style={{ width: `${(item[valueKey] / maxValue) * 100}%` }}
            />
          </div>
          <div className="text-sm font-medium w-16 text-right">
            {typeof item[valueKey] === 'number' ? formatNumber(item[valueKey]) : item[valueKey]}
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, labelKey, valueKey, color = "primary", height = 200 }: {
  data: Record<string, any>[];
  labelKey: string;
  valueKey: string;
  color?: string;
  height?: number;
}) {
  if (data.length === 0) return <div className="text-center text-muted-foreground py-8">No data</div>;

  const values = data.map(d => d[valueKey] || 0);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values);

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d[valueKey] || 0 - minValue) / (maxValue - minValue || 1)) * 100;
    return `${x}%,${y}%`;
  }).join(" ");

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`hsl(var(--${color}))`} stopOpacity="0.3" />
            <stop offset="100%" stopColor={`hsl(var(--${color}))`} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M${points[0]?.split(",")[0] || 0},100 L${points} L100,100 Z`}
          fill="url(#gradient)"
        />
        <path
          d={`M${points}`}
          stroke={`hsl(var(--${color}))`}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - ((d[valueKey] || 0 - minValue) / (maxValue - minValue || 1)) * 100;
          return (
            <circle
              key={i}
              cx={`${x}%`}
              cy={`${y}%`}
              r="3"
              fill={`hsl(var(--${color}))`}
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        {data.map((d, i) => (
          <span key={i} style={{ left: `${(i / (data.length - 1)) * 100}%` }}>
            {d[labelKey]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TeacherAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30");
  const [selectedClass, setSelectedClass] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        days: timeRange,
      });
      if (selectedClass !== "all") params.append("classId", selectedClass);

      const res = await fetch(`/api/teacher/analytics/data?${params}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, selectedClass]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-1/3" variant="text" />
          <Skeleton className="h-5 w-1/2" variant="text" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <CardSkeleton showHeader showContent={false} />
          <CardSkeleton showHeader showContent={false} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton type="line" />
          <ChartSkeleton type="bar" />
        </div>
        <ChartSkeleton height={350} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Student progress and engagement insights</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium">Failed to load analytics</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button onClick={fetchData} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overview = data!.overview;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Student progress and engagement insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {/* Would populate from classes API */}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <Loader2 className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sessions"
          value={formatNumber(overview.total)}
          icon={MessageSquare}
          color="primary"
          trend={overview.completed ? `${overview.completed} completed` : undefined}
        />
        <StatCard
          title="Active Now"
          value={formatNumber(overview.active)}
          icon={Users}
          color="success"
        />
        <StatCard
          title="Avg Duration"
          value={formatDuration(overview.avgDuration || 0)}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Total Time"
          value={formatDuration(overview.totalDuration || 0)}
          icon={TrendingUp}
          color="primary"
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sessions Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={data!.sessionsByDay}
                  labelKey="date"
                  valueKey="count"
                  height={300}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Avg Session Duration (Daily)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={data!.sessionsByDay}
                  labelKey="date"
                  valueKey="avgDuration"
                  color="warning"
                  height={300}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Token Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard
                    title="Total Tokens"
                    value={formatNumber(data!.tokens.totalTokens)}
                    icon={MessageSquare}
                    color="primary"
                  />
                  <StatCard
                    title="Avg/Message"
                    value={formatNumber(data!.tokens.avgTokensPerMessage)}
                    icon={Brain}
                    color="warning"
                  />
                  <StatCard
                    title="Messages"
                    value={formatNumber(data!.tokens.messageCount)}
                    icon={MessageSquare}
                    color="success"
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart
                  data={data!.weeklyProgress}
                  labelKey="week"
                  valueKey="sessions"
                  height={250}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 px-4">Student</th>
                      <th className="pb-3 px-4">Sessions</th>
                      <th className="pb-3 px-4">Total Time</th>
                      <th className="pb-3 px-4">Avg Duration</th>
                      <th className="pb-3 px-4">Last Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.studentEngagement.map((student, i) => (
                      <tr key={student.studentId} className={cn("border-t", i % 2 === 0 && "bg-muted/30")}>
                        <td className="py-3 px-4">
                          <div className="font-medium">{student.studentName}</div>
                          <div className="text-sm text-muted-foreground">{student.studentEmail}</div>
                        </td>
                        <td className="py-3 px-4">{student.sessionCount}</td>
                        <td className="py-3 px-4">{formatDuration(student.totalDuration || 0)}</td>
                        <td className="py-3 px-4">{formatDuration(student.avgDuration || 0)}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {student.lastSession ? new Date(student.lastSession).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Top Topics Covered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart
                  data={data!.topics}
                  labelKey="topic"
                  valueKey="count"
                  maxBars={10}
                  height={350}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Struggle Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart
                  data={data!.struggles}
                  labelKey="struggle"
                  valueKey="count"
                  maxBars={10}
                  height={350}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Interventions Tab */}
        <TabsContent value="interventions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Intervention Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <h4 className="font-medium mb-2">By Type</h4>
                  <SimpleBarChart
                    data={data!.interventions.reduce((acc, i) => {
                      const found = acc.find(x => x.type === i.type);
                      if (found) found.count += i.count;
                      else acc.push({ type: i.type, count: i.count });
                      return acc;
                    }, [] as Array<{ type: string; count: number }>)}
                    labelKey="type"
                    valueKey="count"
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2">By Severity</h4>
                  <SimpleBarChart
                    data={data!.interventions.reduce((acc, i) => {
                      const found = acc.find(x => x.severity === i.severity);
                      if (found) found.count += i.count;
                      else acc.push({ severity: i.severity, count: i.count });
                      return acc;
                    }, [] as Array<{ severity: string; count: number }>)}
                    labelKey="severity"
                    valueKey="count"
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2">By Status</h4>
                  <SimpleBarChart
                    data={data!.interventions.reduce((acc, i) => {
                      const found = acc.find(x => x.status === i.status);
                      if (found) found.count += i.count;
                      else acc.push({ status: i.status, count: i.count });
                      return acc;
                    }, [] as Array<{ status: string; count: number }>)}
                    labelKey="status"
                    valueKey="count"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}