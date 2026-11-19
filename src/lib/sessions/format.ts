/**
 * Formatting helpers for teacher sessions.
 * Pure functions with no React dependencies.
 */

export type SessionStatus =
  | "active"
  | "paused"
  | "completed"
  | "abandoned"
  | "error";

/**
 * Format a date as relative time (e.g., "Just now", "5m ago", "3h ago", "2d ago").
 * Returns "—" for null, undefined, or invalid dates.
 */
export function formatRelativeTime(
  value: string | Date | null | undefined,
  now: Date = new Date()
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    return "—";
  }

  const diffMs = now.getTime() - date.getTime();

  // Future timestamps show as "Just now"
  if (diffMs < 0) {
    return "Just now";
  }

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return `${diffDays}d ago`;
}

/**
 * Format a date as absolute date time (e.g., "Nov 19, 2026, 3:42 PM").
 * Returns "—" for null, undefined, or invalid dates.
 */
export function formatDateTime(
  value: string | Date | null | undefined
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format duration in seconds to human readable string.
 * Examples: "45s", "12m 30s", "1h 05m", "2h"
 * Returns "—" for null, 0, negative, or NaN.
 */
export function formatDuration(
  seconds: number | null | undefined
): string {
  if (
    seconds === null ||
    seconds === undefined ||
    isNaN(seconds) ||
    seconds <= 0
  ) {
    return "—";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
  }
  return `${secs}s`;
}

/**
 * Map session status to badge variant.
 */
export function sessionStatusVariant(
  status: string
): "success" | "warning" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "success";
    case "paused":
      return "warning";
    case "completed":
      return "secondary";
    case "abandoned":
      return "destructive";
    case "error":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Format session status for display (capitalized).
 * Unknown statuses are capitalized as-is.
 */
export function formatSessionStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: "Active",
    paused: "Paused",
    completed: "Completed",
    abandoned: "Abandoned",
    error: "Error",
  };

  return statusMap[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Calculate elapsed seconds for a session.
 * Prefers totalDurationSeconds when > 0;
 * else uses endedAt - startedAt;
 * else uses now - startedAt for active sessions.
 * Never returns negative values.
 */
export function sessionElapsedSeconds(
  session: {
    startedAt: string | Date;
    endedAt?: string | Date | null;
    totalDurationSeconds?: number | null;
  },
  now: Date = new Date()
): number {
  // Prefer totalDurationSeconds when available and positive
  if (
    session.totalDurationSeconds !== undefined &&
    session.totalDurationSeconds !== null &&
    session.totalDurationSeconds > 0
  ) {
    return session.totalDurationSeconds;
  }

  const startedAt =
    session.startedAt instanceof Date
      ? session.startedAt
      : new Date(session.startedAt);

  if (isNaN(startedAt.getTime())) {
    return 0;
  }

  // Use endedAt if available
  if (session.endedAt) {
    const endedAt =
      session.endedAt instanceof Date
        ? session.endedAt
        : new Date(session.endedAt);
    if (!isNaN(endedAt.getTime())) {
      return Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
    }
  }

  // For active sessions, use now - startedAt
  return Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
}