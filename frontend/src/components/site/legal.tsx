import type { ReactNode } from "react";
import { PageHero } from "@/components/site/page-sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

interface LegalPageProps {
  title: string;
  summary: string;
  updated: string;
  children: ReactNode;
}

export function LegalPage({ title, summary, updated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-ink">
      <SiteNav />
      <PageHero crumbs={[{ label: "Legal", href: "/legal" }, { label: title }]} title={title}>
        <p>{summary}</p>
        <p className="!mt-0 !text-sm !text-ink/50">Last updated: {updated}</p>
      </PageHero>
      <div className="mx-auto max-w-[1280px] px-5 pb-24 md:px-8">
        <div className="max-w-[760px]">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ title, children, first }: { title: string; children: ReactNode; first?: boolean }) {
  return (
    <div className={`py-9 ${!first ? "border-t border-line" : ""}`}>
      <h2 className="mb-4 font-display text-[24px] font-normal tracking-[-0.02em] text-ink">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-8 text-ink/75">{children}</p>;
}

export function LegalBullets({ items }: { items: (ReactNode | [string, ReactNode])[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="text-[15px] leading-8 text-ink/75">
          {Array.isArray(item) ? (
            <>
              <span className="font-medium text-ink">{item[0]}</span> — {item[1]}
            </>
          ) : (
            item
          )}
        </li>
      ))}
    </ul>
  );
}

export const LegalMail = () => (
  <a href="mailto:hello@paperwise.ai" className="underline underline-offset-4 transition hover:opacity-70">hello@paperwise.ai</a>
);
