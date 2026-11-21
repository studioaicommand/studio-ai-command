// v147 Google rankings: track businesses on Google and Google Maps (DataForSEO), real Search Console numbers,
// a quick rank check on call cards, a monthly spend cap, and a Studio AI tool.
import { generateKeyPairSync } from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [], agent_prospects: [{ id: "p1", business_name: "Harbour Physio", phone: "0400000001", status: "sent", website: "https://www.harbourphysio.com.au", vertical: "allied", location: "Noosa Heads QLD", score: 80 }] };
let seq = 0; const dfs = []; let gscCalls = 0;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { let m; if ((m = v.match(/^eq\.(.*)$/))) return String(r[k] ?? "") === m[1]; if ((m = v.match(/^in\.\((.*)\)$/))) return m[1].split(",").includes(String(r[k] ?? "")); if (v === "not.is.null") return r[k] != null; if (v === "is.null") return r[k] == null; return true; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = JSON.parse(init.body); } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body || []).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json(rows); }
    return Response.json([]); }
  if (u.startsWith("https://api.dataforseo.com/v3/")) {
    const task = body[0]; dfs.push({ path: u.split("/v3/")[1], task, auth: init.headers.Authorization });
    if (task.location_name === "Nowhereville") return Response.json({ status_code: 20000, tasks: [{ status_code: 40501, status_message: "Invalid Field: 'location_name'." }] });
    if (u.includes("/organic/")) return Response.json({ status_code: 20000, cost: 0.002, tasks: [{ status_code: 20000, cost: 0.002, result: [{ items: [
      { type: "ai_overview", rank_group: 1 }, { type: "local_pack", rank_group: 3, domain: "harbourphysio.com.au", title: "Harbour Physio" },
      { type: "organic", rank_group: 1, domain: "www.noosaphysio.com.au", url: "https://www.noosaphysio.com.au/", title: "Noosa Physio" },
      { type: "organic", rank_group: 2, domain: "www.healthengine.com.au", url: "https://healthengine.com.au/x", title: "Physios in Noosa" },
      { type: "organic", rank_group: 7, domain: "www.harbourphysio.com.au", url: "https://www.harbourphysio.com.au/sports", title: "Sports physio" }] }] }] });
    return Response.json({ status_code: 20000, cost: 0.002, tasks: [{ status_code: 20000, cost: 0.002, result: [{ items: [{ type: "maps_search", rank_group: 1, title: "Noosa Physio", domain: "noosaphysio.com.au" }, { type: "maps_search", rank_group: 2, title: "Harbour Physio", domain: "harbourphysio.com.au", rating: { value: 4.9 } }] }] }] });
  }
  if (u === "https://oauth2.googleapis.com/token") { const a = String(init.body); return a.includes("assertion=") && a.split("assertion=")[1].split(".").length === 3 ? Response.json({ access_token: "ya29.x", expires_in: 3600 }) : Response.json({ error: "bad" }, { status: 400 }); }
  if (u.startsWith("https://searchconsole.googleapis.com/")) { gscCalls++; return Response.json(body.dimensions.length ? { rows: [{ keys: ["physio noosa"], clicks: 31, impressions: 940, position: 6.4 }] } : { rows: [{ clicks: 120, impressions: 5400, position: 11.24 }] }); }
  if (u.startsWith("https://www.googleapis.com/webmasters/v3/sites")) return Response.json({ siteEntry: [{ siteUrl: "sc-domain:harbourphysio.com.au", permissionLevel: "siteRestrictedUser" }] });
  if (u.includes("api.telegram.org")) return Response.json({ ok: true });
  return Response.json({ ok: true }); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const base = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const call = async (env, path, b) => { const r = await w.fetch(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }); return { s: r.status, j: await r.json() }; };

let x = await call(base, "/rankings");
assert(x.j.ok && x.j.connected.tracker === false && x.j.connected.search_console === false, "With no keys, Rankings shows how to connect both sources");
x = await call(base, "/rankings/quick", { domain: "harbourphysio.com.au", keyword: "physio noosa" });
assert(x.s === 400 && /DATAFORSEO_LOGIN/.test(x.j.error), "A check without the tracker says which keys to add");

const env = { ...base, DATAFORSEO_LOGIN: "ty@example.com", DATAFORSEO_PASSWORD: "pw" };
x = await call(env, "/rankings/track", { label: "Harbour Physio", domain: "https://www.harbourphysio.com.au/", location: "Noosa Heads QLD", keywords: "physio noosa\nsports physio noosa" });
assert(x.j.ok && x.j.item.domain === "harbourphysio.com.au" && x.j.item.keywords.length === 2, "Track a business with its website and keywords");
const id = x.j.item.id;
x = await call(env, "/rankings/check", { id });
assert(x.j.ok && x.j.results.length === 2 && x.j.results[0].organic === 7 && x.j.results[0].maps === 2 && x.j.results[0].local_pack === 3, "Check now finds them #7 on Google, #2 on Google Maps, #3 in the map pack");
assert(dfs[0].task.location_name === "Noosa Heads,Queensland,Australia" && dfs[0].auth === "Basic " + btoa("ty@example.com:pw"), "Suburbs like 'Noosa Heads QLD' are turned into Google's location names, with the account's login");
assert(x.j.results[0].top[0].domain === "noosaphysio.com.au" && x.j.results[0].ai_overview === true, "It also shows who's on top and whether Google shows an AI answer");
x = await call(env, "/rankings");
const it = x.j.items[0];
assert(it.last.length === 2 && it.trend["physio noosa"].length === 1 && x.j.spend.usd > 0, "Rankings remembers each check and the month's spend");

x = await call(env, "/rankings/quick", { domain: "harbourphysio.com.au", keyword: "physio", location: "Nowhereville" });
assert(x.j.ok && dfs.some((d) => d.task.keyword === "physio Nowhereville" && d.task.location_name === "Australia"), "An unknown suburb falls back to searching Australia with the suburb in the search");
x = await call(env, "/rankings/quick", { domain: "harbourphysio.com.au", keyword: "physio noosa", location: "Noosa Heads QLD", prospect_id: "p1" });
assert(x.j.ok && /#7 on Google, #2 on Google Maps/.test(x.j.line), "A quick check reads like a sentence: " + x.j.line);
x = await call(env, "/calls");
const card = (x.j.calls || []).find((c) => c.id === "p1");
assert(card && card.rank && /#7 on Google/.test(card.rank.line), "The prospect's call card shows where they rank");

const capped = { ...env, RANK_MONTHLY_USD: "0.001" };
x = await call(capped, "/rankings/quick", { domain: "harbourphysio.com.au", keyword: "physio noosa" });
assert(x.s === 400 && /budget/.test(x.j.error), "Checks stop at the monthly spend cap");

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const genv = { ...env, GSC_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "command@studio.iam.gserviceaccount.com", private_key: privateKey }) };
x = await call(genv, "/rankings");
assert(x.j.connected.search_console && x.j.connected.service_email === "command@studio.iam.gserviceaccount.com", "Search Console shows the email to add as a user on each site");
x = await call(genv, "/rankings/gsc-sites");
assert(x.j.ok && x.j.sites[0].site === "sc-domain:harbourphysio.com.au", "It lists the sites it can see (signs in with the service account)");
x = await call(genv, "/rankings/gsc?site=" + encodeURIComponent("sc-domain:harbourphysio.com.au"));
assert(x.j.ok && x.j.report.clicks === 120 && x.j.report.position === 11.2 && x.j.report.queries[0].query === "physio noosa", "Search Console gives real clicks, times shown and average position per search");

const js = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
assert(js.includes("VIEWS.rankings") && js.includes('["rankings", "Google rankings"]') && js.includes("data-rank="), "Clients has a Google rankings screen, and call cards have a rank check button");
assert(js.includes("INST_OFF.add('rankings')"), "Client copies don't show Studio's rankings screen");
