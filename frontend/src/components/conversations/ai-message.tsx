"use client";

import { useState } from "react";
import {
  Copy, ThumbsUp, ThumbsDown,
  Bot, Shield, Waves, Sparkles, Star, Zap, BookOpen, Link2,
  Check, AlertTriangle, ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { setFeedback } from "@/lib/api/analytics";
import type { Badge, Meta, Snippet, Source } from "@/types";

// ─── Private helpers ──────────────────────────────────────────────────────────

const BADGE_ICONS: Record<string, React.ReactNode> = {
  bot:       <Bot size={10} />,
  shield:    <Shield size={10} />,
  waves:     <Waves size={10} />,
  sparkles:  <Sparkles size={10} />,
  star:      <Star size={10} />,
  lightning: <Zap size={10} />,
  book:      <BookOpen size={10} />,
  link:      <Link2 size={10} />,
  check:     <Check size={10} />,
  warning:   <AlertTriangle size={10} />,
};

function SourceBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center h-[14px] min-w-[14px] px-1 rounded-[3px] text-[9px] font-bold font-mono mx-px bg-accent/15 text-accent relative top-[-1px]">
      {n}
    </span>
  );
}

function BadgeChip({ badge }: { badge: Badge }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded text-[10px] font-medium bg-ink/[0.12] text-ink/75 whitespace-nowrap">
      <span className="opacity-50">{BADGE_ICONS[badge.icon] ?? <Sparkles size={10} />}</span>
      {badge.label}
    </span>
  );
}

function SnippetCard({ snippet }: { snippet: Snippet }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen((v) => !v)} className="w-full text-left group/snip">
      <div className="flex items-center gap-1.5">
        <ChevronRight size={10} className={`text-ink/50 flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="text-[11.5px] text-ink/70 group-hover/snip:text-ink/90 truncate transition-colors">{snippet.name}</span>
      </div>
      {open && <p className="mt-1.5 pl-4 text-[11px] text-ink/50 leading-relaxed">{snippet.snippet}</p>}
    </button>
  );
}

// ─── AIMessage ────────────────────────────────────────────────────────────────

interface Props {
  messageId?: number;
  content: string;
  meta: Meta | null;
  streaming?: boolean;
  timestamp: string;
}

export function AIMessage({ messageId, content, meta, streaming, timestamp }: Props) {
  const [expandedSource, setExpandedSource] = useState<number | null>(null);
  const [feedback, setFeedbackState] = useState<"up" | "down" | null>(null);

  const handleCopy = () => { navigator.clipboard.writeText(content); toast.success("Copied!"); };

  const handleFeedback = async (value: "up" | "down") => {
    if (!messageId) return;
    const next = feedback === value ? null : value;
    setFeedbackState(next);
    if (next) {
      try { await setFeedback(messageId, next); } catch { setFeedbackState(feedback); }
    }
  };

  const hasContext = !streaming && ((meta?.snippets && meta.snippets.length > 0) || (meta?.sources && meta.sources.length > 0));
  const hasMeta    = !streaming && (meta?.description || (meta?.badges && meta.badges.length > 0));

  return (
    <div className="msg-in group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[12px] font-semibold text-ink/75">Paperwise</span>
          {streaming ? (
            <div className="flex items-center gap-[3px]">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-[4px] w-[4px] rounded-full bg-ink/25 shimmer-dot" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-ink/30 tabular-nums">
              {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {hasMeta && (
          <div className="mb-3 space-y-1.5">
            {meta?.description && <p className="text-[12.5px] leading-relaxed text-ink/55 italic">{meta.description}</p>}
            {meta?.badges && meta.badges.length > 0 && (
              <div className="flex flex-wrap gap-1">{meta.badges.map((b, i) => <BadgeChip key={i} badge={b} />)}</div>
            )}
          </div>
        )}

        {streaming && !content ? (
          <div className="space-y-2.5 py-1">
            {[84, 68, 76].map((w, i) => (
              <div key={i} className="h-[11px] rounded-[3px] shimmer-line" style={{ width: `${w}%`, animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        ) : (
          <div className="text-[14px] leading-[1.78] prose prose-invert prose-sm max-w-none text-ink/90">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                text: ({ children }) => {
                  if (!meta?.sources) return <>{children}</>;
                  const text = String(children);
                  const parts = text.split(/(\[\d+\])/g);
                  return (
                    <>
                      {parts.map((p, i) => {
                        const match = p.match(/^\[(\d+)\]$/);
                        if (match) return <SourceBadge key={i} n={Number(match[1])} />;
                        return <span key={i}>{p}</span>;
                      })}
                    </>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
            {streaming && (
              <span className="cursor-blink inline-block w-[2px] h-[13px] rounded-sm align-text-bottom ml-0.5 bg-ink/50" />
            )}
          </div>
        )}

        {hasContext && (
          <div className="mt-4 pt-3.5 border-t-system space-y-2.5">
            <span className="text-xs font-medium text-ink/60">Context used</span>
            {meta?.snippets && meta.snippets.length > 0 && (
              <div className="space-y-1.5 pl-1">{meta.snippets.map((s, i) => <SnippetCard key={i} snippet={s} />)}</div>
            )}
            {meta?.sources && meta.sources.length > 0 && (
              <div className="space-y-1.5 pl-1">
                {meta.snippets && meta.snippets.length > 0 && (
                  <div className="text-xs font-medium text-ink/60 pt-1">Documents</div>
                )}
                {meta.sources.map((src: Source, i: number) => (
                  <button key={i} onClick={() => setExpandedSource(expandedSource === i + 1 ? null : i + 1)} className="w-full text-left group/src">
                    <div className="flex items-start gap-1.5">
                      <span className="text-[9px] font-bold text-accent flex-shrink-0 mt-[2px]">[{i + 1}]</span>
                      <div className="min-w-0">
                        <span className="text-[11.5px] text-ink/70 group-hover/src:text-ink/90 transition-colors truncate block">{src.name}</span>
                        <p className={`text-[11px] text-ink/50 leading-relaxed mt-0.5 ${expandedSource === i + 1 ? "" : "line-clamp-2"}`}>{src.quote}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!streaming && (
          <div className="flex items-center gap-0.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-[5px] px-1.5 py-1 text-[11px] text-ink/50 hover:text-ink/80 hover:bg-ink/[0.07] transition-all"
            >
              <Copy size={11} /> Copy
            </button>
            <button onClick={() => handleFeedback("up")} className={`p-1 rounded-[5px] transition-all ${feedback === "up" ? "text-emerald-400" : "text-ink/50 hover:text-emerald-400"}`}>
              <ThumbsUp size={11} />
            </button>
            <button onClick={() => handleFeedback("down")} className={`p-1 rounded-[5px] transition-all ${feedback === "down" ? "text-red-400" : "text-ink/50 hover:text-red-400"}`}>
              <ThumbsDown size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
