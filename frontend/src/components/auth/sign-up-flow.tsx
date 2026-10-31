"use client";

import { useState } from "react";
import { AuthHeading } from "./auth-shell";
import { EmailForm } from "./email-form";
import { GoogleButton, OrDivider } from "./google-button";
import { SignUpDetailsForm } from "./sign-up-details-form";
import { Button } from "@/components/ui/button";

export function SignUpFlow() {
  const [email, setEmail] = useState<string | null>(null);

  if (email === null) {
    return (
      <>
        <AuthHeading title="Create your account">Free to start. No card needed.</AuthHeading>
        <GoogleButton />
        <OrDivider label="or use email" />
        <EmailForm submitLabel="Continue" onSubmit={setEmail} />
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Create your account">
        Using <span className="font-medium text-ink">{email}</span>{" "}
        <Button type="button" onClick={() => setEmail(null)} variant="link" size="inline" className="hover:text-ink">Change</Button>
      </AuthHeading>
      <SignUpDetailsForm email={email} />
    </>
  );
}
