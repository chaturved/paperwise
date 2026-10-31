import { Menu } from "@base-ui/react/menu";
import { Separator } from "@base-ui/react/separator";
import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuGroup = Menu.Group;

type ContentProps = Menu.Popup.Props &
  Pick<Menu.Positioner.Props, "side" | "align" | "sideOffset" | "collisionPadding">;

export function DropdownMenuContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  collisionPadding = 12,
  ...props
}: ContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="z-[100]"
      >
        <Menu.Popup
          className={cn(
            "max-w-[calc(100vw-24px)] rounded-lg border border-line bg-surface p-1.5 text-ink shadow-[0_8px_24px_rgba(0,0,0,0.12)] outline-none dark:shadow-black/50",
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

const ITEM =
  "flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13.5px] outline-none data-[highlighted]:bg-ink/[0.06]";

export function DropdownMenuItem({ className, ...props }: Menu.Item.Props) {
  return <Menu.Item className={cn(ITEM, className as string | undefined)} {...props} />;
}

export function DropdownMenuLinkItem({ className, ...props }: Menu.LinkItem.Props) {
  return <Menu.LinkItem className={cn(ITEM, className as string | undefined)} {...props} />;
}

export function DropdownMenuLabel({ className, ...props }: Menu.GroupLabel.Props) {
  return (
    <Menu.GroupLabel
      className={cn("px-2.5 pb-1 pt-1.5 text-xs text-muted", className as string | undefined)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: Separator.Props) {
  return <Separator className={cn("my-1.5 h-px bg-line", className as string | undefined)} {...props} />;
}
