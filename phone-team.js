// v45 Phone AI: every AI phone call (GHL Voice AI) lands in Command: Inbox, Telegram alert, cost and reports.
// Command reads GHL's Voice AI call logs (newest first) every hour, and straight away when the GHL
// post-call workflow pings the Inbox webhook with event "call". Each call is saved once.
var PHONE_RATE_AUD = 0.45;
var PHONE_HOSTING_NOTE = "Estimated from minutes at the per-minute rate in Settings (default $0.45/min).";
async function phoneSync(env, { quiet = false } = {}) {
  if (!enabled(env)) return { skipped: "ghl not connected" };
  // The very first check only files existing calls; it doesn't send a burst of old alerts.
  if (!quiet) quiet = !(await select(env, "team_settings", "key=eq.phone_status&select=key&limit=1").catch(() => [1])).length;
  let d;
  try {
    d = await req(env, "GET", `/voice-ai/dashboard/call-logs?${q({ locationId: env.GHL_LOCATION_ID, sortBy: "createdAt", sort: "descend", pageSize: 25 })}`, void 0, "2021-04-15");
  } catch (e) {
    const m = String(e.message || e), scope = / 40[13]/.test(m);
    const error = scope ? "Your GHL key can't read Voice AI calls yet. In GHL, add the Voice AI scopes to the private integration Command uses, then press Check for new calls." : m.slice(0, 200);
    await saveSetting(env, "phone_status", { ok: false, at: (/* @__PURE__ */ new Date()).toISOString(), error }).catch(() => {});
    return { ok: false, error };
  }
  const logs = (Array.isArray(d?.callLogs) ? d.callLogs : []).filter((l) => l && l.id && !l.trialCall);
  const fresh = [];
  for (const log of logs.slice().reverse()) {
    const r = await phoneSave(env, log, { quiet }).catch((e) => ({ error: String(e.message || e).slice(0, 160) }));
    if (r && r.new) fresh.push(r);
  }
  await saveSetting(env, "phone_status", { ok: true, at: (/* @__PURE__ */ new Date()).toISOString(), seen: logs.length, new: fresh.length }).catch(() => {});
  return { ok: true, seen: logs.length, new: fresh.length, calls: fresh.map((c) => ({ who: c.who, booked: c.booked, urgent: c.urgent })) };
}
function phoneTranscript(t) {
  if (typeof t === "string") return t;
  if (Array.isArray(t)) return t.map((x) => (x.role || x.speaker || x.type || "") + ": " + (x.content || x.text || x.message || "")).join("\n");
  return "";
}
async function phoneSave(env, log, { quiet = false } = {}) {
  const key = "voiceai:" + log.id;
  const rid = await recordId("call|" + key);
  const seen = await select(env, "studio_command_records", `id=eq.${rid}&select=id&limit=1`).catch(() => []);
  if (seen.length) return { new: false };
  const acts = Array.isArray(log.executedCallActions) ? log.executedCallActions : [];
  const has = (t) => acts.some((a) => a && a.actionType === t);
  const booked = has("APPOINTMENT_BOOKING"), transferred = has("CALL_TRANSFER"), texted = has("SMS");
  let c = null;
  if (log.contactId) c = (await getContact(env, log.contactId).catch(() => null))?.contact || null;
  const who = (c && ([c.firstName, c.lastName].filter(Boolean).join(" ") || c.contactName)) || log.fromNumber || "Unknown caller";
  const biz = (c && c.companyName) || "";
  const summary = String(log.summary || "").trim();
  const secs = Math.max(0, Number(log.duration) || 0), mins = secs / 60;
  const settings = await getSettings(env).catch(() => ({}));
  const rate = Number(settings?.phone_rate_aud_per_min) > 0 ? Number(settings.phone_rate_aud_per_min) : PHONE_RATE_AUD;
  const cost = Math.round(mins * rate * 100) / 100;
  const urgent = transferred || /\b(urgent|emergency|complain\w*|unhappy|angry|upset|refund|asap|straight away|right now)\b/i.test(summary);
  const transcript = phoneTranscript(log.transcript);
  await saveRecord(env, {
    source: "call", external_key: key, role: "system", actor: "Phone AI", contact_id: log.contactId || null,
    conversation_id: "phone:" + (log.contactId || log.fromNumber || log.id), occurred_at: log.createdAt,
    content: `Phone AI call with ${who}${biz ? " (" + biz + ")" : ""}, ${Math.round(mins * 10) / 10} min.${booked ? " Booked an appointment." : ""}${transferred ? " Transferred to the team." : ""}${texted ? " Sent a text." : ""}\n\nSummary: ${summary || "(none)"}\n\nTranscript:\n${transcript.slice(0, 2e4)}`,
    metadata: { kind: "voice_ai", call_id: log.id, from: log.fromNumber || null, duration_sec: secs, booked, transferred, texted, urgent, cost_aud: cost, who, business: biz, summary: summary.slice(0, 1200), actions: acts.map((a) => a.actionType + (a.actionName ? ": " + a.actionName : "")).slice(0, 12) }
  });
  await insert(env, "team_usage", [{ department: "phone_ai", source: "voice_ai", model: "ghl-voice-ai", calls: 1, cost_aud: cost }]).catch(() => {});
  if (log.contactId) await addTags(env, log.contactId, ["phone-ai-call", ...(booked ? ["booked-by-phone-ai"] : [])]).catch(() => {});
  if (!quiet) {
    const head = urgent ? "\u{1F6A8} <b>Urgent call: please follow up</b>" : booked ? "\u{1F4C5} <b>Phone AI booked someone in</b>" : "\u{1F4DE} <b>Phone AI took a call</b>";
    const line = [esc(who) + (biz ? " \xB7 " + esc(biz) : ""), [log.fromNumber ? esc(log.fromNumber) : "", Math.max(1, Math.round(mins)) + " min"].filter(Boolean).join(" \xB7 ")].join("\n");
    await notify(env, head + "\n" + line + (summary ? "\n“" + esc(summary.slice(0, 600)) + "”" : ""), { urgent: urgent || booked, settings }).catch(() => {});
  }
  return { new: true, who, booked, urgent };
}
async function phoneList(env, { days = 7, limit = 30 } = {}) {
  const since = new Date(Date.now() - clamp(days, 1, 90, 7) * 864e5).toISOString();
  const rows = await select(env, "studio_command_records", `source=eq.call&external_key=like.voiceai*&occurred_at=gte.${encodeURIComponent(since)}&select=id,occurred_at,contact_id,metadata&order=occurred_at.desc&limit=${clamp(limit, 1, 200, 30)}`).catch(() => []);
  const calls = rows.map((r) => { const m = r.metadata || {}; return { id: r.id, at: r.occurred_at, who: m.who, business: m.business, from: m.from, minutes: Math.round((m.duration_sec || 0) / 6) / 10, booked: !!m.booked, transferred: !!m.transferred, urgent: !!m.urgent, summary: m.summary, contact_id: r.contact_id }; });
  const all = rows.map((r) => r.metadata || {});
  return { days: clamp(days, 1, 90, 7), calls, totals: { calls: all.length, booked: all.filter((m) => m.booked).length, urgent: all.filter((m) => m.urgent).length, minutes: Math.round(all.reduce((a, m) => a + (m.duration_sec || 0), 0) / 6) / 10, cost_aud: Math.round(all.reduce((a, m) => a + (Number(m.cost_aud) || 0), 0) * 100) / 100 } };
}
Object.assign(TOOL_DEFS, {
  phone_calls: {
    description: "Recent calls answered by the Phone AI receptionist: who rang, what they wanted, whether it booked them in or transferred them, and urgent ones to follow up. Use for 'who called', 'any missed calls', 'what did the phone AI do'.",
    input_schema: { type: "object", properties: { days: { type: "integer", description: "How far back (default 7)." } } }
  }
});
// ── Phone script builder: writes a GHL Voice AI agent for any business from what Command knows about it ──
function phoneKbText(kb) {
  if (!kb || typeof kb !== "object") return "";
  const flat = (v) => Array.isArray(v) ? v.map((x) => typeof x === "object" ? Object.values(x).filter((y) => typeof y !== "object").join(" - ") : String(x)).filter(Boolean).map((x) => "- " + x).join("\n") : typeof v === "object" && v ? Object.entries(v).map(([k, x]) => "- " + k.replace(/_/g, " ") + ": " + (typeof x === "object" ? JSON.stringify(x) : x)).join("\n") : String(v || "");
  const parts = [["ABOUT", kb.summary], ["SERVICES", kb.services], ["PRICES AND FEES", kb.fees_and_funds], ["OPENING HOURS", kb.open_hours], ["LOCATIONS", kb.locations], ["BOOKING", kb.booking], ["NEW CUSTOMERS", kb.new_patients], ["TEAM", kb.practitioners], ["FAQS", kb.faqs], ["PHONE", kb.phone], ["WEBSITE", kb.website]];
  return parts.filter(([, v]) => v && (typeof v !== "object" || Object.keys(v).length)).map(([h, v]) => h + "\n" + flat(v).slice(0, 3e3)).join("\n\n");
}
function phoneScript({ name, ind, kb, knowledge, owner }) {
  const clinic = ["dental", "allied", "medical", "psychology"].includes(ind);
  const word = clinic ? "patients" : "customers";
  const prompt = `PHONE RECEPTIONIST FOR ${name.toUpperCase()}

WHO YOU ARE
You are the AI receptionist for ${name}${owner ? ", answering the phone for " + owner + " and the team" : ""}.
You are an AI. Never pretend to be human. If asked, say: "I'm ${name}'s AI receptionist."
Facts about services, prices, hours and policies are in your knowledge base. Only state facts from there. If you don't know, say so and offer to have the team call them back.

YOUR JOB ON EVERY CALL
1. Work out why they're calling.
2. New ${word}: answer their question, then help them book. That's the main goal.
3. Make sure the team gets their name, best number and what they need.

HOW YOU SOUND
- Warm, calm and helpful, like the best receptionist they've ever spoken to. Australian English, everyday words.
- This is a phone call: one or two short sentences, then stop and listen. One question at a time.
- Don't use filler like "Great question" or "Absolutely". Don't repeat their name every reply.
- Say phone numbers in small groups. Read back names, numbers, emails and times.
- If they interrupt, stop and listen.

CALL TYPES
A) New ${word} wanting to book or asking questions
   - Answer from the knowledge base, then offer to book them in. Offer two times, not a list.
B) Existing ${word}: rescheduling, cancelling or a question about their booking
   - Take their name and what they need. Transfer to the team if they're available, otherwise say the team will call back today.
C) Wants to speak to someone
   - Transfer if the team is available. Otherwise take a message and say they'll call back, usually the same day.
D) Sales calls, recruiters, surveys or robocalls
   - Politely say the business isn't taking those calls and end the call.
E) Anything you can't help with
   - Take a message. Never guess.

PRICES
- Only quote prices that are in the knowledge base, exactly as written. If a price isn't there, say it depends and the team will confirm.

BOOKING
- We're in ${kb?.state ? kb.state : "Australia"}. Ask where they're based if timing could be confusing, and say times in their local time.
- Before booking, confirm: name, mobile, email, the service, and the day and time. Then confirm it's booked and that they'll get a confirmation.

PRIVACY AND SAFETY
- Only ask for what you need to book or pass on a message.
- Never ask for card numbers or passwords.${clinic ? "\n- Never give medical advice or diagnose. Only ask for a short reason for the visit. Don't ask for detailed health information." : ""}
- If someone mentions an emergency or sounds unsafe, tell them to call 000 straight away and end the call kindly.

BEFORE YOU END EVERY CALL
- Recap in one sentence what happens next.
- Make sure you have their name and best number.
- Thank them and say goodbye.`;
  const welcome = `Hi, thanks for calling ${name}. I'm the AI receptionist, and this call may be recorded. How can I help today?`.slice(0, 190);
  const kbt = [knowledgeText(knowledge), phoneKbText(kb)].filter(Boolean).join("\n\n").slice(0, 2e4);
  const knowledgeBase = `${name.toUpperCase()}: FACTS FOR THE PHONE RECEPTIONIST\n\n` + (kbt || "(Command doesn't know much about this business yet. Fill in their Knowledge vault in Command first, then build this again.)");
  const when = `Use this whenever the caller asks about ${name}: services, prices, hours, location, booking, policies, the team or anything about the business. Only state facts found here. If the answer isn't here, offer a call back from the team.`.slice(0, 500);
  const checklist = [
    "1. In the client's GHL sub-account: AI Agents > Voice AI > create an agent named \"" + name + ": Phone Receptionist\".",
    "2. Paste the Agent prompt into the big instructions box.",
    "3. Welcome message: AI speaks first, paste the Welcome message.",
    "4. Knowledge Base: create one, add a Rich text source and paste the Knowledge base text. Paste the When-to-use text into the agent's knowledge box.",
    "5. Actions: Appointment Booking (their calendar), Call transfer to the business line (with whisper summary), Update contact field During The Call for First Name, Last Name and Email, Hangup & spam: spam detection on, during and after the call.",
    "6. Deploy: their phone number, Answer calls directly, working hours as agreed.",
    "7. Post-call workflow: Webhook to their Command's Inbox webhook with custom data event = call (Command > Inbox > Phone calls shows the link).",
    "8. Publish, then ring the number and run the test calls before go-live."
  ].join("\n");
  return { prompt, welcome, knowledge_base: knowledgeBase, knowledge_when: when, checklist, missing_knowledge: !kbt };
}
async function phoneScriptFor(env, clientId) {
  if (clientId) {
    const c = await getClient(env, clientId);
    const ind = industryOf(c.kb || {}, c.vertical, c.knowledge);
    return { business: c.business_name, ...phoneScript({ name: c.business_name, ind, kb: c.kb || {}, knowledge: c.knowledge || {}, owner: c.alert_name || "" }) };
  }
  const i = await instGet(env).catch(() => null);
  const kb = await instKb(env).catch(() => null) || {};
  const name = i?.business_name || "Studio Flow & Systems";
  const knowledge = !i?.custom && typeof BUSINESS_BRIEF === "string" ? { anything: BUSINESS_BRIEF.trim().slice(0, 3e3) } : {};
  return { business: name, ...phoneScript({ name, ind: industryOf(kb, null, null), kb, knowledge, owner: i?.owner_name || (i?.custom ? "" : "Ty") }) };
}
async function phoneRoute(p, m, body, env, url) {
  const J = (o, s = 200) => json(o, s);
  try {
    if (p === "/phone/calls" && m === "GET") {
      const [list, st] = await Promise.all([phoneList(env, { days: Number(url.searchParams.get("days")) || 7, limit: 60 }), select(env, "team_settings", "key=eq.phone_status&select=value&limit=1").then((r) => r?.[0]?.value || null).catch(() => null)]);
      const { cost_aud, ...totals } = list.totals;
      return J({ ok: true, ...list, totals, status: st, hook: url.origin + "/api/v1/inbox/ghl/" + await inboxKey(env) });
    }
    if (p === "/phone/sync" && m === "POST") return J(await phoneSync(env));
    if (p === "/phone/clients" && m === "GET") {
      const rows = await select(env, "agent_clients", "select=id,business_name,status&order=created_at.desc&limit=100").catch(() => []);
      return J({ ok: true, clients: rows.map((r) => ({ id: r.id, name: r.business_name, status: r.status })) });
    }
    if (p === "/phone/script" && m === "POST") return J({ ok: true, ...await phoneScriptFor(env, body.client_id ? String(body.client_id) : null) });
  } catch (e) {
    return J({ ok: false, error: String(e.message || e).slice(0, 200) }, 400);
  }
  return null;
}
