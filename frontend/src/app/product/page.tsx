import type { Metadata } from "next";
import { HeroCtas, PaintedCtaButtons } from "@/components/site/cta-buttons";
import { PageHero, PaintedCta, PaintedSplit, SectionHead, Statement } from "@/components/site/page-sections";
import { ChipRow, CitedRows, ComposerCard, StageWindow, UploadCard } from "@/components/site/product-preview";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = {
  title: "Product — Paperwise",
  description: "Ask questions of your documents and see the passages behind every answer.",
};

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero
          crumbs={[{ label: "Product", href: "/product" }, { label: "Chat with documents" }]}
          title="The fastest way to check a document"
        >
          <p>Upload a file, ask a question, and see the passages behind the answer.</p>
          <HeroCtas />
        </PageHero>

        <div className="page-w">
          <StageWindow label="Illustrative Paperwise composer" title="Office lease" meta="DOCX">
            <ComposerCard
              file="Office-lease.docx"
              question="What notice do I need to give to end the lease early, and are there any penalties?"
            />
            <ChipRow chips={["Summarize", "Find a clause", "View all"]} />
          </StageWindow>

          <Statement
            lead="Find the answer, then find the source."
            rest="Every reply lists the documents and passages it used, so you can check them before you rely on it."
          />

          <section className="pb-20">
            <SectionHead
              id="sources"
              title="Every answer shows its sources"
              description="Under each reply, Paperwise lists the documents and passages it used."
            />
            <PaintedSplit
              card={
                <CitedRows
                  title="Termination and notice"
                  rows={[
                    {
                      text: "The tenant must give 90 days of written notice before terminating the lease early.",
                      source: "lease.docx",
                    },
                    { text: "Either party may end the agreement under the conditions below.", source: "lease.docx" },
                  ]}
                />
              }
              rows={[
                {
                  title: "Retrieved passages",
                  text: "See the passages Paperwise pulled from your files to write each answer.",
                },
                { title: "Read more on demand", text: "Select a source to expand its full passage." },
                {
                  title: "Feedback on every answer",
                  text: "Mark a reply as helpful or not so you can keep track of what worked.",
                },
              ]}
            />
          </section>

          <section className="pb-20">
            <SectionHead
              id="library"
              title="Keep your files in one library"
              description="Add a document once, then choose which one to ask about."
            />
            <PaintedSplit
              tone="warm"
              card={<UploadCard />}
              rows={[
                {
                  title: "Room that grows with your plan",
                  text: "Pro raises the document and file size limits when it launches.",
                },
                { title: "Conversations you can follow up", text: "Ask a follow-up and the chat keeps its context." },
              ]}
            />
          </section>

          <section className="pb-24">
            <SectionHead
              id="history"
              title="Pick up where you left off"
              description="Past conversations are saved to your account, so you never have to ask the same question twice. How far back you can open them depends on your plan."
            />
          </section>
        </div>

        <PaintedCta title="Ask your first document a question">
          <PaintedCtaButtons />
        </PaintedCta>
      </main>
      <div className="h-24" />
      <SiteFooter />
    </div>
  );
}
