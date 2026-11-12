// ── v62: monthly profit & loss. Income = Stripe (read-only key) + money Ty adds by hand. Costs = Anthropic (exact from the
// Admin key, otherwise estimated), OpenAI (exact with OPENAI_ADMIN_KEY, otherwise estimated), plus Ty's fixed monthly costs.
// AI spend is also broken down by area (outreach & demos, assistant & team, phone & voice) with cost per email sent. ──
var MONEY_AREAS = [["Outreach & demos", /outreach|prospect|hunt|no_website|rescan|call_demo|website_lead|website_demo|demo_|reply_watch|lead_find|scout/], ["Phone & voice", /voice|call|phone/], ["Assistant & team", /.*/]];
function moneyRange(month) {
  const m = /^\d{4}-\d{2}$/.test(String(month || "")) ? month : new Date().toISOString().slice(0, 7);
  const start = new Date(m + "-01T00:00:00Z"), end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
  return { month: m, start, end };
}
async function moneyCfg(env) { const v = await secGet(env, "money").catch(() => null); return { fixed: Array.isArray(v?.fixed) ? v.fixed : [], income: Array.isArray(v?.income) ? v.income : [], fx: +v?.fx > 0.5 && +v?.fx < 3 ? +v.fx : 1.53 }; }
async function moneyAnthropic(env, start, end) {
  if (!env.ANTHROPIC_ADMIN_KEY) return null;
  let cents = 0, page = null;
  for (let i = 0; i < 4; i++) {
    const qs = new URLSearchParams({ starting_at: start.toISOString(), ending_at: (end < new Date() ? end : new Date()).toISOString(), limit: "31" });
    if (page) qs.set("page", page);
    const r = await fetch("https://api.anthropic.com/v1/organizations/cost_report?" + qs, { headers: { "x-api-key": env.ANTHROPIC_ADMIN_KEY, "anthropic-version": "2023-06-01" }, signal: AbortSignal.timeout(15e3) });
    if (!r.ok) throw new Error("Anthropic cost report " + r.status);
    const d = await r.json();
    for (const b of d.data || []) for (const x of b.results || []) cents += Number(x.amount) || 0;
    if (!d.has_more || !d.next_page) break; page = d.next_page;
  }
  return Math.round(cents) / 100;
}
async function moneyOpenAI(env, start, end) {
  if (!env.OPENAI_ADMIN_KEY) return null;
  let usd = 0, page = null;
  for (let i = 0; i < 4; i++) {
    const qs = new URLSearchParams({ start_time: String(Math.floor(start / 1000)), end_time: String(Math.floor(Math.min(+end, Date.now()) / 1000)), bucket_width: "1d", limit: "31" });
    if (page) qs.set("page", page);
    const r = await fetch("https://api.openai.com/v1/organization/costs?" + qs, { headers: { Authorization: "Bearer " + env.OPENAI_ADMIN_KEY }, signal: AbortSignal.timeout(15e3) });
    if (!r.ok) throw new Error("OpenAI costs " + r.status);
    const d = await r.json();
    for (const b of d.data || []) for (const x of b.results || []) usd += Number(x.amount?.value) || 0;
    if (!d.has_more || !d.next_page) break; page = d.next_page;
  }
  return Math.round(usd * 100) / 100;
}
async function moneyStripe(env, start, end) {
  const key = env.STRIPE_READ_KEY;
  if (!key) return null;
  let aud = 0, n = 0, other = 0, after = null;
  for (let i = 0; i < 6; i++) {
    const qs = new URLSearchParams({ limit: "100", "created[gte]": String(Math.floor(start / 1000)), "created[lt]": String(Math.floor(end / 1000)) });
    if (after) qs.set("starting_after", after);
    const r = await fetch("https://api.stripe.com/v1/charges?" + qs, { headers: { Authorization: "Bearer " + key }, signal: AbortSignal.timeout(15e3) });
    if (!r.ok) throw new Error("Stripe " + r.status);
    const d = await r.json();
    for (const c of d.data || []) { if (c.status !== "succeeded" || !c.paid) continue; if (String(c.currency).toLowerCase() !== "aud") { other++; continue; } aud += (c.amount - (c.amount_refunded || 0)) / 100; n++; }
    if (!d.has_more || !d.data?.length) break; after = d.data[d.data.length - 1].id;
  }
  return { aud: Math.round(aud * 100) / 100, payments: n, other_currency: other };
}
async function moneyReport(env, month) {
  const { month: m, start, end } = moneyRange(month);
  const cfg = await moneyCfg(env);
  const usage = await select(env, "team_usage", `created_at=gte.${encodeURIComponent(start.toISOString())}&created_at=lt.${encodeURIComponent(end.toISOString())}&select=source,model,calls,cost_aud,cost_usd,enrols&limit=20000`).catch(() => []);
  const areas = Object.fromEntries(MONEY_AREAS.map(([n]) => [n, 0])); let estAnthropic = 0, estOpenAI = 0, enrols = 0;
  for (const r of usage) {
    const aud = +r.cost_aud || 0, src = String(r.source || ""), model = String(r.model || "");
    const area = MONEY_AREAS.find(([, re]) => re.test(src))[0]; areas[area] += aud;
    if (/gpt|openai|realtime|whisper|tts|image/i.test(model) || /demo_images|voice_ai/.test(src)) estOpenAI += aud; else if (!/^free_ai/.test(src)) estAnthropic += aud;
    enrols += +r.enrols || 0;
  }
  const out = { ok: true, month: m, fx: cfg.fx, notes: [] };
  const [an, oa, st] = await Promise.all([moneyAnthropic(env, start, end).catch((e) => { out.notes.push(e.message); return null; }), moneyOpenAI(env, start, end).catch((e) => { out.notes.push(e.message); return null; }), moneyStripe(env, start, end).catch((e) => { out.notes.push(e.message); return null; })]);
  const manual = cfg.income.filter((x) => String(x.date || "").slice(0, 7) === m);
  const income = { stripe: st ? st.aud : null, stripe_payments: st ? st.payments : 0, manual: manual.reduce((a, x) => a + (+x.aud || 0), 0), manual_items: manual };
  income.total = Math.round(((income.stripe || 0) + income.manual) * 100) / 100;
  const anthropic = an != null ? { aud: +(an * cfg.fx).toFixed(2), usd: an, exact: true } : { aud: +estAnthropic.toFixed(2), exact: false };
  const openai = oa != null ? { aud: +(oa * cfg.fx).toFixed(2), usd: oa, exact: true } : { aud: +estOpenAI.toFixed(2), exact: false };
  const fixed = cfg.fixed.reduce((a, x) => a + (+x.aud || 0), 0);
  const estTotal = Object.values(areas).reduce((a, b) => a + b, 0) || 1, aiTotal = anthropic.aud + openai.aud;
  const byArea = Object.fromEntries(Object.entries(areas).map(([k, v]) => [k, +((v / estTotal) * aiTotal).toFixed(2)]));
  const costs = { anthropic, openai, ai_total: +aiTotal.toFixed(2), fixed: +fixed.toFixed(2), fixed_items: cfg.fixed, total: +(aiTotal + fixed).toFixed(2), by_area: byArea };
  const outreach = byArea["Outreach & demos"] || 0;
  out.income = income; out.costs = costs; out.profit = +(income.total - costs.total).toFixed(2);
  out.margin = income.total > 0 ? Math.round(out.profit / income.total * 100) : null;
  out.outreach = { aud: outreach, emails_sent: enrols, per_email: enrols ? +(outreach / enrols).toFixed(2) : null };
  out.sources = { stripe: !!env.STRIPE_READ_KEY, anthropic_exact: !!env.ANTHROPIC_ADMIN_KEY, openai_exact: !!env.OPENAI_ADMIN_KEY };
  return out;
}
async function v62Route(p, m, body, env, url) {
  const J = (o, st = 200) => json(o, st);
  if (p === "/money" && m === "GET") return J(await moneyReport(env, url.searchParams.get("month")));
  if (p === "/money" && m === "POST") {
    const cfg = await moneyCfg(env);
    if (Array.isArray(body.fixed)) cfg.fixed = body.fixed.map((x) => ({ name: String(x.name || "").trim().slice(0, 60), aud: Math.round((+x.aud || 0) * 100) / 100 })).filter((x) => x.name && x.aud > 0 && x.aud < 1e5).slice(0, 40);
    if (body.income && String(body.income.name || "").trim() && +body.income.aud > 0) cfg.income.unshift({ id: Math.random().toString(36).slice(2, 9), name: String(body.income.name).trim().slice(0, 80), aud: Math.round(+body.income.aud * 100) / 100, date: /^\d{4}-\d{2}-\d{2}$/.test(body.income.date || "") ? body.income.date : new Date().toISOString().slice(0, 10) });
    if (body.remove_income) cfg.income = cfg.income.filter((x) => x.id !== body.remove_income);
    if (+body.fx > 0.5 && +body.fx < 3) cfg.fx = +body.fx;
    cfg.income = cfg.income.slice(0, 500);
    await secPut(env, "money", cfg);
    return J({ ok: true });
  }
  return null;
}
