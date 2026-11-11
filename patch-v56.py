# v56: GHL email events (opened/clicked/bounced/unsubscribed/complained) reach Command through the inbox webhook.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
team = open(D + 'v56-team.js').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('if (!["outreach", "autopilot",', 'if (!["email_stats", "outreach", "autopilot",')
rep("async function inboxHandle(env, body) {\n  if (!enabled(env)) return { skipped: 'ghl not connected' };",
    "async function inboxHandle(env, body) {\n  if (!enabled(env)) return { skipped: 'ghl not connected' };\n  { const ev = emailEvName(body); if (ev) return emailEventRecord(env, body, ev); }")
rep('    demos: { built: Dm.length,', '    email: await emailStatsSummary(env).catch(() => null),\n    demos: { built: Dm.length,')
rep('    clientsLine || "",', '    snap?.email?.connected ? `\\u2709\\uFE0F Email opens (7 days): ${snap.email.opened} people opened \\xB7 ${snap.email.clicked} clicked \\xB7 ${snap.email.bounced} bounced \\xB7 ${snap.email.unsubscribed + snap.email.complained} unsubscribed` : "",\n    clientsLine || "",')
rep('\nasync function inboxRoute(request, rawEnv, ctx) {', '\n' + team + '\nasync function inboxRoute(request, rawEnv, ctx) {')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v56 applied')
