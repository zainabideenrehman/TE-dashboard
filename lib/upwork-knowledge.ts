import type {Grid, Mapping, Parsed, UpworkKnowledgeRecord} from "./domain";

export type KnowledgeKind = "keywords" | "relevant-jobs";
// Explicit allowlists exclude connection references; commercial job metadata is read-only.
export const keywordFields = ["Keyword ID","Enabled","Search Context","Primary Vertical","Search Keyword","Search Type","Exclusion Keywords","Jobs to Fetch","Priority","Notes","Last Successful Run","Last Run Status","Jobs Returned Last Run","New Unique Jobs Last Run","Relevant Jobs Last Run","Last Error","Created At","Updated At"];
export const relevantFields = ["Job URL","Job ID","Job Title","Discovered At","Posted At","Last Seen At","Primary Discovery Source","All Discovery Sources","Source Profiles","Primary Keyword ID","Matched Keyword IDs","Primary Vertical","Secondary Verticals","Required Skills","Job Type","Duration","Experience Level","Client Country","Payment Verified","Client Hire Rate","Client Jobs Posted","Client Open Jobs","Proposals at Discovery","Interviewing at Discovery","Invites Sent at Discovery","Connects Required","Matched Projects","Portfolio / Demo Links","Proof Availability","Service / Capability Score (30)","Relevant Proof Score (20)","Client Credibility Score (15)","Budget / Scope Score (15)","Commercial Potential Score (10)","Timing / Competition Score (10)","Total Fit Score (100)","Priority","Decision Status","No-Bid Reason","Decision Notes","Decision At","Decision By","Preferred Submission Profile","Applied?","Actual Submission Profile","Agency Member","Applied At","Applied Jobs Reference"];
export function knowledgeMapping(kind:KnowledgeKind): Mapping {
  return {id:"Employee ID",name:"Name",department:"Department",email:"Email",status:"Status",aliases:{},statuses:{},upwork:{knowledge:kind,proposalId:kind==="keywords"?"Keyword ID":"Job ID",submittedDate:kind==="keywords"?"Created At":"Discovered At",title:kind==="keywords"?"Search Keyword":"Job Title",stage:kind==="keywords"?"Last Run Status":"Decision Status",owner:"",profile:"",replyDate:"",interviewDate:"",wonDate:"",jobUrl:"",connects:"",stageMap:{}}};
}
export function nonnegativeCount(raw:string|undefined):number|undefined {
  return raw && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : undefined;
}
export function fitScore(raw:string|undefined):number|undefined {
  if (!raw || !/^\d+(?:\.\d+)?$/.test(raw)) return undefined;
  const n=Number(raw);return n>=0&&n<=100?n:undefined;
}
export function upworkJobKey(raw:string|undefined) {
  try {const url=new URL(raw||"");if(url.protocol!=="https:"||!/(^|\.)upwork\.com$/i.test(url.hostname)||url.username||url.password)return undefined;const match=url.pathname.match(/(?:\/jobs\/(?:[^/]*_)?|\/job\/)(~[\w-]+|\d+)\/?$/);return match?.[1];} catch{return undefined;}
}
export function keywordIds(record:UpworkKnowledgeRecord) {
  return [...new Set([record.fields["Primary Keyword ID"],...(record.fields["Matched Keyword IDs"]||"").split(/[;,\n]/)].map(v=>v?.trim()).filter((v):v is string=>!!v))];
}
export function parseKnowledge(grid:Grid,kind:KnowledgeKind,spreadsheetId:string,tab:string):Parsed {
  const optional=kind==="keywords"?[]:["Block Date","Block Shift","Soft Hold","Last Updated At","Record Origin","Sync Status","Additional Notes","Budget Min","Budget Max","Budget Currency","Client Total Spent"];
  const allowed=kind==="keywords"?keywordFields:[...relevantFields,...optional];
  const id=kind==="keywords"?"Keyword ID":"Job ID", title=kind==="keywords"?"Search Keyword":"Job Title";
  const headers=grid.flatMap((r,i)=>[id,title,kind==="keywords"?"Enabled":"Decision Status"].every(h=>r.some(c=>c.trim()===h))?[i]:[]);
  if(headers.length!==1)throw Error("Expected one recognizable "+kind+" header; inspect structure.");
  const hi=headers[0], header=grid[hi];
  const required=kind==="keywords"?keywordFields:[id,title,"Job URL","Discovered At","Decision Status"];
  const positions=allowed.map(label=>{const found=header.flatMap((c,i)=>c.trim()===label?[i]:[]);if(found.length>1||(!found.length&&required.includes(label)))throw Error("Knowledge column missing or ambiguous: "+label);return {label,column:found[0]??-1};});
  const records:UpworkKnowledgeRecord[]=[],ids=new Set<string>();
  let blockDate="",blockShift="",blockRow=0;
  for(let i=hi+1;i<grid.length;i++){
    const fields=Object.fromEntries(positions.map(p=>[p.label,grid[i][p.column]?.trim()||""]));
    if(!Object.values(fields).some(Boolean))continue;
    if(kind==="relevant-jobs"){
      if(fields["Block Date"]||fields["Block Shift"]){blockDate=fields["Block Date"];blockShift=fields["Block Shift"];blockRow=i+1;}
      fields["Block Date"]=blockDate;fields["Block Shift"]=blockShift;
      if(blockRow)fields["Block anchor row"]=String(blockRow);
    }
    if(!fields[id]||!fields[title])throw Error(`Knowledge row ${i+1}: ID and title are required.`);
    if(ids.has(fields[id]))throw Error("Duplicate knowledge ID: "+fields[id]);ids.add(fields[id]);
    const issues:string[]=[];
    if(kind==="keywords"){
      if(!/^(Yes|No)$/i.test(fields.Enabled))issues.push("Enabled is unknown; no state inferred.");
      for(const field of ["Jobs to Fetch","Jobs Returned Last Run","New Unique Jobs Last Run","Relevant Jobs Last Run"])if(fields[field]&&nonnegativeCount(fields[field])===undefined)issues.push("Invalid "+field+"; not included in totals.");
    } else {
      if(fields["Job URL"]&&!upworkJobKey(fields["Job URL"])) {issues.push("Invalid Upwork job URL; link hidden.");fields["Job URL"]="";}
      if(fields["Total Fit Score (100)"]&&fitScore(fields["Total Fit Score (100)"])===undefined)issues.push("Invalid total fit score; not included in averages.");
      if(!/^(Yes|No)$/i.test(fields["Applied?"]))issues.push("Applied status is unknown.");
    }
    records.push({recordId:`${spreadsheetId}/${tab}/id:${fields[id]}`,kind,fields,issues,source:{spreadsheetId,tab,row:i+1}});
  }
  return {employees:[],attendance:[],upworkKnowledge:records,warnings:[],reviews:records.flatMap(r=>r.issues.map(issue=>`Row ${r.source.row}: ${issue}`))};
}
