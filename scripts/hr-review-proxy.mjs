import http from "node:http";

const pages = new Set(["/", "/people/attendance", "/people/employees"]);
const upstreamHeaders = ["accept", "accept-language", "user-agent", "rsc", "next-router-state-tree", "next-router-prefetch", "next-url"];
export function reviewPayload(data) {
  return {
    mode: data.mode,
    reviewOnly: true,
    sources: (data.sources || []).filter(source => source.dataType === "employees" || source.dataType === "attendance").map(source => ({
      sourceId: source.sourceId,
      displayName: source.displayName,
      dataType: source.dataType,
      version: source.version,
      lastRefresh: source.lastRefresh,
      error: source.error ? "Source refresh failed; showing last-good records." : undefined,
      mapping: { attendance: { allowances: source.mapping?.attendance?.allowances || {} } },
      data: source.data ? {
        employees: source.data.employees || [],
        attendance: source.data.attendance || [],
        reviews: source.data.reviews || [],
        warnings: [],
      } : undefined,
    })),
  };
}
export function createReviewServer({ upstreamPort = 3000 } = {}) {
  return http.createServer((req, res) => {
    const respond = (status, body, extra = {}) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", ...extra });
      res.end(req.method === "HEAD" ? undefined : JSON.stringify(body));
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      respond(403, { error: "HR review access is read-only." });
      return;
    }
    let url;
    try {
      if (!req.url?.startsWith("/") || req.url.startsWith("//")) throw Error();
      url = new URL(req.url, "http://127.0.0.1");
      const decoded = decodeURIComponent(url.pathname);
      if (decoded.includes("\\") || decoded.split("/").some(s => s === ".." || s === ".") || decoded !== url.pathname) throw Error();
    } catch {
      respond(400, { error: "Invalid review path." });
      return;
    }
    const api = url.pathname === "/api/dashboard";
    if (!pages.has(url.pathname) && !api && !url.pathname.startsWith("/_next/static/")) {
      respond(403, { error: "This page is not available in HR review." });
      return;
    }
    const headers = { host: `127.0.0.1:${upstreamPort}`, "accept-encoding": "identity" };
    for (const key of upstreamHeaders) if (req.headers[key]) headers[key] = req.headers[key];
    // Never trust forwarded Host/Origin or send the edge login cookies upstream.
    const upstream = http.request({ hostname: "127.0.0.1", port: upstreamPort, path: url.pathname + url.search, method: api ? "GET" : req.method, headers, timeout: 45000 }, response => {
      if (api) {
        let size = 0;
        const chunks = [];
        response.on("data", chunk => {
          size += chunk.length;
          if (size > 10 * 1024 * 1024) { upstream.destroy(); if (!res.headersSent) respond(502, { error: "Review data exceeds the supported size." }); return; }
          chunks.push(chunk);
        });
        response.on("end", () => {
          if (res.headersSent) return;
          if (response.statusCode !== 200) { respond(502, { error: "The local dashboard could not load review data." }); return; }
          try { respond(200, reviewPayload(JSON.parse(Buffer.concat(chunks).toString("utf8")))); }
          catch { respond(502, { error: "The local dashboard returned invalid review data." }); }
        });
      } else {
        if ((response.statusCode || 500) >= 400) { response.resume(); respond(502, { error: "The local dashboard could not serve this page." }); return; }
        const responseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "DENY" };
        if (response.headers["content-type"]) responseHeaders["Content-Type"] = response.headers["content-type"];
        if (response.headers.location) {
          const target = new URL(response.headers.location, `http://127.0.0.1:${upstreamPort}`);
          if (target.hostname !== "127.0.0.1" || target.port !== String(upstreamPort)) { response.resume(); respond(502, { error: "Unexpected redirect." }); return; }
          responseHeaders.Location = target.pathname + target.search;
        }
        res.writeHead(response.statusCode || 502, responseHeaders);
        response.pipe(res);
      }
      response.on("error", () => { if (!res.headersSent) respond(502, { error: "Review connection interrupted." }); else res.destroy(); });
    });
    upstream.on("timeout", () => upstream.destroy());
    upstream.on("error", () => { if (!res.headersSent) respond(502, { error: "The local dashboard is unavailable. Keep it running while HR reviews." }); else res.destroy(); });
    req.on("aborted", () => upstream.destroy());
    upstream.end();
  });
}
