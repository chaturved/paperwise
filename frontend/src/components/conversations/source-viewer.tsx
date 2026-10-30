"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { PdfPageView } from "@/components/pdf/pdf-page-view";
import { useDocumentFileUrl } from "@/hooks/useDocumentFileUrl";
import type { Source } from "@/types";

interface Props {
  source: Source | null;
  onClose: () => void;
}

export function SourceViewer({ source, onClose }: Props) {
  return (
    <Dialog.Root open={source !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/45" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[4vh] z-[101] flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-[860px] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-ink/10 bg-workspace text-ink shadow-2xl focus:outline-none"
        >
          {source && <Viewer key={`${source.doc_id}-${source.page}`} source={source} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Viewer({ source }: { source: Source }) {
  const { url, error, loading } = useDocumentFileUrl(source.doc_id ?? null);
  const [page, setPage] = useState(source.page ?? 1);
  const [pageCount, setPageCount] = useState<number | null>(null);

  return (
    <>
      <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
        <Dialog.Title className="min-w-0 flex-1 truncate text-[13px] font-medium">{source.name}</Dialog.Title>
        <div className="flex items-center gap-1 text-[12px] tabular-nums text-ink/60">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Previous page"
            className="rounded p-1 transition hover:bg-ink/[0.07] disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span>Page {page}{pageCount ? ` of ${pageCount}` : ""}</span>
          <button
            type="button"
            onClick={() => setPage((p) => (pageCount ? Math.min(pageCount, p + 1) : p + 1))}
            disabled={pageCount !== null && page >= pageCount}
            aria-label="Next page"
            className="rounded p-1 transition hover:bg-ink/[0.07] disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <Dialog.Close aria-label="Close document" className="rounded-md p-1.5 text-ink/50 transition hover:bg-ink/[0.07] hover:text-ink">
          <X size={17} />
        </Dialog.Close>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-ink/[0.04] p-3">
        {error && <p className="p-6 text-sm text-ink/60">{error}</p>}
        {loading && <p className="p-6 text-sm text-ink/50">Opening document…</p>}
        {url && <PdfPageView url={url} pageNumber={page} passage={source.quote} onLoad={setPageCount} />}
      </div>
    </>
  );
}
