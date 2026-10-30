const ANCHOR_LENGTH = 40;

/** Lowercase letters and digits only, so line breaks, hyphens and spacing never decide a match. */
const compact = (text: string): string => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * Which text items on a page make up `passage`: the indexes into `itemTexts`.
 *
 * The passage was cut from text extracted by the backend, and the page text comes from pdf.js, so the two can
 * differ in whitespace and line breaks. When the whole passage is not found, its opening and closing words are
 * used to find where it starts and ends. If neither is found the result is empty and the page is simply shown.
 */
export function matchPassage(itemTexts: string[], passage: string): Set<number> {
  const target = compact(passage);
  if (!target) return new Set();

  const spans: { start: number; end: number }[] = [];
  let page = "";
  for (const text of itemTexts) {
    const piece = compact(text);
    spans.push({ start: page.length, end: page.length + piece.length });
    page += piece;
  }

  let start = page.indexOf(target);
  let end = start + target.length;
  if (start === -1) {
    const opening = target.slice(0, ANCHOR_LENGTH);
    const closing = target.slice(-ANCHOR_LENGTH);
    start = page.indexOf(opening);
    const closingAt = start === -1 ? -1 : page.indexOf(closing, start);
    if (closingAt === -1) return new Set();
    end = closingAt + closing.length;
  }

  const matched = new Set<number>();
  spans.forEach((span, index) => {
    if (span.end > span.start && span.start < end && span.end > start) matched.add(index);
  });
  return matched;
}
