import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-field bg-surface text-bg transition data-[checked]:border-ink data-[checked]:bg-ink data-[indeterminate]:border-ink data-[indeterminate]:bg-ink disabled:cursor-not-allowed disabled:opacity-40",
        typeof className === "string" ? className : undefined,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator keepMounted={false} className="flex items-center justify-center">
        <Check size={12} strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
