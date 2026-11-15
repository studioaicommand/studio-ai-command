  // Studio console (v44): every client copy, health, version, AI spend and owner-approved support access.
  function flWhen(v) { return v ? new Date(v).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'never'; }
  function flCost(x) { return ((x.live && x.live.ai_spend_month_aud) || 0) + (x.hosting_aud || 0); }
  function flMargin(x) {
    if (!x.live) return '';
    const cost = flCost(x), plan = x.plan_aud;
    if (!plan) return '<div class="fl-margin"><span class="mu sm">Cost to run this month about <b>$' + esc(cost.toFixed(2)) + '</b> (AI + hosting). Add their plan price to see your margin.</span><button class="btn sm ghost" data-fl-plan>Set plan price</button></div>';
    const m = Math.round((plan - cost) / plan * 100), share = cost / plan;
    return '<div class="fl-margin"><span class="sm">Pays <b>$' + esc(plan.toLocaleString('en-AU')) + '/mo</b> \u00B7 costs <b>$' + esc(cost.toFixed(2)) + '</b> \u00B7 margin <b class="' + (share > 0.2 ? 'bad' : share > 0.1 ? 'warn' : 'good') + '">' + esc(m) + '%</b>' + (share > 0.2 ? '<br><span class="mu xs">AI cost is over 20% of what they pay. Time to talk about the next plan up.</span>' : '') + '</span><button class="btn sm ghost" data-fl-plan>Edit</button></div>';
  }
  VIEWS.fleet = async (el) => {
    el.innerHTML = '<section class="wf-glass">' + sk(160) + '</section>';
    const d = await team('/fleet');
    if (!still('fleet', el)) return;
    const card = (x) => {
      const L = x.live || {}, sp = (L.support || {}).status || 'none';
      const support = sp === 'approved' ? '<span class="chip ok">Support access until ' + esc(flWhen(L.support.until)) + '</span>' : sp === 'pending' ? '<span class="chip warn">Waiting for the owner to approve</span>' : '';
      return '<article class="fl-card" data-id="' + esc(x.id) + '"><div class="fl-top"><div><h3>' + esc(x.business || x.host) + '</h3><a class="mu sm" href="' + esc(x.host) + '/command-next" target="_blank" rel="noopener">' + esc(x.host.replace(/^https:[/][/]/, '')) + '</a></div>' +
        (x.live ? '<span class="chip ' + (x.up_to_date ? 'ok' : 'warn') + '">' + (x.up_to_date ? 'Up to date' : 'Update available') + '</span>' : '<span class="chip bad">Not reachable</span>') + '</div>' +
        (x.live ? '<div class="fl-stats"><div><span class="mu xs">AI cost this month</span><b>$' + esc((L.ai_spend_month_aud || 0).toFixed(2)) + '</b></div><div><span class="mu xs">Waiting for approval</span><b>' + esc(L.approvals_waiting) + '</b></div><div><span class="mu xs">People</span><b>' + esc(L.people) + '</b></div><div><span class="mu xs">Last active</span><b class="sm">' + esc(flWhen(L.last_activity_at)) + '</b></div></div>' : '<p class="mu sm">' + esc(x.error || '') + '</p>') +
        flMargin(x) +
        '<div class="fl-acts">' + support + (sp === 'approved' ? '<button class="btn pri sm" data-fl-open>Open with support access</button>' : sp === 'pending' ? '' : '<button class="btn sm" data-fl-ask>Ask for support access</button>') + '<button class="btn sm ghost" data-fl-rm>Disconnect</button></div></article>';
    };
    const up = d.items.filter((x) => x.live).length, behind = d.items.filter((x) => x.live && !x.up_to_date).length;
    el.innerHTML = '<section class="wf-glass wf-intro"><div><span class="wf-eyebrow">STUDIO CONSOLE</span><h2>Every client’s Command, at a glance.</h2><p class="mu">Health, version and AI cost for each client. You can’t see their customers or messages: for that, ask for support access and their owner approves it (24 hours, logged, no sending or payments).</p></div></section>' +
      '<div class="wd-metrics"><div class="wf-glass"><span class="mu sm">Client Commands</span><strong>' + d.items.length + '</strong></div><div class="wf-glass"><span class="mu sm">Online</span><strong>' + up + '</strong></div><div class="wf-glass"><span class="mu sm">Need updating</span><strong>' + behind + '</strong></div><div class="wf-glass"><span class="mu sm">AI cost this month</span><strong>$' + d.items.reduce((a, x) => a + ((x.live && x.live.ai_spend_month_aud) || 0), 0).toFixed(2) + '</strong></div>' + (function () { const priced = d.items.filter((x) => x.live && x.plan_aud); if (!priced.length) return ''; const rev = priced.reduce((a, x) => a + x.plan_aud, 0), cost = priced.reduce((a, x) => a + flCost(x), 0); return '<div class="wf-glass"><span class="mu sm">Monthly plans</span><strong>$' + rev.toLocaleString('en-AU') + '</strong></div><div class="wf-glass"><span class="mu sm">Margin</span><strong>' + Math.round((rev - cost) / rev * 100) + '%</strong></div>'; })() + '</div>' +
      (d.items.length ? '<div class="fl-grid">' + d.items.map(card).join('') + '</div>' : '<section class="wf-glass"><p class="mu">No client Commands connected yet.</p></section>') +
      '<section class="wf-glass"><h3>Connect a client’s Command</h3><p class="mu sm">Paste the connect code from their setup file (Client setups folder). New clients: run Client setup kit › New client Command first.</p><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="lab" style="flex:1 1 320px">Connect code<input class="in" id="flCode" placeholder="SFC1.…"></label><button class="btn pri" id="flAdd">Connect</button></div>' +
      (behind ? '<p class="mu sm" style="margin-top:12px">To update clients: put the new Command file in 1 Deploy Now, then run Client setup kit › Update all clients. It updates one client first, checks it, then the rest.</p>' : '') + '</section>';
    $('#flAdd', el).onclick = async () => { const code = $('#flCode', el).value.trim(); if (!code) return; try { const r = await team('/fleet/add', { method: 'POST', body: { code } }); toast('Connected ' + r.business, 'ok'); VIEWS.fleet(el); } catch (e) { toast(e.message, 'bad'); } };
    $$('.fl-card', el).forEach((c) => {
      const id = c.dataset.id, a = $('[data-fl-ask]', c), o = $('[data-fl-open]', c), rm = $('[data-fl-rm]', c);
      if (a) a.onclick = async () => { const why = await modal({ title: 'Ask for support access?', text: 'Their owner gets a message to approve 24 hours of access. You can’t send, pay or delete during it, and everything is logged for them.', fields: [{ id: 'reason', label: 'What it’s for (they’ll see this)', value: '' }], ok: 'Send request' }); if (!why) return; try { await team('/fleet/' + id + '/support', { method: 'POST', body: { reason: why.reason || '' } }); toast('Request sent to their owner', 'ok'); VIEWS.fleet(el); } catch (e) { toast(e.message, 'bad'); } };
      if (o) o.onclick = async () => { try { const r = await team('/fleet/' + id + '/open', { method: 'POST', body: {} }); window.open(r.url, '_blank', 'noopener'); } catch (e) { toast(e.message, 'bad'); } };
      const pl = $('[data-fl-plan]', c);
      if (pl) pl.onclick = async () => { const x = d.items.find((i) => i.id === id) || {}; const v = await modal({ title: 'What do they pay per month?', text: 'Their Studio AI Command plan, in dollars per month (before GST). Used to show your margin.', fields: [{ id: 'plan', label: 'Plan price per month ($)', value: x.plan_aud ? String(x.plan_aud) : '' }], ok: 'Save' }); if (!v) return; const n = Number(String(v.plan || '').replace(/[^0-9.]/g, '')); if (!(n > 0)) return toast('Enter a dollar amount', 'bad'); try { await team('/fleet/' + id + '/plan', { method: 'POST', body: { plan_aud: n } }); toast('Saved', 'ok'); VIEWS.fleet(el); } catch (e) { toast(e.message, 'bad'); } };
      rm.onclick = async () => { if (!(await modal({ title: 'Disconnect this client?', text: 'Their Command keeps running. It just leaves your console. You can reconnect with the connect code.', ok: 'Disconnect', danger: true }))) return; await team('/fleet/' + id + '/remove', { method: 'POST', body: {} }).catch(() => {}); VIEWS.fleet(el); };
    });
  };
  async function pkSupportExtras(host) {
    let s; try { s = await req('/api/v1/members/admin/support'); } catch { return; }
    if (!s.linked) return;
    const box = document.createElement('section'); box.className = 'p';
    const st = s.status || 'none';
    box.innerHTML = '<div class="ph"><div><h2>Studio Flow support access</h2><p class="mu sm">Studio Flow can only see inside your Command when you say yes: 24 hours at most, logged here, and they can’t send messages, take payments, see money or delete anything.</p></div></div>' +
      (st === 'pending' ? '<div class="pk-seal good">Studio Flow is asking for access' + (s.reason ? ': ' + esc(s.reason) : '') + ' (asked ' + esc(flWhen(s.requested_at)) + ')</div><div class="row" style="gap:10px;margin-top:12px"><button class="btn pri" data-sp="approve">Approve for 24 hours</button><button class="btn" data-sp="decline">Decline</button></div>' :
       st === 'approved' ? '<div class="pk-seal good">Support access is on until <b>' + esc(flWhen(s.until)) + '</b>.</div><div class="row" style="margin-top:12px"><button class="btn bad" data-sp="end">End it now</button></div>' :
       '<p class="mu sm">No access. ' + (st === 'expired' ? 'The last session ended on its own.' : st === 'ended' || st === 'declined' ? 'Last request: ' + esc(st) + '.' : '') + '</p>');
    host.prepend(box);
    $$('[data-sp]', box).forEach((b) => b.onclick = async () => { try { await req('/api/v1/members/admin/support', { method: 'POST', body: { action: b.dataset.sp } }); toast(b.dataset.sp === 'approve' ? 'Approved for 24 hours' : 'Done', 'ok'); box.remove(); pkSupportExtras(host); } catch (e) { toast(e.message, 'bad'); } });
  }

