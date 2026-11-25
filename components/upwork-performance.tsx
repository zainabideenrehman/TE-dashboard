import type { upworkAnalytics, upworkTimeline } from "@/lib/upwork";

const metrics = {
  proposals: "Opportunities",
  viewed: "Views",
  replies: "Replies",
  interviews: "Interviews",
  wins: "Hires",
  connects: "Connects",
} as const;
export type TrendMetric = keyof typeof metrics;

function metricAvailable(stats: ReturnType<typeof upworkAnalytics>, metric: TrendMetric) {
  switch (metric) {
    case "viewed": return stats.viewedCoverage > 0;
    case "replies": return stats.replyEvidence;
    case "interviews": return stats.interviewEvidence;
    case "wins": return stats.hireEvidence;
    case "connects": return stats.connectsCoverage > 0;
    default: return true;
  }
}

export function UpworkTrend({
  buckets, metric, onMetricChange,
}: {
  buckets: ReturnType<typeof upworkTimeline>;
  metric: TrendMetric;
  onMetricChange: (metric: TrendMetric) => void;
}) {
  const recent = buckets.slice(-12);
  const peak = Math.max(1, ...recent.map(bucket => bucket[metric]));
  return <>
    <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Trend metric">
      {Object.entries(metrics).map(([key, label]) => (
        <button key={key} type="button" aria-pressed={key === metric}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${key === metric ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:bg-white/70"}`}
          onClick={() => onMetricChange(key as TrendMetric)}>{label}</button>
      ))}
    </div>
    {recent.length === 0 ? <p className="muted">No dated activity in this selection.</p> : <>
      {buckets.length > recent.length && <p className="muted mb-3 text-xs">Latest {recent.length} periods shown. See Period comparisons for the full range.</p>}
      <ul className="space-y-2" aria-label={metrics[metric] + " by period"}>
        {recent.map(bucket => {
          const available = metricAvailable(bucket, metric) || bucket.proposals === 0;
          return <li key={bucket.date} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-xs tabular-nums">
            <time dateTime={bucket.date} className="w-24 text-slate-600">{bucket.date}{bucket.partial && " *"}</time>
            <div aria-hidden="true" className="h-4 overflow-hidden rounded bg-slate-100">
              <div className="h-full rounded bg-teal-600 transition-[width] motion-reduce:transition-none" style={{ width: `${bucket[metric] / peak * 100}%` }} />
            </div>
            <span className="w-16 text-right font-semibold text-slate-800">{available ? bucket[metric].toLocaleString("en-US") : "Unknown"}</span>
          </li>;
        })}
      </ul>
      {recent.some(bucket => bucket.partial) && <p className="muted mt-3 text-xs">* Partial period</p>}
    </>}
  </>;
}

export function UpworkOutcomeRates({ stats }: { stats: ReturnType<typeof upworkAnalytics> }) {
  const outcomes = ["viewed", "replies", "interviews", "wins"] as const;
  return <section className="panel min-w-0">
    <h2>Recorded outcome rates</h2>
    <p className="muted mt-1 text-xs">Share of all selected opportunities with each recorded outcome. Each outcome is measured independently.</p>
    <dl className="mt-6 space-y-5">
      {outcomes.map(metric => {
        const rate = stats.proposals && metricAvailable(stats, metric) ? stats[metric] / stats.proposals : undefined;
        return <div key={metric}>
          <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
            <dt className="font-medium text-slate-700">{metrics[metric]}</dt>
            <dd className="text-right font-semibold tabular-nums text-slate-900">
              {rate === undefined ? "Unavailable" : <>
                <span className="mr-2 text-xs font-normal text-slate-600">{stats[metric]} / {stats.proposals}</span>
                {`${(rate * 100).toFixed(1)}%`}
              </>}
            </dd>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${(rate ?? 0) * 100}%` }} />
          </div>
        </div>;
      })}
    </dl>
  </section>;
}
