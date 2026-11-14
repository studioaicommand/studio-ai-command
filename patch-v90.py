# v90 "Log in to my socials": one guided run in the Command Chrome window (one tab). It opens Facebook, waits while Ty
# logs in and presses Continue, then moves the same tab on to Instagram, then LinkedIn. Continue button in the DM Desk.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

rep('''  if (t.status === "waiting") t.status = "running";
  if (t.kind === "dm_send") {''', '''  if (t.status === "waiting") t.status = "running";
  if (t.kind === "social_login") {
    const L = t.login;
    for (;;) {
      const site = L.sites[L.i];
      if (!site) return browserFinish(env, t, "done", "You're logged in to " + L.sites.map((x) => x.name).join(", ") + " in Command Chrome. Scans and sends can start now.", false);
      if (!L.opened) { L.opened = true; t.steps.push({ n: t.steps.length + 1, kind: "goto", desc: "Opened " + site.name }); await browserSave(env, t); return { kind: "goto", url: site.url, ms: 2500 }; }
      if (!L.asked) { L.asked = true; t.status = "needs_ty"; t.ask = "Log in to " + site.name + " in the Command Chrome window (including any code they send you), then press Continue." + (L.sites[L.i + 1] ? " Next up: " + L.sites[L.i + 1].name + "." : ""); t.ask_at = new Date().toISOString(); t.steps.push({ n: t.steps.length + 1, desc: "Waiting for Ty to log in to " + site.name }); await browserSave(env, t); return { kind: "wait", ms: 6000 }; }
      L.i++; L.opened = false; L.asked = false;
    }
  }
  if (t.kind === "dm_send") {''')
rep('  if (p === "/dm-queue/scan" && m === "POST") {', '''  if (p === "/dm-queue/login" && m === "POST") {
    const ALL = { facebook: { name: "Facebook", url: "https://www.facebook.com/" }, instagram: { name: "Instagram", url: "https://www.instagram.com/accounts/login/" }, linkedin: { name: "LinkedIn", url: "https://www.linkedin.com/login" } };
    const which = (Array.isArray(body.sites) && body.sites.length ? body.sites : ["facebook", "instagram", "linkedin"]).filter((k) => ALL[k]);
    const sites = which.map((k) => ALL[k]);
    const r = await dmBrowserTask(env, { kind: "social_login", goal: "Log in to " + sites.map((x) => x.name).join(", ") + " in Command Chrome", start_url: sites[0].url, login: { sites, i: 0, opened: true, asked: false } });
    return json(r, r.ok ? 200 : 400);
  }
  if (p === "/dm-queue/scan" && m === "POST") {''')
rep("task: bt && [\"dm_send\", \"friends_scan\"].includes(bt.kind) ?", "task: bt && [\"dm_send\", \"friends_scan\", \"social_login\"].includes(bt.kind) ?")
rep("""'<b>' + (d.browser.task.kind === 'dm_send' ? 'Sending your approved messages\\u2026' : 'Scanning your friends\\u2026') + '</b> '""",
    """'<b>' + (d.browser.task.kind === 'dm_send' ? 'Sending your approved messages\\u2026' : d.browser.task.kind === 'social_login' ? 'Logging in to your socials\\u2026' : 'Scanning your friends\\u2026') + '</b> '""")
rep("""(d.browser.task && d.browser.task.live ? '<button class="btn sm ghost" id="dmStop">Stop</button>' : '')""",
    """'<span class="row" style="gap:8px">' + (d.browser.task && d.browser.task.live && d.browser.task.ask ? '<button class="btn sm pri" id="dmCont">Continue</button>' : '') + (d.browser.task && d.browser.task.live ? '<button class="btn sm ghost" id="dmStop">Stop</button>' : (d.browser.online ? '<button class="btn sm ghost" id="dmLogin">Log in to my socials</button>' : '')) + '</span>'""")
rep("    const st = $('#dmStop', el); if (st) st.onclick = async () => {", """    const ct = $('#dmCont', el); if (ct) ct.onclick = async () => { try { await team('/browser/continue', { method: 'POST', body: {} }); toast('Carrying on', 'ok'); setTimeout(() => still('dms', el) && VIEWS.dms(el), 2500); } catch (x) { toast(x.message, 'bad'); } };
    const lg = $('#dmLogin', el); if (lg) lg.onclick = async () => { try { await team('/dm-queue/login', { method: 'POST', body: {} }); toast('Command Chrome is opening Facebook on your Mac. Log in, then press Continue here', 'ok'); setTimeout(() => still('dms', el) && VIEWS.dms(el), 4000); } catch (x) { toast(x.message, 'bad'); } };
    if (d.browser && d.browser.task && d.browser.task.live && d.browser.task.kind === 'social_login') setTimeout(() => { if (still('dms', el) && !document.querySelector('.dm-item textarea:focus')) VIEWS.dms(el); }, 8000);
    const st = $('#dmStop', el); if (st) st.onclick = async () => {""")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v90 applied')
