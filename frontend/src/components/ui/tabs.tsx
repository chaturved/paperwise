import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

const listVariants = cva("group/tabs-list", {
  variants: {
    variant: {
      segmented: "inline-flex overflow-hidden rounded border border-field text-sm font-medium",
      line: "flex gap-7 border-b border-line",
    },
  },
  defaultVariants: { variant: "segmented" },
});

export function TabsList({
  className,
  variant = "segmented",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof listVariants>) {
  return (
    <TabsPrimitive.List
      data-variant={variant}
      className={cn(listVariants({ variant }), typeof className === "string" ? className : undefined)}
      {...props}
    />
  );
}

const SEGMENTED =
  "group-data-[variant=segmented]/tabs-list:h-10 group-data-[variant=segmented]/tabs-list:px-5 group-data-[variant=segmented]/tabs-list:hover:bg-ink/[0.05] group-data-[variant=segmented]/tabs-list:data-[active]:bg-ink group-data-[variant=segmented]/tabs-list:data-[active]:text-bg group-data-[variant=segmented]/tabs-list:[&:not(:first-child)]:border-l group-data-[variant=segmented]/tabs-list:[&:not(:first-child)]:border-field";
const LINE =
  "group-data-[variant=line]/tabs-list:-mb-px group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:border-transparent group-data-[variant=line]/tabs-list:px-1 group-data-[variant=line]/tabs-list:pb-3.5 group-data-[variant=line]/tabs-list:text-[15px] group-data-[variant=line]/tabs-list:text-muted group-data-[variant=line]/tabs-list:hover:text-ink group-data-[variant=line]/tabs-list:data-[active]:border-ink group-data-[variant=line]/tabs-list:data-[active]:font-medium group-data-[variant=line]/tabs-list:data-[active]:text-ink";

export function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink",
        SEGMENTED,
        LINE,
        typeof className === "string" ? className : undefined,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Panel;
