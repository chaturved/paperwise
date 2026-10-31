"use client";

import { useRef } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, FileText, Plus, Upload } from "lucide-react";
import type { LibraryDoc } from "@/types";

const ITEM_CLASS = "flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13.5px] outline-none data-[highlighted]:bg-ink/[0.06]";
const MAX_LISTED = 8;

interface Props {
  documents: LibraryDoc[];
  docIds: number[];
  uploading: boolean;
  onAttach: (files: File[]) => void;
  onSelectDoc: (id: number | null) => void;
}

export function AttachMenu({ documents, docIds, uploading, onAttach, onSelectDoc }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ready = documents.filter((document) => document.status === "ready");

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            disabled={uploading}
            aria-label="Add documents"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-ink/65 transition hover:bg-ink/[0.07] hover:text-ink data-[state=open]:bg-surface data-[state=open]:text-ink disabled:opacity-40"
          >
            {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" /> : <Plus size={16} strokeWidth={2} />}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className="z-[100] w-[280px] max-w-[calc(100vw-24px)] rounded-lg border border-line bg-surface p-1.5 text-ink shadow-[0_8px_24px_rgba(0,0,0,0.12)] outline-none dark:shadow-black/50"
          >
            <DropdownMenu.Item onSelect={() => fileInputRef.current?.click()} className={ITEM_CLASS}>
              <Upload size={16} className="text-ink/60" /> Upload files
            </DropdownMenu.Item>
            {ready.length > 0 && (
              <>
                <DropdownMenu.Separator className="my-1.5 h-px bg-line" />
                <DropdownMenu.Label className="px-2.5 pb-1 pt-1.5 text-xs text-muted">Ask about</DropdownMenu.Label>
                <DropdownMenu.Item onSelect={() => onSelectDoc(null)} className={ITEM_CLASS}>
                  <span className="w-4" /> All documents
                  {docIds.length === 0 && <Check size={15} className="ml-auto text-ink/60" />}
                </DropdownMenu.Item>
                <div className="thin-scroll max-h-[220px] overflow-y-auto">
                  {ready.slice(0, MAX_LISTED).map((document) => (
                    <DropdownMenu.Item key={document.id} onSelect={() => onSelectDoc(document.id)} className={ITEM_CLASS}>
                      <FileText size={16} className="shrink-0 text-ink/60" />
                      <span className="min-w-0 flex-1 truncate">{document.name}</span>
                      {docIds.includes(document.id) && <Check size={15} className="shrink-0 text-ink/60" />}
                    </DropdownMenu.Item>
                  ))}
                </div>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        aria-label="Choose documents"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onAttach(files);
          event.target.value = "";
        }}
      />
    </>
  );
}
