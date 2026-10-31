"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SettingsHeading, SettingsSection } from "@/components/settings/settings-section";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type View = "overview" | "analytics";

const VIEWS: { value: View; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "analytics", label: "Analytics" },
];

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
}

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-[22px] py-5">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-4 font-display text-[40px] leading-none tracking-[-0.0125em]">{value}</p>
      {detail && <p className="mt-2 text-xs text-muted">{detail}</p>}
    </div>
  );
}

function LimitBar({
  label,
  used,
  limit,
  unit = "",
}: {
  label: string;
  used: number;
  limit: number | null;
  unit?: string;
}) {
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-[13px] text-muted">
          {used.toLocaleString()}
          {unit}
          {limit === null ? "" : ` of ${limit.toLocaleString()}${unit}`}
        </span>
      </div>
      {limit !== null && (
        <div
          className="h-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={used}
        >
          <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink shadow-lg">
      <p className="text-muted">{formatDate(label)}</p>
      <p className="mt-1 font-semibold">
        {payload[0].value} {payload[0].value === 1 ? "question" : "questions"}
      </p>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[26px] font-normal tracking-[-0.0125em]">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-muted">{description}</p>
      {children}
    </section>
  );
}

export function AnalyticsContent() {
  const [view, setView] = useState<View>("overview");
  const { days, setDays, overview, dailyVolume, citations, accountUsage, loading, error, retry } = useAnalytics();
  const totalInRange = dailyVolume.reduce((sum, point) => sum + point.count, 0);
  const hasFeedback = (overview?.thumbs_up ?? 0) + (overview?.thumbs_down ?? 0) > 0;
  const storageMb = (bytes: number | null) => (bytes === null ? null : Number((bytes / (1024 * 1024)).toFixed(1)));

  return (
    <div className="pb-8">
      <SettingsHeading title="Usage">See how your documents and conversations are used in Paperwise.</SettingsHeading>

      <Tabs value={view} onValueChange={(value) => setView(value as View)} className="mb-9">
        <TabsList variant="line" aria-label="Usage views">
          {VIEWS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error && (
        <div
          role="alert"
          className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-danger px-4 py-3 text-sm text-danger"
        >
          <span>{error}</span>
          <Button type="button" onClick={retry} variant="link" size="inline" className="font-semibold">
            Retry
          </Button>
        </div>
      )}

      {view === "overview" ? (
        <>
          <section aria-label="Usage overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Questions asked"
              value={loading ? "—" : String(overview?.total_queries ?? 0)}
              detail={loading ? undefined : `${overview?.queries_last_30d ?? 0} in the last 30 days`}
            />
            <StatTile label="Documents" value={loading ? "—" : String(overview?.total_docs ?? 0)} />
            <StatTile
              label="Indexed passages"
              value={loading ? "—" : (overview?.total_chunks ?? 0).toLocaleString()}
              detail="available for answers"
            />
            <StatTile
              label="Positive feedback"
              value={loading || overview?.quality_pct == null ? "—" : `${overview.quality_pct}%`}
              detail={
                hasFeedback ? `${overview?.thumbs_up} positive · ${overview?.thumbs_down} negative` : "No ratings yet"
              }
            />
          </section>

          <div className="mt-11">
            {accountUsage && (
              <SettingsSection title="Plan limits" description="Your document, question and storage allowances.">
                <div className="max-w-[620px] space-y-6">
                  <LimitBar label="Documents" {...accountUsage.documents} />
                  <LimitBar label="Questions, last 24 hours" {...accountUsage.queries_24h} />
                  <LimitBar
                    label="Storage"
                    used={storageMb(accountUsage.storage_bytes.used) ?? 0}
                    limit={storageMb(accountUsage.storage_bytes.limit)}
                    unit=" MB"
                  />
                </div>
              </SettingsSection>
            )}
            <SettingsSection title="What this measures">
              <p className="max-w-[620px] text-[15px] leading-7 text-muted">
                Questions count the prompts you have asked. Indexed passages are the pieces of your documents available
                for source-backed answers. Feedback reflects ratings you give to responses.
              </p>
            </SettingsSection>
          </div>
        </>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-[26px] font-normal tracking-[-0.0125em]">Question activity</h2>
              <p className="mt-1 text-sm text-muted">Questions asked across your documents over time.</p>
            </div>
            <Tabs value={days} onValueChange={(value) => setDays(value as 7 | 30)}>
              <TabsList aria-label="Date range" className="text-[13px]">
                {([7, 30] as const).map((range) => (
                  <TabsTrigger key={range} value={range} className="h-[34px] px-4">
                    {range}d
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="rounded-lg border border-line bg-surface px-7 pb-5 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[13px] text-muted">Questions</p>
                <p className="mt-1 font-display text-[40px] leading-none tracking-[-0.0125em]">
                  {loading ? "—" : totalInRange}
                </p>
              </div>
              <p className="font-mono text-xs text-muted">
                {formatDate(dailyVolume[0].date)} – {formatDate(dailyVolume[dailyVolume.length - 1].date)}
              </p>
            </div>
            <div className="mt-5 h-[240px] w-full">
              {loading ? (
                <div className="h-full animate-pulse rounded bg-ink/[0.04]" />
              ) : totalInRange === 0 ? (
                <div className="flex h-full items-center justify-center border-t border-line text-[13px] text-muted">
                  No questions in this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyVolume} barCategoryGap="38%">
                    <CartesianGrid vertical={false} stroke="var(--color-line)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tickLine={false}
                      axisLine={false}
                      interval={days === 7 ? 0 : 5}
                      tick={{ fill: "var(--color-ink)", opacity: 0.6, fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                      tick={{ fill: "var(--color-ink)", opacity: 0.55, fontSize: 11 }}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-ink)", fillOpacity: 0.05 }} />
                    <Bar dataKey="count" fill="var(--color-ink)" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-11 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Panel title="Top cited documents" description="Files most often referenced in answers.">
              <div className="overflow-hidden rounded-lg border border-line bg-surface">
                {loading ? (
                  <p className="px-5 py-10 text-center text-[13px] text-muted">Loading documents…</p>
                ) : citations.length === 0 ? (
                  <p className="px-5 py-10 text-center text-[13px] text-muted">No cited documents yet</p>
                ) : (
                  citations.map((document, index) => (
                    <div
                      key={`${document.name}-${index}`}
                      className="flex items-center justify-between gap-4 border-b border-line px-[22px] py-4 text-sm last:border-b-0"
                    >
                      <span className="min-w-0 truncate">
                        <span className="mr-4 font-mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
                        {document.name}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted">
                        {document.citations} {document.citations === 1 ? "citation" : "citations"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            <Panel title="Answer feedback" description="Based on your ratings in chat.">
              <div className="rounded-lg border border-line bg-surface p-[22px]">
                {!hasFeedback ? (
                  <p className="py-3 text-center text-[13px] text-muted">Rate an answer in chat to see feedback here</p>
                ) : (
                  <>
                    <div className="flex items-end justify-between">
                      <span className="text-[13px] text-muted">Positive answers</span>
                      <span className="font-display text-[34px] leading-none tracking-[-0.0125em]">
                        {overview?.quality_pct ?? 0}%
                      </span>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${overview?.quality_pct ?? 0}%` }} />
                    </div>
                    <div className="mt-3 flex justify-between font-mono text-xs text-muted">
                      <span>{overview?.thumbs_up} positive</span>
                      <span>{overview?.thumbs_down} negative</span>
                    </div>
                  </>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
