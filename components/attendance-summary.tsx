import type { Employee, Source } from "@/lib/domain";
import { leaveUsage } from "@/lib/attendance";
import { attendanceScope, attendanceDisplayStatus, sharedBankHolidays, joiningDate, recordedHolidays, todayInKarachi } from "@/lib/attendance-view";

export function AttendanceSummary({ people, sources, year }: { people: Employee[]; sources: Source[]; year: number }) {
  const attendanceSources = sources.filter(s => s.dataType === "attendance");
  const today = todayInKarachi();
  const ids = new Set(people.map(p => p.employeeId));
  const all = attendanceSources.flatMap(s => s.data?.attendance || []).filter(r => ids.has(r.employeeId) && r.date.startsWith(`${year}-`));
  const shared = sharedBankHolidays(attendanceSources.flatMap(s => s.data?.attendance || []), sources.flatMap(s => s.data?.employees || []));
  const directory = new Map(people.map(p => [p.employeeId, p]));
  const holidays = recordedHolidays(all.map(r => ({ ...r, status: attendanceDisplayStatus(r, directory.get(r.employeeId)!, shared) })));
  const rows = people.map(person => {
    const records = all.filter(r => r.employeeId === person.employeeId);
    const elapsed = records.filter(r => r.date <= today);
    const allowances = attendanceSources.map(s => s.mapping.attendance?.allowances[person.employeeId]).filter(a => a?.year === year);
    const allowance = allowances.length === 1 ? allowances[0]?.days : undefined;
    const used = leaveUsage(elapsed);
    const pending = records.filter(r => attendanceDisplayStatus(r, person, shared) === "Pending");
    return { person, records, allowance, used, leave: elapsed.filter(r => r.status === "Leave").length, half: elapsed.filter(r => r.status === "Half day").length, absent: elapsed.filter(r => r.status === "Absent").length, pending: pending.filter(r => attendanceScope(r, person, today) === "Elapsed").length, future: pending.filter(r => attendanceScope(r, person, today) === "Future").length, before: pending.filter(r => attendanceScope(r, person, today) === "Before joining").length };
  });
  const covered = rows.filter(r => r.records.length);
  return <section className="panel mb-5" aria-label="Leave balances">
    <h2>{year} leave taken and remaining</h2>
    <p className="muted my-3">Through {today} (Pakistan time). Balances use available daily records and reviewed allowances. Leave and Absent deduct 1 day; Half day deducts 0.5. Public holidays do not deduct leave.</p>
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-amber-900">Leave taken (days)</p><strong className="text-3xl text-amber-900">{covered.length ? covered.reduce((n, r) => n + r.leave, 0) : "Unavailable"}</strong><p className="text-xs">Across {covered.length} employees with records</p></div>
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4"><p className="text-sm text-violet-900">Half days taken</p><strong className="text-3xl text-violet-900">{covered.length ? covered.reduce((n, r) => n + r.half, 0) : "Unavailable"}</strong><p className="text-xs">Each deducts half a day</p></div>
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4"><p className="text-sm text-teal-900">Remaining leave (days)</p><strong className="text-3xl text-teal-900">{covered.some(r => r.allowance !== undefined) ? covered.reduce((n, r) => n + (r.allowance !== undefined ? r.allowance - r.used : 0), 0) : "Unavailable"}</strong><p className="text-xs">Total for {covered.filter(r => r.allowance !== undefined).length} employees with reviewed allowances</p></div>
    </div>
    <div className="max-h-80 overflow-auto" tabIndex={0} aria-label="Employee leave balances"><table><thead className="sticky top-0"><tr><th>Employee</th><th>Allowance</th><th>Leave days</th><th>Half days</th><th>Absent days</th><th>Total deducted</th><th>Remaining days</th></tr></thead><tbody>{rows.map(r => <tr key={r.person.employeeId}><td className="font-semibold">{r.person.name}</td><td>{r.allowance ?? "Not recorded"}</td><td>{r.records.length ? r.leave : "Unavailable"}</td><td>{r.records.length ? r.half : "Unavailable"}</td><td>{r.records.length ? r.absent : "Unavailable"}</td><td>{r.records.length ? r.used : "Unavailable"}</td><td className="font-bold text-teal-800">{r.records.length && r.allowance !== undefined ? r.allowance - r.used : "Unavailable"}</td></tr>)}</tbody></table></div>
    <details className="mt-4"><summary className="cursor-pointer font-semibold text-cyan-800">Recorded public holidays: {holidays.filter(([date]) => date <= today).length} days through today; {holidays.filter(([date]) => date > today).length} upcoming in source</summary><p className="muted my-2">Distinct explicitly labelled dates across the selected employees. Upcoming dates are limited to the source; no external holiday calendar is assumed.</p><ul className="text-sm">{holidays.map(([date, labels]) => <li key={date}>{date} - {[...labels].join(" / ")}</li>)}</ul>{!holidays.length && <p>No explicitly recorded holidays.</p>}</details>
    <details className="mt-4"><summary className="cursor-pointer text-slate-600">Source coverage and blank-cell breakdown</summary><p className="muted my-2">Pending is a genuine blank source cell within the recorded employee-month column. It never means absent. Saturday/Sunday blanks display as Weekend. Shared bank-holiday labels from Javed apply to other blank source cells on the same date. Both are excluded from Pending. Future blanks and blanks before a readable joining date are also excluded. Unrecorded months and missing employee columns do not generate Pending. Balances can be incomplete where source coverage is missing.</p><div className="max-h-72 overflow-auto" tabIndex={0}><table><thead><tr><th>Employee</th><th>Months recorded</th><th>Pending through today</th><th>Future blanks</th><th>Pre-joining blanks</th></tr></thead><tbody>{rows.map(r => <tr key={r.person.employeeId}><td>{r.person.name}{!joiningDate(r.person) && <span className="block text-xs">Joining date unavailable; coverage unverified</span>}</td><td>{new Set(r.records.map(a => a.date.slice(0, 7))).size || "No linked records"}</td><td>{r.records.length ? r.pending : "Unavailable"}</td><td>{r.future}</td><td>{r.before}</td></tr>)}</tbody></table></div></details>
    <div className="mt-3 text-xs text-slate-500">{attendanceSources.map(s => <p key={s.sourceId}>{s.displayName}: {s.lastRefresh ? `updated ${new Date(s.lastRefresh).toLocaleString()}` : "not refreshed"}{s.error ? ` - last-good data: ${s.error}` : ""}</p>)}</div>
    {!all.length && <p role="status" className="mt-3 text-amber-800">No linked attendance for this selection. Balances remain unavailable until source records are loaded.</p>}
  </section>;
}
