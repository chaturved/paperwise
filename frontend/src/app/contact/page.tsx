import type { Metadata } from "next";
import { LinkRows, PageHero } from "@/components/site/page-sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = {
  title: "Contact — Paperwise",
  description: "Reach the Paperwise team by email, or ask for a walkthrough.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero crumbs={[{ label: "Company" }, { label: "Contact" }]} title="Talk to the Paperwise team">
          <p>Email us, or ask for a walkthrough on your own documents. A person reads every message.</p>
        </PageHero>
        <div className="page-w pb-24">
          <div className="lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-7">
            <span aria-hidden />
            <LinkRows
              items={[
                { label: "Request a demo", text: "A walkthrough using a document you bring.", href: "/demo" },
                {
                  label: "Email us",
                  text: "hello@paperwise.chaturved-sumanth-lakkaraju.com for questions, feedback or a copy of your data.",
                  href: "mailto:hello@paperwise.chaturved-sumanth-lakkaraju.com",
                },
                {
                  label: "Questions and answers",
                  text: "What you can upload, what it costs and how your data is handled.",
                  href: "/faq",
                },
                {
                  label: "Security and privacy",
                  text: "How your files are kept private, and the policies that apply.",
                  href: "/security",
                },
              ]}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
