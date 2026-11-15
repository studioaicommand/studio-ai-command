# v33: Money. Profit & loss, per-client profit, GST and tax set-aside, and branded GHL invoices
# drafted from each client's card (monthly on the 1st, one tap to approve, sent from GHL with a pay link).
import sys, re, hashlib
f = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(f).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:90], s.count(old))
    s = s.replace(old, new)

server = r'''
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
  const expected = +book.totals?.mrr || 0;
  const basis = inv.ok && paidThisMonth > 0 ? paidThisMonth : expected;
  const gst = cfg.gst ? Math.round(basis / 11 * 100) / 100 : 0;
  const profit = Math.round((basis - gst - fixed - usage) * 100) / 100;
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
    summary: { expected, paid: paidThisMonth, outstanding, overdue: overdueList.reduce((s, i) => s + i.due, 0), overdue_count: overdueList.length, fixed, usage, gst, profit, tax, keep: Math.round((profit - tax) * 100) / 100, basis: inv.ok && paidThisMonth > 0 ? "paid" : "expected" },
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
'''
a = "async function listClients(env) {"
assert s.count(a) == 1
s = s.replace(a, server + a, 1)
rep('''  if (seg[0] === "book") return bookRoute(env, m, seg, body);''', '''  if (seg[0] === "book") return bookRoute(env, m, seg, body);
  if (seg[0] === "money") return moneyRoute(env, m, seg, body);''')
rep('"inbox", "inbox_log", "client_book"].includes(key))', '"inbox", "inbox_log", "client_book", "money"].includes(key))')
rep('for (const k of ["charter", "telegram", "command", "notify_state", "offer", "inbox", "inbox_log"]) if (stored[k]', 'for (const k of ["charter", "telegram", "command", "notify_state", "offer", "inbox", "inbox_log", "money"]) if (stored[k]')
rep('''    case "ghl_followup": {''', '''    case "ghl_invoice":
      return moneySendInvoice(env, p);
    case "ghl_followup": {''')
rep('''  await inboxFollowups(e).catch((x) => console.error("follow-ups:", x.message));''', '''  await inboxFollowups(e).catch((x) => console.error("follow-ups:", x.message));
  await moneyMonthly(e).catch((x) => console.error("monthly invoices:", x.message));''')
# client book: billing email + phone
rep('''notes: String(c.notes || "").slice(0, 2000), deal: String(c.deal || "").slice(0, 160), products,''', '''notes: String(c.notes || "").slice(0, 2000), deal: String(c.deal || "").slice(0, 160), billing_email: /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(String(c.billing_email || "").trim()) ? String(c.billing_email).trim().toLowerCase().slice(0, 160) : "", billing_phone: String(c.billing_phone || "").replace(/[^0-9+ ]/g, "").slice(0, 20), products,''')

# ---- app: approvals show invoice lines; Money in the menu; Money screen; billing fields
rep('const TYPE_NAMES = { ghl_reply: "Message reply",', 'const TYPE_NAMES = { ghl_invoice: "Invoice (GHL)", ghl_reply: "Message reply",')
rep('/stripe/.test(t) ? "money"', '/stripe|invoice/.test(t) ? "money"')
rep('''      if (a.type === "stripe_draft_invoice") extra = '<div class="meta pv">' + esc(p.customer_name || "") + " \\xB7 "''', '''      if (a.type === "ghl_invoice") extra = '<div class="meta pv">' + esc(p.name || "") + " · " + esc(p.email || "") + '</div><ul class="sm" style="margin:8px 0 0 18px">' + (p.items || []).map(function (l) { return "<li>" + esc(l.name) + ' · <b class="pv">' + cmoney(l.amount) + "</b></li>"; }).join("") + '</ul><p class="sm" style="margin-top:6px"><b class="pv">Total ' + cmoney(p.total) + '</b> · due in ' + esc(p.due_days) + ' days</p><p class="mu xs" style="margin-top:4px">Approving sends it from your GHL account, branded, with a pay-now link.</p>';
      if (a.type === "stripe_draft_invoice") extra = '<div class="meta pv">' + esc(p.customer_name || "") + " \\xB7 "''')
rep('["clients", "Clients", "shop"], ["goals", "Goals & KPIs", "target"]', '["clients", "Clients", "shop"], ["money", "Money", "target"], ["goals", "Goals & KPIs", "target"]')
rep('''    clients: ["Clients", "Every client''', '''    money: ["Money", "Profit, invoices and what to set aside, this month"],
    clients: ["Clients", "Every client''')
rep('''      '<label class="lab" style="margin-top:14px">Deal terms (shows on their card)''', '''      '<div class="grid" style="margin-top:14px"><label class="lab c6">Billing email (invoices go here)<input class="in" id="bkBe" type="email" value="' + esc(c.billing_email || "") + '"></label><label class="lab c6">Billing phone<input class="in" id="bkBp" value="' + esc(c.billing_phone || "") + '"></label></div>' +
      '<label class="lab" style="margin-top:14px">Deal terms (shows on their card)''')
rep('''notes: $("#bkNo", box).value, deal: $("#bkD", box).value, products: products,''', '''notes: $("#bkNo", box).value, deal: $("#bkD", box).value, billing_email: $("#bkBe", box).value, billing_phone: $("#bkBp", box).value, products: products,''')

ui = r'''
  // v33: Money
  VIEWS.money = async (el) => {
    var neg = function (n) { return +n > 0 ? "-" + cmoney(n) : cmoney(0); };
    el.innerHTML = sk(300);
    let d;
    try { d = await team("/money"); } catch (e) { el.innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; return; }
    if (!still("money", el)) return;
    const s = d.summary, cfg = d.cfg;
    const stat = function (x) { return '<div><b class="pv">' + esc(x[1]) + "</b><span>" + x[0] + "</span></div>"; };
    const chip = function (st) { const cls = st === "paid" ? "ok" : st === "overdue" ? "bad" : st === "sent" || st === "waiting for you" ? "c" : ""; return '<span class="chip ' + cls + '">' + esc(st) + "</span>"; };
    el.innerHTML = '<div class="grid">' +
      '<section class="card c12"><div class="row sp" style="gap:10px;flex-wrap:wrap"><div><h3>' + esc(d.month_label) + '</h3><p class="mu sm">' + (s.basis === "paid" ? "Based on invoices paid this month." : "Based on what your clients pay each month (no paid invoices yet this month).") + '</p></div><button class="btn pri" id="mnDraft">' + ic("plus") + "Draft this month&#39;s invoices</button></div>" +
      '<div class="snap-row mo-row" style="margin-top:14px">' + [["Monthly recurring", cmoney(s.expected)], ["Paid this month", cmoney(s.paid)], ["Outstanding", cmoney(s.outstanding)], ["Overdue", cmoney(s.overdue) + (s.overdue_count ? " (" + s.overdue_count + ")" : "")]].map(stat).join("") + "</div>" +
      '<div class="snap-row mo-row" style="margin-top:10px">' + [["Fixed costs", neg(s.fixed)], ["AI & SMS usage", neg(s.usage)]].concat(cfg.gst ? [["GST to set aside", neg(s.gst)]] : []).concat([["Profit", cmoney(s.profit)], ["Tax buffer " + cfg.tax_pct + "%", neg(s.tax)], ["Yours to keep", cmoney(s.keep)]]).map(stat).join("") + "</div>" +
      (d.ghl_invoices ? "" : '<p class="xs" style="color:#fde68a;margin-top:10px">Invoices from GHL aren&#39;t readable yet: ' + esc(d.ghl_error) + "</p>") + "</section>" +
      '<section class="card c12"><h3>Clients this month</h3><div class="stack" style="margin-top:10px">' + (d.clients.length ? d.clients.map(function (c) { return '<div class="row sp" style="gap:10px;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--line,rgba(255,255,255,.06))"><div style="flex:1 1 200px"><b>' + esc(c.name) + "</b>" + (c.deal ? ' <span class="chip c">' + esc(c.deal) + "</span>" : "") + '</div><span class="sm" style="min-width:110px">' + cmoney(c.mrr) + '/mo</span><span class="sm mu" style="min-width:110px">cost ' + cmoney(c.cost) + '</span><span class="sm" style="min-width:110px"><b class="pv">' + cmoney(c.profit) + "</b> profit</span>" + chip(c.invoice) + "</div>"; }).join("") : '<div class="empty">No clients with monthly products yet. Add them in Clients.</div>') + "</div></section>" +
      '<section class="card c12"><h3>Recent invoices</h3><div class="stack" style="margin-top:10px">' + (d.invoices.length ? d.invoices.map(function (i) { return '<div class="row sp" style="gap:10px;flex-wrap:wrap;padding:6px 0"><span class="sm" style="flex:1 1 200px">#' + esc(i.number || "") + " · " + esc(i.client || i.name) + '</span><span class="sm pv">' + cmoney(i.total) + "</span>" + (i.due_date ? '<span class="mu xs">due ' + esc(String(i.due_date).slice(0, 10)) + "</span>" : "") + chip(i.overdue ? "overdue" : i.status) + "</div>"; }).join("") : '<div class="empty">No invoices yet. Draft this month&#39;s invoices, approve them, and they&#39;ll show here.</div>') + "</div></section>" +
      '<section class="card c12"><h3>Settings</h3><p class="mu sm">Your fixed costs, GST and tax buffer. Invoices are drafted on the 1st of each month from each client&#39;s card, and wait for your approval.</p><div id="mnCosts" style="margin-top:10px"></div><button class="btn sm ghost" id="mnAddCost" style="margin-top:8px">' + ic("plus") + "Add cost</button>" +
      '<div class="grid" style="margin-top:14px"><label class="lab c3">GST registered?<select class="in" id="mnGst"><option value="no"' + (cfg.gst ? "" : " selected") + '>No</option><option value="yes"' + (cfg.gst ? " selected" : "") + '>Yes</option></select></label><label class="lab c3">Tax buffer %<input class="in" type="number" min="0" max="50" id="mnTax" value="' + esc(cfg.tax_pct) + '"></label><label class="lab c3">Invoice due in (days)<input class="in" type="number" min="0" max="60" id="mnDue" value="' + esc(cfg.due_days) + '"></label><label class="lab c3">Draft on the 1st?<select class="in" id="mnAuto"><option value="yes"' + (cfg.auto_draft ? " selected" : "") + '>Yes</option><option value="no"' + (cfg.auto_draft ? "" : " selected") + '>No</option></select></label><label class="lab c6">GHL user ID (only if invoices say it&#39;s needed)<input class="in" id="mnUser" value="' + esc(cfg.ghl_user_id || "") + '"></label></div><button class="btn pri" id="mnSave" style="margin-top:12px">Save settings</button></section></div>';
    const costRow = function (c) { return '<div class="row" data-cost style="gap:10px;margin-top:6px;flex-wrap:wrap;align-items:center"><input class="in" style="flex:1 1 220px" data-cn placeholder="e.g. GoHighLevel agency" value="' + esc(c.name || "") + '"><input class="in" style="max-width:120px" type="number" min="0" data-ca placeholder="$" value="' + esc(c.amount || "") + '"><select class="in" style="max-width:120px" data-ce><option value="month"' + (c.every === "year" ? "" : " selected") + '>/month</option><option value="year"' + (c.every === "year" ? " selected" : "") + '>/year</option></select><button class="btn sm ghost" data-cx>Remove</button></div>'; };
    const costs = $("#mnCosts", el);
    const wire = function () { $$("[data-cx]", costs).forEach(function (b) { b.onclick = function () { b.closest("[data-cost]").remove(); }; }); };
    costs.innerHTML = (cfg.costs.length ? cfg.costs : [{ name: "GoHighLevel", amount: "", every: "month" }, { name: "Claude", amount: "", every: "month" }]).map(costRow).join(""); wire();
    $("#mnAddCost", el).onclick = function () { costs.insertAdjacentHTML("beforeend", costRow({ every: "month" })); wire(); };
    $("#mnSave", el).onclick = async function () {
      const list = []; $$("[data-cost]", costs).forEach(function (r) { const n = $("[data-cn]", r).value.trim(); if (n) list.push({ name: n, amount: Number($("[data-ca]", r).value || 0), every: $("[data-ce]", r).value }); });
      try { await team("/money/settings", { method: "POST", body: { costs: list, gst: $("#mnGst", el).value === "yes", tax_pct: Number($("#mnTax", el).value || 0), due_days: Number($("#mnDue", el).value || 0), auto_draft: $("#mnAuto", el).value === "yes", ghl_user_id: $("#mnUser", el).value.trim() } }); toast("Money settings saved ✓", "ok"); VIEWS.money(el); } catch (err) { toast(err.message, "bad"); }
    };
    $("#mnDraft", el).onclick = async function (e) { const b = e.currentTarget; b.disabled = true; try { const r = await team("/money/draft", { method: "POST", body: {} }); toast(r.made.length ? r.made.length + " invoice" + (r.made.length > 1 ? "s" : "") + " waiting in Approvals" : "Nothing new to invoice" + (r.skipped.length ? ": " + r.skipped.map(function (x) { return x.name + " (" + x.why + ")"; }).join(", ") : ""), r.made.length ? "ok" : ""); bust("pending"); VIEWS.money(el); } catch (err) { toast(err.message, "bad"); b.disabled = false; } };
  };
'''
anchor = "  // v32: Clients = the client book"
assert s.count(anchor) == 1
s = s.replace(anchor, ui + anchor, 1)
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace(oldv, hashlib.sha1(s.encode()).hexdigest()[:10])
open(f, 'w').write(s)
print('v33 money applied')

s3 = open(f).read()
a = "@media (max-width:760px){.snap-row{grid-template-columns:repeat(4,minmax(0,1fr))}}"
assert s3.count(a) == 1, 'snap css'
s3 = s3.replace(a, a + "\n.mo-row{grid-template-columns:repeat(4,minmax(0,1fr))}@media (max-width:560px){.mo-row{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:14px}.mo-row b{font-size:20px}}")
open(f, 'w').write(s3)
print('money phone grid')
