# v32: Clients becomes the central client book (who bought what, monthly value, what to sell next,
# Command centre setup), receptionist list shows industries, approval cards show the exact reply.
import sys, re, hashlib
f = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(f).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:90], s.count(old))
    s = s.replace(old, new)

server = r'''
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
    items[id] = { name, website: String(c.website || "").trim().slice(0, 200), industry: INDUSTRY_LABEL[c.industry] ? c.industry : "general", status: ["active", "onboarding", "paused", "past"].includes(c.status) ? c.status : "active", notes: String(c.notes || "").slice(0, 2000), deal: String(c.deal || "").slice(0, 160), products, command: { checks }, updated_at: new Date().toISOString(), ...(c.receptionist_id ? { receptionist_id: String(c.receptionist_id) } : {}) };
    await saveSetting(env, "client_book", { items });
    await audit(env, { actor: "Ty", action: "client_book_saved", target_type: "client", target_id: id, summary: name + ": " + products.filter((p) => p.status !== "cancelled").map((p) => p.custom ? p.title : cat.items[p.id].title).join(", ") }).catch(() => {});
    return json({ ok: true, id });
  }
  return json({ ok: false, error: "Not found" }, 404);
}
'''
a = "async function listClients(env) {"
assert s.count(a) == 1
s = s.replace(a, server + a, 1)
rep('''  if (p === "/clients" && m === "GET") {''', '''  if (seg[0] === "book") return bookRoute(env, m, seg, body);
  if (p === "/clients" && m === "GET") {''')
rep('"offer", "demo_followups", "offer_catalog", "inbox", "inbox_log"].includes(key))', '"offer", "demo_followups", "offer_catalog", "inbox", "inbox_log", "client_book"].includes(key))')
# receptionist list: industries instead of clinic / service
rep('select=id,business_name,website,vertical,mode,status,voice_enabled', 'select=id,business_name,website,vertical,mode,kb,knowledge,status,voice_enabled')
rep('''      checklist_done: done,
      checklist_total: CHECKLIST.length,''', '''      checklist_done: done,
      checklist_total: CHECKLIST.length,
      industry: industryOf(c.kb, c.vertical, c.knowledge),
      industry_label: INDUSTRY_LABEL[industryOf(c.kb, c.vertical, c.knowledge)] || "Service business",
      kb: void 0,
      knowledge: void 0,''')
rep('(c.mode === "service" ? "service business" : "clinic")', 'esc(c.industry_label || (c.mode === "service" ? "Service business" : "Clinic"))', 2)

# approval cards: show and edit the exact reply, friendly names, messages filter
rep('const FIELDS = { ghl_email: [["subject", "input"], ["body", "textarea"]], ghl_sms: [["message", "textarea"]],', 'const FIELDS = { ghl_reply: [["message", "textarea"]], ghl_followup: [["subject", "input"], ["message", "textarea"]], ghl_email: [["subject", "input"], ["body", "textarea"]], ghl_sms: [["message", "textarea"]],', 2)
rep('''const LABEL = { follow_up_1: "email 02 (follow-up)",''', '''const TYPE_NAMES = { ghl_reply: "Message reply", ghl_followup: "Follow-up", ghl_sms: "SMS", ghl_email: "Email", ghl_note: "CRM note", ghl_task: "CRM task", ghl_tags: "CRM tags", ghl_opportunity_status: "Pipeline update", owner_task: "Your task", campaign_enrol: "Outreach", outreach_email: "Outreach email", stripe_draft_invoice: "Invoice" };
  const LABEL = { message: "What Command will send (edit before approving)", follow_up_1: "email 02 (follow-up)",''')
rep('esc(a.type.replace(/_/g, " "))', 'esc(TYPE_NAMES[a.type] || a.type.replace(/_/g, " "))', 2)
rep('/^ghl_(email|sms)/.test(t) ? "messages"', '/^ghl_(email|sms|reply|followup)/.test(t) ? "messages"', 1)

# the client book screen (inside the app script: no backticks, no ${, no backslashes)
ui = r'''
  // v32: Clients = the client book (all clients / AI receptionists / Command centres)
  const BOOK_TAB = { v: "all" };
  const receptionistsView = VIEWS.clients;
  VIEWS.clients = async (el) => {
    if (ROUTE.arg) return receptionistsView(el);
    el.innerHTML = '<div class="tbar"><div class="seg" id="bkTabs">' + [["all", "All clients"], ["rec", "AI receptionists"], ["cmd", "Command centres"]].map(function (t) { return '<button data-bt="' + t[0] + '" class="' + (BOOK_TAB.v === t[0] ? "on" : "") + '">' + t[1] + "</button>"; }).join("") + '</div></div><div id="bkBody" style="margin-top:12px"></div>';
    $$("#bkTabs button", el).forEach(function (b) { b.onclick = function () { BOOK_TAB.v = b.dataset.bt; VIEWS.clients(el); }; });
    const body = $("#bkBody", el);
    if (BOOK_TAB.v === "rec") return receptionistsView(body);
    return bookView(el, body, BOOK_TAB.v);
  };
  function bookStat(x) { return '<div><b class="pv">' + esc(x[1]) + "</b><span>" + x[0] + "</span></div>"; }
  function bookCard(c) {
    const prods = (c.products || []).filter(function (p) { return p.status !== "cancelled"; });
    const site = String(c.website || "").split("://").pop().replace("www.", "").split("/")[0];
    return '<div class="item card"><div class="row sp" style="align-items:flex-start;gap:10px"><div><h4>' + esc(c.name) + '</h4><div class="meta"><span>' + esc(c.industry_label) + "</span>" + (site ? "<span>· " + esc(site) + "</span>" : "") + (c.status && c.status !== "active" ? '<span class="chip">' + esc(c.status) + "</span>" : "") + (c.deal ? '<span class="chip c">' + esc(c.deal) + "</span>" : "") + '</div></div><div class="row" style="gap:8px">' + (c.receptionist_id ? '<a class="btn sm ghost" href="#/clients/' + esc(c.receptionist_id) + '">Receptionist</a>' : "") + '<button class="btn sm" data-bk="' + esc(c.id) + '">Open</button></div></div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">' + (prods.length ? prods.map(function (p) { const deal = p.list_price && Number(p.price) < Number(p.list_price); return '<span class="chip ' + (deal || p.custom ? "c" : "ok") + '">' + esc(p.title || p.id) + " · " + cmoney(p.price) + (p.unit === "month" ? "/mo" : "") + (deal ? ' <s style="opacity:.6">' + cmoney(p.list_price) + "</s>" : "") + "</span>"; }).join("") : '<span class="mu xs">No products recorded yet. Open to tick what they bought.</span>') + "</div>" +
      '<div class="snap-row" style="margin-top:10px">' + [["Monthly", cmoney(c.mrr)], ["Setup & one-off", cmoney(c.setup)]].concat(c.has_command ? [["Command setup", c.command_done + "/" + c.command_total]] : []).concat(c.receptionist ? [["Receptionist", c.receptionist.status]] : []).map(bookStat).join("") + "</div>" +
      (c.upsells && c.upsells.length ? '<div style="margin-top:12px"><span class="mu xs">SELL NEXT</span>' + c.upsells.map(function (u) { return '<div class="row sp" style="gap:10px;margin-top:6px;align-items:flex-start"><span class="sm"><b>' + esc(u.title) + "</b> · " + esc(u.why) + '</span><span class="chip c">' + cmoney(u.price) + (u.unit === "month" ? "/mo" : "") + "</span></div>"; }).join("") + "</div>" : "") + "</div>";
  }
  async function bookView(root, el, mode) {
    el.innerHTML = sk(200);
    let d;
    try { d = await team("/book"); } catch (e) { el.innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; return; }
    if (!still("clients", root)) return;
    const list = mode === "cmd" ? d.clients.filter(function (c) { return c.has_command; }) : d.clients;
    const t = d.totals;
    el.innerHTML = '<div class="grid"><section class="card c12"><div class="row sp"><div><h3>' + (mode === "cmd" ? "Command centre clients" : "Every client") + '</h3><p class="mu sm">' + (mode === "cmd" ? "Businesses running Studio AI Command, with their setup checklist." : "Who bought what, what they pay each month, and what to offer them next.") + '</p></div><button class="btn pri" id="bkAdd">' + ic("plus") + "Add client</button></div>" +
      '<div class="snap-row" style="margin-top:14px">' + [["Clients", t.clients], ["Monthly recurring", cmoney(t.mrr)], ["Setup & one-off", cmoney(t.setup)], ["AI receptionists", t.receptionists], ["Command centres", t.command], ["Next sale /mo", cmoney(t.upsell_mrr)]].concat(t.discount_mrr ? [["Special rates /mo", "-" + cmoney(t.discount_mrr)]] : []).map(bookStat).join("") + "</div></section>" +
      '<section class="c12" id="bkEdit"></section><section class="c12 stack" id="bkList">' + (list.length ? list.map(bookCard).join("") : '<div class="empty">' + (mode === "cmd" ? "No Command centre clients yet. Open a client and tick a Command plan to start their setup checklist." : "No clients yet. Add one, or they appear here when a pilot is paid.") + "</div>") + "</section></div>";
    $("#bkAdd", el).onclick = function () { bookEdit(root, el, d, { products: [], industry: "general", status: "active" }); };
    $$("[data-bk]", el).forEach(function (b) { b.onclick = function () { bookEdit(root, el, d, d.clients.find(function (x) { return x.id === b.dataset.bk; })); }; });
  }
  function bookEdit(root, el, d, c) {
    const box = $("#bkEdit", el); const own = {};
    (c.products || []).forEach(function (p) { own[p.id] = p; });
    const groups = [["receptionist", "AI reception"], ["website", "Websites"], ["monthly", "Monthly plans"], ["systems", "Systems"], ["command", "Studio AI Command"]];
    box.innerHTML = '<section class="card"><div class="row sp"><h3>' + (c.id ? esc(c.name) : "New client") + '</h3><button class="btn sm ghost" id="bkX">Close</button></div>' +
      '<div class="grid" style="margin-top:10px"><label class="lab c6">Business name<input class="in" id="bkN" value="' + esc(c.name || "") + '"></label><label class="lab c6">Website<input class="in" id="bkW" value="' + esc(c.website || "") + '"></label>' +
      '<label class="lab c6">Industry<select class="in" id="bkI">' + d.industries.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === c.industry ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join("") + '</select></label><label class="lab c6">Status<select class="in" id="bkS">' + [["active", "Active"], ["onboarding", "Onboarding"], ["paused", "Paused"], ["past", "Past client"]].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === (c.status || "active") ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></label></div>" +
      '<h4 style="margin-top:16px">What they bought</h4><p class="mu xs">Tick each product. Prices start from your price book; change them to what this client actually pays.</p>' +
      groups.map(function (g) { const items = d.catalog.filter(function (i) { return i.group === g[0]; }); if (!items.length) return ""; return '<div style="margin-top:12px"><span class="mu xs">' + esc(g[1].toUpperCase()) + "</span>" + items.map(function (i) { const o = own[i.id]; return '<div class="row" style="gap:10px;margin-top:6px;flex-wrap:wrap;align-items:center"><label class="row" style="gap:8px;align-items:center;flex:1 1 240px"><input type="checkbox" data-pid="' + i.id + '"' + (o && o.status !== "cancelled" ? " checked" : "") + '><span class="sm">' + esc(i.title) + '</span></label><input class="in" style="max-width:120px" type="number" min="0" data-pp="' + i.id + '" value="' + esc(o ? o.price : i.price) + '" title="Price"><span class="mu xs" style="min-width:52px">' + (i.unit === "month" ? "/month" : "one-off") + '</span><input class="in" style="max-width:120px" type="number" min="0" data-ps="' + i.id + '" value="' + esc(o ? (o.setup || "") : (i.setup || "")) + '" placeholder="Setup $" title="Setup fee"></div>'; }).join("") + "</div>"; }).join("") +
      '<div style="margin-top:14px"><span class="mu xs">CUSTOM ITEMS (BUNDLES, MATE&#39;S RATES, ONE-OFF WORK)</span><div id="bkCu"></div><button class="btn sm ghost" id="bkCuAdd" style="margin-top:8px">' + ic("plus") + 'Add custom item</button></div>' +
      '<label class="lab" style="margin-top:14px">Deal terms (shows on their card)<input class="in" id="bkD" placeholder="e.g. Mate&#39;s rate, review in 6 months" value="' + esc(c.deal || "") + '"></label>' +
      '<div id="bkCmd"></div><label class="lab" style="margin-top:14px">Notes<textarea class="in" id="bkNo" rows="3">' + esc(c.notes || "") + '</textarea></label><div class="row" style="gap:10px;margin-top:12px"><button class="btn pri" id="bkSave">Save client</button>' + (c.id && !c.receptionist_id ? '<button class="btn bad" id="bkDel">Remove</button>' : "") + "</div></section>";
    const cmdIds = ["command_core", "command_growth", "command_enterprise", "command_founding", "command_whitelabel"];
    const checks0 = (c.command && c.command.checks) || {};
    const drawCmd = function () {
      const on = cmdIds.some(function (x) { const cb = box.querySelector('[data-pid="' + x + '"]'); return cb && cb.checked; });
      const keep = {}; $$("[data-ck]", box).forEach(function (cb) { keep[cb.dataset.ck] = cb.checked; });
      $("#bkCmd", box).innerHTML = on ? '<h4 style="margin-top:16px">Command centre setup</h4><p class="mu xs">Tick each step as it is done. Go live only when every step is ticked.</p>' + d.checks.map(function (k) { const v = k[0] in keep ? keep[k[0]] : checks0[k[0]]; return '<label class="row" style="gap:8px;align-items:center;margin-top:6px"><input type="checkbox" data-ck="' + k[0] + '"' + (v ? " checked" : "") + '><span class="sm">' + esc(k[1]) + "</span></label>"; }).join("") : "";
    };
    drawCmd();
    const cuRow = function (p) { return '<div class="row" data-cu="' + esc(p.id) + '" style="gap:10px;margin-top:6px;flex-wrap:wrap;align-items:center"><input class="in" style="flex:1 1 240px" data-cun placeholder="e.g. CRM + AI receptionist (mate&#39;s rate)" value="' + esc(p.title || "") + '"><input class="in" style="max-width:120px" type="number" min="0" data-cup value="' + esc(p.price || "") + '" placeholder="Price $"><select class="in" style="max-width:120px" data-cuu><option value="month"' + (p.unit === "month" ? " selected" : "") + '>/month</option><option value=""' + (p.unit === "month" ? "" : " selected") + '>one-off</option></select><button class="btn sm ghost" data-cux>Remove</button></div>'; };
    const cuBox = $("#bkCu", box);
    cuBox.innerHTML = (c.products || []).filter(function (p) { return p.custom && p.status !== "cancelled"; }).map(cuRow).join("");
    const cuWire = function () { $$("[data-cux]", cuBox).forEach(function (b) { b.onclick = function () { b.closest("[data-cu]").remove(); }; }); };
    cuWire();
    $("#bkCuAdd", box).onclick = function () { cuBox.insertAdjacentHTML("beforeend", cuRow({ id: "custom-" + Math.random().toString(36).slice(2, 10), unit: "month" })); cuWire(); };
    $$("[data-pid]", box).forEach(function (cb) { cb.onchange = drawCmd; });
    box.scrollIntoView({ behavior: "smooth", block: "start" });
    $("#bkX", box).onclick = function () { box.innerHTML = ""; };
    $("#bkSave", box).onclick = async function () {
      const products = [];
      $$("[data-pid]", box).forEach(function (cb) { const id = cb.dataset.pid; const was = own[id]; if (cb.checked) products.push({ id: id, price: Number(box.querySelector('[data-pp="' + id + '"]').value || 0), setup: Number(box.querySelector('[data-ps="' + id + '"]').value || 0), status: "active", since: (was && was.since) || new Date().toISOString().slice(0, 10) }); else if (was && was.status !== "cancelled") products.push(Object.assign({}, was, { status: "cancelled" })); });
      $$("[data-cu]", cuBox).forEach(function (row) { const t = $("[data-cun]", row).value.trim(); if (t) products.push({ id: row.dataset.cu, title: t, price: Number($("[data-cup]", row).value || 0), unit: $("[data-cuu]", row).value, status: "active", since: new Date().toISOString().slice(0, 10) }); });
      (c.products || []).forEach(function (p) { if (p.custom && p.status !== "cancelled" && !cuBox.querySelector('[data-cu="' + p.id + '"]')) products.push(Object.assign({}, p, { status: "cancelled" })); });
      const checks = {}; $$("[data-ck]", box).forEach(function (cb) { if (cb.checked) checks[cb.dataset.ck] = true; });
      try { await team("/book", { method: "POST", body: { client: { id: c.id, receptionist_id: c.receptionist_id, name: $("#bkN", box).value, website: $("#bkW", box).value, industry: $("#bkI", box).value, status: $("#bkS", box).value, notes: $("#bkNo", box).value, deal: $("#bkD", box).value, products: products, command: { checks: checks } } } }); toast("Client saved ✓", "ok"); VIEWS.clients(root); } catch (err) { toast(err.message, "bad"); }
    };
    const del = $("#bkDel", box);
    if (del) del.onclick = async function () { const ok = await modal({ title: "Remove " + (c.name || "this client") + "?", text: "This removes them from your client book. Nothing is sent to them.", ok: "Remove", danger: true }); if (!ok) return; try { await team("/book/delete", { method: "POST", body: { id: c.id } }); toast("Removed", "ok"); VIEWS.clients(root); } catch (err) { toast(err.message, "bad"); } };
  }
'''
anchor = "  async function clientView(el, id) {"
assert s.count(anchor) == 1
s = s.replace(anchor, ui + anchor, 1)
rep('clients: ["Clients", "Every business with a live AI receptionist: health, leads, costs and profit"],', 'clients: ["Clients", "Every client: who bought what, what they pay, and what to sell them next"],')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace(oldv, hashlib.sha1(s.encode()).hexdigest()[:10])
open(f, 'w').write(s)
print('v32 client book + approval cards')
