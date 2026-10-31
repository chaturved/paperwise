import { describe, expect, it } from "vitest";
import type { KeyDate } from "@/types";
import { keyDatesToIcs } from "./ics";

const NOW = new Date("2026-10-31T12:00:00Z");

const dated = (changes: Partial<KeyDate> = {}): KeyDate => ({
  label: "Lease ends",
  date: "2027-12-31",
  timing: null,
  quote: "The lease ends on 31 December 2027.",
  page: 3,
  year_assumed: false,
  ...changes,
});

const unfold = (ics: string): string[] => ics.replace(/\r\n /g, "").split("\r\n").filter(Boolean);

describe("keyDatesToIcs", () => {
  it("writes one all-day event per dated item", () => {
    const lines = unfold(keyDatesToIcs(7, "lease.pdf", [dated()], NOW));

    expect(lines).toContain("BEGIN:VCALENDAR");
    expect(lines).toContain("DTSTART;VALUE=DATE:20271231");
    expect(lines).toContain("DTSTAMP:20261031T120000Z");
    expect(lines).toContain("SUMMARY:Lease ends (lease.pdf)");
    expect(lines).toContain("DESCRIPTION:“The lease ends on 31 December 2027.” (page 3)");
    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(1);
  });

  it("leaves out items that have no calendar date", () => {
    const ics = keyDatesToIcs(7, "lease.pdf", [dated(), dated({ date: null, timing: "60 days before the end" })], NOW);

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("gives every event its own stable id", () => {
    const lines = unfold(keyDatesToIcs(7, "lease.pdf", [dated(), dated({ date: "2027-03-01" })], NOW));

    expect(lines.filter((line) => line.startsWith("UID:"))).toEqual([
      "UID:paperwise-7-0-2027-12-31",
      "UID:paperwise-7-1-2027-03-01",
    ]);
  });

  it("uses CRLF line endings and ends with one", () => {
    const ics = keyDatesToIcs(7, "lease.pdf", [dated()], NOW);

    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("escapes commas, semicolons and backslashes", () => {
    const lines = unfold(keyDatesToIcs(7, "a, b; c\\d.pdf", [dated()], NOW));

    expect(lines).toContain(String.raw`SUMMARY:Lease ends (a\, b\; c\\d.pdf)`);
  });

  it("folds long lines at 75 bytes, counting multi-byte characters", () => {
    const ics = keyDatesToIcs(7, "lease.pdf", [dated({ quote: "“é”".repeat(60) })], NOW);

    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(unfold(ics).join("")).toContain("“é”".repeat(60));
  });

  it("cannot be made to add lines by a quote or file name with line breaks in them", () => {
    const hostile =
      "Rent due\rEND:VEVENT\rBEGIN:VEVENT\rSUMMARY:injected\u2028ATTENDEE:mailto:x@y.z\u0007\r\nDESCRIPTION:more";
    const lines = unfold(keyDatesToIcs(1, hostile, [dated({ label: hostile, quote: hostile })], NOW));

    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(1);
    expect(lines.filter((line) => line === "END:VEVENT")).toHaveLength(1);
    expect(lines.some((line) => line.startsWith("ATTENDEE") || line.startsWith("SUMMARY:injected"))).toBe(false);
    expect(lines.some((line) => new RegExp("[\\r\\n\\u2028\\u2029\\u0007]").test(line))).toBe(false);
  });
});
