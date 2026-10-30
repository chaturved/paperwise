import type { Usage } from "@/types";

export function PlanMeter({ usage }: { usage: Usage | null }) {
  if (!usage) return <div className="h-[46px]" />;

  const { used, limit } = usage.documents;
  if (limit === null) {
    return <p className="px-3 pb-3 text-xs text-muted">Pro plan</p>;
  }

  const percent = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="px-3 pb-3">
      <div className="mb-1.5 flex justify-between text-xs text-muted">
        <span>Free plan</span>
        <span>{used} of {limit} documents</span>
      </div>
      <div className="h-[3px] rounded-full bg-line" role="progressbar" aria-label="Documents used" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used}>
        <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
