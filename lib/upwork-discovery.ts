import type {UpworkKnowledgeRecord, UpworkProposal} from "./domain";
import {fitScore, keywordIds, upworkJobKey} from "./upwork-knowledge";

// Live discovery sheets use US calendar order with an explicit PKT suffix.
export function discoveryTimestamp(raw:string|undefined):string|undefined {
  const value=raw?.trim();
  if(!value)return undefined;
  const local=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})(?::(\d{2}))? (AM|PM) PKT$/i);
  if(!local)return value;
  const [,month,day,year,hour,minute,second,period]=local;
  if(Number(hour)<1||Number(hour)>12||Number(minute)>59||Number(second||0)>59)return undefined;
  const h=Number(hour)%12+(/pm/i.test(period)?12:0);
  return `${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}T${String(h).padStart(2,"0")}:${minute}:${second||"00"}+05:00`;
}
export function pktDay(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value=discoveryTimestamp(raw);
  if(!value)return undefined;
  if (!/^\d{4}-\d{2}-\d{2}(?:$|[T ])/.test(value)) return undefined;
  const calendar=new Date(value.slice(0,10)+"T00:00:00Z");
  if (!Number.isFinite(calendar.valueOf())||calendar.toISOString().slice(0,10)!==value.slice(0,10)) return undefined;
  const explicitZone=/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date=new Date(value.length===10?value+"T00:00:00+05:00":explicitZone?value:value.replace(" ","T")+"+05:00");
  if (!Number.isFinite(date.valueOf())) return undefined;
  const day=new Date(date.valueOf()+5*3600000).toISOString().slice(0,10);
  // Reject rolled-over calendar dates rather than silently repairing source values.
  if (!explicitZone && day!==value.slice(0,10)) return undefined;
  return day;
}
export function shiftDay(day:string, amount:number) {
  return new Date(new Date(day+"T00:00:00Z").valueOf()+amount*86400000).toISOString().slice(0,10);
}
export function monday(day:string) {
  return shiftDay(day,-(new Date(day+"T00:00:00Z").getUTCDay()+6)%7);
}
export const yesNo=(value:string|undefined)=>/^yes$/i.test(value||"")?true:/^no$/i.test(value||"")?false:undefined;
export function recordedNumber(raw:string|undefined) {
  if (!raw?.trim() || !/^\d+(?:\.\d+)?$/.test(raw.trim())) return undefined;
  return Number(raw);
}
export function average(values:(number|undefined)[]) {
  const known=values.filter((v):v is number=>v!==undefined);
  return known.length?known.reduce((a,b)=>a+b,0)/known.length:undefined;
}
export function jobIdentity(id:string|undefined,url:string|undefined) {
  const clean=id?.trim();
  return clean?clean.replace(/^~/,""):upworkJobKey(url)?.replace(/^~/,"");
}
export function normalizedJobUrl(raw:string|undefined) {
  try {const url=new URL(raw||"");if(url.protocol!=="https:"||!/(^|\.)upwork\.com$/i.test(url.hostname)||url.username||url.password)return undefined;return "https://upwork.com"+url.pathname.replace(/\/$/,"");}catch{return undefined;}
}
export function discoveryLagHours(posted:string|undefined,discovered:string|undefined) {
  const timestamp=(value:string|undefined)=>{
    const normalized=discoveryTimestamp(value);
    if(!normalized||normalized.length<=10||!pktDay(normalized))return undefined;
    return Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)?normalized:normalized.replace(" ","T")+"+05:00");
  };
  const from=timestamp(posted),to=timestamp(discovered);
  return from!==undefined&&to!==undefined&&to>=from?(to-from)/3600000:undefined;
}
export function discoveryRows(jobs:UpworkKnowledgeRecord[],proposals:UpworkProposal[],asOf:string) {
  const byKey=new Map<string,UpworkProposal[]>();
  const byUrl=new Map<string,UpworkProposal[]>();
  for (const p of proposals) {
    if (p.submittedDate && p.submittedDate>asOf) continue;
    const key=jobIdentity(undefined,p.jobUrl);
    if (key) byKey.set(key,[...(byKey.get(key)||[]),p]);
    const url=normalizedJobUrl(p.jobUrl);
    if(url)byUrl.set(url,[...(byUrl.get(url)||[]),p]);
  }
  return jobs.map(record=>{
    const f=record.fields;
    const key=jobIdentity(f["Job ID"],f["Job URL"]);
    const url=normalizedJobUrl(f["Job URL"]);
    const matched=(key?byKey.get(key):undefined)||(url?byUrl.get(url):undefined)||[];
    const markedDate=pktDay(f["Applied At"]);
    const applied=matched.length>0 || (yesNo(f["Applied?"])===true && (!markedDate||markedDate<=asOf));
    const score=fitScore(f["Total Fit Score (100)"]);
    return {record,day:pktDay(f["Discovered At"]),hold:yesNo(f["Soft Hold"]),matched,applied,appliedKnown:matched.length>0||yesNo(f["Applied?"])!==undefined,score,
      appliedDay:matched.map(p=>p.submittedDate).filter(Boolean).sort()[0] || (applied?markedDate:undefined)};
  }).filter(r=>!r.day||r.day<=asOf);
}
export type DiscoveryRow=ReturnType<typeof discoveryRows>[number];
export function discoveryStats(rows:DiscoveryRow[]) {
  const clean=rows.filter(r=>r.hold===false),hold=rows.filter(r=>r.hold===true);
  const rate=(group:DiscoveryRow[])=>group.length&&group.some(r=>r.appliedKnown)?group.filter(r=>r.applied).length/group.length:undefined;
  const scores=rows.flatMap(r=>r.score===undefined?[]:[r.score]);
  const interviewEvidence=rows.some(r=>r.matched.some(p=>p.flags?.interviewed!==undefined||p.stage==="Interview"));
  const hireEvidence=rows.some(r=>r.matched.some(p=>p.flags?.hired!==undefined||p.stage==="Won"||p.stage==="Lost"));
  return {total:rows.length,clean:clean.length,hold:hold.length,unknownHold:rows.length-clean.length-hold.length,
    interviews:interviewEvidence?rows.filter(r=>r.matched.some(p=>p.flags?.interviewed===true||p.stage==="Interview")).length:undefined,
    hires:hireEvidence?rows.filter(r=>r.matched.some(p=>(p.flags?.hired===true&&p.stage!=="Lost")||(p.stage==="Won"&&p.flags?.hired!==false))).length:undefined,
    applied:rows.filter(r=>r.applied).length,conversion:rate(rows),holdConversion:rate(hold),cleanConversion:rate(clean),
    holdRate:rows.length?hold.length/rows.length:undefined,score:average(scores),scored:scores.length,
    high80:scores.length?scores.filter(s=>s>=80).length/scores.length:undefined,
    high90:scores.length?scores.filter(s=>s>=90).length/scores.length:undefined,
    mid:scores.length?scores.filter(s=>s>=60&&s<80).length/scores.length:undefined};
}
export function discoveryGroups(rows:DiscoveryRow[],field:string) {
  const groups=new Map<string,DiscoveryRow[]>();
  for (const row of rows) {
    const budget=recordedNumber(row.record.fields["Budget Min"]),currency=row.record.fields["Budget Currency"];
    const labels=field==="Budget band"?[budget===undefined?"Missing":`${currency||"Unknown currency"} / ${row.record.fields["Job Type"]||"Unknown type"} / ${budget<100?"<100":budget<500?"100–499":budget<1000?"500–999":"1000+"}`]:field==="Score band"?[row.score===undefined?"Not scored yet":row.score>=90?"90–100":row.score>=80?"80–<90":row.score>=60?"60–<80":"<60"]:field==="Keywords"?keywordIds(row.record):field==="All Discovery Sources"?(row.record.fields[field]||"").split(/[;,\n]/).map(s=>s.trim()).filter(Boolean):[row.record.fields[field]||"Missing"];
    for(const label of new Set(labels.length?labels:["Missing"]))groups.set(label,[...(groups.get(label)||[]),row]);
  }
  return [...groups].map(([label,members])=>({label,...discoveryStats(members)})).sort((a,b)=>b.total-a.total);
}
