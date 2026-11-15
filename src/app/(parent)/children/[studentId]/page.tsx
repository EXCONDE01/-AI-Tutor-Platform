"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Users, Clock, Shield, Loader2, Activity, GraduationCap } from "lucide-react";
import { SessionViewer } from "@/components/parent/SessionViewer";
import { ProgressSummary } from "@/components/parent/ProgressSummary";
import { ParentChildDetailSkeleton } from "@/components/ui/page-skeletons";
import { format } from "date-fns";
import { toast } from "sonner";

interface ChildProgress {
  studentId: string;
  studentName: string;
  gradeLevel: number | null;
  totalSessions: number;
  completedSessions: number;
  totalDurationMinutes: number;
  averageEngagementScore: number | null;
  lastSessionDate: string | null;
  recentTopics: string[];
  recentArtifacts: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
  consentStatus: {
    parentalConsent: boolean;
    coppaConsent: boolean;
    ferpaConsent: boolean;
  };
}

export default function ParentChildProgressPage() {
  const params = useParams();
  const resolvedStudentId: string | undefined = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;

  const [progress, setProgress] = useState<ChildProgress | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!resolvedStudentId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/parent/children/${resolvedStudentId}/progress`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setProgress(data.progress);
        } else if (res.status === 404) {
          toast.error("Child not found or not linked to your account");
        } else if (res.status === 401) {
          toast.error("Session expired. Please sign in again.");
        } else {
          toast.error("Failed to load progress");
        }
      } catch {
        toast.error("Failed to load progress");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resolvedStudentId]);

  if (loading || !progress) {
    return <ParentChildDetailSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{progress.studentName}</h1>
          <p className="text-muted-foreground">
            Grade {progress.gradeLevel} &nbsp;•&nbsp; Read-only progress view
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/parent/children" className="button">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Back to Children
            </Button>
          </Link>
          <Badge variant={progress.consentStatus.parentalConsent ? "success" : "warning"}>
            {progress.consentStatus.parentalConsent ? "Parental Consent Granted" : "Consent Required"}
          </Badge>
        </div>
      </div>

      {/* Consent gate (COPPA/FERPA) */}
      {!progress.consentStatus.parentalConsent && (
        <Alert className="border-warning/50 bg-warning/10">
          <Shield className="h-4 w-4 text-warning" />
          <AlertDescription>
            Parental consent (COPPA) has not been granted for this child. Some progress details may be limited.
            Visit <Link href="/parent/consent" className="underline font-medium">Consent Management</Link> to grant consent.
          </AlertDescription>
        </Alert>
      )}

      <GridView progress={progress} studentId={resolvedStudentId ?? ""} />
    </div>
  );
}

function GridView({ progress, studentId }: { progress: ChildProgress; studentId: string }) {
  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <ProgressSummary progress={progress} />

      {/* Session Viewer */}
      <SessionViewer studentId={studentId} progress={progress} />

      {/* Recent Artifacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Artifacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progress.recentArtifacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No artifacts available yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progress.recentArtifacts.map(artifact => (
                    <TableRow key={artifact.id}>
                      <TableCell className="font-medium max-w-xs truncate">{artifact.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm capitalize">{artifact.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{artifact.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {format(new Date(artifact.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
