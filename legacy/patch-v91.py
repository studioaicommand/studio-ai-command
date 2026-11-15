# v91 Command Chrome works like a person at the computer (Command Link v3):
# - a visible pointer glides to each thing it clicks or types into, with a "Command: ..." caption, so Ty can watch;
# - it can click by position on pages without normal buttons (page builders like GHL), and type where the cursor is;
# - it can open, switch and close tabs;
# - a "Do it for me" box (Studio AI › Do it for me): type what you want done, watch a live view of the window.
# Safety: risky clicks by position still need Ty's yes, and Command Link itself refuses to click a Send/Pay/Delete spot
# that wasn't approved, or type into password, code or card fields.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# Command Link versions: 3 is the new one; 2 and 3 can both run browser tasks
rep('    const agent = request.headers.get("x-sf-agent") === "2" ? 2 : 1;', '    const agent = Math.max(1, Math.min(9, parseInt(request.headers.get("x-sf-agent") || "1", 10) || 1));')
rep('    if (!items.length) { const task = agent === 2 ?', '    if (!items.length) { const task = agent >= 2 ?')
rep('  if (cfg.agent !== 2) return { ok: false, error: "Command Link on Ty\'s Mac needs', '  if (!(cfg.agent >= 2)) return { ok: false, error: "Command Link on Ty\'s Mac needs')
rep('  if (cfg.agent !== 2) return { ok: false, error: "Command Link needs a one-time update:', '  if (!(cfg.agent >= 2)) return { ok: false, error: "Command Link needs a one-time update:')
rep("      (d.agent === 2 ? '' : '<p class=\"v55-warn\">'", "      (d.agent >= 3 ? '' : d.agent === 2 ? '<p class=\"v55-warn\">New: Command Link 3 shows a pointer while it works, uses tabs, and can click on page builders. To update: tap \\u201cUnlink\\u201d above, then \\u201cSet up on this Mac\\u201d and run the new line in Terminal.</p>' : '<p class=\"v55-warn\">'")

# the agent learns position clicks, typing where the cursor is, and tabs
rep('  kind: { type: "string", enum: ["goto", "click", "type", "select", "key", "scroll", "back", "wait", "ask_ty", "finish", "type_dm", "dm_done", "save_people"] },',
    '''  kind: { type: "string", enum: ["goto", "click", "type", "select", "key", "scroll", "back", "wait", "ask_ty", "finish", "type_dm", "dm_done", "save_people", "click_xy", "type_focused", "new_tab", "switch_tab", "close_tab"] },
  x: { type: "number", description: "For click_xy: left position in the screenshot, in pixels." },
  y: { type: "number", description: "For click_xy: top position in the screenshot, in pixels." },
  target: { type: "string", description: "For click_xy: exactly what is at that spot (the visible words or icon), e.g. 'Add element +' or 'Save'." },
  tab: { type: "integer", description: "For switch_tab and close_tab: the tab number from TABS." },''')
rep("- FRIENDS SCAN (only when the goal says so):", """- If what you need isn't in the element list (page builders like GoHighLevel, drag-and-drop editors, canvas or odd menus), use click_xy with x and y read off the screenshot and name the target. Then type_focused types where the cursor now is. Prefer numbered elements when they exist.
- Tabs: new_tab opens a page in a new tab, switch_tab and close_tab use the numbers in TABS. Keep it to a few tabs.
- FRIENDS SCAN (only when the goal says so):""")
rep('''"\\n\\nCURRENT PAGE: " + String(pg.title || "").slice(0, 160) + "\\n" + String(pg.url || "").slice(0, 300) +''',
    '''(Array.isArray(pg.tabs) && pg.tabs.length > 1 ? "\\n\\nTABS:\\n" + pg.tabs.slice(0, 12).map((x) => x.i + ": " + String(x.url || "").slice(0, 120) + (x.on ? " (this one)" : "")).join("\\n") : "") + "\\n\\nCURRENT PAGE: " + String(pg.title || "").slice(0, 160) + "\\n" + String(pg.url || "").slice(0, 300) + (pg.vw ? " (window " + pg.vw + "x" + pg.vh + " px; the screenshot uses the same pixels)" : "") +''')
rep('  const label = el ? (el.label || el.tag) : "";', '  const label = el ? (el.label || el.tag) : a.kind === "click_xy" ? String(a.target || "a spot on the page").slice(0, 80) : "";')
rep('''a.kind === "key" ? "Press " + a.key : a.kind;''', '''a.kind === "key" ? "Press " + a.key : a.kind === "click_xy" ? "Click “" + label + "”" : a.kind === "type_focused" ? "Type “" + String(a.text || "").slice(0, 60) + "”" : a.kind === "new_tab" ? "Open a new tab: " + a.url : a.kind === "switch_tab" ? "Switch to tab " + a.tab : a.kind === "close_tab" ? "Close tab " + a.tab : a.kind;''')
rep('  if (a.kind === "ask_ty") return browserNeedsTy(env, t, a.summary || a.why);', '''  if (a.kind === "ask_ty") return browserNeedsTy(env, t, a.summary || a.why);
  if (["click_xy", "type_focused", "new_tab", "switch_tab", "close_tab"].includes(a.kind)) {
    const cl = await linkGet(env, "mac_link").catch(() => null);
    if (!(cl?.agent >= 3)) return browserNeedsTy(env, t, "Command Link needs a quick update to use tabs and click on page builders: Settings › Brand & features › Command Link › Unlink, then Set up on this Mac, and run the new line in Terminal.");
    if (a.kind === "new_tab") { try { const g = new URL(String(a.url)); if (!/^https?:$/.test(g.protocol)) throw 0; a.url = g.href; } catch { t.steps.push({ n: t.steps.length + 1, desc: "Bad address skipped", result: "skipped" }); await browserSave(env, t); return { kind: "wait", ms: 500 }; } }
    if (a.kind === "click_xy" && !(Number(a.x) >= 0 && Number(a.y) >= 0)) { t.steps.push({ n: t.steps.length + 1, desc: "Click by position without a position", result: "skipped" }); await browserSave(env, t); return { kind: "wait", ms: 300 }; }
  }''')
rep('  const risky = a.needs_approval || (a.kind === "click" && BROWSER_RISKY.test(label))', '  const risky = a.needs_approval || (a.kind === "click_xy" && (BROWSER_RISKY.test(label) || !a.target)) || (a.kind === "type_focused" && a.enter) || (a.kind === "click" && BROWSER_RISKY.test(label))')
rep('  const act = { kind: a.kind, ref: a.ref, text: a.text, enter: !!a.enter, url: a.url, key: a.key, dir: a.dir, ms: 3000 };', '  const act = { kind: a.kind, ref: a.ref, text: a.text, enter: !!a.enter, url: a.url, key: a.key, dir: a.dir, x: a.x, y: a.y, tab: a.tab, say: desc, allow_risky: !!risky, ms: 3000 };')

# keep the latest view of the window for the live view (edge cache, 10 minutes)
rep('  const pg = body.page || {}, els = Array.isArray(pg.elements) ? pg.elements.slice(0, 160) : [];', '''  const pg = body.page || {}, els = Array.isArray(pg.elements) ? pg.elements.slice(0, 160) : [];
  if (pg.shot && globalThis.caches?.default) { try { await caches.default.put(new Request("https://sf-live.internal/" + t.id), new Response(JSON.stringify({ shot: pg.shot, url: String(pg.url || "").slice(0, 200), at: new Date().toISOString() }), { headers: { "content-type": "application/json", "cache-control": "max-age=600" } })); } catch (e) {} }''')
rep('  if (p === "/browser" && m === "POST") { const r = await browserStart(env, body || {}); return J(r, r.ok ? 200 : 400); }', '''  if (p === "/browser" && m === "POST") { const r = await browserStart(env, body || {}); return J(r, r.ok ? 200 : 400); }
  if (p === "/browser/live" && m === "GET") { const t = await browserGet(env); if (!t) return J({ ok: true, live: null }); let v = null; try { const hit = globalThis.caches?.default ? await caches.default.match(new Request("https://sf-live.internal/" + t.id)) : null; if (hit) v = await hit.json(); } catch (e) {} const c = await linkGet(env, "mac_link"); return J({ ok: true, online: linkOnline(c), agent: c?.agent || 0, task: { id: t.id, goal: t.goal, kind: t.kind || "task", status: t.status, live: browserLive(t), ask: t.ask || null, pending: t.pending ? t.pending.summary : null, result: t.result || null, steps: t.steps.slice(-10).map((s) => s.desc + (s.result ? " (" + s.result + ")" : "")) }, view: v }); }''')

# "Do it for me": a box to ask, and a live view
rep('["studio", "Studio AI", "studio", [["studio", "Talk to Studio"], ["team", "Team"], ["knowledge", "Knowledge"]]],', '["studio", "Studio AI", "studio", [["studio", "Talk to Studio"], ["chrome", "Do it for me"], ["team", "Team"], ["knowledge", "Knowledge"]]],')
rep('    dms: ["DM Desk",', '    chrome: ["Do it for me", "Ask Command to do something in the Command Chrome window on your Mac, and watch it work"],\n    dms: ["DM Desk",')
UI = r'''  // v91 Do it for me: ask Command to do something in Command Chrome, and watch it live
  VIEWS.chrome = async (el) => {
    el.innerHTML = '<section class="wf-glass">' + sk(160) + '</section>';
    let d; try { d = await team('/browser/live'); } catch (e) { el.innerHTML = '<section class="wf-glass"><p class="mu">' + esc(e.message) + '</p></section>'; return; }
    if (!still('chrome', el)) return;
    const t = d.task, live = t && t.live;
    const ideas = ['Open GHL and tell me how many new leads came in this week', 'Go to my Google Business Profile and tell me my latest 5 reviews', 'In GHL, build a workflow called Review request: tag review-ask, wait 1 day, send my review SMS', 'Find 10 Brisbane naturopaths on Instagram and list their handles'];
    el.innerHTML = '<section class="wf-glass wf-intro"><div><span class="wf-eyebrow">COMMAND CHROME ON YOUR MAC</span><h2>What should I do for you?</h2><p class="mu">Type it like you’d ask a person. Command works in the Command Chrome window on your Mac with a visible pointer, and you can watch below. Anything that sends, saves, pays or deletes waits for your yes.</p></div></section>' +
      (!d.online ? '<section class="wf-glass"><p class="v55-warn">Your Mac is asleep or Command Link isn’t running. Wake the Mac, then come back.</p></section>' : (d.agent < 3 ? '<section class="wf-glass"><p class="v55-warn">For the pointer, tabs and page builders, update Command Link once: Settings › Brand & features › Command Link › Unlink, then Set up on this Mac, and run the new line in Terminal.</p></section>' : '')) +
      '<section class="wf-glass"><textarea class="in" id="v91g" rows="3" style="width:100%;font-size:16px" placeholder="Can you please…"' + (live ? ' disabled' : '') + '></textarea>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center"><input class="in" id="v91u" style="flex:1 1 260px" placeholder="Start at this link (optional)"' + (live ? ' disabled' : '') + '>' + (live ? '<button class="btn" id="v91s">Stop</button>' : '<button class="btn pri" id="v91go">Do it</button>') + '</div>' +
      (live ? '' : '<div class="or-chips" style="margin-top:10px">' + ideas.map((x) => '<button class="chip v91-idea" type="button">' + esc(x) + '</button>').join('') + '</div>') + '</section>' +
      (t ? '<section class="wf-glass"><div class="row sp" style="gap:10px;flex-wrap:wrap;align-items:center"><div><span class="wf-eyebrow">' + (live ? 'WORKING NOW' : 'LAST JOB') + '</span><h3 style="margin:4px 0">' + esc(t.goal || '') + '</h3></div>' + (t.ask && live ? '<button class="btn pri" id="v91c">Continue</button>' : '') + '</div>' +
        (t.ask && live ? '<p class="v55-warn" style="margin-top:8px"><b>Needs you:</b> ' + esc(t.ask) + '</p>' : '') + (t.pending && live ? '<p class="sm" style="margin-top:8px">⏳ Waiting for your yes in Inbox: ' + esc(t.pending) + '</p>' : '') + (t.result && !live ? '<p class="sm" style="margin-top:8px"><b>Result:</b> ' + esc(t.result) + '</p>' : '') +
        '<div class="v91-grid" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:14px;margin-top:12px">' +
        '<div>' + (d.view && d.view.shot ? '<img id="v91img" alt="Live view of the Command Chrome window" style="width:100%;border-radius:12px;border:1px solid var(--ln2);display:block" src="data:image/jpeg;base64,' + d.view.shot + '"><p class="mu xs" style="margin:6px 0 0">' + esc(d.view.url || '') + ' · updated ' + esc(new Date(d.view.at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', second: '2-digit' })) + '</p>' : '<p class="mu sm">The live view shows here once Command starts working.</p>') + '</div>' +
        '<ol class="sm" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">' + (t.steps || []).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol></div></section>' : '');
    const g = $('#v91g', el);
    $$('.v91-idea', el).forEach((b) => b.onclick = () => { g.value = b.textContent; g.focus(); });
    const go = $('#v91go', el); if (go) go.onclick = async () => { const goal = g.value.trim(); if (goal.length < 6) { g.classList.add('need'); return g.focus(); } go.disabled = true; try { await team('/browser', { method: 'POST', body: { goal: goal, start_url: $('#v91u', el).value.trim() || undefined } }); toast('On it. Watch the Command Chrome window', 'ok'); VIEWS.chrome(el); } catch (e) { go.disabled = false; toast(e.message, 'bad'); } };
    const sp = $('#v91s', el); if (sp) sp.onclick = async () => { try { await team('/browser/stop', { method: 'POST', body: {} }); toast('Stopping', 'ok'); setTimeout(() => still('chrome', el) && VIEWS.chrome(el), 1500); } catch (e) { toast(e.message, 'bad'); } };
    const ct = $('#v91c', el); if (ct) ct.onclick = async () => { try { await team('/browser/continue', { method: 'POST', body: {} }); toast('Carrying on', 'ok'); setTimeout(() => still('chrome', el) && VIEWS.chrome(el), 1500); } catch (e) { toast(e.message, 'bad'); } };
    if (live) setTimeout(() => { if (still('chrome', el) && document.activeElement !== g) VIEWS.chrome(el); }, 4000);
  };
'''
rep('  // v81 DM Desk\n', UI + '  // v81 DM Desk\n')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v91 applied')
