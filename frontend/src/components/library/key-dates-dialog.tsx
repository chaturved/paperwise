"use client";

import { CalendarPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useKeyDates } from "@/hooks/useKeyDates";
import { downloadBlob } from "@/lib/download";
import { formatCalendarDate } from "@/lib/format";
import { keyDatesToIcs } from "@/lib/ics";
import type { KeyDate, LibraryDoc } from "@/types";

interface Props {
  document: LibraryDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyDatesDialog({ document, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="left-1/2 top-[6vh] flex max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-[640px] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-ink/10 bg-workspace text-ink shadow-2xl"
      >
        {open && <KeyDates document={document} />}
      </DialogContent>
    </Dialog>
  );
}

function KeyDates({ document }: { document: LibraryDoc }) {
  const { dates, error, loading } = useKeyDates(document.id);
  const calendarDates = dates?.filter((found) => found.date !== null) ?? [];

  const addToCalendar = () => {
    if (!dates) return;
    const ics = keyDatesToIcs(document.id, document.name, dates);
    downloadBlob(`${document.name.replace(/\.[^.]+$/, "")}-key-dates.ics`, new Blob([ics], { type: "text/calendar" }));
  };

  return (
    <>
      <div className="flex items-start gap-3 border-b border-ink/10 px-5 py-4">
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-[15px] font-medium">Key dates</DialogTitle>
          <p className="mt-0.5 truncate font-mono text-xs text-muted">{document.name}</p>
        </div>
        <DialogClose
          aria-label="Close"
          className="rounded-md p-1.5 text-ink/50 transition hover:bg-ink/[0.07] hover:text-ink"
        >
          <X size={17} />
        </DialogClose>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {loading && <p className="text-sm text-muted">Reading the document for dates and deadlines…</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {dates?.length === 0 && <p className="text-sm text-muted">No dates or deadlines found in this document.</p>}
        {dates && dates.length > 0 && (
          <ul className="divide-y divide-line">
            {dates.map((found, index) => (
              <KeyDateRow key={`${found.label}-${index}`} found={found} />
            ))}
          </ul>
        )}
      </div>

      {dates && dates.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-5 py-3">
          <p className="max-w-[320px] text-xs text-muted">
            Check each date against the sentence it came from before you rely on it.
          </p>
          {calendarDates.length > 0 && (
            <Button type="button" size="sm" onClick={addToCalendar}>
              <CalendarPlus size={15} /> Add to calendar (.ics)
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function KeyDateRow({ found }: { found: KeyDate }) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-medium">{found.label}</span>
        <span className="font-mono text-[13px] tabular-nums">
          {found.date ? formatCalendarDate(found.date) : found.timing}
        </span>
      </div>
      <p className="mt-2 font-display text-[15px] leading-[1.45] text-ink/80">“{found.quote}”</p>
      <p className="mt-1 font-mono text-xs text-muted">
        {found.page ? `page ${found.page}` : null}
        {found.page && found.year_assumed ? " · " : null}
        {found.year_assumed ? "year taken from elsewhere in the document, check it" : null}
      </p>
    </li>
  );
}
