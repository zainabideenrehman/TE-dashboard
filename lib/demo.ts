import type { Grid } from "./domain";
export const demoId = "synthetic-agency-demo";
export const demoTabs = [
  { id: 1, name: "Employees" },
  { id: 2, name: "Attendance" },
];
export const employees: Grid = [
  ["SYNTHETIC DEMO — no real employee data"],
  ["Employee ID", "Name", "Email", "Department", "Status"],
  ...[
    "Ayesha Khan",
    "Omar Ahmed",
    "Sara Malik",
    "Bilal Ali",
    "Noor Fatima",
    "Hamza Shah",
  ].map((name, i) => [
    `EMP-${i + 1}`,
    name,
    `person${i + 1}@example.com`,
    ["Design", "Engineering", "Operations"][i % 3],
    "Active",
  ]),
];
export const attendance: Grid = [
  ["October 2026"],
  ["Date", "EMP-3", "EMP-1", "EMP-6", "EMP-2", "EMP-5", "EMP-4"],
  ...Array.from({ length: 10 }, (_, i) => [
    `2026-10-${String(i + 1).padStart(2, "0")}`,
    ...[3, 1, 6, 2, 5, 4].map((n) =>
      (i + n) % 7 === 0 ? "L" : (i + n) % 9 === 0 ? "A" : "P",
    ),
  ]),
  ["September 2026"],
  ["Date", "EMP-1", "EMP-2", "EMP-3", "EMP-4", "EMP-5", "EMP-6"],
  ...Array.from({ length: 5 }, (_, i) => [
    `2026-09-${String(i + 1).padStart(2, "0")}`,
    "P",
    "P",
    "L",
    "P",
    "P",
    "A",
  ]),
];
