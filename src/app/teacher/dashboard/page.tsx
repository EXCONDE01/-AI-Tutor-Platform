"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, MessageSquare, BarChart3, TrendingUp, Clock, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import { LiveSessionsPanel } from "@/components/teacher/live-sessions-panel";
import { TeacherDashboardSkeleton } from "@/components/ui/page-skeletons";
import { useSession } from "@/lib/auth/client";

interface DashboardStats {
  activeClasses: number;
  totalStudents: number;
  sessionsThisWeek: number;
  avgProgress: string;
}

export default function TeacherDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { data: session } = useSession();

  // Fetch real dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/teacher/dashboard", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          // Fallback to empty stats
          setStats({
            activeClasses: 0,
            totalStudents: 0,
            sessionsThisWeek: 0,
            avgProgress: "0%",
          });
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        setStats({
          activeClasses: 0,
          totalStudents: 0,
          sessionsThisWeek: 0,
          avgProgress: "0%",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <TeacherDashboardSkeleton />;
  }

  const teacherId = session?.user?.id;
  console.log('[TeacherDashboard] session:', session);
  console.log('[TeacherDashboard] teacherId:', teacherId);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, Teacher</h1>
        <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your classes today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeClasses ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents ?? 0}</div>
            <p className="text-xs text-muted-foreground">Across all classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions This Week</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sessionsThisWeek ?? 0}</div>
            <p className="text-xs text-muted-foreground">Tutoring sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgProgress ?? "0%"}</div>
            <p className="text-xs text-muted-foreground">Completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Sessions Monitoring */}
      {teacherId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Live Session Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LiveSessionsPanel 
              teacherId={teacherId}
              displayName={session?.user?.name || session?.user?.email}
              usePolling={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/teacher/classes" className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors group">
          <div className="p-2 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Manage Classes</p>
            <p className="text-sm text-muted-foreground">Create, edit, or archive classes</p>
          </div>
        </Link>
        <Link href="/teacher/sessions" className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors group">
          <div className="p-2 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">View Sessions</p>
            <p className="text-sm text-muted-foreground">Monitor active tutoring sessions</p>
          </div>
        </Link>
        <Link href="/teacher/sessions/new" className="flex items-center gap-3 p-4 rounded-lg border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors group">
          <div className="p-2 rounded bg-primary-foreground/10 text-primary-foreground group-hover:bg-primary-foreground/20 transition-colors">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Start AI Tutoring</p>
            <p className="text-sm text-primary-foreground/80">Launch AI tutor for a student</p>
          </div>
        </Link>
        <Link href="/teacher/analytics" className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors group">
          <div className="p-2 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Analytics</p>
            <p className="text-sm text-muted-foreground">View student progress reports</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

import { Activity } from "lucide-react";