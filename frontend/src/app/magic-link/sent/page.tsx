import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { MagicLinkSent } from "@/components/auth/magic-link-sent";

export default function MagicLinkSentPage() {
  return (
    <AuthShell footer={<p>Need help? <Link href="/contact" className="link-underline font-medium text-ink">Contact support</Link></p>}>
      <Suspense>
        <MagicLinkSent />
      </Suspense>
    </AuthShell>
  );
}
