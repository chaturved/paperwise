"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useAccountUsage } from "@/hooks/useAccountUsage";
import { useAttachDocuments } from "@/hooks/useAttachDocuments";
import { useLibrary } from "@/hooks/useLibrary";
import { AddDocumentButton } from "@/components/conversations/add-document-button";
import type { DocumentStatus } from "@/types";
import { LibraryTable } from "./library-table";

type StatusFilter = "all" | DocumentStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "ready", label: "Ready" },
  { value: "processing", label: "Reading" },
  { value: "failed", label: "Failed" },
];

export function LibraryContent() {
  const { documents, loaded, refresh, remove, retry } = useLibrary();
  const { attach, uploading, progress } = useAttachDocuments(refresh);
  const usage = useAccountUsage(documents.length);
  const limit = usage?.documents.limit ?? null;
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((document) => {
      if (needle && !document.name.toLowerCase().includes(needle)) return false;
      if (status === "all") return true;
      if (status === "processing") return document.status === "processing" || document.status === "uploading";
      return document.status === status;
    });
  }, [documents, query, status]);
  useEffect(() => {
    const ready = new Set(documents.filter((document) => document.status === "ready").map((document) => document.id));
    setSelected((current) => {
      const kept = [...current].filter((id) => ready.has(id));
      return kept.length === current.size ? current : new Set(kept);
    });
  }, [documents]);

  const toggle = (id: number) => setSelected((current) => {
    const next = new Set(current);
    if (!next.delete(id)) next.add(id);
    return next;
  });
  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(visible.filter((document) => document.status === "ready").map((document) => document.id)) : new Set());
  const askAcrossSelected = () => router.push(`/dashboard?docs=${[...selected].join(",")}`);
  const pageCount = documents.reduce((total, document) => total + (document.pages ?? 0), 0);

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-workspace text-ink">
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line px-5 sm:px-10">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="text-[15px] font-medium">Library</h1>
          {loaded && documents.length > 0 && <span className="truncate text-[13px] text-muted">{documents.length} {documents.length === 1 ? "document" : "documents"} · {pageCount} pages</span>}
        </div>
        <AddDocumentButton onAttach={attach} uploading={uploading} />
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto w-full max-w-[1040px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.0125em]">Your documents</h2>
              <p className="mt-2 max-w-[520px] text-base text-muted">Each file is read once, then used to answer your questions. Choose Ask to question a single file on its own.</p>
            </div>
            {usage && limit !== null && <p className="font-mono text-[13px] text-muted">{usage.documents.used} of {limit} documents</p>}
          </div>

          {!loaded ? (
            <p className="text-sm text-muted">Loading your documents…</p>
          ) : documents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-field px-6 py-16 text-center">
              <p className="mb-2 text-lg font-medium">No documents yet</p>
              <p className="mx-auto max-w-[380px] text-sm text-muted">Add a PDF or Word file. Contracts, leases and policies work well. Files up to 10 MB are supported.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <label className="flex h-9 w-full max-w-[320px] items-center gap-2 rounded bg-composer px-3 text-muted">
                  <Search size={15} aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search documents"
                    aria-label="Search documents"
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink/50"
                  />
                </label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as StatusFilter)}
                  aria-label="Filter by status"
                  className="h-9 rounded border border-line bg-transparent px-3 text-[13px] text-ink outline-none transition hover:border-field focus-visible:border-ink"
                >
                  {STATUS_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
                </select>
              </div>
              {visible.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">No documents match your search.</p>
              ) : (
                <LibraryTable
                  documents={visible}
                  progress={progress}
                  selected={selected}
                  onToggle={toggle}
                  onToggleAll={toggleAll}
                  onRetry={async (id) => { await retry(id); }}
                  onDelete={async (id) => { await remove(id); }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {selected.size > 0 && (
        <div role="region" aria-label="Selected documents" className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-lg bg-ink py-2 pl-4 pr-2 text-[13px] text-bg shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          <span>{selected.size} selected</span>
          <button type="button" onClick={askAcrossSelected} className="h-8 rounded bg-bg px-3 font-medium text-ink transition hover:opacity-85">Ask across selected</button>
          <button type="button" onClick={() => setSelected(new Set())} className="px-2 opacity-75 transition hover:opacity-100">Clear</button>
        </div>
      )}
    </main>
  );
}
