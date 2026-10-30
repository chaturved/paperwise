"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { sendMagicLink } from "@/lib/api/auth";
import { useState } from "react";
import { toast } from "sonner";
import { AuthBackground } from "@/components/auth/auth-background";

function MagicLinkSentContent() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await sendMagicLink(email);
      toast.success("Link resent!");
    } catch {
      toast.error("Failed to resend");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page relative">
      <AuthBackground />
      <div className="auth-panel text-center">
        <Link href="/" aria-label="Paperwise home" className="mx-auto mb-6 grid h-10 w-10 place-items-center rounded-lg bg-ink font-display text-xl leading-none text-bg">P</Link>

        <div className="w-14 h-14 rounded-lg border border-line flex items-center justify-center mx-auto mb-5 bg-card">
          <Mail className="h-6 w-6 text-ink" />
        </div>

        <h2 className="mb-2 font-display text-[40px] font-normal leading-tight tracking-[-0.0125em]">Check your email</h2>

        {email && (
          <p className="text-sm text-muted mb-1">
            We sent a sign-in link to <span className="text-ink font-medium">{email}</span>
          </p>
        )}

        <p className="text-sm text-faint mb-8">
          Click the link in that email to sign in. The link expires in 15 minutes.
        </p>

        <button
          onClick={handleResend}
          disabled={resending || !email}
          className="text-sm text-muted hover:text-ink disabled:opacity-50 transition mb-6 block mx-auto"
        >
          {resending ? "Sending…" : "Didn't get it? Resend"}
        </button>

        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-faint hover:text-muted transition">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function MagicLinkSentPage() {
  return (
    <Suspense>
      <MagicLinkSentContent />
    </Suspense>
  );
}
