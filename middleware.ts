import { NextRequest, NextResponse } from "next/server";
import { authorized } from "./lib/auth";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === "/login" || path === "/api/auth/login" || path === "/api/auth/logout") return NextResponse.next();
  if (authorized(req)) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(new URL("/login", req.url));
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"], runtime: "nodejs" };
