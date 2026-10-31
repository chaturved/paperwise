import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return <TabsPrimitive.List className={cn("inline-flex overflow-hidden rounded border border-field text-sm font-medium", typeof className === "string" ? className : undefined)} {...props} />;
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn("h-10 px-5 transition hover:bg-ink/[0.05] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink data-[active]:bg-ink data-[active]:text-bg [&:not(:first-child)]:border-l [&:not(:first-child)]:border-field", typeof className === "string" ? className : undefined)}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Panel;
