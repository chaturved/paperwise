import { PageHero } from "@/components/site/page-sections";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";

function Section({ title, children, first }: { title: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div className={`py-9 ${!first ? "border-t border-line" : ""}`}>
      <h2 className="mb-4 flex items-center gap-3 font-display text-[21px] font-normal tracking-[-0.02em] text-ink">
        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-8 text-ink/75">{children}</p>;
}

function Bullets({ items }: { items: [string, string][] }) {
  return (
    <ul className="space-y-2">
      {items.map(([label, desc]) => (
        <li key={label} className="flex gap-2 text-[15px] leading-8 text-ink/75">
          <span className="mt-[3px] flex-shrink-0 text-ink/40">•</span>
          <span><span className="font-medium text-ink">{label}</span> — {desc}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-ink">
      <SiteNav />

      <PageHero crumbs={[{ label: "Legal" }, { label: "Privacy Policy" }]} title="Privacy Policy">
        <p>Your documents are yours. We collect only what we need and never share it.</p>
        <p className="!mt-0 !text-sm !text-ink/50">Last updated: May 2026</p>
      </PageHero>

      <div className="mx-auto max-w-[1280px] px-5 pb-24 md:px-8"><div className="max-w-[760px]">

        <Section title="What data we collect" first>
          <P>We collect only what&apos;s necessary to run Paperwise:</P>
          <Bullets items={[
            ["Account data", "your email address and display name when you sign up."],
            ["Documents", "the files you upload. These are stored in your account and never shared."],
            ["Queries", "the questions you ask and the AI responses, stored as conversation history."],
            ["Usage data", "aggregate counts (documents uploaded, queries made) for enforcing tier limits."],
            ["Authentication tokens", "short-lived JWT cookies to keep you signed in."],
          ]} />
          <P>We do not collect payment information (Pro billing will use Stripe, which handles card data on their servers).</P>
        </Section>

        <Section title="How your data is stored">
          <P>Documents are stored in Supabase Storage (S3-compatible object storage hosted in the US). Account data, conversations, and metadata are stored in a PostgreSQL database hosted on Supabase.</P>
          <P>All data is encrypted at rest and in transit (TLS 1.2+). We use environment-level secrets for all storage credentials — no credentials are ever logged or exposed to clients.</P>
        </Section>

        <Section title="How your data is used">
          <P>Your data is used exclusively to power your own queries:</P>
          <ul className="space-y-2">
            {[
              "Documents are chunked and embedded into a vector index so we can retrieve relevant passages when you ask a question.",
              "Conversation history is used to give the AI multi-turn context within your sessions.",
            ].map((item) => (
              <li key={item} className="flex gap-2 text-[15px] leading-8 text-ink/75">
                <span className="mt-[3px] flex-shrink-0 text-ink/40">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <P><span className="font-medium text-ink">Your data is never used to train AI models.</span> Paperwise uses retrieval-augmented generation over your own documents. Your files are not sent to any AI provider for training.</P>
          <P>We do not sell, rent, or share your data with third parties for advertising or analytics.</P>
        </Section>

        <Section title="Data retention">
          <P><span className="font-medium text-ink">Free accounts:</span> conversation history is retained for 7 days after the last message. Documents remain until you delete them or your account.</P>
          <P><span className="font-medium text-ink">Pro accounts:</span> conversation history is retained indefinitely until you delete it.</P>
          <P>Deleted documents are removed from storage within 24 hours. When you delete your account, all your data (documents, conversations, account info) is permanently deleted within 30 days.</P>
        </Section>

        <Section title="Your rights">
          <P>You have full control over your data:</P>
          <Bullets items={[
            ["Access", "view all your documents and conversation history in the dashboard."],
            ["Delete", "delete any document or conversation at any time. Delete your account (and all data) from Settings → Profile → Danger Zone."],
            ["Export", "contact us at hello@paperwise.ai to request an export of your data."],
            ["Correction", "update your name and email from Settings → Profile."],
          ]} />
          <P>If you&apos;re in the EU, you also have rights under GDPR including the right to erasure and data portability. Contact us to exercise these rights.</P>
        </Section>

        <Section title="Cookies">
          <P>We use two HttpOnly cookies for authentication:</P>
          <ul className="space-y-2">
            {([
              ["paperwise_access_token", "short-lived JWT (15 minutes) used to authenticate API requests."],
              ["paperwise_refresh_token", "longer-lived token (7 days) used to issue new access tokens without requiring you to log in again."],
            ] as [string, string][]).map(([label, desc]) => (
              <li key={label} className="flex gap-2 text-[15px] leading-8 text-ink/75">
                <span className="mt-[3px] flex-shrink-0 text-ink/40">•</span>
                <span><code className="rounded bg-ink/[0.07] px-1.5 py-0.5 text-xs text-ink">{label}</code> — {desc}</span>
              </li>
            ))}
          </ul>
          <P>We do not use cookies for advertising or third-party tracking.</P>
        </Section>

        <Section title="Contact">
          <P>Questions about this policy? Email <a href="mailto:hello@paperwise.ai" className="underline underline-offset-4 hover:opacity-70 transition">hello@paperwise.ai</a> — we aim to respond within 2 business days.</P>
        </Section>

      </div></div>

      <SiteFooter />
    </div>
  );
}
