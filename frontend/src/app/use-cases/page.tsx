import type { Metadata } from "next";
import { HeroCtas, PaintedCtaButtons } from "@/components/site/cta-buttons";
import { PageHero, PaintedCta, PaintedSplit, SectionHead } from "@/components/site/page-sections";
import { CitedRows } from "@/components/site/product-preview";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = {
  title: "Use cases — Paperwise",
  description: "Questions people ask their contracts, reports, meeting notes and study material.",
};

const useCases = [
  {
    id: "contracts",
    title: "Contracts and policies",
    description: "Check a clause, a deadline or a requirement without reading the whole document.",
    tone: "paint" as const,
    file: "lease.docx",
    questions: [
      "What notice do I need to give to end the lease?",
      "When is payment due?",
      "Does the agreement renew automatically?",
    ],
    tips: [
      {
        title: "Ask about one clause at a time",
        text: "Narrow questions return a tighter passage you can check quickly.",
      },
      { title: "Follow up", text: "Ask what an exception means without restating the first question." },
    ],
  },
  {
    id: "reports",
    title: "Reports and research",
    description: "Pull a figure or a finding out of a long report and see the passages it used.",
    tone: "warm" as const,
    file: "report.pdf",
    questions: [
      "How much time do teams lose searching?",
      "What does the report recommend for next quarter?",
      "Which finding is the strongest?",
    ],
    tips: [
      { title: "Ask for a number", text: "Specific figures are easy to verify against the passage." },
      { title: "Summarize first", text: "Start with a summary, then ask about the parts that matter." },
    ],
  },
  {
    id: "notes",
    title: "Meeting notes",
    description: "Find who owns what and what was decided, even weeks later.",
    tone: "paint" as const,
    file: "notes.docx",
    questions: [
      "Who owns the budget follow-up?",
      "What did we decide about the launch date?",
      "Which risks are still open?",
    ],
    tips: [
      { title: "Keep notes in your library", text: "Add each meeting once and ask across time." },
      { title: "Check the passage", text: "Confirm the wording before you share a decision." },
    ],
  },
  {
    id: "study",
    title: "Study and reference",
    description: "Ask questions of a paper, a textbook or a manual and keep the answers with their sources.",
    tone: "warm" as const,
    file: "paper.pdf",
    questions: ["What method did the authors use?", "How is this term defined?", "What are the stated limitations?"],
    tips: [
      { title: "Ask for definitions", text: "Get a term explained in the document's own words." },
      { title: "Save the chat", text: "Come back to a conversation when you revise." },
    ],
  },
];

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero
          crumbs={[{ label: "Product", href: "/product" }, { label: "Use cases" }]}
          title="Questions worth asking your files"
        >
          <p>Examples of what people ask their contracts, reports, notes and study material.</p>
          <HeroCtas />
        </PageHero>

        <div className="page-w space-y-20 pb-24 pt-10">
          {useCases.map((useCase) => (
            <section key={useCase.id}>
              <SectionHead id={useCase.id} title={useCase.title} description={useCase.description} />
              <PaintedSplit
                tone={useCase.tone}
                card={
                  <CitedRows
                    title="Example questions"
                    rows={useCase.questions.map((text) => ({ text, source: useCase.file }))}
                  />
                }
                rows={useCase.tips}
              />
            </section>
          ))}
        </div>

        <PaintedCta title="Start with a document you already have">
          <PaintedCtaButtons />
        </PaintedCta>
      </main>
      <div className="h-24" />
      <SiteFooter />
    </div>
  );
}
