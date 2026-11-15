# v24: every demo shows their website. Screenshot fallbacks + hourly retry + a branded preview of
# their real site when a site blocks robots. Also short clinic names ("About Face Brisbane").
import sys, re
f = sys.argv[1]
s = open(f).read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:100])
    s = s.replace(old, new)

# 1) Screenshot: if the normal capture fails (a site that never "goes quiet"), retry in a faster mode ---
rep('async function screenshot(env, url, extra = {}, retried = false) {', '''async function screenshot(env, url, extra = {}, retried = false) {
  let first = null;
  try { first = await shotOnce(env, url, extra, retried); } catch (e) { console.error("screenshot:", String(e.message || e).slice(0, 160)); }
  if (first || retried) return first;
  // Busy sites (chat widgets, trackers, video) can stop the normal capture from ever finishing.
  try { return await shotOnce(env, url, { gotoOptions: { waitUntil: "domcontentloaded", timeout: 2e4 }, waitForTimeout: 8e3 }, true); } catch (e) { console.error("screenshot (fast mode):", String(e.message || e).slice(0, 160)); return null; }
}
async function shotOnce(env, url, extra = {}, retried = false) {''')
rep('const again = await screenshot(env, url, { waitForTimeout: 11e3 }, true).catch(() => null);', 'const again = await shotOnce(env, url, { waitForTimeout: 11e3 }, true).catch(() => null);')

# 2) brandOf also keeps their main image and headline, for the branded preview -----------------------
rep('  return { colour: usableColour(colour) || null, icon: icon || null };\n}', '''  const ogImg = abs(attr(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || attr(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i));
  const h1 = (raw.match(/<h1[^>]*>([\\s\\S]{2,400}?)<\\/h1>/i) || [])[1];
  const headline = h1 ? h1.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "'").replace(/&nbsp;/g, " ").replace(/\\s+/g, " ").trim().slice(0, 110) : "";
  return { colour: usableColour(colour) || null, icon: icon || null, image: ogImg || null, headline: headline || null };
}''')

# 3) Short display names: "About Face Brisbane (About Face Cosmetic Medical Clinic)" -> "About Face Brisbane"
rep('var enc = encodeURIComponent;\n', '''var enc = encodeURIComponent;
var shortName = (n) => { const v = String(n || "").replace(/\\s*\\([^)]*\\)\\s*/g, " ").replace(/\\s+(Pty\\.?\\s*Ltd\\.?|Pty|Ltd)\\.?$/i, "").replace(/\\s+/g, " ").trim(); return v.length >= 3 ? v : String(n || "").trim(); };
''')
rep('const kb = { ...call2.input, clinic_name: call2.input.clinic_name || prospect.business_name,', 'const kb = { ...call2.input, clinic_name: shortName(call2.input.clinic_name || prospect.business_name),')
rep('const name = kb.clinic_name || d.business_name;', 'const name = shortName(kb.clinic_name || d.business_name);')
rep('  const name = kb.clinic_name || c.business_name;\n  const col = usableColour(L.accent)', '  const name = shortName(kb.clinic_name || c.business_name);\n  const col = usableColour(L.accent)')

# 4) Demo page: when no screenshot (yet), a branded preview of their real site with the orb ----------
rep('''<button class="bub" id="bub" type="button" aria-label="Open the chat"><span class="bo" id="bubo"></span></button></div></div></div></div></section>` : ""}''',
'''<button class="bub" id="bub" type="button" aria-label="Open the chat"><span class="bo" id="bubo"></span></button></div></div></div></div></section>` : (() => {
  const B = kb.brand || {}, img = /^https:\\/\\//.test(B.image || "") ? B.image : "", logo = /^https:\\/\\//.test(B.icon || "") ? B.icon : "";
  const head = B.headline || String(kb.summary || "").split(/(?<=[.!?])\\s/)[0] || `Welcome to ${name}`;
  return `<section class="sec"><h2>Here's ${esc6(host2 || "your site")} with it switched on</h2><p class="sub">A preview of your website with your receptionist ready in the corner.</p>
<div class="browser"><div class="chrome"><i></i><i></i><i></i><div class="url">${esc6(host2)}</div></div><div class="shot pv"${img ? ` style="background-image:linear-gradient(100deg,rgba(6,11,20,.82),rgba(6,11,20,.35) 60%,rgba(6,11,20,.15)),url('${esc6(img)}')"` : ""}>
<div class="pvi">${logo ? `<img class="pvl" src="${esc6(logo)}" alt="" loading="lazy">` : ""}<div class="pvn">${esc6(name)}</div><div class="pvh">${esc6(head)}</div><div class="pvb">${esc6(kb.booking?.how || kb.booking?.system ? "Book an appointment" : "Contact us")}</div></div>
<div class="widget"><div class="pop"><b>Hi! \\u{1F44B} I'm ${esc6(poss(name))} receptionist.</b>Ask me anything, or let's get you booked.</div><div class="brow"><button class="bl" id="bl" type="button" tabindex="-1" aria-hidden="true">Chat with ${esc6(name)}</button><button class="bub" id="bub" type="button" aria-label="Open the chat"><span class="bo" id="bubo"></span></button></div></div></div></div></section>`; })()}''')
rep('.shot{position:relative;aspect-ratio:1280/800;background:#E9EEF5}',
    '.shot{position:relative;aspect-ratio:1280/800;background:#E9EEF5}.shot.pv{background-color:color-mix(in srgb,var(--b) 30%,#0a1220);background-image:radial-gradient(120% 90% at 85% 10%,color-mix(in srgb,var(--b) 55%,transparent),transparent 60%),linear-gradient(135deg,color-mix(in srgb,var(--b) 40%,#0a1220),#060b14);background-size:cover;background-position:center;color:#fff}'
    '.pvi{position:absolute;left:6%;top:12%;max-width:52%;display:grid;gap:clamp(6px,1.2vw,14px)}.pvl{width:clamp(34px,5vw,64px);height:clamp(34px,5vw,64px);object-fit:contain;border-radius:12px;background:rgba(255,255,255,.92);padding:6px}'
    '.pvn{font-weight:700;font-size:clamp(12px,1.6vw,18px);line-height:1.2;letter-spacing:.06em;text-transform:uppercase;opacity:.9}.pvh{font-weight:800;font-size:clamp(20px,3.6vw,46px);line-height:1.06;letter-spacing:-.01em;text-wrap:balance}'
    '.pvb{justify-self:start;margin-top:4px;padding:clamp(7px,1vw,12px) clamp(12px,1.8vw,22px);border-radius:999px;background:var(--b);font-weight:700;font-size:clamp(11px,1.3vw,15px);box-shadow:0 10px 24px -10px var(--b)}')

# 5) Hourly: retry missing screenshots for recent demos (up to 4 tries) ------------------------------------
rep('  await continueDemos(e, 2).catch((x) => console.error("demos:", x.message));',
    '  await continueDemos(e, 2).catch((x) => console.error("demos:", x.message));\n  await retryDemoShots(e).catch((x) => console.error("demo screenshots:", x.message));')
rep('async function teamScheduled(event, env) {', '''async function retryDemoShots(env) {
  if (!rendererReady(env)) return;
  const since = new Date(Date.now() - 21 * 864e5).toISOString();
  const rows = await select(env, "agent_demos", `has_shot=not.is.true&created_at=gte.${since}&select=token,website,kb&order=created_at.desc&limit=12`).catch(() => []);
  let done = 0;
  for (const d of rows) {
    if (done >= 2) break;
    const tries = Number(d.kb?.shot_tries || 0);
    if (tries >= 4 || !/^https?:\\/\\//.test(d.website || "")) continue;
    done++;
    const shot = await screenshot(env, d.website).catch(() => null);
    let ok = !!shot;
    if (ok) { const seen = await renderPage(env, d.website).catch(() => null); if (seen && looksBlocked(seen)) ok = false; }
    if (ok) await update(env, "agent_demos", `token=eq.${d.token}`, { shot, has_shot: true }).catch(() => {});
    else await update(env, "agent_demos", `token=eq.${d.token}`, { kb: { ...(d.kb || {}), shot_tries: tries + 1 } }).catch(() => {});
  }
}
async function teamScheduled(event, env) {''')

open(f, 'w').write(s)
print('v24 screenshot guarantee + short names applied')
