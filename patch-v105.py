# v105 No main niche: every industry Ty switches on in Growth gets equal weight. Allied health is no longer #1.
# - Ideal-client brief, Marketing and Sales playbooks rewritten for any established service business.
# - Prospect hunts rotate evenly (the switched-on industry with the fewest prospects goes next), not by allied-heavy targets.
# - Automatic campaign enrolment works for every switched-on industry, not only allied/dental/aesthetics.
# - "Clinic hunt" shift renamed "Prospect hunt". Health clinics keep their compliance rules (AHPRA, privacy) when hunted.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# ideal client
a = s.index("var IDEAL_CLIENT = `"); b = s.index("`.trim();", a)
s = s[:a] + """var IDEAL_CLIENT = `
ESTABLISHED service businesses with real volume and a team, where missed enquiries, no-shows, manual admin and disconnected
software cost real money every week. NO MAIN NICHE: every industry Ty switches on in Growth gets equal attention. Typical fits:
trades and home services, coaches and consultants with a team, property management agencies, health clinics (allied health such
as physio and chiro, dental, aesthetics; psychology and GP/medical only when Ty switches them on), beauty and fitness businesses,
and multi-location service businesses. Signals: a real team or 2+ locations, a strong Google review count, real enquiry volume,
software that isn't connected to follow-up and AI. Decision makers: owners, founders, practice and office managers, principals.
A strong fit thinks in return on investment (dollars recovered, jobs or appointments filled, hours saved), not design details.
Not a fit: start-ups with no customers, solo operators after cheap one-off tasks, people only after free advice, other agencies.
Health clinics carry extra rules: AHPRA advertising (no testimonials, no guaranteed outcomes) and patient privacy.
""" + s[b:]

# marketing
rep("pick 2\\u20133 beachhead niches where we can show proof fastest,", "spread evenly across every industry Ty has switched on (no main niche) and report which converts best,")

# sales playbook: clinic words -> business words
rep("1. web_search for real clinics (their own sites, Google listings, directories). Check query_prospects first: never duplicate. While\n   searching, note each clinic's Google rating and review count if you see it.",
    "1. web_search for real businesses in the chosen industry (their own sites, Google listings, directories). Check query_prospects first:\n   never duplicate. While searching, note each business's Google rating and review count if you see it.")
rep("2. leak_scan each clinic's website", "2. leak_scan each business's website")
rep("Pick the ONE finding that matters most to that clinic as your observation.", "Pick the ONE finding that matters most to that business as your observation.")
rep("creates the clinic's one-page leak report link", "creates the business's one-page leak report link")
rep('or "Hi [clinic] team,"', 'or "Hi [business] team,"', 3)
rep("Review for [clinic] with what I found.", "Review for [business] with what I found.", 2)
rep('one typical-clinic fact framed as typical ("clinics without\n     online booking often miss several bookings a month after hours")',
    'one typical fact for their industry framed as typical ("businesses\n     without online booking often miss several bookings a month after hours")')
rep("   Health: never mention patients' details,", "   Health clinics only: never mention patients' details,")
rep("(skip non-clinics and say why)", "(skip businesses outside the industries Ty has switched on and say why)")

# shift label
rep('label: "Clinic hunt \\u2192 leak scan \\u2192 GHL campaign",', 'label: "Prospect hunt \\u2192 leak scan \\u2192 GHL campaign",')

# even rotation
rep("  const order = on.map((v) => ({ v, gap: ((c.targets?.[v] || OUTREACH[v].target) - have[v]) / (c.targets?.[v] || OUTREACH[v].target) })).sort((a, b) => b.gap - a.gap).map((x) => x.v);",
    "  // v105: no main niche: the switched-on industry with the fewest prospects goes next\n  const order = on.map((v) => ({ v, n: have[v] || 0 })).sort((a, b) => a.n - b.n).map((x) => x.v);")
rep("  targets: { allied: 40, dental: 20, aesthetics: 15, psychology: 10, medical: 10, property: 25, trades: 30, coaching: 20, multi: 20 },",
    "  targets: { allied: 20, dental: 20, aesthetics: 20, psychology: 20, medical: 20, property: 20, trades: 20, coaching: 20, multi: 20 },")

# auto-enrol for every switched-on industry
rep('  if (!["allied", "dental", "aesthetics"].includes(p.vertical)) return "not a core clinic type";',
    '  if (!outreachOn(await getSettings(env).catch(() => ({}))).includes(p.vertical)) return "industry not switched on in Growth";')

# Command knows (overrides older memory rules)
rep('''    "AI COSTS: until money is coming in''', '''    "NICHE: there is NO main niche. Every industry Ty switches on in Growth gets equal attention in hunts, outreach, DMs, LinkedIn and content. This overrides any older rule or memory saying allied health or clinics come first. Health clinics still follow AHPRA and privacy rules.",
    "AI COSTS: until money is coming in''')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v105 applied')
