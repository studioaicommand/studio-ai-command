# v42: Studio AI for the team (each role gets only its tools and figures), back button + full screen on demo previews,
# no more iPhone zoom on typing, Touch ID wording, role-aware menu and greeting.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:80], s.count(old))
    s = s.replace(old, new)
rep('  if (request.method !== "POST") return jerr("Use POST.", 405);\n  const e = teamEnv(env);\n',
    '  if (request.method !== "POST") return jerr("Use POST.", 405);\n  const e = teamEnv(env);\n  const who = memCaller(request);\n')
rep('      if (!TEAM_TOOL_NAMES.has(b2.name)) {',
    '      if (!memToolOk(who.role, b2.name)) return Response.json({ ok: true, result: { ok: false, error: "That isn\'t available for your role. Ask Ty." } }, { headers: { "Cache-Control": "no-store" } });\n      if (!TEAM_TOOL_NAMES.has(b2.name)) {')
rep('        instructions: commandInstructions(snap2, "voice"),',
    '        instructions: commandInstructions(memStripSnapshot(snap2, who), "voice") + (memRoleNote(who) ? "\\n\\n" + memRoleNote(who) : ""),')
rep('        tools: OPERATOR_TOOLS,', '        tools: OPERATOR_TOOLS.filter((t) => memToolOk(who.role, t.name)),')
rep("role:'user',actor:'Ty',content:message", "role:'user',actor:who.key?'Ty':who.name,content:message")
rep('''      message,
      history: Array.isArray(b.history) ? b.history : [],
      snapshot: snap,
      allTools: OPERATOR_TOOLS,
      runAny: (name, args) => TEAM_TOOL_NAMES.has(name) ? commandTool(e, name, args, ctx) : operatorTool(request, env, name, args)''',
'''      message: memRoleNote(who) ? "[" + memRoleNote(who) + "]\\n\\n" + message : message,
      history: Array.isArray(b.history) ? b.history : [],
      snapshot: memStripSnapshot(snap, who),
      allTools: OPERATOR_TOOLS.filter((t) => memToolOk(who.role, t.name)),
      runAny: (name, args) => !memToolOk(who.role, name) ? Promise.resolve({ ok: false, error: "Not available for this person's role." }) : TEAM_TOOL_NAMES.has(name) ? commandTool(e, name, args, ctx) : operatorTool(request, env, name, args)''')
rep('  function lock(message) {', '  function lock(message) { delete document.documentElement.dataset.role; ME = null;')
rep("', Ty</div>", "', ' + esc((ME && ME.name) || 'Ty') + '</div>")
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v42 team Studio AI, demo back button, full screen, no-zoom inputs applied')
