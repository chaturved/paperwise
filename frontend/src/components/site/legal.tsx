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

/** The frame every legal document shares: breadcrumb, title, last-updated date and a narrow reading column. */
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
      <h2 className="mb-4 flex items-center gap-3 font-display text-[21px] font-normal tracking-[-0.02em] text-ink">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-8 text-ink/75">{children}</p>;
}

/** A list of points. An item is plain text, or a [label, description] pair that puts the label in bold. */
export function LegalBullets({ items }: { items: (ReactNode | [string, ReactNode])[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2 text-[15px] leading-8 text-ink/75">
          <span className="mt-[3px] flex-shrink-0 text-ink/40">•</span>
          <span>
            {Array.isArray(item) ? (
              <>
                <span className="font-medium text-ink">{item[0]}</span> — {item[1]}
              </>
            ) : (
              item
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export const LegalMail = () => (
  <a href="mailto:hello@paperwise.ai" className="underline underline-offset-4 transition hover:opacity-70">hello@paperwise.ai</a>
);
