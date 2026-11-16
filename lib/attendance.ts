import type { Employee, Grid, Mapping, Parsed, Attendance } from "./domain";

const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
export function parseTextAttendance(grid: Grid, mapping: Mapping, people: Employee[], spreadsheetId: string, tab: string): Parsed {
  const result: Parsed = { employees: [], attendance: [], warnings: [], reviews: [] };
  const reviews = new Set<string>();
  const seen = new Set<string>();
  let section: { year: string; month: number } | undefined;
  let header: string[] | undefined;
  let sections = 0;
  let headers = 0;
  let days = 0;
  for (let ri = (mapping.attendance?.firstRow || 1) - 1; ri < grid.length; ri++) {
    const row = grid[ri];
    const anchor = row.map(c => c.trim().match(/^(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})$/i)).find(Boolean);
    if (anchor) {
      if (section && !header) throw Error("Month section is missing its Date header.");
      section = { year: anchor[2], month: monthNames.indexOf(anchor[1].toLowerCase()) + 1 };
      header = undefined;
      sections++;
      continue;
    }
    if (!section) continue;
    if (row[0]?.trim().toLowerCase() === "date") {
      if (header) throw Error("Multiple Date headers in one month; review structure.");
      header = row;
      headers++;
      continue;
    }
    if (!header) continue;
    const rawDate = row[0]?.trim() || "";
    // Ignore monthly totals and legends, never use them to construct records.
    if (!/^\d{1,2}$/.test(rawDate) && !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) continue;
    const date = /^\d{1,2}$/.test(rawDate) ? `${section.year}-${String(section.month).padStart(2, "0")}-${rawDate.padStart(2, "0")}` : rawDate;
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date || parsedDate.getUTCMonth() + 1 !== section.month || parsedDate.getUTCFullYear() !== Number(section.year)) throw Error("Invalid attendance date at row " + (ri + 1));
    days++;
    for (let ci = 1; ci < header.length; ci++) {
      const label = header[ci]?.trim();
      if (!label) continue;
      const alias = Object.hasOwn(mapping.aliases, label) ? mapping.aliases[label] : undefined;
      const exact = people.filter(p => p.employeeId === (alias || label));
      const matches = exact.length || alias ? exact : people.filter(p => p.name.trim().toLowerCase() === label.toLowerCase());
      if (matches.length !== 1) {
        reviews.add(`${matches.length ? "Ambiguous" : "Unmatched"} attendance name: ${label}`);
        continue;
      }
      const employeeId = matches[0].employeeId;
      const id = employeeId + "/" + date;
      if (seen.has(id)) throw Error("Duplicate attendance " + id);
      seen.add(id);
      const rawText = row[ci]?.trim() || "";
      const token = rawText.toUpperCase().replace(/\s+/g, " ");
      const status = !rawText ? "Pending" : token === "LEAVE" ? "Leave" : /^HALF\s*DAY$/.test(token) ? "Half day" : token === "ABSENT" ? "Absent" : token === "PRESENT" ? "Present" : token === "WEEKEND" ? "Weekend" : rawText;
      result.attendance.push({ employeeId, date, status, rawText, source: { spreadsheetId, tab, row: ri + 1, column: ci + 1 } });
    }
  }
  if (!sections || sections !== headers || !days) throw Error("No complete attendance month sections found. Last-good records retained.");
  result.reviews = [...reviews];
  return result;
}

export function leaveUsage(records: Attendance[]) {
  return records.reduce((sum, r) => sum + (r.status === "Leave" || r.status === "Absent" ? 1 : r.status === "Half day" ? 0.5 : 0), 0);
}
