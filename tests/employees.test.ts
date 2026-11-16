import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../lib/parser";
import { defaultMapping } from "../lib/domain";
import { validateMapping } from "../lib/service";
import { prepareEmployeeAliases, safeWebUrl } from "../lib/employees";

test("employee profiles retain all explicitly mapped non-financial fields and links", () => {
  const grid = [
    [
      "Employee ID",
      "Name",
      "Department",
      "Contact Number",
      "CNIC",
      "CV",
      "Bank Account",
    ],
    ["EMP-1", "Alex", "Design", "012345", "12345", "Resume", "excluded"],
  ];
  const mapping = {
    ...defaultMapping,
    profileFields: {
      "Contact number": "Contact Number",
      CNIC: "CNIC",
      CV: "CV",
    },
  };
  const result = parse(
    grid,
    "employees",
    mapping,
    [],
    "mock",
    "People",
    undefined,
    { "2:5": { value: "Resume", urls: ["https://example.com/cv"] } },
  );
  assert.deepEqual(result.employees[0].profile, {
    "Contact number": "012345",
    CNIC: "12345",
    CV: "Resume",
  });
  assert.deepEqual(result.employees[0].profileLinks, {
    CV: ["https://example.com/cv"],
  });
  assert.equal(JSON.stringify(result.employees).includes("excluded"), false);
  assert.equal(result.warnings.length, 0);
});
test("profile mapping rejects financial fields and detects removed columns or changed linked values", () => {
  const grid = [
    ["Employee ID", "Name", "CV"],
    ["EMP-1", "Alex", "Resume"],
  ];
  assert.throws(
    () =>
      validateMapping({
        ...defaultMapping,
        profileFields: { Bank: "Bank Account" },
      }),
    /excluded/,
  );
  assert.throws(
    () =>
      parse(
        grid,
        "employees",
        { ...defaultMapping, profileFields: { Bank: "IBAN" } },
        [],
        "mock",
        "People",
      ),
    /Excluded/,
  );
  assert.throws(
    () =>
      parse(
        grid,
        "employees",
        { ...defaultMapping, profileFields: { Phone: "Contact Number" } },
        [],
        "mock",
        "People",
      ),
    /not found/,
  );
  assert.throws(
    () =>
      parse(
        grid,
        "employees",
        { ...defaultMapping, profileFields: { CV: "CV" } },
        [],
        "mock",
        "People",
        undefined,
        { "2:2": { value: "Old resume", urls: ["https://example.com"] } },
      ),
    /mismatch/,
  );
});
test("profile links allow web URLs and reject executable or local schemes", () => {
  assert.equal(safeWebUrl("https://example.com/cv"), "https://example.com/cv");
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///C:/key.json",
    "/relative",
  ])
    assert.equal(safeWebUrl(value), undefined);
});
test("new employee IDs are drafts that preserve old aliases and skip reserved IDs", () => {
  const mapping = {
    ...defaultMapping,
    id: "",
    aliases: { Alex: "EMP-0001", Former: "EMP-0002" },
  };
  const result = prepareEmployeeAliases(
    [["Name"], ["Alex"], ["Sam"]],
    mapping,
    ["EMP-0003"],
  );
  assert.deepEqual(result.newEmployees, [
    { name: "Sam", employeeId: "EMP-0004" },
  ]);
  assert.equal(result.mapping.aliases.Alex, "EMP-0001");
  assert.equal(result.mapping.aliases.Former, "EMP-0002");
  assert.equal(mapping.aliases.Alex, "EMP-0001");
  assert.equal(Object.hasOwn(mapping.aliases, "Sam"), false);
});
test("duplicate and incomplete names cannot receive silently generated IDs", () => {
  const mapping = { ...defaultMapping, id: "" };
  assert.throws(
    () => prepareEmployeeAliases([["Name"], ["Alex"], [" alex "]], mapping, []),
    /Duplicate/,
  );
  assert.throws(
    () =>
      prepareEmployeeAliases(
        [
          ["Name", "Department"],
          ["", "Design"],
        ],
        mapping,
        [],
      ),
    /no name/,
  );
});
