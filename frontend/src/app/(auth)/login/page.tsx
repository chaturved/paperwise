import { Suspense } from "react";
import Link from "next/link";
import { AuthShell, AuthTerms } from "@/components/auth/auth-shell";
import { SignInFlow } from "@/components/auth/sign-in-flow";

const PANEL = {
  headline: "The document assistant you can check.",
  quote: "“Either party may terminate this Agreement by giving thirty (30) days’ written notice to the other party.”",
  source: "client-agreement.pdf · page 4",
};

export default function LoginPage() {
  return (
    <AuthShell
      panel={PANEL}
      footer={
        <>
          <p className="mb-1.5">New to Paperwise? <Link href="/signup" className="link-underline font-medium text-ink">Get started free</Link>, no card needed.</p>
          <AuthTerms />
        </>
      }
    >
      <Suspense>
        <SignInFlow />
      </Suspense>
    </AuthShell>
  );
}
