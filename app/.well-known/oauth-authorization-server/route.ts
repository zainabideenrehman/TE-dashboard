import { NextResponse } from "next/server";

export function GET(request: Request) {
  const origin = process.env.DASHBOARD_ORIGIN || new URL(request.url).origin;
  return NextResponse.json({
    issuer: process.env.MCP_OAUTH_ISSUER || origin,
    authorization_endpoint: `${origin}/api/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["proposal:routines:read", "proposal:routines:write"],
  });
}
