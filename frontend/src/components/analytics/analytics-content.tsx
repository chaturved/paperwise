"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAnalytics } from "@/hooks/useAnalytics";

type View = "overview" | "analytics";

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
}

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-ink/10 p-5 sm:p-6">
      <p className="text-[13px] text-ink/55">{label}</p>
      <p className="mt-5 text-[30px] font-medium tracking-[-0.04em] text-ink sm:text-[36px]">{value}</p>
      {detail && <p className="mt-1 text-[12px] text-ink/45">{detail}</p>}
    </div>
  );
}

function LimitBar({ label, used, limit, unit = "" }: { label: string; used: number; limit: number | null; unit?: string }) {
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-[13px]"><span>{label}</span><span className="text-ink/55">{used.toLocaleString()}{unit}{limit === null ? "" : ` of ${limit.toLocaleString()}${unit}`}</span></div>
      {limit !== null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.08]"><div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} /></div>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-md border border-ink/10 bg-card px-3 py-2 text-xs text-ink shadow-lg">
      <p className="text-ink/50">{formatDate(label)}</p>
      <p className="mt-1 font-semibold">{payload[0].value} {payload[0].value === 1 ? "question" : "questions"}</p>
    </div>
  );
}

export function AnalyticsContent() {
  const [view, setView] = useState<View>("overview");
  const { days, setDays, overview, dailyVolume, citations, accountUsage, loading, error, retry } = useAnalytics();
  const totalInRange = dailyVolume.reduce((sum, point) => sum + point.count, 0);
  const hasFeedback = (overview?.thumbs_up ?? 0) + (overview?.thumbs_down ?? 0) > 0;

  const switchView = (next: View) => setView(next);

  return (
    <div className="pb-16">
      <h1 className="text-[32px] font-medium tracking-[-0.04em] sm:text-[36px]">Usage</h1>
      <p className="mt-2 text-[14px] leading-6 text-ink/55">See how your documents and conversations are used in Paperwise.</p>

      <div className="mb-12 mt-9 flex gap-2 border-b border-ink/10 pb-3" aria-label="Usage tabs">
        <button type="button" onClick={() => switchView("overview")} aria-pressed={view === "overview"}
          className={`rounded-md px-4 py-2 text-[13px] transition ${view === "overview" ? "bg-ink/[0.09] font-medium text-ink" : "text-ink/55 hover:text-ink"}`}>Overview</button>
        <button type="button" onClick={() => switchView("analytics")} aria-pressed={view === "analytics"}
          className={`rounded-md px-4 py-2 text-[13px] transition ${view === "analytics" ? "bg-ink/[0.09] font-medium text-ink" : "text-ink/55 hover:text-ink"}`}>Analytics</button>
      </div>

      {error && (
        <div className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-red-500/25 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <span>{error}</span><button type="button" onClick={retry} className="font-semibold underline">Retry</button>
        </div>
      )}

      {view === "overview" ? (
        <>
          <section aria-label="Usage overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Questions asked" value={loading ? "—" : String(overview?.total_queries ?? 0)} detail={loading ? undefined : `${overview?.queries_last_30d ?? 0} in the last 30 days`} />
            <StatTile label="Documents" value={loading ? "—" : String(overview?.total_docs ?? 0)} />
            <StatTile label="Indexed passages" value={loading ? "—" : (overview?.total_chunks ?? 0).toLocaleString()} />
            <StatTile label="Positive feedback" value={loading || overview?.quality_pct == null ? "—" : `${overview.quality_pct}%`} detail={hasFeedback ? `${overview?.thumbs_up} positive · ${overview?.thumbs_down} negative` : "No ratings yet"} />
          </section>
          <section className="mt-14">
            <h2 className="text-[21px] font-medium tracking-[-0.02em]">What this measures</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-7 text-ink/55">Questions count the prompts you have asked. Indexed passages are the pieces of your documents available for source-backed answers. Feedback reflects ratings you give to responses.</p>
          </section>
          {accountUsage && <section className="mt-12" aria-labelledby="limits-title">
            <h2 id="limits-title" className="text-[21px] font-medium tracking-[-0.02em]">Current plan limits</h2>
            <p className="mt-2 text-[14px] text-ink/55">Your document, question, and storage allowances.</p>
            <div className="mt-5 space-y-6 rounded-lg border border-ink/10 p-5 sm:p-6">
              <LimitBar label="Documents" {...accountUsage.documents} />
              <LimitBar label="Questions today" {...accountUsage.queries_today} />
              <LimitBar label="Storage" used={Number((accountUsage.storage_bytes.used / (1024 * 1024)).toFixed(1))} limit={accountUsage.storage_bytes.limit === null ? null : Number((accountUsage.storage_bytes.limit / (1024 * 1024)).toFixed(1))} unit=" MB" />
            </div>
          </section>}
        </>
      ) : (
        <>
          <section aria-labelledby="activity-title">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div><h2 id="activity-title" className="text-[22px] font-medium tracking-[-0.025em]">Question activity</h2><p className="mt-1 text-[14px] text-ink/55">Questions asked across your documents over time.</p></div>
              <div className="flex gap-1 rounded-md bg-ink/[0.06] p-1" aria-label="Date range">
                {([7, 30] as const).map((range) => <button key={range} type="button" onClick={() => setDays(range)} aria-pressed={days === range}
                  className={`rounded px-3 py-1.5 text-[12px] font-medium transition ${days === range ? "bg-workspace text-ink shadow-sm" : "text-ink/55 hover:text-ink"}`}>{range}d</button>)}
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-ink/10 px-5 pb-5 pt-6 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-[12px] text-ink/50">Questions</p><p className="mt-1 text-[31px] font-medium tracking-[-0.04em]">{loading ? "—" : totalInRange}</p></div>
                <p className="text-[12px] text-ink/50">{formatDate(dailyVolume[0].date)} – {formatDate(dailyVolume[dailyVolume.length - 1].date)}</p>
              </div>
              <div className="mt-5 h-[240px] w-full">
                {loading ? <div className="h-full animate-pulse rounded-md bg-ink/[0.04]" /> : totalInRange === 0 ? (
                  <div className="flex h-full items-center justify-center border-t border-ink/[0.06] text-[13px] text-ink/45">No questions in this period</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyVolume} barCategoryGap="38%">
                      <CartesianGrid vertical={false} stroke="var(--color-ink)" strokeOpacity={0.08} />
                      <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} axisLine={false} interval={days === 7 ? 0 : 5} tick={{ fill: "var(--color-ink)", opacity: 0.55, fontSize: 11 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} tick={{ fill: "var(--color-ink)", opacity: 0.45, fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)", fillOpacity: 0.08 }} />
                      <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={46} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="sources-title" className="mt-12">
            <h2 id="sources-title" className="text-[22px] font-medium tracking-[-0.025em]">Top cited documents</h2>
            <p className="mt-1 text-[14px] text-ink/55">Files most often referenced in answers.</p>
            <div className="mt-5 overflow-hidden rounded-lg border border-ink/10">
              {loading ? <p className="px-5 py-10 text-center text-[13px] text-ink/45">Loading documents…</p> : citations.length === 0 ? (
                <p className="px-5 py-10 text-center text-[13px] text-ink/45">No cited documents yet</p>
              ) : citations.map((document, index) => (
                <div key={`${document.name}-${index}`} className="flex items-center justify-between gap-4 border-b border-ink/10 px-5 py-4 last:border-b-0">
                  <span className="min-w-0 truncate text-[13px] text-ink/75"><span className="mr-4 text-ink/35">{String(index + 1).padStart(2, "0")}</span>{document.name}</span>
                  <span className="shrink-0 text-[12px] text-ink/50">{document.citations} {document.citations === 1 ? "citation" : "citations"}</span>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="feedback-title" className="mt-12">
            <h2 id="feedback-title" className="text-[22px] font-medium tracking-[-0.025em]">Answer feedback</h2>
            <p className="mt-1 text-[14px] text-ink/55">Based on your ratings in chat.</p>
            <div className="mt-5 rounded-lg border border-ink/10 px-5 py-7 sm:px-7">
              {!hasFeedback ? <p className="text-center text-[13px] text-ink/45">Rate an answer in chat to see feedback here</p> : (
                <>
                  <div className="flex items-end justify-between gap-4"><p className="text-[13px] text-ink/55">Positive answers</p><p className="text-[26px] font-medium tracking-[-0.03em]">{overview?.quality_pct ?? 0}%</p></div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/[0.08]"><div className="h-full rounded-full bg-accent" style={{ width: `${overview?.quality_pct ?? 0}%` }} /></div>
                  <div className="mt-4 flex justify-between text-[12px] text-ink/50"><span>{overview?.thumbs_up} positive</span><span>{overview?.thumbs_down} negative</span></div>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
