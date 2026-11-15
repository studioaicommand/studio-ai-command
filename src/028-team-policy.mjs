// src/team/policy.js
var INTERNAL = /* @__PURE__ */ new Set(["ghl_note", "ghl_task"]);
var NEVER_AUTO = /* @__PURE__ */ new Set(["leak_test", "ghl_email", "ghl_sms", "outreach_email", "stripe_draft_invoice", "ghl_appointment_book", "ghl_appointment_cancel", "ghl_appointment_move", "ghl_contact_archive", "ghl_contact_delete", "team_rule"]);
var URGENT = /* @__PURE__ */ new Set(["ghl_email", "ghl_sms", "stripe_draft_invoice", "ghl_appointment_cancel", "ghl_appointment_move", "ghl_contact_archive", "ghl_contact_delete"]);
var commandOn = (settings) => settings?.command?.auto !== false;
async function enrolOkForCommand(env, params) {
  if (!params?.prospect_id) return "no prospect record";
  const [p] = await select(env, "agent_prospects", `id=eq.${enc(params.prospect_id)}&select=leak_report,email,email_source_url,consent_basis,status,vertical&limit=1`).catch(() => []);
  if (!p) return "prospect not found";
  const L = p.leak_report || {};
  if (L.scan_version !== SCAN_VERSION) return "old scan";
  const callConsent = /^Given by/i.test(p.consent_basis || "");
  if (!callConsent && !L.rendered) return "scan wasn't viewed in a real browser";
  if (!callConsent && !(L.checks || []).some((c) => c.confidence === "confirmed" && c.key !== "not_mobile")) return "no confirmed finding";
  if (!outreachOn(await getSettings(env).catch(() => ({}))).includes(p.vertical)) return "industry not switched on in Growth";
  if (!p.email || !(p.email_source_url || callConsent)) return "email not verified";
  const route3 = L.packet?.route;
  if (!callConsent && route3 && route3 !== "enrol") return `routed to ${route3}`;
  const probs = claimProblems([params.subject, params.body, params.follow_up_1, params.follow_up_2], L);
  if (probs.length) return "draft " + probs[0];
  return null;
}
async function decide(env, action, { settings = null, source = "" } = {}) {
  settings = settings || await getSettings(env);
  if (!commandOn(settings)) return { route: "ask" };
  if (action.type === "owner_task") return { route: "task" };
  if (INTERNAL.has(action.type)) return { route: "auto", why: "internal note or task" };
  if (action.type === "ghl_tags") {
    const add = (action.params?.add || []).map((t) => String(t).toLowerCase()), rem = action.params?.remove || [];
    if (!rem.length && add.every((t) => ["hold-do-not-send", "outreach-opted-out", "outreach-replied", "outreach-booked"].includes(t))) return { route: "auto", why: "stop-sending or status tag" };
    return { route: "ask" };
  }
  if (action.type === "campaign_enrol") {
    const capDay = Math.max(0, Math.min(200, Number(settings?.limits?.auto_enrol_per_day ?? 25)));
    const since = new Date(Date.now() - 864e5).toISOString();
    const autoToday = await select(env, "team_actions", `type=eq.campaign_enrol&auto=is.true&created_at=gte.${since}&select=id&limit=500`).catch(() => []);
    if (autoToday.length >= capDay) return { route: "ask", why: `daily limit of ${capDay} automatic enrolments reached` };
    const why = await enrolOkForCommand(env, action.params);
    return why ? { route: "ask", why } : { route: "auto", why: "passes every outreach check" };
  }
  return { route: "ask", urgent: URGENT.has(action.type) || source === "reply_watch" };
}
async function route(env, action, opts = {}) {
  const settings = opts.settings || await getSettings(env);
  const d = await decide(env, action, { ...opts, settings });
  if (d.route === "auto" && NEVER_AUTO.has(action.type)) { d.route = "ask"; d.urgent = true; }
  if (d.route === "auto") {
    try {
      await update(env, "team_actions", `id=eq.${action.id}`, { auto: true });
      await approveAction(env, action.id);
      await audit(env, { actor: "Studio AI Command", action: "auto_approved", target_type: action.type, target_id: action.id, summary: `${action.title} (${d.why})` });
      return { done_by_command: true, why: d.why };
    } catch (e) {
      return { done_by_command: false, error: String(e.message).slice(0, 200) };
    }
  }
  if (d.route === "task" && telegramReady(env, settings)) {
    const p = action.params || {};
    await notify(env, `\u{1F4DD} <b>Task for you: ${esc2(action.title)}</b>${p.details ? "\n\n" + esc2(String(p.details).slice(0, 600)) : ""}${p.due_date ? "\n\nDue: " + esc2(p.due_date) : ""}${action.reason ? "\n\n<i>" + esc2(String(action.reason).slice(0, 300)) + "</i>" : ""}`,
      { buttons: [[{ text: "\u2705 Done", callback_data: `ap:${action.id}` }, { text: "\u2716 Not doing", callback_data: `rj:${action.id}` }]], settings }).catch(() => {});
  }
  if (d.route === "ask" && telegramReady(env, settings)) await askTy(env, action, { urgent: !!d.urgent, settings });
  return { route: d.route, why: d.why || null };
}
async function digest(env, { forTelegram = false } = {}) {
  const settings = await getSettings(env);
  const wd = (/* @__PURE__ */ new Date()).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short" });
  const weekend = wd === "Sat" || wd === "Sun";
  const [snap, mission, pending, tasks, brief, clientsLine] = await Promise.all([
    outreachSnapshot(env).catch(() => null),
    computeMission(env, settings).catch(() => null),
    select(env, "team_actions", "status=eq.pending&type=neq.owner_task&select=id,title&order=created_at.asc&limit=50").catch(() => []),
    select(env, "team_actions", "status=eq.pending&type=eq.owner_task&select=id,title,department,created_at&order=created_at.asc&limit=30").catch(() => []),
    select(env, "team_reports", "kind=eq.briefing&order=created_at.desc&limit=1&select=body").catch(() => []),
    clientsDigest(env).catch(() => null)
  ]);
  const h = (brief[0]?.body.match(/Headline:?\*{0,2}:?\s*([^\n]+)/i)?.[1] || "").replace(/\*/g, "").slice(0, 300);
  const t = snap?.today || {}, w = snap?.week || {};
  const calls = (snap?.top_calls || []).slice(0, 5).map((c, i) => `${i + 1}. ${c.name}${c.demo ? " (demo ready: offer to send the link)" : ""}${c.phone_only ? " (ask for their email)" : ""} ${c.phone || ""}`);
  const L = [
    `<b>Good morning, Ty.</b>${weekend ? " It's the weekend: no calls today." : h ? " " + h : ""}`,
    mission?.connected ? `\u{1F4B0} ${fmt(mission.revenue_month_to_date)} of ${fmt(mission.target)} this month \xB7 need ~${fmt(mission.needed_per_remaining_day)}/day` : "",
    `\u{1F4C8} Yesterday\u2192today: ${t.analysed ?? 0} researched \xB7 ${t.enrolled ?? 0} emailed \xB7 ${t.replies ?? 0} replies \xB7 ${t.booked ?? 0} booked`,
    snap?.demos?.built ? `\u{1F916} Demos: ${snap.demos.built} built \xB7 ${snap.demos.opened} opened \xB7 ${snap.demos.chatted} tried it${snap.demos.hot.length ? `
\u{1F525} Tried their demo lately: ${snap.demos.hot.join(", ")}: call them first` : ""}` : "",
    snap?.email?.connected ? `\u2709\uFE0F Email opens (7 days): ${snap.email.opened} people opened \xB7 ${snap.email.clicked} clicked \xB7 ${snap.email.bounced} bounced \xB7 ${snap.email.unsubscribed + snap.email.complained} unsubscribed` : "",
    clientsLine || "",
    weekend ? calls.length ? `\u{1F4DE} Monday's call list is ready (${(snap?.top_calls || []).length >= 5 ? "5+" : calls.length} to start with). Enjoy your weekend.` : "" : calls.length ? `\u{1F4DE} <b>Call first</b>
${calls.join("\n")}` : "\u{1F4DE} No calls queued: I'll run a clinic hunt.",
    pending.length ? `\u2705 ${pending.length} waiting for your yes: /approvals` : "\u2705 Nothing waiting for your yes.",
    tasks.length ? `\u{1F4DD} Your tasks:
${dedupeTasks(tasks).slice(0, 6).map((x) => "\u2022 " + x).join("\n")}` : "",
    (snap?.compliance_flags || []).length ? `\u26A0\uFE0F ${snap.compliance_flags.slice(0, 3).join("\n\u26A0\uFE0F ")}` : ""
  ].filter(Boolean).join("\n\n");
  return forTelegram ? { text: L, parse_mode: "HTML", disable_web_page_preview: true } : L;
}
var fmt = (n) => "$" + Math.round(+n || 0).toLocaleString("en-AU");
function dedupeTasks(tasks) {
  const calls = tasks.filter((x) => /^call\b/i.test(x.title));
  const other = tasks.filter((x) => !/^call\b/i.test(x.title)).map((x) => x.title);
  return [...calls.length ? [`${calls.length} calls (they're in Calls today, best first)`] : [], ...other];
}
async function cronNotify(env) {
  const settings = await getSettings(env);
  if (!telegramReady(env, settings)) return;
  const st = settings.notify_state || {};
  const t = brisbaneNow();
  const next = { ...st };
  if (t.hour >= 7 && st.digest_date !== t.date) {
    const text = await digest(env);
    const r = await notify(env, text, { urgent: true, settings });
    if (r.sent) next.digest_date = t.date;
  }
  try {
    const seen = new Set(st.seen_events || []);
    const fresh = [];
    for (const cal of env.GHL_CALENDAR_ID ? [{ id: env.GHL_CALENDAR_ID, name: "Calendar" }] : CALENDARS) {
      const d = await listEvents(env, Date.now() - 36e5, Date.now() + 21 * 864e5, cal.id).catch(() => null);
      for (const e of d?.events || []) if (!seen.has(e.id)) {
        fresh.push({ ...e, cal: cal.name });
        seen.add(e.id);
      }
    }
    if (st.seen_events && fresh.length) {
      for (const e of fresh.slice(0, 5)) await notify(env, `\u{1F4C5} <b>New booking: ${e.title || "a call"}</b>
${e.cal} \xB7 ${new Date(e.startTime).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
I'll prep a call brief before it starts.`, { urgent: true, settings });
    }
    next.seen_events = [...seen].slice(-300);
  } catch (e) {
    console.error("booking watch:", e.message);
  }
  try {
    Object.assign(next, await paymentWatch(env, stripe_exports, next));
  } catch (e) {
    console.error("payment watch:", e.message);
  }
  if (JSON.stringify(next) !== JSON.stringify(st)) await saveSetting(env, "notify_state", next);
}

