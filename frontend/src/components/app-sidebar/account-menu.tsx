"use client";

import { useState } from "react";
import Link from "next/link";
import { ChartNoAxesCombined, ChevronRight, CreditCard, LockKeyhole, LogOut, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useLogout } from "@/hooks/useLogout";

const ITEM_CLASS = "gap-3 px-3 py-2.5 text-sm";

export function AccountMenu() {
  const { user } = useAuth();
  const handleLogout = useLogout();
  const [open, setOpen] = useState(false);

  const name = user?.full_name || "Account";
  const initials = user?.avatar_initials || user?.full_name?.slice(0, 2).toUpperCase() || "PW";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={`${name} menu`}
        className="flex h-14 w-full shrink-0 items-center gap-3 rounded px-3 text-left transition hover:bg-ink/[0.05] data-[popup-open]:bg-ink/[0.06]"
      >
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-bg">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted">{user?.email}</span>
        </span>
        <ChevronRight size={16} className={`shrink-0 text-ink/45 transition-transform ${open ? "-rotate-90" : ""}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" sideOffset={8} className="w-[272px] shadow-[0_16px_48px_rgba(0,0,0,0.14)]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 pb-1 pt-2 font-medium">Account</DropdownMenuLabel>
          <DropdownMenuLinkItem render={<Link href="/settings/profile" />} className={ITEM_CLASS}>
            <UserRound size={17} className="text-ink/60" /> Profile
          </DropdownMenuLinkItem>
          <DropdownMenuLinkItem render={<Link href="/settings/password" />} className={ITEM_CLASS}>
            <LockKeyhole size={17} className="text-ink/60" /> Security and login
          </DropdownMenuLinkItem>
          <DropdownMenuLinkItem render={<Link href="/settings/usage" />} className={ITEM_CLASS}>
            <ChartNoAxesCombined size={17} className="text-ink/60" /> Usage
          </DropdownMenuLinkItem>
          <DropdownMenuLinkItem render={<Link href="/settings/billing" />} className={ITEM_CLASS}>
            <CreditCard size={17} className="text-ink/60" /> Plan and billing
          </DropdownMenuLinkItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className={ITEM_CLASS}>
          <LogOut size={17} className="text-ink/60" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
