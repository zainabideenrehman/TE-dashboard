import assert from "node:assert/strict";
import test from "node:test";
import { defaultMapping, type Grid, type Registry, type Parsed } from "../lib/domain";
import { parseUpwork, upworkAnalytics, upworkBucket, upworkTimeline } from "../lib/upwork";
import { appliedJobsMapping, appliedDate } from "../lib/upwork-applied";
import {knowledgeMapping,keywordFields,relevantFields,keywordIds,nonnegativeCount,fitScore,upworkJobKey} from "../lib/upwork-knowledge";
import { upworkDemoGrid, upworkDemoMapping } from "../lib/upwork-demo";
import { executeAction, refresh, validateMapping } from "../lib/service";
import {pktDay,monday,discoveryRows,discoveryStats,discoveryGroups,discoveryLagHours} from "../lib/upwork-discovery";

function fixture(): Grid {
  const header=["", "Jobs/ Proposal Links", "Tech Stack Skills", "Proposal/Invite", "Profile", "Connects", "Boosted Connects", "Boosted ", "Posted", "Proposals", "Search Term", "Location", "Budget", "Hourly/Fixed Rate", "Bid", "Duration", "Project Length", "Expertise", "Featured", "Hire Rate", "Avg. Hourly Rate", "Total Spent", "Jobs Posted", "Open Jobs", "Member Since", "Last Viewed", "Interviewing", "Invites Sent", "Unanswered Invites", "Location", "Payment Method Verified", "Time", "Day", "Loom", "Notion", "Boosted", "Video Interview", "Applied By", "Viewed", "Started Interviews", "Messaged", "Client Response Time", "Call", "Hired", "Result"];
  const row=Array.from({length:45},()=>"");
  Object.assign(row,{0:"10/23/2026",1:"Synthetic automation job",3:"Proposal",4:"Demo profile",5:"27",6:"181",31:"09:45",32:"Friday, 23 Oct",35:"Yes",37:"Demo owner",38:"Yes",39:"Yes",40:"Yes",43:"No",44:"Interviewed"});
  return [header,["Oct 2026"],row];
}
const appliedMapping={...defaultMapping,upwork:appliedJobsMapping};
test("title-column month dividers are excluded and reset inherited dates without hiding real jobs",()=>{
 const grid=fixture();
 grid.push(["","Nov 26"]);
 const next=[...grid[2]];next[0]="";next[1]="New November job";next[32]="Monday, 2 Nov";grid.push(next);
 const real=[...next];real[1]="Nov 26";grid.push(real);
 const parsed=parseUpwork(grid,appliedMapping,"demo","Jobs").upwork!;
 assert.equal(parsed.length,3);
 assert.equal(parsed[1].submittedDate,"2026-11-02");
 assert.equal(parsed[1].source.row,5);
 assert.equal(parsed[2].title,"Nov 26","actual proposal evidence keeps a month-like title");
 assert.equal(upworkAnalytics(parsed,"2026-11-03").proposals,3);
});
test("PKT aggregation handles overnight UTC crossings, leap dates and Monday boundaries",()=>{
 assert.equal(pktDay("2026-11-01T20:15:00Z"),"2026-11-02");
 assert.equal(pktDay("2026-11-01 23:15:00"),"2026-11-01");
 assert.equal(pktDay("2026-02-30T10:00:00Z"),undefined);
 assert.equal(pktDay("11/01/2026"),undefined);
 assert.equal(pktDay("11/3/2026 12:19 PM PKT"),"2026-11-03");
 assert.equal(pktDay("11/3/2026 12:19 AM PKT"),"2026-11-03");
 assert.equal(pktDay("11/3/2026 13:19 PM PKT"),undefined);
 assert.equal(pktDay("2/30/2026 1:19 PM PKT"),undefined);
 assert.equal(monday("2026-11-01"),"2026-10-26");
 assert.equal(monday("2026-11-02"),"2026-11-02");
 assert.equal(discoveryLagHours("2026-11-01T18:00:00Z","2026-11-02 00:00:00"),1);
 assert.equal(discoveryLagHours("","2026-11-02"),undefined);
 assert.equal(discoveryLagHours("11/3/2026 12:16 PM PKT","11/3/2026 12:19 PM PKT"),0.05);
});
test("cohorts join numeric job IDs, preserve unknown flags and exclude future applications",()=>{
 const base=parseUpwork(knowledgeFixture("relevant-jobs"),knowledgeMapping("relevant-jobs"),"demo","Relevant").upworkKnowledge![0];
 const job={...base,fields:{...base.fields,"Job ID":"021234","Job URL":"https://www.upwork.com/jobs/~021234","Discovered At":"2026-11-01T20:00:00Z","Soft Hold":"Yes","Applied?":"","Total Fit Score (100)":"","Primary Keyword ID":"KW-1","Matched Keyword IDs":"KW-1;KW-2"}};
 const proposal={...parseUpwork(fixture(),appliedMapping,"demo","Applied").upwork![0],jobUrl:"https://www.upwork.com/jobs/Automation_~021234/?source=search",submittedDate:"2026-11-03"};
 const before=discoveryRows([job],[proposal],"2026-11-02");
 assert.equal(before[0].applied,false);assert.equal(before[0].day,"2026-11-02");
 assert.equal(discoveryStats(before).conversion,undefined,"a blank application flag without a match is unknown");
 const after=discoveryRows([job,{...job,recordId:"other",fields:{...job.fields,"Job ID":"different","Job URL":"","Soft Hold":"","Applied?":"No"}}],[proposal],"2026-11-03");
 const stats=discoveryStats(after);assert.equal(stats.applied,1);assert.equal(stats.clean,0);assert.equal(stats.unknownHold,1);assert.equal(stats.holdConversion,1);assert.equal(stats.score,undefined);assert.equal(stats.high80,undefined);
 assert.equal(discoveryGroups(after,"Keywords").find(g=>g.label==="KW-1")?.total,2);
});
test("new Applied Date header and optional discovery ops columns survive current live structure",()=>{
 const grid=fixture();grid[0][0]="  Applied Date";grid[2][0]="2026-11-02";
 assert.equal(parseUpwork(grid,appliedMapping,"demo","Applied").upwork![0].submittedDate,"2026-11-02");
 const relevant=knowledgeFixture("relevant-jobs");relevant[0].push("Record Origin","Sync Status");relevant[1].push("Grokbot","Partial");
 const records=parseUpwork(relevant,knowledgeMapping("relevant-jobs"),"demo","Relevant").upworkKnowledge!;
 assert.equal(records[0].fields["Sync Status"],"Partial");
 const scoreColumn=relevant[0].indexOf("Total Fit Score (100)");relevant[0].splice(scoreColumn,1);relevant[1].splice(scoreColumn,1);
 assert.equal(parseUpwork(relevant,knowledgeMapping("relevant-jobs"),"demo","Relevant").upworkKnowledge![0].fields["Total Fit Score (100)"],"");
});
function knowledgeFixture(kind:"keywords"|"relevant-jobs"):Grid {
 const header=kind==="keywords"?[...keywordFields,"Connection Reference"]:[...relevantFields,"Budget Min","Client Total Spent"];
 const data:Record<string,string>=kind==="keywords"?{"Keyword ID":"KW-DEMO","Search Keyword":"Synthetic automation","Enabled":"Yes","Primary Vertical":"Demo","Last Run Status":"Never Run","Connection Reference":"must-not-be-exposed"}:{"Job ID":"demo-job","Job Title":"Synthetic discovery job","Job URL":"https://www.upwork.com/jobs/~demo","Decision Status":"New","Applied?":"No","Primary Keyword ID":"KW-DEMO","Matched Keyword IDs":"KW-DEMO; KW-OTHER","Budget Min":"999","Client Total Spent":"888"};
 return [header,header.map(h=>data[h]||"")];
}
test("knowledge parsers preserve IDs/provenance, allow job commercial metadata and exclude connection fields",()=>{
 for(const kind of ["keywords","relevant-jobs"] as const){
  const grid=knowledgeFixture(kind),mapping=knowledgeMapping(kind);
  const record=parseUpwork([[],...grid],mapping,"demo","Knowledge").upworkKnowledge![0];
  assert.equal(record.source.row,3);assert.ok(record.recordId.includes('/id:'));
  assert.equal(record.fields["Connection Reference"],undefined);assert.equal(record.fields["Budget Min"],kind==="relevant-jobs"?"999":undefined);assert.equal(record.fields["Client Total Spent"],kind==="relevant-jobs"?"888":undefined);
  const duplicate=[...grid,grid[1]];assert.throws(()=>parseUpwork(duplicate,mapping,"demo","Knowledge"),/Duplicate knowledge ID/);
  assert.equal(parseUpwork([grid[0]],mapping,"demo","Knowledge").upworkKnowledge?.length,0);
  grid[0][0]="Changed";assert.throws(()=>parseUpwork(grid,mapping,"demo","Knowledge"),/header|column/);
 }
});
test("knowledge counts, scores and links do not invent missing or unsafe values",()=>{
 assert.equal(nonnegativeCount(""),undefined);assert.equal(nonnegativeCount("0"),0);assert.equal(nonnegativeCount("-1"),undefined);
 assert.equal(fitScore(""),undefined);assert.equal(fitScore("101"),undefined);assert.equal(fitScore("0"),0);
 assert.equal(upworkJobKey("https://www.upwork.com/jobs/~demo?ref=tracking"),"~demo");
 assert.equal(upworkJobKey("https://upwork.com.evil.test/jobs/~demo"),undefined);
 assert.equal(upworkJobKey("javascript:alert(1)"),undefined);
 const grid=knowledgeFixture("relevant-jobs");grid[1][0]="javascript:alert(1)";
 const record=parseUpwork(grid,knowledgeMapping("relevant-jobs"),"demo","Jobs").upworkKnowledge![0];
 assert.deepEqual(keywordIds(record),["KW-DEMO","KW-OTHER"]);assert.equal(record.fields["Job URL"],"");assert.equal(record.issues.length,1);
});
test("new discovery block columns preserve inherited headings after row insertion",()=>{
 const grid=knowledgeFixture("relevant-jobs");grid[0].unshift("Block Date","Block Shift","Soft Hold");grid[1].unshift("2026-11-01 → 11-02","20–02 PKT","Yes");
 const next=[...grid[1]];next[0]="";next[1]="";next[2]="No";next[grid[0].indexOf("Job ID")]="second-demo";grid.push(next);
 const records=parseUpwork([[],...grid],knowledgeMapping("relevant-jobs"),"demo","Jobs").upworkKnowledge!;
 assert.equal(records.length,2);assert.equal(records[1].fields["Block Date"],"2026-11-01 → 11-02");assert.equal(records[1].fields["Block Shift"],"20–02 PKT");assert.equal(records[1].fields["Soft Hold"],"No");assert.equal(records[1].fields["Block anchor row"],"3");assert.equal(records[1].source.row,4);
});
test("knowledge source preview/publish/refresh retains last good on missing headers",async()=>{
 let registry:Registry={sources:[]};let grid=knowledgeFixture("relevant-jobs");const bounds:(number|undefined)[]=[];
 const deps={store:{async read(){return structuredClone(registry);},async update(change:(r:Registry)=>void|Promise<void>){const draft=structuredClone(registry);await change(draft);registry=draft;return structuredClone(registry);}},client:{async tabs(){return [{id:7,name:"Relevant Jobs",rowCount:1000,columnCount:56}];},async grid(_id:string,_tab:string,_first?:number,last?:number){bounds.push(last);return structuredClone(grid);}}};
 await executeAction({action:"add",spreadsheetId:"synthetic-knowledge",tabIds:[7],dataType:"upwork-bd"},deps);
 const sourceId=registry.sources[0].sourceId,mapping=knowledgeMapping("relevant-jobs");
 await executeAction({action:"inspect",sourceId,mapping},deps);await executeAction({action:"preview",sourceId,mapping},deps);await executeAction({action:"publish",sourceId,mapping},deps);await refresh(sourceId,true,deps);
 assert.equal(registry.sources[0].data?.upworkKnowledge?.length,1);assert.ok(bounds.every(n=>n===59));
 const previous=structuredClone(registry.sources[0].data);grid=knowledgeFixture("relevant-jobs");grid[0][0]="Removed";await refresh(sourceId,true,deps);assert.ok(registry.sources[0].error);assert.deepEqual(registry.sources[0].data,previous);
});
test("Upwork flat parser preserves source coordinates, unknown connects and exact outcomes",()=>{
  const parsed=parseUpwork(upworkDemoGrid,upworkDemoMapping,"demo","Proposals");
  assert.equal(parsed.upwork?.length,48);
  assert.equal(parsed.upwork?.[0].connects,undefined);
  assert.equal(parsed.upwork?.[0].source.row,3);
  const stats=upworkAnalytics(parsed.upwork!,"2026-10-30");
  assert.equal(stats.proposals,48);assert.equal(stats.replies,24);assert.equal(stats.interviews,16);assert.equal(stats.wins,8);
  const moved=parseUpwork([[],...upworkDemoGrid],upworkDemoMapping,"demo","Proposals");
  assert.deepEqual(moved.upwork?.map(r=>r.proposalId),parsed.upwork?.map(r=>r.proposalId));
  assert.equal(moved.upwork?.[0].source.row,4);
});
test("Upwork stage and date ambiguity block publication rather than guessing",()=>{
  const grid=structuredClone(upworkDemoGrid);grid[2][5]="Maybe hired";
  assert.match(parseUpwork(grid,upworkDemoMapping,"demo","Proposals").warnings[0],/Unmapped/);
  grid[2][1]="10/11/2026";
  assert.throws(()=>parseUpwork(grid,upworkDemoMapping,"demo","Proposals"),/ISO/);
  assert.throws(()=>validateMapping({...appliedMapping,upwork:{...appliedJobsMapping,owner:"Password"}}),/excluded/);
  assert.equal(appliedDate("10/11/2026",2026),undefined);
  assert.equal(appliedDate("11/9/2026", 2026, "Mon, Nov 2026"), "2026-11-09");
  assert.equal(appliedDate("10/11/2026", 2026, "Tue, Nov 2026"), "2026-11-10");
  assert.equal(appliedDate("11/12/2026", 2026, "Thu, Nov 2026"), "2026-11-12");
  assert.equal(appliedDate("11/12/2026", 2026, "Fri, Nov 2026"), undefined);
  assert.equal(appliedDate("11/12/2026", 2026, "Thu, Nov 2025"), undefined);
  assert.equal(appliedDate("21/10/2026",2026),"2026-10-21");
  assert.equal(appliedDate("10/23/2026",2026),"2026-10-23");
  assert.equal(appliedDate("Tuesday, 28th Jan",2026),"2026-01-28");
});
test("Applied Jobs uses date anchors, independent flags and separate boost counts, excluding legend rows",()=>{
  const grid=fixture();grid.push([...grid[2]]);grid[3][0]="";grid[3][32]="Sunday, Oct 2026";grid[3][43]="Yes";grid[3][44]="Won";
  const records=parseUpwork(grid,appliedMapping,"demo","Jobs").upwork!;
  assert.equal(records.length,2);assert.equal(records[1].submittedDate,"2026-10-23");
  assert.ok(records[1].issues?.some(s=>/weekday/.test(s)));
  assert.ok(records[0].issues?.some(s=>/Boosted Connects exceeds/.test(s)));
  const stats=upworkAnalytics(records,"2026-10-30");
  assert.equal(stats.connects,54);assert.equal(stats.boostedConnects,362);assert.equal(stats.wins,1);assert.equal(stats.replies,2);
  assert.equal(stats.interviews,2);
  const noFlags={...records[1],flags:{},replyDate:undefined,interviewDate:undefined};
  assert.equal(upworkAnalytics([noFlags],"2026-10-30").replies,0,"a win does not invent a reply");
  assert.equal(upworkAnalytics([{...noFlags,flags:{hired:false}}],"2026-10-30").wins,0,"conflicting hire outcome is not counted");
  assert.equal(upworkAnalytics([],"2026-10-30").winRate,undefined);
});
test("Upwork links are validated and included in source receipts",()=>{
  const grid=fixture();const key="3:1";const value=grid[2][1];
  assert.equal(parseUpwork(grid,appliedMapping,"demo","Jobs",{[key]:{value,urls:["https://www.upwork.com/jobs/~demo"]}}).upwork?.[0].jobUrl,"https://www.upwork.com/jobs/~demo");
  assert.equal(parseUpwork(grid,appliedMapping,"demo","Jobs",{[key]:{value,urls:["https://evil.example/"]}}).upwork?.[0].jobUrl,undefined);
  assert.throws(()=>parseUpwork(grid,appliedMapping,"demo","Jobs",{[key]:{value:"Changed",urls:["https://www.upwork.com/jobs/~demo"]}}),/changed during read/);
  assert.equal(upworkBucket("2026-01-01","Week"),"2025-12-29");
});
test("Upwork source preview/publish/refresh is bounded and preserves last-good data on structure failure",async()=>{
  let registry: Registry={sources:[]};let grid=fixture();const bounds: (number|undefined)[]=[];
  const deps={store:{async read(){return structuredClone(registry);},async update(change:(r:Registry)=>void|Promise<void>){const draft=structuredClone(registry);await change(draft);registry=draft;return structuredClone(registry);}},client:{async tabs(){return [{id:0,name:"Applied Jobs",rowCount:1007,columnCount:61}];},async grid(_id:string,_tab:string,_first?:number,last?:number){bounds.push(last);return structuredClone(grid);}}};
  await executeAction({action:"add",spreadsheetId:"synthetic-upwork-fixture",tabIds:[0],dataType:"upwork-bd"},deps);
  const sourceId=registry.sources[0].sourceId;
  await executeAction({action:"inspect",sourceId,mapping:appliedMapping},deps);
  const preview=await executeAction({action:"preview",sourceId,mapping:appliedMapping},deps) as Parsed;
  assert.equal(preview.upwork?.length,1);
  await executeAction({action:"publish",sourceId,mapping:appliedMapping},deps);
  await refresh(sourceId,true,deps);
  assert.equal(registry.sources[0].data?.upwork?.length,1);
  assert.ok(bounds.every(bound=>bound===47));
  const previous=structuredClone(registry.sources[0].data);
  grid=fixture();grid[0][1]="Unreviewed structure change";
  await refresh(sourceId,true,deps);
  assert.ok(registry.sources[0].error);assert.deepEqual(registry.sources[0].data,previous);
});

test("inserted client Hired column cannot replace the agency Hired outcome",()=>{
  const grid=fixture(); grid[0].splice(29,0,"Hired");grid[2].splice(29,0,"Yes");
  const records=parseUpwork(grid,appliedMapping,"demo","Jobs").upwork!;
  assert.equal(records[0].flags?.hired,false);
  assert.equal(upworkAnalytics(records,"2026-11-02").wins,0);
});

test("weekly comparisons include empty weeks and identify partial periods",()=>{
  const record=parseUpwork(fixture(),appliedMapping,"demo","Jobs").upwork![0];
  const result=upworkTimeline([record,{...record,submittedDate:"2026-11-02"}],"Week","2026-10-20","2026-11-02","2026-11-02");
  assert.deepEqual(result.map(r=>r.proposals),[1,0,1]);
  assert.deepEqual(result.map(r=>r.change),[undefined,-1,1]);
  assert.equal(result[0].partial,true);assert.equal(result[2].partial,true);
  assert.equal(result[2].changeRate,undefined);
});


test("missing outcome markings are unavailable, not a zero conversion rate",()=>{
  const grid=fixture();for(const ci of [38,39,40,43,44])grid[2][ci]="";
  const stats=upworkAnalytics(parseUpwork(grid,appliedMapping,"demo","Jobs").upwork!,"2026-10-30");
  assert.equal(stats.replies,0);assert.equal(stats.replyEvidence,false);assert.equal(stats.replyRate,undefined);
  assert.equal(stats.hireEvidence,false);assert.equal(stats.winRate,undefined);
});

import { createGoogleClient, type GoogleReadApi } from "../lib/sheets";
test("explicit Applied Jobs column bounds allow wide allocation without reading unrelated columns",async()=>{
  const calls:string[]=[];
  const api:GoogleReadApi={spreadsheets:{async get(params){
    return {data:{sheets:[{properties:{sheetId:0,title:"Applied Jobs",sheetType:"GRID",gridProperties:{rowCount:1007,columnCount:61}},...(params.ranges?{data:[{startRow:0,startColumn:1,rowData:[{values:[{formattedValue:"Demo job",hyperlink:"https://www.upwork.com/jobs/~demo"}]}]}]}:{})}]}};
  },values:{async get(params){calls.push(params.range);return {data:{values:fixture()}};}}}};
  const client=createGoogleClient(async()=>api);
  await assert.rejects(()=>client.grid("demo","Applied Jobs"),/safety bounds/);
  await client.grid("demo","Applied Jobs",undefined,45);
  assert.deepEqual(calls,["'Applied Jobs'!A1:AS3000"]);
  assert.equal((await client.profileLinks!("demo","Applied Jobs",[1]))["1:1"].urls[0],"https://www.upwork.com/jobs/~demo");
  await assert.rejects(()=>client.grid("demo","Applied Jobs",undefined,61),/column bound/);
});

test("Applied Jobs keeps explicit totals, boosts and outbid independent", async () => {
  const { parseAppliedJobs, appliedJobsMapping } = await import("../lib/upwork-applied");
  const header = ["Applied Date", "Jobs/ Proposal Links", "Day", "Result", "Applied By", "Profile", "Connects", "Proposal/Invite", "Boosted Connects", "Time", "Viewed", "Messaged", "Started Interviews", "Call", "Hired", "Boosted", "Video Interview", "Total Connects", "Out Bid"];
  const row = ["2026-11-20", "Build dashboard", "", "Still Open", "BD", "Profile", "10", "Proposal", "4", "", "", "", "", "", "", "", "", "12", "Yes"];
  const proposal = parseAppliedJobs([header, row], appliedJobsMapping, "sheet", "Applied").upwork![0];
  assert.equal(proposal.connects, 10);
  assert.equal(proposal.boostedConnects, 4);
  assert.equal(proposal.totalConnects, 12);
  assert.equal(proposal.flags?.outbid, true);
});

test("weekly reports preserve agency and client outcomes and connects history excludes payment", async () => {
  const { parseReport } = await import("../lib/upwork-reports");
  const weekly = parseReport([
    ["Start - End Date", "No of Jobs Applied", "Connects", "Interview", "Close/Hire", "Other Interviews", "other Hires", "Out Bid"],
    ["Nov 16 - Nov 22", "8", "60", "2", "1", "4", "3", "2"],
  ], "Weekly Report").upworkReport![0];
  assert.equal(weekly.fields.Interview, "2");
  assert.equal(weekly.fields["Close/Hire"], "1");
  assert.equal(weekly.fields["Other Interviews"], "4");
  assert.equal(weekly.fields["Out Bid"], "2");
  const history = parseReport([
    ["Profile A", "", "", "", "", "Profile B"],
    ["Date", "Connects", "Payement", "Resource", "", "Date", "Connects", "Payement", "Resource"],
    ["20/10/2026", "20", "99", "Ledger", "", "21/10/2026", "40", "100", "Ledger"],
  ], "Connects History").upworkReport!;
  assert.deepEqual(history.map(row => [row.section, row.fields.Connects]), [["Profile A", "20"], ["Profile B", "40"]]);
  assert.equal(history[0].fields.Payement, undefined);
});

test("a client hire marking alone does not establish an agency hire", () => {
  const proposal = {
    recordId: "demo", submittedDate: "2026-11-20", title: "Synthetic job", owner: "Demo",
    profile: "Demo", rawStage: "", flags: { hired: true }, source: { spreadsheetId: "demo", tab: "Applied", row: 2 },
  };
  const stats = upworkAnalytics([proposal], "2026-11-23");
  assert.equal(stats.wins, 0);
  assert.equal(stats.hireEvidence, false);
  assert.equal(upworkAnalytics([{ ...proposal, stage: "Won" }], "2026-11-23").wins, 1);
});
