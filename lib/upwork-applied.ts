import type { Grid, Parsed, UpworkMapping, UpworkProposal, ProfileLinkCells } from "./domain";

export const appliedJobsMapping: UpworkMapping = {
  appliedJobs: { year: 2026, dateAnchorColumn: 0, connectsMode: "separate", defaultStartDate: "2026-10-01" },
  proposalId: "", submittedDate: "Day", title: "Jobs/ Proposal Links", owner: "Applied By", profile: "Profile", stage: "Result", replyDate: "", interviewDate: "", wonDate: "", jobUrl: "", connects: "Connects",
  stageMap: { "Still Open": "Submitted", Interviewed: "Interview", Won: "Won", Lost: "Lost", "Hired Someone": "Lost", "Job Closed": "Closed", "Job Closeed": "Closed" },
};
const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function monthSectionYear(raw: string): number | undefined {
  const match=raw.match(/^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s/-]+(\d{4}|\d{2})$/i);
  return match ? Number(match[2])+(match[2].length===2?2000:0) : undefined;
}
function validDate(year: number, month: number, day: number) {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(iso);
  return !isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === iso ? iso : undefined;
}
export function appliedDate(text: string, year: number): string | undefined {
  text = text.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const numeric = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (numeric) {
    const a = Number(numeric[1]), b = Number(numeric[2]), y = Number(numeric[3]);
    if (a > 12 && b <= 12) return validDate(y, b, a);
    if (b > 12 && a <= 12) return validDate(y, a, b);
    if (a === b) return validDate(y, a, b);
    return undefined; // Mixed US/day-first formats: ambiguous dates require review.
  }
  const named = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:,?\s+(\d{4}))?\b/i);
  if (named) return validDate(named[3] ? Number(named[3]) : year, monthNames.indexOf(named[2].slice(0,3).toLowerCase()) + 1, Number(named[1]));
  return undefined;
}
export function parseAppliedJobs(grid: Grid, m: UpworkMapping, spreadsheetId: string, tab: string, links?: ProfileLinkCells): Parsed {
  const rules = m.appliedJobs!;
  const headerRows = grid.flatMap((row, i) => [m.title, m.submittedDate, m.stage].every(name => row.some(c => c.trim().toLowerCase() === name.toLowerCase())) ? [i] : []);
  if (headerRows.length !== 1) throw Error("Applied Jobs must have one recognizable header row.");
  const headerIndex = headerRows[0], header = grid[headerIndex];
  const index = (name: string, required = false) => {
    const found = header.flatMap((cell, i) => cell.trim().toLowerCase() === name.trim().toLowerCase() ? [i] : []);
    if (found.length > 1 && name === "Boosted") {
      const contextual = found.filter(i => header[i + 1]?.trim() === "Video Interview");
      if (contextual.length === 1) return contextual[0];
    }
    if (found.length > 1 && name === "Hired") {
      const outcome = found.filter(i => header[i - 1]?.trim() === "Call" && header[i + 1]?.trim() === m.stage);
      if (outcome.length === 1) return outcome[0];
    }
    if (found.length > 1 || (required && found.length !== 1)) throw Error("Applied Jobs column missing or ambiguous: " + name);
    return found[0] ?? -1;
  };
  if (header[rules.dateAnchorColumn]?.trim() && header[rules.dateAnchorColumn].trim()!=="Applied Date") throw Error("The approved date-anchor column changed; review structure.");
  const titleCol=index(m.title,true), dateCol=index(m.submittedDate,true), stageCol=index(m.stage,true), ownerCol=index(m.owner,true), profileCol=index(m.profile,true), connectsCol=index(m.connects,true), kindCol=index("Proposal/Invite",true), boostCol=index("Boosted Connects",true), timeCol=index("Time",true);
  const flagColumns = { viewed:index("Viewed",true), replied:index("Messaged",true), interviewed:index("Started Interviews",true), hired:index("Hired",true), called:index("Call",true), boosted:index("Boosted",true), video:index("Video Interview",true) };
  const proposals: UpworkProposal[] = [], reviews: string[] = [];
  let year=rules.year, anchorDate: string | undefined;
  for(let ri=headerIndex+1;ri<grid.length;ri++) {
    const row=grid[ri], at=ri+1;
    const cell=(ci:number)=>ci<0?"":row[ci]?.trim()||"";
    const anchor=cell(rules.dateAnchorColumn);
    const monthAnchor=monthSectionYear(anchor);
    if(monthAnchor!==undefined){year=monthAnchor;anchorDate=undefined;}
    else if(anchor){anchorDate=appliedDate(anchor,year);}
    const title=cell(titleCol);
    if(!title)continue; // Anchor rows, formatting-only rows and right-side legends are not proposals.
    const titleMonth=monthSectionYear(title);
    if(titleMonth!==undefined && ![kindCol,ownerCol,profileCol,connectsCol,stageCol,dateCol,timeCol].some(ci=>cell(ci)) && !links?.[at+":"+titleCol]?.urls.length){
      year=titleMonth;
      anchorDate=undefined;
      continue; // A month divider in the title column is not a job; stop inheriting the previous month's date.
    }
    const issues: string[]=[];
    const rawDate=cell(dateCol);
    const dayDate=appliedDate(rawDate,year);
    let submittedDate=anchorDate||dayDate||"";
    if(anchor&&monthAnchor===undefined&&!anchorDate){submittedDate="";issues.push("Ambiguous or invalid numeric date anchor; date unresolved.");}
    if(anchorDate&&dayDate&&anchorDate!==dayDate)issues.push(`Date anchor ${anchorDate} disagrees with Day ${dayDate}; anchor retained.`);
    if(!submittedDate)issues.push("Submission date unresolved; excluded from dated trends, retained in all-date totals.");
    const weekday=rawDate.match(/\b(Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)\b/i);
    if(weekday&&submittedDate&&["sun","mon","tue","wed","thu","fri","sat"][new Date(submittedDate+"T00:00:00Z").getUTCDay()]!==weekday[1].slice(0,3).toLowerCase())issues.push("Written weekday disagrees with the recorded date/year.");
    function count(ci:number,label:string){const raw=cell(ci);if(!raw||raw==="-"||/^n\/?a$/i.test(raw))return undefined;if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))){issues.push("Invalid "+label+"; retained as unknown.");return undefined;}return Number(raw);}
    function flag(ci:number,label:string){const raw=cell(ci);if(!raw||raw==="-"||/^n\/?a$/i.test(raw))return undefined;if(/^(yes|held|hired)$/i.test(raw))return true;if(/^no$/i.test(raw))return false;issues.push("Uninterpreted "+label+" marking: "+raw);return undefined;}
    const flags=Object.fromEntries(Object.entries(flagColumns).map(([field,ci])=>[field,flag(ci,field)])) as NonNullable<UpworkProposal["flags"]>;
    const rawStage=cell(stageCol), stage=Object.hasOwn(m.stageMap,rawStage)?m.stageMap[rawStage]:undefined;
    if(rawStage&&!stage)issues.push("Outcome preserved as a note; no stage inferred: "+rawStage);
    if(!rawStage)issues.push("Outcome not recorded.");
    if((stage==="Won"&&flags.hired===false)||(stage==="Lost"&&flags.hired===true))issues.push("Result and Hired disagree; review outcome.");
    const connects=count(connectsCol,"Connects"),boostedConnects=count(boostCol,"Boosted Connects");
    if(connects!==undefined&&boostedConnects!==undefined&&boostedConnects>connects)issues.push("Boosted Connects exceeds Connects; overlap/spend basis unresolved.");
    const owner=cell(ownerCol)||"Unassigned";
    if(owner==="Unassigned")issues.push("Applied By not recorded; no employee identity inferred.");
    const rawKind=cell(kindCol),kind=rawKind==="Proposal"||rawKind==="Invite"?rawKind:undefined;
    if(!kind)issues.push("Proposal/Invite type missing or unrecognized.");
    const details: Record<string,string>={};
    for(const label of ["Tech Stack Skills","Search Term","Posted","Proposals","Budget","Hourly/Fixed Rate","Bid","Avg. Hourly Rate","Total Spent","Duration","Project Length","Expertise","Featured","Hire Rate","Jobs Posted","Open Jobs","Member Since","Last Viewed","Interviewing","current Interviewing","Interviews","Invites Sent","Unanswered Invites","Payment Method Verified","Client Response Time","Loom","Notion","Claude Link","Hired","Result"]) {const ci=index(label);if(ci>=0&&cell(ci))details[label]=cell(ci);}
    const locations=header.flatMap((label,ci)=>label.trim()==="Location"?[ci]:[]);
    if(locations.length<=2)for(const [i,ci] of locations.entries())if(cell(ci))details[i===0?"Job location":"Client location"]=cell(ci);
    let jobUrl: string | undefined;
    const linkCell = links?.[at + ":" + titleCol];
    if (linkCell) {
      if (linkCell.value.trim() !== title) throw Error(`Applied Jobs row ${at}: link text changed during read; retry inspection.`);
      const validLinks = [...new Set(linkCell.urls)].filter(value => { try { const url=new URL(value); return url.protocol === "https:" && /(^|\.)upwork\.com$/i.test(url.hostname) && !url.username && !url.password; } catch { return false; } });
      if (validLinks.length === 1) jobUrl = validLinks[0];
      else if (linkCell.urls.length) issues.push("Job links are ambiguous or not an HTTPS Upwork URL; link not exposed.");
    }
    for(const issue of issues)reviews.push(`Row ${at}: ${issue}`);
    proposals.push({recordId:`${spreadsheetId}/${tab}/row:${at}`,submittedDate,title,owner,profile:cell(profileCol)||"Unspecified",rawStage,stage,kind,connects,boostedConnects,jobUrl,flags,rawDate,rawTime:cell(timeCol),details,issues,source:{spreadsheetId,tab,row:at}});
  }
  if(!proposals.length)throw Error("No Applied Jobs records found; last-good data retained.");
  return {employees:[],attendance:[],upwork:proposals,warnings:[],reviews};
}
