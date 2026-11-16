import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { store as configuredStore, type RegistryStore } from "./store";
import {
  client as configuredClient,
  allowedTab,
  sheetId,
  type SheetsClient,
} from "./sheets";
import { defaultUpworkMapping, validateUpworkMapping } from "./upwork";
import { inspect, parse } from "./parser";
import {
  defaultMapping,
  type Mapping,
  type Source,
  type Registry,
  type Grid,
  type ProfileLinkCells,
} from "./domain";
import {
  excludedEmployeeColumn,
  employeeHeader,
  prepareEmployeeAliases,
} from "./employees";

import type { NameFormatting } from "./formatting";

export type Dependencies = { store: RegistryStore; client: SheetsClient };
function dependencies(deps?: Dependencies): Dependencies {
  return deps || { store: configuredStore(), client: configuredClient() };
}
export function findSource(sources: Source[], id: unknown) {
  const source = sources.find((s) => s.sourceId === id);
  if (!source) throw Error("Source not found.");
  return source;
}
export function validateMapping(value: unknown): Mapping {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid mapping.");
  const m = value as Mapping;
  if (m.upwork !== undefined) validateUpworkMapping(m.upwork);
  if (m.attendance !== undefined) {
    const a = m.attendance;
    if (!a || a.mode !== "text" || !Number.isInteger(a.firstRow) || a.firstRow < 1 || a.firstRow > 3000 || !a.allowances || typeof a.allowances !== "object" || Array.isArray(a.allowances) || Object.keys(a.allowances).length > 1000)
      throw Error("Invalid text attendance mapping.");
    for (const [id, allowance] of Object.entries(a.allowances))
      if (!id.trim() || ["__proto__", "constructor", "prototype"].includes(id) || !allowance || !Number.isInteger(allowance.year) || allowance.year < 2000 || allowance.year > 2100 || !Number.isFinite(allowance.days) || allowance.days < 0 || allowance.days > 15 || allowance.days * 2 % 1 !== 0)
        throw Error("Invalid attendance allowance.");
  }
  for (const field of [
    "id",
    "name",
    "department",
    "email",
    "status",
  ] as const) {
    if (
      typeof m[field] !== "string" ||
      m[field].length > 100 ||
      (field === "name" && !m[field].trim())
    )
      throw Error("Invalid mapping field: " + field);
  }
  for (const field of ["aliases", "statuses"] as const) {
    const map = m[field];
    if (
      !map ||
      Array.isArray(map) ||
      typeof map !== "object" ||
      Object.keys(map).length > 1000 ||
      Object.entries(map).some(
        ([k, v]) =>
          !k.trim() ||
          typeof v !== "string" ||
          !v.trim() ||
          v.length > 100 ||
          ["__proto__", "prototype", "constructor"].includes(k),
      )
    )
      throw Error("Invalid " + field + " map.");
  }
  if (
    m.nameStrikethroughMeansLeft !== undefined &&
    typeof m.nameStrikethroughMeansLeft !== "boolean"
  )
    throw Error("Invalid name strikethrough rule.");
  if (m.profileFields !== undefined) {
    if (
      !m.profileFields ||
      Array.isArray(m.profileFields) ||
      typeof m.profileFields !== "object" ||
      Object.keys(m.profileFields).length > 52
    )
      throw Error("Invalid employee profile field mapping.");
    for (const [label, column] of Object.entries(m.profileFields)) {
      if (
        !label.trim() ||
        label.length > 100 ||
        typeof column !== "string" ||
        !column.trim() ||
        column.length > 100 ||
        ["__proto__", "prototype", "constructor"].includes(label)
      )
        throw Error("Invalid employee profile field.");
      if (
        excludedEmployeeColumn.test(label) ||
        excludedEmployeeColumn.test(column)
      )
        throw Error(
          "Salary, finance and credential profile columns are excluded.",
        );
    }
  }
  return {
    ...(m.upwork ? { upwork: validateUpworkMapping(m.upwork) } : {}),
    ...(m.attendance ? { attendance: structuredClone(m.attendance) } : {}),
    ...(m.profileFields !== undefined
      ? { profileFields: { ...m.profileFields } }
      : {}),
    ...(m.nameStrikethroughMeansLeft !== undefined
      ? { nameStrikethroughMeansLeft: m.nameStrikethroughMeansLeft }
      : {}),
    id: m.id.trim(),
    name: m.name.trim(),
    department: m.department.trim(),
    email: m.email.trim(),
    status: m.status.trim(),
    aliases: { ...m.aliases },
    statuses: { ...m.statuses },
  };
}
function roster(registry: Registry) {
  return registry.sources
    .filter((s) => s.dataType === "employees")
    .flatMap((s) => s.data?.employees || []);
}
function parsed(
  grid: Grid,
  source: Source,
  registry: Registry,
  mapping = source.mapping,
  nameFormatting?: NameFormatting,
  profileLinkCells?: ProfileLinkCells,
) {
  const result = parse(
    grid,
    source.dataType,
    mapping,
    roster(registry),
    source.spreadsheetId,
    source.tabName,
    nameFormatting,
    profileLinkCells,
  );
  if (source.dataType === "employees") {
    const otherIds = new Set(
      registry.sources
        .filter(
          (s) => s.sourceId !== source.sourceId && s.dataType === "employees",
        )
        .flatMap((s) => s.data?.employees.map((p) => p.employeeId) || []),
    );
    for (const employee of result.employees)
      if (otherIds.has(employee.employeeId))
        result.warnings.push(
          "Employee ID already exists in another source: " +
            employee.employeeId,
        );
  }
  return result;
}
function previewDigest(
  source: Source,
  registry: Registry,
  mapping: Mapping,
  grid: Grid,
  nameFormatting?: NameFormatting,
  profileLinkCells?: ProfileLinkCells,
) {
  // Bind approval to all bounded values (including rows outside the visual sample),
  // the current mapping revision, inspection, and attendance identity context.
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: source.sourceId,
        version: source.version,
        inspectedAt: source.inspection?.at,
        mapping,
        grid,
        nameFormatting,
        profileLinkCells,
        people: source.dataType === "attendance" ? roster(registry) : [],
      }),
    )
    .digest("hex");
}
async function readSourceGrid(source: Source, deps: Dependencies, mapping = source.mapping) {
  allowedTab(source.tabName);
  const tab = (await deps.client.tabs(source.spreadsheetId)).find(
    (t) => t.id === source.tabId,
  );
  if (!tab || tab.name !== source.tabName)
    throw Error(
      "Tab identity or name changed. Re-add the selected tab before reading values.",
    );
  return deps.client.grid(source.spreadsheetId, source.tabName, source.dataType === "attendance" ? mapping.attendance?.firstRow : undefined, source.dataType === "upwork-bd" ? mapping.upwork?.knowledge === "keywords" ? 19 : mapping.upwork?.knowledge === "relevant-jobs" ? 59 : mapping.upwork?.appliedJobs ? 47 : undefined : undefined);
}
async function readNameFormatting(
  grid: Grid,
  source: Source,
  mapping: Mapping,
  deps: Dependencies,
) {
  if (source.dataType !== "employees" || !mapping.nameStrikethroughMeansLeft)
    return undefined;
  if (!deps.client.nameFormatting)
    throw Error(
      "This adapter cannot read employee strikethrough formatting. Last-good records are retained.",
    );
  const headers = grid.filter((row) =>
    row.some(
      (cell) => cell.trim().toLowerCase() === mapping.name.trim().toLowerCase(),
    ),
  );
  if (headers.length !== 1)
    throw Error("Employee name header is ambiguous; inspect again.");
  const column = headers[0].findIndex(
    (cell) => cell.trim().toLowerCase() === mapping.name.trim().toLowerCase(),
  );
  return deps.client.nameFormatting(
    source.spreadsheetId,
    source.tabName,
    column,
  );
}
async function readProfileLinks(
  grid: Grid,
  source: Source,
  mapping: Mapping,
  deps: Dependencies,
) {
  if (source.dataType === "upwork-bd" && mapping.upwork?.appliedJobs && deps.client.profileLinks) {
    const headers = grid.filter(row => row.some(cell => cell.trim() === mapping.upwork!.title));
    if (headers.length !== 1) throw Error("Applied Jobs link header ambiguous.");
    const column = headers[0].findIndex(cell => cell.trim() === mapping.upwork!.title);
    return deps.client.profileLinks(source.spreadsheetId, source.tabName, [column]);
  }
  if (
    source.dataType !== "employees" ||
    !mapping.profileFields ||
    !deps.client.profileLinks
  )
    return undefined;
  const { row: headers } = employeeHeader(grid, mapping.name);
  const columns = Object.entries(mapping.profileFields).map(
    ([label, field]) => {
      if (
        excludedEmployeeColumn.test(label) ||
        excludedEmployeeColumn.test(field)
      )
        throw Error("Excluded employee profile column.");
      const column = headers.findIndex(
        (c) => c.trim().toLowerCase() === field.trim().toLowerCase(),
      );
      if (column < 0)
        throw Error("Mapped employee profile column is missing: " + field);
      return column;
    },
  );
  return deps.client.profileLinks(
    source.spreadsheetId,
    source.tabName,
    columns,
  );
}
export async function refresh(
  sourceId: string,
  force = false,
  injected?: Dependencies,
) {
  const deps = dependencies(injected);
  return deps.store.update(async (registry) => {
    const s = findSource(registry.sources, sourceId);
    const attempted = s.lastAttempt || s.lastRefresh;
    if (!force && attempted && Date.now() - Date.parse(attempted) < 60000)
      return;
    if (!s.version) {
      s.error = "Inspect, preview and publish a mapping before refreshing.";
      return;
    }
    s.lastAttempt = new Date().toISOString();
    try {
      allowedTab(s.tabName);
      const grid = await readSourceGrid(s, deps);
      const nameFormatting = await readNameFormatting(grid, s, s.mapping, deps);
      const profileLinkCells = await readProfileLinks(grid, s, s.mapping, deps);
      const data = parsed(
        grid,
        s,
        registry,
        s.mapping,
        nameFormatting,
        profileLinkCells,
      );
      if (data.warnings.length)
        throw Error("Review required: " + data.warnings.join("; "));
      s.data = data;
      s.lastRefresh = new Date().toISOString();
      delete s.error;
    } catch (error) {
      s.error =
        error instanceof Error
          ? error.message
          : "Read failed. Check ADC, Sheets API enablement, and Viewer sharing.";
    }
  });
}

export async function executeAction(
  body: Record<string, unknown>,
  injected?: Dependencies,
): Promise<unknown> {
  const deps = dependencies(injected);
  const { action, sourceId } = body;
  if (action === "tabs")
    return { tabs: await deps.client.tabs(sheetId(body.spreadsheetId)) };
  if (action === "refresh") {
    if (typeof sourceId !== "string") throw Error("Source ID required.");
    return refresh(sourceId, true, deps);
  }
  if (action === "prepareEmployees") {
    const registry = await deps.store.read();
    const source = findSource(registry.sources, sourceId);
    if (source.dataType !== "employees")
      throw Error("Choose an employee source.");
    const grid = await readSourceGrid(source, deps);
    const reservedIds = registry.sources.flatMap((s) => [
      ...Object.values(s.mapping.aliases),
      ...(s.data?.employees || []).map((p) => p.employeeId),
      ...s.revisions.flatMap((revision) =>
        Object.values(revision.mapping.aliases),
      ),
    ]);
    return prepareEmployeeAliases(grid, source.mapping, reservedIds);
  }
  let response: unknown;
  const registry = await deps.store.update(async (r) => {
    if (action === "add") {
      const id = sheetId(body.spreadsheetId);
      const tabs = await deps.client.tabs(id);
      if (
        !Array.isArray(body.tabIds) ||
        !body.tabIds.length ||
        new Set(body.tabIds).size !== body.tabIds.length
      )
        throw Error("Select one or more distinct tabs.");
      if (body.dataType !== "employees" && body.dataType !== "attendance" && body.dataType !== "upwork-bd")
        throw Error("Choose a supported category.");
      for (const tabId of body.tabIds) {
        const tab = tabs.find((t) => t.id === tabId);
        if (!tab) throw Error("Unknown tab.");
        allowedTab(tab.name);
        if (r.sources.some((s) => s.spreadsheetId === id && s.tabId === tab.id))
          throw Error("Tab is already registered.");
        r.sources.push({
          sourceId: randomUUID(),
          spreadsheetId: id,
          tabId: tab.id,
          tabName: tab.name,
          displayName: tab.name,
          dataType: body.dataType,
          parser: "headers-v1",
          version: 0,
          mapping: {
            ...structuredClone(defaultMapping),
            ...(body.dataType === "upwork-bd" ? { upwork: { ...structuredClone(defaultUpworkMapping), stageMap: process.env.DATA_MODE === "GOOGLE" ? {} : { ...defaultUpworkMapping.stageMap } } } : {}),
            statuses:
              process.env.DATA_MODE === "GOOGLE"
                ? {}
                : { ...defaultMapping.statuses },
          },
          revisions: [],
        });
      }
      return;
    }
    const s = findSource(r.sources, sourceId);
    if (action === "remove") {
      r.sources = r.sources.filter((x) => x.sourceId !== sourceId);
      return;
    }
    if (action === "rename") {
      if (
        typeof body.displayName !== "string" ||
        !body.displayName.trim() ||
        body.displayName.length > 100
      )
        throw Error("Display name must contain 1–100 characters.");
      if (body.dataType !== "employees" && body.dataType !== "attendance" && body.dataType !== "upwork-bd")
        throw Error("Invalid category.");
      s.displayName = body.displayName.trim();
      if (s.dataType !== body.dataType) {
        s.revisions.push({
          version: s.version,
          mapping: structuredClone(s.mapping),
          inspection: s.approved,
        });
        s.dataType = body.dataType;
        s.version = 0;
        delete s.data;
        delete s.lastRefresh;
        delete s.lastAttempt;
        delete s.approved;
        delete s.inspection;
        delete s.previewApproval;
        s.error =
          "Category changed. Inspect and publish a mapping for the new category.";
      }
      return;
    }
    if (action === "inspect") {
      delete s.previewApproval;
      try {
        const mapping = body.mapping
          ? validateMapping(body.mapping)
          : s.mapping;
        const tab = (await deps.client.tabs(s.spreadsheetId)).find(
          (t) => t.id === s.tabId,
        );
        if (!tab || tab.name !== s.tabName)
          throw Error(
            "Tab identity or name changed. Re-add the selected tab before inspecting.",
          );
        const grid = await readSourceGrid(s, deps, mapping);
        const snapshot = inspect(grid, mapping);
        snapshot.nameFormatting = await readNameFormatting(
          grid,
          s,
          mapping,
          deps,
        );
        snapshot.metadata = tab;
        s.inspection = snapshot;
        delete s.inspectionError;
      } catch (e) {
        s.inspectionError =
          e instanceof Error ? e.message : "Inspection failed.";
        response = { error: s.inspectionError };
      }
      return;
    }
    if (action === "preview" || action === "publish") {
      if (!s.inspection || s.inspectionError)
        throw Error("Run a successful inspection first.");
      if (body.inspectedAt && s.inspection.at !== body.inspectedAt)
        throw Error("Inspection changed. Inspect and preview again.");
      const mapping = validateMapping(body.mapping);
      const grid = await readSourceGrid(s, deps, mapping);
      const nameFormatting = await readNameFormatting(grid, s, mapping, deps);
      const current = inspect(grid, mapping);
      const prior = {
        headers: s.inspection.headers,
        months: s.inspection.months,
      };
      if (
        JSON.stringify(prior) !==
        JSON.stringify({ headers: current.headers, months: current.months })
      )
        throw Error(
          "Detected structure changed. Inspect with this draft mapping and preview again.",
        );
      if (current.warnings.length) throw Error(current.warnings.join("; "));
      const profileLinkCells = await readProfileLinks(grid, s, mapping, deps);
      const result = parsed(
        grid,
        s,
        r,
        mapping,
        nameFormatting,
        profileLinkCells,
      );
      const digest = previewDigest(
        s,
        r,
        mapping,
        grid,
        nameFormatting,
        profileLinkCells,
      );
      if (action === "preview") {
        s.previewApproval = result.warnings.length
          ? undefined
          : { digest, inspectedAt: s.inspection.at };
        response = result;
        return;
      }
      if (
        !s.previewApproval ||
        s.previewApproval.digest !== digest ||
        s.previewApproval.inspectedAt !== s.inspection.at
      )
        throw Error(
          "Mapping, source values or employee identity context changed. Preview this exact mapping before publishing.",
        );
      if (result.warnings.length) throw Error(result.warnings.join("; "));
      s.revisions.push({
        version: s.version,
        mapping: structuredClone(s.mapping),
        inspection: s.approved,
      });
      s.mapping = mapping;
      s.version++;
      s.approved = s.inspection;
      s.lastAttempt = new Date(0).toISOString();
      delete s.previewApproval;
      return;
    }
    throw Error("Unknown action.");
  });
  return response || registry;
}
