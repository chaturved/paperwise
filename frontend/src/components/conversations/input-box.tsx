"use client";

import { ArrowUp, X } from "lucide-react";
import type { LibraryDoc } from "@/types";
import { AttachMenu } from "./attach-menu";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  isUploading: boolean;
  onAttach: (files: File[]) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  documents: LibraryDoc[];
  docIds: number[];
  onSelectDoc: (id: number | null) => void;
  placeholder?: string;
  scope?: string;
  tall?: boolean;
}

export function InputBox({ value, onChange, onSend, isStreaming, isUploading, onAttach, textareaRef, documents, docIds, onSelectDoc, placeholder, scope, tall }: Props) {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = Math.min(event.target.scrollHeight, 180) + "px";
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <div className="rounded-lg bg-composer px-4 pb-3 pt-3.5 ring-1 ring-transparent transition focus-within:ring-field">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label="Ask Paperwise"
        placeholder={placeholder ?? "Ask anything"}
        className={`max-h-[180px] w-full resize-none overflow-y-auto bg-transparent px-1 text-sm leading-[22px] text-ink outline-none placeholder:text-ink/50 ${tall ? "min-h-[60px]" : "min-h-[40px]"}`}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AttachMenu documents={documents} docIds={docIds} uploading={isUploading} onAttach={onAttach} onSelectDoc={onSelectDoc} />
          {scope && (
            <span className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded border border-line bg-surface pl-3 pr-2 text-[13px] text-ink/75">
              <span className="truncate">{scope}</span>
              <button type="button" onClick={() => onSelectDoc(null)} aria-label="Ask across all documents" className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink/55 hover:text-ink">
                <X size={13} strokeWidth={2} />
              </button>
            </span>
          )}
        </div>
        <button type="button" onClick={onSend} disabled={isStreaming || !value.trim()} aria-label="Send question"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded bg-ink px-3 text-[13px] font-medium text-bg transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/40">
          {isStreaming ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" /> : <>Ask <ArrowUp size={16} strokeWidth={2.2} /></>}
        </button>
      </div>
    </div>
  );
}
