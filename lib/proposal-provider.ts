import { readFile } from "node:fs/promises";
import path from "node:path";
import type { UpworkKnowledgeRecord } from "./domain";

type ProposalProfile = "ZAIN" | "HASSAN";

function field(record: UpworkKnowledgeRecord, key: string) { return record.fields[key]?.trim() || "Not recorded"; }

const maxKnowledgeFileBytes = 120_000;
async function readKnowledgeFile(file: string) {
  const value = await readFile(file, "utf8");
  return value.slice(0, maxKnowledgeFileBytes);
}

async function loadKnowledge(record: UpworkKnowledgeRecord, directory: string) {
  const root = path.resolve(directory);
  const fixed = [
    "CLAUDE.md",
    "_reference/voice-rules.md",
    "_reference/discovery-format.md",
    ".claude/commands/proposal.md",
    "_reference/portfolio/_index.md",
  ];
  const parts: string[] = [];
  for (const relative of fixed) {
    try { parts.push(`FILE: ${relative}\n${await readKnowledgeFile(path.join(root, relative))}`); } catch { /* optional knowledge file */ }
  }
  const title = `${field(record, "Job Title")} ${field(record, "Required Skills")} ${field(record, "Primary Vertical")}`.toLowerCase();
  let index = "";
  try { index = await readKnowledgeFile(path.join(root, "_reference/portfolio/_index.md")); } catch { /* optional index */ }
  const candidates = [...index.matchAll(/(?:case-study-[a-z0-9-]+\.md)/gi)].map((match) => match[0]);
  const selected = candidates.filter((file) => title.split(/\W+/).some((word) => word.length > 3 && file.includes(word))).slice(0, 2);
  for (const relative of selected) {
    try { parts.push(`FILE: _reference/portfolio/${relative}\n${await readKnowledgeFile(path.join(root, "_reference/portfolio", relative))}`); } catch { /* optional case study */ }
  }
  return parts.join("\n\n").slice(0, 400_000);
}

export async function generateProposalDraft(record: UpworkKnowledgeRecord, profile: ProposalProfile) {
  const apiKey = process.env.OPENAI_API_KEY;
  const knowledgeDirectory = process.env.PROPOSAL_KNOWLEDGE_DIR || path.join(process.cwd(), "proposal-knowledge");
  const knowledge = await loadKnowledge(record, knowledgeDirectory);
  if (!apiKey) throw Error("The proposal knowledge folder is connected, but dashboard-triggered generation still needs an OpenAI-compatible backend. MCP/OAuth can let ChatGPT call this app, but cannot be used by this local dashboard as a personal ChatGPT subscription API.");
  const prompt = [`Create an editable Upwork proposal for the ${profile} profile.`, `Job title: ${field(record, "Job Title")}`, `Required skills: ${field(record, "Required Skills")}`, `Job type: ${field(record, "Job Type")}`, `Client country: ${field(record, "Client Country")}`, "Use only claims, links, and case studies supported by the knowledge files below.", "Return only JSON with title and body fields.", "KNOWLEDGE FILES:", knowledge].join("\n");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.2", input: prompt }) });
  if (!response.ok) throw Error(`OpenAI proposal generation failed (${response.status}).`);
  const result = await response.json() as { output_text?: string };
  let parsed: { title?: string; body?: string } = {};
  try { parsed = JSON.parse(result.output_text || "{}"); } catch { parsed = { body: result.output_text }; }
  return { title: parsed.title || field(record, "Job Title"), body: parsed.body || "", jobId: field(record, "Job ID"), profile };
}
