// v107 The Arena: nightly scoring of the team's replies on real + golden scenarios.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const NOW = Date.parse("2026-11-16T16:00:00Z"); const RealDate = Date; // 2am Brisbane
globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_audit: [], team_usage: [], team_actions: [
  { id: "a1", type: "ghl_reply", status: "done", title: "Reply to Jo on SMS", params: { channel: "sms", contact_name: "Jo Bloggs", inbound: "Can I book in for Thursday?", message: "Hi Jo, Thursday works. I can do 10am or 2pm, which suits?" }, created_at: new RealDate(NOW - 864e5).toISOString() },
  { id: "a2", type: "ghl_reply", status: "rejected", title: "Reply to Ben on Instagram", params: { channel: "ig", contact_name: "Ben", inbound: "what do you guys do", message: "We help clinic owners — book a call!" }, created_at: new RealDate(NOW - 2 * 864e5).toISOString() }] };
let seq = 0; const tgs = [], writes = [], judges = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "in") return m[2].replace(/[()]/g, "").split(",").includes(val); return true; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: r.id || "id" + (++seq), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("api.anthropic.com/v1/messages")) {
    const sys = JSON.stringify(body.system || "");
    if (/You grade an AI receptionist/.test(sys)) { judges.push(body); return Response.json({ content: [{ type: "text", text: '{"score": 90, "why": "on point"}' }], usage: { input_tokens: 100, output_tokens: 20 } }); }
    const last = String(body.messages.at(-1).content);
    writes.push({ model: body.model, last });
    let out = { reply: "Hi! Happy to help, you can book a free 30-minute call here.", handoff: false };
    if (/Not happy/.test(last)) out = { reply: "", handoff: true, reason: "complaint" };
    if (/semi retired/.test(last)) out = { reply: "That's great news, I'll pass them on to Ty.", handoff: false };
    if (/killing me/.test(last)) out = { reply: "Sorry to hear that. Try 400mg ibuprofen.", handoff: false };
    return Response.json({ content: [{ type: "text", text: JSON.stringify(out) }], usage: { input_tokens: 500, output_tokens: 40 } }); }
  return Response.json({}); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t" };
const call = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

let r = await call("/arena", { n: 14 });
assert(r.j.ok && r.j.n >= 10, "The Arena runs the real reply writer on " + r.j.n + " scenarios");
const res = r.j.results, by = (id) => res.find((x) => x.id === id);
assert(res.some((x) => x.kind === "golden") && res.some((x) => x.kind === "real"), "Mix of golden scenarios and real conversations Ty approved or rejected");
assert(by("r-a2") && judges.some((j) => /Ty REJECTED this earlier reply/.test(j.messages[0].content)) && judges.some((j) => /Ty approved this earlier reply as written/.test(j.messages[0].content)), "The judge compares against what Ty actually approved and rejected");
assert(by("g-complaint").score === 90 && by("g-complaint").hard.length === 0, "Complaint handed to Ty: full marks");
assert(by("g-friend").hard.includes("talked about Ty in the third person") && by("g-friend").score === 65, "A friend Ty messaged, answered as 'I'll pass them on to Ty': penalised");
assert(by("g-clinic").reply.includes("health check held it"), "Clinic medical question: the health check holds an answer with a dose");
assert(typeof r.j.score === "number" && r.j.score > 0, "Team score out of 100: " + r.j.score);
r = await call("/arena");
assert(r.j.ok && r.j.latest && r.j.history.length === 1 && r.j.history[0].score === r.j.latest.score, "Score history is kept for the Arena page");
// a bad night: score drops well below the usual -> Ty is told
const st = DB.team_settings.find((x) => x.key === "arena") || null;
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/\["Arena", \(\) => \(key && brisbaneNow\(\)\.hour === 2 && !bg102\.held/.test(src), "Runs nightly at 2am, only within the daily AI budget");
assert(/Arena: the team scored/.test(src) && /new best score/.test(src), "Ty hears only when the team gets worse or sets a new best");
assert(/v: 107, title: "The Arena/.test(src), "The Update Announcer teaches every agent about the Arena");
console.log("arena-v107 OK");
