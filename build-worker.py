# Rebuild worker.mjs = deployed baseline + site assistant module + one route line.
s=open('worker-original-backup.mjs').read()
mod=open('site-assistant.js').read()
anchor='export default {\n  async queue(batch,env,ctx)'
assert s.count(anchor)==1
s=s.replace(anchor, mod+'\n'+anchor,1)
old='''    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/command") return claudeLivePage();'''
assert s.count(old)==1
s=s.replace(old,'''    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/v1/site/")) return siteAssistantRoute(request, env, ctx);
    if (request.method === "GET" && url.pathname === "/command") return claudeLivePage();''',1)
open('worker.mjs','w').write(s)
print('worker.mjs rebuilt', len(s))

# v20.4 patches -------------------------------------------------------------
import re
s=open('worker.mjs').read()
# 1) Free call is now 30 minutes (hyphenated call wording only; voice timers untouched).
n_before=len(re.findall(r'15-min',s))
s=re.sub(r'\b15-minute\b','30-minute',s)
s=re.sub(r'\b15-min\b','30-min',s)
assert 'Voice ended after 15 minutes' in s
# 2) Never reply a bare "Done." - say what actually ran.
old='      return { reply: reply || "Done.", tools_used: used, displays };'
assert s.count(old)==1
s=s.replace(old,'''      const fallback = used.length ? "I ran " + [...new Set(used)].join(", ") + " but didn't write a result. Please check Approvals / AI Jobs before treating it as done." : "I didn't take any action on that. Can you say it another way?";
      return { reply: reply || fallback, tools_used: used, displays };''',1)
# 3) Honesty rule about things Command has no tool for.
old2='Never claim a change happened until the tool says done.",'
assert s.count(old2)==1
s=s.replace(old2,'Never claim a change happened until the tool says done. Always reply in words (never just \\"Done.\\"): say what changed and where. You cannot cancel, move or delete GHL appointments, or delete GHL contacts or leads: if Ty asks, say so plainly and tell him to do it in GHL (Calendars > Appointments, or Contacts). If a request is queued as a job, say it is queued, not done.",',1)
open('worker.mjs','w').write(s)
print('v20.4 patches applied; 15-min occurrences replaced:',n_before)

# v21 command control
import subprocess, sys
subprocess.check_call([sys.executable, 'patch-v21.py', 'worker.mjs'])
# v22 scanner sees existing chat + demo upgrade pitch + clean Telegram text
subprocess.check_call([sys.executable, 'patch-v22.py', 'worker.mjs'])
# v23 one phone + sharper screenshots (+ orb widget)
subprocess.check_call([sys.executable, 'patch-v23.py', 'worker.mjs'])
# v24 every demo shows their website + short names
subprocess.check_call([sys.executable, 'patch-v24.py', 'worker.mjs'])
# v25 logo header + reactive voice orb above the chat
subprocess.check_call([sys.executable, 'patch-v25.py', 'worker.mjs'])
# v26 new receptionist plans + one master price
subprocess.check_call([sys.executable, 'patch-v26.py', 'worker.mjs'])
# v27 full price book in Command + premium offers page
subprocess.check_call([sys.executable, 'patch-v27.py', 'worker.mjs'])
# v28 Command Inbox: replies on SMS / Instagram / Facebook / web chat via GHL
subprocess.check_call([sys.executable, 'patch-v28.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v28b.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v29.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v30.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v30b.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v31.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v32.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v33.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v34.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v35.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v36.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v37.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v38.py', 'worker.mjs'])
# v39 website demos (Karinya, Playball Sunny Coast) hosted by Command with open alerts
subprocess.check_call([sys.executable, 'patch-v39.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v40.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v41.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v42.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v43.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v44.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v45.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v46.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v47.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v48.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v49.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v50.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v51.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v52.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v53.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v54.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v55.py', 'worker.mjs'])
# v56 GHL email events -> Command (opens/clicks/bounces/unsubscribes)
subprocess.check_call([sys.executable, 'patch-v56.py', 'worker.mjs'])
# v57 instant Telegram approvals, daily email number, held approvals send themselves
subprocess.check_call([sys.executable, 'patch-v57.py', 'worker.mjs'])
# v58 designer 2: images always show (proxy + AI images), design DNA, 7 new scroll moments, tighter spacing
subprocess.check_call([sys.executable, 'patch-v58.py', 'worker.mjs'])
# v59 the Playball standard (finder, quote builder, founder), delete demos, our work on every demo
subprocess.check_call([sys.executable, 'patch-v59.py', 'worker.mjs'])
# v60 email rules for the GHL inbox via Studio AI
subprocess.check_call([sys.executable, 'patch-v60.py', 'worker.mjs'])
# v61 free Workers AI for internal-only jobs + prompt caching
subprocess.check_call([sys.executable, 'patch-v61.py', 'worker.mjs'])
# v62 monthly profit & loss
subprocess.check_call([sys.executable, 'patch-v62.py', 'worker.mjs'])
# v63 Leak Report engine
subprocess.check_call([sys.executable, 'patch-v63.py', 'worker.mjs'])
# v66 onboarding intake
subprocess.check_call([sys.executable, 'patch-v66.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v67.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v68.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v69.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v70.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v71.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v72.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v73.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v74.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v75.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v76.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v77.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v78.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v79.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v80.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v81.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v82.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v83.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v84.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v85.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v86.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v87.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v88.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v89.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v90.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v91.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v92.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v93.py', 'worker.mjs'])
subprocess.check_call([sys.executable, 'patch-v94.py', 'worker.mjs'])
