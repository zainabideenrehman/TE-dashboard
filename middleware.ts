import { NextRequest, NextResponse } from "next/server";
import { authorized } from "./lib/auth";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const publicProtocolPath = path === "/api/mcp" || path.startsWith("/api/oauth/") || path.startsWith("/api/auth/github/") || path.startsWith("/.well-known/");
  if (path === "/login" || path === "/api/auth/login" || path === "/api/auth/logout" || publicProtocolPath) return NextResponse.next();
  if (authorized(req)) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(new URL("/login", req.url));
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"], runtime: "nodejs" };
