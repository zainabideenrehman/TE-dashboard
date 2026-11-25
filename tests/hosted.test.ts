import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { store, initialRegistry } from "../lib/store";
import { GET, POST } from "../app/api/dashboard/route";
import { scryptSync } from "node:crypto";
import { createSession, accounts } from "../lib/auth";

test("hosted registry drops deployment data, serializes cache updates, rolls back failures and enforces origin/read-only configuration", async () => {
  const original = {...process.env};
  try {
    delete process.env.DATA_MODE;
    const seed = initialRegistry();
    process.env.VERCEL = "1";
    process.env.DASHBOARD_SESSION_SECRET = "s".repeat(48);
    const salt = "a".repeat(32);
    process.env.DASHBOARD_USERS_JSON = JSON.stringify([{email:"owner@example.com",salt,hash:scryptSync("test-password",salt,64).toString("hex")}]);
    const cookie = `agency_session=${createSession(accounts()[0])}`;
    process.env.DATA_MODE = "GOOGLE";
    process.env.SOURCE_REGISTRY_JSON = JSON.stringify(seed);
    process.env.DASHBOARD_ORIGIN = "https://dashboard.example.com";
    const registry = store();
    const first = await registry.read();
    assert.equal(first.sources[0].data, undefined);
    assert.equal(first.sources[0].inspection, undefined);
    assert.equal(first.sources[0].lastRefresh, undefined);
    await Promise.all([registry.update(async r => { await Promise.resolve(); r.sources[0].displayName = "Updated"; }), registry.update(r => { assert.equal(r.sources[0].displayName, "Updated"); r.sources[0].data = seed.sources[0].data; })]);
    await assert.rejects(registry.update(r => { r.sources = []; throw Error("rollback"); }));
    assert.equal((await registry.read()).sources.length, seed.sources.length);
    assert.ok((await registry.read()).sources[0].data?.employees.length);
    const copy = await registry.read(); copy.sources = [];
    assert.equal((await registry.read()).sources.length, seed.sources.length);
    assert.equal((await GET(new NextRequest("https://dashboard.example.com/api/dashboard"))).status, 401);
    const denied = await GET(new NextRequest("https://other.example.com/api/dashboard", {headers:{host:"other.example.com",cookie}}));
    assert.equal(denied.status, 400);
    for (const origin of ["https://other.example.com", "https://dashboard.example.com"]) {
      const response = await POST(new NextRequest("https://dashboard.example.com/api/dashboard", {method:"POST", headers:{host:"dashboard.example.com", origin, cookie, "content-type":"application/json"}, body:JSON.stringify({action:"remove",sourceId:first.sources[0].sourceId})}));
      assert.equal(response.status, 400);
      assert.match((await response.json()).error, origin.includes("other") ? /Same-origin/ : /read-only/);
    }
  } finally {
    for (const name of Object.keys(process.env)) if (!(name in original)) delete process.env[name];
    Object.assign(process.env, original);
  }
});
