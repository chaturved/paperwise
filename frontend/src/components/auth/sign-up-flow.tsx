"use client";

import { useState } from "react";
import { toast } from "sonner";
import { emailExists } from "@/lib/api/auth";
import { rateLimitMessage } from "@/lib/api-error";
import { AuthHeading } from "./auth-shell";
import { EmailForm } from "./email-form";
import { GoogleButton, OrDivider } from "./google-button";
import { SignUpDetailsForm } from "./sign-up-details-form";
import { Button } from "@/components/ui/button";

const TAKEN_MESSAGE = "An account with this email already exists. Sign in instead.";

export function SignUpFlow() {
  const [email, setEmail] = useState<string | null>(null);

  const continueWith = async (value: string) => {
    try {
      if ((await emailExists(value)).exists) return TAKEN_MESSAGE;
    } catch (err) {
      const limited = rateLimitMessage(err);
      if (limited) {
        toast.error(limited);
        return;
      }
    }
    setEmail(value);
  };

  if (email === null) {
    return (
      <>
        <AuthHeading title="Create your account">Free to start. No card needed.</AuthHeading>
        <GoogleButton />
        <OrDivider label="or use email" />
        <EmailForm submitLabel="Continue" busyLabel="Checking…" onSubmit={continueWith} />
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Create your account">
        Using <span className="font-medium text-ink">{email}</span>{" "}
        <Button type="button" onClick={() => setEmail(null)} variant="link" size="inline" className="hover:text-ink">
          Change
        </Button>
      </AuthHeading>
      <SignUpDetailsForm email={email} />
    </>
  );
}
