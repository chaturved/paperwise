import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2.5 text-xs font-medium", {
  variants: {
    variant: {
      outline: "border-field text-ink",
      solid: "border-ink bg-ink text-bg",
      muted: "border-transparent bg-ink/[0.06] text-muted",
      danger: "border-danger text-danger",
    },
  },
  defaultVariants: { variant: "outline" },
});

interface Props extends React.ComponentProps<"span">, VariantProps<typeof variants> {}

export function Badge({ variant, className, ...props }: Props) {
  return <span className={cn(variants({ variant }), className)} {...props} />;
}
