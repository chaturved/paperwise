"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AuthHeading } from "./auth-shell";
import { EmailForm } from "./email-form";
import { SignInPasswordForm } from "./sign-in-password-form";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_link: "This sign-in link has expired or already been used.",
  no_account: "No account found for that email. Please sign up.",
  oauth_failed: "Google sign-in failed. Please try again.",
};

export function SignInFlow() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error && ERROR_MESSAGES[error]) toast.error(ERROR_MESSAGES[error]);
  }, [searchParams]);

  if (email === null) {
    return (
      <>
        <AuthHeading title="Sign in to Paperwise" />
        <EmailForm submitLabel="Continue" onSubmit={setEmail} />
        <p className="mt-5 text-center text-sm"><Link href="/contact" className="link-underline">Need help?</Link></p>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Welcome back">
        Signing in as <span className="font-medium text-ink">{email}</span>{" "}
        <button type="button" onClick={() => setEmail(null)} className="link-underline hover:text-ink">Change</button>
      </AuthHeading>
      <SignInPasswordForm email={email} />
    </>
  );
}
