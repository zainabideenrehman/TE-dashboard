export type StrikeState = "none" | "full" | "partial";
export type NameCellFormat = { value: string; strike: StrikeState };
// Row keys are current one-based sheet rows, used only for provenance.
export type NameFormatting = Record<number, NameCellFormat>;
export type GoogleNameCell = {
  formattedValue?: string | null;
  hyperlink?: string | null;
  effectiveFormat?: {
    textFormat?: { strikethrough?: boolean | null } | null;
  } | null;
  textFormatRuns?:
    | {
        startIndex?: number | null;
        format?: {
          strikethrough?: boolean | null;
          link?: { uri?: string | null } | null;
        } | null;
      }[]
    | null;
};

export function nameCellFormat(cell: GoogleNameCell): NameCellFormat {
  const value = cell.formattedValue || "";
  const base = cell.effectiveFormat?.textFormat?.strikethrough ?? false;
  const runs = [...(cell.textFormatRuns || [])].sort(
    (a, b) => (a.startIndex || 0) - (b.startIndex || 0),
  );
  let runIndex = 0;
  let struck = base;
  let hasStruck = false;
  let hasPlain = false;
  for (let i = 0; i < value.length; i++) {
    while (runIndex < runs.length && (runs[runIndex].startIndex || 0) <= i) {
      struck = runs[runIndex].format?.strikethrough ?? base;
      runIndex++;
    }
    if (!value[i].trim()) continue;
    if (struck) hasStruck = true;
    else hasPlain = true;
  }
  return {
    value,
    strike: hasStruck ? (hasPlain ? "partial" : "full") : "none",
  };
}
