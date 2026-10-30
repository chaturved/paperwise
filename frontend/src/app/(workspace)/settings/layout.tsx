"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChartNoAxesCombined, CreditCard, LockKeyhole, UserRound } from "lucide-react";

const nav = [
  { label: "Profile", href: "/settings/profile", icon: UserRound },
  { label: "Security and login", href: "/settings/password", icon: LockKeyhole },
  { label: "Usage", href: "/settings/usage", icon: ChartNoAxesCombined },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-workspace text-ink md:flex-row">
      <nav aria-label="Account settings" className="shrink-0 border-b border-line bg-rail px-3 pb-3 pt-4 md:w-[300px] md:border-b-0 md:border-r md:pb-4 md:pt-5">
        <Link href="/dashboard" className="mb-3 flex h-10 items-center gap-3 rounded px-3 text-sm text-muted transition hover:bg-ink/[0.05] hover:text-ink md:mb-6">
          <ArrowLeft size={16} strokeWidth={1.8} /> Back to workspace
        </Link>
        <p className="mb-2 hidden px-3 text-xs font-medium text-muted md:block">Account</p>
        <div className="flex gap-1 overflow-x-auto md:block md:space-y-1">
          {nav.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`flex h-10 shrink-0 items-center gap-3 rounded px-3 text-sm transition md:w-full ${pathname === href ? "bg-ink/[0.08] font-medium text-ink" : "text-ink/75 hover:bg-ink/[0.05] hover:text-ink"}`}
            >
              <Icon size={17} strokeWidth={1.7} /> {label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-10 md:px-[72px] md:pb-16 md:pt-14">
        <div className={pathname === "/settings/usage" ? "max-w-[1040px]" : "max-w-[860px]"}>{children}</div>
      </div>
    </main>
  );
}
