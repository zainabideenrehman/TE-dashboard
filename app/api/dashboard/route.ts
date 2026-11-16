import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { executeAction, refresh } from "@/lib/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Request failed." },
    { status: 400, headers },
  );
}
function localOrigin(req: NextRequest) {
  if (process.env.VERCEL) {
    const configured = process.env.DASHBOARD_ORIGIN;
    const origin = configured && new URL(configured);
    if (!origin || origin.protocol !== "https:" || origin.origin !== configured)
      throw Error("Configure the protected dashboard HTTPS origin.");
    if (req.headers.get("host") !== origin.host)
      throw Error("Unrecognized dashboard host.");
    return origin.origin;
  }
  // Next.js can normalize req.nextUrl to localhost even when the browser uses
  // 127.0.0.1. Use the actual Host header, restricted to loopback hosts.
  const host = req.headers.get("host") || "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))
    throw Error("This development server accepts localhost requests only.");
  return req.nextUrl.protocol + "//" + host;
}
export async function GET(req: NextRequest) {
  try {
    localOrigin(req);
    const registry = await store().read();
    // Employee sources refresh first, so attendance can use their stable IDs.
    const ordered = [...registry.sources].sort(
      (a, b) =>
        Number(a.dataType === "attendance") -
        Number(b.dataType === "attendance"),
    );
    for (const source of ordered)
      if (source.version) await refresh(source.sourceId);
    return NextResponse.json(
      {
        ...(await store().read()),
        mode: process.env.DATA_MODE === "GOOGLE" ? "GOOGLE" : "DEMO",
        configurationReadOnly: !!process.env.VERCEL,
      },
      { headers },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    if (!origin || origin !== localOrigin(req))
      throw Error("Same-origin request required.");
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      throw Error("JSON request required.");
    const raw = await req.text();
    if (raw.length > 100000) throw Error("Request is too large.");
    const body: unknown = JSON.parse(raw);
    if (!body || Array.isArray(body) || typeof body !== "object")
      throw Error("Invalid request.");
    if (process.env.VERCEL && (body as Record<string, unknown>).action !== "refresh")
      throw Error("Hosted source configuration is read-only. Publish mapping changes from the reviewed local registry.");
    const result = await executeAction(body as Record<string, unknown>);
    const failed = result && typeof result === "object" && "error" in result;
    return NextResponse.json(result, { status: failed ? 400 : 200, headers });
  } catch (e) {
    return failure(e);
  }
}
