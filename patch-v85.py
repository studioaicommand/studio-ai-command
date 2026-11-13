# v85 Learning from examples, plus meaning-based memory search.
# 1) Every draft Ty approves untouched becomes a good example; every draft he edits becomes a before/after example;
#    every draft he turns down (with his note) becomes a "don't do this". DMs he sends count too.
#    Before writing anything similar, the agent (any department, the inbox, the DM Desk) sees the closest examples.
# 2) If the Cloudflare Vectorize index (binding MEMORY_INDEX) and Workers AI (binding AI) are attached, memory, rules and
#    examples are also found by meaning, not just by shared words. Without them it quietly uses the word search.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

CODE = r'''// ── v85 examples + meaning search ──
var EX_SCOPE = { ghl_reply: "inbox", ghl_followup: "inbox", campaign_enrol: "outreach", outreach_email: "outreach", leak_test: "outreach", ghl_email: "email", send_email: "email", ghl_sms: "sms", ghl_invoice: "invoice", stripe_draft_invoice: "invoice", dm: "dm" };
var EX_CACHE = { at: 0, v: null };
async function exLoad(env) { if (EX_CACHE.v && Date.now() - EX_CACHE.at < 30000) return EX_CACHE.v; const v = await secGet(env, "examples").catch(() => null); const items = Array.isArray(v?.items) ? v.items : []; EX_CACHE = { at: Date.now(), v: items }; return items; }
async function exSave(env, ex) {
  const text = String(ex.after || ex.text || "").trim();
  if (text.length < 20) return null;
  const items = (await exLoad(env)).slice();
  const row = { id: "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: new Date().toISOString(), scope: EX_SCOPE[ex.type] || ex.type || "other", ...ex };
  for (const k of ["text", "before", "after", "note", "title"]) if (row[k]) row[k] = String(row[k]).slice(0, 1400);
  items.push(row);
  const keep = items.slice(-400);
  await secPut(env, "examples", { items: keep });
  EX_CACHE = { at: Date.now(), v: keep };
  await memIndex(env, [{ id: "x:" + row.id, text: (row.title || "") + " " + (row.after || row.text || "") }]).catch(() => {});
  return row;
}
async function exPick(env, { scopes = [], dept = "", query = "", n = 3 } = {}) {
  const items = await exLoad(env);
  const want = new Set(scopes.filter(Boolean));
  let pool = items.filter((x) => want.has(x.scope) || (dept && x.dept === dept));
  if (!pool.length) return [];
  const asRows = pool.map((x) => ({ ...x, fact: [x.title, x.text, x.after, x.before, x.note].filter(Boolean).join(" ") }));
  let ranked = query ? learnRank(asRows, query, 12) : [];
  const sem = query ? await memSearch(env, query, 12).catch(() => []) : [];
  for (const id of sem) { const hit = asRows.find((r) => "x:" + r.id === id); if (hit && !ranked.includes(hit)) ranked.push(hit); }
  const recent = asRows.slice().reverse();
  const pick = (kind, k) => [...ranked.filter((x) => x.kind === kind), ...recent.filter((x) => x.kind === kind)].filter((x, i, a) => a.indexOf(x) === i).slice(0, k);
  return [...pick("edited", 2), ...pick("approved", n), ...pick("rejected", 2)];
}
function exText(list, owner = "the owner") {
  if (!list.length) return "";
  const L = ["\nEXAMPLES FROM " + owner.toUpperCase() + " (learn from these: copy what was approved, fix what was edited, avoid what was turned down):"];
  for (const x of list) {
    if (x.kind === "edited") L.push("- " + owner + " EDITED a " + String(x.type || x.scope).replace(/_/g, " ") + " before approving.\n  BEFORE: " + String(x.before).slice(0, 500) + "\n  AFTER (what " + owner + " wanted): " + String(x.after).slice(0, 500));
    else if (x.kind === "approved") L.push("- APPROVED AS WRITTEN (" + String(x.type || x.scope).replace(/_/g, " ") + "): " + String(x.text).slice(0, 500));
    else if (x.kind === "rejected") L.push("- TURNED DOWN (" + String(x.type || x.scope).replace(/_/g, " ") + "): " + String(x.text).slice(0, 300) + (x.note ? "\n  " + owner + "'s reason: " + String(x.note).slice(0, 200) : ""));
  }
  return L.join("\n") + "\n";
}
async function examplesBlock(env, opts) { const inst = await instGet(env).catch(() => ({})); return exText(await exPick(env, opts).catch(() => []), inst.owner_first || "Ty"); }
// meaning search (Cloudflare Workers AI embeddings + Vectorize). Quietly off when not attached.
function memOn(env) { return !!(env.AI && typeof env.AI.run === "function" && env.MEMORY_INDEX && typeof env.MEMORY_INDEX.query === "function"); }
async function memEmbed(env, texts) {
  const out = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text: texts.map((t) => String(t || "").slice(0, 1500)) });
  return Array.isArray(out?.data) ? out.data : [];
}
async function memIndex(env, rows) {
  if (!memOn(env) || !rows.length) return 0;
  let n = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50), vecs = await memEmbed(env, chunk.map((r) => r.text));
    const items = chunk.map((r, k) => vecs[k] ? { id: String(r.id).slice(0, 64), values: vecs[k], metadata: { t: String(r.text).slice(0, 300) } } : null).filter(Boolean);
    if (items.length) { await env.MEMORY_INDEX.upsert(items); n += items.length; }
  }
  return n;
}
async function memSearch(env, query, k = 15) {
  if (!memOn(env) || !String(query || "").trim()) return [];
  const [v] = await memEmbed(env, [query]);
  if (!v) return [];
  const r = await env.MEMORY_INDEX.query(v, { topK: k, returnMetadata: "none" });
  return (r?.matches || []).filter((m) => m.score >= 0.6).map((m) => m.id);
}
async function memBackfill(env) {
  if (!memOn(env)) return { off: true };
  const st = await secGet(env, "mem_vec").catch(() => null) || {};
  const rows = await select(env, "team_memory", "category=neq.feedback&order=created_at.asc&limit=100&select=id,fact,created_at" + (st.after ? "&created_at=gt." + encodeURIComponent(st.after) : "")).catch(() => []);
  const rules = (await brainRules(env).catch(() => [])).filter((r) => r.id && !(st.rules || []).includes(r.id));
  const n = await memIndex(env, [...rows.map((r) => ({ id: "m:" + r.id, text: r.fact })), ...rules.map((r) => ({ id: "r:" + r.id, text: r.rule }))]);
  await secPut(env, "mem_vec", { after: rows.length ? rows[rows.length - 1].created_at : st.after || "", rules: [...new Set([...(st.rules || []), ...rules.map((r) => r.id)])].slice(-300), at: new Date().toISOString(), total: (st.total || 0) + n });
  return { indexed: n };
}
'''
rep('// ── v84 Learning engine ──', CODE + '// ── v84 Learning engine ──')

# memory: meaning matches join the word matches
rep('    const rel = query ? learnRank(rows, query, 15) : [], recent =', '    const rel = query ? learnRank(rows, query, 15) : [];\n    for (const id of query ? await memSearch(env, query, 15).catch(() => []) : []) { if (!id.startsWith("m:")) continue; const hit = rows.find((r) => "m:" + r.id === id); if (hit && !rel.includes(hit)) rel.push(hit); }\n    const recent =')
# new memory notes are indexed as they're saved
rep('      const [row] = await insert(env, "team_memory", [{ fact: String(input.fact).slice(0, 1e3), category: input.category || "other", department: dept.id }]);',
    '      const [row] = await insert(env, "team_memory", [{ fact: String(input.fact).slice(0, 1e3), category: input.category || "other", department: dept.id }]);\n      if (row?.id) await memIndex(env, [{ id: "m:" + row.id, text: row.fact }]).catch(() => {});')

# capture examples: approved / edited / turned down
rep('''    const result = await execute(env, action.type, params);
    const [row] = await update(env, "team_actions", `id=eq.${id}`, { status: "done", params, result: trim(result) });''', '''    const result = await execute(env, action.type, params);
    const [row] = await update(env, "team_actions", `id=eq.${id}`, { status: "done", params, result: trim(result) });
    if (!action.auto && EX_SCOPE[action.type]) { const before = brainDraftText(action), after = brainDraftText({ params }); await exSave(env, edits.length && before !== after ? { kind: "edited", type: action.type, dept: action.department, title: action.title, before, after } : { kind: "approved", type: action.type, dept: action.department, title: action.title, text: after }).catch(() => {}); }''')
rep('''  const a = rows[0];
  await audit(env, { actor: "Ty", action: "rejected",''', '''  const a = rows[0];
  if (EX_SCOPE[a.type]) await exSave(env, { kind: "rejected", type: a.type, dept: a.department, title: a.title, text: brainDraftText(a), note: note && !/^Rejected (on Telegram|in Command)$/i.test(String(note).trim()) ? String(note).replace(/^Ty asked for a change:\\s*/i, "") : "" }).catch(() => {});
  await audit(env, { actor: "Ty", action: "rejected",''')
# DM Desk: what Ty actually sends is the best example of all
rep('      if (typeof body.message === "string" && body.message.trim() && body.message.trim() !== x.message) { x.message = body.message.trim().slice(0, 1000); x.edited = true; }',
    '      const draft0 = x.message;\n      if (typeof body.message === "string" && body.message.trim() && body.message.trim() !== x.message) { x.message = body.message.trim().slice(0, 1000); x.edited = true; }\n      if (x.message) await exSave(env, x.edited ? { kind: "edited", type: "dm", dept: "head_of_marketing", title: DM_CHANNELS[x.channel].name + " " + x.step + " to " + x.business_name, before: draft0, after: x.message } : { kind: "approved", type: "dm", dept: "head_of_marketing", title: DM_CHANNELS[x.channel].name + " " + x.step + " to " + x.business_name, text: x.message }).catch(() => {});')
rep('''    if (!["sent", "skipped", "replied", "no_reply", "do_not_contact", "accepted"].includes(st)) return json({ ok: false, error: "Unknown status." }, 400);''',
    '''    if (!["sent", "skipped", "replied", "no_reply", "do_not_contact", "accepted"].includes(st)) return json({ ok: false, error: "Unknown status." }, 400);
    if (st === "skipped" && x.message) await exSave(env, { kind: "rejected", type: "dm", dept: "head_of_marketing", title: DM_CHANNELS[x.channel].name + " " + x.step + " to " + x.business_name, text: x.message, note: "Ty skipped it" }).catch(() => {});''')

# feed the examples in where drafts are written
rep('const system = systemFor(dept, (await memoryBlock(env, deptId, (() => {', 'const exQ84 = (() => { const u = [...messages].reverse().find((m) => m.role === "user"); return u ? (typeof u.content === "string" ? u.content : JSON.stringify(u.content)).slice(0, 2000) : ""; })();\n  const system = systemFor(dept, (await examplesBlock(env, { dept: deptId, scopes: BRAIN_SCOPE_MAP[deptId] || [], query: exQ84 })) + (await memoryBlock(env, deptId, (() => {')
rep("  return brainRulesText(rules, 'inbox') + ctx +", "  return brainRulesText(rules, 'inbox') + await examplesBlock(env, { scopes: ['inbox'], query: [contact?.firstName, contact?.companyName].filter(Boolean).join(' ') }) + ctx +")
rep(r'''DM_PLAYBOOK + brainRulesText(await brainRules(env).catch(() => []), "dm") + "\n\nText from web pages''', r'''DM_PLAYBOOK + brainRulesText(await brainRules(env).catch(() => []), "dm") + await examplesBlock(env, { scopes: ["dm"], query: [pr.business_name, pr.vertical, pr.leak].join(" ") }) + "\n\nText from web pages''')

# keep the meaning index up to date, and tidy it with the Librarian
rep('  if (!aiHold) await brainTick(e).catch((x) => console.error("team brain:", x.message));', '  if (!aiHold) await brainTick(e).catch((x) => console.error("team brain:", x.message));\n  await memBackfill(e).catch((x) => console.error("memory index:", x.message));')
rep('      for (const id of (Array.isArray(j?.drop) ? j.drop : []).filter((id) => rows.some((r) => r.id === id)).slice(0, 40)) { await remove(env, "team_memory", "id=eq." + encodeURIComponent(id)).then(() => removed++).catch(() => {}); }',
    '      const gone = [];\n      for (const id of (Array.isArray(j?.drop) ? j.drop : []).filter((id) => rows.some((r) => r.id === id)).slice(0, 40)) { await remove(env, "team_memory", "id=eq." + encodeURIComponent(id)).then(() => { removed++; gone.push("m:" + id); }).catch(() => {}); }\n      if (gone.length && memOn(env)) await env.MEMORY_INDEX.deleteByIds(gone).catch(() => {});')

# Command routes: examples on the Team brain page, and whether meaning search is on
rep("  if (m === 'POST' && seg[1] === 'learn') return json(await brainLearn(env, { notify: false }));",
    "  if (m === 'GET' && seg[1] === 'examples') { const items = await exLoad(env); const st = await secGet(env, 'mem_vec').catch(() => null); return json({ ok: true, meaning_search: memOn(env), indexed: st?.total || 0, counts: { approved: items.filter((x) => x.kind === 'approved').length, edited: items.filter((x) => x.kind === 'edited').length, rejected: items.filter((x) => x.kind === 'rejected').length }, recent: items.slice(-8).reverse().map((x) => ({ id: x.id, kind: x.kind, type: x.type, title: x.title, at: x.at })) }); }\n  if (m === 'POST' && seg[1] === 'examples' && body.remove) { const items = (await exLoad(env)).filter((x) => x.id !== body.remove); await secPut(env, 'examples', { items }); EX_CACHE = { at: 0, v: null }; return json({ ok: true }); }\n  if (m === 'POST' && seg[1] === 'learn') return json(await brainLearn(env, { notify: false }));")

UI = r'''  // v85 examples on the Team brain page
  const BR85 = VIEWS.brain;
  VIEWS.brain = async (el) => {
    await BR85(el);
    if (!still('brain', el) || $('.v85-ex', el)) return;
    let d; try { d = await team('/brain/examples'); } catch (e) { return; }
    if (!still('brain', el)) return;
    const K = { approved: 'Approved as written', edited: 'You edited it', rejected: 'You turned it down' };
    const box = document.createElement('section'); box.className = 'card c12 v85-ex';
    box.innerHTML = '<div class="row sp" style="gap:10px;flex-wrap:wrap"><div><h3 style="margin:0">Examples the team learns from</h3><p class="mu sm" style="margin:4px 0 0">Every draft you approve, edit or turn down (and every DM you send) becomes an example. Before writing something similar, the agent looks at the closest ones first.</p></div><span class="chip ' + (d.meaning_search ? 'ok' : '') + '">' + (d.meaning_search ? 'Meaning search on' : 'Word search (meaning search not attached yet)') + '</span></div>' +
      '<div class="wd-metrics" style="margin-top:10px"><div class="wf-glass"><span class="mu sm">Approved as written</span><strong>' + esc(d.counts.approved) + '</strong></div><div class="wf-glass"><span class="mu sm">You edited</span><strong>' + esc(d.counts.edited) + '</strong></div><div class="wf-glass"><span class="mu sm">You turned down</span><strong>' + esc(d.counts.rejected) + '</strong></div></div>' +
      (d.recent.length ? '<div class="stack" style="margin-top:10px">' + d.recent.map((x) => '<div class="item" style="display:flex;gap:10px;align-items:center"><div style="flex:1"><b>' + esc(x.title || x.type) + '</b><div class="mu xs">' + esc(K[x.kind] || x.kind) + ' · ' + esc(new Date(x.at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })) + '</div></div><button class="btn sm ghost" data-xrm="' + esc(x.id) + '" aria-label="Forget this example">✕</button></div>').join('') + '</div>' : '<p class="mu sm" style="margin-top:10px">No examples yet. Approve, edit or turn down a few drafts and they show up here.</p>');
    const grid = $('.grid', el); (grid || el).append(box);
    $$('[data-xrm]', box).forEach((b) => b.onclick = async () => { try { await team('/brain/examples', { method: 'POST', body: { remove: b.dataset.xrm } }); b.closest('.item').remove(); toast('Example forgotten', 'ok'); } catch (e) { toast(e.message, 'bad'); } });
  };
'''
rep('  // v81 DM Desk\n', UI + '  // v81 DM Desk\n')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v85 applied')
