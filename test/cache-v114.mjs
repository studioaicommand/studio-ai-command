// v114 Cheaper Command, same answers: tools + instructions cached for an hour, live snapshot moved after them,
// conversation tail cached between tool rounds. Nothing Command sees is removed.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const O = "https://studioflowandsystems.app";
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_usage: [], team_actions: [], studio_command_jobs: [] };
let seq = 0; const tgs = [], bodies = []; let mode = "ok", refused = 0;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); return m[1] === "eq" ? val === m[2] : val !== m[2]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { const names = (body.tools || []).map((t) => t.name);
    if (!names.includes("team_control")) return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
    if (mode === "refuse" && /"ttl"/.test(init.body)) { refused++; return Response.json({ type: "error", error: { type: "invalid_request_error", message: "cache_control.ttl: Extra inputs are not permitted" } }, { status: 400 }); }
    bodies.push(body);
    const last = body.messages.at(-1);
    if (Array.isArray(last.content) && last.content.some((c) => c.type === "tool_result")) return Response.json({ content: [{ type: "text", text: "All good." }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 5 } });
    return Response.json({ content: [{ type: "tool_use", id: "x" + (++seq), name: "system_check", input: { page: "health" } }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 } }); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 + tgs.length } }); }
  return Response.json({}); };
const w = (await import(W)).default;
const sent = [];
const env = { COMMAND_QUEUE: { send: async (b) => { sent.push(b); } }, COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "42", PUBLIC_ORIGIN: O };
const SECRET = (await import("node:crypto")).createHash("sha256").update("k|telegram").digest("hex").slice(0, 48);
let upd = 8800;
const say = async (text) => { const wu = []; await w.fetch(new Request(O + "/api/v1/telegram/hook", { method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": SECRET }, body: JSON.stringify({ update_id: ++upd, message: { message_id: upd, chat: { id: 42 }, from: { username: "ty" }, text } }) }), env, { waitUntil(p) { wu.push(p); } });
  await Promise.all(wu); for (const b of sent.splice(0)) await w.queue({ messages: [{ body: b, ack() {}, retry() {} }] }, env, { waitUntil(p) { wu.push(p); } }); await Promise.all(wu); };
const bps = (b) => (JSON.stringify(b).match(/"cache_control"/g) || []).length;

await say("how's the system?");
const [a1, a2] = bodies;
assert(a1 && a2, "Command made its two calls (ask a tool, then answer)");
assert(!/LIVE SNAPSHOT/.test(a1.system[0].text) && /^LIVE SNAPSHOT/.test(a1.system[1].text), "The live snapshot sits after the fixed instructions, not inside them");
assert(a1.system[0].cache_control?.ttl === "1h" && a1.tools.filter((t) => t.cache_control).length === 1 && a1.tools.find((t) => t.cache_control).cache_control.ttl === "1h", "Tools and instructions are cached for an hour");
assert(JSON.stringify(a2.messages.at(-1)).includes("cache_control") && bps(a1) <= 4 && bps(a2) <= 4, "The conversation so far is cached between tool rounds (within the 4-mark limit)");
// Same fixed part on the next message, even though the live data changed in between.
DB.team_actions.push({ id: "new1", status: "pending", type: "ghl_email", department: "head_of_sales", title: "New approval", created_at: new Date().toISOString() });
await say("and now?");
const b1 = bodies[2];
assert(b1.system[0].text === a1.system[0].text && JSON.stringify(b1.tools) === JSON.stringify(a1.tools), "Next message: the cached part is identical, so it's reused at a tenth of the price");
// Nothing removed: everything Command used to see is still there.
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/THE STUDIO AI CHARTER/.test(a1.system[0].text) && /BUSINESS BRIEF/.test(a1.system[0].text) && /YOU RUN THE TEAM/.test(a1.system[0].text) && a1.tools.length >= 60, "Same instructions, charter, business brief and every tool as before");
assert(a1.model === "claude-sonnet-5-5" || /sonnet/.test(a1.model), "Still the same model (Sonnet): no drop in quality");
assert(src.includes("withSnapshot ? commandSnapshotText(snapshot2) : \"\""), "Voice mode still gets the snapshot inside its instructions as before");
// If the API ever refuses the 1-hour setting, Command keeps working on the normal cache.
mode = "refuse"; bodies.length = 0;
await say("still there?");
assert(refused === 1 && bodies.length >= 1 && !/"ttl"/.test(JSON.stringify(bodies[0])) && tgs.some((t) => /All good/.test(t)), "If the 1-hour cache is refused, it retries once on the normal cache and Ty still gets his answer");
console.log("cache-v114 OK");
