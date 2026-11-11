# v36: multi-industry outreach. Sales hunts allied health, dental, aesthetics, property management, trades & services,
# coaches & consultants and multi-location businesses (psychology / medical optional), each with its own fit rules,
# pain angle, campaign tag and targets. Ty picks which industries Sales chases from Growth.
import sys, re, hashlib
f = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(f).read()

def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

def resub(pat, new, count=1):
    global s
    n = len(re.findall(pat, s))
    assert n == count, ('regex', pat[:100], n)
    s = re.sub(pat, lambda m: new, s)

# ---------- 1) The industry catalogue ----------
rep('''var HEALTH = ["allied", "dental", "aesthetics"];
var LABEL = { allied: "allied health clinics (physiotherapy, chiropractic, osteopathy, podiatry, myotherapy, exercise physiology)", dental: "dental clinics", aesthetics: "aesthetics, cosmetic and skin clinics" };''',
'''var OUTREACH = {
  allied: { name: "Allied health", label: "allied health clinics (physiotherapy, chiropractic, osteopathy, podiatry, myotherapy, exercise physiology)", tag: "sf-health-allied", target: 40, weekly: 12, health: true, who: "patients", place: "clinic", fit: "3+ practitioners, 2+ locations or 50+ Google reviews", skip: "solo practitioners, franchise head offices, hospitals", angle: "patients who enquire after hours or reach voicemail book somewhere else; reception is buried in calls, rebookings and admin" },
  dental: { name: "Dental", label: "dental clinics", tag: "sf-health-dental", target: 20, weekly: 8, health: true, who: "patients", place: "clinic", fit: "3+ dentists or hygienists, 2+ locations or 50+ Google reviews", skip: "solo dentists, corporate dental chains' head offices, hospitals", angle: "new-patient enquiries and emergency calls missed while the front desk is busy; recalls and treatment plans that never get followed up" },
  aesthetics: { name: "Aesthetics", label: "aesthetics, cosmetic and skin clinics", tag: "sf-health-aesthetics", target: 15, weekly: 5, health: true, who: "clients", place: "clinic", fit: "2+ injectors or therapists, 2+ locations or 50+ Google reviews", skip: "solo home-based therapists, product-only shops", angle: "Instagram DMs and enquiries answered hours later, consult requests that go cold, rebooking left to chance" },
  psychology: { name: "Psychology", label: "psychology and counselling practices", tag: "sf-health-psychology", target: 10, weekly: 3, health: true, off: true, who: "clients", place: "practice", fit: "3+ psychologists or counsellors, 2+ locations", skip: "solo practitioners, hospitals, government services", angle: "intake enquiries waiting days for a reply, waitlists managed by hand, admin eating clinical time" },
  medical: { name: "Medical / GP", label: "GP and medical clinics", tag: "sf-health-medical", target: 10, weekly: 3, health: true, off: true, who: "patients", place: "clinic", fit: "4+ doctors, 2+ locations or 100+ Google reviews", skip: "hospitals, corporate head offices, solo GPs", angle: "phones ringing out at opening time, simple questions taking reception away from patients" },
  property: { name: "Property management", label: "property management agencies (residential rentals)", tag: "sf-property-management", target: 25, weekly: 5, who: "tenants, owners and landlords", place: "agency", fit: "300+ rentals under management, a dedicated property management team or 2+ offices", skip: "sales-only real estate agents, solo property managers, franchise head offices", angle: "maintenance requests, tenant questions and owner updates piling up; slow replies lose landlords to other agencies" },
  trades: { name: "Trades & services", label: "established trade and home-service businesses (plumbing, electrical, air conditioning, roofing, solar, pest control, cleaning, landscaping, building and renovation)", tag: "sf-trades-services", target: 30, weekly: 8, who: "customers", place: "business", fit: "5+ staff or vans, several service areas or 50+ Google reviews, a quote or booking form on the site", skip: "sole traders, lead-generation directories, franchise head offices", angle: "calls missed while the team is on the tools; quote requests never followed up; jobs lost to whoever answers first" },
  coaching: { name: "Coaches & consultants", label: "established coaches, consultants and training businesses (business coaches, health and performance coaches, consultancies, course and program businesses with a team)", tag: "sf-coaching-consulting", target: 20, weekly: 5, who: "clients", place: "business", fit: "a team or real volume: group programs, a discovery-call funnel, 30+ reviews or testimonials", skip: "brand-new solo coaches with no clients, MLM, influencers with no service", angle: "discovery-call leads going cold; DMs and enquiries answered hours later; onboarding and follow-up done by hand" },
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
var LABEL = Object.fromEntries(ALL_V.map((v) => [v, OUTREACH[v].label]));''')

# ---------- 2) Hunt pipeline ----------
rep('''  const have = Object.fromEntries(HEALTH.map((v) => [v, rows.filter((r) => r.vertical === v).length]));
  const order = HEALTH.map((v) => ({ v, gap: (c.targets?.[v] || 10) - have[v] })).sort((a, b) => b.gap - a.gap).map((x) => x.v);''',
'''  const on = outreachOn(settings);
  const have = Object.fromEntries(on.map((v) => [v, rows.filter((r) => r.vertical === v).length]));
  const order = on.map((v) => ({ v, gap: ((c.targets?.[v] || OUTREACH[v].target) - have[v]) / (c.targets?.[v] || OUTREACH[v].target) })).sort((a, b) => b.gap - a.gap).map((x) => x.v);''')
rep('''  description: "Submit the clinics you found. Call it ONCE at the end.",''', '''  description: "Submit the businesses you found. Call it ONCE at the end.",''')
rep('''            website: { type: "string", description: "The clinic's OWN website (not a directory)." },
            vertical: { type: "string", enum: HEALTH },''', '''            website: { type: "string", description: "The business's OWN website (not a directory)." },
            vertical: { type: "string", enum: ALL_V },''')
rep('''            locations: { type: "integer", description: "Number of clinic locations if shown." },
            practitioners: { type: "integer", description: "Number of practitioners on their team page, if shown." },''',
'''            locations: { type: "integer", description: "Number of locations if shown." },
            practitioners: { type: "integer", description: "Team size (practitioners, staff or technicians on their team page), if shown." },''')
rep('''  vertical = HEALTH.includes(vertical) ? vertical : await pickVertical(env, settings, recent?.vertical);''',
    '''  vertical = OUTREACH[vertical] ? vertical : await pickVertical(env, settings, recent?.vertical);
  const IND = OUTREACH[vertical];''')
rep('''Prefer established clinics (3+ practitioners, 2+ locations or 50+ Google reviews); smaller clinics are OK if they show strong demand (great reviews, busy, growing). Note team size and locations. Skip solo practitioners, franchise head offices, hospitals, and anything that isn't a ${vertical} clinic.
Use web_search. For each clinic give its OWN website, phone, and (only if you saw it published by the clinic) its email and the page it's on. Note the Google rating and review count when shown.''',
'''Prefer established businesses (${IND.fit}); smaller ones are OK if they show strong demand (great reviews, busy, growing). Note team size and locations. Skip ${IND.skip}, and anything that isn't one of: ${IND.label}.
Use web_search. For each business give its OWN website, phone, and (only if you saw it published by the business) its email and the page it's on. Note the Google rating and review count when shown. Set vertical to "${vertical}" for every result.''')
rep('''system: "You research Australian health clinics for Studio Flow & Systems' outreach. Only real businesses you found in search results. Never guess emails."''',
    '''system: "You research established Australian service businesses (" + IND.name + ") for Studio Flow & Systems' outreach. Only real businesses you found in search results. Never guess emails."''')
rep('''job.results.errors.push({ where: "search", error: err || "The search didn't return a list of clinics." });''',
    '''job.results.errors.push({ where: "search", error: err || "The search didn't return a list of businesses." });''')
rep('''!HEALTH.includes(c.vertical) ? "not a target clinic type" : OFF_TARGET.test(c.business_name + " " + key) ? "doesn't look like a clinic" : null;''',
    '''c.vertical && c.vertical !== vertical && !OUTREACH[c.vertical] ? "not a target industry" : IND.health && OFF_TARGET.test(c.business_name + " " + key) ? "doesn't look like a clinic" : vertical === "property" && /\\bsales only\\b|buyers? agent/i.test(c.business_name) ? "sales-only agency" : null;''')

# ---------- 3) Outreach writing: industry-aware ----------
rep('''that answers patient questions like one of demo_can_answer''', '''that answers questions like one of demo_can_answer''')
rep('''  FOLLOW_UP_1 (40\\u201380 words): a new angle from a second finding plus one fact framed as typical for clinics; one easy question.''',
    '''  FOLLOW_UP_1 (40\\u201380 words): a new angle from a second finding plus one fact framed as typical for businesses like theirs; one easy question.''')
rep('''When a clinic has write_emails=false (no published email), leave subject, body and both follow-ups as empty strings and only write the research notes and phone opener.
Health rules: no patient details, no clinical outcome promises, no testimonials (AHPRA).`;''',
'''When a clinic has write_emails=false (no published email), leave subject, body and both follow-ups as empty strings and only write the research notes and phone opener.
("Clinic" above means whichever business you're writing to: use the right word for them: practice, agency, business, team.)`;
var HEALTH_RULES = "Health rules: no patient details, no clinical outcome promises, no testimonials (AHPRA).";
function industryBrief(v) {
  const I = OUTREACH[v] || OUTREACH.trades;
  return `INDUSTRY: ${I.name}. Their customers are ${I.who}. What usually hurts in a ${I.place} like theirs: ${I.angle}. Speak their language (say ${I.who}, not "patients", unless they're a health business).` + (I.health ? "\\n" + HEALTH_RULES : "");
}''')
rep('''    const system = `You are the Head of Sales at Studio Flow & Systems (Brisbane), writing outreach to Australian health clinics for Ty's GHL campaign. The offer behind it: the AI Front Desk (every enquiry answered in under a minute, missed-call text-back, follow-up until they book). Never promise ROI or quote prices.
${EMAIL_RULES}''',
'''    const system = `You are the Head of Sales at Studio Flow & Systems (Brisbane), writing outreach to established Australian ${(OUTREACH[job.vertical] || {}).name || "service"} businesses for Ty's GHL campaign. The offer behind it: the AI Front Desk (every enquiry answered in under a minute, missed-call text-back, follow-up until they book), and for bigger teams Studio AI Command (their whole business run from one AI command hub). Never promise ROI or quote prices.
${industryBrief(job.vertical)}
${EMAIL_RULES}''')
rep('''row.consent_basis = `Business email ${pub.source} (${pub.url}); message relates to their clinic's operations.`;''',
    '''row.consent_basis = `Business email ${pub.source} (${pub.url}); message relates to their business's operations.`;''')

# ---------- 4) Enrolment, tidy, targets, campaign ----------
rep('''  const tags = { allied: 1, dental: 1, aesthetics: 1, property: 1 };
  if (!tags[p.vertical]) return `Not enrolled: "${p.vertical || "no industry"}" isn't a campaign industry (allied, dental, aesthetics, property). Fix the industry or skip it.`;''',
    '''  if (!OUTREACH[p.vertical]) return `Not enrolled: "${p.vertical || "no industry"}" isn't a campaign industry (${ALL_V.join(", ")}). Fix the industry or skip it.`;''')
rep('''!HEALTH.includes(x.vertical) && x.vertical !== "property"''', '''!OUTREACH[x.vertical]''', 2)
rep('''var WEEKLY_TARGETS = { allied: 12, dental: 8, aesthetics: 5 };''',
    '''var WEEKLY_TARGETS = Object.fromEntries(ALL_V.map((v) => [v, OUTREACH[v].weekly]));''')
rep('''  const targets = { ...WEEKLY_TARGETS, ...settings.campaign?.weekly_targets || {} };''',
    '''  const targets = Object.fromEntries(Object.entries({ ...WEEKLY_TARGETS, ...settings.campaign?.weekly_targets || {} }).filter(([v]) => outreachOn(settings).includes(v)));''')
rep('''  const offTarget = P.filter((p) => p.campaign === c.entry_tag && !["allied", "dental", "aesthetics", "property"].includes(p.vertical));''',
    '''  const offTarget = P.filter((p) => p.campaign === c.entry_tag && !OUTREACH[p.vertical]);''')
rep('''  const calls = P.filter((p) => p.phone && ["allied", "dental", "aesthetics"].includes(p.vertical) &&''',
    '''  const calls = P.filter((p) => p.phone && outreachOn(settings).includes(p.vertical) &&''')
rep('''  industry_tags: { allied: "sf-health-allied", dental: "sf-health-dental", aesthetics: "sf-health-aesthetics", property: "sf-property-management" },
  targets: { allied: 40, dental: 20, aesthetics: 15, property: 25 },''',
    '''  industry_tags: { allied: "sf-health-allied", dental: "sf-health-dental", aesthetics: "sf-health-aesthetics", psychology: "sf-health-psychology", medical: "sf-health-medical", property: "sf-property-management", trades: "sf-trades-services", coaching: "sf-coaching-consulting", multi: "sf-multi-location" },
  targets: { allied: 40, dental: 20, aesthetics: 15, psychology: 10, medical: 10, property: 25, trades: 30, coaching: 20, multi: 20 },''')
rep('''  c.fields = { ...CAMPAIGN_DEFAULTS.fields, ...settings?.campaign?.fields || {} };''',
    '''  c.targets = { ...CAMPAIGN_DEFAULTS.targets, ...settings?.campaign?.targets || {} };
  c.fields = { ...CAMPAIGN_DEFAULTS.fields, ...settings?.campaign?.fields || {} };''')
rep('''  other: ["What happens to enquiries that come in after hours or while you're on a job?", "How do you follow up quotes that don't get a reply?", "Where does your team lose the most time on admin each week?"]
};''', '''  other: ["What happens to enquiries that come in after hours or while you're on a job?", "How do you follow up quotes that don't get a reply?", "Where does your team lose the most time on admin each week?"],
  coaching: ["What happens to people who book a discovery call but don't sign up?", "How quickly do DMs and enquiries get a reply right now?", "How much of onboarding and check-ins is still done by hand?"],
  multi: ["How do enquiries get shared between your locations?", "Can you see which location is missing calls or leads?", "Does every site follow up the same way, or is it up to each team?"]
};''')
rep('''questions: r.vertical === "property" ? QUESTIONS.property : HEALTH2.has(r.vertical) ? QUESTIONS.health : QUESTIONS.other,''',
    '''questions: r.vertical === "property" ? QUESTIONS.property : HEALTH2.has(r.vertical) ? QUESTIONS.health : QUESTIONS[r.vertical] || QUESTIONS.other,''')
rep('''.filter((r) => ["allied", "dental", "aesthetics", "property"].includes(r.vertical));''',
    '''.filter((r) => !!OUTREACH[r.vertical]);''')

# ---------- 5) Leak-scan value per industry ----------
rep('''  property: { value: 1500, unit: "new landlord (first-year fees)", who: "landlords" },
  other: { value: 150, unit: "new customer (first job)", who: "customers" }''',
    '''  property: { value: 1500, unit: "new landlord (first-year fees)", who: "landlords" },
  trades: { value: 450, unit: "new customer (first job)", who: "customers" },
  coaching: { value: 1200, unit: "new client (first program)", who: "clients" },
  multi: { value: 200, unit: "new customer (first visit)", who: "customers" },
  other: { value: 150, unit: "new customer (first job)", who: "customers" }''')
rep('''var SCALE = { property: 0.25, other: 0.6 };''', '''var SCALE = { property: 0.25, coaching: 0.3, trades: 0.5, other: 0.6 };''')
rep('''coaching: "coaching", consulting: "coaching", hospitality: "hospitality", fitness: "fitness" };''',
    '''coaching: "coaching", consulting: "coaching", hospitality: "hospitality", fitness: "fitness", multi: "general" };''')

# ---------- 6) Tools the team uses ----------
resub(r'vertical: \{ type: "string", enum: \["allied", "dental", "aesthetics", "psychology", "medical", "property", "other"\] \}',
      'vertical: { type: "string", enum: ["allied", "dental", "aesthetics", "psychology", "medical", "property", "trades", "coaching", "multi", "other"] }', 3)
rep('''vertical: { type: "string", enum: ["allied", "dental", "aesthetics"], description: "Omit to fill the biggest campaign gap." }''',
    '''vertical: { type: "string", enum: ["allied", "dental", "aesthetics", "psychology", "medical", "property", "trades", "coaching", "multi"], description: "Omit to fill the biggest gap among the industries Ty has switched on." }''')
rep('''description: "THE way to find new clinics: starts the clinic hunt pipeline''', '''description: "THE way to find new prospects in any target industry (clinics, property managers, trades, coaches, multi-location): starts the hunt pipeline''')

# ---------- 7) Playbook text ----------
rep('''To find new clinics, call start_clinic_hunt (it runs the whole pipeline in safe batches). Use the manual steps below only for one
specific clinic Ty names, or for imports. Never propose_campaign_enrol a business without a published email or outside allied, dental,
aesthetics or property: it will be refused. Phone-only clinics: save_prospect with the phone; they go to Ty's call list.
Focus: HEALTH CLINICS ONLY by default: allied health (physio, chiro, osteo, podiatry, myotherapy, EP), dental, aesthetics/cosmetic/skin;
psychology and GP/medical only when asked. Property management only when Ty asks for it. Campaign 02 targets: allied 40, dental 20,
aesthetics 15 (check campaign_status and fill the biggest health gap). Brisbane, Gold Coast, Sydney first, then wider Australia.
Ideal client: ESTABLISHED (5+ practitioners or 2+ locations, 50+ Google reviews, a real team). Skip solo operators, head offices of
franchises and businesses that look like they'd haggle over $2,500.''',
'''To find new prospects, call start_clinic_hunt (despite the name it hunts any target industry and runs the whole pipeline in safe
batches). Use the manual steps below only for one specific business Ty names, or for imports. Never propose_campaign_enrol a business
without a published email or outside the target industries: it will be refused. Phone-only businesses: save_prospect with the phone;
they go to Ty's call list.
Focus (MULTI-INDUSTRY): allied health, dental, aesthetics, property management, trades & home services, coaches & consultants and
multi-location service businesses; psychology and GP/medical only when Ty switches them on. Ty chooses which are on in Growth; the
hunt fills whichever switched-on industry is furthest behind its target. Speak each industry's language (patients, tenants and
landlords, customers, clients). Brisbane, Gold Coast, Sunshine Coast, Sydney first, then wider Australia.
Ideal client: ESTABLISHED (a real team, 2+ locations or 50+ Google reviews, real enquiry volume). Skip solo operators, head offices of
franchises and businesses that look like they'd haggle over $2,500. Bigger teams and multi-location groups are Studio AI Command fits.''')
rep('''management agencies (300+ rentals). Signals:''', '''management agencies (300+ rentals), established trades and home-service businesses, coaches and consultants with a team, and
multi-location service businesses. Signals:''')
rep('''software cost real money every week. Main focus: health clinics of all types''', '''software cost real money every week. Focus areas: health clinics of all types''')
rep('''prompt: "Run a PROSPECT HUNT (see your playbook): HEALTH CLINICS ONLY. Check campaign_status for which health vertical (allied, dental, aesthetics) is furthest behind its target, pick that vertical and an Australian city, find about 10 ESTABLISHED clinics''',
    '''prompt: "Run a PROSPECT HUNT (see your playbook): only the industries Ty has switched on in Growth. Check campaign_status for which of them is furthest behind its target, pick that industry and an Australian city, find about 10 ESTABLISHED businesses''')
rep('''label: "Afternoon clinic hunt (second clinic type)"''', '''label: "Afternoon prospect hunt (second industry)"''')
rep('''label: "Late-afternoon clinic hunt (tomorrow's call list)"''', '''label: "Late-afternoon prospect hunt (tomorrow's call list)"''')

# ---------- 8) Settings: store which industries are on ----------
rep('''for (const k of ["charter", "telegram", "command", "notify_state", "offer", "inbox", "inbox_log", "money"]) if (stored[k] !== void 0) out[k] = stored[k];''',
    '''for (const k of ["charter", "telegram", "command", "notify_state", "offer", "inbox", "inbox_log", "money", "outreach"]) if (stored[k] !== void 0) out[k] = stored[k];''')
m = re.search(r'async function saveSetting\(env, key, value\) \{\n  if \(!\["autopilot", ', s)
assert m
s = s.replace('async function saveSetting(env, key, value) {\n  if (!["autopilot", ', 'async function saveSetting(env, key, value) {\n  if (!["outreach", "autopilot", ', 1)
rep('''    if (body.campaign && typeof body.campaign === "object") {
      const c = { ...cur.campaign || {} };''', '''    if (body.outreach && Array.isArray(body.outreach.on)) {
      const on = [...new Set(body.outreach.on.filter((v) => OUTREACH[v]))];
      if (!on.length) return json({ ok: false, error: "Keep at least one industry switched on." }, 400);
      const tg = {};
      for (const [v, n] of Object.entries(body.outreach.targets || {})) if (OUTREACH[v] && Number(n) >= 1 && Number(n) <= 500) tg[v] = Math.round(Number(n));
      await saveSetting(env, "outreach", { on, updated_at: new Date().toISOString() });
      if (Object.keys(tg).length) await saveSetting(env, "campaign", { ...cur.campaign || {}, targets: { ...(cur.campaign || {}).targets || {}, ...tg } });
    }
    if (body.campaign && typeof body.campaign === "object") {
      const c = { ...cur.campaign || {} };''')

# ---------- 9) Command app ----------
VN = '''{ allied: "Allied health", dental: "Dental", aesthetics: "Aesthetics", psychology: "Psychology", medical: "Medical", property: "Property mgmt", trades: "Trades & services", coaching: "Coaches & consultants", multi: "Multi-location", other: "Other" }'''
rep('''  const VNAME = { allied: "Allied health", dental: "Dental", aesthetics: "Aesthetics", psychology: "Psychology", medical: "Medical", property: "Property mgmt", other: "Other" };''',
    '''  const VNAME = ''' + VN + ''';''', 2)
rep('''  const VTYPES = [["allied", "Allied health clinic"], ["dental", "Dental"], ["aesthetics", "Aesthetics clinic"], ["psychology", "Psychology"], ["medical", "Medical/GP"], ["beauty", "Hair & beauty salon"], ["trades", "Trades"], ["property", "Property"], ["other", "Other service business"]];''',
    '''  const VTYPES = [["allied", "Allied health clinic"], ["dental", "Dental"], ["aesthetics", "Aesthetics clinic"], ["psychology", "Psychology"], ["medical", "Medical/GP"], ["beauty", "Hair & beauty salon"], ["trades", "Trades & services"], ["property", "Property management"], ["coaching", "Coach / consultant"], ["multi", "Multi-location business"], ["other", "Other service business"]];''')
IND_OPTS = '''[["allied", "Allied health (physio, chiro, osteo, podiatry\\u2026)"], ["dental", "Dental"], ["aesthetics", "Aesthetics & skin"], ["property", "Property management"], ["trades", "Trades & home services"], ["coaching", "Coaches & consultants"], ["multi", "Multi-location businesses"], ["psychology", "Psychology"], ["medical", "Medical / GP"]]'''
rep('''          { id: "vertical", label: "Clinic type", type: "select", value: "allied", options: [["allied", "Allied health (physio, chiro, osteo, podiatry\\u2026)"], ["dental", "Dental"], ["aesthetics", "Aesthetics & skin"]] },''',
    '''          { id: "vertical", label: "Industry", type: "select", value: "trades", options: ''' + IND_OPTS + ''' },''')
rep('''<p class="mu sm">Sales finds clinics, runs a leak scan on each and writes the emails; you approve; GHL sends from your templates.</p>''',
    '''<p class="mu sm">Sales finds established businesses in the industries you switch on below, scans each website and writes the emails; you approve; GHL sends from your templates.</p><div class="row" id="gInd" style="gap:6px;flex-wrap:wrap;margin-top:10px"></div>''')
rep(''''Run clinic hunt</button>''', ''''Run prospect hunt</button>''')
rep('''    $("#gHunt", el).onclick = (e) => runHunt({}, e.currentTarget);''', '''    $("#gHunt", el).onclick = (e) => runHunt({}, e.currentTarget);
    const IND = ''' + IND_OPTS + ''';
    const drawInd = (on) => {
      const box = $("#gInd", el); if (!box) return;
      box.innerHTML = '<span class="mu xs" style="align-self:center;margin-right:4px">Industries Sales hunts:</span>' + IND.map(([v, l]) => '<button class="chip' + (on.includes(v) ? " on" : "") + '" data-ind="' + v + '" aria-pressed="' + on.includes(v) + '" style="padding:6px 11px;border-radius:999px;border:1px solid ' + (on.includes(v) ? "rgba(56,189,248,.6)" : "var(--ln)") + ";background:" + (on.includes(v) ? "rgba(56,189,248,.16)" : "transparent") + ";color:" + (on.includes(v) ? "#fff" : "var(--mu)") + ';font-size:12.5px;font-weight:600;cursor:pointer">' + (on.includes(v) ? "\\u2713 " : "") + esc(l.split(" (")[0]) + "</button>").join("");
      $$("[data-ind]", box).forEach((b) => (b.onclick = async () => {
        const v = b.dataset.ind, next = on.includes(v) ? on.filter((x) => x !== v) : on.concat(v);
        if (!next.length) return toast("Keep at least one industry on.", "bad");
        try { await team("/settings", { method: "POST", body: { outreach: { on: next } } }); bust("settings", "snapshot"); toast((on.includes(v) ? "Stopped hunting " : "Now hunting ") + b.textContent.replace("\\u2713 ", "")); drawInd(next); } catch (err) { toast(err.message, "bad"); }
      }));
    };
    team("/settings").then((st) => { const o = (st.settings || st).outreach; drawInd(o && Array.isArray(o.on) && o.on.length ? o.on : ["allied", "dental", "aesthetics", "property", "trades", "coaching", "multi"]); }).catch(() => drawInd(["allied", "dental", "aesthetics", "property", "trades", "coaching", "multi"]));''')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace(oldv, hashlib.sha1(s.encode()).hexdigest()[:10])
open(f, 'w').write(s)
print('v36 multi-industry outreach applied')

# ---------- 10) Campaign setup: only check tags for switched-on industries, and create missing industry tags in GHL ----------
s = open(f).read()
old = '''  for (const t of [c.entry_tag, ...Object.values(c.industry_tags), ...c.suppression_tags]) {
    out.tags[t] = tg2.error ? "unknown" : have.has(t.toLowerCase());'''
assert s.count(old) == 1, 'setup tags'
s = s.replace(old, '''  const indTags = outreachOn(settings).map((v) => c.industry_tags[v]).filter(Boolean);
  if (!tg2.error) for (const t of indTags) if (!have.has(t.toLowerCase())) {
    const made = await req(env, "POST", `/locations/${env.GHL_LOCATION_ID}/tags`, { name: t }).catch(() => null);
    if (made && (made.tag || made.id)) { have.add(t.toLowerCase()); out.warnings.push(`Created the GHL tag "${t}" for a new industry.`); }
  }
  for (const t of [c.entry_tag, ...indTags, ...c.suppression_tags]) {
    out.tags[t] = tg2.error ? "unknown" : have.has(t.toLowerCase());''')
open(f, 'w').write(s)
print('v36 campaign tags per switched-on industry')
