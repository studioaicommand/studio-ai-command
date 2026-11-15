# One-off (v109): split the built worker.mjs into src/ files at its original module markers.
# After this, src/ is the source of truth and build.py stitches it back together.
import re, os, hashlib, sys
s = open('worker.mjs').read()
lines = s.split('\n')
marks = [(i, l) for i, l in enumerate(lines) if l.startswith('// src/')]
cuts = [0] + [i for i, _ in marks] + [len(lines)]
names = ['000-prelude'] + []
os.makedirs('src', exist_ok=True)
for f in os.listdir('src'):
    if f.endswith('.mjs'): os.remove(os.path.join('src', f))
order = []
for k in range(len(cuts) - 1):
    a, b = cuts[k], cuts[k + 1]
    if k == 0: name = 'prelude'
    else:
        m = re.match(r'// src/([\w/.-]+)', lines[a]); name = m.group(1).replace('.js', '').replace('/', '-')
    fn = '%03d-%s.mjs' % (k, name)
    chunk = '\n'.join(lines[a:b]) + ('\n' if b < len(lines) else '')
    open(os.path.join('src', fn), 'w').write(chunk)
    order.append(fn)
open('src/ORDER', 'w').write('\n'.join(order) + '\n')
print(len(order), 'files', hashlib.sha256(s.encode()).hexdigest()[:16])
