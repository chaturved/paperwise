"use client";

import { useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChartNoAxesCombined, ChevronRight, CreditCard, LockKeyhole, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLogout } from "@/hooks/useLogout";

const ITEM_CLASS = "flex cursor-pointer items-center gap-3 rounded px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-ink/[0.06]";

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
          className="flex h-14 w-full shrink-0 items-center gap-3 rounded px-3 text-left transition hover:bg-ink/[0.05] data-[state=open]:bg-ink/[0.06]"
        >
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-bg">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-muted">{user?.email}</span>
          </span>
          <ChevronRight size={16} className={`shrink-0 text-ink/45 transition-transform ${open ? "-rotate-90" : ""}`} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[100] w-[272px] max-w-[calc(100vw-24px)] rounded-lg border border-line bg-surface p-1.5 text-ink shadow-[0_16px_48px_rgba(0,0,0,0.14)] outline-none dark:shadow-black/50"
        >
          <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs font-medium text-muted">Account</DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <Link href="/settings/profile" className={ITEM_CLASS}><UserRound size={17} className="text-ink/60" /> Profile</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/settings/password" className={ITEM_CLASS}><LockKeyhole size={17} className="text-ink/60" /> Security and login</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/settings/usage" className={ITEM_CLASS}><ChartNoAxesCombined size={17} className="text-ink/60" /> Usage</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/settings/billing" className={ITEM_CLASS}><CreditCard size={17} className="text-ink/60" /> Plan and billing</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1.5 h-px bg-line" />
          <DropdownMenu.Item onSelect={handleLogout} className={ITEM_CLASS}><LogOut size={17} className="text-ink/60" /> Log out</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
