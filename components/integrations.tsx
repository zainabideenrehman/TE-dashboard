"use client";

import { useMemo, useState } from "react";
import type { Source, UpworkKnowledgeRecord, UpworkProposal } from "@/lib/domain";
import { discoveryTimestamp, pktDay } from "@/lib/upwork-discovery";
import { upworkJobKey } from "@/lib/upwork-knowledge";

type ProposalProfile = "ZAIN" | "HASSAN";
type Mode = "settings" | "apply";

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

function display(fields: Record<string, string>, key: string) { return fields[key]?.trim() || "Not recorded"; }
function details(fields: Record<string, string>, title: string, keys: string[]) {
  return <div><h3 className="text-sm font-semibold text-slate-900">{title}</h3><dl className="mt-2 grid gap-2 sm:grid-cols-2">{keys.map(key => <div key={key}><dt className="text-xs text-slate-500">{key}</dt><dd className="break-words text-sm font-medium">{display(fields, key)}</dd></div>)}</dl></div>;
}

export function Integrations({ sources, mode = "settings" }: { sources: Source[]; mode?: Mode }) {
  const [profile, setProfile] = useState<ProposalProfile>("ZAIN");
  const [selected, setSelected] = useState<string>();
  const [checked, setChecked] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [routines, setRoutines] = useState<string[]>([]);
  const [routineFiles, setRoutineFiles] = useState<{ file: string; content: string }[]>([]);
  const [routine, setRoutine] = useState("");
  const [reviewFile, setReviewFile] = useState("");
  const [proposal, setProposal] = useState("");
  const [screeningAnswers, setScreeningAnswers] = useState("");
  const [researchNotes, setResearchNotes] = useState("");
  const mcpUrl = typeof window === "undefined" ? "" : `${window.location.origin}/api/mcp`;
  const jobs = sources.flatMap((source) => source.data?.upworkKnowledge || []).filter((record) => record.kind === "relevant-jobs");
  const proposals = sources.flatMap((source) => source.data?.upwork || []);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent = useMemo(() => jobs.map((record) => ({ record, time: discoveryTime(record) })).filter((item): item is { record: UpworkKnowledgeRecord; time: number } => item.time !== undefined && item.time >= cutoff).sort((a, b) => b.time - a.time), [jobs, cutoff]);
  const applied = recent.filter(({ record }) => applicationStatus(record, proposals) === "Applied").length;
  const selectedJob = recent.find(({ record }) => record.recordId === selected)?.record;
  const selectedRecords = recent.filter(({ record }) => checked.includes(record.recordId)).map(({ record }) => record);

  async function loadRoutines(selectedRoutine?: string) {
    const response = await fetch(selectedRoutine ? `/api/integrations/routines?routine=${encodeURIComponent(selectedRoutine)}` : "/api/integrations/routines");
    const result = await response.json();
    if (!response.ok) throw Error(result.error || "Could not load routines.");
    setRoutines(result.routines || []);
    if (selectedRoutine) { setRoutine(selectedRoutine); setRoutineFiles(result.files || []); }
  }

  function openReview(file: { file: string; content: string }) {
    setReviewFile(file.file);
    const proposalMatch = file.content.match(/## Proposal\n([\s\S]*?)(?=\n## Screening answers|$)/);
    const answersMatch = file.content.match(/## Screening answers\n([\s\S]*?)(?=\n## Research notes|$)/);
    const notesMatch = file.content.match(/## Research notes\n([\s\S]*?)(?=\n## Human review|$)/);
    setProposal((proposalMatch?.[1] || "").trim()); setScreeningAnswers((answersMatch?.[1] || "").trim()); setResearchNotes((notesMatch?.[1] || "").trim());
  }

  async function saveReview() {
    setBusy(true);
    try { const response = await fetch("/api/integrations/routines", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ routine, jobFile: reviewFile.replace(/\.result\.md$/, ".md"), proposal, screeningAnswers, researchNotes }) }); const result = await response.json(); if (!response.ok) throw Error(result.error || "Could not save review."); setMessage(`Saved ${result.file} for human review.`); await loadRoutines(routine); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save review."); }
    finally { setBusy(false); }
  }

  async function prepareRoutine() {
    if (!selectedRecords.length) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/integrations/routines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, records: selectedRecords }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Could not prepare proposal routine.");
      setMessage(`Queued ${result.count} job${result.count === 1 ? "" : "s"} for ${profile}. Routine: ${result.folder}`);
      await loadRoutines();
      setChecked([]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not prepare proposal routine."); }
    finally { setBusy(false); }
  }

  async function copyMcpUrl() {
    try { if (mcpUrl) await navigator.clipboard?.writeText(mcpUrl); } catch { /* clipboard is optional */ }
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
    setMessage(`Copied ${mcpUrl}. ChatGPT is already connected; this is only for reconnecting or copying the endpoint.`);
  }

  if (mode === "settings") return <div className="space-y-5">
    <section className="panel"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Connected configuration</p><h2 className="mt-1">GPT MCP is ready</h2><p className="muted mt-2">ChatGPT is connected to the deployed proposal routine endpoint. Use Upwork BD → Apply Jobs to queue work; this page only manages the connection.</p></div><button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900" onClick={() => void copyMcpUrl()}>Copy MCP URL</button></div><div className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-950"><p className="font-semibold">MCP endpoint</p><code className="break-all">{mcpUrl || "Available after the page loads"}</code><p className="mt-2">If ChatGPT asks for the server again, paste this URL and complete GitHub authorization.</p></div></section>
    <section className="panel"><h2>How this integration works</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{[["1 · Select", "Choose relevant jobs in Upwork BD → Apply Jobs."], ["2 · Queue", "Click Prepare routine once for the selected jobs and profile."], ["3 · Draft", "Ask GPT to read the queued routine and create proposal drafts for review."]].map(([title, text]) => <div className="rounded-xl border p-4" key={title}><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</p><p className="mt-2 text-sm">{text}</p></div>)}</div></section>
  </div>;

  return <div className="space-y-5">
    <section className="panel"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2>Apply jobs</h2><p className="muted mt-2">Select jobs from the last 24 hours and queue one profile-specific routine. There is no single-job proposal action here.</p></div><div className="flex flex-wrap items-end gap-3"><label>Submission profile<select value={profile} onChange={(event) => setProfile(event.target.value as ProposalProfile)}><option value="ZAIN">ZAIN profile</option><option value="HASSAN">HASSAN profile</option></select></label><button disabled={!checked.length || busy} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void prepareRoutine()}>Prepare routine ({checked.length})</button></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-slate-50 p-4"><p className="text-sm text-slate-600">Last 24 hours</p><strong className="mt-2 block text-3xl">{recent.length}</strong></div><div className="rounded-xl border bg-emerald-50 p-4"><p className="text-sm text-slate-600">Already applied</p><strong className="mt-2 block text-3xl">{applied}</strong></div><div className="rounded-xl border bg-teal-50 p-4"><p className="text-sm text-slate-600">Available to select</p><strong className="mt-2 block text-3xl">{recent.length - applied}</strong></div></div>{message && <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}</section>
    <section className="panel overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2>Relevant jobs · last 24 hours</h2><p className="muted mt-1">Click a title for full client, budget, competition, proof, and fit data. The checkbox is the only apply action.</p></div><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setChecked(recent.filter(({ record }) => applicationStatus(record, proposals) !== "Applied").map(({ record }) => record.recordId))}>Select all unapplied</button></div><div className="mt-4 overflow-x-auto"><table><thead><tr><th>Select</th><th>Job</th><th>Client</th><th>Budget / type</th><th>Competition</th><th>Fit</th><th>Status</th></tr></thead><tbody>{recent.map(({ record }) => { const fields = record.fields; const status = applicationStatus(record, proposals); return <tr key={record.recordId}><td><input aria-label={`Select ${fields["Job Title"] || "job"}`} type="checkbox" disabled={status === "Applied"} checked={checked.includes(record.recordId)} onChange={(event) => setChecked(event.target.checked ? [...checked, record.recordId] : checked.filter((id) => id !== record.recordId))} /></td><td className="min-w-72 max-w-md whitespace-normal"><button className="text-left font-semibold text-teal-800 underline" onClick={() => setSelected(record.recordId)}>{fields["Job Title"] || "Untitled job"}</button><span className="mt-1 block text-xs text-slate-500">{fields["Job ID"] || "No job ID"} · {fields["Discovered At"] || "Unrecorded"}</span></td><td className="whitespace-nowrap">{display(fields, "Client Country")}<span className="mt-1 block text-xs text-slate-500">Hire rate: {display(fields, "Client Hire Rate")}</span></td><td className="whitespace-nowrap">{display(fields, "Budget Currency")} {display(fields, "Budget Min")}–{display(fields, "Budget Max")}<span className="mt-1 block text-xs text-slate-500">{display(fields, "Job Type")}</span></td><td className="whitespace-nowrap">{display(fields, "Proposals at Discovery")} proposals<span className="mt-1 block text-xs text-slate-500">{display(fields, "Connects Required")} connects</span></td><td>{display(fields, "Total Fit Score (100)")}<span className="mt-1 block text-xs text-slate-500">{display(fields, "Priority")}</span></td><td><span className={`rounded px-2 py-1 text-xs ${status === "Applied" ? "bg-emerald-100 text-emerald-900" : status === "Not applied" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{status}</span></td></tr>; })}</tbody></table></div>{!recent.length && <p className="muted mt-4">No relevant jobs with a valid discovery timestamp were found in the last 24 hours.</p>}</section>
    <section className="panel"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2>Proposal review workspace</h2><p className="muted mt-1">GPT-generated proposals, screening answers, and research notes appear here after GPT saves the result.</p></div><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => void loadRoutines()}>Refresh routines</button></div><div className="mt-4 grid gap-4 lg:grid-cols-[18rem_1fr]"><div className="space-y-2">{routines.length ? routines.map(item => <button key={item} className={`block w-full rounded-lg border p-3 text-left text-sm ${routine === item ? "border-teal-500 bg-teal-50" : "bg-white"}`} onClick={() => void loadRoutines(item)}>{item}</button>) : <p className="muted text-sm">No routines loaded yet. Click Refresh routines after preparing a job.</p>}</div><div>{routineFiles.length ? <><div className="mb-3 flex flex-wrap gap-2">{routineFiles.filter(file => file.file.endsWith(".result.md")).map(file => <button key={file.file} className={`rounded-lg border px-3 py-2 text-sm ${reviewFile === file.file ? "border-teal-500 bg-teal-50" : ""}`} onClick={() => openReview(file)}>{file.file}</button>)}</div>{reviewFile ? <div className="space-y-3"><label>Proposal<textarea className="min-h-52" value={proposal} onChange={event => setProposal(event.target.value)} /></label><label>Screening answers<textarea className="min-h-40" value={screeningAnswers} onChange={event => setScreeningAnswers(event.target.value)} /></label><label>Research notes<textarea className="min-h-32" value={researchNotes} onChange={event => setResearchNotes(event.target.value)} /></label><button disabled={busy} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void saveReview()}>Save reviewed draft</button></div> : <p className="muted text-sm">Select a generated result file to edit it.</p>}</> : <p className="muted text-sm">Select a routine to inspect its job briefs and generated results.</p>}</div></div></section>
    {selectedJob && <div role="dialog" aria-modal="true" aria-label="Relevant job details" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5"><section className="max-h-[85vh] w-full max-w-5xl overflow-auto rounded-xl bg-white p-6"><div className="flex justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Job intelligence</p><h2 className="mt-1">{selectedJob.fields["Job Title"] || "Relevant job"}</h2></div><button className="rounded border px-3 py-1" onClick={() => setSelected(undefined)}>Close</button></div><div className="mt-6 grid gap-6 md:grid-cols-2">{details(selectedJob.fields, "Client", ["Client Country", "Payment Verified", "Client Hire Rate", "Client Total Spent", "Client Jobs Posted", "Client Open Jobs"])}{details(selectedJob.fields, "Job and budget", ["Job Type", "Budget Min", "Budget Max", "Budget Currency", "Duration", "Experience Level"])}{details(selectedJob.fields, "Competition", ["Proposals at Discovery", "Interviewing at Discovery", "Invites Sent at Discovery", "Connects Required"])}{details(selectedJob.fields, "Fit and proof", ["Total Fit Score (100)", "Priority", "Service / Capability Score (30)", "Relevant Proof Score (20)", "Client Credibility Score (15)", "Budget / Scope Score (15)", "Commercial Potential Score (10)", "Timing / Competition Score (10)", "Required Skills", "Portfolio / Demo Links"])} </div><div className="mt-6">{selectedJob.fields["Job URL"] && <a className="text-sm font-semibold text-teal-800 underline" href={selectedJob.fields["Job URL"]} target="_blank" rel="noopener noreferrer">Open Upwork job</a>}<p className="muted mt-2 text-xs">Decision: {display(selectedJob.fields, "Decision Status")} · {display(selectedJob.fields, "Decision Notes")}</p></div></section></div>}
  </div>;
}
