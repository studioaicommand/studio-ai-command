  // v48 streamlined Command: merged tabs render their parts on one page.
  const T48 = VIEWS.today, TEAM48 = VIEWS.team;
  const part48 = (el, title, sub) => { const s = document.createElement('div'); s.className = 'v48-part'; s.dataset.embed = '1'; if (title) { const h = document.createElement('div'); h.className = 'sec v48-h'; h.innerHTML = '<div><h2>' + esc(title) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>'; el.append(h); } el.append(s); return s; };
  VIEWS.today = async (el) => {
    if (el.dataset.embed || INST_OFF.has('goals')) return T48(el);
    el.innerHTML = '';
    const a = part48(el), b = part48(el);
    await Promise.all([T48(a), VIEWS.goals(b).catch((e) => { b.innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; })]);
  };
  VIEWS.team = async (el) => {
    if (el.dataset.embed || (ROUTE.arg && BY[ROUTE.arg])) return TEAM48(el);
    el.innerHTML = '';
    const a = part48(el), c = part48(el, 'Scout ideas', 'What the market is doing, turned into ideas for the team.'), b = part48(el);
    await Promise.all([TEAM48(a), (VIEWS.scout ? VIEWS.scout(c) : Promise.resolve()).catch(() => { c.innerHTML = ''; }), VIEWS.jobs(b).catch((e) => { b.innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; })]);
  };
  VIEWS.knowledge = async (el) => {
    el.innerHTML = '';
    const a = part48(el, 'What the team knows', 'Facts, rules and decisions every AI team member uses.'), b = part48(el, 'Team brain', 'What the team has learned from your approvals and results.');
    await Promise.all([VIEWS.memory(a).catch((e) => { a.innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; }), VIEWS.brain(b).catch((e) => { b.innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; })]);
  };
  // v48 the weekly mission strip (Today and Outreach) and Scout ideas
  const goalStrip = async (el) => {
    try {
      const r = await team('/goal'); const g = r.goal; if (!g || !g.ok) { el.remove(); return; }
      const pct = Math.min(100, Math.round(g.booked / Math.max(1, g.goal) * 100)), pace = Math.min(100, Math.round(g.expected / Math.max(1, g.goal) * 100));
      const word = { hit: 'Target hit', on_track: 'On track', behind: 'Behind pace', well_behind: 'Well behind pace' }[g.status];
      el.className = 'v48-goal ' + g.status;
      el.innerHTML = '<div class="v48-goal-t"><span class="wf-eyebrow">THIS WEEK’S MISSION</span><h2><b>' + esc(g.known ? g.booked : '?') + '</b> of ' + esc(g.goal) + ' ' + esc(g.label) + '</h2><p class="mu sm">' + esc(word) + ' · day ' + esc(g.day) + ' of 7' + (g.status !== 'hit' ? ' · ' + esc(g.need_per_day) + ' a day to land it' : '') + '</p></div><div class="v48-bar" role="img" aria-label="' + esc(g.booked + ' of ' + g.goal + ' booked') + '"><i style="width:' + pct + '%"></i><em style="left:' + pace + '%" title="Where pace says we should be"></em></div>';
    } catch (e) { el.remove(); }
  };
  const T48b = VIEWS.today;
  VIEWS.today = async (el) => {
    if (el.dataset.embed) return T48b(el);
    const s = document.createElement('section'); s.className = 'v48-goal'; s.innerHTML = sk(60);
    const rest = document.createElement('div');
    el.innerHTML = ''; el.append(s, rest);
    goalStrip(s);
    await T48b(rest);
  };
  const OR48 = VIEWS.outreach;
  if (OR48) VIEWS.outreach = async (el) => { if (el.dataset.embed) return OR48(el); const s = document.createElement('section'); s.className = 'v48-goal'; s.innerHTML = sk(60); const rest = document.createElement('div'); el.innerHTML = ''; el.append(s, rest); goalStrip(s); rest.dataset.embed = '1'; await OR48(rest); };
  const AREA48 = { outreach: 'Outreach', demos: 'Website demos', receptionist: 'Receptionist', command: 'Command', website: 'Website', pricing: 'Pricing', content: 'Content', sales: 'Sales' };
  VIEWS.scout = async (el) => {
    el.innerHTML = sk(120);
    let d; try { d = await team('/scout'); } catch (e) { el.innerHTML = '<p class="mu sm">' + esc(e.message) + '</p>'; return; }
    const dots = (n) => '●'.repeat(n) + '<span class="mu">' + '●'.repeat(5 - n) + '</span>';
    const card = (i) => '<article class="v48-idea' + (i.status !== 'new' ? ' done' : '') + '" data-id="' + esc(i.id) + '"><div class="row sp" style="gap:10px;align-items:flex-start"><div><span class="chip">' + esc(AREA48[i.area] || i.area) + '</span>' + (i.status === 'actioned' ? ' <span class="chip ok">Sent to the team</span>' : '') + (i.taught ? ' <span class="chip ok">Designer taught</span>' : '') + '<h3>' + esc(i.title) + '</h3></div><div class="v48-score"><small>Bookings</small><span>' + dots(i.impact) + '</span><small>Effort</small><span>' + dots(i.effort) + '</span></div></div>' +
      '<p class="sm"><b>Seen:</b> ' + esc(i.what_they_do) + (i.seen_at ? ' <span class="mu">(' + esc(i.seen_at) + ')</span>' : '') + (i.source_url ? ' <a href="' + esc(i.source_url) + '" target="_blank" rel="noopener">source ↗</a>' : '') + '</p><p class="sm"><b>Our version:</b> ' + esc(i.our_version) + '</p>' +
      '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">' + (i.status === 'new' ? '<button class="btn sm pri" data-sa="action">Send to ' + esc(String(i.department).replace(/_/g, ' ').replace('head of ', '')) + '</button>' : '') + (i.design_lesson && !i.taught ? '<button class="btn sm" data-sa="teach">Teach the web designer</button>' : '') + '<button class="btn sm ghost" data-sa="dismiss">Dismiss</button></div></article>';
    el.innerHTML = '<div class="row sp" style="margin-bottom:12px;gap:10px;flex-wrap:wrap"><p class="mu sm" style="margin:0">Scout researches what other businesses are doing every morning and sends you the best ideas, evolved for us.' + (d.last_run ? ' Last run ' + esc(workflowDate(d.last_run)) + '.' : '') + '</p><button class="btn sm" id="scRun">Run Scout now</button></div>' + (d.ideas.length ? '<div class="v48-ideas">' + d.ideas.slice(0, 12).map(card).join('') + '</div>' : '<div class="empty">No ideas yet. Scout runs each morning, or tap Run Scout now.</div>');
    $('#scRun', el).onclick = async (e) => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Researching… (about a minute)'; try { const r = await team('/scout/run', { method: 'POST', body: {}, long: true }); toast(r.added + ' new idea' + (r.added === 1 ? '' : 's'), 'ok'); VIEWS.scout(el); } catch (x) { toast(x.message, 'bad'); b.disabled = false; b.textContent = 'Run Scout now'; } };
    $$('[data-sa]', el).forEach((b) => b.onclick = async () => { const row = b.closest('[data-id]'); b.disabled = true; try { await team('/scout/' + row.dataset.id, { method: 'POST', body: { action: b.dataset.sa } }); toast(b.dataset.sa === 'action' ? 'Sent to the team. It shows in AI jobs.' : b.dataset.sa === 'teach' ? 'Lesson saved for the web designer' : 'Dismissed', 'ok'); VIEWS.scout(el); } catch (x) { toast(x.message, 'bad'); b.disabled = false; } });
  };
