// Studio Command Link agent (runs on Ty's Mac).
// 1) Opens web pages Command asks for in Ty's normal Chrome.
// 2) Runs browser tasks in a separate "Command Chrome" window (its own profile), one step at a time, with a visible pointer
//    so Ty can watch what it's doing. It can use tabs, and click by position on pages without normal buttons (v3).
//    Every step is decided by Command in the cloud; anything that sends, submits, pays or deletes waits for Ty's approval there.
//    This helper itself refuses to type into password or card fields and only opens http/https pages.
import { chromium } from 'playwright-core';
import { execFile } from 'node:child_process';
const T = process.env.SF_T, O = process.env.SF_O, DIR = process.env.SF_DIR;
const H = { Authorization: 'Bearer ' + T, 'X-SF-Agent': '3', 'Content-Type': 'application/json' };
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
for (;;) {
  try {
    const r = await api('/api/v1/link/next');
    if (r.unlinked) process.exit(0);
    if (r.url && /^https?:\/\//i.test(r.url)) execFile('/usr/bin/open', ['-a', 'Google Chrome', r.url], (err) => { if (err) execFile('/usr/bin/open', [r.url], () => {}); });
    if (r.task) await runTask(r.task).catch((e) => api('/api/v1/link/step', { task_id: r.task.id, fatal: String(e.message).slice(0, 300) }).catch(() => {}));
  } catch (e) { /* offline: try again shortly */ }
  await sleep(4000);
}
