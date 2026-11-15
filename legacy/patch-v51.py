# v51: the outreach design team (critique panel on every concept, peer lessons, weekly results retro).
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('  if (!aiHold) await noShowWatch(e).catch((x) => console.error("no-show rebooker:", x.message));',
    '  if (!aiHold) await noShowWatch(e).catch((x) => console.error("no-show rebooker:", x.message));\n  if (instMods.outreach && !aiHold && brisbaneNow().hour === 8 && new Date().getUTCDay() === 0) await wsdRetro(e).catch((x) => console.error("design retro:", x.message));')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v51 applied')
