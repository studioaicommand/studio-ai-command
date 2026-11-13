// v88 Command Chrome: friends scan to a warm list, warm hellos, and sending an approved batch (paced, exact words, no other sends).
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
let seq = 0;
const TOK = "a".repeat(64), now = () => new Date().toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }, { key: "mac_link", value: { token_hash: crypto.createHash("sha256").update(TOK).digest("hex"), last_seen: now(), agent: 2 } }], team_actions: [], team_audit: [], team_usage: [], agent_prospects: [] };
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|in|is)\.(.*)$/); if (!m) return true; if (m[1] === "eq") return String(r[k] ?? "") === m[2]; if (m[1] === "is") return m[2] === "true" ? r[k] === true : r[k] == null; return m[2].replace(/[()]/g, "").split(",").includes(String(r[k])); });
let nextAct = null; const tg = [];
const toolUse = (name, input) => Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name, input }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } });
let writer = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { let rows = t.filter((r) => match(r, q)); const lim = +(q.match(/limit=(\d+)/) || [])[1]; return Response.json(lim ? rows.slice(0, lim) : rows); }
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), created_at: now(), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { const s = JSON.stringify(body.system || "");
    if ((body.tools || []).some((t) => t.name === "browser_action")) return toolUse("browser_action", nextAct);
    if (s.includes("You are the DM Reviewer")) return toolUse("review_dm", { score: 9 });
    if (s.includes("You are the DM Writer")) return toolUse("save_dm", writer.shift() || { found: false });
    return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: O };
const call = (path, b) => w.fetch(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) }));
const agent = (path, b) => w.fetch(new Request(O + "/api/v1/link/" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOK, "X-SF-Agent": "2" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then((r) => r.json());
const task = () => DB.team_settings.find((x) => x.key === "browser_task")?.value;
const page = (url, els = []) => ({ url, title: "page", text: "page", elements: els });

// 1) friends scan on Facebook
let r = await call("/dm-queue/scan", { platform: "facebook", target: 3 });
assert(r.j.ok && task().kind === "friends_scan", "\"Scan my friends\" starts a scan in Command Chrome on Ty's Mac");
let n = await agent("next");
assert(n.task && /FRIENDS SCAN/.test(n.task.goal) && /facebook\.com\/search\/people/.test(n.task.start_url), "Command Link picks it up and opens Facebook's friend search");
nextAct = { kind: "save_people", why: "fits", people: [{ name: "Sarah Lane", profile_url: "https://www.facebook.com/sarah.lane.kinesiology?ref=x", headline: "Kinesiologist at Body Balance Brisbane" }, { name: "Not A Link", profile_url: "https://evil.example/x" }, { name: "Mark Chen", profile_url: "https://www.facebook.com/markchenchiro", headline: "Chiropractor, Spine Align" }] };
let a = await agent("step", { task_id: n.task.id, page: page("https://www.facebook.com/search/people/?q=coach") });
assert(DB.agent_prospects.length === 2 && DB.agent_prospects[0].leak_report.warm && DB.agent_prospects[0].leak_report.socials.facebook === "https://www.facebook.com/sarah.lane.kinesiology", "Coaches and practitioners from Ty's friends go onto the warm list (bad links ignored)");
nextAct = { kind: "save_people", why: "fits", people: [{ name: "Sarah Lane", profile_url: "https://www.facebook.com/sarah.lane.kinesiology" }, { name: "Jo Park", profile_url: "https://www.facebook.com/jopark.naturopath", headline: "Naturopath" }] };
a = await agent("step", { task_id: n.task.id, page: page("https://www.facebook.com/search/people/?q=naturopath") });
assert(DB.agent_prospects.length === 3 && task().status === "done", "No duplicates, and the scan stops at the number Ty asked for");

// 2) warm hellos, no pitch
writer = [{ found: true, hook: "kinesiologist Body Balance", message: "Hey Sarah! Love seeing Body Balance grow, how is the kinesiologist life treating you these days? 😊", why: "friend" },
  { found: true, hook: "chiropractor Spine Align", message: "Hey Mark, Studio Flow builds websites and AI receptionists for chiropractors like Spine Align, keen?", why: "pitch" },
  { found: true, hook: "naturopath practice", message: "Hi Jo, saw you have opened your own naturopath practice, that is huge! How did the first few months go?", why: "friend" }];
r = await call("/dm-queue/fill", { count: 3 });
let st = (await call("/dm-queue")).j;
const warm = st.ready.filter((x) => x.step === "warm");
assert(warm.length === 2 && warm.every((x) => x.channel === "facebook" && x.profile_url.startsWith("https://www.facebook.com/")) && !warm.some((x) => /Studio Flow/.test(x.message)), "Warm hellos are written for friends, and one that pitched was thrown out (" + r.j.skipped.map((x) => x.why).join(" | ") + ")");
assert(st.warm_count === 3 && st.browser.online, "The DM Desk shows the warm list and that Command Chrome is ready");

// 3) send the approved batch
r = await call("/dm-queue/send-batch", { ids: warm.map((x) => x.id) });
assert(r.j.ok && r.j.count === 2 && DB.team_audit.some((x) => x.action === "dm_batch_approved"), "Ty approves the batch once (every name and message shown), and that's logged");
n = await agent("next");
const it0 = task().dm.queue[0];
const els = [{ r: 1, tag: "div", type: "button", label: "Message" }, { r: 2, tag: "div", type: "textbox", label: "Aa" }, { r: 3, tag: "div", type: "button", label: "Press enter to send" }, { r: 4, tag: "div", type: "button", label: "Delete chat" }];
nextAct = { kind: "type", ref: 2, text: "my own words", why: "try to free-type" };
a = await agent("step", { task_id: n.task.id, page: page(it0.profile_url, els) });
assert(a.act.kind === "wait", "Command can't type its own words into a chat: only Ty's approved message");
nextAct = { kind: "type_dm", ref: 2, why: "type it" };
a = await agent("step", { task_id: n.task.id, page: page(it0.profile_url, els) });
assert(a.act.kind === "type" && a.act.text === it0.message && a.act.ref === 2, "type_dm types Ty's approved words exactly");
nextAct = { kind: "click", ref: 4, why: "oops" };
a = await agent("step", { task_id: n.task.id, page: page(it0.profile_url, els) });
assert(a.act.kind === "wait" && DB.team_actions.some((x) => x.type === "browser_step" && /Delete chat/.test(x.title)), "Anything else risky (like Delete chat) still needs its own approval");
DB.team_actions.find((x) => x.type === "browser_step").status = "rejected";
nextAct = { kind: "key", key: "Enter", why: "send" };
a = await agent("step", { task_id: n.task.id, page: page(it0.profile_url, els) });
assert(a.act.kind === "key" && a.act.key === "Enter", "Sending the approved message goes straight through (it was approved in the batch)");
nextAct = { kind: "dm_done", result: "sent", why: "sent" };
a = await agent("step", { task_id: n.task.id, page: page(it0.profile_url, els) });
st = (await call("/dm-queue")).j;
assert(st.waiting.some((x) => x.id === it0.id) && st.today.facebook === 1, "It's marked Sent in the DM Desk and counted for today");
a = await agent("step", { task_id: n.task.id, page: page(it0.profile_url, els) });
assert(a.act.kind === "wait" && Date.parse(task().dm.next_at) - Date.now() > 50000, "Then it waits 1 to 3 minutes before the next one, like a person");
task().dm.next_at = new Date(Date.now() - 1000).toISOString();
nextAct = { kind: "dm_done", result: "failed", why: "Messenger needs a login" };
a = await agent("step", { task_id: n.task.id, page: page(task().dm.queue[1].profile_url, []) });
a = await agent("step", { task_id: n.task.id, page: page("about:blank") });
st = (await call("/dm-queue")).j;
assert(task().status === "done" && /1 of 2 messages sent/.test(task().result) && st.ready.some((x) => x.id === task().dm.queue[1].id), "When the batch ends Ty gets a summary, and one that couldn't send goes back to his DM Desk");
const app = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
new Function(app);
assert(/Send ticked for me/.test(app) && /Scan my friends/.test(app) && /COMMAND CHROME ON YOUR MAC/.test(app), "The DM Desk has Scan my friends, Send ticked for me and the Command Chrome status");
console.log("socials-v88 OK");
