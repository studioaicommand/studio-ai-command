# v59: the Playball standard (finder, quote builder, founder; photos everywhere), delete demos, "more of our work" on every demo.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
render, team = open(D + 'v59-render.js').read(), open(D + 'v59-team.js').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var WSD_DEFAULT_OFFERS = [', render + '\nvar WSD_DEFAULT_OFFERS = [')
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
# renderer: CSS, JS, showcase before the Studio Flow section
rep('<style>${wsdCss(t)}${WSD_CSS2(t)}</style>', '<style>${wsdCss(t)}${WSD_CSS2(t)}${WSD_CSS3()}</style>')
rep('<script>${WSD_MOTION2}</script>', '<script>${WSD_MOTION2}</script>\n<script>${WSD_MOTION3}</script>')
rep('  return `<section class="sfo" id="studio-flow">', '  return WSD_SHOWCASE(opt) + `<section class="sfo" id="studio-flow">')
# design team: the standard, new section types
rep('var WSD_DIRECTOR = `You are', 'var WSD_DIRECTOR = WSD_STANDARD + `\nYou are')
rep('var WSD_CRIT_SYSTEM = `You are', 'var WSD_CRIT_SYSTEM = WSD_STANDARD_CRIT + `You are')
rep('"receptionist", "area", "expand", "compare"] },', '"receptionist", "area", "expand", "compare", "finder", "quote", "founder"] },')
rep('compare: slider (drag to compare before/after; needs before + after images).', 'compare: slider (drag to compare before/after; needs before + after images). finder: tabs (a booking finder: items {title, tab (age group / service / suburb), when, where, spots (number left, 0 = full), text, cta}). quote: sliders (quote builder: sliders [{label, min, max, unit}], fields [short questions], button, image). founder: portrait (name, role, text, quote, image = their own photo only).')
rep('before_label: { type: "string" }, after_label: { type: "string" }', 'before_label: { type: "string" }, after_label: { type: "string" },\n  name: { type: "string" }, role: { type: "string" }, quote: { type: "string" }, sliders: { type: "array", items: { type: "object", properties: { label: { type: "string" }, min: { type: "number" }, max: { type: "number" }, unit: { type: "string" } } } }')
# fill photos everywhere: up to 6 AI images, every photo card counts
rep('var WSD_IMG_MAX = 4;', 'var WSD_IMG_MAX = 6;')
rep('else if (s.type === "features" && ["list", "panels", "flip", "rail", "bento"].includes(s.variant) && Array.isArray(s.items)) {\n      for (const x of s.items.slice(0, 3))', 'else if ((s.type === "quote") && !s.image) jobs.push({ set: (u) => { s.image = u; }, prompt: promptFor("split", s.title || "Happy customers") });\n    else if (s.type === "gallery" && !(s.images || []).filter(Boolean).length) jobs.push({ set: (u) => { s.images = [u]; }, prompt: promptFor("split", "A moment that shows the experience") });\n    else if (s.type === "features" && Array.isArray(s.items)) {\n      for (const x of s.items.slice(0, 4))')
# images route: live screenshots of our work
rep('  } else if (/^[0-9a-f]{16}\\.(webp|png|jpe?g)$/.test(parts[2] || "")) {', '  } else if (parts[2] === "work" && /^(katia|plf)\\.jpg$/.test(parts[3] || "")) {\n    res = await wsdWorkShot(env, parts[3].split(".")[0]).catch(() => null);\n  } else if (/^[0-9a-f]{16}\\.(webp|png|jpe?g)$/.test(parts[2] || "")) {')
# security scan: skip image blobs
rep('team_settings?select=key,value&limit=1000', 'team_settings?select=key,value&key=not.like.wsdimg:*&limit=1000')
# delete demos
rep('      if (seg[2] === "approve" && m === "POST") return J(await wsdApprove(env, t, body.on !== false));', '      if (seg[2] === "approve" && m === "POST") return J(await wsdApprove(env, t, body.on !== false));\n      if (!seg[2] && m === "DELETE") return J(await wsdDelete(env, t));')
rep("""    const row = (x) => '<button class="wd-demo" data-wd-open="' + esc(x.token) + '">""", """    const row = (x) => '<div class="wd-row"><button class="wd-del" type="button" title="Delete this demo" aria-label="Delete demo for ' + esc(x.name) + '" data-wd-del="' + esc(x.token) + '" data-name="' + esc(x.name) + '">\\u2715</button><button class="wd-demo" data-wd-open="' + esc(x.token) + '">""")
rep("' views \u00B7 ' + esc(x.chats || 0) + ' chats \u00B7 ' + wdMoney(x.cost_aud) + '</span></button>';", "' views \u00B7 ' + esc(x.chats || 0) + ' chats \u00B7 ' + wdMoney(x.cost_aud) + '</span></button></div>';")
rep("""    $$('[data-wd-open]', el).forEach((b) => b.onclick = () => { WD_OPEN = b.dataset.wdOpen; wdEditor(el, WD_OPEN); });""", """    $$('[data-wd-open]', el).forEach((b) => b.onclick = () => { WD_OPEN = b.dataset.wdOpen; wdEditor(el, WD_OPEN); });
    $$('[data-wd-del]', el).forEach((b) => b.onclick = async (e) => { e.stopPropagation(); if (!confirm('Delete the demo for ' + b.dataset.name + '? Its links stop working.')) return; b.disabled = true; try { await team('/website-demos/' + b.dataset.wdDel, { method: 'DELETE' }); b.closest('.wd-row').remove(); toast('Demo deleted', 'ok'); } catch (x) { b.disabled = false; toast(x.message, 'bad'); } });""")
rep('/* Phone AI (v45) */', '.wd-row{position:relative;display:flex;align-items:center;gap:6px;border-top:1px solid var(--ln,rgba(125,190,255,.18))}.wd-row .wd-demo{border-top:0;flex:1;min-width:0}.wd-del{flex:none;order:2;width:34px;height:34px;border-radius:10px;border:1px solid rgba(248,113,113,.35);background:rgba(248,113,113,.08);color:#fca5a5;cursor:pointer;font-size:14px}.wd-del:hover{background:rgba(248,113,113,.2)}\n/* Phone AI (v45) */')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v59 applied')
