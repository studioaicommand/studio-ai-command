// v57: Telegram Approve answers instantly and runs straight away; daily email limit is editable; held approvals keep their approval.
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_actions: [{ id: "a1", type: "owner_task", title: "Call Matty", department: "chief_of_staff", status: "pending", params: {}, created_at: new Date().toISOString() }, { id: "a2", type: "campaign_enrol", title: "Email Helcro", department: "head_of_marketing", status: "pending", params: { email: "x@helcro.test", subject: "Hello there", body: "x".repeat(60) }, result: { held: "Daily limit", approved: true }, created_at: new Date().toISOString() }], studio_command_jobs: [] };
let seq = 0; const log = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "is") return m[2] === "null" ? r[k] == null : true; return true; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); log.push("db:" + m + ":" + path); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: path === "studio_command_jobs" ? crypto.randomUUID() : "id" + (++seq), created_at: new Date().toISOString(), ...r })); if (path === "team_settings") { for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } } else t.push(...rows); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.telegram.org")) { const meth = u.split("/").pop(); log.push("tg:" + meth + (meth === "editMessageText" ? ":" + (body.text || "").split("\n").pop() : meth === "answerCallbackQuery" ? ":" + body.text : "")); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("api.anthropic.com")) return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
  return new Response("{}", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", COMMAND_QUEUE: { send: async () => { log.push("queue:send"); } } };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const SECRET = crypto.createHash("sha256").update("k|telegram").digest("hex").slice(0, 48);
const t0 = Date.now();
const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/telegram/hook", { method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": SECRET }, body: JSON.stringify({ update_id: 991, callback_query: { id: "cb1", data: "ap:a1", from: { username: "studioflowandsystems" }, message: { message_id: 5, chat: { id: 42 }, text: "Approve: Call Matty?" } } }) }), env, ctx);
assert(r.status === 200, "Webhook answers Telegram");
assert(log[0] === "tg:answerCallbackQuery:⏳ On it: approving now", "The button answers before anything else happens: " + log[0]);
assert(log.some((x) => x === "tg:editMessageText:⏳ Approving…"), "The card switches to 'Approving…' and the buttons disappear (no double taps)");
await flush();
assert(DB.team_actions.find((a) => a.id === "a1").status === "done", "Approved straight away, without waiting for the job queue");
assert(log.some((x) => /^tg:editMessageText:✅ Done: Call Matty/.test(x)), "Then the card shows the result");
const job = DB.studio_command_jobs.at(-1);
assert(job && job.status === "completed", "The saved job is marked complete (so the queue won't run it twice)");
// daily email limit
const call = async (path, b) => { const x = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); await flush(); return x.json(); };
let d = await call("/outreach/daily");
assert(d.email_cap === 25, "Default minimum is 25 a day");
await call("/outreach/daily", { email_cap: 40 });
d = await call("/outreach/daily");
assert(d.email_cap === 40 && DB.team_settings.find((x) => x.key === "campaign").value.daily_cap === 40, "Ty can set the daily email number (40)");
await call("/outreach/daily", { email_cap: 900 });
assert(DB.team_settings.find((x) => x.key === "campaign").value.daily_cap === 40, "Silly numbers are ignored (max 200)");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/Minimum emails per day/.test(src) && /sends by itself \(no need to tap again\)/.test(src) && /heldApprovedTick\(e\)/.test(src), "Outreach shows the limit; held approvals show they'll send by themselves and a 15-minute check sends them");
console.log("v57 approvals OK");
