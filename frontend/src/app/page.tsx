import { KeyRound, Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import { HeroCtas, PaintedCtaButtons } from "@/components/site/cta-buttons";
import { FaqList } from "@/components/site/faq-list";
import { DetailRows, LinkRows, MetricRows, PageHero, PaintedCard, PaintedCta, SectionHead, Statement, StepColumns } from "@/components/site/page-sections";
import { CitedRows, ProductPreview } from "@/components/site/product-preview";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

const securityRows = [
  { icon: Lock, label: "Private to your account", detail: "Your documents and conversations are visible only to you, and your files are stored privately." },
  { icon: Trash2, label: "Delete whenever you like", detail: "Remove a single document, or your whole account and everything in it, from your settings." },
  { icon: KeyRound, label: "Sign in your way", detail: "Use a password, Google, or a one-time link sent to your email." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero first title="Know exactly where every answer comes from">
          <p>Paperwise answers questions about your documents and shows you the passages it used.</p>
          <HeroCtas />
        </PageHero>

        <div className="mx-auto max-w-[1280px] px-5 md:px-8">
          <ProductPreview />

          <section className="pb-8 pt-24">
            <SectionHead title="From a file to a checked answer" description="Three steps, and the source is part of every one." />
            <StepColumns steps={[
              { title: "Add a document", text: "Upload a PDF, Word, text or Markdown file. Paperwise reads it and gets it ready to search." },
              { title: "Ask in plain language", text: "Type a question the way you would ask a colleague. Paperwise answers from your own documents." },
              { title: "Check the source", text: "Every answer cites numbered passages. Open one, or for a PDF the page itself." },
            ]} />
            <p className="mt-10"><Link href="/how-it-works" className="text-[15.5px] underline underline-offset-4">See how it works</Link></p>
          </section>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <PaintedCard title="For contracts and policies" text="Check a clause, a deadline or a requirement and see the passages it used." cta={{ label: "Explore the product", href: "/product" }}>
              <CitedRows title="Office lease" rows={[
                { text: "Termination notice", source: "lease.docx" },
                { text: "Payment terms", source: "lease.docx" },
                { text: "Renewal", source: "lease.docx" },
              ]} />
            </PaintedCard>
            <PaintedCard tone="warm" title="For reports and notes" text="Pull a figure from a long report or find the decision in last week's meeting." cta={{ label: "See use cases", href: "/use-cases" }}>
              <CitedRows title="Team sync notes" rows={[
                { text: "Budget follow-up: Maya", source: "notes.docx" },
                { text: "Launch checklist review", source: "notes.docx" },
                { text: "Open risks", source: "notes.docx" },
              ]} />
            </PaintedCard>
          </div>

          <Statement lead="Every answer comes with its source." rest="Read the original text before you rely on it, and keep your files, questions and history in one place." />

          <section className="pb-24">
            <SectionHead title="Made for people who read closely" description="Start with the documents you already have to understand." />
            <div className="mt-10 lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-7">
              <span aria-hidden />
              <LinkRows items={[
                { label: "Freelancers", text: "Read a client agreement or brief before you sign or start.", href: "/for/freelancers" },
                { label: "Small businesses", text: "Find the answer in leases, policies and supplier terms.", href: "/for/small-business" },
                { label: "Researchers and students", text: "Ask a paper, textbook or manual a question and see the page it came from.", href: "/for/researchers-and-students" },
              ]} />
            </div>
          </section>

          <section className="border-t border-line pb-24 pt-8">
            <div className="grid gap-7 md:grid-cols-2">
              <h2 className="max-w-[16ch] text-[32px] font-medium leading-[1.1] tracking-[-0.01em]">Start free, with room to grow</h2>
              <p className="max-w-[40ch] text-xl leading-[1.3] text-ink/75">What the Free plan includes today. <Link href="/pricing" className="underline underline-offset-4">See all plans</Link>.</p>
            </div>
            <MetricRows rows={[
              { label: "Documents in your library", value: "5" },
              { label: "Questions every 24 hours", value: "20" },
              { label: "Maximum file size", value: "10 MB" },
              { label: "Conversation history", value: "7 days" },
            ]} />
          </section>
        </div>

        <div className="mx-auto max-w-[1280px] px-5 pb-24 md:px-8">
          <FaqList groups={[{
            id: "common-questions",
            title: "Common questions",
            items: [
              { question: "What can I upload?", answer: "PDF, Word, plain text and Markdown files. On the Free plan each file can be up to 10 MB." },
              { question: "Can I trust the answers?", answer: "Every answer cites numbered passages from your documents, so you can read the original words. AI can still be wrong, so check the source for anything that matters." },
              { question: "Who can see my documents?", answer: "Only you. Your files are stored privately and no other Paperwise customer can open them." },
            ],
          }]} />
          <p className="mt-8 text-[15.5px]"><Link href="/faq" className="underline underline-offset-4">More questions and answers</Link></p>
        </div>

        <DetailRows title="Built so you can check the answer" text="See how Paperwise handles your account and your files." cta={{ label: "Read about security", href: "/security" }} rows={securityRows} />

        <div className="pt-24">
          <PaintedCta title="Ask your first document a question">
            <PaintedCtaButtons />
          </PaintedCta>
        </div>
      </main>
      <div className="h-24" />
      <SiteFooter />
    </div>
  );
}
