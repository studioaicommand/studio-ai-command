// ── v49: performance system. Every agent has a KPI, a weekly scorecard and coach rules; the Team Leader reviews
// the team every morning, re-briefs whoever isn't moving the number, and sets the day's experiments. ──
var KPI = {
  chief_of_staff: "Booked sales calls this week against the weekly target; the whole team moving in one direction",
  head_of_sales: "Calls booked and deals closed; every warm lead, reply and demo viewer followed up within one working day",
  head_of_marketing: "Replies and concept opens per 100 businesses contacted; cost per booked call",
  head_of_content: "Content and proof (case studies, reviews, videos) that brings in enquiries and helps close",
  head_of_client_success: "Upsells, referrals and Google reviews from current clients; no client goes quiet",
  head_of_operations: "Approvals cleared and work finished the same day; nothing stuck",
  head_of_systems: "Automations live and errors fixed within a day; the machine runs without Ty",
  head_of_finance: "Cash collected, cost per booked call, AI spend kept below what it earns"
};
async function planTier(env) {
  const p = await secGet(env, "plan_tier").catch(() => null);
  if (p?.tier === "core" || p?.tier === "company") return p.tier;
  return (await instGet(env).catch(() => null))?.custom ? "core" : "company";
}
var PERF_CACHE = { at: 0, v: null };
async function scorecards(env, { fresh = false } = {}) {
  if (!fresh && PERF_CACHE.v && Date.now() - PERF_CACHE.at < 6e5) return PERF_CACHE.v;
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [jobsR, acts, use] = await Promise.all([
    select(env, "studio_command_jobs", `created_at=gte.${since}&select=department,status,source&limit=3000`).catch(() => []),
    select(env, "team_actions", `created_at=gte.${since}&select=department,status,type,title,result&limit=3000`).catch(() => []),
    select(env, "team_usage", `created_at=gte.${since}&select=department,cost_aud&limit=8000`).catch(() => [])
  ]);
  const out = {};
  for (const d of Object.keys(DEPARTMENTS)) {
    const j = jobsR.filter((x) => x.department === d), a = acts.filter((x) => x.department === d);
    const done = j.filter((x) => x.status === "done" || x.status === "completed").length, failed = j.filter((x) => x.status === "failed" || x.status === "error").length;
    const approved = a.filter((x) => ["approved", "done", "executed", "sent"].includes(x.status)).length, rejected = a.filter((x) => x.status === "rejected").length, pending = a.filter((x) => x.status === "pending").length;
    const cost = use.filter((x) => x.department === d).reduce((s, x) => s + (+x.cost_aud || 0), 0);
    const finish = done + failed ? done / (done + failed) : null, quality = approved + rejected ? approved / (approved + rejected) : null;
    const parts = [finish, quality].filter((x) => x !== null);
    out[d] = { department: d, name: DEPARTMENTS[d].name, kpi: KPI[d] || "", jobs_done: done, jobs_failed: failed, proposed: a.length, approved, rejected, pending, cost_aud: Math.round(cost * 100) / 100, score: parts.length ? Math.round(100 * parts.reduce((s, x) => s + x, 0) / parts.length) : null, idle: !j.length && !a.length };
  }
  PERF_CACHE.at = Date.now(); PERF_CACHE.v = out;
  return out;
}
async function funnelWeek(env) {
  const ws = new Date(goalWeekStart()).toISOString(), m30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const [pros, enr, demos, use, pros30] = await Promise.all([
    select(env, "agent_prospects", `created_at=gte.${ws}&select=id,status&limit=5000`).catch(() => []),
    select(env, "team_actions", `type=eq.campaign_enrol&decided_at=gte.${ws}&select=status&limit=5000`).catch(() => []),
    select(env, "agent_demos", `first_view_at=gte.${ws}&select=token&limit=5000`).catch(() => []),
    select(env, "team_usage", `created_at=gte.${ws}&select=cost_aud,department&limit=8000`).catch(() => []),
    select(env, "agent_prospects", `created_at=gte.${m30}&select=niche,status&limit=8000`).catch(() => [])
  ]);
  const replied = (await select(env, "agent_prospects", `updated_at=gte.${ws}&status=in.(replied,won)&select=id&limit=5000`).catch(() => [])).length;
  const g = await goalStatus(env).catch(() => null);
  const cost = use.reduce((s, x) => s + (+x.cost_aud || 0), 0);
  const byV = {};
  for (const r of pros30) { const v = r.niche || "other"; byV[v] = byV[v] || { vertical: v, contacted: 0, replied: 0, won: 0 }; byV[v].contacted++; if (r.status === "replied") byV[v].replied++; if (r.status === "won") { byV[v].won++; byV[v].replied++; } }
  const verticals = Object.values(byV).map((v) => ({ ...v, name: OUTREACH[v.vertical]?.name || v.vertical, rate: Math.round((v.replied + v.won) / Math.max(1, v.contacted) * 1000) / 10 })).sort((a, b) => b.rate - a.rate || b.contacted - a.contacted);
  const booked = g?.booked ?? null;
  return { ok: true, week_start: ws, stages: [
    { key: "researched", label: "Researched", n: pros.length },
    { key: "sent", label: "Emailed", n: enr.filter((x) => ["approved", "done", "executed"].includes(x.status)).length },
    { key: "opened", label: "Opened their demo", n: demos.length },
    { key: "replied", label: "Replied", n: replied },
    { key: "booked", label: "Booked a call", n: booked ?? 0 }
  ], cost_aud: Math.round(cost * 100) / 100, cost_per_booked: booked ? Math.round(cost / booked * 100) / 100 : null, goal: g, verticals };
}
// weights the autopilot's industries towards what books (smoothed so a new industry still gets tried)
async function outVertWeights(env, verts) {
  const f = await funnelWeek(env).catch(() => null);
  const rate = Object.fromEntries((f?.verticals || []).map((v) => [v.vertical, (v.replied + 2 * v.won + 1) / (v.contacted + 10)]));
  const sorted = [...verts].sort((a, b) => (rate[b] ?? 0.1) - (rate[a] ?? 0.1));
  return sorted.flatMap((v, i) => Array(i === 0 ? 3 : i === 1 ? 2 : 1).fill(v));
}
async function coachGet(env) {
  const r = await select(env, "team_settings", "key=eq.coach&select=value&limit=1").catch(() => []);
  const v = r?.[0]?.value || {};
  return { rules: v.rules && typeof v.rules === "object" ? v.rules : {}, last_date: v.last_date || null, review: v.review || null, history: Array.isArray(v.history) ? v.history : [] };
}
async function perfBlock(env, dept) {
  if (!DEPARTMENTS[dept]) return "";
  const [sc, coach] = await Promise.all([scorecards(env).catch(() => null), coachGet(env).catch(() => null)]);
  const me = sc?.[dept];
  const rules = (coach?.rules?.[dept] || []).slice(-6);
  const grade = coach?.review?.leaderboard?.find((x) => x.department === dept);
  return `\n\n=== YOUR PERFORMANCE CONTRACT ===
Your job is judged on results, every day: ${KPI[dept] || "moving the business towards booked calls and revenue"}.
This week: ${me ? `${me.jobs_done} jobs done, ${me.jobs_failed} failed; ${me.approved} of your proposals approved, ${me.rejected} rejected, ${me.pending} waiting${me.score !== null ? `; score ${me.score}/100` : ""}` : "no data yet"}.${grade ? ` Team Leader's grade: ${grade.grade} (${grade.why}).` : ""}
The Team Leader reviews every agent each morning. Work that doesn't move the number gets re-briefed and handed to someone else; work that does becomes the team's playbook. So:
- Closing is everyone's job: end every piece of work with the concrete next step that moves a prospect or client towards a booked call, a yes or a payment, and who does it by when.
- Be resourceful: if the obvious route is blocked, find another within your tools and the rules. Never pad, guess or fake numbers.
- Learn: apply your coach rules below before you act. In your final note, say what worked, what didn't, and what you'll do differently next time.
${rules.length ? "YOUR COACH RULES (from the Team Leader; follow them):\n" + rules.map((r) => "- " + r.text).join("\n") : "No coach rules yet."}`;
}
var COACH_TOOL = { name: "save_team_review", description: "Save today's team review.", input_schema: { type: "object", properties: {
  summary: { type: "string", description: "Two or three sentences for Ty: where the team stands against the target and the one thing that matters most today." },
  leaderboard: { type: "array", items: { type: "object", properties: { department: { type: "string", enum: Object.keys(DEPARTMENTS) }, grade: { type: "string", enum: ["A", "B", "C", "D", "F", "idle"] }, why: { type: "string", description: "One sentence, specific, from the numbers." } }, required: ["department", "grade", "why"] } },
  new_rules: { type: "array", description: "At most one new rule per department that needs it, at most 5 in total. A rule is a concrete instruction under 200 characters that would have improved this week's results.", items: { type: "object", properties: { department: { type: "string", enum: Object.keys(DEPARTMENTS) }, rule: { type: "string" } }, required: ["department", "rule"] } },
  retire_rules: { type: "array", description: "Ids of existing rules that aren't helping (results didn't improve) or conflict.", items: { type: "string" } },
  experiments: { type: "array", description: "At most 2 experiments to run today, for the departments that most need to move the number. Each is a concrete task the department can do now with its tools.", items: { type: "object", properties: { department: { type: "string", enum: Object.keys(DEPARTMENTS) }, task: { type: "string" } }, required: ["department", "task"] } }
}, required: ["summary", "leaderboard"] } };
var COACH_SYSTEM = `You are the Team Leader of an AI business team (eight department heads). You don't do their work: you hold them to results, question what isn't working, and make them better every day.
Standards: be direct and specific, judge from the numbers you're given, never invent figures. The team's purpose is revenue: booked sales calls and closed deals. Grade each department A to F (or "idle" if it did nothing): A = clearly moved the number, C = busy but no impact, F = failing or wasting money.
For anyone below B, find the cause in the evidence (rejected proposals and why, failed jobs, idle time, cost) and write one rule that fixes it. Keep rules that are working; retire ones that aren't. Set at most two experiments that could add booked calls today.`;
async function coachRun(env, { force = false } = {}) {
  const coach = await coachGet(env), n = brisbaneNow();
  if (!force && coach.last_date === n.date) return { skipped: "already reviewed today" };
  const [sc, fun] = await Promise.all([scorecards(env, { fresh: true }), funnelWeek(env).catch(() => null)]);
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const rejected = await select(env, "team_actions", `status=eq.rejected&created_at=gte.${since}&select=department,title,result&order=created_at.desc&limit=25`).catch(() => []);
  const failed = await select(env, "studio_command_jobs", `status=in.(failed,error)&created_at=gte.${since}&select=department,title&order=created_at.desc&limit=20`).catch(() => []);
  const rulesTxt = Object.entries(coach.rules).flatMap(([d, rs]) => (rs || []).map((r) => `[${r.id}] ${d}: ${r.text} (since ${String(r.at).slice(0, 10)})`)).join("\n") || "(none)";
  const brief = `TODAY: ${n.date}\nWEEK SO FAR: ${JSON.stringify(fun ? { stages: fun.stages, cost_aud: fun.cost_aud, cost_per_booked: fun.cost_per_booked, goal: fun.goal && { goal: fun.goal.goal, booked: fun.goal.booked, expected_by_now: fun.goal.expected, status: fun.goal.status }, best_industries: fun.verticals.slice(0, 4) } : {})}\n\nSCORECARDS (last 7 days):\n${Object.values(sc).map((x) => `${x.department} (${x.name}) KPI: ${x.kpi} | done ${x.jobs_done}, failed ${x.jobs_failed}, proposals ${x.proposed} (approved ${x.approved}, rejected ${x.rejected}, waiting ${x.pending}) | AI cost A$${x.cost_aud} | score ${x.score ?? "n/a"}`).join("\n")}\n\nREJECTED THIS WEEK:\n${rejected.map((r) => `- ${r.department}: ${String(r.title || "").slice(0, 120)}${r.result?.note ? " (Ty: " + String(r.result.note).slice(0, 160) + ")" : ""}`).join("\n") || "(none)"}\n\nFAILED JOBS:\n${failed.map((r) => `- ${r.department}: ${String(r.title || "").slice(0, 120)}`).join("\n") || "(none)"}\n\nCURRENT RULES:\n${rulesTxt}`;
  const u = wsdUsage();
  const out = await wsdAsk(env, u, "smart", { max_tokens: 3e3, system: COACH_SYSTEM, tools: [COACH_TOOL], messages: [{ role: "user", content: brief + "\n\nReview the team, then call save_team_review." }] }, "save_team_review");
  await wsdLog(env, u, "team_leader").catch(() => {});
  if (!out?.summary) throw new Error("The Team Leader couldn't finish today's review.");
  const clip = (x, k) => String(x || "").replace(/\s+/g, " ").trim().slice(0, k);
  const retire = new Set((out.retire_rules || []).map(String));
  const rules = {};
  for (const [d, rs] of Object.entries(coach.rules)) rules[d] = (rs || []).filter((r) => !retire.has(r.id));
  for (const r of (out.new_rules || []).slice(0, 5)) { if (!DEPARTMENTS[r.department] || !clip(r.rule, 200)) continue; rules[r.department] = [...(rules[r.department] || []), { id: crypto.randomUUID().slice(0, 8), text: clip(r.rule, 200), at: new Date().toISOString() }].slice(-6); }
  const tier = await planTier(env);
  const queued = [];
  for (const x of (out.experiments || []).slice(0, tier === "company" ? 2 : 0)) {
    if (!DEPARTMENTS[x.department] || !clip(x.task, 600)) continue;
    const j = await queueCommandJob(env, { department: x.department, source: "team_leader", key: "coach|" + n.date + "|" + x.department, request: `[From the Team Leader] Today's experiment: ${clip(x.task, 600)}\nDo the internal parts now and report the result in numbers. Anything client-facing or costing money is proposed for Ty's approval.` }).catch(() => null);
    if (j?.job_id) queued.push({ department: x.department, task: clip(x.task, 300), job_id: j.job_id });
  }
  const review = { at: new Date().toISOString(), summary: clip(out.summary, 600), leaderboard: (out.leaderboard || []).filter((x) => DEPARTMENTS[x.department]).map((x) => ({ department: x.department, grade: x.grade, why: clip(x.why, 240) })), experiments: queued, new_rules: (out.new_rules || []).length, retired: retire.size };
  const history = [...coach.history, { date: n.date, booked: fun?.goal?.booked ?? null, cost_aud: fun?.cost_aud ?? null }].slice(-60);
  await saveSetting(env, "coach", { rules, last_date: n.date, review, history });
  PERF_CACHE.v = null;
  const order = { A: 0, B: 1, C: 2, D: 3, F: 4, idle: 5 };
  const lb = [...review.leaderboard].sort((a, b) => order[a.grade] - order[b.grade]);
  await notify(env, "\u{1F3C6} <b>Team Leader: today's review</b>\n" + esc6(review.summary) + "\n\n" + lb.map((x) => `${x.grade} · ${esc6(DEPARTMENTS[x.department].name)}`).join("\n") + (queued.length ? "\n\nExperiments today:\n" + queued.map((q) => "• " + esc6(DEPARTMENTS[q.department].name) + ": " + esc6(q.task.slice(0, 140))).join("\n") : "") + "\nCommand › Today › Performance").catch(() => {});
  return { ok: true, review, rules };
}
async function coachDaily(env) {
  const n = brisbaneNow();
  if (n.hour < 7 || n.hour > 11) return { skipped: "not due" };
  if (await planTier(env) !== "company") return { skipped: "core plan" };
  return coachRun(env);
}
async function v49Route(p, m, body, env) {
  const J = (o, st = 200) => json(o, st);
  if (p === "/performance" && m === "GET") {
    const [sc, fun, coach, tier] = await Promise.all([scorecards(env, { fresh: true }), funnelWeek(env).catch((e) => ({ ok: false, error: e.message })), coachGet(env), planTier(env)]);
    return J({ ok: true, tier, specialists: tier === "company" ? SPECIALISTS : null, spec_count: SPEC_COUNT, scorecards: Object.values(sc), funnel: fun, coach: { review: coach.review, rules: coach.rules, last_date: coach.last_date, history: coach.history.slice(-14) } });
  }
  if (p === "/performance/review" && m === "POST") {
    if (await planTier(env) !== "company") return J({ ok: false, error: "The Team Leader is part of the Full Company plan." }, 403);
    return J(await coachRun(env, { force: true }));
  }
  if (p === "/performance/rule" && m === "POST") {
    const c = await coachGet(env), d = String(body.department || "");
    if (!DEPARTMENTS[d]) return J({ ok: false, error: "Choose a department." }, 400);
    if (body.remove) c.rules[d] = (c.rules[d] || []).filter((r) => r.id !== String(body.remove));
    else { const t = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, 200); if (!t) return J({ ok: false, error: "Write the rule." }, 400); c.rules[d] = [...(c.rules[d] || []), { id: crypto.randomUUID().slice(0, 8), text: t, at: new Date().toISOString(), by: "Ty" }].slice(-6); }
    await saveSetting(env, "coach", c); PERF_CACHE.v = null;
    return J({ ok: true, rules: c.rules[d] });
  }
  return null;
}
