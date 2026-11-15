// src/team/clients.js
var CHECKLIST = [
  ["paid", "Pilot paid"],
  ["setup_call", "Setup call booked / held"],
  ["details_confirmed", "Hours, services, prices and booking link confirmed with the owner"],
  ["alerts_set", "Alert contacts set (who gets new enquiries)"],
  ["knowledge_reviewed", "Owner reviewed the answers (corrections added)"],
  ["safety_passed", "Safety test passed"],
  ["installed", "Receptionist installed on their website"],
  ["missed_call", "Missed-call text-back set up in GHL"],
  ["sms_followup", "Front Desk: SMS follow-up for new enquiries switched on in GHL"],
  ["reviews", "Front Desk: Google review requests switched on in GHL"],
  ["monthly_report", "Front Desk: monthly results report scheduled"],
  ["test_enquiry", "Test enquiry received by their team"],
  ["signoff", "Owner signed off: go live"]
];
var ROLL_DAYS = 90;
var ORIGIN = (env) => env.PUBLIC_ORIGIN || DEFAULT_ORIGIN;
var newKey = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);
var embedCode = (env, c) => `<script src="${ORIGIN(env)}/w/${c.widget_key}.js" async></script>`;
var esc5 = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
var COST = { chat_in_per_m: 1.55, chat_out_per_m: 7.75, sms_aud: 0.1, email_aud: 2e-3, voice_per_min: 0.15 };
var convCost = (inT, outT) => Math.round(((inT || 0) * COST.chat_in_per_m + (outT || 0) * COST.chat_out_per_m) / 100) / 1e4;
async function createClient(env, { demo_token, prospect_id, website, name, vertical, plan_monthly, pilot_price, paid = false, status = "onboarding", voice = false } = {}) {
  let d = null, p = null;
  if (demo_token) [d] = await select(env, "agent_demos", `token=eq.${enc(demo_token)}&select=token,prospect_id,business_name,website,vertical,kb&limit=1`).catch(() => []);
  if (prospect_id || d?.prospect_id) [p] = await select(env, "agent_prospects", `id=eq.${enc(prospect_id || d.prospect_id)}&select=id,business_name,website,vertical,phone,email,decision_maker,demo_token&limit=1`).catch(() => []);
  const site = website || d?.website || p?.website;
  if (!site) throw new Error("Give a website, a prospect or a demo.");
  const exists = await select(env, "agent_clients", `website=eq.${enc(site)}&status=neq.cancelled&select=id&limit=1`).catch(() => []);
  if (exists.length) throw new Error("This business is already a client.");
  if (!d && p?.demo_token && /^[a-f0-9]{40}$/.test(p.demo_token)) [d] = await select(env, "agent_demos", `token=eq.${p.demo_token}&select=token,prospect_id,business_name,website,vertical,kb&limit=1`).catch(() => []);
  if (!d) {
    const built = await buildDemo(env, { id: p?.id, website: site, business_name: name || p?.business_name || site, vertical: vertical || p?.vertical || "other" }, { force: !p });
    d = { token: built.token, kb: built.kb, vertical: vertical || p?.vertical || "other", business_name: built.kb.clinic_name };
  }
  const settings = await getSettings(env).catch(() => ({}));
  const offer = offerOf(settings);
  const v = vertical || d.vertical || p?.vertical || "other";
  const kb = { ...d.kb, mode: modeOf(d.kb, v) };
  const checklist = Object.fromEntries(CHECKLIST.map(([k]) => [k, false]));
  if (paid) checklist.paid = true;
  const row = {
    business_name: (name || kb.clinic_name || d.business_name || site).slice(0, 200),
    website: site,
    vertical: v,
    mode: kb.mode,
    status,
    prospect_id: p?.id || null,
    demo_token: d.token,
    widget_key: newKey(),
    kb,
    extra_facts: "",
    alert_name: p?.decision_maker || null,
    alert_email: null,
    alert_phone: null,
    plan_monthly: plan_monthly ?? (voice ? offer.monthly_voice : offer.monthly),
    pilot_price: pilot_price ?? (voice ? offer.pilot_price_voice : offer.pilot_price),
    voice_enabled: !!voice,
    look: { name: "", greeting: "", accent: kb.brand?.colour || "", logo: kb.brand?.icon || "", theme: "dark", launcher: "", position: "right" },
    knowledge: {},
    paid_at: paid ? now() : null,
    pilot_ends_at: paid ? new Date(Date.now() + offer.pilot_days * 864e5).toISOString() : null,
    checklist,
    safety: null
  };
  const [c] = await insert(env, "agent_clients", [row]);
  if (p?.id) await update(env, "agent_prospects", `id=eq.${p.id}`, { status: "won", updated_at: now() }).catch(() => {
  });
  await audit(env, { actor: "Studio AI", action: "client_created", target_type: "client", target_id: c.id, summary: `${row.business_name} became a client (${status})` }).catch(() => {
  });
  return c;
}
async function getClient(env, id) {
  const [c] = await select(env, "agent_clients", `id=eq.${enc(id)}&limit=1`);
  if (!c) throw new Error("Client not found.");
  return c;
}
async function clientByKey(env, key) {
  if (!/^[a-f0-9]{24}$/.test(key || "")) return null;
  const [c] = await select(env, "agent_clients", `widget_key=eq.${key}&limit=1`).catch(() => []);
  return c || null;
}
function liveGate(c) {
  const k = c.checklist || {};
  const missing = [];
  if (!k.safety_passed) missing.push("pass the safety test");
  if (!(c.alert_email || c.alert_phone)) missing.push("set who gets new enquiries");
  if (!k.installed) missing.push("install it on their website");
  return missing;
}
async function updateClient(env, id, body) {
  const c = await getClient(env, id);
  const patch = { updated_at: now() };
  for (const k of ["alert_name", "alert_email", "alert_phone", "notes", "business_name"]) if (typeof body[k] === "string") patch[k] = body[k].trim().slice(0, 300) || null;
  if (patch.alert_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.alert_email)) throw new Error("That alert email doesn't look right.");
  if (patch.alert_phone && !/^\+?[\d\s()-]{8,16}$/.test(patch.alert_phone)) throw new Error("That alert mobile doesn't look right.");
  if (typeof body.extra_facts === "string") patch.extra_facts = body.extra_facts.slice(0, 4e3);
  for (const k of ["plan_monthly", "pilot_price"]) if (body[k] != null && Number.isFinite(+body[k]) && +body[k] >= 0) patch[k] = Math.round(+body[k]);
  if (typeof body.voice_enabled === "boolean") {
    patch.voice_enabled = body.voice_enabled;
    if (body.plan_monthly == null && c.voice_enabled !== body.voice_enabled) {
      const offer = offerOf(await getSettings(env).catch(() => ({})));
      if (+c.plan_monthly > 0) patch.plan_monthly = body.voice_enabled ? offer.monthly_voice : offer.monthly;
    }
  }
  if (body.look && typeof body.look === "object") {
    const L = body.look, cur = c.look || {};
    const look = { ...cur };
    if (typeof L.name === "string") look.name = L.name.trim().slice(0, 30);
    if (typeof L.greeting === "string") look.greeting = L.greeting.trim().slice(0, 240);
    if (typeof L.launcher === "string") look.launcher = L.launcher.trim().slice(0, 30);
    if (typeof L.accent === "string") {
      const a = L.accent.trim();
      if (a && !/^#[0-9a-f]{6}$/i.test(a)) throw new Error("Colour must look like #1A2B3C.");
      look.accent = a;
    }
    if (typeof L.logo === "string") {
      const u2 = L.logo.trim();
      if (u2 && !/^https:\/\/[^\s"<>]+$/.test(u2)) throw new Error("Logo must be an https:// image link.");
      look.logo = u2;
    }
    if (["light", "dark"].includes(L.theme)) look.theme = L.theme;
    if (["right", "left"].includes(L.position)) look.position = L.position;
    patch.look = look;
  }
  if (body.knowledge && typeof body.knowledge === "object") {
    const k = { ...c.knowledge || {} };
    for (const [key] of KNOWLEDGE_FIELDS) if (typeof body.knowledge[key] === "string") k[key] = body.knowledge[key].slice(0, 3e3);
    patch.knowledge = k;
  }
  const checklist = { ...c.checklist || {} };
  if (body.checklist && typeof body.checklist === "object") {
    for (const [k, v] of Object.entries(body.checklist)) if (CHECKLIST.some(([x]) => x === k) && k !== "safety_passed" && k !== "installed") checklist[k] = !!v;
  }
  if ((patch.alert_email ?? c.alert_email) || (patch.alert_phone ?? c.alert_phone)) checklist.alerts_set = true;
  if (typeof body.extra_facts === "string" && body.extra_facts.trim() || patch.knowledge && Object.values(patch.knowledge).some((v) => String(v).trim())) checklist.knowledge_reviewed = true;
  if (patch.knowledge || typeof body.extra_facts === "string") {
    checklist.safety_passed = false;
    if (c.safety) patch.safety = { ...c.safety, stale: true };
  }
  patch.checklist = checklist;
  if ("alert_email" in patch || "alert_phone" in patch || "alert_name" in patch) patch.ghl_contact_id = null;
  if (body.status) {
    const to = String(body.status);
    if (!["onboarding", "live", "paused", "cancelled"].includes(to)) throw new Error("Unknown status.");
    if (to === "live") {
      const miss = liveGate({ ...c, ...patch, checklist });
      if (miss.length) throw new Error("Before going live: " + miss.join(", ") + ".");
      checklist.signoff = true;
      if (!c.started_live_at) patch.started_live_at = now();
    }
    patch.status = to;
  }
  const [u] = await update(env, "agent_clients", `id=eq.${c.id}`, patch);
  if (body.status && body.status !== c.status) await audit(env, { actor: "Ty", action: "client_status", target_type: "client", target_id: c.id, summary: `${c.business_name}: ${c.status} \u2192 ${body.status}` }).catch(() => {
  });
  return u || { ...c, ...patch };
}
async function refreshKnowledge(env, id) {
  const c = await getClient(env, id);
  const built = await buildDemo(env, { id: c.prospect_id, website: c.website, business_name: c.business_name, vertical: c.vertical }, { force: true });
  const kb = { ...built.kb, mode: c.mode || modeOf(built.kb, c.vertical) };
  const checklist = { ...c.checklist || {}, safety_passed: false };
  await update(env, "agent_clients", `id=eq.${c.id}`, { kb, checklist, safety: c.safety ? { ...c.safety, stale: true } : null, updated_at: now() });
  return { ok: true, quality: built.quality, note: "Knowledge refreshed from their website. Run the safety test again before going live." };
}
async function alertContact(env, c) {
  if (c.ghl_contact_id) return c.ghl_contact_id;
  if (!enabled(env) || !c.alert_email) return null;
  const id = await upsertContact(env, { email: c.alert_email, firstName: c.alert_name || c.business_name, tags: ["sf-client-alerts"], source: "Studio AI receptionist alerts" });
  if (id && c.alert_phone) await updateContact(env, id, { phone: c.alert_phone }).catch(() => {
  });
  if (id) await update(env, "agent_clients", `id=eq.${c.id}`, { ghl_contact_id: id }).catch(() => {
  });
  return id;
}
async function sendLeadAlert(env, c, lead, { test = false } = {}) {
  const out = { email: null, sms: null };
  let cid = null;
  try {
    cid = await alertContact(env, c);
  } catch (e) {
    out.email = out.sms = "GHL contact: " + String(e.message).slice(0, 120);
    return out;
  }
  if (!cid) {
    out.email = out.sms = "No alert email set (or GHL not connected).";
    return out;
  }
  const who = [lead.name, lead.phone, lead.email].filter(Boolean).join(" \xB7 ");
  const subject = `${test ? "TEST: " : ""}New enquiry from your AI receptionist${lead.name ? `: ${lead.name}` : ""}`;
  const html = `<p style="font:15px/1.5 -apple-system,Segoe UI,Arial,sans-serif">${test ? "<b>This is a test alert.</b><br><br>" : ""}<b>${esc5(who || "A website visitor")}</b>${lead.urgent ? ` <span style="color:#c0392b">(urgent)</span>` : ""}<br>${esc5(lead.reason || "Wants to hear from the team")}${lead.preferred_time ? `<br>Preferred time: ${esc5(lead.preferred_time)}` : ""}<br><br>Please call or reply to them soon. The receptionist told them the team will be in touch.<br><span style="color:#5B6B82;font-size:13px">${esc5(c.business_name)} \xB7 AI receptionist by Studio Flow &amp; Systems</span></p>`;
  const sms = `${test ? "TEST: " : ""}New enquiry (${c.business_name}): ${who || "website visitor"}. ${String(lead.reason || "").slice(0, 120)}${lead.urgent ? " URGENT" : ""}`;
  out.email = await sendEmail(env, cid, subject, html).then(() => "sent").catch((e) => String(e.message).slice(0, 120));
  out.sms = c.alert_phone ? await sendSms(env, cid, sms).then(() => "sent").catch((e) => String(e.message).slice(0, 120)) : "no mobile set";
  return out;
}
async function testAlert(env, id) {
  const c = await getClient(env, id);
  const r = await sendLeadAlert(env, c, { name: "Test enquiry", phone: "0400 000 000", reason: "This is a test from Studio AI: your new-enquiry alerts are working." }, { test: true });
  if (r.email === "sent" || r.sms === "sent") await update(env, "agent_clients", `id=eq.${c.id}`, { checklist: { ...c.checklist || {}, test_enquiry: true } }).catch(() => {
  });
  return { ok: r.email === "sent" || r.sms === "sent", ...r };
}
var monthStart = () => {
  const b = new Date(Date.now() + 10 * 36e5);
  b.setUTCDate(1);
  b.setUTCHours(0, 0, 0, 0);
  return new Date(b.getTime() - 10 * 36e5).toISOString();
};

// v32: client book. Every business we work with, what they bought, and what to offer next.
var INDUSTRY_LIST = [["general", "Service business"], ["dental", "Dental"], ["allied", "Allied health"], ["medical", "Medical / GP"], ["psychology", "Psychology & counselling"], ["beauty", "Beauty, hair & skin"], ["trades", "Trades & home services"], ["property", "Property management"], ["coaching", "Coaches & consultants"], ["hospitality", "Hospitality"], ["fitness", "Fitness"]];
var INDUSTRY_LABEL = Object.fromEntries(INDUSTRY_LIST);
var COMMAND_CHECKS = [["agreement", "Agreement signed and setup paid"], ["crm", "CRM connected (their GoHighLevel sub-account)"], ["stripe", "Stripe connected (read-only key)"], ["telegram", "Owner's Telegram linked for briefs and approvals"], ["receptionist", "AI receptionist live on their website"], ["replies", "Message replies on (Instagram, Facebook, SMS)"], ["followup", "Follow-ups and review requests on"], ["money", "Money recovery on (unpaid invoices, failed payments)"], ["brief", "Morning brief scheduled"], ["logins", "Team logins created"], ["brand", "White-label: logo, colours, AI name, domain (if bought)"], ["training", "Owner walkthrough done"], ["live", "Signed off: live"]];
var COMMAND_IDS = ["command_core", "command_growth", "command_enterprise", "command_founding", "command_whitelabel"];
function bookOwned(entry) {
  const own = new Set();
  for (const p of entry.products || []) {
    if (p.status === "cancelled") continue;
    own.add(p.id);
    if (p.custom) { const t = String(p.title || "").toLowerCase(); if (/receptionist|front desk/.test(t)) own.add("chat"); if (/\bcrm\b|gohighlevel|ghl/.test(t)) own.add("crm_setup"); if (/website|site build/.test(t)) own.add("website_launch"); if (/seo/.test(t)) own.add("seo"); if (/care|hosting/.test(t)) own.add("care"); if (/command/.test(t)) own.add("command_core"); if (/automation/.test(t)) own.add("automation_build"); }
  }
  if (entry.receptionist_id) own.add("chat");
  return own;
}
function bookUpsells(entry, cat, REC = {}) {
  const own = bookOwned(entry);
  const has = (...ids) => ids.some((x) => own.has(x));
  const ind = entry.industry || "general", out = [];
  const add = (id, why) => { const i = cat.items?.[id]; if (!own.has(id) && i && i.enabled !== false && out.length < 3 && !out.some((o) => o.id === id)) out.push({ id, title: i.title, price: REC[id] ? REC[id].price : +i.price || 0, unit: REC[id] ? "month" : i.unit || "", why }); };
  const site = has("website_launch", "website_growth", "website_signature"), rec = has("chat", "web_voice", "phone"), cmd = has("command_core", "command_growth", "command_enterprise", "command_founding");
  if (cmd) { if (has("command_core", "command_founding")) add("command_growth", "Ready for phone AI, social replies and more locations"); add("command_whitelabel", "Put Command in their own brand, name and colours"); }
  else if (has("web_voice") || (rec && has("crm_setup", "systems_build"))) add("command_core", "Already running reception and a CRM: Command ties it together and recovers lost money");
  if (!rec && !cmd) add(["trades", "property", "dental", "allied", "medical", "beauty"].includes(ind) ? "web_voice" : "chat", "Every enquiry answered in seconds, day and night");
  if (has("chat") && !has("web_voice")) add("web_voice", "Add voice, missed-call text-back, follow-up and review requests");
  if (has("web_voice") && !has("phone") && ["trades", "property", "dental", "allied", "medical"].includes(ind)) add("phone", "Phone-heavy industry: answer every call too");
  if (site && !has("care")) add("care", "Their site is ours: keep it fast, secure and updated");
  if (site && !has("seo")) add("seo", "Get found first on Google and in AI answers");
  if (!site) add("website_growth", "A website that turns visitors into bookings");
  if (!has("crm_setup", "systems_build") && !cmd) add("crm_setup", "Enquiries, bookings and payments in one place");
  if (!out.length) add("audit", "Review what to improve next");
  return out;
}
function bookMoney(entry) {
  let mrr = 0, setup = 0;
  for (const p of entry.products || []) { if (p.status === "cancelled") continue; if (p.unit === "month") mrr += +p.price || 0; else setup += +p.price || 0; setup += +p.setup || 0; }
  return { mrr, setup };
}
async function bookLoad(env) {
  const rows = await select(env, "team_settings", "key=eq.client_book&select=value&limit=1").catch(() => []);
  const v = rows?.[0]?.value;
  return v && typeof v.items === "object" && !Array.isArray(v.items) ? v.items : {};
}
async function bookRoute(env, m, seg, body) {
  const items = await bookLoad(env);
  const catRow = await select(env, "team_settings", "key=eq.offer_catalog&select=value&limit=1").catch(() => []);
  const cat = offersCatalog(catRow?.[0]?.value || {});
  const off = await siteOffer(env).catch(() => null);
  const REC = { chat: { price: +off?.monthly || 297, setup: +off?.pilot_price || 497 }, web_voice: { price: +off?.monthly_voice || 497, setup: +off?.pilot_price_voice || 697 }, phone: { price: 697, setup: 0 } };
  const unitOf = (id) => REC[id] ? "month" : cat.items?.[id]?.unit || "";
  const titleOf = (id) => cat.items?.[id]?.title || id;
  if (m === "GET") {
    const rec = await listClients(env).catch(() => ({ clients: [] }));
    const list = [];
    const seen = new Set();
    for (const r of rec.clients || []) {
      const key = "rc-" + r.id; seen.add(key);
      const base = items[key] || { id: key, name: r.business_name, website: r.website, status: r.status === "live" ? "active" : r.status, industry: r.industry || "general", products: [{ id: +r.plan_monthly >= 497 ? "web_voice" : "chat", price: +r.plan_monthly || 297, setup: r.paid_at ? +r.pilot_price || 0 : 0, status: "active", since: String(r.paid_at || "").slice(0, 10) }] };
      list.push({ ...base, id: key, receptionist_id: r.id, receptionist: { status: r.status, leads: r.leads, checklist: r.checklist_done + "/" + r.checklist_total } });
    }
    for (const [k, e] of Object.entries(items)) if (!seen.has(k)) list.push({ ...e, id: k });
    const out = list.map((e) => {
      const products = (e.products || []).map((p) => p.custom ? { ...p, unit: p.unit === "month" ? "month" : "" } : { ...p, unit: unitOf(p.id), title: titleOf(p.id), list_price: REC[p.id] ? REC[p.id].price : +cat.items?.[p.id]?.price || 0 });
      const entry = { ...e, products };
      const money = bookMoney(entry);
      const hasCmd = products.some((p) => p.status !== "cancelled" && COMMAND_IDS.includes(p.id));
      const checks = e.command?.checks || {};
      return { ...entry, ...money, industry: e.industry || "general", industry_label: INDUSTRY_LABEL[e.industry] || "Service business", upsells: bookUpsells(entry, cat, REC), has_command: hasCmd, command_done: COMMAND_CHECKS.filter(([k]) => checks[k]).length, command_total: COMMAND_CHECKS.length };
    }).sort((a, b) => (b.mrr - a.mrr) || String(a.name).localeCompare(String(b.name)));
    const discount = out.reduce((s, c) => s + (c.status === "past" ? 0 : c.products.filter((p) => p.status !== "cancelled" && p.unit === "month" && p.list_price > p.price).reduce((t, p) => t + (p.list_price - p.price), 0)), 0);
    const totals = { discount_mrr: discount, clients: out.filter((c) => c.status !== "past").length, mrr: out.reduce((s, c) => s + (c.status === "past" ? 0 : c.mrr), 0), setup: out.reduce((s, c) => s + c.setup, 0), receptionists: out.filter((c) => { const o = bookOwned(c); return o.has("chat") || o.has("web_voice") || o.has("phone"); }).length, command: out.filter((c) => c.has_command).length, upsell_mrr: out.reduce((s, c) => s + (c.status === "past" ? 0 : (c.upsells.find((u) => u.unit === "month")?.price || 0)), 0) };
    const catalog = Object.values(cat.items || {}).filter((i) => i.enabled !== false).map((i) => ({ id: i.id, title: i.title, price: REC[i.id] ? REC[i.id].price : +i.price || 0, setup: REC[i.id] ? REC[i.id].setup : ({ command_core: 4900, command_growth: 9500, command_enterprise: 18000, command_founding: 2900 })[i.id] || 0, unit: unitOf(i.id), group: i.group }));
    return json({ ok: true, clients: out, totals, catalog, checks: COMMAND_CHECKS, industries: INDUSTRY_LIST });
  }
  if (m === "POST" && seg[1] === "delete") {
    const id = String(body.id || "");
    if (!items[id] || id.startsWith("rc-")) return json({ ok: false, error: "That client can't be removed here." }, 400);
    delete items[id];
    await saveSetting(env, "client_book", { items });
    return json({ ok: true });
  }
  if (m === "POST") {
    const c = body.client || {};
    const name = String(c.name || "").trim().slice(0, 120);
    if (!name) return json({ ok: false, error: "Add the business name." }, 400);
    const id = c.receptionist_id ? "rc-" + String(c.receptionist_id).replace(/[^a-z0-9-]/gi, "") : /^b-[a-z0-9]{6,12}$/.test(String(c.id || "")) ? c.id : "b-" + crypto.randomUUID().replace(/-/g, "").slice(0, 10);
    const products = (Array.isArray(c.products) ? c.products : []).filter((p) => p && (cat.items?.[p.id] || (/^custom-[a-z0-9]{4,12}$/.test(String(p.id)) && String(p.title || "").trim()))).slice(0, 30).map((p) => ({ id: p.id, ...(cat.items?.[p.id] ? {} : { custom: true, title: String(p.title).trim().slice(0, 80), unit: p.unit === "month" ? "month" : "" }), price: Math.max(0, Math.min(1e6, +p.price || 0)), setup: Math.max(0, Math.min(1e6, +p.setup || 0)), status: ["active", "paused", "cancelled"].includes(p.status) ? p.status : "active", since: /^\d{4}-\d{2}-\d{2}$/.test(String(p.since || "")) ? p.since : new Date().toISOString().slice(0, 10) }));
    const checks = {};
    for (const [k] of COMMAND_CHECKS) if (c.command?.checks?.[k]) checks[k] = true;
    items[id] = { name, website: String(c.website || "").trim().slice(0, 200), industry: INDUSTRY_LABEL[c.industry] ? c.industry : "general", status: ["active", "onboarding", "paused", "past"].includes(c.status) ? c.status : "active", notes: String(c.notes || "").slice(0, 2000), deal: String(c.deal || "").slice(0, 160), billing_email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(c.billing_email || "").trim()) ? String(c.billing_email).trim().toLowerCase().slice(0, 160) : "", billing_phone: String(c.billing_phone || "").replace(/[^0-9+ ]/g, "").slice(0, 20), products, command: { checks }, updated_at: new Date().toISOString(), ...(c.receptionist_id ? { receptionist_id: String(c.receptionist_id) } : {}) };
    await saveSetting(env, "client_book", { items });
    await audit(env, { actor: "Ty", action: "client_book_saved", target_type: "client", target_id: id, summary: name + ": " + products.filter((p) => p.status !== "cancelled").map((p) => p.custom ? p.title : cat.items[p.id].title).join(", ") }).catch(() => {});
    return json({ ok: true, id });
  }
  return json({ ok: false, error: "Not found" }, 404);
}

// v33: Money
function moneyCfg(v) {
  v = v && typeof v === "object" ? v : {};
  const costs = (Array.isArray(v.costs) ? v.costs : []).filter((c) => c && String(c.name || "").trim()).slice(0, 40).map((c) => ({ name: String(c.name).trim().slice(0, 60), amount: Math.max(0, Math.min(1e6, +c.amount || 0)), every: c.every === "year" ? "year" : "month" }));
  return { costs, gst: v.gst === true, tax_pct: Math.max(0, Math.min(50, Number.isFinite(+v.tax_pct) ? +v.tax_pct : 25)), due_days: Math.max(0, Math.min(60, Number.isFinite(+v.due_days) ? +v.due_days : 7)), auto_draft: v.auto_draft !== false, ghl_user_id: String(v.ghl_user_id || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 40) };
}
var monthKey = (d = new Date()) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Brisbane", year: "numeric", month: "2-digit" }).formatToParts(d).map((x) => [x.type, x.value])); return p.year + "-" + p.month; };
var monthLabel = (key) => { const [y, m] = key.split("-"); return new Date(Date.UTC(+y, +m - 1, 15)).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }); };
async function moneyInvoices(env) {
  if (!enabled(env)) return { ok: false, error: "GHL not connected", list: [] };
  try {
    const d = await req(env, "GET", "/invoices/?" + q({ altId: env.GHL_LOCATION_ID, altType: "location", limit: 100, offset: 0 }), null, "2021-07-28");
    const list = (d?.invoices || []).map((i) => ({ id: i._id, number: i.invoiceNumber, name: i.name, client: i.contactDetails?.name || "", email: String(i.contactDetails?.email || "").toLowerCase(), total: +i.total || 0, paid: +i.amountPaid || 0, due: +i.amountDue || 0, status: String(i.status || ""), due_date: i.dueDate || "", issued: i.issueDate || i.createdAt || "", updated: i.updatedAt || "" }));
    return { ok: true, list };
  } catch (e) { return { ok: false, error: /401|403|scope|authori/i.test(e.message) ? "Add the invoice permissions to your GHL key (Settings > Private Integrations > edit > tick Invoices)." : String(e.message).slice(0, 160), list: [] }; }
}
async function moneyData(env) {
  const settings = await getSettings(env).catch(() => ({}));
  const cfg = moneyCfg(settings.money);
  const book = await (await bookRoute(env, "GET", ["book"], {})).json();
  const rec = await listClients(env).catch(() => ({ clients: [], totals: {} }));
  const inv = await moneyInvoices(env);
  const mk = monthKey(), now = Date.now();
  const inMonth = (iso) => iso && monthKey(new Date(iso)) === mk;
  const paidThisMonth = inv.list.filter((i) => i.paid > 0 && inMonth(i.updated || i.issued)).reduce((s, i) => s + i.paid, 0);
  const outstanding = inv.list.filter((i) => i.due > 0 && !/void|draft/i.test(i.status)).reduce((s, i) => s + i.due, 0);
  const overdueList = inv.list.filter((i) => i.due > 0 && !/void|draft/i.test(i.status) && i.due_date && Date.parse(i.due_date) < now - 864e5);
  const fixed = Math.round(cfg.costs.reduce((s, c) => s + (c.every === "year" ? c.amount / 12 : c.amount), 0) * 100) / 100;
  const usage = +rec.totals?.cost_aud || 0;
  const ai = await plAiCosts(env).catch(() => null);
  const aiCost = ai ? +(ai.anthropic.exact ? ai.total : ai.total + usage).toFixed(2) : usage;
  const expected = +book.totals?.mrr || 0;
  const basis = inv.ok && paidThisMonth > 0 ? paidThisMonth : expected;
  const gst = cfg.gst ? Math.round(basis / 11 * 100) / 100 : 0;
  const profit = Math.round((basis - gst - fixed - aiCost) * 100) / 100;
  const tax = Math.max(0, Math.round(profit * cfg.tax_pct) / 100);
  const costBy = Object.fromEntries((rec.clients || []).map((c) => [c.id, +c.cost_aud || 0]));
  const drafted = await select(env, "team_actions", "type=eq.ghl_invoice&params->>period=eq." + mk + "&select=id,status,params&limit=200").catch(() => []);
  const clients = (book.clients || []).filter((c) => c.status !== "past").map((c) => {
    const cost = c.receptionist_id ? costBy[c.receptionist_id] || 0 : 0;
    const em = String(c.billing_email || "").toLowerCase();
    const theirs = inv.list.filter((i) => em && i.email === em && inMonth(i.issued));
    const act = drafted.find((a) => a.params?.client_id === c.id);
    const status = theirs.length ? (theirs.every((i) => i.due <= 0) ? "paid" : theirs.some((i) => overdueList.includes(i)) ? "overdue" : "sent") : act ? ({ pending: "waiting for you", done: "sent", approved: "sending", failed: "failed to send", rejected: "skipped" }[act.status] || act.status) : c.mrr > 0 ? (em ? "not invoiced" : "add billing email") : "nothing monthly";
    return { id: c.id, name: c.name, deal: c.deal || "", mrr: c.mrr, cost, profit: Math.round((c.mrr - cost) * 100) / 100, billing_email: c.billing_email || "", invoice: status };
  });
  return { ok: true, month: mk, month_label: monthLabel(mk), cfg, ghl_invoices: inv.ok, ghl_error: inv.ok ? "" : inv.error,
    summary: { ai, ai_cost: aiCost, expected, paid: paidThisMonth, outstanding, overdue: overdueList.reduce((s, i) => s + i.due, 0), overdue_count: overdueList.length, fixed, usage, gst, profit, tax, keep: Math.round((profit - tax) * 100) / 100, basis: inv.ok && paidThisMonth > 0 ? "paid" : "expected" },
    clients, invoices: inv.list.slice(0, 40).map((i) => ({ ...i, overdue: overdueList.includes(i) })) };
}
async function moneyDraftInvoices(env, { auto = false } = {}) {
  const settings = await getSettings(env).catch(() => ({}));
  const cfg = moneyCfg(settings.money);
  const book = await (await bookRoute(env, "GET", ["book"], {})).json();
  const mk = monthKey(), label = monthLabel(mk);
  const already = await select(env, "team_actions", "type=eq.ghl_invoice&params->>period=eq." + mk + "&select=id,params&limit=300").catch(() => []);
  const made = [], skipped = [];
  for (const c of book.clients || []) {
    if (c.status === "past" || c.status === "paused") continue;
    const monthly = (c.products || []).filter((p) => p.status !== "cancelled" && p.unit === "month" && +p.price > 0);
    if (!monthly.length) continue;
    if (already.some((a) => a.params?.client_id === c.id)) { skipped.push({ name: c.name, why: "already drafted for " + label }); continue; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(c.billing_email || ""))) { skipped.push({ name: c.name, why: "no billing email on their client card" }); continue; }
    const items = monthly.map((p) => ({ name: (p.title || p.id) + " (" + label + ")", amount: Math.round(+p.price * 100) / 100, qty: 1 }));
    const total = items.reduce((s, i) => s + i.amount, 0);
    const [row] = await insert(env, "team_actions", [{ department: "head_of_finance", type: "ghl_invoice", title: ("Invoice " + c.name + " for " + label + ": $" + total.toLocaleString("en-AU")).slice(0, 200), reason: (c.deal ? "Deal: " + c.deal + ". " : "") + "From their client card. Sent from your GHL account with a pay-now link.", params: { client_id: c.id, name: c.name, email: c.billing_email, phone: c.billing_phone || "", period: mk, period_label: label, items, total, due_days: cfg.due_days }, status: "pending", auto: false }]).catch(() => []);
    if (row) made.push({ name: c.name, total });
  }
  if (made.length) await notify(env, "🧾 <b>" + made.length + " invoice" + (made.length > 1 ? "s" : "") + " ready for " + label + "</b> ($" + made.reduce((s, m) => s + m.total, 0).toLocaleString("en-AU") + ")\n" + made.map((m) => "• " + m.name + ": $" + m.total.toLocaleString("en-AU")).join("\n") + "\n\nApprove them in Command › Approvals › Money.", { settings }).catch(() => {});
  return { ok: true, made, skipped, period: mk, auto };
}
async function moneyMonthly(env, now = new Date()) {
  const settings = await getSettings(env).catch(() => ({}));
  const cfg = moneyCfg(settings.money);
  if (!cfg.auto_draft) return { skipped: "off" };
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", hour: "numeric", hourCycle: "h23" }).formatToParts(now).map((x) => [x.type, x.value]));
  if (+p.day !== 1 || +p.hour < 9) return { skipped: "not the 1st after 9am" };
  return moneyDraftInvoices(env, { auto: true });
}
async function moneyGhlUser(env, cfg) {
  if (cfg.ghl_user_id) return cfg.ghl_user_id;
  if (env.GHL_USER_ID) return env.GHL_USER_ID;
  const d = await req(env, "GET", "/users/?" + q({ locationId: env.GHL_LOCATION_ID }), null, "2021-07-28").catch(() => null);
  const u = (d?.users || []).find((x) => /admin/i.test(String(x.roles?.role || x.role || ""))) || (d?.users || [])[0];
  if (!u?.id) throw new Error("Command needs your GHL user ID to send invoices: add it in Money › Settings (GHL › Settings › My Staff › your name › copy the user ID).");
  return u.id;
}
async function moneySendInvoice(env, p) {
  const settings = await getSettings(env).catch(() => ({}));
  const cfg = moneyCfg(settings.money);
  const email = String(p.email || "").trim();
  let contact = await findByEmail(env, email).catch(() => null);
  if (!contact) contact = await upsertFields(env, { email, name: p.name, companyName: p.name, ...(p.phone ? { phone: p.phone } : {}), tags: ["client"] });
  if (!contact?.id) throw new Error("Couldn't find or create the GHL contact for " + email);
  const userId = await moneyGhlUser(env, cfg);
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + (Number(p.due_days ?? cfg.due_days) || 0) * 864e5).toISOString().slice(0, 10);
  const body = { altId: env.GHL_LOCATION_ID, altType: "location", name: "Studio Flow & Systems – " + (p.period_label || today), title: "INVOICE", currency: "AUD",
    items: (p.items || []).map((i) => ({ name: String(i.name).slice(0, 120), currency: "AUD", amount: +i.amount || 0, qty: +i.qty || 1, type: "one_time" })),
    contactDetails: { id: contact.id, name: p.name, phoneNo: String(p.phone || contact.phone || ""), email, companyName: p.name },
    issueDate: today, dueDate: due, sentTo: { email: [email] }, liveMode: true, action: "email", userId, discount: { type: "percentage", value: 0 },
    termsNotes: "Thank you for working with Studio Flow & Systems." };
  const r = await req(env, "POST", "/invoices/text2pay", body, "2021-07-28");
  return { invoice_id: r?.invoice?._id || null, invoice_number: r?.invoice?.invoiceNumber || null, url: r?.invoiceUrl || null };
}
async function moneyRoute(env, m, seg, body) {
  if (m === "GET") return json(await moneyData(env));
  if (m === "POST" && seg[1] === "settings") {
    const cur = await getSettings(env).catch(() => ({}));
    const next = moneyCfg({ ...moneyCfg(cur.money), ...body });
    await saveSetting(env, "money", next);
    return json({ ok: true, cfg: next });
  }
  if (m === "POST" && seg[1] === "draft") return json(await moneyDraftInvoices(env));
  return json({ ok: false, error: "Not found" }, 404);
}

// ===== v38: Team brain. The AI team learns from Ty, checks each other's work and shares context. =====
var BRAIN_CACHE = { at: 0, rules: null };
var QA_TYPES = new Set(['ghl_reply', 'ghl_followup', 'campaign_enrol', 'ghl_invoice', 'ghl_email', 'send_email', 'ghl_sms', 'stripe_draft_invoice']);
async function brainGet(env, key) { return (await select(env, 'team_settings', 'key=eq.' + key + '&select=value&limit=1').catch(() => []))?.[0]?.value || null; }
async function brainPut(env, key, value) { await upsert(env, 'team_settings', [{ key, value, updated_at: new Date().toISOString() }], 'key'); if (key === 'team_rules') BRAIN_CACHE = { at: 0, rules: null }; }
async function brainRules(env) {
  if (BRAIN_CACHE.rules && Date.now() - BRAIN_CACHE.at < 60000) return BRAIN_CACHE.rules;
  const v = await brainGet(env, 'team_rules').catch(() => null);
  const rules = Array.isArray(v?.rules) ? v.rules.filter((r) => r && r.rule) : [];
  BRAIN_CACHE = { at: Date.now(), rules };
  return rules;
}
var BRAIN_SCOPES = ["all", "inbox", "outreach", "invoice", "content", "dm", "command", ...Object.keys(DEPARTMENTS)];
var BRAIN_SCOPE_MAP = { head_of_sales: ["inbox", "outreach", "dm"], head_of_marketing: ["outreach", "dm", "content"], head_of_content: ["content"], head_of_finance: ["invoice"], head_of_client_success: ["inbox"], chief_of_staff: ["command"], command: ["chief_of_staff"], inbox: ["head_of_sales", "head_of_client_success"], outreach: ["head_of_marketing", "head_of_sales"], dm: ["head_of_marketing", "head_of_sales"] };
function brainRulesText(rules, scope) {
  const want = new Set(["all", scope, ...(BRAIN_SCOPE_MAP[scope] || [])].filter(Boolean));
  const list = (rules || []).filter((r) => !scope || !Array.isArray(r.applies_to) || !r.applies_to.length || r.applies_to.some((x) => want.has(x)))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.said || 1) - (a.said || 1) || String(b.at || "").localeCompare(String(a.at || "")));
  return list.length ? "\nTHE OWNER'S RULEBOOK (standing instructions from the owner. Follow every one, in everything you write, say or do. If two ever conflict, the newer one wins):\n" + list.slice(0, 45).map((r) => "- " + r.rule).join("\n") + "\n" : "";
}
function brainJson(text) {
  const t = String(text || '');
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { try { return JSON.parse(m[0].replace(/[\u0000-\u001f]+/g, ' ')); } catch { return null; } }
}
async function brainAsk(env, system, user, max = 1500) {
  const d = await callClaude(env, { model: env.BRAIN_MODEL || env.TEAM_MODEL || MODEL, max_tokens: max, system, messages: [{ role: 'user', content: user }] });
  return (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
}

// 1) Learning loop: Ty's edits and rejections become short team rules every agent follows.
async function brainLearn(env, { notify: tell = true } = {}) {
  const fb = await select(env, 'team_memory', 'category=eq.feedback&order=created_at.desc&limit=60&select=fact,created_at').catch(() => []);
  const all0 = await brainRules(env);
  const keep = all0.filter((r) => r.source && r.source !== 'edit'), old = all0.filter((r) => !r.source || r.source === 'edit');
  if (!fb.length) return { ok: true, rules: all0, learned: 0, note: 'No feedback yet: approve, edit or reject a few drafts and the team learns from them.' };
  const text = await brainAsk(env,
    'You turn an owner\'s feedback on AI drafts into a short list of clear, durable rules for an AI team (sales replies, follow-ups, outreach emails, invoices, content). Keep rules that still hold, merge duplicates, drop one-offs that only applied to a single message. Each rule: one plain sentence, specific and actionable (e.g. "Never say \'just checking in\'", "Mention the 14-day money-back guarantee when someone hesitates on price"). Max 15 rules. applies_to uses any of: all, inbox, outreach, invoice, content. Reply with JSON only: {"rules":[{"rule":"...","applies_to":["all"],"why":"short reason from the feedback"}],"new":["the rules that are new or changed this time"]}',
    'CURRENT RULES:\n' + (old.length ? old.map((r) => '- ' + r.rule + ' [' + (r.applies_to || ['all']).join(',') + ']').join('\n') : '(none yet)') + '\n\nTY\'S FEEDBACK (newest first):\n' + fb.map((f) => '- ' + String(f.fact).slice(0, 500)).join('\n'), 2500);
  const j = brainJson(text);
  if (!j || !Array.isArray(j.rules)) throw new Error('The learning step didn\'t return rules.');
  const rules = j.rules.filter((r) => r && typeof r.rule === 'string' && r.rule.trim()).slice(0, 15).map((r) => ({ rule: r.rule.trim().slice(0, 300), applies_to: (Array.isArray(r.applies_to) ? r.applies_to : ['all']).filter((x) => BRAIN_SCOPES.includes(x)), why: String(r.why || '').slice(0, 200) }));
  const stamp = new Date().toISOString(), merged0 = [...keep, ...rules.map((r) => { const was = old.find((o) => o.rule === r.rule); return { ...r, id: was?.id || ridL(), source: 'edit', said: was?.said || 1, at: was?.at || stamp }; })];
  await brainPut(env, 'team_rules', { rules: merged0, updated_at: stamp, from_feedback: fb.length });
  const fresh = (Array.isArray(j.new) ? j.new : []).filter(Boolean).slice(0, 6);
  if (tell && fresh.length) await notify(env, '\u{1F9E0} <b>The team learned from your feedback</b>\n' + fresh.map((r) => '• ' + esc2(String(r))).join('\n') + '\n\nEvery agent follows these now. Change them in Command › Studio AI › Team brain.').catch(() => {});
  return { ok: true, rules, learned: fresh.length };
}

// 2) QA agent: checks client-facing drafts before they reach Ty or a client.
function brainDraftText(a) {
  const p = a.params || {};
  const parts = [];
  for (const k of ['subject', 'message', 'body', 'follow_up_1', 'follow_up_2', 'email_body', 'note']) if (p[k]) parts.push(k.toUpperCase() + ': ' + String(p[k]).slice(0, 2000));
  if (Array.isArray(p.items)) parts.push('INVOICE ITEMS: ' + p.items.map((i) => (i.name || i.description) + ' x' + (i.qty || 1) + ' = A$' + (i.amount ?? i.amount_aud)).join('; ') + (p.total != null ? ' (total A$' + p.total + ')' : ''));
  if (Array.isArray(p.lines)) parts.push('INVOICE LINES: ' + p.lines.map((l) => l.description + ' A$' + l.amount_aud).join('; '));
  return parts.join('\n');
}
async function qaCheck(env, a) {
  const draft = brainDraftText(a);
  if (!draft) return null;
  const [rules, cat] = await Promise.all([brainRules(env), brainGet(env, 'offer_catalog').catch(() => ({}))]);
  const scope = a.type === 'campaign_enrol' ? 'outreach' : /invoice/.test(a.type) ? 'invoice' : 'inbox';
  const text = await brainAsk(env,
    'You are the QA reviewer on an AI team at Studio Flow & Systems (Brisbane). Check ONE draft before it goes to a client. Look for: prices or offers that don\'t match the price list; invented facts, results, guarantees or availability; promises we can\'t keep; wrong name or business; anything that breaks the team rules; pushy, robotic or unclear wording; typos; no clear next step (for messages). For invoices: amounts that look wrong, duplicated or missing items. Be practical: small style points are not problems. Reply with JSON only: {"verdict":"ok"|"check"|"stop","notes":"one short sentence for the owner"}. "stop" only for something that would mislead or embarrass (wrong price, invented fact, wrong person). "check" for something worth a glance.' + brainRulesText(rules, scope) + inboxPriceBook(cat || {}),
    'DRAFT TYPE: ' + a.type + '\nTITLE: ' + (a.title || '') + '\nCONTEXT: ' + String(a.reason || '').slice(0, 600) + '\n\n' + draft, 400);
  const j = brainJson(text);
  if (!j || !['ok', 'check', 'stop'].includes(j.verdict)) return null;
  return { verdict: j.verdict, notes: String(j.notes || '').slice(0, 300), at: new Date().toISOString() };
}
function qaLine(qa) { return !qa ? '' : qa.verdict === 'ok' ? 'QA ✓ ' + (qa.notes || 'looks good') : (qa.verdict === 'stop' ? 'QA ⛔ ' : 'QA ⚠ ') + qa.notes; }
async function qaAttach(env, a) {
  if (!QA_TYPES.has(a.type) || (a.params || {}).qa || env.BRAIN_QA === 'off') return a;
  const qa = await qaCheck(env, a).catch(() => null);
  if (!qa) return a;
  const params = { ...a.params || {}, qa };
  const reason = (String(a.reason || '') + ' · ' + qaLine(qa)).slice(0, 1000);
  await update(env, 'team_actions', 'id=eq.' + a.id, { params, reason }).catch(() => {});
  a.params = params; a.reason = reason;
  return a;
}

// 3) Shared brain: what the rest of the team knows about this person.
async function brainContactContext(env, contact) {
  const email = String(contact.email || '').toLowerCase(), phone = String(contact.phone || '').replace(/[^\d+]/g, '');
  const out = [];
  try {
    const book = (await brainGet(env, 'client_book'))?.items || {};
    const cl = Object.values(book).find((c) => c && ((email && String(c.billing_email || '').toLowerCase() === email) || (phone && String(c.billing_phone || '').replace(/[^\d+]/g, '').slice(-9) === phone.slice(-9))));
    if (cl) out.push('EXISTING CLIENT: ' + cl.name + ' (' + (cl.products || []).map((p) => p.title || p.id).join(', ') + '). Questions about their own project, account or billing go to Ty (handoff).');
  } catch {}
  try {
    if (email || phone) {
      const q = email ? 'email=eq.' + encodeURIComponent(email) : 'phone=ilike.*' + encodeURIComponent(phone.slice(-9));
      const [pr] = await select(env, 'agent_prospects', q + '&select=business_name,vertical,status,leak,enrolled_at,call_status&limit=1').catch(() => []);
      if (pr) out.push('SALES ALREADY KNOWS THEM: ' + pr.business_name + ' (' + (pr.vertical || 'business') + '), status ' + pr.status + (pr.enrolled_at ? ', in our email campaign since ' + String(pr.enrolled_at).slice(0, 10) : '') + (pr.leak ? '. What we noticed on their website: ' + String(pr.leak).slice(0, 200) : '') + '. Build on that; don\'t repeat the pitch.');
    }
  } catch {}
  return out.length ? '\nWHAT THE TEAM ALREADY KNOWS:\n' + out.join('\n') + '\n' : '';
}
async function brainInboxExtras(env, contact) {
  const [rules, ctx] = await Promise.all([brainRules(env).catch(() => []), brainContactContext(env, contact || {}).catch(() => '')]);
  return brainRulesText(rules, 'inbox') + await examplesBlock(env, { scopes: ['inbox'], query: [contact?.firstName, contact?.companyName].filter(Boolean).join(' ') }) + ctx +
    '\nAlso add "intent" to your JSON: "hot" (ready to buy or book now, asking price/start date/how to pay), "warm" (interested, asking questions), "cold" (browsing, not a fit) or "client" (an existing client). Example: {"reply":"...","handoff":false,"reason":"","intent":"warm"}';
}
async function brainMarket(env, vertical) {
  const rows = await select(env, 'team_memory', 'category=eq.market&order=created_at.desc&limit=40&select=fact').catch(() => []);
  const name = ((typeof OUTREACH !== 'undefined' && OUTREACH[vertical]) || {}).name || vertical || '';
  const hits = rows.filter((r) => !name || new RegExp(name.split(' ')[0], 'i').test(r.fact)).slice(0, 5);
  return hits.length ? '\nMARKET RESEARCH FOR THIS INDUSTRY (from the Research shift; use only if it fits):\n' + hits.map((r) => '- ' + String(r.fact).slice(0, 300)).join('\n') + '\n' : '';
}

// 4) Scheduled: nightly learning, weekly receptionist safety re-checks.
async function brainTick(env) {
  if (!env.ANTHROPIC_API_KEY) return;
  const now = brisbaneNow();
  const st = (await brainGet(env, 'brain_state').catch(() => null)) || {};
  const today = new Date(Date.now() + 10 * 36e5).toISOString().slice(0, 10);
  const next = { ...st };
  if (now.hour >= 20 && st.learned_on !== today) {
    next.learned_on = today;
    await brainPut(env, 'brain_state', next);
    await brainLearn(env).catch((e) => console.error('brain learn:', e.message));
    const exam86 = await brainExam(env).catch((e) => { console.error('exam:', e.message); return null; });
    await brainLibrarian(env, exam86).catch((e) => console.error('librarian:', e.message));
  }
  if (now.dow === 7 && now.hour >= 19) {
    if (st.safety_week !== today) { next.safety_week = today; next.safety_queue = (await select(env, 'agent_clients', 'status=eq.live&select=id&limit=20').catch(() => [])).map((c) => c.id); next.safety_failed = []; }
    const id = (next.safety_queue || []).shift();
    if (id) {
      try {
        let r = await runSafety(env, id, { from: 0, to: 12 });
        for (let i = 0; i < 5 && r && !r.done && r.next; i++) r = await runSafety(env, id, r.next);
        if (r && r.done && !r.pass) {
          const [c] = await select(env, 'agent_clients', 'id=eq.' + id + '&select=business_name&limit=1').catch(() => []);
          next.safety_failed = [...next.safety_failed || [], id];
          await notify(env, '\u{1F6E1} <b>Weekly safety re-check: ' + esc2(c?.business_name || 'a receptionist') + ' needs a look</b>\n' + r.passed + '/' + r.total + ' passed' + (r.critical_failed?.length ? ', critical: ' + esc2(r.critical_failed.join(', ')) : '') + '.\nOpen Command › Clients to see the answers. It stays live.').catch(() => {});
        }
      } catch (e) { console.error('weekly safety:', e.message); }
      if (!(next.safety_queue || []).length && !(next.safety_failed || []).length) await notify(env, '\u{1F6E1} Weekly safety re-check: every live AI receptionist passed.').catch(() => {});
    }
    await brainPut(env, 'brain_state', next);
  }
}

// 5) Command routes: /api/v1/team/brain
async function brainRoute(env, m, seg, body) {
  if (m === 'GET' && !seg[1]) {
    const [v, st, fb, qa] = await Promise.all([brainGet(env, 'team_rules'), brainGet(env, 'brain_state'), select(env, 'team_memory', 'category=eq.feedback&order=created_at.desc&limit=8&select=fact,created_at').catch(() => []), select(env, 'team_actions', 'order=created_at.desc&limit=200&select=params,status').catch(() => [])]);
    const checked = qa.filter((a) => a.params?.qa);
    return json({ ok: true, rules: v?.rules || [], updated_at: v?.updated_at || null, state: st || {}, recent_feedback: fb, qa: { checked: checked.length, flagged: checked.filter((a) => a.params.qa.verdict !== 'ok').length, stopped: checked.filter((a) => a.params.qa.verdict === 'stop').length } });
  }
  if (m === 'GET' && seg[1] === 'examples') { const items = await exLoad(env); const st = await secGet(env, 'mem_vec').catch(() => null); const ex86 = await secGet(env, 'brain_exam').catch(() => null); return json({ ok: true, exam: ex86 ? { last: ex86.last, history: (ex86.history || []).slice(-14) } : null, dm_results: dmResults((await dmLoad(env).catch(() => ({ items: [] }))).items), meaning_search: memOn(env), indexed: st?.total || 0, counts: { approved: items.filter((x) => x.kind === 'approved').length, edited: items.filter((x) => x.kind === 'edited').length, rejected: items.filter((x) => x.kind === 'rejected').length }, recent: items.slice(-8).reverse().map((x) => ({ id: x.id, kind: x.kind, type: x.type, title: x.title, at: x.at })) }); }
  if (m === 'POST' && seg[1] === 'examples' && body.remove) { const items = (await exLoad(env)).filter((x) => x.id !== body.remove); await secPut(env, 'examples', { items }); EX_CACHE = { at: 0, v: null }; return json({ ok: true }); }
  if (m === 'POST' && seg[1] === 'learn') return json(await brainLearn(env, { notify: false }));
  if (m === 'POST' && seg[1] === 'rules') {
    const list = Array.isArray(body.rules) ? body.rules : [];
    const rules = list.filter((r) => r && typeof r.rule === 'string' && r.rule.trim()).slice(0, 80).map((r) => ({ id: r.id ? String(r.id).slice(0, 40) : ridL(), source: r.source || 'ty', said: +r.said || 1, at: r.at || new Date().toISOString(), kind: String(r.kind || '').slice(0, 20), pinned: !!r.pinned, rule: r.rule.trim().slice(0, 300), applies_to: Array.isArray(r.applies_to) && r.applies_to.length ? r.applies_to.filter((x) => BRAIN_SCOPES.includes(x)) : ['all'], why: String(r.why || 'Added by Ty').slice(0, 200) }));
    await brainPut(env, 'team_rules', { rules, updated_at: new Date().toISOString(), edited_by_ty: true });
    return json({ ok: true, rules });
  }
  return json({ ok: false, error: 'Not found.' }, 404);
}

async function listClients(env) {
  const [C, conv] = await Promise.all([
    select(env, "agent_clients", "status=neq.cancelled&select=id,business_name,website,vertical,mode,kb,knowledge,status,voice_enabled,plan_monthly,pilot_price,paid_at,pilot_ends_at,started_live_at,checklist,safety,installed_url,last_seen_at,alert_email,alert_phone,widget_key,created_at&order=created_at.desc&limit=200"),
    select(env, "client_conversations", `last_at=gte.${monthStart()}&preview=eq.false&select=client_id,lead_at,cost_aud,last_at&limit=20000`).catch(() => [])
  ]);
  const now5 = Date.now();
  const rows = C.map((c) => {
    const mine = conv.filter((x) => x.client_id === c.id);
    const leads = mine.filter((x) => x.lead_at).length;
    const cost = Math.round((mine.reduce((s, x) => s + (+x.cost_aud || 0), 0) + leads * (COST.sms_aud + COST.email_aud)) * 100) / 100;
    const revenue = c.status === "live" || c.status === "onboarding" ? c.pilot_ends_at && Date.parse(c.pilot_ends_at) > now5 ? 0 : +c.plan_monthly || 0 : 0;
    const pilotDay = c.paid_at ? Math.min(999, Math.floor((now5 - Date.parse(c.paid_at)) / 864e5) + 1) : null;
    const done = CHECKLIST.filter(([k]) => c.checklist?.[k]).length;
    return {
      ...c,
      conversations: mine.length,
      leads,
      cost_aud: cost,
      revenue_aud: revenue,
      profit_aud: Math.round((revenue - cost) * 100) / 100,
      pilot_day: pilotDay,
      in_pilot: !!(c.pilot_ends_at && Date.parse(c.pilot_ends_at) > now5),
      checklist_done: done,
      checklist_total: CHECKLIST.length,
      industry: industryOf(c.kb, c.vertical, c.knowledge),
      industry_label: INDUSTRY_LABEL[industryOf(c.kb, c.vertical, c.knowledge)] || "Service business",
      kb: void 0,
      knowledge: void 0,
      onboarding_hours: c.paid_at && c.status === "onboarding" ? Math.round((now5 - Date.parse(c.paid_at)) / 36e5) : null,
      quiet: c.status === "live" && (!c.last_seen_at || now5 - Date.parse(c.last_seen_at) > 3 * 864e5),
      gate: liveGate(c)
    };
  });
  const live = rows.filter((r) => r.status === "live");
  const totals = {
    clients: rows.length,
    live: live.length,
    onboarding: rows.filter((r) => r.status === "onboarding").length,
    paused: rows.filter((r) => r.status === "paused").length,
    mrr: rows.filter((r) => ["live", "onboarding"].includes(r.status)).reduce((s, r) => s + (+r.plan_monthly || 0), 0),
    billing_now: rows.reduce((s, r) => s + r.revenue_aud, 0),
    leads: rows.reduce((s, r) => s + r.leads, 0),
    conversations: rows.reduce((s, r) => s + r.conversations, 0),
    cost_aud: Math.round(rows.reduce((s, r) => s + r.cost_aud, 0) * 100) / 100
  };
  totals.profit_aud = Math.round((totals.billing_now - totals.cost_aud) * 100) / 100;
  return { ok: true, clients: rows, totals, checklist: CHECKLIST, costs_note: "AI and SMS costs are estimates. Monthly revenue counts from the end of each pilot (the pilot itself was paid up front)." };
}
async function clientDetail(env, id) {
  const c = await getClient(env, id);
  const conv = await select(env, "client_conversations", `client_id=eq.${c.id}&order=last_at.desc&limit=30&select=id,session,started_at,last_at,page,messages,lead,lead_at,escalated,cost_aud`).catch(() => []);
  return { ok: true, knowledge_fields: KNOWLEDGE_FIELDS, client: c, safety_cases: casesFor(modeOf(c.kb, c.vertical, c.knowledge), industryOf(c.kb, c.vertical, c.knowledge)).length, industry: industryOf(c.kb, c.vertical, c.knowledge), embed: embedCode(env, c), test_page: `${ORIGIN(env)}/w/${c.widget_key}/test`, demo: c.demo_token ? demoUrl(env, c.demo_token) + "?preview=1" : null, checklist: CHECKLIST, gate: liveGate(c), conversations: conv };
}
async function clientsCron(env) {
  await remove(env, "client_conversations", `last_at=lt.${new Date(Date.now() - ROLL_DAYS * 864e5).toISOString()}`).catch(() => {
  });
}
async function clientsDigest(env) {
  const L = await listClients(env).catch(() => null);
  if (!L || !L.clients.length) return null;
  const y = new Date(Date.now() - 864e5).toISOString();
  const leadsY = await select(env, "client_conversations", `lead_at=gte.${y}&preview=eq.false&select=id&limit=2000`).catch(() => []);
  const t = L.totals, now5 = Date.now();
  const lines = [`\u{1F3E2} Clients: ${t.live} live \xB7 ${t.onboarding} onboarding \xB7 ${leadsY.length} lead${leadsY.length === 1 ? "" : "s"} yesterday \xB7 $${t.mrr.toLocaleString("en-AU")}/mo on the books`];
  for (const c of L.clients) {
    if (c.status === "onboarding" && c.paid_at) lines.push(`\u2022 ${c.business_name}: onboarding ${c.onboarding_hours}h in (${c.checklist_done}/${c.checklist_total} done)${c.onboarding_hours > 40 ? " \u26A0\uFE0F 48h promise" : ""}`);
    if (c.quiet) lines.push(`\u2022 ${c.business_name}: receptionist not seen on their site for 3+ days. Check it's still installed.`);
    if (c.pilot_ends_at && Date.parse(c.pilot_ends_at) > now5 && Date.parse(c.pilot_ends_at) - now5 < 4 * 864e5) lines.push(`\u2022 ${c.business_name}: pilot ends ${new Date(c.pilot_ends_at).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short" })}. Call to confirm $${c.plan_monthly}/mo.`);
  }
  return lines.join("\n");
}
async function clientFromPayment(env, demoToken, plan = "chat") {
  const [d] = await select(env, "agent_demos", `token=eq.${enc(demoToken)}&select=token,website&limit=1`).catch(() => []);
  if (!d) return null;
  const exists = await select(env, "agent_clients", `demo_token=eq.${d.token}&select=id&limit=1`).catch(() => []);
  if (exists.length) return exists[0];
  return createClient(env, { demo_token: d.token, paid: true, voice: plan === "voice" }).catch((e) => {
    console.error("client from payment:", e.message);
    return null;
  });
}


