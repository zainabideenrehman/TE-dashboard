import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

type Client = { redirectUris: string[] };
type Ticket = { kind: "state" | "code" | "token"; data: Record<string, unknown>; exp: number };

function secret() {
  const value = process.env.MCP_OAUTH_SECRET || process.env.DASHBOARD_SESSION_SECRET;
  if (!value || value.length < 32) throw Error("MCP_OAUTH_SECRET or DASHBOARD_SESSION_SECRET must be configured.");
  return createHashKey(value);
}

function createHashKey(value: string) {
  return createHmac("sha256", "agency-mcp-oauth-key").update(value).digest();
}

function seal(ticket: Ticket) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  const body = Buffer.from(JSON.stringify(ticket));
  const encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function open(value: string): Ticket | undefined {
  try {
    const raw = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", secret(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const ticket = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString()) as Ticket;
    if (!ticket || !Number.isFinite(ticket.exp) || ticket.exp < Date.now()) return;
    return ticket;
  } catch { return; }
}

export function createClientId(redirectUris: string[]) {
  return seal({ kind: "state", data: { redirectUris }, exp: Date.now() + 365 * 24 * 60 * 60 * 1000 });
}

export function readClientId(value: string): Client | undefined {
  const ticket = open(value);
  if (ticket?.kind !== "state" || !Array.isArray(ticket.data.redirectUris)) return;
  return { redirectUris: ticket.data.redirectUris.filter((uri): uri is string => typeof uri === "string") };
}

export function createState(data: Record<string, unknown>) {
  return seal({ kind: "state", data, exp: Date.now() + 10 * 60 * 1000 });
}

export function readState(value: string) {
  const ticket = open(value);
  return ticket?.kind === "state" ? ticket.data : undefined;
}

export function createCode(data: Record<string, unknown>) {
  return seal({ kind: "code", data, exp: Date.now() + 2 * 60 * 1000 });
}

export function readCode(value: string) {
  const ticket = open(value);
  return ticket?.kind === "code" ? ticket.data : undefined;
}

export function createToken(data: Record<string, unknown>) {
  return seal({ kind: "token", data, exp: Date.now() + 8 * 60 * 60 * 1000 });
}

export function readToken(value: string) {
  const ticket = open(value);
  return ticket?.kind === "token" ? ticket.data : undefined;
}

export function verifyPkce(verifier: string, challenge: string) {
  const digest = createHash("sha256").update(verifier).digest("base64url");
  const expected = Buffer.from(challenge);
  const actual = Buffer.from(digest);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
