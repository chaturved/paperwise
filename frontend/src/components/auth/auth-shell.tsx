import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface Panel {
  headline: string;
  quote?: string;
  source?: string;
}

interface Props {
  children: React.ReactNode;
  footer?: React.ReactNode;
  panel?: Panel;
}

const DEFAULT_PANEL: Panel = { headline: "The document assistant you can check." };

export function AuthShell({ children, footer, panel = DEFAULT_PANEL }: Props) {
  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      <div className="flex min-w-0 flex-1 flex-col px-5 py-6 sm:px-10 md:px-16 md:py-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="font-display text-[26px] tracking-[-0.0125em]">Paperwise</Link>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[380px]">{children}</div>
        </main>
        {footer && <footer className="text-center text-[13px] leading-relaxed text-muted">{footer}</footer>}
      </div>

      <aside aria-hidden="true" className="paint relative hidden w-[42%] shrink-0 flex-col justify-between p-14 xl:flex">
        <p className="max-w-[420px] font-display text-[40px] leading-[1.1] tracking-[-0.0125em] text-white">{panel.headline}</p>
        {panel.quote && (
          <div className="max-w-[440px]">
            <p className="font-display text-2xl leading-[1.35] tracking-[-0.0125em] text-white">{panel.quote}</p>
            {panel.source && <p className="mt-4 font-mono text-[13px] text-white/75">{panel.source}</p>}
          </div>
        )}
      </aside>
    </div>
  );
}

export function AuthHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="font-display text-[42px] font-normal leading-[1.05] tracking-[-0.0125em]">{title}</h1>
      {children && <div className="mt-3 text-[15px] leading-relaxed text-muted">{children}</div>}
    </div>
  );
}

export function AuthTerms({ action = "continuing" }: { action?: string }) {
  return (
    <p>
      By {action}, you agree to the <Link href="/terms" className="link-underline">Terms</Link> and <Link href="/privacy" className="link-underline">Privacy Policy</Link>.
    </p>
  );
}
