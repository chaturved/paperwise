import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Bot, FileWarning, KeyRound, Lock, ShieldCheck, Trash2, Users } from "lucide-react";
import { AuthActionLink } from "@/components/site/auth-action-link";
import { DetailRows, IconColumns, PageHero, SectionHead } from "@/components/site/page-sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = {
  title: "Security — Paperwise",
  description: "How Paperwise keeps your documents private, in plain language.",
};

const principles = [
  { icon: Users, title: "Only you can see your files", text: "Your documents, questions and answers belong to your account. No other Paperwise customer can open or search them." },
  { icon: Lock, title: "Stored privately", text: "Your files are not kept at a public web address. When you open a source, Paperwise makes a link that stops working after a few minutes." },
  { icon: ShieldCheck, title: "Protected on the way", text: "Everything between your browser and Paperwise travels over an encrypted HTTPS connection." },
];

const rows = [
  { icon: Trash2, label: "Can I delete my files?", detail: "Yes. Delete a single document and its file, and the text we read from it, are removed straight away. Delete your account in Settings and your documents, files and conversations go with it." },
  { icon: Bot, label: "Does an AI service see my documents?", detail: "Yes, because it has to read them to answer you. Paperwise sends the text of your files to an AI service to make them searchable, and sends your question with the few matching passages to write an answer. We do not train our own models on your documents. The AI and your documents page explains exactly what is sent." },
  { icon: KeyRound, label: "How is my password protected?", detail: "We store passwords in a scrambled form that we cannot read back. You can also skip the password and sign in with Google or a one-time link sent to your email." },
  { icon: FileWarning, label: "What if I upload a damaged or unsafe file?", detail: "Every upload is checked for type and size, then opened in a separate step with strict time limits, so a broken file cannot slow down or crash Paperwise for anyone else." },
  { icon: BadgeCheck, label: "Do you have security certifications?", detail: "Not yet. Paperwise has not been through formal audits such as SOC 2 or ISO 27001, so we do not claim them. This page describes what the product does today." },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero crumbs={[{ label: "Legal", href: "/legal" }, { label: "Security" }]} title="Your documents stay yours">
          <p>Straight answers to what people ask before they upload a contract or a client file.</p>
          <AuthActionLink signedOutLabel="Get started" signedInLabel="Open your workspace" arrow="right" className="btn-primary btn-lg" />
        </PageHero>

        <div className="mx-auto max-w-[1280px] px-5 pb-24 pt-14 md:px-8">
          <SectionHead title="What you can count on" description="Three things that shape how Paperwise treats your files." />
          <IconColumns items={principles} />
        </div>

        <DetailRows title="Questions people ask" text="Select a question to read the answer." cta={{ label: "Read the privacy policy", href: "/privacy" }} rows={rows} />

        <div className="mx-auto max-w-[1280px] px-5 pb-24 pt-24 md:px-8">
          <SectionHead title="Still have a question?" description="Email us and a person will answer. The privacy policy and terms cover the details." />
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="mailto:hello@paperwise.ai" className="btn-primary btn-lg">Email us</a>
            <Link href="/legal/ai" className="btn-secondary btn-lg">AI and your documents</Link>
            <Link href="/legal" className="btn-secondary btn-lg">All legal documents</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
