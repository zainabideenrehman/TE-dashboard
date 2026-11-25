import { agencyHire, agencyInterview } from './upwork-outcomes';
import { parseReport, reportTabs } from './upwork-reports';
import { parseAppliedJobs } from "./upwork-applied";
import {parseKnowledge} from "./upwork-knowledge";
import type { Grid, Mapping, Parsed, UpworkMapping, UpworkProposal, UpworkStage, ProfileLinkCells } from "./domain";

export const upworkStages: UpworkStage[] = ["Submitted", "Replied", "Interview", "Won", "Lost", "Withdrawn", "Closed"];
export const defaultUpworkMapping: UpworkMapping = {
  proposalId: "Proposal ID", submittedDate: "Submitted Date", title: "Job Title", owner: "BD Owner", profile: "Upwork Profile", stage: "Stage", replyDate: "Reply Date", interviewDate: "Interview Date", wonDate: "Won Date", jobUrl: "Job URL", connects: "Connects",
  stageMap: Object.fromEntries(upworkStages.map(stage => [stage, stage])),
};
const fields = ["proposalId", "submittedDate", "title", "owner", "profile", "stage", "replyDate", "interviewDate", "wonDate", "jobUrl", "connects"] as const;
export function validateUpworkMapping(value: unknown): UpworkMapping {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid Upwork mapping.");
  const candidate = value as UpworkMapping;
  if(candidate.knowledge!==undefined && !["keywords","relevant-jobs"].includes(candidate.knowledge))throw Error("Invalid Upwork knowledge mapping.");
  if (candidate.report !== undefined && (typeof candidate.report !== "string" || !Object.hasOwn(reportTabs, candidate.report) || candidate.knowledge || candidate.appliedJobs)) throw Error("Invalid Upwork report layout.");
  if(candidate.knowledge && candidate.appliedJobs)throw Error("Choose one Upwork layout.");
  for (const field of fields) if (typeof candidate[field] !== "string" || candidate[field].length > 100 || /credential|password|secret|salary|payroll|bank|iban/i.test(candidate[field])) throw Error("Invalid or excluded Upwork field: " + field);
  if (!candidate.submittedDate.trim() || !candidate.title.trim() || !candidate.stage.trim()) throw Error("Upwork date, job title and stage columns are required.");
  const columns = fields.map(field => candidate[field].trim().toLowerCase()).filter(Boolean);
  if (new Set(columns).size !== columns.length) throw Error("Upwork fields must use distinct columns.");
  if (!candidate.stageMap || typeof candidate.stageMap !== "object" || Array.isArray(candidate.stageMap) || Object.keys(candidate.stageMap).length > 100) throw Error("Invalid Upwork stage map.");
  for (const [raw, normalized] of Object.entries(candidate.stageMap)) if (!raw.trim() || raw.length > 100 || ["__proto__", "prototype", "constructor"].includes(raw) || !upworkStages.includes(normalized)) throw Error("Invalid Upwork stage rule.");
  if (candidate.appliedJobs) {
    const a = candidate.appliedJobs;
    if (!Number.isInteger(a.year) || a.year < 2000 || a.year > 2100 || !Number.isInteger(a.dateAnchorColumn) || a.dateAnchorColumn < 0 || a.dateAnchorColumn >= 45 || a.connectsMode !== "separate" || !/^\d{4}-\d{2}-\d{2}$/.test(a.defaultStartDate)) throw Error("Invalid applied-jobs layout rules.");
  }
  return structuredClone(candidate);
}
function isoDate(raw: string, row: number, field: string, required = false) {
  if (!raw && !required) return undefined;
  const parsed = new Date(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== raw) throw Error(`Upwork row ${row}: ${field} must be an unambiguous ISO date (YYYY-MM-DD).`);
  return raw;
}
export function parseUpwork(grid: Grid, mapping: Mapping, spreadsheetId: string, tab: string, links?: ProfileLinkCells): Parsed {
  const m = validateUpworkMapping(mapping.upwork);
  if (m.report) {
    if (reportTabs[m.report].toLowerCase() !== tab.toLowerCase()) throw Error("Report layout does not match the tab.");
    return parseReport(grid, m.report);
  }
  if(m.knowledge)return parseKnowledge(grid,m.knowledge,spreadsheetId,tab);
  if (m.appliedJobs) return parseAppliedJobs(grid, m, spreadsheetId, tab, links);
  const required = [m.submittedDate, m.title, m.stage].map(s => s.trim().toLowerCase());
  const headers = grid.flatMap((row, index) => required.every(field => row.some(cell => cell.trim().toLowerCase() === field)) ? [{ row, index }] : []);
  if (headers.length !== 1) throw Error("Expected one recognizable Upwork header; inspect column names and repeated sections.");
  const header = headers[0];
  const positions = Object.fromEntries(fields.map(field => {
    if (!m[field].trim()) return [field, -1];
    const found = header.row.flatMap((cell, i) => cell.trim().toLowerCase() === m[field].trim().toLowerCase() ? [i] : []);
    if (found.length !== 1) throw Error(`Upwork column missing or ambiguous: ${m[field]}`);
    return [field, found[0]];
  })) as Record<typeof fields[number], number>;
  const proposals: UpworkProposal[] = [];
  const warnings = new Set<string>();
  const reviews: string[] = [];
  const ids = new Set<string>();
  for (let ri = header.index + 1; ri < grid.length; ri++) {
    const row = grid[ri];
    if (!Object.values(positions).some(ci => ci >= 0 && row[ci]?.trim())) continue;
    const cell = (field: typeof fields[number]) => positions[field] < 0 ? "" : row[positions[field]]?.trim() || "";
    const submittedDate = isoDate(cell("submittedDate"), ri + 1, "Submitted Date", true)!;
    const title = cell("title");
    if (!title) throw Error(`Upwork row ${ri + 1}: job title missing.`);
    const proposalId = cell("proposalId") || undefined;
    if (proposalId && ids.has(proposalId)) throw Error("Duplicate Upwork proposal ID: " + proposalId);
    if (proposalId) ids.add(proposalId);
    const rawStage = cell("stage");
    const stage = Object.hasOwn(m.stageMap, rawStage) ? m.stageMap[rawStage] : undefined;
    if (rawStage && !stage) warnings.add("Unmapped Upwork stage: " + rawStage);
    if (!rawStage) reviews.push(`Row ${ri + 1}: stage not recorded.`);
    const replyDate = isoDate(cell("replyDate"), ri + 1, "Reply Date");
    const interviewDate = isoDate(cell("interviewDate"), ri + 1, "Interview Date");
    const wonDate = isoDate(cell("wonDate"), ri + 1, "Won Date");
    for (const date of [replyDate, interviewDate, wonDate]) if (date && date < submittedDate) throw Error(`Upwork row ${ri + 1}: outcome date precedes submission.`);
    const rawConnects = cell("connects");
    const connects = rawConnects ? Number(rawConnects) : undefined;
    if (connects !== undefined && (!/^\d+$/.test(rawConnects) || !Number.isSafeInteger(connects) || connects < 0)) throw Error(`Upwork row ${ri + 1}: invalid connects; blanks are unknown, not zero.`);
    const rawUrl = cell("jobUrl");
    let jobUrl: string | undefined;
    if (rawUrl) {
      try { const url = new URL(rawUrl); if (url.protocol !== "https:" || !/(^|\.)upwork\.com$/i.test(url.hostname) || url.username || url.password) throw Error(); jobUrl = url.href; }
      catch { throw Error(`Upwork row ${ri + 1}: job link must be an HTTPS Upwork URL.`); }
    }
    if (!cell("owner")) reviews.push(`Row ${ri + 1}: owner not recorded; no employee identity inferred.`);
    if (stage === "Won" && !wonDate) reviews.push(`Row ${ri + 1}: won stage has no win date.`);
    proposals.push({ recordId: `${spreadsheetId}/${tab}/${proposalId ? "id:" + proposalId : "row:" + (ri + 1)}`, proposalId, submittedDate, title, owner: cell("owner") || "Unassigned", profile: cell("profile") || "Unspecified", stage, rawStage, replyDate, interviewDate, wonDate, connects, jobUrl, source: { spreadsheetId, tab, row: ri + 1 } });
  }
  if (!proposals.length) throw Error("No Upwork proposal rows found. Last-good data retained.");
  return { employees: [], attendance: [], upwork: proposals, warnings: [...warnings], reviews };
}
export function upworkAnalytics(records: UpworkProposal[], asOf: string) {
  const rows = records.filter(r => !r.submittedDate || r.submittedDate <= asOf);
  const reached = (date: string | undefined, stage: UpworkStage | undefined, target: UpworkStage) => date ? date <= asOf : stage === target;
  const proposals = rows.length;
  const replies = rows.filter(r => r.flags?.replied === true || reached(r.replyDate, r.stage, "Replied")).length;
  const interviews = rows.filter(r => agencyInterview(r, asOf)).length;
  const wins = rows.filter(r => agencyHire(r, asOf)).length;
  const replyEvidence = rows.some(r => r.flags?.replied !== undefined || !!r.replyDate || r.stage === "Replied");
  const hireEvidence = rows.some(r => r.flags?.hired === false || !!r.wonDate || r.stage === "Won" || r.stage === "Lost");
  const interviewEvidence = rows.some(r => r.flags?.interviewed !== undefined || !!r.interviewDate || r.stage === "Interview");
  const connectsRows = rows.filter(r => r.connects !== undefined);
  const withFlag = (field: "viewed" | "replied" | "interviewed" | "hired") => rows.filter(r => r.flags?.[field] !== undefined).length;
  return { proposals, replies, interviews, wins, totalConnects: rows.reduce((sum, row) => sum + (row.totalConnects ?? 0), 0), totalConnectsCoverage: rows.filter(row => row.totalConnects !== undefined).length, outbid: rows.filter(row => row.flags?.outbid === true).length, outbidCoverage: rows.filter(row => row.flags?.outbid !== undefined).length, replyEvidence, hireEvidence, interviewEvidence, viewed: rows.filter(r => r.flags?.viewed === true).length, viewedCoverage: withFlag("viewed"), replyCoverage: withFlag("replied"), interviewCoverage: withFlag("interviewed"), hiredCoverage: withFlag("hired"), boostedConnects: rows.reduce((n, r) => n + (r.boostedConnects || 0), 0), boostedConnectsCoverage: rows.filter(r => r.boostedConnects !== undefined).length, invites: rows.filter(r => r.kind === "Invite").length, unknownDates: rows.filter(r => !r.submittedDate).length, issues: rows.reduce((n, r) => n + (r.issues?.length || 0), 0), replyRate: proposals && replyEvidence ? replies / proposals : undefined, winRate: proposals && hireEvidence ? wins / proposals : undefined, connects: connectsRows.reduce((n, r) => n + r.connects!, 0), connectsCoverage: connectsRows.length, missingOwners: rows.filter(r => r.owner === "Unassigned").length, missingStages: rows.filter(r => !r.stage).length, futureSubmissions: records.length - rows.length };
}
export function upworkBucket(date: string, period: "Day" | "Week" | "Month") {
  if (period === "Month") return date.slice(0, 7);
  if (period === "Day") return date;
  const parsed = new Date(date + "T00:00:00Z");
  parsed.setUTCDate(parsed.getUTCDate() - (parsed.getUTCDay() + 6) % 7);
  return parsed.toISOString().slice(0, 10);
}

// Include empty periods so a missing week cannot be compared to an older active week.
export function upworkTimeline(records: UpworkProposal[], period: "Day" | "Week" | "Month", start: string, end: string, asOf: string) {
  const dated = records.filter(r => r.submittedDate && r.submittedDate <= asOf && (!start || r.submittedDate >= start) && (!end || r.submittedDate <= end));
  const first = start || dated.map(r => r.submittedDate).sort()[0];
  const last = end && end < asOf ? end : asOf;
  if (!first || first > last) return [];
  const result: (ReturnType<typeof upworkAnalytics> & {date:string;change:number|undefined;changeRate:number|undefined;partial:boolean})[] = [];
  let cursor = upworkBucket(first, period);
  while (cursor <= last && result.length < 40000) {
    const stats = upworkAnalytics(dated.filter(r => upworkBucket(r.submittedDate, period) === cursor), asOf);
    const previous = result[result.length - 1];
    const next = new Date(cursor.length === 7 ? cursor + '-01T00:00:00Z' : cursor + 'T00:00:00Z');
    if (period === 'Month') next.setUTCMonth(next.getUTCMonth() + 1);
    else next.setUTCDate(next.getUTCDate() + (period === 'Week' ? 7 : 1));
    const nextKey = next.toISOString().slice(0, period === 'Month' ? 7 : 10);
    const periodEnd = new Date(next.toISOString()); periodEnd.setUTCDate(periodEnd.getUTCDate() - 1);
    result.push({date:cursor, ...stats, change:previous ? stats.proposals - previous.proposals : undefined, changeRate:previous?.proposals ? (stats.proposals - previous.proposals) / previous.proposals : undefined, partial:cursor < first.slice(0,cursor.length) || periodEnd.toISOString().slice(0,10) > last});
    cursor = nextKey;
  }
  return result;
}
