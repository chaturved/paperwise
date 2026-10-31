"use client";

import { useSearchParams } from "next/navigation";
import { sendMagicLink } from "@/lib/api/auth";
import { CheckEmail } from "./check-email";

export function MagicLinkSent() {
  const email = useSearchParams().get("email") ?? "";

  return (
    <CheckEmail
      email={email}
      lead="We sent a sign-in link to"
      note="Open the link in that email to sign in. It expires in 15 minutes. If you cannot find it, check your spam folder."
      resend={() => sendMagicLink(email)}
    />
  );
}
