"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Theme: ${preference}. Choose appearance`} className="inline-flex h-8 w-8 items-center justify-center rounded border border-line text-ink/70 transition hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <Icon size={18} strokeWidth={1.8} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-40 bg-bg shadow-xl">
        {options.map(({ value, label, icon: OptionIcon }) => (
          <DropdownMenuItem key={value} onClick={() => setPreference(value)} className="gap-3 px-3 py-2.5 text-sm">
            <OptionIcon size={16} className="text-ink/60" />
            <span className="flex-1">{label}</span>
            {preference === value && <Check size={15} className="text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
