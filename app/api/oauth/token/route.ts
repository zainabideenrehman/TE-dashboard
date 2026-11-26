import { NextResponse } from "next/server";
import { createToken, readCode, verifyPkce } from "../../../../lib/mcp-oauth";

export async function POST(request: Request) {
  const body = await request.formData();
  const code = readCode(String(body.get("code") || ""));
  const verifier = String(body.get("code_verifier") || "");
  if (!code || !code.githubToken || (code.codeChallenge && !verifyPkce(verifier, String(code.codeChallenge)))) return NextResponse.json({ error: "invalid_grant", error_description: "The authorization code or PKCE verifier is invalid or expired." }, { status: 400 });
  return NextResponse.json({ access_token: createToken({ githubToken: code.githubToken, scope: code.scope || "proposal:routines:read proposal:routines:write" }), token_type: "Bearer", expires_in: 28800, scope: code.scope || "proposal:routines:read proposal:routines:write" });
}
