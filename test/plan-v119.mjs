// v119 Homepage concept on open + daily plan of attack.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const O = "https://studioflowandsystems.app";
const T1 = "1".repeat(40), T2 = "2".repeat(40);
const old = new Date(Date.now() - 40 * 864e5).toISOString(), now = new Date().toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }, { key: "dm_queue", value: { cfg: {}, items: [{ id: "q1", status: "ready", channel: "instagram" }, { id: "q2", status: "ready", channel: "facebook" }, { id: "q3", status: "sent", channel: "facebook" }] } }],
  agent_demos: [{ token: T1, prospect_id: "p1", business_name: "Cold Plumbing", website: "https://coldplumb.test", vertical: "trades", quality: "good", kb: {}, views: 0, chats: 0, created_at: old, last_view_at: null },
    { token: T2, prospect_id: "p2", business_name: "Warm Dental", website: "https://warm.test", vertical: "dental", quality: "good", kb: {}, views: 2, chats: 1, created_at: old, last_view_at: now, last_chat_at: now }],
  agent_prospects: [{ id: "p1", business_name: "Cold Plumbing", website: "https://coldplumb.test", email: "jobs@coldplumb.test", email_source_url: "https://coldplumb.test", phone: "07 3111 1111", status: "to_send", vertical: "trades", leak: "No after-hours option", leak_report: {}, score: 5 },
    { id: "p2", business_name: "Warm Dental", website: "https://warm.test", phone: "07 3222 2222", status: "sent", vertical: "dental", leak_report: {}, score: 6, demo_token: T2 }],
  team_actions: [{ id: "a1", status: "pending", type: "ghl_reply", title: "Reply", params: {} }, { id: "a2", status: "pending", type: "outreach_email", title: "x", params: { source: "growth_pack" } }, { id: "a3", status: "pending", type: "outreach_email", title: "y", params: { source: "no_answer" } }],
  team_audit: [{ action: "video_script", summary: "Video script for Midway Dental Clinic", created_at: now }], team_memory: [], team_usage: [] };
let seq = 0; const tg = [], qsent = [], writes = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is|not\.is|gte)\.(.*)$/); if (!m) return true; const val = r[k];
  if (m[1] === "eq") return String(val ?? "") === m[2]; if (m[1] === "neq") return String(val ?? "") !== m[2]; if (m[1] === "in") return m[2].replace(/[()]/g, "").split(",").includes(String(val)); if (m[1] === "is") return val == null; if (m[1] === "not.is") return val != null; if (m[1] === "gte") return val != null && String(val) >= m[2]; return true; });
const mock = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { let rows = t.filter((r) => match(r, q)); const lim = +(q.match(/limit=(\d+)/) || [])[1]; return Response.json(lim ? rows.slice(0, lim) : rows); }
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), created_at: new Date().toISOString(), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("cloudflare-dns.com")) return Response.json({ Status: 0, Answer: [{ type: 15, data: "10 mx.test." }] });
  if (u.includes("api.anthropic.com")) { const sys = JSON.stringify(body.system || "");
    if (sys.includes("ONE short re-approach email")) { writes.push(sys); const pack = body.messages[0].content.match(/pack_url: (\S+)/)[1]; return Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name: "save_email", input: { subject: "A few things", body: "Hi there,\n\nI put a few things together for you.\n\n" + pack + "\n\nWorth a look?", phone_opener: "Hi, it's Ty." } }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } }); }
    return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
Object.defineProperty(globalThis, "fetch", { value: mock, writable: true, configurable: true });
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { COMMAND_QUEUE: { send: async (b) => { qsent.push(b); } }, COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1", PUBLIC_ORIGIN: O };
const run = async (req) => { const jobs = []; const r = await w.fetch(req, env, { waitUntil(p) { jobs.push(p); } }); const t = await r.text(); await Promise.all(jobs); return { r, t }; };
const call = async (path, b) => { const { r, t } = await run(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined })); let j = {}; try { j = JSON.parse(t); } catch {} return { s: r.status, j }; };
const setting = (k) => DB.team_settings.find((x) => x.key === k)?.value;

// Cold pack: no concept built up front, the drip still writes to them
let x = await call("/growth-pack/run", {});
assert(!setting("wsd:" + T1) && DB.team_actions.some((a) => a.params?.source === "growth_pack" && a.params.business_name === "Cold Plumbing"), "Cold business: no homepage concept built up front, but they still get their Growth Pack email");
assert(/designed for them the moment they open the link/.test(writes[0]), "The email can honestly mention the homepage concept (it's designed when they open it)");
// They open it: concept requested in the background
let { t } = await run(new Request(O + "/demo/" + T1 + "/pack", { headers: { "user-agent": "Mozilla/5.0 (iPhone)" } }));
assert(/Being designed for you right now/.test(t) && /Designing now/.test(t), "Opening the pack shows the homepage concept being designed");
assert(setting("packbuild:" + T1)?.status === "requested" && qsent.some((b) => b.kind === "pack_concept" && b.token === T1), "The open starts the homepage concept build in the background (job queue)");
qsent.length = 0;
await run(new Request(O + "/demo/" + T1 + "/pack", { headers: { "user-agent": "Mozilla/5.0 (iPhone)" } }));
assert(qsent.length === 0, "Opening again doesn't start a second build");
// Ty's own view never triggers a build
const { createHash } = await import("node:crypto");
DB.team_settings.push({ key: "wsd:" + T2, value: null });
qsent.length = 0;
await run(new Request(O + "/demo/" + T2 + "/pack?preview=1"));
assert(qsent.length === 0, "Previews never trigger a build");
// Queue worker: when it's already built, it just marks it done
DB.team_settings.push({ key: "wsd:" + T1, value: { name: "Cold Plumbing", spec: { s: 1 } } });
await w.queue({ messages: [{ body: { kind: "pack_concept", token: T1 }, ack() {}, retry() {} }] }, env, { waitUntil() {} });
assert(setting("packbuild:" + T1)?.status === "done" && !(setting("pack_build_queue")?.tokens || []).includes(T1), "The queue worker finishes the job and clears it");
({ t } = await run(new Request(O + "/demo/" + T1 + "/pack?preview=1")));
assert(t.includes("/demo/" + T1 + "/site") && !/Designing now/.test(t), "Next time they open it, the homepage concept is there");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/const warm = \(d\.views \|\| 0\) > 0 \|\| \(d\.chats \|\| 0\) > 0 \|\| \(\+p\.score \|\| 0\) >= 8;/.test(src) && /var WSD_IMG_MAX = 6;/.test(src), "Warm or top-scoring businesses still get theirs up front; generated images capped at 6 (their own photos first)");

// The daily plan
x = await call("/outreach-plan");
const P = x.j;
assert(P.ok && P.hot.some((h) => /Warm Dental/.test(h.name) && /front desk/.test(h.why)) && P.hot.some((h) => /Cold Plumbing/.test(h.name) && /Growth Pack/.test(h.why)), "Hot first: who opened their Growth Pack or tried their front desk in the last day");
assert(P.waiting.replies === 1 && P.waiting.growth_pack >= 1 && P.waiting.no_answer === 1, "What's waiting for Ty's OK, by type");
assert(P.calls.length >= 1 && P.dms_ready === 2 && P.videos === 1, "Call list, DMs ready and videos to film");
assert(/Today's plan of attack/.test(P.text) && /8:00/.test(P.text) && /Power hour/.test(P.text) && /Approvals/.test(P.text) && /DMs/.test(P.text) && /Film videos/.test(P.text) && /Last 7 days/.test(P.text), "One clear plan with times: hot first, power hour of calls, approvals, DMs, videos, warm network, wrap up");
assert(/\["Outreach plan", out\(\(\) => outreachPlanDaily\(e\)\)\]/.test(src) && /bn\.hour !== 7/.test(src) && /fn\("outreach_plan"/.test(src), "Sent on Telegram every weekday at 7am, and Command can give it any time");
console.log("plan-v119 OK");
