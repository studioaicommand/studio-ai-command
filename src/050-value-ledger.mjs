// v149 Value ledger: what Command did for the business, in dollars, against what it costs.
// Counts only work Command finished (bookings it made, calls the Phone AI answered, replies, follow-ups, review
// requests, admin) and, for Studio, outreach work. Bookings are valued at what a new customer is worth for the trade
// (the owner can change it); everything else is counted as staff time saved at an hourly rate. Every figure says it's
// an estimate. Client copies show their Command plan as the cost; Studio's own Command shows its AI and phone spend.
var VALUE_TRADE = { allied_health: "allied", dental: "dental", aesthetics_beauty: "beauty", property_management: "property", trades: "trades", childcare_education: "other", fitness_wellness: "fitness", professional_services: "accounting", hospitality: "hospitality", other: "other" };
var VALUE_HOURLY = 38;
// Minutes a person would have spent on each kind of work. Shown on the ledger as "how we count".
var VALUE_KINDS = {
  booking: { label: "Bookings made by Command", min: 5 },
  call: { label: "Calls answered by the Phone AI", min: 3 },
  reply: { label: "Enquiries and messages answered", min: 6 },
  followup: { label: "Follow-ups sent", min: 4 },
  review: { label: "Review requests sent", min: 4 },
  admin: { label: "Admin done (notes, tags, tasks, moved bookings)", min: 2 },
  outreach: { label: "Outreach emails and DMs sent", min: 8 },
  demo: { label: "Website demos built", min: 45 },
  owner: { label: "Owner names found before calls", min: 10 }
};
var VALUE_TYPE = { ghl_appointment_book: "booking", ghl_reply: "reply", ghl_sms: "reply", ghl_email: "reply", dm_reply: "reply", ghl_followup: "followup", campaign_enrol: "outreach", ghl_note: "admin", ghl_tags: "admin", ghl_task: "admin", ghl_appointment_move: "admin", ghl_appointment_cancel: "admin", ghl_contact_archive: "admin", ghl_opportunity_status: "admin", outreach_email: "outreach" };
function valueMonth(offset = 0, when = new Date()) {
  const b = new Date(when.getTime() + 10 * 36e5);
  const s = Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + offset, 1) - 10 * 36e5, e = Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + offset + 1, 1) - 10 * 36e5;
  return { from: new Date(s).toISOString(), to: new Date(Math.min(e, when.getTime())).toISOString(), end: new Date(e).toISOString(), label: new Date(s + 10 * 36e5).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }) };
}
function valueAfterHours(iso) { const d = new Date(Date.parse(iso) + 10 * 36e5), h = d.getUTCHours(), w = d.getUTCDay(); return w === 0 || w === 6 || h < 8 || h >= 18; }
async function valueConfig(env) {
  const inst = await instGet(env).catch(() => ({})) || {}, custom = !!inst.custom;
  const st = (await select(env, "team_settings", "key=eq.value_ledger&select=value&limit=1").catch(() => []))?.[0]?.value || {};
  const plan = custom ? (await secGet(env, "plan_tier").catch(() => null)) || {} : {};
  const v = VALUE[VALUE_TRADE[inst.template] || "other"] || VALUE.other;
  const per = +st.per_booking > 0 ? +st.per_booking : custom ? v.value : 0;
  const planAud = +plan.plan_aud > 0 ? +plan.plan_aud : +st.plan_aud > 0 ? +st.plan_aud : 0;
  return {
    custom, business: inst.business_name || "Studio Flow & Systems",
    per_booking: per, per_booking_source: +st.per_booking > 0 ? "you" : per ? "trade" : "unset", booking_unit: custom ? v.unit : "booked sales call",
    hourly_rate: +st.hourly_rate > 0 ? +st.hourly_rate : VALUE_HOURLY, hourly_source: +st.hourly_rate > 0 ? "you" : "default",
    plan_aud: planAud, plan_source: +plan.plan_aud > 0 ? "studio" : +st.plan_aud > 0 ? "you" : "unset"
  };
}
async function valueLedger(env, { offset = 0, events = true, when } = {}) {
  const cfg = await valueConfig(env), P = valueMonth(offset, when || new Date());
  const f = encodeURIComponent(P.from), t = encodeURIComponent(P.end);
  const [acts, calls, use, demos, ow, dq] = await Promise.all([
    select(env, "team_actions", "status=eq.done&decided_at=gte." + f + "&decided_at=lt." + t + "&select=id,type,title,params,auto,decided_at,created_at&order=decided_at.desc&limit=10000").catch(() => []),
    select(env, "studio_command_records", "source=eq.call&external_key=like.voiceai*&occurred_at=gte." + f + "&occurred_at=lt." + t + "&select=occurred_at,metadata&order=occurred_at.desc&limit=5000").catch(() => []),
    cfg.custom ? Promise.resolve([]) : select(env, "team_usage", "created_at=gte." + f + "&created_at=lt." + t + "&select=cost_aud&limit=20000").catch(() => []),
    cfg.custom ? Promise.resolve([]) : select(env, "agent_demos", "created_at=gte." + f + "&created_at=lt." + t + "&select=business_name,created_at&limit=5000").catch(() => []),
    cfg.custom ? Promise.resolve({}) : select(env, "team_settings", "key=eq.owner_find&select=value&limit=1").then((r) => r?.[0]?.value || {}).catch(() => ({})),
    cfg.custom ? Promise.resolve({ items: [] }) : secGet(env, "dm_queue").catch(() => null)
  ]);
  const n = Object.fromEntries(Object.keys(VALUE_KINDS).map((k) => [k, 0]));
  const ev = [];
  let after = 0, answered = 0, callMin = 0;
  const inP = (iso) => iso && iso >= P.from && iso < P.end;
  for (const a of acts) {
    let k = VALUE_TYPE[a.type];
    if (!k) continue;
    if (k === "followup" && a.params && a.params.kind === "review") k = "review";
    n[k]++;
    if (k === "reply") { answered++; if (valueAfterHours(a.created_at || a.decided_at)) after++; }
    if (k === "booking") ev.push({ at: a.decided_at, kind: k, text: String(a.title || "Booking made").slice(0, 120), value: cfg.per_booking });
    else if (events && ev.length < 60) ev.push({ at: a.decided_at, kind: k, text: String(a.title || a.type).slice(0, 120), value: 0 });
  }
  for (const c of calls) {
    const m = c.metadata || {};
    n.call++; answered++; callMin += (+m.duration_sec || 0) / 60;
    if (valueAfterHours(c.occurred_at)) after++;
    if (m.booked) { n.booking++; ev.push({ at: c.occurred_at, kind: "booking", text: "Phone AI booked " + String(m.who || "a caller").slice(0, 60), value: cfg.per_booking }); }
    else if (events && ev.length < 60) ev.push({ at: c.occurred_at, kind: "call", text: "Phone AI took a call from " + String(m.who || "a caller").slice(0, 60), value: 0 });
  }
  if (!cfg.custom) {
    n.demo = demos.length;
    n.owner = Object.values(ow.found || {}).filter((x) => inP(x.at)).length;
    n.outreach += (Array.isArray(dq?.items) ? dq.items : []).filter((x) => x.status === "sent" && inP(x.sent_at)).length;
  }
  const lines = Object.entries(VALUE_KINDS).filter(([k]) => n[k] > 0 && (cfg.custom ? !["outreach", "demo", "owner"].includes(k) : true)).map(([k, d]) => {
    const minutes = k === "call" ? Math.round(callMin + n.call * d.min) : n[k] * d.min;
    return { key: k, label: d.label, count: n[k], minutes, minutes_each: d.min, booking_value: k === "booking" ? n[k] * cfg.per_booking : 0 };
  });
  const minutes = lines.reduce((s, l) => s + l.minutes, 0), hours = Math.round(minutes / 6) / 10;
  const bookingValue = n.booking * cfg.per_booking, timeValue = Math.round(minutes / 60 * cfg.hourly_rate);
  const ai = Math.round(use.reduce((s, r) => s + (+r.cost_aud || 0), 0) * 100) / 100;
  const days = Math.max(1, (Date.parse(P.end) - Date.parse(P.from)) / 864e5), ran = Math.max(1, (Date.parse(P.to) - Date.parse(P.from)) / 864e5);
  const plan = cfg.plan_aud ? Math.round(cfg.plan_aud * (offset === 0 ? Math.min(1, ran / days) : 1) * 100) / 100 : 0;
  const cost = Math.round((plan + ai) * 100) / 100, total = bookingValue + timeValue;
  ev.sort((a, b) => (b.value - a.value) || (Date.parse(b.at) - Date.parse(a.at)));
  return {
    ok: true, period: { label: P.label, from: P.from, to: P.to, month_to_date: offset === 0 },
    business: cfg.business, custom: cfg.custom,
    settings: { per_booking: cfg.per_booking, per_booking_source: cfg.per_booking_source, booking_unit: cfg.booking_unit, hourly_rate: cfg.hourly_rate, hourly_source: cfg.hourly_source, plan_aud: cfg.plan_aud, plan_source: cfg.plan_source },
    bookings: n.booking, booking_value: bookingValue, hours_saved: hours, time_value: timeValue, total_value: total,
    answered, after_hours: after,
    cost: { plan_aud: plan, ai_aud: cfg.custom ? null : ai, total: cost, note: cfg.custom ? (cfg.plan_aud ? "Your Command plan" + (offset === 0 && ran < days ? ", so far this month" : "") : "Add what Command costs you to see your return") : "AI and phone spend" + (plan ? " plus your other tools" : "") },
    roi: cost > 0 ? Math.round(total / cost * 10) / 10 : null,
    lines, events: events ? ev.slice(0, 12) : undefined
  };
}
// Short version for Home, the Monday report, the fleet console and Studio AI.
async function valueSummary(env) {
  const [m, l] = await Promise.all([valueLedger(env, { events: false }), valueLedger(env, { offset: -1, events: false })]);
  return { month: m.period.label, total: m.total_value, bookings: m.bookings, booking_value: m.booking_value, hours: m.hours_saved, time_value: m.time_value, cost: m.cost.total, roi: m.roi, after_hours: m.after_hours, answered: m.answered, per_booking: m.settings.per_booking, set_up: m.settings.per_booking > 0, last_month: { label: l.period.label, total: l.total_value, cost: l.cost.total, roi: l.roi } };
}
function valueLine(v) {
  if (!v || (!v.total && !v.bookings && !v.hours)) return "";
  const money = (x) => "$" + Math.round(x || 0).toLocaleString("en-AU");
  return "Command's work this month is worth about " + money(v.total) + " (" + (v.bookings ? v.bookings + " booking" + (v.bookings === 1 ? "" : "s") + (v.per_booking ? " worth " + money(v.booking_value) : "") + ", " : "") + v.hours + " hours of staff time)" + (v.cost ? " against " + money(v.cost) + " cost" + (v.roi ? ", about " + v.roi + "x" : "") : "") + ". Estimate.";
}
// The 1st of the month: last month's ledger as a report, and a Telegram message to the owner.
async function valueMonthly(env, { force = false } = {}) {
  const bn = brisbaneNow();
  if (!force && (bn.date.slice(8) !== "01" || bn.hour < 8)) return CRON_NOT_DUE;
  const st = (await select(env, "team_settings", "key=eq.value_ledger&select=value&limit=1").catch(() => []))?.[0]?.value || {};
  const L = await valueLedger(env, { offset: -1 });
  if (!force && st.sent === L.period.label) return CRON_NOT_DUE;
  const money = (x) => "$" + Math.round(x || 0).toLocaleString("en-AU");
  if (!L.total_value && !L.lines.length) { await saveSetting(env, "value_ledger", { ...st, sent: L.period.label }).catch(() => {}); return { ok: true, empty: true }; }
  const rows = L.lines.map((l) => "• " + l.label + ": " + l.count + (l.booking_value ? " (" + money(l.booking_value) + ")" : ""));
  const text = "<b>What Command did for you in " + L.period.label + "</b>\n\n" + "💰 Worth about <b>" + money(L.total_value) + "</b>" + (L.cost.total ? " · cost " + money(L.cost.total) + (L.roi ? " · <b>" + L.roi + "x</b> return" : "") : "") + "\n" + (L.bookings ? "📅 " + L.bookings + " booking" + (L.bookings === 1 ? "" : "s") + " at " + money(L.settings.per_booking) + " each = " + money(L.booking_value) + "\n" : "") + "⏱ " + L.hours_saved + " hours of staff time saved (" + money(L.time_value) + " at " + money(L.settings.hourly_rate) + "/hr)\n" + (L.after_hours ? "🌙 " + L.after_hours + " enquiries answered after hours or on weekends\n" : "") + "\n" + rows.join("\n") + "\n\nThese are estimates from what Command actually did. Change the values in Command › Value.";
  const [row] = await insert(env, "team_reports", [{ department: "chief_of_staff", kind: "shift", subkind: "value_report", title: "Value report · " + L.period.label, body: text.replace(/<\/?b>/g, "**") }]).catch(() => []);
  await notify(env, text).catch(() => {});
  await saveSetting(env, "value_ledger", { ...st, sent: L.period.label, report_id: row?.id || null });
  return { ok: true, report_id: row?.id || null };
}
async function valueRoute(p, m, body, env) {
  if (p === "/value" && m === "GET") return json(await valueLedger(env, { offset: body.month === "last" ? -1 : 0 }));
  if (p === "/value/settings" && m === "POST") {
    const st = (await select(env, "team_settings", "key=eq.value_ledger&select=value&limit=1").catch(() => []))?.[0]?.value || {};
    const num = (x, max) => { const t = String(x ?? "").replace(/[^0-9.]/g, ""); if (!/\d/.test(t)) return null; const v = Number(t); return v >= 0 && v <= max ? Math.round(v * 100) / 100 : null; };
    const next = { ...st };
    for (const [k, max] of [["per_booking", 1e6], ["hourly_rate", 1000], ["plan_aud", 1e5]]) if (body[k] != null && body[k] !== "") { const v = num(body[k], max); if (v == null) return json({ ok: false, error: "Enter a dollar amount." }, 400); next[k] = v; }
    await saveSetting(env, "value_ledger", next);
    await audit(env, { actor: "owner", action: "value_settings", target_type: "settings", target_id: "value_ledger", summary: "Value ledger: $" + (next.per_booking || "trade default") + " per booking, $" + (next.hourly_rate || VALUE_HOURLY) + "/hr" + (next.plan_aud ? ", plan $" + next.plan_aud : "") }).catch(() => {});
    return json({ ok: true, ledger: await valueLedger(env) });
  }
  if (p === "/value/report" && m === "POST") return json(await valueMonthly(env, { force: true }));
  return null;
}
