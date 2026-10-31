"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const FREE_FEATURES = [
  "Up to 5 documents",
  "20 queries a day",
  "10 MB per file",
  "PDF, DOCX, TXT and Markdown files",
  "7 days of conversation history",
];

const PRO_FEATURES = ["Unlimited documents", "Unlimited queries", "50 MB per file", "Full conversation history"];

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm opacity-90">
      <Check size={16} strokeWidth={2.2} className="shrink-0" /> {children}
    </li>
  );
}

export function PlanCards() {
  const { user } = useAuth();
  const isFree = user?.plan === "free";

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card role="region" aria-label="Free plan" className={isFree ? "border-ink p-7" : "p-7"}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[28px] tracking-[-0.0125em]">Free</h2>
          {isFree && <Badge variant="solid">Current plan</Badge>}
        </div>
        <p className="mb-2">
          <span className="font-display text-[44px] tracking-[-0.0125em]">$0</span>
          <span className="ml-2 text-sm text-muted">forever</span>
        </p>
        <p className="mb-6 text-sm leading-relaxed text-muted">A useful place to begin, with no payment required.</p>
        <ul className="space-y-3 border-t border-line pt-5">
          {FREE_FEATURES.map((feature) => (
            <Feature key={feature}>{feature}</Feature>
          ))}
        </ul>
      </Card>

      <div role="region" aria-label="Pro plan" className="paint paint-warm flex flex-col rounded-lg p-7 text-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[28px] tracking-[-0.0125em]">Pro</h2>
          <Badge className="border-white/40 text-white/80">Coming soon</Badge>
        </div>
        <p className="mb-2 flex h-14 items-center text-[15px] text-white/70">Pricing will be shared before launch.</p>
        <p className="mb-6 text-sm leading-relaxed text-white/80">
          More room for the documents and questions you work with every day.
        </p>
        <div className="flex-1 border-t border-white/20 pt-5">
          <p className="mb-3 text-xs font-medium text-white/70">Everything in Free, plus</p>
          <ul className="space-y-3">
            {PRO_FEATURES.map((feature) => (
              <Feature key={feature}>{feature}</Feature>
            ))}
          </ul>
        </div>
        <Link href="/pricing" className={buttonVariants({ variant: "light", size: "lg", className: "mt-7 w-full" })}>
          See Pro details <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}
