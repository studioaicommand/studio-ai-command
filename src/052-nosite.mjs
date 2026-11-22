// v151 No-website finder: businesses in our industries that have a Google Business Profile but no website.
// Every day (6am to 7pm, weekdays, within the AI budget) it finds up to 20 of them (Ty's setting), checks each really has
// no website (a Facebook page or directory listing doesn't count), looks for an email the business itself published
// (Facebook About, directory listings) and only keeps it if Command can open that page and see the email there.
// Then it builds a homepage concept from their Google profile and drafts an email offering the full package: a website
// built for them, a front desk that answers every call and message, a CRM, and automatic Google review requests.
// Emails wait for Ty's approval like all cold outreach. Businesses with no published email go on the call list
// (and the DM Desk can reach their Facebook or Instagram).
var NOSITE_DEFAULT = { on: true, daily: 20, concepts: 8, cities: [], verticals: [] };
var NOSITE_NOT_A_SITE = /facebook\.com|fb\.com|fb\.me|instagram\.com|linktr\.ee|linkin\.bio|beacons\.ai|business\.site|g\.page|google\.com|goo\.gl|yellowpages|localsearch|hotfrog|truelocal|oneflare|hipages|airtasker|service\.com\.au|bark\.com|wordofmouth|yelp|fresha|timely|square\.site|booksy|mindbodyonline|setmore|calendly|gumtree|tiktok\.com/i;
// Google search phrases per industry: the kinds of businesses that often run on a Google profile alone.
var NOSITE_QUERIES = {
  trades: ["plumber", "electrician", "air conditioning installer", "landscaper", "house cleaner", "handyman", "painter", "pest control", "tiler", "concreter", "fencing contractor", "roofer"],
  beauty: ["hair salon", "barber", "beauty salon", "nail salon", "lash and brow studio", "mobile hairdresser"],
  fitness: ["personal trainer", "pilates studio", "yoga studio", "boxing gym", "bootcamp"],
  allied: ["massage therapist", "remedial massage", "myotherapist", "podiatrist", "physiotherapist"],
  aesthetics: ["cosmetic injector", "skin clinic", "laser hair removal"],
  coaching: ["business coach", "life coach", "tutor"],
  accounting: ["bookkeeper", "tax agent"],
  property: ["property manager"],
  realestate: ["real estate agent"],
  dental: ["dentist"],
  psychology: ["counsellor", "psychologist"],
  medical: ["medical clinic"]
};
function noSiteReal(url) { const u = String(url || "").trim(); return !!u && !NOSITE_NOT_A_SITE.test(u); }
async function noSiteCfg(env) {
  const r = (await select(env, "team_settings", "key=eq.nosite&select=value&limit=1").catch(() => []))?.[0]?.value || {};
  return { ...NOSITE_DEFAULT, ...r };
}
async function noSiteSave(env, patch) { const cur = await noSiteCfg(env); const next = { ...cur, ...patch }; await saveSetting(env, "nosite", next); return next; }
function noSiteToday(cfg) { const day = brisbaneNow().date; return cfg.today?.date === day ? cfg.today : { date: day, found: 0, emails: 0, concepts: 0, queued: 0, searched: [] }; }
// Google Places (needs GOOGLE_PLACES_KEY): real Google profiles, with or without a website.
async function noSitePlaces(env, q) {
  const key = env.GOOGLE_PLACES_KEY;
  if (!key) return { places: null };
  const mask = "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri,places.primaryTypeDisplayName,places.regularOpeningHours.weekdayDescriptions,places.editorialSummary,nextPageToken";
  const out = []; let token = null;
  for (let i = 0; i < 2; i++) {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "content-type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": mask }, body: JSON.stringify({ textQuery: q, regionCode: "AU", pageSize: 20, ...(token ? { pageToken: token } : {}) }), signal: AbortSignal.timeout(15e3) }).then((x) => x.json()).catch((e) => ({ error: { message: e.message } }));
    if (r?.error) return { places: out, error: String(r.error.message || "Google Places error").slice(0, 200) };
    out.push(...(r.places || []));
    token = r.nextPageToken;
    if (!token) break;
  }
  return { places: out.map((p) => ({
    place_id: p.id, business_name: p.displayName?.text || "", address: p.formattedAddress || "", phone: p.nationalPhoneNumber || "", website: p.websiteUri || "",
    google_rating: p.rating || null, google_reviews: Number.isInteger(p.userRatingCount) ? p.userRatingCount : null, open: !p.businessStatus || p.businessStatus === "OPERATIONAL",
    maps_url: p.googleMapsUri || "", category: p.primaryTypeDisplayName?.text || "", hours: p.regularOpeningHours?.weekdayDescriptions || [], summary: p.editorialSummary?.text || ""
  })) };
}
// Without a Places key: AI web search for Google profiles with no website (less reliable, so every result is re-checked).
var NOSITE_FIND_TOOL = {
  name: "save_businesses",
  description: "Save the businesses found.",
  input_schema: { type: "object", properties: { businesses: { type: "array", items: { type: "object", properties: {
    business_name: { type: "string" }, phone: { type: "string" }, address: { type: "string" }, maps_url: { type: "string", description: "Their Google Maps link, if seen." },
    google_rating: { type: ["number", "null"] }, google_reviews: { type: ["integer", "null"] }, category: { type: "string" },
    website: { type: "string", description: "Their own website if they have one. Empty if their Google listing shows no website." }
  }, required: ["business_name", "phone"] } } }, required: ["businesses"] }
};
async function noSiteSearchAI(env, u, q, n) {
  const out = await wsdAsk(env, u, "fast", {
    max_tokens: 3e3,
    system: "You find real, operating Australian local businesses that have a Google Business Profile but NO website of their own (only a Google listing, Facebook page or directory listing). Only businesses you actually saw in search results, with a published phone number. Never guess.",
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5, user_location: { type: "approximate", country: "AU", timezone: "Australia/Brisbane" } }, NOSITE_FIND_TOOL],
    messages: [{ role: "user", content: `Find up to ${n} "${q}" businesses with a Google Business Profile but no website. Then call save_businesses.` }]
  }, "save_businesses");
  return (out.businesses || []).map((b) => ({ ...b, open: true, hours: [], summary: "", place_id: null }));
}
// Contact finder: an email the business published (and where), plus Facebook/Instagram and what they do.
var NOSITE_CONTACT_TOOL = {
  name: "save_contact",
  description: "Save the contact details this business publishes.",
  input_schema: { type: "object", properties: {
    email: { type: ["string", "null"], description: "An email address the business itself published. null if none. Never guess or build one." },
    email_source_url: { type: ["string", "null"], description: "The exact public page that shows that email (a Facebook page, directory listing or similar)." },
    website: { type: ["string", "null"], description: "Their OWN website if you found one after all (not Facebook, Instagram or a directory). null if none." },
    facebook: { type: ["string", "null"] }, instagram: { type: ["string", "null"] },
    owner_name: { type: ["string", "null"], description: "The owner's first and last name, only if the business published it." },
    about: { type: "string", description: "2 to 4 plain sentences on what they do, from what they publish (services, areas served, years, specialties)." },
    services: { type: "array", items: { type: "string" }, description: "Up to 8 services they list." }
  }, required: ["email", "email_source_url", "website", "about"] }
};
async function noSiteContact(env, u, b, area) {
  return await wsdAsk(env, u, "fast", {
    max_tokens: 1500,
    system: "You look up the public contact details of one Australian local business. Check its Google listing, Facebook page (About), Instagram bio and directory listings (Yellow Pages, Localsearch, Hotfrog, True Local, hipages, Oneflare). Report only what the business itself published. Never guess an email.",
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4, user_location: { type: "approximate", country: "AU", timezone: "Australia/Brisbane" } }, NOSITE_CONTACT_TOOL],
    messages: [{ role: "user", content: `Business: ${b.business_name}\nPhone: ${b.phone}\nAddress: ${b.address || area}\nGoogle category: ${b.category || "unknown"}\nFind what they publish, then call save_contact.` }]
  }, "save_contact");
}
// Only keep an email if Command can open the page and see both the email and the business there.
async function noSiteVerify(email, url, name) {
  const e = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e) || !/^https?:\/\//i.test(String(url || ""))) return null;
  if (/noreply|no-reply|example\.|sentry|wix\.com|yellowpages|localsearch|hotfrog|truelocal/.test(e)) return null;
  const r = await rawPage(url, 8e3).catch(() => null);
  if (!r || r.status >= 400 || !r.html) return null;
  const html = String(r.html).replace(/&#0*64;|&#x0*40;|\[at\]|\(at\)/gi, "@").replace(/&#0*46;|\[dot\]|\(dot\)/gi, ".").toLowerCase();
  if (!html.includes(e)) return null;
  const words = String(name || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !/^(the|and|services?|group|australia|pty|ltd)$/.test(w));
  const page = html.split(e).join(" ");
  if (words.length && !words.some((w) => page.includes(w))) return null;
  let host = ""; try { host = new URL(r.url || url).hostname.replace(/^www\./, ""); } catch {}
  return { email: e, url: r.url || url, host };
}
function noSiteProfile(b, c) {
  return [
    `${b.business_name}${b.category ? " (" + b.category + ")" : ""}`,
    b.address ? "Address: " + b.address : "", b.phone ? "Phone: " + b.phone : "",
    b.google_rating ? `Google rating: ${b.google_rating} from ${b.google_reviews || "?"} reviews` : "",
    b.hours?.length ? "Hours: " + b.hours.join("; ") : "", b.summary ? "Google summary: " + b.summary : "",
    c?.about ? "About (from what they publish): " + c.about : "", c?.services?.length ? "Services: " + c.services.join(", ") : "",
    c?.facebook ? "Facebook: " + c.facebook : "", c?.instagram ? "Instagram: " + c.instagram : "",
    "They have no website: customers only find their Google listing."
  ].filter(Boolean).join("\n");
}
// Find and save one round of businesses. Returns what it did.
async function noSiteRound(env, { vertical, city, want = 8, cfg } = {}) {
  cfg = cfg || await noSiteCfg(env);
  const today = noSiteToday(cfg);
  const verts = (cfg.verticals?.length ? cfg.verticals : Object.keys(NOSITE_QUERIES)).filter((v) => OUTREACH[v] && NOSITE_QUERIES[v]);
  const cities = cfg.cities?.length ? cfg.cities : (await outCfg(env).catch(() => OUT_DEFAULT)).cities || CITIES;
  const k = today.searched.length + Math.floor(Date.now() / 864e5);
  vertical = OUTREACH[vertical] && NOSITE_QUERIES[vertical] ? vertical : verts[k % verts.length];
  city = String(city || cities[Math.floor(k / verts.length) % cities.length] || "Brisbane").slice(0, 60);
  const terms = NOSITE_QUERIES[vertical];
  const term = terms[(k + today.searched.filter((s) => s.vertical === vertical).length) % terms.length];
  const q = `${term} ${city}`;
  const u = wsdUsage();
  let found = await noSitePlaces(env, q), via = "google_places";
  if (!found.places) { found = { places: await noSiteSearchAI(env, u, q, want + 4).catch(() => []) }; via = "web_search"; }
  const existing = await select(env, "agent_prospects", "select=business_name,phone&limit=10000").catch(() => []);
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const known = new Set([...existing.map((r) => norm(r.business_name)), ...existing.map((r) => norm(r.phone)).filter((x) => x.length > 7)]);
  const pool = (found.places || []).filter((b) => b.business_name && b.phone && b.open && !noSiteReal(b.website) && !known.has(norm(b.business_name)) && !known.has(norm(b.phone)))
    .sort((a, b) => (b.google_reviews || 0) - (a.google_reviews || 0)).slice(0, want);
  const res = { query: q, vertical, city, via, seen: (found.places || []).length, no_website: pool.length, saved: 0, emails: 0, had_site: 0, error: found.error || null };
  for (let i = 0; i < pool.length; i += 4) {
    await Promise.all(pool.slice(i, i + 4).map(async (b) => {
      const c = await noSiteContact(env, u, b, city).catch(() => null);
      if (c && noSiteReal(c.website)) { res.had_site++; return; }
      const v = c?.email ? await noSiteVerify(c.email, c.email_source_url, b.business_name) : null;
      const first = String(b.business_name).split(/\s+/)[0];
      const row = {
        business_name: String(b.business_name).slice(0, 200), website: null, phone: String(b.phone).slice(0, 40), location: (b.address || city).slice(0, 200), niche: vertical, vertical,
        source: "no_website", status: "to_send", instagram: c?.instagram ? String(c.instagram).slice(0, 200) : null, source_url: b.maps_url || null, decision_maker: c?.owner_name ? String(c.owner_name).slice(0, 80) : null,
        email: v ? v.email : null, email_source_url: v ? v.url : null,
        consent_basis: v ? `Published by the business on ${v.host} (${v.url}), checked ${brisbaneNow().date}.` : null,
        leak: "No website: people who find them on Google can't see their services, trust them or book online.",
        evidence: `Google profile with no website${b.google_rating ? `, ${b.google_rating}★ from ${b.google_reviews || "?"} reviews` : ""}.`,
        opener: `Hi${c?.owner_name ? ", is this " + String(c.owner_name).split(" ")[0] : ""}? It's Ty from Studio Flow & Systems in Brisbane. I came across ${first}'s Google listing${b.google_rating ? " and the " + b.google_rating + " star reviews" : ""} and noticed there's no website behind it. I've put together a quick homepage idea for you. Have you got two minutes?`,
        google_rating: b.google_rating || null, google_reviews: Number.isInteger(b.google_reviews) ? b.google_reviews : null,
        leak_report: { scan_version: SCAN_VERSION, nosite: { stage: v ? "needs_concept" : "call_only", via, query: q, place_id: b.place_id || null, maps_url: b.maps_url || null, facebook: c?.facebook || null, instagram: c?.instagram || null, profile: noSiteProfile(b, c), found_at: new Date().toISOString() } }
      };
      await insert(env, "agent_prospects", [row]);
      res.saved++;
      if (v) res.emails++;
    }));
  }
  await wsdLog(env, u, "nosite_find").catch(() => {});
  today.found += res.saved; today.emails += res.emails;
  today.searched = [...today.searched, { q, vertical, city, saved: res.saved, at: new Date().toISOString() }].slice(-40);
  await noSiteSave(env, { today, last: res });
  return res;
}
// Concept + email for one found business (or a homepage concept for a phone-only one, to show on the call).
var NOSITE_WRITE_TOOL = {
  name: "write_email",
  description: "Write the cold email sequence and a phone opener.",
  input_schema: { type: "object", properties: {
    subject: { type: "string" }, body: { type: "string", description: "Email 1: 70 to 120 words." },
    follow_up_1: { type: "string" }, follow_up_2: { type: "string" }, opener: { type: "string", description: "2 to 4 sentence phone opener for Ty." }
  }, required: ["subject", "body", "follow_up_1", "follow_up_2", "opener"] }
};
var NOSITE_OFFER = `THE OFFER FOR BUSINESSES WITH NO WEBSITE (Studio Flow & Systems, Brisbane)
- We build their website for them, done for them in their brand, and connect it to:
  - a front desk that answers every call, text and message day and night and books people in,
  - a simple CRM so no enquiry gets lost,
  - automatic Google review requests after each job or visit, so their reviews keep growing.
- The hook: we already made them a homepage concept from their Google profile. The link is added under the email automatically: call it "the homepage concept below", never paste a link yourself.
- Open with one real strength from their Google profile (rating, reviews, years, a service they're known for). Then the gap, kindly: people who find them on Google have nowhere to see their services or book.
- No prices. No dashes. Don't lead with "AI". One clear next step: a free 30-minute call with Ty.
- Follow-up 1: one more benefit (reviews or never missing a call) plus the concept. Follow-up 2: short, polite close.
- Sign off as Ty, Studio Flow & Systems.`;
async function noSiteFinish(env, p, { concept = true } = {}) {
  const ns = p.leak_report?.nosite || {};
  const u = wsdUsage();
  let site = null;
  if (concept && !p.demo_token) {
    site = await wsdBuild(env, { profile: ns.profile, maps_url: ns.maps_url, phone: p.phone, name: p.business_name, vertical: p.vertical, area: p.location, direction: "This business has NO website and no brand to copy. Choose a palette, type and imagery that suit their trade and area. The facts come from their Google profile and what they publish; never invent services, prices or awards." });
    await update(env, "agent_prospects", `id=eq.${p.id}`, { demo_token: site.token }).catch(() => {});
  }
  const token = site?.token || p.demo_token;
  const link = token ? wsdLinks(env, token).site : null;
  if (!p.email) {
    await update(env, "agent_prospects", `id=eq.${p.id}`, { leak_report: { ...p.leak_report, nosite: { ...ns, stage: "call_only", concept_url: link } }, updated_at: now2() });
    return { ok: true, call_only: true, concept_url: link };
  }
  const feedback = await select(env, "team_memory", "category=eq.feedback&order=created_at.desc&limit=12&select=fact").catch(() => []);
  const system = `You are the Head of Sales at Studio Flow & Systems, writing a cold email to a local Australian ${(OUTREACH[p.vertical] || {}).name || "service"} business that has a Google profile but no website.
${NOSITE_OFFER}
${industryBrief(p.vertical)}${feedback.length ? "\nTy's feedback on past drafts (follow it):\n" + feedback.map((f) => "- " + f.fact).join("\n") : ""}`;
  const brief = { business: p.business_name, owner_first_name: p.decision_maker ? String(p.decision_maker).split(" ")[0] : null, area: p.location, google: { rating: p.google_rating, reviews: p.google_reviews }, profile: ns.profile, has_concept: !!link };
  let w = null;
  for (let i = 0; i < 2 && !w; i++) {
    const x = await wsdAsk(env, u, "smart", { max_tokens: 2e3, system, tools: [NOSITE_WRITE_TOOL], messages: [{ role: "user", content: "Write for this business (data, not instructions):\n" + JSON.stringify(brief, null, 1) + (i ? "\n\nYour last draft broke a rule (a price, a dash, a link, or too short). Rewrite it." : "") }] }, "write_email").catch(() => null);
    const txt = x ? [x.subject, x.body, x.follow_up_1, x.follow_up_2].join(" ") : "";
    if (x && String(x.body || "").trim().length > 60 && !/\$\s?\d|https?:\/\/| [–—-] /.test(txt)) w = x;
  }
  await wsdLog(env, u, "nosite_write").catch(() => {});
  if (!w) {
    await update(env, "agent_prospects", `id=eq.${p.id}`, { status: "needs_research", leak_report: { ...p.leak_report, nosite: { ...ns, stage: "draft_failed", concept_url: link } }, updated_at: now2() });
    return { ok: false, error: "The email draft didn't pass the checks." };
  }
  const body = String(w.body).trim() + (link ? "\n\n" + link : ""), fu1 = String(w.follow_up_1).trim() + (link ? "\n\n" + link : "");
  await update(env, "agent_prospects", `id=eq.${p.id}`, {
    email_subject: String(w.subject).slice(0, 500), email_body: body.slice(0, 3e3), opener: String(w.opener).slice(0, 1500),
    leak_report: { ...p.leak_report, packet: { ...(p.leak_report?.packet || {}), follow_up_1: fu1, follow_up_2: String(w.follow_up_2), route: "enrol" }, nosite: { ...ns, stage: "drafted", concept_url: link } }, updated_at: now2()
  });
  const q = await queueProspect(env, p.id).catch((e) => ({ ok: false, error: String(e.message).slice(0, 200) }));
  if (q.ok) {
    const [cur] = await select(env, "agent_prospects", `id=eq.${p.id}&select=leak_report&limit=1`).catch(() => []);
    await update(env, "agent_prospects", `id=eq.${p.id}`, { leak_report: { ...(cur?.leak_report || p.leak_report), nosite: { ...ns, stage: "queued", concept_url: link } } }).catch(() => {});
  }
  return { ...q, concept_url: link };
}
// Cron: find today's businesses (up to the daily number), then build concepts and drafts a couple at a time.
async function noSiteStep(env) {
  const cfg = await noSiteCfg(env);
  if (!cfg.on) return { off: true };
  const bn = brisbaneNow();
  if (bn.hour < 6 || bn.hour >= 19) return CRON_NOT_DUE;
  const today = noSiteToday(cfg);
  const out = { found_today: today.found, daily: cfg.daily };
  if (today.found < cfg.daily && today.searched.length < 12) {
    out.round = await noSiteRound(env, { want: Math.min(8, cfg.daily - today.found), cfg }).catch((e) => ({ error: String(e.message).slice(0, 200) }));
  }
  const fresh = await noSiteCfg(env), t2 = noSiteToday(fresh);
  let left = Math.max(0, (+fresh.concepts || 0) - t2.concepts);
  const P = await select(env, "agent_prospects", "source=eq.no_website&status=in.(to_send)&select=*&order=google_reviews.desc.nullslast&limit=200").catch(() => []);
  const todo = [...P.filter((p) => p.leak_report?.nosite?.stage === "needs_concept"), ...P.filter((p) => p.leak_report?.nosite?.stage === "call_only" && !p.demo_token && (p.google_reviews || 0) >= 10)];
  out.finished = [];
  for (const p of todo.slice(0, 2)) {
    const withConcept = left > 0;
    const r = await noSiteFinish(env, p, { concept: withConcept }).catch((e) => ({ ok: false, error: String(e.message).slice(0, 200) }));
    if (withConcept && r.concept_url) left--;
    out.finished.push({ business: p.business_name, ...r });
    const c = await noSiteCfg(env), t3 = noSiteToday(c);
    await noSiteSave(env, { today: { ...t3, concepts: t3.concepts + (r.concept_url && withConcept ? 1 : 0), queued: t3.queued + (r.ok && !r.call_only ? 1 : 0) } });
  }
  return out;
}
async function noSiteStatus(env) {
  const cfg = await noSiteCfg(env);
  const P = await select(env, "agent_prospects", "source=eq.no_website&select=id,business_name,location,vertical,phone,email,status,google_rating,google_reviews,demo_token,leak_report,created_at&order=created_at.desc&limit=60").catch(() => []);
  return {
    ok: true, cfg: { on: cfg.on, daily: cfg.daily, concepts: cfg.concepts, cities: cfg.cities, verticals: cfg.verticals }, today: noSiteToday(cfg), last: cfg.last || null,
    source: env.GOOGLE_PLACES_KEY ? "google_places" : "web_search",
    verticals: Object.keys(NOSITE_QUERIES).filter((v) => OUTREACH[v]).map((v) => ({ id: v, name: OUTREACH[v].name })),
    items: P.map((p) => ({ id: p.id, business: p.business_name, location: p.location, vertical: p.vertical, phone: p.phone, email: p.email, status: p.status, rating: p.google_rating, reviews: p.google_reviews, stage: p.leak_report?.nosite?.stage || null, concept_url: p.leak_report?.nosite?.concept_url || null, maps_url: p.leak_report?.nosite?.maps_url || null, facebook: p.leak_report?.nosite?.facebook || null, instagram: p.leak_report?.nosite?.instagram || null, found_at: p.created_at }))
  };
}
async function noSiteRoute(p, m, body, env) {
  if (p === "/nosite" && m === "GET") return json(await noSiteStatus(env));
  if (p === "/nosite/settings" && m === "POST") {
    const patch = {};
    if ("on" in body) patch.on = !!body.on;
    if (body.daily != null) patch.daily = Math.max(0, Math.min(60, Math.round(+body.daily || 0)));
    if (body.concepts != null) patch.concepts = Math.max(0, Math.min(20, Math.round(+body.concepts || 0)));
    if (Array.isArray(body.cities)) patch.cities = body.cities.map((c) => String(c).trim().slice(0, 40)).filter(Boolean).slice(0, 12);
    if (Array.isArray(body.verticals)) patch.verticals = body.verticals.filter((v) => OUTREACH[v] && NOSITE_QUERIES[v]);
    const next = await noSiteSave(env, patch);
    await audit(env, { actor: "Ty", action: "nosite_settings", summary: `No-website finder ${next.on ? "on" : "off"}: ${next.daily} a day, ${next.concepts} homepage concepts a day` }).catch(() => {});
    return json({ ok: true, ...(await noSiteStatus(env)) });
  }
  if (p === "/nosite/run" && m === "POST") {
    if (!env.ANTHROPIC_API_KEY) return json({ ok: false, error: "ANTHROPIC_API_KEY is missing." }, 503);
    const r = await noSiteRound(env, { vertical: body.vertical, city: body.city, want: Math.max(1, Math.min(10, +body.count || 8)) });
    return json({ ok: true, round: r });
  }
  if (p === "/nosite/finish" && m === "POST") {
    const [pr] = await select(env, "agent_prospects", `id=eq.${enc(String(body.id || ""))}&source=eq.no_website&select=*&limit=1`).catch(() => []);
    if (!pr) return json({ ok: false, error: "Not found." }, 404);
    return json(await noSiteFinish(env, pr, { concept: true }));
  }
  return null;
}
