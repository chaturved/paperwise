import { ArrowRight, FileText, MessageSquareText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const steps = [
  { icon: FileText, label: "Bring your documents" },
  { icon: MessageSquareText, label: "Ask a question" },
  { icon: ShieldCheck, label: "Check the source" },
];

export function AuthBackground() {
  return (
    <>
      <div className="absolute right-5 top-5 z-20"><ThemeToggle /></div>
      <aside className="absolute inset-y-0 left-0 hidden w-[45%] flex-col justify-between border-r border-ink/10 bg-rail p-12 xl:flex">
        <Link href="/" className="font-display text-[22px] font-medium tracking-[-0.05em] text-ink">paperwise<span className="text-accent">.</span></Link>
        <div className="max-w-[470px]">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">Your document workspace</p>
          <h1 className="font-sans text-[clamp(2.6rem,3.7vw,4.5rem)] font-medium leading-[1.08] tracking-[-0.045em] text-ink">From question to source, in one place.</h1>
          <p className="mt-6 max-w-[400px] text-[16px] leading-7 text-ink/55">Paperwise helps you find answers in your files and see the evidence behind them.</p>
          <div className="mt-10 border-t border-ink/10">
            {steps.map(({ icon: Icon, label }, index) => (
              <div key={label} className="flex items-center gap-4 border-b border-ink/10 py-4 text-[14px] text-ink/75">
                <Icon size={18} className="text-accent" strokeWidth={1.7} />
                <span className="flex-1">{label}</span>
                {index < steps.length - 1 && <ArrowRight size={15} className="text-ink/30" />}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-ink/40">Answers with a path back.</p>
      </aside>
    </>
  );
}
