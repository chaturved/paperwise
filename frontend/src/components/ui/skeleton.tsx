import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("shimmer-line rounded-[3px]", className)} {...props} />;
}
