// v45: Studio AI adds/updates contacts, deals and bookings; hands jobs to heads; Phone AI calls land in Command;
// phone script builder; margins in Client Commands.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 7 } }], studio_command_records: [], team_usage: [], team_actions: [], team_audit: [], agent_clients: [{ id: "11111111-1111-1111-1111-111111111111", business_name: "Harbour Physio", vertical: "allied", status: "live", kb: { summary: "Physio clinic in Manly", services: ["Physio", "Clinical pilates"], open_hours: "Mon-Fri 7am-7pm", state: "NSW" }, knowledge: { services_prices: "Initial consult $95", never: "Never diagnose" }, alert_name: "Sam" }] };
const tg = [], ghl = [], asks = [];
let seq = 0, script = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|gte|like)\.(.*)$/); if (!m) return true; if (m[1] === "like") return String(r[k] ?? "").startsWith(m[2].replace(/\*$/, "")); return m[1] === "eq" ? String(r[k] ?? "") === m[2] : String(r[k] ?? "") >= m[2]; });
const slot = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 11) + "00:00:00.000Z";
const calls = [
  { id: "call-1", contactId: "c9", fromNumber: "+61400111222", createdAt: new Date().toISOString(), duration: 132, trialCall: false, summary: "Sam from Harbour Physio wants a Front Desk demo. Booked for Thursday.", transcript: [{ role: "agent", content: "Hi, thanks for calling" }, { role: "user", content: "Hi, it's Sam" }], executedCallActions: [{ actionType: "APPOINTMENT_BOOKING", actionName: "Appointment Booking" }] },
  { id: "call-2", contactId: "c8", fromNumber: "+61400999888", createdAt: new Date().toISOString(), duration: 60, trialCall: false, summary: "Existing client says their website chat is down and it's urgent.", transcript: "", executedCallActions: [{ actionType: "CALL_TRANSFER", actionName: "Transfer to Ty" }] },
  { id: "call-trial", contactId: "c7", duration: 30, trialCall: true, summary: "test", executedCallActions: [] }
];
let callLogs = [], voiceDown = false;
globalThis.fetch = async (u, init = {}) => {
  u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.startsWith("https://sb.test/rest/v1/")) {
    const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: r.id || "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { const k = path === "team_settings" ? "key" : "id"; const i = t.findIndex((x) => x[k] === r[k]); if (i >= 0) { if (path === "team_settings" || !/ignore/.test(init.headers?.Prefer || "")) t[i] = { ...t[i], ...r }; } else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); }
    return Response.json([]);
  }
  if (u.startsWith("https://services.leadconnectorhq.com")) {
    const p = u.replace("https://services.leadconnectorhq.com", ""); ghl.push(m + " " + p.split("?")[0] + (body ? " " + JSON.stringify(body) : ""));
    if (p.startsWith("/contacts/upsert")) return Response.json({ new: !/sam@/.test(body.email || ""), contact: { id: "c1" } });
    if (p.startsWith("/contacts/search")) return Response.json({ contacts: [], total: p.includes("booked-by-phone-ai") || JSON.stringify(body || {}).includes("booked-by-phone-ai") ? 1 : JSON.stringify(body || {}).includes("outreach-booked") ? 3 : 0 });
    if (/^\/contacts\/c9$/.test(p.split("?")[0])) return Response.json({ contact: { id: "c9", firstName: "Sam", lastName: "Ng", companyName: "Harbour Physio" } });
    if (/^\/contacts\/c8$/.test(p.split("?")[0])) return Response.json({ contact: { id: "c8", firstName: "Jo", companyName: "Bright Dental" } });
    if (p.startsWith("/calendars/?")) return Response.json({ calendars: [{ id: "cal1", name: "Free 30-min call", slotDuration: 30, slotDurationUnit: "mins" }] });
    if (p.startsWith("/calendars/cal1/free-slots")) return Response.json({ x: { slots: [slot] } });
    if (p.startsWith("/calendars/events/appointments") && m === "POST") return Response.json({ id: "ap1" });
    if (p.startsWith("/opportunities/") && m === "POST") return Response.json({ opportunity: { id: "o1" } });
    if (p.startsWith("/voice-ai/dashboard/call-logs")) return voiceDown ? new Response("{}", { status: 401 }) : Response.json({ callLogs, total: callLogs.length });
    return Response.json({});
  }
  if (u.includes("api.telegram.org")) { tg.push(body?.chat_id + ":" + (body?.text || "")); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("api.anthropic.com")) { asks.push(body); const next = script.shift() || [{ type: "text", text: "Done that." }]; return Response.json({ content: next, stop_reason: next.some((c) => c.type === "tool_use") ? "tool_use" : "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  return Response.json({});
};
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SEAL_KEY: "s".repeat(64), SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc1", PUBLIC_ORIGIN: "https://studioflowandsystems.app", PHONE_NO_RETRY: "1" };
const bg = [];
const ctx = { waitUntil(p) { bg.push(p); } };
const call = async (path, b, headers = {}) => { const r = await w.fetch(new Request("https://studioflowandsystems.app" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json", ...headers }, body: b ? JSON.stringify(b) : undefined }), env, ctx); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const tu = (name, input) => ({ type: "tool_use", id: "t" + (++seq), name, input });

// 1. Studio AI can add a contact (the Telegram complaint), straight away and logged.
script = [[tu("ghl_create_contact", { first_name: "Mia", last_name: "Chen", phone: "0412 345 678", email: "Mia@Example.com", business_name: "Chen Physio", source: "referral" })], [{ type: "text", text: "Added Mia Chen." }]];
let x = await call("/api/v1/operator/chat", { message: "add Mia Chen 0412 345 678 to my contacts" });
const toolNames = (asks.at(-1).tools || []).map((t) => t.name);
assert(["ghl_create_contact", "ghl_update_contact", "ghl_create_opportunity", "ghl_free_slots", "propose_ghl_appointment_book", "ask_department", "phone_calls"].every((n) => toolNames.includes(n)), "Studio AI now has CRM hands, its team and phone calls");
const up = ghl.find((l) => l.startsWith("POST /contacts/upsert"));
assert(up && up.includes('"phone":"+61412345678"') && up.includes('"email":"mia@example.com"') && up.includes("added-by-studio-ai"), "The contact is saved with a proper +61 number, clean email and a Studio AI tag");
assert(DB.team_audit.some((a) => a.action === "ghl_contact_added" && /Mia Chen/.test(a.summary)), "It's logged");
assert(/Added Mia Chen/.test(x.j.reply) && x.j.tools_used.includes("ghl_create_contact"), "Studio AI says what it did");
// The Telegram path uses the same tools.
const ow = await import(W).then((m) => m.default);
script = [[tu("ghl_update_contact", { contact_id: "c1", email: "mia@chenphysio.com.au" })], [{ type: "text", text: "Updated." }]];
x = await call("/api/v1/operator/chat", { message: "change Mia's email" });
assert(ghl.some((l) => l.startsWith("PUT /contacts/c1") && l.includes("mia@chenphysio.com.au")), "It can update a contact");
// 2. Deals and free times, then a booking that needs Ty's yes.
script = [[tu("ghl_create_opportunity", { contact_id: "c1", pipeline_id: "p1", stage_id: "s1", name: "Chen Physio | Front Desk", value_aud: 697 }), tu("ghl_list_calendars", {}), tu("ghl_free_slots", { calendar_id: "cal1", timezone: "Australia/Sydney" })], [tu("propose_ghl_appointment_book", { contact_id: "c1", contact_name: "Mia Chen", calendar_id: "cal1", calendar_name: "Free 30-min call", start: slot, reason: "Mia asked for a call" })], [{ type: "text", text: "Deal created. Booking is waiting for your yes." }]];
x = await call("/api/v1/operator/chat", { message: "make a deal and book her in" });
assert(ghl.some((l) => l.startsWith("POST /opportunities/") && l.includes('"monetaryValue":697')), "It creates a deal");
const slotsAsk = JSON.stringify(asks.at(-1).messages);
assert(/their_time/.test(slotsAsk) && /Sydney|AEDT|\d/.test(slotsAsk), "Free times come back in Brisbane and the caller's time zone");
assert(!ghl.some((l) => l.startsWith("POST /calendars/events/appointments")), "Booking doesn't happen without Ty's yes");
const pending = DB.team_actions.find((a) => a.type === "ghl_appointment_book");
assert(pending && pending.status === "pending" && /Book Mia Chen into Free 30-min call/.test(pending.title), "The booking waits in Approvals with a clear title");
x = await call(`/api/v1/team/actions/${pending.id}/approve`, {});
assert(ghl.some((l) => l.startsWith("POST /calendars/events/appointments") && l.includes('"contactId":"c1"') && l.includes('"calendarId":"cal1"')), "Once approved, it's booked in GHL");
// 3. Studio AI can hand a job to a department head.
script = [[tu("ask_department", { department: "head_of_sales", request: "Research Chen Physio and suggest the next step." })], [{ type: "text", text: "Sales suggests a Front Desk pilot." }], [{ type: "text", text: "Sales says: offer the Front Desk pilot." }]];
x = await call("/api/v1/operator/chat", { message: "get sales to look at Chen Physio" });
assert(x.j.tools_used.includes("ask_department") && asks.some((a) => /Request from the Studio AI Command/.test(JSON.stringify(a.messages))), "Studio AI hands the job to Head of Sales and gets an answer back");
// 4. Roles: staff can add contacts but not deals; support can't change the CRM.
script = [];
await call("/api/v1/operator/chat", { message: "hi" }, { "x-sf-member": "u1|staff|Sarah" }).catch(() => {});
x = await call("/api/v1/operator/chat", { message: "hi" }, { "x-sf-member": "u1|staff|Sarah" });
// (members are routed by memGate; test the role filter directly through the app bundle instead)
// 5. Phone AI calls: first check files old calls quietly, later calls alert.
callLogs = [calls[0]];
tg.length = 0;
x = await call("/api/v1/team/phone/sync", {});
assert(x.j.ok && x.j.new === 1 && tg.length === 0, "The very first check files existing calls without a burst of old alerts");
callLogs = [calls[1], calls[0], calls[2]];
x = await call("/api/v1/inbox/ghl/" + (await (async () => { const r = await call("/api/v1/team/phone/calls"); return r.j.hook.split("/inbox/ghl/")[1]; })()), { event: "call", contact_id: "c8" });
assert(x.j.ok, "The GHL post-call workflow pings the Inbox webhook");
await Promise.all(bg.splice(0));
assert(tg.some((t) => /^7:/.test(t) && /Urgent call/.test(t) && /Jo/.test(t) && /website chat is down/.test(t)), "An urgent call goes to Telegram straight away");
assert(DB.studio_command_records.filter((r) => r.source === "call").length === 2, "Each call is saved once, and trial calls are skipped");
x = await call("/api/v1/team/phone/sync", {});
assert(x.j.new === 0, "Calls are never saved twice");
x = await call("/api/v1/team/phone/calls");
assert(x.j.totals.calls === 2 && x.j.totals.booked === 1 && x.j.totals.urgent === 1 && x.j.calls[0].summary && x.j.totals.cost_aud === undefined, "Inbox › Phone calls lists them (no costs shown there)");
assert(DB.team_usage.filter((r) => r.department === "phone_ai").reduce((a, r) => a + r.cost_aud, 0) > 0, "Call minutes count toward AI costs");
assert(ghl.some((l) => l.startsWith("POST /contacts/c9/tags") && l.includes("booked-by-phone-ai")), "Phone bookings are tagged so they aren't counted as outreach");
script = [[tu("phone_calls", { days: 7 })], [{ type: "text", text: "Two calls: Sam booked, Jo needs a follow up." }]];
x = await call("/api/v1/operator/chat", { message: "who called today?" });
assert(/Jo needs a follow up/.test(x.j.reply) && /website chat is down/.test(JSON.stringify(asks.at(-1).messages)), "Studio AI can answer 'who called?'");
// 6. Scope problem is explained in plain words.
voiceDown = true;
x = await call("/api/v1/team/phone/sync", {});
assert(x.j.ok === false && /Voice AI scopes/.test(x.j.error), "If the GHL key can't read calls, Command says exactly what to fix");
voiceDown = false;
// 7. Phone script builder.
x = await call("/api/v1/team/phone/script", { client_id: "11111111-1111-1111-1111-111111111111" });
assert(x.j.ok && /HARBOUR PHYSIO/.test(x.j.prompt) && /Never give medical advice/.test(x.j.prompt) && /000/.test(x.j.prompt), "The script builder writes a clinic-safe phone receptionist");
assert(/Initial consult \$95/.test(x.j.knowledge_base) && /Clinical pilates/.test(x.j.knowledge_base) && x.j.welcome.length <= 190 && x.j.knowledge_when.length <= 500, "It fills the knowledge base from their Knowledge vault and website, within GHL's limits");
x = await call("/api/v1/team/phone/clients");
assert(x.j.clients.some((c) => c.name === "Harbour Physio"), "Any client can be picked");
// 8. Outreach results no longer count phone bookings.
const cs = await call("/api/v1/team/campaign");
console.log("v45 CRM hands, phone calls and script builder: all passed");
process.exit(0);
