"use client";

import { useRef } from "react";
import { Check, FileText, Plus, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LibraryDoc } from "@/types";

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
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={uploading}
          aria-label="Add documents"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-ink/65 transition hover:bg-ink/[0.07] hover:text-ink data-[popup-open]:bg-surface data-[popup-open]:text-ink disabled:opacity-40"
        >
          {uploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" />
          ) : (
            <Plus size={16} strokeWidth={2} />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[280px]">
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} className="text-ink/60" /> Upload files
          </DropdownMenuItem>
          {ready.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Ask about</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onSelectDoc(null)}>
                  <span className="w-4" /> All documents
                  {docIds.length === 0 && <Check size={15} className="ml-auto text-ink/60" />}
                </DropdownMenuItem>
                <div className="thin-scroll max-h-[220px] overflow-y-auto">
                  {ready.slice(0, MAX_LISTED).map((document) => (
                    <DropdownMenuItem key={document.id} onClick={() => onSelectDoc(document.id)}>
                      <FileText size={16} className="shrink-0 text-ink/60" />
                      <span className="min-w-0 flex-1 truncate">{document.name}</span>
                      {docIds.includes(document.id) && <Check size={15} className="shrink-0 text-ink/60" />}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
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
