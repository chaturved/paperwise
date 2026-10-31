import type { Metadata } from "next";
import { AuthActionLink } from "@/components/site/auth-action-link";
import { DemoRequestForm } from "@/components/site/demo-request-form";
import { FeatureRows, PageHero } from "@/components/site/page-sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Request a demo — Paperwise",
  description: "Ask for a walkthrough of Paperwise using a document you already have.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero first title="See Paperwise on your own documents">
          <p>Tell us what you work with and we will show you how Paperwise answers questions about it, with the source for every answer.</p>
        </PageHero>

        <div className="page-w grid gap-12 pb-24 lg:grid-cols-[1.15fr_1fr]">
          <DemoRequestForm />
          <div>
            <h2 className="mb-6 font-display text-[28px] font-normal tracking-[-0.0125em]">What to expect</h2>
            <FeatureRows items={[
              { title: "Bring a real document", text: "A contract, a policy or a report you already have. We will ask it a few questions together." },
              { title: "See where answers come from", text: "Every reply cites numbered passages, and you can open the page they came from." },
              { title: "Ask about plans and your data", text: "Questions about the Free and Pro plans, security and how your files are handled are welcome." },
              { title: "No payment details", text: "We do not ask for a card to request a demo or to use the Free plan." },
            ]} />
            <div className="mt-8 border-t border-line pt-6">
              <p className="mb-4 text-[15.5px] text-ink/60">Rather try it yourself first?</p>
              <AuthActionLink signedOutLabel="Upload a file for free" signedInLabel="Open your workspace" arrow="right" className={buttonVariants({ variant: "secondary", size: "default" })} />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
