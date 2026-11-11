# v48: streamlined Command (16 tabs), the weekly booked-calls mission in every agent, Scout (daily market research
# turned into team ideas), the web designer's variety engine + receptionist/area sections + pitch bar + inline booking.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
team, ui, css = [open(D + f).read() for f in ('v48-team.js', 'v48-nav.js', 'v48-ui.css')]
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
rep('  if (seg[0] === "outreach") { const orr', '  if (seg[0] === "goal" || seg[0] === "scout") { const r48 = await v48Route(p, m, body, env); if (r48) return r48; }\n  if (seg[0] === "outreach") { const orr')
rep('''  if (instMods.outreach && !aiHold) await outreachAutopilot(e, await getSettings(e).catch(() => null)).catch((x) => console.error("outreach autopilot:", x.message));''',
    '''  if (instMods.outreach && !aiHold) await outreachAutopilot(e, await getSettings(e).catch(() => null)).catch((x) => console.error("outreach autopilot:", x.message));
  if (instMods.outreach && !aiHold) await scoutDaily(e).catch((x) => console.error("scout:", x.message));''')
rep('"ai_budget_status", "outreach_daily"].includes(key)', '"ai_budget_status", "outreach_daily", "growth_goal", "scout"].includes(key)')
# the mission, in every agent
rep('  const system = systemFor(dept, await memoryBlock(env), depth, charterOf(run.settings));',
    '  const system = systemFor(dept, (await memoryBlock(env)) + await missionBlock(env).catch(() => ""), depth, charterOf(run.settings));')
rep('    { type: "text", text: await instText(env, commandInstructions(snapshot2, "text")), cache_control: { type: "ephemeral" } }',
    '    { type: "text", text: await instText(env, commandInstructions(snapshot2, "text")), cache_control: { type: "ephemeral" } },\n    { type: "text", text: (await missionBlock(env).catch(() => "")) || "(no weekly mission set)" }')
rep('''        instructions: await instText(env, commandInstructions(memStripSnapshot(snap2, who), "voice") + (memRoleNote(who) ? "\\n\\n" + memRoleNote(who) : "")),''',
    '''        instructions: await instText(env, commandInstructions(memStripSnapshot(snap2, who), "voice") + (memRoleNote(who) ? "\\n\\n" + memRoleNote(who) : "") + await missionBlock(env).catch(() => "")),''')
# streamlined navigation (26 tabs -> 16)
rep('''    ["today", "Today", "home", [["today", "Today"], ["home", "Overview"], ["reports", "Reports"]]],''', '''    ["today", "Today", "home", [["today", "Today"], ["reports", "Reports"]]],''')
rep('''    ["growth", "Growth", "growth", [["growth", "Pipeline"], ["outreach", "Outreach today"], ["demos", "Website demos"], ["business", "Businesses"], ["goals", "Goals"]]],''', '''    ["growth", "Growth", "growth", [["outreach", "Outreach today"], ["growth", "Pipeline"], ["demos", "Website demos"]]],''')
rep('''    ["studio", "Studio AI", "studio", [["studio", "Talk to Studio"], ["team", "Team"], ["brain", "Team brain"], ["jobs", "AI jobs"], ["memory", "Memory"]]],''', '''    ["studio", "Studio AI", "studio", [["studio", "Talk to Studio"], ["team", "Team"], ["knowledge", "Knowledge"]]],''')
rep('''    ["settings", "Settings", "sliders", [["autopilot", "Autopilot"], ["security", "Security"], ["brand", "Brand & features"], ["connections", "Connections"], ["systems", "Systems lab"]]],''', '''    ["settings", "Settings", "sliders", [["connections", "Connections"], ["autopilot", "Autopilot"], ["brand", "Brand & features"], ["security", "Security"]]],''')
rep('''  const hubOf = (view) => HUBS.find((h) => h[3].some((t) => t[0] === view)) || HUBS[0];''',
    '''  const VIEW_HOST = { home: "today", goals: "today", business: "growth", jobs: "team", brain: "knowledge", memory: "knowledge", systems: "autopilot", scout: "team" };
  const hubOf = (view) => HUBS.find((h) => h[3].some((t) => t[0] === view || t[0] === VIEW_HOST[view])) || HUBS[0];''')
rep('''  const still = (view, el) => ROUTE.view === view && el.isConnected;''', '''  const still = (view, el) => (ROUTE.view === view || ROUTE.view === { goals: "today", jobs: "team", scout: "team", brain: "knowledge", memory: "knowledge" }[view]) && el.isConnected;''')
rep('''    const items = [["studio", "Studio AI", "studio"], ["autopilot", "Settings", "sliders"], ["money", "Money", "target"], ["offers", "Products & prices", "shop"], ["home", "Overview", "target"], ["reports", "Reports", "reports"]];''',
    '''    const items = [["studio", "Studio AI", "studio"], ["team", "Team & ideas", "studio"], ["money", "Money", "target"], ["offers", "Products & prices", "shop"], ["reports", "Reports", "reports"], ["connections", "Settings", "sliders"]];''')
rep('''    home: ["Command centre", "Everything that matters today, in one place"],''', '''    home: ["Command centre", "Everything that matters today, in one place"],
    knowledge: ["Knowledge", "What your AI team knows and has learned"],''')
rep('var VIEW_LABEL = { outreach:"Outreach today",', 'var VIEW_LABEL = { knowledge:"Knowledge",outreach:"Outreach today",')
rep("  const INST_VIEWS = { outreach: ['today', 'growth', 'demos', 'business'],", "  const INST_VIEWS = { outreach: ['today', 'growth', 'demos', 'business', 'outreach'],")
rep("    if (INST_OFF.has('today')) INST_HOME = 'home';", "    if (INST_OFF.has('today')) { INST_HOME = 'home'; if (!HUBS[0][3].some((x) => x[0] === 'home')) HUBS[0][3].unshift(['home', 'Overview']); }")
# UI
assert '`' not in ui + css and '${' not in ui + css
rep('  VIEWS.brain = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('/* Phone AI (v45) */', css.replace('\\', '\\\\') + '\n/* Phone AI (v45) */')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v48 applied')
