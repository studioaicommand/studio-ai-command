# v50: Full Company (8 heads + 36 specialists), demo watcher, no-show rebooker, AI budget that grows with revenue.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
team, ui, css = [open(D + f).read() for f in ('v50-team.js', 'v50-ui.js', 'v50-ui.css')]
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
rep('"growth_goal", "scout", "coach"].includes(key)', '"growth_goal", "scout", "coach", "watch"].includes(key)')
rep('async function runAgent(env, deptId, { messages, depth = 0, threadId = null, run = null, maxSteps = MAX_STEPS, source = "chat", prospects = [] }) {',
    'async function runAgent(env, deptId, { messages, depth = 0, threadId = null, run = null, maxSteps = MAX_STEPS, source = "chat", prospects = [], specialist = null }) {')
rep('+ await perfBlock(env, deptId).catch(() => ""), depth, charterOf(run.settings));', '+ await perfBlock(env, deptId).catch(() => "") + specialistBlock(deptId, specialist), depth, charterOf(run.settings));')
rep('  const tools = toolsFor(env, dept, depth);', '  if (!run.tier) run.tier = await planTier(env).catch(() => "core");\n  const tools = toolsFor(env, dept, depth).concat(specialist ? [] : specTool(dept, depth, run.tier));')
rep('  return { error: `Unknown tool ${name}` };', '  if (name === "assign_specialist") return runSpecialist(input, ctx);\n  return { error: `Unknown tool ${name}` };')
rep('''  await update(env, "agent_demos", `token=eq.${d.token}`, { views: (d.views || 0) + 1, last_view_at: now(), ...first ? { first_view_at: now() } : {} }).catch(() => {
  });
  if (first) {''', '''  await update(env, "agent_demos", `token=eq.${d.token}`, { views: (d.views || 0) + 1, last_view_at: now(), ...first ? { first_view_at: now() } : {} }).catch(() => {
  });
  if (!/^test/i.test(d.business_name || "")) await watchHot(env, { name: d.business_name, prospect_id: d.prospect_id, what: "AI receptionist demo", views: (d.views || 0) + 1, chats: d.chats || 0 }).catch(() => {});
  if (first) {''')
rep('  if (!aiHold) await coachDaily(e).catch((x) => console.error("team leader:", x.message));', '  if (!aiHold) await coachDaily(e).catch((x) => console.error("team leader:", x.message));\n  if (!aiHold) await noShowWatch(e).catch((x) => console.error("no-show rebooker:", x.message));')
rep('  if (seg[0] === "performance") { const r49', '  if (seg[0] === "performance") { const r50 = await v50Route(p, m, body, env); if (r50) return r50; }\n  if (seg[0] === "performance") { const r49')
# Inbox: filter chips show counts and hide when empty, so only useful filters show
rep("""    if (!still("approvals", el)) return;
    const list = actions.filter((a) => apprFilter === "all" || KIND(a.type) === apprFilter);""", """    if (!still("approvals", el)) return;
    { const cnt = { all: actions.length }; actions.forEach((a) => { const k = KIND(a.type); cnt[k] = (cnt[k] || 0) + 1; }); if (apprFilter !== "all" && !cnt[apprFilter]) apprFilter = "all"; $$("#aSeg button", el).forEach((b) => { const k = b.dataset.f, n = cnt[k] || 0; b.hidden = k !== "all" && !n; b.classList.toggle("on", k === apprFilter); b.textContent = b.textContent.replace(/ \\\\(\\\\d+\\\\)$/, "") + (n ? " (" + n + ")" : ""); }); const seg = $("#aSeg", el); if (seg) seg.hidden = Object.keys(cnt).filter((k) => k !== "all" && cnt[k]).length < 2; }
    const list = actions.filter((a) => apprFilter === "all" || KIND(a.type) === apprFilter);""")
rep("""(apprHistory ? "Show waiting" : "Activity log")""", """(apprHistory ? "Show waiting" : "Past decisions")""")
assert '`' not in ui + css and '${' not in ui + css
rep('  VIEWS.brain = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('/* Phone AI (v45) */', css.replace('\\', '\\\\') + '\n/* Phone AI (v45) */')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v50 applied')
