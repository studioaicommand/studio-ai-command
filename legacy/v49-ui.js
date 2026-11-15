  // v49 Performance: the funnel, cost per booked call, the Team Leader's review and every agent's scorecard
  VIEWS.performance = async (el) => {
    el.innerHTML = '<section class="v48-goal">' + sk(60) + '</section><section class="wf-glass">' + sk(240) + '</section>';
    let d; try { d = await team('/performance'); } catch (e) { el.innerHTML = '<section class="wf-glass"><p class="mu">' + esc(e.message) + '</p></section>'; return; }
    if (!still('performance', el)) return;
    const f = d.funnel && d.funnel.ok ? d.funnel : null, rv = d.coach.review, company = d.tier === 'company';
    const grades = {}; (rv && rv.leaderboard || []).forEach((x) => { grades[x.department] = x; });
    const money = (n) => n === null || n === undefined ? '—' : 'A$' + Number(n).toLocaleString('en-AU', { maximumFractionDigits: 2 });
    let funnel = '';
    if (f) {
      const top = Math.max(1, f.stages[0].n);
      funnel = '<div class="v49-funnel">' + f.stages.map((s, i) => { const prev = i ? f.stages[i - 1].n : 0; const conv = i && prev ? Math.round(s.n / prev * 100) : null; return '<div class="v49-st"><div class="v49-st-l"><b>' + esc(s.n) + '</b><span>' + esc(s.label) + '</span></div><div class="v49-st-bar"><i style="width:' + Math.max(2, Math.round(s.n / top * 100)) + '%"></i></div><small>' + (conv === null ? 'this week' : conv <= 100 ? esc(conv) + '% of previous' : 'all channels') + '</small></div>'; }).join('') + '</div>';
    }
    const card = (x) => { const g = grades[x.department]; const rules = (d.coach.rules[x.department] || []); return '<article class="v49-agent" data-d="' + esc(x.department) + '"><div class="v49-a-top"><span class="v49-grade g-' + esc(g ? g.grade : 'na') + '">' + esc(g ? g.grade : '–') + '</span><div><h3>' + esc(x.name) + '</h3><p class="mu xs">' + esc(x.kpi) + '</p></div><span class="v49-score">' + (x.score === null ? '<small class="mu">no data</small>' : esc(x.score) + '<small>/100</small>') + '</span></div>' +
      '<div class="v49-a-bar"><i style="width:' + (x.score || 0) + '%"></i></div>' +
      '<div class="v49-a-stats"><span><b>' + esc(x.jobs_done) + '</b> done</span><span><b>' + esc(x.jobs_failed) + '</b> failed</span><span><b>' + esc(x.approved) + '</b>/' + esc(x.approved + x.rejected) + ' approved</span><span><b>' + esc(x.pending) + '</b> waiting</span><span><b>' + money(x.cost_aud) + '</b> AI</span></div>' +
      (g ? '<p class="sm v49-why">' + esc(g.why) + '</p>' : '') +
      '<div class="v49-rules"><p class="mu xs">Coach rules</p>' + (rules.length ? rules.map((r) => '<div class="v49-rule"><span>' + esc(r.text) + '</span><button class="btn xs ghost" data-rm="' + esc(r.id) + '" aria-label="Remove rule">×</button></div>').join('') : '<p class="mu xs">None yet.</p>') + '<div class="row v49-add"><input class="in" placeholder="Add a rule for this agent" maxlength="200"><button class="btn sm" data-add>Add</button></div></div></article>'; };
    const order = { A: 0, B: 1, C: 2, D: 3, F: 4, idle: 5 };
    const list = d.scorecards.slice().sort((a, b) => ((grades[a.department] ? order[grades[a.department].grade] : 6) - (grades[b.department] ? order[grades[b.department].grade] : 6)) || ((b.score || 0) - (a.score || 0)));
    el.innerHTML = '<section class="v48-goal"></section>' +
      '<div class="wd-metrics"><div class="wf-glass"><span class="mu sm">AI cost this week</span><strong>' + money(f && f.cost_aud) + '</strong></div><div class="wf-glass"><span class="mu sm">Cost per booked call</span><strong>' + money(f && f.cost_per_booked) + '</strong></div><div class="wf-glass"><span class="mu sm">Plan</span><strong>' + (company ? 'Full Company' : 'Core Team') + '</strong></div></div>' +
      (f ? '<section class="wf-glass"><h3>This week’s funnel</h3>' + funnel + '</section>' : '') +
      '<section class="wf-glass v49-review"><div class="row sp" style="gap:10px;flex-wrap:wrap"><div><span class="wf-eyebrow">TEAM LEADER</span><h3 style="margin:4px 0">' + (rv ? 'Review of ' + esc(workflowDate(rv.at)) : 'No review yet') + '</h3></div>' + (company ? '<button class="btn sm pri" id="pfRun">Run the review now</button>' : '<span class="chip">Full Company plan</span>') + '</div>' +
      (rv ? '<p>' + esc(rv.summary) + '</p>' + (rv.experiments && rv.experiments.length ? '<p class="mu xs" style="margin-top:12px">Today’s experiments</p><ul class="v49-exp">' + rv.experiments.map((x) => '<li><b>' + esc((d.scorecards.find((s) => s.department === x.department) || {}).name || x.department) + ':</b> ' + esc(x.task) + '</li>').join('') + '</ul>' : '') : '<p class="mu sm">' + (company ? 'The Team Leader reviews every agent each morning, writes coach rules for whoever isn’t moving the number, and sets up to two experiments.' : 'On the Core Team plan each agent still works to its performance contract. The daily Team Leader review comes with Full Company.') + '</p>') + '</section>' +
      '<div class="v49-agents">' + list.map(card).join('') + '</div>' +
      (f && f.verticals && f.verticals.length ? '<section class="wf-glass"><h3>Industries (last 30 days)</h3><p class="mu sm">The outreach autopilot sends more of each day’s hunts to the industries at the top.</p><div class="v49-ind"><table><thead><tr><th>Industry</th><th>Contacted</th><th>Replied</th><th>Booked</th><th>Score</th></tr></thead><tbody>' + f.verticals.slice(0, 10).map((v) => '<tr><td>' + esc(v.name) + '</td><td>' + esc(v.contacted) + '</td><td>' + esc(v.replied) + '</td><td>' + esc(v.won) + '</td><td>' + esc(v.rate) + '</td></tr>').join('') + '</tbody></table></div></section>' : '');
    goalStrip($('.v48-goal', el));
    const run = $('#pfRun', el); if (run) run.onclick = async () => { run.disabled = true; run.textContent = 'Reviewing the team…'; try { await team('/performance/review', { method: 'POST', body: {}, long: true }); toast('Review done', 'ok'); VIEWS.performance(el); } catch (e) { toast(e.message, 'bad'); run.disabled = false; run.textContent = 'Run the review now'; } };
    $$('.v49-agent', el).forEach((a) => {
      const dep = a.dataset.d;
      $$('[data-rm]', a).forEach((b) => b.onclick = async () => { try { await team('/performance/rule', { method: 'POST', body: { department: dep, remove: b.dataset.rm } }); VIEWS.performance(el); } catch (e) { toast(e.message, 'bad'); } });
      const add = $('[data-add]', a), inp = $('.v49-add .in', a);
      add.onclick = async () => { if (!inp.value.trim()) return; try { await team('/performance/rule', { method: 'POST', body: { department: dep, text: inp.value } }); toast('Rule added', 'ok'); VIEWS.performance(el); } catch (e) { toast(e.message, 'bad'); } };
    });
  };
