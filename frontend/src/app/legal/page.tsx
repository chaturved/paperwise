import type { Metadata } from "next";
import { LinkRows, PageHero } from "@/components/site/page-sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = {
  title: "Legal — Paperwise",
  description: "The terms, privacy policy and AI policy that apply to Paperwise.",
};

const groups = [
  {
    title: "Using Paperwise",
    items: [
      { label: "Terms of Service", text: "The rules for using Paperwise, including plans and limits.", href: "/terms" },
    ],
  },
  {
    title: "Your data",
    items: [
      {
        label: "Privacy Policy",
        text: "What we collect, who we share it with, how long we keep it and how to delete it.",
        href: "/privacy",
      },
      {
        label: "AI and your documents",
        text: "What is sent to the AI service when you upload a file or ask a question.",
        href: "/legal/ai",
      },
      { label: "Security", text: "How your account and files are protected, in plain language.", href: "/security" },
    ],
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-ink">
      <SiteNav />
      <PageHero title="Legal">
        <p>
          The documents that explain how Paperwise works with your files and what we expect of each other. We update
          them as the product changes.
        </p>
      </PageHero>
      <div className="page-w pb-24">
        {groups.map((group) => (
          <section key={group.title} className="border-t border-line py-8 lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-7">
            <h2 className="mb-5 font-display text-[28px] font-normal tracking-[-0.0125em] lg:mb-0">{group.title}</h2>
            <LinkRows items={group.items} />
          </section>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}
