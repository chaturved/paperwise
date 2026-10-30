"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusPage } from "@/components/ui/status-page";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      label="Something went wrong"
      title="We hit a problem loading this page."
      actions={
        <>
          <button type="button" onClick={reset} className="btn-primary btn-lg px-6">Try again</button>
          <Link href="/" className="btn-secondary btn-lg px-6">Back to home</Link>
        </>
      }
    >
      Nothing you did caused this. Try again, or return to the start.
    </StatusPage>
  );
}
