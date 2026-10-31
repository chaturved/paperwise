"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendMagicLink } from "@/lib/api/auth";
import { rateLimitMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";

export function MagicLinkButton({ email }: { email: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await sendMagicLink(email);
      router.push(`/magic-link/sent?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(rateLimitMessage(err) ?? "We couldn't send the link. Please try again.");
      setSending(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={send}
      disabled={sending}
      variant="quiet"
      size="lg"
      className="w-full disabled:opacity-60"
    >
      {sending ? "Sending…" : "Email me a sign-in link"}
    </Button>
  );
}
