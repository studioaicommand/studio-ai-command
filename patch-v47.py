# v47: Outreach engine on autopilot (50 a day, warm-up ramp, daily batch approval), Google + AI search research,
# businesses with no website go to the call list, homepage concept per prospect (reusing the hunt's work),
# premium positioning + 10x rule for the AI team, and the Outreach today view.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
team, ui, css = [open(D + f).read() for f in ('outreach-team.js', 'outreach-ui.js', 'outreach-ui.css')]
PREM = team.split('var OUT_PREMIUM = `')[1].split('`;')[0]
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
rep('var BATCH = 3;', 'var BATCH = 5;')
# hunt: also find businesses with no website (they go straight to the call list)
rep("""Use web_search. For each business give its OWN website, phone, and (only if you saw it published by the business) its email and the page it's on.""",
    """Use web_search. For each business give its OWN website, phone, and (only if you saw it published by the business) its email and the page it's on. Also include a few businesses that have NO website at all (only a Google Business Profile or directory listing): leave website empty for those and give their phone and Google rating.""")
rep("""  for (const c of clinics) {
    const key = siteKey(c.website || "");""", """  for (const c of clinics) {
    const key = siteKey(c.website || "");
    if (!key && c.phone && c.business_name) { await outNoSite(env, c, vertical, city, job).catch(() => {}); continue; }""")
# scan five at a time, side by side, and research each one's Google + AI search visibility
rep("""  const ready = [];
  for (const c of batch) {
    try {""", """  const ready = [];
  const su = wsdUsage();
  await Promise.all(batch.map(async (c) => {
    try {""")
rep("""        job.results.skipped.push({ name: c.business_name, why: "website didn't load" });
        continue;
      }
      const pub = publishedEmail(""", """        job.results.skipped.push({ name: c.business_name, why: "website didn't load" });
        return;
      }
      await outSearch(env, c, leak, su).catch(() => null);
      const pub = publishedEmail(""")
rep("""      ready.push({ c, leak, rep, report_url: `${origin}/leak-report/${extra.report_token}` });
    } catch (e) {
      c.state = "error";
      job.results.errors.push({ where: c.business_name, error: String(e.message).slice(0, 200) });
    }
  }
""", """      ready.push({ c, leak, rep, report_url: `${origin}/leak-report/${extra.report_token}` });
    } catch (e) {
      c.state = "error";
      job.results.errors.push({ where: c.business_name, error: String(e.message).slice(0, 200) });
    }
  }));
  if (su.fast.calls) await wsdLog(env, su, "outreach_search").catch(() => {});
""")
# homepage concept for the best prospects, only as many as can be sent today (one at a time, reusing the hunt's work)
rep("""        job.results.errors.push({ where: `demo (${r.c.business_name})`, error: String(e.message).slice(0, 160) });
      }
    }));
""", """        job.results.errors.push({ where: `demo (${r.c.business_name})`, error: String(e.message).slice(0, 160) });
      }
    }));
    let siteLeft = Math.min(2, await outSiteLeft(env).catch(() => 0));
    for (const r of ready) {
      if (siteLeft <= 0) break;
      const band = scoreProspect({ leak_score: r.leak.leak_score, google_rating: r.c.google_rating, google_reviews: r.c.google_reviews, locations: r.c.locations, practitioners: r.c.practitioners }).band;
      if (band !== "high" || !r.c.email || !r.demo?.token) continue;
      try {
        r.site = await wsdBuild(env, { website: r.c.website, name: r.c.business_name, vertical: r.c.vertical, area: r.c.location || job.city, reuse: { demo: r.demo, scan: leakForAgent(r.rep, r.leak) } });
        siteLeft--;
      } catch (e) {
        job.results.errors.push({ where: `homepage concept (${r.c.business_name})`, error: String(e.message).slice(0, 160) });
      }
    }
""")
rep("""    const briefOf = ({ c, leak, rep, demo }) => ({ ...demoBrief(env, demo) || {}, """,
    """    const briefOf = ({ c, leak, rep, demo, site }) => ({ ...demoBrief(env, demo) || {}, ...(site?.site ? { site_demo_url: site.site, report_url: site.report } : {}), ...(leak.search ? { search: { query: leak.search.query, position: leak.search.position, ahead: leak.search.ahead } } : {}), """)
rep("""    for (const { c, leak, demo } of ready) {
      const w = drafts.get(c);
      const dlink = demoBrief(env, demo)?.demo_url;""", """    for (const { c, leak, demo, site } of ready) {
      const w = drafts.get(c);
      const dlink = demoBrief(env, demo)?.demo_url;
      if (w && site?.site && c.email && !String(w.body || "").includes(site.site)) w.body = String(w.body || "").trim() + "\\n\\nHere's the concept: " + site.site;
      if (w && site?.report && c.email && !String(w.follow_up_1 || "").includes(site.report)) w.follow_up_1 = String(w.follow_up_1 || "").trim() + "\\n\\nThe one-page review: " + site.report;""")
rep("""        const params = { prospect_id: c.prospect_id, """, """        const params = { site_demo_url: site?.site || void 0, prospect_id: c.prospect_id, """)
# the AI team's outreach brief: premium positioning, and how to use the homepage concept
rep("""var EMAIL_RULES = `STYLE: """, """var EMAIL_RULES = `""" + PREM + """
SITE-FIRST (when the business has site_demo_url): we already designed them a new homepage concept in their own brand, with an AI receptionist built in, and a one-page review of where enquiries slip (report_url). That is the offer.
  EMAIL 01 (70\\u2013120 words): start "Hi [first name]," or "Hi [business] team,"; one line that shows we looked (a strength, or a confirmed finding such as where they show up on Google); say you put together a concept of what [business]'s homepage could look like, in their own brand, with an AI receptionist that answers and books customers day and night; include site_demo_url exactly as given; finish with one easy question (e.g. worth a 15-minute look?). No prices.
  FOLLOW_UP_1 (40\\u201380 words): share report_url exactly as given (a one-page review of where enquiries slip: search, mobile, after-hours) and one easy question. No sign-off, no "just following up".
  FOLLOW_UP_2 (30\\u201360 words): close the loop politely with a yes/no question, and offer to take the concept down if it isn't useful. No sign-off.
  PHONE OPENER: mention you designed them a homepage concept and ask for the best email to send it to.
Otherwise:
STYLE: """)
# settings, cron, routes
rep('"money", "phone_status", "ai_budget", "ai_budget_status"].includes(key)', '"money", "phone_status", "ai_budget", "ai_budget_status", "outreach_daily"].includes(key)')
rep("""  if (instMods.outreach && !aiHold) await continueHunts(e, 2).catch((x) => console.error("hunts:", x.message));""",
    """  if (instMods.outreach && !aiHold) await continueHunts(e, 2).catch((x) => console.error("hunts:", x.message));
  if (instMods.outreach && !aiHold) await outreachAutopilot(e, await getSettings(e).catch(() => null)).catch((x) => console.error("outreach autopilot:", x.message));""")
# keep each hourly run inside Cloudflare's time limit
rep("""async function continueHunts(env, batches = 2) {
  const running = (await jobs(env)).filter((j) => j.status === "running" && Date.now() - Date.parse(j.updated_at || 0) > 3e5);
  for (const j of running) for (let i = 0; i < batches; i++) {""", """async function continueHunts(env, batches = 2) {
  const running = (await jobs(env)).filter((j) => j.status === "running" && Date.now() - Date.parse(j.updated_at || 0) > 3e5);
  const t0 = Date.now();
  for (const j of running) for (let i = 0; i < batches; i++) {
    if (Date.now() - t0 > 8 * 6e4) break;""")
rep('  if (seg[0] === "phone") {', '  if (seg[0] === "outreach") { const orr = await outreachRoute(p, m, body, env); if (orr) return orr; }\n  if (seg[0] === "phone") {')
rep('      opener: demoOpener || `', '      opener: demoOpener || (r.source === "no_website" && r.opener) || `')
# UI
assert '`' not in ui + css and '${' not in ui + css
rep('  VIEWS.brain = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('["growth", "Growth", "growth", [["growth", "Pipeline"], ["demos", "Website demos"],', '["growth", "Growth", "growth", [["growth", "Pipeline"], ["outreach", "Outreach today"], ["demos", "Website demos"],')
rep('    calls: ["Phone calls",', '    outreach: ["Outreach today", "Researched, scored and ready: approve today\\u2019s batch in one go"],\n    calls: ["Phone calls",')
rep('var VIEW_LABEL = { calls:"Phone calls",', 'var VIEW_LABEL = { outreach:"Outreach today",calls:"Phone calls",')
rep('/* Phone AI (v45) */', css.replace('\\', '\\\\') + '\n/* Phone AI (v45) */')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v47 outreach engine applied')
