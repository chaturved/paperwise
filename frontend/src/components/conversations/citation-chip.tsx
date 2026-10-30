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
      className="relative top-[-1px] mx-px inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-[3px] bg-accent/15 px-1 font-mono text-[9px] font-bold text-accent transition hover:bg-accent/25 focus-visible:outline-2 focus-visible:outline-accent"
    >
      {n}
    </button>
  );
}
