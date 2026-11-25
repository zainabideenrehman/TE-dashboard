"use client";
import {pktDay, discoveryTimestamp} from '@/lib/upwork-discovery';
import {useState} from "react";
import type {Source,UpworkProposal,UpworkKnowledgeRecord} from "@/lib/domain";
import {fitScore,keywordIds,nonnegativeCount,upworkJobKey,type KnowledgeKind} from "@/lib/upwork-knowledge";
import { upworkBidFit } from "@/lib/upwork-priority";

export function UpworkKnowledge({sources,proposals,kind}:{sources:Source[];proposals:UpworkProposal[];kind:KnowledgeKind}) {
  const [block,setBlock]=useState("All"),[hold,setHold]=useState("All");
  const [period,setPeriod]=useState("all"),[date,setDate]=useState("");
  const [from,setFrom]=useState("09:00"),[to,setTo]=useState("17:00");
  const [order, setOrder] = useState("bid-fit");
  const [application, setApplication] = useState("all");
  function inPeriod(record: UpworkKnowledgeRecord) {
    if (period === "all") return true;
    if (period === "block") return block === "All" || blockLabel(record) === block;
    const value = discoveryTimestamp(record.fields["Discovered At"]);
    if (!value || !pktDay(value)) return false;
    if (period === "day") return pktDay(value) === date;
    if (value.length <= 10 || !from || !to || from === to) return false;
    const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : value.replace(" ", "T") + "+05:00";
    const time = new Date(Date.parse(zoned) + 5 * 3600000).toISOString().slice(11, 16);
    return from < to ? time >= from && time < to : time >= from || time < to;
  }
  const blockLabel=(r:UpworkKnowledgeRecord)=>[r.fields["Block Date"],r.fields["Block Shift"]].filter(Boolean).join(" / ")||"Unrecorded block";
  const [search,setSearch]=useState(""),[vertical,setVertical]=useState("All"),[state,setState]=useState("All"),[context,setContext]=useState("All"),[keyword,setKeyword]=useState("All"),[priority,setPriority]=useState("All"),[selected,setSelected]=useState<string>();
  const keywords=sources.flatMap(s=>s.data?.upworkKnowledge||[]).filter(r=>r.kind==="keywords");
  const jobs=sources.flatMap(s=>s.data?.upworkKnowledge||[]).filter(r=>r.kind==="relevant-jobs");
  const keywordById=new Map(keywords.map(k=>[k.fields["Keyword ID"],k]));
  const appliedKeys=new Set(proposals.map(p=>upworkJobKey(p.jobUrl)).filter(Boolean));
  function applicationStatus(record: UpworkKnowledgeRecord) {
    if (/^yes$/i.test(record.fields["Applied?"]) || appliedKeys.has(upworkJobKey(record.fields["Job URL"]))) return "applied";
    return /^no$/i.test(record.fields["Applied?"]) ? "unapplied" : "unknown";
  }
  const bidFits = new Map(jobs.map(job => [job.recordId, upworkBidFit(job.fields)]));
  const related=sources.filter(s=>s.mapping.upwork?.knowledge===kind);
  const isKeywords=kind==="keywords",all=isKeywords?keywords:jobs;
  const statusField=isKeywords?"Enabled":"Decision Status",contextField=isKeywords?"Search Context":"Source Profiles";
  const filtered=all.filter(r=>(isKeywords||inPeriod(r))&&(hold==="All"||(r.fields["Soft Hold"]||"Unknown")===hold)&&(vertical==="All"||(r.fields["Primary Vertical"]||"Unrecorded")===vertical)&&(state==="All"||(r.fields[statusField]||"Unrecorded")===state)&&(context==="All"||(r.fields[contextField]||"Unrecorded")===context)&&(priority==="All"||(r.fields.Priority||"Unrecorded")===priority)&&(keyword==="All"||keywordIds(r).includes(keyword))&&(!search||Object.values(r.fields).join(" ").toLowerCase().includes(search.toLowerCase())));
  const visible = isKeywords || application === "all" ? filtered : filtered.filter(record => applicationStatus(record) === application);
  if (!isKeywords) {
    filtered.splice(0, filtered.length, ...visible.slice());
    if (order !== "sheet") {
      const sortScore = (record: UpworkKnowledgeRecord) => order === "bid-fit"
        ? bidFits.get(record.recordId)?.score ?? -1
        : fitScore(record.fields["Total Fit Score (100)"]) ?? -1;
      filtered.sort((a, b) => sortScore(b) - sortScore(a));
    }
  }
  const scores=filtered.map(r=>fitScore(r.fields["Total Fit Score (100)"])).filter((n):n is number=>n!==undefined);
  const sum=(field:string)=>{const counts=filtered.map(r=>nonnegativeCount(r.fields[field])).filter((n):n is number=>n!==undefined);return counts.length?`${counts.reduce((n,v)=>n+v,0)} (${counts.length}/${filtered.length} recorded)`:"0";};
  const selectedRecord=all.find(r=>r.recordId===selected);
  const labels=(field:string)=>[...new Set(all.map(r=>r.fields[field]||"Unrecorded"))].sort();
  const summary=isKeywords?[
    ["Keywords",filtered.length],["Enabled",filtered.filter(r=>/^yes$/i.test(r.fields.Enabled)).length],["Disabled",filtered.filter(r=>/^no$/i.test(r.fields.Enabled)).length],["Last-run jobs returned",sum("Jobs Returned Last Run")],["Last-run new unique jobs",sum("New Unique Jobs Last Run")],["Last-run relevant jobs",sum("Relevant Jobs Last Run")],["Recorded errors",filtered.filter(r=>r.fields["Last Error"]).length],
  ]:[
    ["Discovered jobs",filtered.length],["Marked applied",filtered.filter(r=>/^yes$/i.test(r.fields["Applied?"])).length],["Matched in application log",filtered.filter(r=>appliedKeys.has(upworkJobKey(r.fields["Job URL"]))).length],["Unscored jobs",filtered.length-scores.length],["Average recorded fit",scores.length?(scores.reduce((n,v)=>n+v,0)/scores.length).toFixed(1)+" / 100":"0 / 100"],["Connects required",sum("Connects Required")],
  ];
  function details(record:UpworkKnowledgeRecord){
    const fit = bidFits.get(record.recordId);
    return <>
      <button className="text-left font-semibold text-teal-800 underline" onClick={()=>setSelected(record.recordId)}>{record.fields[isKeywords?"Search Keyword":"Job Title"]}</button>
      {fit && <details className="mt-1 text-xs text-slate-600">
        <summary className="cursor-pointer">Bid fit {fit.score === undefined ? "unscored" : `${fit.score.toFixed(1)} / 100`}</summary>
        <dl className="mt-2 space-y-1">{fit.parts.map(part => (
          <div key={part.label} className="flex justify-between gap-2">
            <dt>{part.label}</dt><dd className="shrink-0 font-semibold">{part.points === undefined ? "Unrecorded" : `${part.points.toFixed(1)} / ${part.weight}`}</dd>
          </div>
        ))}</dl>
      </details>}
    </>;
  }
  function filter(label:string,value:string,set:(value:string)=>void,options:string[]){return <label>{label}<select value={value} onChange={e=>set(e.target.value)}><option>All</option>{options.map(o=><option key={o}>{o}</option>)}</select></label>;}
  return <div className="space-y-5">
    <section className="panel"><h2>{isKeywords?"Upwork Keyword Search":"Relevant Jobs"}</h2><p className="muted mt-2">{isKeywords?"Keyword configuration and latest recorded run results. This dashboard does not execute searches or change enabled states.":"Discovered opportunities and recorded bid decisions. Discovery does not mean an application was submitted."}</p>{related.map(s=><p key={s.sourceId} className={`mt-2 text-xs ${s.error?"text-amber-800":"text-slate-500"}`}>{s.displayName}: {s.lastRefresh?`refreshed ${new Date(s.lastRefresh).toLocaleString()}`:"not refreshed"}{s.error?` — showing last-good data: ${s.error}`:""}</p>)}{!related.length&&<p className="mt-3 text-sm">No published source yet. Add this tab in Data Sources, then inspect, preview and publish its mapping.</p>}
      <div className="mt-4 flex flex-wrap gap-3"><label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Keyword, job, skills or notes" /></label>{filter("Vertical",vertical,setVertical,labels("Primary Vertical"))}{filter(isKeywords?"Enabled":"Decision status",state,setState,labels(statusField))}{filter(isKeywords?"Search context":"Source profiles",context,setContext,labels(contextField))}{filter("Priority",priority,setPriority,labels("Priority"))}{!isKeywords&&<label>Matched keyword<select value={keyword} onChange={e=>setKeyword(e.target.value)}><option>All</option>{[...new Set(jobs.flatMap(keywordIds))].sort().map(id=><option key={id} value={id}>{id} — {keywordById.get(id)?.fields["Search Keyword"]||"unlinked keyword"}</option>)}</select></label>}<button className="self-end rounded border px-3 py-2 text-sm" onClick={()=>{setSearch("");setVertical("All");setState("All");setContext("All");setKeyword("All");setPriority("All");}}>Clear filters</button></div>
    </section>
    {!isKeywords&&<section className="panel">
      <h2>Bid ranking</h2>
      <p className="muted mt-2 text-sm">Expand a bid fit score to see its components. Jobs with incomplete components are unscored.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <label>Sort jobs<select value={order} onChange={e => setOrder(e.target.value)}>
          <option value="bid-fit">Highest bid fit</option>
          <option value="recorded">Highest sheet fit score</option>
          <option value="sheet">Sheet order</option>
        </select></label>
        <label>Application status<select value={application} onChange={e => setApplication(e.target.value)}>
          <option value="all">All jobs</option>
          <option value="unapplied">Marked not applied</option>
          <option value="applied">Applied or matched in log</option>
          <option value="unknown">Unknown</option>
        </select></label>
      </div>
    </section>}
    {!isKeywords&&<section className="panel">
      <h2>Discovery period</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        <label>Period<select value={period} onChange={e=>setPeriod(e.target.value)}>
          <option value="all">All discoveries</option>
          <option value="block">One discovery block</option>
          <option value="daily">Daily time window (PKT)</option>
          <option value="day">Full day (PKT)</option>
        </select></label>
        {period==="block"&&filter("Block / shift",block,setBlock,[...new Set(all.map(blockLabel))].sort().reverse())}
        {period==="day"&&<label>Discovery date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>}
        {period==="daily"&&<>
          <label>From (PKT)<input type="time" value={from} onChange={e=>setFrom(e.target.value)}/></label>
          <label>Until (PKT)<input type="time" value={to} onChange={e=>setTo(e.target.value)}/></label>
        </>}
        {filter("Soft Hold",hold,setHold,[...new Set(all.map(r=>r.fields["Soft Hold"]||"Unknown"))])}
        <button className="self-end rounded border px-3 py-2 text-sm" onClick={()=>{setPeriod("all");setBlock("All");setHold("All");}}>Clear period and hold</button>
      </div>
      {period==="daily"&&(!from||!to||from===to)&&<p role="status" className="mt-2">Choose different start and end times.</p>}
    </section>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{summary.map(([label,value])=><div key={label} className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-600">{label}</p><strong className="mt-2 block text-2xl">{value}</strong></div>)}</div>
    <section className="panel"><h2>{isKeywords?"Keyword catalogue":"Opportunity pipeline"}</h2><p className="muted my-3 text-sm">{isKeywords?"Latest-run counters describe each keyword’s latest recorded run, not daily totals. Jobs may match multiple keywords; counts are not a unique pipeline total.":"Scores and decisions come from the sheet. Blank scores remain unscored. Application matches use an exact Upwork job URL identifier, never a title guess."} Times are displayed exactly as recorded.</p><div className="max-h-[36rem] overflow-auto" tabIndex={0}><table><thead className="sticky top-0"><tr>{(isKeywords?["ID / keyword","Enabled","Context / vertical","Priority","Run status","Last successful run","Returned / new / relevant","Matched pipeline jobs"]:["Job","Vertical / country","Discovery","Keywords","Fit score","Decision / priority","Applied?","Application log"]).map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.map(r=>{const f=r.fields;return <tr key={r.recordId}>{isKeywords?<><td><span className="block text-xs text-slate-500">{f["Keyword ID"]}</span>{details(r)}</td><td>{f.Enabled||"Unknown"}</td><td>{f["Search Context"]}<br/>{f["Primary Vertical"]}</td><td>{f.Priority||"Unrecorded"}</td><td>{f["Last Run Status"]||"Unrecorded"}{f["Last Error"]&&<span className="block text-rose-800">{f["Last Error"]}</span>}</td><td>{f["Last Successful Run"]||"Unrecorded"}</td><td>{["Jobs Returned Last Run","New Unique Jobs Last Run","Relevant Jobs Last Run"].map(k=>nonnegativeCount(f[k])??0).join(" / ")}</td><td>{jobs.filter(j=>keywordIds(j).includes(f["Keyword ID"])).length}</td></>:<><td className="max-w-80 whitespace-normal">{details(r)}{upworkJobKey(f["Job URL"])&&<a className="mt-1 block text-xs text-teal-800 underline" href={f["Job URL"]} target="_blank" rel="noopener noreferrer">Open Upwork job</a>}</td><td>{f["Primary Vertical"]}<br/>{f["Client Country"]}</td><td>{f["Discovered At"]||"Unrecorded"}<br/>{f["Primary Discovery Source"]}</td><td>{keywordIds(r).map(id=><button key={id} title={keywordById.get(id)?.fields["Search Keyword"]||"Unlinked keyword"} className="mr-2 text-teal-800 underline" onClick={()=>setKeyword(id)}>{id}</button>)}</td><td>{fitScore(f["Total Fit Score (100)"])??0}</td><td>{f["Decision Status"]||"Unrecorded"}<br/>{f.Priority||"Unrecorded priority"}</td><td>{f["Applied?"]||"Unknown"}</td><td>{appliedKeys.has(upworkJobKey(f["Job URL"]))?"Matched":"No URL match"}</td></>}</tr>;})}</tbody></table></div>{!filtered.length&&<p className="muted mt-3">No records match these filters.</p>}</section>
    {!isKeywords&&<section className="panel"><h2>Keyword discovery coverage</h2><p className="muted my-2 text-sm">A job can match several keywords. Each row counts distinct jobs in the filtered pipeline.</p><div className="max-h-72 overflow-auto" tabIndex={0}><table><thead><tr><th>Keyword</th><th>Search term</th><th>Matched jobs</th><th>Marked applied</th></tr></thead><tbody>{[...new Set(filtered.flatMap(keywordIds))].sort().map(id=>{const matches=filtered.filter(r=>keywordIds(r).includes(id));return <tr key={id}><td>{id}</td><td>{keywordById.get(id)?.fields["Search Keyword"]||"Keyword not found"}</td><td>{matches.length}</td><td>{matches.filter(r=>/^yes$/i.test(r.fields["Applied?"])).length}</td></tr>;})}</tbody></table></div></section>}
    {selectedRecord&&<div role="dialog" aria-modal="true" aria-label="Knowledge record details" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5" onKeyDown={e=>{if(e.key==="Escape")setSelected(undefined);}}><section className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6"><div className="flex justify-between gap-4"><h2>{selectedRecord.fields[isKeywords?"Search Keyword":"Job Title"]}</h2><button autoFocus className="rounded border px-3 py-1" onClick={()=>setSelected(undefined)}>Close</button></div><p className="muted my-3">{selectedRecord.source.tab} — row {selectedRecord.source.row}</p><dl className="grid gap-4 text-sm sm:grid-cols-2">{Object.entries(selectedRecord.fields).map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words font-medium">{value||"Not recorded"}</dd></div>)}</dl>{selectedRecord.issues.length>0&&<ul className="mt-4 list-disc pl-5 text-sm text-amber-800">{selectedRecord.issues.map(issue=><li key={issue}>{issue}</li>)}</ul>}</section></div>}
  </div>;
}
