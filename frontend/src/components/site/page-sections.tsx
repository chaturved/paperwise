import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface Crumb { label: string; href?: string }

export function PageHero({ crumbs, title, children, first = false }: { crumbs?: Crumb[]; title: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div className="page-w">
      {crumbs && (
        <nav aria-label="Breadcrumb" className="pt-12 text-base text-ink/55">
          {crumbs.map((crumb, index) => (
            <span key={crumb.label}>
              {index > 0 && " / "}
              {crumb.href ? <Link href={crumb.href} className="hover:text-ink">{crumb.label}</Link> : <span className="text-ink">{crumb.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <header className={`grid items-start gap-7 pb-12 lg:grid-cols-[1.15fr_1fr] ${first ? "pt-16 lg:pt-[72px]" : "pt-10"}`}>
        <h1 className="font-display text-[44px] font-normal leading-[1.05] tracking-[-0.0125em] sm:text-[60px] lg:text-[72px]">{title}</h1>
        <div className="[&>p]:mb-7 [&>p]:mt-3.5 [&>p]:max-w-[40ch] [&>p]:text-xl [&>p]:leading-[1.3] [&>p]:text-ink/75">{children}</div>
      </header>
    </div>
  );
}

export function Statement({ lead, rest }: { lead: string; rest: string }) {
  return (
    <p className="max-w-[640px] py-20 text-[26px] font-medium leading-[1.1] tracking-[-0.01em] md:py-[120px] md:text-[32px]">
      {lead} <span className="text-ink/50">{rest}</span>
    </p>
  );
}

export function SectionHead({ id, title, description }: { id?: string; title: string; description: string }) {
  return (
    <div id={id} className="grid gap-7 border-t border-line pt-8 md:grid-cols-2">
      <h2 className="max-w-[16ch] text-[32px] font-medium leading-[1.1] tracking-[-0.01em]">{title}</h2>
      <p className="max-w-[40ch] text-xl leading-[1.3] text-ink/75">{description}</p>
    </div>
  );
}

export function FeatureRows({ items }: { items: { title: string; text: string }[] }) {
  return (
    <div className="grid content-end">
      {items.map((item) => (
        <div key={item.title} className="max-w-[420px] border-t border-line pb-7 pt-[18px]">
          <h3 className="mb-1.5 text-[15px] font-medium">{item.title}</h3>
          <p className="text-[15.5px] leading-[1.4] text-ink/60">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

export function MetricRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="mt-14 border-t border-line">
      {rows.map((row) => (
        <div key={row.label} className="grid items-center gap-7 border-b border-line py-[22px] md:grid-cols-2">
          <span className="text-xl">{row.label}</span>
          <b className="font-display text-5xl font-normal leading-none tracking-[-0.02em] md:text-[64px]">{row.value}</b>
        </div>
      ))}
    </div>
  );
}

export function IconColumns({ items }: { items: { icon: LucideIcon; title: string; text: string }[] }) {
  return (
    <div className="mt-14 grid gap-8 md:grid-cols-3">
      {items.map(({ icon: Icon, title, text }) => (
        <div key={title}>
          <div className="mb-7 grid h-10 w-10 place-items-center rounded-md bg-card"><Icon size={18} strokeWidth={1.6} /></div>
          <h3 className="mb-2.5 text-xl font-medium tracking-[-0.01em]">{title}</h3>
          <p className="max-w-[38ch] text-[15.5px] leading-[1.4] text-ink/75">{text}</p>
        </div>
      ))}
    </div>
  );
}

export function DetailRows({ title, text, cta, rows }: { title: string; text: string; cta: { label: string; href: string }; rows: { icon: LucideIcon; label: string; detail: string }[] }) {
  return (
    <section className="paint-ink gutter bg-[#0f0e0d] py-24 text-[#faf9f7]">
      <div className="page-inner grid items-start gap-10 md:grid-cols-2">
        <div>
          <h2 className="max-w-[14ch] text-[32px] font-medium leading-[1.1] tracking-[-0.01em]">{title}</h2>
          <p className="mb-7 mt-5 max-w-[26ch] text-xl leading-[1.3] text-[#cfccc5]">{text}</p>
          <Link href={cta.href} className={buttonVariants({ variant: "outlineLight", size: "md" })}>{cta.label}</Link>
        </div>
        <div className="border-b border-white/15">
          {rows.map(({ icon: Icon, label, detail }) => (
            <details key={label} className="group border-t border-white/15">
              <summary className="grid cursor-pointer list-none grid-cols-[56px_1fr_auto] items-center gap-3 py-4 text-xl [&::-webkit-details-marker]:hidden">
                <span className="grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-[#faf9f7]"><Icon size={18} strokeWidth={1.6} /></span>
                {label}
                <span className="text-[#8f8b83] group-open:text-[#faf9f7]">Details</span>
              </summary>
              <p className="max-w-[46ch] pb-5 pl-0 text-base leading-[1.45] text-[#cfccc5] md:pl-[68px]">{detail}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PaintedCard({ title, text, cta, tone = "paint", children }: { title: string; text: string; cta: { label: string; href: string }; tone?: "paint" | "warm"; children: React.ReactNode }) {
  return (
    <div className={`paint ${tone === "warm" ? "paint-warm" : ""} flex min-h-[600px] flex-col rounded-lg px-5 pt-6 text-white md:px-8 md:pt-8`}>
      <h3 className="font-display text-[32px] font-normal tracking-[-0.01em]">{title}</h3>
      <p className="mb-5 mt-3 max-w-[34ch] text-base leading-[1.3] text-white/85">{text}</p>
      <Link href={cta.href} className={buttonVariants({ variant: "outlineLight", size: "md", className: "self-start" })}>{cta.label}</Link>
      <div className="mt-auto ml-6 rounded-tl-lg bg-surface p-5 text-ink shadow-[0_-4px_30px_rgba(0,0,0,0.18)] md:ml-14">{children}</div>
    </div>
  );
}

export function PaintedCta({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="page-w">
      <div className="paint flex min-h-[380px] flex-col justify-end gap-6 rounded-lg px-6 pb-14 pt-[72px] text-white md:px-14">
        <h2 className="max-w-[16ch] font-display text-[40px] font-normal leading-[1.05] sm:text-[52px] md:text-[58px]">{title}</h2>
        <div className="flex flex-wrap gap-3">{children}</div>
      </div>
    </div>
  );
}

export function PaintedSplit({ tone = "paint", card, rows }: { tone?: "paint" | "warm"; card: React.ReactNode; rows: { title: string; text: string }[] }) {
  return (
    <div className="mt-14 grid items-end gap-7 md:grid-cols-2">
      <div className={`paint ${tone === "warm" ? "paint-warm" : ""} flex min-h-[420px] items-end rounded-lg pl-5 pt-10 md:pl-14 md:pt-14`}>
        <div className="min-w-0 flex-1 rounded-tl-lg bg-surface p-5 text-ink shadow-[0_-4px_30px_rgba(0,0,0,0.18)]">{card}</div>
      </div>
      <FeatureRows items={rows} />
    </div>
  );
}

export function StepColumns({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <ol className="mt-12 grid gap-10 md:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.title} className="border-t border-line pt-5">
          <span className="font-mono text-sm text-accent">{String(index + 1).padStart(2, "0")}</span>
          <h3 className="mb-2 mt-3 font-display text-[28px] font-normal tracking-[-0.0125em]">{step.title}</h3>
          <p className="max-w-[34ch] text-[16px] leading-[1.45] text-ink/65">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function LinkRows({ items }: { items: { label: string; text: string; href: string }[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="group flex items-start justify-between gap-6 py-5">
            <span>
              <span className="block text-lg font-medium">{item.label}</span>
              <span className="mt-1 block max-w-[48ch] text-[15px] leading-relaxed text-ink/65">{item.text}</span>
            </span>
            <span aria-hidden className="mt-0.5 text-ink/40 transition group-hover:translate-x-0.5 group-hover:text-ink">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
