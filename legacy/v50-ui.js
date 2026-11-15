  // v50 the AI company roster on Performance (Full Company plan)
  const PF50 = VIEWS.performance;
  VIEWS.performance = async (el) => {
    await PF50(el);
    if (!still('performance', el)) return;
    let d; try { d = await team('/performance'); } catch (e) { return; }
    if (!still('performance', el)) return;
    const box = document.createElement('section'); box.className = 'wf-glass v50-roster';
    const heads = d.scorecards.map((x) => [x.department, x.name]);
    if (d.specialists) {
      box.innerHTML = '<div class="row sp" style="gap:10px;flex-wrap:wrap"><div><span class="wf-eyebrow">YOUR AI COMPANY</span><h3 style="margin:4px 0">' + esc(heads.length) + ' department heads · ' + esc(d.spec_count) + ' specialists · ' + esc(heads.length + d.spec_count) + ' agents</h3></div><span class="chip ok">Full Company</span></div><p class="mu sm">Each head hands focused work to its specialists and reports back. Specialists use the same tools and rules, so anything client-facing still comes to you for approval.</p><div class="v50-grid">' +
        heads.map((h) => '<div class="v50-team"><b>' + esc(h[1]) + '</b><ul>' + (d.specialists[h[0]] || []).map((s) => '<li title="' + esc(s.focus) + '">' + esc(s.name) + '</li>').join('') + '</ul></div>').join('') + '</div>';
    } else {
      box.innerHTML = '<span class="wf-eyebrow">YOUR AI COMPANY</span><h3 style="margin:4px 0">' + esc(heads.length) + ' department heads</h3><p class="mu sm">On Full Company, each head leads its own specialists: ' + esc(d.spec_count) + ' more agents, such as a Proposal Writer, Follow-up Chaser, No-show Rebooker, Case Study Writer and Invoice Chaser, plus the daily Team Leader review.</p>';
    }
    const agents = $('.v49-agents', el);
    if (agents) agents.before(box); else el.append(box);
  };
