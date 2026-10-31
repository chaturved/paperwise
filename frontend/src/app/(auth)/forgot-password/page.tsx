import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordFlow } from "@/components/auth/forgot-password-flow";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      footer={
        <p>
          Need help?{" "}
          <Link href="/contact" className="link-underline font-medium text-ink">
            Contact support
          </Link>
        </p>
      }
    >
      <ForgotPasswordFlow />
    </AuthShell>
  );
}
