"use client";

import { useMemo, useState } from "react";
import type { Source, UpworkKnowledgeRecord, UpworkProposal } from "@/lib/domain";
import { discoveryTimestamp, pktDay } from "@/lib/upwork-discovery";
import { upworkJobKey } from "@/lib/upwork-knowledge";

type ProposalProfile = "ZAIN" | "HASSAN";

function discoveryTime(record: UpworkKnowledgeRecord) {
  const value = discoveryTimestamp(record.fields["Discovered At"]);
  if (!value || !pktDay(value) || value.length <= 10) return undefined;
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : value.replace(" ", "T") + "+05:00";
  const time = Date.parse(zoned);
  return Number.isFinite(time) ? time : undefined;
}

function applicationStatus(record: UpworkKnowledgeRecord, proposals: UpworkProposal[]) {
  const jobKey = upworkJobKey(record.fields["Job URL"]);
  const matched = jobKey && proposals.some((proposal) => upworkJobKey(proposal.jobUrl) === jobKey);
  if (matched || /^yes$/i.test(record.fields["Applied?"])) return "Applied" as const;
  if (/^no$/i.test(record.fields["Applied?"])) return "Not applied" as const;
  return "Unknown" as const;
}

export function Integrations({ sources }: { sources: Source[] }) {
  const [profile, setProfile] = useState<ProposalProfile>("ZAIN");
  const [selected, setSelected] = useState<string>();
  const [checked, setChecked] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ title: string; body: string; jobId: string; profile: ProposalProfile }>();
  const mcpUrl = typeof window === "undefined" ? "" : `${window.location.origin}/api/mcp`;
  const jobs = sources.flatMap((source) => source.data?.upworkKnowledge || []).filter((record) => record.kind === "relevant-jobs");
  const proposals = sources.flatMap((source) => source.data?.upwork || []);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent = useMemo(() => jobs
    .map((record) => ({ record, time: discoveryTime(record) }))
    .filter((item): item is { record: UpworkKnowledgeRecord; time: number } => item.time !== undefined && item.time >= cutoff)
    .sort((a, b) => b.time - a.time), [jobs, cutoff]);
  const applied = recent.filter(({ record }) => applicationStatus(record, proposals) === "Applied").length;
  const selectedJob = recent.find(({ record }) => record.recordId === selected)?.record;
  const selectedRecords = recent.filter(({ record }) => checked.includes(record.recordId)).map(({ record }) => record);

  async function prepareRoutine(records = selectedRecords) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/integrations/routines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, records }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Could not prepare proposal routine.");
      setMessage(`Prepared ${result.count} job${result.count === 1 ? "" : "s"} in ${result.folder}. The connected cloud routine can now process this package.`);
      setChecked([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare proposal routine.");
    } finally {
      setBusy(false);
    }
  }

  async function generate(record: UpworkKnowledgeRecord) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/integrations/proposals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, record }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Proposal generation failed.");
      setDraft(result.draft);
      setMessage("Draft created. Review every field before sending.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Proposal generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function connectGPT() {
    try { if (mcpUrl) await navigator.clipboard?.writeText(mcpUrl); } catch { /* clipboard permissions are optional */ }
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
    setMessage(`Copied ${mcpUrl}. In ChatGPT, open Plugins, choose Add custom MCP server, paste the URL, and complete OAuth.`);
  }

  return <div className="space-y-5">
    <section className="panel"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2>Connect GPT MCP</h2><p className="muted mt-2">This dashboard exposes the proposal routine through the Vercel MCP endpoint. Connect it in ChatGPT, then ask GPT to process a queued routine.</p></div><button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => void connectGPT()}>Connect GPT MCP</button></div><div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><p className="font-semibold">MCP URL</p><code className="break-all">{mcpUrl || "Available after the page loads"}</code><p className="mt-2">The endpoint must be deployed on HTTPS and configured with OAuth before ChatGPT can access private routines or perform writes.</p></div></section>
    <section className="panel">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2>Apply workspace</h2><p className="muted mt-2">Relevant jobs discovered in the last 24 hours, matched to the application log by Upwork job ID.</p></div><div className="flex flex-wrap items-end gap-3"><label>Submission profile<select value={profile} onChange={(event) => setProfile(event.target.value as ProposalProfile)}><option value="ZAIN">ZAIN profile</option><option value="HASSAN">HASSAN profile</option></select></label><button disabled={!checked.length || busy} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void prepareRoutine()}>Prepare routine ({checked.length})</button></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-slate-50 p-4"><p className="text-sm text-slate-600">Last 24 hours</p><strong className="mt-2 block text-3xl">{recent.length}</strong></div><div className="rounded-xl border bg-emerald-50 p-4"><p className="text-sm text-slate-600">Already applied</p><strong className="mt-2 block text-3xl">{applied}</strong></div><div className="rounded-xl border bg-teal-50 p-4"><p className="text-sm text-slate-600">Needs a decision</p><strong className="mt-2 block text-3xl">{recent.length - applied}</strong></div></div>
      {message && <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
    </section>
    <section className="panel overflow-hidden"><h2>Recent relevant jobs</h2><div className="mt-4 overflow-x-auto"><table><thead><tr><th>Job</th><th>Discovered</th><th>Fit</th><th>Decision</th><th>Status</th><th>Action</th></tr></thead><tbody>{recent.map(({ record }) => { const fields = record.fields; const status = applicationStatus(record, proposals); return <tr key={record.recordId}><td className="min-w-72 max-w-md whitespace-normal"><button className="text-left font-semibold text-teal-800 underline" onClick={() => setSelected(record.recordId)}>{fields["Job Title"] || "Untitled job"}</button><span className="mt-1 block text-xs text-slate-500">{fields["Job ID"] || "No job ID"}</span></td><td className="whitespace-nowrap">{fields["Discovered At"] || "Unrecorded"}</td><td>{fields["Total Fit Score (100)"] || "Unscored"}</td><td>{fields["Decision Status"] || "Unrecorded"}</td><td><span className={`rounded px-2 py-1 text-xs ${status === "Applied" ? "bg-emerald-100 text-emerald-900" : status === "Not applied" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{status}</span></td><td>{status === "Applied" ? <span className="text-sm text-slate-500">Already applied</span> : <button disabled={busy} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void generate(record)}>Create proposal</button>}</td></tr>; })}</tbody></table></div>{!recent.length && <p className="muted mt-4">No relevant jobs with a valid discovery timestamp were found in the last 24 hours.</p>}</section>
    {selectedJob && <div role="dialog" aria-modal="true" aria-label="Relevant job details" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5"><section className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6"><div className="flex justify-between gap-4"><h2>{selectedJob.fields["Job Title"] || "Relevant job"}</h2><button className="rounded border px-3 py-1" onClick={() => setSelected(undefined)}>Close</button></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">{Object.entries(selectedJob.fields).map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words font-medium">{value || "Not recorded"}</dd></div>)}</dl></section></div>}
    {draft && <section className="panel"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2>Editable proposal draft</h2><p className="muted mt-1">Profile: {draft.profile}. Sending is intentionally not enabled in this milestone.</p></div><span className="badge">Review required</span></div><label className="mt-4 block">Proposal title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label className="mt-4 block">Proposal body<textarea className="min-h-80" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label><p className="mt-3 text-xs text-slate-500">Attachments, profile instructions, case studies, and GPT-generated answers will be added after the approved knowledge folder is connected.</p></section>}
    <section className="panel"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2>Bulk routine queue</h2><p className="muted mt-1 text-sm">Choose jobs here when you want one routine package for several proposals.</p></div><button className="rounded border px-3 py-2 text-sm" onClick={() => setChecked(recent.filter(({ record }) => applicationStatus(record, proposals) !== "Applied").map(({ record }) => record.recordId))}>Select all unapplied</button></div><div className="mt-4 grid gap-2">{recent.map(({ record }) => { const status = applicationStatus(record, proposals); return <label key={record.recordId} className="flex items-center gap-3 rounded-lg border p-3"><input type="checkbox" disabled={status === "Applied"} checked={checked.includes(record.recordId)} onChange={(event) => setChecked(event.target.checked ? [...checked, record.recordId] : checked.filter((id) => id !== record.recordId))} /><span className="min-w-0 flex-1 truncate">{record.fields["Job Title"] || "Untitled job"}</span><span className="text-xs text-slate-500">{status}</span></label>; })}</div></section>
  </div>;
}
