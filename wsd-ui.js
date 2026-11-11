  // Website Demo Studio (v40): find businesses, build demos, adjust by chat, Web Design Director, costs.
  let WD_TAB = 'find', WD_OPEN = null, WD_FILTER = 'all';
  const wdMoney = (n) => n == null ? '–' : '$' + Number(n).toFixed(Number(n) < 10 ? 2 : 0);
  const wdWhen = (v) => v ? new Date(v).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
  const WD_STATUS = [['new', 'New'], ['building', 'Building…'], ['built', 'Demo built'], ['ready', 'Approved'], ['called', 'Called'], ['booked', 'Call booked'], ['won', 'Won'], ['skipped', 'Not now']];
  const wdStatusLabel = (s) => (WD_STATUS.find((x) => x[0] === s) || [s, s])[1];
  function wdMetrics(c) {
    const m = [['Leads found', c.leads], ['Demos built', c.demos], ['Calls booked', c.booked], ['Cost per lead', wdMoney(c.per_lead_aud)], ['Cost per demo', wdMoney(c.per_demo_aud)], ['Cost per booked call', wdMoney(c.per_booked_call_aud)], ['Total spend', wdMoney(c.total_aud)]];
    return '<div class="wd-metrics">' + m.map(([k, v]) => '<div class="wf-glass"><span class="mu sm">' + esc(k) + '</span><strong>' + esc(v) + '</strong></div>').join('') + '</div>';
  }
  function wdLeadCard(l) {
    const tel = String(l.phone || '').replace(/[^+0-9]/g, '');
    const built = !!l.token;
    return '<article class="wd-lead" data-lead="' + esc(l.id) + '"><div class="wd-lead-main"><div class="wd-lead-top"><h4>' + esc(l.name) + '</h4><span class="chip wd-st-' + esc(l.status) + '">' + esc(wdStatusLabel(l.status)) + '</span></div>' +
      '<p class="mu sm">' + esc([l.industry, l.suburb || l.area, l.rating ? l.rating + '★' + (l.reviews ? ' (' + l.reviews + ')' : '') : ''].filter(Boolean).join(' · ')) + ' · <a href="' + esc(l.website) + '" target="_blank" rel="noopener">' + esc(String(l.website).replace(/^https?:[/][/](www[.])?/, '').slice(0, 40)) + '</a></p>' +
      '<div class="wd-need"><span>Upgrade need</span><i><b style="width:' + Math.max(4, +l.score || 0) + '%"></b></i><em>' + esc(l.score || 0) + '</em></div>' +
      (l.signals && l.signals.length ? '<div class="wd-sig">' + l.signals.slice(0, 6).map((s) => '<span>' + esc(s) + '</span>').join('') + '</div>' : '') +
      (l.why ? '<p class="sm wd-why">' + esc(l.why) + '</p>' : '') + (l.error ? '<p class="sm" style="color:#fda4af">Last build failed: ' + esc(l.error) + '</p>' : '') +
      '<input class="in wd-note" placeholder="Notes from the call…" value="' + esc(l.note || '') + '"></div>' +
      '<div class="wd-lead-side">' + (tel ? '<a class="btn pri wd-call" href="tel:' + esc(tel) + '">Call ' + esc(l.phone) + '</a>' : '<span class="mu sm">No phone found</span>') +
      (built ? '<button class="btn" data-wd-open="' + esc(l.token) + '">Open demo in Studio</button>' : '<button class="btn pri" data-wd-build="' + esc(l.id) + '"' + (l.status === 'building' ? ' disabled' : '') + '>Yes, build demo</button>') +
      '<select class="in wd-status">' + WD_STATUS.filter((s) => s[0] !== 'building').map(([k, v]) => '<option value="' + k + '"' + (k === l.status ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>' +
      '<span class="mu sm">Found ' + esc(wdWhen(l.found)) + ' · ' + wdMoney(l.cost_aud) + (l.demo_cost_aud ? ' + demo ' + wdMoney(l.demo_cost_aud) : '') + '</span></div></article>';
  }
  function wdFindTab(d) {
    const counts = {}; d.leads.forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1; });
    const shown = d.leads.filter((l) => WD_FILTER === 'all' ? l.status !== 'skipped' : l.status === WD_FILTER);
    return '<section class="wf-glass"><div class="wf-section-head"><div><h3>Find businesses with tired websites</h3><p class="mu sm">The AI searches, checks each website (mobile, age, SEO, booking, speed) and gets the phone number. You pick who gets a demo.</p></div></div>' +
      '<div class="wd-form"><div><label class="lab">Industry</label><input class="in" id="wdInd" placeholder="e.g. physio, childcare, plumbers, cafes"></div><div><label class="lab">Area</label><input class="in" id="wdArea" placeholder="e.g. Sunshine Coast, North Brisbane"></div><div><label class="lab">How many</label><select class="in" id="wdN"><option>5</option><option selected>8</option><option>12</option></select></div><button class="btn pri" id="wdFind">Find businesses</button></div>' +
      '<details class="wd-more"><summary>Or build a demo straight from a website</summary><div class="wd-form"><div><label class="lab">Website</label><input class="in" id="wdSite" placeholder="business.com.au"></div><div><label class="lab">Business name (optional)</label><input class="in" id="wdName"></div><div><label class="lab">Direction for the Director (optional)</label><input class="in" id="wdDir" placeholder="e.g. make it feel premium and calm"></div><button class="btn pri" id="wdBuild">Build demo</button></div></details><p class="mu sm" id="wdMsg"></p></section>' +
      '<section class="wf-glass"><div class="wf-section-head"><div><h3>Your call list</h3><p class="mu sm">Check them, say yes to build, then call with the demo ready.</p></div></div><div class="wf-filters">' + [['all', 'All active']].concat(WD_STATUS).map(([k, v]) => '<button class="btn sm' + (WD_FILTER === k ? ' pri' : ' ghost') + '" data-wd-filter="' + k + '">' + esc(v) + (k !== 'all' && counts[k] ? ' ' + counts[k] : '') + '</button>').join('') + '</div>' +
      (shown.length ? shown.map(wdLeadCard).join('') : '<div class="empty">No businesses here yet. Search above.</div>') + '</section>';
  }
  function wdDemosTab(d) {
    const row = (x) => '<button class="wd-demo" data-wd-open="' + esc(x.token) + '"><span><b>' + esc(x.name) + '</b><small class="mu">' + esc([x.industry, x.style && 'style: ' + x.style].filter(Boolean).join(' · ')) + '</small></span><span class="chip wd-st-' + esc(x.status) + '">' + esc(x.status === 'approved' ? 'Approved' : 'Draft') + '</span><span class="mu sm">' + esc(x.views || 0) + ' views · ' + esc(x.chats || 0) + ' chats · ' + wdMoney(x.cost_aud) + '</span></button>';
    const hand = '<section class="wf-glass"><div class="wf-section-head"><div><h3>Built for Mat’s referrals</h3><p class="mu sm">Hand-built by Claude. Fixed designs (ask Claude in chat for changes), with the real AI receptionist. Preview links don’t alert you.</p></div></div>' + d.hand_built.map((h) => '<div class="wd-demo"><span><b>' + esc(h.name) + '</b><small class="mu">Hand-built · ' + esc(h.views || 0) + ' views · ' + esc(h.chats || 0) + ' chats' + (h.last_view ? ' · last opened ' + esc(wdWhen(h.last_view)) : '') + '</small></span><a class="btn sm" target="_blank" rel="noopener" href="' + esc(h.site) + '?preview=1">Homepage</a><a class="btn sm ghost" target="_blank" rel="noopener" href="' + esc(h.report) + '?preview=1">Report</a><button class="btn sm ghost" data-wd-copyhand="' + esc(h.site) + '">Copy links</button></div>').join('') + '</section>';
    return hand + '<section class="wf-glass"><div class="wf-section-head"><div><h3>Website demos</h3><p class="mu sm">Open one to preview, chat with the Director to change it, get ideas or regenerate. Your own views (preview links) never trigger alerts.</p></div></div>' + (d.demos.length ? d.demos.map(row).join('') : '<div class="empty">No demos yet. Find a business or build from a website.</div>') + '</section>';
  }
  function wdTeamHtml(b) {
    const rv = b.reviews || [], avg = (k) => rv.length ? (rv.reduce((n, r) => n + (r.scores[k] || 0), 0) / rv.length).toFixed(1) : '\u2013';
    const keys = [['conversion', 'Conversion'], ['copy', 'Copy'], ['mobile_type', 'Mobile & type'], ['proof', 'Proof'], ['originality', 'Originality']];
    const rt = b.retro;
    return '<section class="wf-glass wd-team"><div class="wf-section-head"><div><span class="wf-eyebrow">OUTREACH DESIGN TEAM</span><h3>' + esc((b.team_roster || []).length) + ' specialists, training each other</h3><p class="mu sm">The Creative Director designs each concept, then a panel critiques it and fixes the words before anyone sees it. The team writes lessons for each other, and every week the Results Analyst learns from which concepts got opened, replies and bookings.</p></div><button class="btn sm" id="wdRetro">Run the weekly retro now</button></div>' +
      '<div class="wd-roster">' + (b.team_roster || []).map((t) => '<span class="wd-role" title="' + esc(t.job) + '"><b>' + esc(t.name) + '</b><small>' + esc(t.job) + '</small></span>').join('') + '</div>' +
      '<div class="wd-scores">' + keys.map(([k, l]) => '<div><strong>' + esc(avg(k)) + '</strong><span class="mu xs">' + esc(l) + '</span></div>').join('') + '<div><strong>' + esc(rv.length) + '</strong><span class="mu xs">concepts reviewed</span></div></div>' +
      (rt ? '<p class="sm wd-retro"><b>Last retro (' + esc(wdWhen(rt.at)) + '):</b> ' + esc(rt.summary) + ' <span class="mu">' + esc(rt.concepts) + ' concepts \u00B7 ' + esc(rt.sent) + ' sent \u00B7 ' + esc(rt.opened) + ' opened \u00B7 ' + esc(rt.booked) + ' booked</span></p>' : '') +
      '<h4 class="wd-tl-h">What the team has taught itself</h4>' + ((b.team || []).length ? '<ul class="wd-lessons">' + b.team.slice().reverse().map((l) => '<li><span>' + esc(l.text) + '<small class="mu"> \u00B7 ' + esc(l.from || '') + ' ' + esc(wdWhen(l.at)) + '</small></span><button class="btn sm ghost" data-wd-rmteam="' + esc(l.id) + '">Remove</button></li>').join('') + '</ul>' : '<p class="mu sm">Nothing yet. Lessons appear as the panel reviews concepts and the retro reads the results.</p>') + '</section>';
  }
  function wdBrainTab(d) {
    const b = d.brain;
    return wdTeamHtml(b) + '<section class="wf-glass"><div class="wf-section-head"><div><span class="wf-eyebrow">WEB DESIGN DIRECTOR</span><h3>Your designer’s memory</h3><p class="mu sm">It learns from every change you ask for, every design you approve and every website you show it. These lessons shape every new demo.</p></div></div>' +
      '<div class="wd-form"><div style="flex:1"><label class="lab">Teach it something</label><input class="in" id="wdLesson" placeholder="e.g. Always use the real team photo in the hero when there is one"></div><button class="btn pri" id="wdAddLesson">Save lesson</button></div>' +
      (b.lessons.length ? '<ul class="wd-lessons">' + b.lessons.slice().reverse().map((l) => '<li><span>' + esc(l.text) + '<small class="mu"> · ' + esc(l.from || '') + ' ' + esc(wdWhen(l.at)) + '</small></span><button class="btn sm ghost" data-wd-rmlesson="' + esc(l.id) + '">Remove</button></li>').join('') + '</ul>' : '<p class="mu sm">No lessons yet.</p>') + '</section>' +
      '<section class="wf-glass"><h3>Learn a style from any website</h3><p class="mu sm">Show it a site you love (Awwwards, a competitor, a brand you admire). It profiles the look and adds it to its style library.</p><div class="wd-form"><div><label class="lab">Website</label><input class="in" id="wdRef" placeholder="https://…"></div><div style="flex:1.4"><label class="lab">What you like about it (optional)</label><input class="in" id="wdRefNote" placeholder="e.g. the huge type and slow image zooms"></div><button class="btn pri" id="wdLearn">Learn this style</button></div>' +
      '<div class="wd-styles">' + Object.entries(b.styles).map(([k, s]) => '<div class="wd-style learned"><b>' + esc(s.name) + '</b><span class="mu sm">' + esc(s.mood) + '</span><small class="mu">Learned from ' + esc(String(s.from || '').replace(/^https?:[/][/]/, '').slice(0, 40)) + '</small><button class="btn sm ghost" data-wd-rmstyle="' + esc(k) + '">Remove</button></div>').join('') +
      Object.entries(b.builtin).map(([k, s]) => '<div class="wd-style"><b>' + esc(s.name) + '</b><span class="mu sm">' + esc(s.mood) + '</span><small class="mu">Best for ' + esc(s.fits) + '</small></div>').join('') + '</div></section>' +
      (b.approved.length ? '<section class="wf-glass"><h3>Designs you approved</h3>' + b.approved.slice().reverse().map((a) => '<p class="sm"><b>' + esc(a.name || a.industry || '') + '</b> <span class="mu">' + esc(a.style) + ' · ' + esc(a.combo) + '</span></p>').join('') + '</section>' : '');
  }
  function wdCostsTab(d) {
    const c = d.costs;
    const rows = [['Finding businesses', wdMoney(c.finding_aud)], ['Building and adjusting demos', wdMoney(c.demos_aud)], ['Total', wdMoney(c.total_aud)], ['Businesses found', c.leads], ['Demos built', c.demos], ['Called', c.called], ['Calls booked', c.booked], ['Won', c.won], ['Cost per business found', wdMoney(c.per_lead_aud)], ['Cost per demo', wdMoney(c.per_demo_aud)], ['Cost per booked call', wdMoney(c.per_booked_call_aud)], ['Cost per new client', wdMoney(c.per_client_aud)], ['Demo views (prospects)', c.views], ['Receptionist chats (prospects)', c.chats]];
    return '<section class="wf-glass"><h3>What this costs</h3><p class="mu sm">AI costs only (searches, design, changes), in AUD. Mark leads as Called / Call booked / Won so the per-call numbers stay true.</p><table class="wd-table">' + rows.map(([k, v]) => '<tr><td>' + esc(k) + '</td><td>' + esc(v) + '</td></tr>').join('') + '</table></section>' +
      '<section class="wf-glass"><h3>Recent searches</h3>' + (d.searches.length ? '<table class="wd-table">' + d.searches.map((s) => '<tr><td>' + esc(s.industry) + ' · ' + esc(s.area) + '</td><td>' + esc(s.found) + ' found</td><td>' + wdMoney(s.cost_aud) + '</td><td class="mu">' + esc(wdWhen(s.at)) + '</td></tr>').join('') + '</table>' : '<p class="mu sm">None yet.</p>') + '</section>';
  }
  async function wdEditor(el, token) {
    el.innerHTML = '<section class="wf-glass">' + sk(380) + '</section>';
    const r = await team('/website-demos/' + token);
    if (!still('demos', el)) return;
    const x = r.demo;
    let view = 'site', width = 'desk';
    const src = () => (view === 'site' ? r.site : r.report) + '?preview=1&v=' + Date.now();
    el.innerHTML = '<section class="wf-glass wd-ed-head"><button class="btn sm ghost" id="wdBack">← All demos</button><div><span class="wf-eyebrow">WEBSITE DEMO · ' + esc(String(x.style || '').toUpperCase()) + '</span><h2>' + esc(x.name) + '</h2><p class="mu sm">' + esc(x.why || '') + '</p>' + (x.critique ? '<p class="sm wd-crit">Design team review: <b>' + esc(Math.round(Object.values(x.critique.scores).reduce((a, b) => a + b, 0) / 5 * 10) / 10) + '/10</b> \u00B7 ' + esc(x.critique.applied) + ' fix' + (x.critique.applied === 1 ? '' : 'es') + ' made before you saw it</p>' : '') + '<p class="mu sm">' + esc(x.images) + ' photos from their site · ' + (x.reviews && x.reviews.rating ? esc(x.reviews.rating + '★ ' + (x.reviews.source || '')) + ' · ' : '') + esc((x.reviews && x.reviews.items || []).length) + ' real reviews · cost so far ' + wdMoney(x.cost_aud) + '</p></div>' +
      '<div class="acts"><button class="btn' + (x.status === 'approved' ? '' : ' pri') + '" id="wdApprove">' + (x.status === 'approved' ? 'Approved ✓ (undo)' : 'Approve to send') + '</button><button class="btn" id="wdCopy">Copy links</button><a class="btn ghost" target="_blank" rel="noopener" href="' + esc(r.site) + '?preview=1">Open full screen</a></div></section>' +
      '<div class="wd-ed"><section class="wf-glass wd-prev"><div class="wd-prev-bar"><div class="wf-filters" style="margin:0"><button class="btn sm pri" data-wd-view="site">Homepage</button><button class="btn sm ghost" data-wd-view="report">Leak report</button></div><div class="wf-filters" style="margin:0"><button class="btn sm pri" data-wd-w="desk">Desktop</button><button class="btn sm ghost" data-wd-w="phone">Phone</button><button class="btn sm ghost" id="wdFs">Full screen</button></div></div><div class="wd-frame-wrap"><iframe id="wdFrame" title="Demo preview" src="' + esc(src()) + '"></iframe></div></section>' +
      '<section class="wf-glass wd-chat"><h3>Talk to the Director</h3><p class="mu sm">Ask for any change. It updates the demo and learns your taste.</p><div class="wd-log" id="wdLog">' + (x.chat || []).map((c) => '<div class="wd-m ' + (c.r === 'ty' ? 'me' : 'ai') + '">' + esc(c.t) + '</div>').join('') + '</div>' +
      '<textarea class="in" id="wdAsk" rows="3" placeholder="e.g. Make the hero darker and more premium, use the playground photo, add a pinned ‘A day here’ section"></textarea><div class="acts"><button class="btn pri" id="wdSend">Update demo</button><button class="btn" id="wdIdeas">Give me ideas</button><button class="btn" id="wdRegen">Regenerate (new design)</button><button class="btn ghost" id="wdUndo"' + (x.versions ? '' : ' disabled') + '>Undo</button></div>' +
      '<div id="wdIdeaList">' + wdIdeasHtml(x.ideas) + '</div></section></div>';
    const frame = $('#wdFrame', el), log = $('#wdLog', el), ask = $('#wdAsk', el);
    log.scrollTop = log.scrollHeight;
    const wrap = $('.wd-frame-wrap', el);
    const fit = () => { if (width === 'desk' && wrap.clientWidth < 1280 && !(wrap.classList.contains('wd-full') && wrap.clientWidth < 760)) { const k = wrap.clientWidth / 1440; frame.style.width = '1440px'; frame.style.height = (wrap.clientHeight / k) + 'px'; frame.style.transform = 'scale(' + k + ')'; frame.style.transformOrigin = '0 0'; } else { frame.style.width = ''; frame.style.height = ''; frame.style.transform = ''; } };
    fit(); addEventListener('resize', fit);
    const fsX = document.createElement('button'); fsX.className = 'wd-fs-x'; fsX.type = 'button'; fsX.textContent = '\u2715 Close full screen';
    const fsHome = document.createComment('wd-frame');
    const fsOff = () => { if (!wrap.classList.contains('wd-full')) return; wrap.classList.remove('wd-full'); fsX.remove(); fsHome.replaceWith(wrap); document.body.style.overflow = ''; setTimeout(fit, 60); };
    $('#wdFs', el).onclick = () => { wrap.before(fsHome); document.body.append(wrap); wrap.classList.add('wd-full'); wrap.append(fsX); document.body.style.overflow = 'hidden'; setTimeout(fit, 60); };
    addEventListener('hashchange', fsOff);
    fsX.onclick = fsOff;
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && wrap.classList.contains('wd-full')) fsOff(); });
    const reload = () => { frame.src = src(); };
    const busy = (on, msg) => { $$('#wdSend,#wdIdeas,#wdRegen,#wdUndo,#wdApprove', el).forEach((b) => b.disabled = on); if (msg) { const m = document.createElement('div'); m.className = 'wd-m ai wd-wait'; m.textContent = msg; log.append(m); log.scrollTop = log.scrollHeight; } if (!on) $$('.wd-wait', log).forEach((n) => n.remove()); };
    const say = (t, who) => { const m = document.createElement('div'); m.className = 'wd-m ' + who; m.textContent = t; log.append(m); log.scrollTop = log.scrollHeight; };
    $('#wdBack', el).onclick = () => { WD_OPEN = null; VIEWS.demos(el); };
    $$('[data-wd-view]', el).forEach((b) => b.onclick = () => { view = b.dataset.wdView; $$('[data-wd-view]', el).forEach((x2) => x2.className = 'btn sm ' + (x2 === b ? 'pri' : 'ghost')); reload(); });
    $$('[data-wd-w]', el).forEach((b) => b.onclick = () => { width = b.dataset.wdW; $$('[data-wd-w]', el).forEach((x2) => x2.className = 'btn sm ' + (x2 === b ? 'pri' : 'ghost')); wrap.classList.toggle('phone', width === 'phone'); setTimeout(fit, 420); });
    const run = async (path, body, wait, after) => {
      busy(true, wait);
      try { const res = await team('/website-demos/' + token + path, { method: 'POST', body: body || {}, long: true }); busy(false); after && after(res); reload(); }
      catch (e) { busy(false); say('Not done: ' + e.message, 'ai'); }
    };
    const send = (text) => { if (!text) return; say(text, 'me'); ask.value = ''; run('/adjust', { message: text }, 'Designing… (about 30–60 seconds)', (res) => { say(res.summary + (res.lesson ? ' (Learned: ' + res.lesson + ')' : '') + ' · ' + wdMoney(res.cost_aud), 'ai'); $('#wdUndo', el).disabled = false; }); };
    $('#wdSend', el).onclick = () => send(ask.value.trim());
    ask.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(ask.value.trim()); });
    $('#wdRegen', el).onclick = () => { const extra = ask.value.trim(); say('Regenerate a new design' + (extra ? ': ' + extra : ''), 'me'); ask.value = ''; run('/regenerate', { message: extra }, 'Creating a completely new design… (about a minute)', (res) => say(res.summary + ' · ' + wdMoney(res.cost_aud), 'ai')); };
    $('#wdUndo', el).onclick = () => run('/undo', {}, 'Undoing…', () => say('Back to the previous version.', 'ai'));
    $('#wdIdeas', el).onclick = async () => { busy(true, 'Thinking like an Awwwards judge…'); try { const res = await team('/website-demos/' + token + '/ideas', { method: 'POST', body: {}, long: true }); busy(false); $('#wdIdeaList', el).innerHTML = wdIdeasHtml(res.ideas); bindIdeas(); } catch (e) { busy(false); say('No ideas this time: ' + e.message, 'ai'); } };
    const bindIdeas = () => $$('[data-wd-apply]', el).forEach((b) => b.onclick = () => send(b.dataset.wdApply));
    bindIdeas();
    $('#wdApprove', el).onclick = async () => { try { await team('/website-demos/' + token + '/approve', { method: 'POST', body: { on: x.status !== 'approved' } }); toast(x.status === 'approved' ? 'Back to draft' : 'Approved ✓ The Director will learn from this design', 'ok'); wdEditor(el, token); } catch (e) { toast(e.message, 'warn'); } };
    $('#wdCopy', el).onclick = async () => { const t = 'Homepage concept: ' + r.site + '\nLeak report: ' + r.report; try { await navigator.clipboard.writeText(t); toast('Links copied (these are the client links, views will alert you)', 'ok'); } catch { toast(t); } };
  }
  function wdIdeasHtml(ideas) {
    if (!ideas || !ideas.length) return '';
    return '<div class="wd-ideas"><b class="sm">Ideas from the Director</b>' + ideas.map((i) => '<div class="wd-idea"><span><b>' + esc(i.title) + '</b>' + (i.why ? '<small class="mu"> ' + esc(i.why) + '</small>' : '') + '</span><button class="btn sm" data-wd-apply="' + esc(i.instruction || i.title) + '">Apply</button></div>').join('') + '</div>';
  }
  VIEWS.demos = async (el) => {
    if (WD_OPEN) return wdEditor(el, WD_OPEN);
    el.innerHTML = '<section class="wf-glass">' + sk(140) + '</section>';
    const d = await team('/website-demos');
    if (!still('demos', el)) return;
    const tabs = [['find', 'Find businesses'], ['demos', 'Demos (' + (d.demos.length + d.hand_built.length) + ')'], ['brain', 'Web Design Director'], ['costs', 'Costs']];
    const body = WD_TAB === 'demos' ? wdDemosTab(d) : WD_TAB === 'brain' ? wdBrainTab(d) : WD_TAB === 'costs' ? wdCostsTab(d) : wdFindTab(d);
    el.innerHTML = '<section class="wf-glass wf-intro"><div><span class="wf-eyebrow">STUDIO FLOW · WEBSITE DEMO STUDIO</span><h2>Find them. Build it. Book the call.</h2><p class="mu">Full-motion concept homepages in each business’s own brand, with the AI receptionist we sell, their real reviews and a leak report. Nothing is sent without you.</p></div></section>' + wdMetrics(d.costs) +
      '<div class="wf-filters wd-tabs">' + tabs.map(([k, v]) => '<button class="btn' + (WD_TAB === k ? ' pri' : ' ghost') + '" data-wd-tab="' + k + '">' + esc(v) + '</button>').join('') + '</div>' + body;
    $$('[data-wd-tab]', el).forEach((b) => b.onclick = () => { WD_TAB = b.dataset.wdTab; VIEWS.demos(el); });
    $$('[data-wd-open]', el).forEach((b) => b.onclick = () => { WD_OPEN = b.dataset.wdOpen; wdEditor(el, WD_OPEN); });
    $$('[data-wd-copyhand]', el).forEach((b) => b.onclick = async () => { const s0 = b.dataset.wdCopyhand, t = 'Homepage: ' + s0 + '\nReport: ' + s0 + '/report'; try { await navigator.clipboard.writeText(t); toast('Links copied', 'ok'); } catch { toast(t); } });
    $$('[data-wd-filter]', el).forEach((b) => b.onclick = () => { WD_FILTER = b.dataset.wdFilter; VIEWS.demos(el); });
    const msg = $('#wdMsg', el);
    const long = async (btn, path, body, wait, done) => { btn.disabled = true; const t = btn.textContent; btn.textContent = wait; if (msg) msg.textContent = ''; try { const r = await team(path, { method: 'POST', body, long: true }); done && done(r); } catch (e) { toast(e.message, 'warn'); if (msg) msg.textContent = 'Not done: ' + e.message; btn.disabled = false; btn.textContent = t; } };
    const f = $('#wdFind', el);
    if (f) f.onclick = () => { const industry = $('#wdInd', el).value.trim(), area = $('#wdArea', el).value.trim(); if (!industry || !area) return toast('Add an industry and an area', 'warn'); long(f, '/website-demos/find', { industry, area, count: +$('#wdN', el).value }, 'Searching and checking sites… (1–2 min)', (r) => { toast('Found ' + r.found + ' businesses · ' + wdMoney(r.cost_aud), 'ok'); WD_FILTER = 'new'; VIEWS.demos(el); }); };
    const bb = $('#wdBuild', el);
    if (bb) bb.onclick = () => { const website = $('#wdSite', el).value.trim(); if (!website) return toast('Add a website', 'warn'); long(bb, '/website-demos', { website, name: $('#wdName', el).value.trim() || undefined, direction: $('#wdDir', el).value.trim() || undefined }, 'Building… (about 2 minutes)', (r) => { toast('Demo ready · ' + wdMoney(r.cost_aud), 'ok'); WD_OPEN = r.token; wdEditor(el, r.token); }); };
    $$('[data-wd-build]', el).forEach((b) => b.onclick = () => long(b, '/website-demos/leads/' + b.dataset.wdBuild + '/build', {}, 'Building… (about 2 min)', (r) => { toast('Demo ready for ' + r.name + ' · ' + wdMoney(r.cost_aud), 'ok'); VIEWS.demos(el); }));
    $$('.wd-lead', el).forEach((card) => {
      const id = card.dataset.lead;
      $('.wd-status', card).onchange = async (e) => { try { await team('/website-demos/leads/' + id, { method: 'POST', body: { status: e.target.value } }); toast('Saved', 'ok'); VIEWS.demos(el); } catch (er) { toast(er.message, 'warn'); } };
      $('.wd-note', card).onchange = async (e) => { try { await team('/website-demos/leads/' + id, { method: 'POST', body: { note: e.target.value } }); toast('Note saved', 'ok'); } catch (er) { toast(er.message, 'warn'); } };
    });
    const al = $('#wdAddLesson', el);
    if (al) al.onclick = async () => { const t = $('#wdLesson', el).value.trim(); if (!t) return; try { await team('/website-demos/brain', { method: 'POST', body: { add: t } }); toast('Lesson saved', 'ok'); VIEWS.demos(el); } catch (e) { toast(e.message, 'warn'); } };
    $$('[data-wd-rmlesson]', el).forEach((b) => b.onclick = async () => { await team('/website-demos/brain', { method: 'POST', body: { remove: b.dataset.wdRmlesson } }).catch(() => {}); VIEWS.demos(el); });
    $$('[data-wd-rmteam]', el).forEach((b) => b.onclick = async () => { await team('/website-demos/brain', { method: 'POST', body: { remove_team: b.dataset.wdRmteam } }).catch(() => {}); VIEWS.demos(el); });
    const rtb = $('#wdRetro', el); if (rtb) rtb.onclick = async () => { rtb.disabled = true; rtb.textContent = 'Reviewing results\u2026'; try { const r = await team('/website-demos/retro', { method: 'POST', body: {}, long: true }); toast(r.skipped ? 'Not enough concepts yet' : 'Retro done', 'ok'); VIEWS.demos(el); } catch (e) { toast(e.message, 'bad'); rtb.disabled = false; } };
    $$('[data-wd-rmstyle]', el).forEach((b) => b.onclick = async () => { await team('/website-demos/brain', { method: 'POST', body: { remove_style: b.dataset.wdRmstyle } }).catch(() => {}); VIEWS.demos(el); });
    const ls = $('#wdLearn', el);
    if (ls) ls.onclick = () => { const url = $('#wdRef', el).value.trim(); if (!url) return toast('Add a website', 'warn'); long(ls, '/website-demos/learn', { url, note: $('#wdRefNote', el).value.trim() }, 'Studying the site…', (r) => { toast('Learned: ' + (r.style && r.style.name || 'new style') + ' · ' + wdMoney(r.cost_aud), 'ok'); VIEWS.demos(el); }); };
  };

