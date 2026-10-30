"use client";

import { InputBox } from "./input-box";

interface DashboardWelcomeProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (question?: string) => void;
  isStreaming: boolean;
  isUploading: boolean;
  onAttach: (files: File[]) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  documentCount: number | null;
}

const STARTERS = [
  "Summarize the key points",
  "What are the payment terms and deadlines?",
  "List every date and amount mentioned",
];

function scopeLabel(count: number | null): string | undefined {
  if (count === null) return undefined;
  if (count === 0) return "No documents yet";
  return `Asking across ${count} document${count === 1 ? "" : "s"}`;
}

export function DashboardWelcome({ value, onChange, onSend, isStreaming, isUploading, onAttach, textareaRef, documentCount }: DashboardWelcomeProps) {
  const hasDocuments = (documentCount ?? 0) > 0;

  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-10">
      <div className="m-auto w-full max-w-[760px] pb-12 sm:pb-20">
        <h1 className="mb-8 text-center font-display text-[40px] font-normal leading-[1.05] tracking-[-0.0125em] text-ink sm:text-5xl">
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
          scope={scopeLabel(documentCount)}
        />

        {hasDocuments ? (
          <>
            <p className="mb-3 mt-7 text-[13px] text-muted">Try asking</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => onSend(starter)}
                  disabled={isStreaming}
                  className="rounded-lg border border-line bg-surface px-[18px] py-4 text-left text-[15px] leading-snug transition hover:border-field disabled:opacity-60"
                >
                  {starter}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-7 text-center text-sm text-muted">Add a PDF or Word file with the plus button, then ask about it.</p>
        )}

        <p className="mt-7 text-center text-[13px] text-muted">Every answer links to the passage it came from. Check it before you rely on it.</p>
      </div>
    </div>
  );
}
