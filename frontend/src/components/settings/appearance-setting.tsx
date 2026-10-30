"use client";

import { useTheme, type ThemePreference } from "@/context/ThemeContext";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function AppearanceSetting() {
  const { preference, setPreference } = useTheme();

  return (
    <div role="radiogroup" aria-label="Appearance" className="inline-flex overflow-hidden rounded border border-field text-sm font-medium">
      {OPTIONS.map(({ value, label }, index) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          onClick={() => setPreference(value)}
          className={`h-10 px-5 transition ${index > 0 ? "border-l border-field" : ""} ${preference === value ? "bg-ink text-bg" : "hover:bg-ink/[0.05]"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
