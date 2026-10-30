"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getSignInMethods } from "@/lib/api/auth";
import { rateLimitMessage } from "@/lib/api-error";
import { AuthHeading } from "./auth-shell";
import { EmailForm } from "./email-form";
import { PasswordlessSignIn } from "./passwordless-sign-in";
import { SignInPasswordForm } from "./sign-in-password-form";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_link: "This sign-in link has expired or already been used.",
  no_account: "No account found for that email. Please sign up.",
  oauth_failed: "Google sign-in failed. Please try again.",
};

interface Account {
  email: string;
  hasPassword: boolean;
}

export function SignInFlow() {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error && ERROR_MESSAGES[error]) toast.error(ERROR_MESSAGES[error]);
  }, [searchParams]);

  const continueWith = async (email: string) => {
    try {
      const { has_password } = await getSignInMethods(email);
      setAccount({ email, hasPassword: has_password });
    } catch (err) {
      const limited = rateLimitMessage(err);
      if (limited) {
        toast.error(limited);
        return;
      }
      setAccount({ email, hasPassword: true });
    }
  };

  if (account === null) {
    return (
      <>
        <AuthHeading title="Sign in to Paperwise" />
        <EmailForm submitLabel="Continue" busyLabel="Checking…" onSubmit={continueWith} />
        <p className="mt-5 text-center text-sm"><Link href="/contact" className="link-underline">Need help?</Link></p>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Welcome back">
        Signing in as <span className="font-medium text-ink">{account.email}</span>{" "}
        <button type="button" onClick={() => setAccount(null)} className="link-underline hover:text-ink">Change</button>
      </AuthHeading>
      {account.hasPassword ? <SignInPasswordForm email={account.email} /> : <PasswordlessSignIn email={account.email} />}
    </>
  );
}
