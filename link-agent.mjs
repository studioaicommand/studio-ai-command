// Studio Command Link agent (runs on Ty's Mac).
// 1) Opens web pages Command asks for in Ty's normal Chrome.
// 2) Runs browser tasks in a separate "Command Chrome" window (its own profile), one step at a time.
//    Every step is decided by Command in the cloud; anything that sends, submits, pays or deletes waits for Ty's approval there.
//    This helper itself refuses to type into password or card fields and only opens http/https pages.
import { chromium } from 'playwright-core';
import { execFile } from 'node:child_process';
const T = process.env.SF_T, O = process.env.SF_O, DIR = process.env.SF_DIR;
const H = { Authorization: 'Bearer ' + T, 'X-SF-Agent': '2', 'Content-Type': 'application/json' };
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
  const shot = await page.screenshot({ type: 'jpeg', quality: 45 }).catch(() => null);
  return { ...data, shot: shot ? shot.toString('base64') : null };
}
async function act(page, a) {
  const el = a.ref ? page.locator('[data-sfr="' + Number(a.ref) + '"]').first() : null;
  if (a.ref && !(await el.count())) throw new Error('That element is no longer on the page.');
  if (a.kind === 'goto') {
    if (!/^https?:\/\//i.test(String(a.url || ''))) throw new Error('Only web pages can be opened.');
    await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } else if (a.kind === 'click') {
    await el.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await el.click({ timeout: 8000 });
  } else if (a.kind === 'type') {
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
async function runTask(task) {
  const c = await browser();
  const old = c.pages();
  let page = await c.newPage();
  for (const p of old.slice(0, Math.max(0, old.length - 2))) await p.close().catch(() => {});
  await page.bringToFront().catch(() => {});
  if (task.start_url && /^https?:\/\//i.test(task.start_url)) await page.goto(task.start_url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  let last = null;
  const until = Date.now() + 60 * 60000;
  while (Date.now() < until) {
    if (!ctx) return api('/api/v1/link/step', { task_id: task.id, fatal: 'The Command Chrome window was closed.' });
    const pages = c.pages();
    page = pages[pages.length - 1] || await c.newPage();
    const s = await snap(page).catch((e) => ({ url: page.url(), title: '', text: '', elements: [], shot: null, error: String(e.message).slice(0, 200) }));
    const r = await api('/api/v1/link/step', { task_id: task.id, page: s, last });
    const a = (r && r.act) || { kind: 'finish' };
    if (a.kind === 'finish') return;
    if (a.kind === 'wait') { await sleep(Math.min(Number(a.ms) || 4000, 15000)); last = null; continue; }
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
