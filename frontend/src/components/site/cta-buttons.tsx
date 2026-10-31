import Link from "next/link";
import { AuthActionLink } from "@/components/site/auth-action-link";
import { buttonVariants } from "@/components/ui/button";

interface Props {
  startLabel?: string;
}

export function HeroCtas({ startLabel = "Upload a file" }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <AuthActionLink signedOutLabel={startLabel} signedInLabel="Open your workspace" arrow="right" className={buttonVariants({ variant: "primary", size: "lg" })} />
      <Link href="/demo" className={buttonVariants({ variant: "secondary", size: "lg" })}>Request a demo</Link>
    </div>
  );
}

export function PaintedCtaButtons({ startLabel = "Upload a file" }: Props) {
  return (
    <>
      <AuthActionLink signedOutLabel={startLabel} signedInLabel="Go to workspace" arrow="right" className={buttonVariants({ variant: "light", size: "lg" })} />
      <Link href="/demo" className={buttonVariants({ variant: "outlineLight", size: "md" })}>Request a demo</Link>
    </>
  );
}
