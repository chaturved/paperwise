"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const signedOutLinks = [
  { label: "Get started", href: "/signup" },
  { label: "Log in", href: "/login" },
];

const signedInLinks = [
  { label: "Workspace", href: "/dashboard" },
  { label: "Profile", href: "/settings/profile" },
];

export function SiteAccountLinks() {
  const { user, loading } = useAuth();
  const links = loading ? [] : user ? signedInLinks : signedOutLinks;

  return (
    <>
      {links.map((link) => <li key={link.href}><Link href={link.href} className="text-base text-white transition hover:text-white/70">{link.label}</Link></li>)}
    </>
  );
}
