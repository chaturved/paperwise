import { ArrowRight, FileText, Upload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface ComposerProps { file: string; question: string }

export function ComposerCard({ file, question }: ComposerProps) {
  return (
    <div className="mx-auto max-w-[540px] rounded-[14px] bg-composer p-3 shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
      <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-line bg-surface px-2 py-0.5 text-xs text-ink/75"><FileText size={12} /> {file}</span>
      <p className="mx-1 mb-3.5 mt-2.5 text-[15px] leading-[1.45]">{question}</p>
      <div className="flex items-center gap-4 px-1 text-[13px] text-ink/75">
        <span>Files</span><span>Sources</span><span>Improve</span>
        <span className="ml-auto grid h-[30px] w-[34px] place-items-center rounded-md bg-ink text-bg"><ArrowRight size={14} /></span>
      </div>
    </div>
  );
}

export function ChipRow({ chips }: { chips: string[] }) {
  return (
    <div className="my-3.5 flex flex-wrap justify-center gap-2">
      {chips.map((chip) => <span key={chip} className="rounded-md border border-line bg-surface px-2.5 py-[5px] text-[12.5px] text-ink/75">{chip}</span>)}
    </div>
  );
}

export function CitedRows({ title, rows }: { title: string; rows: { text: string; source: string }[] }) {
  return (
    <div className="mx-auto max-w-[760px] rounded-[10px] border border-line bg-surface p-5">
      <h4 className="mb-3 font-display text-[22px] font-normal">{title}</h4>
      {rows.map((row) => (
        <div key={row.text} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t border-line py-2.5 text-[13.5px] text-ink/80">
          <span>{row.text}</span>
          <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-line bg-bg px-2 py-0.5 text-xs"><i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Source</span>
          <span className="hidden font-mono text-[11.5px] text-ink/50 sm:inline">{row.source}</span>
        </div>
      ))}
    </div>
  );
}

export function UploadCard() {
  return (
    <div className="px-4 py-7 text-center">
      <Upload size={26} className="mx-auto text-ink/45" strokeWidth={1.5} />
      <h4 className="mb-3.5 mt-2.5 text-[17px] font-medium">Drag and drop your files</h4>
      <span className={buttonVariants({ variant: "primary", size: "default", className: "min-h-9 px-3.5" })}><Upload size={14} /> Upload</span>
      <small className="mt-3 block text-ink/50">PDF, DOCX, TXT and Markdown.</small>
    </div>
  );
}

export function StageWindow({ title, meta, children, label }: { title: string; meta: string; children: React.ReactNode; label: string }) {
  return (
    <div aria-label={label} className="paint rounded-lg px-3 pt-6 sm:px-10 sm:pt-12 lg:px-24 lg:pt-16">
      <div className="bezel">
        <div className="overflow-hidden rounded-t-[10px] bg-surface text-ink">
          <div className="flex items-center gap-3 px-4 py-3 text-[13px] text-ink/55"><b className="font-medium text-ink">{title}</b> {meta}</div>
          <div className="px-4 pb-7 pt-2 sm:px-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ProductPreview() {
  return (
    <StageWindow label="Illustrative Paperwise document chat preview" title="Q3 research report" meta="PDF">
      <ComposerCard file="Q3-research-report.pdf" question="How much time do teams lose searching for information, and which passage says so?" />
      <ChipRow chips={["Summarize this file", "Find a figure", "View all"]} />
      <CitedRows title="About six hours a week" rows={[
        { text: "Teams reported spending about six hours a week searching old reports.", source: "Q3-research-report.pdf" },
        { text: "Seventy percent said they had redone work that already existed.", source: "Q3-research-report.pdf" },
      ]} />
    </StageWindow>
  );
}

const ILLUSTRATIVE = <p className="mt-3 text-[11px] text-ink/40">Illustrative example</p>;

export function AnswerPreview() {
  const chip = "mx-px inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-[3px] bg-accent/15 px-1 font-mono text-[9px] font-bold text-accent";
  return (
    <div className="mx-auto max-w-[560px] rounded-[10px] border border-line bg-surface p-5">
      <p className="mb-3 text-[12.5px] italic text-ink/50">Payment terms</p>
      <p className="text-[14.5px] leading-[1.7]">
        Payment is due within 30 days of the invoice date <span className={chip}>1</span>. A late fee of 2% per month applies after that <span className={chip}>2</span>.
      </p>
      <div className="mt-4 space-y-2 border-t border-line pt-3.5 text-[12px] text-ink/60">
        <p><span className="mr-1.5 font-mono text-[9px] font-bold text-accent">[1]</span>client-agreement.pdf <span className="ml-1 font-mono text-[11px] text-ink/45">p. 4</span></p>
        <p><span className="mr-1.5 font-mono text-[9px] font-bold text-accent">[2]</span>client-agreement.pdf <span className="ml-1 font-mono text-[11px] text-ink/45">p. 5</span></p>
      </div>
      {ILLUSTRATIVE}
    </div>
  );
}

export function PdfPagePreview() {
  return (
    <div className="mx-auto max-w-[560px] overflow-hidden rounded-[10px] border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[12.5px] text-ink/60">
        <b className="font-medium text-ink">client-agreement.pdf</b>
        <span className="font-mono">Page 4 of 11</span>
      </div>
      <div className="space-y-3 bg-white px-8 py-7 text-[13px] leading-6 text-neutral-800">
        <p className="text-[15px] font-medium">4. Payment</p>
        <p>Invoices are issued at the end of each calendar month.</p>
        <p><mark className="rounded-[2px] bg-accent/30 px-0.5 text-inherit">Payment is due within 30 days of the invoice date.</mark></p>
        <p>All amounts are stated in US dollars.</p>
      </div>
      <div className="px-4 pb-3 pt-1">{ILLUSTRATIVE}</div>
    </div>
  );
}

export function NotFoundPreview() {
  return (
    <div className="mx-auto max-w-[560px] space-y-3 rounded-[10px] border border-line bg-surface p-5">
      <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-ink/[0.07] px-3.5 py-2 text-[14px]">What is the notice period for the office lease?</p>
      <p className="text-[14.5px] leading-[1.7]">I couldn&apos;t find that in your documents.</p>
      {ILLUSTRATIVE}
    </div>
  );
}
