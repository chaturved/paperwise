"use client";

import { useAccountUsage } from "@/hooks/useAccountUsage";
import { useAttachDocuments } from "@/hooks/useAttachDocuments";
import { useLibrary } from "@/hooks/useLibrary";
import { AddDocumentButton } from "@/components/conversations/add-document-button";
import { LibraryTable } from "./library-table";

export function LibraryContent() {
  const { documents, loaded, refresh, remove, retry } = useLibrary();
  const { attach, uploading, progress } = useAttachDocuments(refresh);
  const usage = useAccountUsage(documents.length);
  const limit = usage?.documents.limit ?? null;

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-workspace text-ink">
      <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-5 sm:px-10">
        <h1 className="text-[15px] font-medium">Library</h1>
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
            <LibraryTable
              documents={documents}
              progress={progress}
              onRetry={async (id) => { await retry(id); }}
              onDelete={async (id) => { await remove(id); }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
