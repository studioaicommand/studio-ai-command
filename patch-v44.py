# v44: white-label Phase 3. Studio console (Client Commands): every client copy's health, version and AI cost,
# connected by a per-copy FLEET_TOKEN (sealed in the vault). Owner-approved 24-hour support access (logged,
# no sending, payments, money or deleting). Lead finding can never be switched on in a client's copy.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
top, team, ui, css = [open(D + f).read() for f in ('fleet-top.js', 'fleet-team.js', 'fleet-ui.js', 'fleet-ui.css')]
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:80], s.count(old))
    s = s.replace(old, new)
rep('function secSb(env) {', top + '\nfunction secSb(env) {')
rep('// src/team/demo.js\n', team + '\n// src/team/demo.js\n')
rep('const ig = await instGate(request, env, ctx)', 'const ig = new URL(request.url).pathname.startsWith("/api/v1/fleet/") ? await fleetGate(request, env, ctx).catch((e) => secJson({ ok: false, error: String(e.message || e).slice(0, 200) }, 500)) : await instGate(request, env, ctx)')
rep('  if (seg[0] === "instance") { const ir = await instRoute(p, m, body, env, request); if (ir) return ir; }\n',
    '  if (seg[0] === "instance") { const ir = await instRoute(p, m, body, env, request); if (ir) return ir; }\n  if (seg[0] === "fleet" || seg[0] === "fleet-info") { const fr = await fleetRoute(p, m, body, env, url, seg); if (fr) return fr; }\n')
assert '`' not in ui + css and '${' not in ui + css
rep('  VIEWS.brain = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('["clients", "Clients", "shop", [["clients", "Clients"], ["money", "Money"], ["offers", "Products & prices"]]]', '["clients", "Clients", "shop", [["clients", "Clients"], ["fleet", "Client Commands"], ["money", "Money"], ["offers", "Products & prices"]]]')
rep('    brand: ["Brand & features",', '    fleet: ["Client Commands", "Every client\\u2019s own Command: health, version, AI cost and support access"],\n    brand: ["Brand & features",')
rep('var VIEW_LABEL = { brand:"Brand & features",', 'var VIEW_LABEL = { fleet:"Client Commands",brand:"Brand & features",')
rep('.wf-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 18px}', css.replace('\\', '\\\\') + '\n.wf-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 18px}')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v44 Studio console + support access applied')
