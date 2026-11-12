# v62: monthly profit & loss (Stripe + manual income; exact Anthropic/OpenAI costs with admin keys; fixed costs; AI by area).
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
team, ui, css = [open(D + f).read() for f in ('v62-team.js', 'v62-ui.js', 'v62-ui.css')]
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
rep('  if (seg[0] === "browser") { const r55 = await v55Route(p, m, body, env); if (r55) return r55; }', '  if (seg[0] === "money") { const r62 = await v62Route(p, m, body, env, url); if (r62) return r62; }\n  if (seg[0] === "browser") { const r55 = await v55Route(p, m, body, env); if (r55) return r55; }')
assert '`' not in ui + css and '${' not in ui + css
rep('  VIEWS.brain = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('/* Phone AI (v45) */', css + '\n/* Phone AI (v45) */')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v62 applied')
