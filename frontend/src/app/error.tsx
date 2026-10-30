"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, RotateCcw, TriangleAlert } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-5 py-12 text-center text-ink">
      <div className="mx-auto max-w-2xl">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-lg bg-card text-ink"><TriangleAlert size={25} /></div>
        <p className="mb-5 text-base text-ink/55">We hit a problem</p>
        <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.0125em] md:text-[56px]">Something went wrong.</h1>
        <p className="mx-auto mt-6 max-w-lg text-[17px] leading-7 text-ink/60">
          We couldn&apos;t load this page. Try again, or return to the home page.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary btn-lg"><RotateCcw size={16} /> Try again</button>
          <Link href="/" className="btn-secondary btn-lg">Go home <ArrowRight size={16} /></Link>
        </div>
      </div>
    </div>
  );
}
