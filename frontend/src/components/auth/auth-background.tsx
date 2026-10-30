import { ChipRow, CitedRows, ComposerCard } from "@/components/site/product-preview";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AuthBackground() {
  return (
    <>
      <div className="absolute left-5 top-5 z-20 xl:left-auto xl:right-5"><ThemeToggle /></div>
      <aside aria-hidden="true" className="paint absolute inset-y-0 right-0 hidden w-[42%] flex-col justify-center gap-8 px-12 xl:flex">
        <div className="rounded-[18px] border border-white/15 bg-white/10 p-2.5">
          <div className="rounded-[10px] bg-surface p-5 text-ink">
            <ComposerCard file="report.pdf" question="Which passage mentions the six-hour figure?" />
            <ChipRow chips={["Summarize", "Find a figure"]} />
            <CitedRows title="Sources" rows={[{ text: "Teams reported spending about six hours a week searching old reports.", source: "report.pdf" }]} />
          </div>
        </div>
        <p className="max-w-[360px] font-display text-[34px] leading-[1.1] tracking-[-0.0125em] text-white">From question to source, in one place.</p>
      </aside>
    </>
  );
}
