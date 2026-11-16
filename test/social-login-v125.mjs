// v125 Log in to my socials: each site in its own tab, one ask, quiet waits (no window jumps), TikTok, helper self-update.
let AG = "6";
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
let seq = 0;
const TOK = "a".repeat(64), now = () => new Date().toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }, { key: "mac_link", value: { token_hash: crypto.createHash("sha256").update(TOK).digest("hex"), last_seen: now(), agent: 5 } }], team_actions: [], team_audit: [], team_usage: [], agent_prospects: [] };
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
const agent = (path, b) => w.fetch(new Request(O + "/api/v1/link/" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOK, "X-SF-Agent": AG }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then((r) => r.json());
const task = () => DB.team_settings.find((x) => x.key === "browser_task")?.value;
const page = (url, els = []) => ({ url, title: "page", text: "page", elements: els });
const fs = await import("node:fs");

// 1) tabbed login with a v5 helper
DB.agent_prospects = DB.agent_prospects || [];
DB.team_settings.push({ key: "dm_queue", value: { cfg: { handles: { tiktok: "tybrazel" } } } });
let r = await call("/dm-queue/login", {});
assert(r.j.ok && task().kind === "social_login" && task().login.tabs, "With the new helper, the login opens every site in its own tab");
assert(/TikTok/.test(r.j.sites.join()) && r.j.sites.length === 4, "TikTok is included when Ty has added his TikTok handle");
let n = await agent("next");
assert(/facebook\.com/.test(n.task.start_url), "Facebook opens in the first tab");
let a = await agent("step", { task_id: n.task.id, page: page("https://www.facebook.com/") });
assert(a.act.kind === "new_tab" && /instagram\.com/.test(a.act.url), "Instagram opens in a new tab");
a = await agent("step", { task_id: n.task.id, page: page(a.act.url) });
assert(a.act.kind === "new_tab" && /linkedin\.com/.test(a.act.url), "LinkedIn opens in a new tab");
a = await agent("step", { task_id: n.task.id, page: page(a.act.url) });
assert(a.act.kind === "new_tab" && /tiktok\.com/.test(a.act.url), "TikTok opens in a new tab");
const tabs = [{ i: 0, url: "https://www.facebook.com/" }, { i: 1, url: "https://www.instagram.com/accounts/login/" }, { i: 2, url: "https://www.linkedin.com/login" }, { i: 3, url: "https://www.tiktok.com/login", on: true }];
a = await agent("step", { task_id: n.task.id, page: { ...page("https://www.tiktok.com/login"), tabs } });
assert(a.act.kind === "switch_tab" && a.act.tab === 0, "Then it goes back to the Facebook tab so Ty starts there");
a = await agent("step", { task_id: n.task.id, page: { ...page("https://www.facebook.com/"), tabs } });
assert(task().status === "needs_ty" && /Facebook, Instagram, LinkedIn, TikTok/.test(task().ask) && /own tab/.test(task().ask) && a.act.kind === "wait" && a.act.quiet, "One ask for all of them, and the helper is told to stay still while Ty logs in");
a = await agent("step", { task_id: n.task.id, page: { quiet: true, url: "https://www.instagram.com/", elements: [], tabs } });
assert(a.act.kind === "wait" && a.act.quiet && task().status === "needs_ty", "While Ty is logging in it keeps waiting quietly (no screenshots needed)");
await call("/browser/continue", {});
a = await agent("step", { task_id: n.task.id, page: page("https://www.facebook.com/") });
assert(a.act.kind === "finish" && task().status === "done" && /Facebook, Instagram, LinkedIn, TikTok/.test(task().result), "After Continue it's done, logged in everywhere");

// 2) older helpers keep the one-tab flow and are told to update once
DB.team_settings.find((x) => x.key === "mac_link").value.agent = 4;
r = await call("/dm-queue/login", { sites: ["facebook", "instagram"] });
assert(r.j.ok && !task().login.tabs && /Set up again/.test(r.j.note), "An older helper keeps the old flow, and Ty is told how to update it once");
task().status = "done";

// 3) self-update
DB.team_settings.find((x) => x.key === "mac_link").value.agent = 5;
AG = "4"; n = await agent("next"); assert(!n.update, "Helpers older than v5 can't update themselves, so they aren't asked to");
AG = "5"; n = await agent("next"); assert(n.update === true, "A v5 helper is told a newer one is ready (it then updates itself)");
AG = String(+(/'X-SF-Agent': '(\d+)'/.exec(fs.readFileSync(new URL("../link-agent.mjs", import.meta.url), "utf8")) || [])[1]); n = await agent("next"); assert(!n.update, "A helper that's already current isn't asked to update");
const res = await w.fetch(new Request(O + "/api/v1/link/agent", { headers: { Authorization: "Bearer " + TOK } }), env, { waitUntil() {} });
const code = await res.text();
assert(res.ok && code === fs.readFileSync(new URL("../link-agent.mjs", import.meta.url), "utf8"), "The helper can download its latest self from Command (same as link-agent.mjs)");
const bad = await w.fetch(new Request(O + "/api/v1/link/agent", { headers: { Authorization: "Bearer nope" } }), env, { waitUntil() {} });
assert(bad.status === 401, "Nobody without the Mac's token can download it");
assert(/quiet = a\.kind === 'wait' && !!a\.quiet/.test(code) && /if \(quiet\)/.test(code) && +(/'X-SF-Agent': '(\d+)'/.exec(code) || [])[1] >= 5, "The helper stays still (no window jumps or screenshots) during quiet waits");
console.log("all good");
