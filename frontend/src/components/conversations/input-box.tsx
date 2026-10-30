"use client";

import { useRef } from "react";
import { ArrowUp, Plus, X } from "lucide-react";
import type { AskMode } from "@/types";

const MODES: { value: AskMode; label: string }[] = [
  { value: "documents", label: "Documents" },
  { value: "general", label: "General" },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  isUploading: boolean;
  onAttach: (files: File[]) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  mode: AskMode;
  onModeChange: (mode: AskMode) => void;
  placeholder?: string;
  scope?: string;
  onClearScope?: () => void;
}

export function InputBox({ value, onChange, onSend, isStreaming, isUploading, onAttach, textareaRef, mode, onModeChange, placeholder, scope, onClearScope }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    <div className="rounded-lg border border-field bg-surface px-4 pb-3 pt-3.5 transition focus-within:border-ink">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label="Ask Paperwise"
        placeholder={placeholder ?? (mode === "general" ? "Ask anything" : "Ask a question about your documents")}
        className="max-h-[180px] min-h-[44px] w-full resize-none overflow-y-auto bg-transparent px-1 text-base leading-6 text-ink outline-none placeholder:text-ink/45"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} aria-label="Add documents"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line text-ink/70 transition hover:border-field hover:text-ink disabled:opacity-40">
            {isUploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" /> : <Plus size={16} strokeWidth={2} />}
          </button>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.md" className="hidden" aria-label="Choose documents"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length) onAttach(files);
              event.target.value = "";
            }} />
          <div role="radiogroup" aria-label="What to ask about" className="inline-flex h-8 shrink-0 overflow-hidden rounded border border-line text-[13px]">
            {MODES.map(({ value: optionValue, label }, index) => (
              <button
                key={optionValue}
                type="button"
                role="radio"
                aria-checked={mode === optionValue}
                onClick={() => onModeChange(optionValue)}
                className={`px-3 transition ${index > 0 ? "border-l border-line" : ""} ${mode === optionValue ? "bg-ink text-bg" : "text-ink/70 hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "documents" && scope && (
            <span className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded border border-line pl-3 pr-2 text-[13px] text-ink/75">
              <span className="truncate">{scope}</span>
              {onClearScope && (
                <button type="button" onClick={onClearScope} aria-label="Ask across all documents" className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink/55 hover:text-ink">
                  <X size={13} strokeWidth={2} />
                </button>
              )}
            </span>
          )}
        </div>
        <button type="button" onClick={onSend} disabled={isStreaming || !value.trim()} aria-label="Send question"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink text-bg transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/40">
          {isStreaming ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" /> : <ArrowUp size={18} strokeWidth={2.2} />}
        </button>
      </div>
    </div>
  );
}
