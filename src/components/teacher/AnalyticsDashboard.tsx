"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeacherAnalyticsSkeleton } from "@/components/ui/page-skeletons";
import { AnalyticsToolbar } from "./analytics/analytics-toolbar";
import { OverviewKpis, TokenUsageCard } from "./analytics/overview-kpis";
import { AnalyticsEmptyState } from "./analytics/analytics-empty-state";
import { RecentSessions } from "./analytics/recent-sessions";
import { ActivityChart } from "./analytics/activity-chart";
import { DurationChart } from "./analytics/duration-chart";
import { WeeklyProgressList } from "./analytics/weekly-progress-list";
import { TopicRankList } from "./analytics/topic-rank-list";
import { StudentEngagementTable } from "./analytics/student-engagement-table";
import { InterventionsBreakdown } from "./analytics/interventions-breakdown";
import { formatCompactNumber } from "@/lib/analytics/format";
import type { AnalyticsData } from "@/lib/analytics/types";

const RANGE_MAP: Record<"7" | "30" | "90" | "all", number> = {
  "7": 7,
  "30": 30,
  "90": 90,
  "all": 3650,
};

function buildParams(range: "7" | "30" | "90" | "all", classId: string): URLSearchParams {
  const params = new URLSearchParams({ days: String(RANGE_MAP[range]) });
  if (classId !== "all") params.append("classId", classId);
  return params;
}

export function TeacherAnalyticsDashboard() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [range, setRange] = React.useState<"7" | "30" | "90" | "all">("30");
  const [classId, setClassId] = React.useState<string>("all");
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);
  const hasLoadedRef = React.useRef(false);

  const fetchData = React.useCallback(
    async (mode: "initial" | "refresh") => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (mode === "initial") {
        setIsFirstLoad(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const res = await fetch(`/api/teacher/analytics/data?${buildParams(range, classId)}`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error("You don't have permission to view analytics.");
          }
          throw new Error(`Couldn't load analytics (${res.status}). Please try again.`);
        }

        const json: AnalyticsData = await res.json();
        if (controller.signal.aborted) return;

        setData(json);
        setLastUpdated(new Date());
        hasLoadedRef.current = true;
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        if (!controller.signal.aborted) {
          setIsFirstLoad(false);
          setIsRefreshing(false);
        }
      }
    },
    [range, classId]
  );

  // Fetch on mount and whenever a filter changes. After the first successful
  // load we keep the previous data on screen and only show a subtle refresh state.
  React.useEffect(() => {
    void fetchData(hasLoadedRef.current ? "refresh" : "initial");

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const handleRefresh = () => {
    void fetchData("refresh");
  };

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Engagement, sessions, and learning insights across your classes
        </p>
      </div>
      <AnalyticsToolbar
        range={range}
        onRangeChange={setRange}
        classId={classId}
        onClassChange={setClassId}
        classes={data?.classes ?? []}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
      />
    </div>
  );

  if (isFirstLoad) {
    return <TeacherAnalyticsSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        {header}
        <Card className="border-destructive/50">
          <CardContent className="space-y-4 px-6 py-10 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-lg font-medium">Couldn&apos;t load analytics</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Try again
              </button>
              <Link
                href="/teacher/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Back to dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl">
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No analytics data available.</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="text-sm font-medium text-primary hover:underline"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.overview.total === 0) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        {header}
        <AnalyticsEmptyState
          range={range === "all" ? "all time" : `the last ${range} days`}
          hasClassFilter={classId !== "all"}
          onWidenRange={() => setRange("90")}
          onClearClassFilter={() => setClassId("all")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6" aria-busy={isRefreshing}>
      {header}

      <OverviewKpis overview={data.overview} classesCount={data.classes.length} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview" className="h-10 px-3 py-1.5">
            Overview
          </TabsTrigger>
          <TabsTrigger value="students" className="h-10 px-3 py-1.5">
            Students
          </TabsTrigger>
          <TabsTrigger value="content" className="h-10 px-3 py-1.5">
            Content
          </TabsTrigger>
          <TabsTrigger value="interventions" className="h-10 px-3 py-1.5">
            Interventions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ActivityChart data={data.sessionsByDay} />

          <div className="grid gap-4 lg:grid-cols-3">
            <DurationChart data={data.sessionsByDay} />
            <WeeklyProgressList data={data.weeklyProgress} />
            <TokenUsageCard tokens={data.tokens} />
          </div>

          <RecentSessions sessions={data.recentSessions} />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {data.studentEngagement.length}{" "}
            {data.studentEngagement.length === 1 ? "student" : "students"} ·{" "}
            {formatCompactNumber(data.overview.messages)} messages in this range
          </p>
          <StudentEngagementTable students={data.studentEngagement} />
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <TopicRankList
              title="Top topics"
              items={data.topics.map((topic) => ({ label: topic.topic, count: topic.count }))}
              emptyTitle="No topic insights yet"
              emptyDescription="Topic tags appear once a session summary is generated for a session in this range."
            />
            <TopicRankList
              title="Struggle areas"
              items={data.struggles.map((struggle) => ({
                label: struggle.struggle,
                count: struggle.count,
              }))}
              emptyTitle="No struggle patterns yet"
              emptyDescription="Struggle areas are identified from session summaries in this range."
              tone="warning"
            />
          </div>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          <InterventionsBreakdown interventions={data.interventions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
