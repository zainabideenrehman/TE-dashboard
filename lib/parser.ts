import {
  defaultMapping,
  type Grid,
  type Inspection,
  type Mapping,
  type Employee,
  type Parsed,
  type ProfileLinkCells,
} from "./domain";
import { excludedEmployeeColumn } from "./employees";
import { parseUpwork } from "./upwork";
import { parseTextAttendance } from "./attendance";

import type { NameFormatting } from "./formatting";

const months = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const monthPattern =
  /^(January|February|March|April|May|June|July|August|September|October|November|December),?\s+\d{4}$/i;
const monthKey = (s: string) => s.replace(",", "").trim().toLowerCase();
const key = (s: string) => s.trim().toLowerCase();
const has = (record: Record<string, string>, name: string) =>
  Object.hasOwn(record, name);

export function inspect(
  grid: Grid,
  mapping: Mapping = defaultMapping,
): Inspection {
  const anchors = grid.flatMap((r, i) =>
    r
      .filter((c) => monthPattern.test(c.trim()))
      .map((anchor) => ({ anchor: anchor.trim(), row: i + 1 })),
  );
  const headers = grid.flatMap((cells, i) =>
    cells.some((c) =>
      ["date", key(mapping.name), key(mapping.id), ...(mapping.upwork ? [key(mapping.upwork.submittedDate), key(mapping.upwork.title)] : [])]
        .filter(Boolean)
        .includes(key(c)),
    )
      ? [{ row: i + 1, cells }]
      : [],
  );
  const warnings: string[] = [];
  if (!headers.length)
    warnings.push(
      "No recognizable headers. Configure field names and inspect again.",
    );
  for (const [i, anchor] of anchors.entries()) {
    if (anchors.findIndex((m) => monthKey(m.anchor) === monthKey(anchor.anchor)) !== i)
      warnings.push("Duplicate month anchor: " + anchor.anchor);
  }
  const sections = anchors.map((anchor, i) => {
    const endRow = anchors[i + 1] ? anchors[i + 1].row - 1 : grid.length;
    const headerRows = headers
      .filter(
        (h) =>
          h.row > anchor.row &&
          h.row <= endRow &&
          key(h.cells[0] || "") === "date",
      )
      .map((h) => h.row);
    if (!headerRows.length)
      warnings.push(
        anchor.anchor + ": no Date header found; this section needs review.",
      );
    return {
      anchor: anchor.anchor,
      startRow: anchor.row,
      endRow,
      headerRows,
      confidence: headerRows.length ? ("high" as const) : ("review" as const),
    };
  });
  for (const header of headers) {
    const filled = header.cells.map(key).filter(Boolean);
    // Applied Jobs has repeated unused Location labels and two contextual Boosted labels.
    // Its parser validates every consumed field and the approved Boosted/Video Interview pair.
    if (new Set(filled).size !== filled.length && !mapping.upwork?.appliedJobs)
      warnings.push("Duplicate column labels at row " + header.row);
  }
  return {
    at: new Date().toISOString(),
    headers,
    months: anchors,
    sections,
    warnings,
    preview: grid.slice(0, 40).map((r) => r.slice(0, 20)),
  };
}

export function structureDiff(a: Inspection | undefined, b: Inspection) {
  if (!a) return ["No approved baseline yet."];
  const changes: string[] = [];
  for (const m of b.months) {
    const old = a.months.find((x) => monthKey(x.anchor) === monthKey(m.anchor));
    if (!old) changes.push("New month: " + m.anchor);
    else if (old.row !== m.row)
      changes.push(m.anchor + ": moved from row " + old.row + " to " + m.row);
  }
  for (const m of a.months)
    if (!b.months.some((x) => monthKey(x.anchor) === monthKey(m.anchor)))
      changes.push("Removed month: " + m.anchor);
  if (
    JSON.stringify(a.headers.map((h) => h.cells)) !==
    JSON.stringify(b.headers.map((h) => h.cells))
  )
    changes.push(
      "Header layout or employee columns changed; review each section.",
    );
  const formatSummary = (s: Inspection) =>
    Object.values(s.nameFormatting || {})
      .map((f) => [f.value, f.strike])
      .sort((x, y) => x[0].localeCompare(y[0]));
  if (JSON.stringify(formatSummary(a)) !== JSON.stringify(formatSummary(b)))
    changes.push(
      "Employee name strikethrough formatting changed; review employment statuses.",
    );
  return changes.length ? changes : ["No structural changes detected."];
}

export function parse(
  grid: Grid,
  type: "employees" | "attendance" | "upwork-bd",
  mapping: Mapping,
  people: Employee[],
  spreadsheetId: string,
  tab: string,
  nameFormatting?: NameFormatting,
  profileLinkCells?: ProfileLinkCells,
): Parsed {
  if (type === "upwork-bd") return parseUpwork(grid, mapping, spreadsheetId, tab, profileLinkCells);
  if (type === "attendance" && mapping.attendance?.mode === "text")
    return parseTextAttendance(grid, mapping, people, spreadsheetId, tab);
  const result: Parsed = { employees: [], attendance: [], warnings: [] };
  const structure = inspect(grid, mapping);
  result.warnings.push(...structure.warnings);
  if (type === "employees") {
    const candidates = structure.headers.filter((h) =>
      h.cells.some((c) => key(c) === key(mapping.name)),
    );
    if (candidates.length !== 1)
      throw Error(
        "Expected one employee header. Check the name field mapping and repeated headers.",
      );
    const header = candidates[0];
    const index = (s: string) =>
      s ? header.cells.findIndex((c) => key(c) === key(s)) : -1;
    if (mapping.id && index(mapping.id) < 0)
      throw Error(
        "Employee ID column not found. For a sheet without IDs, clear the ID field and supply explicit name aliases.",
      );
    const profileColumns = Object.entries(mapping.profileFields || {}).map(
      ([label, column]) => {
        if (
          excludedEmployeeColumn.test(label) ||
          excludedEmployeeColumn.test(column)
        )
          throw Error("Excluded employee profile column: " + column);
        const ci = index(column);
        if (ci < 0)
          throw Error(
            "Mapped profile column not found: " +
              column +
              ". Inspect and revise the mapping.",
          );
        return { label, column: ci };
      },
    );
    for (let ri = header.row; ri < grid.length; ri++) {
      const row = grid[ri];
      if (!row.some((c) => c.trim())) continue;
      const name = row[index(mapping.name)]?.trim();
      const idFromSheet = row[index(mapping.id)]?.trim();
      const employeeId =
        idFromSheet ||
        (name && has(mapping.aliases, name)
          ? mapping.aliases[name]
          : undefined);
      if (!employeeId || !name) {
        result.warnings.push(
          "Row " +
            (ri + 1) +
            ": employee needs a name and stable ID or explicit alias.",
        );
        continue;
      }
      if (result.employees.some((e) => e.employeeId === employeeId))
        throw Error(
          "Duplicate employee ID " +
            employeeId +
            ". Ambiguous names need IDs in the source.",
        );
      let employmentStatus = row[index(mapping.status)]?.trim() || "Unknown";
      let employmentStatusSource: "name-strikethrough" | "status-column" =
        "status-column";
      if (mapping.nameStrikethroughMeansLeft) {
        const format = nameFormatting?.[ri + 1];
        if (!format || format.value.trim() !== name) {
          throw Error(
            "Employee name/formatting mismatch at row " +
              (ri + 1) +
              ". Refresh and inspect again.",
          );
        }
        if (format.strike === "partial") {
          result.warnings.push(
            "Partially struck-through employee name at row " +
              (ri + 1) +
              "; review before assigning employment status.",
          );
        } else if (format.strike === "full") {
          employmentStatus = "Left";
          employmentStatusSource = "name-strikethrough";
        }
      }
      const profile: Record<string, string> = {};
      const profileLinks: Record<string, string[]> = {};
      for (const field of profileColumns) {
        profile[field.label] = row[field.column]?.trim() || "";
        const linkCell = profileLinkCells?.[ri + 1 + ":" + field.column];
        if (linkCell) {
          if (linkCell.value.trim() !== profile[field.label])
            throw Error(
              "Profile value/link mismatch at row " +
                (ri + 1) +
                ". Refresh and inspect again.",
            );
          if (linkCell.urls.length) profileLinks[field.label] = linkCell.urls;
        }
      }
      result.employees.push({
        employeeId,
        name,
        ...(mapping.profileFields ? { profile, profileLinks } : {}),
        email: row[index(mapping.email)]?.trim() || undefined,
        departmentId: row[index(mapping.department)]?.trim() || "Unassigned",
        employmentStatus,
        employmentStatusSource,
        source: spreadsheetId + "/" + tab + "/row/" + (ri + 1),
      });
    }
    return result;
  }

  let headers: string[] = [];
  let section = "";
  const seen = new Set<string>();
  for (let ri = 0; ri < grid.length; ri++) {
    const row = grid[ri];
    const anchor = row.find((c) => monthPattern.test(c.trim()));
    if (anchor) {
      section = anchor.trim();
      headers = [];
      continue;
    }
    if (key(row[0] || "") === "date") {
      headers = row;
      continue;
    }
    if (!row.some((c) => c.trim())) continue;
    if (!headers.length) {
      if (row.some((c) => /^\d{4}-\d{2}-\d{2}$/.test(c)))
        result.warnings.push(
          "Data before a recognized Date header at row " + (ri + 1),
        );
      continue;
    }
    let date = row[0]?.trim() || "";
    if (/^\d{1,2}$/.test(date) && section) {
      const [month, year] = monthKey(section).split(/\s+/);
      date = `${year}-${String(months.indexOf(month) + 1).padStart(2, "0")}-${date.padStart(2, "0")}`;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      isNaN(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    ) {
      result.warnings.push("Invalid date at row " + (ri + 1));
      continue;
    }
    if (section) {
      const [month, year] = monthKey(section).split(/\s+/);
      const parsedDate = new Date(date);
      if (
        months.indexOf(key(month)) !== parsedDate.getUTCMonth() ||
        Number(year) !== parsedDate.getUTCFullYear()
      )
        throw Error("Date outside month anchor at row " + (ri + 1));
    }
    for (let ci = 1; ci < Math.max(headers.length, row.length); ci++) {
      if (!row[ci]?.trim()) continue;
      const label = headers[ci]?.trim();
      if (!label) {
        result.warnings.push(
          "Value under unlabeled column at row " +
            (ri + 1) +
            ", column " +
            (ci + 1),
        );
        continue;
      }
      const alias = has(mapping.aliases, label)
        ? mapping.aliases[label]
        : undefined;
      // An exact ID wins over name matching; duplicate IDs remain ambiguous.
      const exact = people.filter((p) => p.employeeId === (alias || label));
      const matches =
        exact.length || alias
          ? exact
          : people.filter((p) => key(p.name) === key(label));
      if (matches.length !== 1) {
        result.warnings.push(
          (matches.length ? "Ambiguous" : "Unmatched") + " employee: " + label,
        );
        continue;
      }
      const raw = row[ci].trim();
      const status = has(mapping.statuses, raw)
        ? mapping.statuses[raw]
        : undefined;
      if (!status) {
        result.warnings.push(
          "Unmapped status " + raw + " at " + (ri + 1) + ":" + (ci + 1),
        );
        continue;
      }
      const employeeId = matches[0].employeeId;
      const recordKey = employeeId + "/" + date;
      if (seen.has(recordKey)) throw Error("Duplicate attendance " + recordKey);
      seen.add(recordKey);
      result.attendance.push({
        employeeId,
        date,
        status,
        source: { spreadsheetId, tab, row: ri + 1, column: ci + 1 },
      });
    }
  }
  if (!structure.headers.some((h) => key(h.cells[0] || "") === "date"))
    result.warnings.push(
      "No Date header recognized. Attendance requires ISO dates or day numbers beneath a month anchor in the first column.",
    );
  return result;
}
