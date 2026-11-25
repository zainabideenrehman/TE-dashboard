import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const cookieName = "agency_session";
export const sessionSeconds = 8 * 60 * 60;
type Account = { email: string; salt: string; hash: string };
export function accounts(): Account[] {
  try {
    const list: unknown = JSON.parse(process.env.DASHBOARD_USERS_JSON || "[]");
    if (!Array.isArray(list) || !list.length || list.length > 20) return [];
    if (!list.every(a => typeof a.email === "string" && /^[a-f0-9]{32}$/.test(a.salt) && /^[a-f0-9]{128}$/.test(a.hash))) return [];
    return list;
  } catch { return []; }
}
export function authRequired() {
  return !!process.env.VERCEL || process.env.NODE_ENV === "production" || !!process.env.DASHBOARD_USERS_JSON;
}
export function authConfigured() {
  return (process.env.DASHBOARD_SESSION_SECRET?.length || 0) >= 32 && accounts().length > 0;
}
function signature(value: string) {
  return createHmac("sha256", process.env.DASHBOARD_SESSION_SECRET!).update(value).digest("base64url");
}
export function createSession(account: Account) {
  if (!authConfigured()) throw Error("Login is not configured.");
  const body = Buffer.from(JSON.stringify({ email: account.email, revision: signature(account.hash), exp: Date.now() + sessionSeconds * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return body + "." + signature(body);
}
export function sessionEmail(token?: string): string | undefined {
  if (!authConfigured() || !token || token.length > 2048) return;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return;
    const expected = Buffer.from(signature(parts[0]));
    const actual = Buffer.from(parts[1]);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return;
    const value = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    const account = accounts().find(a => a.email === value.email);
    if (!account || value.revision !== signature(account.hash) || !Number.isFinite(value.exp) || value.exp <= Date.now() || value.exp > Date.now() + sessionSeconds * 1000) return;
    return account.email;
  } catch { return; }
}
export function authorized(req: NextRequest) {
  return !authRequired() || !!sessionEmail(req.cookies.get(cookieName)?.value);
}
export function verifyPassword(email: string, password: string) {
  const list = accounts();
  const account = list.find(a => a.email === email.trim().toLowerCase());
  const salt = account?.salt || "0".repeat(32);
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(account?.hash || "0".repeat(128), "hex");
  return timingSafeEqual(actual, expected) ? account : undefined;
}
export function validOrigin(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const requestOrigin = req.headers.get("origin");
  if (!process.env.VERCEL && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) {
    return requestOrigin === `${req.nextUrl.protocol}//${host}`;
  }
  if (!process.env.VERCEL && process.env.NODE_ENV !== "production") return false;
  const origin = process.env.DASHBOARD_ORIGIN;
  return !!origin && origin.startsWith("https://") && requestOrigin === origin && host === new URL(origin).host;
}
