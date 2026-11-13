// v38 team brain: learning loop, QA agent, shared context in replies, hot-lead tagging, QA stop on auto-send.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const crypto = await import("crypto");
const now = new Date().toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }, { key: "inbox", value: { sms: "approve", ig: "approve", fb: "approve", chat: "approve" } },
  { key: "client_book", value: { items: { "b-1": { id: "b-1", name: "LeakStop Shower Repairs", billing_email: "owner@leakstop.com.au", products: [{ id: "care", price: 149 }] } } } }],
  team_memory: [{ category: "feedback", fact: "Ty edited a ghl reply: removed 'just checking in' and added the 14-day money-back guarantee", created_at: now }, { category: "feedback", fact: "Ty rejected an outreach email. His reason: too long, keep it under 80 words", created_at: now }],
  agent_prospects: [{ id: "p1", business_name: "Sparky Bros Electrical", email: "jo@sparkybros.com.au", vertical: "trades", status: "sent", enrolled_at: "2026-11-01T00:00:00Z", leak: "No way to book a quote online" }], team_actions: [], team_audit: [] };
let seq = 0, systems = [], sent = [], tags = [], tgs = [], modelReply = "", contact = {};
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|gte|ilike|in)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "gte") return val >= m[2]; if (m[1] === "ilike") return val.includes(m[2].replace(/\*/g, "")); return m[2].replace(/[()]/g, "").split(",").includes(val); });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); const body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined;
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); if (path === "team_settings") for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(...rows); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("leadconnectorhq.com")) {
    if (u.includes("/conversations/search")) return Response.json({ conversations: [{ id: "c1" }] });
    if (u.includes("/conversations/c1/messages")) return Response.json({ messages: { messages: [{ id: "m" + seq + Math.random(), direction: "inbound", body: "How much to get started? I want to book this week", messageType: "TYPE_SMS", dateAdded: now }] } });
    if (u.includes("/conversations/messages") && m === "POST") { sent.push(body); return Response.json({ messageId: "x" }); }
    if (/\/contacts\/[^/]+\/tags/.test(u)) { tags.push(...(body?.tags || [])); return Response.json({ ok: true }); }
    if (/\/contacts\/[^/?]+$/.test(u)) return Response.json({ contact });
    return Response.json({}); }
  if (u.includes("api.anthropic.com")) { const b = JSON.parse(init.body); const sys = typeof b.system === "string" ? b.system : JSON.stringify(b.system); systems.push(sys);
    const say = (t) => Response.json({ content: [{ type: "text", text: t }], stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 5 } });
    if (/turn an owner's feedback/.test(sys)) return say(JSON.stringify({ rules: [{ rule: "Never say 'just checking in'", applies_to: ["all"], why: "Ty removed it" }, { rule: "Mention the 14-day money-back guarantee when someone hesitates on price", applies_to: ["inbox"], why: "Ty added it" }, { rule: "Keep outreach emails under 80 words", applies_to: ["outreach"], why: "rejected as too long" }], new: ["Keep outreach emails under 80 words"] }));
    if (/QA reviewer/.test(sys)) { const d = b.messages[0].content; return say(/\$99\b/.test(d) ? '{"verdict":"stop","notes":"Quotes $99, which is not on the price list."}' : '{"verdict":"ok","notes":"Prices and tone look right."}'); }
    return say(modelReply); }
  if (u.includes("api.telegram.org")) { tgs.push(body); return Response.json({ ok: true, result: { message_id: 500 + tgs.length } }); }
  return Response.json({}); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", TELEGRAM_BOT_TOKEN: "t" };
const call = async (path, b) => (await w.fetch(new Request("https://x.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} })).json();
const KEY = crypto.createHash("sha256").update("inbox:k").digest("hex").slice(0, 28);
const hook = async () => { const jobs = []; await w.fetch(new Request("https://x.app/api/v1/inbox/ghl/" + KEY, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact_id: "ct1" }) }), env, { waitUntil(p) { jobs.push(p); } }); await Promise.all(jobs); };

let r = await call("/brain");
assert(r.ok && r.rules.length === 0 && r.qa.checked === 0, "Team brain starts empty");
r = await call("/brain/learn", {});
assert(r.ok && r.rules.length === 3 && /80 words/.test(r.rules[2].rule), "Learning loop: Ty's edits and rejections become 3 team rules");
r = await call("/brain");
assert(r.rules.length === 3 && r.recent_feedback.length === 2, "Rules saved and shown with the feedback they came from");

contact = { id: "ct1", firstName: "Jo", email: "jo@sparkybros.com.au", phone: "+61400000001" };
modelReply = '{"reply":"Hi Jo, great to hear. The AI Receptionist starts at $497, then $297 a month, with a 14-day money-back guarantee. Want me to send a time this week?","handoff":false,"reason":"","intent":"hot"}';
systems = [];
await hook();
const inboxSys = systems.find((x) => /THIS CHANNEL OVERRIDES/.test(x)) || "";
assert(/RULEBOOK/.test(inboxSys) && /14-day money-back/.test(inboxSys) && !/under 80 words/.test(inboxSys), "Replies follow the inbox rules (and not the outreach-only ones)");
assert(/SALES ALREADY KNOWS THEM: Sparky Bros/.test(inboxSys) && /book a quote online/.test(inboxSys), "Shared brain: reply writer knows Sales already emailed Sparky Bros and what we noticed");
const act = DB.team_actions.find((a) => a.type === "ghl_reply");
assert(act && /Hot lead/.test(act.title) && tags.includes("hot-lead"), "Hot lead: flagged for Ty and tagged hot-lead in GHL");
assert(act.params.qa?.verdict === "ok" && /QA ✓/.test(act.reason) && tgs.some((t) => /QA ✓/.test(t.text || "")), "QA agent checked the draft; the Telegram card shows QA ✓");

contact = { id: "ct1", firstName: "Sam", email: "owner@leakstop.com.au" };
systems = []; await hook();
assert(/EXISTING CLIENT: LeakStop/.test(systems.find((x) => /THIS CHANNEL OVERRIDES/.test(x)) || ""), "Shared brain: reply writer knows LeakStop is an existing client");

DB.team_settings.find((x) => x.key === "inbox").value = { sms: "auto", ig: "auto", fb: "auto", chat: "auto" };
contact = { id: "ct1", firstName: "Lee", email: "lee@new.com.au" };
modelReply = '{"reply":"Sure! It is just $99 a month.","handoff":false,"reason":"","intent":"warm"}';
sent = []; await hook();
const stopped = DB.team_actions.filter((a) => a.type === "ghl_reply").at(-1);
assert(sent.length === 0 && stopped.status === "pending" && stopped.params.qa.verdict === "stop", "QA stop: a wrong price is NOT auto-sent; it waits for Ty");
modelReply = '{"reply":"Hi Lee, happy to help. Want a quick call this week?","handoff":false,"reason":"","intent":"warm"}';
sent = []; await hook();
assert(sent.length === 1, "A clean reply still auto-sends");

r = await call("/brain/rules", { rules: [{ rule: "Always offer a Thursday time first", applies_to: ["inbox"] }] });
assert(r.ok && r.rules.length === 1 && r.rules[0].why === "Added by Ty", "Ty can add and remove rules himself");
const app = await (await w.fetch(new Request("https://x.app/app/app.js"), env, { waitUntil() {} })).text();
try { new Function(app); console.log("✓ Command app script parses"); } catch (e) { console.error("FAIL: app.js", e.message); process.exit(1); }
assert(/VIEWS.brain = /.test(app) && /\["knowledge", "Knowledge"\]/.test(app) && /'Team brain'/.test(app), "Studio AI has the Team brain (inside Knowledge since v48)");
console.log("All v38 team brain tests passed.");
