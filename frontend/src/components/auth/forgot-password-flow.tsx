"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { forgotPassword } from "@/lib/api/auth";
import { rateLimitMessage } from "@/lib/api-error";
import { AuthHeading } from "./auth-shell";
import { CheckEmail } from "./check-email";
import { EmailForm } from "./email-form";

export function ForgotPasswordFlow() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async (email: string) => {
    try {
      await forgotPassword(email);
      setSentTo(email);
    } catch (err) {
      toast.error(rateLimitMessage(err) ?? "Something went wrong. Please try again.");
    }
  };

  if (sentTo !== null) {
    return (
      <CheckEmail
        email={sentTo}
        lead="If an account exists for this address, we sent a link to choose a new password."
        note="If you cannot find it, check your spam folder."
        resend={() => forgotPassword(sentTo)}
        onChangeEmail={() => setSentTo(null)}
      />
    );
  }

  return (
    <>
      <AuthHeading title="Reset your password">Enter the email you signed up with. We will send you a link to choose a new password.</AuthHeading>
      <EmailForm submitLabel="Send reset link" busyLabel="Sending…" onSubmit={send} />
      <p className="mt-5 text-center text-sm"><Link href="/login" className="link-underline">Back to sign in</Link></p>
    </>
  );
}
