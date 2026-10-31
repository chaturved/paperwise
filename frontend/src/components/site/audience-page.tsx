import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { HeroCtas, PaintedCtaButtons } from "@/components/site/cta-buttons";
import { PageHero, PaintedCta, PaintedSplit, SectionHead, Statement } from "@/components/site/page-sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export interface AudienceContent {
  crumb: string;
  title: string;
  intro: string;
  statement: { lead: string; rest: string };
  split: { title: string; description: string; tone: "paint" | "warm"; card: ReactNode; rows: { title: string; text: string }[] };
  questions: string[];
  cta: string;
}

export const audienceMetadata = (title: string, description: string): Metadata => ({ title: `${title} — Paperwise`, description });

export function AudiencePage({ content }: { content: AudienceContent }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero crumbs={[{ label: "Solutions", href: "/use-cases" }, { label: content.crumb }]} title={content.title}>
          <p>{content.intro}</p>
          <HeroCtas />
        </PageHero>

        <div className="page-w">
          <Statement lead={content.statement.lead} rest={content.statement.rest} />

          <section className="pb-20">
            <SectionHead title={content.split.title} description={content.split.description} />
            <PaintedSplit tone={content.split.tone} card={content.split.card} rows={content.split.rows} />
          </section>

          <section className="pb-20">
            <SectionHead title="Questions to start with" description="The kind of thing people ask first. Ask it your way." />
            <ul className="mt-10 grid gap-3 sm:grid-cols-2">
              {content.questions.map((question) => (
                <li key={question} className="rounded-lg border border-line bg-surface px-5 py-4 text-[16px] leading-snug">{question}</li>
              ))}
            </ul>
          </section>

          <section className="pb-24">
            <p className="max-w-[60ch] text-sm leading-relaxed text-ink/55">
              Free to start: <Link href="/pricing" className="underline underline-offset-4">see what each plan includes</Link>. Paperwise helps you read faster.
              It is not a lawyer or other professional, so for a decision that matters, check the source.{" "}
              <Link href="/legal/ai" className="underline underline-offset-4">How AI is used</Link>.
            </p>
          </section>
        </div>

        <PaintedCta title={content.cta}>
          <PaintedCtaButtons />
        </PaintedCta>
      </main>
      <div className="h-24" />
      <SiteFooter />
    </div>
  );
}
