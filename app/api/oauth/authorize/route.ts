import { NextResponse } from "next/server";
import { createState, readClientId } from "../../../../lib/mcp-oauth";

export function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") || "";
  const redirectUri = url.searchParams.get("redirect_uri") || "";
  const client = readClientId(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) return NextResponse.json({ error: "invalid_request", error_description: "Unknown client or redirect URI." }, { status: 400 });
  const state = createState({ clientId, redirectUri, responseState: url.searchParams.get("state") || "", codeChallenge: url.searchParams.get("code_challenge") || "", scope: url.searchParams.get("scope") || "proposal:routines:read proposal:routines:write" });
  const github = new URL("https://github.com/login/oauth/authorize");
  github.searchParams.set("client_id", process.env.GITHUB_OAUTH_CLIENT_ID || "");
  github.searchParams.set("redirect_uri", `${url.origin}/api/oauth/callback`);
  github.searchParams.set("scope", "read:user user:email");
  github.searchParams.set("state", state);
  return NextResponse.redirect(github);
}
