# v67: Web Design Director talks first (plan -> Build it), edits only agreed sections, makes new photos on request,
# fills every empty photo spot with niche photos (AI, or Pexels stock if PEXELS_API_KEY), keeps THEIR brand colours,
# and fixes: highlighted headline words overflowing behind the photo, lone full stop, light "More of our work" band.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
team = open('/home/claude/w/v67-team.js').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')

# ── renderer fixes ──
rep('  if (h && t.includes(h)) return t.replace(h, `<em class="hl">${h}</em>`);',
    '  if (h && t.includes(h)) { const i = t.indexOf(h), tail = (t.slice(i + h.length).match(/^[.,!?;:]+/) || [""])[0]; return t.slice(0, i) + `<em class="hl">${h}${tail}</em>` + t.slice(i + h.length + tail.length); }')
rep(';color:var(--p);position:relative;white-space:nowrap}', ';color:var(--p);position:relative;white-space:normal}')
rep('.wk{background:color-mix(in srgb,var(--ink) 94%,var(--p));color:#fff}', '.wk{background:color-mix(in srgb,#0b111c 90%,var(--p));color:#fff}')

# ── design: their brand colours, appealing ──
rep('Design their concept homepage, leak report and offers now. Call save_site_design.', '${WSD_BRAND_RULE}\nDesign their concept homepage, leak report and offers now. Call save_site_design.')
rep('const out = wsdStyleFor(wsdClean(spec, look), brain);', 'const out = wsdStyleFor(wsdClean(spec, look), brain);\n  if (!/colou?r|palette|#[0-9a-f]{6}/i.test(extra.replace(/COMPLETELY DIFFERENT design[^:]*:[^.]*\\./, ""))) wsdBrandGuard(out, look);')

# ── old one-shot adjust: keep their colours unless asked; every photo must load and empty spots get filled ──
rep('  if (rec.reviews?.rating || rec.reviews?.items?.length) spec.reviews = rec.reviews;\n  const cost = await wsdLog(env, u, regenerate ?',
    '  if (!/colou?r|palette|#[0-9a-f]{6}/i.test(ask)) wsdBrandGuard(spec, rec.look);\n  await wsdImagesFix(env, spec, { name: rec.name, industry: rec.industry || "", area: rec.area || "", website: rec.website || "", origin: (env.PUBLIC_ORIGIN || "https://studioflowandsystems.app").replace(/\\/+$/, "") }).catch((e) => console.error("demo images:", e.message));\n  if (rec.reviews?.rating || rec.reviews?.items?.length) spec.reviews = rec.reviews;\n  const cost = await wsdLog(env, u, regenerate ?')

# ── photo filler: our own stored photos are trusted; stock photo fallback ──
rep('const all = wsdSpecImages(spec).filter((u) => u !== spec.brand?.logo);', 'const all = wsdSpecImages(spec).filter((u) => u !== spec.brand?.logo && !/\\/demo\\/img\\/[0-9a-f]{16}\\.webp$/.test(u));')
rep('if (!env.OPENAI_API_KEY) return { removed: bad.size, generated: 0 };', 'if (!env.OPENAI_API_KEY && !env.PEXELS_API_KEY) return { removed: bad.size, generated: 0 };')
rep('const g = await wsdGenImage(env, j.prompt).catch(() => null);', 'const g = await wsdGenImage(env, j.prompt).catch(() => null) || await wsdStockImage(env, ((industry || "") + " " + String(j.prompt).split(". For ")[0]).slice(0, 80)).catch(() => null);')

# ── routes ──
rep('      if (seg[2] === "adjust" && m === "POST") return J(await wsdAdjust(env, t, body.message));',
    '      if (seg[2] === "talk" && m === "POST") return J(await wsdTalk(env, t, body.message));\n      if (seg[2] === "build-plan" && m === "POST") return J(await wsdBuildPlan(env, t));\n      if (seg[2] === "adjust" && m === "POST") return J(await wsdAdjust(env, t, body.message));')
rep('return J({ ok: true, demo: { critique: rec.critique || null, token: t,', 'return J({ ok: true, demo: { map: wsdMap(rec.spec), pending: rec.pending || null, critique: rec.critique || null, token: t,')

# ── UI: page map, talk first, plan card with Build it ──
rep('<h3>Talk to the Director</h3><p class="mu sm">Ask for any change. It updates the demo and learns your taste.</p>',
    '<h3>Talk to the Director</h3><p class="mu sm">Tell it what to change. It replies with its plan first, and nothing changes until you press Build it. Tap a section to point at it.</p><div class="wd-map" id="wdMap"></div>')
rep('<button class="btn pri" id="wdSend">Update demo</button>', '<button class="btn pri" id="wdSend">Send</button>')
m = re.search(r"^    const send = \(text\) =>[^\n]*\n", s, re.M)
assert m
ui = """    const showMap = (mp) => { const box = $('#wdMap', el); if (!box || !mp) return; box.innerHTML = mp.map((q) => '<button type="button" class="wd-sec' + (q.missing ? ' warn' : '') + '" data-wd-sec="' + q.n + '"><b>' + q.n + '</b><span>' + esc(q.type + (q.variant ? ' · ' + q.variant : '')) + '<small>' + esc(q.title) + '</small></span>' + (q.missing ? '<em>⚠ no photo</em>' : '') + '</button>').join(''); $$('[data-wd-sec]', box).forEach((b) => b.onclick = () => { const q = mp[+b.dataset.wdSec - 1]; let rest = ask.value; if (rest.startsWith('Section ') && rest.includes('): ')) rest = rest.split('): ').slice(1).join('): '); ask.value = 'Section ' + q.n + ' (' + q.type + '): ' + rest; ask.focus(); }); };
    const build = () => run('/build-plan', {}, 'Building only the agreed changes… (about 30–90 seconds)', (res) => { say(res.summary + ' · ' + wdMoney(res.cost_aud), 'ai'); showMap(res.map); $('#wdUndo', el).disabled = false; });
    const plan = (changes) => { const box = document.createElement('div'); box.className = 'wd-plan'; box.innerHTML = '<b class="sm">The plan</b>' + changes.map((c) => '<div class="wd-pl">' + (c.section ? 'Section ' + c.section : 'Brand') + ': ' + esc(c.what) + (c.new_photo || c.photo_url ? ' <small class="mu">(new photo)</small>' : '') + '</div>').join('') + '<div class="acts"><button class="btn pri sm" data-wd-build>Build it</button><button class="btn sm ghost" data-wd-tweak>Change something</button></div>'; log.append(box); log.scrollTop = log.scrollHeight; box.querySelector('[data-wd-build]').onclick = () => { box.remove(); build(); }; box.querySelector('[data-wd-tweak]').onclick = () => { box.remove(); ask.focus(); }; };
    const send = (text) => { if (!text) return; say(text, 'me'); ask.value = ''; $$('.wd-plan', log).forEach((n) => n.remove()); busy(true, 'Reading the page and thinking…'); team('/website-demos/' + token + '/talk', { method: 'POST', body: { message: text }, long: true }).then((res) => { busy(false); if (res.built) { say(res.summary + ' · ' + wdMoney(res.cost_aud), 'ai'); showMap(res.map); reload(); $('#wdUndo', el).disabled = false; return; } say(res.reply, 'ai'); showMap(res.map); if (res.ready && res.changes && res.changes.length) plan(res.changes); }).catch((e) => { busy(false); say('Not sent: ' + e.message, 'ai'); }); };
    showMap(x.map);
    if (x.pending && x.pending.changes && x.pending.changes.length) plan(x.pending.changes);
"""
s = s[:m.start()] + ui + s[m.end():]
rep('.wd-chat{position:sticky;top:12px}', '.wd-chat{position:sticky;top:12px}.wd-map{display:flex;flex-direction:column;gap:4px;max-height:26vh;overflow:auto;margin:10px 0}.wd-sec{display:flex;gap:10px;align-items:center;text-align:left;padding:7px 10px;border-radius:10px;border:1px solid rgba(125,190,255,.15);background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:13px}.wd-sec:hover{border-color:rgba(125,190,255,.45)}.wd-sec b{min-width:18px}.wd-sec span{display:flex;flex-direction:column;min-width:0}.wd-sec small{opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wd-sec em{margin-left:auto;font-style:normal;color:#ffb547;font-size:12px;white-space:nowrap}.wd-sec.warn{border-color:rgba(255,181,71,.6)}.wd-plan{padding:12px;border-radius:12px;border:1px solid rgba(58,182,255,.55);background:rgba(58,182,255,.06);display:flex;flex-direction:column;gap:6px}.wd-pl{font-size:13px;line-height:1.45}')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v67 applied')
