"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import AppSidebar from "@/components/app-sidebar";
import { AppLayoutProvider, useAppLayout } from "@/context/AppLayoutContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCallbacks } = useAppLayout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isDetailView = pathname.startsWith("/settings");

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const closeOnSelect = (id: number) => {
    sidebarCallbacks.onConvSelect?.(id);
    setMobileMenuOpen(false);
  };

  const closeOnNewChat = () => {
    sidebarCallbacks.onNewChat?.();
    setMobileMenuOpen(false);
  };

  if (isDetailView) return <div className="flex h-dvh min-w-0 bg-workspace text-ink">{children}</div>;

  return (
    <div className="flex h-dvh min-w-0 flex-col bg-workspace text-ink md:flex-row">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-ink/10 bg-rail px-4 md:hidden">
        <span className="text-sm font-semibold tracking-tight">paperwise<span className="text-accent">.</span></span>
        <div className="flex items-center gap-2"><ThemeToggle /><button type="button" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-sm border border-ink/15"><Menu size={18} /></button></div>
      </div>
      {mobileMenuOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileMenuOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 w-[300px] max-w-[calc(100vw-3rem)] transition-transform duration-200 md:static md:z-auto md:w-[300px] md:max-w-none md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button type="button" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-ink/60 md:hidden"><X size={18} /></button>
        <AppSidebar {...sidebarCallbacks} onConvSelect={sidebarCallbacks.onConvSelect ? closeOnSelect : undefined} onNewChat={sidebarCallbacks.onNewChat ? closeOnNewChat : undefined} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 [&>main]:rounded-none [&>main]:border-0">{children}</div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayoutProvider>
      <AppShell>{children}</AppShell>
    </AppLayoutProvider>
  );
}
