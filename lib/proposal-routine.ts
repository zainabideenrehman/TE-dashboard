import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UpworkKnowledgeRecord } from "./domain";
import { writeRoutineToBlob } from "./proposal-storage";

export type ProposalProfile = "ZAIN" | "HASSAN";

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "job";
}

function knowledgeRoot() {
  return path.resolve(process.env.PROPOSAL_KNOWLEDGE_DIR || path.join(process.cwd(), "proposal-knowledge"));
}

export async function createProposalRoutine(records: UpworkKnowledgeRecord[], profile: ProposalProfile) {
  if (!records.length) throw Error("Select at least one relevant job.");
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const folder = path.join(knowledgeRoot(), "proposals", `${stamp}_${profile.toLowerCase()}_routine`);
  const folderName = path.basename(folder);
  const jobs = records.map((record, index) => ({ index: index + 1, recordId: record.recordId, jobId: record.fields["Job ID"] || "", title: record.fields["Job Title"] || "Untitled job", source: record.source }));
  const files = [{ name: "routine.json", content: JSON.stringify({ version: 1, createdAt: now.toISOString(), profile, status: "queued", provider: "pending", jobs }, null, 2) }, ...records.map((record, index) => {
    const title = record.fields["Job Title"] || "Untitled job";
    const fields = Object.entries(record.fields).map(([key, value]) => `## ${key}\n${value || "Not recorded"}`).join("\n\n");
    const body = [`# ${title}`, "", `- Profile: ${profile}`, `- Job ID: ${record.fields["Job ID"] || "Not recorded"}`, `- Source row: ${record.source.row}`, "", "## Relevant job data", "", fields, "", "## Routine instructions", "", "Read the repository proposal knowledge, perform the required research, select only supported case studies, draft the proposal and screening answers, then save the outputs in this folder for human review.", ""].join("\n");
    return { name: `${String(index + 1).padStart(2, "0")}_${safeName(title)}.md`, content: body };
  })];
  if (process.env.VERCEL) await writeRoutineToBlob(folderName, files);
  else { await mkdir(folder, { recursive: true, mode: 0o700 }); await Promise.all(files.map(file => writeFile(path.join(folder, file.name), file.content, { mode: 0o600 }))); }
  return { folder: process.env.VERCEL ? folderName : folder, count: records.length, profile, status: "queued" as const };
}
