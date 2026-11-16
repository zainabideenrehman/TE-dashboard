import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { createReviewServer } from "./hr-review-proxy.mjs";

const root = process.cwd();
const sessionFile = path.join(root, ".data/hr-review-session.json");
const config = JSON.parse(await readFile(path.join(root, ".data/hr-review-config.json"), "utf8"));
const emails = [...new Set(config.allowedEmails || [])];
if (!emails.length || emails.some(email => typeof email !== "string" || !/^[^\s@*]+@[^\s@*]+\.[^\s@*]+$/.test(email))) throw Error("Configure explicit HR email addresses in .data/hr-review-config.json. Wildcards are not allowed.");
const binary = path.join(root, ".data/tools/cloudflared.exe");
await readFile(binary);
const check = await fetch("http://127.0.0.1:3000/people/attendance");
if (!check.ok) throw Error("Start the dashboard on localhost:3000 first.");
const proxy = createReviewServer();
proxy.listen(3100, "127.0.0.1");
await once(proxy, "listening");
const args = ["tunnel", "--no-autoupdate", "--protocol", "http2", "--url", "http://127.0.0.1:3100"];
for (const email of emails) args.push("--allowed-mail", email);
const child = spawn(binary, args, { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let publicUrl;
let logBuffer = "";
let finishing = false;
async function finish(code) {
  if (finishing) return;
  finishing = true;
  child.kill();
  proxy.closeAllConnections();
  proxy.close();
  await writeFile(sessionFile, JSON.stringify({ active: false, url: publicUrl, stoppedAt: new Date().toISOString() }, null, 2)).catch(() => {});
  process.exit(code);
}
function output(chunk) {
  const message = chunk.toString();
  process.stdout.write(message);
  logBuffer = (logBuffer + message).slice(-16000);
  const match = logBuffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match && !publicUrl) {
    publicUrl = match[0];
    writeFile(sessionFile, JSON.stringify({ active: true, url: publicUrl, attendanceUrl: publicUrl + "/people/attendance", allowedEmails: emails, gatewayPort: 3100, gatewayPid: process.pid, tunnelPid: child.pid, startedAt: new Date().toISOString() }, null, 2)).catch(() => finish(1));
  }
}
child.stdout.on("data", output);
child.stderr.on("data", output);
child.on("error", error => { console.error(error.message); void finish(1); });
child.on("exit", code => { void finish(code || 0); });
process.on("SIGINT", () => { void finish(0); });
process.on("SIGTERM", () => { void finish(0); });
console.log("Starting email-restricted HR review. Source management and write requests are blocked. Keep this and the dashboard running; Ctrl+C ends sharing.");
