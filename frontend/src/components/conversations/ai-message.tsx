"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CITATION_HREF_PREFIX, citedSources, linkCitations } from "@/lib/citations";
import { Button } from "@/components/ui/button";
import type { Meta } from "@/types";
import { AnswerActions } from "./answer-actions";
import { CitationChip } from "./citation-chip";
import { SourcesPanel, sourceElementId } from "./sources-panel";
import { VersionSwitcher, type MessageVersions } from "./version-switcher";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  messageId?: number;
  content: string;
  meta: Meta | null;
  streaming?: boolean;
  timestamp: string;
  question?: string | null;
  failed?: boolean;
  onRewrite?: () => void;
  onCite?: (n: number) => void;
  versions?: MessageVersions;
  onSwitch?: (messageId: number) => void;
  onBranch?: (messageId: number) => void;
  onExportWord?: (messageId: number) => void;
}

export function AIMessage({
  messageId,
  content,
  meta,
  streaming,
  timestamp,
  question,
  failed,
  onRewrite,
  onCite,
  versions,
  onSwitch,
  onBranch,
  onExportWord,
}: Props) {
  const [expandedSource, setExpandedSource] = useState<number | null>(null);
  const switcher = versions && onSwitch && (
    <VersionSwitcher versions={versions} onSwitch={onSwitch} disabled={Boolean(streaming)} />
  );

  const sources = citedSources(meta);
  const messageKey = String(messageId ?? "new");

  const showSource = (n: number) => {
    setExpandedSource(n);
    onCite?.(n);
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
                <span
                  key={d}
                  className="h-[4px] w-[4px] rounded-full bg-ink/30 shimmer-dot"
                  style={{ animationDelay: `${d}ms` }}
                />
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
            <div className="mt-2 flex items-center gap-3">
              {onRewrite && (
                <Button
                  type="button"
                  onClick={onRewrite}
                  variant="link"
                  size="inline"
                  className="text-[13px] font-medium"
                >
                  Try again
                </Button>
              )}
              {switcher}
            </div>
          </div>
        ) : streaming && !content ? (
          <div className="space-y-2.5 py-1">
            {[84, 68, 76].map((w, i) => (
              <Skeleton key={i} className="h-[11px]" style={{ width: `${w}%`, animationDelay: `${i * 100}ms` }} />
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
                    <a href={href} target="_blank" rel="noreferrer">
                      {children}
                    </a>
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

        {!streaming && !failed && (
          <SourcesPanel
            messageKey={messageKey}
            sources={sources}
            expanded={expandedSource}
            onToggle={toggleSource}
            className={onCite && "xl:hidden"}
          />
        )}

        {!streaming && !failed && (
          <AnswerActions
            messageId={messageId}
            content={content}
            question={question}
            sources={sources}
            switcher={switcher}
            onRewrite={onRewrite}
            onBranch={onBranch}
            onExportWord={onExportWord}
          />
        )}
      </div>
    </div>
  );
}
