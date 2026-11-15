// ── v60: email rules for the GHL inbox. Ty asks Studio AI to block a sender ("anything from American Express") or
// to bin cold sales pitches. Matching inbound emails are deleted from GHL Conversations (and logged, so nothing is lost
// silently). Contacts tagged as clients / prospects / outreach replies are NEVER touched. ──
var MAIL_SAFE_TAGS = /^(client|customer|cold-outreach|outreach-replied|lead|prospect|free-call-done|audit-booked|audit-done|vip|partner)$/i;
async function mailRulesGet(env) { const v = await secGet(env, "mail_rules").catch(() => null); return { rules: Array.isArray(v?.rules) ? v.rules : [], pitch_filter: v?.pitch_filter === true }; }
async function mailRulesPut(env, cfg) { await secPut(env, "mail_rules", { rules: cfg.rules.slice(0, 100), pitch_filter: !!cfg.pitch_filter }); }
async function mailLog(env, row) { const v = await secGet(env, "mail_rules_log").catch(() => null); const items = Array.isArray(v?.items) ? v.items : []; items.unshift({ at: new Date().toISOString(), ...row }); await secPut(env, "mail_rules_log", { items: items.slice(0, 300) }); }
function mailMatch(rule, m) {
  const k = String(rule.match || "").toLowerCase().trim();
  if (!k) return false;
  if (rule.kind === "keyword") return (m.subject + " " + m.text).toLowerCase().includes(k);
  return (m.from + " " + m.name + " " + m.company).toLowerCase().includes(k.replace(/^@/, ""));
}
async function mailContact(env, cid) {
  const c = await req(env, "GET", "/contacts/" + cid, null, "2021-07-28").catch(() => null);
  const x = c?.contact || {};
  return { from: String(x.email || "").toLowerCase(), name: [x.firstName, x.lastName].filter(Boolean).join(" ") || String(x.contactName || x.name || ""), company: String(x.companyName || ""), tags: Array.isArray(x.tags) ? x.tags : [] };
}
var MAIL_PITCH_TOOL = { name: "classify_email", description: "Classify an inbound email.", input_schema: { type: "object", properties: { kind: { type: "string", enum: ["sales_pitch", "phishing", "real"] }, why: { type: "string" } }, required: ["kind"] } };
async function mailPitchCheck(env, m) {
  const u = wsdUsage();
  try {
    const out = await wsdAsk(env, u, "fast", { max_tokens: 200, system: "You screen the inbox of Studio Flow & Systems (a Brisbane web design, AI receptionist and automation studio). sales_pitch = an unsolicited cold pitch SELLING web design, SEO, marketing, lead generation, AI, automation, apps, outsourcing, funding or similar services TO the studio. phishing = fake bank/card/account/security alerts, invoices or login links. real = everything else, including customers, prospects, replies to our outreach, suppliers we use, partners, receipts, and anything you're unsure about. When unsure, answer real.", tools: [MAIL_PITCH_TOOL], messages: [{ role: "user", content: `FROM: ${m.name} <${m.from}> ${m.company}\nSUBJECT: ${m.subject}\n\n${m.text.slice(0, 2500)}` }] }, "classify_email");
    return out?.kind || "real";
  } finally { await wsdLog(env, u, "mail_screen").catch(() => {}); }
}
// Called for every inbound message the GHL "Customer replied" workflow sends to Command.
async function mailRulesCheck(env, { contactId, conversationId, inbound, payloadMsg, body }) {
  const type = String(inbound?.messageType || payloadMsg?.type || body?.message_type || "");
  if (!/email/i.test(type)) return null;
  const cfg = await mailRulesGet(env);
  if (!cfg.rules.length && !cfg.pitch_filter) return null;
  const c = await mailContact(env, contactId);
  if (c.tags.some((t) => MAIL_SAFE_TAGS.test(String(t)))) return null;
  const m = { from: c.from || String(body?.email || "").toLowerCase(), name: c.name || String(body?.full_name || ""), company: c.company, subject: String(inbound?.meta?.email?.subject || inbound?.subject || body?.subject || ""), text: inboxTxt(inbound?.body || payloadMsg?.body, 3000) };
  let why = null;
  const rule = cfg.rules.find((r) => mailMatch(r, m));
  if (rule) why = "rule: " + (rule.kind === "keyword" ? "mentions " : "from ") + rule.match;
  else if (cfg.pitch_filter) { const k = await mailPitchCheck(env, m); if (k !== "real") why = k === "phishing" ? "phishing" : "cold sales pitch"; }
  if (!why) return null;
  if (conversationId) await req(env, "DELETE", "/conversations/" + conversationId, null, "2021-04-15");
  await req(env, "POST", "/contacts/" + contactId + "/tags", { tags: ["blocked-sender"] }, "2021-07-28").catch(() => {});
  await mailLog(env, { from: m.from, name: m.name, subject: m.subject.slice(0, 160), snippet: m.text.slice(0, 300), why, contact_id: contactId, conversation_id: conversationId || null });
  return { deleted: true, why };
}
// Studio AI's tool: list / add / remove rules, pitch filter on/off, the log, and a sweep of emails already in the inbox.
async function mailRulesTool(env, a) {
  const cfg = await mailRulesGet(env);
  const act = String(a.action || "list");
  if (act === "add") {
    const match = String(a.match || "").trim().slice(0, 120);
    if (match.length < 3) return { ok: false, error: "Say who or what to block (at least 3 characters), e.g. americanexpress or American Express." };
    if (/^(gmail\.com|outlook\.com|hotmail\.com|yahoo\.com|icloud\.com|bigpond\.com|studioflowandsystems)/i.test(match.replace(/^@/, ""))) return { ok: false, error: "That would block far too much (it's a common email provider or our own domain). Use the sender's own name or domain." };
    const r = { id: Math.random().toString(36).slice(2, 9), kind: a.kind === "keyword" ? "keyword" : "sender", match, note: String(a.note || "").slice(0, 160), created: new Date().toISOString() };
    cfg.rules = cfg.rules.filter((x) => !(x.kind === r.kind && x.match.toLowerCase() === match.toLowerCase())).concat(r);
    await mailRulesPut(env, cfg);
    return { ok: true, rule: r, note: "New emails that match are deleted from GHL Conversations automatically and logged. Use action sweep to clear ones already in the inbox." };
  }
  if (act === "remove") { const n = cfg.rules.length; cfg.rules = cfg.rules.filter((x) => x.id !== a.id && x.match.toLowerCase() !== String(a.match || "").toLowerCase()); await mailRulesPut(env, cfg); return { ok: true, removed: n - cfg.rules.length }; }
  if (act === "pitch_filter_on" || act === "pitch_filter_off") { cfg.pitch_filter = act === "pitch_filter_on"; await mailRulesPut(env, cfg); return { ok: true, pitch_filter: cfg.pitch_filter, note: cfg.pitch_filter ? "Cold sales pitches and phishing are screened by AI and deleted (when unsure it keeps the email). Clients, prospects and outreach replies are never touched." : "Pitch filter off." }; }
  if (act === "log") { const v = await secGet(env, "mail_rules_log").catch(() => null); return { ok: true, deleted_recently: (v?.items || []).slice(0, 25) }; }
  if (act === "sweep") {
    const rules = a.match ? [{ kind: a.kind === "keyword" ? "keyword" : "sender", match: String(a.match) }] : cfg.rules;
    if (!rules.length) return { ok: false, error: "No rules yet. Add one first." };
    const found = new Map();
    for (const r of rules.slice(0, 10)) {
      const res = await req(env, "GET", "/conversations/search?" + q({ locationId: env.GHL_LOCATION_ID, query: r.match.replace(/^@/, ""), limit: 50 }), null, "2021-04-15").catch(() => null);
      for (const cv of res?.conversations || []) {
        if (!cv?.id || found.has(cv.id) || !/email/i.test(String(cv.lastMessageType || cv.type || ""))) continue;
        const c = await mailContact(env, cv.contactId);
        if (c.tags.some((t) => MAIL_SAFE_TAGS.test(String(t)))) continue;
        const m = { from: c.from || String(cv.email || ""), name: c.name || String(cv.fullName || cv.contactName || ""), company: c.company, subject: "", text: String(cv.lastMessageBody || "") };
        if (mailMatch(r, m)) found.set(cv.id, { conversation_id: cv.id, contact_id: cv.contactId, from: m.from, name: m.name, last: m.text.slice(0, 120), rule: r.match });
      }
    }
    const list = [...found.values()];
    if (a.dry_run !== false) return { ok: true, dry_run: true, would_delete: list.length, emails: list.slice(0, 30), note: "Nothing deleted yet. Show Ty the list; if he says yes, call again with dry_run false." };
    let n = 0;
    for (const x of list) { try { await req(env, "DELETE", "/conversations/" + x.conversation_id, null, "2021-04-15"); await req(env, "POST", "/contacts/" + x.contact_id + "/tags", { tags: ["blocked-sender"] }, "2021-07-28").catch(() => {}); await mailLog(env, { ...x, why: "sweep: " + x.rule }); n++; } catch (e) { return { ok: false, deleted: n, error: "GHL refused: " + String(e.message).slice(0, 200) + " (check the conversations.write scope)" }; } }
    return { ok: true, deleted: n };
  }
  return { ok: true, rules: cfg.rules, pitch_filter: cfg.pitch_filter };
}
