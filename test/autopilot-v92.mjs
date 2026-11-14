// v92 Outreach Autopilot, end to end: the real Command Link 4 drives a real (headless) Chromium against mock Facebook,
// Instagram and LinkedIn pages. It must: close old chats first, check the right person twice, survive a chat popping up and
// grabbing the cursor, refuse a chat that opens for the wrong person, leave a half-typed box alone, hold someone Ty has chatted
// with before (and send the reply that fits once Ty approves it on Telegram), skip clients and rule-breaking messages, connect on
// LinkedIn without a note, and then check replies: read the inbox, draft the answer that's needed and send it once approved.
import http from "node:http"; import { spawn } from "node:child_process"; import fs from "node:fs";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); cleanup(); process.exit(1); } console.log("✓", m); };
const now = new Date().toISOString();
const item = (id, channel, name, url, message, step = "warm") => ({ id, channel, step, person_name: name, business_name: name, profile_url: url, message, hook: "", status: "ready", created_at: now, updated_at: now, prospect_id: "p" + id });
let O = "";
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_usage: [], team_actions: [], agent_clients: [{ id: "c1", business_name: "Brothers In Care", alert_name: "Tim Hancock", widget_key: "k1" }], agent_prospects: [] };
let seq = 0; const tgs = [], asks = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "is") return m[2] === "null" ? r[k] == null : true; return true; });
const realFetch = (u, init = {}) => new Promise((res, rej) => { const q = http.request(u, { method: init.method || "GET", headers: init.headers || {} }, (r) => { const ch = []; r.on("data", (c) => ch.push(c)); r.on("end", () => { const b = Buffer.concat(ch); res({ status: r.statusCode, text: async () => b.toString(), json: async () => JSON.parse(b.toString()) }); }); }); q.on("error", rej); if (init.body) q.write(init.body); q.end(); });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); if (path === "team_settings") { for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } } else t.push(...rows); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { asks.push(body); const names = (body.tools || []).map((t) => t.name);
    const use = (name, input) => Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name, input }], stop_reason: "tool_use", usage: { input_tokens: 3000, output_tokens: 120 } });
    const txt = JSON.stringify(body.messages);
    if (names.includes("save_threads")) { const lines = body.messages[0].content.split("\n"); const i = lines.findIndex((l) => /booking/.test(l)); return use("save_threads", { threads: i >= 0 ? [{ i: +lines[i].split(".")[0], name: "Prarthana Rao" }] : [] }); }
    if (names.includes("save_reply")) return /hello Ty had ready/.test(txt) ? use("save_reply", { needs_reply: true, context: "She launched her tiered membership; you asked about Kajabi.", reply: "Hey Kristýna! So good to hear the membership is live. How are people finding the tiers?", intent: "friendly" })
      : use("save_reply", { needs_reply: true, context: "She wants to hear about the booking system.", reply: "Hi Prarthana! Happy to show you. Want a quick 15 minute call this week?", intent: "interested" });
    return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 + tgs.length } }); }
  return new Response("", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", AP_TEST_FAST: "1" };
const ctx = { waitUntil: () => {} };
const CHAT = `<script>
const bea = (e) => fetch('/site/beacon?ev=' + encodeURIComponent(e));
function chat(name, o) { o = o || {};
  const d = document.createElement('div'); d.setAttribute('aria-label', 'Chat with ' + name);
  d.style.cssText = 'position:fixed;bottom:0;right:' + (o.right || 20) + 'px;width:300px;height:400px;background:#fff;border:1px solid #ccc';
  d.innerHTML = '<div style="height:44px;position:relative"><a href="#">' + name + '</a><div role="button" aria-label="Close chat" style="width:20px;height:20px;position:absolute;right:5px;top:5px;background:#eee"></div></div><div class="rows" style="height:280px;overflow:auto"></div><div contenteditable="true" role="textbox" aria-label="Message" style="min-height:30px;border:1px solid #999;margin:4px"></div>';
  document.body.append(d);
  const rows = d.querySelector('.rows'), box = d.querySelector('[role=textbox]');
  (o.history || []).forEach((t) => { const r = document.createElement('div'); r.setAttribute('role', 'row'); r.textContent = t; rows.append(r); });
  if (o.prefill) box.textContent = o.prefill;
  d.querySelector('[aria-label="Close chat"]').onclick = () => { bea('closed|' + name); d.remove(); };
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const t = box.innerText.trim(); if (!t) return; const r = document.createElement('div'); r.setAttribute('role', 'row'); r.textContent = t; rows.append(r); box.textContent = ''; bea('sent|' + name + '|' + t); } });
  return { d, box };
}
</script>`;
const prof = (name, onclick, extra = "") => `<html><head><title>${name} | Facebook</title></head><body>${CHAT}<h1>${name}</h1><div role="button" aria-label="Message" style="width:90px;height:30px;background:#1877f2;color:#fff" onclick="${onclick}">Message</div>${extra}<script>chat('Old Chat Person', { right: 700 });</script></body></html>`;
const THREAD = (name, rows) => `<html><head><title>Messenger</title></head><body><div style="position:absolute;left:0;top:0;width:280px">Jade Dallas · Marc Miles</div><div role="main" style="position:absolute;left:300px;top:0;width:600px;height:600px"><div style="height:60px"><h2>${name}</h2></div><div class="rows">${rows.map((r) => '<div role="row">' + r + '</div>').join('')}</div><div contenteditable="true" role="textbox" aria-label="Message" style="min-height:30px;border:1px solid #999"></div></div><script>
const box = document.querySelector('[role=textbox]'), rows = document.querySelector('.rows');
box.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const t = box.innerText.trim(); if (!t) return; const r = document.createElement('div'); r.setAttribute('role', 'row'); r.textContent = t; rows.append(r); box.textContent = ''; fetch('/site/beacon?ev=' + encodeURIComponent('sent|${name}|' + t)); } });
</script></body></html>`;
const SITE = {
  "/site/fb/jade": prof("Jade Dallas", "openJade()", `<script>let stray; function openJade() { const j = chat('Jade Dallas'); let once = 0; j.box.addEventListener('input', () => { if (!once++) setTimeout(() => stray && stray.box.focus(), 30); }); setTimeout(() => { stray = chat('Kornelis Berkelaar', { right: 360 }); stray.box.focus(); }, 400); }</script>`),
  "/site/fb/dee": prof("Dee McKee", "chat('Marc Miles')"),
  "/site/fb/kristyna": prof("Kristýna Novak", "chat('Kristýna Novak', { history: ['Kristýna: We launched the tiered membership!', 'You: Amazing! Kajabi or your own site?'] })"),
  "/site/fb/prarthana": prof("Prarthana Rao", "chat('Prarthana Rao', { prefill: 'Have a Gre' })"),
  "/site/fb/tim": prof("Tim Hancock", "chat('Tim Hancock')"),
  "/site/fb/steve": prof("Steve Rose", "chat('Steve Rose')"),
  "/site/ig/renae": `<html><head><title>Renae Smith (@renae.smith)</title></head><body><header><h1>Renae Smith</h1><h2>renae.smith</h2></header><div role="button" onclick="location.href='/site/ig/direct/t/renae'" style="width:90px;height:30px;background:#eee">Message</div></body></html>`,
  "/site/ig/direct/t/renae": THREAD("Renae Smith", []),
  "/site/li/thomas": `<html><head><title>Thomas Addis | LinkedIn</title></head><body><h1>Thomas Addis</h1><div id="act"><button aria-label="Invite Thomas Addis to connect" onclick="ask()">Connect</button></div><script>
function ask() { const d = document.createElement('div'); d.setAttribute('role', 'dialog'); d.innerHTML = '<p>Add a note to your invitation?</p><button aria-label="Add a note">Add a note</button><button aria-label="Send without a note">Send without a note</button>'; document.body.append(d);
  d.querySelector('[aria-label="Send without a note"]').onclick = () => { d.remove(); document.getElementById('act').innerHTML = '<button aria-label="Pending, click to withdraw invitation sent to Thomas Addis">Pending</button>'; fetch('/site/beacon?ev=' + encodeURIComponent('connect|Thomas Addis')); }; }
</script></body></html>`,
  "/site/facebook/inbox": `<html><head><title>Messenger</title></head><body><div role="navigation">
<a href="/site/fb/messages/t/prar"><span style="font-weight:700">Prarthana Rao</span> <span>Hi Ty, yes I'd love to hear more about the booking system? · 2m</span></a>
<a href="/site/fb/messages/t/codei"><span style="font-weight:700">Codei</span> <span>Codei sent a reel · 1h</span></a>
<a href="/site/fb/messages/t/marc"><span>Marc Miles</span> <span>You: talk soon mate · 3d</span></a></div></body></html>`,
  "/site/fb/messages/t/prar": THREAD("Prarthana Rao", ["You: Hey Prarthana! How's the clinic going?", "Prarthana Rao: Hi Ty, yes I'd love to hear more about the booking system?"]),
  "/site/beacon": "ok"
};
const hits = [];
const srv = http.createServer(async (req, res) => { const path = decodeURIComponent(req.url.split("?")[0]); hits.push(decodeURIComponent(req.url));
  if (SITE[path]) { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(SITE[path]); }
  const chunks = []; for await (const c of req) chunks.push(c);
  if (process.env.DBG && req.url.includes("/link/pb")) console.log("PB", Buffer.concat(chunks).toString().slice(0, 300));
  const r = await w.fetch(new Request("http://127.0.0.1:" + srv.address().port + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) }), env, ctx);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); });
await new Promise((r) => srv.listen(0, "127.0.0.1", r)); O = "http://127.0.0.1:" + srv.address().port; env.PUBLIC_ORIGIN = O; env.AP_INBOX_BASE = O + "/site";
let agent; const cleanup = () => { try { agent?.kill("SIGKILL"); } catch {} srv.close(); };
const call = async (path, b) => { const r = await realFetch(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const st = (k) => DB.team_settings.find((r) => r.key === k)?.value;
const until = async (fn, ms = 60000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 300)); } return null; };
const ev = (re) => hits.filter((h) => h.startsWith("/site/beacon?ev=") && re.test(h.slice(16)));

DB.team_settings.push({ key: "dm_queue", value: { cfg: {}, items: [
  item("k1", "facebook", "Kristýna Novak", O + "/site/fb/kristyna", "Hey Kristýna! Hope you're well. How's everything been going?"),
  item("j1", "facebook", "Jade Dallas", O + "/site/fb/jade", "Hey Jade! Hope you're well. How's everything been going with you?"),
  item("d1", "facebook", "Dee McKee", O + "/site/fb/dee", "Hey Dee! Hope you're well. Any new books on the way?"),
  item("p1", "facebook", "Prarthana Rao", O + "/site/fb/prarthana", "Hi Prarthana! Hope the clinic is going well. How's the week been?"),
  item("t1", "facebook", "Tim Hancock", O + "/site/fb/tim", "Hey Tim! Hope you're well mate. How's everything going?"),
  item("s1", "facebook", "Steve Rose", O + "/site/fb/steve", "Hey Steve! haha how are you going mate, all good?"),
  item("r1", "instagram", "Renae Smith", O + "/site/ig/renae", "Hey Renae, how are you? Hope you're having a good week."),
  { ...item("l1", "linkedin", "Thomas Addis", O + "/site/li/thomas", "", "connect"), no_note: true } ] } });

let x = await call("/mac-link/setup", {});
const code = x.j.command.match(/install\/([a-f0-9]{24})/)[1];
const script = await (await realFetch(O + "/link/install/" + code)).text();
const token = script.match(/<key>SF_T<\/key><string>([a-f0-9]{64})<\/string>/)?.[1];
const src = script.split("<<'SFAGENT'\n")[1].split("\nSFAGENT\n")[0];
assert(/'X-SF-Agent': '4'/.test(src) && /runPlaybook/.test(src), "The installer ships Command Link 4 (Outreach Autopilot)");
fs.mkdirSync("/tmp/claude-0/agent4", { recursive: true }); fs.mkdirSync("/tmp/claude-0/agent", { recursive: true }); fs.writeFileSync("/tmp/claude-0/agent/agent4.mjs", src);
agent = spawn(process.execPath, ["/tmp/claude-0/agent/agent4.mjs"], { env: { ...process.env, SF_T: token, SF_O: O, SF_DIR: "/tmp/claude-0/agent4", SF_CHANNEL: "bundled", SF_HEADLESS: "1" }, stdio: ["ignore", "pipe", "pipe"] });
agent.stderr.on("data", (d) => process.stderr.write(d));
x = await until(async () => { const r = await call("/dm-queue"); return r.j.browser && r.j.browser.agent === 4 && r.j.browser.online ? r : null; }, 20000);
assert(x, "Command Link 4 checks in and the DM Desk sees it");

const asks0 = asks.length;
x = await call("/dm-queue/send-batch", { ids: ["k1", "j1", "d1", "p1", "t1", "s1", "r1", "l1"] });
assert(x.j.ok && x.j.autopilot && x.j.count === 8, "Ty approves a batch and Autopilot takes it");
const card = await until(() => DB.team_actions.find((a) => a.type === "dm_reply" && a.params.name === "Kristýna Novak"), 60000);
if (!card) console.log(hits.filter((h) => /link/.test(h)).slice(-5));
assert(card && /membership is live/.test(card.params.message) && tgs.some((t) => /Kristýna/.test(t) && /membership is live/.test(t)), "Someone Ty has chatted with is held: a reply that follows on from the chat goes to Telegram");
assert(!ev(/^sent\|Kristýna/).length, "Nothing was sent into the old chat before Ty said yes");
x = await call("/actions/" + card.id + "/approve", {});
if (x.s !== 200) console.log("APPROVE", x.s, JSON.stringify(x.j).slice(0, 400));
assert(x.s === 200, "Ty taps Approve");
const done = await until(() => ["done", "stopped", "failed"].includes(st("browser_task").status) ? st("browser_task") : null, 180000);
if (!done || done.status !== "done") console.log(JSON.stringify(st("browser_task")).slice(0, 3000));
assert(done && done.status === "done", "Autopilot finishes the batch");
const q = st("dm_queue").items, by = (id) => q.find((k) => k.id === id);
assert(ev(/^closed\|Old Chat Person$/).length >= 1, "It closes old chats before opening a new one");
assert(ev(/^sent\|Jade Dallas\|Hey Jade! Hope you're well\. How's everything been going with you\?$/).length === 1 && by("j1").status === "sent", "Jade gets exactly the approved words, even though another chat popped up and grabbed the cursor");
assert(!ev(/^sent\|Kornelis/).length, "Nothing went to the chat that popped up");
assert(!ev(/^sent\|Marc Miles/).length && by("d1").status === "ready" && /wasn't theirs/.test(by("d1").send_error), "When the chat that opens is someone else's, nothing is typed and Dee goes back to the DM Desk");
assert(!ev(/^sent\|Prarthana/).length && /already had words/.test(by("p1").send_error), "A message box with leftover words is left alone");
assert(!hits.some((h) => h.includes("/site/fb/tim")) && /client/.test(by("t1").send_error), "Clients are skipped without opening their page");
assert(!hits.some((h) => h.includes("/site/fb/steve")) && /haha/.test(by("s1").send_error), "A message with “haha” is stopped before it goes");
assert(ev(/^sent\|Renae Smith\|Hey Renae, how are you\?/).length === 1 && by("r1").status === "sent", "Instagram: profile, Message, the right thread, sent and confirmed");
assert(ev(/^connect\|Thomas Addis$/).length === 1 && by("l1").status === "sent", "LinkedIn: Connect, Send without a note, shows Pending");
assert(ev(/^sent\|Kristýna Novak\|Hey Kristýna! So good to hear the membership is live/).length === 1 && by("k1").status === "sent" && /membership is live/.test(by("k1").message), "Once approved, the reply that fits the old chat is sent and the DM Desk records it");
const mdl = asks.slice(asks0).map((a) => a.model);
assert(asks.length - asks0 <= 2 && mdl.every((m) => /sonnet/.test(m)), "No AI per click: the whole batch used one Sonnet call (the held reply)");
assert(/sent/.test(done.result) && /held/.test(done.result) && tgs.some((t) => /Autopilot done/.test(t)), "Ty gets a summary on Telegram");

// Check replies
const a1 = asks.length;
x = await call("/dm-queue/replies", { platforms: ["facebook"] });
assert(x.j.ok, "Ty taps Check replies");
const card2 = await until(() => DB.team_actions.find((a) => a.type === "dm_reply" && a.params.name === "Prarthana Rao"), 60000);
assert(card2 && card2.params.via === "thread" && /15 minute call/.test(card2.params.message), "It reads the inbox, opens the chat that's waiting on Ty and drafts the answer for Telegram");
assert(!DB.team_actions.some((a) => a.type === "dm_reply" && /Codei|Marc/.test(a.params.name)), "A shared reel and a chat Ty answered last don't bother him");
const inboxAsk = asks.slice(a1).find((a) => (a.tools || []).some((t) => t.name === "save_threads"));
assert(inboxAsk && /haiku/.test(inboxAsk.model) && /reel/.test(inboxAsk.system), "Haiku reads the inbox list (and knows reels on their own aren't leads)");
x = await call("/actions/" + card2.id + "/approve", {});
const done2 = await until(() => ["done", "stopped", "failed"].includes(st("browser_task").status) && st("browser_task").id !== done.id ? st("browser_task") : null, 120000);
if (!done2 || done2.status !== "done") console.log(JSON.stringify(st("browser_task")).slice(0, 3000));
assert(done2 && done2.status === "done" && ev(/^sent\|Prarthana Rao\|Hi Prarthana! Happy to show you/).length === 1, "The approved reply is sent in the right thread");
cleanup(); console.log("v92 autopilot OK"); process.exit(0);
