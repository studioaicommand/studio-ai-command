// v153 Logins stay: sign in once in a normal (not automated) Chrome window on Command Chrome's profile, saved with the Mac's Keychain.
let AG = "7";
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
let seq = 0;
const TOK = "a".repeat(64), now = () => new Date().toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }, { key: "mac_link", value: { token_hash: crypto.createHash("sha256").update(TOK).digest("hex"), last_seen: now(), agent: 7 } }], team_actions: [], team_audit: [], team_usage: [], agent_prospects: [] };
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


DB.team_settings.push({ key: "dm_queue", value: { cfg: { handles: {} } } });
const ml = () => DB.team_settings.find((x) => x.key === "mac_link").value;
let r = await call("/dm-queue/login", {});
assert(r.j.ok && r.j.normal && r.j.sites[0] === "Google" && r.j.sites.includes("Instagram") && /normal Chrome window/.test(r.j.note) && /Remember me/.test(r.j.note), "With helper v7, Log in opens a normal Chrome window with Google and the socials, and says to tick Remember me");
assert(!task() || task().kind !== "social_login", "No automated login task is started (Google refuses automated browsers)");
assert(ml().signin.state === "requested" && ml().signin.urls[0] === "https://accounts.google.com/", "The request waits for the helper");
r = await agent("next");
assert(r.signin && r.signin.urls.length === 4 && ml().signin.state === "sent", "The helper picks it up once");
r = await agent("next");
assert(!r.signin, "...and only once");
await agent("signin", { state: "open" });
r = await call("/dm-queue");
assert(r.j.browser.signin.state === "open" && r.j.browser.signin.sites.includes("Google"), "Command shows the sign-in window is open on the Mac");
await agent("signin", { state: "done" });
assert(ml().signin.state === "done" && ml().signin.done_at, "Closing the window is recorded");
r = await w.fetch(new Request(O + "/api/v1/link/signin", { method: "POST", headers: { Authorization: "Bearer " + "b".repeat(64) }, body: "{}" }), env, { waitUntil() {} });
assert(r.status === 401, "Only Ty's own helper can report");
AG = "6"; r = await agent("next");
assert(r.update === true, "Older helpers update themselves to v7 first");
const ag = fs.readFileSync("/home/claude/w/link-agent.mjs", "utf8");
assert(/ignoreDefaultArgs: \['--use-mock-keychain', '--password-store=basic'\]/.test(ag), "Command Chrome keeps logins locked with the Mac's real Keychain, not Playwright's stand-in key");
assert(!/AutomationControlled|navigator\.webdriver/.test(ag) && /--enable-automation/.test(ag) === false, "It doesn't hide that it's automated (the sign-in window is a normal Chrome instead)");
assert(/'-na', 'Google Chrome', '--args'/.test(ag) && /--user-data-dir=' \+ PROFILE/.test(ag) && /while \(chromeOpen\(\)/.test(ag), "The sign-in window uses the same profile, and the helper waits until Ty closes it");
assert(/await closeBrowser\(\); \/\/ close Command Chrome cleanly first/.test(ag) && /process\.on\(sig/.test(ag) && /chmodSync\(DIR, 0o700\)/.test(ag), "Chrome closes cleanly before restarts, and the folder is Ty's only");
const src2 = fs.readFileSync(W, "utf8");
assert(JSON.parse((src2.match(/var LINK_AGENT_SRC = (".*");/) || [])[1] || "null") === ag, "Command serves this exact helper for self-update");
