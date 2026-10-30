"use client";

import { useState } from "react";
import {
  Bot, Shield, Waves, Sparkles, Star, Zap, BookOpen, Link2,
  Check, AlertTriangle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { setFeedback } from "@/lib/api/analytics";
import { CITATION_HREF_PREFIX, citedSources, linkCitations } from "@/lib/citations";
import type { Badge, Meta } from "@/types";
import { CitationChip } from "./citation-chip";
import { SourcesPanel, sourceElementId } from "./sources-panel";

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

function BadgeChip({ badge }: { badge: Badge }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-line px-2 py-[2px] text-[11px] font-medium text-ink/70">
      <span className="opacity-60">{BADGE_ICONS[badge.icon] ?? <Sparkles size={10} />}</span>
      {badge.label}
    </span>
  );
}

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

  const sources = citedSources(meta);
  const messageKey = String(messageId ?? "new");

  const showSource = (n: number) => {
    setExpandedSource(n);
    document.getElementById(sourceElementId(messageKey, n))?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  const toggleSource = (n: number) => setExpandedSource((current) => (current === n ? null : n));

  const hasMeta    = !streaming && !meta?.general && (meta?.description || (meta?.badges && meta.badges.length > 0));

  return (
    <div className="msg-in group">
      <div className="flex-1 min-w-0">
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="font-mono text-xs text-muted">{meta?.general ? "Paperwise · general answer" : "Paperwise"}</span>
          {streaming ? (
            <div className="flex items-center gap-[3px]">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-[4px] w-[4px] rounded-full bg-ink/30 shimmer-dot" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          ) : (
            <span className="font-mono text-xs tabular-nums text-ink/45">
              {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {hasMeta && (
          <div className="mb-3 space-y-1.5">
            {meta?.description && <p className="text-sm leading-relaxed text-muted">{meta.description}</p>}
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
          <div className="prose max-w-none text-base leading-[1.7] text-ink/90">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) =>
                  href?.startsWith(CITATION_HREF_PREFIX) ? (
                    <CitationChip n={Number(href.slice(CITATION_HREF_PREFIX.length))} onSelect={showSource} />
                  ) : (
                    <a href={href} target="_blank" rel="noreferrer">{children}</a>
                  ),
              }}
            >
              {linkCitations(content, sources)}
            </ReactMarkdown>
            {streaming && (
              <span className="cursor-blink ml-0.5 inline-block h-[15px] w-[2px] rounded-sm bg-ink/60 align-text-bottom" />
            )}
          </div>
        )}

        {!streaming && <SourcesPanel messageKey={messageKey} sources={sources} expanded={expandedSource} onToggle={toggleSource} />}

        {!streaming && (
          <div className="mt-4 flex items-center gap-4 text-[13px] text-muted">
            <button type="button" onClick={handleCopy} className="link-underline hover:text-ink">Copy</button>
            <button type="button" onClick={() => handleFeedback("up")} aria-pressed={feedback === "up"} className={`link-underline hover:text-ink ${feedback === "up" ? "font-medium text-ink" : ""}`}>Helpful</button>
            <button type="button" onClick={() => handleFeedback("down")} aria-pressed={feedback === "down"} className={`link-underline hover:text-ink ${feedback === "down" ? "font-medium text-ink" : ""}`}>Not helpful</button>
          </div>
        )}
      </div>
    </div>
  );
}
