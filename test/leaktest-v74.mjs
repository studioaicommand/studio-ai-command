// v74 Live Leak Test: honest enquiry only with Ty's yes, reply time measured from the GHL inbox, result saved for outreach.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
let seq = 0;
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }], team_actions: [], team_audit: [], team_usage: [], team_memory: [], team_threads: [], team_messages: [], sec_settings: [],
  agent_prospects: [{ id: "p1", business_name: "Glow Lab Skin", email: "hello@glowlab.test", phone: "+61400000001", status: "researched", leak_report: { score: 62 } }, { id: "p2", business_name: "No Contact Co", status: "researched", leak_report: {} }] };
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|in|is)\.(.*)$/); if (!m) return true; if (m[1] === "eq") return String(r[k] ?? "") === m[2]; if (m[1] === "is") return m[2] === "true" ? r[k] === true : r[k] == null; return m[2].replace(/[()]/g, "").split(",").includes(String(r[k])); });
let scenario = null; const ghl = [], tg = [];
let inboxMsgs = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { let rows = t.filter((r) => match(r, q)); if (/order=created_at\.desc/.test(q)) rows = rows.slice().reverse(); const lim = +(q.match(/limit=(\d+)/) || [])[1]; return Response.json(lim ? rows.slice(0, lim) : rows); }
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), created_at: new Date().toISOString(), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { const done = JSON.stringify(body.messages || []).includes("tool_result");
    if (!done && scenario) return Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name: "propose_leak_test", input: scenario }], stop_reason: "tool_use", usage: { input_tokens: 1, output_tokens: 1 } });
    return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("leadconnectorhq.com")) { ghl.push(m + " " + u.split(".com")[1] + " " + JSON.stringify(body || {}).slice(0, 120));
    if (u.includes("/contacts/upsert")) return Response.json({ contact: { id: "c-glow" } });
    if (u.includes("/conversations/search")) return Response.json({ conversations: [{ id: "conv1", contactId: "c-glow" }] });
    if (/\/conversations\/conv1\/messages/.test(u)) return Response.json({ messages: { messages: inboxMsgs } });
    return Response.json({ ok: true, messageId: "m1" }); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1", PUBLIC_ORIGIN: O, INBOX_SECRET: "inb" };
const call = (path, b) => w.fetch(new Request(O + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) }));
const act = () => DB.team_actions.filter((a) => a.type === "leak_test");

scenario = { prospect_id: "p1", channel: "email", subject: "Booking question", message: "Hi! I'm a new customer wanting a facial this week", reason: "measure reply" };
await call("/api/v1/team/chat", { department: "head_of_sales", message: "leak test glow lab" });
assert(act().length === 0, "Pretending to be a customer is refused: the message has to say it's from Ty at Studio Flow");
scenario = { prospect_id: "p2", channel: "email", message: "Hi, Ty from Studio Flow & Systems here. Do you take bookings on Saturdays?", reason: "x" };
await call("/api/v1/team/chat", { department: "head_of_sales", message: "leak test" });
assert(act().length === 0, "No test without a published email or phone for the business");
scenario = { prospect_id: "p1", channel: "email", subject: "Quick question", message: "Hi, Ty from Studio Flow & Systems here. Do you take new facial bookings on Saturdays?", reason: "measure reply time" };
await call("/api/v1/team/chat", { department: "head_of_sales", message: "leak test glow lab" });
const a = act()[0];
assert(a && a.status === "pending" && !a.auto && /Live leak test: Glow Lab Skin by email/.test(a.title) && !ghl.some((x) => /^POST \/conversations\/messages/.test(x)), "An honest test waits in Approvals and nothing is sent yet");
await call("/api/v1/team/actions/" + a.id + "/approve", {});
assert(act()[0].status === "done" && ghl.some((x) => /POST \/conversations\/messages .*"type":"Email"/.test(x)) && ghl.some((x) => /leak-test/.test(x)), "After Ty approves, one email goes out from GHL, tagged leak-test");
const p1 = () => DB.agent_prospects.find((p) => p.id === "p1");
assert(p1().leak_report.live_test?.result === "waiting" && p1().leak_report.score === 62, "The prospect's report shows the test is waiting (and keeps the rest of the report)");
scenario = { prospect_id: "p1", channel: "sms", message: "Ty from Studio Flow again, quick one?", reason: "x" };
await call("/api/v1/team/chat", { department: "head_of_sales", message: "again" });
assert(act().length === 1, "Only one live test per business");

// they reply 42 minutes later
const lt = DB.sec_settings?.find?.((r) => r.key === "leaktest:c-glow");
const store = DB.team_settings.find((r) => r.key === "sec:leaktest:c-glow") || lt;
const holder = JSON.stringify(DB).includes('"leaktest:c-glow"') ? null : "missing";
assert(!holder, "The test is remembered against their GHL contact");
for (const t of Object.values(DB)) if (Array.isArray(t)) for (const r of t) { if (r.key === "leaktest:c-glow" && r.value) r.value.sent_at = new Date(Date.now() - 42 * 6e4).toISOString(); }
inboxMsgs = [{ id: "in1", direction: "inbound", body: "Hi Ty, yes we do Saturdays 9-2!", messageType: "TYPE_EMAIL", dateAdded: new Date().toISOString() }];
const before = ghl.length; const pend = [];
const ik = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("inbox:k")))).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 28);
const r = await w.fetch(new Request(O + "/api/v1/inbox/ghl/" + ik, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: "c-glow", message: { body: "Hi Ty, yes we do Saturdays 9-2!", type: "Email" } }) }), env, { waitUntil(p) { pend.push(p); } });
await Promise.allSettled(pend);
const lt2 = p1().leak_report.live_test;
assert(lt2.result === "replied" && lt2.reply_minutes >= 41 && lt2.reply_minutes <= 43 && /42 minutes/.test(lt2.summary), "Their reply is timed from the inbox (" + (lt2.summary || JSON.stringify(lt2)) + ")");
assert(!ghl.slice(before).some((x) => /POST \/conversations\/messages/.test(x)) && tg.some((m) => /replied in 42 minutes/.test(JSON.stringify(m))), "Command doesn't auto-answer them; Ty gets a Telegram saying they replied in 42 minutes");
const src = (await import("node:fs")).readFileSync(W.split("?")[0], "utf8");
assert(/live_test is a real, timed result/.test(src) && /no_reply/.test(src), "Outreach writers use the result as evidence; no reply in 48 hours is recorded too");
console.log("leaktest-v74 OK");
