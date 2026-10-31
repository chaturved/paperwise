import Link from "next/link";
import { AuthShell, AuthTerms } from "@/components/auth/auth-shell";
import { SignUpFlow } from "@/components/auth/sign-up-flow";

const PANEL = {
  headline: "Free to start. Nothing to set up.",
  quote: "Five documents and twenty questions a day, with no card needed.",
  source: "Free plan",
};

export default function SignupPage() {
  return (
    <AuthShell
      panel={PANEL}
      footer={
        <>
          <p className="mb-1.5">
            Already have an account?{" "}
            <Link href="/login" className="link-underline font-medium text-ink">
              Sign in
            </Link>
          </p>
          <AuthTerms action="creating an account" />
        </>
      }
    >
      <SignUpFlow />
    </AuthShell>
  );
}
