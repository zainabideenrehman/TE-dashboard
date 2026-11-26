import { NextResponse } from "next/server";
import { createClientId } from "../../../../lib/mcp-oauth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { redirect_uris?: unknown };
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((uri): uri is string => typeof uri === "string" && uri.startsWith("https://")) : [];
  if (!redirectUris.length) return NextResponse.json({ error: "invalid_client_metadata", error_description: "At least one HTTPS redirect URI is required." }, { status: 400 });
  return NextResponse.json({ client_id: createClientId(redirectUris), redirect_uris: redirectUris, token_endpoint_auth_method: "none", grant_types: ["authorization_code"], response_types: ["code"] }, { status: 201 });
}
