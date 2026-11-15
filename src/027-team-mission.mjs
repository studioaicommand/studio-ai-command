// src/team/mission.js
var BNE = 10 * 3600;
function monthBounds(nowMs = Date.now()) {
  const b = new Date(nowMs + BNE * 1e3);
  const y = b.getUTCFullYear(), m = b.getUTCMonth();
  const start = Date.UTC(y, m, 1) / 1e3 - BNE;
  const prevStart = Date.UTC(y, m - 1, 1) / 1e3 - BNE;
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dayOfMonth = b.getUTCDate();
  const monthName = b.toLocaleString("en-AU", { month: "long", timeZone: "UTC" });
  return { start, prevStart, now: Math.floor(nowMs / 1e3), daysInMonth, dayOfMonth, monthName };
}
var net = (charges) => charges.filter((c) => c.paid && c.status === "succeeded").reduce((s, c) => s + c.amount - (c.amount_refunded || 0), 0) / 100;
async function computeMission(env, settings) {
  const target = Number(settings?.mission?.target_monthly_aud) || 2e4;
  const mb = monthBounds();
  const out = { target, month: mb.monthName, day_of_month: mb.dayOfMonth, days_in_month: mb.daysInMonth, currency: "AUD" };
  if (!enabled2(env)) return { ...out, connected: false, note: "Stripe isn't connected, so revenue can't be measured." };
  const [cur, prev] = await Promise.all([
    listCharges(env, mb.start, mb.now),
    listCharges(env, mb.prevStart, mb.start)
  ]);
  const mtd = Math.round(net(cur) * 100) / 100;
  const lastMonth = Math.round(net(prev) * 100) / 100;
  const daysLeft = mb.daysInMonth - mb.dayOfMonth;
  const projected = Math.round(mtd / Math.max(1, mb.dayOfMonth) * mb.daysInMonth);
  Object.assign(out, {
    connected: true,
    revenue_month_to_date: mtd,
    revenue_last_month: lastMonth,
    percent_of_target: Math.round(mtd / target * 1e3) / 10,
    projected_this_month: projected,
    gap_to_target: Math.max(0, Math.round(target - mtd)),
    days_left: daysLeft,
    needed_per_remaining_day: daysLeft > 0 ? Math.max(0, Math.round((target - mtd) / daysLeft)) : null,
    payments_this_month: cur.filter((c) => c.paid && c.status === "succeeded").length
  });
  if (enabled(env)) {
    try {
      const d = await searchOpportunities(env, { status: "open", limit: 100 });
      const opps = d.opportunities || [];
      out.open_pipeline = { count: d.meta?.total ?? opps.length, value: opps.reduce((s, o) => s + (Number(o.monetaryValue) || 0), 0) };
    } catch {
    }
  }
  return out;
}

