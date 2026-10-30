import { KeyRound, Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import { AuthActionLink } from "@/components/site/auth-action-link";
import { DetailRows, MetricRows, PageHero, PaintedCard, PaintedCta, Statement } from "@/components/site/page-sections";
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
          <AuthActionLink signedOutLabel="Upload a file" signedInLabel="Continue in your workspace" arrow="right" className="btn-primary btn-lg" />
        </PageHero>

        <div className="mx-auto max-w-[1280px] px-5 md:px-8">
          <ProductPreview />

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

        <DetailRows title="Built so you can check the answer" text="See how Paperwise handles your account and your files." cta={{ label: "Read about security", href: "/security" }} rows={securityRows} />

        <div className="pt-24">
          <PaintedCta title="Ask your first document a question">
            <AuthActionLink signedOutLabel="Upload a file" signedInLabel="Go to workspace" arrow="right" className="btn-light" />
          </PaintedCta>
        </div>
      </main>
      <div className="h-24" />
      <SiteFooter />
    </div>
  );
}
