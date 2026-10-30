"use client";

import Link from "next/link";
import { ArrowUpRight, ChartNoAxesCombined, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const FREE_FEATURES = [
  "Up to 5 documents",
  "20 queries / day",
  "10 MB per file",
  "PDF, TXT, and Markdown files",
  "7 days of conversation history",
];

const PRO_FEATURES = [
  "Unlimited documents",
  "Unlimited queries",
  "50 MB per file",
  "PDF, DOCX, TXT, and Markdown files",
  "Full conversation history",
];

export default function BillingPage() {
  const { user } = useAuth();

  const isFree = user?.plan === "free";

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">Your account</p>
        <h1 className="text-[32px] font-medium tracking-[-0.04em] text-ink">Plan &amp; billing</h1>
        <p className="mt-2 text-sm leading-6 text-ink/60">See your current plan and what each tier includes.</p>
      </div>

      <Link href="/settings/usage" className="mb-10 inline-flex items-center gap-2 text-[13px] font-medium text-accent transition hover:opacity-75"><ChartNoAxesCombined size={16} /> View usage and analytics <ArrowUpRight size={14} /></Link>

      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">Plans</p>
      <div className="grid gap-4 md:grid-cols-2">

        <div className="rounded-lg border border-ink/10 bg-workspace p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-xl font-medium">Free</span>
              {isFree && <span className="badge-accent">Current</span>}
            </div>
            <div className="mb-2">
              <span className="font-display text-[32px] font-medium">$0</span>
              <span className="ml-1 text-sm text-muted">forever</span>
            </div>
            <p className="mb-4 text-sm leading-6 text-ink/60">A useful place to begin, with no payment required.</p>
            <div className="divider mb-3" />
            <p className="text-[11px] font-bold text-faint uppercase tracking-[0.08em] mb-2">Features</p>
            {FREE_FEATURES.map((f) => (
              <div key={f} className="mb-2 flex items-center gap-2">
                <Check size={15} className="shrink-0 text-accent" />
                <span className="text-[13px] text-ink/70">{f}</span>
              </div>
            ))}
          </div>

        <div className="rounded-lg border border-accent/35 bg-card p-6 text-ink">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-xl font-medium">Pro</span>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">Coming soon</span>
            </div>
            <p className="mb-4 text-sm leading-6 text-ink/60">More room for the documents and questions you work with every day. Pricing will be shared before launch.</p>
            <div className="divider mb-3" />
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50">Everything in Free plus</p>
            {PRO_FEATURES.map((f) => (
              <div key={f} className="mb-2 flex items-center gap-2">
                <Check size={15} className="shrink-0" />
                <span className="text-[13px] text-ink/70">{f}</span>
              </div>
            ))}
            <Link href="/pricing" className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-bg transition hover:opacity-80">
              See Pro details <ArrowUpRight size={16} />
            </Link>
          </div>
      </div>
    </div>
  );
}
