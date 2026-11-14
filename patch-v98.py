# v98 Billing desk: failed subscription payments get chased politely, in the brand, with Ty's OK.
# - Daily (9am Brisbane, weekdays) Command reads open Stripe invoices that have a failed payment or are overdue.
# - Day 0, 3 and 7: a branded reminder (Ty's voice, Stripe "Pay invoice" button) waits in Approvals.
#   Nothing is sent without Ty's yes, and a reminder is never sent if the invoice has been paid since.
# - Ty gets one Telegram heads-up per failed invoice, and after 10 days a nudge to ring them. Then Command stops.
# - Never touches prices, plans, refunds or charges. inbox.billing = 'off' turns it off.
# - brandedEmail() gains an optional cta {k, head, p, url, btn} so the card at the bottom can be a Pay button.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# 1) branded email: optional call-to-action card
rep("""  const { body, cold = false, businessName = "", closing = "Cheers," } = opts;
  const kind = SF_EMAIL_KINDS[opts.kind] ? opts.kind : cold ? "intro" : "message";""", """  const { body, cold = false, businessName = "", closing = "Cheers," } = opts;
  const C = opts.cta && /^https:\\/\\//.test(String(opts.cta.url || "")) ? { k: esc3(opts.cta.k || "NEXT STEP"), head: esc3(opts.cta.head || ""), p: esc3(opts.cta.p || ""), url: String(opts.cta.url).replace(/"/g, "%22"), btn: esc3(opts.cta.btn || "Open") } : { k: "LET'S EXPLORE THE OPPORTUNITY", head: "What could smarter systems free up for your team?", p: "If you'd like to explore whether there's a worthwhile AI or automation opportunity for your business, you're welcome to book a free 30-minute conversation.", url: FREE_CALL2, btn: "BOOK A FREE 30-MINUTE CALL &#8594;" };
  const kind = SF_EMAIL_KINDS[opts.kind] ? opts.kind : cold ? "intro" : "message";""")
rep("""margin-bottom:13px">LET'S EXPLORE THE OPPORTUNITY</div>""", """margin-bottom:13px">${C.k}</div>""")
rep("""font-weight:800">What could smarter systems free up for your team?</h2>""", """font-weight:800">${C.head}</h2>""")
rep(""">If you'd like to explore whether there's a worthwhile AI or automation opportunity for your business, you're welcome to book a free 30-minute conversation.</p>""", """>${C.p}</p>""")
rep('''href="${FREE_CALL2}" target="_blank" style="display:inline-block;padding:17px 27px''', '''href="${C.url}" target="_blank" style="display:inline-block;padding:17px 27px''')
rep(""">BOOK A FREE 30-MINUTE CALL &#8594;</a></td></tr></table>""", """>${C.btn}</a></td></tr></table>""")

# 2) setting + whitelist
rep("""  out.noshow_flow = v.noshow_flow === 'command' ? 'command' : 'ghl';""", """  out.noshow_flow = v.noshow_flow === 'command' ? 'command' : 'ghl';
  out.billing = v.billing === 'off' ? 'off' : 'approve';""")
rep('''"inbox_quiet", "inbox_voice", "review_desk"].includes(key)''', '''"inbox_quiet", "inbox_voice", "review_desk", "billing_desk"].includes(key)''')

# 3) the billing desk
G = r'''
// v98 billing desk: polite, branded, approval-gated chase for failed subscription payments
var BILL_STAGES = [0, 3, 7];
var BILL_CALL_DAY = 10;
function billMoney(inv) { const c = String(inv.currency || "aud").toUpperCase(); return (c === "AUD" ? "$" : c + " ") + ((Number(inv.amount_due) || 0) / 100).toFixed(2); }
function billDraft(inv, stage, first) {
  const num = inv.number || inv.id, amt = billMoney(inv), what = String(inv.lines?.data?.[0]?.description || "plan").replace(/^\d+\s*[×x]\s*/, "").slice(0, 80);
  const hi = "Hi " + (first || "there") + ",";
  const bodies = [
    [`Quick heads up on your payment`, `${hi}\n\nJust a quick heads up: the payment for your ${what} didn't go through (invoice ${num}, ${amt}). It's usually just an expired or replaced card.\n\nYou can update your card and pay securely with the button below. If anything has changed on your end, just reply and we'll sort it out.\n\nThanks so much,\nTy`],
    [`Following up on invoice ${num}`, `${hi}\n\nJust following up on the ${amt} payment for invoice ${num}, which still hasn't gone through. The secure link below only takes a minute.\n\nIf there's a problem, reply here and we'll work it out together.\n\nThanks,\nTy`],
    [`Your invoice ${num} is still open`, `${hi}\n\nI wanted to check in personally: invoice ${num} for ${amt} is still unpaid. Could you take care of it with the link below, or reply and let me know what's going on? Happy to help if something isn't right.\n\nThanks,\nTy`]
  ];
  const [subject, message] = bodies[Math.min(stage, 2)];
  return { subject, message, cta: { k: "SECURE PAYMENT", head: "Invoice " + num, p: amt + " due. Pay securely through Stripe.", url: inv.hosted_invoice_url, btn: "Pay invoice" } };
}
async function billingDesk(env, { force = false } = {}) {
  if (!enabled2(env)) return { skipped: "Stripe not connected" };
  if (!enabled(env)) return { skipped: "GHL not connected" };
  const cfg = inboxSettings(await getSettings(env).catch(() => ({})));
  if (cfg.billing === "off") return { skipped: "billing chase off" };
  const n = brisbaneNow();
  const d = (await linkGet(env, "billing_desk").catch(() => null)) || {};
  d.inv = d.inv || {};
  if (!force && (n.hour !== 9 || n.dow > 5 || d.last_run === n.date)) return { skipped: "not time yet" };
  d.last_run = n.date;
  const out = { open: 0, drafted: [], paid: [], call: [] };
  const list = await listInvoices(env, "open", 100).catch(() => null);
  const open = (list?.data || []).filter((i) => i.hosted_invoice_url && (Number(i.amount_due) || 0) > 0 && ((Number(i.attempt_count) || 0) > 0 || (i.due_date && i.due_date * 1e3 < Date.now())));
  out.open = open.length;
  const openIds = new Set(open.map((i) => i.id));
  for (const [id, r] of Object.entries(d.inv)) if (!openIds.has(id) && !r.closed) { r.closed = new Date().toISOString(); out.paid.push(r.name || id); }
  for (const inv of open) {
    const cust = inv.customer && typeof inv.customer === "object" ? inv.customer : {};
    const email = inv.customer_email || cust.email || "";
    const name = inv.customer_name || cust.name || email;
    const r = d.inv[inv.id] || (d.inv[inv.id] = { name, first_seen: new Date().toISOString(), sent: [] });
    r.name = name; r.amount = billMoney(inv); r.number = inv.number || inv.id;
    const days = Math.floor((Date.now() - Date.parse(r.first_seen)) / 864e5);
    const stage = BILL_STAGES.filter((x) => days >= x).length - 1;
    if (!r.told) { r.told = n.date; await notify(env, "\u{1F4B3} <b>Payment didn't go through</b>\n" + esc2(name) + ": " + esc2(r.amount) + " (invoice " + esc2(r.number) + ").\nA friendly branded reminder with the pay link is waiting for your OK in Approvals. Nothing goes out without you.").catch(() => {}); }
    if (days >= BILL_CALL_DAY && !r.call) { r.call = n.date; out.call.push(name); await notify(env, "\u{1F4DE} <b>Still unpaid after 3 reminders</b>\n" + esc2(name) + " owes " + esc2(r.amount) + " (invoice " + esc2(r.number) + "). Worth a quick call. I've stopped emailing them.").catch(() => {}); continue; }
    if (stage < 0 || r.sent.includes(stage) || days >= BILL_CALL_DAY || !email) continue;
    const contactId = await upsertContact(env, { email, firstName: String(name || "").split(/\s+/)[0] || void 0, tags: ["billing-chase"], source: "Stripe billing" }).catch(() => null);
    if (!contactId) continue;
    const first = String(cust.name || inv.customer_name || "").split(/\s+/)[0] || "";
    const m = billDraft(inv, stage, first);
    const [row] = await insert(env, "team_actions", [{ department: "head_of_finance", type: "ghl_followup", title: ("Payment reminder " + (stage + 1) + " of 3 to " + name + " (" + r.amount + ")").slice(0, 200), reason: ("Invoice " + r.number + " for " + r.amount + (inv.attempt_count ? " failed to charge" : " is overdue") + ". Reminder " + (stage + 1) + " of 3 (day 0, 3 and 7). It won't send if they've paid by the time you approve.").slice(0, 500), params: { kind: "billing_chase", invoice_id: inv.id, contact_id: contactId, contact_name: name, channel: "email", send_type: "Email", subject: m.subject, message: m.message, cta: m.cta }, status: "pending" }]).catch(() => []);
    if (row) { r.sent.push(stage); out.drafted.push(name); }
  }
  for (const [id, r] of Object.entries(d.inv)) if (r.closed && Date.now() - Date.parse(r.closed) > 60 * 864e5) delete d.inv[id];
  await saveSetting(env, "billing_desk", d).catch(() => {});
  if (out.paid.length) await notify(env, "✅ <b>Paid</b>: " + out.paid.map(esc2).join(", ") + ". Any reminders still waiting for them won't send.").catch(() => {});
  return { ok: true, ...out };
}
'''
rep("""// v97: the GHL "SF | Sales | No-Show Recovery" workflow fires""", G + """// v97: the GHL "SF | Sales | No-Show Recovery" workflow fires""")

# 4) sending: never chase a paid invoice; reminders carry the Pay button
rep("""    case "ghl_followup": {
      if (!p.message || !String(p.message).trim()) throw new Error("Nothing to send.");
      if (p.send_type === "Email") return sendEmail(env, p.contact_id, p.subject || "Following up from Studio Flow & Systems", brandedEmail({ body: String(p.message).slice(0, 4000), origin: env.STUDIO_PUBLIC_ORIGIN, closing: "", kind: "followup" }));""", """    case "ghl_followup": {
      if (!p.message || !String(p.message).trim()) throw new Error("Nothing to send.");
      if (p.kind === "billing_chase") {
        const inv = p.invoice_id ? await req2(env, "GET", "/invoices/" + encodeURIComponent(p.invoice_id)) : null;
        if (!inv || inv.status !== "open") throw new Error("That invoice has been paid or closed, so nothing was sent.");
        return sendEmail(env, p.contact_id, p.subject || "About your invoice", brandedEmail({ body: String(p.message).slice(0, 4000), origin: env.STUDIO_PUBLIC_ORIGIN, closing: "", kind: "message", cta: { ...(p.cta || {}), url: inv.hosted_invoice_url || p.cta?.url } }));
      }
      if (p.send_type === "Email") return sendEmail(env, p.contact_id, p.subject || "Following up from Studio Flow & Systems", brandedEmail({ body: String(p.message).slice(0, 4000), origin: env.STUDIO_PUBLIC_ORIGIN, closing: "", kind: "followup" }));""")

# 5) cron + routes + Command knows
rep("""  await reviewDesk(e).catch((x) => console.error("review desk:", x.message));""", """  await reviewDesk(e).catch((x) => console.error("review desk:", x.message));
  await billingDesk(e).catch((x) => console.error("billing desk:", x.message));""")
rep("""  if (seg[0] === "reviews") {""", """  if (seg[0] === "billing") { if (p === "/billing/check" && m === "POST") return json(await billingDesk(env, { force: true })); if (p === "/billing" && m === "GET") { const d = (await linkGet(env, "billing_desk").catch(() => null)) || {}; const all = Object.values(d.inv || {}); return json({ ok: true, open: all.filter((r) => !r.closed).map((r) => ({ name: r.name, amount: r.amount, invoice: r.number, reminders: (r.sent || []).length, call: !!r.call })), paid_recently: all.filter((r) => r.closed).map((r) => r.name).slice(0, 20) }); } }
  if (seg[0] === "reviews") {""")
rep("""    "REVIEWS: Google review requests""", """    "BILLING: when a client's subscription payment fails or an invoice goes overdue, the billing desk (weekdays 9am) drafts up to 3 branded reminders in Ty's voice (day 0, 3 and 7) with a Stripe 'Pay invoice' button. Each waits in Approvals; none sends if they've paid since. After 10 days it tells Ty to ring them and stops. Never change prices, plans, refunds or charges yourself.",
    "REFERRALS: when a client leaves a Google review (tag review-left) or Ty adds the tag ask-for-referral, the GHL workflow \\"SF | Client | Referral Request\\" emails them 3 days later asking for an introduction (tag referral-asked). Never write your own referral ask; add the tag instead.",
    "REVIEWS: Google review requests""")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v98 applied')
