// v91 Command Link 3, end to end: the real Command Link agent drives a real (headless) Chromium against a test site,
// position clicks on a page builder, typing where the cursor is, tabs, the visible pointer, and the Send guard.
import http from "node:http"; import { spawn } from "node:child_process"; import fs from "node:fs";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); cleanup(); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_usage: [], team_actions: [] };
let seq = 0; const FLOW = {}; const tgs = [], asks = [];
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
    if (names.includes("browser_action")) { const c = body.messages[0].content; const txt0 = c.find((x) => x.type === "text").text; const txt = txt0.split("CURRENT PAGE:")[1] || "";
      if (/^ \nabout:blank/.test(txt)) return use({ kind: "goto", url: O + "/site/builder", why: "start" });
      if (/TWO PAGE/.test(txt) && /TABS:/.test(txt0)) { FLOW.switched = true; return use({ kind: "switch_tab", tab: 0, why: "back to the builder" }); }
      if (/BUILDER/.test(txt)) {
        if (!/ELEMENT ADDED/.test(txt)) return use({ kind: "click_xy", x: 150, y: 75, target: "Add element +", why: "add a block" });
        if (!/Hello from Command/.test(txt)) return use({ kind: "type_focused", text: "Hello from Command", why: "type the heading" });
        if (!FLOW.triedSend) { FLOW.triedSend = true; return use({ kind: "click_xy", x: 350, y: 250, target: "empty space", why: "click away" }); }
        if (!FLOW.tab) { FLOW.tab = true; return use({ kind: "new_tab", url: O + "/site/two", why: "check the other page" }); }
        if (FLOW.switched) return use({ kind: "finish", why: "done", summary: "Added the block and typed the heading, checked page two in a second tab." });
      }
      return use({ kind: "finish", why: "?", summary: "Lost: " + txt.slice(0, 300) }); }
    return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return new Response("", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t" };
const ctx = { waitUntil: () => {} };
const SITE = {
  "/site/builder": `<html><head><title>Page builder</title><style>body{margin:0}#cv{position:absolute;left:0;top:0;width:500px;height:320px;background:#eee}#ed{position:absolute;left:20px;top:150px;width:300px;min-height:30px;background:#fff}</style></head><body><div id="cv"></div><div id="ed" contenteditable="false"></div><p style="position:absolute;top:400px">BUILDER <span id="st"></span></p><script>
    const bea = (e) => fetch('/site/beacon?ev=' + e);
    document.getElementById('cv').addEventListener('click', (ev) => { const x = ev.clientX, y = ev.clientY;
      if (x > 100 && x < 200 && y > 50 && y < 100) { document.getElementById('st').textContent = 'ELEMENT ADDED'; const ed = document.getElementById('ed'); ed.contentEditable = 'true'; ed.focus(); bea('added'); if (document.getElementById('sf-cur')) bea('cursor'); }
    });
    document.getElementById('ed').addEventListener('input', (e) => { if (/Hello from Command/.test(e.target.textContent)) bea('typed'); });
  </script><div onclick="bea('SENT')" style="position:absolute;left:300px;top:220px;width:100px;height:60px;background:#2563eb;color:#fff;line-height:60px;text-align:center;cursor:pointer">Send</div></body></html>`,
  "/site/two": `<html><head><title>Two</title></head><body><h1>TWO PAGE</h1></body></html>`,
  "/site/beacon": "ok"
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

let x = await call("/mac-link/setup", {});
const code = x.j.command.match(/install\/([a-f0-9]{24})/)[1];
const script = await (await realFetch(O + "/link/install/" + code)).text();
const token = script.match(/<key>SF_T<\/key><string>([a-f0-9]{64})<\/string>/)?.[1];
const src = script.split("<<'SFAGENT'\n")[1].split("\nSFAGENT\n")[0];
assert(/'X-SF-Agent': '3'/.test(src) && /sf-cur/.test(src), "The installer ships Command Link 3 (pointer, tabs, position clicks)");
fs.mkdirSync("/tmp/claude-0/agent3", { recursive: true }); fs.writeFileSync("/tmp/claude-0/agent/agent3.mjs", src);
agent = spawn(process.execPath, ["/tmp/claude-0/agent/agent3.mjs"], { env: { ...process.env, SF_T: token, SF_O: O, SF_DIR: "/tmp/claude-0/agent3", SF_CHANNEL: "bundled", SF_HEADLESS: "1" }, stdio: ["ignore", "pipe", "pipe"] });
agent.stderr.on("data", (d) => process.stderr.write(d));
x = await until(async () => { const r = await call("/browser"); return r.j.agent === 3 && r.j.online ? r : null; }, 20000);
assert(x, "Command Link 3 checks in");
x = await call("/browser", { goal: "In my page builder add a heading block that says Hello from Command, then check page two" });
assert(x.j.started, "Ty asks for something from the Do it for me box");
const done = await until(() => ["done", "stopped", "failed"].includes(st("browser_task").status) ? st("browser_task") : null, 120000);
if (!done || done.status !== "done") console.log(JSON.stringify(st("browser_task")).slice(0, 2000));
assert(done && done.status === "done", "The job finishes");
assert(hits.includes("/site/beacon?ev=added"), "It clicked a spot on a page with no normal buttons (a page builder) by position");
assert(hits.includes("/site/beacon?ev=cursor"), "A visible pointer is on the page while it works");
assert(hits.includes("/site/beacon?ev=typed"), "It typed where the cursor was");
assert(!hits.includes("/site/beacon?ev=SENT") && done.steps.some((s) => /needs Ty|approval/.test(s.desc + " " + (s.result || ""))), "It refused to click a Send button by position without Ty's yes, even when the AI called it empty space");
assert(hits.includes("/site/two") && done.steps.some((s) => /new tab/i.test(s.desc)) && done.steps.some((s) => /Switch to tab 0/.test(s.desc)), "It opened a second tab and switched back");
const lv = await call("/browser/live");
assert(lv.j.task && lv.j.task.steps.length > 3, "Do it for me shows the steps (the live picture is kept at the edge in production)");
cleanup(); console.log("v91 chrome OK"); process.exit(0);
