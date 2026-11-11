# v43: white-label Phase 2 (make a template). Each copy of Command has an instance profile: business name, owner,
# logo, colours, industry template and switched-on features. Studio Flow's own Command (no profile) is unchanged.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
top, team = open(D + 'inst-top.js').read(), open(D + 'inst-team.js').read()
ua, ub, css = open(D + 'inst-ui-a.js').read(), open(D + 'inst-ui-b.js').read(), open(D + 'inst-ui.css').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:80], s.count(old))
    s = s.replace(old, new)
rep('function secSb(env) {', top + '\nfunction secSb(env) {')
rep('// src/team/demo.js\n', team + '\n// src/team/demo.js\n')
rep('if (mg instanceof Response) return mg; if (mg) request = mg;', 'if (mg instanceof Response) return mg; if (mg) request = mg; const ig = await instGate(request, env, ctx).catch((e) => secJson({ ok: false, error: String(e.message || e).slice(0, 200) }, 500)); if (ig) return ig;')
rep('  if (seg[0] === "website-demos") { const wr = await wsdRoute(p, m, body, env, url, seg); if (wr) return wr; }\n',
    '  if (seg[0] === "website-demos") { const wr = await wsdRoute(p, m, body, env, url, seg); if (wr) return wr; }\n  if (seg[0] === "instance") { const ir = await instRoute(p, m, body, env, request); if (ir) return ir; }\n')
rep('async function callClaude(env, body) {', 'async function callClaude(env, body) {\n  body = await instPrompt(env, body);')
rep('{ type: "text", text: commandInstructions(snapshot2, "text"), cache_control: { type: "ephemeral" } }', '{ type: "text", text: await instText(env, commandInstructions(snapshot2, "text")), cache_control: { type: "ephemeral" } }')
rep('        instructions: commandInstructions(memStripSnapshot(snap2, who), "voice") + (memRoleNote(who) ? "\\n\\n" + memRoleNote(who) : ""),',
    '        instructions: await instText(env, commandInstructions(memStripSnapshot(snap2, who), "voice") + (memRoleNote(who) ? "\\n\\n" + memRoleNote(who) : "")),')
rep("const base = offer ? siteInstructions(offer, 'chat') :", "const ikb = await instKb(env); const base = ikb ? receptionistPrompt(ikb, 'chat', { live: true }) : offer ? siteInstructions(offer, 'chat') :")
rep("body: JSON.stringify({ model: env.STUDIO_SITE_CHAT_MODEL || 'claude-haiku-5-5', max_tokens: 2000, system, messages })", "body: JSON.stringify({ model: env.STUDIO_SITE_CHAT_MODEL || 'claude-haiku-5-5', max_tokens: 2000, system: await instText(env, system), messages })")
rep('  await backfillExistingArchive(e).catch(', '  const instMods = (await instGet(e).catch(() => null))?.modules || { outreach: true, receptionist_product: true };\n  await backfillExistingArchive(e).catch(')
for c in ['  await runDemoFollowups(e).catch(', '  await continueHunts(e, 2).catch(', '  await continueDemos(e, 2).catch(', '  await retryDemoShots(e).catch(', '  await checkReplies(e, runAgent).catch(']:
    rep(c, '  if (instMods.outreach) ' + c.strip())
rep('  await clientsCron(e).catch(', '  if (instMods.receptionist_product) await clientsCron(e).catch(')
# app
assert '`' not in ua + ub + css and '${' not in ua + ub + css
rep('  function parse() {', ua.replace('\\', '\\\\') + '  function parse() {')
rep('(location.hash || "#/today")', '(location.hash || "#/" + INST_HOME)')
rep('    const view = TITLES[h[0]] ? h[0] : "today";', '    const view = TITLES[h[0]] && !INST_OFF.has(h[0]) ? h[0] : INST_HOME;')
rep('    document.title = t + " \\xB7 Studio AI";', '    document.title = t + " \\xB7 " + (INST && INST.custom ? INST.product_name : "Studio AI");')
rep('      if (!rows.length) rows.push(["growth", "spark", "Run a clinic hunt",', '      if (!rows.length && INST_OFF.has("growth")) rows.push(["studio", "spark", "Ask for today\'s priorities", "Your AI team picks the three things that matter most", "c"]);\n      if (!rows.length) rows.push(["growth", "spark", "Run a clinic hunt",')
rep('      if (c.status === "rejected") lead.push("Call list unavailable");', '      if (c.status === "rejected" && !INST_OFF.has("today")) lead.push("Call list unavailable");')
rep('<a class="btn pri lg" href="#/today">Open Today</a>', '<a class="btn pri lg" href="#/\' + (INST_OFF.has("today") ? "approvals" : "today") + \'">\' + (INST_OFF.has("today") ? "Open Inbox" : "Open Today") + \'</a>')
rep('  VIEWS.brain = async (el) => {', ub.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('["settings", "Settings", "sliders", [["autopilot", "Autopilot"], ["security", "Security"], ["connections", "Connections"], ["systems", "Systems lab"]]]',
    '["settings", "Settings", "sliders", [["autopilot", "Autopilot"], ["security", "Security"], ["brand", "Brand & features"], ["connections", "Connections"], ["systems", "Systems lab"]]]')
rep('    security: ["Security",', '    brand: ["Brand & features", "Whose Command this is: name, logo, colours, industry and features"],\n    security: ["Security",')
rep('var VIEW_LABEL = { demos:"Website demos",', 'var VIEW_LABEL = { brand:"Brand & features",demos:"Website demos",')
rep('.wf-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 18px}', css.replace('\\', '\\\\') + '\n.wf-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 18px}')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v43 white-label template (instance profile, brand, features, industry templates) applied')
