import type { Metadata } from "next";
import { AuthActionLink } from "@/components/site/auth-action-link";
import { MetricRows, PageHero, PaintedCta, PaintedSplit, SectionHead, Statement } from "@/components/site/page-sections";
import { ChipRow, CitedRows, ComposerCard, StageWindow, UploadCard } from "@/components/site/product-preview";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = {
  title: "Product — Paperwise",
  description: "Ask questions of your documents and see the quote behind every answer.",
};

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero crumbs={[{ label: "Product", href: "/product" }, { label: "Chat with documents" }]} title="The fastest way to check a document">
          <p>Upload a file, ask a question, and read the quote behind the answer.</p>
          <AuthActionLink signedOutLabel="Upload a file" signedInLabel="Open your workspace" arrow="right" className="btn-primary btn-lg" />
        </PageHero>

        <div className="mx-auto max-w-[1280px] px-5 md:px-8">
          <StageWindow label="Illustrative Paperwise composer" title="Office lease" meta="DOCX">
            <ComposerCard file="Office-lease.docx" question="What notice do I need to give to end the lease early, and are there any penalties?" />
            <ChipRow chips={["Summarize", "Find a clause", "View all"]} />
          </StageWindow>

          <Statement lead="Find the answer, then find the source." rest="Every reply lists the documents and quotes it used, so you can verify it before you rely on it." />

          <section className="pb-20">
            <SectionHead id="sources" title="Every answer shows its sources" description="Under each reply, Paperwise lists the documents and the quotes it used." />
            <PaintedSplit
              card={<CitedRows title="Termination and notice" rows={[
                { text: "The tenant must give 90 days of written notice before terminating the lease early.", source: "lease.docx" },
                { text: "Either party may end the agreement under the conditions below.", source: "lease.docx" },
              ]} />}
              rows={[
                { title: "Source quotes", text: "See the passage from your file that supports each answer." },
                { title: "Read more on demand", text: "Select a source to expand the full quote." },
                { title: "Feedback on every answer", text: "Mark a reply as helpful or not so you can keep track of what worked." },
              ]}
            />
          </section>

          <section className="pb-20">
            <SectionHead id="library" title="Keep your files in one library" description="Add a document once, then choose which one to ask about." />
            <PaintedSplit tone="warm" card={<UploadCard />} rows={[
              { title: "5 documents on Free", text: "Pro lifts the limit when it launches." },
              { title: "10 MB per file on Free", text: "Pro raises this to 50 MB." },
              { title: "Conversations you can follow up", text: "Ask a follow-up and the chat keeps its context." },
            ]} />
          </section>

          <section className="pb-24">
            <SectionHead id="history" title="Pick up where you left off" description="Past conversations are saved to your account, so you never have to ask the same question twice." />
            <MetricRows rows={[{ label: "History on the Free plan", value: "7 days" }, { label: "History on Pro", value: "Full" }]} />
          </section>
        </div>

        <PaintedCta title="Ask your first document a question">
          <AuthActionLink signedOutLabel="Upload a file" signedInLabel="Open your workspace" arrow="right" className="btn-light" />
        </PaintedCta>
      </main>
      <div className="h-24" />
      <SiteFooter />
    </div>
  );
}
