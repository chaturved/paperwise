import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn("field min-h-24 resize-y py-3", className)} {...props} />;
}
