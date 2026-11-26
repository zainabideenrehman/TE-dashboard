import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { readToken } from "../../../lib/mcp-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const protocolVersion = "2025-06-18";
const tools = [
  { name: "list_proposal_routines", description: "List queued proposal routines from the repository workspace.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "read_proposal_routine", description: "Read one queued proposal routine and its job briefs.", inputSchema: { type: "object", required: ["routine"], properties: { routine: { type: "string" } }, additionalProperties: false } },
  { name: "write_proposal_result", description: "Write a GPT-reviewed proposal result into a routine folder. Human review remains required before submission.", inputSchema: { type: "object", required: ["routine", "jobFile", "proposal", "screeningAnswers", "researchNotes"], properties: { routine: { type: "string" }, jobFile: { type: "string" }, proposal: { type: "string" }, screeningAnswers: { type: "string" }, researchNotes: { type: "string" } }, additionalProperties: false } },
];

function root() { return path.resolve(process.env.PROPOSAL_KNOWLEDGE_DIR || path.join(process.cwd(), "proposal-knowledge")); }
function routinesRoot() { return path.join(root(), "proposals"); }
function safeSegment(value: unknown) { return typeof value === "string" && /^[a-zA-Z0-9_.-]+$/.test(value) ? value : undefined; }
function insideRoutines(...segments: string[]) {
  const base = routinesRoot();
  const target = path.resolve(base, ...segments);
  if (target !== base && !target.startsWith(base + path.sep)) throw Error("Path is outside proposal routines.");
  return target;
}
function authorized(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer && readToken(bearer)) return true;
  if (!process.env.VERCEL && !process.env.MCP_BEARER_TOKEN) return true;
  const expected = process.env.MCP_BEARER_TOKEN;
  return !!expected && bearer === expected;
}
function jsonRpc(id: unknown, result: unknown) { return NextResponse.json({ jsonrpc: "2.0", id, result }); }
function errorRpc(id: unknown, code: number, message: string) { return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status: code === -32001 ? 401 : 400 }); }

async function callTool(name: string, args: Record<string, unknown>) {
  if (name === "list_proposal_routines") {
    let entries: string[] = [];
    try { entries = (await readdir(routinesRoot(), { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse(); } catch { /* no routines yet */ }
    return { content: [{ type: "text", text: JSON.stringify({ routines: entries }) }], structuredContent: { routines: entries } };
  }
  const routine = safeSegment(args.routine);
  if (!routine) throw Error("A safe routine folder name is required.");
  const folder = insideRoutines(routine);
  if (name === "read_proposal_routine") {
    const files = (await readdir(folder, { withFileTypes: true })).filter((entry) => entry.isFile() && entry.name.endsWith(".md") || entry.name === "routine.json").map((entry) => entry.name);
    const contents = await Promise.all(files.map(async (file) => ({ file, content: (await readFile(insideRoutines(routine, file), "utf8")).slice(0, 120_000) })));
    return { content: [{ type: "text", text: JSON.stringify({ routine, files: contents }) }], structuredContent: { routine, files: contents } };
  }
  if (name === "write_proposal_result") {
    const jobFile = safeSegment(args.jobFile);
    if (!jobFile || !jobFile.endsWith(".md")) throw Error("A safe Markdown job filename is required.");
    const output = ["# Proposal result", "", "## Proposal", String(args.proposal || ""), "", "## Screening answers", String(args.screeningAnswers || ""), "", "## Research notes", String(args.researchNotes || ""), "", "## Human review", "", "Do not submit until the selected profile, proposal, answers, links, attachments, pricing, and Upwork destination have been reviewed by a person.", ""].join("\n");
    await mkdir(folder, { recursive: true });
    const outputFile = insideRoutines(routine, jobFile.replace(/\.md$/, ".result.md"));
    await writeFile(outputFile, output, { mode: 0o600 });
    return { content: [{ type: "text", text: `Saved ${path.basename(outputFile)} for human review.` }], structuredContent: { file: path.basename(outputFile), reviewRequired: true } };
  }
  throw Error("Unknown MCP tool.");
}

export async function GET() {
  return NextResponse.json({ name: "Agency Command Center Proposal MCP", endpoint: "/api/mcp", protocol: "streamable-http", protocolVersion, tools: tools.map((tool) => tool.name), oauthConfigured: !!process.env.MCP_OAUTH_ISSUER });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return errorRpc(null, -32001, "MCP OAuth is not configured for this deployment.");
  try {
    const message = await request.json() as { id?: unknown; method?: string; params?: Record<string, unknown> };
    if (message.method === "notifications/initialized") return new NextResponse(null, { status: 202 });
    if (message.method === "initialize") return jsonRpc(message.id, { protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "agency-command-center-proposal-mcp", version: "0.1.0" } });
    if (message.method === "tools/list") return jsonRpc(message.id, { tools });
    if (message.method === "tools/call") {
      const params = message.params || {};
      return jsonRpc(message.id, await callTool(String(params.name || ""), (params.arguments || {}) as Record<string, unknown>));
    }
    return errorRpc(message.id, -32601, "Method not found.");
  } catch (error) {
    return errorRpc(null, -32602, error instanceof Error ? error.message : "Invalid MCP request.");
  }
}
