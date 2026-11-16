import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  defaultMapping,
  type Registry,
  type Parsed,
  type TabMetadata,
} from "../lib/domain";

async function main() {
  const workspace = process.cwd();
  const projectDir = path.resolve(
    workspace,
    process.env.SMOKE_PROJECT_DIR || ".",
  );
  assert.ok(
    projectDir === workspace ||
      (path.dirname(projectDir) === path.join(workspace, ".data") &&
        path.basename(projectDir).startsWith("employee-build-check-")),
    "Smoke project must be the workspace or its isolated build-check directory.",
  );
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;
  await new Promise<void>((resolve) => listener.close(() => resolve()));
  const namespace = "smoke-" + randomUUID();
  const base = "http://127.0.0.1:" + port;
  const server = spawn(
    process.execPath,
    [
      path.join(process.cwd(), "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: projectDir,
      windowsHide: true,
      env: {
        ...process.env,
        DATA_MODE: "DEMO",
        CONFIG_STORAGE: "local",
        REGISTRY_NAMESPACE: namespace,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let logs = "";
  server.stdout.on("data", (chunk) => {
    logs = (logs + String(chunk)).slice(-10000);
  });
  server.stderr.on("data", (chunk) => {
    logs = (logs + String(chunk)).slice(-10000);
  });
  let processError: Error | undefined;
  server.on("error", (e) => {
    processError = e;
  });
  async function call<T>(body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(
      base + "/api/dashboard",
      body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: base },
            body: JSON.stringify(body),
          }
        : undefined,
    );
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    return result as T;
  }
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (processError) throw processError;
      if (server.exitCode !== null) throw Error(logs);
      try {
        const response = await fetch(base);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, "Server did not start: " + logs);
    for (const route of [
      "/",
      "/people/employees",
      "/people/attendance",
      "/data-sources",
    ]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      assert.match(await response.text(), /Agency Command Center/);
    }
    let registry = await call<Registry>();
    assert.equal(
      registry.sources.flatMap((s) => s.data?.employees || []).length,
      6,
    );
    assert.equal(
      registry.sources.flatMap((s) => s.data?.attendance || []).length,
      90,
    );
    const tabs = await call<{ tabs: TabMetadata[] }>({
      action: "tabs",
      spreadsheetId: "synthetic-agency-demo",
    });
    assert.equal(tabs.tabs.length, 2);
    const denied = await fetch(base + "/api/dashboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://example.com",
      },
      body: JSON.stringify({
        action: "tabs",
        spreadsheetId: "synthetic-agency-demo",
      }),
    });
    assert.equal(denied.status, 400);
    const original = registry.sources.find((s) => s.dataType === "employees")!;
    await call({ action: "remove", sourceId: original.sourceId });
    await call({
      action: "add",
      spreadsheetId: "synthetic-agency-demo",
      tabIds: [1],
      dataType: "employees",
    });
    registry = await call<Registry>();
    const source = registry.sources.find((s) => s.dataType === "employees")!;
    await call({ action: "inspect", sourceId: source.sourceId });
    const testMapping = {
      ...defaultMapping,
      profileFields: { Department: "Department" },
    };
    const preview = await call<Parsed>({
      action: "preview",
      sourceId: source.sourceId,
      mapping: testMapping,
    });
    assert.equal(preview.employees.length, 6);
    assert.equal(preview.employees[0].profile?.Department, "Design");
    await call({
      action: "publish",
      sourceId: source.sourceId,
      mapping: testMapping,
    });
    await call({ action: "refresh", sourceId: source.sourceId });
    await call({
      action: "rename",
      sourceId: source.sourceId,
      displayName: "Smoke test directory",
      dataType: "employees",
    });
    registry = await call<Registry>();
    const saved = registry.sources.find((s) => s.sourceId === source.sourceId)!;
    assert.equal(saved.displayName, "Smoke test directory");
    assert.equal(saved.data?.employees.length, 6);
    assert.equal(saved.revisions.length, 1);
    assert.ok(saved.lastRefresh);
    assert.equal(saved.data?.employees[0].profile?.Department, "Design");
    const reviewed = await call<{ newEmployees: unknown[] }>({
      action: "prepareEmployees",
      sourceId: source.sourceId,
    });
    assert.equal(reviewed.newEmployees.length, 0);
    console.log(
      "HTTP smoke passed: 4 page routes, populated demo, tab selection, origin guard, add/remove, inspect, preview, publish, refresh, rename, employee profiles and new-employee draft review.",
    );
  } finally {
    const exited = once(server, "exit");
    if (server.exitCode === null) {
      server.kill();
      await Promise.race([
        exited,
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    }
    // Only remove the two exact temporary filenames created by this test.
    for (const suffix of [".json", ".json.tmp"]) {
      const file = path.join(
        projectDir,
        ".data",
        "registry-demo-" + namespace + suffix,
      );
      assert.equal(path.dirname(file), path.join(projectDir, ".data"));
      try {
        await unlink(file);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
    }
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
