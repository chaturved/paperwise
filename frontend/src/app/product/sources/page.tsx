import type { Metadata } from "next";
import { HeroCtas, PaintedCtaButtons } from "@/components/site/cta-buttons";
import { PageHero, PaintedCta, PaintedSplit, SectionHead, Statement } from "@/components/site/page-sections";
import {
  AnswerPreview,
  CitedRows,
  NotFoundPreview,
  PdfPagePreview,
  StageWindow,
} from "@/components/site/product-preview";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = {
  title: "Sources — Paperwise",
  description:
    "Numbered citations, the cited page opened with the passage highlighted, and an honest answer when it is not there.",
};

export default function SourcesPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero
          crumbs={[{ label: "Product", href: "/product" }, { label: "Sources" }]}
          title="Every answer shows where it came from"
        >
          <p>Read the original words behind an answer instead of taking it on faith.</p>
          <HeroCtas />
        </PageHero>

        <div className="page-w">
          <StageWindow label="Illustrative Paperwise answer with citations" title="Client agreement" meta="PDF">
            <AnswerPreview />
          </StageWindow>

          <Statement
            lead="Check it before you rely on it."
            rest="Paperwise gives the AI numbered passages from your document and asks it to cite them. You see the same passages, so you can read what the answer is built on."
          />

          <section className="pb-20">
            <SectionHead
              title="Numbered citations"
              description="Each citation is a number that points to a passage in one of your documents."
            />
            <PaintedSplit
              card={
                <CitedRows
                  title="Payment terms"
                  rows={[
                    { text: "Payment is due within 30 days of the invoice date", source: "client-agreement.pdf" },
                    { text: "A late fee of 2% per month applies after that", source: "client-agreement.pdf" },
                  ]}
                />
              }
              rows={[
                {
                  title: "Only real passages",
                  text: "A citation appears only when its number matches a passage Paperwise actually retrieved.",
                },
                {
                  title: "Only what was used",
                  text: "The sources listed under an answer are the ones it cited, not everything that was searched.",
                },
                { title: "Read more on demand", text: "Select a source to expand its full passage." },
              ]}
            />
          </section>

          <section className="pb-20">
            <SectionHead title="Open the page" description="For PDFs, jump straight to the page a source came from." />
            <PaintedSplit
              tone="warm"
              card={<PdfPagePreview />}
              rows={[
                {
                  title: "The passage is highlighted",
                  text: "Paperwise marks the sentence on the page, so you do not have to hunt for it.",
                },
                { title: "Browse around it", text: "Move to the previous or next page to read the clause in context." },
                { title: "Word and text files", text: "These show the passage itself. Page view is for PDFs." },
              ]}
            />
          </section>

          <section className="pb-24">
            <SectionHead
              title="Honest when it is not there"
              description="If your documents do not contain the answer, Paperwise says so."
            />
            <PaintedSplit
              card={<NotFoundPreview />}
              rows={[
                {
                  title: "No guessing",
                  text: 'When nothing relevant is found, you get a clear "not found" instead of an invented answer.',
                },
                {
                  title: "Still check",
                  text: "AI can misread a passage, so check the source for anything that matters.",
                },
              ]}
            />
          </section>
        </div>

        <PaintedCta title="See the source behind your next answer">
          <PaintedCtaButtons />
        </PaintedCta>
      </main>
      <div className="h-24" />
      <SiteFooter />
    </div>
  );
}
