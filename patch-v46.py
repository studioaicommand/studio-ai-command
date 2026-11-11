# v46: AI budget guard. Real month-to-date Claude spend (Anthropic Cost Report, needs ANTHROPIC_ADMIN_KEY),
# Telegram warning, pause of background AI work at the pause level, and plain words when Anthropic's
# spend limit is hit (instead of a raw API error).
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
team, ui = open(D + 'budget-team.js').read(), open(D + 'budget-ui.js').read()
css = '.ab-card{margin-bottom:16px}.ab-bar{height:8px;border-radius:99px;background:rgba(125,190,255,.15);overflow:hidden;margin:14px 0 6px}.ab-bar i{display:block;height:100%;border-radius:99px;background:#4ade80}.ab-bar i.warn{background:#fbbf24}.ab-bar i.bad{background:#f87171}\n'
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:90], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
rep('"money", "phone_status"].includes(key)', '"money", "phone_status", "ai_budget", "ai_budget_status"].includes(key)')
rep('  if (seg[0] === "phone") {', '  if (seg[0] === "costs" && seg[1] === "budget") { const br = await aiBudgetRoute(p, m, body, env); if (br) return br; }\n  if (seg[0] === "phone") {')
rep('  await phoneSync(e).catch((x) => console.error("phone calls:", x.message));\n', '  await phoneSync(e).catch((x) => console.error("phone calls:", x.message));\n  await aiBudgetCheck(e).catch((x) => console.error("ai budget:", x.message));\n  const aiHold = await aiBackgroundPaused(e).catch(() => false);\n')
rep('  await runDueShifts(e, ', '  if (!aiHold) await runDueShifts(e, ')
for a in ['continueHunts', 'continueDemos', 'checkReplies', 'retryDemoShots']:
    rep('if (instMods.outreach) await ' + a, 'if (instMods.outreach && !aiHold) await ' + a)
rep('  await brainTick(e)', '  if (!aiHold) await brainTick(e)')
rep('    throw new Error(`Claude ${res.status}: ${text.slice(0, 400)}`);', '    if (res.status < 500 && AI_CAP_RE.test(text) && /limit|credit|billing/i.test(text)) throw new Error(await aiCapped(env, text));\n    throw new Error(`Claude ${res.status}: ${text.slice(0, 400)}`);')
rep('if (!r.ok) throw new Error(d.error?.message || `Claude returned HTTP ${r.status}`);', 'if (!r.ok) throw new Error(r.status < 500 && AI_CAP_RE.test(d.error?.message || "") ? await aiCapped(env, d.error.message) : d.error?.message || `Claude returned HTTP ${r.status}`);')
assert '`' not in ui and '${' not in ui
rep('  VIEWS.systems = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.systems = async (el) => {')
rep('/* Phone AI (v45) */', css + '/* Phone AI (v45) */')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v46 AI budget guard applied')
