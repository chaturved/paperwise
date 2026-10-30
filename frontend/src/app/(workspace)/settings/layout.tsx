"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChartNoAxesCombined, CreditCard, LockKeyhole, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
      <nav aria-label="Account settings" className="shrink-0 border-b border-ink/10 bg-rail px-4 pb-4 pt-6 md:w-[300px] md:border-b-0 md:border-r md:px-3 md:pt-8">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3 rounded-md px-3 py-2 text-[14px] text-ink/70 transition hover:bg-ink/[0.06] hover:text-ink md:mb-10">
          <ArrowLeft size={18} /> Back to app
        </Link>
        <p className="mb-3 px-3 text-[12px] font-medium text-ink/50">Personal</p>
        <div className="flex gap-1 overflow-x-auto md:block md:space-y-1">
          {nav.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className={`flex h-11 shrink-0 items-center gap-3 rounded-md px-3 text-[13px] transition md:w-full ${pathname === href ? "bg-ink/[0.08] font-medium text-ink" : "text-ink/70 hover:bg-ink/[0.06] hover:text-ink"}`}>
              <Icon size={18} strokeWidth={1.7} /> {label}
            </Link>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between px-3 md:mt-7">
          <span className="text-[13px] text-ink/70">Appearance</span>
          <ThemeToggle />
        </div>
      </nav>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10 md:px-16 md:py-12">
        <div className={pathname === "/settings/usage" ? "max-w-[1080px]" : "max-w-[760px]"}>{children}</div>
      </div>
    </main>
  );
}
