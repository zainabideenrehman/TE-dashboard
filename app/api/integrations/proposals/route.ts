import { NextRequest, NextResponse } from "next/server";
import { generateProposalDraft } from "@/lib/proposal-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || !body.record || !["ZAIN", "HASSAN"].includes(body.profile)) return NextResponse.json({ error: "A relevant job and submission profile are required." }, { status: 400 });
    return NextResponse.json({ draft: await generateProposalDraft(body.record, body.profile) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Proposal generation failed." }, { status: 400 });
  }
}
