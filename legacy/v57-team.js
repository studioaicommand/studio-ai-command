// ── v57: instant Telegram approvals, one daily email number, approved-but-held emails send themselves. ──
var tgQuick = (env, method, payload) => env.TELEGRAM_BOT_TOKEN ? fetch(API2(env, method), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload || {}), signal: AbortSignal.timeout(8e3) }).then((r) => r.json()).catch(() => null) : Promise.resolve(null);
// Each sending domain sends up to per_domain_cap emails a day (default 40). Outreach sends only from the outreach domain (ty@outreach.studioflowandsystems.com).
var SENDING_DOMAINS_DEFAULT = ["outreach.studioflowandsystems.com"]; // outreach only; client mail stays on mail.studioflowandsystems.com
function sendingPlan(c) {
  const domains = Array.isArray(c?.sending_domains) && c.sending_domains.length ? c.sending_domains : SENDING_DOMAINS_DEFAULT;
  const per = Math.max(5, Math.min(100, Math.round(+c?.per_domain_cap || 40)));
  return { domains, per, total: per * domains.length };
}
async function enrolCap(env, c) {
  const od = await outCfg(env).catch(() => null);
  return Math.max(sendingPlan(c).total, od ? outCapacity(od) : 0);
}
// Ty approved these, they were only held by the daily limit: send them as room frees up (7am to 7pm Brisbane).
async function heldApprovedTick(env, { force = false } = {}) {
  const h = brisbaneNow().hour;
  if (!force && (h < 7 || h >= 19)) return { skipped: "outside 7am to 7pm" };
  const rows = await select(env, "team_actions", "status=eq.pending&type=eq.campaign_enrol&select=id,result,created_at&order=created_at.asc&limit=200").catch(() => []);
  const ready = rows.filter((r) => r.result && r.result.approved && r.result.held);
  let sent = 0;
  for (const r of ready.slice(0, 12)) {
    try { await approveAction(env, r.id); sent++; }
    catch (e) { if (/Daily enrolment limit|isn't ready|sending/i.test(e.message)) break; }
  }
  return { sent, waiting: ready.length - sent };
}
