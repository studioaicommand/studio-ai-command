// v130: Connect client domain sends a client's own domain to THEIR Command only, and tells their Command.
import http from "node:http"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { spawn } from "node:child_process";
let pass = 0, fail = 0; const assert = (c, m) => { if (c) { pass++; console.log("✓ " + m); } else { fail++; console.log("FAIL: " + m); } };
const FT = "ef".repeat(24), HOST = "command.harbourphysio.com.au";
const seen = { fallback: null, dns: null, hostname: null, route: null, told: null };
const srv = http.createServer(async (q, r) => {
  let b = ""; for await (const c of q) b += c; const body = b ? JSON.parse(b) : null;
  const u = new URL(q.url, "http://x"), p = u.pathname, J = (o, s = 200) => { r.writeHead(s, { "content-type": "application/json" }); r.end(JSON.stringify(o)); };
  if (p === "/cf/zones") return J({ success: true, result: [{ id: "z" }] });
  if (p === "/cf/zones/z/custom_hostnames/fallback_origin") { if (q.method === "PUT") { seen.fallback = body.origin; return J({ success: true, result: body }); } return J({ success: true, result: seen.fallback ? { origin: seen.fallback } : {} }); }
  if (p === "/cf/zones/z/dns_records") { if (q.method === "POST") { seen.dns = body; return J({ success: true, result: { id: "d" } }); } return J({ success: true, result: seen.dns ? [{ id: "d" }] : [] }); }
  if (p === "/cf/zones/z/custom_hostnames") { if (q.method === "POST") { seen.hostname = body; return J({ success: true, result: { id: "h", hostname: body.hostname, ownership_verification: { name: "_cf-custom-hostname." + body.hostname, value: "tok-123" } } }); }
    return J({ success: true, result: seen.hostname ? [{ id: "h", hostname: HOST, status: "active", ssl: { status: "active" } }] : [] }); }
  if (p === "/cf/zones/z/workers/routes") { if (q.method === "POST") { seen.route = body; return J({ success: true, result: { id: "r" } }); } return J({ success: true, result: seen.route ? [{ id: "r", ...seen.route }] : [] }); }
  if (p === "/client/api/v1/fleet/domain") { seen.told = { auth: q.headers.authorization, body }; return J({ ok: true, host: body.host }); }
  J({ error: "unknown " + p }, 404);
});
await new Promise((ok) => srv.listen(0, ok));
const base = "http://127.0.0.1:" + srv.address().port;
const root = fs.mkdtempSync(path.join(os.tmpdir(), "kitd-")), kit = path.join(root, "Client setup kit");
fs.mkdirSync(kit); fs.copyFileSync(path.join("kit", "Connect client domain.command"), path.join(kit, "Connect client domain.command"));
fs.mkdirSync(path.join(root, "Client setups"));
const code = "SFC1." + Buffer.from(JSON.stringify({ h: "https://harbour-physio.studioflowandsystems.app", t: FT, b: "Harbour Physio" })).toString("base64url");
const priv = path.join(root, "Client setups", "harbour-physio (KEEP PRIVATE).txt"); fs.writeFileSync(priv, "Connect code:\n  " + code + "\n");
const run = (answers) => new Promise((ok) => { const c = spawn("bash", [path.join(kit, "Connect client domain.command")], { env: { ...process.env, CF_API: base + "/cf", CLIENT_URL_BASE: base + "/client", POLL_SECONDS: "0", CHECKS: "2" } }); let o = ""; c.stdout.on("data", (d) => o += d); c.stderr.on("data", (d) => o += d); const t = setTimeout(() => c.kill(), 60000); c.on("close", (s) => { clearTimeout(t); ok({ s, o }); }); c.stdin.end(answers.join("\n") + "\n"); });
let r = await run(["harbour-physio", "https://Command.HarbourPhysio.com.au/", "cftok"]);
assert(r.s === 0, "Connect client domain finishes" + (r.s ? "\n" + r.o.slice(-600) : ""));
assert(seen.fallback === "clients.studioflowandsystems.app" && seen.dns?.content === "100::" && seen.dns?.proxied === true, "Client domains switched on once (originless fallback)");
assert(seen.hostname?.hostname === HOST && seen.hostname?.ssl?.method === "http", "Their address is added with its own certificate");
assert(seen.route?.pattern === HOST + "/*" && seen.route?.script === "command-harbour-physio", "Their address goes only to their own Command");
assert(seen.told?.auth === "Bearer " + FT && seen.told?.body?.host === HOST, "Their Command is told its new address over the fleet link (code read from Client setups)");
assert(/CNAME\s+Name: command\.harbourphysio\.com\.au\s+Points to: clients\.studioflowandsystems\.app/.test(r.o) && /TXT/.test(r.o), "Prints the DNS records the client adds");
assert(/Live: https:\/\/command\.harbourphysio\.com\.au\/command-next/.test(r.o), "Reports when it's live and secure");
assert(/Own web address: https:\/\/command\.harbourphysio\.com\.au/.test(fs.readFileSync(priv, "utf8")), "Notes the address in their private setup file");
const routeBefore = JSON.stringify(seen.route);
r = await run(["harbour-physio", HOST, "cftok"]);
assert(r.s === 0 && JSON.stringify(seen.route) === routeBefore && /already/.test(r.o), "Running it again is safe (nothing duplicated)");
r = await run(["harbour-physio", "portal.studioflowandsystems.app", "cftok"]);
assert(r.s !== 0, "Refuses Studio's own domain");
srv.close(); fs.rmSync(root, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`); if (fail) process.exit(1);
