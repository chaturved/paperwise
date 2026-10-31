import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      className={cn("inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-field bg-transparent p-0.5 transition data-[checked]:border-ink data-[checked]:bg-ink disabled:cursor-not-allowed disabled:opacity-40", typeof className === "string" ? className : undefined)}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full bg-ink transition-transform data-[checked]:translate-x-4 data-[checked]:bg-bg" />
    </SwitchPrimitive.Root>
  );
}
