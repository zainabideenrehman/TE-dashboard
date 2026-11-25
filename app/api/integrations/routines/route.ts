import { NextRequest, NextResponse } from "next/server";
import { createProposalRoutine, type ProposalProfile } from "@/lib/proposal-routine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = body?.profile as ProposalProfile;
    const records = Array.isArray(body?.records) ? body.records : [];
    if (!["ZAIN", "HASSAN"].includes(profile)) return NextResponse.json({ error: "A valid submission profile is required." }, { status: 400 });
    return NextResponse.json(await createProposalRoutine(records, profile));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare proposal routine." }, { status: 400 });
  }
}
