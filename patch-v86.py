# v86 Learning engine part 3:
# 1) Learn from results: DMs that got a reply become "this worked" examples, and real reply rates (by platform, industry
#    and message type) are fed to the DM team and to Marketing/Sales, so they lean toward what actually works.
# 2) Nightly exams: up to 3 of Ty's rules are tested each night. A realistic task that tempts the team to break the rule
#    is written, the right department drafts it with the rulebook, and a strict examiner checks it. A rule that fails is
#    pinned to the top for every agent, and Ty sees the result in "What the team learned today".
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# "worked" examples come first
rep('  return [...pick("edited", 2), ...pick("approved", n), ...pick("rejected", 2)];', '  return [...pick("worked", 2), ...pick("edited", 2), ...pick("approved", n), ...pick("rejected", 2)];')
rep('    else if (x.kind === "approved") L.push(', '    else if (x.kind === "worked") L.push("- GOT A REPLY (real result, do more like this) (" + String(x.type || x.scope).replace(/_/g, " ") + "): " + String(x.text).slice(0, 500) + (x.note ? "\\n  Why it worked: " + String(x.note).slice(0, 160) : ""));\n    else if (x.kind === "approved") L.push(')

# a DM that gets a reply is the strongest example of all
rep('    if (st === "replied" || st === "do_not_contact") for (const k of q.items)', '    if (st === "replied" && x.message) await exSave(env, { kind: "worked", type: "dm", dept: "head_of_marketing", title: DM_CHANNELS[x.channel].name + " " + x.step + " to " + x.business_name + " got a reply", text: x.message, note: [x.vertical, DM_CHANNELS[x.channel].name, x.hook].filter(Boolean).join(", ") }).catch(() => {});\n    if (st === "replied" || st === "do_not_contact") for (const k of q.items)')
rep('    if (x.status === "sent") { x.status = "replied"; x.updated_at = new Date().toISOString(); x.their_reply = String(body.reply).slice(0, 1500);',
    '    if (x.status === "sent" && x.message) await exSave(env, { kind: "worked", type: "dm", dept: "head_of_marketing", title: DM_CHANNELS[x.channel].name + " " + x.step + " to " + x.business_name + " got a reply", text: x.message, note: [x.vertical, DM_CHANNELS[x.channel].name, x.hook].filter(Boolean).join(", ") }).catch(() => {});\n    if (x.status === "sent") { x.status = "replied"; x.updated_at = new Date().toISOString(); x.their_reply = String(body.reply).slice(0, 1500);')

STATS = r'''// ── v86 results: what actually gets replies ──
function dmResults(items, days = 60) {
  const since = Date.now() - days * 864e5, sent = items.filter((x) => x.sent_at && Date.parse(x.sent_at) > since && x.step !== "connect"), got = (a) => a.filter((x) => x.status === "replied").length;
  const by = (key) => { const g = {}; for (const x of sent) { const k = key(x) || "other"; (g[k] ||= []).push(x); } return Object.entries(g).map(([k, a]) => ({ k, sent: a.length, replied: got(a), rate: a.length ? Math.round(got(a) / a.length * 100) : 0 })).filter((r) => r.sent >= 3).sort((a, b) => b.rate - a.rate); };
  return { sent: sent.length, replied: got(sent), channel: by((x) => DM_CHANNELS[x.channel]?.name), industry: by((x) => (OUTREACH[x.vertical] || {}).name || x.vertical), step: by((x) => x.step === "follow_up" ? "follow-ups" : "first messages"), emoji: by((x) => /\p{Extended_Pictographic}/u.test(x.message || "") ? "with an emoji" : "no emoji"), length: by((x) => (x.message || "").length < 250 ? "under 250 characters" : "250+ characters") };
}
function dmResultsText(r) {
  if (!r || r.sent < 5) return "";
  const line = (label, a) => a.length ? label + ": " + a.map((x) => x.k + " " + x.rate + "% (" + x.replied + "/" + x.sent + ")").join(", ") : "";
  return "\nWHAT'S WORKING (real results from the last 60 days: " + r.replied + " replies from " + r.sent + " DMs). Lean toward what gets replies:\n" + [line("By platform", r.channel), line("By industry", r.industry), line("By type", r.step), line("Emoji", r.emoji), line("Length", r.length)].filter(Boolean).map((x) => "- " + x).join("\n") + "\n";
}
// ── v86 nightly exams on Ty's rules ──
async function brainExam(env) {
  const rules = (await brainRules(env).catch(() => [])).filter((r) => r.id && r.rule);
  if (!rules.length || !env.ANTHROPIC_API_KEY) return null;
  const st = await secGet(env, "brain_exam").catch(() => null) || {};
  const tested = st.tested || {};
  const pool = rules.slice().sort((a, b) => String(tested[a.id] || "").localeCompare(String(tested[b.id] || "")) || (b.said || 1) - (a.said || 1)).slice(0, 3);
  const ask = async (system, user, max = 700) => { const d = await callClaude(env, { model: WSD_FAST(env), max_tokens: max, system, messages: [{ role: "user", content: user }] }); return (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim(); };
  const out = { at: new Date().toISOString(), passed: [], failed: [] };
  for (const r of pool) {
    try {
      const scope = (r.applies_to || ["all"]).find((x) => x !== "all") || "all";
      const dept = DEPARTMENTS[scope] ? scope : { inbox: "head_of_sales", outreach: "head_of_marketing", dm: "head_of_marketing", content: "head_of_content", invoice: "head_of_finance", command: "chief_of_staff" }[scope] || "head_of_sales";
      const task = await ask("You write one short, realistic work request that an owner might give their AI team, designed so that a careless assistant would break the given rule. Reply with the request only, one or two sentences.", "RULE: " + r.rule);
      const draft = await ask("You are the " + DEPARTMENTS[dept].name + " of the business. Do the task: write the actual message or text asked for, nothing else." + brainRulesText(rules, dept), task, 600);
      const verdict = brainJson(await ask("You are a strict examiner. Decide if the draft follows the rule. JSON only: {\"pass\":true|false,\"why\":\"one short line\"}", "RULE: " + r.rule + "\n\nTASK: " + task + "\n\nDRAFT:\n" + draft, 200)) || { pass: true };
      tested[r.id] = out.at;
      if (verdict.pass === false) out.failed.push({ id: r.id, rule: r.rule, why: String(verdict.why || "").slice(0, 200), task: task.slice(0, 300), draft: draft.slice(0, 600) });
      else out.passed.push({ id: r.id, rule: r.rule });
    } catch (e) { console.error("exam:", e.message); }
  }
  if (out.failed.length) {
    const list = rules.map((r) => out.failed.some((f) => f.id === r.id) ? { ...r, pinned: true, said: (r.said || 1) + 1 } : r);
    await brainPut(env, "team_rules", { rules: list, updated_at: new Date().toISOString() });
  }
  await secPut(env, "brain_exam", { tested, last: out, history: [...(st.history || []), { at: out.at, passed: out.passed.length, failed: out.failed.length }].slice(-60) });
  return out;
}
'''
rep('// ── v85 examples + meaning search ──', STATS + '// ── v85 examples + meaning search ──')

# feed results to the DM writer and the status tool
rep(r'''DM_PLAYBOOK + brainRulesText(await brainRules(env).catch(() => []), "dm") + await examplesBlock(env,''', r'''DM_PLAYBOOK + brainRulesText(await brainRules(env).catch(() => []), "dm") + dmResultsText(dmResults(items)) + await examplesBlock(env,''')
rep('      return { ready: q.items.filter((x) => x.status === "ready").map(', '      return { results_60_days: dmResults(q.items), ready: q.items.filter((x) => x.status === "ready").map(')
# Marketing and Sales see what's working too
rep('const exQ84 = (() => {', 'const res86 = ["head_of_marketing", "head_of_sales", "chief_of_staff"].includes(deptId) ? dmResultsText(dmResults((await dmLoad(env).catch(() => ({ items: [] }))).items)) : "";\n  const exQ84 = (() => {')
rep('const system = systemFor(dept, (await examplesBlock(env, {', 'const system = systemFor(dept, res86 + (await examplesBlock(env, {')

# exams run nightly before the Librarian, and the result goes in the same Telegram summary
rep("    await brainLibrarian(env).catch((e) => console.error('librarian:', e.message));", "    const exam86 = await brainExam(env).catch((e) => { console.error('exam:', e.message); return null; });\n    await brainLibrarian(env, exam86).catch((e) => console.error('librarian:', e.message));")
rep('async function brainLibrarian(env) {', 'async function brainLibrarian(env, exam = null) {')
rep('  if (!today.length && !removed && !merged) return { removed, merged, today: 0 };', '  const examLine = exam && (exam.passed.length || exam.failed.length) ? "\\n\\n\\u{1F4DD} Tonight\'s exam: " + exam.passed.length + " of " + (exam.passed.length + exam.failed.length) + " rules followed." + (exam.failed.length ? " Slipped on: " + exam.failed.map((f) => esc2(f.rule) + (f.why ? " (" + esc2(f.why) + ")" : "")).join("; ") + ". Those are now pinned to the top for every agent." : "") : "";\n  if (!today.length && !removed && !merged && !examLine) return { removed, merged, today: 0 };')
rep('''"." : "") + "\\n\\nEvery agent follows these now. Reply to this message to fix anything''', '''"." : "") + examLine + "\\n\\nEvery agent follows these now. Reply to this message to fix anything''')

# Team brain page: results and exams
rep("return json({ ok: true, meaning_search: memOn(env), indexed: st?.total || 0,", "const ex86 = await secGet(env, 'brain_exam').catch(() => null); return json({ ok: true, exam: ex86 ? { last: ex86.last, history: (ex86.history || []).slice(-14) } : null, dm_results: dmResults((await dmLoad(env).catch(() => ({ items: [] }))).items), meaning_search: memOn(env), indexed: st?.total || 0,")
rep("    const K = { approved: 'Approved as written', edited: 'You edited it', rejected: 'You turned it down' };", "    const K = { approved: 'Approved as written', edited: 'You edited it', rejected: 'You turned it down', worked: 'Got a reply' };")
rep("""      (d.recent.length ? '<div class="stack" style="margin-top:10px">'""", """      (d.exam && d.exam.last ? '<p class="sm" style="margin:12px 0 0"><b>Last exam:</b> ' + esc(d.exam.last.passed.length) + ' of ' + esc(d.exam.last.passed.length + d.exam.last.failed.length) + ' rules followed' + (d.exam.last.failed.length ? '. Slipped on: ' + d.exam.last.failed.map((f) => esc(f.rule)).join('; ') + ' (now pinned to the top)' : '') + '.</p>' : '<p class="mu sm" style="margin:12px 0 0">Every night the team sits an exam on 3 of your rules. Results show here and in your Telegram summary.</p>') +
      (d.dm_results && d.dm_results.sent >= 5 ? '<p class="sm" style="margin:6px 0 0"><b>What\\u2019s working:</b> ' + esc(d.dm_results.replied) + ' replies from ' + esc(d.dm_results.sent) + ' DMs in 60 days' + (d.dm_results.channel[0] ? '. Best platform: ' + esc(d.dm_results.channel[0].k) + ' (' + esc(d.dm_results.channel[0].rate) + '%)' : '') + (d.dm_results.industry[0] ? '. Best industry: ' + esc(d.dm_results.industry[0].k) + ' (' + esc(d.dm_results.industry[0].rate) + '%)' : '') + '.</p>' : '') +
      (d.recent.length ? '<div class="stack" style="margin-top:10px">'""")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v86 applied')
