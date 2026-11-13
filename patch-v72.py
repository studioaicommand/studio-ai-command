# v72 agent harness: a trace of every agent run, a tamper-evident (hash-chained) audit log with a verify check,
# and hard limits on what Studio AI Command may approve by itself.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# 1. Hash-chained audit log: every entry carries the hash of the one before it, so an edited or deleted row shows up.
rep('''async function audit(env, { actor = "system", action, target_type = null, target_id = null, summary: summary2, details = null }) {
  try {
    await insert(env, "team_audit", [{ actor: String(actor).slice(0, 60), action: String(action).slice(0, 60), target_type, target_id: target_id ? String(target_id).slice(0, 80) : null, summary: String(summary2 || "").slice(0, 500), details }]);
  } catch (e) {
  }
}''', '''async function auditHash(prev, row) {
  const body = [prev, row.at, row.actor, row.action, row.target_type || "", row.target_id || "", row.summary || ""].join("|");
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)))).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function audit(env, { actor = "system", action, target_type = null, target_id = null, summary: summary2, details = null }) {
  try {
    const row = { actor: String(actor).slice(0, 60), action: String(action).slice(0, 60), target_type, target_id: target_id ? String(target_id).slice(0, 80) : null, summary: String(summary2 || "").slice(0, 500) };
    const [last] = await select(env, "team_audit", "order=created_at.desc&limit=1&select=details").catch(() => []);
    const prev = last?.details?.chain?.h || "genesis", at = new Date().toISOString();
    const chain = { prev, at, h: await auditHash(prev, { ...row, at }) };
    await insert(env, "team_audit", [{ ...row, details: { ...(details && typeof details === "object" && !Array.isArray(details) ? details : details == null ? {} : { value: details }), chain } }]);
  } catch (e) {
  }
}
// Walks the log oldest to newest and checks every link. Entries from before v72 have no chain and are skipped.
async function auditVerify(env, limit = 1000) {
  const rows = (await select(env, "team_audit", `order=created_at.desc&limit=${Math.min(5000, Math.max(1, +limit || 1000))}&select=id,actor,action,target_type,target_id,summary,details,created_at`)).reverse();
  let checked = 0, prevH = null;
  for (const r of rows) {
    const c = r.details?.chain;
    if (!c) continue;
    if (prevH !== null && c.prev !== prevH) return { ok: false, checked, broken_at: r.id, at: r.created_at, problem: "An entry before this one was removed or changed." };
    if (await auditHash(c.prev, { ...r, at: c.at }) !== c.h) return { ok: false, checked, broken_at: r.id, at: r.created_at, problem: "This entry was changed after it was written." };
    prevH = c.h; checked++;
  }
  return { ok: true, checked, head: prevH };
}''')

# 2. Traces: every tool call records what was asked and how long it took; every top-level run is written to the audit log.
rep('''      const results = await Promise.all(
        calls.map(async (c) => {
          c._done = true;''', '''      const results = await Promise.all(
        calls.map(async (c) => {
          c._done = true; const t0 = Date.now();''')
rep('          run.log.push({ step, tool: c.name, ok: !isError && !(out && out.error) });',
    '          run.log.push({ step, tool: c.name, ok: !isError && !(out && out.error), ms: Date.now() - t0, input: JSON.stringify(c.input || {}).slice(0, 240) });')
rep('''      const enrols = run.actions.filter((a) => a.type === "campaign_enrol").length;''',
    '''      const enrols = run.actions.filter((a) => a.type === "campaign_enrol").length;
      await audit(env, { actor: dept.name + (specialist ? " · " + specialist.name : ""), action: "agent_run", target_type: "agent", target_id: dept.id, summary: `${source} run: ${run.log.filter((l) => l.tool).length} tool calls, ${run.actions.length} actions (${run.actions.filter((a) => a.auto).length} auto), ${run.errors.length} errors${stopped ? " · stopped: " + stopped : ""}`.slice(0, 500), details: { source, steps: run.log.slice(0, 80), actions: run.actions.slice(0, 40).map((a) => ({ id: a.id, type: a.type, auto: !!a.auto })), errors: run.errors.slice(0, 10), consulted: run.consulted.slice(0, 20) } }).catch(() => {});''')

# 3. Hard limits: Studio AI Command can enrol at most N businesses a day by itself (default 25); after that it asks Ty.
rep('''    const why = await enrolOkForCommand(env, action.params);''', '''    const capDay = Math.max(0, Math.min(200, Number(settings?.limits?.auto_enrol_per_day ?? 25)));
    const since = new Date(Date.now() - 864e5).toISOString();
    const autoToday = await select(env, "team_actions", `type=eq.campaign_enrol&auto=is.true&created_at=gte.${since}&select=id&limit=500`).catch(() => []);
    if (autoToday.length >= capDay) return { route: "ask", why: `daily limit of ${capDay} automatic enrolments reached` };
    const why = await enrolOkForCommand(env, action.params);''')
# Belt and braces: whatever decide() says, anything that contacts a client, touches money or deletes is never approved by the AI itself.
rep('''  const d = await decide(env, action, { ...opts, settings });
  if (d.route === "auto") {''', '''  const d = await decide(env, action, { ...opts, settings });
  if (d.route === "auto" && NEVER_AUTO.has(action.type)) { d.route = "ask"; d.urgent = true; }
  if (d.route === "auto") {''')
rep('var INTERNAL = /* @__PURE__ */ new Set(["ghl_note", "ghl_task"]);', 'var INTERNAL = /* @__PURE__ */ new Set(["ghl_note", "ghl_task"]);\nvar NEVER_AUTO = /* @__PURE__ */ new Set(["ghl_email", "ghl_sms", "outreach_email", "stripe_draft_invoice", "ghl_appointment_book", "ghl_appointment_cancel", "ghl_appointment_move", "ghl_contact_archive", "ghl_contact_delete", "team_rule"]);')
rep('function isAuto(settings, type) {\n  return !ALWAYS_ASK[type] &&', 'function isAuto(settings, type) {\n  return !ALWAYS_ASK[type] && !(typeof NEVER_AUTO !== "undefined" && NEVER_AUTO.has(type)) &&')

# 4. Verify route
rep('  if (seg[0] === "website-demos") { const wr = await wsdRoute(p, m, body, env, url, seg); if (wr) return wr; }',
    '  if (p === "/audit/verify" && m === "GET") return json({ ok: true, ...(await auditVerify(env, url.searchParams.get("limit"))) });\n  if (seg[0] === "website-demos") { const wr = await wsdRoute(p, m, body, env, url, seg); if (wr) return wr; }')

# 5. Settings › Security shows whether the audit log is intact
rep("  { const pkSecBase = VIEWS.security; VIEWS.security = async (el) => { await pkSecBase(el); if (still('security', el)) await pkSecurityExtras(el); }; }",
    "  { const pkSecBase = VIEWS.security; VIEWS.security = async (el) => { await pkSecBase(el); if (still('security', el)) await pkSecurityExtras(el); }; }\n  { const v72Sec = VIEWS.security; VIEWS.security = async (el) => { await v72Sec(el); if (!still('security', el)) return; let a; try { a = await team('/audit/verify'); } catch (e) { return; } if (!still('security', el)) return; const box = document.createElement('section'); box.className = 'wf-glass v72-audit'; box.innerHTML = '<span class=\"wf-eyebrow\">AUDIT LOG</span><h3 style=\"margin:4px 0\">' + (a.ok ? 'Intact' : 'Changed or missing entries found') + '</h3><p class=\"mu sm\">' + (a.ok ? 'Every entry is linked to the one before it, so nothing can be edited or removed without showing up here. ' + esc(a.checked) + ' entries checked.' : esc(a.problem || '') + ' First problem at ' + esc(a.at || '') + '.') + '</p>'; el.append(box); }; }")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v72 applied')
