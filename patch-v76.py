# v76 Leak Scanner (inside scan, read-only) + Leak Watch: Command reads the business's own GHL and Stripe (never writes)
# and finds where money leaks: slow or missing replies, no-shows, stale deals, overdue invoices. Monthly re-scan compares.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

rep('async function mondayReport(env, { force = false } = {}) {', r'''function lsStamp(v) { const n = typeof v === "number" ? v : Date.parse(v || ""); return Number.isFinite(n) ? n : 0; }
async function leakInsideScan(env, { days = 30, save = true } = {}) {
  const now = Date.now(), since = now - days * 864e5, M = { days, at: new Date(now).toISOString() }, F = [];
  const inst = await instGet(env).catch(() => ({}));
  // 1. Enquiries: how fast are they answered, and how many never were (read-only GHL)
  if (enabled(env)) {
    try {
      const d = await searchConversations(env, { limit: 60 });
      const convs = (d?.conversations || []).filter((c) => lsStamp(c.lastMessageDate) >= since).slice(0, 40);
      const waits = []; let unanswered = 0, threads = 0;
      for (const c of convs) {
        const m = await getMessages(env, c.id, 30).catch(() => null);
        const list = (m?.messages?.messages || m?.messages || []).filter((x) => x && x.body && ["inbound", "outbound"].includes(x.direction)).sort((a, b) => lsStamp(a.dateAdded) - lsStamp(b.dateAdded));
        if (!list.some((x) => x.direction === "inbound")) continue;
        threads++;
        for (let i = 0; i < list.length; i++) {
          if (list[i].direction !== "inbound" || (i > 0 && list[i - 1].direction === "inbound")) continue;
          const reply = list.slice(i + 1).find((x) => x.direction === "outbound");
          if (reply) waits.push((lsStamp(reply.dateAdded) - lsStamp(list[i].dateAdded)) / 6e4);
        }
        const last = list[list.length - 1];
        const ack = String(last.body || "").length <= 40 && /thank|thx|ta\b|ok\b|okay|great|cheers|perfect|awesome|sounds good|see you|👍|🙏/i.test(String(last.body || ""));
        if (last.direction === "inbound" && !ack && now - lsStamp(last.dateAdded) > 864e5) unanswered++;
      }
      waits.sort((a, b) => a - b);
      M.enquiry_threads = threads; M.unanswered_24h = unanswered;
      M.median_reply_minutes = waits.length ? Math.round(waits[Math.floor(waits.length / 2)]) : null;
      M.replied_within_5_min_pct = waits.length ? Math.round(waits.filter((x) => x <= 5).length / waits.length * 100) : null;
      if (unanswered) F.push({ key: "unanswered", sev: unanswered >= 3 ? "high" : "medium", title: unanswered + " enquir" + (unanswered === 1 ? "y" : "ies") + " left without a reply for over 24 hours", fix: "Turn on the AI receptionist for after-hours and busy times, or a missed-message text-back." });
      if (M.median_reply_minutes != null && M.median_reply_minutes > 60) F.push({ key: "slow_reply", sev: M.median_reply_minutes > 240 ? "high" : "medium", title: "Typical first reply takes " + (M.median_reply_minutes >= 120 ? Math.round(M.median_reply_minutes / 60) + " hours" : M.median_reply_minutes + " minutes"), fix: "Answer new enquiries within 5 minutes; most people book with whoever answers first." });
    } catch (e) { M.enquiries_error = String(e.message).slice(0, 120); }
    // 2. Bookings: no-shows and cancellations
    try {
      const cals = env.GHL_CALENDAR_ID ? [{ id: env.GHL_CALENDAR_ID }] : (typeof CALENDARS !== "undefined" ? CALENDARS : []);
      let total = 0, noshow = 0, cancelled = 0; const seen = new Set();
      for (const c of cals.slice(0, 8)) {
        const d = await listEvents(env, since, now, c.id).catch(() => null);
        for (const e of d?.events || []) { if (seen.has(e.id)) continue; seen.add(e.id); total++; const st = String(e.appointmentStatus || e.status || "").toLowerCase(); if (/noshow|no_show/.test(st)) noshow++; else if (/cancel/.test(st)) cancelled++; }
      }
      M.bookings = total; M.no_shows = noshow; M.cancellations = cancelled;
      if (total >= 5 && noshow / total >= 0.08) F.push({ key: "no_shows", sev: noshow / total >= 0.15 ? "high" : "medium", title: noshow + " no-shows out of " + total + " bookings (" + Math.round(noshow / total * 100) + "%)", fix: "Send a reminder 24 hours and 2 hours before, with an easy reschedule link, and rebook no-shows the same day." });
    } catch (e) { M.bookings_error = String(e.message).slice(0, 120); }
    // 3. Deals going cold
    try {
      const d = await searchOpportunities(env, { status: "open", limit: 100 });
      const opps = d?.opportunities || [];
      const stale = opps.filter((o) => now - lsStamp(o.lastStageChangeAt || o.updatedAt || o.lastStatusChangeAt) > 14 * 864e5);
      const value = stale.reduce((x, o) => x + (Number(o.monetaryValue) || 0), 0);
      M.open_deals = opps.length; M.stale_deals = stale.length; M.stale_value = Math.round(value);
      if (stale.length) F.push({ key: "stale_deals", sev: stale.length >= 5 ? "high" : "medium", title: stale.length + " open deal" + (stale.length === 1 ? "" : "s") + " untouched for 14+ days" + (value ? " ($" + Math.round(value).toLocaleString("en-AU") + ")" : ""), fix: "Follow up every open deal within a week, then close it as won or lost." });
    } catch (e) { M.deals_error = String(e.message).slice(0, 120); }
  } else M.ghl = "not connected";
  // 4. Money owed
  if (enabled2(env)) {
    try {
      const d = await listInvoices(env, "open", 100);
      const overdue = (d?.data || []).filter((i) => i.due_date && i.due_date * 1e3 < now);
      const owed = overdue.reduce((x, i) => x + (i.amount_remaining || 0), 0) / 100;
      M.overdue_invoices = overdue.length; M.overdue_amount = Math.round(owed);
      if (overdue.length) F.push({ key: "overdue", sev: owed >= 1000 ? "high" : "medium", title: overdue.length + " overdue invoice" + (overdue.length === 1 ? "" : "s") + " ($" + Math.round(owed).toLocaleString("en-AU") + " owed)", fix: "Send an automatic reminder on the due date, 3 days after, and 7 days after." });
    } catch (e) { M.invoices_error = String(e.message).slice(0, 120); }
  } else M.stripe = "not connected";
  const weight = { high: 18, medium: 9, low: 4 };
  M.not_checked = [!enabled(env) && "enquiries, bookings and deals (GHL isn't connected)", !enabled2(env) && "invoices (Stripe isn't connected)", M.enquiries_error && "enquiries (GHL error)", M.bookings_error && "bookings (GHL error)", M.deals_error && "deals (GHL error)", M.invoices_error && "invoices (Stripe error)"].filter(Boolean);
  M.score = !enabled(env) && !enabled2(env) ? null : Math.max(0, 100 - F.reduce((x, f) => x + (weight[f.sev] || 5), 0));
  const prev = await secGet(env, "leak_scan_last").catch(() => null);
  const result = { ok: true, read_only: true, metrics: M, findings: F, previous: prev ? { at: prev.at, score: prev.metrics?.score } : null };
  if (save) {
    const who = inst.custom ? inst.business_name : "Studio Flow & Systems";
    const body = "**Leak scan for " + who + ": " + (M.score == null ? "nothing connected" : M.score + "/100") + "** (last " + days + " days, read-only)\n\n" + (F.length ? F.map((f) => "- **" + f.title + "** (" + f.sev + "). Fix: " + f.fix).join("\n") : "- No leaks found in what Command can see.") + (M.not_checked.length ? "\n\nNot checked: " + M.not_checked.join("; ") + "." : "") +
      "\n\nNumbers: " + JSON.stringify(M) + (prev ? "\n\nLast scan " + String(prev.at).slice(0, 10) + ": " + prev.metrics?.score + "/100." : "");
    const [row] = await insert(env, "team_reports", [{ department: "chief_of_staff", kind: "shift", subkind: "leak_scan", title: "Leak scan: " + (M.score == null ? "nothing connected to scan" : M.score + "/100") + (F.length ? " · " + F.length + " leak" + (F.length === 1 ? "" : "s") : ""), body }]).catch(() => []);
    result.report_id = row?.id || null;
    await secPut(env, "leak_scan_last", { at: M.at, metrics: M, findings: F });
  }
  return result;
}
// Leak Watch: re-scans on the 1st of each month (9am Brisbane) and tells the owner what changed.
async function leakWatch(env) {
  const bn = brisbaneNow();
  if (!bn.date.endsWith("-01") || bn.hour < 9 || bn.hour > 12) return { skipped: true };
  const last = await secGet(env, "leak_scan_last").catch(() => null);
  if (last && String(last.at).slice(0, 7) === new Date(Date.now() + 10 * 36e5).toISOString().slice(0, 7) && last.watch) return { skipped: true };
  const r = await leakInsideScan(env);
  await secPut(env, "leak_scan_last", { at: r.metrics.at, metrics: r.metrics, findings: r.findings, watch: true });
  const d = r.previous?.score != null ? r.metrics.score - r.previous.score : null;
  await notify(env, "🔎 <b>Leak Watch: " + r.metrics.score + "/100</b>" + (d == null ? "" : d > 0 ? " (up " + d + ")" : d < 0 ? " (down " + -d + ")" : " (no change)") + "\n" + (r.findings.length ? r.findings.map((f) => "• " + f.title.replace(/[<>&]/g, "")).join("\n") : "No leaks found this month.") + "\nFull report in Command › Reports.").catch(() => {});
  return r;
}
async function mondayReport(env, { force = false } = {}) {''')

rep('''  await mondayReport(e).catch((x) => console.error("monday report:", x.message));''', '''  await mondayReport(e).catch((x) => console.error("monday report:", x.message));
  await leakWatch(e).catch((x) => console.error("leak watch:", x.message));''')
rep('  if (p === "/monday-report" && m === "POST")', '  if (p === "/leak-scan" && m === "POST") return json(await leakInsideScan(env, { days: Math.max(7, Math.min(90, +body.days || 30)) }));\n  if (p === "/monday-report" && m === "POST")')

# a tool for the team (read-only)
rep('  propose_owner_task: {\n', '''  leak_inside_scan: {
    description: "Run a READ-ONLY leak scan of this business's own GHL and Stripe: enquiries left unanswered, typical reply time, no-shows, deals untouched for 14+ days, overdue invoices. Saves a report and returns a score out of 100. Changes nothing.",
    input_schema: { type: "object", properties: { days: { type: "integer", description: "How far back to look (7-90, default 30)." } } }
  },
  propose_owner_task: {
''')
rep('var CORE = ["get_business_snapshot",', 'var CORE = ["leak_inside_scan", "get_business_snapshot",')
rep('    case "get_business_snapshot":\n', '    case "leak_inside_scan":\n      return leakInsideScan(env, { days: Math.max(7, Math.min(90, +input.days || 30)) });\n    case "get_business_snapshot":\n')

# Performance page: run the leak scan with one button and see the last score
rep("  // v50 the AI company roster on Performance (Full Company plan)\n", "  const PF76 = VIEWS.performance;\n  VIEWS.performance = async (el) => {\n    await PF76(el);\n    if (!still('performance', el) || $('.v76-leak', el)) return;\n    const box = document.createElement('section'); box.className = 'wf-glass v76-leak';\n    box.innerHTML = '<div class=\"row sp\" style=\"gap:10px;flex-wrap:wrap\"><div><span class=\"wf-eyebrow\">LEAK SCAN</span><h3 style=\"margin:4px 0\">Where is money leaking?</h3><p class=\"mu sm\">Reads your GHL and Stripe (never changes anything): unanswered enquiries, reply time, no-shows, cold deals, overdue invoices. It re-runs by itself on the 1st of each month.</p></div><button class=\"btn sm pri\" id=\"lsRun\">Run a leak scan</button></div><div id=\"lsOut\"></div>';\n    const goal = $('.v48-goal', el); if (goal) goal.after(box); else el.prepend(box);\n    $('#lsRun', box).onclick = async (e) => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Scanning…'; try { const r = await team('/leak-scan', { method: 'POST', body: {}, long: true }); $('#lsOut', box).innerHTML = '<p style=\"margin-top:10px\"><b>' + (r.metrics.score == null ? 'Nothing to scan yet' : esc(r.metrics.score) + '/100') + '</b>' + (r.previous && r.previous.score != null ? ' <span class=\"mu sm\">(last time ' + esc(r.previous.score) + ')</span>' : '') + '</p>' + (r.findings.length ? '<ul class=\"sm\" style=\"padding-left:18px;line-height:1.7\">' + r.findings.map((f) => '<li><b>' + esc(f.title) + '.</b> <span class=\"mu\">' + esc(f.fix) + '</span></li>').join('') + '</ul>' : r.metrics.score == null ? '' : '<p class=\"mu sm\">No leaks found in what Command can see.</p>') + (r.metrics.not_checked && r.metrics.not_checked.length ? '<p class=\"mu sm\">Not checked: ' + esc(r.metrics.not_checked.join('; ')) + '.</p>' : '') + '<p class=\"mu xs\">Saved in Reports.</p>'; } catch (err) { toast(err.message, 'bad'); } b.disabled = false; b.textContent = 'Run a leak scan'; };\n  };\n  // v50 the AI company roster on Performance (Full Company plan)\n")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v76 applied')
