import { NextRequest, NextResponse } from "next/server";
import { cookieName, validOrigin } from "@/lib/auth";
export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  const response = NextResponse.redirect(new URL("/login", req.url), 303);
  response.cookies.set(cookieName, "", { httpOnly: true, secure: req.nextUrl.protocol === "https:" || !!process.env.VERCEL, sameSite: "strict", path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
