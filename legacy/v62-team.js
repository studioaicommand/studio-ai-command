// ── v62: the Money page counts ALL AI spend, exactly when possible. Claude from Anthropic's bill (ANTHROPIC_ADMIN_KEY),
// OpenAI from its bill (OPENAI_ADMIN_KEY), otherwise estimated from tokens used. Broken down by area, with outreach cost per email. ──
var PL_AREAS = [["Outreach & demos", /outreach|prospect|hunt|no_website|rescan|call_demo|website_lead|website_demo|demo_|reply_watch|lead_find|scout/], ["Phone & voice", /voice|call|phone/], ["Assistant & team", /.*/]];
async function plAnthropic(env, start, end) {
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
async function plOpenAI(env, start, end) {
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
async function plAiCosts(env, now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const fx = +env.AUD_PER_USD > 0.5 && +env.AUD_PER_USD < 3 ? +env.AUD_PER_USD : 1.53;
  const usage = await select(env, "team_usage", `created_at=gte.${encodeURIComponent(start.toISOString())}&created_at=lt.${encodeURIComponent(end.toISOString())}&select=source,model,cost_aud,enrols&limit=20000`).catch(() => []);
  const areas = Object.fromEntries(PL_AREAS.map(([n]) => [n, 0])); let estA = 0, estO = 0, enrols = 0;
  for (const r of usage) {
    const aud = +r.cost_aud || 0, src = String(r.source || ""), model = String(r.model || "");
    areas[PL_AREAS.find(([, re]) => re.test(src))[0]] += aud;
    if (/gpt|openai|realtime|whisper|tts|image/i.test(model) || /demo_images|voice_ai/.test(src)) estO += aud; else if (!/^free_ai/.test(src)) estA += aud;
    enrols += +r.enrols || 0;
  }
  const notes = [];
  const [an, oa] = await Promise.all([plAnthropic(env, start, end).catch((e) => { notes.push(e.message); return null; }), plOpenAI(env, start, end).catch((e) => { notes.push(e.message); return null; })]);
  const anthropic = an != null ? { aud: +(an * fx).toFixed(2), usd: an, exact: true } : { aud: +estA.toFixed(2), exact: false };
  const openai = oa != null ? { aud: +(oa * fx).toFixed(2), usd: oa, exact: true } : { aud: +estO.toFixed(2), exact: false };
  const total = +(anthropic.aud + openai.aud).toFixed(2), estTotal = Object.values(areas).reduce((a, b) => a + b, 0) || 1;
  const by_area = Object.fromEntries(Object.entries(areas).map(([k, v]) => [k, +((v / estTotal) * total).toFixed(2)]));
  const out = by_area["Outreach & demos"] || 0;
  return { anthropic, openai, total, by_area, fx, outreach: { aud: out, emails_sent: enrols, per_email: enrols ? +(out / enrols).toFixed(2) : null }, notes };
}
