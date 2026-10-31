const ANCHOR_LENGTH = 40;

const compact = (text: string): string => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

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
