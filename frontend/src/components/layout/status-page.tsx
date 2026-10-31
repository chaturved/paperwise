import Link from "next/link";

interface Props {
  label: string;
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}

export function StatusPage({ label, title, children, actions }: Props) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-5 py-6 text-ink sm:px-10 md:px-16 md:py-8">
      <Link href="/" className="font-display text-[26px] tracking-[-0.0125em]">Paperwise</Link>
      <main className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <p className="mb-5 font-mono text-sm text-muted">{label}</p>
        <h1 className="mb-5 max-w-[720px] font-display text-[44px] font-normal leading-[1.05] tracking-[-0.0125em] md:text-[64px]">{title}</h1>
        <p className="mb-8 max-w-[460px] text-[17px] leading-relaxed text-muted">{children}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>
      </main>
      <p className="text-center text-[13px] text-muted">Still stuck? <Link href="/contact" className="link-underline font-medium text-ink">Contact support</Link></p>
    </div>
  );
}
