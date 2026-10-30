"use client";

import { useRef } from "react";
import { ArrowUp, Plus } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  isUploading: boolean;
  onAttach: (files: File[]) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function InputBox({ value, onChange, onSend, isStreaming, isUploading, onAttach, textareaRef }: Props) {
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
    <div className="flex min-h-[64px] items-end gap-3 rounded-[14px] border border-line bg-composer px-4 py-3 shadow-[0_6px_18px_rgba(0,0,0,0.06)] transition focus-within:border-ink/40">
      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} aria-label="Add documents"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink/65 transition hover:bg-ink/[0.07] hover:text-ink disabled:opacity-40">
        {isUploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" /> : <Plus size={20} />}
      </button>
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.md" className="hidden" aria-label="Choose documents"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onAttach(files);
          event.target.value = "";
        }} />
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label="Ask Paperwise"
        placeholder="Ask Paperwise"
        className="max-h-[180px] min-h-9 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-[15px] leading-6 text-ink outline-none placeholder:text-ink/45"
      />
      <button type="button" onClick={onSend} disabled={isStreaming || !value.trim()} aria-label="Send question"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink text-bg transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/35">
        {isStreaming ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" /> : <ArrowUp size={18} strokeWidth={2.2} />}
      </button>
    </div>
  );
}
