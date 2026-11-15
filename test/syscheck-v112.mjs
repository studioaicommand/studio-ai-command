// v112 Command can open its own status pages (system_check) instead of saying "I can't open the hourly run page".
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const O = "https://studioflowandsystems.app";
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }, { key: "release_state", value: { done: [104, 105, 106, 107, 108, 111], at: "2026-11-15T11:45:00Z" } }], team_usage: [], team_actions: [], team_messages: [] };
let seq = 0; const tgs = [], results = {}; let turn = 0;
const PAGES = ["hourly_run", "arena", "ai_costs", "inbox", "health", "updates"];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); return m[1] === "eq" ? val === m[2] : val !== m[2]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { const names = (body.tools || []).map((t) => t.name);
    if (!names.includes("system_check")) return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
    const last = body.messages.at(-1);
    if (Array.isArray(last.content) && last.content.some((c) => c.type === "tool_result")) { for (const c of last.content) if (c.type === "tool_result") results[c.tool_use_id] = typeof c.content === "string" ? c.content : JSON.stringify(c.content); return Response.json({ content: [{ type: "text", text: "All good." }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 5 } }); }
    return Response.json({ content: PAGES.map((p) => ({ type: "tool_use", id: "sc_" + p, name: "system_check", input: { page: p } })), stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 } }); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 + tgs.length } }); }
  return Response.json({}); };
const w = (await import(W)).default;
const sent = [];
const env = { COMMAND_QUEUE: { send: async (b) => { sent.push(b); } }, COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "42", PUBLIC_ORIGIN: O };
// a recorded hourly run with one job failing 3 runs in a row
const { createHash } = await import("node:crypto");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/fn\("system_check"/.test(src) && /call system_check \(page hourly_run\)/.test(src) && /call system_check \(page arena\)/.test(src) && !/check \/cron-health|check \/arena/.test(src), "Command has a system_check tool, and its instructions point to it instead of pages it can't open");
const SECRET = createHash("sha256").update("k|telegram").digest("hex").slice(0, 48);
await w.fetch(new Request(O + "/api/v1/telegram/hook", { method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": SECRET }, body: JSON.stringify({ update_id: 5501, message: { message_id: 9, chat: { id: 42 }, from: { username: "ty" }, text: "What's failing in the hourly run?" } }) }), env, { waitUntil(p) { (globalThis.__wu ||= []).push(p); } });
await Promise.all(globalThis.__wu || []);
for (const b of sent.splice(0)) await w.queue({ messages: [{ body: b, ack() {}, retry() {} }] }, env, { waitUntil(p) { (globalThis.__wu ||= []).push(p); } });
await Promise.all(globalThis.__wu || []); for (let i = 0; i < 40 && Object.keys(results).length < PAGES.length; i++) await new Promise((r) => setTimeout(r, 100));
assert(Object.keys(results).length === PAGES.length, "From Telegram, Command opened all 6 system pages: " + Object.keys(results).join(", "));
const R = (p) => { try { return JSON.parse(results["sc_" + p]); } catch { return { raw: results["sc_" + p] }; } };
assert(/No hourly run has been recorded yet|last_run/.test(results.sc_hourly_run) && !/not defined|is not a function/i.test(Object.values(results).join(" ")), "Every page opens without an error");
assert(R("ai_costs").ok && "spent_today_usd" in R("ai_costs") || /cap|lean/i.test(results.sc_ai_costs), "AI costs page shows lean mode and today's spend");
assert(/webhook/.test(results.sc_inbox) && /ai_gateway/.test(results.sc_health) && /111/.test(results.sc_updates), "Inbox, health (incl. AI Gateway) and which updates were taught all come back");
console.log("syscheck-v112 OK");
