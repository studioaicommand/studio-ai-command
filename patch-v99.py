# v99 GST: Ty is not registered for GST yet, so the AI team never adds, quotes or mentions GST on prices, quotes or invoices.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep("Currency is AUD. Timezone is Australia/Brisbane (no daylight saving). GST is 10%.",
    "Currency is AUD. Timezone is Australia/Brisbane (no daylight saving). Studio Flow is NOT registered for GST yet: never add GST to prices, quotes or invoices, and never write 'inc GST' or '+ GST'. Prices are the prices. (If Ty says he has registered, GST in Australia is 10% and goes on top for business clients.)")
rep("e.g. Core offer: Backend Rebuild, $X inc GST", "e.g. Core offer: Backend Rebuild, $X")
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v99 applied')
