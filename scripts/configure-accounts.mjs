import { randomBytes, scryptSync } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

// Run locally: node scripts/configure-accounts.mjs email1 email2 [--publish]
// Generated passwords are written only to a gitignored owner handoff file.
const emails = process.argv.slice(2).filter(a => !a.startsWith("--")).map(a => a.trim().toLowerCase());
if (!emails.length || emails.some(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) || new Set(emails).size !== emails.length) throw Error("Provide unique account email addresses.");
mkdirSync(".data", { recursive: true });
const path = ".data/dashboard-accounts.json";
let config;
if (existsSync(path)) {
  config = JSON.parse(readFileSync(path, "utf8"));
  if (JSON.stringify(config.accounts.map(a => a.email)) !== JSON.stringify(emails)) throw Error("Existing account set differs. Review the local account file before replacing it.");
} else {
  const accounts = emails.map(email => {
    const password = randomBytes(24).toString("base64url");
    const salt = randomBytes(16).toString("hex");
    return { email, password, salt, hash: scryptSync(password, salt, 64).toString("hex") };
  });
  config = { secret: randomBytes(48).toString("base64url"), accounts };
  writeFileSync(path, JSON.stringify(config, null, 2), { mode: 0o600, flag: "wx" });
}
if (process.argv.includes("--publish")) {
  const values = { DASHBOARD_SESSION_SECRET: config.secret, DASHBOARD_USERS_JSON: JSON.stringify(config.accounts.map(({email,salt,hash}) => ({email,salt,hash}))) };
  for (const [name, value] of Object.entries(values)) {
    try {
      execFileSync("cmd.exe", ["/d", "/s", "/c", `npx --yes vercel@latest env add ${name} --environment production --sensitive --force --yes`], { input: value, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
      console.log(`Configured ${name}.`);
    } catch { throw Error(`Could not configure ${name}; credential output suppressed.`); }
  }
}
console.log("Account handoff saved to .data/dashboard-accounts.json. Never commit or upload this file.");
