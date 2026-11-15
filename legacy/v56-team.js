// v56: GHL email events (opened / clicked / bounced / unsubscribed / complained), pushed in by the GHL workflow
// "SF | Command | Email Events -> Command" to the inbox webhook with customData.event = "email_<event>".
// Stored as daily counts in team_settings.email_stats (unique per contact per day, 60 days). GHL has no "delivered" event.
var EMAIL_EVENTS = ["delivered", "opened", "clicked", "bounced", "unsubscribed", "complained"];
function emailEvName(body) {
  const raw = String(body.event || body.customData?.event || "").toLowerCase().trim();
  if (!/^email[\s_-]/.test(raw)) return null;
  const e = raw.replace(/^email[\s_-]*/, "");
  return EMAIL_EVENTS.find((x) => e.startsWith(x.slice(0, 5))) || null;
}
async function emailStatsGet(env) {
  const r = await select(env, "team_settings", "key=eq.email_stats&select=value&limit=1").catch(() => []);
  const v = r?.[0]?.value;
  return v && typeof v === "object" ? v : { days: {}, recent: [], seen: {} };
}
async function emailEventRecord(env, body, ev) {
  const cid = body.contact_id || body.contactId || body.contact?.id || body.customData?.contact_id || null;
  const day = new Date(Date.now() + 10 * 36e5).toISOString().slice(0, 10);
  const s = await emailStatsGet(env);
  s.days = s.days && typeof s.days === "object" ? s.days : {};
  s.recent = Array.isArray(s.recent) ? s.recent : [];
  s.seen = s.seen && typeof s.seen === "object" ? s.seen : {};
  const d = s.days[day] = s.days[day] || {};
  const k = day + "|" + ev + "|" + (cid || "?");
  const unique = !s.seen[k];
  if (unique) { s.seen[k] = 1; d[ev] = (d[ev] || 0) + 1; }
  d[ev + "_total"] = (d[ev + "_total"] || 0) + 1;
  const keep = Object.keys(s.days).sort().slice(-60);
  s.days = Object.fromEntries(keep.map((x) => [x, s.days[x]]));
  const keepSet = new Set(keep);
  s.seen = Object.fromEntries(Object.keys(s.seen).filter((x) => keepSet.has(x.slice(0, 10))).slice(-3000).map((x) => [x, 1]));
  const name = String(body.full_name || [body.first_name, body.last_name].filter(Boolean).join(" ") || "").slice(0, 60);
  s.recent = [{ at: (/* @__PURE__ */ new Date()).toISOString(), event: ev, contact_id: cid, name, email: String(body.email || "").slice(0, 80), company: String(body.company_name || body.companyName || "").slice(0, 80), campaign: String(body.customData?.campaign || body.workflow?.name || "").slice(0, 80) }, ...s.recent].slice(0, 80);
  s.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  await saveSetting(env, "email_stats", s);
  let tagged = null;
  if (cid && (ev === "unsubscribed" || ev === "complained")) { await addTags(env, cid, ["outreach-opted-out"]).catch(() => {}); tagged = "outreach-opted-out"; }
  if (cid && ev === "bounced") { await addTags(env, cid, ["email-bounced", "hold-do-not-send"]).catch(() => {}); tagged = "email-bounced"; }
  return { email_event: ev, contact: cid, unique, tagged };
}
async function emailStatsSummary(env, days = 7) {
  const s = await emailStatsGet(env);
  const now = new Date(Date.now() + 10 * 36e5);
  const want = new Set([...Array(days)].map((_, i) => new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10)));
  const sum = {};
  for (const [day, v] of Object.entries(s.days || {})) if (want.has(day)) for (const e of EMAIL_EVENTS) sum[e] = (sum[e] || 0) + (v[e] || 0);
  const today = (s.days || {})[now.toISOString().slice(0, 10)] || {};
  return { connected: !!s.updated_at, last_event_at: s.updated_at || null, days, ...Object.fromEntries(EMAIL_EVENTS.map((e) => [e, sum[e] || 0])), today: Object.fromEntries(EMAIL_EVENTS.map((e) => [e, today[e] || 0])), recent: (s.recent || []).slice(0, 10), note: "From GHL email events for workflow/campaign emails: unique people per day. GHL does not send delivered events, so compare opens with the number emailed. Apple Mail can over-report opens." };
}
