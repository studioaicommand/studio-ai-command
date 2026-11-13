# v69: Command button audit fixes (Today crash, white-label branding, dead buttons, plan view). Built up below.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# Today: one approval with no title and no business crashed the whole workday list
rep('a.business_name.localeCompare(b.business_name));', 'String(a.business_name || "").localeCompare(String(b.business_name || "")));')
rep('else if(!p) put({kind:"approval",priority:4,action_id:a.id,business_name:a.title,', 'else if(!p) put({kind:"approval",priority:4,action_id:a.id,business_name:a.title||a.summary||"Approval",')

# White-label: a client copy with no uploaded logo showed the Studio Flow logo. Show their own name instead (wordmark + initials mark).
rep("""    if (!a?.b64) return null;
    return new Response(Uint8Array.from(atob(a.b64)""", """    if (!a?.b64) {
      if (p.endsWith("icon.png")) return null;
      const nm = String(i.business_name || "").replace(/[<>&"]/g, ""), col = /^#[0-9a-f]{6}$/i.test(i.colours?.primary || "") ? i.colours.primary : "#3ab6ff";
      const ini = nm.split(/\\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "C";
      const svg = p.includes("mark")
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 38"><rect width="38" height="38" rx="10" fill="${col}"/><text x="19" y="25" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="15" fill="#fff">${ini}</text></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 100"><rect x="0" y="22" width="56" height="56" rx="14" fill="${col}"/><text x="28" y="59" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="24" fill="#fff">${ini}</text><text x="76" y="64" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="${nm.length > 22 ? 30 : 38}" fill="#f2f6fb" letter-spacing="0.5">${nm}</text></svg>`;
      return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
    }
    return new Response(Uint8Array.from(atob(a.b64)""")
# Home: "2 other" never said what they were. Name each kind of approval waiting.
rep('const enrol = approvals.filter((a) => a.type === "campaign_enrol").length, other = approvals.length - enrol;',
    'const enrol = approvals.filter((a) => a.type === "campaign_enrol").length, other = approvals.length - enrol;\n      const kinds = (L) => { const nm = { ghl_email: "email", ghl_sms: "SMS", ghl_task: "task", ghl_note: "note", ghl_tags: "tag change", stripe_draft_invoice: "invoice", outreach_email: "outreach email", ghl_opportunity_status: "deal update", team_rule: "team rule", ghl_appointment_book: "booking", ghl_appointment_cancel: "cancellation", ghl_appointment_move: "reschedule", ghl_contact_archive: "contact archive", ghl_contact_delete: "contact delete" }; const c = {}; L.forEach((a) => { const k = nm[a.type] || "other"; c[k] = (c[k] || 0) + 1; }); return Object.keys(c).map((k) => c[k] + " " + k + (c[k] > 1 && k !== "SMS" && k !== "other" ? "s" : "")).join(" · "); };\n      const otherTxt = kinds(approvals.filter((a) => a.type !== "campaign_enrol"));')
rep('(enrol ? enrol + " outreach \\xB7 " : "") + other + " other" : "All clear";', '(enrol ? enrol + " outreach \\xB7 " : "") + otherTxt : "All clear";')
rep('if (other) rows.push(["approvals", "check", other + " other approvals", "Emails, SMS, GHL tasks and invoices", "warn"]);',
    'if (other) rows.push(["approvals", "check", other + (other === 1 ? " approval waiting" : " approvals waiting"), otherTxt, "warn"]);')
# White-label: a section whose screens are all switched off (Growth on a client copy) left a nav link that bounced to Home. Remove it.
rep("    HUBS.forEach((h) => { const keep = h[3].filter((s) => !INST_OFF.has(s[0])); if (keep.length) h[3] = keep; });",
    "    for (let hi = HUBS.length - 1; hi >= 0; hi--) { const h = HUBS[hi]; const keep = h[3].filter((s) => !INST_OFF.has(s[0])); if (keep.length) h[3] = keep; else if (hi) { HUBS.splice(hi, 1); const ti = TABS.findIndex((t) => t[0] === h[0]); if (ti >= 0) TABS.splice(ti, 1); document.querySelectorAll('[data-nav=\"' + h[0] + '\"],[data-tab=\"' + h[0] + '\"]').forEach((x) => x.remove()); } }")
# White-label: buttons, headline and the orb were still Studio blue. Paint them in the client's brand colours.
rep("    if (b.colours && b.colours.accent) r.setProperty('--c2', b.colours.accent);\n",
    "    if (b.colours && b.colours.accent) r.setProperty('--c2', b.colours.accent);\n    if (b.colours && b.colours.primary && !document.getElementById('instBrandCss')) { const hx = b.colours.primary.slice(1); const R = parseInt(hx.slice(0, 2), 16) / 255, G = parseInt(hx.slice(2, 4), 16) / 255, B = parseInt(hx.slice(4, 6), 16) / 255; const mx = Math.max(R, G, B), mn = Math.min(R, G, B), dd = mx - mn; let hu = 0; if (dd) hu = mx === R ? ((G - B) / dd) % 6 : mx === G ? (B - R) / dd + 2 : (R - G) / dd + 4; hu = Math.round(hu * 60 + 360) % 360; const sat = mx ? dd / mx : 0; const st = document.createElement('style'); st.id = 'instBrandCss'; st.textContent = '.btn.pri{background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 62%,#000));box-shadow:0 8px 24px color-mix(in srgb,var(--c) 30%,transparent)}.hero h1 b{background:linear-gradient(90deg,var(--c2),var(--c) 80%);-webkit-background-clip:text;background-clip:text;color:transparent}.orb-slot{filter:hue-rotate(' + (hu - 200) + 'deg) saturate(' + Math.max(0.35, Math.min(1, sat * 1.6)).toFixed(2) + ')}'; document.head.append(st); }\n")
# Team › AI team jobs: a developer warning ("Immediate job runner is not connected") showed to everyone. Plain words, only when something is queued.
rep("""(!d.queue_binding_present?'<p class="wf-warning">Immediate job runner is not connected. Queued jobs wait for the existing scheduled recovery run.</p>':'')+""",
    """(!d.queue_binding_present&&d.jobs.some(j=>j.status==='queued')?'<p class="mu sm">Queued jobs start on the next scheduled run, usually within a few minutes.</p>':'')+""")
# A dialog left open stayed on screen after moving to another page (Back button, nav link) and blocked every button under it. Close it on navigation.
rep('      const done = (v) => { m.remove(); document.removeEventListener("keydown", onKey); resolve(v); };\n      const onKey = (e) => { if (e.key === "Escape") done(null); };\n      document.addEventListener("keydown", onKey);',
    '      const done = (v) => { m.remove(); document.removeEventListener("keydown", onKey); removeEventListener("hashchange", onHash); resolve(v); };\n      const onKey = (e) => { if (e.key === "Escape") done(null); };\n      const onHash = () => done(null);\n      document.addEventListener("keydown", onKey); addEventListener("hashchange", onHash);')
# Performance › coach rules: "Add" with an empty box did nothing. Now it points you to the box.
rep("      add.onclick = async () => { if (!inp.value.trim()) return;",
    "      add.onclick = async () => { if (!inp.value.trim()) { inp.focus(); inp.placeholder = 'Type the rule first, e.g. Reply to new enquiries within 5 minutes'; inp.classList.add('need'); return; }")
rep(".v49-tier{margin-left:8px;cursor:pointer;vertical-align:middle;font-size:11px}", ".v49-tier{margin-left:8px;cursor:pointer;vertical-align:middle;font-size:11px}\n.in.need{border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.18)}")
# Client copies: Home asked for call lists and campaign data that are switched off (two failed requests on every load).
rep("    Promise.allSettled([D.summary(), D.pending(), D.calls(), D.campaign()]).then(([s, p, c, cp]) => {",
    "    Promise.allSettled([D.summary(), D.pending(), INST_OFF.has('growth') ? Promise.resolve([]) : D.calls(), INST_OFF.has('growth') ? Promise.resolve(null) : D.campaign()]).then(([s, p, c, cp]) => {")
# Team: the client could not see what their plan gives them. Show Core Team (8 agents) vs Full Company (44 agents) where they meet their team,
# and on Full Company list each head's specialists on its card.
rep("  VIEWS.knowledge = async (el) => {\n", """  const TEAM69 = VIEWS.team;
  VIEWS.team = async (el) => {
    await TEAM69(el);
    if (el.dataset.embed || (ROUTE.arg && BY[ROUTE.arg]) || !still('team', el)) return;
    let d; try { d = await team('/performance'); } catch (e) { return; }
    if (!still('team', el) || $('.v69-plan', el)) return;
    const n = (d.scorecards || []).length || 8, sp = d.specialists, all = n + (d.spec_count || 0);
    const box = document.createElement('section'); box.className = 'wf-glass v69-plan';
    box.innerHTML = sp
      ? '<div class="row sp" style="gap:10px;flex-wrap:wrap"><div><span class="wf-eyebrow">FULL COMPANY · ' + all + ' AI AGENTS</span><h3 style="margin:4px 0">' + n + ' department heads leading ' + esc(d.spec_count) + ' specialists</h3></div><span class="chip ok">Full Company</span></div><p class="mu sm">Ask any head and they hand the focused work to their specialists. The Team Leader reviews every agent each day and runs small experiments to improve results.</p>'
      : '<div class="row sp" style="gap:10px;flex-wrap:wrap"><div><span class="wf-eyebrow">CORE TEAM · ' + n + ' AI AGENTS</span><h3 style="margin:4px 0">' + n + ' department heads working for you</h3></div><span class="chip">Core Team</span></div><p class="mu sm">Each head handles its whole department directly. On Full Company, every head leads its own specialists (' + esc(d.spec_count) + ' more agents, ' + all + ' in total) and the Team Leader reviews the team every day. Ask us if you would like to upgrade.</p>';
    el.prepend(box);
    if (!sp) return;
    const addSp = () => $$('#tGrid .dept', el).forEach((a) => { if ($('.v69-sp', a)) return; const id = (a.getAttribute('href') || '').split('/').pop(); const L = sp[id] || []; if (!L.length) return; const s = document.createElement('span'); s.className = 'v69-sp'; s.textContent = L.length + ' specialists: ' + L.map((x) => x.name).join(' · '); ($('.grow', a) || a).append(s); });
    addSp(); const g = $('#tGrid', el); if (g) new MutationObserver(addSp).observe(g, { childList: true });
  };
  VIEWS.knowledge = async (el) => {
""")
rep(".in.need{border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.18)}", ".in.need{border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.18)}\n.v69-plan{margin-bottom:16px}.v69-sp{display:block;margin-top:8px;font-size:11.5px;line-height:1.5;color:var(--mu)}")
# Copy buttons failed silently when the browser blocked the clipboard. Say so.
rep('$("[data-copy]", b).onclick = () => { navigator.clipboard.writeText(report.body).then(() => toast("Copied", "ok")); };',
    '$("[data-copy]", b).onclick = () => { navigator.clipboard.writeText(report.body).then(() => toast("Copied", "ok"), () => toast("Your browser blocked copying. Select the text and copy it.", "bad")); };')
rep('$("#cpy", el).onclick = () => navigator.clipboard.writeText(d.embed).then(() => toast("Embed code copied", "ok"));',
    '$("#cpy", el).onclick = () => navigator.clipboard.writeText(d.embed).then(() => toast("Embed code copied", "ok"), () => toast("Your browser blocked copying. Select the code and copy it.", "bad"));')
# Client copies: Studio's own Instagram handle showed in a team tagline, and Performance showed Studio's outreach funnel. Swap / hide.
rep("    const re = /Studio|\\\\bTy\\\\b/;", "    const re = /Studio|studioflow|\\\\bTy\\\\b/i;")
rep("n.nodeValue = t.replace(/Studio AI Command/g, INST.product_name)", "n.nodeValue = t.replace(/@?studioflowandsystems/gi, INST.business_name).replace(/Studio AI Command/g, INST.product_name)")
rep("(f ? '<section class=\"wf-glass\"><h3>This week’s funnel</h3>' + funnel + '</section>' : '')", "(f && !INST_OFF.has('growth') ? '<section class=\"wf-glass\"><h3>This week’s funnel</h3>' + funnel + '</section>' : '')")
rep("(f && f.verticals && f.verticals.length ? ", "(f && !INST_OFF.has('growth') && f.verticals && f.verticals.length ? ")
#@@MORE@@
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v69 applied')
