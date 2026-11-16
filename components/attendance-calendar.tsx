"use client";
import { useState } from "react";
import type { Attendance, Employee } from "@/lib/domain";
import { attendanceColour, attendanceDisplayStatus, arrivalCategory, attendanceScope, calendarDates, todayInKarachi } from "@/lib/attendance-view";

const categories = ["All recorded", "Present", "Leave", "Half day", "Absent", "Late", "Severely late", "Holiday", "Weekend", "Arrival time", "Notes", "Pending"];
function category(record: Attendance) {
  const text = record.status.toLowerCase();
  const arrival = arrivalCategory(record.rawText || record.status);
  if (arrival) return arrival;
  if (/holiday/.test(text)) return "Holiday";
  if (/half\s*day/.test(text)) return "Half day";
  if (/leave/.test(text)) return "Leave";
  if (/\blate\b/.test(text)) return /severe/.test(text) ? "Severely late" : "Late";
  return ["Present", "Absent", "Weekend", "Pending"].includes(record.status) ? record.status : "Notes";
}
export function AttendanceCalendar({ people, records, sharedHolidays, month, onMonthChange }: { people: Employee[]; records: Attendance[]; sharedHolidays: ReadonlyMap<string, Attendance>; month: string; onMonthChange: (month: string) => void }) {
  const [view, setView] = useState("Month");
  const [week, setWeek] = useState(0);
  const [filter, setFilter] = useState("All recorded");
  const [selectedDay, setSelectedDay] = useState<string>();
  const dates = calendarDates(month);
  const weekIndex = Math.min(week, Math.max(0, dates.length / 7 - 1));
  const visible = view === "Week" ? dates.slice(weekIndex * 7, weekIndex * 7 + 7) : dates;
  const today = todayInKarachi();
  const personById = new Map(people.map(p => [p.employeeId, p]));
  const byDate = new Map<string, Attendance[]>();
  for (const record of records) {
    if (!personById.has(record.employeeId)) continue;
    const display = { ...record, status: attendanceDisplayStatus(record, personById.get(record.employeeId)!, sharedHolidays) };
    byDate.set(record.date, [...(byDate.get(record.date) || []), display]);
  }
  function shiftMonth(amount: number) {
    const date = new Date(month + "-01T00:00:00Z");
    date.setUTCMonth(date.getUTCMonth() + amount);
    onMonthChange(date.toISOString().slice(0, 7));
  }
  function matches(r: Attendance) {
    const scope = attendanceScope(r, personById.get(r.employeeId)!, today);
    if (r.status === "Pending" && scope !== "Elapsed") return false;
    return filter === "All recorded" ? r.status !== "Pending" : category(r) === filter;
  }
  function entry(r: Attendance, index: number) {
    const person = personById.get(r.employeeId)!;
    const shared = !r.rawText && /holiday/i.test(r.status) ? sharedHolidays.get(r.date) : undefined;
    return <div key={`${r.employeeId}-${index}`} title={`${r.source.tab} R${r.source.row} C${r.source.column}${shared ? ` - shared holiday label from ${shared.source.tab} R${shared.source.row} C${shared.source.column}` : ""}`} className={`rounded border-l-4 border-current px-2 py-1 text-xs ${attendanceColour(r.status)}`}><strong className="block truncate">{person.name}</strong><span className="block truncate">{r.rawText || r.status}{arrivalCategory(r.rawText || r.status) && arrivalCategory(r.rawText || r.status) !== "Arrival time" ? ` - ${arrivalCategory(r.rawText || r.status)}` : ""}</span></div>;
  }
  function groupedEntries(dayRecords: Attendance[]) {
    const shared = new Map<string, Attendance[]>();
    const individual: Attendance[] = [];
    for (const record of dayRecords) {
      const kind = category(record);
      if (kind !== "Weekend" && kind !== "Holiday") {
        individual.push(record);
        continue;
      }
      const label = record.status.trim();
      shared.set(label, [...(shared.get(label) || []), record]);
    }
    return [
      ...[...shared].map(([label, grouped]) => <div key={`shared-${label}`} className={`rounded border-l-4 border-current px-2 py-2 text-xs ${attendanceColour(label)}`} title={`Shared day off for ${new Set(grouped.map(r => r.employeeId)).size} selected employees`}><strong className="block break-words">{label}</strong><span className="block mt-1">Shared day off</span></div>),
      ...individual.map(entry),
    ];
  }
  return <section aria-label="Attendance calendar" className="mb-5">
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-white py-3">
      <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="rounded border px-3 py-2">&lt;</button>
      <h3 className="font-semibold">{new Date(month + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</h3>
      <button onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded border px-3 py-2">&gt;</button>
      <button onClick={() => onMonthChange(today.slice(0, 7))} className="rounded border px-3 py-2">Today</button>
      <label>View<select value={view} onChange={e => setView(e.target.value)}><option>Month</option><option>Week</option></select></label>
      <label>Category<select value={filter} onChange={e => setFilter(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
      {view === "Week" && <div className="flex gap-3"><button disabled={!weekIndex} onClick={() => setWeek(weekIndex - 1)}>Previous week</button><span>Week {weekIndex + 1}</span><button disabled={(weekIndex + 1) * 7 >= dates.length} onClick={() => setWeek(weekIndex + 1)}>Next week</button></div>}
    </div>
    <p className="muted mb-3">Showing recorded markings. Blank source cells are hidden by default; select Pending to review blanks through today. Saturday/Sunday blanks display as Weekend. Bank-holiday labels from Javed&apos;s shared source cells apply to other blank cells on that date. Future and pre-joining blanks are excluded from Pending. Late: after 09:30; severely late: after 10:00. Recorded times are preserved.</p>
    <div aria-label="Status colours" className="flex flex-wrap gap-2 mb-3 text-xs">{["Present", "Absent", "Leave", "Half day", "Approved leave", "Unapproved leave", "Late", "Severely late", "Arrival time", "Weekend", "Holiday", "Pending"].map(status => <span key={status} className={`rounded px-2 py-1 ${attendanceColour(status)}`}>{status}</span>)}</div>
    <div className="overflow-x-auto rounded-xl border" tabIndex={0} aria-label="Calendar grid">
      <div style={{ minWidth: 700 }}>
        <div className="grid grid-cols-7 bg-slate-50">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <div className="border-b px-3 py-2 text-center text-xs font-semibold" key={day}>{day}</div>)}</div>
        <div className="grid grid-cols-7">
          {visible.map(date => {
            const all = byDate.get(date) || [];
            const events = groupedEntries(all.filter(matches));
            const pending = all.filter(r => r.status === "Pending" && attendanceScope(r, personById.get(r.employeeId)!, today) === "Elapsed").length;
            return <article key={date} className={`min-w-0 min-h-40 border-b border-r p-2 ${date.slice(0, 7) !== month ? "bg-slate-50" : [0, 6].includes(new Date(date + "T00:00:00Z").getUTCDay()) ? "bg-blue-50" : "bg-white"}`}>
              <button onClick={() => setSelectedDay(date)} className={`mb-2 rounded-full px-2 py-1 text-sm ${date === today ? "bg-teal-700 text-white" : ""}`} aria-label={`Open attendance for ${date}`}><time dateTime={date}>{Number(date.slice(8))}</time></button>
              <div className="space-y-1">{events.slice(0, view === "Week" ? 8 : 3)}</div>
              {events.length > (view === "Week" ? 8 : 3) && <button className="mt-2 text-xs font-semibold text-teal-700" onClick={() => setSelectedDay(date)}>+{events.length - (view === "Week" ? 8 : 3)} more</button>}
              {!events.length && <p className="text-xs text-slate-400">{all.length ? "No matching markings" : "No source records"}</p>}
              {pending > 0 && filter !== "Pending" && <button className="mt-2 block text-xs text-slate-500" onClick={() => { setFilter("Pending"); setSelectedDay(date); }}>{pending} blank source cells</button>}
            </article>;
          })}
        </div>
      </div>
    </div>
    {selectedDay && <div role="dialog" aria-modal="true" aria-label={`Attendance for ${selectedDay}`} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5" onKeyDown={e => { if (e.key === "Escape") setSelectedDay(undefined); }}>
      <section className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6">
        <div className="mb-4 flex justify-between gap-4"><h2>{selectedDay} attendance</h2><button autoFocus className="rounded border px-3 py-1" onClick={() => setSelectedDay(undefined)}>Close</button></div>
        <p className="muted mb-3">{filter} - {people.length} selected employees. Hover an entry for its source cell.</p>
        <div className="grid gap-2 sm:grid-cols-2">{groupedEntries((byDate.get(selectedDay) || []).filter(matches))}</div>
        {!(byDate.get(selectedDay) || []).some(matches) && <p>No matching source markings.</p>}
      </section>
    </div>}
  </section>;
}
