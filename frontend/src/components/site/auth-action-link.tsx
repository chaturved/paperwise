"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AuthActionLinkProps {
  signedOutLabel: string;
  signedInLabel?: string;
  className: string;
  arrow?: "right" | "up-right";
}

export function AuthActionLink({
  signedOutLabel,
  signedInLabel = "Open your workspace",
  className,
  arrow = "up-right",
}: AuthActionLinkProps) {
  const { user, loading } = useAuth();
  const Icon = arrow === "right" ? ArrowRight : ArrowUpRight;

  if (loading) {
    return (
      <span role="status" aria-label="Checking account status" className={`${className} cursor-default opacity-50`}>
        <span className="h-3 w-28 animate-pulse rounded-full bg-current/25" />
      </span>
    );
  }

  return (
    <Link href={user ? "/dashboard" : "/signup"} className={className}>
      {user ? signedInLabel : signedOutLabel} <Icon size={16} />
    </Link>
  );
}
