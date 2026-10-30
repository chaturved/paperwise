import { Check } from "lucide-react";
import { AuthActionLink } from "@/components/site/auth-action-link";
import { PageHero, PaintedCta, SectionHead } from "@/components/site/page-sections";
import { PricingWaitlistForm } from "@/components/site/pricing-waitlist-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

const freeFeatures = [
  "5 documents in your library",
  "20 questions every 24 hours",
  "PDF, TXT, and Markdown files",
  "10 MB per file",
  "7 days of conversation history",
];

const proFeatures = [
  "Unlimited documents and questions",
  "PDF, DOCX, TXT, and Markdown files",
  "50 MB per file",
  "Full conversation history",
];

const compareRows = [
  { label: "Documents", free: "5", pro: "Unlimited" },
  { label: "Questions", free: "20 every 24 hours", pro: "Unlimited" },
  { label: "File types", free: "PDF, TXT, Markdown", pro: "PDF, DOCX, TXT, Markdown" },
  { label: "File size", free: "10 MB", pro: "50 MB" },
  { label: "Conversation history", free: "7 days", pro: "Full" },
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mb-8 flex-1">
      {items.map((item) => (
        <li key={item} className="flex gap-3 border-t border-current/15 py-3 text-[15.5px]">
          <Check size={17} className="mt-0.5 shrink-0 opacity-70" />{item}
        </li>
      ))}
    </ul>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero crumbs={[{ label: "Company" }, { label: "Pricing" }]} title="Start small. Keep asking better questions.">
          <p>Paperwise is free to explore. When you need more room for your work, Pro is on the way.</p>
        </PageHero>

        <div className="mx-auto max-w-[1280px] px-5 md:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            <article className="flex min-h-[560px] flex-col rounded-lg border border-line bg-surface p-8">
              <span className="w-fit rounded border border-line px-2 py-0.5 text-xs font-medium text-ink/70">Available now</span>
              <h2 className="mt-7 font-display text-[40px] font-normal leading-tight">Free</h2>
              <p className="mt-1.5 text-base text-ink/65">A useful place to begin, with no payment required.</p>
              <div className="my-7 font-display text-[64px] leading-none tracking-[-0.02em]">$0<small className="ml-2 font-sans text-[15px] tracking-normal text-ink/50">forever</small></div>
              <FeatureList items={freeFeatures} />
              <AuthActionLink signedOutLabel="Get started for free" signedInLabel="Open your workspace" arrow="right" className="btn-primary btn-lg" />
            </article>

            <article className="paint paint-warm flex min-h-[560px] flex-col rounded-lg p-8 text-white">
              <span className="w-fit rounded border border-white/40 px-2 py-0.5 text-xs font-medium text-white/80">Coming soon</span>
              <h2 className="mt-7 font-display text-[40px] font-normal leading-tight">Pro</h2>
              <p className="mt-1.5 text-base text-white/80">More room for the documents and questions you work with every day.</p>
              <div className="my-7">
                <span className="font-display text-[40px] leading-none">Join the waitlist</span>
                <p className="mt-2 text-[15px] text-white/65">Pricing will be shared before launch.</p>
              </div>
              <FeatureList items={proFeatures} />
              <PricingWaitlistForm />
            </article>
          </div>

          <section className="mt-24">
            <SectionHead title="Compare plans" description="Everything that differs between Free and Pro." />
            <div className="mt-10 border-t border-line">
              <div className="hidden grid-cols-[1fr_1fr_1fr] gap-7 border-b border-line py-3 text-sm text-ink/55 md:grid"><span /><span>Free</span><span>Pro (coming soon)</span></div>
              {compareRows.map((row) => (
                <div key={row.label} className="grid gap-1 border-b border-line py-5 text-base md:grid-cols-[1fr_1fr_1fr] md:gap-7">
                  <span className="font-medium">{row.label}</span>
                  <span><span className="text-ink/50 md:hidden">Free: </span>{row.free}</span>
                  <span><span className="text-ink/50 md:hidden">Pro: </span>{row.pro}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="pt-24">
          <PaintedCta title="Ready to see what your files know?">
            <AuthActionLink signedOutLabel="Get started" signedInLabel="Open your workspace" arrow="right" className="btn-light" />
          </PaintedCta>
        </div>
      </main>
      <div className="h-24" />
      <SiteFooter />
    </div>
  );
}
