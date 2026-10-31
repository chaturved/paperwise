"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export function PromoBar() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="relative bg-ink px-12 py-2 text-center text-sm font-medium text-bg">
      Paperwise Free is open to everyone. Pro is coming soon.
      <Link href="/pricing" className="ml-3 underline underline-offset-2">
        Join the waitlist
      </Link>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => setVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
      >
        <X size={16} />
      </button>
    </div>
  );
}
