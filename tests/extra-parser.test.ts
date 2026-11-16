import { test } from "node:test";
import assert from "node:assert/strict";
import { inspect, parse } from "../lib/parser";
import { defaultMapping } from "../lib/domain";
import { leaveUsage } from "../lib/attendance";

test("text attendance excludes summaries, preserves times and pending cells, and exposes unresolved identities", () => {
  const people = [{employeeId: "E1", name: "Alex", departmentId: "Design", employmentStatus: "Active", source: "mock"}];
  const mapping = {...defaultMapping, attendance: {mode: "text" as const, firstRow: 3, allowances: {}}};
  const grid = [["Date", "Alex"], ["2026-01-01", "ABSENT"], ["October, 2026"], ["Date", "Alex", "Unconfirmed", ""], ["1", "LEAVE", "PRESENT", "LEGEND"], ["2", "HALF DAY"], ["3", "ABSENT"], ["4", "09:31"], ["5", ""], ["6", "Personal Laptop Issue"]];
  const result = parse(grid, "attendance", mapping, people, "mock", "2026");
  assert.equal(result.attendance.length, 6);
  assert.equal(result.attendance[0].source.row, 5);
  assert.equal(result.attendance[3].status, "09:31");
  assert.equal(result.attendance[4].status, "Pending");
  assert.equal(result.attendance[5].rawText, "Personal Laptop Issue");
  assert.equal(leaveUsage(result.attendance), 2.5);
  assert.deepEqual(result.reviews, ["Unmatched attendance name: Unconfirmed"]);
  assert.deepEqual(result.warnings, []);
  assert.throws(() => parse([["October, 2026"], ["Date", "Alex"], ["32", "LEAVE"]], "attendance", {...mapping, attendance: {...mapping.attendance, firstRow: 1}}, people, "mock", "2026"), /Invalid attendance date/);
});

test("employee sheets without IDs require an explicit alias, never a generated identity", () => {
  const grid = [
    ["Person", "Department"],
    ["Alex Smith", "Design"],
  ];
  const mapping = {
    ...defaultMapping,
    id: "",
    name: "Person",
    aliases: { "Alex Smith": "EMP-99" },
  };
  const result = parse(grid, "employees", mapping, [], "mock", "People");
  assert.equal(result.employees[0].employeeId, "EMP-99");
  assert.equal(result.warnings.length, 0);
  const unresolved = parse(
    grid,
    "employees",
    { ...mapping, aliases: {} },
    [],
    "mock",
    "People",
  );
  assert.equal(unresolved.employees.length, 0);
  assert.match(unresolved.warnings[0], /explicit alias/);
});
test("month sections without recognizable headers cannot silently disappear", () => {
  const grid = [
    ["October 2026"],
    ["Day", "EMP-1"],
    ["2026-10-01", "P"],
    ["September 2026"],
    ["Date", "EMP-1"],
    ["2026-09-01", "P"],
  ];
  const snapshot = inspect(grid);
  assert.equal(snapshot.sections?.[0].confidence, "review");
  assert.match(snapshot.warnings[0], /October/);
});
test("unlabeled attendance columns and duplicate month anchors require review", () => {
  assert.match(
    inspect([
      ["October 2026"],
      ["Date", "EMP-1"],
      ["October 2026"],
      ["Date", "EMP-1"],
    ]).warnings[0],
    /Duplicate/,
  );
  const people = [
    {
      employeeId: "EMP-1",
      name: "Alex",
      departmentId: "Design",
      employmentStatus: "Active",
      source: "mock",
    },
  ];
  const result = parse(
    [
      ["Date", "EMP-1"],
      ["2026-10-01", "P", "P"],
    ],
    "attendance",
    defaultMapping,
    people,
    "mock",
    "Attendance",
  );
  assert.match(result.warnings[0], /unlabeled/);
});

import { nameCellFormat } from "../lib/formatting";

test("name formatting recognizes whole-cell, rich-text and inherited strikethrough", () => {
  assert.equal(
    nameCellFormat({
      formattedValue: "Alex",
      effectiveFormat: { textFormat: { strikethrough: true } },
    }).strike,
    "full",
  );
  assert.equal(
    nameCellFormat({
      formattedValue: "Alex",
      textFormatRuns: [{ startIndex: 0, format: { strikethrough: true } }],
    }).strike,
    "full",
  );
  assert.equal(
    nameCellFormat({
      formattedValue: "Alex",
      textFormatRuns: [
        { startIndex: 0, format: { strikethrough: true } },
        { startIndex: 2, format: { strikethrough: false } },
      ],
    }).strike,
    "partial",
  );
  assert.equal(
    nameCellFormat({
      formattedValue: "Alex",
      effectiveFormat: { textFormat: { strikethrough: true } },
      textFormatRuns: [{ startIndex: 0, format: {} }],
    }).strike,
    "full",
  );
  assert.equal(
    nameCellFormat({
      formattedValue: "Alex",
      textFormatRuns: [{ startIndex: 0, format: {} }],
    }).strike,
    "none",
  );
  assert.equal(
    nameCellFormat({
      formattedValue: " Alex ",
      textFormatRuns: [
        { startIndex: 1, format: { strikethrough: true } },
        { startIndex: 5, format: { strikethrough: false } },
      ],
    }).strike,
    "full",
  );
});

test("approved strikethrough rule marks Left while retaining identity and historical attendance", () => {
  const grid = [
    ["Employee ID", "Name", "Department", "Status"],
    ["EMP-1", "Alex", "Design", "Active"],
    ["EMP-2", "Sam", "Operations", "Permanent"],
  ];
  const mapping = { ...defaultMapping, nameStrikethroughMeansLeft: true };
  const formats = {
    2: { value: "Alex", strike: "full" as const },
    3: { value: "Sam", strike: "none" as const },
  };
  const employees = parse(
    grid,
    "employees",
    mapping,
    [],
    "mock",
    "People",
    formats,
  ).employees;
  assert.equal(employees[0].employmentStatus, "Left");
  assert.equal(employees[0].employeeId, "EMP-1");
  assert.equal(employees[0].employmentStatusSource, "name-strikethrough");
  assert.equal(employees[1].employmentStatus, "Permanent");
  assert.equal(
    parse(grid, "employees", defaultMapping, [], "mock", "People", formats)
      .employees[0].employmentStatus,
    "Active",
  );
  const attendance = parse(
    [
      ["Date", "Alex"],
      ["2026-10-01", "P"],
    ],
    "attendance",
    defaultMapping,
    employees,
    "mock",
    "Attendance",
  );
  assert.equal(attendance.attendance[0].employeeId, "EMP-1");
  const moved = parse(
    [[], ...grid],
    "employees",
    mapping,
    [],
    "mock",
    "People",
    { 3: formats[2], 4: formats[3] },
  );
  assert.deepEqual(
    moved.employees.map((p) => [p.employeeId, p.employmentStatus]),
    employees.map((p) => [p.employeeId, p.employmentStatus]),
  );
});

test("partial or mismatched employee-name formatting requires review instead of guessing", () => {
  const grid = [
    ["Employee ID", "Name", "Status"],
    ["EMP-1", "Alex", "Active"],
  ];
  const mapping = { ...defaultMapping, nameStrikethroughMeansLeft: true };
  const partial = parse(grid, "employees", mapping, [], "mock", "People", {
    2: { value: "Alex", strike: "partial" },
  });
  assert.match(partial.warnings[0], /Partially/);
  assert.equal(partial.employees[0].employmentStatus, "Active");
  assert.throws(
    () => parse(grid, "employees", mapping, [], "mock", "People"),
    /formatting mismatch/,
  );
  assert.throws(
    () =>
      parse(grid, "employees", mapping, [], "mock", "People", {
        2: { value: "Someone else", strike: "full" },
      }),
    /formatting mismatch/,
  );
});

import { attendanceScope, calendarDates, joiningDate, recordedHolidays, attendanceColour, attendanceDisplayStatus, arrivalCategory, sharedBankHolidays } from "../lib/attendance-view";

test("display distinguishes pre-joining and future blanks without changing source status", () => {
  const person = { employeeId: "E1", name: "Demo", departmentId: "Ops", employmentStatus: "Active", source: "demo", profile: { "Joining date": "15 October 2026" } };
  const record = { employeeId: "E1", date: "2026-10-14", status: "Pending", rawText: "", source: { spreadsheetId: "demo", tab: "Demo", row: 2, column: 2 } };
  assert.equal(attendanceScope(record, person, "2026-10-30"), "Before joining");
  assert.equal(attendanceScope({ ...record, date: "2026-10-15" }, person, "2026-10-30"), "Elapsed");
  assert.equal(attendanceScope({ ...record, date: "2026-10-31" }, person, "2026-10-30"), "Future");
  assert.equal(joiningDate({ ...person, profile: { "Joining date": "31 February 2026" } }), undefined);
  assert.equal(joiningDate({ ...person, profile: { "Joining date": "10/11/2026" } }), undefined);
  const holiday = { ...record, status: "Public Holiday", rawText: "Public Holiday" };
  assert.equal(recordedHolidays([record, holiday, holiday]).length, 1);
  assert.notEqual(attendanceColour("Approved leave"), attendanceColour("Unapproved leave"));
  assert.notEqual(attendanceColour("09:45"), attendanceColour("Pending"));
  assert.equal(attendanceColour("09:45"), attendanceColour("Late"));
});

test("calendar covers full Monday to Sunday weeks including leap days", () => {
  const dates = calendarDates("2024-02");
  assert.equal(dates.length % 7, 0);
  assert.equal(new Date(dates[0]).getUTCDay(), 1);
  assert.ok(dates.includes("2024-02-29"));
  assert.deepEqual(calendarDates("2026-13"), []);
});


test("approved weekend display applies to blank weekend cells, preserving source and explicit markings", () => {
  const person = { employeeId: "E1", name: "Demo", departmentId: "Ops", employmentStatus: "Active", source: "demo", profile: { "Joining date": "15 October 2026" } };
  const record = { employeeId: "E1", date: "2026-10-17", status: "Pending", rawText: "", source: { spreadsheetId: "demo", tab: "Demo", row: 2, column: 2 } };
  assert.equal(attendanceDisplayStatus(record, person), "Weekend");
  assert.equal(attendanceDisplayStatus({ ...record, date: "2026-10-18" }, person), "Weekend");
  assert.equal(attendanceDisplayStatus({ ...record, date: "2026-10-19" }, person), "Pending");
  assert.equal(attendanceDisplayStatus({ ...record, date: "2026-10-10" }, person), "Pending");
  for (const status of ["Leave", "Present", "Absent", "Half day", "10:20"]) assert.equal(attendanceDisplayStatus({ ...record, status }, person), status);
  assert.equal(record.status, "Pending");
});

test("approved arrival thresholds preserve exact boundaries and clock representations", () => {
  assert.equal(arrivalCategory("09:30"), "Arrival time");
  assert.equal(arrivalCategory("09:30:01"), "Late");
  assert.equal(arrivalCategory("09:31"), "Late");
  assert.equal(arrivalCategory("10:00"), "Late");
  assert.equal(arrivalCategory("10:00:01"), "Severely late");
  assert.equal(arrivalCategory("10:01"), "Severely late");
  assert.equal(arrivalCategory("9:45 AM"), "Late");
  assert.equal(arrivalCategory("1:15 PM"), "Severely late");
  assert.equal(arrivalCategory("8:45"), "Arrival time");
  assert.equal(arrivalCategory("Personal Laptop Issue"), undefined);
  assert.equal(arrivalCategory("25:10"), undefined);
  assert.equal(arrivalCategory("13:10 PM"), undefined);
  assert.notEqual(attendanceColour("10:01"), attendanceColour("09:45"));
});


test("shared bank holidays remain available when Javed is not selected and preserve explicit records", () => {
  const person = { employeeId: "E1", name: "Demo", departmentId: "Ops", employmentStatus: "Active", source: "demo", profile: { "Joining date": "1 January 2026" } };
  const javed = { ...person, employeeId: "E2", name: "Javed Iqbal" };
  const holiday = { employeeId: "E2", date: "2026-05-01", status: "Labour Day Holiday", rawText: "Labour Day Holiday", source: { spreadsheetId: "demo", tab: "Demo", row: 2, column: 2 } };
  const blank = { ...holiday, employeeId: "E1", status: "Pending", rawText: "" };
  const shared = sharedBankHolidays([holiday, blank], [person, javed]);
  assert.equal(attendanceDisplayStatus(blank, person, shared), "Labour Day Holiday");
  assert.equal(attendanceDisplayStatus({ ...blank, status: "Leave" }, person, shared), "Leave");
  assert.equal(attendanceDisplayStatus(blank, { ...person, profile: { "Joining date": "2 May 2026" } }, shared), "Pending");
  assert.equal(attendanceDisplayStatus({ ...blank, date: "2026-05-04" }, person, shared), "Pending");
  assert.equal(sharedBankHolidays([holiday], [person]).size, 0);
  assert.equal(sharedBankHolidays([holiday, { ...holiday, rawText: "Different Holiday" }], [person, javed]).size, 0);
  assert.equal(blank.status, "Pending");
});
