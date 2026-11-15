# Builds worker.mjs from src/ (the source of truth since v109): the files listed in src/ORDER, joined in order.
# Edit the files in src/ directly. The old patch chain (build-worker.py + patch-v*.py) is kept for history only.
import os, sys
order = [l.strip() for l in open('src/ORDER') if l.strip()]
out = ''.join(open(os.path.join('src', f)).read() for f in order)
open('worker.mjs', 'w').write(out)
print('worker.mjs built from', len(order), 'source files,', len(out), 'bytes')
