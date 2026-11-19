"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  AlertTriangle,
  Clock,
  User,
  Activity,
  Wifi,
  WifiOff,
  Search,
  Filter,
  RefreshCw,
  Pause,
  Lightbulb,
  AlertTriangle as AlertTriangleIcon,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveSessions, useLiveSessionsPolling, LiveSession } from "@/hooks/use-live-sessions";
import { toast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, "success" | "warning" | "info" | "destructive"> = {
  active: "success",
  paused: "warning",
  completed: "info",
  abandoned: "destructive",
  error: "destructive",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface LiveSessionsPanelProps {
  teacherId: string;
  displayName?: string;
  usePolling?: boolean;
  pollingInterval?: number;
}

export function LiveSessionsPanel({
  teacherId,
  displayName,
  usePolling = false, // Back to Realtime
  pollingInterval = 15000,
}: LiveSessionsPanelProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Use Realtime hook by default, with polling as fallback
  const realtimeHook = useLiveSessions({ teacherId, enabled: !usePolling });
  const pollingHook = useLiveSessionsPolling({ teacherId, interval: pollingInterval, enabled: usePolling });

  const sessions = usePolling ? pollingHook.sessions : realtimeHook.sessions;
  const isConnected = usePolling ? !pollingHook.loading : realtimeHook.isConnected;
  const loading = usePolling ? pollingHook.loading : !realtimeHook.isConnected && sessions.length === 0;
  const error = usePolling ? pollingHook.error : realtimeHook.error;
  const reconnect = usePolling ? pollingHook.refetch : realtimeHook.reconnect;

  // Filter sessions based on search and status
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.lastMessageContent?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || session.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleQuickAction = async (session: LiveSession, action: "pause" | "hint" | "escalate" | "end") => {
    const messages: Record<string, string> = {
      pause: "[Teacher intervention]: I'm pausing this session for now. Please wait for further instructions.",
      hint: "[Teacher intervention]: Here's a hint to help you: Think about what we covered in the last lesson about...",
      escalate: "[Teacher intervention]: This session is being escalated for additional support. Someone will be with you shortly.",
      end: "[Teacher intervention]: This session is now ending. Great work today! Your progress has been saved.",
    };

    try {
      const res = await fetch(`/api/teacher/sessions/${session.id}/intervene`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: messages[action] }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to send intervention");
      }

      toast({
        title: "Intervention sent",
        description: `Quick action "${action}" sent to ${session.studentName}`,
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Failed to send intervention",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleViewSession = (sessionId: string) => {
    router.push(`/teacher/sessions/${sessionId}`);
  };

  const handleIntervene = (sessionId: string) => {
    router.push(`/teacher/sessions/${sessionId}/intervene`);
  };

  return (
    <div className="space-y-6">
      {/* Header with connection status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                loading
                  ? "bg-yellow-500 animate-pulse"
                  : isConnected
                  ? "bg-green-500"
                  : "bg-red-500"
              )}
            />
            <span className="text-sm font-medium">
              {loading ? "Connecting..." : isConnected ? "Live" : "Disconnected"}
              {!usePolling && isConnected && " (Realtime)"}
              {usePolling && !loading && " (Polling)"}
            </span>
          </div>
          {error && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Error
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reconnect} disabled={loading || isConnected}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            {loading ? "Loading..." : isConnected ? "Reconnect" : "Connect"}
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent min-w-[150px]"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="abandoned">Abandoned</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Sessions Grid */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No active sessions</h3>
              <p className="max-w-sm text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all"
                  ? "No sessions match your filters"
                  : "Students haven't started any tutoring sessions yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Student</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Class</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Duration</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Last Activity</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Last Message</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => (
                    <React.Fragment key={session.id}>
                      <tr
                        className={cn(
                          "border-t transition-colors hover:bg-muted/50",
                          expandedSession === session.id && "bg-muted/30"
                        )}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-sm bg-primary/10 text-primary">
                                {getInitials(session.studentName || session.studentEmail)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate max-w-[200px]">
                                {session.studentName}
                              </div>
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {session.studentEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-foreground truncate max-w-[150px]">
                            {session.className}
                          </div>
                          <div className="text-sm text-muted-foreground">{session.classSubject}</div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={STATUS_COLORS[session.status] || "default"} className="capitalize">
                            {session.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {formatDuration(session.totalDurationSeconds)}
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {session.lastMessageAt
                            ? formatDate(session.lastMessageAt)
                            : "—"}
                        </td>
                        <td className="py-4 px-4 max-w-xs truncate text-sm text-muted-foreground">
                          {session.lastMessageContent || "No messages yet"}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewSession(session.id)}
                              aria-label="View session details"
                            >
                              <Activity className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleIntervene(session.id)}
                              className="gap-1"
                            >
                              <MessageSquare className="h-3 w-3" />
                              Intervene
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                              aria-label={expandedSession === session.id ? "Collapse" : "Expand"}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {expandedSession === session.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row for quick actions */}
                      {expandedSession === session.id && (
                        <tr className="bg-muted/30 border-t">
                          <td colSpan={7} className="p-4">
                            <div className="flex flex-wrap gap-2">
                              <span className="text-sm font-medium text-muted-foreground mr-2">Quick Actions:</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAction(session, "pause")}
                                disabled={session.status !== "active"}
                              >
                                <Pause className="mr-1 h-3 w-3" />
                                Pause
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAction(session, "hint")}
                                disabled={session.status !== "active"}
                              >
                                <Lightbulb className="mr-1 h-3 w-3" />
                                Suggest Hint
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAction(session, "escalate")}
                                disabled={session.status !== "active"}
                              >
                                <AlertTriangleIcon className="mr-1 h-3 w-3" />
                                Escalate
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAction(session, "end")}
                                disabled={session.status !== "active"}
                              >
                                <X className="mr-1 h-3 w-3" />
                                End Session
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                {usePolling ? "Failed to load sessions: " : "Connection error: "}
                {error.message}
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={reconnect}>
                {usePolling ? "Try Again" : "Reconnect"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}