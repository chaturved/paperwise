import type { KeyDate } from "@/types";

const LINE_LIMIT = 75;

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;

const escapeText = (text: string): string =>
  text
    .replace(/\r\n|\r|\n/g, "\n")
    .replace(CONTROL_CHARACTERS, "")
    .replace(/\\/g, String.raw`\\`)
    .replace(/;/g, String.raw`\;`)
    .replace(/,/g, String.raw`\,`)
    .replace(/\n/g, String.raw`\n`);

const fold = (line: string): string => {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const character of line) {
    const limit = parts.length === 0 ? LINE_LIMIT : LINE_LIMIT - 1;
    if (encoder.encode(current + character).length > limit) {
      parts.push(current);
      current = character;
    } else {
      current += character;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
};

const stamp = (when: Date): string =>
  when
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const eventLines = (documentName: string, found: KeyDate, uid: string, now: Date): string[] => {
  const page = found.page ? ` (page ${found.page})` : "";
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${(found.date ?? "").replace(/-/g, "")}`,
    `SUMMARY:${escapeText(`${found.label} (${documentName})`)}`,
    `DESCRIPTION:${escapeText(`“${found.quote}”${page}`)}`,
    "END:VEVENT",
  ];
};

export const keyDatesToIcs = (documentId: number, documentName: string, dates: KeyDate[], now = new Date()): string => {
  const events = dates
    .filter((found) => found.date !== null)
    .flatMap((found, index) => eventLines(documentName, found, `paperwise-${documentId}-${index}-${found.date}`, now));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paperwise//Key dates//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
};
