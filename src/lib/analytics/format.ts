/**
 * Analytics formatting helpers.
 * Pure functions with no React dependencies.
 */

export type { SessionDay, WeeklyProgress, StudentEngagement, TopicCount, StruggleCount, InterventionRow, TokenStats, AnalyticsClass, AnalyticsRange, AnalyticsOverview, RecentSession, AnalyticsData } from "./types";

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }
  const num = Math.abs(value);
  if (num < 1000) {
    return value.toString();
  }
  if (num < 1000000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  if (num < 1000000000) {
    return (value / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  return (value / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
}

export function formatDurationShort(seconds: number | null | undefined): string {
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
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatDayLabel(iso: string): string {
  try {
    const date = new Date(iso + "T00:00:00Z");
    if (isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

export function formatDayLabelLong(iso: string): string {
  try {
    const date = new Date(iso + "T00:00:00Z");
    if (isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

export function formatWeekLabel(iso: string): string {
  try {
    const date = new Date(iso + "T00:00:00Z");
    if (isNaN(date.getTime())) {
      return iso;
    }
    return `Week of ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })}`;
  } catch {
    return iso;
  }
}

export function formatPercent(value: number, digits = 0): string {
  const clamped = Math.max(0, Math.min(100, value));
  return clamped.toFixed(digits) + "%";
}

export function formatDeltaLabel(value: number): string {
  if (value === 1) {
    return "1 message";
  }
  return `${value} messages`;
}

function roundHalfDown(x: number): number {
  return Math.floor(x + 0.5 - 1e-10);
}

export function chartTickIndices(length: number, maxTicks = 6): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];
  if (length === 2) return [0, 1];
  if (length <= maxTicks + 1) {
    return Array.from({ length }, (_, i) => i);
  }

  const step = roundHalfDown((length - 1) / (maxTicks - 1));
  const indices: number[] = [0];

  for (let i = 1; i < maxTicks - 1; i++) {
    indices.push(Math.min(i * step, length - 2));
  }

  indices.push(length - 1);
  return indices;
}