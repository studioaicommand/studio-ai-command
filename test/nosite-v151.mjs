// v151 No-website finder (20 a day): Google profiles with no website, published-email check, call list for the rest,
// the "website + front desk + CRM + automatic Google reviews" email for Ty's approval; and the cold-email pitch switch
// (Growth Pack or Studio Command with the live demo).
import { readFileSync } from "node:fs";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [], team_actions: [], agent_prospects: [], team_memory: [], team_audit: [], team_usage: [] }; let seq = 0;
const val = (r, k) => r[k] == null ? "" : String(r[k]);
const one = (r, part) => { const i = part.indexOf("="); if (i < 0) return true; const k = part.slice(0, i), v = part.slice(i + 1); if (["select", "limit", "order", "offset", "on_conflict"].includes(k)) return true; let m;
  if ((m = v.match(/^eq\.(.*)$/))) return val(r, k) === m[1]; if ((m = v.match(/^in\.\((.*)\)$/))) return m[1].split(",").includes(val(r, k)); if (v === "is.null") return r[k] == null; if (v === "not.is.null") return r[k] != null; if ((m = v.match(/^gte\.(.*)$/))) return val(r, k) >= m[1]; return true; };
const places = [
  { id: "pl1", displayName: { text: "Coastal Barber Co" }, nationalPhoneNumber: "0400 111 222", rating: 4.9, userRatingCount: 87, businessStatus: "OPERATIONAL", googleMapsUri: "https://maps.google.com/?cid=1", primaryTypeDisplayName: { text: "Barber shop" }, formattedAddress: "1 Main St, Noosa Heads QLD" },
  { id: "pl2", displayName: { text: "Fade Masters" }, nationalPhoneNumber: "0400 333 444", rating: 4.7, userRatingCount: 40, businessStatus: "OPERATIONAL", websiteUri: "https://www.facebook.com/fademasters", formattedAddress: "2 Main St, Noosa" },
  { id: "pl3", displayName: { text: "Sharp Cuts Studio" }, nationalPhoneNumber: "0400 555 666", rating: 4.8, userRatingCount: 12, businessStatus: "OPERATIONAL", websiteUri: "https://sharpcuts.com.au", formattedAddress: "3 Main St, Noosa" },
  { id: "pl4", displayName: { text: "Old Barber" }, nationalPhoneNumber: "0400 777 888", businessStatus: "CLOSED_PERMANENTLY", formattedAddress: "4 Main St, Noosa" },
  { id: "pl5", displayName: { text: "Island Trims" }, nationalPhoneNumber: "0400 999 000", rating: 4.5, userRatingCount: 22, businessStatus: "OPERATIONAL", formattedAddress: "5 Main St, Noosa" },
  { id: "pl7", displayName: { text: "Bobs Plumbing" }, nationalPhoneNumber: "0400 131 313", rating: 4.4, userRatingCount: 30, businessStatus: "OPERATIONAL", websiteUri: "http://www.bobsplumb.com.au/", formattedAddress: "7 Main St, Noosa" },
  { id: "pl8", displayName: { text: "Jessicas Beauty Room" }, nationalPhoneNumber: "0400 141 414", rating: 4.9, userRatingCount: 55, businessStatus: "OPERATIONAL", websiteUri: "http://www.deadsalon.com.au/", formattedAddress: "8 Main St, Noosa" },
  { id: "pl9", displayName: { text: "Absolute Drains" }, nationalPhoneNumber: "0400 151 515", rating: 4.7, userRatingCount: 70, businessStatus: "OPERATIONAL", websiteUri: "http://absolutedrains.com.au/", formattedAddress: "9 Main St, Noosa" },
  { id: "pl6", displayName: { text: "Retro Hair Design" }, nationalPhoneNumber: "0400 121 212", rating: 4.6, userRatingCount: 64, businessStatus: "OPERATIONAL", websiteUri: "http://www.retrohair.com.au/", formattedAddress: "6 Main St, Noosa" }
];
const contact = { "Coastal Barber Co": { email: "bookings@coastalbarber.com.au", email_source_url: "https://www.yellowpages.com.au/qld/noosa/coastal-barber-co", website: null, facebook: "https://facebook.com/coastalbarberco", about: "Classic cuts and hot towel shaves in Noosa since 2015.", owner_name: "Jake Morris", services: ["Haircuts", "Beard trims"] },
  "Fade Masters": { email: "fade@gmail.com", email_source_url: "https://www.facebook.com/fademasters", website: null, about: "Fades." },
  "Island Trims": { email: "hi@islandtrims.com.au", email_source_url: "https://www.hotfrog.com.au/island-trims", website: null, about: "Barber." } };
const draft = { subject: "A homepage for Coastal Barber Co", body: "Hi Jake, 87 five star reviews on Google is something most barbers would love. People who find you there have nowhere to see your services or book, so I made a homepage concept from your Google profile. It comes with a front desk that answers every call and message, a simple CRM, and automatic Google review requests. Worth a free 30 minute call?\n\nTy", follow_up_1: "Hi Jake, one more thought on reviews.", follow_up_2: "Hi Jake, I'll leave it here.", opener: "Hi Jake, it's Ty." };
let anth = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = JSON.parse(init.body); } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const parts = decodeURIComponent(qs).split("&"); const ok = (r) => parts.every((p) => one(r, p));
    if (m === "GET") return Response.json(t.filter(ok));
    if (m === "POST") { const rows = [].concat(body || []).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const hit = t.filter(ok); for (const r of hit) Object.assign(r, body); return Response.json(hit); }
    return Response.json([]); }
  if (u.startsWith("https://places.googleapis.com/v1/places:searchText")) return Response.json({ places });
  if (u.includes("api.anthropic.com")) {
    anth.push(body);
    const tool = (body.tool_choice && body.tool_choice.name) || (body.tools || []).map((t) => t.name).find((n) => ["save_contact", "write_email", "save_businesses"].includes(n));
    const text = JSON.stringify(body.messages);
    let input = {};
    if (tool === "save_contact") { const name = Object.keys(contact).find((n) => text.includes(n)); input = contact[name] || { email: null, email_source_url: null, website: name === "Sharp Cuts Studio" ? "https://sharpcuts.com.au" : null, about: "A barber." }; }
    if (tool === "write_email") input = draft;
    return Response.json({ content: [{ type: "tool_use", id: "t1", name: tool, input }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } });
  }
  if (u.startsWith("https://www.yellowpages.com.au/")) return new Response("<html><h1>Coastal Barber Co</h1><p>Email: bookings&#64;coastalbarber.com.au</p></html>", { status: 200, headers: { "content-type": "text/html" } });
  if (u.startsWith("https://www.hotfrog.com.au/")) return new Response("<html><h1>Some other business</h1><p>hi@islandtrims.com.au</p></html>", { status: 200, headers: { "content-type": "text/html" } });
  if (u.startsWith("https://www.facebook.com/")) return new Response("Log in to Facebook", { status: 200, headers: { "content-type": "text/html" } });
  if (u.startsWith("https://sharpcuts.com.au")) return new Response('<html><head><meta name="viewport" content="width=device-width"><meta name="description" content="x"></head><body><h1>Sharp Cuts</h1>© 2026 <a>Book now</a></body></html>', { status: 200, headers: { "content-type": "text/html" } });
  if (/retrohair\.com\.au/.test(u)) return new Response('<html><head><title>Retro Hair Design</title></head><body><table width="800"><tr><td><h1>Retro Hair Design</h1>Email us: info@retrohair.com.au<br>© 2014 Retro Hair Design</td></tr></table></body></html>', { status: 200, headers: { "content-type": "text/html" } });
  if (u.includes("cloudflare-dns.com") && u.includes("deadsalon")) return Response.json({ Status: 3 });
  if (/bobsplumb\.com\.au/.test(u)) return new Response('<html><head><meta name="viewport" content="width=device-width"></head><body><h1>Buy this domain</h1>This domain is for sale.</body></html>', { status: 200, headers: { "content-type": "text/html" } });
  if (/absolutedrains\.com\.au/.test(u)) return new Response('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="generator" content="WordPress 4.9.26"></head><body><h1>Absolute Drains</h1>Email: jobs@absolutedrains.com.au user@domain.com</body></html>', { status: 200, headers: { "content-type": "text/html" } });
  if (u.includes("cloudflare-dns.com")) return Response.json({ Status: 0, Answer: [{ type: 15, data: "10 mx.example.com." }] });
  return Response.json({ ok: true }); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O, GOOGLE_PLACES_KEY: "gp" };
const call = async (path, b, e = env) => { const r = await w.fetch(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), e, { waitUntil() {} }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

let x = await call("/nosite");
assert(x.j.ok && x.j.cfg.daily === 20 && x.j.cfg.on === true && x.j.source === "google_places", "The no-website finder is on by default, 20 a day, using Google Maps results");
x = await call("/nosite/run", { vertical: "beauty", city: "Noosa", count: 8 });
const R = x.j.round;
assert(x.j.ok && /Noosa/.test(R.query) && R.seen === 9, "It searches Google for one of our industries in an area: " + R.query);
assert(R.no_website === 5 && R.outdated === 2 && R.dead_sites === 2 && R.modern_sites_skipped === 1 && !DB.agent_prospects.some((p) => p.business_name === "Sharp Cuts Studio" || p.business_name === "Old Barber"), "Modern websites and closed businesses are left out; a Facebook page doesn't count as a website");
const rh = DB.agent_prospects.find((p) => p.business_name === "Retro Hair Design");
const bob = DB.agent_prospects.find((p) => p.business_name === "Bobs Plumbing"), jess = DB.agent_prospects.find((p) => p.business_name === "Jessicas Beauty Room"), abs = DB.agent_prospects.find((p) => p.business_name === "Absolute Drains");
assert(bob && bob.website === null && bob.leak_report.nosite.kind === "dead" && /for sale/.test(bob.leak_report.nosite.dead) && jess && jess.leak_report.nosite.kind === "dead" && /no longer exists/.test(jess.leak_report.nosite.dead), "A listed website that's gone (domain expired, or now for sale) counts as no website, with the reason saved");
assert(abs && abs.source === "outdated_site" && abs.leak_report.nosite.outdated.why.some((w) => /old web technology/.test(w)) && abs.email === "jobs@absolutedrains.com.au", "A phone-friendly site on 2018-era WordPress still counts as outdated, and placeholder emails like user@domain.com are ignored");
assert(rh && rh.source === "outdated_site" && /retrohair\.com\.au$/.test(rh.website) && rh.leak_report.nosite.kind === "outdated" && rh.leak_report.nosite.outdated.why.some((w) => /not mobile-friendly/.test(w)) && rh.leak_report.nosite.outdated.why.some((w) => /2014/.test(w)), "A really outdated site (not mobile-friendly, copyright 2014) is kept, with exactly what's dated");
assert(rh.email === "info@retrohair.com.au" && /retrohair\.com\.au/.test(rh.email_source_url) && rh.leak_report.nosite.stage === "needs_concept" && /phone/.test(rh.opener), "Its email comes from their own website, and the call opener mentions how it looks on a phone");
const cb = DB.agent_prospects.find((p) => p.business_name === "Coastal Barber Co"), fm = DB.agent_prospects.find((p) => p.business_name === "Fade Masters"), it = DB.agent_prospects.find((p) => p.business_name === "Island Trims");
assert(cb && cb.email === "bookings@coastalbarber.com.au" && /^Published by the business on yellowpages\.com\.au/.test(cb.consent_basis) && cb.leak_report.nosite.stage === "needs_concept", "An email the business published is kept once Command sees it on that page (even written as &#64;)");
assert(fm && fm.email === null && fm.leak_report.nosite.stage === "call_only", "An email Command can't see on the page (Facebook needs a login) isn't used: they go on the call list");
assert(it && it.email === null, "An email on a page that isn't about this business isn't used");
assert(cb.source === "no_website" && cb.website === null && cb.phone && cb.decision_maker === "Jake Morris" && cb.leak_report.nosite.facebook && /no website/.test(cb.leak_report.nosite.profile), "Each one is saved with phone, owner, Facebook and their Google profile for the homepage concept");
x = await call("/nosite/run", { vertical: "beauty", city: "Noosa", count: 8 });
assert(x.j.round.saved === 0, "Running it again doesn't add the same businesses twice");

// Homepage concept from their Google profile, then the draft, then the approval queue
const before = DB.team_actions.length;
x = await call("/nosite/finish", { id: cb.id });
const draftCall = anth.find((b) => (b.tools || []).some((t) => t.name === "write_email"));
const sys = JSON.stringify(draftCall && draftCall.system);
assert(draftCall && /build their website for them/.test(sys) && /front desk that answers every call/.test(sys) && /CRM/.test(sys) && /automatic Google review requests/.test(sys) && /No prices/.test(sys), "The email offers the package: website built for them, front desk, CRM and automatic Google review requests (no prices)");
const act = DB.team_actions.slice(before).find((a) => a.type === "campaign_enrol");
assert(/\/demo\/[0-9a-f]{40}\/site$/.test(x.j.concept_url) && act && act.params.body.includes(x.j.concept_url) && anth.some((b) => (b.tools || []).some((t) => t.name === "save_site_design")), "A homepage concept is built from their Google profile (no website needed) and linked under the email");
assert(x.j.ok && act && act.status === "pending" && act.params.email === "bookings@coastalbarber.com.au" && /Published by the business on/.test(act.params.consent_basis || cb.consent_basis), "The email waits for Ty's approval like all cold outreach");
assert(DB.agent_prospects.find((p) => p.id === cb.id).leak_report.nosite.stage === "queued" && DB.agent_prospects.find((p) => p.id === cb.id).status === "queued", "The business shows as waiting for Ty's OK");
x = await call("/nosite/finish", { id: rh.id });
const draft2 = anth.filter((b) => (b.tools || []).some((t) => t.name === "write_email")).pop();
const sys2 = JSON.stringify(draft2.system), msg2 = JSON.stringify(draft2.messages);
assert(/REALLY OUTDATED WEBSITE/.test(sys2) && /rebuild their website/.test(sys2) && /ONLY the confirmed_website_problems/.test(sys2) && /not mobile-friendly/.test(msg2), "Outdated sites get the rebuild offer, naming only the problems Command confirmed");
assert(x.j.ok && DB.team_actions.some((a) => a.type === "campaign_enrol" && a.params.business_name === "Retro Hair Design" && a.status === "pending"), "Its email passes the published-email check (on their own site) and waits for Ty's OK");
x = await call("/nosite/finish", { id: fm.id });
assert(x.j.call_only && !DB.team_actions.some((a) => a.params?.business_name === "Fade Masters"), "No published email: no email is ever queued, they stay on the call list");

// The safety gate itself
DB.agent_prospects.push({ id: "pX", business_name: "Guess Co", vertical: "beauty", source: "no_website", website: null, email: "owner@guessco.com.au", email_source_url: null, consent_basis: null, status: "to_send", email_subject: "Hi", email_body: "Hello there, this is a test body that is long enough.", leak_report: { scan_version: 0 } });
x = await call("/prospects/pX/queue", {});
assert(!DB.team_actions.some((a) => a.params?.business_name === "Guess Co"), "A no-website business without a checked, published email can't be emailed");

x = await call("/nosite");
assert(x.j.today.found === 7 && x.j.today.emails === 3 && x.j.items.find((i) => i.business === "Retro Hair Design").kind === "outdated" && x.j.items.length >= 3 && x.j.items.find((i) => i.business === "Coastal Barber Co").stage === "queued", "Outreach shows today's count and each business's stage");
x = await call("/nosite/settings", { daily: 25, concepts: 5, cities: ["Noosa", "Maroochydore"], verticals: ["beauty", "trades", "nonsense"] });
assert(x.j.cfg.daily === 25 && x.j.cfg.concepts === 5 && x.j.cfg.verticals.join() === "beauty,trades" && x.j.cfg.cities.length === 2, "Ty can change how many a day, concepts a day, areas and industries");

// Without a Places key it falls back to web search
const noKey = { ...env, GOOGLE_PLACES_KEY: "" };
x = await call("/nosite", undefined, noKey);
assert(x.j.source === "web_search", "Without a Google Places key it searches the web instead (and says so)");

// Pitch switch
x = await call("/outreach/daily");
assert(x.j.cfg.pitch === "growth_pack" && x.j.pitches.some((p) => p.id === "command") && /\/command-demo$/.test(x.j.command_demo), "Outreach can sell the Growth Pack (default) or Studio Command with the live demo");
x = await call("/outreach/daily", { pitch: "command" });
assert(x.j.cfg.pitch === "command", "Ty can switch cold emails to sell Studio Command");
const src = readFileSync(W, "utf8");
assert(/THIS CAMPAIGN SELLS STUDIO COMMAND/.test(src) && /job\.pitch === "command" (\|\| job\.pitch === "front_desk" )?\? outCommandDemo\(env\)/.test(src) && /pitch = OUT_PITCHES\[pitch\] \? pitch : \(await outCfg/.test(src), "Command campaign emails get the Command offer and the live demo link under email 1");
assert(/\["No-website finder", out\(ai\(\(\) => noSiteStep\(e\)\)\)/.test(src) && /var ACQUIRE = \["find_no_website_businesses"/.test(src) && /"privacy_wording",\s*"find_no_website_businesses"/.test(src), "It runs every day by itself, and Studio AI and Sales can run it on request");
const app = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
assert(app.includes("BUSINESSES WITH NO WEBSITE") && app.includes("What the cold emails sell") && app.includes("name=\"orPitch\""), "Outreach shows the no-website panel and the pitch switch");
