// v46: AI budget guard. Real spend from Anthropic's cost report, warnings, background pause, and plain words
// (plus one Telegram alert) when Anthropic's own spend limit is hit.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 7 } }], team_audit: [], team_usage: [] };
const tg = [], hits = [];
let seq = 0, spentCents = 0, capped = false;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|gte|in)\.(.*)$/); if (!m) return true; if (m[1] === "in") return m[2].replace(/[()]/g, "").split(",").includes(String(r[k])); return m[1] === "eq" ? String(r[k] ?? "") === m[2] : String(r[k] ?? "") >= m[2]; });
globalThis.fetch = async (u, init = {}) => {
  u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.startsWith("https://sb.test/rest/v1/")) {
    const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); }
    return Response.json([]);
  }
  if (u.startsWith("https://api.anthropic.com/v1/organizations/cost_report")) { hits.push(init.headers?.["x-api-key"]); return Response.json({ data: [{ starting_at: "x", ending_at: "y", results: [{ amount: String(spentCents * 0.6), currency: "USD" }] }, { results: [{ amount: String(spentCents * 0.4), currency: "USD" }] }], has_more: false, next_page: null }); }
  if (u.includes("api.telegram.org")) { tg.push(body?.chat_id + ":" + (body?.text || "")); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("api.anthropic.com/v1/messages")) { if (capped) return Response.json({ type: "error", error: { type: "invalid_request_error", message: "You have reached your specified API usage limits. You will regain access on 2026-12-01 at 00:00 UTC." } }, { status: 400 }); return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  return Response.json({});
};
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SEAL_KEY: "s".repeat(64), SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", ANTHROPIC_ADMIN_KEY: "sk-ant-admin-x", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const bg = [];
const ctx = { waitUntil(p) { bg.push(p); } };
const tick = async () => { await w.scheduled({ cron: "0 * * * *", scheduledTime: Date.now() }, env, ctx); await Promise.all(bg.splice(0)); };
const call = async (path, b, e = env) => { const r = await w.fetch(new Request("https://studioflowandsystems.app" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), e, ctx); return { s: r.status, j: await r.json().catch(() => ({})) }; };

let x = await call("/api/v1/team/costs/budget", { monthly_usd: 300, warn_pct: 99, pause_pct: 50 });
assert(x.s === 400, "Pause level can't be below the warning level");
spentCents = 12000;
x = await call("/api/v1/team/costs/budget", { monthly_usd: 300 });
assert(x.j.ok && x.j.status.spent_usd === 120 && x.j.status.pct === 40 && hits[0] === "sk-ant-admin-x", "Ty sets a US$300 budget; Command reads the real spend from Anthropic (US$120, 40%)");
assert(!tg.length, "No alert under the warning level");
spentCents = 25000;
tg.length = 0;
await tick();
assert(tg.filter((t) => /83% of your monthly budget/.test(t)).length === 1, "At 80%+ Ty gets one Telegram warning");
await tick();
assert(tg.filter((t) => /of your monthly budget/.test(t)).length === 1, "The warning isn't repeated every hour");
spentCents = 29000;
await tick();
assert(tg.some((t) => /Background AI work is paused/.test(t) && /Customer chat, inbox replies and phone keep running/.test(t)), "At 95% background AI work pauses, and Ty is told what keeps running");
x = await call("/api/v1/team/costs/budget");
assert(x.j.status.paused === true && x.j.budget.monthly_usd === 300, "Command › Money shows the pause");
x = await call("/api/v1/team/costs/budget", { monthly_usd: 500 });
assert(x.j.status.paused === false && x.j.status.pct === 58, "Raising the budget unpauses it straight away");
x = await call("/api/v1/team/costs/budget", {}, { ...env, ANTHROPIC_ADMIN_KEY: undefined });
x = await call("/api/v1/team/costs/budget", undefined, { ...env, ANTHROPIC_ADMIN_KEY: undefined });
assert(x.j.has_admin_key === false, "Without an Admin key, Money explains how to add one");
// Anthropic's own limit: plain words and one Telegram alert, not a raw error.
capped = true; tg.length = 0;
x = await call("/api/v1/operator/chat", { message: "who called today?" });
const err = JSON.stringify(x.j);
assert(/Anthropic monthly spend limit/.test(err) && /console\.anthropic\.com/.test(err) && !/regain access/.test(err), "Studio AI explains the spend limit in plain words and says where to fix it");
assert(tg.filter((t) => /AI paused: Anthropic spend limit reached/.test(t)).length === 1, "Ty gets one Telegram alert");
await call("/api/v1/operator/chat", { message: "again" });
assert(tg.filter((t) => /AI paused: Anthropic spend limit reached/.test(t)).length === 1, "It doesn't repeat the alert every message");
console.log("v46 AI budget guard: all passed");
process.exit(0);
