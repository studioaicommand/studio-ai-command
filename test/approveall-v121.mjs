// v121 One tap on Telegram approves every Growth Pack email waiting.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const O = "https://studioflowandsystems.app";
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_audit: [], team_memory: [], team_usage: [], studio_command_jobs: [],
  team_actions: [1, 2, 3].map((i) => ({ id: "00000000-0000-4000-8000-00000000000" + i, status: "pending", type: "outreach_email", department: "head_of_sales", title: "Growth Pack " + i, params: { source: "growth_pack", email: "a" + i + "@biz.test", subject: "Hi", body: "Hello there, a few things for you.", business_name: "Biz " + i } }))
    .concat([{ id: "00000000-0000-4000-8000-000000000009", status: "pending", type: "ghl_reply", title: "A reply", params: { message: "x" } }]) };
let seq = 0; const tg = [], sent = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq)\.(.*)$/); if (!m) return true; const key = k.includes("->>") ? k.split("->>") : null; const val = key ? String((r[key[0]] || {})[key[1]] ?? "") : String(r[k] ?? ""); return m[1] === "eq" ? val === m[2] : val !== m[2]; });
const mock = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") return Response.json(t.filter((r) => match(r, q)));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: r.id || "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("leadconnectorhq.com")) { if (/contacts\/search|duplicate/.test(u)) return Response.json({ contacts: [] }); if (/contacts\/upsert|\/contacts\/$/.test(u)) return Response.json({ contact: { id: "ct" + (++seq) }, new: true }); if (/conversations\/messages/.test(u)) { sent.push(body); return Response.json({ messageId: "m" + seq }); } return Response.json({ contact: { id: "ct" + (++seq) } }); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
Object.defineProperty(globalThis, "fetch", { value: mock, writable: true, configurable: true });
const w = (await import(W)).default;
const qsent = [];
const env = { COMMAND_QUEUE: { send: async (b) => { qsent.push(b); } }, COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", TELEGRAM_BOT_TOKEN: "t", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", PUBLIC_ORIGIN: O };
const SECRET = (await import("node:crypto")).createHash("sha256").update("k|telegram").digest("hex").slice(0, 48);
const wu = [];
await w.fetch(new Request(O + "/api/v1/telegram/hook", { method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": SECRET }, body: JSON.stringify({ update_id: 991, callback_query: { id: "cb1", data: "pa:1", from: { username: "ty" }, message: { message_id: 5, chat: { id: 42 }, text: "Today's Growth Pack emails" } } }) }), env, { waitUntil(p) { wu.push(p); } });
await Promise.all(wu); for (const b of qsent.splice(0)) await w.queue({ messages: [{ body: b, ack() {}, retry() {} }] }, env, { waitUntil(p) { wu.push(p); } }); await Promise.all(wu);
const gp = DB.team_actions.filter((a) => a.params?.source === "growth_pack");
assert(gp.every((a) => a.status !== "pending"), "One tap on Approve all approves every Growth Pack email waiting");
assert(DB.team_actions.find((a) => a.type === "ghl_reply").status === "pending", "Other cards (like replies) are left for Ty to decide one by one");
assert(tg.some((x) => /Approved \d+ Growth Pack email/.test(x?.text || "") || /On it: approving now/.test(x?.text || "")), "Ty sees it confirmed on Telegram");
console.log("approveall-v121 OK");
