import { describe, it, expect } from "vitest";
import {
  formatCompactNumber,
  formatDurationShort,
  formatDayLabel,
  formatDayLabelLong,
  formatWeekLabel,
  formatPercent,
  formatDeltaLabel,
  chartTickIndices,
} from "./format";

describe("formatCompactNumber", () => {
  it("returns '0' for null", () => {
    expect(formatCompactNumber(null)).toBe("0");
  });

  it("returns '0' for undefined", () => {
    expect(formatCompactNumber(undefined)).toBe("0");
  });

  it("returns '0' for NaN", () => {
    expect(formatCompactNumber(NaN)).toBe("0");
  });

  it("returns number as string for values < 1000", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(5)).toBe("5");
    expect(formatCompactNumber(942)).toBe("942");
    expect(formatCompactNumber(999)).toBe("999");
  });

  it("formats thousands with K suffix", () => {
    expect(formatCompactNumber(1234)).toBe("1.2K");
    expect(formatCompactNumber(1500)).toBe("1.5K");
    expect(formatCompactNumber(12500)).toBe("12.5K");
    expect(formatCompactNumber(999999)).toBe("1000K");
  });

  it("formats millions with M suffix", () => {
    expect(formatCompactNumber(1250000)).toBe("1.3M");
    expect(formatCompactNumber(5000000)).toBe("5M");
    expect(formatCompactNumber(12345678)).toBe("12.3M");
  });

  it("formats billions with B suffix", () => {
    expect(formatCompactNumber(1250000000)).toBe("1.3B");
    expect(formatCompactNumber(5000000000)).toBe("5B");
  });

  it("handles negative numbers", () => {
    expect(formatCompactNumber(-1234)).toBe("-1.2K");
    expect(formatCompactNumber(-1250000)).toBe("-1.3M");
  });

  it("trims trailing .0", () => {
    expect(formatCompactNumber(1000)).toBe("1K");
    expect(formatCompactNumber(1000000)).toBe("1M");
  });
});

describe("formatDurationShort", () => {
  it("returns '—' for null", () => {
    expect(formatDurationShort(null)).toBe("—");
  });

  it("returns '—' for undefined", () => {
    expect(formatDurationShort(undefined)).toBe("—");
  });

  it("returns '—' for NaN", () => {
    expect(formatDurationShort(NaN)).toBe("—");
  });

  it("returns '—' for 0", () => {
    expect(formatDurationShort(0)).toBe("—");
  });

  it("returns '—' for negative", () => {
    expect(formatDurationShort(-5)).toBe("—");
    expect(formatDurationShort(-3600)).toBe("—");
  });

  it("formats seconds", () => {
    expect(formatDurationShort(45)).toBe("45s");
    expect(formatDurationShort(30)).toBe("30s");
    expect(formatDurationShort(59)).toBe("59s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDurationShort(90)).toBe("1m 30s");
    expect(formatDurationShort(750)).toBe("12m 30s");
    expect(formatDurationShort(3599)).toBe("59m 59s");
  });

  it("formats hours and minutes", () => {
    expect(formatDurationShort(3600)).toBe("1h 0m");
    expect(formatDurationShort(3700)).toBe("1h 1m");
    expect(formatDurationShort(7265)).toBe("2h 1m");
    expect(formatDurationShort(7200)).toBe("2h 0m");
  });
});

describe("formatDayLabel", () => {
  it("formats ISO date to 'MMM DD'", () => {
    expect(formatDayLabel("2026-11-16")).toBe("Nov 16");
    expect(formatDayLabel("2026-01-01")).toBe("Jan 1");
    expect(formatDayLabel("2026-12-31")).toBe("Dec 31");
  });

  it("returns original string for invalid dates", () => {
    expect(formatDayLabel("invalid")).toBe("invalid");
    expect(formatDayLabel("")).toBe("");
    expect(formatDayLabel("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDayLabelLong", () => {
  it("formats ISO date to 'Day, MMM DD, YYYY'", () => {
    expect(formatDayLabelLong("2026-11-16")).toBe("Mon, Nov 16, 2026");
    expect(formatDayLabelLong("2026-01-01")).toBe("Thu, Jan 1, 2026");
  });

  it("returns original string for invalid dates", () => {
    expect(formatDayLabelLong("invalid")).toBe("invalid");
  });
});

describe("formatWeekLabel", () => {
  it("formats ISO date to 'Week of MMM DD'", () => {
    expect(formatWeekLabel("2026-11-10")).toBe("Week of Nov 10");
    expect(formatWeekLabel("2026-01-01")).toBe("Week of Jan 1");
  });

  it("returns original string for invalid dates", () => {
    expect(formatWeekLabel("invalid")).toBe("invalid");
  });
});

describe("formatPercent", () => {
  it("formats integer percentages", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(42)).toBe("42%");
    expect(formatPercent(100)).toBe("100%");
  });

  it("formats with specified digits", () => {
    expect(formatPercent(42.37, 2)).toBe("42.37%");
    expect(formatPercent(33.333, 1)).toBe("33.3%");
  });

  it("clamps to 0..100 range", () => {
    expect(formatPercent(-10)).toBe("0%");
    expect(formatPercent(150)).toBe("100%");
  });
});

describe("formatDeltaLabel", () => {
  it("returns singular for 1", () => {
    expect(formatDeltaLabel(1)).toBe("1 message");
  });

  it("returns plural for other values", () => {
    expect(formatDeltaLabel(0)).toBe("0 messages");
    expect(formatDeltaLabel(2)).toBe("2 messages");
    expect(formatDeltaLabel(10)).toBe("10 messages");
  });
});

describe("chartTickIndices", () => {
  it("returns empty array for length 0", () => {
    expect(chartTickIndices(0)).toEqual([]);
  });

  it("returns [0] for length 1", () => {
    expect(chartTickIndices(1)).toEqual([0]);
  });

  it("returns [0, 1] for length 2", () => {
    expect(chartTickIndices(2)).toEqual([0, 1]);
  });

  it("returns all indices when length <= maxTicks", () => {
    expect(chartTickIndices(5, 6)).toEqual([0, 1, 2, 3, 4]);
    expect(chartTickIndices(6, 6)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("returns evenly spaced indices including first and last", () => {
    expect(chartTickIndices(7, 6)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(chartTickIndices(30, 6)).toEqual([0, 6, 12, 18, 24, 29]);
    expect(chartTickIndices(365, 6)).toEqual([0, 73, 146, 219, 292, 364]);
  });

  it("handles custom maxTicks", () => {
    expect(chartTickIndices(10, 3)).toEqual([0, 4, 9]);
    expect(chartTickIndices(10, 4)).toEqual([0, 3, 6, 9]);
  });
});