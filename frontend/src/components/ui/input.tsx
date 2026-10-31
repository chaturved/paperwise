import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputPrimitive.Props) {
  return <InputPrimitive className={cn("field", typeof className === "string" ? className : undefined)} {...props} />;
}
