import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "border border-ink bg-ink text-bg hover:opacity-85",
        secondary: "border border-ink bg-transparent text-ink hover:bg-ink/[0.06]",
        quiet: "border border-line bg-surface text-ink hover:border-field",
        link: "rounded-none font-normal link-underline",
        ghost: "text-muted hover:bg-ink/[0.06] hover:text-ink",
        light: "border border-[#faf9f7] bg-[#faf9f7] text-[#0f0e0d] hover:opacity-90",
        outlineLight: "border border-white/85 text-white hover:bg-white/[0.12]",
        danger: "border border-danger bg-transparent text-danger hover:bg-danger/[0.08]",
        dangerSolid: "border border-danger bg-danger text-bg hover:opacity-90",
      },
      size: {
        xs: "h-7 px-2 text-[13px]",
        sm: "min-h-8 px-3 text-sm",
        md: "min-h-9 px-3 text-sm",
        default: "min-h-10 px-5 text-sm",
        lg: "min-h-12 px-5 text-base",
        icon: "h-8 w-8",
        inline: "gap-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export function buttonVariants(props?: Parameters<typeof variants>[0]): string {
  return cn(variants(props));
}

export type ButtonVariants = VariantProps<typeof buttonVariants>;

type Props = ButtonPrimitive.Props & ButtonVariants;

export function Button({ variant, size, className, ...props }: Props) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size }), typeof className === "string" ? className : undefined)} {...props} />;
}
