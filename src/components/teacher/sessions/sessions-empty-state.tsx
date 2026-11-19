"use client";

import Link from "next/link";
import { MessageSquare, Search, X, HelpCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SessionsEmptyStateProps {
  variant: "no-sessions" | "no-results";
  onClearFilters: () => void;
}

export function SessionsEmptyState({
  variant,
  onClearFilters,
}: SessionsEmptyStateProps) {
  if (variant === "no-results") {
    return (
      <Card className="text-center py-8">
        <CardContent className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
            <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">No sessions match your filters</h3>
            <p className="text-sm text-muted-foreground">
              Try a different search term or clear the filters.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClearFilters} className="gap-1">
            <X className="h-4 w-4" aria-hidden="true" />
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
          <MessageSquare className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">No sessions yet</h3>
          <p className="text-sm text-muted-foreground">
            Start a tutoring session and it will appear here with a full transcript.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/teacher/sessions/new">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Start a session
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
          <HelpCircle className="h-3 w-3" aria-hidden="true" />
          Sessions are created from the dashboard or a class.
        </p>
      </CardContent>
    </Card>
  );
}
