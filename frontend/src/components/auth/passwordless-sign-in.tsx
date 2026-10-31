import Link from "next/link";
import { GoogleButton } from "./google-button";
import { MagicLinkButton } from "./magic-link-button";

export function PasswordlessSignIn({ email }: { email: string }) {
  return (
    <>
      <p className="mb-6 text-center text-sm leading-relaxed text-muted">
        This account signs in without a password. Continue with Google, or we can email you a sign-in link.
      </p>
      <div className="space-y-3">
        <GoogleButton />
        <MagicLinkButton email={email} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Prefer a password?{" "}
        <Link href="/forgot-password" className="link-underline hover:text-ink">
          Set one
        </Link>
      </p>
    </>
  );
}
