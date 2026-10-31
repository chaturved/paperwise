import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatBytes, formatCalendarDate, formatRelative } from "./format";

describe("formatBytes", () => {
  it("picks a readable unit", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("formatRelative", () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date("2026-10-31T12:00:00Z")));
  afterEach(() => vi.useRealTimers());

  const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

  it("describes recent times", () => {
    expect(formatRelative(ago(0))).toBe("Just now");
    expect(formatRelative(ago(5))).toBe("5m ago");
    expect(formatRelative(ago(180))).toBe("3h ago");
    expect(formatRelative(ago(24 * 60))).toBe("Yesterday");
    expect(formatRelative(ago(3 * 24 * 60))).toBe("3d ago");
  });

  it("switches to a date after a week", () => {
    expect(formatRelative(ago(10 * 24 * 60))).toMatch(/2026/);
  });
});

describe("formatCalendarDate", () => {
  it("does not shift the day with the time zone", () => {
    expect(formatCalendarDate("2026-03-01")).toMatch(/Mar/);
    expect(formatCalendarDate("2026-03-01")).toMatch(/\b1\b/);
  });
});
