import Link from "next/link";
import { AuthActionLink } from "@/components/site/auth-action-link";

interface Props {
  startLabel?: string;
}

/** The two actions every marketing page ends on, for a light background. */
export function HeroCtas({ startLabel = "Upload a file" }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <AuthActionLink signedOutLabel={startLabel} signedInLabel="Open your workspace" arrow="right" className="btn-primary btn-lg" />
      <Link href="/demo" className="btn-secondary btn-lg">Request a demo</Link>
    </div>
  );
}

/** The same two actions for the painted call-to-action block. */
export function PaintedCtaButtons({ startLabel = "Upload a file" }: Props) {
  return (
    <>
      <AuthActionLink signedOutLabel={startLabel} signedInLabel="Go to workspace" arrow="right" className="btn-light" />
      <Link href="/demo" className="btn-outline-light">Request a demo</Link>
    </>
  );
}
