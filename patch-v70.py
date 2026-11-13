# v70: clients never see what the AI costs to run (they pay Studio's plan price, AI usage is included).
# Studio keeps the real cost + margin per client in the Studio console, and sets a hidden fair-use cap per client.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# ── Client app: no AI cost anywhere on a client copy ──
# Money is Studio's own agency P&L (AI budget, Claude costs, client invoices): not a client screen.
rep("if (b.custom) INST_OFF.add('fleet');", "if (b.custom) { INST_OFF.add('fleet'); INST_OFF.add('money'); }")
# Performance tiles
rep("""'<div class="wd-metrics"><div class="wf-glass"><span class="mu sm">AI cost this week</span><strong>' + money(f && f.cost_aud) + '</strong></div><div class="wf-glass"><span class="mu sm">Cost per booked call</span><strong>' + money(f && f.cost_per_booked) + '</strong></div>""",
    """'<div class="wd-metrics">' + (INST && INST.custom ? '<div class="wf-glass"><span class="mu sm">AI usage</span><strong>Included in your plan</strong></div>' : '<div class="wf-glass"><span class="mu sm">AI cost this week</span><strong>' + money(f && f.cost_aud) + '</strong></div><div class="wf-glass"><span class="mu sm">Cost per booked call</span><strong>' + money(f && f.cost_per_booked) + '</strong></div>') + '""")
# each agent's scorecard
rep("""'</b> waiting</span><span><b>' + money(x.cost_aud) + '</b> AI</span>""",
    """'</b> waiting</span>' + (INST && INST.custom ? '' : '<span><b>' + money(x.cost_aud) + '</b> AI</span>') + '""")
# Systems health
rep(', ["AI cost", "$" + (c.cost_aud || 0)]', '].concat(INST && INST.custom ? [] : [["AI cost", "$" + (c.cost_aud || 0)]])')
s = s.replace('[["Drafted", f.drafted], ["Approved", f.approved], ["Rejected", f.rejected], ["Refused", f.refused_by_checks], ["Waiting", f.waiting], ["Hrs to decide", f.median_hours_to_decision ?? "\\u2013"]].concat(INST', '([["Drafted", f.drafted], ["Approved", f.approved], ["Rejected", f.rejected], ["Refused", f.refused_by_checks], ["Waiting", f.waiting], ["Hrs to decide", f.median_hours_to_decision ?? "\\u2013"]].concat(INST', 1)
assert '([["Drafted", f.drafted]' in s, 'systems paren'
s = s.replace('].concat(INST && INST.custom ? [] : [["AI cost", "$" + (c.cost_aud || 0)]])]', '].concat(INST && INST.custom ? [] : [["AI cost", "$" + (c.cost_aud || 0)]]))', 1)

# ── Server: the same numbers never leave a client copy ──
# Money, AI costs and the AI budget answer "not found" on a client copy (the fair-use cap is set from Studio's console).
rep("  for (const [mod, re] of INST_RULES) {\n",
    "  if (/^\\/api\\/v1\\/team\\/(money|costs)(\\/|$)/.test(p) && (await instGet(env)).custom) return secJson({ ok: false, error: \"Not found.\" }, 404);\n  for (const [mod, re] of INST_RULES) {\n")
# Performance: no cost figures in the data a client copy returns
rep('return J({ ok: true, tier, specialists: tier === "company" ? SPECIALISTS : null, spec_count: SPEC_COUNT, scorecards: Object.values(sc), funnel: fun,',
    'const hideCost = (await instGet(env).catch(() => ({}))).custom; if (hideCost) instSpecSwap();\n    return J({ ok: true, tier, specialists: tier === "company" ? SPECIALISTS : null, spec_count: SPEC_COUNT, scorecards: hideCost ? Object.values(sc).map((x) => ({ ...x, cost_aud: null })) : Object.values(sc), funnel: hideCost && fun && fun.ok ? { ...fun, cost_aud: null, cost_per_booked: null } : fun,')
# Every AI on a client copy: AI usage is included in their plan, never quoted
rep("Never offer or mention those services; apply the same skills to ${i.business_name}'s own customers, enquiries, bookings, reviews and growth.",
    "Never offer or mention those services; apply the same skills to ${i.business_name}'s own customers, enquiries, bookings, reviews and growth. This AI system is included in ${i.business_name}'s plan: never state, estimate or report what the AI, tokens or this software cost to run, and never count AI spend as one of their business costs. If asked, say AI usage is included in their plan.")
# Finance's "AI Spend Controller" specialist becomes an Expense Watcher on a client copy
rep("var SPECIALISTS = {", """function instSpecSwap() { const fin = SPECIALISTS.head_of_finance || [], k = fin.findIndex((x) => x.id === "ai_spend_controller"); if (k >= 0) fin[k] = { id: "expense_watcher", name: "Expense Watcher", focus: "Watches business costs, subscriptions and supplier bills for waste and price creep." }; Object.assign(KPI, KPI_CLIENT); }
var KPI_CLIENT = { chief_of_staff: "Bookings and revenue this week against the monthly target; the whole team moving in one direction", head_of_sales: "Enquiries turned into bookings; every new lead and quote followed up within one working day", head_of_marketing: "New enquiries each week from Google, social and referrals; cost per new client", head_of_content: "Content and proof (reviews, before-and-afters, videos) that brings in enquiries and bookings", head_of_client_success: "Rebookings, referrals and Google reviews from current clients; no client goes quiet", head_of_systems: "Automations live and errors fixed within a day; the business runs without the owner chasing it", head_of_finance: "Cash collected, overdue invoices chased, business costs kept in check" };
var SPECIALISTS = {""")
rep("  if (!run.tier) run.tier = await planTier(env).catch(() => \"core\");", "  if (!run.tier) run.tier = await planTier(env).catch(() => \"core\");\n  if ((await instGet(env).catch(() => ({}))).custom) instSpecSwap();")

rep('  if (!["email_stats", "outreach",', '  if (!["email_stats", "fair_use_status", "outreach",')
rep("  const seg = p.split(\"/\").filter(Boolean);\n  if (seg[0] === \"website-demos\")", "  const seg = p.split(\"/\").filter(Boolean);\n  if ((await instGet(env).catch(() => ({}))).custom) instSpecSwap();\n  if (seg[0] === \"website-demos\")")
rep("  const instMods = (await instGet(e).catch(() => null))?.modules || { outreach: true, receptionist_product: true };", "  const instMods = (await instGet(e).catch(() => null))?.modules || { outreach: true, receptionist_product: true };\n  if ((await instGet(e).catch(() => ({}))).custom) instSpecSwap();")
rep("if (b.custom) { INST_OFF.add('fleet'); INST_OFF.add('money'); }", "if (b.custom) { INST_OFF.add('fleet'); INST_OFF.add('money'); if (TITLES.performance) TITLES.performance[1] = 'Every agent judged on results: work done, approvals and its weekly scorecard'; }")
# ── Fair-use cap (hidden from the client, set by Studio) ──
rep("async function aiBackgroundPaused(env) {\n", """async function fairUseCheck(env) {
  const i = await instGet(env).catch(() => null);
  if (!i || !i.custom) return null;
  const cap = Number((await secGet(env, "fair_use").catch(() => null) || {}).monthly_aud) || 0;
  const month = aiMonth(), start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  const rows = await select(env, "team_usage", `created_at=gte.${start.toISOString()}&select=cost_aud&limit=5000`).catch(() => []);
  const spend = Math.round(rows.reduce((a, r) => a + (+r.cost_aud || 0), 0) * 100) / 100;
  const st = { month, cap_aud: cap || null, spend_aud: spend, pct: cap ? Math.round(spend / cap * 100) : null, paused: !!cap && spend >= cap, at: new Date().toISOString() };
  await saveSetting(env, "fair_use_status", st).catch(() => {});
  return st;
}
async function aiBackgroundPaused(env) {
  const fu = (await select(env, "team_settings", "key=eq.fair_use_status&select=value&limit=1").catch(() => []))?.[0]?.value;
  if (fu && fu.month === aiMonth() && fu.paused) return true;
""")
rep("await aiBudgetCheck(e).catch((x) => console.error(\"ai budget:\", x.message));",
    "await aiBudgetCheck(e).catch((x) => console.error(\"ai budget:\", x.message));\n  await fairUseCheck(e).catch((x) => console.error(\"fair use:\", x.message));\n  if (instMods.outreach) await fleetFairUseWatch(e).catch((x) => console.error(\"fleet fair use:\", x.message));")
# The client copy reports its cap to Studio's console, and Studio can set it.
rep("return { ok: true, version: APP.v, ai_spend_month_aud: Math.round(usage.reduce((a, r) => a + (+r.cost_aud || 0), 0) * 100) / 100,",
    "const fuCap = Number((await secGet(env, \"fair_use\").catch(() => null) || {}).monthly_aud) || null;\n  return { ok: true, version: APP.v, fair_use_aud: fuCap, ai_spend_month_aud: Math.round(usage.reduce((a, r) => a + (+r.cost_aud || 0), 0) * 100) / 100,")
rep('if (seg[0] === "fleet" || seg[0] === "fleet-info") {', 'if (seg[0] === "fleet" || seg[0] === "fleet-info" || seg[0] === "fair-use-check") {')
rep('  if (p === "/fleet-info" && m === "GET") return J(await fleetInfo(env));', '  if (p === "/fleet-info" && m === "GET") return J(await fleetInfo(env));\n  if (p === "/fair-use-check" && m === "POST") return J({ ok: true, status: await fairUseCheck(env) });')
rep('  if (p === "plan" && request.method === "POST") {\n', """  if (p === "fair-use" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const v = Number(b.monthly_aud);
    if (!(v >= 0 && v <= 1e5)) return secJson({ ok: false, error: "Enter a monthly cap in dollars (0 for none)." }, 400);
    await secPut(env, "fair_use", { monthly_aud: Math.round(v * 100) / 100, at: new Date().toISOString() });
    const r = await teamFetch(new Request(new URL(request.url).origin + "/api/v1/team/fair-use-check", { method: "POST", headers: { Authorization: "Bearer " + memSecret(env) } }), env, ctx);\n    return secJson({ ok: true, monthly_aud: v, status: (await r.json().catch(() => ({}))).status || null });
  }
  if (p === "plan" && request.method === "POST") {
""")
rep('    if (seg[2] === "plan" && m === "POST" && (body.tier === "core" || body.tier === "company")) {\n', """    if (seg[2] === "fair-use" && m === "POST") {
      const r = await fleetCall(env, it, "fair-use", { method: "POST", body: JSON.stringify({ monthly_aud: Number(body.monthly_aud) }) }).catch((e) => ({ ok: false, error: e.message }));
      if (!r.ok) return J({ ok: false, error: r.error || "Couldn't reach their Command. Is it updated to v70?" }, 502);
      await secLog(env, { actor: "Ty", action: "fleet_fair_use_set", summary: `Set ${it.business}'s fair-use AI cap to $${Number(body.monthly_aud)}/month` });
      return J({ ok: true });
    }
    if (seg[2] === "plan" && m === "POST" && (body.tier === "core" || body.tier === "company")) {
""")
# Studio gets a Telegram nudge (max once per client per level per month) when a client passes 80% / 100% of their cap.
rep("async function fleetList(env) {", """async function fleetFairUseWatch(env) {
  const seen = await secGet(env, "fleet_fair_use_alerts").catch(() => null) || {};
  if (seen.checked_at && Date.now() - Date.parse(seen.checked_at) < 6 * 36e5) return;
  const items = await fleetList(env), month = aiMonth(), sent = seen.month === month ? seen.sent || {} : {};
  for (const it of items) {
    const st = await fleetCall(env, it, "status").catch(() => null);
    const cap = Number(st?.fair_use_aud) || 0, spend = Number(st?.ai_spend_month_aud) || 0;
    if (!cap) continue;
    const pct = Math.round(spend / cap * 100), level = pct >= 100 ? 100 : pct >= 80 ? 80 : 0;
    if (!level || (sent[it.id] || 0) >= level) continue;
    sent[it.id] = level;
    await notify(env, (level >= 100 ? "⏸ <b>" + String(it.business || "").replace(/[<>&]/g, "") + " hit their fair-use AI cap</b>\\nTheir background AI work is paused until the 1st (chat, inbox and phone keep running)." : "📈 <b>" + String(it.business || "").replace(/[<>&]/g, "") + " is at " + pct + "% of their fair-use AI cap</b>") + "\\nAI cost this month $" + spend.toFixed(2) + " of a $" + cap.toFixed(0) + " cap" + (it.plan_aud ? " · they pay $" + it.plan_aud + "/mo" : "") + ". Raise the cap or talk about the next plan up in Clients › Client Commands.").catch(() => {});
  }
  await secPut(env, "fleet_fair_use_alerts", { month, sent, checked_at: new Date().toISOString() });
}
async function fleetList(env) {""")
# Studio console card: fair-use line + button
rep("        flMargin(x) +\n", """        flMargin(x) +
        (x.live ? (function () { const cap = x.live.fair_use_aud, sp = x.live.ai_spend_month_aud || 0, pc = cap ? Math.round(sp / cap * 100) : null; return '<div class="fl-margin"><span class="sm">' + (cap ? 'Fair-use AI cap <b>$' + esc(cap) + '/mo</b> · used <b class="' + (pc >= 100 ? 'bad' : pc >= 80 ? 'warn' : 'good') + '">' + esc(pc) + '%</b>' + (pc >= 100 ? '<br><span class="mu xs">Their background AI work is paused until the 1st. Chat, inbox and phone keep running.</span>' : '') : '<span class="mu">No fair-use AI cap. Set one so a heavy month can’t cost more than they pay.</span>') + '</span><button class="btn sm ghost" data-fl-fair>' + (cap ? 'Edit cap' : 'Set cap') + '</button></div>'; })() : '') +
""")
rep("      const pl = $('[data-fl-plan]', c);\n", """      const fu = $('[data-fl-fair]', c);
      if (fu) fu.onclick = async () => { const x = d.items.find((i) => i.id === id) || {}; const cur = x.live && x.live.fair_use_aud; const v = await modal({ title: 'Fair-use AI cap', text: 'The most AI cost (A$) you’ll carry for this client each month. They never see it. At 80% you get a Telegram message; at 100% their background AI work pauses until the 1st, while chat, inbox and phone keep running. 0 removes the cap.', fields: [{ id: 'cap', label: 'Monthly cap ($)', value: cur ? String(cur) : (x.plan_aud ? String(Math.round(x.plan_aud * 0.2)) : '') }], ok: 'Save' }); if (!v) return; const n = Number(String(v.cap).replace(/[^0-9.]/g, '')); try { await team('/fleet/' + id + '/fair-use', { method: 'POST', body: { monthly_aud: n } }); toast('Fair-use cap saved', 'ok'); VIEWS.fleet(el); } catch (e) { toast(e.message, 'bad'); } };
      const pl = $('[data-fl-plan]', c);
""")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v70 applied')
