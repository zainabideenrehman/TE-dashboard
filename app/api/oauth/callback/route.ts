import { NextResponse } from "next/server";
import { createCode, readState } from "../../../../lib/mcp-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = readState(url.searchParams.get("state") || "");
  const code = url.searchParams.get("code");
  if (!state || !code || typeof state.redirectUri !== "string") return NextResponse.json({ error: "invalid_request", error_description: "The GitHub authorization response is invalid or expired." }, { status: 400 });
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: process.env.GITHUB_OAUTH_CLIENT_ID, client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET, code, redirect_uri: `${url.origin}/api/oauth/callback` }) });
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) return NextResponse.json({ error: "server_error", error_description: "GitHub token exchange failed." }, { status: 502 });
  const authorizationCode = createCode({ ...state, githubToken: token.access_token });
  const redirect = new URL(state.redirectUri);
  redirect.searchParams.set("code", authorizationCode);
  if (state.responseState) redirect.searchParams.set("state", String(state.responseState));
  return NextResponse.redirect(redirect);
}
