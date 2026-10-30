import { sourceNumber } from "@/lib/citations";
import type { Source } from "@/types";

interface Props {
  messageKey: string;
  sources: Source[];
  expanded: number | null;
  onToggle: (n: number) => void;
}

export const sourceElementId = (messageKey: string, n: number) => `source-${messageKey}-${n}`;

export function SourcesPanel({ messageKey, sources, expanded, onToggle }: Props) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-4 space-y-2.5 border-t-system pt-3.5">
      <span className="text-xs font-medium text-ink/60">Sources</span>
      <div className="space-y-1.5 pl-1">
        {sources.map((source, index) => {
          const n = sourceNumber(source, index);
          const open = expanded === n;
          return (
            <button
              key={n}
              id={sourceElementId(messageKey, n)}
              type="button"
              onClick={() => onToggle(n)}
              aria-expanded={open}
              className="group/src w-full text-left"
            >
              <div className="flex items-start gap-1.5">
                <span className="mt-[2px] flex-shrink-0 font-mono text-[9px] font-bold text-accent">[{n}]</span>
                <div className="min-w-0">
                  <span className="block truncate text-[11.5px] text-ink/70 transition-colors group-hover/src:text-ink/90">
                    {source.name}
                    {source.page ? <span className="ml-1.5 font-mono text-[10.5px] text-ink/45">p. {source.page}</span> : null}
                  </span>
                  <p className={`mt-0.5 text-[11px] leading-relaxed text-ink/50 ${open ? "" : "line-clamp-2"}`}>{source.quote}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
