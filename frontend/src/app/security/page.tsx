import type { Metadata } from "next";
import Link from "next/link";
import { Cookie, Gauge, HardDrive, KeyRound, Link2, LockKeyhole, Mail } from "lucide-react";
import { AuthActionLink } from "@/components/site/auth-action-link";
import { DetailRows, IconColumns, PageHero, SectionHead } from "@/components/site/page-sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = {
  title: "Security — Paperwise",
  description: "How Paperwise handles your account and your files.",
};

const principles = [
  { icon: Cookie, title: "Sessions in httpOnly cookies", text: "Your sign-in token is stored in an httpOnly cookie that browser scripts cannot read, and the app sends it with each request." },
  { icon: KeyRound, title: "Secrets stay on the server", text: "AI requests, token generation and third-party keys all live in the backend. The browser only holds your session." },
  { icon: Gauge, title: "Rate limits on requests", text: "The API limits how often a client can call it, which helps protect accounts and keeps the service responsive." },
];

const rows = [
  { icon: LockKeyhole, label: "Hashed passwords", detail: "Passwords are hashed before they are stored. Paperwise never keeps your password in plain text." },
  { icon: Link2, label: "Google sign-in and magic links", detail: "Sign in with Google through standard OAuth, or ask for a one-time sign-in link by email instead of using a password." },
  { icon: HardDrive, label: "File storage", detail: "Uploaded documents are kept in S3-compatible object storage rather than inside the web app." },
  { icon: Mail, label: "Password resets", detail: "Reset links are sent by email, and you can change your password from your account settings at any time." },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteNav />
      <main>
        <PageHero crumbs={[{ label: "Company" }, { label: "Security" }]} title="How Paperwise handles your account and files">
          <p>A plain description of what the product does today. We don&apos;t list certifications we don&apos;t hold.</p>
          <AuthActionLink signedOutLabel="Get started" signedInLabel="Open your workspace" arrow="right" className="btn-primary btn-lg" />
        </PageHero>

        <div className="mx-auto max-w-[1280px] px-5 pb-24 pt-14 md:px-8">
          <SectionHead title="The basics, done properly" description="Three design decisions that shape how Paperwise treats your data." />
          <IconColumns items={principles} />
        </div>

        <DetailRows title="What sits behind your account" text="Select a row to read the details." cta={{ label: "Read the privacy policy", href: "/privacy" }} rows={rows} />

        <div className="mx-auto max-w-[1280px] px-5 pb-24 pt-24 md:px-8">
          <SectionHead title="Questions about your data?" description="Read the privacy policy and terms, or email us and we will answer directly." />
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="mailto:hello@paperwise.ai" className="btn-primary btn-lg">Email us</a>
            <Link href="/terms" className="btn-secondary btn-lg">Read the terms</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
