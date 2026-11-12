# v66: Client onboarding intake (website /start/ -> GHL note + tags + branded confirmation + Telegram)
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
team = open('/home/claude/w/v66-team.js').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
rep('macLinkPublic, leakPublic } = (() => {', 'macLinkPublic, leakPublic, onboardPublic } = (() => {')
rep('macLinkPublic, leakPublic };', 'macLinkPublic, leakPublic, onboardPublic };')
rep('if (r63) return r63; } ', 'if (r63) return r63; } if (new URL(request.url).pathname === "/api/v1/onboard") { const r66 = await onboardPublic(request, env, ctx).catch(() => new Response(JSON.stringify({ ok: false, error: "Something went wrong. Please try again." }), { status: 500, headers: { "Content-Type": "application/json" } })); if (r66) return r66; } ')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v66 applied')
