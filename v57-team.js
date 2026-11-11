// ── v57: instant Telegram approvals, one daily email number, approved-but-held emails send themselves. ──
var tgQuick = (env, method, payload) => env.TELEGRAM_BOT_TOKEN ? fetch(API2(env, method), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload || {}), signal: AbortSignal.timeout(8e3) }).then((r) => r.json()).catch(() => null) : Promise.resolve(null);
async function enrolCap(env, c) {
  const od = await outCfg(env).catch(() => null);
  return Math.max(+c.daily_cap || 25, od ? outCapacity(od) : 0);
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
