"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getDocumentFile } from "@/lib/api/documents";
import { apiErrorMessage } from "@/lib/api-error";
import { formatBytes, formatDate } from "@/lib/format";
import type { LibraryDoc } from "@/types";
import { Button } from "@/components/ui/button";

interface Props {
  documents: LibraryDoc[];
  progress: Record<number, number>;
  selected: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: (checked: boolean) => void;
  onRetry: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const CHIP = "inline-flex h-[22px] items-center gap-1.5 rounded border border-line bg-surface px-2 text-xs";

function Status({ document, percent }: { document: LibraryDoc; percent?: number }) {
  if (document.status === "ready") return <span className={CHIP}><span className="h-1.5 w-1.5 rounded-full bg-ink" />Ready</span>;
  if (document.status === "failed") return <span className={`${CHIP} text-danger`} title={document.error_message ?? undefined}><span className="h-1.5 w-1.5 rounded-full bg-danger" />Failed</span>;
  const label = document.status === "uploading" ? (percent !== undefined ? `Uploading ${percent}%` : "Uploading") : "Reading";
  return (
    <span className={`${CHIP} text-muted`}>
      <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-line border-t-ink" />{label}
    </span>
  );
}

function RowActions({ document, onRetry, onDelete }: { document: LibraryDoc; onRetry: Props["onRetry"]; onDelete: Props["onDelete"] }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, failure: string) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      toast.error(apiErrorMessage(err, failure));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const open = () => run(async () => {
    const file = await getDocumentFile(document.id);
    window.open(file.url, "_blank", "noopener,noreferrer");
  }, "Could not open this document.");

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-3 text-sm">
        <span className="text-muted">Delete this file?</span>
        <Button type="button" onClick={() => run(() => onDelete(document.id), "Could not delete this file.")} disabled={busy} variant="link" size="inline" className="font-medium text-danger">Delete</Button>
        <Button type="button" onClick={() => setConfirming(false)} variant="link" size="inline">Cancel</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-4 text-sm">
      {document.status === "ready" && <Link href={`/dashboard?doc=${document.id}`} className="link-underline font-medium">Ask</Link>}
      {document.status === "ready" && <Button type="button" onClick={open} disabled={busy} variant="link" size="inline" className="disabled:opacity-50">Open</Button>}
      {document.status === "failed" && <Button type="button" onClick={() => run(() => onRetry(document.id), "Retry failed")} disabled={busy} variant="link" size="inline" className="font-medium disabled:opacity-50">Try again</Button>}
      <Button type="button" onClick={() => setConfirming(true)} aria-label={`Delete ${document.name}`} variant="link" size="inline" className="text-muted hover:text-danger">Delete</Button>
    </div>
  );
}

const CHECKBOX = "h-4 w-4 cursor-pointer accent-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-30";

export function LibraryTable({ documents, progress, selected, onToggle, onToggleAll, onRetry, onDelete }: Props) {
  const selectable = documents.filter((document) => document.status === "ready");
  const allSelected = selectable.length > 0 && selectable.every((document) => selected.has(document.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-ink text-xs font-medium text-muted">
          <tr>
            <th scope="col" className="w-10 px-3 py-3">
              <input type="checkbox" checked={allSelected} disabled={selectable.length === 0} onChange={(event) => onToggleAll(event.target.checked)} aria-label="Select all documents" className={CHECKBOX} />
            </th>
            <th scope="col" className="w-[40%] px-3 py-3 font-medium">Name</th>
            <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">Pages</th>
            <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">Size</th>
            <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">Added</th>
            <th scope="col" className="hidden px-3 py-3 font-medium sm:table-cell">Status</th>
            <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id} className={`border-b border-line last:border-b-0 ${selected.has(document.id) ? "bg-ink/[0.05]" : ""}`}>
              <td className="px-3 py-4">
                <input type="checkbox" checked={selected.has(document.id)} disabled={document.status !== "ready"} onChange={() => onToggle(document.id)} aria-label={`Select ${document.name}`} className={CHECKBOX} />
              </td>
              <td className="max-w-0 px-3 py-4">
                <p className="truncate text-[15px] font-medium" title={document.name}>{document.name}</p>
                <p className="mt-0.5 font-mono text-xs uppercase text-muted">
                  {document.type}
                  <span className="sm:hidden"> · <Status document={document} percent={progress[document.id]} /></span>
                </p>
                {document.status === "failed" && document.error_message && <p className="mt-1 text-[13px] text-danger">{document.error_message}</p>}
              </td>
              <td className="hidden px-3 py-4 font-mono text-[13px] text-muted md:table-cell">{document.pages ?? "—"}</td>
              <td className="hidden whitespace-nowrap px-3 py-4 font-mono text-[13px] text-muted md:table-cell">{formatBytes(document.size)}</td>
              <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-muted lg:table-cell">{formatDate(document.created_at)}</td>
              <td className="hidden whitespace-nowrap px-3 py-4 sm:table-cell"><Status document={document} percent={progress[document.id]} /></td>
              <td className="whitespace-nowrap px-3 py-4"><RowActions document={document} onRetry={onRetry} onDelete={onDelete} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
