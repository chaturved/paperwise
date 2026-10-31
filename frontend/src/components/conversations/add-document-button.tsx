"use client";

import { useRef } from "react";

interface Props {
  onAttach: (files: File[]) => void;
  uploading: boolean;
}

export function AddDocumentButton({ onAttach, uploading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex h-8 items-center rounded border border-field px-3 text-[13px] font-medium transition hover:border-ink disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Add a document"}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        aria-label="Add a document"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onAttach(files);
          event.target.value = "";
        }}
      />
    </>
  );
}
