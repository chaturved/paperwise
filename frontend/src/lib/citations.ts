import type { Meta, Source } from "@/types";

export const CITATION_HREF_PREFIX = "#cite-";

export const sourceNumber = (source: Source, index: number): number => source.n ?? index + 1;

export function citedSources(meta: Meta | null): Source[] {
  if (!meta?.sources) return [];
  const cited = meta.cited;
  return cited ? meta.sources.filter((s, i) => cited.includes(sourceNumber(s, i))) : meta.sources;
}

export function linkCitations(content: string, sources: Source[]): string {
  const known = new Set(sources.map(sourceNumber));
  return content.replace(/\[(\d+)\](?!\()/g, (_marker, n: string) =>
    known.has(Number(n)) ? `[${n}](${CITATION_HREF_PREFIX}${n})` : "",
  );
}
