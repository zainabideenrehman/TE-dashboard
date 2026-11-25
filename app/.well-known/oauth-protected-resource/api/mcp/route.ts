import { NextResponse } from "next/server";

export function GET(request: Request) {
  const origin = process.env.DASHBOARD_ORIGIN || new URL(request.url).origin;
  const issuer = process.env.MCP_OAUTH_ISSUER;
  return NextResponse.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: issuer ? [issuer] : [],
    scopes_supported: ["proposal:routines:read", "proposal:routines:write"],
  });
}
