// v47 Outreach engine: 50 businesses a day (adjustable), on autopilot, with Ty approving one daily batch.
// Finds businesses with outdated websites (and ones with no website at all), researches each one on Google and
// AI search, scores it, builds a homepage concept + leak report + AI receptionist demo, and writes the email.
// Sending ramps up with the new outreach domain's warm-up, and demos are only built for what can be sent that day.
var OUT_RAMP = [[0, 20], [3, 35], [6, 50], [9, 70], [12, 85], [15, 100]];
var OUT_DEFAULT = { on: false, target: 50, start: null, cities: ["Brisbane", "Gold Coast", "Sunshine Coast", "Sydney", "Melbourne"], verticals: [], hours: [6, 19] };
var OUT_PREMIUM = `PREMIUM POSITIONING (Studio Flow & Systems)
- We are the premium choice: senior, local, design-led, and we build the systems behind the website too. Never sound cheap, desperate or salesy. No discounts in cold emails, no prices.
- Lead with what we already made for THEM (their homepage concept, their AI receptionist, their leak report), then one clear, easy next step: a free 30-minute call with Ty.
- Every claim must come from their own research (scan, Google position, reviews). Specific beats clever.
- Compliment one real strength first (reviews, years in business, a great service). Owners buy from people who noticed them.`;
var OUT_TEN_X = `10X RULE: the concept must be at least ten times better than the business's current website: faster to understand, clearly premium, mobile-first, every section earns its place, one obvious way to book or enquire, real reviews up front, and motion that feels alive. If their site is already good, go further: richer motion, sharper copy, stronger proof. Never make a concept that looks like a template.`;
function outDayStart() {
  const off = 10 * 36e5, d = new Date(Date.now() + off);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - off).toISOString();
}
async function outCfg(env) {
  const r = await select(env, "team_settings", "key=eq.outreach_daily&select=value&limit=1").catch(() => []);
  return { ...OUT_DEFAULT, ...(r?.[0]?.value || {}) };
}
function outCapacity(cfg) {
  if (!cfg.on) return 0;
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(cfg.start || new Date().toISOString())) / 864e5));
  let cap = OUT_RAMP[0][1];
  for (const [d, c] of OUT_RAMP) if (days >= d) cap = c;
  return Math.max(0, Math.min(cap, +cfg.target || 50));
}
async function outStats(env) {
  const since = outDayStart();
  const [acts, pros, sites] = await Promise.all([
    select(env, "team_actions", `type=eq.campaign_enrol&created_at=gte.${encodeURIComponent(since)}&select=id,status&limit=500`).catch(() => []),
    select(env, "agent_prospects", `created_at=gte.${encodeURIComponent(since)}&select=id,status,email,website,source&limit=1000`).catch(() => []),
    wsdIndex(env).then((ix) => ix.filter((d) => (d.created || "") >= since).length).catch(() => 0)
  ]);
  return {
    ready: acts.filter((a) => a.status === "pending").length,
    approved: acts.filter((a) => a.status !== "pending" && a.status !== "rejected").length,
    queued_today: acts.length,
    researched: pros.length,
    no_website: pros.filter((p) => p.source === "no_website").length,
    call_list: pros.filter((p) => !p.email && p.status === "to_send").length,
    site_demos: sites
  };
}
// How many homepage concepts can still be built today (only as many as can be sent)
async function outSiteLeft(env) {
  const cfg = await outCfg(env);
  if (!cfg.on) return 3;
  const st = await outStats(env);
  return Math.max(0, outCapacity(cfg) - st.queued_today);
}
// ── Google + AI search research: is this business found when customers search? ──
var OUT_SEARCH_TOOL = {
  name: "save_search",
  description: "Save what the searches showed.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The search a local customer would type, e.g. 'physio Manly'." },
      position: { type: ["integer", "null"], description: "Where this business appeared in the results (1 = first). null if it didn't appear." },
      ahead: { type: "array", items: { type: "string" }, description: "Up to 3 competitors that appeared above it." },
      ai_mention: { type: "boolean", description: "Did an AI-style answer or 'best of' list in the results name this business?" },
      google_rating: { type: ["number", "null"] },
      google_reviews: { type: ["integer", "null"] },
      notes: { type: "string", description: "One plain sentence on how visible they are." }
    },
    required: ["query", "position", "ahead", "ai_mention", "notes"]
  }
};
async function outSearch(env, c, leak, u) {
  const suburb = String(c.location || c.suburb || "").split(",")[0].trim() || "";
  const what = (OUTREACH[c.vertical] || {}).name || c.vertical || "service";
  const out = await wsdAsk(env, u, "fast", {
    max_tokens: 1500,
    system: "You check how visible a local Australian business is in search. Run the search a local customer would type (service + suburb), then a 'best ... near ...' search. Report only what the results show. Never guess.",
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2, user_location: { type: "approximate", country: "AU", timezone: "Australia/Brisbane" } }, OUT_SEARCH_TOOL],
    messages: [{ role: "user", content: `Business: ${c.business_name}\nWebsite: ${c.website || "none"}\nService: ${what}\nArea: ${suburb || "their local area"}\nSearch like a local customer, then call save_search.` }]
  }, "save_search");
  const pos = Number.isInteger(out.position) && out.position > 0 ? out.position : null;
  const res = { query: String(out.query || `${what} ${suburb}`).slice(0, 80), position: pos, ahead: (Array.isArray(out.ahead) ? out.ahead : []).slice(0, 3).map((x) => String(x).slice(0, 60)), ai_mention: !!out.ai_mention, notes: String(out.notes || "").slice(0, 240), at: new Date().toISOString() };
  if (leak && Array.isArray(leak.checks)) {
    const status = pos && pos <= 3 ? "pass" : pos && pos <= 10 ? "warn" : "fail";
    const finding = pos ? `Shows up at position ${pos} when people search "${res.query}"${res.ahead.length ? `, behind ${res.ahead.slice(0, 2).join(" and ")}` : ""}.` : `Doesn't show up when people search "${res.query}"${res.ahead.length ? `; ${res.ahead.slice(0, 2).join(" and ")} do` : ""}.`;
    leak.search = res;
    if (status !== "pass") {
      leak.checks.push({ key: "search_visibility", label: "Google & AI search", status, confidence: "confirmed", finding, evidence: res.notes, why: "Most new customers search first and call one of the top few results. If you're not there, they never see you.", fix: "A fast, well-structured site with local SEO and AI-search foundations (schema, service + suburb pages, Google Business Profile).", angle: "Customers searching for you find competitors first.", weight: status === "fail" ? 8 : 5, loss: status === "fail" ? [2, 5] : [1, 3] });
      leak.leak_score = Math.min(100, (+leak.leak_score || 0) + (status === "fail" ? 14 : 7));
      if (Array.isArray(leak.top) && leak.top.length < 3) leak.top.push({ label: "Google & AI search", finding, fix: "Local SEO and AI-search foundations", angle: "Customers searching for you find competitors first." });
    } else {
      leak.strengths = [...(leak.strengths || []), `Already ranks well for "${res.query}"`];
    }
  }
  return res;
}
// ── Businesses with no website: straight onto the call list (no email unless they published one) ──
async function outNoSite(env, c, vertical, city, job) {
  const name = String(c.business_name || "").slice(0, 200);
  if (!name || !c.phone) return;
  const dup = await select(env, "agent_prospects", `business_name=eq.${encodeURIComponent(name)}&select=id&limit=1`).catch(() => []);
  if (dup.length) return;
  const row = { business_name: name, website: null, email: null, phone: String(c.phone).slice(0, 40), location: c.location || city, niche: vertical, vertical, leak: "No website: customers who search for them can't find, trust or book them online.", evidence: `No website found. ${c.google_rating ? `Google ${c.google_rating}★ (${c.google_reviews || "?"} reviews).` : ""}`.trim(), opener: `Hi, it's Ty from Studio Flow & Systems in Brisbane. I was looking for ${name} online and couldn't find a website, just your Google listing${c.google_rating ? ` with great reviews` : ""}. Customers who search are booking with whoever they can find online. I build websites with an AI receptionist that answers and books people in, day and night. Would a quick look at what that could look like for you be useful?`, score: 8, status: "to_send", source: "no_website", call_status: null };
  if (c.google_rating) row.google_rating = +c.google_rating;
  if (Number.isInteger(c.google_reviews)) row.google_reviews = c.google_reviews;
  await insert(env, "agent_prospects", [row]);
  job.results.call_only++;
  job.results.no_website = (job.results.no_website || 0) + 1;
}
// ── Autopilot: keep hunting until today's batch is full (within the warm-up limit and working hours) ──
async function outreachAutopilot(env, settings) {
  const cfg = await outCfg(env);
  if (!cfg.on) return { off: true };
  const h = brisbaneNow().hour, cap = outCapacity(cfg);
  const st = await outStats(env);
  const res = { cap, ...st, started: 0 };
  const day = outDayStart().slice(0, 10);
  const notified = (settings?.notify_state || {}).outreach_ready === day;
  if (!notified && st.ready && (st.queued_today >= cap || h >= 15)) {
    await notify(env, `\u{1F4EC} <b>Today's outreach is ready: ${st.ready} to approve</b>\n${st.researched} businesses researched, ${st.site_demos} homepage concepts built${st.call_list ? `, ${st.call_list} on the call list` : ""}.\nOpen Command › Growth › Outreach today, check them over, then tap Send.`, { urgent: true, settings }).catch(() => {});
    await saveSetting(env, "notify_state", { ...(settings?.notify_state || {}), outreach_ready: day }).catch(() => {});
  }
  if (h < cfg.hours[0] || h >= cfg.hours[1] || st.queued_today >= cap) return res;
  if (st.researched >= cap * 3) return { ...res, reason: "researched plenty today" };
  const live = (await jobs(env)).filter((j) => j.status === "running" || j.status === "searching");
  const want = Math.min(3 - live.length, Math.ceil((cap - st.queued_today) / 8));
  // v49: industries that book get more of the day's hunts (smoothed, so every industry still gets tried)
  const verts = await outVertWeights(env, cfg.verticals?.length ? cfg.verticals : Object.keys(OUTREACH)).catch(() => cfg.verticals?.length ? cfg.verticals : Object.keys(OUTREACH));
  for (let i = 0; i < want; i++) {
    const k = (Math.floor(Date.now() / 36e5) + i) % 1e3;
    try {
      await startHunt(env, { vertical: verts[k % verts.length], city: cfg.cities[k % cfg.cities.length], count: 15, source: "outreach_autopilot" });
      res.started++;
    } catch (e) {
      res.error = String(e.message).slice(0, 160);
    }
  }
  return res;
}
async function outToday(env) {
  const since = outDayStart();
  const acts = await select(env, "team_actions", `type=eq.campaign_enrol&status=eq.pending&order=created_at.desc&limit=150&select=id,title,reason,params,created_at`).catch(() => []);
  const ids = acts.map((a) => a.params?.prospect_id).filter(Boolean);
  const P = ids.length ? await select(env, "agent_prospects", `id=in.(${ids.join(",")})&select=id,business_name,website,email,phone,location,vertical,leak_score,score,google_rating,google_reviews,report_token,demo_token,leak_report`).catch(() => []) : [];
  const by = new Map(P.map((p) => [p.id, p]));
  const origin = String(env.PUBLIC_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, "");
  const items = acts.map((a) => {
    const p = by.get(a.params?.prospect_id) || {}, lr = p.leak_report || {}, s = lr.search || null;
    const tok = p.demo_token || lr.packet?.demo_token || null;
    return { id: a.id, today: a.created_at >= since, business: p.business_name || a.params?.business_name, website: p.website, email: a.params?.email || p.email, location: p.location, vertical: p.vertical, score: p.score, leak_score: p.leak_score, google: p.google_rating ? `${p.google_rating}★ (${p.google_reviews || 0})` : null, search: s ? { query: s.query, position: s.position, ahead: s.ahead } : null, subject: a.params?.subject, body: a.params?.body, follow_up_1: a.params?.follow_up_1, report: p.report_token ? `${origin}/leak-report/${p.report_token}` : null, site: a.params?.site_demo_url || null, receptionist: tok ? `${origin}/demo/${tok}` : null, reason: a.reason };
  });
  return { items };
}
async function outreachRoute(p, m, body, env) {
  const J = (o, s = 200) => json(o, s);
  if (p === "/outreach/daily" && m === "GET") {
    const cfg = await outCfg(env);
    return J({ ok: true, cfg, capacity: outCapacity(cfg), stats: await outStats(env), verticals: Object.keys(OUTREACH).map((k) => ({ id: k, name: OUTREACH[k].name })) });
  }
  if (p === "/outreach/daily" && m === "POST") {
    const cur = await outCfg(env);
    const next = { ...cur };
    if ("on" in body) { next.on = !!body.on; if (next.on && !cur.on && !cur.start) next.start = new Date().toISOString(); }
    if ("target" in body) next.target = Math.max(5, Math.min(150, Math.round(+body.target || 50)));
    if (Array.isArray(body.cities)) next.cities = body.cities.map((c) => String(c).trim().slice(0, 40)).filter(Boolean).slice(0, 12);
    if (Array.isArray(body.verticals)) next.verticals = body.verticals.filter((v) => OUTREACH[v]);
    if (body.restart_warmup) next.start = new Date().toISOString();
    if (!next.cities.length) next.cities = OUT_DEFAULT.cities;
    await saveSetting(env, "outreach_daily", next);
    await audit(env, { actor: "Ty", action: "outreach_daily", summary: `Outreach autopilot ${next.on ? "on" : "off"}, target ${next.target}/day` }).catch(() => {});
    return J({ ok: true, cfg: next, capacity: outCapacity(next) });
  }
  if (p === "/outreach/today" && m === "GET") return J({ ok: true, ...await outToday(env), stats: await outStats(env) });
  if (p === "/outreach/run" && m === "POST") return J({ ok: true, result: await outreachAutopilot(env, await getSettings(env)) });
  return null;
}
