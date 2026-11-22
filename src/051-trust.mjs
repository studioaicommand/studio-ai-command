// v150 Trust pack: "your data is yours".
// 1. Privacy policy wording for automated decisions (APP 1.7 to 1.9, in force from 10 December 2026), written from
//    what this Command actually does: which channels the AI answers on its own, which wait for a person, the Phone AI,
//    follow-ups and review requests. Health businesses get the health information line. Cautious approach, as the
//    OAIC suggests: everything the AI does is listed. Not legal advice, and it says so.
// 2. One-click export of everything Command stores for the business (JSON, or CSV per table). Logins, keys and
//    Studio's internal costs are never included.
// 3. A plain "what Command stores and who can see it" summary for the Privacy & data screen.
var TRUST_HEALTH_TEMPLATES = new Set(["allied_health", "dental", "aesthetics_beauty"]);
var TRUST_HEALTH_RE = /physio|dental|dentist|clinic|health|medical|doctor|gp\b|chiro|psych|podiat|osteo|myo|massage|skin|cosmetic|aesthetic|injectable|pilates|counsel|therap|optom|audiolog|pharma|vet\b|naturopath/i;
var TRUST_CHANNELS = { sms: "text message", ig: "Instagram", fb: "Facebook Messenger", chat: "our website chat" };
// What a business owns. Studio-only tables are added for Studio's own Command.
var TRUST_TABLES = [
  ["studio_command_records", "Calls, messages and records Command saved"],
  ["team_actions", "Every action Command did or suggested, with who approved it"],
  ["team_reports", "Briefings and reports"],
  ["team_memory", "Knowledge: your prices, hours, rules and facts"],
  ["team_threads", "Chats with Command"],
  ["team_messages", "Chat messages with Command"],
  ["team_audit", "History log: who did what, when"],
  ["client_conversations", "Website chat conversations"],
  ["leads", "Leads from your website"],
  ["conversations", "Conversations (older website chat)"],
  ["messages", "Messages (older website chat)"],
  ["agent_clients", "Clients"]
];
var TRUST_STUDIO_TABLES = [["agent_prospects", "Outreach prospects"], ["agent_leads", "Outreach leads"], ["agent_messages", "Outreach messages"], ["agent_demos", "Website demos"], ["team_usage", "AI and phone usage"]];
// Settings that are business choices (safe to hand over). Logins, keys, tokens, sessions and links are never exported.
var TRUST_SETTING_KEYS = ["inbox", "offer", "pricing", "mission", "replies", "charter", "value_ledger", "trust", "shifts", "autopilot", "money", "hunts", "campaign", "outreach"];
async function trustFacts(env) {
  const inst = await instGet(env).catch(() => ({})) || {};
  const custom = !!inst.custom;
  const settings = await getSettings(env).catch(() => ({}));
  const ib = inboxSettings(settings);
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const calls = await select(env, "studio_command_records", "source=eq.call&external_key=like.voiceai*&occurred_at=gte." + encodeURIComponent(since) + "&select=id&limit=1").catch(() => []);
  const st = (await select(env, "team_settings", "key=eq.trust&select=value&limit=1").catch(() => []))?.[0]?.value || {};
  const auto = Object.keys(TRUST_CHANNELS).filter((k) => ib[k] === "auto"), ask = Object.keys(TRUST_CHANNELS).filter((k) => ib[k] === "approve");
  const autopilot = Object.keys(AUTOPILOT_TYPES).filter((k) => settings?.autopilot?.[k] === "auto");
  const health = TRUST_HEALTH_TEMPLATES.has(inst.template) || TRUST_HEALTH_RE.test(String(inst.industry || ""));
  return {
    custom, business: inst.business_name || "Studio Flow & Systems", industry: inst.industry || "", health,
    phone_ai: calls.length > 0 || st.phone_ai === true, auto, ask, followup: ib.followup, reviews: ib.reviews, autopilot,
    contact: String(st.contact || "").slice(0, 200), generated_at: st.generated_at || null
  };
}
function trustList(arr) { return arr.length < 2 ? arr.join("") : arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1]; }
// Plain-English wording an owner can paste into their privacy policy.
function trustWording(f) {
  const B = f.business, ch = (ks) => trustList(ks.map((k) => TRUST_CHANNELS[k]));
  const info = ["your name and contact details (phone number, email address or social media name)", "the messages you send us and our replies", "your booking details and appointment history"];
  if (f.phone_ai) info.push("recordings, transcripts and summaries of phone calls answered by our AI phone assistant");
  if (f.health) info.push("health information you choose to share with us, such as the reason for your visit or an injury or condition you mention");
  if (!f.custom) info.push("publicly available business details, such as a business name, website, reviews and the name of the owner");
  info.push("notes our team adds to your record");
  const solely = [];
  if (f.auto.length) solely.push("replying to enquiries sent by " + ch(f.auto) + " and answering questions about our services, prices and availability, without a staff member checking each reply first");
  if (f.auto.length || f.phone_ai) solely.push("offering available appointment times and booking, moving or confirming appointments");
  if (f.phone_ai) solely.push("answering phone calls, deciding whether a call is urgent and needs a call back from our team, and passing calls on to a staff member");
  if (f.followup === "auto") solely.push("sending a follow-up message to people who enquired but didn't book");
  if (f.reviews === "auto") solely.push("asking customers to leave a review after a visit");
  if (f.autopilot.includes("ghl_tags") || f.autopilot.includes("ghl_opportunity_status")) solely.push("sorting enquiries into groups (for example new enquiry, booked or not interested), which can decide which follow-up messages a person receives");
  const assisted = [];
  if (f.ask.length) assisted.push("writing replies to enquiries sent by " + ch(f.ask) + ", which a staff member checks before they're sent");
  if (f.followup === "approve") assisted.push("suggesting follow-up messages to people who enquired but didn't book, which a staff member approves first");
  if (f.reviews === "approve") assisted.push("suggesting which customers to ask for a review, which a staff member approves first");
  assisted.push("summarising enquiries and calls, and flagging the ones that look urgent so our team can respond first");
  assisted.push("suggesting changes to bookings, such as cancelling or moving an appointment, which a staff member approves first");
  if (!f.custom) assisted.push("finding businesses that may benefit from our services, finding the owner's name from public sources, and ranking which businesses to contact first. A person decides who is contacted and approves every first message");
  const L = [];
  L.push("## Automated decisions and AI");
  L.push("");
  L.push(B + " uses an AI assistant, which is software that runs on computer programs, to help us respond to you quickly and manage bookings. This section explains what personal information it uses and what it decides.");
  L.push("");
  L.push("**Personal information the AI uses**");
  L.push("");
  for (const x of info) L.push("- " + x[0].toUpperCase() + x.slice(1));
  L.push("");
  if (solely.length) {
    L.push("**Decisions our AI makes on its own**");
    L.push("");
    for (const x of solely) L.push("- " + x[0].toUpperCase() + x.slice(1));
    L.push("");
  }
  L.push("**Decisions where our AI does part of the work and a person decides**");
  L.push("");
  for (const x of assisted) L.push("- " + x[0].toUpperCase() + x.slice(1));
  L.push("");
  L.push("Our AI doesn't change prices for individual people" + (f.health ? ", and it doesn't diagnose, give medical advice or decide your treatment. Those decisions are always made by our practitioners." : ". Decisions about the services we provide to you are made by our team."));
  L.push("");
  L.push("**Talking to a person**");
  L.push("");
  L.push("You can ask to speak with a person at any time, ask us to review any decision our AI made about you, or ask how your information was used. " + (f.contact ? "Contact us at " + f.contact + "." : "Contact us at [your email or phone number]."));
  return L.join("\n");
}
async function trustAdm(env, body = {}) {
  if (body.contact != null || body.phone_ai != null) {
    const st = (await select(env, "team_settings", "key=eq.trust&select=value&limit=1").catch(() => []))?.[0]?.value || {};
    const next = { ...st };
    if (body.contact != null) next.contact = String(body.contact).replace(/[<>]/g, "").trim().slice(0, 200);
    if (body.phone_ai != null) next.phone_ai = body.phone_ai === true;
    next.generated_at = new Date().toISOString();
    await saveSetting(env, "trust", next);
  }
  const f = await trustFacts(env);
  const md = trustWording(f);
  const used = [
    f.auto.length ? "AI replies on its own: " + trustList(f.auto.map((k) => TRUST_CHANNELS[k])) : "",
    f.ask.length ? "AI drafts, a person approves: " + trustList(f.ask.map((k) => TRUST_CHANNELS[k])) : "",
    f.phone_ai ? "Phone AI answers calls" : "",
    f.followup !== "off" ? "Follow-ups: " + (f.followup === "auto" ? "sent automatically" : "approved by a person") : "",
    f.reviews !== "off" ? "Review requests: " + (f.reviews === "auto" ? "sent automatically" : "approved by a person") : "",
    f.health ? "Health business: health information line included" : "",
    f.autopilot.length ? "Autopilot on for: " + f.autopilot.join(", ") : ""
  ].filter(Boolean);
  return {
    ok: true, business: f.business, starts: "2026-12-10", markdown: md, text: md.replace(/^## /gm, "").replace(/\*\*/g, ""), based_on: used, contact: f.contact, health: f.health,
    note: "Written from what your Command does today. If you switch channels to automatic or turn on the Phone AI, make the wording again. This isn't legal advice: if your business handles sensitive information, have your adviser check it."
  };
}
async function trustTables(env, custom) {
  return custom ? TRUST_TABLES : TRUST_TABLES.concat(TRUST_STUDIO_TABLES);
}
function trustCsv(rows) {
  if (!rows.length) return "";
  const cols = [...rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set())];
  const cell = (v) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}
async function trustRows(env, table) {
  return await select(env, table, "select=*&order=created_at.asc&limit=20000").catch(() => select(env, table, "select=*&limit=20000").catch(() => []));
}
async function trustSummary(env) {
  const inst = await instGet(env).catch(() => ({})) || {}, custom = !!inst.custom;
  const tables = await trustTables(env, custom);
  const counts = await Promise.all(tables.map(async ([t, label]) => {
    const r = await select(env, t, "select=id&limit=20000").catch(() => null);
    return { table: t, label, rows: Array.isArray(r) ? r.length : 0 };
  }));
  return { ok: true, business: inst.business_name || "Studio Flow & Systems", custom, tables: counts.filter((c) => c.rows > 0), never: ["Logins, passwords, keys and access codes", "Connection tokens for your apps", custom ? "Your provider's own costs for running your Command" : "Client copies' private data"] };
}
async function trustExport(env, { table, format = "json" } = {}) {
  const inst = await instGet(env).catch(() => ({})) || {}, custom = !!inst.custom;
  const tables = await trustTables(env, custom);
  const day = new Date(Date.now() + 10 * 36e5).toISOString().slice(0, 10);
  const slug = String(inst.business_name || "command").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "command";
  if (table) {
    const hit = tables.find(([t]) => t === table);
    if (!hit) return { ok: false, error: "That isn't one of your tables." };
    const rows = await trustRows(env, table);
    return format === "csv" ? { ok: true, filename: slug + "-" + table + "-" + day + ".csv", mime: "text/csv", content: trustCsv(rows), rows: rows.length } : { ok: true, filename: slug + "-" + table + "-" + day + ".json", mime: "application/json", content: JSON.stringify(rows, null, 1), rows: rows.length };
  }
  const out = { exported_at: new Date().toISOString(), business: inst.business_name || "Studio Flow & Systems", about: "Everything Command stores for this business. Logins, keys and access codes are not included.", tables: {}, settings: {} };
  let total = 0;
  for (const [t, label] of tables) { const rows = await trustRows(env, t); if (rows.length) { out.tables[t] = { label, rows }; total += rows.length; } }
  const st = await select(env, "team_settings", "key=in.(" + TRUST_SETTING_KEYS.join(",") + ")&select=key,value").catch(() => []);
  for (const r of st) out.settings[r.key] = r.value;
  return { ok: true, filename: slug + "-command-export-" + day + ".json", mime: "application/json", content: JSON.stringify(out, null, 1), rows: total };
}
async function trustRoute(p, m, body, env) {
  if (p === "/trust" && m === "GET") return json(await trustSummary(env));
  if (p === "/trust/adm" && (m === "GET" || m === "POST")) return json(await trustAdm(env, m === "POST" ? body : {}));
  if (p === "/trust/export" && m === "GET") {
    const r = await trustExport(env, { table: body.table || "", format: body.format === "csv" ? "csv" : "json" });
    if (r.ok) await audit(env, { actor: "owner", action: "data_export", target_type: "export", target_id: body.table || "all", summary: "Exported " + (body.table || "all data") + " (" + r.rows + " rows, " + (body.format === "csv" ? "CSV" : "JSON") + ")" }).catch(() => {});
    return json(r, r.ok ? 200 : 400);
  }
  return null;
}
