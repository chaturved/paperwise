import Link from "next/link";
import { SiteAccountLinks } from "@/components/site/site-account-links";
import { footerColumns } from "@/components/site/nav-data";

export function SiteFooter() {
  return (
    <footer className="bg-[#0f0e0d] px-5 pb-10 pt-16 text-white md:px-8">
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1.1fr_repeat(6,1fr)]">
        <div className="text-[15px] leading-snug text-white/50 lg:self-end">
          <Link href="/" className="mb-10 block font-display text-[28px] leading-none tracking-[-0.02em] text-white">Paperwise</Link>
          Copyright © {new Date().getFullYear()}<br />Paperwise.<br />All rights reserved.
        </div>
        {footerColumns.map((column) => (
          <div key={column.heading}>
            <h2 className="mb-4 text-sm font-medium text-white/50">{column.heading}</h2>
            <ul className="space-y-3.5">
              {column.links.map((link) => <li key={link.label}><Link href={link.href} className="text-base text-white transition hover:text-white/70">{link.label}</Link></li>)}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="mb-4 text-sm font-medium text-white/50">Account</h2>
          <ul className="space-y-3.5"><SiteAccountLinks /></ul>
        </div>
      </div>
    </footer>
  );
}
