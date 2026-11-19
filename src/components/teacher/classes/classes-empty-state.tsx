"use client";

import { School, Plus, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ClassesEmptyStateProps {
  onCreateClass: () => void;
  variant?: "default" | "no-results";
}

export function ClassesEmptyState({
  onCreateClass,
  variant = "default",
}: ClassesEmptyStateProps) {
  if (variant === "no-results") {
    return (
      <Card className="text-center py-8">
        <CardContent className="flex flex-col items-center gap-3">
          <HelpCircle className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-muted-foreground">No classes match your search or filters.</p>
          <Button variant="outline" size="sm" onClick={onCreateClass}>
            Clear filters
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="text-center py-12">
      <CardContent className="flex flex-col items-center gap-4 max-w-sm mx-auto">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
          <School className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Create your first class</h3>
          <p className="text-sm text-muted-foreground">
            Classes let you organize students, share join codes, and start tutoring sessions.
          </p>
        </div>
        <Button onClick={onCreateClass} className="w-full sm:w-auto gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create class
        </Button>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <HelpCircle className="h-3 w-3" aria-hidden="true" />
          Students join with a code, then you can launch sessions for them.
        </p>
      </CardContent>
    </Card>
  );
}