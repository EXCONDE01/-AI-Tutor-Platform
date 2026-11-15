"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { TutorChat } from "@/components/student/TutorChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentSessionsSkeleton, TutorChatSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentSessionsPage() {
  const [loading, setLoading] = useState(true);
  const [hasSessions, setHasSessions] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasSessions(false); // In production, fetch from API
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <StudentSessionsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">My Sessions</h1>
        <p className="text-muted-foreground">Your tutoring session history</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TutorChat />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
            </CardHeader>
            <CardContent className="py-12 text-center text-muted-foreground">
              {hasSessions ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border text-left">
                      <Skeleton className="h-5 w-1/3 mb-2" variant="text" />
                      <Skeleton className="h-4 w-full" variant="text" />
                    </div>
                  ))}
                </div>
              ) : (
                <p>No past sessions yet. Your tutoring history will appear here.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick Help</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Ask for explanations on any topic</p>
              <p>• Practice problems with guided hints</p>
              <p>• Get study strategies and tips</p>
              <p>• Review previous session topics</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}