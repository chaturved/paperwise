"use client";

import { useEffect, useState } from "react";
import { getUsage } from "@/lib/api/users";
import type { Usage } from "@/types";

export function useAccountUsage(refreshKey = 0) {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let active = true;
    getUsage()
      .then((next) => { if (active) setUsage(next); })
      .catch(() => { /* Keep the last numbers while the API recovers. */ });
    return () => { active = false; };
  }, [refreshKey]);

  return usage;
}
