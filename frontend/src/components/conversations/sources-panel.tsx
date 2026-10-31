import { useState } from "react";
import { sourceNumber } from "@/lib/citations";
import type { Source } from "@/types";
import { CitationBadge } from "./citation-chip";
import { SourceViewer } from "./source-viewer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  messageKey: string;
  sources: Source[];
  expanded: number | null;
  onToggle: (n: number) => void;
  className?: string;
}

export const sourceElementId = (messageKey: string, n: number) => `source-${messageKey}-${n}`;

const canView = (source: Source) => source.icon === "pdf" && source.doc_id !== undefined && Boolean(source.page);

export function SourcesPanel({ messageKey, sources, expanded, onToggle, className }: Props) {
  const [viewing, setViewing] = useState<Source | null>(null);

  if (sources.length === 0) return null;

  return (
    <div className={cn("mt-6 border-t border-line pt-5", className)}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium">Sources</h3>
        <span className="font-mono text-xs text-muted">
          {sources.length} {sources.length === 1 ? "passage" : "passages"}
        </span>
      </div>
      <div className="space-y-3">
        {sources.map((source, index) => {
          const n = sourceNumber(source, index);
          const open = expanded === n;
          return (
            <div
              key={n}
              id={sourceElementId(messageKey, n)}
              className={`rounded-lg border bg-surface transition-colors ${open ? "border-ink" : "border-line"}`}
            >
              <button
                type="button"
                onClick={() => onToggle(n)}
                aria-expanded={open}
                className="block w-full px-4 pb-2 pt-3.5 text-left"
              >
                <span className="mb-2.5 flex items-center justify-between">
                  <CitationBadge n={n} />
                  {source.page ? <span className="font-mono text-xs text-muted">page {source.page}</span> : null}
                </span>
                <span
                  className={`font-display text-[17px] leading-[1.45] tracking-[-0.0125em] ${open ? "block" : "line-clamp-3"}`}
                >
                  “{source.quote}”
                </span>
              </button>
              <div className="flex items-center justify-between gap-3 px-4 pb-3.5">
                <span className="truncate font-mono text-xs text-muted">
                  {source.name}
                  {source.scanned && (
                    <span title="This page was read from an image, so check figures against the original">
                      {" "}
                      · read from a scan
                    </span>
                  )}
                </span>
                {canView(source) && (
                  <Button
                    type="button"
                    onClick={() => setViewing(source)}
                    variant="link"
                    size="inline"
                    className="shrink-0 text-[13px] font-medium"
                  >
                    Open page
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <SourceViewer source={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
