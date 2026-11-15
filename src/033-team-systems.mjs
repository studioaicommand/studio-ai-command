// src/team/systems.js
var median = (xs) => {
  const a = xs.filter((x) => Number.isFinite(x)).sort((p, q2) => p - q2);
  return a.length ? a[Math.floor(a.length / 2)] : null;
};
async function systemCheck(env, days = 7) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const settings = await getSettings(env);
  const q2 = (t, query) => select(env, t, query).catch(() => null);
  const [reports, actions, prospects, usage] = await Promise.all([
    q2("team_reports", `created_at=gte.${enc(since)}&kind=eq.shift&select=id,department,subkind,title,body,created_at&order=created_at.desc&limit=200`),
    q2("team_actions", `created_at=gte.${enc(since)}&select=id,type,status,department,title,created_at,decided_at,result,auto&limit=2000`),
    q2("agent_prospects", "select=id,business_name,status,vertical,email,email_source_url,phone,ghl_contact_id,campaign,enrolled_at,leak_report,updated_at&limit=5000"),
    q2("team_usage", `created_at=gte.${enc(since)}&select=source,cost_aud,calls&limit=5000`)
  ]);
  const R = reports || [], A = actions || [], P = prospects || [];
  const failedShifts = R.filter((r) => /FAILED|stopped early/.test(r.title)).map((r) => ({ id: r.id, title: r.title, error: ((r.body || "").match(/Error[s]?:[\s\S]{0,300}/) || [""])[0].replace(/\s+/g, " ").slice(0, 300) }));
  const byReason = {};
  for (const a of A.filter((x) => x.status === "failed")) {
    const k = String(a.result?.error || "unknown").replace(/[0-9a-f-]{20,}/g, "\u2026").slice(0, 120);
    byReason[k] = (byReason[k] || 0) + 1;
  }
  const held = A.filter((x) => x.status === "pending" && x.result?.held).map((x) => ({ title: x.title, reason: x.result.held.slice(0, 160) }));
  const hunts = (settings.hunts || []).filter((h) => (h.started_at || "") >= since);
  const huntErrors = hunts.flatMap((h) => (h.results?.errors || []).map((e) => ({ hunt: `${h.vertical} in ${h.city}`, ...e })));
  const routes = {};
  for (const h of hunts) for (const c of h.candidates || []) routes[c.state] = (routes[c.state] || 0) + 1;
  const status = {};
  for (const p of P) status[p.status || "none"] = (status[p.status || "none"] || 0) + 1;
  const stale = (s, d) => P.filter((p) => p.status === s && Date.now() - Date.parse(p.updated_at || 0) > d * 864e5).length;
  const quality = {
    enrolled_without_published_email: P.filter((p) => p.campaign && (!p.email || !p.email_source_url)).length,
    enrolled_off_target: P.filter((p) => p.campaign && !["allied", "dental", "aesthetics", "property"].includes(p.vertical)).length,
    sent_without_ghl_link: P.filter((p) => p.status === "sent" && !p.ghl_contact_id).length,
    prospects_without_leak_report: P.filter((p) => !p.leak_report && p.status !== "skipped").length,
    unverified_findings_share: (() => {
      const L = P.filter((p) => p.leak_report?.checks);
      const u = L.filter((p) => p.leak_report.checks.some((c) => c.status === "unverified")).length;
      return L.length ? Math.round(u / L.length * 100) + "%" : null;
    })()
  };
  const enrol = A.filter((a) => a.type === "campaign_enrol");
  const decided = enrol.filter((a) => a.decided_at);
  const flow = {
    drafted: enrol.length,
    approved: enrol.filter((a) => a.status === "done").length,
    rejected: enrol.filter((a) => a.status === "rejected").length,
    refused_by_checks: enrol.filter((a) => a.status === "failed").length,
    waiting: enrol.filter((a) => a.status === "pending").length,
    median_hours_to_decision: (() => {
      const m = median(decided.map((a) => (Date.parse(a.decided_at) - Date.parse(a.created_at)) / 36e5));
      return m == null ? null : Math.round(m * 10) / 10;
    })(),
    stuck_needs_research_7d: stale("needs_research", 7),
    stuck_queued_3d: stale("queued", 3)
  };
  let campaign = null;
  try {
    const s = await campaignSetup(env, settings);
    campaign = { ready: s.ready, problems: s.problems, warnings: s.warnings };
  } catch (e) {
    campaign = { error: e.message.slice(0, 160) };
  }
  const cost = (usage || []).reduce((s, u) => s + Number(u.cost_aud || 0), 0);
  return {
    ok: true,
    days,
    integrations: { browser_scanner: rendererReady(env), claude: !!env.ANTHROPIC_API_KEY, ghl: enabled(env), supabase: reports !== null, audit_table: await q2("team_audit", "limit=1&select=id") !== null, usage_table: usage !== null, web_search: env.ENABLE_WEB_SEARCH === "true" },
    shifts: { runs: R.length, failed_or_stopped: failedShifts },
    actions: { total: A.length, failed_by_reason: byReason, held_in_queue: held.slice(0, 10) },
    hunts: { runs: hunts.length, routes, errors: huntErrors.slice(0, 15) },
    prospects_by_status: status,
    data_quality: quality,
    approval_flow: flow,
    campaign,
    cost_aud: Math.round(cost * 100) / 100
  };
}

