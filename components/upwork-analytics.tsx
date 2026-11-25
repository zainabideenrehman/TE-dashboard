"use client";
import { useState } from "react";
import type { Source, UpworkProposal } from "@/lib/domain";
import { upworkAnalytics, upworkTimeline } from "@/lib/upwork";
import { upworkDemoRecords } from "@/lib/upwork-demo";
import { todayInKarachi } from "@/lib/attendance-view";
import {reportTabs, type ReportKind} from '@/lib/upwork-reports';
import {UpworkKnowledge} from "./upwork-knowledge";
import {UpworkDiscovery} from "./upwork-discovery";
import { UpworkOutcomeRates, UpworkTrend, type TrendMetric } from "./upwork-performance";
import { Integrations } from "./integrations";

const percentage = (value: number | undefined) => value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
const number = (value: number) => value.toLocaleString("en-US");
function statusClass(stage?: string) {
  return stage === "Won" ? "bg-emerald-100 text-emerald-900" : stage === "Interview" ? "bg-violet-100 text-violet-900" : stage === "Replied" ? "bg-blue-100 text-blue-900" : stage === "Lost" || stage === "Closed" ? "bg-rose-100 text-rose-900" : "bg-slate-100 text-slate-700";
}
export function UpworkAnalytics({ sources }: { sources: Source[] }) {
  const [view,setView]=useState<"analytics"|"applied"|"apply"|"keywords"|"relevant-jobs"|ReportKind>("applied");
  const linked = sources.filter(s => s.dataType === "upwork-bd");
  const [demo, setDemo] = useState(false);
  const [start, setStart] = useState(""), [end, setEnd] = useState(todayInKarachi());
  const [owner, setOwner] = useState("All"), [profile, setProfile] = useState("All"), [kind, setKind] = useState("All"), [outcome, setOutcome] = useState("All"), [search, setSearch] = useState("");
  const [period, setPeriod] = useState<"Day" | "Week" | "Month">("Week");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("proposals");
  const [dimension, setDimension] = useState("Search Term");
  const [selected, setSelected] = useState<string>(), [page, setPage] = useState(0);
  const live = linked.flatMap(s => s.data?.upwork || []);
  const records: UpworkProposal[] = demo ? upworkDemoRecords() : live;
  const seen = new Set<string>();
  const unique = records.filter(r => { const key = `${r.source.spreadsheetId}/${r.source.tab}/${r.source.row}`; if (seen.has(key)) return false; seen.add(key); return true; });
  const asOf = todayInKarachi();
  const validRange = !start || !end || start <= end;
  const filtered = validRange ? unique.filter(r => (!start || !!r.submittedDate && r.submittedDate >= start) && (!end || !!r.submittedDate && r.submittedDate <= end) && (owner === "All" || r.owner === owner) && (profile === "All" || r.profile === profile) && (kind === "All" || r.kind === kind) && (outcome === "All" || (outcome === "Unmarked" ? !r.rawStage : r.rawStage === outcome)) && (!search || `${r.title} ${r.owner} ${r.profile}`.toLowerCase().includes(search.toLowerCase()))) : [];
  const stats = upworkAnalytics(filtered, asOf);
  const eligible = filtered.filter(r => !r.submittedDate || r.submittedDate <= asOf);
  const proposals = eligible.filter(r => r.kind === "Proposal").length;
  const groups = (field: "owner" | "profile") => [...new Set(eligible.map(r => r[field]))].map(label => ({ label, ...upworkAnalytics(eligible.filter(r => r[field] === label), asOf) })).sort((a,b) => b.proposals - a.proposals || a.label.localeCompare(b.label));
  const owners = [...new Set(unique.map(r => r.owner))].sort(), profiles = [...new Set(unique.map(r => r.profile))].sort(), outcomes = [...new Set(unique.map(r => r.rawStage).filter(Boolean))].sort();
  const buckets = upworkTimeline(eligible, period, start, end, asOf);
  const ordered = [...eligible].sort((a,b) => b.submittedDate.localeCompare(a.submittedDate) || a.source.row - b.source.row);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(ordered.length / 25) - 1));
  const selectedRecord = unique.find(r => r.recordId === selected);
  const distinctKinds = ["Proposal", "Invite"];
  const missingDate = unique.filter(r => !r.submittedDate).length;
  const segments = [...new Set(eligible.map(r => r.details?.[dimension] || "Unrecorded"))].map(label => ({label,...upworkAnalytics(eligible.filter(r => (r.details?.[dimension] || "Unrecorded") === label),asOf)})).sort((a,b)=>b.proposals-a.proposals);
  function resetFilters() { setStart(""); setEnd(asOf); setOwner("All"); setProfile("All"); setKind("All"); setOutcome("All"); setSearch(""); setPage(0); }
  function breakdown(field: "owner" | "profile", title: string) {
    return <section className="panel min-w-0"><h2>{title}</h2><div className="mt-3 max-h-80 overflow-auto" tabIndex={0}><table><thead className="sticky top-0"><tr><th>{field === "owner" ? "Applied by" : "Profile"}</th><th>Rows</th><th>Views</th><th>Replies</th><th>Interviews</th><th>Hires</th><th>Hire rate</th><th>Connects</th><th>Blank connects</th></tr></thead><tbody>{groups(field).map(group => <tr key={group.label}><td><button className="font-semibold text-teal-800 underline" onClick={() => { if (field === "owner") setOwner(group.label); else setProfile(group.label); setPage(0); }}>{group.label}</button></td><td>{group.proposals}</td><td>{group.viewed}</td><td>{group.replies}</td><td>{group.interviews}</td><td>{group.wins}</td><td>{percentage(group.winRate)}</td><td>{group.connects}</td><td>{group.proposals - group.connectsCoverage}</td></tr>)}</tbody></table></div></section>;
  }
  const navigation = (
    <nav aria-label="Upwork views" className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {([["applied", "Applied jobs & performance"], ["apply", "Apply jobs"], ["analytics", "Discovery analytics"], ["keywords", "Keyword Search"], ["relevant-jobs", "Relevant Jobs"], ...(Object.keys(reportTabs) as ReportKind[]).map(label => [label, label] as const)] as const).map(([id, label]) => (
        <button key={id} aria-pressed={view === id}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${view === id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}
          onClick={() => setView(id)}>{label}</button>
      ))}
    </nav>
  );
  if(view==="analytics")return <div className="space-y-5">{navigation}<UpworkDiscovery sources={linked} proposals={live}/></div>;
  if(view==="apply")return <div className="space-y-5">{navigation}<Integrations sources={sources}/></div>;
  if(view==="keywords"||view==="relevant-jobs")return <div className="space-y-5">{navigation}<UpworkKnowledge key={view} kind={view} sources={linked} proposals={live}/></div>;
  if (view !== "applied") {
    const reports = linked.filter(source => source.mapping.upwork?.report === view);
    const rows = reports.flatMap(source => (source.data?.upworkReport ?? []).map((row, index) => ({ ...row, id: source.sourceId + "/" + index })));
    const columns = [...new Set(rows.flatMap(row => Object.keys(row.fields)))];
    const labels: Record<string, string> = { Interview: "Our interviews", "Close/Hire": "Our hires", Connects: view === "Weekly Report" ? "Weekly Connects" : "Connects", "Boosted proposal": "Boosted proposals", "Out Bid": "Outbid" };
    return <div className="space-y-5">{navigation}<section className="panel">
      <h2>{view}</h2>
      {reports.map(source => <p key={source.sourceId} className="muted mt-2 text-sm">{source.error || (source.lastRefresh ? "Updated " + new Date(source.lastRefresh).toLocaleString() : "Awaiting refresh")}</p>)}
      {!reports.length && <p className="muted mt-3">Add {reportTabs[view]} in Data Sources, then prepare, inspect, preview and publish its mapping.</p>}
      {reports.length > 0 && !rows.length && <p className="muted mt-3">No report rows available.</p>}
      {rows.length > 0 && <div className="mt-4 max-h-[34rem] overflow-auto" tabIndex={0}><table>
        <thead className="sticky top-0"><tr>{view !== "Weekly Report" && <th>Profile</th>}{columns.map(column => <th key={column}>{labels[column] ?? column}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>{view !== "Weekly Report" && <td>{row.section || "Unrecorded"}</td>}{columns.map(column => <td className="max-w-96 whitespace-pre-wrap break-words" key={column}>{row.fields[column] || "-"}</td>)}</tr>)}</tbody>
      </table></div>}
    </section></div>;
  }
  return <div className="space-y-5">
    {navigation}
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2>Upwork BD performance</h2><p className="muted mt-1">All recorded dates. Weeks start Monday. Refreshes every minute while this page is visible.</p></div><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => { setDemo(!demo); setPage(0); setOwner("All"); setProfile("All"); setOutcome("All"); }}>{demo ? "Return to connected data" : "Explore synthetic demo"}</button></div>
      {demo && <p role="status" className="mt-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">SYNTHETIC DEMO - all proposals, owners, profiles and results are fictional. Demo and real data are never combined.</p>}
      {!demo && !live.length && <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">No published Upwork records yet. Add the operational tab in Data Sources, inspect, preview and publish its mapping. The synthetic demo is available now.</p>}
      {!demo && linked.map(source => <p key={source.sourceId} className={`mt-3 text-xs ${source.error ? "text-amber-800" : "text-slate-500"}`}>{source.displayName} - {source.lastRefresh ? `updated ${new Date(source.lastRefresh).toLocaleString()}` : "not refreshed"}{source.error ? ` - last-good data: ${source.error}` : ""}</p>)}
      <div className="mt-5 flex flex-wrap gap-3">
        <label>Submitted from<input type="date" value={start} onChange={e => { setStart(e.target.value); setPage(0); }} /></label>
        <label>Through<input type="date" value={end} onChange={e => { setEnd(e.target.value); setPage(0); }} /></label>
        <label>Applied by<select value={owner} onChange={e => { setOwner(e.target.value); setPage(0); }}><option>All</option>{owners.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Profile<select value={profile} onChange={e => { setProfile(e.target.value); setPage(0); }}><option>All</option>{profiles.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Type<select value={kind} onChange={e => { setKind(e.target.value); setPage(0); }}><option>All</option>{distinctKinds.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Recorded result<select value={outcome} onChange={e => { setOutcome(e.target.value); setPage(0); }}><option>All</option><option>Unmarked</option>{outcomes.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Search<input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Job, owner or profile" /></label>
        <button className="self-end rounded-lg border px-3 py-2 text-sm" onClick={resetFilters}>All dates / clear filters</button>
      </div>
      {!validRange && <p role="alert" className="mt-3 text-rose-800">Start date must not be after the end date.</p>}
      <p className="muted mt-3 text-xs">{stats.proposals} matching rows through {asOf}. {missingDate > 0 ? `${missingDate} source rows have unresolved dates and appear only with date filters cleared.` : ""} {stats.futureSubmissions > 0 ? `${stats.futureSubmissions} future-dated rows excluded from metrics.` : ""}</p>
    </section>
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
      {[
        ["Logged opportunities", number(stats.proposals), `${proposals} proposal rows; ${stats.invites} invitation rows`],
        ["Recorded views", stats.viewedCoverage ? number(stats.viewed) : "—", `${stats.viewedCoverage}/${stats.proposals} rows have a Yes/No view marking`],
        ["Recorded replies", stats.replyEvidence ? number(stats.replies) : "—", stats.replyEvidence ? `${percentage(stats.replyRate)} of all selected rows` : "Reply markings unavailable"],
        ["Our interviews", stats.interviewEvidence ? number(stats.interviews) : "—", "Started Interviews or Interviewed result"],
        ["Our hires", stats.hireEvidence ? number(stats.wins) : "—", stats.hireEvidence ? `${percentage(stats.winRate)} of all selected rows` : "Hire markings unavailable"],
        ["Connects recorded", stats.connectsCoverage ? number(stats.connects) : "—", `${stats.connectsCoverage}/${stats.proposals} rows populated`],
        ["Boosted Connects", stats.boostedConnectsCoverage ? number(stats.boostedConnects) : "—", `${stats.boostedConnectsCoverage}/${stats.proposals} rows populated`],
        ["Total Connects", stats.totalConnectsCoverage ? number(stats.totalConnects) : "—", `${stats.totalConnectsCoverage}/${stats.proposals} rows populated`],
        ["Outbid", stats.outbidCoverage ? number(stats.outbid) : "—", `${stats.outbidCoverage}/${stats.proposals} rows with a recorded Outbid status`],
        ["Rows needing review", number(eligible.filter(r => r.issues?.length).length), `${stats.issues} review flags; ${stats.missingOwners} unassigned owners`],
      ].map(([label,value,description],i) => <div key={label} className={`rounded-2xl border p-4 shadow-sm ${i === 0 ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"}`}><p className="text-sm font-medium text-slate-700">{label}</p><strong className="my-2 block text-3xl tracking-tight tabular-nums">{value}</strong><p className="text-xs text-slate-600">{description}</p></div>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    <section className="panel min-w-0">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2>Activity over time</h2><p className="muted text-xs mt-1">Submission-date cohorts; displayed outcomes are the current recorded outcomes of those rows.</p></div><label>Group by<select value={period} onChange={e => setPeriod(e.target.value as typeof period)}><option>Day</option><option>Week</option><option>Month</option></select></label></div>
      <UpworkTrend buckets={buckets} metric={trendMetric} onMetricChange={setTrendMetric} />
    </section>
    <UpworkOutcomeRates stats={stats} />
    </div>
    <section className="panel"><h2>Period comparisons</h2><p className="muted my-3 text-sm">Changes compare adjacent calendar periods. Empty periods mean no logged rows. Partial periods are labelled. Outcomes reflect current sheet values, not historical snapshots.</p><div className="max-h-96 overflow-auto" tabIndex={0}><table><thead className="sticky top-0"><tr><th>Period</th><th>Rows</th><th>Change</th><th>Views</th><th>Replies</th><th>Interviews</th><th>Hires</th><th>Hire rate</th><th>Connects</th><th>Boost connects</th></tr></thead><tbody>{buckets.map(b => <tr key={b.date}><td>{b.date}{b.partial ? " (partial)" : ""}</td><td>{b.proposals}</td><td>{b.change === undefined ? "—" : (b.change > 0 ? "+" : "") + b.change}{b.changeRate !== undefined ? " (" + percentage(b.changeRate) + ")" : ""}</td><td>{b.viewedCoverage ? b.viewed : 0}</td><td>{b.replyEvidence ? b.replies : 0}</td><td>{b.interviewEvidence ? b.interviews : 0}</td><td>{b.hireEvidence ? b.wins : 0}</td><td>{percentage(b.winRate)}</td><td>{b.connectsCoverage ? b.connects : 0}</td><td>{b.boostedConnectsCoverage ? b.boostedConnects : 0}</td></tr>)}</tbody></table></div></section>
    <div className="grid gap-5 xl:grid-cols-2">{breakdown("owner","Bidder / owner performance")}{breakdown("profile","Upwork profile performance")}</div>
    <section className="panel"><div className="flex flex-wrap items-center justify-between gap-3"><h2>Targeting performance</h2><label>Compare by<select value={dimension} onChange={e=>setDimension(e.target.value)}>{["Search Term","Job location","Client location","Proposals","Expertise","Payment Method Verified","Loom","Notion"].map(d=><option key={d}>{d}</option>)}</select></label></div><div className="mt-3 max-h-80 overflow-auto" tabIndex={0}><table><thead className="sticky top-0"><tr><th>{dimension}</th><th>Rows</th><th>Views</th><th>Replies</th><th>Interviews</th><th>Hires</th><th>Hire rate</th><th>Connects</th></tr></thead><tbody>{segments.map(s=><tr key={s.label}><td>{s.label}</td><td>{s.proposals}</td><td>{s.viewedCoverage?s.viewed:0}</td><td>{s.replyEvidence?s.replies:0}</td><td>{s.interviewEvidence?s.interviews:0}</td><td>{s.hireEvidence?s.wins:0}</td><td>{percentage(s.winRate)}</td><td>{s.connectsCoverage?s.connects:0}</td></tr>)}</tbody></table></div></section>
    <section className="panel"><h2>Recorded outcomes and completeness</h2><p className="muted my-3">Blank flags mean unknown, not No. Views, messages, interviews and hires are independent signals; a hire does not invent missing earlier funnel steps.</p><div className="flex flex-wrap gap-2">{[...new Set(eligible.map(r => r.rawStage || "Unmarked"))].sort().map(label => <button key={label} onClick={() => setOutcome(label)} className="rounded-lg border px-3 py-2 text-sm">{label}: <strong>{eligible.filter(r => (r.rawStage || "Unmarked") === label).length}</strong></button>)}</div><details className="mt-4"><summary className="cursor-pointer font-semibold">Metric definitions</summary><p className="muted mt-2">Rates divide recorded positive outcomes by all selected rows. Use Type = Proposal to exclude invitations. Blank outcomes remain in the denominator. Agency hires require Result = Won or a recorded win date. A conflicting Hired = No marking flags the row for review. Replies use Messaged = Yes or a recorded reply date/stage, not a guess from client response notes. Interviews use Started Interviews = Yes or Result = Interviewed. Connects, Boosted Connects, and Total Connects are read from their respective columns. Outbid counts recorded Yes or Outbid statuses. Dates in the Day column use the user-confirmed year 2026; explicit numeric date anchors take priority over written weekdays.</p></details></section>
    <section className="panel"><div className="mb-4 flex flex-wrap justify-between gap-3"><h2>Opportunity log</h2><div className="flex gap-3 text-sm"><button disabled={!currentPage} onClick={() => setPage(currentPage-1)}>Previous</button><span>{ordered.length ? currentPage*25+1 : 0}-{Math.min((currentPage+1)*25,ordered.length)} of {ordered.length}</span><button disabled={(currentPage+1)*25>=ordered.length} onClick={() => setPage(currentPage+1)}>Next</button></div></div><div className="max-h-[34rem] overflow-auto" tabIndex={0}><table><thead className="sticky top-0"><tr><th>Date</th><th>Job / proposal</th><th>Applied by</th><th>Profile</th><th>Type</th><th>Result</th><th>Connects</th><th>Boosted Connects</th><th>Total Connects</th><th>Outbid</th><th>Review</th></tr></thead><tbody>{ordered.slice(currentPage*25,currentPage*25+25).map(record => <tr key={record.recordId}><td>{record.submittedDate || "Unresolved"}</td><td className="max-w-72 whitespace-normal"><button className="text-left font-semibold text-teal-800 underline" onClick={() => setSelected(record.recordId)}>{record.title}</button></td><td>{record.owner}</td><td>{record.profile}</td><td>{record.kind || "Unknown"}</td><td><span className={`rounded px-2 py-1 text-xs ${statusClass(record.stage)}`}>{record.rawStage || "Unmarked"}</span></td><td>{record.connects ?? "-"}</td><td>{record.boostedConnects ?? "-"}</td><td>{record.totalConnects ?? "-"}</td><td>{record.flags?.outbid === undefined ? "-" : record.flags.outbid ? "Yes" : "No"}</td><td>{record.issues?.length ? <button className="text-amber-800 underline" onClick={() => setSelected(record.recordId)}>{record.issues.length} flags</button> : "-"}</td></tr>)}</tbody></table></div>{!ordered.length && <p className="muted mt-4">No records match these filters.</p>}</section>
    {selectedRecord && <div role="dialog" aria-modal="true" aria-label="Opportunity details" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5" onKeyDown={e => {if(e.key === "Escape")setSelected(undefined);}}><section className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6"><div className="flex justify-between gap-4"><h2>{selectedRecord.title}</h2><button autoFocus className="self-start rounded border px-3 py-1" onClick={() => setSelected(undefined)}>Close</button></div>{selectedRecord.jobUrl && <a className="mt-3 inline-block text-sm font-semibold text-teal-800 underline" href={selectedRecord.jobUrl} target="_blank" rel="noopener noreferrer">Open Upwork job / proposal</a>}<p className="muted my-3">{selectedRecord.source.tab} - source row {selectedRecord.source.row}</p><dl className="grid grid-cols-2 gap-3 text-sm">{Object.entries({Date:selectedRecord.submittedDate||"Unresolved","Source date text":selectedRecord.rawDate||"",Time:selectedRecord.rawTime||"",Owner:selectedRecord.owner,Profile:selectedRecord.profile,Type:selectedRecord.kind||"Unknown",Result:selectedRecord.rawStage||"Unmarked",Connects:selectedRecord.connects??0,"Boosted Connects":selectedRecord.boostedConnects??"Unrecorded","Total Connects":selectedRecord.totalConnects??"Unrecorded","Outbid":selectedRecord.flags?.outbid===undefined?"Unrecorded":selectedRecord.flags.outbid?"Yes":"No",...selectedRecord.details}).map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd className="break-words font-medium">{String(value)||"Not recorded"}</dd></div>)}</dl><div className="mt-4 flex flex-wrap gap-2">{Object.entries(selectedRecord.flags||{}).map(([label,value])=><span className="rounded bg-slate-100 px-2 py-1 text-xs" key={label}>{label}: {value===undefined?"Unknown":value?"Yes":"No"}</span>)}</div>{!!selectedRecord.issues?.length&&<ul className="mt-4 list-disc pl-5 text-sm text-amber-800">{selectedRecord.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul>}</section></div>}
  </div>;
}
