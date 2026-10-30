"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/context/AuthContext";
import { PromoBar } from "@/components/site/promo-bar";
import { megaMenus, navLinks, type MenuItem } from "@/components/site/nav-data";

interface SiteNavProps {
  showLogin?: boolean;
}

function MenuLink({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  return (
    <Link href={item.href} onClick={onNavigate} className="mb-6 block max-w-[360px]">
      <span className="inline-flex items-center gap-2 text-[15px] font-medium">
        {item.label}
        {item.badge && <span className="rounded-[2px] bg-[#f4ec1e] px-1.5 py-px text-[11px] font-medium tracking-wide text-[#0f0e0d]">{item.badge}</span>}
      </span>
      <span className="mt-1 block text-[14.5px] leading-snug text-ink/60">{item.description}</span>
    </Link>
  );
}

export function SiteNav({ showLogin = true }: SiteNavProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();
  const activeMenu = megaMenus.find((menu) => menu.id === openId);
  const close = () => setOpenId(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="sticky top-0 z-50">
      <PromoBar />
      <header onMouseLeave={close} className={`relative bg-bg ${activeMenu ? "border-b border-line" : ""}`}>
        <nav aria-label="Main navigation" className="mx-auto flex h-[72px] max-w-[1280px] items-center gap-8 px-5 md:px-8">
          <Link href="/" onClick={() => { close(); setMobileOpen(false); }} className="font-display text-[28px] leading-none tracking-[-0.02em]">Paperwise</Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {megaMenus.map((menu) => (
              <li key={menu.id}>
                <button
                  type="button"
                  aria-expanded={openId === menu.id}
                  onClick={() => setOpenId(openId === menu.id ? null : menu.id)}
                  onMouseEnter={() => setOpenId(menu.id)}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-[25px] text-[14.5px] font-medium transition-colors ${activeMenu && openId !== menu.id ? "text-ink/55" : ""}`}
                >
                  {menu.label}
                  <ChevronDown size={14} className={`transition-transform ${openId === menu.id ? "rotate-180" : ""}`} />
                  {openId === menu.id && <span className="absolute inset-x-3 bottom-0 h-px bg-ink" />}
                </button>
              </li>
            ))}
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onMouseEnter={close} className={`inline-flex px-3 py-[25px] text-[14.5px] font-medium transition-colors ${activeMenu ? "text-ink/55" : ""}`}>{link.label}</Link>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {loading ? <span className="h-8 w-20 animate-pulse rounded bg-ink/10 sm:w-40" aria-hidden="true" /> : user ? (
              <>
                <Link href="/settings/profile" className="btn-secondary hidden sm:inline-flex !min-h-8 !px-3 !text-sm">Profile</Link>
                <Link href="/dashboard" className="btn-primary !min-h-8 !px-3">Open workspace</Link>
              </>
            ) : (
              <>
                {showLogin && <Link href="/login" className="btn-secondary hidden sm:inline-flex !min-h-8 !px-3">Log in</Link>}
                <Link href="/signup" className="btn-primary !min-h-8 !px-3">Get started</Link>
              </>
            )}
            <button type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)} className="grid h-8 w-9 place-items-center rounded border border-line lg:hidden">
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </nav>

        {activeMenu && (
          <div className="absolute inset-x-0 top-full hidden border-b border-line bg-bg lg:block">
            <div className="mx-auto grid max-w-[1280px] grid-cols-[1fr_1fr_1.05fr] gap-10 px-8 pb-10 pt-10">
              {activeMenu.columns.map((column, index) => (
                <div key={index}>{column.map((item) => <MenuLink key={item.label} item={item} onNavigate={close} />)}</div>
              ))}
              <Link href={activeMenu.feature.href} onClick={close} className="block">
                <div className={`paint ${activeMenu.feature.tone === "warm" ? "paint-warm" : ""} h-56 rounded-lg`} />
                <span className="mt-5 block text-[15px] font-medium">{activeMenu.feature.title}</span>
                <span className="mt-1 block text-[14.5px] text-ink/60">{activeMenu.feature.description}</span>
              </Link>
            </div>
          </div>
        )}

        {mobileOpen && (
          <div className="border-t border-line bg-bg px-5 pb-4 lg:hidden">
            {[...megaMenus.flatMap((menu) => menu.columns.flat().slice(0, 2)), ...navLinks.map((link) => ({ label: link.label, href: link.href }))].map((item) => (
              <Link key={item.href + item.label} href={item.href} onClick={() => setMobileOpen(false)} className="block border-b border-line py-3 text-[15px] font-medium">{item.label}</Link>
            ))}
            {!loading && !user && showLogin && <Link href="/login" onClick={() => setMobileOpen(false)} className="block border-b border-line py-3 text-[15px] font-medium">Log in</Link>}
          </div>
        )}
      </header>
    </div>
  );
}
