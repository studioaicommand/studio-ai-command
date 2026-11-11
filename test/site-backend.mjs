// Backend tests for the public website assistant (/api/v1/site/*).
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const calls = { anthropic: [], openai: [], ghl: [], tg: [], hangup: [], turnstile: 0, supabase: [] };
let anthropicMode = "text", turnstileOk = true, anthropicDown = false;
const T0 = new Date(Date.now() + 2 * 86400000); T0.setUTCHours(0, 0, 0, 0);
const SLOT_DAY = new Date(T0.getTime() + 10 * 3600000).toISOString().slice(0, 10);
const FREE = [new Date(T0.getTime() + 1 * 3600000), new Date(T0.getTime() + 3 * 3600000), new Date(T0.getTime() + 5 * 3600000)].map((d) => d.toISOString().replace(".000Z", "+00:00"));
const EXISTING = [];
globalThis.fetch = async (u, init = {}) => {
  u = String(u); const body = init.body;
  if (u.includes("challenges.cloudflare.com")) { calls.turnstile++; const b = JSON.parse(body); return Response.json({ success: turnstileOk && b.response === "good", hostname: b.response === "good" ? "www.studioflowandsystems.com" : "evil.com", action: "studio_site" }); }
  if (u.startsWith("https://api.anthropic.com/v1/messages")) {
    const b = JSON.parse(body); calls.anthropic.push(b);
    if (anthropicDown) return new Response("{}", { status: 529 });
    const last = b.messages[b.messages.length - 1];
    if (Array.isArray(last.content)) return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "I've opened Ty's calendar below. Once you pick a time you'll get a confirmation." }] });
    const q = String(last.content);
    if (/book/i.test(q)) return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "suggest_next_step", input: { steps: ["book_call", "evil_link", "checkout_voice", "page_packages"] } }] });
    if (/details/i.test(q)) return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t2", name: "prepare_enquiry", input: { name: "Sam <b>Lee</b>", business: "Lee Physio", email: "sam@leephysio.com.au", interest: "voice_receptionist", message: "Wants voice AI for after-hours" } }] });
    if (/times/i.test(q)) return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t4", name: "find_times", input: { days: 5 } }] });
    if (/^take (\S+)/i.test(q)) return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t5", name: "prepare_booking", input: { start: q.split(" ")[1], name: "Sam Lee", email: "sam@leephysio.com.au", business: "Lee Physio", answers: "3 physios, phone enquiries" } }] });
    if (/leak/i.test(q)) return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "Sure: ```js\nconst key='sk-abcdefghijk'\n```" }] });
    return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "Hi! I'm Studio AI. What kind of business do you run?" }] });
  }
  if (u === "https://api.openai.com/v1/realtime/calls") { const s = JSON.parse(init.body.get("session")); calls.openai.push(s); return new Response("v=0\r\nanswer", { status: 201, headers: { Location: "/v1/realtime/calls/rtc_abc123" } }); }
  if (u.includes("/hangup")) { calls.hangup.push(u); return new Response("{}"); }
  if (u.includes("sb.test")) { calls.supabase.push(u); if (u.includes("key=eq.offer")) return Response.json([{ value: { pilot_price: 497, pilot_price_voice: 697, monthly_voice: 797 } }]); if (u.includes("key=eq.telegram")) return Response.json([{ value: { chat_id: 4242 } }]); return Response.json([]); }
  if (u.startsWith("https://services.leadconnectorhq.com")) { calls.ghl.push({ u, body: body && JSON.parse(body), method: init.method || "GET" });
    if (u.includes("/free-slots")) { if (globalThis.CAL_DOWN) return new Response("{}", { status: 401 }); return Response.json({ [SLOT_DAY]: { slots: FREE.slice() }, traceId: "x" }); }
    if (u.endsWith("/appointments") && (init.method || "GET") === "GET") return Response.json({ events: EXISTING.slice() });
    if (u.endsWith("/calendars/events/appointments")) { const b = JSON.parse(body); FREE.splice(FREE.indexOf(b.startTime.replace(".000Z", "+00:00")), 1); EXISTING.push({ calendarId: b.calendarId, startTime: b.startTime, appointmentStatus: "confirmed" }); return Response.json({ id: "appt_1" }); }
    if (u.endsWith("/contacts/upsert")) return Response.json({ contact: { id: "c_1" } }); return Response.json({ ok: true }); }
  if (u.startsWith("https://api.telegram.org")) { calls.tg.push(JSON.parse(body)); return Response.json({ ok: true }); }
  throw new Error("unexpected fetch " + u);
};
// In-memory Durable Object runtime
const mod = await import(W);
const instances = new Map();
function makeStorage() { const m = new Map(); let alarm = null; const api = { get: async (k) => structuredClone(m.get(k)), put: async (k, v) => { m.set(k, structuredClone(v)); }, setAlarm: async (t) => { alarm = t; }, getAlarm: () => alarm, transaction: async (fn) => fn(api), _m: m }; return api; }
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "studio-key", ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", TURNSTILE_SITE_KEY: "0xSITE", TURNSTILE_SECRET_KEY: "sec", STUDIO_PUBLIC_LIMIT_SECRET: "x".repeat(40), SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", GHL_PRIVATE_TOKEN: "g", GHL_LOCATION_ID: "loc", TELEGRAM_BOT_TOKEN: "1:b" };
env.STUDIO_PUBLIC_TRIALS = { idFromName: (n) => n, get: (id) => { if (!instances.has(id)) { const ctx = { storage: makeStorage() }; instances.set(id, { ctx, obj: new mod.PublicTrialGuard(ctx, env) }); } const i = instances.get(id); return { fetch: (u, init) => i.obj.fetch(new Request(u, init)) }; } };
const worker = mod.default;
const O = "https://www.studioflowandsystems.com", VIS = "11111111-2222-4333-8444-555555555555";
const call = async (op, { body, origin = O, token, vis = VIS, ip = "1.2.3.4", method = "POST", raw, headers = {} } = {}) => {
  const h = { Origin: origin, "CF-Connecting-IP": ip, "X-Studio-Visitor": vis, ...headers }; if (token) h["X-Studio-Token"] = token;
  if (!origin) delete h.Origin;
  const r = await worker.fetch(new Request("https://studioflowandsystems.app/api/v1/site/" + op, { method, headers: h, body: method === "GET" ? undefined : raw ?? JSON.stringify(body || {}) }), env, { waitUntil() {} });
  const ct = r.headers.get("content-type") || ""; return { status: r.status, headers: r.headers, data: ct.includes("json") ? await r.json() : await r.text() };
};
// status + CORS
let r = await call("status", { method: "GET" });
assert(r.status === 200 && r.data.chat && r.data.voice && r.data.turnstile_site_key === "0xSITE" && r.headers.get("access-control-allow-origin") === O, "Status: chat + voice ready, CORS allowed for the website");
r = await call("status", { method: "GET", origin: "https://evil.com" });
assert(!r.headers.get("access-control-allow-origin"), "No CORS for other origins");
const pre = await worker.fetch(new Request("https://studioflowandsystems.app/api/v1/site/chat", { method: "OPTIONS", headers: { Origin: "https://abc123.studioflowandsystemswebsite.pages.dev" } }), env, {});
assert(pre.status === 204 && pre.headers.get("access-control-allow-origin") === "https://abc123.studioflowandsystemswebsite.pages.dev", "Pages preview origin allowed for testing");
const ENGINE = (await import("node:fs")).readFileSync("/home/claude/site/lib/studio-engine.js", "utf8");
const sent = [...new Set([...ENGINE.matchAll(/headers\['(X-Studio-[A-Za-z-]+)'\]|'(X-Studio-Visitor)'/g)].map((m) => m[1] || m[2]))];
assert(sent.length === 3 && sent.every((h) => pre.headers.get("access-control-allow-headers").split(", ").includes(h)), "Every header the website sends is allowed by CORS: " + sent.join(", "));
assert(pre.headers.get("access-control-expose-headers") === "X-Studio-Voice-Seconds", "Voice time limit header readable by the website");
r = await call("status?diag=1", { method: "GET" });
assert(r.status === 404, "Diagnostics hidden without the owner key");
r = await call("status?diag=1", { method: "GET", headers: { Authorization: "Bearer studio-key" } });
assert(r.data.missing.length === 0 && /^ok: 3/.test(r.data.calendar), "Diagnostics with owner key list missing setup + live calendar check");
// blocked origins / bad turnstile
r = await call("session", { origin: "https://evil.com", body: { turnstile: "good" } });
assert(r.status === 403, "Other websites can't start sessions");
r = await call("session", { origin: "", body: { turnstile: "good" } });
assert(r.status === 403, "Requests without an Origin are refused");
r = await call("session", { body: { turnstile: "bad" } });
assert(r.status === 403, "Failed Turnstile is refused");
// session
r = await call("session", { body: { turnstile: "good" } });
assert(r.status === 200 && r.data.token && r.data.limits.messages === 40 && r.data.offer.pilot_price_voice === 697, "Verified session starts with limits and live offer prices");
const tok = r.data.token;
// chat
r = await call("chat", { token: tok, body: { message: "Hi there" } });
assert(r.status === 200 && /Studio AI/.test(r.data.reply), "Real text reply");
const sys = calls.anthropic[0].system;
assert(/A\$697/.test(sys) && /A\$497\/month/.test(sys) && /Front Desk/.test(sys) && /does NOT answer the business's phone line/.test(sys) && !/operator|Command >|Command centre key|CRM records/.test(sys.replace(/no access to anyone's records, CRM/, "")), "Public instructions: confirmed prices, channels distinguished, nothing private");
assert(calls.anthropic[0].tools.map((t) => t.name).join() === "find_times,prepare_booking,suggest_next_step,prepare_enquiry", "Only the four public tools are offered to the model");
r = await call("chat", { token: tok, body: { message: "I want to book a call" } });
assert(r.data.actions.length === 2 && r.data.actions[0].url.startsWith("https://links.studioflowandsystems.com/widget/booking/") && r.data.actions[1].url === "https://buy.stripe.com/cNidRaaWFdr69V31OeeZ206" && !JSON.stringify(r.data).includes("evil"), "Next steps use verified links only (invalid ids dropped, max 2)");
r = await call("chat", { token: tok, body: { message: "here are my details" } });
assert(r.data.lead && r.data.lead.name === "Sam  b Lee /b" || (r.data.lead && !/[<>]/.test(r.data.lead.name)), "Enquiry draft returned for review, HTML stripped");
assert(calls.ghl.filter((x) => !x.u.includes("free-slots")).length === 0, "Nothing is sent to GHL until the visitor taps Send");
r = await call("chat", { token: tok, body: { message: "leak please" } });
assert(!/sk-|```/.test(r.data.reply), "Code/keys in a reply are replaced");
// isolation: other visitor / forged token
r = await call("chat", { token: tok, vis: "99999999-2222-4333-8444-555555555555", body: { message: "hi" } });
assert(r.status === 403, "A token can't be used from another browser");
r = await call("chat", { token: "00000000-0000-4000-8000-000000000000", body: { message: "hi" } });
assert(r.status === 440, "Unknown token = conversation ended");
r = await call("chat", { token: tok, body: { message: "x".repeat(1501) } });
assert(r.status === 400, "Over-long message refused");
// private routes are not reachable via site paths
for (const p of ["../operator/tool", "tool"]) { r = await call(p, { token: tok, body: { name: "list_business_goals", args: {} } }); assert(r.status >= 400 && !JSON.stringify(r.data).includes("goals"), "Private tool names are refused: " + p); }
// tool relay (voice)
r = await call("tool", { token: tok, body: { name: "suggest_next_step", args: { steps: ["checkout_chat"] } } });
assert(r.data.actions[0].url === "https://buy.stripe.com/3cI5kE7Kteva3wF8cCeZ207", "Voice tool relay returns the verified chat checkout");
// lead
r = await call("lead", { token: tok, body: { lead: { name: "Sam Lee", email: "sam@leephysio.com.au", message: "after hours" }, consent: false } });
assert(r.status === 400 && calls.ghl.filter((x) => !x.u.includes("free-slots")).length === 0, "No consent, no save");
r = await call("lead", { token: tok, body: { lead: { name: "Sam Lee", message: "after hours" }, consent: true } });
assert(r.status === 400, "Needs an email or mobile");
r = await call("lead", { token: tok, body: { lead: { name: "Sam Lee", business: "Lee Physio", email: "sam@leephysio.com.au", interest: "voice_receptionist", message: "Voice AI after hours" }, consent: true } });
const up = calls.ghl.find((x) => x.u.endsWith("/contacts/upsert"));
assert(r.status === 200 && r.data.sent && up.body.email === "sam@leephysio.com.au" && up.body.tags.includes("website-ai-lead") && up.body.companyName === "Lee Physio" && calls.ghl.some((x) => /\/notes$/.test(x.u) && /Consent/.test(x.body.body)) && calls.tg[0]?.chat_id === 4242, "Consented lead saved to GHL with note + tag, Ty pinged on Telegram");
const ghlFields = Object.keys(up.body).sort().join();
assert(!/address|dateOfBirth|customFields/.test(ghlFields), "Only contact + enquiry fields saved: " + ghlFields);
r = await call("lead", { token: tok, body: { lead: { name: "Sam Lee", email: "sam@leephysio.com.au", message: "again" }, consent: true } });
r = await call("lead", { token: tok, body: { lead: { name: "Sam Lee", email: "sam@leephysio.com.au", message: "again" }, consent: true } });
assert(r.status === 409, "Lead spam capped per conversation");
// booking (real GHL calendar)
r = await call("session", { body: { turnstile: "good" }, ip: "9.9.9.9", vis: "33333333-2222-4333-8444-555555555555" });
const btok = r.data.token, BV = "33333333-2222-4333-8444-555555555555", BIP = "9.9.9.9";
const bcall = (op, o) => call(op, { token: btok, vis: BV, ip: BIP, ...o });
r = await bcall("take 2099-01-01T00:00:00Z", { body: { message: "take 2099-01-01T00:00:00Z" } }).catch(() => null);
r = await bcall("chat", { body: { message: "take 2099-01-01T00:00:00.000Z" } });
assert(!r.data.booking, "Can't prepare a booking for a time that wasn't offered");
const nA = calls.anthropic.length;
r = await bcall("chat", { body: { message: "What times does Ty have?" }, headers: { "X-Studio-TZ": "Australia/Sydney" } });
assert(calls.anthropic.length - nA === 1 && /free times/.test(r.data.reply), "Faster: times shown with one AI call (no second round trip)");
const slotAct = r.data.actions.find((a) => a.kind === "slots");
assert(slotAct && slotAct.slots.length === 3 && / your time$/.test(slotAct.slots[0].label), "Real free times from GHL shown as buttons (visitor's time zone)");
const pick = slotAct.slots[1].start;
r = await bcall("chat", { body: { message: "take " + pick } });
assert(r.data.booking && r.data.booking.start === pick && r.data.booking.email === "sam@leephysio.com.au", "Booking prepared for confirmation (not booked yet)");
assert(!calls.ghl.some((x) => x.u.endsWith("/calendars/events/appointments")), "No appointment created before the visitor confirms");
r = await bcall("book", { body: { booking: r.data.booking, consent: false } });
assert(r.status === 400, "Booking needs consent");
r = await bcall("book", { body: { booking: { ...slotAct.slots[1], start: "2099-01-01T00:00:00.000Z", name: "Sam Lee", email: "sam@leephysio.com.au" }, consent: true } });
assert(r.status === 409, "Can't book a time that wasn't offered");
const bk = { start: pick, name: "Sam Lee", email: "sam@leephysio.com.au", business: "Lee Physio", answers: "3 physios" };
r = await bcall("book", { body: { booking: bk, consent: true } });
const appt = calls.ghl.find((x) => x.u.endsWith("/calendars/events/appointments"));
assert(r.status === 200 && r.data.booked && appt.body.calendarId === "tfzrthnax3Ldpncejghq" && appt.body.startTime === pick && appt.body.contactId === "c_1" && calls.tg.some((t) => /booked a call/.test(t.text)), "Confirmed: slot re-checked, contact + appointment created in GHL, Ty pinged");
r = await bcall("book", { body: { booking: bk, consent: true } });
assert(r.status === 409, "Repeated Confirm clicks can't double-book");
r = await call("session", { body: { turnstile: "good" }, ip: "9.9.9.8", vis: "44444444-2222-4333-8444-555555555555" });
const t3 = r.data.token, c3 = (op, o) => call(op, { token: t3, vis: "44444444-2222-4333-8444-555555555555", ip: "9.9.9.8", ...o });
r = await c3("chat", { body: { message: "times please" } });
const s3 = r.data.actions.find((a) => a.kind === "slots").slots[0].start;
r = await c3("book", { body: { booking: { ...bk, start: s3 }, consent: true } });
assert(r.status === 409 && /already have a call/.test(r.data.error), "Duplicate protection: same person can't book a second upcoming call");
EXISTING.length = 0;
FREE.splice(0, FREE.length);
r = await c3("book", { body: { booking: { ...bk, start: s3 }, consent: true } });
assert(r.status === 409 && /just taken/.test(r.data.error), "Slot taken since it was offered → refused with fresh-times advice");
globalThis.CAL_DOWN = true;
r = await c3("chat", { body: { message: "times again" } });
assert(r.data.actions.some((a) => a.id === "book_call"), "Calendar API down → falls back to the booking calendar");
globalThis.CAL_DOWN = false;
// voice
r = await call("voice", { token: tok, raw: "v=0\r\nm=audio 9 UDP" , headers: { "Content-Type": "application/sdp" } });
assert(r.status === 200 && String(r.data).startsWith("v=0"), "Voice call starts (SDP answer)");
const vs = calls.openai[0];
assert(vs.tools.map((t) => t.name).join() === "find_times,prepare_booking,suggest_next_step,prepare_enquiry" && /EARLIER IN THIS CHAT/.test(vs.instructions) && vs.audio.input.turn_detection.type === "semantic_vad", "Voice session: public tools only, chat context carried over, steady turn-taking");
r = await call("voice", { token: tok, raw: "v=0\r\nm=audio 9 UDP" });
assert(r.status === 409, "Repeated Start voice clicks don't start a second call");
// alarm hard-stops the call
const site = instances.get("studio-site-assistant-v1");
const st = await site.ctx.storage.get("site"); st.sessions[tok].callExpires = Date.now() - 1; await site.ctx.storage.put("site", st);
await site.obj.alarm();
assert(calls.hangup.length === 1 && !(await site.ctx.storage.get("site")).sessions[tok].callId, "Voice is hung up at its time limit (alarm)");
r = await call("voice-end", { token: tok });
assert(r.status === 200, "End voice works even after the call stopped");
// expiry
const st2 = await site.ctx.storage.get("site"); st2.sessions[tok].expires = Date.now() - 1; await site.ctx.storage.put("site", st2);
r = await call("chat", { token: tok, body: { message: "still there?" } });
assert(r.status === 440 && /ended/.test(r.data.error), "Expired session is refused with a clear message");
// model outage
r = await call("session", { body: { turnstile: "good" } }); const tok2 = r.data.token;
anthropicDown = true;
r = await call("chat", { token: tok2, body: { message: "Hi" } });
assert(r.status === 502 && /book a call/i.test(r.data.error), "Model outage gives a friendly fallback");
anthropicDown = false;
r = await call("chat", { token: tok2, body: { message: "Hi" } });
assert(r.status === 200, "Message allowance restored after an outage (turn not burnt)");
// daily per-visitor limit
for (let i = 0; i < 8; i++) await call("session", { body: { turnstile: "good" } });
r = await call("session", { body: { turnstile: "good" } });
assert(r.status === 429, "Per-visitor daily session limit enforced (10/day)");
r = await call("session", { body: { turnstile: "good" }, ip: "5.6.7.8", vis: "22222222-2222-4333-8444-555555555555" });
assert(r.status === 200, "Other visitors unaffected");
// not configured
const env2 = { ...env }; delete env2.TURNSTILE_SECRET_KEY;
const nr = await worker.fetch(new Request("https://studioflowandsystems.app/api/v1/site/session", { method: "POST", headers: { Origin: O, "CF-Connecting-IP": "1.1.1.1", "X-Studio-Visitor": VIS }, body: "{}" }), env2, {});
const nd = await nr.json();
assert(nr.status === 503 && /book a call/i.test(nd.error), "Unconfigured backend says so and points to booking");
// existing demo trial untouched
const tr = await worker.fetch(new Request("https://studioflowandsystems.app/api/v1/public/chat", { method: "POST", headers: { Origin: "https://studioflowandsystems.app" }, body: "{}" }), env, {});
assert(tr.status === 403, "Existing /api/v1/public trial routes still guarded as before");
{ const sys = calls.anthropic.map((b) => typeof b.system === "string" ? b.system : JSON.stringify(b.system)).find((x) => /CONFIRMED OFFERS/.test(x)) || "";
  assert(/CURRENT PRODUCTS AND PRICES/.test(sys) && /Studio AI Command/.test(sys) && /coaches and consultants/.test(sys), "v37: website Studio AI quotes the live Offers price list and knows Studio AI Command"); }
console.log("\nAll site assistant backend tests passed.");
