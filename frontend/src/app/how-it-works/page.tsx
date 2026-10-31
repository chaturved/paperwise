import type { Metadata } from "next";
import Link from "next/link";
import { HeroCtas, PaintedCtaButtons } from "@/components/site/cta-buttons";
import { PageHero, PaintedCta, PaintedSplit, SectionHead, StepColumns } from "@/components/site/page-sections";
import { AnswerPreview, ComposerCard, UploadCard } from "@/components/site/product-preview";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = {
  title: "How it works — Paperwise",
  description: "From a file to a checked answer in three steps.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero crumbs={[{ label: "Product", href: "/product" }, { label: "How it works" }]} title="From a file to a checked answer">
          <p>Add a document, ask a question, and read the passage behind the answer.</p>
          <HeroCtas />
        </PageHero>

        <div className="page-w">
          <StepColumns steps={[
            { title: "Add a document", text: "Upload a PDF, Word, text or Markdown file. Paperwise reads the text and gets it ready to search." },
            { title: "Ask in plain language", text: "Type a question the way you would ask a colleague. Paperwise finds the passages that matter and writes an answer from them." },
            { title: "Check the source", text: "The answer cites numbered passages. Open one, or for a PDF the page itself with the passage highlighted." },
          ]} />

          <section className="pb-20 pt-20">
            <SectionHead title="Add it once, ask it any time" description="Your library keeps your files together, and you choose which one to ask about." />
            <PaintedSplit card={<UploadCard />} rows={[
              { title: "Four file types", text: "PDF, Word, plain text and Markdown." },
              { title: "Read for you", text: "Scanned files with no selectable text are not supported yet." },
            ]} />
          </section>

          <section className="pb-20">
            <SectionHead title="Ask the way you talk" description="There is no query language to learn. Follow-up questions keep their context." />
            <PaintedSplit tone="warm" card={<ComposerCard file="client-agreement.pdf" question="When is payment due, and what happens if it is late?" />} rows={[
              { title: "Only your documents", text: "Answers come from your own files, not from anyone else's." },
              { title: "Honest when it is not there", text: "If nothing relevant is found, Paperwise says so." },
            ]} />
          </section>

          <section className="pb-24">
            <SectionHead title="Every answer shows its sources" description="Citations are numbered, and each one points to a real passage." />
            <PaintedSplit card={<AnswerPreview />} rows={[
              { title: "Numbered citations", text: "A citation only appears if its number matches a real passage." },
              { title: "Open the page", text: "For PDFs, see the cited page with the passage highlighted." },
            ]} />
            <p className="mt-10 text-[15.5px] text-ink/60">
              Curious what is sent to the AI service along the way? Read <Link href="/legal/ai" className="underline underline-offset-4">AI and your documents</Link>.
            </p>
          </section>
        </div>

        <PaintedCta title="Try the three steps on your own file">
          <PaintedCtaButtons />
        </PaintedCta>
      </main>
      <div className="h-24" />
      <SiteFooter />
    </div>
  );
}
