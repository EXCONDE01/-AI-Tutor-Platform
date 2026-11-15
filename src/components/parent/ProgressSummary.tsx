"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Clock, Shield, GraduationCap } from "lucide-react";
import { format } from "date-fns";

interface ProgressSummaryProps {
  progress: {
    studentId: string;
    studentName: string;
    gradeLevel: number | null;
    totalSessions: number;
    completedSessions: number;
    totalDurationMinutes: number;
    averageEngagementScore: number | null;
    lastSessionDate: string | null;
    recentTopics: string[];
    consentStatus: {
      parentalConsent: boolean;
      coppaConsent: boolean;
      ferpaConsent: boolean;
    };
  };
}

export function ProgressSummary({ progress }: ProgressSummaryProps) {
  const engagementColor = progress.averageEngagementScore === null
    ? "text-muted-foreground"
    : progress.averageEngagementScore >= 70
    ? "text-green-600"
    : progress.averageEngagementScore >= 40
    ? "text-amber-600"
    : "text-red-600";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Progress Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Top stat cards */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard
            label="Total Sessions"
            value={progress.totalSessions}
            icon={Activity}
            subtitle={`${progress.completedSessions} completed`}
          />
          <StatCard
            label="Time Spent"
            value={progress.totalDurationMinutes > 0
              ? `${Math.floor(progress.totalDurationMinutes / 60)}h ${progress.totalDurationMinutes % 60}m`
              : "0m"}
            icon={Clock}
            subtitle="Across all sessions"
          />
          <StatCard
            label="Avg. Engagement"
            value={progress.averageEngagementScore !== null ? `${progress.averageEngagementScore}%` : "—"}
            icon={GraduationCap}
            className={engagementColor}
            subtitle={progress.averageEngagementScore === null ? "No data yet" : "1-100 scale"}
          />
          <StatCard
            label="Classes"
            value={progress.totalSessions > 0 ? "Active" : "—"}
            icon={Shield}
            subtitle={progress.totalSessions > 0 ? "Has session history" : "No sessions yet"}
          />
        </div>

        {/* Consent status strip */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Parental Consent (COPPA)</span>
            <span className="ml-auto text-sm">
              <Badge variant={progress.consentStatus.parentalConsent ? "success" : "warning"}>
                {progress.consentStatus.parentalConsent ? "Granted" : "Required"}
              </Badge>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">FERPA</span>
            <span className="ml-auto text-sm">
              <Badge variant={progress.consentStatus.ferpaConsent ? "success" : "warning"}>
                {progress.consentStatus.ferpaConsent ? "Consent Granted" : "Pending"}
              </Badge>
            </span>
          </div>
        </div>

        {/* Last session */}
        {progress.lastSessionDate && (
          <div className="p-3 rounded-lg bg-muted/50 border border-muted/30">
            <div className="flex items-center gap-3 text-sm">
              <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Last Session</p>
                <p className="text-muted-foreground">
                  {formatDistanceToNow(new Date(progress.lastSessionDate), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  subtitle,
  className,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  subtitle: string;
  className?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-muted/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: className || "currentColor" }}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

function formatDistanceToNow(date: Date, options: { addSuffix: boolean }): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return options.addSuffix ? "just now" : "just now";
  if (diffMins < 60) return options.addSuffix ? `${diffMins} min ago` : `${diffMins} min`;
  if (diffHours < 24) return options.addSuffix ? `${diffHours} h ago` : `${diffHours} h`;
  return options.addSuffix ? `${diffDays} day${diffDays !== 1 ? "s" : ""} ago` : `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
}
