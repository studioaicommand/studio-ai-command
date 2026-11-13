# v75 Monday report: every Monday morning (8am Brisbane) Ty gets last week's numbers and wins on Telegram, saved in Reports.
# Built from real data only (Stripe, GHL calendar, Command's own records). No AI, so it costs nothing and can't make things up.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

rep('  if (!["email_stats", "fair_use_status",', '  if (!["email_stats", "fair_use_status", "monday_report",')

rep('async function missionBlock(env) {', r'''async function mondayReport(env, { force = false } = {}) {
  const bn = brisbaneNow();
  if (!force && (bn.dow !== 1 || bn.hour < 8 || bn.hour > 11)) return { skipped: true };
  const sent = (await select(env, "team_settings", "key=eq.monday_report&select=value&limit=1").catch(() => []))?.[0]?.value || {};
  if (!force && (bn.dow !== 1 || bn.hour < 8 || bn.hour > 11 || sent.date === bn.date)) return { skipped: true };
  const inst = await instGet(env).catch(() => ({})), custom = !!inst.custom;
  const now = Date.now(), d7 = new Date(now - 7 * 864e5).toISOString(), d14 = new Date(now - 14 * 864e5).toISOString();
  const money = (n) => "$" + Math.round(n).toLocaleString("en-AU");
  const L = [];
  // Revenue
  let rev = null;
  if (enabled2(env)) {
    try {
      const sec = Math.floor(now / 1e3), net2 = (cs) => cs.filter((c) => c.paid && c.status === "succeeded").reduce((x, c) => x + c.amount - (c.amount_refunded || 0), 0) / 100;
      const [a, b] = await Promise.all([listCharges(env, sec - 7 * 86400, sec), listCharges(env, sec - 14 * 86400, sec - 7 * 86400)]);
      rev = { week: net2(a), prev: net2(b), payments: a.filter((c) => c.paid && c.status === "succeeded").length };
    } catch {}
  }
  const [acts, prev, pros, wins, demos, waiting, use] = await Promise.all([
    select(env, "team_actions", `status=eq.done&decided_at=gte.${d7}&select=type,auto&limit=5000`).catch(() => []),
    select(env, "team_actions", `status=eq.done&decided_at=gte.${d14}&decided_at=lt.${d7}&select=type&limit=5000`).catch(() => []),
    select(env, "agent_prospects", `created_at=gte.${d7}&select=id&limit=5000`).catch(() => []),
    select(env, "agent_prospects", `updated_at=gte.${d7}&status=in.(won,replied)&select=business_name,status,leak_report&limit=200`).catch(() => []),
    select(env, "agent_demos", `first_view_at=gte.${d7}&select=token&limit=5000`).catch(() => []),
    select(env, "team_actions", "status=eq.pending&select=type&limit=500").catch(() => []),
    custom ? Promise.resolve([]) : select(env, "team_usage", `created_at=gte.${d7}&select=cost_aud&limit=8000`).catch(() => [])
  ]);
  const goal = await goalStatus(env, { fresh: true }).catch(() => null);
  const sends = (rows) => rows.filter((x) => ["ghl_email", "ghl_sms", "outreach_email", "campaign_enrol", "ghl_reply", "ghl_followup"].includes(x.type)).length;
  const arrow = (a, b) => b == null ? "" : a > b ? " ▲" : a < b ? " ▼" : "";
  if (rev) L.push("💰 Revenue: <b>" + money(rev.week) + "</b> from " + rev.payments + " payment" + (rev.payments === 1 ? "" : "s") + arrow(rev.week, rev.prev) + " (week before " + money(rev.prev) + ")");
  if (goal) L.push("📅 Calls booked this week: <b>" + goal.booked + "</b> of " + goal.goal);
  L.push("✉️ Messages sent with your OK: <b>" + sends(acts) + "</b>" + arrow(sends(acts), sends(prev)));
  const autoN = acts.filter((x) => x.auto).length;
  if (autoN) L.push("⚙️ Handled on autopilot: " + autoN);
  if (!custom) {
    L.push("🔎 New prospects researched: " + pros.length);
    L.push("👀 Demos opened by businesses: " + demos.length);
  }
  if (waiting.length) L.push("⏳ Waiting for you now: " + waiting.length);
  if (!custom && use.length) L.push("🤖 AI cost: " + "$" + use.reduce((x, r) => x + (+r.cost_aud || 0), 0).toFixed(2));
  const W2 = [];
  for (const w of wins) {
    if (w.status === "won") W2.push("🏆 Won: " + w.business_name);
    else W2.push("💬 Replied: " + w.business_name);
    const lt = w.leak_report?.live_test;
    if (lt?.result === "replied" && Date.parse(lt.replied_at || 0) > now - 7 * 864e5) W2.push("⏱ " + w.business_name + " answered your leak test in " + leakTestWords2(lt.reply_minutes));
  }
  const title = "Monday report · week to " + new Date(now + 10 * 36e5).toISOString().slice(0, 10);
  const text = "<b>" + title + "</b>\n\n" + L.join("\n") + (W2.length ? "\n\n<b>Wins</b>\n" + W2.slice(0, 12).map((x) => x.replace(/[<>&]/g, "")).join("\n") : "\n\nNo new wins logged last week.") + "\n\nThe full team reports are in Command › Reports.";
  const [row] = await insert(env, "team_reports", [{ department: "chief_of_staff", kind: "shift", subkind: "monday_report", title, body: text.replace(/<\/?b>/g, "**") }]).catch(() => []);
  await notify(env, text).catch(() => {});
  await saveSetting(env, "monday_report", { date: bn.date, report_id: row?.id || null });
  return { ok: true, report_id: row?.id || null, text };
}
function leakTestWords2(mins) { mins = +mins || 0; return mins < 60 ? mins + " min" : mins < 1440 ? Math.round(mins / 6) / 10 + " hours" : Math.round(mins / 144) / 10 + " days"; }
async function missionBlock(env) {''')

rep('''  await aiBudgetCheck(e).catch((x) => console.error("ai budget:", x.message));''', '''  await aiBudgetCheck(e).catch((x) => console.error("ai budget:", x.message));
  await mondayReport(e).catch((x) => console.error("monday report:", x.message));''')
rep('  if (p === "/audit/verify" && m === "GET")', '  if (p === "/monday-report" && m === "POST") return json(await mondayReport(env, { force: true }));\n  if (p === "/audit/verify" && m === "GET")')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v75 applied')
