"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { CONTRACT_PROMPTS } from "@/lib/contract-prompts";
import { formatRelative } from "@/lib/format";
import type { Conversation, LibraryDoc } from "@/types";
import { InputBox } from "./input-box";

const RECENT_COUNT = 4;

interface DashboardWelcomeProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (question?: string) => void;
  isStreaming: boolean;
  isUploading: boolean;
  onAttach: (files: File[]) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  documents: LibraryDoc[];
  docIds: number[];
  onSelectDoc: (id: number | null) => void;
  scopeName: string | null;
  conversations: Conversation[];
}

export function DashboardWelcome({
  value,
  onChange,
  onSend,
  isStreaming,
  isUploading,
  onAttach,
  textareaRef,
  documents,
  docIds,
  onSelectDoc,
  scopeName,
  conversations,
}: DashboardWelcomeProps) {
  const hasDocuments = documents.some((document) => document.status === "ready");
  const recent = [...conversations].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, RECENT_COUNT);

  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-10">
      <div className="m-auto w-full max-w-[700px] pb-12 sm:pb-20">
        <h1 className="mb-8 text-center font-display text-[40px] font-normal leading-[1.05] tracking-[-0.0125em] text-ink">
          What would you like to know?
        </h1>
        <InputBox
          value={value}
          onChange={onChange}
          onSend={() => onSend()}
          isStreaming={isStreaming}
          isUploading={isUploading}
          onAttach={onAttach}
          textareaRef={textareaRef}
          documents={documents}
          docIds={docIds}
          onSelectDoc={onSelectDoc}
          scope={scopeName ? `Asking in ${scopeName}` : undefined}
        />

        {hasDocuments ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {CONTRACT_PROMPTS.map((prompt) => (
              <button
                key={prompt.title}
                type="button"
                onClick={() => onSend(prompt.question)}
                disabled={isStreaming}
                title={prompt.detail}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface pl-2.5 pr-3.5 text-[13px] transition hover:border-field disabled:opacity-60"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-composer text-ink/60">
                  <FileText size={12} />
                </span>
                {prompt.title}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-7 text-center text-sm text-muted">
            Ask anything, or add a PDF or Word file with the plus button to ask about it.
          </p>
        )}

        {recent.length > 0 && (
          <section className="mt-11" aria-label="Recent questions">
            <h2 className="mb-1.5 text-[13px] font-medium text-muted">Recent questions</h2>
            <ul>
              {recent.map((conversation) => (
                <li key={conversation.id} className="border-b border-line text-sm">
                  <Link
                    href={`/dashboard?conv=${conversation.id}`}
                    className="flex items-center gap-4 py-3 transition hover:text-ink/70"
                  >
                    <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                    <span className="shrink-0 text-[12.5px] text-muted">{formatRelative(conversation.updated_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-9 text-center text-[13px] text-muted">
          Answers that use your documents link to the passage they came from. Check them before you rely on them.
        </p>
      </div>
    </div>
  );
}
