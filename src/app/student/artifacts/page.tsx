"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Skeleton, CardSkeleton, PageHeaderSkeleton, ListItemSkeleton } from "@/components/ui/skeleton";

export default function StudentArtifactsPage() {
  const [loading, setLoading] = useState(true);
  const [artifacts, setArtifacts] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setArtifacts([]);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeaderSkeleton showDescription />
        <CardSkeleton showHeader={false} showContent={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">My Artifacts</h1>
        <p className="text-muted-foreground">Generated learning materials and resources</p>
      </div>
      <Card>
        <CardContent className="py-6">
          {artifacts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No artifacts yet. Generated content will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {artifacts.map((a, i) => (
                <ListItemSkeleton key={i} showAvatar={false} lines={2} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}