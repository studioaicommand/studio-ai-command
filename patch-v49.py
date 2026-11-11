# v49: performance system (KPIs, scorecards, coach rules, daily Team Leader review), Performance page,
# plan tiers for client copies (Core Team / Full Company), sharper lead gen (skip happy businesses, weight industries by results).
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
team, ui, css = [open(D + f).read() for f in ('v49-team.js', 'v49-ui.js', 'v49-ui.css')]
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
rep('"ai_budget_status", "outreach_daily", "growth_goal", "scout"].includes(key)', '"ai_budget_status", "outreach_daily", "growth_goal", "scout", "coach"].includes(key)')
# every agent carries its contract, scorecard and coach rules
rep('  const system = systemFor(dept, (await memoryBlock(env)) + await missionBlock(env).catch(() => ""), depth, charterOf(run.settings));',
    '  const system = systemFor(dept, (await memoryBlock(env)) + await missionBlock(env).catch(() => "") + await perfBlock(env, deptId).catch(() => ""), depth, charterOf(run.settings));')
rep('    { type: "text", text: (await missionBlock(env).catch(() => "")) || "(no weekly mission set)" }',
    '    { type: "text", text: ((await missionBlock(env).catch(() => "")) || "(no weekly mission set)") + await perfBlock(env, "chief_of_staff").catch(() => "") }')
# daily Team Leader review (Full Company plan; Studio's own Command is always Full Company)
rep('  if (instMods.outreach && !aiHold) await scoutDaily(e).catch((x) => console.error("scout:", x.message));',
    '  if (instMods.outreach && !aiHold) await scoutDaily(e).catch((x) => console.error("scout:", x.message));\n  if (!aiHold) await coachDaily(e).catch((x) => console.error("team leader:", x.message));')
rep('  if (seg[0] === "goal" || seg[0] === "scout") {', '  if (seg[0] === "performance") { const r49 = await v49Route(p, m, body, env); if (r49) return r49; }\n  if (seg[0] === "goal" || seg[0] === "scout") {')
# lead gen: don't chase businesses that already win on Google with a sound site
rep('''      await outSearch(env, c, leak, su).catch(() => null);
''', '''      await outSearch(env, c, leak, su).catch(() => null);
      if (leak.search?.position && leak.search.position <= 3 && (leak.leak_score || 0) < 35) {
        c.state = "skipped";
        job.results.skipped.push({ name: c.business_name, why: `already #${leak.search.position} on Google with a sound site (not in pain)` });
        return;
      }
''')
# plan tiers: Studio's console sets each client copy's plan; the client copy stores it
rep('''    if (seg[2] === "plan" && m === "POST") {
      const v = Number(body.plan_aud);''', '''    if (seg[2] === "plan" && m === "POST" && (body.tier === "core" || body.tier === "company")) {
      const r = await fleetCall(env, it, "plan", { method: "POST", body: JSON.stringify({ tier: body.tier }) }).catch((e) => ({ ok: false, error: e.message }));
      if (!r.ok) return J({ ok: false, error: r.error || "Couldn't reach their Command. Is it updated to v49?" }, 502);
      await secPut(env, "fleet", { items: items.map((x) => x.id === it.id ? { ...x, tier: body.tier } : x) });
      await secLog(env, { actor: "Ty", action: "fleet_tier_set", summary: `Set ${it.business}'s plan to ${body.tier === "company" ? "Full Company" : "Core Team"}` });
      return J({ ok: true, tier: body.tier });
    }
    if (seg[2] === "plan" && m === "POST") {
      const v = Number(body.plan_aud);''')
rep('plan_aud: Number(it.plan_aud) > 0 ? Number(it.plan_aud) : null, hosting_aud: FLEET_HOSTING_AUD, live:', 'plan_aud: Number(it.plan_aud) > 0 ? Number(it.plan_aud) : null, tier: (live[i].ok && live[i].tier) || it.tier || "core", hosting_aud: FLEET_HOSTING_AUD, live:')
rep('  if (p === "support-request" && request.method === "POST") {', '''  if (p === "plan" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    if (b.tier !== "core" && b.tier !== "company") return secJson({ ok: false, error: "Unknown plan." }, 400);
    await secPut(env, "plan_tier", { tier: b.tier, at: new Date().toISOString() });
    await secLog(env, { actor: "Studio Flow", action: "plan_changed", summary: `Plan set to ${b.tier === "company" ? "Full Company" : "Core Team"}` });
    return secJson({ ok: true, tier: b.tier });
  }
  if (p === "support-request" && request.method === "POST") {''')
rep('    return secJson({ ok: true, business: i.business_name, product: i.product_name, custom: i.custom, template: i.template, ...info,', '    return secJson({ ok: true, tier: ((await secGet(env, "plan_tier").catch(() => null)) || {}).tier || (i.custom ? "core" : "company"), business: i.business_name, product: i.product_name, custom: i.custom, template: i.template, ...info,')
# UI
rep('''    ["today", "Today", "home", [["today", "Today"], ["reports", "Reports"]]],''', '''    ["today", "Today", "home", [["today", "Today"], ["performance", "Performance"], ["reports", "Reports"]]],''')
rep('''    knowledge: ["Knowledge", "What your AI team knows and has learned"],''', '''    knowledge: ["Knowledge", "What your AI team knows and has learned"],
    performance: ["Performance", "Every agent judged on results: the funnel, cost per booked call and the Team Leader's review"],''')
rep('var VIEW_LABEL = { knowledge:"Knowledge",', 'var VIEW_LABEL = { performance:"Performance",knowledge:"Knowledge",')
rep("""      return '<article class="fl-card" data-id="' + esc(x.id) + '"><div class="fl-top"><div><h3>' + esc(x.business || x.host) + '</h3>""", """      return '<article class="fl-card" data-id="' + esc(x.id) + '"><div class="fl-top"><div><h3>' + esc(x.business || x.host) + ' <button class="chip v49-tier ' + (x.tier === 'company' ? 'ok' : '') + '" data-fl-tier="' + esc(x.tier || 'core') + '" title="Change plan">' + (x.tier === 'company' ? 'Full Company' : 'Core Team') + '</button></h3>""")
rep("      const pl = $('[data-fl-plan]', c);", """      const tb = $('[data-fl-tier]', c);
      if (tb) tb.onclick = async () => { const next = tb.dataset.flTier === 'company' ? 'core' : 'company'; const ok = await modal({ title: next === 'company' ? 'Move them to Full Company?' : 'Move them to Core Team?', text: next === 'company' ? 'Full Company adds the Team Leader: a daily review of every AI agent, coach rules and up to two experiments a day.' : 'Core Team keeps the eight AI department heads with their performance contracts, without the daily Team Leader review.', ok: 'Change plan' }); if (!ok) return; try { await team('/fleet/' + id + '/plan', { method: 'POST', body: { tier: next } }); toast('Plan changed', 'ok'); VIEWS.fleet(el); } catch (e) { toast(e.message, 'bad'); } };
      const pl = $('[data-fl-plan]', c);""")
assert '`' not in ui + css and '${' not in ui + css
rep('  VIEWS.brain = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('/* Phone AI (v45) */', css.replace('\\', '\\\\') + '\n/* Phone AI (v45) */')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v49 applied')
