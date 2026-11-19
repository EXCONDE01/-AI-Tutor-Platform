import { describe, it, expect } from "vitest";
import {
  formatRelativeTime,
  formatDateTime,
  formatDuration,
  sessionStatusVariant,
  formatSessionStatus,
  sessionElapsedSeconds,
  type SessionStatus,
} from "./format";

describe("formatRelativeTime", () => {
  const now = new Date("2026-11-19T15:42:00.000Z");

  it("returns 'Just now' for timestamps within 60 seconds", () => {
    expect(formatRelativeTime("2026-11-19T15:41:30.000Z", now)).toBe("Just now");
    expect(formatRelativeTime("2026-11-19T15:41:59.000Z", now)).toBe("Just now");
  });

  it("returns 'Xm ago' for minutes (< 60m)", () => {
    expect(formatRelativeTime("2026-11-19T15:37:00.000Z", now)).toBe("5m ago");
    expect(formatRelativeTime("2026-11-19T14:43:00.000Z", now)).toBe("59m ago");
  });

  it("returns 'Xh ago' for hours (< 24h)", () => {
    expect(formatRelativeTime("2026-11-19T12:42:00.000Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-11-18T16:42:00.000Z", now)).toBe("23h ago");
    // 60 minutes = 1 hour
    expect(formatRelativeTime("2026-11-19T14:42:00.000Z", now)).toBe("1h ago");
    // 24 hours = 1 day
    expect(formatRelativeTime("2026-11-18T15:42:00.000Z", now)).toBe("1d ago");
  });

  it("returns 'Xd ago' for days", () => {
    expect(formatRelativeTime("2026-11-17T15:42:00.000Z", now)).toBe("2d ago");
    expect(formatRelativeTime("2026-11-10T15:42:00.000Z", now)).toBe("9d ago");
  });

  it("returns '—' for null", () => {
    expect(formatRelativeTime(null, now)).toBe("—");
  });

  it("returns '—' for undefined", () => {
    expect(formatRelativeTime(undefined, now)).toBe("—");
  });

  it("returns '—' for invalid date string", () => {
    expect(formatRelativeTime("invalid", now)).toBe("—");
  });

  it("returns 'Just now' for future timestamps", () => {
    const future = new Date("2026-11-20T15:42:00.000Z");
    expect(formatRelativeTime(future.toISOString(), now)).toBe("Just now");
  });

  it("handles Date objects", () => {
    const date = new Date("2026-11-19T15:37:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("5m ago");
  });
});

describe("formatDateTime", () => {
  it("formats ISO string correctly", () => {
    // The output depends on local timezone, so we test the format pattern
    const result = formatDateTime("2026-11-19T15:42:00.000Z");
    expect(result).toMatch(/^Nov 19, 2026, \d{1,2}:\d{2} (AM|PM)$/);
  });

  it("formats Date objects correctly", () => {
    const result = formatDateTime(new Date("2026-11-19T15:42:00.000Z"));
    expect(result).toMatch(/^Nov 19, 2026, \d{1,2}:\d{2} (AM|PM)$/);
  });

  it("returns '—' for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });

  it("returns '—' for undefined", () => {
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("returns '—' for invalid date string", () => {
    expect(formatDateTime("invalid")).toBe("—");
  });
});

describe("formatDuration", () => {
  it("returns '—' for null", () => {
    expect(formatDuration(null)).toBe("—");
  });

  it("returns '—' for undefined", () => {
    expect(formatDuration(undefined)).toBe("—");
  });

  it("returns '—' for 0", () => {
    expect(formatDuration(0)).toBe("—");
  });

  it("returns '—' for negative", () => {
    expect(formatDuration(-5)).toBe("—");
  });

  it("returns '—' for NaN", () => {
    expect(formatDuration(NaN)).toBe("—");
  });

  it("formats seconds", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(30)).toBe("30s");
    expect(formatDuration(59)).toBe("59s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1m 30s");
    expect(formatDuration(750)).toBe("12m 30s");
    expect(formatDuration(3599)).toBe("59m 59s");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3600)).toBe("1h 00m");
    expect(formatDuration(3665)).toBe("1h 01m");
    expect(formatDuration(7265)).toBe("2h 01m");
    expect(formatDuration(7200)).toBe("2h 00m");
  });
});

describe("sessionStatusVariant", () => {
  it("returns success for active", () => {
    expect(sessionStatusVariant("active")).toBe("success");
  });

  it("returns warning for paused", () => {
    expect(sessionStatusVariant("paused")).toBe("warning");
  });

  it("returns secondary for completed", () => {
    expect(sessionStatusVariant("completed")).toBe("secondary");
  });

  it("returns destructive for abandoned", () => {
    expect(sessionStatusVariant("abandoned")).toBe("destructive");
  });

  it("returns destructive for error", () => {
    expect(sessionStatusVariant("error")).toBe("destructive");
  });

  it("returns outline for unknown status", () => {
    expect(sessionStatusVariant("unknown")).toBe("outline");
    expect(sessionStatusVariant("")).toBe("outline");
    expect(sessionStatusVariant("weird")).toBe("outline");
  });
});

describe("formatSessionStatus", () => {
  it("returns proper labels for known statuses", () => {
    expect(formatSessionStatus("active")).toBe("Active");
    expect(formatSessionStatus("paused")).toBe("Paused");
    expect(formatSessionStatus("completed")).toBe("Completed");
    expect(formatSessionStatus("abandoned")).toBe("Abandoned");
    expect(formatSessionStatus("error")).toBe("Error");
  });

  it("capitalizes unknown statuses", () => {
    expect(formatSessionStatus("unknown")).toBe("Unknown");
    expect(formatSessionStatus("weird_status")).toBe("Weird_status");
    expect(formatSessionStatus("")).toBe("");
  });
});

describe("sessionElapsedSeconds", () => {
  const now = new Date("2026-11-19T15:42:00.000Z");

  it("prefers totalDurationSeconds when > 0", () => {
    expect(
      sessionElapsedSeconds(
        {
          startedAt: "2026-11-19T15:00:00.000Z",
          totalDurationSeconds: 3600,
        },
        now
      )
    ).toBe(3600);
  });

  it("ignores totalDurationSeconds when 0", () => {
    expect(
      sessionElapsedSeconds(
        {
          startedAt: "2026-11-19T15:00:00.000Z",
          endedAt: "2026-11-19T15:30:00.000Z",
          totalDurationSeconds: 0,
        },
        now
      )
    ).toBe(1800); // 30 minutes = 1800 seconds
  });

  it("ignores totalDurationSeconds when negative", () => {
    expect(
      sessionElapsedSeconds(
        {
          startedAt: "2026-11-19T15:00:00.000Z",
          endedAt: "2026-11-19T15:30:00.000Z",
          totalDurationSeconds: -100,
        },
        now
      )
    ).toBe(1800);
  });

  it("uses endedAt - startedAt when totalDurationSeconds not available", () => {
    expect(
      sessionElapsedSeconds(
        {
          startedAt: "2026-11-19T15:00:00.000Z",
          endedAt: "2026-11-19T15:30:00.000Z",
        },
        now
      )
    ).toBe(1800);
  });

  it("uses now - startedAt for active sessions (no endedAt)", () => {
    expect(
      sessionElapsedSeconds(
        {
          startedAt: "2026-11-19T15:00:00.000Z",
          endedAt: null,
        },
        now
      )
    ).toBe(2520); // 42 minutes = 2520 seconds
  });

  it("uses now - startedAt when endedAt is undefined", () => {
    expect(
      sessionElapsedSeconds(
        {
          startedAt: "2026-11-19T15:00:00.000Z",
        },
        now
      )
    ).toBe(2520);
  });

  it("never returns negative values", () => {
    // endedAt before startedAt
    expect(
      sessionElapsedSeconds(
        {
          startedAt: "2026-11-19T15:30:00.000Z",
          endedAt: "2026-11-19T15:00:00.000Z",
        },
        now
      )
    ).toBe(0);

    // future startedAt
    expect(
      sessionElapsedSeconds(
        {
          startedAt: "2026-11-20T15:42:00.000Z",
        },
        now
      )
    ).toBe(0);
  });

  it("handles Date objects for startedAt", () => {
    expect(
      sessionElapsedSeconds(
        {
          startedAt: new Date("2026-11-19T15:00:00.000Z"),
          endedAt: new Date("2026-11-19T15:30:00.000Z"),
        },
        now
      )
    ).toBe(1800);
  });

  it("handles invalid dates gracefully", () => {
    expect(
      sessionElapsedSeconds(
        {
          startedAt: "invalid",
        },
        now
      )
    ).toBe(0);
  });
});