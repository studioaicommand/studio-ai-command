// v147 Google rankings. Two sources, both optional and pasted into Cloudflare by Ty:
//  - DataForSEO (DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD): where any site ranks for any keyword, in Google and Google Maps, by suburb.
//    Pay as you go, so every check is capped by RANK_MONTHLY_USD (default US$15/month).
//  - Google Search Console (GSC_SERVICE_ACCOUNT_JSON): real clicks, impressions and average position for sites that added
//    the service account as a user. Read only.
var RANK_KEY = "rank_tracker", RANK_QUICK_KEY = "rank_quick";
var RANK_STATES = { qld: "Queensland", nsw: "New South Wales", vic: "Victoria", wa: "Western Australia", sa: "South Australia", tas: "Tasmania", act: "Australian Capital Territory", nt: "Northern Territory" };
var rankDomain = (s) => String(s || "").toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#\s]/)[0];
function rankLoc(text) {
  const t = String(text || "").trim();
  if (!t) return "Australia";
  if (/,/.test(t)) return /australia$/i.test(t) ? t : t + ",Australia";
  const m = t.match(/^(.*?)[\s,]+(qld|nsw|vic|wa|sa|tas|act|nt)$/i);
  if (m) return m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase()) + "," + RANK_STATES[m[2].toLowerCase()] + ",Australia";
  return t;
}
function dfsAuth(env) { return env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD ? "Basic " + btoa(env.DATAFORSEO_LOGIN + ":" + env.DATAFORSEO_PASSWORD) : null; }
async function rankState(env) { return (await select(env, "team_settings", "key=eq." + RANK_KEY + "&select=value&limit=1").catch(() => []))?.[0]?.value || { items: [], history: {} }; }
async function rankSpend(env, add) {
  const st = await rankState(env), month = new Date().toISOString().slice(0, 7);
  const s = st.spend && st.spend.month === month ? st.spend : { month, usd: 0 };
  if (add) { s.usd = Math.round((s.usd + add) * 10000) / 10000; st.spend = s; await saveSetting(env, RANK_KEY, st); }
  return { ...s, cap: Number(env.RANK_MONTHLY_USD) || 15 };
}
async function dfsPost(env, path, task) {
  const a = dfsAuth(env);
  if (!a) throw new Error("The rank tracker isn't connected yet. Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in Cloudflare.");
  const r = await fetch("https://api.dataforseo.com/v3/" + path, { method: "POST", headers: { Authorization: a, "Content-Type": "application/json" }, body: JSON.stringify([task]), signal: AbortSignal.timeout(60000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status_code !== 20000) throw new Error("DataForSEO: " + (j.status_message || "HTTP " + r.status));
  const t = j.tasks && j.tasks[0];
  if (!t || t.status_code !== 20000) throw new Error("DataForSEO: " + ((t && t.status_message) || "no result"));
  return { items: (t.result && t.result[0] && t.result[0].items) || [], cost: +t.cost || 0 };
}
// Where does this domain rank for this keyword here? Google results, the map pack in those results, and Google Maps.
async function rankCheck(env, { domain, keyword, location }) {
  const d = rankDomain(domain), kw = String(keyword || "").trim().slice(0, 120);
  if (!d || !kw) throw new Error("Need a website and a keyword.");
  const sp = await rankSpend(env);
  if (sp.usd >= sp.cap) throw new Error("This month's rank-check budget (US$" + sp.cap + ") is used up. Raise RANK_MONTHLY_USD in Cloudflare to check more.");
  let loc = rankLoc(location), keyUsed = kw, org;
  try { org = await dfsPost(env, "serp/google/organic/live/advanced", { keyword: kw, location_name: loc, language_code: "en", depth: 100 }); }
  catch (e) {
    if (!/location/i.test(e.message) || loc === "Australia") throw e;
    keyUsed = kw + " " + String(location).replace(/,.*$/, "").trim(); loc = "Australia";
    org = await dfsPost(env, "serp/google/organic/live/advanced", { keyword: keyUsed, location_name: loc, language_code: "en", depth: 100 });
  }
  const maps = await dfsPost(env, "serp/google/maps/live/advanced", { keyword: keyUsed, location_name: loc, language_code: "en", depth: 20 }).catch((e) => ({ items: [], cost: 0, error: e.message }));
  const hit = (it) => { const x = rankDomain(it.domain || it.url); return x && (x === d || x.endsWith("." + d)); };
  const o = org.items.find((it) => it.type === "organic" && hit(it));
  const lp = org.items.find((it) => it.type === "local_pack" && hit(it));
  const m = maps.items.find((it) => it.type === "maps_search" && hit(it));
  const cost = (org.cost || 0) + (maps.cost || 0);
  await rankSpend(env, cost);
  return {
    keyword: kw, location: loc, domain: d, organic: o ? o.rank_group : null, url: o ? o.url : null, local_pack: lp ? lp.rank_group : null, maps: m ? m.rank_group : null,
    ai_overview: org.items.some((it) => it.type === "ai_overview"),
    top: org.items.filter((it) => it.type === "organic").slice(0, 3).map((it) => ({ pos: it.rank_group, domain: rankDomain(it.domain), title: String(it.title || "").slice(0, 80) })),
    maps_top: maps.items.filter((it) => it.type === "maps_search").slice(0, 3).map((it) => ({ pos: it.rank_group, title: String(it.title || "").slice(0, 60), rating: it.rating && it.rating.value || null })),
    maps_error: maps.error || null, cost_usd: Math.round(cost * 10000) / 10000, at: new Date().toISOString()
  };
}
// One line a person can read: "#4 on Google, #2 on Maps" / "Not in the top 100".
function rankLine(r) {
  if (!r) return "";
  const a = r.organic ? "#" + r.organic + " on Google" : "not in Google's top 100", b = r.maps ? "#" + r.maps + " on Google Maps" : r.local_pack ? "#" + r.local_pack + " in the map pack" : "not in the map results";
  return a + ", " + b;
}
async function rankCheckItem(env, id) {
  const st = await rankState(env), it = (st.items || []).find((x) => x.id === id);
  if (!it) throw new Error("That business isn't being tracked.");
  st.history = st.history || {};
  const out = [];
  for (const kw of (it.keywords || []).slice(0, 10)) {
    try {
      const r = await rankCheck(env, { domain: it.domain, keyword: kw, location: it.location });
      const k = it.id + "|" + kw.toLowerCase();
      st.history[k] = [...(st.history[k] || []), { at: r.at, organic: r.organic, maps: r.maps, local_pack: r.local_pack }].slice(-26);
      out.push(r);
    } catch (e) { out.push({ keyword: kw, error: e.message }); if (/budget|isn't connected/.test(e.message)) break; }
  }
  const fresh = await rankState(env);
  fresh.history = { ...(fresh.history || {}), ...st.history };
  fresh.items = (fresh.items || []).map((x) => x.id === id ? { ...x, last_check: new Date().toISOString(), last: out.filter((r) => !r.error).map((r) => ({ keyword: r.keyword, organic: r.organic, maps: r.maps, local_pack: r.local_pack, top: r.top, maps_top: r.maps_top })) } : x);
  await saveSetting(env, RANK_KEY, fresh);
  return out;
}
// Mondays at 6am Brisbane: re-check every tracked business once a week.
async function rankWeekly(env) {
  const t = brisbaneNow();
  if (t.dow !== 1 || t.hour !== 6 || !dfsAuth(env)) return CRON_NOT_DUE;
  const st = await rankState(env), wk = t.date;
  if (st.last_weekly === wk || !(st.items || []).length) return CRON_NOT_DUE;
  st.last_weekly = wk; await saveSetting(env, RANK_KEY, st);
  const lines = [];
  for (const it of st.items) {
    const res = await rankCheckItem(env, it.id).catch((e) => [{ error: e.message }]);
    const prev = (await rankState(env)).history || {};
    for (const r of res.filter((x) => !x.error)) {
      const h = prev[it.id + "|" + r.keyword.toLowerCase()] || [], before = h.length > 1 ? h[h.length - 2] : null;
      const mv = before && before.organic && r.organic ? before.organic - r.organic : 0;
      lines.push(it.label + ": " + r.keyword + " " + rankLine(r) + (mv ? (mv > 0 ? " (up " + mv + ")" : " (down " + -mv + ")") : ""));
    }
  }
  if (lines.length) await notify(env, "\u{1F4C8} <b>Google rankings this week</b>\n" + lines.slice(0, 25).map((l) => "• " + l).join("\n")).catch(() => {});
  return { checked: lines.length };
}

// Google Search Console via a service account (read only)
var GSC_TOKEN = { v: null, exp: 0 };
var b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function gscAccount(env) { try { const sa = JSON.parse(env.GSC_SERVICE_ACCOUNT_JSON || ""); return sa && sa.client_email && sa.private_key ? sa : null; } catch (e) { return null; } }
async function gscToken(env) {
  if (GSC_TOKEN.v && GSC_TOKEN.exp > Date.now() + 60000) return GSC_TOKEN.v;
  const sa = gscAccount(env);
  if (!sa) throw new Error("Search Console isn't connected yet. Add GSC_SERVICE_ACCOUNT_JSON in Cloudflare.");
  const now = Math.floor(Date.now() / 1000), enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ alg: "RS256", typ: "JWT" }) + "." + enc({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const der = Uint8Array.from(atob(String(sa.private_key).replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: unsigned + "." + b64u(sig) }), signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error("Google sign-in for Search Console failed: " + (j.error_description || j.error || r.status));
  GSC_TOKEN = { v: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return j.access_token;
}
async function gscSites(env) {
  const r = await fetch("https://www.googleapis.com/webmasters/v3/sites", { headers: { Authorization: "Bearer " + await gscToken(env) }, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Search Console: " + (j.error && j.error.message || r.status));
  return (j.siteEntry || []).map((s) => ({ site: s.siteUrl, access: s.permissionLevel }));
}
async function gscReport(env, site, days = 28) {
  const end = new Date(Date.now() - 2 * 864e5), start = new Date(end.getTime() - (days - 1) * 864e5), f = (d) => d.toISOString().slice(0, 10);
  const q = async (dims, limit) => {
    const r = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(site) + "/searchAnalytics/query", { method: "POST", headers: { Authorization: "Bearer " + await gscToken(env), "Content-Type": "application/json" }, body: JSON.stringify({ startDate: f(start), endDate: f(end), dimensions: dims, rowLimit: limit }), signal: AbortSignal.timeout(25000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("Search Console: " + (j.error && j.error.message || r.status) + (r.status === 403 ? " (add the service account as a user on this site in Search Console)" : ""));
    return j.rows || [];
  };
  const [tot, rows] = await Promise.all([q([], 1), q(["query"], 25)]);
  const t = tot[0] || {};
  const r1 = (n) => Math.round((+n || 0) * 10) / 10;
  return { site, from: f(start), to: f(end), clicks: t.clicks || 0, impressions: t.impressions || 0, position: r1(t.position), queries: rows.map((x) => ({ query: x.keys[0], clicks: x.clicks, impressions: x.impressions, position: r1(x.position) })) };
}

async function rankRoute(p, m, body, env) {
  const J = (o, s = 200) => json(o, s);
  try {
    if (p === "/rankings" && m === "GET") {
      const st = await rankState(env), sp = await rankSpend(env), sa = gscAccount(env);
      const items = (st.items || []).map((it) => ({ ...it, trend: Object.fromEntries((it.keywords || []).map((k) => [k, (st.history || {})[it.id + "|" + k.toLowerCase()] || []])) }));
      return J({ ok: true, connected: { tracker: !!dfsAuth(env), search_console: !!sa, service_email: sa ? sa.client_email : null }, spend: sp, items });
    }
    if (p === "/rankings/track" && m === "POST") {
      const domain = rankDomain(body.domain), kws = (Array.isArray(body.keywords) ? body.keywords : String(body.keywords || "").split(/[\n,]+/)).map((k) => String(k).trim()).filter(Boolean).slice(0, 10);
      if (!domain || !kws.length) return J({ ok: false, error: "Add the website and at least one keyword." }, 400);
      const st = await rankState(env); st.items = st.items || [];
      const id = body.id || memHex(memRand(5));
      const row = { id, label: String(body.label || domain).slice(0, 60), domain, keywords: kws, location: String(body.location || "").slice(0, 80), gsc_site: String(body.gsc_site || "").slice(0, 120) || null, added_at: new Date().toISOString() };
      const i = st.items.findIndex((x) => x.id === id);
      if (i >= 0) st.items[i] = { ...st.items[i], ...row, added_at: st.items[i].added_at }; else { if (st.items.length >= 40) return J({ ok: false, error: "Tracking 40 businesses already. Remove one first." }, 400); st.items.push(row); }
      await saveSetting(env, RANK_KEY, st);
      return J({ ok: true, item: row });
    }
    if (p === "/rankings/remove" && m === "POST") {
      const st = await rankState(env); st.items = (st.items || []).filter((x) => x.id !== body.id);
      for (const k of Object.keys(st.history || {})) if (k.startsWith(body.id + "|")) delete st.history[k];
      await saveSetting(env, RANK_KEY, st); return J({ ok: true });
    }
    if (p === "/rankings/check" && m === "POST") return J({ ok: true, results: await rankCheckItem(env, String(body.id || "")) });
    if (p === "/rankings/quick" && m === "POST") {
      const r = await rankCheck(env, { domain: body.domain, keyword: body.keyword, location: body.location });
      if (body.prospect_id) {
        const q = (await select(env, "team_settings", "key=eq." + RANK_QUICK_KEY + "&select=value&limit=1").catch(() => []))?.[0]?.value || {};
        q[String(body.prospect_id)] = { keyword: r.keyword, location: r.location, organic: r.organic, maps: r.maps, local_pack: r.local_pack, line: rankLine(r), top: r.top, at: r.at };
        const keep = Object.fromEntries(Object.entries(q).sort((a, b) => (b[1].at || "") < (a[1].at || "") ? -1 : 1).slice(0, 500));
        await saveSetting(env, RANK_QUICK_KEY, keep);
      }
      return J({ ok: true, result: r, line: rankLine(r) });
    }
    if (p === "/rankings/gsc-sites" && m === "GET") return J({ ok: true, sites: await gscSites(env) });
    if (p === "/rankings/gsc" && m === "GET") return J({ ok: true, report: await gscReport(env, String(body.site || ""), Math.min(90, Math.max(7, Number(body.days) || 28))) });
  } catch (e) { return J({ ok: false, error: String(e.message || e).slice(0, 300) }, 400); }
  return null;
}
