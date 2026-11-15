# v108 Monthly "Evolve research": once a month (first Monday, 9am) the Head of Systems researches how Studio AI Command
# can get better, using the Replica method (research/replica-skill): map what competitors do from public sources
# (recon), read what their real users hate in public reviews (entrepreneur, verbatim and linked, never invented), and
# check what's new in AI tech. It saves an "Evolve report" with the top 5 upgrades ranked by impact and effort, each
# with its evidence, and sends Ty a Telegram summary he can forward to Claude to build.
import sys, re, hashlib, json
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

EVOLVE = ('Run the monthly EVOLVE RESEARCH for Studio AI Command (our own software). Follow the Replica method: '
 '1) RECON: use web_search to map what the leading competitors offer service businesses right now (GoHighLevel AI Employee, Podium, Weave, Birdeye, '
 'Hatch, ServiceTitan or Jobber AI receptionists, and any new AI front-desk or AI-team products you find): their main features, pricing tiers and '
 'what they changed recently (changelogs). Public pages only. '
 '2) WHAT USERS HATE: search public reviews and discussions (G2, Capterra, Trustpilot, Reddit, app store reviews) for their 1 to 3 star complaints '
 'and feature requests. Quote only real reviews, word for word, each with its link; if you cannot find enough, say so. Never invent a review, '
 'quote, rating or number. '
 '3) NEW TECH: check what Anthropic, OpenAI and Cloudflare (Agents SDK, Workflows, Browser Run, AI Gateway, MCP) released in the last month '
 'that could make our AI team smarter, faster or cheaper. '
 '4) Compare against what Command already does (read memory and the rulebook). Then save ONE report titled "Evolve report <month>" with: '
 'the TOP 5 upgrades ranked by impact on winning and keeping clients versus effort, each with what to build, why (the linked evidence), '
 'and how we would know it worked; plus a short "what competitors do that we already do better" list for sales. '
 'Never suggest copying a competitor\'s code, design, branding or copy. Finish by telling Ty the top 3 in plain words.')

rep('''  {
    id: "ops_health",''', '''  {
    id: "evolve_research",
    department: "head_of_systems",
    label: "Monthly evolve research \\u2192 top 5 upgrades (Replica method)",
    days: [1],
    hour: 9,
    monthly: true,
    enabled: true,
    prompt: ''' + json.dumps(EVOLVE) + '''
  },
  {
    id: "ops_health",''')

# monthly shifts only run in the first week of the month
rep("  const due = settings.shifts.filter((s) => s.enabled && s.hour === t.hour && s.days.includes(t.dow) && s.last_run !== t.slot && !leanShiftSkip(s.id, ls102.lean, t.date));",
    "  const due = settings.shifts.filter((s) => s.enabled && s.hour === t.hour && s.days.includes(t.dow) && s.last_run !== t.slot && !leanShiftSkip(s.id, ls102.lean, t.date) && !(s.monthly && Number(String(t.date).slice(8, 10)) > 7));")

# the shift is Studio Flow's own (client copies don't get it switched on)
rep('''  { v: 107, title: "The Arena: nightly scoring of the team's replies", rules: [''', '''  { v: 108, studio_only: true, title: "Monthly Evolve research (Replica method)", rules: [
    { rule: "Once a month the Head of Systems runs Evolve research: competitors' features, what their real users hate (only real, linked reviews, never invented) and new AI tech, ending in the top 5 upgrades for Command. Never suggest copying a competitor's code, design, branding or copy.", applies_to: ["head_of_systems", "command"] }] },
  { v: 107, title: "The Arena: nightly scoring of the team's replies", rules: [''')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v108 applied')
