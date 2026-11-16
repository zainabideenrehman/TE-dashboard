import type { Grid, Mapping } from "./domain";

export const excludedEmployeeColumn =
  /salary|payroll|bank|iban|finance|password|credential|secret|private[ _-]*key/i;
export const employeeProfileColumns: Record<string, string> = {
  "Father name": "Father Name",
  "Contact number": "Contact Number",
  "Degree subject": "Degree Subject",
  "Graduation year": "Year Of Graduation",
  University: "University",
  CGPA: "CGPA",
  CNIC: "CNIC",
  Designation: "Designation",
  "Date of birth": "DOB",
  "Joining date": "Joining Date",
  "Permanent address": "Permanant Address",
  "Current address": "Current Address",
  Picture: "Picture",
  Performance: "Performance",
  CV: "CV",
  "Tenure (source value)": "Tenure till 16th July 2026",
  "Exit date": "Exit Date",
};
export function safeWebUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {}
  return undefined;
}
export function employeeHeader(grid: Grid, nameColumn: string) {
  const key = (s: string) => s.trim().toLowerCase();
  const rows = grid.flatMap((row, i) =>
    row.some((c) => key(c) === key(nameColumn)) ? [{ row, index: i }] : [],
  );
  if (rows.length !== 1)
    throw Error(
      "Expected one employee name header. Inspect the source layout.",
    );
  return rows[0];
}
export function prepareEmployeeAliases(
  grid: Grid,
  mapping: Mapping,
  reservedIds: string[],
) {
  const { row: headers, index } = employeeHeader(grid, mapping.name);
  const nameColumn = headers.findIndex(
    (c) => c.trim().toLowerCase() === mapping.name.trim().toLowerCase(),
  );
  const idColumn = mapping.id
    ? headers.findIndex(
        (c) => c.trim().toLowerCase() === mapping.id.trim().toLowerCase(),
      )
    : -1;
  const aliases = { ...mapping.aliases };
  const usedIds = new Set([...reservedIds, ...Object.values(aliases)]);
  const seen = new Set<string>();
  const newEmployees: { name: string; employeeId: string }[] = [];
  let next = 1;
  for (const row of grid.slice(index + 1)) {
    if (!row.some((c) => c.trim())) continue;
    const name = row[nameColumn]?.trim();
    if (!name)
      throw Error(
        "Employee row has details but no name. Review the sheet before assigning IDs.",
      );
    const folded = name.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(folded) && !mapping.id)
      throw Error(
        "Duplicate employee name requires an explicit identity review: " + name,
      );
    seen.add(folded);
    if (row[idColumn]?.trim() || Object.hasOwn(aliases, name)) continue;
    let employeeId: string;
    do {
      employeeId = "EMP-" + String(next++).padStart(4, "0");
    } while (usedIds.has(employeeId));
    aliases[name] = employeeId;
    usedIds.add(employeeId);
    newEmployees.push({ name, employeeId });
  }
  return { mapping: { ...mapping, aliases }, newEmployees };
}
