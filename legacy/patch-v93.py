# v93: Sales prompt names the right sender for outreach (ty@outreach, not hello@mail, which is for clients only).
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('3-email sequence from hello@mail.studioflowandsystems.com) once Ty approves.', '3-email sequence from ty@outreach.studioflowandsystems.com; client email stays on hello@mail.studioflowandsystems.com) once Ty approves.')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v93 applied')
