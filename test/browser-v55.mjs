// v55 browser tasks, end to end: the real Command Link agent drives a real (headless) Chromium against a test site,
// the worker decides each step, risky steps wait for Ty's Approve, passwords go to Ty.
import http from "node:http"; import { spawn } from "node:child_process"; import fs from "node:fs";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); cleanup(); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_usage: [], team_actions: [] };
let seq = 0; const tgs = [], asks = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "is") return m[2] === "null" ? r[k] == null : true; return true; });
const ref = (txt, re) => { const sec = txt.split("INTERACTIVE ELEMENTS:\n")[1].split("\n\nPAGE TEXT")[0]; const line = sec.split("\n").find((l) => re.test(l)); return line ? +line.split(":")[0] : null; };
const realFetch = (u, init = {}) => new Promise((res, rej) => { const q = http.request(u, { method: init.method || "GET", headers: init.headers || {} }, (r) => { const ch = []; r.on("data", (c) => ch.push(c)); r.on("end", () => { const b = Buffer.concat(ch); res({ status: r.statusCode, text: async () => b.toString(), json: async () => JSON.parse(b.toString()) }); }); }); q.on("error", rej); if (init.body) q.write(init.body); q.end(); });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); if (path === "team_settings") { for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } } else t.push(...rows); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { asks.push(body); const names = (body.tools || []).map((t) => t.name);
    const use = (input) => Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name: "browser_action", input }], stop_reason: "tool_use", usage: { input_tokens: 3000, output_tokens: 100 } });
    if (names.includes("browser_action")) { const c = body.messages[0].content; const txt = c.find((x) => x.type === "text").text; const hasImg = c.some((x) => x.type === "image");
      if (/CURRENT PAGE: \nabout:blank/.test(txt)) return use({ kind: "goto", url: /Log in/.test(txt) ? O + "/site/login" : O + "/site/search", why: "start" });
      if (/PAGE TEXT[\s\S]*LOGIN PAGE/.test(txt)) return use({ kind: "type", ref: ref(txt, /password/i), text: "hunter2", why: "log in" });
      if (/PAGE TEXT[\s\S]*SENT OK/.test(txt)) return use({ kind: "finish", why: "done", summary: "Sent Sunny Dental an enquiry. Their phone is 07 5555 1234." + (hasImg ? " [saw screenshot]" : "") });
      if (/PAGE TEXT[\s\S]*BUSINESS PAGE/.test(txt)) { if (!/Type into .Message/.test(txt)) return use({ kind: "type", ref: ref(txt, /textarea/), text: "Hi, do you take new patients?", why: "write enquiry" }); return use({ kind: "click", ref: ref(txt, /Send enquiry/), why: "send it" }); }
      if (/PAGE TEXT[\s\S]*RESULTS/.test(txt)) return use({ kind: "click", ref: ref(txt, /Sunny Dental/), why: "open listing" });
      if (/PAGE TEXT[\s\S]*SEARCH PAGE/.test(txt)) return use({ kind: "type", ref: ref(txt, /\[search\]/), text: "dentist", enter: true, why: "search" });
      return use({ kind: "finish", why: "?", summary: "Lost: " + txt.slice(0, 200) }); }
    return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return new Response("", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t" };
const ctx = { waitUntil: () => {} };
const SITE = {
  "/site/search": `<html><head><title>Find a business</title></head><body><h1>SEARCH PAGE</h1><form action="/site/results"><input type="search" name="q" aria-label="Search businesses"></form></body></html>`,
  "/site/results": `<html><head><title>Results</title></head><body><h1>RESULTS</h1><a href="/site/sunny">Sunny Dental</a> <a href="/site/other">Other Dental</a></body></html>`,
  "/site/sunny": `<html><head><title>Sunny Dental</title></head><body><h1>BUSINESS PAGE</h1><p>Phone 07 5555 1234</p><form action="/site/sent" method="get"><textarea name="m" aria-label="Message"></textarea><button type="submit">Send enquiry</button></form></body></html>`,
  "/site/sent": `<html><head><title>Thanks</title></head><body><h1>SENT OK</h1></body></html>`,
  "/site/login": `<html><head><title>Login</title></head><body><h1>LOGIN PAGE</h1><input type="password" aria-label="Password"><button>Log in</button></body></html>`
};
const hits = [];
const srv = http.createServer(async (req, res) => { const path = req.url.split("?")[0]; hits.push(req.url);
  if (SITE[path]) { res.writeHead(200, { "content-type": "text/html" }); return res.end(SITE[path]); }
  const chunks = []; for await (const c of req) chunks.push(c);
  const r = await w.fetch(new Request("http://127.0.0.1:" + srv.address().port + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) }), env, ctx);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); });
await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const O = "http://127.0.0.1:" + srv.address().port; env.PUBLIC_ORIGIN = O;
let agent; const cleanup = () => { try { agent?.kill("SIGKILL"); } catch {} srv.close(); };
const call = async (path, b) => { const r = await realFetch(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const st = (k) => DB.team_settings.find((r) => r.key === k)?.value;
const until = async (fn, ms = 60000, what = "") => { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 300)); } return null; };

let x = await call("/browser", { goal: "find sunny dental" });
assert(x.s === 400 && /isn't set up/.test(x.j.error), "Browser tasks need Command Link first");
x = await call("/mac-link/setup", {});
const code = x.j.command.match(/install\/([a-f0-9]{24})/)[1];
const script = await (await realFetch(O + "/link/install/" + code)).text();
const token = script.match(/<key>SF_T<\/key><string>([a-f0-9]{64})<\/string>/)?.[1];
const src = script.split("<<'SFAGENT'\n")[1].split("\nSFAGENT\n")[0];
assert(token && /playwright-core@1\.49\.1/.test(script) && /launchctl load/.test(script) && src.includes("launchPersistentContext"), "Installer sets up the full browser helper (Node + Playwright) with its own token");
fs.writeFileSync("/tmp/claude-0/link-install2.zsh", script); fs.writeFileSync("/tmp/claude-0/agent/agent.mjs", src);
agent = spawn(process.execPath, ["/tmp/claude-0/agent/agent.mjs"], { env: { ...process.env, SF_T: token, SF_O: O, SF_DIR: "/tmp/claude-0/agent", SF_CHANNEL: "bundled", SF_HEADLESS: "1" }, stdio: ["ignore", "pipe", "pipe"] });
x = await until(async () => { const r = await call("/browser"); return r.j.agent >= 2 && r.j.online ? r : null; }, 20000);
assert(x, "The Mac helper checks in as a full browser agent");

x = await call("/browser", { goal: "Find Sunny Dental and send them an enquiry asking if they take new patients", start_url: O + "/site/search" });
assert(x.j.started, "Browser task starts");
x = await call("/browser", { goal: "something else" });
assert(x.s === 400 && /already working/.test(x.j.error), "Only one browser task at a time");
const pend = await until(() => DB.team_actions.find((a) => a.type === "browser_step" && a.status === "pending"), 60000);
assert(pend && /Send enquiry/i.test(pend.title) && /Filled in on this page: .Message.: Hi, do you take new patients/.test(pend.params.details), "Clicking Send waits for Ty's Approve (searching and typing didn't)");
assert(hits.some((h) => h.startsWith("/site/results?q=dentist")) && hits.includes("/site/sunny") && !hits.some((h) => h.startsWith("/site/sent")), "It searched and opened the listing, but hasn't sent anything yet");
assert(tgs.some((t) => /Browser: /.test(t)), "Ty gets an Approve card on Telegram");
await new Promise((r) => setTimeout(r, 6000));
assert(!hits.some((h) => h.startsWith("/site/sent")) && st("browser_task").status === "waiting", "Still waiting while Ty hasn't answered");
x = await call("/actions/" + pend.id + "/approve", {});
assert(x.j.ok, "Ty approves");
const done = await until(() => st("browser_task").status === "done" ? st("browser_task") : null, 60000);
assert(done && hits.some((h) => h.startsWith("/site/sent")), "After approval it sends, then finishes");
assert(/07 5555 1234/.test(done.result) && /saw screenshot/.test(done.result) && tgs.some((t) => /Browser task done/.test(t)), "Result comes back with the facts (and it saw the page), and Ty is told");
assert(asks.every((a) => /untrusted/.test(JSON.stringify(a.system)) || !a.tools?.some((t) => t.name === "browser_action")), "Pages are always treated as untrusted data");

// password fields go to Ty
x = await call("/browser", { goal: "Log in to the test site", start_url: O + "/site/login" });
const nt = await until(() => st("browser_task").status === "needs_ty" ? st("browser_task") : null, 60000);
if (!nt) console.log(JSON.stringify(st("browser_task")));
assert(nt && /private details/.test(nt.ask) && tgs.some((t) => /needs you in the Command Chrome window/.test(t)), "Passwords: it never types them, asks Ty to instead");
x = await call("/browser/stop", {});
await until(() => st("browser_task").status === "stopped", 20000);
assert(st("browser_task").status === "stopped", "Ty can stop a task");
cleanup(); console.log("v55 browser OK"); process.exit(0);
