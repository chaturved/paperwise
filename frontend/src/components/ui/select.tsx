import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;

export function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "inline-flex h-9 items-center justify-between gap-2 rounded border border-line bg-transparent px-3 text-[13px] text-ink outline-none transition hover:border-field focus-visible:border-ink data-[popup-open]:border-ink",
        typeof className === "string" ? className : undefined,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="text-ink/55">
        <ChevronDown size={14} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export const SelectValue = SelectPrimitive.Value;

export function SelectContent({ className, ...props }: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-[100]">
        <SelectPrimitive.Popup
          className={cn(
            "min-w-[var(--anchor-width)] rounded-lg border border-line bg-surface p-1.5 text-ink shadow-[0_8px_24px_rgba(0,0,0,0.12)] outline-none dark:shadow-black/50",
            typeof className === "string" ? className : undefined,
          )}
          {...props}
        />
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13.5px] outline-none data-[highlighted]:bg-ink/[0.06]",
        typeof className === "string" ? className : undefined,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator>
        <Check size={14} className="text-ink/60" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
