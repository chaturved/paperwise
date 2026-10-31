"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusPage } from "@/components/layout/status-page";
import { Button, buttonVariants } from "@/components/ui/button";

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
          <Button type="button" onClick={reset} size="lg" className="px-6">
            Try again
          </Button>
          <Link href="/" className={buttonVariants({ variant: "secondary", size: "lg", className: "px-6" })}>
            Back to home
          </Link>
        </>
      }
    >
      Nothing you did caused this. Try again, or return to the start.
    </StatusPage>
  );
}
