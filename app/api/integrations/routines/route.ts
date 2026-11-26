import { NextRequest, NextResponse } from "next/server";
import { createProposalRoutine, type ProposalProfile } from "@/lib/proposal-routine";
import { listRoutineFolders, readRoutineFromBlob, usesBlobStorage, writeRoutineResultToBlob } from "@/lib/proposal-storage";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localRoot() { return path.resolve(process.env.PROPOSAL_KNOWLEDGE_DIR || path.join(process.cwd(), "proposal-knowledge"), "proposals"); }
function safe(value: unknown) { return typeof value === "string" && /^[a-zA-Z0-9_.-]+$/.test(value) ? value : undefined; }

export async function GET(request: NextRequest) {
  try {
    const routine = safe(request.nextUrl.searchParams.get("routine"));
    const folders = usesBlobStorage() ? await listRoutineFolders() : (await readdir(localRoot(), { withFileTypes: true }).catch(() => [])).filter(entry => entry.isDirectory()).map(entry => entry.name).sort().reverse();
    if (!routine) return NextResponse.json({ routines: folders });
    if (!folders.includes(routine)) return NextResponse.json({ error: "Routine not found." }, { status: 404 });
    const files = usesBlobStorage() ? await readRoutineFromBlob(routine) : await (async () => {
      const folder = path.join(localRoot(), routine);
      const names = (await readdir(folder)).filter(name => name.endsWith(".md") || name === "routine.json");
      return Promise.all(names.map(async file => ({ file, content: (await readFile(path.join(folder, file), "utf8")).slice(0, 160_000) })));
    })();
    return NextResponse.json({ routine, files });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read routines." }, { status: 400 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = body?.profile as ProposalProfile;
    const records = Array.isArray(body?.records) ? body.records : [];
    if (!["ZAIN", "HASSAN"].includes(profile)) return NextResponse.json({ error: "A valid submission profile is required." }, { status: 400 });
    return NextResponse.json(await createProposalRoutine(records, profile));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare proposal routine." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const routine = safe(body?.routine), jobFile = safe(body?.jobFile);
    if (!routine || !jobFile || !jobFile.endsWith(".md")) return NextResponse.json({ error: "A valid routine and job Markdown file are required." }, { status: 400 });
    const output = ["# Proposal result", "", "## Proposal", String(body?.proposal || ""), "", "## Screening answers", String(body?.screeningAnswers || ""), "", "## Research notes", String(body?.researchNotes || ""), "", "## Human review", "", "Review the profile, proposal, answers, links, attachments, pricing, and Upwork destination before submission.", ""].join("\n");
    const outputFile = jobFile.replace(/\.md$/, ".result.md");
    if (usesBlobStorage()) await writeRoutineResultToBlob(routine, outputFile, output);
    else { const folder = path.join(localRoot(), routine); await mkdir(folder, { recursive: true }); await writeFile(path.join(folder, outputFile), output, { mode: 0o600 }); }
    return NextResponse.json({ routine, file: outputFile, saved: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save proposal result." }, { status: 400 }); }
}
