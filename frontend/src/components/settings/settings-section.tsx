export function SettingsHeading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <header className="mb-10">
      <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.0125em] sm:text-[44px]">
        {title}
      </h1>
      <p className="mt-2 text-base text-muted">{children}</p>
    </header>
  );
}

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SectionProps) {
  return (
    <section
      aria-label={title}
      className="grid gap-4 border-t border-line py-8 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10"
    >
      <div>
        <h2 className="mb-1.5 text-base font-semibold">{title}</h2>
        {description && <p className="text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
