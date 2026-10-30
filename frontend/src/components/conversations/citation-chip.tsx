const CHIP = "mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-accent/15 px-1.5 font-mono text-xs font-medium text-accent";

interface Props {
  n: number;
  onSelect: (n: number) => void;
}

export function CitationChip({ n, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(n)}
      aria-label={`Show source ${n}`}
      className={`${CHIP} relative top-[-1px] transition hover:bg-accent/25 focus-visible:outline-2 focus-visible:outline-accent`}
    >
      {n}
    </button>
  );
}

export function CitationBadge({ n }: { n: number }) {
  return <span className={`${CHIP} mx-0`}>{n}</span>;
}
