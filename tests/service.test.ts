import { test } from "node:test";
import assert from "node:assert/strict";
import { refresh } from "../lib/service";
import { defaultMapping, type Registry } from "../lib/domain";
import { employees } from "../lib/demo";
import type { RegistryStore } from "../lib/store";
import type { SheetsClient } from "../lib/sheets";
test("mocked read-only adapter honors TTL, manual refresh, and last-good fallback", async () => {
  const registry: Registry = {
    sources: [
      {
        sourceId: "test",
        spreadsheetId: "mock-spreadsheet",
        tabId: 1,
        tabName: "Employees",
        displayName: "Test",
        dataType: "employees",
        parser: "headers-v1",
        version: 1,
        mapping: defaultMapping,
        revisions: [],
      },
    ],
  };
  const store: RegistryStore = {
    async read() {
      return registry;
    },
    async update(fn) {
      await fn(registry);
      return registry;
    },
  };
  let calls = 0;
  let fail = false;
  const client: SheetsClient = {
    async tabs() {
      return [{ id: 1, name: "Employees" }];
    },
    async grid() {
      calls++;
      if (fail) throw Error("Mock network outage");
      return employees;
    },
  };
  await refresh("test", false, { store, client });
  assert.equal(calls, 1);
  assert.equal(registry.sources[0].data?.employees.length, 6);
  await refresh("test", false, { store, client });
  assert.equal(calls, 1);
  const good = structuredClone(registry.sources[0].data);
  const timestamp = registry.sources[0].lastRefresh;
  fail = true;
  await refresh("test", true, { store, client });
  assert.equal(calls, 2);
  assert.match(registry.sources[0].error!, /outage/);
  assert.deepEqual(registry.sources[0].data, good);
  assert.equal(registry.sources[0].lastRefresh, timestamp);
  fail = false;
  await refresh("test", true, { store, client });
  assert.equal(calls, 3);
  assert.equal(registry.sources[0].error, undefined);
});

test("replaced tabs with the same name cannot bypass the registered tab ID", async () => {
  const registry: Registry = {
    sources: [
      {
        sourceId: "identity",
        spreadsheetId: "mock-spreadsheet",
        tabId: 1,
        tabName: "Employees",
        displayName: "Identity test",
        dataType: "employees",
        parser: "headers-v1",
        version: 1,
        mapping: defaultMapping,
        revisions: [],
      },
    ],
  };
  let valueReads = 0;
  const store: RegistryStore = {
    async read() {
      return registry;
    },
    async update(fn) {
      await fn(registry);
      return registry;
    },
  };
  const client: SheetsClient = {
    async tabs() {
      return [{ id: 999, name: "Employees" }];
    },
    async grid() {
      valueReads++;
      return employees;
    },
  };
  await refresh("identity", true, { store, client });
  assert.equal(valueReads, 0);
  assert.match(registry.sources[0].error!, /identity/);
});
