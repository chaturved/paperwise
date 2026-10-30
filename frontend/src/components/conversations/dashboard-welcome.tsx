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
}

export function DashboardWelcome({ value, onChange, onSend, isStreaming, isUploading, onAttach, textareaRef }: DashboardWelcomeProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-8">
      <div className="m-auto w-full max-w-[780px] pb-16 sm:pb-24">
        <h1 className="mb-9 text-center font-display text-[36px] font-normal tracking-[-0.0125em] text-ink sm:text-[44px]">
          What would you like to know?
        </h1>
        <InputBox value={value} onChange={onChange} onSend={() => onSend()} isStreaming={isStreaming} isUploading={isUploading} onAttach={onAttach} textareaRef={textareaRef} />
        <p className="mt-4 text-center text-[12px] text-ink/45">Ask about your documents or add files with the plus button.</p>
      </div>
    </div>
  );
}
