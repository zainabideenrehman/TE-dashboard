import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { NextRequest } from "next/server";
import { accounts, authConfigured, createSession, sessionEmail, verifyPassword, authorized, validOrigin } from "../lib/auth";
import { POST as login } from "../app/api/auth/login/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { middleware } from "../middleware";

test("authentication fails closed, validates credentials, guards routes, and clears sessions", async () => {
  const original = { ...process.env };
  try {
    process.env.VERCEL = "1";
    process.env.DASHBOARD_ORIGIN = "https://dashboard.example.com";
    delete process.env.DASHBOARD_USERS_JSON;
    delete process.env.DASHBOARD_SESSION_SECRET;
    const req = (path: string, body?: unknown, cookie?: string, origin = "https://dashboard.example.com") => new NextRequest(`https://dashboard.example.com${path}`, { method: body ? "POST" : "GET", headers: { host: "dashboard.example.com", origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal(authConfigured(), false);
    assert.equal(authorized(req("/")), false);
    assert.equal(middleware(req("/people/employees")).status, 307);
    assert.equal(middleware(req("/api/dashboard")).status, 401);
    assert.equal((await login(req("/api/auth/login", { email: "owner@example.com", password: "password" }))).status, 503);
    const salt = "a".repeat(32);
    process.env.DASHBOARD_USERS_JSON = JSON.stringify([{ email: "owner@example.com", salt, hash: scryptSync("a long test password", salt, 64).toString("hex") }]);
    process.env.DASHBOARD_SESSION_SECRET = "s".repeat(48);
    assert.equal(verifyPassword("owner@example.com", "wrong"), undefined);
    assert.equal(verifyPassword("other@example.com", "a long test password"), undefined);
    const token = createSession(accounts()[0]);
    assert.equal(sessionEmail(token), "owner@example.com");
    assert.equal(sessionEmail(token + "x"), undefined);
    assert.equal(sessionEmail("malformed"), undefined);
    assert.equal(authorized(req("/", undefined, `agency_session=${token}`)), true);
    const response = await login(req("/api/auth/login", { email: "Owner@example.com", password: "a long test password" }));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie")!, /HttpOnly/i);
    assert.match(response.headers.get("set-cookie")!, /Secure/i);
    assert.match(response.headers.get("set-cookie")!, /SameSite=strict/i);
    assert.equal(validOrigin(req("/", undefined, undefined, "https://evil.example")), false);
    assert.equal((await login(req("/api/auth/login", {}, undefined, "https://evil.example"))).status, 403);
    for (let i = 0; i < 5; i++) assert.equal((await login(req("/api/auth/login", { email: "bad@example.com", password: "wrong" }))).status, 401);
    assert.equal((await login(req("/api/auth/login", { email: "bad@example.com", password: "wrong" }))).status, 429);
    const out = await logout(req("/api/auth/logout", {}));
    assert.match(out.headers.get("set-cookie")!, /Max-Age=0/);
    process.env.DASHBOARD_USERS_JSON = "[]";
    assert.equal(sessionEmail(token), undefined);

    process.env.DASHBOARD_USERS_JSON = JSON.stringify([{ email: "owner@example.com", salt, hash: scryptSync("a long test password", salt, 64).toString("hex") }]);
    const localLogin = (origin: string) => new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { host: "localhost:3000", origin, "content-type": "application/json" },
      body: JSON.stringify({ email: "owner@example.com", password: "a long test password" }),
    });
    Reflect.set(process.env, "NODE_ENV", "production");
    assert.equal((await login(localLogin("http://localhost:3000"))).status, 403);
    delete process.env.VERCEL;
    assert.equal((await login(localLogin("http://localhost:3001"))).status, 403);
    const localResponse = await login(localLogin("http://localhost:3000"));
    assert.equal(localResponse.status, 200);
    assert.doesNotMatch(localResponse.headers.get("set-cookie")!, /; Secure/i);
  } finally {
    for (const name of Object.keys(process.env)) if (!(name in original)) delete process.env[name];
    Object.assign(process.env, original);
  }
});
