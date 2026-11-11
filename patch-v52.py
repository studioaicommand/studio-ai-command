# v52: branded outreach emails (built in another session); wrapper so it runs in place like the other patches.
import sys, subprocess, os
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
D = os.path.dirname(os.path.abspath(__file__))
subprocess.check_call([sys.executable, os.path.join(D, 'patch-v52-email-src.py'), W, W, os.path.join(D, 'email-brand-v52.js')])
print('v52 applied')
