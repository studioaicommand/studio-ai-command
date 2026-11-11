# v41: Phase 1 security. Personal logins with passkeys (Face ID / fingerprint), invites and roles (Owner / Manager / Staff),
# a sealed security log (HMAC-linked entries), an AES-256 vault for stored tokens and a secrets check.
# The Studio key + Telegram code keeps working as the owner's backup login.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
backend = open(D + 'mem-backend.js').read()
ui = open(D + 'mem-ui.js').read()
css = open(D + 'mem-ui.css').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:80], s.count(old))
    s = s.replace(old, new)
rep('function secSb(env) {', backend + '\nfunction secSb(env) {')
rep('async fetch(request, env, ctx) { const sec2 = await secGate(request, env).catch((e) => secJson({ ok: false, error: "Login check failed: " + e.message }, 500)); if (sec2) return sec2;',
    'async fetch(request, env, ctx) { const mg = await memGate(request, env).catch((e) => secJson({ ok: false, error: "Login check failed: " + e.message }, 500)); if (mg instanceof Response) return mg; if (mg) request = mg; const sec2 = mg ? null : await secGate(request, env).catch((e) => secJson({ ok: false, error: "Login check failed: " + e.message }, 500)); if (sec2) return sec2;')
rep('    if (off) return secIssue(env, request, cfg.hours, st.gen, false);',
    '    if (off) { await secLog(env, { actor: "Ty (Studio key)", action: "login", summary: "Signed in with the Studio key (two-step is off) on " + secDevice(request) }); return secIssue(env, request, cfg.hours, st.gen, false); }')
rep('    await secPut(env, "security_state", { ...st, fails: 0, min_iat: +m[1] + 1 });',
    '    await secPut(env, "security_state", { ...st, fails: 0, min_iat: +m[1] + 1 });\n    await secLog(env, { actor: "Ty (Studio key)", action: "login", summary: "Signed in with the Studio key + code on " + secDevice(request) });')
rep('    await secPut(env, "security_state", { ...st, gen: st.gen + 1 });',
    '    await secPut(env, "security_state", { ...st, gen: st.gen + 1 });\n    await secLog(env, { actor: memCaller(request).name, action: "signout_all", summary: "Every Studio-key session was signed out" });')
rep('    await secPut(env, "security", next);',
    '    await secPut(env, "security", next);\n    await secLog(env, { actor: memCaller(request).name, action: "settings", summary: "Login settings changed: " + next.hours + "h sessions, codes by " + next.channel });')
rep('        await secPut(env, "security_state", { ...st, fails: 0, locked_until: Date.now() + 15 * 6e4, min_iat: Date.now() });',
    '        await secPut(env, "security_state", { ...st, fails: 0, locked_until: Date.now() + 15 * 6e4, min_iat: Date.now() });\n        await secLog(env, { actor: "unknown", action: "login_locked", summary: "5 wrong login codes from " + secDevice(request) + ": locked 15 minutes" });')
assert '`' not in ui and '${' not in ui and '`' not in css
rep('  VIEWS.brain = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('.wf-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 18px}', css.replace('\\', '\\\\') + '\n.wf-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 18px}')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v41 passkeys, roles, sealed log, vault applied')
