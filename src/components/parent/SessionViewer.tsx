"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Clock, Shield, Activity } from "lucide-react";

interface SessionViewerProps {
  studentId: string;
  progress: {
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

export function SessionViewer({ studentId, progress }: SessionViewerProps) {
  const engagementColor = progress.averageEngagementScore === null
    ? "text-muted-foreground"
    : progress.averageEngagementScore >= 70
    ? "text-green-600"
    : progress.averageEngagementScore >= 40
    ? "text-amber-600"
    : "text-red-600";

  const engagementLabel = progress.averageEngagementScore === null
    ? "N/A"
    : progress.averageEngagementScore >= 70
    ? "High"
    : progress.averageEngagementScore >= 40
    ? "Medium"
    : "Low";

  if (!progress.consentStatus.parentalConsent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Learning Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-warning/50 bg-warning/10">
            <Shield className="h-4 w-4 text-warning" />
            <AlertDescription>
              Parental consent (COPPA) has not been granted. Session details are not available.
              <br />
              Visit <a href="/parent/consent" className="underline font-medium">Consent Management</a> to grant consent.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Learning Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary stats */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Sessions</p>
            <p className="text-2xl font-bold mt-1">{progress.totalSessions}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{progress.completedSessions}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Time</p>
            <p className="text-2xl font-bold mt-1">
              {progress.totalDurationMinutes > 0
                ? `${Math.floor(progress.totalDurationMinutes / 60)}h`
                : "0m"}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg. Engagement</p>
            <p className="text-2xl font-bold mt-1" style={{ color: engagementColor }}>
              {engagementLabel}
            </p>
          </div>
        </div>

        {/* Recent topics */}
        {progress.recentTopics.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">Recent Topics</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {progress.recentTopics.slice(0, 8).map((topic, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
              {progress.recentTopics.length > 8 && (
                <Badge variant="secondary" className="text-xs">
                  +{progress.recentTopics.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Last session */}
        {progress.lastSessionDate && (
          <div className="p-3 rounded-lg bg-muted/50 border border-muted/30">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Last Session</p>
                <p className="text-muted-foreground">
                  {new Date(progress.lastSessionDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Read-only note */}
        <Alert className="border-blue-200 bg-blue-50">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          <AlertDescription>
            This is a read-only view. Full session transcripts and AI interactions are available
            to teachers and the student directly. This portal shows summary statistics only.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
