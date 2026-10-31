import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

type ContentProps = PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "side" | "align" | "sideOffset" | "collisionPadding">;

export function PopoverContent({
  className,
  side = "bottom",
  align = "center",
  sideOffset = 6,
  collisionPadding = 12,
  ...props
}: ContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="z-[100]"
      >
        <PopoverPrimitive.Popup
          className={cn(
            "w-72 max-w-[calc(100vw-24px)] rounded-lg border border-line bg-surface p-3 text-sm text-ink shadow-[0_8px_24px_rgba(0,0,0,0.12)] outline-none dark:shadow-black/50",
            typeof className === "string" ? className : undefined,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
