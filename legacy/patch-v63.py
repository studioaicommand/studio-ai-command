# v63: Leak Report engine (website Leak Calculator -> GHL contact + branded report + email + Telegram)
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
team = open('/home/claude/w/v63-team.js').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
rep('inboxRoute, inboxPriceBook: sitePriceBook, macLinkPublic } = (() => {', 'inboxRoute, inboxPriceBook: sitePriceBook, macLinkPublic, leakPublic } = (() => {')
rep('withTeamPanel, inboxRoute, inboxPriceBook, macLinkPublic };', 'withTeamPanel, inboxRoute, inboxPriceBook, macLinkPublic, leakPublic };')
rep('if (r54) return r54; } ', 'if (r54) return r54; } if (/^\\/(api\\/v1\\/leak$|leak\\/[a-f0-9]{24}$)/.test(new URL(request.url).pathname)) { const r63 = await leakPublic(request, env, ctx).catch((e) => new Response(JSON.stringify({ ok: false, error: "Something went wrong. Please try again." }), { status: 500, headers: { "Content-Type": "application/json" } })); if (r63) return r63; } ')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v63 applied')
