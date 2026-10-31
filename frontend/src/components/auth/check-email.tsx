"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { rateLimitMessage } from "@/lib/api-error";
import { AuthHeading } from "./auth-shell";
import { Button } from "@/components/ui/button";

interface Props {
  email: string;
  lead: string;
  note: string;
  resend: () => Promise<unknown>;
  onChangeEmail?: () => void;
}

export function CheckEmail({ email, lead, note, resend, onChangeEmail }: Props) {
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await resend();
      toast.success("Email sent again");
    } catch (err) {
      toast.error(rateLimitMessage(err) ?? "We couldn't resend the email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="text-center">
      <AuthHeading title="Check your email">
        <p>{lead}</p>
        {email && <p className="mt-1 text-base font-medium text-ink">{email}</p>}
      </AuthHeading>
      <p className="mb-8 text-sm leading-relaxed text-muted">{note}</p>
      <Button
        type="button"
        onClick={handleResend}
        disabled={resending || !email}
        variant="secondary"
        size="lg"
        className="w-full disabled:opacity-60"
      >
        {resending ? "Sending…" : "Resend the email"}
      </Button>
      <p className="mt-5 text-sm">
        {onChangeEmail ? (
          <Button type="button" onClick={onChangeEmail} variant="link" size="inline">
            Use a different email
          </Button>
        ) : (
          <Link href="/login" className="link-underline">
            Back to sign in
          </Link>
        )}
      </p>
    </div>
  );
}
