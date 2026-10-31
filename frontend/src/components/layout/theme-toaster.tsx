"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster position="bottom-right" theme={resolvedTheme} />;
}
