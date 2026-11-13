// v75 Monday report: real numbers and wins on Telegram every Monday 8am Brisbane, once, saved to Reports. Clients never see AI cost.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const now = Date.now(), ago = (d) => new Date(now - d * 864e5).toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }], team_reports: [], team_audit: [],
  team_actions: [{ type: "ghl_email", status: "done", decided_at: ago(1) }, { type: "outreach_email", status: "done", decided_at: ago(2) }, { type: "ghl_note", status: "done", auto: true, decided_at: ago(2) }, { type: "ghl_sms", status: "done", decided_at: ago(10) }, { type: "ghl_email", status: "pending" }],
  agent_prospects: [{ id: "p1", business_name: "Glow Lab", status: "won", created_at: ago(3), updated_at: ago(1), leak_report: { live_test: { result: "replied", reply_minutes: 42, replied_at: ago(2) } } }, { id: "p2", business_name: "Bright Dental", status: "replied", created_at: ago(20), updated_at: ago(2), leak_report: {} }],
  agent_demos: [{ token: "t", first_view_at: ago(1) }], team_usage: [{ cost_aud: 3.5, created_at: ago(1) }] };
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|in|gte|lt)\.(.*)$/); if (!m) return true; const val = r[k];
  if (m[1] === "eq") return String(val ?? "") === m[2]; if (m[1] === "in") return m[2].replace(/[()]/g, "").split(",").includes(String(val)); if (m[1] === "gte") return String(val || "") >= m[2]; return String(val || "") < m[2]; });
const tg = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { const parts = q.split("&"); const dup = parts.filter((x) => x.startsWith("decided_at=")); let rows = t.filter((r) => match(r, parts.filter((x) => !x.startsWith("decided_at=")).join("&"))); for (const d of dup) rows = rows.filter((r) => match(r, d)); return Response.json(rows); }
    if (m === "POST") { for (const r of [].concat(body)) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push({ id: "r" + t.length, ...r }); } return Response.json([].concat(body).map((r, i) => ({ id: "r" + i, ...r }))); }
    return Response.json([]); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("api.stripe.com")) { const sec = Math.floor(now / 1e3); const gte = +(u.match(/created%5Bgte%5D=(\d+)|created\[gte\]=(\d+)/) || [])[1] || 0; return Response.json({ data: gte > sec - 8 * 86400 ? [{ amount: 150000, paid: true, status: "succeeded", amount_refunded: 0 }, { amount: 49700, paid: true, status: "succeeded", amount_refunded: 0 }] : [{ amount: 99700, paid: true, status: "succeeded", amount_refunded: 0 }], has_more: false }); }
  return Response.json({}); };
globalThis.caches = undefined;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", STRIPE_SECRET_KEY: "sk_test", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const w = (await import(W)).default;
const call = (path, b) => w.fetch(new Request("https://studioflowandsystems.app" + path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: JSON.stringify(b || {}) }), env, { waitUntil() {} }).then((r) => r.json());
const r = await call("/api/v1/team/monday-report");
const t = String(r.text || "");
assert(r.ok && /Revenue: <b>\$1,997<\/b> from 2 payments ▲/.test(t), "Revenue from Stripe for last week, compared with the week before");
assert(/Messages sent with your OK: <b>2<\/b> ▲/.test(t) && /autopilot: 1/.test(t) && /Waiting for you now: 1/.test(t), "Messages sent, autopilot work and what's waiting");
assert(/Won: Glow Lab/.test(t) && /Replied: Bright Dental/.test(t) && /leak test in 42 min/.test(t), "Wins: deals won, replies and leak-test results");
assert(/AI cost: \$3\.50/.test(t), "Your copy shows AI cost");
assert(tg.length === 1 && DB.team_reports.some((x) => x.subkind === "monday_report"), "Sent on Telegram and saved in Reports");
const src = (await import("node:fs")).readFileSync(W.split("?")[0], "utf8");
assert(/bn\.dow !== 1 \|\| bn\.hour < 8/.test(src) && /sent\.date === bn\.date/.test(src) && /await mondayReport\(e\)/.test(src), "It runs by itself on Mondays from 8am Brisbane, once a week");
DB.team_settings.push({ key: "instance", value: { business_name: "Glow Lab Skin Clinic", product_name: "Glow Lab Command", owner_first: "Sarah", modules: {} } });
const w2 = (await import(W + "?client")).default;
const r2 = await w2.fetch(new Request("https://glow.studioflowandsystems.app/api/v1/team/monday-report", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: "{}" }), env, { waitUntil() {} }).then((x) => x.json());
assert(r2.ok && !/AI cost/.test(r2.text) && !/prospects researched/.test(r2.text), "A client's Monday report never shows AI cost or Studio's prospecting");
console.log("monday-v75 OK");
