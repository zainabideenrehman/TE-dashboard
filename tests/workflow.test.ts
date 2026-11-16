import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { executeAction, refresh, type Dependencies } from "../lib/service";
import { LocalRegistryStore } from "../lib/store";
import {
  client,
  createGoogleClient,
  sheetId,
  type GoogleReadApi,
} from "../lib/sheets";
import { defaultMapping, type Registry, type Parsed } from "../lib/domain";
import { employees, demoId } from "../lib/demo";

test("text attendance publishes partial identity coverage, bounds reads and retains last-good on invalid dates", async () => {
  let registry: Registry = {sources:[{
    sourceId:"people", spreadsheetId:"mock", tabId:1, tabName:"People", displayName:"People", dataType:"employees", parser:"headers-v1", version:1, mapping:defaultMapping, revisions:[],
    data:{employees:[{employeeId:"E1",name:"Alex",departmentId:"Design",employmentStatus:"Active",source:"mock"}],attendance:[],warnings:[]},
  }, {sourceId:"attendance",spreadsheetId:"mock",tabId:2,tabName:"2026",displayName:"Attendance",dataType:"attendance",parser:"headers-v1",version:0,mapping:defaultMapping,revisions:[]}]};
  let invalid = false;
  const deps: Dependencies = {
    store:{async read(){return structuredClone(registry);},async update(fn){const next=structuredClone(registry);await fn(next);registry=next;return next;}},
    client:{async tabs(){return [{id:2,name:"2026"}];}, async grid(_id,_tab,firstRow){assert.equal(firstRow,28);return [...Array.from({length:27},()=>[]),["October, 2026"],["Date","Alex","Unconfirmed"],[invalid?"32":"1","LEAVE","PRESENT"]];}},
  };
  const mapping={...defaultMapping,attendance:{mode:"text" as const,firstRow:28,allowances:{E1:{year:2026,days:15}}}};
  await executeAction({action:"inspect",sourceId:"attendance",mapping},deps);
  const preview=await executeAction({action:"preview",sourceId:"attendance",mapping},deps) as Parsed;
  assert.equal(preview.attendance[0].source.row,30);
  assert.equal(preview.reviews?.length,1);
  assert.equal(preview.warnings.length,0);
  await executeAction({action:"publish",sourceId:"attendance",mapping},deps);
  await refresh("attendance",true,deps);
  const before=structuredClone(registry.sources[1].data);
  invalid=true;
  await refresh("attendance",true,deps);
  assert.match(registry.sources[1].error||"",/Invalid attendance date/);
  assert.deepEqual(registry.sources[1].data,before);
});

function memory(): Dependencies & { registry: () => Registry } {
  let registry: Registry = { sources: [] };
  return {
    registry: () => registry,
    store: {
      async read() {
        return structuredClone(registry);
      },
      async update(fn) {
        const next = structuredClone(registry);
        await fn(next);
        registry = next;
        return next;
      },
    },
    client: client(),
  };
}
test("add, inspect, preview, publish, refresh, rename, recategorize and remove", async () => {
  const deps = memory();
  await executeAction(
    {
      action: "add",
      spreadsheetId: demoId,
      tabIds: [1],
      dataType: "employees",
    },
    deps,
  );
  const id = deps.registry().sources[0].sourceId;
  assert.equal(deps.registry().sources[0].version, 0);
  await assert.rejects(
    executeAction(
      { action: "publish", sourceId: id, mapping: defaultMapping },
      deps,
    ),
    /inspection/,
  );
  await executeAction({ action: "inspect", sourceId: id }, deps);
  await assert.rejects(
    executeAction(
      { action: "publish", sourceId: id, mapping: defaultMapping },
      deps,
    ),
    /Preview/,
  );
  const preview = (await executeAction(
    { action: "preview", sourceId: id, mapping: defaultMapping },
    deps,
  )) as Parsed;
  assert.equal(preview.employees.length, 6);
  await assert.rejects(
    executeAction(
      {
        action: "publish",
        sourceId: id,
        mapping: { ...defaultMapping, statuses: { P: "Changed" } },
      },
      deps,
    ),
    /Preview/,
  );
  await executeAction(
    { action: "publish", sourceId: id, mapping: defaultMapping },
    deps,
  );
  await refresh(id, true, deps);
  assert.equal(deps.registry().sources[0].data?.employees.length, 6);
  assert.equal(deps.registry().sources[0].revisions[0].version, 0);
  await executeAction(
    {
      action: "rename",
      sourceId: id,
      displayName: "Team directory",
      dataType: "employees",
    },
    deps,
  );
  assert.equal(deps.registry().sources[0].displayName, "Team directory");
  await executeAction(
    {
      action: "add",
      spreadsheetId: demoId,
      tabIds: [2],
      dataType: "attendance",
    },
    deps,
  );
  const attendanceId = deps.registry().sources[1].sourceId;
  for (const action of ["inspect", "preview", "publish"])
    await executeAction(
      { action, sourceId: attendanceId, mapping: defaultMapping },
      deps,
    );
  await refresh(attendanceId, true, deps);
  assert.equal(deps.registry().sources[1].data?.attendance.length, 90);
  await executeAction(
    {
      action: "rename",
      sourceId: attendanceId,
      displayName: "Reclassified",
      dataType: "employees",
    },
    deps,
  );
  assert.equal(deps.registry().sources[1].version, 0);
  assert.equal(deps.registry().sources[1].data, undefined);
  await executeAction({ action: "remove", sourceId: attendanceId }, deps);
  assert.equal(deps.registry().sources.length, 1);
});
test("inspection failure preserves approved mapping, snapshot and last-good records", async () => {
  const deps = memory();
  await executeAction(
    {
      action: "add",
      spreadsheetId: demoId,
      tabIds: [1],
      dataType: "employees",
    },
    deps,
  );
  const id = deps.registry().sources[0].sourceId;
  for (const action of ["inspect", "preview", "publish"])
    await executeAction(
      { action, sourceId: id, mapping: defaultMapping },
      deps,
    );
  await refresh(id, true, deps);
  const before = structuredClone(deps.registry().sources[0]);
  deps.client = {
    async tabs() {
      throw Error("Mock inspection outage");
    },
    async grid() {
      throw Error("Mock read outage");
    },
  };
  const failed = (await executeAction(
    { action: "inspect", sourceId: id },
    deps,
  )) as { error: string };
  assert.match(failed.error, /outage/);
  const after = deps.registry().sources[0];
  assert.deepEqual(after.approved, before.approved);
  assert.deepEqual(after.inspection, before.inspection);
  assert.deepEqual(after.mapping, before.mapping);
  assert.deepEqual(after.data, before.data);
});
test("preview receipt covers values beyond the raw-grid sample", async () => {
  const deps = memory();
  let changed = false;
  deps.client = {
    async tabs() {
      return [{ id: 1, name: "Employees" }];
    },
    async grid() {
      return [
        ...employees,
        ...Array.from({ length: 40 }, (_, i) => [
          "EXTRA-" + i,
          "Person " + i,
          "",
          "Design",
          "Active",
        ]),
        ["LAST", changed ? "Changed" : "Original", "", "Design", "Active"],
      ];
    },
  };
  await executeAction(
    {
      action: "add",
      spreadsheetId: demoId,
      tabIds: [1],
      dataType: "employees",
    },
    deps,
  );
  const id = deps.registry().sources[0].sourceId;
  for (const action of ["inspect", "preview"])
    await executeAction(
      { action, sourceId: id, mapping: defaultMapping },
      deps,
    );
  changed = true;
  await assert.rejects(
    executeAction(
      { action: "publish", sourceId: id, mapping: defaultMapping },
      deps,
    ),
    /Preview/,
  );
});
test("local registry persists across instances, serializes updates and rolls back failures", async () => {
  const dir = await mkdtemp(path.join(process.cwd(), ".data-test-"));
  try {
    const file = path.join(dir, "registry.json");
    const first = new LocalRegistryStore(file);
    await first.update((r) => {
      r.sources = [];
    });
    await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        first.update((r) => {
          r.sources.push({
            sourceId: String(i),
          } as Registry["sources"][number]);
        }),
      ),
    );
    assert.equal((await new LocalRegistryStore(file).read()).sources.length, 4);
    await assert.rejects(
      first.update((r) => {
        r.sources = [];
        throw Error("Abort");
      }),
      /Abort/,
    );
    assert.equal((await first.read()).sources.length, 4);
  } finally {
    assert.ok(
      path
        .resolve(dir)
        .startsWith(path.resolve(process.cwd()) + path.sep + ".data-test-"),
    );
    await rm(dir, { recursive: true, force: true });
  }
});
test("mock Google adapter only reads approved tab metadata and bounded values", async () => {
  let reads = 0;
  const api: GoogleReadApi = {
    spreadsheets: {
      async get(params) {
        assert.ok(!params.fields.includes("rowData"));
        return {
          data: {
            sheets: [
              {
                properties: {
                  sheetId: 0,
                  title: "Employees",
                  sheetType: "GRID",
                  gridProperties: { rowCount: 100, columnCount: 8 },
                },
              },
              {
                properties: {
                  sheetId: 1,
                  title: "Credentials",
                  sheetType: "GRID",
                },
              },
            ],
          },
        };
      },
      values: {
        async get(params) {
          reads++;
          assert.equal(params.range, "'Employees'!A1:AZ3000");
          assert.equal(params.valueRenderOption, "FORMATTED_VALUE");
          return { data: { values: employees } };
        },
      },
    },
  };
  const google = createGoogleClient(async () => api);
  assert.equal((await google.tabs("mock")).length, 1);
  await assert.rejects(google.grid("mock", "Credentials"), /excluded/);
  assert.equal(reads, 0);
  assert.deepEqual(await google.grid("mock", "Employees"), employees);
  assert.equal(reads, 1);
  assert.equal(
    sheetId(
      "https://docs.google.com/spreadsheets/d/mock-spreadsheet/edit#gid=0",
    ),
    "mock-spreadsheet",
  );
  assert.throws(() => sheetId("https://example.com/not-a-sheet"), /Enter/);
});
test("Google access failures explain ADC/sharing and do not read values", async () => {
  const api: GoogleReadApi = {
    spreadsheets: {
      async get() {
        throw { response: { status: 403 } };
      },
      values: {
        async get() {
          throw Error("must not read");
        },
      },
    },
  };
  await assert.rejects(
    createGoogleClient(async () => api).tabs("mock"),
    /Viewer/,
  );
});

test("Google name-format reads are bounded to the selected name column and exclude other tabs", async () => {
  let formatReads = 0;
  const api: GoogleReadApi = {
    spreadsheets: {
      async get(params) {
        if (params.ranges) {
          formatReads++;
          assert.deepEqual(params.ranges, ["'Employees'!B1:B3000"]);
          assert.ok(
            params.fields.includes("effectiveFormat/textFormat/strikethrough"),
          );
          return {
            data: {
              sheets: [
                {
                  properties: { sheetId: 1, title: "Employees" },
                  data: [
                    {
                      startRow: 1,
                      startColumn: 1,
                      rowData: [
                        {
                          values: [
                            {
                              formattedValue: "Alex",
                              effectiveFormat: {
                                textFormat: { strikethrough: true },
                              },
                            },
                          ],
                        },
                        { values: [{ formattedValue: "Sam" }] },
                      ],
                    },
                  ],
                },
              ],
            },
          };
        }
        return {
          data: {
            sheets: [
              {
                properties: {
                  sheetId: 1,
                  title: "Employees",
                  sheetType: "GRID",
                  gridProperties: { rowCount: 100, columnCount: 8 },
                },
              },
            ],
          },
        };
      },
      values: {
        async get() {
          throw Error("Format read must not fetch unrelated values");
        },
      },
    },
  };
  const google = createGoogleClient(async () => api);
  const formats = await google.nameFormatting!("mock", "Employees", 1);
  assert.deepEqual(formats, {
    2: { value: "Alex", strike: "full" },
    3: { value: "Sam", strike: "none" },
  });
  await assert.rejects(
    google.nameFormatting!("mock", "Credentials", 1),
    /excluded/,
  );
  await assert.rejects(
    google.nameFormatting!("mock", "Employees", 52),
    /bounds/,
  );
  assert.equal(formatReads, 1);
});

test("format-only changes invalidate the preview receipt and failed formatting retains last-good data", async () => {
  const deps = memory();
  let struck = false;
  let outage = false;
  deps.client.nameFormatting = async (_id, _tab, column) => {
    if (outage) throw Error("Formatting read failed");
    return Object.fromEntries(
      employees.flatMap((r, i) =>
        r[column]
          ? [
              [
                i + 1,
                {
                  value: r[column],
                  strike: struck && i === 2 ? "full" : "none",
                },
              ],
            ]
          : [],
      ),
    );
  };
  await executeAction(
    {
      action: "add",
      spreadsheetId: demoId,
      tabIds: [1],
      dataType: "employees",
    },
    deps,
  );
  const id = deps.registry().sources[0].sourceId;
  const mapping = { ...defaultMapping, nameStrikethroughMeansLeft: true };
  for (const action of ["inspect", "preview"])
    await executeAction({ action, sourceId: id, mapping }, deps);
  struck = true;
  await assert.rejects(
    executeAction({ action: "publish", sourceId: id, mapping }, deps),
    /Preview/,
  );
  await executeAction({ action: "preview", sourceId: id, mapping }, deps);
  await executeAction({ action: "publish", sourceId: id, mapping }, deps);
  await refresh(id, true, deps);
  assert.equal(
    deps.registry().sources[0].data?.employees[0].employmentStatus,
    "Left",
  );
  const good = structuredClone(deps.registry().sources[0].data);
  outage = true;
  await refresh(id, true, deps);
  assert.deepEqual(deps.registry().sources[0].data, good);
  assert.match(deps.registry().sources[0].error!, /Formatting read failed/);
});

test("new employee additions require ID preview and publication, retaining the last-good directory", async () => {
  const deps = memory();
  let grid = structuredClone(employees);
  deps.client.grid = async () => grid;
  await executeAction(
    {
      action: "add",
      spreadsheetId: demoId,
      tabIds: [1],
      dataType: "employees",
    },
    deps,
  );
  const id = deps.registry().sources[0].sourceId;
  const mapping = {
    ...defaultMapping,
    id: "",
    aliases: Object.fromEntries(employees.slice(2).map((r) => [r[1], r[0]])),
  };
  for (const action of ["inspect", "preview", "publish"])
    await executeAction({ action, sourceId: id, mapping }, deps);
  await refresh(id, true, deps);
  const previousIds = deps
    .registry()
    .sources[0].data!.employees.map((p) => p.employeeId);
  grid = [...grid, ["", "New Joiner", "new@example.com", "Design", "Active"]];
  await refresh(id, true, deps);
  assert.equal(deps.registry().sources[0].data?.employees.length, 6);
  assert.match(deps.registry().sources[0].error!, /stable ID/);
  const prepared = (await executeAction(
    { action: "prepareEmployees", sourceId: id },
    deps,
  )) as {
    mapping: typeof mapping;
    newEmployees: { name: string; employeeId: string }[];
  };
  assert.equal(prepared.newEmployees.length, 1);
  assert.equal(prepared.newEmployees[0].name, "New Joiner");
  assert.equal(
    Object.hasOwn(deps.registry().sources[0].mapping.aliases, "New Joiner"),
    false,
  );
  assert.equal(deps.registry().sources[0].data?.employees.length, 6);
  for (const action of ["inspect", "preview", "publish"])
    await executeAction(
      { action, sourceId: id, mapping: prepared.mapping },
      deps,
    );
  await refresh(id, true, deps);
  assert.equal(deps.registry().sources[0].data?.employees.length, 7);
  assert.deepEqual(
    deps
      .registry()
      .sources[0].data!.employees.slice(0, 6)
      .map((p) => p.employeeId),
    previousIds,
  );
});

test("Google profile links read only selected columns and filter unsafe links", async () => {
  let reads = 0;
  const api: GoogleReadApi = {
    spreadsheets: {
      async get(params) {
        if (params.ranges) {
          reads++;
          assert.deepEqual(params.ranges, ["'Employees'!F1:F3000"]);
          return {
            data: {
              sheets: [
                {
                  properties: { sheetId: 1, title: "Employees" },
                  data: [
                    {
                      startRow: 1,
                      startColumn: 5,
                      rowData: [
                        {
                          values: [
                            {
                              formattedValue: "Resume",
                              hyperlink: "https://example.com/cv",
                            },
                          ],
                        },
                        {
                          values: [
                            {
                              formattedValue: "Unsafe",
                              hyperlink: "javascript:alert(1)",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          };
        }
        return {
          data: {
            sheets: [
              {
                properties: {
                  sheetId: 1,
                  title: "Employees",
                  sheetType: "GRID",
                  gridProperties: { rowCount: 100, columnCount: 8 },
                },
              },
            ],
          },
        };
      },
      values: {
        async get() {
          throw Error("Unexpected value read");
        },
      },
    },
  };
  const google = createGoogleClient(async () => api);
  assert.deepEqual(await google.profileLinks!("mock", "Employees", [5]), {
    "2:5": { value: "Resume", urls: ["https://example.com/cv"] },
  });
  await assert.rejects(
    google.profileLinks!("mock", "Credentials", [5]),
    /excluded/,
  );
  assert.equal(reads, 1);
});
