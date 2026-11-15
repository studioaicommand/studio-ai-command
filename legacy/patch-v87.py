# v87 Looks: four premium styles for Command, chosen in Settings › Brand & features › Look.
# Midnight (the original deep navy glass), Graphite (quiet near-black), Ivory (warm light, editorial serif), Aurora (violet and teal).
# Works for Studio Flow's Command and every client copy (each picks its own; a client's brand colour still leads).
import sys, re, hashlib, json
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

css = open('v87/auto.css').read() + open('v87/themes.css').read()
rep('var APP = { "v": "', 'var THEMES_CSS = ' + json.dumps(css) + ';\nvar APP = { "v": "')
rep('  "/app/app.css": ["text/css; charset=utf-8", () => APP.css],', '  "/app/app.css": ["text/css; charset=utf-8", () => APP.css + "\\n" + THEMES_CSS],')
n = s.count('family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap')
assert n >= 1, n
s = s.replace('family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap', 'family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&family=Fraunces:opsz,wght@9..144,500;600&family=Sora:wght@500;600;700&display=swap')

# app: apply the saved look instantly, then sync it from the server once
rep('''// The Studio key lives in memory only. Every data call goes to the same worker APIs as before.
(() => {
  "use strict";''', '''// The Studio key lives in memory only. Every data call goes to the same worker APIs as before.
(() => {
  "use strict";
  const LOOKS = { midnight: '#020711', graphite: '#0a0a0b', ivory: '#f4f1ea', aurora: '#0a0614' };
  const applyLook = (t) => { if (!LOOKS[t]) t = 'midnight'; if (t === 'midnight') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; try { localStorage.setItem('sfLook', t); } catch (e) {} const mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.content = LOOKS[t]; };
  try { const t0 = localStorage.getItem('sfLook'); if (t0) applyLook(t0); } catch (e) {}
  let lookSynced = false;
  const lookSync = () => { if (lookSynced) return; lookSynced = true; team('/ui-theme').then((r) => { if (r && r.theme) applyLook(r.theme); }).catch(() => {}); };''')
rep('    (VIEWS[ROUTE.view] || VIEWS.home)(body).catch(', '    lookSync();\n    (VIEWS[ROUTE.view] || VIEWS.home)(body).catch(')
# a client's brand colour still leads the main button in any look
rep("st.textContent = '.btn.pri{background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 62%,#000));", "document.documentElement.dataset.brand = '1'; st.textContent = '.btn.pri,html[data-theme] body .btn.pri{color:#fff;background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 62%,#000));")

UI = r'''  // v87 Look picker (Settings › Brand & features)
  const LOOK_INFO = [
    ['midnight', 'Midnight', 'Deep navy glass. The original Command look.', ['#020711', '#071426', '#7dd3fc', 'rgba(18,42,77,.95)', 'linear-gradient(135deg,#0ea5e9,#2563eb)']],
    ['graphite', 'Graphite', 'Quiet near-black, no colour noise. Calm and focused.', ['#0a0a0b', '#141416', '#f4f4f5', '#1a1a1d', '#fafafa']],
    ['ivory', 'Ivory', 'Warm paper white with an editorial serif. Light and premium.', ['#f4f1ea', '#fbf9f4', '#1d1b17', '#ffffff', '#1d1b17']],
    ['aurora', 'Aurora', 'Violet and teal glow. Bold and modern.', ['#0a0614', '#160c2c', '#c4b5fd', 'rgba(46,24,86,.95)', 'linear-gradient(135deg,#8b5cf6,#22d3ee)']]
  ];
  const lookCard = async (host) => {
    if ($('.v87-card', host)) return;
    let cur = 'midnight'; try { cur = (await team('/ui-theme')).theme || 'midnight'; } catch (e) {}
    const box = document.createElement('section'); box.className = 'wf-glass v87-card';
    box.innerHTML = '<span class="wf-eyebrow">LOOK</span><h3 style="margin:4px 0">Choose how Command looks</h3><p class="mu sm" style="margin:0">One tap changes it for everyone who uses this Command. Your brand colour still leads the main buttons.</p><div class="v87-looks">' +
      LOOK_INFO.map((l) => '<button type="button" class="v87-look' + (l[0] === cur ? ' on' : '') + '" data-look="' + l[0] + '"><span class="tick">✓</span><span class="pv" style="background:' + l[3][0] + '"><i class="sb" style="background:' + l[3][1] + '"></i><span class="mn"><i class="h" style="background:' + l[3][2] + '"></i><i class="c" style="background:' + l[3][3] + ';border:1px solid ' + (l[0] === 'ivory' ? 'rgba(40,33,22,.12)' : 'rgba(255,255,255,.08)') + '"></i><i class="b" style="background:' + l[3][4] + '"></i></span></span><span class="nm"><b>' + l[1] + '</b><small>' + l[2] + '</small></span></button>').join('') + '</div>';
    host.prepend(box);
    const keepFirst = new MutationObserver(() => { if (host.firstElementChild !== box && box.isConnected) host.prepend(box); }); keepFirst.observe(host, { childList: true }); setTimeout(() => keepFirst.disconnect(), 8000);
    $$('[data-look]', box).forEach((b) => b.onclick = async () => {
      const t = b.dataset.look, prev = cur; applyLook(t); $$('.v87-look', box).forEach((x) => x.classList.toggle('on', x === b));
      try { await team('/ui-theme', { method: 'POST', body: { theme: t } }); cur = t; toast(b.querySelector('b').textContent + ' look saved', 'ok'); }
      catch (e) { applyLook(prev); $$('.v87-look', box).forEach((x) => x.classList.toggle('on', x.dataset.look === prev)); toast(e.message, 'bad'); }
    });
  };
  queueMicrotask(() => { const B87 = VIEWS.brand; if (B87) VIEWS.brand = async (el) => { await B87(el); if (still('brand', el)) lookCard(el); }; });
'''
rep('  // v81 DM Desk\n', UI + '  // v81 DM Desk\n')

# server: the saved look (owner only can change it)
rep('  if (p === "/monday-report" && m === "POST") return json(await mondayReport(env, { force: true }));',
    '''  if (p === "/monday-report" && m === "POST") return json(await mondayReport(env, { force: true }));
  if (p === "/ui-theme" && m === "GET") { const v = await secGet(env, "ui_theme").catch(() => null); return json({ ok: true, theme: v?.theme || "midnight" }); }
  if (p === "/ui-theme" && m === "POST") { const mh = request.headers.get("x-sf-member") || ""; if (mh && mh.split("|")[1] !== "owner") return json({ ok: false, error: "Only the owner can change the look." }, 403); const t = String(body.theme || ""); if (!["midnight", "graphite", "ivory", "aurora"].includes(t)) return json({ ok: false, error: "Unknown look." }, 400); await secPut(env, "ui_theme", { theme: t, at: new Date().toISOString() }); await audit(env, { actor: "Ty", action: "look_changed", target_type: "settings", target_id: "ui_theme", summary: "Command look: " + t }).catch(() => {}); return json({ ok: true, theme: t }); }''')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v87 applied')
