// src/team/hunt.js
var OUTREACH = {
  allied: { name: "Allied health", label: "allied health clinics (physiotherapy, chiropractic, osteopathy, podiatry, myotherapy, exercise physiology)", tag: "sf-health-allied", target: 40, weekly: 12, health: true, who: "patients", place: "clinic", fit: "3+ practitioners, 2+ locations or 50+ Google reviews", skip: "solo practitioners, franchise head offices, hospitals", angle: "patients who enquire after hours or reach voicemail book somewhere else; reception is buried in calls, rebookings and admin" },
  dental: { name: "Dental", label: "dental clinics", tag: "sf-health-dental", target: 20, weekly: 8, health: true, who: "patients", place: "clinic", fit: "3+ dentists or hygienists, 2+ locations or 50+ Google reviews", skip: "solo dentists, corporate dental chains' head offices, hospitals", angle: "new-patient enquiries and emergency calls missed while the front desk is busy; recalls and treatment plans that never get followed up" },
  aesthetics: { name: "Aesthetics", label: "aesthetics, cosmetic and skin clinics", tag: "sf-health-aesthetics", target: 15, weekly: 5, health: true, who: "clients", place: "clinic", fit: "2+ injectors or therapists, 2+ locations or 50+ Google reviews", skip: "solo home-based therapists, product-only shops", angle: "Instagram DMs and enquiries answered hours later, consult requests that go cold, rebooking left to chance" },
  psychology: { name: "Psychology", label: "psychology and counselling practices", tag: "sf-health-psychology", target: 10, weekly: 3, health: true, off: true, who: "clients", place: "practice", fit: "3+ psychologists or counsellors, 2+ locations", skip: "solo practitioners, hospitals, government services", angle: "intake enquiries waiting days for a reply, waitlists managed by hand, admin eating clinical time" },
  medical: { name: "Medical / GP", label: "GP and medical clinics", tag: "sf-health-medical", target: 10, weekly: 3, health: true, off: true, who: "patients", place: "clinic", fit: "4+ doctors, 2+ locations or 100+ Google reviews", skip: "hospitals, corporate head offices, solo GPs", angle: "phones ringing out at opening time, simple questions taking reception away from patients" },
  property: { name: "Property management", label: "property management agencies (residential rentals)", tag: "sf-property-management", target: 25, weekly: 5, who: "tenants, owners and landlords", place: "agency", fit: "300+ rentals under management, a dedicated property management team or 2+ offices", skip: "sales-only real estate agents, solo property managers, franchise head offices", angle: "maintenance requests, tenant questions and owner updates piling up; slow replies lose landlords to other agencies" },
  trades: { name: "Trades & services", label: "established trade and home-service businesses (plumbing, electrical, air conditioning, roofing, solar, pest control, cleaning, landscaping, building and renovation)", tag: "sf-trades-services", target: 30, weekly: 8, who: "customers", place: "business", fit: "5+ staff or vans, several service areas or 50+ Google reviews, a quote or booking form on the site", skip: "sole traders, lead-generation directories, franchise head offices", angle: "calls missed while the team is on the tools; quote requests never followed up; jobs lost to whoever answers first" },
  coaching: { name: "Coaches & consultants", label: "established coaches, consultants and training businesses (business coaches, health and performance coaches, consultancies, course and program businesses with a team)", tag: "sf-coaching-consulting", target: 20, weekly: 5, who: "clients", place: "business", fit: "a team or real volume: group programs, a discovery-call funnel, 30+ reviews or testimonials", skip: "brand-new solo coaches with no clients, MLM, influencers with no service", angle: "discovery-call leads going cold; DMs and enquiries answered hours later; onboarding and follow-up done by hand" },
  fitness: { name: "Fitness & gyms", label: "gyms, fitness studios, personal training, pilates and yoga studios", tag: "sf-fitness", target: 20, weekly: 5, off: true, social: true, who: "members and clients", place: "studio", fit: "a studio or gym with a team, class timetable or 50+ Google reviews", skip: "solo online trainers with no studio, franchise head offices", angle: "trial and class enquiries answered late, new members not followed up, no-shows never rebooked" },
  beauty: { name: "Beauty & hair", label: "hair salons, barbers, beauty, lash, brow and nail salons, day spas", tag: "sf-beauty-hair", target: 20, weekly: 5, off: true, social: true, who: "clients", place: "salon", fit: "2+ stylists or therapists, online booking or 50+ Google reviews", skip: "home-based solo operators with no booking system, product-only shops", angle: "Instagram DMs and calls missed while everyone is with a client, gaps in the book, clients who never rebook" },
  realestate: { name: "Real estate", label: "real estate agencies and sales agents", tag: "sf-real-estate", target: 20, weekly: 5, off: true, social: true, who: "buyers, sellers and landlords", place: "agency", fit: "an agency or team with active listings and 30+ reviews", skip: "national franchise head offices, property portals", angle: "buyer and appraisal enquiries answered late, open-home leads never followed up, sellers going to whoever calls back first" },
  accounting: { name: "Accountants & bookkeepers", label: "accounting, tax and bookkeeping firms", tag: "sf-accounting", target: 15, weekly: 4, off: true, social: true, who: "clients", place: "firm", fit: "2+ accountants or bookkeepers, small-business clients, 20+ reviews", skip: "big-four and national firms, solo tax agents with no website", angle: "new-client enquiries waiting days, document chasing by email, the busy season swamping the phones" },
  legal: { name: "Law firms", label: "law firms and lawyers (family, property, wills and estates, business, injury)", tag: "sf-legal", target: 15, weekly: 4, off: true, social: true, who: "clients", place: "firm", fit: "2+ lawyers, a website enquiry form or 20+ reviews", skip: "national firms, barristers' chambers, legal aid", angle: "new-matter enquiries going to voicemail, slow first replies, intake done by hand. Never give legal advice in any message" },
  hospitality: { name: "Hospitality", label: "restaurants, cafes, bars, function and event venues", tag: "sf-hospitality", target: 15, weekly: 4, off: true, social: true, who: "guests", place: "venue", fit: "an established venue with bookings or functions and 100+ Google reviews", skip: "chains run by a head office, food trucks with no bookings", angle: "booking and function enquiries missed during service, DMs answered days later, group bookings going elsewhere" },
  multi: { name: "Multi-location", label: "multi-location service businesses (3+ locations under one brand: clinic groups, gyms and studios, salons, vet clinics, childcare, owner-run service franchises)", tag: "sf-multi-location", target: 20, weekly: 5, who: "customers", place: "business", fit: "3+ locations under one brand and one website, owner or regional manager still reachable", skip: "national chains run by a corporate head office, franchise HQs", angle: "enquiries spread across locations with nobody owning the follow-up; every site answering differently; owners can't see what's leaking" },
};
var ALL_V = Object.keys(OUTREACH);
var OUTREACH_DEFAULT_ON = ALL_V.filter((v) => !OUTREACH[v].off);
function outreachOn(settings) {
  const on = settings?.outreach?.on;
  const list = Array.isArray(on) ? on.filter((v) => OUTREACH[v]) : OUTREACH_DEFAULT_ON;
  return list.length ? list : OUTREACH_DEFAULT_ON;
}
var HEALTH = ["allied", "dental", "aesthetics"];
var LABEL = Object.fromEntries(ALL_V.map((v) => [v, OUTREACH[v].label]));
var CITIES = ["Brisbane", "Gold Coast", "Sydney", "Sunshine Coast", "Melbourne", "Perth", "Adelaide", "Newcastle", "Canberra"];
var OFF_TARGET = /plumb|electric|roof|build|construct|carpent|landscap|pest|clean|concret|paint|tiling|fencing|mechanic|real estate|property|law|account/i;
var BATCH = 5;
var now2 = () => (/* @__PURE__ */ new Date()).toISOString();
var domainOf = (u) => {
  try {
    return new URL(/^https?:/i.test(u) ? u : "https://" + u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};
function publishedEmail({ email, website, scanEmails = [], sourceUrl }) {
  const site = domainOf(website);
  const found = scanEmails.map((e2) => String(e2).toLowerCase());
  const e = String(email || "").trim().toLowerCase();
  if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    const d = e.split("@")[1];
    if (found.includes(e)) return { email: e, source: "found on their website", url: website };
    if (site && (d === site || d.endsWith("." + site) || site.endsWith("." + d))) return { email: e, source: "on the clinic's own domain", url: sourceUrl || website };
    if (sourceUrl && domainOf(sourceUrl) === site) return { email: e, source: "published on their site", url: sourceUrl };
  }
  const own = found.find((x) => x.split("@")[1] === site) || found.find((x) => !/noreply|no-reply|example|wix|sentry/.test(x));
  return own ? { email: own, source: "found on their website", url: website } : null;
}
// v96 bounce guard
var MX_CACHE = new Map();
async function mailServerOk(domain) {
  domain = String(domain || "").toLowerCase().replace(/^.*@/, "").trim();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return false;
  if (MX_CACHE.has(domain)) return MX_CACHE.get(domain);
  let ok = true;
  try {
    const r = await fetch("https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(domain) + "&type=MX", { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5e3) });
    const d = await r.json();
    if (d.Status === 3) ok = false; // the domain doesn't exist
    else if (d.Status === 0) { const mx = (d.Answer || []).filter((a) => a.type === 15); ok = mx.length > 0 && !mx.every((a) => /^0\s+\.?$/.test(String(a.data).trim())); }
  } catch (e) { ok = true; } // DNS lookup failed: don't block on our own hiccup
  MX_CACHE.set(domain, ok);
  return ok;
}
var EMAIL_TYPO = /@(gmial|gamil|gmai|gnail|hotmial|hotmal|outlok|yahooo|iclod)\.|\.(con|cmo|comm|ocm)$/i;
async function bounceGate(env, email) {
  email = String(email || "").trim().toLowerCase();
  if (EMAIL_TYPO.test(email)) return "Not enrolled: " + email + " looks like a typo, so it would bounce.";
  const st = await emailStatsGet(env).catch(() => null);
  if (st && (st.recent || []).some((x) => x.event === "bounced" && String(x.email || "").toLowerCase() === email)) return "Not enrolled: " + email + " has bounced before.";
  if (!(await mailServerOk(email))) return "Not enrolled: " + email.split("@")[1] + " has no working mail server, so the email would bounce. Call them instead.";
  const v = await mailboxCheck(env, email);
  if (v && v.verdict === "bad") return "Not enrolled: the email checker says " + email + " " + v.why + ", so it would bounce. Call them instead.";
  return null;
}
// v152 optional mailbox check before anything is enrolled. Uses MILLIONVERIFIER_KEY or ZEROBOUNCE_KEY if Ty adds one
// (a few dollars a month at our volume). Without a key, the free checks above still run. Results are kept for 90 days.
async function mailboxCheck(env, email) {
  const mv = env.MILLIONVERIFIER_KEY, zb = env.ZEROBOUNCE_KEY;
  if (!mv && !zb) return null;
  const cache = (await linkGet(env, "mailbox_checks").catch(() => null)) || {};
  const hit = cache[email];
  if (hit && Date.now() - Date.parse(hit.at) < 90 * 864e5) return hit;
  let raw = "";
  try {
    if (mv) { const r = await fetch("https://api.millionverifier.com/api/v3/?api=" + encodeURIComponent(mv) + "&email=" + encodeURIComponent(email) + "&timeout=10", { signal: AbortSignal.timeout(15e3) }); const d = await r.json(); raw = String(d.result || d.error || "").toLowerCase(); }
    else { const r = await fetch("https://api.zerobounce.net/v2/validate?api_key=" + encodeURIComponent(zb) + "&email=" + encodeURIComponent(email), { signal: AbortSignal.timeout(15e3) }); const d = await r.json(); raw = String(d.status || d.error || "").toLowerCase(); }
  } catch (e) { return null; } // the checker being down never blocks an email the free checks passed
  const BAD = { invalid: "doesn't exist", disposable: "is a throwaway address", spamtrap: "is a spam trap", abuse: "belongs to someone who reports email as spam", do_not_mail: "shouldn't be emailed" };
  const verdict = BAD[raw.replace(/[\s-]/g, "_")] ? "bad" : /^(ok|valid)$/.test(raw) ? "good" : raw ? "risky" : null;
  if (!verdict) return null;
  const out = { at: new Date().toISOString(), verdict, result: raw, why: BAD[raw.replace(/[\s-]/g, "_")] || "" };
  const keys = Object.keys(cache).slice(-1500);
  await saveSetting(env, "mailbox_checks", { ...Object.fromEntries(keys.map((k) => [k, cache[k]])), [email]: out }).catch(() => {});
  return out;
}
async function bounceBrake(env) {
  const st = await emailStatsGet(env).catch(() => null);
  if (!st) return null;
  const now = new Date(Date.now() + 10 * 36e5), days = [];
  for (let i = 0; i < 7; i++) days.push(new Date(now - i * 864e5).toISOString().slice(0, 10));
  const bounces = days.reduce((n, d) => n + ((st.days || {})[d]?.bounced || 0), 0);
  if (bounces < 3) return null;
  // v152 bounces this week come from email 1 AND the follow-ups, which go to people enrolled up to 3 weeks ago.
  // Count emails actually sent: delivered + bounced events this week, or (if GHL doesn't report deliveries) 3 emails per contact enrolled in the last 21 days.
  const since = new Date(Date.now() - 21 * 864e5).toISOString();
  const enrolled = (await select(env, "team_actions", `type=eq.campaign_enrol&status=eq.done&created_at=gte.${since}&select=id&limit=3000`).catch(() => [])).length;
  const delivered = days.reduce((n, d) => n + ((st.days || {})[d]?.delivered || 0), 0);
  const sent = Math.max(delivered + bounces, enrolled * 3);
  const rate = bounces / Math.max(sent, 1);
  if (rate < 0.05) return null;
  const msg = "Outreach is on hold: " + bounces + " bounces from about " + sent + " emails sent this week (" + Math.round(rate * 100) + "%). GHL warns at 3% and suspends email at 5%. Clean the list before more go out; held emails send themselves when the rate is back under 5%.";
  const ns = (await linkGet(env, "notify_state").catch(() => null)) || {};
  const day = now.toISOString().slice(0, 10);
  if (ns.bounce_brake !== day) { await saveSetting(env, "notify_state", { ...ns, bounce_brake: day }).catch(() => {}); await notify(env, "\u{1F6D1} <b>Bounce brake</b>\n" + esc6(msg), { urgent: true }).catch(() => {}); }
  return msg;
}
async function enrolCheck(env, p) {
  if (!OUTREACH[p.vertical]) return `Not enrolled: "${p.vertical || "no industry"}" isn't a campaign industry (${ALL_V.join(", ")}). Fix the industry or skip it.`;
  let pr = null;
  if (p.prospect_id) [pr] = await select(env, "agent_prospects", `id=eq.${enc(p.prospect_id)}&select=website,email_source_url,source,consent_basis,status,leak_report&limit=1`).catch(() => []);
  if (pr?.leak_report && pr.leak_report.scan_version !== SCAN_VERSION) return "Not enrolled: this draft was written from the old website scanner. Run Re-scan in Growth \u2192 Prospects, then approve the new draft.";
  if (pr?.status === "do_not_contact") return "Not enrolled: this business is marked Do Not Contact.";
  const website = pr?.website || p.website;
  if (pr?.source === "manual_import" && (pr.consent_basis || p.consent_basis)) return null;
  if (/^Given by/i.test(pr?.consent_basis || "") && pr?.email_source_url === "given on call") return null;
  // v151 no-website businesses: the email must be one Command saw published by the business on a public page (Facebook, a directory listing)
  if (!website && pr?.source === "no_website") {
    if (!pr.email_source_url || !/^Published by the business on /.test(pr.consent_basis || "")) return "Not enrolled: no published email on file for this business. Call them or message them on Facebook instead.";
    const bg = await bounceGate(env, p.email); if (bg) return bg;
    return null;
  }
  if (!website) return "Not enrolled: no website on file, so the email can't be checked as published. Add the website or call them instead.";
  const ok = publishedEmail({ email: p.email, website, sourceUrl: pr?.email_source_url || p.evidence_url });
  if (!ok || ok.email !== String(p.email || "").trim().toLowerCase()) return `Not enrolled: ${p.email || "no email"} isn't published on ${domainOf(website)} (or its domain). Phone-only clinics go to Calls today instead.`;
  { const bg = await bounceGate(env, p.email); if (bg) return bg; }
  return null;
}
async function jobs(env) {
  return (await getSettings(env)).hunts || [];
}
async function saveJob(env, job) {
  const list = (await jobs(env)).filter((j) => j.id !== job.id);
  list.unshift({ ...job, updated_at: now2() });
  await saveSetting(env, "hunts", list.slice(0, 6));
}
async function pickVertical(env, settings, avoid) {
  const c = campaignConfig(settings);
  const rows = await select(env, "agent_prospects", "select=vertical,created_at&limit=5000").catch(() => []);
  const on = outreachOn(settings);
  const have = Object.fromEntries(on.map((v) => [v, rows.filter((r) => r.vertical === v).length]));
  // v105: no main niche: the switched-on industry with the fewest prospects goes next
  const order = on.map((v) => ({ v, n: have[v] || 0 })).sort((a, b) => a.n - b.n).map((x) => x.v);
  return order.find((v) => v !== avoid) || order[0];
}
var CANDIDATE_TOOL = {
  name: "submit_candidates",
  description: "Submit the businesses you found. Call it ONCE at the end.",
  input_schema: {
    type: "object",
    properties: {
      clinics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            business_name: { type: "string" },
            website: { type: "string", description: "The business's OWN website (not a directory)." },
            vertical: { type: "string", enum: ALL_V },
            location: { type: "string", description: "Suburb, city" },
            phone: { type: "string" },
            email: { type: "string", description: "Only if you saw it published by the clinic." },
            email_source_url: { type: "string" },
            google_rating: { type: "number" },
            google_reviews: { type: "integer" },
            locations: { type: "integer", description: "Number of locations if shown." },
            practitioners: { type: "integer", description: "Team size (practitioners, staff or technicians on their team page), if shown." },
            why_fit: { type: "string", description: "Size and demand signals you saw: team, locations, reviews, busy booking." }
          },
          required: ["business_name", "website", "vertical"]
        }
      }
    },
    required: ["clinics"]
  }
};
async function startHunt(env, { vertical, city, count: count2 = 15, source = "prospect_hunt", pitch, given, note } = {}) {
  const settings = await getSettings(env);
  // v152 businesses Ty names himself (a screenshot, a link): no search, straight into the same research, concept, email and approval steps
  if (Array.isArray(given) && given.length) return startGiven(env, { given, vertical, city, pitch, note });
  const recent = (settings.hunts || []).find((j) => Date.now() - Date.parse(j.started_at || 0) < 12 * 36e5);
  vertical = OUTREACH[vertical] ? vertical : await pickVertical(env, settings, recent?.vertical);
  const IND = OUTREACH[vertical];
  const n = Math.max(3, Math.min(15, Math.round(+count2 || 10)));
  if (!city) {
    const used = (settings.hunts || []).map((j) => j.city);
    city = CITIES.find((c) => !used.slice(0, 2).includes(c)) || "Brisbane";
  }
  city = String(city).slice(0, 60);
  const existing = await select(env, "agent_prospects", "select=website,business_name&limit=5000").catch(() => []);
  const knownSites = new Set(existing.map((r) => siteKey(r.website)).filter(Boolean));
  // v151 what the cold emails sell: the Growth Pack (default) or Studio Command with the live demo
  pitch = OUT_PITCHES[pitch] ? pitch : (await outCfg(env).catch(() => ({}))).pitch || "growth_pack";
  const job = { id: crypto.randomUUID(), vertical, city, count: n, source, pitch, status: "searching", started_at: now2(), candidates: [], done: 0, results: { saved: 0, queued: 0, call_only: 0, skipped: [], errors: [] }, report_id: null };
  await saveJob(env, job);
  const usage = emptyUsage();
  const model2 = env.TEAM_MODEL || MODEL;
  const avoid = existing.filter((r) => r.business_name).slice(0, 60).map((r) => r.business_name).join("; ");
  const convo = [{ role: "user", content: `Find ${n + 3} ESTABLISHED ${LABEL[vertical]} in or near ${city}, Australia, for B2B outreach.
Prefer established businesses (${IND.fit}); smaller ones are OK if they show strong demand (great reviews, busy, growing). Note team size and locations. Skip ${IND.skip}, and anything that isn't one of: ${IND.label}.
Use web_search. For each business give its OWN website, phone, and (only if you saw it published by the business) its email and the page it's on. Also include a few businesses that have NO website at all (only a Google Business Profile or directory listing): leave website empty for those and give their phone and Google rating. Note the Google rating and review count when shown. Set vertical to "${vertical}" for every result.
Already in our list (skip these): ${avoid || "none"}.
Then call submit_candidates once. Don't write anything else.` }];
  let clinics = null, err = null;
  for (let i = 0; i < 6 && !clinics; i++) {
    let data;
    try {
      data = await callClaude(env, { model: model2, max_tokens: 6e3, system: "You research established Australian service businesses (" + IND.name + ") for Studio Flow & Systems' outreach. Only real businesses you found in search results. Never guess emails.", tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8, user_location: { type: "approximate", country: "AU", timezone: "Australia/Brisbane" } }, CANDIDATE_TOOL], messages: convo, ...i >= 4 ? { tool_choice: { type: "tool", name: "submit_candidates" } } : {} });
    } catch (e) {
      err = String(e.message).slice(0, 300);
      break;
    }
    addUsage(usage, data.usage);
    const last = convo[convo.length - 1];
    if (last.role === "assistant") last.content = [...last.content, ...data.content || []];
    else convo.push({ role: "assistant", content: data.content || [] });
    const call2 = (data.content || []).find((b) => b.type === "tool_use" && b.name === "submit_candidates");
    if (call2) {
      clinics = call2.input?.clinics || [];
      break;
    }
    if (data.stop_reason === "pause_turn") continue;
    convo.push({ role: "user", content: [{ type: "text", text: "Now call submit_candidates with what you found." }] });
  }
  await logUsage(env, settings, { department: "head_of_sales", source, model: model2, usage }).catch(() => {
  });
  if (!clinics) {
    job.status = "failed";
    job.results.errors.push({ where: "search", error: err || "The search didn't return a list of businesses." });
    await saveJob(env, job);
    return job;
  }
  const seen = /* @__PURE__ */ new Set();
  for (const c of clinics) {
    const key = siteKey(c.website || "");
    if (!key && c.phone && c.business_name) { await outNoSite(env, c, vertical, city, job).catch(() => {}); continue; }
    const why = !key ? "no website" : knownSites.has(key) ? "already in prospects" : seen.has(key) ? "duplicate" : c.vertical && c.vertical !== vertical && !OUTREACH[c.vertical] ? "not a target industry" : IND.health && OFF_TARGET.test(c.business_name + " " + key) ? "doesn't look like a clinic" : vertical === "property" && /\bsales only\b|buyers? agent/i.test(c.business_name) ? "sales-only agency" : null;
    if (why) {
      job.results.skipped.push({ name: c.business_name, why });
      continue;
    }
    seen.add(key);
    if (job.candidates.length < n) job.candidates.push({ ...c, website: key, vertical, state: "pending" });
  }
  job.status = job.candidates.length ? "running" : "done";
  await saveJob(env, job);
  if (!job.candidates.length) await finishHunt(env, job);
  return job;
}
var WRITE_TOOL = {
  name: "write_outreach",
  description: "Write the research notes and 3 emails for each clinic.",
  input_schema: {
    type: "object",
    properties: {
      clinics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            website: { type: "string" },
            leak: { type: "string", description: "The single biggest gap, plain words." },
            evidence: { type: "string", description: "What the scan saw (observation, not assumption)." },
            opener: { type: "string", description: "2\u20134 sentence phone opener for Ty." },
            score: { type: "integer", description: "1\u201310 fit." },
            fit_notes: { type: "string", description: "One or two lines: why this clinic fits (or doesn't) our ideal client." },
            subject: { type: "string" },
            body: { type: "string", description: "Email 01: 60\u2013120 words." },
            follow_up_1: { type: "string" },
            follow_up_2: { type: "string" }
          },
          required: ["website", "leak", "evidence", "opener", "score", "subject", "body", "follow_up_1", "follow_up_2"]
        }
      }
    },
    required: ["clinics"]
  }
};
var EMAIL_RULES = `PREMIUM POSITIONING (Studio Flow & Systems)
- We are the premium choice: senior, local, design-led, and we build the systems behind the website too. Never sound cheap, desperate or salesy. No discounts in cold emails, no prices.
- Lead with what we already made for THEM (their Growth Pack: where enquiries slip, a homepage concept in their brand, a front desk that answers every enquiry), then one clear, easy next step: a free 30-minute call with Ty.
- Every claim must come from their own research (scan, Google position, reviews). Specific beats clever.
- Compliment one real strength first (reviews, years in business, a great service). Owners buy from people who noticed them.
WORDS (cold outreach): never lead with "AI", "AI receptionist" or "chatbot". Many owners are wary of AI. Say what it does: "a front desk that answers every enquiry, day and night", "never miss an enquiry", "replies in under a minute and books them in". If they ask how it works, be honest that it runs on AI, says so if asked, and hands anything tricky to their team.
PACK-FIRST (when the business has pack_url): we already put together a Growth Pack for them: where enquiries slip (their leak report, plus the response time result if response_check is given), a homepage concept in their own brand (only if has_site is true) and a front desk that answers their customers day and night, built from their own website. That is the offer.
  EMAIL 01 (70\u2013120 words): start "Hi [first name]," or "Hi [business] team,"; one line that shows we looked (a strength, or a confirmed finding such as where they show up on Google, or the response_check result); say you put together a few things for [business] and name the pieces in plain words; include pack_url exactly as given on its own line; finish with one easy question (e.g. worth a look?). No prices. No sign-off (the template adds Ty's signature).
  FOLLOW_UP_1 (40\u201380 words): make ONE piece concrete: a question their customers ask that the front desk answers (from demo_can_answer, quoted naturally), or the biggest finding from the report; include pack_url again; one easy question. No sign-off, no "just following up".
  FOLLOW_UP_2 (30\u201360 words): close the loop politely with a yes/no question, and offer to take it all down if it isn't useful. No sign-off.
  PHONE OPENER: say you put together a few things for them (where enquiries are slipping, a homepage concept in their brand, a front desk that never misses an enquiry) and ask for the best email to send them to.
Otherwise:
STYLE: helpful, local, specific, outcome-focused. Talk about outcomes the reader cares about (more enquiries turned into booked appointments, fewer missed calls, less admin for reception; for property managers: faster maintenance triage, fewer chased tenants and owners), never percentages, dollar promises or ROI claims. No hype words (revolutionise, game-changer, skyrocket). Australian English.
FACTS: only use findings marked "confirmed", in your own words (quoting the clinic's own website wording is great). Anything under never_claim must not be stated or implied. If they already have online booking or great reviews (strengths), acknowledge one strength briefly first: it shows we actually looked. If there are no confirmed findings, write about the general opportunity (instant replies to enquiries) as a question, without claiming anything about their clinic.
WITHOUT pack_url:
  EMAIL 01 (60\u2013120 words): start "Hi [first name]," or "Hi [business] team,"; one specific confirmed finding framed as something you noticed; one relevant question; then: "I put together a one-page Revenue Leak Review for [business] with what I found. Want me to send it over?" No links. No sign-off (the template adds Ty's signature).
  FOLLOW_UP_1 (40\u201380 words): a new angle from a second finding plus one fact framed as typical for businesses like theirs; one easy question. No sign-off, no "just following up".
  FOLLOW_UP_2 (30\u201360 words): close the loop politely with a yes/no question. No sign-off.
When a clinic has write_emails=false (no published email), leave subject, body and both follow-ups as empty strings and only write the research notes and phone opener.
("Clinic" above means whichever business you're writing to: use the right word for them: practice, agency, business, team.)`;
var HEALTH_RULES = "Health rules: no patient details, no clinical outcome promises, no testimonials (AHPRA).";
function industryBrief(v) {
  const I = OUTREACH[v] || OUTREACH.trades;
  return `INDUSTRY: ${I.name}. Their customers are ${I.who}. What usually hurts in a ${I.place} like theirs: ${I.angle}. Speak their language (say ${I.who}, not "patients", unless they're a health business).` + (I.health ? "\n" + HEALTH_RULES : "");
}
async function huntStep(env, id) {
  const settings = await getSettings(env);
  const job = (settings.hunts || []).find((j) => j.id === id);
  if (!job) throw new Error("Hunt not found.");
  if (job.status !== "running") return job;
  const batch = job.candidates.filter((c) => c.state === "pending").slice(0, BATCH);
  if (!batch.length) return finishHunt(env, job);
  const origin = env.PUBLIC_ORIGIN || DEFAULT_ORIGIN;
  const ready = [];
  const su = wsdUsage();
  await Promise.all(batch.map(async (c) => {
    try {
      const { rep, leak } = await leakScan({ env, url: c.website, vertical: c.vertical, google_rating: c.google_rating, google_reviews: c.google_reviews });
      if (leak.signals) {
        if (!c.locations && leak.signals.locations) c.locations = leak.signals.locations;
        if (!c.practitioners && leak.signals.practitioners) c.practitioners = leak.signals.practitioners;
        if (!c.google_reviews && leak.signals.reviews) {
          c.google_rating = leak.signals.reviews.rating;
          c.google_reviews = leak.signals.reviews.count;
        }
      }
      if (rep.ok === false) {
        c.state = "skipped";
        job.results.skipped.push({ name: c.business_name, why: "website didn't load" });
        return;
      }
      await outSearch(env, c, leak, su).catch(() => null);
      if (!job.manual && leak.search?.position && leak.search.position <= 3 && (leak.leak_score || 0) < 35) {
        c.state = "skipped";
        job.results.skipped.push({ name: c.business_name, why: `already #${leak.search.position} on Google with a sound site (not in pain)` });
        return;
      }
      const pub = publishedEmail({ email: c.email, website: c.website, scanEmails: rep.home?.emails || [], sourceUrl: c.email_source_url });
      const phone = c.phone || rep.home?.phones?.[0] || null;
      const row = { business_name: String(c.business_name).slice(0, 200), website: c.website, email: pub?.email || null, phone, location: c.location || job.city, niche: c.vertical, vertical: c.vertical, leak: leak.top[0]?.finding?.slice(0, 500) || "No clear website gaps confirmed.", evidence: leak.checks.filter((x) => x.confidence === "confirmed" && x.status !== "pass").map((x) => x.finding).join(" ").slice(0, 2e3) || ((leak.strengths || []).map((x) => x.finding).join(" ") || "Website looks solid.").slice(0, 2e3), opener: "", score: Math.max(1, Math.min(10, Math.round(leak.leak_score / 10))), source_url: c.website, updated_at: now2() };
      if (pub) {
        row.email_source_url = pub.url;
        row.consent_basis = `Business email ${pub.source} (${pub.url}); message relates to their business's operations.`;
      }
      const [saved] = await upsert(env, "agent_prospects", [row], "website");
      const extra = { leak_report: leak, leak_score: leak.leak_score, report_token: saved.report_token || crypto.randomUUID().replace(/-/g, "").slice(0, 22), source: "hunt" };
      if (c.google_rating) extra.google_rating = +c.google_rating;
      if (Number.isInteger(c.google_reviews)) extra.google_reviews = c.google_reviews;
      await update(env, "agent_prospects", `id=eq.${saved.id}`, extra).catch((e) => job.results.errors.push({ where: c.business_name, error: "leak report not saved (run the v10 database step): " + e.message.slice(0, 120) }));
      c.state = "scanned";
      c.prospect_id = saved.id;
      c.report_token = extra.report_token;
      c.leak_score = leak.leak_score;
      c.consent_basis = row.consent_basis;
      c.email_source_url = row.email_source_url;
      c.email = pub?.email || null;
      c.phone = phone;
      job.results.saved++;
      ready.push({ c, leak, rep, report_url: `${origin}/leak-report/${extra.report_token}` });
    } catch (e) {
      c.state = "error";
      job.results.errors.push({ where: c.business_name, error: String(e.message).slice(0, 200) });
    }
  }));
  if (su.fast.calls) await wsdLog(env, su, "outreach_search").catch(() => {});
  job.done = job.candidates.filter((c) => c.state !== "pending").length;
  await saveJob(env, job);
  if (ready.length) {
    const usage = emptyUsage(), model2 = env.TEAM_MODEL || MODEL;
    const feedback = await select(env, "team_memory", "category=eq.feedback&order=created_at.desc&limit=12&select=fact").catch(() => []);
    const system = `You are the Head of Sales at Studio Flow & Systems (Brisbane), writing outreach to established Australian ${(OUTREACH[job.vertical] || {}).name || "service"} businesses for Ty's GHL campaign. The offer behind it: their Growth Pack (where enquiries slip, a homepage concept in their brand, and a front desk that answers every enquiry in under a minute with missed-call text-back and follow-up until they book), and for bigger teams a command hub that runs the whole back office. Never promise ROI or quote prices.
${industryBrief(job.vertical)}${brainRulesText(await brainRules(env).catch(() => []), "outreach")}${await brainMarket(env, job.vertical).catch(() => "")}
${EMAIL_RULES}${outPitchText(env, job.pitch)}${job.manual ? "\nTy picked these businesses himself. Where a clinic has angle_from_ty, build the email around that angle, still only claiming what its research confirmed." : ""}${feedback.length ? "\nTy's feedback on past drafts (follow it):\n" + feedback.map((f) => "- " + f.fact).join("\n") : ""}`;
    await Promise.all(ready.map(async (r) => {
      const band = job.manual ? "high" : scoreProspect({ leak_score: r.leak.leak_score, google_rating: r.c.google_rating, google_reviews: r.c.google_reviews, locations: r.c.locations, practitioners: r.c.practitioners }).band;
      if (band === "low") return;
      try {
        r.demo = await buildDemo(env, { id: r.c.prospect_id, website: r.c.website, business_name: r.c.business_name, vertical: r.c.vertical, phone: r.c.phone }, { usage, settings });
      } catch (e) {
        job.results.errors.push({ where: `demo (${r.c.business_name})`, error: String(e.message).slice(0, 160) });
      }
    }));
    let siteLeft = Math.min(2, await outSiteLeft(env).catch(() => 0));
    for (const r of ready) {
      if (siteLeft <= 0) break;
      const band = job.manual ? "high" : scoreProspect({ leak_score: r.leak.leak_score, google_rating: r.c.google_rating, google_reviews: r.c.google_reviews, locations: r.c.locations, practitioners: r.c.practitioners }).band;
      if (band !== "high" || !r.c.email || !r.demo?.token) continue;
      try {
        r.site = await wsdBuild(env, { website: r.c.website, name: r.c.business_name, vertical: r.c.vertical, area: r.c.location || job.city, reuse: { demo: r.demo, scan: leakForAgent(r.rep, r.leak) } });
        siteLeft--;
      } catch (e) {
        job.results.errors.push({ where: `homepage concept (${r.c.business_name})`, error: String(e.message).slice(0, 160) });
      }
    }
    const briefOf = ({ c, leak, rep, demo, site }) => ({ ...(() => { const b = demoBrief(env, demo); return b ? { demo_can_answer: b.demo_can_answer, demo_highlight: b.demo_highlight } : {}; })(), ...(demo?.token && (demo.quality === "good" || site?.site) ? { pack_url: wsdLinks(env, demo.token).pack, has_site: !!site?.site, has_front_desk: demo.quality === "good" } : {}), ...(leak.search ? { search: { query: leak.search.query, position: leak.search.position, ahead: leak.search.ahead } } : {}), website: c.website, clinic: c.business_name, vertical: c.vertical, ...(c.note ? { angle_from_ty: c.note } : {}), location: c.location || job.city, google: c.google_rating ? `${c.google_rating}\u2605 (${c.google_reviews ?? "?"} reviews)` : null, locations: c.locations || null, practitioners: c.practitioners || null, leak_score: leak.leak_score, strengths: (leak.strengths || []).map((x) => x.finding), findings: leak.checks.filter((x) => (x.status === "fail" || x.status === "warn") && x.confidence === "confirmed").map((x) => `${x.label} (confirmed${x.angle ? `, angle: ${x.angle}` : ""}): ${x.finding}`), never_claim: leak.checks.filter((x) => x.confidence !== "confirmed").map((x) => `${x.label}: ${x.finding}`), write_emails: !!c.email, site_title: rep.home?.title || null, why_fit: c.why_fit || null });
    const write = async (items, fix) => {
      const data = await callClaude(env, { model: model2, max_tokens: 8e3, tools: [WRITE_TOOL], tool_choice: { type: "tool", name: "write_outreach" }, system, messages: [{ role: "user", content: "Write for these clinics (scan data below is from their public websites):\n" + JSON.stringify(items.map(briefOf), null, 1) + (fix ? "\n\n" + fix : "") }] });
      addUsage(usage, data.usage);
      let call2 = (data.content || []).find((b) => b.type === "tool_use");
      if (!call2) {
        const again = await callClaude(env, { model: model2, max_tokens: 8e3, tools: [WRITE_TOOL], system, messages: [{ role: "user", content: "Write for these clinics (scan data below is from their public websites):\n" + JSON.stringify(items.map(briefOf), null, 1) + (fix ? "\n\n" + fix : "") }, { role: "assistant", content: (data.content || []).filter((b) => b.type === "text").length ? data.content.filter((b) => b.type === "text") : [{ type: "text", text: "Drafting now." }] }, { role: "user", content: "Now call the write_outreach tool with those drafts. Use the tool, not text." }] });
        addUsage(usage, again.usage);
        call2 = (again.content || []).find((b) => b.type === "tool_use");
      }
      return call2?.input?.clinics || [];
    };
    const leakOf = new Map(ready.map((r) => [r.c, r.leak]));
    const valid = (w, c) => w && String(w.opener || "").trim().length > 10 && (!c?.email || ["subject", "body", "follow_up_1", "follow_up_2"].every((k) => String(w[k] || "").trim().length > (k === "body" ? 40 : 3)) && !claimProblems([w.subject, w.body, w.follow_up_1, w.follow_up_2, w.opener], leakOf.get(c)).length);
    const drafts = /* @__PURE__ */ new Map();
    try {
      for (const w of await write(ready)) {
        const r = ready.find((x) => x.c.website === siteKey(w.website || ""));
        if (r && valid(w, r.c)) drafts.set(r.c, w);
      }
    } catch (e) {
      job.results.errors.push({ where: "writing emails (batch)", error: String(e.message).slice(0, 200) });
    }
    for (const r of ready.filter((x) => !drafts.has(x.c))) {
      try {
        let [w] = await write([r]);
        const probs = w ? claimProblems([w.subject, w.body, w.follow_up_1, w.follow_up_2, w.opener], r.leak) : [];
        if (w && probs.length) {
          [w] = await write([r], `Your last draft ${probs.join("; ")}. Rewrite it using only the confirmed findings and strengths.`);
        }
        if (valid(w, r.c)) drafts.set(r.c, w);
        else if (w) job.results.errors.push({ where: `email check (${r.c.business_name})`, error: "draft made a claim the scan didn't confirm, so it wasn't used" });
      } catch (e) {
        job.results.errors.push({ where: `writing emails (${r.c.business_name})`, error: String(e.message).slice(0, 200) });
      }
    }
    for (const { c, leak, demo, site } of ready) {
      const w = drafts.get(c);
      const dlink = demoBrief(env, demo)?.demo_url;
      const plink = demo?.token && (dlink || site?.site) ? wsdLinks(env, demo.token).pack : null;
      const clink = job.pitch === "command" || job.pitch === "front_desk" ? outCommandDemo(env) : null;
      if (w && clink && c.email && !String(w.body || "").includes(clink)) w.body = String(w.body || "").trim() + "\n\n" + clink;
      else if (w && plink && c.email && !String(w.body || "").includes(plink)) w.body = String(w.body || "").trim() + "\n\n" + plink;
      if (w && plink && c.email && w.follow_up_1 && !String(w.follow_up_1).includes(plink)) w.follow_up_1 = String(w.follow_up_1).trim() + "\n\n" + plink;
      const sc = scoreProspect({ leak_score: leak.leak_score, google_rating: c.google_rating, google_reviews: c.google_reviews, locations: c.locations, practitioners: c.practitioners });
      const packet = { snapshot: { vertical: c.vertical, location: c.location || job.city, locations: c.locations || null, practitioners: c.practitioners || null, google_rating: c.google_rating || null, google_reviews: c.google_reviews ?? null, contact: { email: c.email || null, phone: c.phone || null } }, gaps: leak.top, fit_notes: w?.fit_notes || c.why_fit || null, score: sc.score, track: sc.track, score_reason: sc.reason, route: null, drafted: !!w, follow_up_1: w?.follow_up_1 || null, follow_up_2: w?.follow_up_2 || null };
      const band3 = job.manual ? "high" : sc.band; // businesses Ty picked are never dropped for a low score
      let route3 = band3 === "high" ? c.email ? "enrol" : "call" : band3 === "mid" ? c.email ? "nurture" : "call" : "skip";
      if (route3 === "enrol" && !w) route3 = "needs_draft";
      if (route3 === "enrol" && ghl_exports && enabled(env)) {
        const sup = await suppressed(env, c.email).catch(() => null);
        if (sup) {
          route3 = "suppressed";
          packet.suppressed = sup;
        }
      }
      packet.route = route3;
      const patch = { leak_report: { ...leak, packet }, score: Math.max(1, Math.min(10, Math.round(sc.score / 10))), updated_at: now2() };
      if (w) Object.assign(patch, { leak: String(w.leak).slice(0, 500), evidence: String(w.evidence).slice(0, 2e3), opener: String(w.opener).slice(0, 1500) });
      if (w && c.email) Object.assign(patch, { email_subject: String(w.subject).slice(0, 500), email_body: demoPersonaliseGreeting(demoContactName(c.decision_maker),stripSignoff(w.body)).slice(0, 3e3) });
      patch.status = { skip: "skipped", nurture: "nurture", enrol: "queued", suppressed: "do_not_contact", needs_draft: "needs_research", call: "to_send" }[route3] || "to_send";
      await update(env, "agent_prospects", `id=eq.${c.prospect_id}`, patch).catch((e) => job.results.errors.push({ where: c.business_name, error: "couldn't save packet: " + e.message.slice(0, 120) }));
      c.score = sc.score;
      c.track = sc.track;
      if (route3 === "enrol") {
        const params = { site_demo_url: site?.site || void 0, pack_url: plink || void 0, prospect_id: c.prospect_id, business_name: c.business_name, email: c.email, phone: c.phone || void 0, website: "https://" + c.website.replace(/^https?:\/\//, ""), vertical: c.vertical, subject: w.subject, body: stripSignoff(w.body), follow_up_1: stripSignoff(w.follow_up_1), follow_up_2: stripSignoff(w.follow_up_2), evidence: w.evidence, evidence_url: c.email_source_url || "https://" + c.website.replace(/^https?:\/\//, ""), consent_basis: c.consent_basis || `Business email published by the clinic (${c.email}).`, report_token: c.report_token, demo_url: dlink || void 0, leak_score: c.leak_score, fit_score: sc.score, track: sc.track };
        const [qa] = await insert(env, "team_actions", [{ department: "head_of_sales", type: "campaign_enrol", title: `Campaign: ${c.business_name} (${c.vertical}) \u201C${w.subject}\u201D`.slice(0, 200), reason: `Score ${sc.score} (Track ${sc.track}: ${sc.reason}). Biggest gap: ${w.leak}`.slice(0, 500), params, status: "pending" }]);
        c.state = "queued";
        job.results.queued++;
        const cr = await route(env, qa, { settings }).catch(() => ({}));
        if (cr.done_by_command) {
          c.state = "enrolled";
          job.results.enrolled = (job.results.enrolled || 0) + 1;
        }
      } else if (route3 === "call") {
        c.state = "call_only";
        job.results.call_only++;
      } else if (route3 === "nurture") {
        c.state = "nurture";
        job.results.nurture = (job.results.nurture || 0) + 1;
      } else if (route3 === "needs_draft") {
        c.state = "needs_draft";
        job.results.needs_draft = (job.results.needs_draft || 0) + 1;
      } else if (route3 === "suppressed") {
        c.state = "suppressed";
        job.results.skipped.push({ name: c.business_name, why: "on a do-not-contact list in GHL (" + packet.suppressed + ")" });
      } else {
        c.state = "skipped_low";
        job.results.skipped.push({ name: c.business_name, why: `low score ${sc.score}: ${sc.reason}` });
      }
    }
    await logUsage(env, settings, { department: "head_of_sales", source: job.source, model: model2, usage, prospects: ready.map((r) => r.c.prospect_id), enrols: ready.filter((r) => r.c.state === "queued").length }).catch(() => {
    });
  }
  job.done = job.candidates.filter((c) => c.state !== "pending").length;
  if (!job.candidates.some((c) => c.state === "pending")) return finishHunt(env, job);
  await saveJob(env, job);
  return job;
}
function scoreProspect({ leak_score = 0, google_rating, google_reviews, locations, practitioners }) {
  const reviews = +google_reviews || 0, rating = +google_rating || 0, locs = +locations || 0, prac = +practitioners || 0;
  const why = [];
  let fit = 10;
  if (locs >= 2) {
    fit += 30;
    why.push(`${locs} locations`);
  }
  if (prac >= 5) {
    fit += 25;
    why.push(`${prac} practitioners`);
  } else if (prac >= 3) {
    fit += 15;
    why.push(`${prac} practitioners`);
  }
  if (reviews >= 150) {
    fit += 25;
    why.push(`${reviews} reviews`);
  } else if (reviews >= 50) {
    fit += 18;
    why.push(`${reviews} reviews`);
  } else if (reviews >= 20) {
    fit += 10;
    why.push(`${reviews} reviews`);
  }
  if (rating >= 4.5) fit += 10;
  fit = Math.min(100, fit);
  const established = locs >= 2 || prac >= 3 || reviews >= 50;
  const track = established ? "A" : reviews >= 20 && rating >= 4.3 ? "B" : "C";
  let score = Math.round(0.55 * leak_score + 0.45 * fit) + (track === "A" ? 5 : 0);
  score = Math.max(0, Math.min(100, score));
  why.unshift(`leak ${leak_score}`);
  if (track === "C") why.push("no size or demand signals found");
  const band = track === "A" && score >= 45 || track === "B" && score >= 50 ? "high" : score >= 30 ? "mid" : "low";
  return { score, fit, track, band, reason: why.join(", ") };
}
async function suppressed(env, email) {
  const c = campaignConfig(await getSettings(env));
  const x = await findByEmail(env, email);
  if (!x) return null;
  const tags = (x.tags || []).map((t) => String(t).toLowerCase());
  const hit = [...c.suppression_tags, ...c.previous_campaign_tags, c.entry_tag].find((t) => tags.includes(t.toLowerCase()));
  if (hit) return hit;
  if (x.dnd || x.dndSettings?.Email?.status === "active") return "Email DND";
  return null;
}
async function finishHunt(env, job) {
  const r = job.results;
  const list = (s) => job.candidates.filter((c) => c.state === s).map((c) => `${c.business_name}${c.score != null ? ` (${c.score}, Track ${c.track})` : ""}`);
  const body = [
    `**${r.enrolled || 0} enrolled by Studio AI Command \xB7 ${(r.queued || 0) - (r.enrolled || 0)} waiting for your yes \xB7 ${r.call_only} to call \xB7 ${r.nurture || 0} nurture \xB7 ${r.skipped.length} skipped**`,
    job.kind === "rescan" ? `Re-scan of existing prospects with the new scanner (real-browser view, strengths first, only confirmed findings). Old drafts were withdrawn; new ones are below.` : `Hunt: ${LABEL[job.vertical]} in ${job.city}. Scores combine the leak scan with size and review signals (Track A established, Track B smaller with strong demand).`,
    list("enrolled").length ? `
**Enrolled by Studio AI Command** (passed every check): ${list("enrolled").join(", ")}` : "",
    list("queued").length ? `
**Waiting for your yes**: ${list("queued").join(", ")}` : "",
    list("call_only").length ? `
**Call these** (no published email, so not emailed): ${list("call_only").join(", ")}` : "",
    list("nurture").length ? `
**Nurture** (promising, not top priority; emails drafted, queue from Prospects when ready): ${list("nurture").join(", ")}` : "",
    list("needs_draft").length ? `
**Needs an email draft** (saved, drafting failed; click Draft email in Prospects): ${list("needs_draft").join(", ")}` : "",
    r.skipped.length ? `
**Skipped:** ${r.skipped.map((s) => `${s.name} (${s.why})`).join("; ")}` : "",
    r.errors.length ? `
**Errors:**
${r.errors.map((e) => `- ${e.where}: ${e.error}`).join("\n")}` : "\nNo errors."
  ].filter(Boolean).join("\n");
  const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short" });
  const [rep] = await insert(env, "team_reports", [{ department: "head_of_sales", kind: "shift", subkind: "prospect_hunt", title: job.manual ? `Added by Ty: ${job.candidates.map((c) => c.business_name).join(", ")}`.slice(0, 120) + ` \xB7 ${r.queued} queued, ${r.call_only} to call` : job.kind === "rescan" ? `Re-scan: ${job.candidates.length} prospects \xB7 ${r.queued} new drafts, ${r.call_only} to call (${date})` : `Clinic hunt: ${job.vertical} in ${job.city} \xB7 ${r.queued} queued, ${r.call_only} to call (${date})`, body }]).catch(() => []);
  job.status = "done";
  job.report_id = rep?.id || null;
  job.finished_at = now2();
  await saveJob(env, job);
  return job;
}
function givenSite(v) { const s = String(v || "").trim(); if (!s || /\s/.test(s) || !/\.[a-z]{2,}/i.test(s)) return ""; return siteKey(/^https?:\/\//i.test(s) ? s : "https://" + s); }
async function startGiven(env, { given, vertical, city, pitch, note } = {}) {
  vertical = OUTREACH[vertical] ? vertical : "multi";
  pitch = OUT_PITCHES[pitch] ? pitch : (await outCfg(env).catch(() => ({}))).pitch || "growth_pack";
  const existing = await select(env, "agent_prospects", "select=website&limit=5000").catch(() => []);
  const known = new Set(existing.map((r) => siteKey(r.website)).filter(Boolean));
  const clean = (v, n) => String(v || "").replace(/[<>]/g, "").trim().slice(0, n);
  const job = { id: crypto.randomUUID(), vertical, city: clean(city, 60) || "Australia", count: 0, source: "manual_add", manual: true, pitch, note: clean(note, 600) || null, status: "running", started_at: now2(), candidates: [], done: 0, results: { saved: 0, queued: 0, call_only: 0, skipped: [], errors: [] }, report_id: null };
  const seen = new Set();
  for (const g of given.slice(0, 10)) {
    const name = clean(g?.business_name || g?.name, 120), key = givenSite(g?.website);
    const why = !name ? "needs a business name" : !key ? "needs their website (for a business with no website, use the no-website finder)" : known.has(key) ? "already in prospects" : seen.has(key) ? "duplicate" : "";
    if (why) { job.results.skipped.push({ name: name || String(g?.website || "?").slice(0, 80), why }); continue; }
    seen.add(key);
    const email = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(g.email || "").trim()) ? String(g.email).trim().toLowerCase() : null;
    job.candidates.push({ business_name: name, website: key, vertical: OUTREACH[g.vertical] ? g.vertical : vertical, phone: clean(g.phone, 40) || null, location: clean(g.location, 80) || job.city, email, email_source_url: email ? clean(g.email_source_url, 300) || "https://" + key : null, note: clean(g.note, 600) || job.note, why_fit: "Ty picked this business himself", state: "pending" });
  }
  job.count = job.candidates.length;
  job.status = job.candidates.length ? "running" : "done";
  await saveJob(env, job);
  if (!job.candidates.length) await finishHunt(env, job);
  return job;
}
async function continueHunts(env, batches = 2) {
  const running = (await jobs(env)).filter((j) => j.status === "running" && Date.now() - Date.parse(j.updated_at || 0) > 3e5);
  const t0 = Date.now();
  for (const j of running) for (let i = 0; i < batches; i++) {
    if (Date.now() - t0 > 8 * 6e4) break;
    const x = await huntStep(env, j.id).catch((e) => ({ status: "error", e }));
    if (x.status !== "running") break;
  }
  return running.length;
}
async function reconcileProspects(env, { ghl } = {}) {
  const settings = await getSettings(env);
  const c = campaignConfig(settings);
  const P = await select(env, "agent_prospects", "select=id,business_name,website,email,status,vertical,ghl_contact_id,enrolled_at,campaign&limit=5000");
  const out = { relinked: [], reset_to_call: [], skipped_off_target: [], holds_queued: [] };
  for (const p of P.filter((x) => x.status === "sent" && !x.ghl_contact_id).slice(0, 15)) {
    let contact = null;
    if (p.email && ghl) contact = await ghl.findByEmail(env, p.email).catch(() => null);
    if (contact) {
      const tags = (contact.tags || []).map((t) => String(t).toLowerCase());
      const patch = { ghl_contact_id: contact.id, updated_at: now2() };
      if (tags.includes(c.entry_tag.toLowerCase())) {
        patch.campaign = c.entry_tag;
        patch.enrolled_at = p.enrolled_at || now2();
      }
      await update(env, "agent_prospects", `id=eq.${p.id}`, patch);
      out.relinked.push(p.business_name);
    } else {
      await update(env, "agent_prospects", `id=eq.${p.id}`, { status: "to_send", updated_at: now2() });
      out.reset_to_call.push(p.business_name);
    }
  }
  for (const p of P.filter((x) => x.status === "to_send" && !OUTREACH[x.vertical])) {
    await update(env, "agent_prospects", `id=eq.${p.id}`, { status: "skipped", updated_at: now2() });
    out.skipped_off_target.push(p.business_name);
  }
  const pending = await select(env, "team_actions", "type=eq.ghl_tags&status=in.(pending,running,done)&select=params&limit=500").catch(() => []);
  const held = new Set(pending.map((a) => a.params?.contact_id));
  for (const p of P.filter((x) => x.campaign === c.entry_tag && x.ghl_contact_id && (!OUTREACH[x.vertical] || !x.email))) {
    if (held.has(p.ghl_contact_id)) continue;
    const [hold] = await insert(env, "team_actions", [{ department: "head_of_operations", type: "ghl_tags", title: `Tags on ${p.business_name}: +hold-do-not-send`, reason: `${p.business_name} was enrolled but ${!p.email ? "has no published email" : `isn't a target clinic (${p.vertical || "no industry"})`}. The hold tag stops the rest of the campaign emails.`, params: { contact_id: p.ghl_contact_id, contact_name: p.business_name, add: ["hold-do-not-send"] }, status: "pending" }]);
    await route(env, hold, {}).catch(() => {
    });
    out.holds_queued.push(p.business_name);
  }
  return { ok: true, ...out };
}
var WEEKLY_TARGETS = Object.fromEntries(ALL_V.map((v) => [v, OUTREACH[v].weekly]));
async function outreachSnapshot(env) {
  const settings = await getSettings(env);
  const dayStart = (() => {
    const b2 = new Date(Date.now() + 10 * 36e5);
    b2.setUTCHours(0, 0, 0, 0);
    return new Date(b2.getTime() - 10 * 36e5).toISOString();
  })();
  const b = new Date(Date.now() + 10 * 36e5), dow = (b.getUTCDay() + 6) % 7;
  b.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(b.getTime() - dow * 864e5 - 10 * 36e5).toISOString();
  const [P, A, Dm] = await Promise.all([
    select(env, "agent_prospects", "select=id,business_name,vertical,email,phone,status,call_status,created_at,updated_at,enrolled_at,last_call_at,campaign,score,demo_token&limit=5000").catch(() => select(env, "agent_prospects", "select=id,business_name,vertical,email,phone,status,call_status,created_at,updated_at,enrolled_at,last_call_at,campaign,score&limit=5000").catch(() => [])),
    select(env, "team_actions", `type=in.(campaign_enrol,ghl_tags)&or=(created_at.gte.${weekStart},status.eq.pending)&select=type,status,created_at,decided_at,result,params&limit=2000`).catch(() => []),
    select(env, "agent_demos", "select=business_name,quality,views,chats,first_view_at,last_chat_at,created_at&order=created_at.desc&limit=1000").catch(() => [])
  ]);
  const today = (t) => t && t >= dayStart, week = (t) => t && t >= weekStart;
  const c = campaignConfig(settings);
  const targets = Object.fromEntries(Object.entries({ ...WEEKLY_TARGETS, ...settings.campaign?.weekly_targets || {} }).filter(([v]) => outreachOn(settings).includes(v)));
  const enrolledWeek = {};
  for (const p of P) if (week(p.enrolled_at) && p.campaign === c.entry_tag) enrolledWeek[p.vertical || "other"] = (enrolledWeek[p.vertical || "other"] || 0) + 1;
  const flags = [];
  const offTarget = P.filter((p) => p.campaign === c.entry_tag && !OUTREACH[p.vertical]);
  if (offTarget.length) flags.push(`${offTarget.length} enrolled contact(s) outside the target industries (${offTarget.slice(0, 3).map((p) => p.business_name).join(", ")}). Run Tidy prospects.`);
  const noEmail = P.filter((p) => p.campaign === c.entry_tag && !p.email);
  if (noEmail.length) flags.push(`${noEmail.length} enrolled contact(s) with no published email. Run Tidy prospects.`);
  const refused = A.filter((a) => a.type === "campaign_enrol" && a.status === "failed" && today(a.decided_at));
  if (refused.length) flags.push(`${refused.length} enrolment(s) refused today by the safety checks.`);
  const holds = A.filter((a) => a.type === "ghl_tags" && a.status === "pending" && (a.params?.add || []).includes("hold-do-not-send"));
  if (holds.length) flags.push(`${holds.length} campaign hold(s) waiting for your approval.`);
  const calls = P.filter((p) => p.phone && outreachOn(settings).includes(p.vertical) && ["to_send", "sent", "nurture", "needs_research"].includes(p.status) && (!p.call_status || ["no_answer", "voicemail"].includes(p.call_status))).sort((x, y) => !y.email - !x.email || (y.score || 0) - (x.score || 0)).slice(0, 5).map((p) => ({ name: p.business_name, phone: p.phone, phone_only: !p.email, demo: /^[a-f0-9]{40}$/.test(p.demo_token || "") }));
  const enrol = A.filter((a) => a.type === "campaign_enrol");
  const waits = enrol.filter((a) => a.decided_at).map((a) => (Date.parse(a.decided_at) - Date.parse(a.created_at)) / 36e5).sort((x, y) => x - y);
  const drafted = enrol.length, approved = enrol.filter((a) => a.status === "done").length;
  const pipeline = { drafted, approved, rejected: enrol.filter((a) => a.status === "rejected").length, refused: enrol.filter((a) => a.status === "failed").length, waiting: enrol.filter((a) => a.status === "pending").length, median_hours_to_approve: waits.length ? Math.round(waits[Math.floor(waits.length / 2)] * 10) / 10 : null, send_rate: drafted ? Math.round(approved / drafted * 100) : null, rejection_notes: enrol.filter((a) => a.status === "rejected" && a.result?.owner_note).slice(0, 3).map((a) => a.result.owner_note.slice(0, 120)) };
  if (!rendererReady(env)) flags.unshift("The browser scanner isn't connected: the scanner can't confirm what's missing on clinic sites. Add the Browser binding (see HOW TO DEPLOY).");
  const research = P.filter((p) => p.status === "needs_research").length;
  if (research >= 10) flags.push(`${research} prospects stuck in Needs Research (no published email or source page).`);
  return {
    ok: true,
    pipeline,
    today: {
      analysed: P.filter((p) => today(p.created_at)).length,
      queued: A.filter((a) => a.type === "campaign_enrol" && today(a.created_at)).length,
      waiting_approval: A.filter((a) => a.type === "campaign_enrol" && a.status === "pending").length,
      enrolled: P.filter((p) => today(p.enrolled_at)).length,
      replies: P.filter((p) => p.status === "replied" && today(p.updated_at)).length,
      booked: P.filter((p) => p.call_status === "booked" && today(p.last_call_at)).length,
      calls_logged: P.filter((p) => today(p.last_call_at)).length
    },
    week: { enrolled_by_vertical: enrolledWeek, targets },
    email: await emailStatsSummary(env).catch(() => null),
    demos: { built: Dm.length, good: Dm.filter((d) => d.quality === "good").length, built_today: Dm.filter((d) => today(d.created_at)).length, opened: Dm.filter((d) => d.views > 0).length, opened_today: Dm.filter((d) => today(d.first_view_at)).length, chatted: Dm.filter((d) => d.chats > 0).length, hot: Dm.filter((d) => d.last_chat_at && Date.now() - Date.parse(d.last_chat_at) < 3 * 864e5).slice(0, 5).map((d) => d.business_name) },
    top_calls: calls,
    compliance_flags: flags
  };
}
async function queueProspect(env, id) {
  const [p] = await select(env, "agent_prospects", `id=eq.${enc(id)}&limit=1`);
  if (!p) throw new Error("Prospect not found.");
  if (p.status === "do_not_contact") throw new Error("This business is marked Do Not Contact.");
  if (!p.email || !p.email_source_url) throw new Error("Needs research: no published email and source page on file.");
  if (!p.email_subject || !p.email_body) throw new Error("No email drafted yet: use Draft email first.");
  const pk = p.leak_report?.packet || {};
  const params = { prospect_id: p.id, business_name: p.business_name, email: p.email, phone: p.phone || void 0, website: p.website, vertical: p.vertical, subject: p.email_subject, body: demoPersonaliseGreeting(demoContactName(p.decision_maker),stripSignoff(p.email_body)), follow_up_1: pk.follow_up_1 ? stripSignoff(pk.follow_up_1) : void 0, follow_up_2: pk.follow_up_2 ? stripSignoff(pk.follow_up_2) : void 0, evidence: p.evidence, evidence_url: p.email_source_url || p.website, consent_basis: p.consent_basis || `Business email published by the clinic (${p.email}).`, report_token: p.report_token || void 0, demo_url: /^[a-f0-9]{40}$/.test(p.demo_token || "") ? demoUrl(env, p.demo_token) : void 0, leak_score: p.leak_score ?? void 0, fit_score: pk.score };
  const gate = await enrolCheck(env, params);
  if (gate) throw new Error(gate);
  const [row] = await insert(env, "team_actions", [{ department: "head_of_sales", type: "campaign_enrol", title: `Campaign: ${p.business_name} (${p.vertical}) \u201C${p.email_subject}\u201D`.slice(0, 200), reason: `Queued by Ty from Prospects${pk.score != null ? ` (score ${pk.score}, Track ${pk.track})` : ""}.`, params, status: "pending" }]);
  const cr = await route(env, row, {}).catch(() => ({}));
  await update(env, "agent_prospects", `id=eq.${p.id}`, { status: "queued", updated_at: now2() });
  return { ok: true, action_id: row.id, enrolled_by_command: !!cr.done_by_command };
}
async function startRescan(env, { limit = 12 } = {}) {
  const P = await select(env, "agent_prospects", "status=in.(to_send,queued,nurture,needs_research)&select=id,business_name,website,vertical,location,phone,email,email_source_url,google_rating,google_reviews,leak_report&limit=500");
  const todo = P.filter((p) => p.website && p.leak_report?.scan_version !== SCAN_VERSION && ["allied", "dental", "aesthetics", "psychology", "medical", "property"].includes(p.vertical)).slice(0, Math.max(1, Math.min(30, +limit || 12)));
  const job = {
    id: crypto.randomUUID(),
    kind: "rescan",
    vertical: "mixed",
    city: "existing prospects",
    count: todo.length,
    source: "rescan",
    status: todo.length ? "running" : "done",
    started_at: now2(),
    done: 0,
    results: { saved: 0, queued: 0, call_only: 0, skipped: [], errors: [] },
    report_id: null,
    candidates: todo.map((p) => ({ business_name: p.business_name, website: siteKey(p.website), vertical: p.vertical, location: p.location, phone: p.phone, email: p.email, email_source_url: p.email_source_url, google_rating: p.google_rating, google_reviews: p.google_reviews, locations: p.leak_report?.packet?.snapshot?.locations || null, practitioners: p.leak_report?.packet?.snapshot?.practitioners || null, state: "pending" }))
  };
  const ids = new Set(todo.map((p) => p.id));
  const pending = await select(env, "team_actions", "type=eq.campaign_enrol&status=eq.pending&select=id,params&limit=500").catch(() => []);
  for (const a of pending.filter((x) => ids.has(x.params?.prospect_id))) await update(env, "team_actions", `id=eq.${a.id}&status=eq.pending`, { status: "rejected", decided_at: now2(), result: { owner_note: "Withdrawn: re-scanning with the new scanner; a new draft will replace it." } }).catch(() => {
  });
  await saveJob(env, job);
  return job;
}
async function rescanStatus(env) {
  const P = await select(env, "agent_prospects", "status=in.(to_send,queued,nurture,needs_research)&select=leak_report&limit=1000").catch(() => []);
  return { waiting: P.filter((p) => p.leak_report?.scan_version !== SCAN_VERSION).length };
}

