import type { Grid, Parsed } from "./domain";

export const reportTabs = {
  "Profile Optimization": "Profile Optimization",
  "Optimization Status": "Optimization status",
  "Weekly Report": "Weekly Report",
  "Connects History": "Connects",
} as const;

export type ReportKind = keyof typeof reportTabs;
export type ReportRow = { row: number; section?: string; fields: Record<string, string> };

const columns = {
  "Profile Optimization": ["Date", "P. Optimization serial no", "Last Title", "Last Description", "Last Skills", "Last Employee Section", "Start - End Date", "Portfolio", "Catalogs"],
  "Optimization Status": ["Date", "P. Optimzation Serial Number", "Profile Views", "Invites", "Clicks", "Impressions"],
  "Weekly Report": ["Start - End Date", "No of Jobs Applied", "Connects", "Views", "Interview", "Calls", "Close/Hire", "Invitation Received", "Other Interviews", "other Hires", "Jobs No longer available", "Jobs Set to private", "Boosted proposal", "Out Bid", "Job applied on Zain Profile", "Job applied on Hassan Profile"],
  "Connects History": ["Date", "Connects", "Resource"],
} satisfies Record<ReportKind, string[]>;

const normalize = (value: string | undefined) => value?.trim().toLowerCase() || "";

export function reportHeaders(grid: Grid, kind: ReportKind) {
  const [anchor, second] = columns[kind].map(normalize);
  return grid.flatMap((cells, row) => cells.some((cell, col) =>
    normalize(cell) === anchor && normalize(cells[col + 1]) === second
  ) ? [{ row: row + 1, cells }] : []);
}

export function parseReport(grid: Grid, kind: ReportKind): Parsed {
  const headers = reportHeaders(grid, kind);
  if (!headers.length) throw Error("Report header missing. Inspect the tab layout.");
  const fields = columns[kind];
  const rows: ReportRow[] = [];
  for (const [index, header] of headers.entries()) {
    const starts = header.cells.flatMap((value, col) =>
      normalize(value) === normalize(fields[0]) && normalize(header.cells[col + 1]) === normalize(fields[1]) ? [col] : []
    );
    for (const [group, start] of starts.entries()) {
      const end = starts[group + 1] ?? header.cells.length;
      const section = kind === "Weekly Report" ? undefined :
        grid.slice(headers[index - 1]?.row ?? 0, header.row - 1).reverse().find(row => row[start]?.trim())?.[start]?.trim();
      const positions = fields.map(field => {
        const matches = header.cells.slice(start, end).flatMap((value, offset) => normalize(value) === normalize(field) ? [start + offset] : []);
        if (matches.length > 1) throw Error("Ambiguous report column: " + field);
        return matches[0] ?? -1;
      });
      for (let row = header.row; row < (headers[index + 1]?.row ?? grid.length + 1) - 1; row++) {
        const values = positions.map(col => grid[row][col]?.trim() ?? "");
        if (!values[0] || !values.slice(1).some(Boolean)) continue;
        if (kind !== "Weekly Report" && !/^(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})$/.test(values[0])) continue;
        rows.push({ row: row + 1, section, fields: Object.fromEntries(fields.map((field, col) => [field, values[col]])) });
      }
    }
  }
  return { employees: [], attendance: [], upworkReport: rows, warnings: [] };
}
