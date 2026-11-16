import "server-only";
import { demoId, demoTabs, employees, attendance } from "./demo";
import type { Grid, TabMetadata, ProfileLinkCells } from "./domain";
import { safeWebUrl } from "./employees";
import {
  nameCellFormat,
  type NameFormatting,
  type GoogleNameCell,
} from "./formatting";

export interface SheetsClient {
  profileLinks?(
    id: string,
    tab: string,
    columns: number[],
  ): Promise<ProfileLinkCells>;
  tabs(id: string): Promise<TabMetadata[]>;
  grid(id: string, tab: string, firstRow?: number, lastColumn?: number): Promise<Grid>;
  nameFormatting?(
    id: string,
    tab: string,
    column: number,
  ): Promise<NameFormatting>;
}
type SheetProperties = {
  sheetId?: number | null;
  title?: string | null;
  sheetType?: string | null;
  gridProperties?: {
    rowCount?: number | null;
    columnCount?: number | null;
  } | null;
};
export interface GoogleReadApi {
  spreadsheets: {
    get(
      params: { spreadsheetId: string; fields: string; ranges?: string[] },
      options: { timeout: number },
    ): Promise<{
      data: {
        sheets?:
          | {
              properties?: SheetProperties;
              data?:
                | {
                    startRow?: number | null;
                    startColumn?: number | null;
                    rowData?: { values?: GoogleNameCell[] | null }[] | null;
                  }[]
                | null;
            }[]
          | null;
      };
    }>;
    values: {
      get(
        params: {
          spreadsheetId: string;
          range: string;
          valueRenderOption: string;
        },
        options: { timeout: number },
      ): Promise<{ data: { values?: unknown[][] | null } }>;
    };
  };
}
export function sheetId(value: unknown) {
  if (typeof value !== "string")
    throw Error("Enter a Google Sheets URL or spreadsheet ID.");
  const raw = value.trim();
  const match = raw.match(
    /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]+)(?:\/|\?|#|$)/,
  );
  const id = match?.[1] || raw;
  if (!/^[\w-]{10,150}$/.test(id))
    throw Error("Enter a Google Sheets URL or spreadsheet ID.");
  return id;
}
export function allowedTab(name: string) {
  if (/credential|password|secret|salary|payroll|finance/i.test(name))
    throw Error("Credential, salary and finance tabs are excluded.");
}
export function connectionError(error: unknown): Error {
  const e = error as {
    code?: number | string;
    response?: { status?: number };
    message?: string;
  };
  const code = e.response?.status || e.code;
  if (code === 403)
    return Error(
      "Google denied access. Enable the Sheets API, share the spreadsheet with the service account as Viewer, and check the read-only scope.",
    );
  if (code === 404)
    return Error(
      "Spreadsheet or tab not found, or not shared with the backend identity.",
    );
  if (code === 429)
    return Error(
      "Google Sheets quota exceeded. Wait a minute and retry; last-good data is retained.",
    );
  if (
    /credential|default credentials|invalid_grant|unauthenticated/i.test(
      e.message || "",
    ) ||
    code === 401
  )
    return Error(
      "Google credentials unavailable. Configure ADC or GOOGLE_APPLICATION_CREDENTIALS locally; use an assigned service account on Cloud Run.",
    );
  return Error(
    e.message ||
      "Sheets read failed. Check ADC, API enablement and Viewer sharing.",
  );
}
export function createGoogleClient(
  api: () => Promise<GoogleReadApi>,
): SheetsClient {
  return {
    async tabs(id) {
      try {
        const service = await api();
        // Metadata only: no values or grid data from excluded tabs.
        const response = await service.spreadsheets.get(
          {
            spreadsheetId: id,
            fields: "sheets.properties(sheetId,title,sheetType,gridProperties)",
          },
          { timeout: 15000 },
        );
        return (response.data.sheets || []).flatMap((s) => {
          const p = s.properties;
          if (
            !p ||
            p.sheetType !== "GRID" ||
            typeof p.sheetId !== "number" ||
            !p.title ||
            /credential|password|secret|salary|payroll|finance/i.test(p.title)
          )
            return [];
          return [
            {
              id: p.sheetId,
              name: p.title,
              rowCount: p.gridProperties?.rowCount ?? undefined,
              columnCount: p.gridProperties?.columnCount ?? undefined,
            },
          ];
        });
      } catch (e) {
        throw connectionError(e);
      }
    },
    async profileLinks(id, tab, columns) {
      allowedTab(tab);
      if (!columns.length) return {};
      if (
        columns.some(
          (column) => !Number.isInteger(column) || column < 0 || column >= 52,
        )
      )
        throw Error("Profile columns are outside approved read bounds.");
      try {
        const metadata = (await this.tabs(id)).find((t) => t.name === tab);
        if (!metadata)
          throw Error("Selected employee tab is missing or excluded.");
        if ((metadata.rowCount || 0) > 3000)
          throw Error("Tab exceeds the MVP safety bounds.");
        const ranges = [...new Set(columns)].map((column) => {
          let n = column + 1,
            letter = "";
          while (n > 0) {
            n--;
            letter = String.fromCharCode(65 + (n % 26)) + letter;
            n = Math.floor(n / 26);
          }
          return (
            "'" +
            tab.replaceAll("'", "''") +
            "'!" +
            letter +
            "1:" +
            letter +
            "3000"
          );
        });
        const response = await (
          await api()
        ).spreadsheets.get(
          {
            spreadsheetId: id,
            ranges,
            fields:
              "sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(formattedValue,hyperlink,textFormatRuns(format/link/uri)))))",
          },
          { timeout: 15000 },
        );
        const sheet = response.data.sheets?.find(
          (s) =>
            s.properties?.sheetId === metadata.id && s.properties.title === tab,
        );
        if (!sheet)
          throw Error("Profile link response did not match the employee tab.");
        const result: ProfileLinkCells = {};
        for (const block of sheet.data || []) {
          const column = block.startColumn || 0;
          if (!columns.includes(column))
            throw Error("Profile links returned an unexpected column.");
          for (const [offset, row] of (block.rowData || []).entries()) {
            if ((row.values?.length || 0) > 1)
              throw Error("Profile links returned an unexpected column span.");
            const cell = row.values?.[0];
            if (!cell) continue;
            const urls = [
              ...new Set(
                [
                  cell.hyperlink,
                  ...(cell.textFormatRuns || []).map(
                    (run) => run.format?.link?.uri,
                  ),
                ].flatMap((value) => {
                  const url = value && safeWebUrl(value);
                  return url ? [url] : [];
                }),
              ),
            ];
            if (urls.length)
              result[(block.startRow || 0) + offset + 1 + ":" + column] = {
                value: cell.formattedValue || "",
                urls,
              };
          }
        }
        return result;
      } catch (error) {
        throw connectionError(error);
      }
    },
    async nameFormatting(id, tab, column) {
      allowedTab(tab);
      if (!Number.isInteger(column) || column < 0 || column >= 52)
        throw Error("Name column is outside the approved read bounds.");
      try {
        const metadata = (await this.tabs(id)).find((t) => t.name === tab);
        if (!metadata)
          throw Error("Selected employee tab is missing or excluded.");
        if ((metadata.rowCount || 0) > 3000 || (metadata.columnCount || 0) > 52)
          throw Error("Tab exceeds the MVP safety bounds.");
        let n = column + 1;
        let letter = "";
        while (n > 0) {
          n--;
          letter = String.fromCharCode(65 + (n % 26)) + letter;
          n = Math.floor(n / 26);
        }
        const range =
          "'" +
          tab.replaceAll("'", "''") +
          "'!" +
          letter +
          "1:" +
          letter +
          "3000";
        const response = await (
          await api()
        ).spreadsheets.get(
          {
            spreadsheetId: id,
            ranges: [range],
            fields:
              "sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(formattedValue,effectiveFormat/textFormat/strikethrough,textFormatRuns(startIndex,format/strikethrough)))))",
          },
          { timeout: 15000 },
        );
        const sheet = response.data.sheets?.find(
          (s) =>
            s.properties?.sheetId === metadata.id && s.properties.title === tab,
        );
        if (!sheet)
          throw Error(
            "Employee formatting response did not match the selected tab.",
          );
        const formats: NameFormatting = {};
        for (const block of sheet.data || []) {
          if ((block.startColumn || 0) !== column)
            throw Error("Employee formatting returned an unexpected column.");
          for (const [offset, row] of (block.rowData || []).entries()) {
            const cell = row.values?.[0];
            if (cell?.formattedValue)
              formats[(block.startRow || 0) + offset + 1] =
                nameCellFormat(cell);
          }
        }
        return formats;
      } catch (error) {
        throw connectionError(error);
      }
    },
    async grid(id, tab, firstRow = 1, lastColumn) {
      allowedTab(tab);
      if (!Number.isInteger(firstRow) || firstRow < 1 || firstRow > 3000)
        throw Error("Invalid first data row.");
      try {
        const metadata = (await this.tabs(id)).find((t) => t.name === tab);
        if (!metadata)
          throw Error(
            "Selected tab is missing, excluded, or no longer a grid tab. Inspect the source again.",
          );
        if ((metadata.rowCount || 0) > 3000 || ((metadata.columnCount || 0) > 52 && lastColumn === undefined))
          throw Error(
            "Tab exceeds the MVP safety bounds of 3000 rows and 52 columns. Use a smaller operational tab; data will not be truncated silently.",
          );
        if (lastColumn !== undefined && (!Number.isInteger(lastColumn) || lastColumn < 1 || lastColumn > 60)) throw Error("Invalid approved column bound.");
        let endColumn = "AZ";
        if (lastColumn !== undefined) { let n = lastColumn; endColumn = ""; while (n) { n--; endColumn = String.fromCharCode(65 + n % 26) + endColumn; n = Math.floor(n / 26); } }
        const service = await api();
        const response = await service.spreadsheets.values.get(
          {
            spreadsheetId: id,
            range: "'" + tab.replaceAll("'", "''") + "'!A" + firstRow + ":" + endColumn + "3000",
            valueRenderOption: "FORMATTED_VALUE",
          },
          { timeout: 15000 },
        );
        return [...Array.from({ length: firstRow - 1 }, () => [] as string[]), ...(response.data.values || []).map((row) =>
          row.map((value) => String(value ?? "")),
        )];
      } catch (e) {
        throw connectionError(e);
      }
    },
  };
}
export function client(): SheetsClient {
  const mode = process.env.DATA_MODE || "DEMO";
  if (!["DEMO", "GOOGLE"].includes(mode))
    throw Error("DATA_MODE must be DEMO or GOOGLE.");
  if (mode === "DEMO")
    return {
      async nameFormatting(id, tab, column) {
        const grid = await this.grid(id, tab);
        return Object.fromEntries(
          grid.flatMap((row, i) =>
            row[column]
              ? [[i + 1, { value: row[column], strike: "none" as const }]]
              : [],
          ),
        );
      },
      async tabs(id) {
        if (id !== demoId)
          throw Error(
            "Demo mode only reads " +
              demoId +
              ". Set DATA_MODE=GOOGLE for shared Sheets.",
          );
        return demoTabs.map((t) => ({
          ...t,
          rowCount: (t.id === 1 ? employees : attendance).length,
          columnCount: t.id === 1 ? 5 : 7,
        }));
      },
      async grid(id, tab) {
        if (id !== demoId) throw Error("Unknown demo spreadsheet.");
        allowedTab(tab);
        if (!demoTabs.some((t) => t.name === tab))
          throw Error("Unknown demo tab.");
        return structuredClone(tab === "Employees" ? employees : attendance);
      },
    };
  return createGoogleClient(async () => {
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      ...(process.env.GOOGLE_SERVICE_ACCOUNT_JSON
        ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) }
        : {}),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || undefined,
    });
    return google.sheets({ version: "v4", auth });
  });
}
