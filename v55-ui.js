  // v55 Browser tasks card (Settings > Brand & features, under Command Link)
  const browserCard = async (host) => {
    let d; try { d = await team('/browser'); } catch (e) { return; }
    const t = d.task, live = t && ['queued', 'running', 'waiting', 'needs_ty'].includes(t.status);
    const box = document.createElement('section'); box.className = 'wf-glass v55-br';
    const lab = { queued: 'Starting', running: 'Working', waiting: 'Waiting for your approval', needs_ty: 'Needs you', done: 'Done', failed: 'Stopped (problem)', stopped: 'Stopped' };
    box.innerHTML = '<span class="wf-eyebrow">BROWSER TASKS</span><h3 style="margin:4px 0 6px">Give Command a job to do in Chrome</h3><p class="mu sm">Command works in its own <b>Command Chrome</b> window on your Mac (log in to GHL, Gmail and anything else there once). It reads, searches and clicks around by itself. Anything that sends, submits, pays, books or deletes comes to you as an Approve card first, and it never types passwords or card details. You can also just ask Studio AI: “go into GHL and find who booked this week”.</p>' +
      (d.agent === 2 ? '' : '<p class="v55-warn">' + (d.agent === 1 ? 'Command Link needs a one-time update for this: tap “Unlink” above, then “Set up on this Mac” and run the new line.' : 'Set up Command Link above first.') + '</p>') +
      (t ? '<div class="v55-task"><div class="v55-hd"><b>' + esc(t.goal) + '</b><span class="pill">' + esc(lab[t.status] || t.status) + '</span></div>' + (t.waiting_on_ty ? '<p class="v55-ask">' + esc(t.waiting_on_ty) + '</p>' : '') + (t.result ? '<p class="v55-res">' + esc(t.result) + '</p>' : '') + '<ol class="v55-steps">' + (t.recent || []).map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
        (live ? '<div class="row" style="gap:8px;flex-wrap:wrap">' + (t.status === 'needs_ty' ? '<button class="btn pri" id="v55c">Continue</button>' : '') + '<button class="btn" id="v55s">Stop</button><button class="btn ghost" id="v55r">Refresh</button></div>' : '') + '</div>' : '') +
      (live ? '' : '<div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:12px"><label class="lab" style="flex:2 1 320px">What should Command do?<input class="in" id="v55g" placeholder="e.g. Find 5 Brisbane dentists with no online booking and list their websites"></label><label class="lab" style="flex:1 1 200px">Start at (optional)<input class="in" id="v55u" placeholder="https://..."></label><button class="btn pri" id="v55go"' + (d.agent === 2 && d.online ? '' : ' disabled') + '>Start</button></div>');
    const lk = $('.v54-link', host); if (lk) lk.after(box); else host.prepend(box);
    const redo = () => { box.remove(); browserCard(host); };
    const go = $('#v55go', box); if (go) go.onclick = async () => { const g = $('#v55g', box).value.trim(); if (!g) return toast('Say what to do', 'bad'); try { await team('/browser', { method: 'POST', body: { goal: g, start_url: $('#v55u', box).value.trim() || undefined } }); toast('Started: watch the Command Chrome window', 'ok'); redo(); } catch (e) { toast(e.message, 'bad'); } };
    const st = $('#v55s', box); if (st) st.onclick = async () => { try { await team('/browser/stop', { method: 'POST', body: {} }); toast('Stopping', 'ok'); redo(); } catch (e) { toast(e.message, 'bad'); } };
    const c = $('#v55c', box); if (c) c.onclick = async () => { try { await team('/browser/continue', { method: 'POST', body: {} }); toast('Carrying on', 'ok'); redo(); } catch (e) { toast(e.message, 'bad'); } };
    const r = $('#v55r', box); if (r) r.onclick = redo;
  };
  queueMicrotask(() => { const B55 = VIEWS.brand; if (B55) VIEWS.brand = async (el) => { await B55(el); if (still('brand', el)) setTimeout(() => browserCard(el), 400); }; });
