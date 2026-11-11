  // v47 Outreach today: the autopilot's settings, today's progress, and one batch to approve.
  VIEWS.outreach = async (el) => {
    el.innerHTML = '<section class="wf-glass">' + sk(200) + '</section>';
    let d, t;
    try { [d, t] = await Promise.all([team('/outreach/daily'), team('/outreach/today')]); } catch (e) { el.innerHTML = '<section class="wf-glass"><p class="mu">' + esc(e.message) + '</p></section>'; return; }
    if (!still('outreach', el)) return;
    const c = d.cfg, st = d.stats, items = t.items || [];
    const vname = Object.fromEntries((d.verticals || []).map((v) => [v.id, v.name]));
    const vert = (c.verticals && c.verticals.length) ? new Set(c.verticals) : new Set();
    const card = (x) => '<article class="or-item" data-id="' + esc(x.id) + '"><label class="or-top"><input type="checkbox" class="or-tick" checked><span><b>' + esc(x.business || '') + '</b><span class="mu sm"> · ' + esc(x.location || '') + (x.vertical ? ' · ' + esc(vname[x.vertical] || x.vertical) : '') + '</span></span><span class="or-score">' + esc(x.score != null ? x.score + '/10' : '') + '</span></label>' +
      '<div class="or-chips">' + (x.search ? '<span class="chip ' + (x.search.position && x.search.position <= 3 ? 'ok' : 'bad') + '">' + (x.search.position ? 'Google #' + esc(x.search.position) : 'Not found on Google') + ' for “' + esc(x.search.query) + '”</span>' : '') + (x.google ? '<span class="chip">' + esc(x.google) + '</span>' : '') + (x.leak_score != null ? '<span class="chip">Leak score ' + esc(x.leak_score) + '</span>' : '') + '</div>' +
      '<div class="or-links">' + (x.site ? '<a href="' + esc(x.site) + '" target="_blank" rel="noopener">Homepage concept ↗</a>' : '<span class="mu sm">No homepage concept</span>') + (x.report ? '<a href="' + esc(x.report) + '" target="_blank" rel="noopener">Leak report ↗</a>' : '') + (x.receptionist ? '<a href="' + esc(x.receptionist) + '" target="_blank" rel="noopener">AI receptionist ↗</a>' : '') + (x.website ? '<a href="https://' + esc(String(x.website).replace(/^https?:\/\//, '')) + '" target="_blank" rel="noopener">Their site ↗</a>' : '') + '</div>' +
      '<details class="or-mail"><summary>To ' + esc(x.email || '') + ' · “' + esc(x.subject || '') + '”</summary><pre>' + esc(x.body || '') + '</pre>' + (x.follow_up_1 ? '<p class="mu xs">Follow-up 1 (sent later by GHL if no reply)</p><pre>' + esc(x.follow_up_1) + '</pre>' : '') + '<button class="btn sm ghost or-skip">Skip this one</button></details></article>';
    el.innerHTML = '<section class="wf-glass wf-intro"><div><span class="wf-eyebrow">OUTREACH AUTOPILOT</span><h2>' + (c.on ? 'Today: ' + esc(st.ready) + ' ready to approve.' : 'Outreach autopilot is off.') + '</h2><p class="mu">The team finds businesses with outdated websites (and ones with none), checks where they show up on Google and AI search, scores them, builds a homepage concept, leak report and AI receptionist, and writes the email. You approve once a day.</p></div></section>' +
      '<div class="wd-metrics"><div class="wf-glass"><span class="mu sm">Today’s limit (warm-up)</span><strong>' + esc(d.capacity) + '</strong></div><div class="wf-glass"><span class="mu sm">Researched today</span><strong>' + esc(st.researched) + '</strong></div><div class="wf-glass"><span class="mu sm">Homepage concepts</span><strong>' + esc(st.site_demos) + '</strong></div><div class="wf-glass"><span class="mu sm">Call list (no email / no website)</span><strong>' + esc(st.call_list) + '</strong></div></div>' +
      '<section class="wf-glass"><div class="row" style="justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h3 style="margin:0">Ready to send (' + items.length + ')</h3>' + (items.length ? '<div class="row" style="gap:8px"><button class="btn sm ghost" id="orAll">Untick all</button><button class="btn pri" id="orSend">Send ticked</button></div>' : '') + '</div>' +
      (items.length ? '<div class="or-list">' + items.map(card).join('') + '</div>' : '<p class="mu sm" style="margin-top:12px">Nothing waiting. ' + (c.on ? 'The team works through the day and messages you on Telegram when today’s batch is ready.' : 'Turn the autopilot on below.') + '</p>') + '</section>' +
      '<section class="wf-glass"><h3>Autopilot settings</h3>' +
      '<label class="or-switch"><input type="checkbox" id="orOn"' + (c.on ? ' checked' : '') + '> <b>Autopilot on</b> <span class="mu sm">(works 6am–7pm, pauses if the AI budget is reached)</span></label>' +
      '<div class="row" style="gap:12px;flex-wrap:wrap;margin-top:12px"><label class="lab" style="flex:0 1 160px">Businesses per day<input class="in" id="orTarget" inputmode="numeric" value="' + esc(c.target) + '"></label><label class="lab" style="flex:1 1 320px">Areas (comma separated)<input class="in" id="orCities" value="' + esc((c.cities || []).join(', ')) + '"></label></div>' +
      '<p class="lab" style="margin:14px 0 6px">Industries (none ticked = all)</p><div class="or-verts">' + d.verticals.map((v) => '<label><input type="checkbox" class="or-v" value="' + esc(v.id) + '"' + (vert.has(v.id) ? ' checked' : '') + '> ' + esc(v.name) + '</label>').join('') + '</div>' +
      '<p class="mu xs" style="margin-top:12px">Warm-up: a new sending domain starts at 20 a day and steps up every 3 days (20, 35, 50 …) to your number, so emails land in inboxes, not spam. Homepage concepts are only built for what can be sent that day.' + (c.start ? ' Started ' + esc(new Date(c.start).toLocaleDateString('en-AU')) + '.' : '') + '</p>' +
      '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn pri" id="orSave">Save settings</button>' + (c.on ? '<button class="btn ghost" id="orRun">Run a hunt now</button>' : '') + '</div></section>';
    const ticked = () => $$('.or-item', el).filter((n) => $('.or-tick', n).checked).map((n) => n.dataset.id);
    const sendBtn = $('#orSend', el);
    const label = () => { if (sendBtn) { const n = ticked().length; sendBtn.textContent = n ? 'Send ' + n + ' ticked' : 'Nothing ticked'; sendBtn.disabled = !n; } };
    $$('.or-tick', el).forEach((b) => b.onchange = label); label();
    const all = $('#orAll', el); if (all) all.onclick = () => { const on = !ticked().length; $$('.or-tick', el).forEach((b) => b.checked = on); all.textContent = on ? 'Untick all' : 'Tick all'; label(); };
    if (sendBtn) sendBtn.onclick = async () => {
      const ids = ticked(); if (!ids.length) return;
      const ok = await modal({ title: 'Send ' + ids.length + ' emails?', text: 'Each business is added to your GHL outreach campaign, which sends email 1 now and the follow-ups later unless they reply. Unticked ones stay here for tomorrow.', ok: 'Send' });
      if (!ok) return;
      sendBtn.disabled = true; let done = 0, fail = 0;
      for (let i = 0; i < ids.length; i += 25) {
        try { const r = await team('/actions/bulk-approve', { method: 'POST', body: { ids: ids.slice(i, i + 25) }, long: true }); (r.results || []).forEach((x) => x.ok ? done++ : fail++); } catch (e) { fail += Math.min(25, ids.length - i); }
        sendBtn.textContent = 'Sending… ' + done + ' of ' + ids.length;
      }
      toast(done + ' sent' + (fail ? ', ' + fail + ' need a look in Approvals' : ''), fail ? 'bad' : 'ok');
      VIEWS.outreach(el);
    };
    $$('.or-skip', el).forEach((b) => b.onclick = async () => { const row = b.closest('.or-item'); try { await team('/actions/' + row.dataset.id + '/reject', { method: 'POST', body: { note: 'Skipped from Outreach today' } }); row.remove(); label(); toast('Skipped', 'ok'); } catch (e) { toast(e.message, 'bad'); } });
    $('#orSave', el).onclick = async () => {
      try {
        await team('/outreach/daily', { method: 'POST', body: { on: $('#orOn', el).checked, target: Number($('#orTarget', el).value) || 50, cities: $('#orCities', el).value.split(','), verticals: $$('.or-v', el).filter((x) => x.checked).map((x) => x.value) } });
        toast('Saved', 'ok'); VIEWS.outreach(el);
      } catch (e) { toast(e.message, 'bad'); }
    };
    const run = $('#orRun', el); if (run) run.onclick = async () => { run.disabled = true; try { const r = await team('/outreach/run', { method: 'POST', body: {} }); toast(r.result && r.result.started ? 'Started ' + r.result.started + ' hunt' + (r.result.started > 1 ? 's' : '') : 'Nothing to start right now (' + ((r.result && (r.result.reason || (r.result.queued_today >= r.result.cap ? 'today is full' : 'outside working hours'))) || 'busy') + ')', 'ok'); } catch (e) { toast(e.message, 'bad'); } run.disabled = false; };
  };
