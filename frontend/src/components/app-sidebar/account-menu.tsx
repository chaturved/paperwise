"use client";

import { useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChartNoAxesCombined, ChevronRight, CreditCard, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLogout } from "@/hooks/useLogout";

const ITEM_CLASS = "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-[13px] outline-none data-[highlighted]:bg-ink/[0.07]";

export function AccountMenu() {
  const { user } = useAuth();
  const handleLogout = useLogout();
  const [open, setOpen] = useState(false);

  const name = user?.full_name || "Account";
  const initials = user?.avatar_initials || user?.full_name?.slice(0, 2).toUpperCase() || "PW";

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${name} menu`}
          className="flex h-[74px] w-full shrink-0 items-center gap-3 border-t border-ink/10 px-4 text-left transition hover:bg-ink/[0.05] data-[state=open]:bg-ink/[0.06]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink text-[11px] font-semibold text-bg">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{name}</span>
            <span className="block text-[11px] text-ink/50">{user?.plan === "pro" ? "Pro" : "Free"}</span>
          </span>
          <ChevronRight size={16} className={`text-ink/40 transition-transform ${open ? "-rotate-90" : ""}`} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={10}
          collisionPadding={12}
          className="z-[100] w-[288px] max-w-[calc(100vw-24px)] rounded-lg border border-ink/10 bg-card p-2 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.18)] outline-none dark:shadow-black/50"
        >
          <div className="flex items-center gap-3 rounded-md bg-ink/[0.04] px-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink text-[11px] font-semibold text-bg">{initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{name}</span>
              <span className="block truncate text-[11px] text-ink/50">{user?.email}</span>
            </span>
          </div>
          <DropdownMenu.Label className="px-3 pb-1 pt-3 text-[11px] font-medium text-ink/45">Account</DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <Link href="/settings/profile" className={ITEM_CLASS}><UserRound size={17} className="text-ink/60" /> Profile</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/settings/usage" className={ITEM_CLASS}><ChartNoAxesCombined size={17} className="text-ink/60" /> Usage &amp; analytics</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/settings/billing" className={ITEM_CLASS}><CreditCard size={17} className="text-ink/60" /> Plan &amp; billing</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-2 h-px bg-ink/10" />
          <DropdownMenu.Item onSelect={handleLogout} className={ITEM_CLASS}><LogOut size={17} className="text-ink/60" /> Log out</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
