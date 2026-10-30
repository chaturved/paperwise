"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<React.ComponentProps<"input">, "type">;

export function PasswordInput({ className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`field pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-ink/55 transition hover:text-ink"
      >
        {visible ? <EyeOff size={18} strokeWidth={1.7} /> : <Eye size={18} strokeWidth={1.7} />}
      </button>
    </div>
  );
}
