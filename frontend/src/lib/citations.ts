import type { Meta, Source } from "@/types";

export const CITATION_HREF_PREFIX = "#cite-";

/** Sources saved before they were numbered fall back to their position in the list. */
export const sourceNumber = (source: Source, index: number): number => source.n ?? index + 1;

/** The sources an answer actually relied on. While it streams, `cited` is not known yet, so all are listed. */
export function citedSources(meta: Meta | null): Source[] {
  if (!meta?.sources) return [];
  const cited = meta.cited;
  return cited ? meta.sources.filter((s, i) => cited.includes(sourceNumber(s, i))) : meta.sources;
}

/**
 * Turns verified `[n]` markers into links the answer renders as citation chips. A marker with no matching
 * source is removed, so a made-up number never shows.
 */
export function linkCitations(content: string, sources: Source[]): string {
  const known = new Set(sources.map(sourceNumber));
  return content.replace(/\[(\d+)\](?!\()/g, (_marker, n: string) =>
    known.has(Number(n)) ? `[${n}](${CITATION_HREF_PREFIX}${n})` : "",
  );
}
