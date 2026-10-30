"use client";

import { useEffect, useRef } from "react";
import { FileText, RotateCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { useLibrary } from "@/hooks/useLibrary";
import { apiErrorMessage } from "@/lib/api-error";
import type { LibraryDoc } from "@/types";

interface Props {
  refreshKey?: number;
}

function DocumentStatusBadge({ document, percent }: { document: LibraryDoc; percent?: number }) {
  if (document.status === "ready") return null;
  if (document.status === "failed") {
    return <span className="shrink-0 text-[11px] text-danger" title={document.error_message ?? undefined}>Failed</span>;
  }
  const label = document.status === "uploading" && percent !== undefined ? `${percent}%` : document.status === "uploading" ? "Uploading" : "Processing";
  return <span className="shrink-0 text-[11px] tabular-nums text-ink/55">{label}</span>;
}

export function LibrarySection({ refreshKey }: Props) {
  const { documents, refresh, remove, retry } = useLibrary();
  const { upload, uploading, progress } = useDocumentUpload(refresh);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      const { uploadedIds, errors } = await upload(files);
      if (uploadedIds.length) toast.success(`Uploaded ${uploadedIds.length} file(s). We're preparing them now.`);
      errors.forEach((e) => toast.error(`${e.file}: ${e.error}`));
    } catch (err) {
      toast.error(apiErrorMessage(err, "Upload failed"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleRetry = async (id: number) => {
    try {
      await retry(id);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Retry failed"));
    }
  };

  return (
    <section aria-label="Your documents" className="shrink-0 px-3 pb-1 pt-3">
      <div className="mb-2 px-3 text-xs font-medium text-muted">Your files</div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex h-9 w-full items-center gap-2 rounded px-3 text-[13px] font-medium text-ink transition hover:bg-ink/[0.06] disabled:opacity-50"
      >
        {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" /> : <Upload size={15} />}
        {uploading ? "Uploading…" : "Upload a document"}
      </button>
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.docx" className="hidden" onChange={handleUpload} />
      <div className="thin-scroll max-h-32 overflow-y-auto">
        {documents.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted">No files yet</p>
        ) : (
          documents.map((document) => (
            <div key={document.id} className="group flex h-9 items-center gap-2 rounded px-3 hover:bg-ink/[0.05]">
              <FileText size={14} className="shrink-0 text-ink/45" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink/75" title={document.name}>{document.name}</span>
              <DocumentStatusBadge document={document} percent={progress[document.id]} />
              {document.status === "failed" && (
                <button type="button" onClick={() => handleRetry(document.id)} aria-label={`Retry ${document.name}`} className="rounded p-1 text-ink/50 hover:text-ink">
                  <RotateCw size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(document.id)}
                aria-label={`Delete ${document.name}`}
                className="rounded p-1 text-ink/45 hover:text-danger focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
