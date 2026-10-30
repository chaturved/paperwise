import type { Metadata } from "next";
import Link from "next/link";
import { FaqList, type FaqGroup } from "@/components/site/faq-list";
import { PaintedCtaButtons } from "@/components/site/cta-buttons";
import { PageHero, PaintedCta } from "@/components/site/page-sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = {
  title: "Questions and answers — Paperwise",
  description: "What you can upload, how answers are checked, what the plans include and how your data is handled.",
};

const link = "underline underline-offset-4";

const groups: FaqGroup[] = [
  {
    id: "getting-started",
    title: "Getting started",
    items: [
      { question: "What can I upload?", answer: "PDF, Word (.docx), plain text and Markdown files. The size limit for each file depends on your plan." },
      { question: "Can I upload a scanned document?", answer: "Not yet. Paperwise reads the text in a file, so a scan or an image-only PDF with no selectable text cannot be read. PDFs and Word files that contain real text work." },
      { question: "How many documents and questions do I get?", answer: <>It depends on your plan. <Link href="/pricing" className={link}>Pricing</Link> shows what Free and Pro include.</> },
    ],
  },
  {
    id: "answers",
    title: "Checking an answer",
    items: [
      { question: "How do I know an answer is right?", answer: "Every answer cites numbered passages from your documents. Open a source to read the passage, and for a PDF the page it came from is shown with the passage highlighted. AI can still misread or miss something, so check the source for anything that matters." },
      { question: "What if the answer is not in my documents?", answer: "Paperwise says it could not find it, rather than guessing." },
      { question: "Is this legal or professional advice?", answer: <>No. Paperwise helps you read faster. It is not a lawyer, accountant or other professional. See <Link href="/legal/ai" className={link}>AI and your documents</Link>.</> },
    ],
  },
  {
    id: "your-data",
    title: "Your data",
    items: [
      { question: "Who can see my documents?", answer: "Only you. Your files are stored privately and no other Paperwise customer can open or search them." },
      { question: "Does an AI service see my documents?", answer: <>Yes, because it has to read them to answer you. <Link href="/legal/ai" className={link}>AI and your documents</Link> explains exactly what is sent and when.</> },
      { question: "How do I delete my data?", answer: "Delete a document from your library, or your whole account from Settings. Deleting an account removes your documents, files and conversations." },
    ],
  },
  {
    id: "plans",
    title: "Plans and demos",
    items: [
      { question: "Is Paperwise free?", answer: <>The Free plan is available now and needs no payment details. Pro, with unlimited documents and larger files, is coming soon. <Link href="/pricing" className={link}>Join the waitlist</Link>.</> },
      { question: "Can I see a demo first?", answer: <>Yes. <Link href="/demo" className={link}>Request a demo</Link> and we will walk through Paperwise using a document you bring.</> },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero crumbs={[{ label: "Resources" }, { label: "Questions and answers" }]} title="Questions and answers">
          <p>What you can upload, how answers are checked and how your data is handled.</p>
        </PageHero>
        <div className="mx-auto max-w-[1280px] px-5 pb-24 md:px-8">
          <FaqList groups={groups} />
        </div>
        <PaintedCta title="Still deciding? Try it on one file.">
          <PaintedCtaButtons />
        </PaintedCta>
      </main>
      <div className="h-24" />
      <SiteFooter />
    </div>
  );
}
