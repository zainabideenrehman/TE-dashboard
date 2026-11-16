import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { createReviewServer } from "../scripts/hr-review-proxy.mjs";

test("HR gateway blocks management/writes and strips private registry configuration", async () => {
  const received = [];
  const upstream = http.createServer((req, res) => {
    received.push({ url: req.url, method: req.method, headers: req.headers });
    if (req.url.startsWith("/api/dashboard")) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ mode: "DEMO", sources: [{ sourceId: "private-bd", dataType: "upwork-bd", data: { upwork: [{ title: "Private BD opportunity" }] } }, { sourceId: "demo", displayName: "Demo", dataType: "attendance", spreadsheetId: "private-id", mapping: { aliases: { secret: "E1" }, attendance: { allowances: { E1: { year: 2026, days: 15 } } } }, revisions: [{ private: true }], inspection: { rawSample: ["private"] }, data: { employees: [], attendance: [{ employeeId: "E1", date: "2026-10-01", status: "Leave" }] } }] }));
    } else { res.end("Demo page"); }
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const proxy = createReviewServer({ upstreamPort: upstream.address().port });
  proxy.listen(0, "127.0.0.1");
  await once(proxy, "listening");
  const base = `http://127.0.0.1:${proxy.address().port}`;
  try {
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) assert.equal((await fetch(base + "/api/dashboard", { method })).status, 403);
    for (const route of ["/data-sources", "/api/other", "/.env.local", "/_next/webpack-hmr", "/_next/static/%2e%2e%2f.env.local"]) assert.ok((await fetch(base + route)).status >= 400);
    assert.equal(received.length, 0, "blocked requests never reach the app");
    const response = await fetch(base + "/api/dashboard", { headers: { "x-forwarded-host": "attacker.example", origin: "https://attacker.example", cookie: "session=secret", authorization: "secret" } });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.reviewOnly, true);
    assert.equal(data.sources.length, 1, "HR gateway excludes BD sources and records");
    assert.equal(data.sources[0].mapping.attendance.allowances.E1.days, 15);
    assert.equal(data.sources[0].data.attendance[0].status, "Leave");
    for (const key of ["spreadsheetId", "revisions", "inspection"]) assert.equal(data.sources[0][key], undefined);
    assert.equal(data.sources[0].mapping.aliases, undefined);
    assert.equal(received[0].headers.host, `127.0.0.1:${upstream.address().port}`);
    for (const key of ["x-forwarded-host", "origin", "cookie", "authorization"]) assert.equal(received[0].headers[key], undefined);
    assert.equal((await fetch(base + "/people/attendance")).status, 200);
    assert.equal((await fetch(base + "/people/employees")).status, 200);
    assert.equal((await fetch(base + "/_next/static/chunks/demo.js")).status, 200);
  } finally {
    proxy.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise(resolve => proxy.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
  }
});
