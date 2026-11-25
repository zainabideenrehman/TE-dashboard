import { NextRequest, NextResponse } from "next/server";
import { authConfigured, cookieName, createSession, sessionSeconds, validOrigin, verifyPassword } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A bounded per-instance backstop; infrastructure rate limiting is also recommended.
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(req: NextRequest) {
  const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
  if (!validOrigin(req)) return reply("Same-origin request required.", 403);
  if (!authConfigured()) return reply("Login is not configured. Contact the dashboard owner.", 503);
  if (!req.headers.get("content-type")?.startsWith("application/json")) return reply("JSON request required.", 400);
  try {
    const reader = req.body?.getReader();
    if (!reader) return reply("Invalid request.", 400);
    let raw = "";
    let size = 0;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) { await reader.cancel(); return reply("Request too large.", 413); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const { email, password } = JSON.parse(raw);
    if (typeof email !== "string" || email.length > 254 || typeof password !== "string" || password.length > 256) return reply("Invalid email or password.", 400);
    const key = email.trim().toLowerCase();
    const now = Date.now();
    for (const [k, v] of attempts) if (v.until <= now) attempts.delete(k);
    if (attempts.size >= 1000 || (attempts.get(key)?.count || 0) >= 5) return reply("Too many attempts. Try again in 15 minutes.", 429);
    const attempt = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    attempt.count++; attempts.set(key, attempt);
    const account = verifyPassword(email, password);
    if (!account) return reply("Invalid email or password.", 401);
    attempts.delete(key);
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(cookieName, createSession(account), { httpOnly: true, secure: req.nextUrl.protocol === "https:" || !!process.env.VERCEL, sameSite: "strict", path: "/", maxAge: sessionSeconds });
    return response;
  } catch { return reply("Invalid request.", 400); }
}
