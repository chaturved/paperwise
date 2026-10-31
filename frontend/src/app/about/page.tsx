import type { Metadata } from "next";
import { FileSearch, Lock, MessageSquareText } from "lucide-react";
import { PaintedCtaButtons } from "@/components/site/cta-buttons";
import { IconColumns, LinkRows, PageHero, PaintedCta, SectionHead, Statement } from "@/components/site/page-sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = {
  title: "About — Paperwise",
  description: "Why Paperwise shows the source behind every answer.",
};

const principles = [
  { icon: FileSearch, title: "Show the source", text: "Every answer cites numbered passages, and for PDFs you can open the page they came from." },
  { icon: MessageSquareText, title: "Plain language", text: "Ask the way you would ask a colleague. There is no query syntax and nothing to set up." },
  { icon: Lock, title: "Private and honest", text: "Your files are yours alone. Scanned files are not supported yet and AI can still be wrong, and we say so." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero crumbs={[{ label: "Company" }, { label: "About" }]} title="Answers you can check">
          <p>Paperwise helps people read documents faster without taking an answer on faith.</p>
        </PageHero>
        <div className="page-w">
          <Statement lead="A document assistant you can check." rest="Most tools give you an answer and ask you to trust it. Paperwise shows the passages behind every answer, so you can read the original words yourself." />
          <section className="pb-20">
            <SectionHead title="What we care about" description="Three ideas that decide what we build and what we leave out." />
            <IconColumns items={principles} />
          </section>
          <section className="pb-24">
            <SectionHead title="Who it is for" description="Anyone who needs to read a document closely, starting with freelancers and small businesses." />
            <div className="mt-10 lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-7">
              <span aria-hidden />
              <LinkRows items={[
                { label: "Freelancers", text: "Read a client agreement or brief before you sign or start.", href: "/for/freelancers" },
                { label: "Small businesses", text: "Find the answer in leases, policies and supplier terms.", href: "/for/small-business" },
                { label: "Researchers and students", text: "Ask a paper, textbook or manual a question and see the page it came from.", href: "/for/researchers-and-students" },
              ]} />
            </div>
          </section>
        </div>
        <PaintedCta title="Try it on one of your own files">
          <PaintedCtaButtons />
        </PaintedCta>
      </main>
      <div className="h-24" />
      <SiteFooter />
    </div>
  );
}
