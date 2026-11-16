import type { Attendance, Employee } from "./domain";

export function todayInKarachi() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function joiningDate(person: Employee): string | undefined {
  const raw = person.profile?.["Joining date"]?.trim();
  if (!raw) return;
  let iso = raw;
  const match = raw.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  if (match) {
    const month = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(match[2].toLowerCase()) + 1;
    if (!month) return;
    iso = `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
  const date = new Date(iso);
  return !isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === iso ? iso : undefined;
}

export function attendanceScope(record: Attendance, person: Employee, today: string) {
  const joined = joiningDate(person);
  if (joined && record.date < joined) return "Before joining";
  if (record.date > today) return "Future";
  return "Elapsed";
}

export function calendarDates(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const first = new Date(`${month}-01T00:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => {
    const date = new Date(first);
    date.setUTCDate(1 - offset + i);
    return date.toISOString().slice(0, 10);
  });
}

export function isRecordedArrival(text: string) {
  return /^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s*[ap]m)?$/i.test(text.trim());
}

// User-approved display rules. Source records and leave deductions stay unchanged.
export function sharedBankHolidays(records: Attendance[], people: Employee[]) {
  const matched = people.filter(p => p.name.trim().toLowerCase() === "javed iqbal");
  const holidays = new Map<string, Attendance>();
  if (matched.length !== 1) return holidays;
  const conflicts = new Set<string>();
  for (const record of records) {
    if (record.employeeId !== matched[0].employeeId || !/\bholiday\b/i.test(record.rawText || record.status)) continue;
    const previous = holidays.get(record.date);
    if (previous && (previous.rawText || previous.status) !== (record.rawText || record.status)) conflicts.add(record.date);
    holidays.set(record.date, record);
  }
  for (const date of conflicts) holidays.delete(date);
  return holidays;
}

export function attendanceDisplayStatus(record: Attendance, person: Employee, holidays: ReadonlyMap<string, Attendance> = new Map()) {
  if (record.status !== "Pending") return record.status;
  const joined = joiningDate(person);
  if (joined && record.date < joined) return "Pending";
  const holiday = holidays.get(record.date);
  if (holiday) return holiday.rawText || holiday.status;
  const day = new Date(record.date + "T00:00:00Z").getUTCDay();
  return day === 0 || day === 6 ? "Weekend" : "Pending";
}

export function arrivalCategory(text: string) {
  if (!isRecordedArrival(text)) return undefined;
  const match = text.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap]m))?$/i)!;
  let hour = Number(match[1]);
  if (match[4]) {
    if (hour < 1 || hour > 12) return undefined;
    hour = hour % 12 + (match[4].toLowerCase() === "pm" ? 12 : 0);
  }
  const seconds = hour * 3600 + Number(match[2]) * 60 + Number(match[3] || 0);
  // Without AM/PM, interpret the recorded hour literally; never guess a shift.
  return seconds > 10 * 3600 ? "Severely late" : seconds > 9 * 3600 + 30 * 60 ? "Late" : "Arrival time";
}

export function attendanceColour(status: string) {
  const text = status.trim().toLowerCase().replace(/\s+/g, " ");
  if (/\bunapproved\b/.test(text) && /leave|half\s*day/.test(text)) return "bg-rose-100 text-rose-900";
  if (/\bapproved\b/.test(text) && /leave|half\s*day/.test(text)) return "bg-teal-100 text-teal-900";
  if (/\blate\b/.test(text)) return /severe/.test(text) ? "bg-red-100 text-red-900" : "bg-orange-100 text-orange-900";
  if (isRecordedArrival(status)) {
    const category = arrivalCategory(status);
    if (category === "Severely late") return "bg-red-100 text-red-900";
    if (category === "Late") return "bg-orange-100 text-orange-900";
    return "bg-fuchsia-100 text-fuchsia-900";
  }
  if (status === "Arrival time") return "bg-fuchsia-100 text-fuchsia-900";
  if (/\bholiday\b/.test(text)) return "bg-cyan-100 text-cyan-900";
  return status === "Absent" ? "bg-rose-100 text-rose-900" : status === "Leave" ? "bg-amber-100 text-amber-900" : status === "Half day" ? "bg-violet-100 text-violet-900" : status === "Present" ? "bg-emerald-100 text-emerald-900" : status === "Weekend" ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-700";
}

export function recordedHolidays(records: Attendance[]) {
  const dates = new Map<string, Set<string>>();
  for (const record of records) {
    if (!/\bholiday\b/i.test(record.rawText || record.status)) continue;
    const labels = dates.get(record.date) || new Set<string>();
    labels.add(record.rawText || record.status);
    dates.set(record.date, labels);
  }
  return [...dates].sort(([a], [b]) => a.localeCompare(b));
}
