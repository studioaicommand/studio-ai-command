# v23: one phone number per business, sharper demo screenshots (no black/blank heroes),
# and the premium brand-coloured floating-orb receptionist on client sites and demos.
import sys, re
f = sys.argv[1]
s = open(f).read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:100])
    s = s.replace(old, new)

# 1) One phone number per business ---------------------------------------------------------------
rep('''var enc = encodeURIComponent;
async function call(env, method, path, body, prefer) {''', '''var enc = encodeURIComponent;
// Keep ONE callable number: "(07) 3839 8228 (CBD); (07) 3207 9000" -> "(07) 3839 8228".
function onePhone(v) {
  if (v == null) return v;
  const raw = String(v).trim();
  if (!raw) return null;
  for (const part of raw.split(/\\s*(?:;|,|\\/|\\||\\bor\\b|&|\\band\\b|\\n)\\s*/i)) {
    const clean = part.replace(/\\([^)]*[a-z][^)]*\\)/gi, " ").replace(/[a-z:]+/gi, " ").replace(/[^\\d+()\\s-]/g, " ").replace(/\\s+/g, " ").trim();
    if (clean.replace(/\\D/g, "").length >= 8) return clean.replace(/^[-\\s]+|[-\\s(]+$/g, "");
  }
  return raw.slice(0, 40);
}
const phoneRows = (b) => Array.isArray(b) ? b.map((r) => r && typeof r === "object" && "phone" in r ? { ...r, phone: onePhone(r.phone) } : r) : b && typeof b === "object" && "phone" in b ? { ...b, phone: onePhone(b.phone) } : b;
async function call(env, method, path, body, prefer) {
  if (body && /^agent_prospects(\\?|$)/.test(path) && (method === "POST" || method === "PATCH")) body = phoneRows(body);''')

# call list: show one number, and quietly fix the stored record
m = re.search(r'async function callList\(env, limit = 20\) \{\n  const rows = \(await select\(env, "agent_prospects", [^\n]*\n', s)
assert m
s = s[:m.end()] + '''  for (const r of rows) { const one = onePhone(r.phone); if (one !== r.phone) { const old = r.phone; r.phone = one; update(env, "agent_prospects", `id=eq.${encodeURIComponent(r.id)}`, { phone: one }).catch(() => {}); } }
''' + s[m.end():]
rep('businesses:prospects.map(p=>{const c=workflowClient(p,clients);return {id:p.id,business_name:p.business_name,decision_maker:p.decision_maker,email:p.email,phone:p.phone,',
    'businesses:prospects.map(p=>{const c=workflowClient(p,clients);return {id:p.id,business_name:p.business_name,decision_maker:p.decision_maker,email:p.email,phone:onePhone(p.phone),')
rep('return {ok:true,prospect:{id:p.id,business_name:p.business_name,website:p.website,phone:p.phone,',
    'return {ok:true,prospect:{id:p.id,business_name:p.business_name,website:p.website,phone:onePhone(p.phone),')

# 2) Sharper screenshots: wait for slow heroes; retake when the picture is nearly blank -----------
rep('''gotoOptions: { waitUntil: "networkidle2", timeout: 25e3 }, waitForTimeout: 3500, addStyleTag: [{ content: HIDE_CHAT_CSS }] };''',
    '''gotoOptions: { waitUntil: "networkidle2", timeout: 25e3 }, waitForTimeout: 6000, addStyleTag: [{ content: HIDE_CHAT_CSS }] };''')
rep('''  return out && out.length > 2e3 && out.length < 14e5 ? out : null;
}''', '''  // A real homepage JPEG is detailed; a near-empty one (black hero mid-fade, blank page) is tiny.
  if (out && out.length < 6e4 && !retried) {
    const again = await screenshot(env, url, { waitForTimeout: 11e3 }, true).catch(() => null);
    if (again && again.length > out.length) out = again;
  }
  return out && out.length > 2e3 && out.length < 14e5 ? out : null;
}''')
rep('async function screenshot(env, url) {\n  const body = {', 'async function screenshot(env, url, extra = {}, retried = false) {\n  const body = {')
s = s.replace('''waitForTimeout: 6000, addStyleTag: [{ content: HIDE_CHAT_CSS }] };''', '''waitForTimeout: 6000, addStyleTag: [{ content: HIDE_CHAT_CSS }], ...extra };''', 1)
open(f, 'w').write(s)
print('v23 phone + screenshot patch applied')

# 3) Client-site launcher: just the floating brand orb (no pill, no rings) ----------------------------
s = open(f).read()
ENGINE = open('orb-engine.js').read().strip()
i = s.index('function loaderResponse'); j = s.index('return new Response(js, { headers });', i)
seg = s[i:j]
a = seg.index('.sfw-b{position:fixed;'); b = seg.index('@keyframes sfwp{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.35);opacity:0}}') + len('@keyframes sfwp{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.35);opacity:0}}')
ORBCSS = ('.sfw-b{position:fixed;"+S+":22px;bottom:24px;width:68px;height:68px;border-radius:50%;border:0;padding:0;margin:0;background:none;cursor:pointer;z-index:2147483646;'
  '-webkit-tap-highlight-color:transparent;animation:sfwh 4.6s ease-in-out infinite;transition:filter .2s}'
  '.sfw-b:hover{filter:brightness(1.12)}.sfw-b:focus-visible{outline:2px solid "+C.col+";outline-offset:6px}'
  '.sfw-o{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 45%,"+C.col+" 0,color-mix(in srgb,"+C.col+" 55%,#000) 58%,#04080f 100%);'
  'box-shadow:0 16px 32px -10px rgba(0,0,0,.5),0 0 26px -6px "+C.col+",inset 0 0 0 1px rgba(255,255,255,.28)}'
  '.sfw-b:after{content:\'\';position:absolute;left:18%;right:18%;bottom:-17px;height:9px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.26),transparent);animation:sfws 4.6s ease-in-out infinite;pointer-events:none}'
  '.sfw-x{position:absolute;right:-3px;top:-3px;width:24px;height:24px;border-radius:50%;background:#fff;color:#13233D;display:none;place-items:center;box-shadow:0 4px 12px rgba(0,0,0,.25);z-index:2}'
  '.sfw-x svg{width:13px;height:13px}.sfw-b.o .sfw-x{display:grid}.sfw-b.o{animation:none}'
  '@keyframes sfwh{50%{transform:translateY(-6px)}}@keyframes sfws{50%{transform:scale(.78);opacity:.5}}'
  '@media(max-width:600px){.sfw-b{width:60px;height:60px;"+S+":16px;bottom:18px}}'
  '@media(prefers-reduced-motion:reduce){.sfw-b,.sfw-b:after{animation-duration:9s}}')
seg = seg[:a] + ORBCSS + seg[b:]
seg = seg.replace('bottom:98px', 'bottom:112px')
old_btn = seg[seg.index('var b=d.createElement("button");'):seg.index('var tip=null')]
seg = seg.replace(old_btn, 'var b=d.createElement("button");b.className="sfw-b";b.type="button";b.setAttribute("aria-label","Chat with "+C.name);b.setAttribute("aria-expanded","false");b.innerHTML=\'<span class="sfw-o"></span><span class="sfw-x" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span>\';\n')
seg = seg.replace(',B=b.innerHTML', '')
seg = seg.replace('b.innerHTML=open?X:B;b.classList.toggle("n",open||!C.label);', 'b.classList.toggle("o",open);b.setAttribute("aria-expanded",open?"true":"false");')
assert 'b.classList.toggle("o",open)' in seg, 'toggle not patched'
seg = seg.replace('function mount(){d.body.appendChild(f);d.body.appendChild(b);', 'function mount(){d.body.appendChild(f);d.body.appendChild(b);try{SFO.add(b.querySelector(".sfw-o"),C.col)}catch(e){}')
# put the orb engine at the top of the loader (inside the same IIFE string)
seg = seg.replace('const js = `(function(){if(window.__sfw)return;window.__sfw=1;', 'const js = ORB_ENGINE + `\n(function(){if(window.__sfw)return;window.__sfw=1;', 1)
assert 'ORB_ENGINE + `' in seg
s = s[:i] + seg + s[j:]
s = s.replace('function loaderResponse(env, url, c) {', 'var ORB_ENGINE = ' + __import__('json').dumps(ENGINE) + ';\nfunction loaderResponse(env, url, c) {', 1)
open(f, 'w').write(s)
print('v23 floating-orb launcher applied')

# 4) Chat panel: premium dark glass in the brand colour (default), orb header, big orb for voice ---------
s = open(f).read()
s = s.replace('theme: L.theme === "dark" ? "dark" : "light",', 'theme: L.theme === "light" ? "light" : "dark",', 1)
i = s.index('function panelResponse'); j = s.index('function testPage', i); seg = s[i:j]
def r(old, new):
    global seg
    assert seg.count(old) == 1, old[:80]
    seg = seg.replace(old, new)
r('const cfg = { k: c.widget_key,', 'const cfg = { col: lk.col, k: c.widget_key,')
r('''const T = dark ? { bg: "#0B1220", bg2: "#0F1A2E", ink: "#EAF2FF", mu: "#93A9C6", line: "rgba(255,255,255,.09)", bot: "rgba(255,255,255,.06)", input: "rgba(255,255,255,.05)" }''',
  '''const T = dark ? { bg: "#060b14", bg2: "#0a1322", ink: "#EEF4FF", mu: "#9DB0C9", line: "rgba(255,255,255,.08)", bot: "rgba(255,255,255,.07)", input: "rgba(255,255,255,.06)" }''')
PREMIUM = ('.dk{background:radial-gradient(130% 55% at 50% -8%,color-mix(in srgb,var(--b) 55%,transparent),transparent 62%),linear-gradient(175deg,color-mix(in srgb,var(--b) 30%,#060b14),#060b14 55%,#04070d)}'
  '.dk .h{background:transparent;padding:16px 14px 12px}.dk .h:after{display:none}.dk .log,.dk .chips,.dk form,.dk .ft{background:transparent}.dk form{border-top-color:var(--line)}'
  '.hob{position:relative;width:46px;height:46px;flex:none;border-radius:50%}'
  '.dk .r.b .m{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:none}.dk .mi{display:none}.dk .r.u .m{box-shadow:0 8px 22px -8px color-mix(in srgb,var(--b) 70%,transparent)}'
  '.dk .chip{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14);color:var(--ink)}.dk .chip:hover{border-color:color-mix(in srgb,var(--b) 70%,#fff)}'
  '.dk .ib.mic{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.18)}.dk input:focus{border-color:color-mix(in srgb,var(--b) 70%,#fff)}'
  '.dk .vo{background:radial-gradient(120% 70% at 50% 0%,color-mix(in srgb,var(--b) 45%,transparent),transparent 60%),linear-gradient(170deg,color-mix(in srgb,var(--b) 40%,#060b14),#04070d);top:0;padding-top:70px}'
  '.dk .orb{width:190px;height:190px;background:none;box-shadow:none;animation:none;position:relative;margin-bottom:6px}'
  '.dk .orb:before,.dk .orb:after{content:"";position:absolute;border-radius:50%;pointer-events:none}'
  '.dk .orb:before{inset:-12%;border:1px dashed rgba(255,255,255,.2);transform:rotate(calc(var(--sfo-spin,0deg)*-1.6))}'
  '.dk .orb:after{inset:-24%;border:1px solid rgba(255,255,255,.13);background:radial-gradient(circle at 50% 0,color-mix(in srgb,var(--b) 40%,#fff) 0 2.5px,transparent 8px);transform:rotate(var(--sfo-spin,0deg))}'
  '.dk .vo .st{color:#fff}.dk .vo .lc{color:#cfdcef}')
r('</style></head><body>', PREMIUM + '</style></head><body${dark ? \' class="dk"\' : ""}>')
r('<div class="h"><div class="av" id="av">${esc4(initials)}</div>', '<div class="h">${dark ? \'<div class="hob" id="hob" aria-hidden="true"></div>\' : `<div class="av" id="av">${esc4(initials)}</div>`}')
r('<div class="orb"></div>', '<div class="orb" id="vorb"></div>')
r('<script nonce="${nonce}">(function(){var C=', '<script nonce="${nonce}">${ORB_ENGINE}\n(function(){var C=')
r('avatar($("av"));', 'if($("av"))avatar($("av"));try{if($("hob"))SFO.add($("hob"),C.col);if(document.body.className==="dk"&&$("vorb"))SFO.add($("vorb"),C.col,{big:true})}catch(e){}')
r('function vui(on,st,lc){', 'function vui(on,st,lc){try{SFO.state(on?"listening":"idle")}catch(e){}')
r('else if(t==="input_audio_buffer.speech_started"){', 'else if(t==="input_audio_buffer.speech_started"){try{SFO.state("listening")}catch(e){}')
r('else if(t==="response.created"){', 'else if(t==="response.created"){try{SFO.state("speaking")}catch(e){}')
s = s[:i] + seg + s[j:]
open(f, 'w').write(s)
print('v23 premium panel applied')

# 5) Demo pages: the brand orb floats on the prospect's own screenshot and heads the "try it" chat ---------
s = open(f).read()
a = s.index('// src/team/demo.js'); b = s.index('// src/team/mission.js'); seg = s[a:b]
def r(old, new):
    global seg
    assert seg.count(old) == 1, old[:80]
    seg = seg.replace(old, new)
r('<button class="bub" id="bub" type="button" aria-label="Open the chat">${svg("chat", 26)}</button>',
  '<button class="bub" id="bub" type="button" aria-label="Open the chat"><span class="bo" id="bubo"></span></button>')
r('<div class="ph"><div class="av" id="av">${esc6(initials)}</div>', '<div class="ph"><div class="av sfoav" id="av" aria-hidden="true"></div>')
r('</style></head><body>', '.bub{background:none!important;box-shadow:none!important;position:relative;width:clamp(50px,6.4vw,70px)!important;height:clamp(50px,6.4vw,70px)!important;animation:sfwh 4.6s ease-in-out infinite}'
  '.bub .bo{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 45%,var(--b) 0,color-mix(in srgb,var(--b) 55%,#000) 58%,#04080f 100%);box-shadow:0 16px 30px -10px rgba(0,0,0,.55),0 0 24px -6px var(--b),inset 0 0 0 1px rgba(255,255,255,.28)}'
  '.bub:after{content:"";position:absolute;left:18%;right:18%;bottom:-15px;height:8px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.3),transparent);animation:sfws 4.6s ease-in-out infinite}'
  '.sfoav{background:none!important;border:0!important;box-shadow:none!important;position:relative;width:48px!important;height:48px!important;overflow:visible!important}'
  '@keyframes sfwh{50%{transform:translateY(-6px)}}@keyframes sfws{50%{transform:scale(.78);opacity:.5}}@media(prefers-reduced-motion:reduce){.bub,.bub:after{animation-duration:9s}}\n</style></head><body>')
# the orb replaces the logo avatar, so drop the logo loader for it
m = __import__('re').search(r'\$\{kb\.brand\?\.icon \? `\(function\(\)\{var im=new Image\(\);[^\n]*\n', seg)
assert m, 'logo loader not found'
seg = seg[:m.start()] + seg[m.end():]
r('var $=function(i){return document.getElementById(i)},log=$("log"),f=$("f"),q=$("q");',
  'var $=function(i){return document.getElementById(i)},log=$("log"),f=$("f"),q=$("q");\ntry{var bc=getComputedStyle(document.documentElement).getPropertyValue("--b").trim()||"#2f6feb";SFO.add($("av"),bc);if($("bubo"))SFO.add($("bubo"),bc)}catch(e){}')
i = seg.index('<script nonce="${nonce}">'); seg = seg[:i] + '<script nonce="${nonce}">${ORB_ENGINE}\n' + seg[i + len('<script nonce="${nonce}">'):]
s = s[:a] + seg + s[b:]
open(f, 'w').write(s)
print('v23 demo orbs applied')

# 6) Command > Clients: onboarding matches the new orb design ------------------------------------------
s = open(f).read()
def rs(old, new):
    global s
    assert s.count(old) == 1, old[:90]
    s = s.replace(old, new)
# new clients start on the premium orb design
rs('look: { name: "", greeting: "", accent: kb.brand?.colour || "", logo: kb.brand?.icon || "", theme: "light", launcher: "", position: "right" },',
   'look: { name: "", greeting: "", accent: kb.brand?.colour || "", logo: kb.brand?.icon || "", theme: "dark", launcher: "", position: "right" },')
rs('<div class="card">Tap the chat bubble in the bottom-right corner and talk to it like a customer would.</div>',
   '<div class="card">Tap the floating orb in the bottom-right corner and talk to it like a customer would.</div>')
# Look & brand card: no bubble label, orb design by default, live orb colour preview
rs('''<p class="mu sm">Make the receptionist feel like theirs. Changes show on their website straight away.</p><form id="lk">' +''',
   '''<p class="mu sm">Make the receptionist feel like theirs: a floating orb in their brand colour. Changes show on their website straight away.</p><div class="lkp" id="lkp" style="--oc:' + esc(/^#[0-9a-f]{6}$/i.test((c.look || {}).accent || "") ? c.look.accent : "#2f6feb") + '"><span class="lko"></span><span class="xs mu">Preview of their floating orb. Open the test page to see it live.</span></div><style>.lkp{display:flex;align-items:center;gap:14px;margin:6px 0 12px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}.lko{width:52px;height:52px;flex:none;border-radius:50%;background:radial-gradient(circle at 36% 30%,#fff 0,color-mix(in srgb,var(--oc) 40%,#fff) 14%,var(--oc) 48%,color-mix(in srgb,var(--oc) 45%,#000) 78%,#04080f 100%);box-shadow:0 0 26px -4px var(--oc),inset 0 0 0 1px rgba(255,255,255,.25);animation:lkf 4.6s ease-in-out infinite}@keyframes lkf{50%{transform:translateY(-5px)}}@media(prefers-reduced-motion:reduce){.lko{animation-duration:9s}}</style><form id="lk">' +''')
rs('''["launcher", "Bubble label (optional)", "e.g. Chat with us", "text"], ["logo", "Logo / avatar image link", "https://\\u2026", "url"]]''',
   '''["logo", "Logo image link (used on the light chat)", "https://\\u2026", "url"]]''')
rs('''<option value="light"' + ((c.look || {}).theme !== "dark" ? " selected" : "") + '>Light chat</option><option value="dark"' + ((c.look || {}).theme === "dark" ? " selected" : "") + '>Dark chat</option>''',
   '''<option value="dark"' + ((c.look || {}).theme !== "light" ? " selected" : "") + '>Premium orb (dark glass)</option><option value="light"' + ((c.look || {}).theme === "light" ? " selected" : "") + '>Light chat</option>''')
rs('''save({ look: Object.fromEntries(["name", "greeting", "launcher", "logo", "accent", "theme", "position"].map((k2) => [k2, String(f.get(k2) || "")])) }, "Look saved \\u2713 Open the test page to see it"); };''',
   '''save({ look: Object.fromEntries(["name", "greeting", "logo", "accent", "theme", "position"].map((k2) => [k2, String(f.get(k2) || "")])) }, "Look saved \\u2713 Open the test page to see it"); };
    { const ci = $("#lk input[name=accent]", el), pv = $("#lkp", el); if (ci && pv) ci.oninput = () => pv.style.setProperty("--oc", ci.value); }''')
open(f, 'w').write(s)
print('v23 Command clients look updated')

# 7) Phones: a small glass "Chat with <clinic>" label beside the orb (desktop stays orb-only) ----------
s = open(f).read()
i = s.index('function loaderResponse'); j = s.index('return new Response(js, { headers });', i); seg = s[i:j]
def r(old, new):
    global seg
    assert seg.count(old) == 1, old[:80]
    seg = seg.replace(old, new)
r("'@media(max-width:600px){.sfw-b{width:60px;height:60px;\"+S+\":16px;bottom:18px}}'" if False else '@media(max-width:600px){.sfw-b{width:60px;height:60px;"+S+":16px;bottom:18px}}',
  '.sfw-l{display:flex;align-items:center;gap:7px;position:fixed;"+S+":98px;bottom:40px;z-index:2147483645;max-width:calc(100vw - 130px);padding:10px 24px 10px 15px;border-radius:999px;'
  'background:rgba(255,255,255,.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);color:#13233D;font:600 14px/1.2 -apple-system,Segoe UI,Arial,sans-serif;border:0;'
  'box-shadow:0 10px 26px -10px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.9);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:sfwi .35s ease-out}'
  '@media(max-width:600px){.sfw-b{width:60px;height:60px;"+S+":16px;bottom:18px}.sfw-l{"+S+":84px;bottom:30px;font-size:13.5px;padding:9px 20px 9px 14px;max-width:calc(100vw - 110px)}}'
  '.sfw-l:before{content:\'\';width:7px;height:7px;flex:none;border-radius:50%;background:#20c37a;box-shadow:0 0 0 3px rgba(32,195,122,.18)}.sfw-l.o{display:none}')
r('var tip=null,open=false,', 'var lb=d.createElement("button");lb.type="button";lb.className="sfw-l";lb.textContent="Chat with "+String(C.name||"us").replace(/ +(Pty|Ltd|Limited|Group)( .*)?$/i,"").slice(0,26);lb.setAttribute("aria-hidden","true");lb.tabIndex=-1;\nvar tip=null,open=false,')
r('b.classList.toggle("o",open);', 'b.classList.toggle("o",open);lb.classList.toggle("o",open);')
r('b.onclick=toggle;', 'b.onclick=toggle;lb.onclick=toggle;')
r('function mount(){d.body.appendChild(f);d.body.appendChild(b);', 'function mount(){d.body.appendChild(f);d.body.appendChild(lb);d.body.appendChild(b);')
s = s[:i] + seg + s[j:]
open(f, 'w').write(s)
print('v23 phone label applied')

# 8) Demo pages: same "Chat with <clinic>" glass label beside the floating orb ----------------------------
s = open(f).read()
a = s.index('// src/team/demo.js'); b = s.index('// src/team/mission.js'); seg = s[a:b]
def r(old, new):
    global seg
    assert seg.count(old) == 1, old[:80]
    seg = seg.replace(old, new)
r('<button class="bub" id="bub" type="button" aria-label="Open the chat"><span class="bo" id="bubo"></span></button>',
  '<div class="brow"><button class="bl" id="bl" type="button" tabindex="-1" aria-hidden="true">Chat with ${esc6(name)}</button><button class="bub" id="bub" type="button" aria-label="Open the chat"><span class="bo" id="bubo"></span></button></div>')
r('@keyframes sfwh{50%{transform:translateY(-6px)}}', '.brow{display:flex;align-items:center;gap:12px}.bl{border:0;cursor:pointer;display:flex;align-items:center;gap:7px;max-width:min(260px,40vw);padding:clamp(6px,.9vw,10px) clamp(14px,1.8vw,22px) clamp(6px,.9vw,10px) clamp(10px,1.2vw,14px);border-radius:999px;background:rgba(255,255,255,.93);color:#13233D;font:600 clamp(10px,1.25vw,14px)/1.2 -apple-system,Segoe UI,Arial,sans-serif;box-shadow:0 10px 26px -10px rgba(0,0,0,.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bl:before{content:"";width:7px;height:7px;flex:none;border-radius:50%;background:#20c37a;box-shadow:0 0 0 3px rgba(32,195,122,.18)}@keyframes sfwh{50%{transform:translateY(-6px)}}')
r('SFO.add($("av"),bc);if($("bubo"))SFO.add($("bubo"),bc)}catch(e){}', 'SFO.add($("av"),bc);if($("bubo"))SFO.add($("bubo"),bc);if($("bl"))$("bl").addEventListener("click",function(){$("bub").click()})}catch(e){}')
s = s[:a] + seg + s[b:]
open(f, 'w').write(s)
print('v23 demo label applied')

# 9) the old pill hid its <span> label on phones; that rule must not hide the orb
s = open(f).read()
assert s.count('.sfw-b span{display:none}') == 1
s = s.replace('.sfw-b span{display:none}', '.sfw-b .sfw-old{display:none}')
# give the voice status room below the orb rings
s = s.replace('.dk .orb{width:190px;height:190px;background:none;box-shadow:none;animation:none;position:relative;margin-bottom:6px}', '.dk .orb{width:190px;height:190px;background:none;box-shadow:none;animation:none;position:relative;margin-bottom:44px}')
open(f, 'w').write(s)
print('v23 phone orb fix applied')
