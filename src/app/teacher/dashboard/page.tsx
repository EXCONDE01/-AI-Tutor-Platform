import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, MessageSquare, BarChart3, TrendingUp, Clock, CheckCircle, AlertTriangle, Zap } from "lucide-react";

export default async function TeacherDashboardPage() {
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
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Total classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87</div>
            <p className="text-xs text-muted-foreground">Across all classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions This Week</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Tutoring sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">Completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="/teacher/classes" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors group">
              <div className="p-2 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Manage Classes</p>
                <p className="text-sm text-muted-foreground">Create, edit, or archive classes</p>
              </div>
            </a>
            <a href="/teacher/sessions" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors group">
              <div className="p-2 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">View Sessions</p>
                <p className="text-sm text-muted-foreground">Monitor active tutoring sessions</p>
              </div>
            </a>
            <a href="/teacher/sessions/new" className="flex items-center gap-3 p-3 rounded-lg border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors group">
              <div className="p-2 rounded bg-primary-foreground/10 text-primary-foreground group-hover:bg-primary-foreground/20 transition-colors">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Start AI Tutoring</p>
                <p className="text-sm text-primary-foreground/80">Launch AI tutor for a student</p>
              </div>
            </a>
            <a href="/teacher/analytics" className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors group">
              <div className="p-2 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Analytics</p>
                <p className="text-sm text-muted-foreground">View student progress reports</p>
              </div>
            </a>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded bg-success/10 text-success">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Sarah Johnson</p>
                <p className="text-sm text-muted-foreground">Completed Algebra I - Linear Equations session</p>
              </div>
              <span className="text-xs text-muted-foreground">2 hours ago</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded bg-warning/10 text-warning">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Marcus Chen</p>
                <p className="text-sm text-muted-foreground">Needs help with quadratic equations</p>
              </div>
              <span className="text-xs text-muted-foreground">4 hours ago</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">New student enrolled</p>
                <p className="text-sm text-muted-foreground">Emily Rodriguez joined Period 3 Algebra I</p>
              </div>
              <span className="text-xs text-muted-foreground">1 day ago</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

