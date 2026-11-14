// Studio Command Link agent (runs on Ty's Mac).
// 1) Opens web pages Command asks for in Ty's normal Chrome.
// 2) Runs browser tasks in a separate "Command Chrome" window (its own profile), one step at a time, with a visible pointer
//    so Ty can watch what it's doing. It can use tabs, and click by position on pages without normal buttons (v3).
//    Every step is decided by Command in the cloud; anything that sends, submits, pays or deletes waits for Ty's approval there.
//    This helper itself refuses to type into password or card fields and only opens http/https pages.
// 3) Outreach Autopilot (v4): sends Ty's approved messages and replies with a fixed, checked routine, no AI per click.
import { chromium } from 'playwright-core';
import { execFile } from 'node:child_process';
const T = process.env.SF_T, O = process.env.SF_O, DIR = process.env.SF_DIR;
const H = { Authorization: 'Bearer ' + T, 'X-SF-Agent': '4', 'Content-Type': 'application/json' };
const RISKY = /\b(send|submit|pay|purchase|buy|checkout|delete|remove|post|publish|confirm|approve|sign up|subscribe|transfer|place order)\b/i;
const CURSOR = `(() => { if (window.__sfc) return; window.__sfc = 1; const add = () => { if (!document.body || document.getElementById('sf-cur')) return; const c = document.createElement('div'); c.id = 'sf-cur'; c.style.cssText = 'position:fixed;left:-40px;top:-40px;width:26px;height:26px;z-index:2147483647;pointer-events:none;transition:left .45s cubic-bezier(.2,.7,.2,1),top .45s cubic-bezier(.2,.7,.2,1);filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))'; c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 10-6.5 1.4L16 21l-3 1.4-3.6-7.6L4 19z" fill="#22d3ee" stroke="#04131f" stroke-width="1.4" stroke-linejoin="round"/></svg>'; const b = document.createElement('div'); b.id = 'sf-say'; b.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483647;pointer-events:none;max-width:360px;padding:9px 13px;border-radius:12px;background:rgba(4,19,31,.9);color:#e6f7ff;font:500 13px/1.35 -apple-system,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);border:1px solid rgba(34,211,238,.35);display:none'; document.body.append(c, b); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add(); window.__sfMove = (x, y) => { add(); const c = document.getElementById('sf-cur'); if (c) { c.style.left = (x - 3) + 'px'; c.style.top = (y - 2) + 'px'; } }; window.__sfTap = (x, y) => { const r = document.createElement('div'); r.style.cssText = 'position:fixed;left:' + (x - 14) + 'px;top:' + (y - 14) + 'px;width:28px;height:28px;border-radius:50%;border:2px solid #22d3ee;z-index:2147483646;pointer-events:none;transition:transform .5s,opacity .5s'; document.body.append(r); requestAnimationFrame(() => { r.style.transform = 'scale(2)'; r.style.opacity = '0'; }); setTimeout(() => r.remove(), 600); }; window.__sfSay = (t) => { add(); const b = document.getElementById('sf-say'); if (b) { b.textContent = t ? 'Command: ' + t : ''; b.style.display = t ? 'block' : 'none'; } }; })();`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEYS = new Set(['Enter', 'Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp']);
async function api(path, body) {
  const r = await fetch(O + path, { method: body ? 'POST' : 'GET', headers: H, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(90000) });
  return r.json();
}
let ctx = null;
async function browser() {
  if (ctx) { try { ctx.pages(); return ctx; } catch (e) { ctx = null; } }
  ctx = await chromium.launchPersistentContext(DIR + '/chrome-profile', { channel: process.env.SF_CHANNEL === 'bundled' ? undefined : 'chrome', headless: process.env.SF_HEADLESS === '1', viewport: null, args: ['--no-first-run', '--no-default-browser-check'] });
  await ctx.addInitScript(CURSOR).catch(() => {});
  ctx.on('close', () => { ctx = null; });
  return ctx;
}
async function snap(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  const data = await page.evaluate(() => {
    const out = []; let n = 0;
    document.querySelectorAll('[data-sfr]').forEach((e) => e.removeAttribute('data-sfr'));
    const sel = 'a[href],button,input,select,textarea,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=option],[role=combobox],[contenteditable=true],summary';
    for (const e of document.querySelectorAll(sel)) {
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight * 2.5) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none' || e.disabled) continue;
      n++; e.setAttribute('data-sfr', String(n));
      const lab = (e.getAttribute('aria-label') || e.innerText || e.placeholder || e.title || e.name || e.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      out.push({ r: n, tag: e.tagName.toLowerCase(), type: String(e.type || e.getAttribute('role') || '').toLowerCase(), label: lab, href: e.href ? String(e.href).slice(0, 140) : undefined, ac: String(e.autocomplete || '').toLowerCase() || undefined, below: r.top >= innerHeight || undefined });
      if (n >= 160) break;
    }
    return { url: location.href, title: document.title, text: document.body ? document.body.innerText.replace(/\n{3,}/g, '\n\n').slice(0, 7000) : '', elements: out };
  });
  const shot = await page.screenshot({ type: 'jpeg', quality: 45, scale: 'css' }).catch(() => null);
  const vp = await page.evaluate(() => ({ vw: innerWidth, vh: innerHeight })).catch(() => ({}));
  return { ...data, ...vp, shot: shot ? shot.toString('base64') : null };
}
async function pointAt(page, x, y) {
  await page.evaluate(([px, py]) => { try { window.__sfMove(px, py); } catch (e) {} }, [x, y]).catch(() => {});
  await page.mouse.move(x, y, { steps: 14 }).catch(() => {});
  await page.waitForTimeout(480);
}
async function pointAtEl(page, el) {
  await el.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  const b = await el.boundingBox().catch(() => null);
  if (b) await pointAt(page, b.x + Math.min(b.width / 2, 40), b.y + b.height / 2);
  return b;
}
async function act(page, a) {
  await page.evaluate((t) => { try { window.__sfSay(t); } catch (e) {} }, String(a.say || '').slice(0, 140)).catch(() => {});
  const el = a.ref ? page.locator('[data-sfr="' + Number(a.ref) + '"]').first() : null;
  if (a.ref && !(await el.count())) throw new Error('That element is no longer on the page.');
  if (a.kind === 'goto') {
    if (!/^https?:\/\//i.test(String(a.url || ''))) throw new Error('Only web pages can be opened.');
    await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } else if (a.kind === 'click') {
    const b = await pointAtEl(page, el);
    if (b) await page.evaluate(([px, py]) => { try { window.__sfTap(px, py); } catch (e) {} }, [b.x + Math.min(b.width / 2, 40), b.y + b.height / 2]).catch(() => {});
    await el.click({ timeout: 8000 });
  } else if (a.kind === 'click_xy') {
    const x = Number(a.x), y = Number(a.y);
    if (!(x >= 0 && y >= 0)) throw new Error('No position to click.');
    const under = await page.evaluate(([px, py]) => { const e = document.elementFromPoint(px, py); return e ? (e.getAttribute('aria-label') || e.innerText || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 80) : ''; }, [x, y]).catch(() => '');
    if (RISKY.test(under) && !a.allow_risky) throw new Error('That spot is a "' + under + '" button, which needs Ty\'s approval first.');
    await pointAt(page, x, y);
    await page.evaluate(([px, py]) => { try { window.__sfTap(px, py); } catch (e) {} }, [x, y]).catch(() => {});
    await page.mouse.click(x, y);
  } else if (a.kind === 'type_focused') {
    const t = await page.evaluate(() => { const e = document.activeElement; return e ? String(e.type || '').toLowerCase() + '|' + String(e.autocomplete || '').toLowerCase() : ''; });
    if (/password|cc-|one-time-code/.test(t)) throw new Error('Command never types passwords, codes or card details.');
    await page.keyboard.type(String(a.text || ''), { delay: 18 });
    if (a.enter) await page.keyboard.press('Enter');
  } else if (a.kind === 'type') {
    await pointAtEl(page, el);
    const t = await el.evaluate((e) => String(e.type || '').toLowerCase() + '|' + String(e.autocomplete || '').toLowerCase());
    if (/password|cc-/.test(t)) throw new Error('Command never types passwords or card details.');
    await el.fill(String(a.text || ''), { timeout: 8000 });
    if (a.enter) await el.press('Enter');
  } else if (a.kind === 'select') {
    await el.selectOption({ label: String(a.text || '') }).catch(() => el.selectOption(String(a.text || '')));
  } else if (a.kind === 'key') {
    if (!KEYS.has(a.key)) throw new Error('Key not allowed.');
    await page.keyboard.press(a.key);
  } else if (a.kind === 'scroll') {
    await page.mouse.wheel(0, a.dir === 'up' ? -700 : 700);
  } else if (a.kind === 'back') {
    await page.goBack({ timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(a.kind === 'wait' ? Math.min(Number(a.ms) || 3000, 15000) : 1200);
}
async function tabs(c, page) { return c.pages().map((p, i) => ({ i, url: p.url().slice(0, 160), on: p === page || undefined })); }
async function runTask(task) {
  if (task.mode === 'pb') return runPlaybook(task);
  const c = await browser();
  const old = c.pages();
  let page = await c.newPage();
  for (const p of old.slice(0, Math.max(0, old.length - 2))) await p.close().catch(() => {});
  await page.bringToFront().catch(() => {});
  if (task.start_url && /^https?:\/\//i.test(task.start_url)) await page.goto(task.start_url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  let last = null, seen = c.pages().length;
  const until = Date.now() + 60 * 60000;
  while (Date.now() < until) {
    if (!ctx) return api('/api/v1/link/step', { task_id: task.id, fatal: 'The Command Chrome window was closed.' });
    const pages = c.pages();
    if (!pages.includes(page) || pages.length > seen) page = pages[pages.length - 1] || await c.newPage();
    seen = pages.length;
    await page.bringToFront().catch(() => {});
    const s = await snap(page).catch((e) => ({ url: page.url(), title: '', text: '', elements: [], shot: null, error: String(e.message).slice(0, 200) }));
    s.tabs = await tabs(c, page);
    const r = await api('/api/v1/link/step', { task_id: task.id, page: s, last });
    const a = (r && r.act) || { kind: 'finish' };
    if (a.kind === 'finish') { await page.evaluate(() => { try { window.__sfSay(''); } catch (e) {} }).catch(() => {}); return; }
    if (a.kind === 'wait') { await sleep(Math.min(Number(a.ms) || 4000, 15000)); last = null; continue; }
    if (a.kind === 'new_tab') { try { if (!/^https?:\/\//i.test(String(a.url || ''))) throw new Error('Only web pages can be opened.'); page = await c.newPage(); seen = c.pages().length; await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 30000 }); last = { ok: true, kind: a.kind }; } catch (e) { last = { ok: false, kind: a.kind, error: String(e.message).slice(0, 200) }; } continue; }
    if (a.kind === 'switch_tab' || a.kind === 'close_tab') { const ps = c.pages(), tp = ps[Number(a.tab)]; if (!tp) { last = { ok: false, kind: a.kind, error: 'No tab number ' + a.tab }; continue; } if (a.kind === 'close_tab' && ps.length > 1) { await tp.close().catch(() => {}); page = c.pages()[c.pages().length - 1]; } else page = tp; seen = c.pages().length; await page.bringToFront().catch(() => {}); last = { ok: true, kind: a.kind }; continue; }
    try { await act(page, a); last = { ok: true, kind: a.kind }; } catch (e) { last = { ok: false, kind: a.kind, error: String(e.message).slice(0, 200) }; }
  }
  await api('/api/v1/link/step', { task_id: task.id, fatal: 'Ran for an hour, so it stopped.' });
}
// ── Outreach Autopilot (v4). Command sends one job at a time: send, connect, read or inbox. Each runs as a fixed routine here:
// open the profile or chat, check it's the right person (profile name, then the chat header, checked again just before
// sending), close other chats, make sure the message box is empty, put in Ty's exact words, check them, send, and confirm
// the message shows in the chat. If anything doesn't match, it stops for that person and says why. It never guesses. ──
const pbNorm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9@._\s]/g, ' ').replace(/\s+/g, ' ').trim();
const pbHas = (hay, name) => { const h = ' ' + pbNorm(hay) + ' '; const w = pbNorm(name).split(' ').filter((x) => x.length > 1 || /\d/.test(x)); return w.length > 0 && w.every((x) => h.includes(' ' + x + ' ')); };
const pbSame = (a, b) => String(a || '').replace(/\s+/g, ' ').trim() === String(b || '').replace(/\s+/g, ' ').trim();
const SELECT_ALL = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
// Runs inside the page. One function, so Playwright can send it whole.
function pbPage(arg) {
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9@._\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const has = (hay, name) => { const h = ' ' + norm(hay) + ' '; const w = norm(name).split(' ').filter((x) => x.length > 1 || /\d/.test(x)); return w.length > 0 && w.every((x) => h.includes(' ' + x + ' ')); };
  const anyName = (hay) => (arg.names || []).some((n) => n && has(hay, n));
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const lab = (e) => (e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.getAttribute('aria-placeholder') || e.getAttribute('data-placeholder') || '').trim();
  const COMPOSER = /^(message|messages|write a message|aa|type a message|send a message)\b/i;
  const CLOSE = '[aria-label="Close chat"],[aria-label^="Close conversation"],[aria-label*="close your conversation" i]';
  const text = (b) => (b.value != null ? b.value : b.innerText || '').replace(/\s+/g, ' ').trim();
  const boxes = () => [...document.querySelectorAll('[contenteditable="true"],textarea')].filter((e) => vis(e) && e.type !== 'password' && COMPOSER.test(lab(e)));
  const isEdge = (e) => e.matches('[role=dialog],[role=main],main,[aria-label*="conversation" i],[aria-label^="Chat" i],.msg-overlay-conversation-bubble') || !!e.querySelector(CLOSE);
  const chats = () => boxes().map((b) => {
    let c = b.parentElement, d = 0;
    while (c && c !== document.body && d < 25 && !isEdge(c)) { c = c.parentElement; d++; }
    if (!c || c === document.body || d >= 25) return null;
    const cr = c.getBoundingClientRect(), br = b.getBoundingClientRect(), main = c.matches('[role=main],main');
    const lim = cr.top + (main ? 150 : 90);
    const head = [...c.querySelectorAll('h1,h2,h3,h4,h5,h6,a,span,strong')].filter((e) => { if (e.contains(b) || e.children.length > 3 || !vis(e)) return false; const r = e.getBoundingClientRect(); return r.top >= cr.top - 2 && r.bottom <= lim && r.right > br.left && r.left < br.right; }).map((e) => e.innerText || '').join(' | ').slice(0, 400);
    return { b, c, head, many: c.querySelectorAll('[contenteditable="true"],textarea').length > 1 && !main };
  }).filter(Boolean);
  const NOISE = /^(you('re| are) now (friends|connected)|say hi|wave|today|yesterday|seen|delivered|sent|active now|\d{1,2}:\d{2}( ?[ap]m)?|you can now (message|call)|.{0,3})$/i;
  const rowsOf = (c, head) => [...c.querySelectorAll('[role=row],li.msg-s-message-list__event,[data-testid="message-container"]')].filter(vis).map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter((t) => t && t.length < 1500 && !NOISE.test(t) && norm(t) !== norm(head)).slice(-25);
  if (arg.cmd === 'login') {
    const pw = [...document.querySelectorAll('input[type=password]')].some(vis);
    const t = (document.body ? document.body.innerText : '').slice(0, 4000);
    return { login: pw, captcha: /captcha|i'?m not a robot|verify (that )?you are (a )?human|are you a robot|press and hold|security check/i.test(t) };
  }
  if (arg.cmd === 'profile') {
    const hs = [...document.querySelectorAll('h1,h2,header h1,header h2,header span')].filter(vis).slice(0, 12).map((e) => e.innerText || '').join(' | ');
    const t = hs + ' | ' + document.title;
    const pending = [...document.querySelectorAll('button,[role=button]')].some((e) => vis(e) && /^(pending|withdraw invitation)/i.test(lab(e) || (e.innerText || '').trim()));
    return { ok: anyName(t), head: t.slice(0, 200), pending };
  }
  if (arg.cmd === 'find') {
    document.querySelectorAll('[data-sfbox],[data-sfchat]').forEach((e) => { e.removeAttribute('data-sfbox'); e.removeAttribute('data-sfchat'); });
    const all = chats(), hit = all.filter((x) => anyName(x.head));
    if (hit.length !== 1 || hit[0].many) return { ok: false, chats: all.length, hits: hit.length, heads: all.map((x) => x.head.slice(0, 80)) };
    const { b, c, head } = hit[0];
    b.setAttribute('data-sfbox', '1'); c.setAttribute('data-sfchat', '1');
    return { ok: true, head: head.slice(0, 160), composer: text(b), rows: rowsOf(c, head) };
  }
  if (arg.cmd === 'state') {
    const b = document.querySelector('[data-sfbox]'), c = document.querySelector('[data-sfchat]');
    if (!b || !c || !document.contains(b)) return { ok: false };
    const me = chats().find((x) => x.b === b), a = document.activeElement;
    const probe = norm(arg.probe || '');
    return { ok: true, text: text(b), focus: a === b || b.contains(a), head_ok: !!me && anyName(me.head), shows: !!probe && rowsOf(c, me ? me.head : '').some((t) => norm(t).includes(probe)) };
  }
  return null;
}
async function pbSay(page, t) { await page.evaluate((x) => { try { window.__sfSay(x); } catch (e) {} }, String(t || '').slice(0, 140)).catch(() => {}); }
async function pbOpen(page, url) {
  if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('Only web pages can be opened.');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1600);
  const g = await page.evaluate(pbPage, { cmd: 'login' }).catch(() => ({}));
  return g.captcha ? 'captcha' : g.login ? 'login' : null;
}
async function pbCloseChats(page) {
  const cl = page.locator('[aria-label="Close chat"], [aria-label^="Close conversation"], [aria-label*="lose your conversation"]');
  for (let i = Math.min(await cl.count().catch(() => 0), 8) - 1; i >= 0; i--) { const e = cl.nth(i); if (await e.isVisible().catch(() => false)) await e.click({ timeout: 3000 }).catch(() => {}); }
  await page.waitForTimeout(400);
}
async function pbClear(page) {
  const box = page.locator('[data-sfbox]').first();
  if (!(await box.count().catch(() => 0))) return;
  await box.click({ timeout: 4000 }).catch(() => {});
  await page.keyboard.press(SELECT_ALL).catch(() => {});
  await page.keyboard.press('Backspace').catch(() => {});
}
async function pbMessageButton(page, op) {
  const re = /^\s*message\b/i;
  const cands = page.locator('button, a, [role=button]').filter({ hasText: re });
  const lab = page.locator('[aria-label^="Message"]:is(button, a, [role=button])');
  for (const loc of [lab, cands]) {
    const n = Math.min(await loc.count().catch(() => 0), 12);
    for (let i = 0; i < n; i++) {
      const e = loc.nth(i);
      if (!(await e.isVisible().catch(() => false))) continue;
      const l = ((await e.getAttribute('aria-label').catch(() => '')) || (await e.innerText().catch(() => '')) || '').trim();
      if (!/^message(\s|$)/i.test(l) || /messages|messenger/i.test(l)) continue;
      if (l.length > 8 && !op.names.some((nm) => pbHas(l, nm))) continue; // "Message Jo Smith" must be them
      if (await e.evaluate((x) => !!x.closest('[data-sfchat],[role=dialog]')).catch(() => true)) continue;
      return e;
    }
  }
  return null;
}
async function pbChat(page, op) {
  let f = null;
  for (let i = 0; i < 18; i++) { await page.waitForTimeout(500); f = await page.evaluate(pbPage, { cmd: 'find', names: op.names }).catch(() => null); if (f && f.ok) break; }
  return f || { ok: false, chats: 0, hits: 0 };
}
async function pbSend(page, op) {
  const gate = await pbOpen(page, op.url);
  if (gate) return { status: gate };
  if (op.via !== 'thread') {
    const p = await page.evaluate(pbPage, { cmd: 'profile', names: op.names });
    if (!p.ok) return { status: 'profile_mismatch', seen: p.head };
    await pbCloseChats(page);
    const btn = await pbMessageButton(page, op);
    if (!btn) return { status: 'no_button' };
    await pointAtEl(page, btn);
    await btn.click({ timeout: 8000 });
  } else await pbCloseChats(page).catch(() => {});
  const f = await pbChat(page, op);
  if (!f.ok) return { status: f.hits > 1 ? 'two_chats' : f.chats ? 'wrong_person' : 'no_chat', seen: (f.heads || []).join(' / ').slice(0, 200) };
  if (op.op === 'read') return { status: 'read', head: f.head, rows: f.rows };
  if (op.check_history && f.rows.length) return { status: 'has_thread', head: f.head, rows: f.rows };
  if (f.composer) return { status: 'composer_not_empty', seen: f.composer.slice(0, 80) };
  const text = String(op.text || '');
  if (!text.trim()) return { status: 'error', error: 'No message.' };
  const box = page.locator('[data-sfbox]').first();
  await pointAtEl(page, box);
  await box.click({ timeout: 6000 });
  await page.keyboard.insertText(text);
  await page.waitForTimeout(500);
  let s = await page.evaluate(pbPage, { cmd: 'state', names: op.names });
  if (s.ok && !pbSame(s.text, text) && !s.text) { await box.click({ timeout: 6000 }); await page.keyboard.type(text, { delay: 12 }); await page.waitForTimeout(400); s = await page.evaluate(pbPage, { cmd: 'state', names: op.names }); }
  if (!s.ok || !pbSame(s.text, text)) { await pbClear(page); return { status: 'typed_mismatch', seen: String(s.text || '').slice(0, 80) }; }
  if (!s.head_ok) { await pbClear(page); return { status: 'wrong_person' }; }
  if (!s.focus) {
    await box.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(200);
    s = await page.evaluate(pbPage, { cmd: 'state', names: op.names });
    if (!s.ok || !s.focus || !s.head_ok || !pbSame(s.text, text)) { await pbClear(page); return { status: 'focus_lost' }; }
  }
  const sendBtn = op.platform === 'linkedin' ? page.locator('[data-sfchat] button').filter({ hasText: /^\s*send\s*$/i }).first() : null;
  if (sendBtn && (await sendBtn.count().catch(() => 0)) && (await sendBtn.isEnabled().catch(() => false))) { await pointAtEl(page, sendBtn); await sendBtn.click({ timeout: 6000 }); }
  else await page.keyboard.press('Enter');
  const probe = text.replace(/\s+/g, ' ').trim().slice(0, 40);
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(500);
    s = await page.evaluate(pbPage, { cmd: 'state', names: op.names, probe }).catch(() => ({ ok: false }));
    if (s.ok && !s.text && s.shows) break;
  }
  const ok = s.ok && !s.text && s.shows;
  const close = page.locator('[data-sfchat] [aria-label="Close chat"], [data-sfchat] [aria-label^="Close conversation"]').first();
  if (await close.count().catch(() => 0)) await close.click({ timeout: 3000 }).catch(() => {});
  return { status: ok ? 'sent' : 'unconfirmed' };
}
async function pbConnect(page, op) {
  const gate = await pbOpen(page, op.url);
  if (gate) return { status: gate };
  const p = await page.evaluate(pbPage, { cmd: 'profile', names: op.names });
  if (!p.ok) return { status: 'profile_mismatch', seen: p.head };
  if (p.pending) return { status: 'already_pending' };
  const find = async () => { const l = page.locator('[aria-label^="Invite"][aria-label$="to connect"]'); for (let i = 0; i < Math.min(await l.count().catch(() => 0), 6); i++) { const e = l.nth(i); if (await e.isVisible().catch(() => false)) return e; } return null; };
  let btn = await find();
  if (!btn) { const more = page.locator('button[aria-label="More actions"], button[aria-label="More"]').first(); if (await more.count().catch(() => 0)) { await more.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(600); btn = await find(); } }
  if (!btn) return { status: 'no_connect' };
  const l = (await btn.getAttribute('aria-label')) || '';
  if (!op.names.some((nm) => pbHas(l, nm))) return { status: 'wrong_person', seen: l.slice(0, 120) };
  await pointAtEl(page, btn);
  await btn.click({ timeout: 6000 });
  const dlg = page.locator('[role=dialog]').last();
  await dlg.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
  let go = dlg.locator('button[aria-label="Send without a note"], button:has-text("Send without a note")').first();
  if (!(await go.count().catch(() => 0))) go = dlg.locator('button').filter({ hasText: /^\s*send( now)?\s*$/i }).first();
  if (!(await go.count().catch(() => 0))) return { status: 'no_connect' };
  await pointAtEl(page, go);
  await go.click({ timeout: 6000 });
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(500); const q = await page.evaluate(pbPage, { cmd: 'profile', names: op.names }).catch(() => ({})); if (q.pending) return { status: 'sent' }; }
  return { status: 'unconfirmed' };
}
async function pbInbox(page, op) {
  const gate = await pbOpen(page, op.url);
  if (gate) return { status: gate };
  await page.waitForTimeout(1500);
  const items = await page.evaluate(() => {
    const seen = new Set(), out = [];
    for (const a of document.querySelectorAll('a[href]')) {
      if (!/\/messages\/t\/|\/direct\/t\/|\/messaging\/thread\//.test(a.href) || seen.has(a.href)) continue;
      seen.add(a.href);
      const t = (a.innerText || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      if (!t) continue;
      const bold = [...a.querySelectorAll('span,div,p')].some((e) => +getComputedStyle(e).fontWeight >= 600 && (e.innerText || '').length > 3 && !e.children.length);
      const unread = /unread/i.test(a.getAttribute('aria-label') || '') || !!a.querySelector('[aria-label*="unread" i]');
      out.push({ href: a.href, text: t.slice(0, 240), bold, unread });
      if (out.length >= 30) break;
    }
    return out;
  });
  return { status: 'inbox', items };
}
async function runPlaybook(task) {
  const c = await browser();
  const old = c.pages();
  let page = await c.newPage();
  for (const p of old) await p.close().catch(() => {});
  await page.bringToFront().catch(() => {});
  let last = null;
  const until = Date.now() + 3 * 60 * 60000;
  while (Date.now() < until) {
    if (!ctx) return api('/api/v1/link/pb', { task_id: task.id, fatal: 'The Command Chrome window was closed.' });
    if (page.isClosed()) page = await c.newPage();
    const r = await api('/api/v1/link/pb', { task_id: task.id, last });
    const op = (r && r.op) || { op: 'finish' };
    last = null;
    if (op.op === 'finish') { await pbSay(page, ''); return; }
    if (op.op === 'wait') { await sleep(Math.min(Number(op.ms) || 4000, 15000)); continue; }
    op.names = (Array.isArray(op.names) ? op.names : []).filter(Boolean);
    let res;
    try {
      if (!op.names.length && op.op !== 'inbox') throw new Error('No name to check.');
      await pbSay(page, op.say);
      res = op.op === 'connect' ? await pbConnect(page, op) : op.op === 'inbox' ? await pbInbox(page, op) : (op.op === 'send' || op.op === 'read') ? await pbSend(page, op) : { status: 'error', error: 'Unknown job.' };
    } catch (e) { await pbClear(page).catch(() => {}); res = { status: 'error', error: String(e.message).slice(0, 200) }; }
    await pbSay(page, '');
    res.n = op.n; res.url = page.url().slice(0, 200);
    const shot = await page.screenshot({ type: 'jpeg', quality: 35, scale: 'css' }).catch(() => null);
    if (shot) res.shot = shot.toString('base64');
    last = res;
  }
  await api('/api/v1/link/pb', { task_id: task.id, fatal: 'Ran for three hours, so it stopped.' });
}
for (;;) {
  try {
    const r = await api('/api/v1/link/next');
    if (r.unlinked) process.exit(0);
    if (r.url && /^https?:\/\//i.test(r.url)) execFile('/usr/bin/open', ['-a', 'Google Chrome', r.url], (err) => { if (err) execFile('/usr/bin/open', [r.url], () => {}); });
    if (r.task) await runTask(r.task).catch((e) => api('/api/v1/link/step', { task_id: r.task.id, fatal: String(e.message).slice(0, 300) }).catch(() => {}));
  } catch (e) { /* offline: try again shortly */ }
  await sleep(4000);
}
