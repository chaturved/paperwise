import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "@/lib/utils";

export function Separator({ className, ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      className={cn(
        "shrink-0 bg-line data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px",
        typeof className === "string" ? className : undefined,
      )}
      {...props}
    />
  );
}
