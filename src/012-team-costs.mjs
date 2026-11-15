// src/team/costs.js
var DEFAULT_PRICING = {
  usd_aud: 1.55,
  input_per_m: 3,
  output_per_m: 15,
  cache_write_per_m: 3.75,
  cache_read_per_m: 0.3,
  web_search_per_k: 10,
  email_aud: 2e-3,
  // GHL email sending, per email
  emails_per_enrol: 3
};
var PRICING_KEYS = Object.keys(DEFAULT_PRICING);
function pricing(settings) {
  const out = { ...DEFAULT_PRICING };
  for (const k of PRICING_KEYS) {
    const v = Number(settings?.pricing?.[k]);
    if (Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}
var emptyUsage = () => ({ calls: 0, input: 0, output: 0, cache_write: 0, cache_read: 0, web_searches: 0 });
function addUsage(u, apiUsage) {
  if (!u || !apiUsage) return u;
  u.calls += 1;
  u.input += apiUsage.input_tokens || 0;
  u.output += apiUsage.output_tokens || 0;
  u.cache_write += apiUsage.cache_creation_input_tokens || 0;
  u.cache_read += apiUsage.cache_read_input_tokens || 0;
  u.web_searches += apiUsage.server_tool_use?.web_search_requests || 0;
  return u;
}
function costOf(u, pr) {
  const usd = (u.input * pr.input_per_m + u.output * pr.output_per_m + u.cache_write * pr.cache_write_per_m + u.cache_read * pr.cache_read_per_m) / 1e6 + u.web_searches * pr.web_search_per_k / 1e3;
  return { usd: round(usd, 4), aud: round(usd * pr.usd_aud, 4) };
}
var round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
async function logUsage(env, settings, { department, source, model: model2, usage, prospects = [], enrols = 0 }) {
  if (!usage || !usage.calls) return null;
  const pr = pricing(settings);
  const c = costOf(usage, pr);
  const ids = [...new Set(prospects.filter(Boolean))];
  try {
    await insert(env, "team_usage", [{
      department,
      source: String(source || "chat").slice(0, 60),
      model: model2 || null,
      calls: usage.calls,
      input_tokens: usage.input,
      output_tokens: usage.output,
      cache_write_tokens: usage.cache_write,
      cache_read_tokens: usage.cache_read,
      web_searches: usage.web_searches,
      cost_usd: c.usd,
      cost_aud: c.aud,
      prospects: ids.length,
      enrols
    }]);
  } catch (e) {
    console.error("usage log:", e.message.slice(0, 160));
    return c;
  }
  if (ids.length) {
    const share = c.aud / ids.length;
    try {
      const rows = await select(env, "agent_prospects", `id=in.(${ids.map(enc).join(",")})&select=id,research_cost_aud`);
      await Promise.all(rows.map((r) => update(env, "agent_prospects", `id=eq.${r.id}`, { research_cost_aud: round(Number(r.research_cost_aud || 0) + share, 4) })));
    } catch (e) {
      console.error("prospect cost:", e.message.slice(0, 160));
    }
  }
  return c;
}
var ACQUISITION_SOURCES = /* @__PURE__ */ new Set(["prospect_hunt", "import_review", "reply_watch", "sales_am", "sales_pm"]);
var isAcq = (r) => r.department === "head_of_sales" || ACQUISITION_SOURCES.has(r.source);
async function costSummary(env, settings, days = 30) {
  const pr = pricing(settings);
  const since = new Date(Date.now() - days * 864e5).toISOString();
  let usage = [], table = true;
  try {
    usage = await select(env, "team_usage", `created_at=gte.${enc(since)}&select=department,source,calls,input_tokens,output_tokens,cache_write_tokens,cache_read_tokens,web_searches,cost_aud,prospects,created_at&order=created_at.desc&limit=5000`);
  } catch {
    table = false;
  }
  const P = await select(env, "agent_prospects", "select=id,created_at,updated_at,enrolled_at,status,call_status,last_call_at&limit=5000").catch(() => []);
  const inWin = (t) => t && t >= since;
  const funnel = {
    researched: P.filter((p) => inWin(p.created_at)).length,
    enrolled: P.filter((p) => inWin(p.enrolled_at)).length,
    replied: P.filter((p) => ["replied", "won"].includes(p.status) && inWin(p.updated_at)).length,
    booked: P.filter((p) => p.call_status === "booked" && inWin(p.last_call_at || p.updated_at)).length,
    won: P.filter((p) => p.status === "won" && inWin(p.updated_at)).length
  };
  const sum = (rows, k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
  const acq = usage.filter(isAcq);
  const ai_aud = sum(usage, "cost_aud");
  const acq_ai_aud = sum(acq, "cost_aud");
  const email_aud = funnel.enrolled * pr.emails_per_enrol * pr.email_aud;
  const spend = acq_ai_aud + email_aud;
  const per = (n) => n ? round(spend / n, 2) : null;
  const bySource = {};
  for (const r of usage) {
    const k = r.source || "chat";
    const b = bySource[k] ||= { runs: 0, cost_aud: 0, tokens: 0, web_searches: 0, prospects: 0 };
    b.runs += 1;
    b.cost_aud += Number(r.cost_aud || 0);
    b.tokens += (r.input_tokens || 0) + (r.output_tokens || 0) + (r.cache_write_tokens || 0) + (r.cache_read_tokens || 0);
    b.web_searches += r.web_searches || 0;
    b.prospects += r.prospects || 0;
  }
  for (const b of Object.values(bySource)) b.cost_aud = round(b.cost_aud, 2);
  return {
    ok: true,
    days,
    logging: table,
    pricing: pr,
    totals: {
      ai_aud: round(ai_aud, 2),
      acquisition_ai_aud: round(acq_ai_aud, 2),
      email_aud: round(email_aud, 3),
      acquisition_aud: round(spend, 2),
      runs: usage.length,
      tokens: sum(usage, "input_tokens") + sum(usage, "output_tokens") + sum(usage, "cache_write_tokens") + sum(usage, "cache_read_tokens"),
      input_tokens: sum(usage, "input_tokens"),
      output_tokens: sum(usage, "output_tokens"),
      cache_read_tokens: sum(usage, "cache_read_tokens"),
      web_searches: sum(usage, "web_searches")
    },
    funnel,
    cost_per: { researched_lead: per(funnel.researched), enrolment: per(funnel.enrolled), reply: per(funnel.replied), booked_call: per(funnel.booked), client_won: per(funnel.won) },
    by_source: bySource,
    note: "AI and sending costs only (not your software subscriptions or your time). Prices are estimates you can edit; check them against your Anthropic invoice."
  };
}

