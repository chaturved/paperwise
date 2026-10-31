"use client";

import { useState } from "react";
import { Copy, Download, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { setFeedback } from "@/lib/api/analytics";
import { CITATION_HREF_PREFIX, citedSources, linkCitations } from "@/lib/citations";
import { answerToMarkdown, downloadText } from "@/lib/export-answer";
import { Button } from "@/components/ui/button";
import type { Meta } from "@/types";
import { CitationChip } from "./citation-chip";
import { SourcesPanel, sourceElementId } from "./sources-panel";

interface Props {
  messageId?: number;
  content: string;
  meta: Meta | null;
  streaming?: boolean;
  timestamp: string;
  question?: string | null;
  failed?: boolean;
  onRewrite?: () => void;
}

export function AIMessage({ messageId, content, meta, streaming, timestamp, question, failed, onRewrite }: Props) {
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
  const handleExport = () => downloadText("paperwise-answer.md", answerToMarkdown(question ?? null, content, sources));
  const messageKey = String(messageId ?? "new");

  const showSource = (n: number) => {
    setExpandedSource(n);
    document.getElementById(sourceElementId(messageKey, n))?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  const toggleSource = (n: number) => setExpandedSource((current) => (current === n ? null : n));


  return (
    <div className="msg-in group">
      <div className="flex-1 min-w-0">
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="font-mono text-xs text-muted">Paperwise</span>
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

        {failed ? (
          <div role="alert">
            <p className="text-base leading-[1.7] text-ink/90">{content}</p>
            {onRewrite && <Button type="button" onClick={onRewrite} variant="link" size="inline" className="mt-2 text-[13px] font-medium">Try again</Button>}
          </div>
        ) : streaming && !content ? (
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

        {!streaming && !failed && <SourcesPanel messageKey={messageKey} sources={sources} expanded={expandedSource} onToggle={toggleSource} />}

        {!streaming && !failed && (
          <div className="mt-3 flex items-center gap-1">
            <Button variant="ghost" size="xs" onClick={handleCopy}><Copy size={14} /> Copy</Button>
            <Button variant="ghost" size="xs" onClick={handleExport}><Download size={14} /> Export</Button>
            {onRewrite && <Button variant="ghost" size="xs" onClick={onRewrite}><RefreshCw size={14} /> Rewrite</Button>}
            <span className="flex-1" />
            <Button variant="ghost" size="xs" onClick={() => handleFeedback("up")} aria-pressed={feedback === "up"} aria-label="Helpful" className={feedback === "up" ? "text-ink" : ""}><ThumbsUp size={14} fill={feedback === "up" ? "currentColor" : "none"} /></Button>
            <Button variant="ghost" size="xs" onClick={() => handleFeedback("down")} aria-pressed={feedback === "down"} aria-label="Not helpful" className={feedback === "down" ? "text-ink" : ""}><ThumbsDown size={14} fill={feedback === "down" ? "currentColor" : "none"} /></Button>
          </div>
        )}
      </div>
    </div>
  );
}
