  // v46 AI budget card at the top of Money.
  (function () {
    const money = VIEWS.money;
    VIEWS.money = async (el) => {
      await money(el);
      if (!still('money', el)) return;
      let d; try { d = await team('/costs/budget'); } catch { return; }
      if (!still('money', el)) return;
      const box = document.createElement('section'); box.className = 'wf-glass ab-card';
      const draw = (d) => {
        const b = d.budget || {}, s = d.status || {}, cap = +s.cap_usd || +b.monthly_usd || 0, spent = s.spent_usd;
        const pct = cap && spent != null ? Math.min(100, Math.round(spent / cap * 100)) : null;
        const tone = pct == null ? '' : pct >= (b.pause_pct || 95) ? 'bad' : pct >= (b.warn_pct || 80) ? 'warn' : 'ok';
        box.innerHTML = '<div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start"><div><span class="wf-eyebrow">AI BUDGET</span><h3 style="margin:4px 0 0">' + (spent != null ? 'US$' + esc(spent.toFixed(2)) + (cap ? ' of US$' + esc(cap) + (b.rev_pct && cap > (+b.monthly_usd || 0) ? ' (grown with revenue)' : '') : '') + ' this month' : 'Monthly AI budget') + '</h3>' +
          (s.paused ? '<p class="sm" style="margin:6px 0 0"><b>Background AI work is paused.</b> Customer chat, inbox replies and phone keep running.</p>' : '') +
          (s.capped_at && s.month === new Date().toISOString().slice(0, 7) && Date.now() - Date.parse(s.capped_at) < 864e5 ? '<p class="sm" style="margin:6px 0 0"><b>Anthropic’s spend limit was hit recently.</b> Raise it at console.anthropic.com › Settings › Limits.</p>' : '') +
          '</div>' + (d.has_admin_key ? '<button class="btn sm" data-ab-check>Check now</button>' : '') + '</div>' +
          (pct != null ? '<div class="ab-bar"><i class="' + tone + '" style="width:' + pct + '%"></i></div><p class="mu xs">' + pct + '% used · warning at ' + esc(b.warn_pct || 80) + '%, background work pauses at ' + esc(b.pause_pct || 95) + '%' + (s.at ? ' · checked ' + esc(new Date(s.at).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })) : '') + '</p>' : '') +
          (s.error ? '<p class="sm">' + esc(s.error) + '</p>' : '') +
          (d.has_admin_key ? '' : '<p class="mu sm">To see your real AI spend here, make an Admin key at console.anthropic.com › Settings › Admin keys, and add it in Cloudflare as the secret <b>ANTHROPIC_ADMIN_KEY</b>. Until then, Command still tells you on Telegram if Anthropic’s spend limit is hit.</p>') +
          '<div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:10px"><label class="lab" style="flex:1 1 160px">Monthly budget (US$)<input class="in" id="abUsd" inputmode="decimal" value="' + esc(cap || '') + '" placeholder="e.g. 300"></label><label class="lab" style="flex:0 1 170px">Grow with revenue (% of 30-day sales)<input class="in" id="abRev" inputmode="numeric" value="' + esc(b.rev_pct || '') + '" placeholder="e.g. 10"></label><label class="lab" style="flex:0 1 120px">Warn at %<input class="in" id="abWarn" inputmode="numeric" value="' + esc(b.warn_pct || 80) + '"></label><label class="lab" style="flex:0 1 120px">Pause at %<input class="in" id="abPause" inputmode="numeric" value="' + esc(b.pause_pct || 95) + '"></label><button class="btn pri" data-ab-save>Save</button></div>' +
          '<p class="mu xs" style="margin-top:8px">The monthly budget is the floor. With “grow with revenue” set, the budget rises to that share of the last 30 days’ Stripe sales when that’s higher, so the AI earns its own spend. Keep your Anthropic spend limit a little above the top of this.</p>';
        const c = box.querySelector('[data-ab-check]');
        if (c) c.onclick = async () => { c.disabled = true; try { const r = await team('/costs/budget/check', { method: 'POST', body: {} }); draw({ ...d, status: r.status }); } catch (e) { toast(e.message, 'bad'); c.disabled = false; } };
        box.querySelector('[data-ab-save]').onclick = async () => { try { const r = await team('/costs/budget', { method: 'POST', body: { monthly_usd: Number(String($('#abUsd', box).value).replace(/[^0-9.]/g, '')) || 0, rev_pct: Number($('#abRev', box).value) || 0, warn_pct: Number($('#abWarn', box).value) || 80, pause_pct: Number($('#abPause', box).value) || 95 } }); toast('Budget saved', 'ok'); const g = await team('/costs/budget'); draw(g); } catch (e) { toast(e.message, 'bad'); } };
      };
      draw(d);
      el.prepend(box);
    };
  })();
