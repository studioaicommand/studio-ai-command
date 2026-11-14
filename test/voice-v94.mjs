// v94: a note typed into "Reply in my words" is never sent to the customer; "reply as me" switches that one conversation to Ty's own voice until they book (every message still waits for Ty).
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }, { key: "inbox", value: { ig: "auto", sms: "approve", fb: "approve", chat: "approve" } }], team_actions: [
  { id: "n1", type: "ghl_reply", title: "Reply to Narelle on Instagram", department: "head_of_sales", status: "pending", params: { contact_id: "ct9", contact_name: "Narelle Walsh", channel: "ig", send_type: "IG", message: "Fair question, I'm Studio Flow's AI assistant", inbound: "Umm I am. Did you think I was using AI?", tg_msg: 555 }, created_at: new Date().toISOString() }], team_audit: [], team_memory: [] };
let seq = 0; const log = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String((k.includes("->>") ? (r[k.split("->>")[0]] || {})[k.split("->>")[1]] : r[k]) ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "is") return m[2] === "null" ? r[k] == null : true; return true; });
let convo = [{ id: "m0", direction: "inbound", body: "Umm I am. Did you think I was using AI?", messageType: "TYPE_INSTAGRAM", dateAdded: new Date(Date.now() - 6e4).toISOString() }], booked = false;
let tgId = 100; const tgs = []; const ghl = []; const ai = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.telegram.org")) { const meth = u.split("/").pop(); const id = ++tgId; tgs.push({ meth, id, ...body }); return Response.json({ ok: true, result: { message_id: id } }); }
  if (u.includes("leadconnectorhq.com")) {
    if (u.includes("/conversations/search")) return Response.json({ conversations: [{ id: "c1" }] });
    if (u.includes("/conversations/c1/messages")) return Response.json({ messages: { messages: convo } });
    if (u.includes("/conversations/messages") && m === "POST") { ghl.push(body); return Response.json({ messageId: "m-out" }); }
    if (/\/appointments/.test(u)) return Response.json({ events: booked ? [{ startTime: new Date().toISOString(), appointmentStatus: "confirmed" }] : [] });
    if (/\/contacts\/[^/]+$/.test(u)) return Response.json({ contact: { id: "ct9", firstName: "Narelle", lastName: "Walsh" } });
    return Response.json({}); }
  if (u.includes("api.anthropic.com")) { const sys = typeof body.system === "string" ? body.system : JSON.stringify(body.system || ""); ai.push({ sys, msgs: JSON.stringify(body.messages).slice(0, 3000), tools: (body.tools || []).map((t) => t.name) });
    if ((body.tools || []).some((t) => t.name === "classify")) { const txt = JSON.stringify(body.messages); return Response.json({ content: [{ type: "tool_use", id: "t1", name: "classify", input: { kind: /Tuesday/.test(txt) ? "note" : "message" } }], stop_reason: "tool_use", usage: { input_tokens: 1, output_tokens: 1 } }); }
    const voice = /OWN VOICE/.test(sys);
    return Response.json({ content: [{ type: "text", text: JSON.stringify({ reply: voice ? "Ha no, not at all! That was a note for my assistant that slipped through. How's the new direction for Rellish going?" : "Hi! Happy to help.", handoff: false }) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  return new Response("{}", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const SECRET = crypto.createHash("sha256").update("k|telegram").digest("hex").slice(0, 48);
const hook = async (upd) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/telegram/hook", { method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": SECRET }, body: JSON.stringify({ update_id: ++seq, ...upd }) }), env, ctx); await flush(); return r; };
const from = { username: "studioflowandsystems", id: 42 };
const KEY = crypto.createHash("sha256").update("inbox:k").digest("hex").slice(0, 28);
const inbox = async (b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/inbox/ghl/" + KEY, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }), env, ctx); await flush(); return r; };
const forceReply = () => tgs.filter((x) => x.meth === "sendMessage" && x.reply_markup && x.reply_markup.force_reply).pop();

// 1. The bug from 14 Nov: Ty typed an instruction into "Reply in my words" and it went to Narelle word for word.
await hook({ callback_query: { id: "cb1", data: "rw:n1", from, message: { message_id: 555, chat: { id: 42 }, text: "Reply to Narelle" } } });
let pr = forceReply();
assert(pr && /never sent as is/.test(pr.text), "The reply box explains that notes become a new draft");
await hook({ message: { message_id: 9, chat: { id: 42 }, from, text: "Reply as you are me please like a human", reply_to_message: { message_id: pr.id } } });
assert(!ghl.length, "The note is NOT sent to Narelle");
assert(tgs.some((x) => /reads like a note to me/.test(x.text || "")), "Ty is told it read like a note, so nothing went out");
const v = DB.team_settings.find((x) => x.key === "inbox_voice");
assert(v && v.value.ct9 && Date.parse(v.value.ct9.until) > Date.now() + 6 * 864e5, "\"Reply as me ... like a human\" switches Narelle's conversation to Ty's voice for up to 7 days");
const n1 = DB.team_actions.find((a) => a.id === "n1");
assert(n1.status === "pending" && /slipped through/.test(n1.params.message) && n1.params.voice === "ty" && /\(as you\)/.test(n1.title), "The reply is rewritten in Ty's voice and comes back as a card for his yes");
assert(tgs.some((x) => /as you for the rest of this conversation/.test(x.text || "")), "Ty is told the conversation is now in his voice until they book");
const wrote = ai.filter((x) => /OWN VOICE/.test(x.sys)).pop();
assert(wrote && /Did you think I was using AI\?" is about them/.test(wrote.sys) && /don't claim to be human/.test(wrote.sys), "In his voice it reads the question the right way round, and never claims to be human if sincerely asked");

// 2. A real message typed into the box is still sent word for word
DB.team_actions.push({ id: "n2", type: "ghl_reply", title: "Reply to Sam on Instagram", department: "head_of_sales", status: "pending", params: { contact_id: "ct2", contact_name: "Sam", channel: "ig", send_type: "IG", message: "x", inbound: "hi" }, created_at: new Date().toISOString() });
await hook({ callback_query: { id: "cb2", data: "rw:n2", from, message: { message_id: 556, chat: { id: 42 }, text: "Reply to Sam" } } });
pr = forceReply();
await hook({ message: { message_id: 10, chat: { id: 42 }, from, text: "Hey Sam! Yep all good, chat soon", reply_to_message: { message_id: pr.id } } });
assert(ghl.length === 1 && /Hey Sam! Yep all good/.test(JSON.stringify(ghl[0])), "Real words typed to the customer still go word for word");
DB.team_actions.push({ id: "n3", type: "ghl_reply", title: "Reply to Jo", department: "head_of_sales", status: "pending", params: { contact_id: "ct3", contact_name: "Jo", channel: "ig", send_type: "IG", message: "x", inbound: "hi", tg_msg: 557 }, created_at: new Date().toISOString() });
await hook({ callback_query: { id: "cb3", data: "rw:n3", from, message: { message_id: 557, chat: { id: 42 }, text: "Reply to Jo" } } });
pr = forceReply();
await hook({ message: { message_id: 11, chat: { id: 42 }, from, text: "she can do Tuesday arvo", reply_to_message: { message_id: pr.id } } });
assert(ghl.length === 1 && DB.team_actions.find((a) => a.id === "n3").status === "pending", "A note the shortcut list misses is caught by the quick check (Haiku) and not sent");

// 3. While Ty's voice is on, Narelle's next message is drafted as Ty and waits for him, even though Instagram is on auto
convo.push({ id: "m1", direction: "inbound", body: "Haha all good! It's going really well thanks", messageType: "TYPE_INSTAGRAM", dateAdded: new Date().toISOString() });
const before = ghl.length;
await inbox({ contact_id: "ct9" });
const card = DB.team_actions.filter((a) => a.type === "ghl_reply" && a.params.contact_id === "ct9" && a.id !== "n1").pop();
assert(card && card.status === "pending" && card.params.voice === "ty" && ghl.length === before, "In Ty's voice nothing is auto-sent: it comes to Ty first");
// 4. Once they book a call, it goes back to normal
booked = true;
convo.push({ id: "m2", direction: "inbound", body: "Booked in for Tuesday!", messageType: "TYPE_INSTAGRAM", dateAdded: new Date().toISOString() });
await inbox({ contact_id: "ct9" });
assert(!DB.team_settings.find((x) => x.key === "inbox_voice").value.ct9, "When they book, Ty's voice switches off for that conversation");
console.log("voice-v94 OK");
