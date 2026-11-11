  // v45 Phone AI: calls the AI receptionist answered, plus the phone script builder.
  function phWhen(v) { return v ? new Date(v).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''; }
  VIEWS.calls = async (el) => {
    el.innerHTML = '<section class="wf-glass">' + sk(160) + '</section>';
    let d;
    try { d = await team('/phone/calls?days=14'); } catch (e) { el.innerHTML = '<section class="wf-glass"><p class="mu">' + esc(e.message) + '</p></section>'; return; }
    if (!still('calls', el)) return;
    const T = d.totals || {}, st = d.status;
    const row = (c) => '<article class="ph-call' + (c.urgent ? ' urgent' : '') + '"><div class="ph-top"><div><b>' + esc(c.who || 'Unknown caller') + '</b>' + (c.business ? '<span class="mu sm"> · ' + esc(c.business) + '</span>' : '') + '<div class="mu xs">' + esc(phWhen(c.at)) + (c.from ? ' · ' + esc(c.from) : '') + ' · ' + esc(c.minutes) + ' min</div></div><div class="ph-chips">' +
      (c.urgent ? '<span class="chip bad">Follow up</span>' : '') + (c.booked ? '<span class="chip ok">Booked</span>' : '') + (c.transferred ? '<span class="chip">Transferred</span>' : '') + '</div></div>' +
      (c.summary ? '<p class="sm">' + esc(c.summary) + '</p>' : '<p class="mu sm">No summary from GHL for this call.</p>') + '</article>';
    el.innerHTML = '<section class="wf-glass wf-intro"><div><span class="wf-eyebrow">PHONE AI</span><h2>Every call your AI receptionist answers.</h2><p class="mu">Who rang, what they wanted, and what happened. Urgent calls and bookings also go to Telegram.</p></div></section>' +
      '<div class="wd-metrics"><div class="wf-glass"><span class="mu sm">Calls (14 days)</span><strong>' + esc(T.calls || 0) + '</strong></div><div class="wf-glass"><span class="mu sm">Booked in</span><strong>' + esc(T.booked || 0) + '</strong></div><div class="wf-glass"><span class="mu sm">To follow up</span><strong>' + esc(T.urgent || 0) + '</strong></div><div class="wf-glass"><span class="mu sm">Minutes</span><strong>' + esc(T.minutes || 0) + '</strong></div></div>' +
      (st && st.ok === false ? '<section class="wf-glass"><p class="sm"><b>Can’t read calls yet.</b> ' + esc(st.error || '') + '</p></section>' : '') +
      '<section class="wf-glass"><div class="row" style="justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h3 style="margin:0">Recent calls</h3><button class="btn sm" id="phSync">Check for new calls</button></div>' +
      (d.calls.length ? '<div class="ph-list">' + d.calls.map(row).join('') + '</div>' : '<p class="mu sm" style="margin-top:12px">No calls yet. Once your Voice AI agent answers a call, it shows here within the hour, or straight away with the GHL workflow below.</p>') +
      (st && st.at ? '<p class="mu xs" style="margin-top:10px">Last checked ' + esc(phWhen(st.at)) + '</p>' : '') + '</section>' +
      '<section class="wf-glass"><h3>Instant call alerts (one-time GHL setup)</h3><p class="mu sm">In GHL: Automation › Workflows › new workflow. Trigger: <b>Voice AI</b> call ended (or the agent’s Post-Call workflow). Action: <b>Webhook</b>, method POST, this URL, with custom data <b>event</b> = <b>call</b>. Without it, calls still arrive every hour.</p><div class="row" style="gap:8px;flex-wrap:wrap"><input class="in" id="phHook" readonly value="' + esc(d.hook || '') + '" style="flex:1 1 320px"><button class="btn sm" id="phHookCopy">Copy</button></div></section>' +
      '<section class="wf-glass" id="phBuild"><h3>Phone script builder</h3><p class="mu sm">Writes a GHL Voice AI receptionist for any business from what Command knows about it: the prompt, welcome message, knowledge base and setup checklist. Paste them into their GHL sub-account.</p><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="lab" style="flex:1 1 260px">Business<select class="in" id="phWho"><option value="">This business</option></select></label><button class="btn pri" id="phGo">Build phone script</button></div><div id="phOut"></div></section>';
    $('#phSync', el).onclick = async (ev) => { ev.target.disabled = true; try { const r = await team('/phone/sync', { method: 'POST', body: {} }); toast(r.ok === false ? r.error : r.new ? r.new + ' new call' + (r.new === 1 ? '' : 's') : 'No new calls', r.ok === false ? 'bad' : 'ok'); VIEWS.calls(el); } catch (e) { toast(e.message, 'bad'); ev.target.disabled = false; } };
    $('#phHookCopy', el).onclick = async () => { try { await navigator.clipboard.writeText($('#phHook', el).value); toast('Copied', 'ok'); } catch { $('#phHook', el).select(); } };
    team('/phone/clients').then((r) => { const s = $('#phWho', el); if (!s) return; (r.clients || []).forEach((c) => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name + (c.status ? ' (' + c.status + ')' : ''); s.appendChild(o); }); }).catch(() => {});
    $('#phGo', el).onclick = async (ev) => {
      ev.target.disabled = true; const out = $('#phOut', el); out.innerHTML = sk(120);
      try {
        const r = await team('/phone/script', { method: 'POST', body: { client_id: $('#phWho', el).value || null } });
        const box = (id, label, val, rows) => '<label class="lab" style="margin-top:14px">' + label + '<textarea class="in ph-ta" id="' + id + '" rows="' + rows + '" readonly>' + esc(val) + '</textarea></label><button class="btn sm" data-ph-copy="' + id + '">Copy ' + label.toLowerCase() + '</button>';
        out.innerHTML = (r.missing_knowledge ? '<p class="sm" style="margin-top:12px"><b>Heads up:</b> Command doesn’t know much about ' + esc(r.business) + ' yet. Fill in their Knowledge vault first for a better result.</p>' : '') +
          box('phP', 'Agent prompt', r.prompt, 12) + box('phW', 'Welcome message', r.welcome, 2) + box('phK', 'Knowledge base', r.knowledge_base, 10) + box('phKW', 'When-to-use text', r.knowledge_when, 3) + box('phC', 'Setup checklist', r.checklist, 9);
        $$('[data-ph-copy]', out).forEach((b) => b.onclick = async () => { const t = $('#' + b.dataset.phCopy, out); try { await navigator.clipboard.writeText(t.value); toast('Copied', 'ok'); } catch { t.select(); } });
      } catch (e) { out.innerHTML = '<p class="mu sm">' + esc(e.message) + '</p>'; }
      ev.target.disabled = false;
    };
  };
