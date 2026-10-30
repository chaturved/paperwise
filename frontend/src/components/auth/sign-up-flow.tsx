"use client";

import { useState } from "react";
import { AuthHeading } from "./auth-shell";
import { EmailForm } from "./email-form";
import { GoogleButton, OrDivider } from "./google-button";
import { SignUpDetailsForm } from "./sign-up-details-form";

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
        <button type="button" onClick={() => setEmail(null)} className="link-underline hover:text-ink">Change</button>
      </AuthHeading>
      <SignUpDetailsForm email={email} />
    </>
  );
}
