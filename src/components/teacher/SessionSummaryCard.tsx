"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  AlertTriangle,
  Star,
  TrendingUp,
  Target,
  MessageSquare,
  Clock,
  ExternalLink,
  ChevronRight,
  Brain,
  Lightbulb,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface SessionSummaryCardProps {
  summary: {
    id: string;
    sessionId: string;
    summary: string;
    keyTopics: string[];
    learningProgress: Record<string, number>;
    misconceptions: string[];
    strengths: string[];
    areasForImprovement: string[];
    engagementScore: number | null;
    messageCount: number;
    durationSeconds: number;
    generatedAt: string;
    className?: string;
    studentName?: string;
  };
  variant?: "compact" | "detailed";
  onViewDetails?: (sessionId: string) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EngagementScore({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  
  const color = score >= 75 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  const bgColor = score >= 75 ? "bg-green-100" : score >= 50 ? "bg-yellow-100" : "bg-red-100";
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            className="text-muted-200"
            fill="none"
            strokeWidth="8"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            className={cn(color, bgColor.replace("bg-", "text-"))}
            fill="none"
            strokeWidth="8"
            strokeDasharray={`${(score / 100) * 251.2} 251.2`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-2xl font-bold", color)}>{score}</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium">Engagement Score</div>
        <div className="text-xs text-muted-foreground">Out of 100</div>
      </div>
    </div>
  );
}

function ProgressBar({ label, progress }: { label: string; progress: number }) {
  const color = progress >= 75 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-red-500";
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground truncate pr-2">{label}</span>
        <span className="font-medium">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

function Section({ title, icon, children, emptyMessage = "None identified" }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  emptyMessage?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        {title}
      </div>
      <div className="ml-6 space-y-1">{children}</div>
    </div>
  );
}

function ItemList({ items, icon, color }: { items: string[]; icon: React.ReactNode; color: string }) {
  if (!items.length) return null;
  
  return (
    <ul className="space-y-1">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 text-sm">
          <span className={cn("flex-shrink-0 mt-0.5", color)}>{icon}</span>
          <span className="text-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function SessionSummaryCard({
  summary,
  variant = "detailed",
  onViewDetails,
}: SessionSummaryCardProps) {
  const isCompact = variant === "compact";
  
  if (isCompact) {
    return (
      <Card className="card-elevated hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onViewDetails?.(summary.sessionId)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{summary.className || "Session"}</span>
                {summary.studentName && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="truncate">{summary.studentName}</span>
                  </>
                )}
              </div>
              <p className="text-sm text-foreground line-clamp-2">{summary.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {summary.keyTopics.slice(0, 3).map((topic, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
                {summary.keyTopics.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{summary.keyTopics.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <EngagementScore score={summary.engagementScore} />
              <div className="text-xs text-muted-foreground text-right">
                <div>{formatDuration(summary.durationSeconds)}</div>
                <div>{summary.messageCount} messages</div>
                <div>{formatDate(summary.generatedAt)}</div>
              </div>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">View full session details</span>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium truncate">{summary.className || "Tutoring Session"}</span>
              {summary.studentName && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="truncate">{summary.studentName}</span>
                </>
              )}
            </div>
            <CardTitle className="text-lg">{summary.summary}</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <EngagementScore score={summary.engagementScore} />
            <div className="text-right text-sm text-muted-foreground border-l pl-4">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(summary.durationSeconds)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{summary.messageCount} messages</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{formatDate(summary.generatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Topics */}
        <Section title="Key Topics" icon={<BookOpen className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-2">
            {summary.keyTopics.length > 0 ? (
              summary.keyTopics.map((topic, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  {topic}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No topics extracted</span>
            )}
          </div>
        </Section>

        {/* Learning Progress */}
        {Object.keys(summary.learningProgress).length > 0 && (
          <Section title="Learning Progress" icon={<Target className="h-4 w-4" />}>
            {Object.entries(summary.learningProgress).map(([objective, progress]) => (
              <ProgressBar key={objective} label={objective} progress={progress} />
            ))}
          </Section>
        )}

        {/* Misconceptions */}
        {summary.misconceptions.length > 0 && (
          <Section 
            title="Misconceptions Detected" 
            icon={<AlertTriangle className="h-4 w-4" />}
            emptyMessage="No misconceptions identified"
          >
            <ItemList 
              items={summary.misconceptions} 
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              color="text-destructive"
            />
          </Section>
        )}

        {/* Strengths */}
        {summary.strengths.length > 0 && (
          <Section title="Strengths Demonstrated" icon={<Star className="h-4 w-4" />}>
            <ItemList 
              items={summary.strengths} 
              icon={<Star className="h-3.5 w-3.5" />}
              color="text-green-600"
            />
          </Section>
        )}

        {/* Areas for Improvement */}
        {summary.areasForImprovement.length > 0 && (
          <Section title="Areas for Improvement" icon={<Flag className="h-4 w-4" />}>
            <ItemList 
              items={summary.areasForImprovement} 
              icon={<Flag className="h-3.5 w-3.5" />}
              color="text-yellow-600"
            />
          </Section>
        )}

        {/* Action Buttons */}
        <Separator className="my-2" />
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4" />
            <span>AI-generated summary • {formatDate(summary.generatedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            {onViewDetails && (
              <Button variant="outline" size="sm" onClick={() => onViewDetails(summary.sessionId)}>
                <ExternalLink className="mr-1 h-3 w-3" />
                View Full Session
              </Button>
            )}
            <Button variant="default" size="sm" onClick={() => onViewDetails?.(summary.sessionId)}>
              <Lightbulb className="mr-1 h-3 w-3" />
              Generate Insights
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for lists/grids
 */
export function SessionSummaryCardCompact(props: SessionSummaryCardProps) {
  return <SessionSummaryCard {...props} variant="compact" />;
}

/**
 * Grid layout for multiple summaries
 */
export function SessionSummaryGrid({ 
  summaries, 
  onViewDetails,
  columns = 1
}: {
  summaries: SessionSummaryCardProps["summary"][];
  onViewDetails?: (sessionId: string) => void;
  columns?: 1 | 2 | 3;
}) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  }[columns];

  return (
    <div className={cn("grid gap-4", gridCols)}>
      {summaries.map((summary) => (
        <SessionSummaryCard
          key={summary.id}
          summary={summary}
          variant="compact"
          onViewDetails={onViewDetails}
        />
      ))}
      {summaries.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No session summaries yet</h3>
          <p className="max-w-sm text-sm text-muted-foreground mt-1">
            Session summaries will appear here after tutoring sessions are completed.
          </p>
        </div>
      )}
    </div>
  );
}