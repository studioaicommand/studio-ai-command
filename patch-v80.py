# v80: client copies never show the "Jarvis" name (Marvel/Disney own it). Same voices, renamed "Butler style" and "Cedar".
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('''  if (p === "/voice-style" && m === "GET") { const cfg = await voiceCfg(env); return J({ ok: true, cfg, voices: VOICES, personas: Object.fromEntries(Object.entries(PERSONAS).map(([k, v]) => [k, { name: v.name, desc: v.desc }])),''',
    '''  if (p === "/voice-style" && m === "GET") { const cfg = await voiceCfg(env); const wl = !!(await instGet(env).catch(() => ({}))).custom; const dej = (t) => wl ? String(t).replace(/Jarvis \\(Cedar\\)/g, "Cedar").replace(/the Jarvis voice/g, "the butler voice").replace(/Jarvis style/g, "Butler style").replace(/Jarvis/g, "Butler") : t; return J({ ok: true, cfg, voices: VOICES.map((v) => ({ ...v, name: dej(v.name), note: dej(v.note) })), personas: Object.fromEntries(Object.entries(PERSONAS).map(([k, v]) => [k, { name: dej(v.name), desc: dej(v.desc) }])),''')
rep("The Jarvis style is a calm, witty, British-voiced right hand.", "' + (INST && INST.custom ? 'The Butler style' : 'The Jarvis style') + ' is a calm, witty, British-voiced right hand.")
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v80 applied')
