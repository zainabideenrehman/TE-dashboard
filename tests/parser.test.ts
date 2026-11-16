import { test } from "node:test";
import assert from "node:assert/strict";
import { inspect, parse, structureDiff } from "../lib/parser";
import { defaultMapping } from "../lib/domain";
import { employees, attendance } from "../lib/demo";
const people = parse(
  employees,
  "employees",
  defaultMapping,
  [],
  "demo",
  "Employees",
).employees;

test("comma month anchors and day numbers survive inserted months and reordered employees", () => {
  const old = [["September, 2026"], ["Date", "EMP-1", "EMP-2"], ["30", "P", "A"]];
  const grid = [
    ["Leave balance summary"],
    ["1", "P"],
    ["October, 2026"],
    ["Date", "EMP-2", "EMP-1"],
    ["1", "L", "P"],
    ...old,
  ];
  const read = (rows: string[][]) => parse(rows, "attendance", defaultMapping, people, "mock", "Attendance");
  const before = read(old);
  const after = read(grid);
  assert.deepEqual(
    after.attendance.filter((a) => a.date.startsWith("2026-09")).map(({ employeeId, date, status }) => ({ employeeId, date, status })),
    before.attendance.map(({ employeeId, date, status }) => ({ employeeId, date, status })),
  );
  assert.equal(after.attendance.length, 4);
  assert.equal(after.attendance[0].employeeId, "EMP-2");
  assert.deepEqual(after.attendance[0].source, { spreadsheetId: "mock", tab: "Attendance", row: 5, column: 2 });
  assert.equal(inspect(grid).sections?.length, 2);
});

test("day numbers require an anchor and must be valid for its month", () => {
  for (const grid of [
    [["Date", "EMP-1"], ["1", "P"]],
    [["February, 2026"], ["Date", "EMP-1"], ["29", "P"]],
    [["April, 2026"], ["Date", "EMP-1"], ["31", "P"]],
    [["April, 2026"], ["Date", "EMP-1"], ["0", "P"]],
  ]) {
    const result = parse(grid, "attendance", defaultMapping, people, "mock", "Attendance");
    assert.equal(result.attendance.length, 0);
    assert.ok(result.warnings.some((w) => w.includes("Invalid date")));
  }
  assert.ok(inspect([["October 2026"], ["October, 2026"]]).warnings.some((w) => w.includes("Duplicate month")));
});
test("synthetic directory has stable IDs and departments", () => {
  assert.equal(people.length, 6);
  assert.equal(new Set(people.map((p) => p.employeeId)).size, 6);
});
test("new month at top preserves historical records despite reordered columns", () => {
  const split = attendance.findIndex((r) => r[0] === "September 2026");
  const old = attendance.slice(split);
  const before = parse(
    old,
    "attendance",
    defaultMapping,
    people,
    "demo",
    "Attendance",
  );
  const after = parse(
    attendance,
    "attendance",
    defaultMapping,
    people,
    "demo",
    "Attendance",
  );
  assert.deepEqual(
    after.attendance
      .filter((a) => a.date.startsWith("2026-09"))
      .map(({ employeeId, date, status }) => ({ employeeId, date, status })),
    before.attendance.map(({ employeeId, date, status }) => ({
      employeeId,
      date,
      status,
    })),
  );
  assert.equal(
    after.attendance.find(
      (a) => a.date === "2026-10-01" && a.employeeId === "EMP-3",
    )?.source.column,
    2,
  );
  assert.ok(
    structureDiff(inspect(old), inspect(attendance)).some((s) =>
      s.includes("moved"),
    ),
  );
});
test("ambiguous names require aliases", () => {
  const ambiguous = [...people, { ...people[0], employeeId: "OTHER" }];
  const grid = [
    ["Date", people[0].name],
    ["2026-10-01", "P"],
  ];
  const result = parse(
    grid,
    "attendance",
    defaultMapping,
    ambiguous,
    "demo",
    "Attendance",
  );
  assert.equal(result.attendance.length, 0);
  assert.match(result.warnings[0], /Ambiguous/);
  const mapped = parse(
    grid,
    "attendance",
    { ...defaultMapping, aliases: { [people[0].name]: "EMP-1" } },
    ambiguous,
    "demo",
    "Attendance",
  );
  assert.equal(mapped.attendance[0].employeeId, "EMP-1");
});
test("unknown statuses are flagged instead of invented", () => {
  const r = parse(
    [
      ["Date", "EMP-1"],
      ["2026-10-01", "X"],
    ],
    "attendance",
    defaultMapping,
    people,
    "demo",
    "Attendance",
  );
  assert.equal(r.attendance.length, 0);
  assert.match(r.warnings[0], /Unmapped/);
});
test("duplicate employee IDs and attendance fail closed", () => {
  assert.throws(
    () =>
      parse(
        [...employees, employees[2]],
        "employees",
        defaultMapping,
        [],
        "demo",
        "Employees",
      ),
    /Duplicate/,
  );
  assert.throws(
    () =>
      parse(
        [
          ["Date", "EMP-1"],
          ["2026-10-01", "P"],
          ["2026-10-01", "A"],
        ],
        "attendance",
        defaultMapping,
        people,
        "demo",
        "Attendance",
      ),
    /Duplicate/,
  );
});
test("month boundaries and invalid dates require review", () => {
  assert.throws(
    () =>
      parse(
        [["September 2026"], ["Date", "EMP-1"], ["2026-10-01", "P"]],
        "attendance",
        defaultMapping,
        people,
        "demo",
        "Attendance",
      ),
    /outside month/,
  );
  assert.equal(
    parse(
      [
        ["Date", "EMP-1"],
        ["2026-02-31", "P"],
      ],
      "attendance",
      defaultMapping,
      people,
      "demo",
      "Attendance",
    ).warnings.length,
    1,
  );
});
