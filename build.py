# Builds worker.mjs from src/ (the source of truth since v109): the files listed in src/ORDER, joined in order.
# Edit the files in src/ directly. The old patch chain (legacy/) is kept for history only.
# The app version (var APP = { "v": ... }) is stamped from a hash of the source, so every change gets a new
# version automatically (the deploy uses it to confirm the new code is live).
import os, re, hashlib
order = [l.strip() for l in open('src/ORDER') if l.strip()]
out = ''.join(open(os.path.join('src', f)).read() for f in order)
pat = re.compile(r'var APP = \{ "v": "[0-9a-f]+"')
assert len(pat.findall(out)) == 1, 'APP version marker not found exactly once'
v = hashlib.sha256(pat.sub('var APP = { "v": ""', out).encode()).hexdigest()[:10]
out = pat.sub('var APP = { "v": "' + v + '"', out)
open('worker.mjs', 'w').write(out)
print('worker.mjs built from', len(order), 'source files,', len(out), 'bytes, version', v)
