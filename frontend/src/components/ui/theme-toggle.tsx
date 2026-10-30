"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Laptop, Moon, Sun } from "lucide-react";
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
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label={`Theme: ${preference}. Choose appearance`} className="inline-flex h-8 w-8 items-center justify-center rounded border border-line text-ink/70 transition hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <Icon size={18} strokeWidth={1.8} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={8} align="end" className="z-[100] min-w-40 rounded-lg border border-line bg-bg p-1.5 text-ink shadow-xl">
          {options.map(({ value, label, icon: OptionIcon }) => (
            <DropdownMenu.Item key={value} onSelect={() => setPreference(value)} className="flex cursor-pointer items-center gap-3 rounded px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-ink/5">
              <OptionIcon size={16} className="text-ink/60" />
              <span className="flex-1">{label}</span>
              {preference === value && <Check size={15} className="text-accent" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
