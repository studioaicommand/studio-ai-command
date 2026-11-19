// src/team/api.js
var { enc: enc3, now: now4, hoursAgo: hoursAgo3 } = db_exports;
var json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });
function teamAuthed(request, env) {
  const h = request.headers.get("Authorization") || "";
  if (!env.TEAM_API_KEY || !h.startsWith("Bearer ") || !safeEqual(h.slice(7), env.TEAM_API_KEY)) return false;
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  return true;
}
function cors2(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.DASHBOARD_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin"
  };
}
async function teamApi(request, env, url, ctx) {
  const c = cors2(request, env);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: c });
  if (!teamAuthed(request, env)) return json({ ok: false, error: "Incorrect operator access key." }, 401, c);
  if (!env.ANTHROPIC_API_KEY && !/\/(departments|health|summary|actions|reports|memory|settings|mission|prospects|analyse|campaign|calls|costs|imports|hunt|snapshot|audit|system|scan|rescan|telegram|charter|records|jobs)/.test(url.pathname)) {
    return json({ ok: false, error: "The executive team needs ANTHROPIC_API_KEY in Cloudflare (Settings \u2192 Variables and Secrets)." }, 503, c);
  }
  const res = await route2(request, env, url, ctx).catch((e) => {
    console.error("team api:", e.message);
    return json({ ok: false, error: e.message }, 500);
  });
  for (const [k, v] of Object.entries(c)) res.headers.set(k, v);
  return res;
}
async function route2(request, env, url, ctx) {
  const p = url.pathname.replace(/^\/api\/v1\/team/, "").replace(/\/+$/, "") || "/";
  const m = request.method;
  const body = m === "POST" ? await request.json().catch(() => ({})) : {};
  const seg = p.split("/").filter(Boolean);
  if ((await instGet(env).catch(() => ({}))).custom) instSpecSwap();
  if (p === "/leak-scan" && m === "POST") return json(await leakInsideScan(env, { days: Math.max(7, Math.min(90, +body.days || 30)) }));
  if (p === "/monday-report" && m === "POST") return json(await mondayReport(env, { force: true }));
  if (p === "/ui-theme" && m === "GET") { const v = await secGet(env, "ui_theme").catch(() => null); return json({ ok: true, theme: v?.theme || "midnight" }); }
  if (p === "/ui-theme" && m === "POST") { const mh = request.headers.get("x-sf-member") || ""; if (mh && mh.split("|")[1] !== "owner") return json({ ok: false, error: "Only the owner can change the look." }, 403); const t = String(body.theme || ""); if (!["midnight", "graphite", "ivory", "aurora"].includes(t)) return json({ ok: false, error: "Unknown look." }, 400); await secPut(env, "ui_theme", { theme: t, at: new Date().toISOString() }); await audit(env, { actor: "Ty", action: "look_changed", target_type: "settings", target_id: "ui_theme", summary: "Command look: " + t }).catch(() => {}); return json({ ok: true, theme: t }); }
  if (seg[0] === "dm-queue") { const dr = await dmRoute(p, m, body, env); if (dr) return dr; }
  if (p === "/audit/verify" && m === "GET") return json({ ok: true, ...(await auditVerify(env, url.searchParams.get("limit"))) });
  if (seg[0] === "website-demos") { const wr = await wsdRoute(p, m, body, env, url, seg); if (wr) return wr; }
  if (seg[0] === "instance") { const ir = await instRoute(p, m, body, env, request); if (ir) return ir; }
  if (seg[0] === "setup-guide") { const sg = await setupGuideRoute(p, m, body, env, request, url); if (sg) return sg; }
  if (seg[0] === "costs" && seg[1] === "budget") { const br = await aiBudgetRoute(p, m, body, env); if (br) return br; }
  if (seg[0] === "performance") { const r50 = await v50Route(p, m, body, env); if (r50) return r50; }
  if (seg[0] === "performance") { const r49 = await v49Route(p, m, body, env); if (r49) return r49; }
  if (seg[0] === "browser") { const r55 = await v55Route(p, m, body, env); if (r55) return r55; }
  if (seg[0] === "arena") {
    if (m === "POST") return json(await arenaRun(env, { n: Math.max(2, Math.min(20, +(body && body.n) || 8)), force: true }));
    const st = (await secGet(env, "arena").catch(() => null)) || { runs: [] };
    return json({ ok: true, latest: st.runs[0] || null, history: st.runs.map((r) => ({ day: r.day, score: r.score, baseline: r.baseline, n: r.n, version: r.version })), golden: ARENA_GOLDEN.length });
  }
  if (seg[0] === "growth-pack" && m === "GET") return json(await packStatus(env));
  if (seg[0] === "outreach-plan" && m === "GET") return json(await outreachPlan(env));
  if (seg[0] === "growth-pack" && seg[1] === "run" && m === "POST") return json(await packReengage(env, { force: true }));
  if (seg[0] === "cron-health" && m === "GET") { const ch = (await secGet(env, "cron_health").catch(() => null)) || {}; return json({ ok: true, last_run: ch.at || null, took_seconds: ch.took_ms ? Math.round(ch.took_ms / 1000) : null, failing: Object.entries(ch.streaks || {}).map(([job, runs]) => ({ job, runs_in_a_row: runs, last_error: ch.steps?.[job]?.err || "" })), skipped: ch.skipped || [], steps: ch.steps || {}, history: (ch.history || []).slice(0, 24), ai_gateway: Boolean(aigTarget(env)) }); }
  if (seg[0] === "ui-usage") {
    const r = await select(env, "team_settings", "key=eq.ui_usage&select=value&limit=1").catch(() => []);
    const st = r?.[0]?.value || { since: new Date().toISOString(), views: {} };
    if (m === "POST") { const v = String((body || {}).view || "").replace(/[^a-z_]/g, "").slice(0, 30); if (v) { const x = st.views[v] || { n: 0 }; st.views[v] = { n: x.n + 1, last: new Date().toISOString() }; await saveSetting(env, "ui_usage", st).catch(() => {}); } return json({ ok: true }); }
    return json({ ok: true, since: st.since, views: Object.entries(st.views || {}).map(([view, x]) => ({ view, opens: x.n, last: x.last })).sort((a, b) => b.opens - a.opens) });
  }
  if (seg[0] === "ceo-home" && m === "GET") return json(await ceoHome(env));
  if (seg[0] === "leak-tidy" && m === "POST") return json(await leakTidy(env, { force: true, limit: Math.max(1, Math.min(60, Number((body || {}).limit) || 40)) }));
  if (seg[0] === "task-doer" && m === "POST") return json(await taskDoer(env, { force: true, limit: Math.max(1, Math.min(10, Number((body || {}).limit) || 4)) }));
  if (seg[0] === "release-announce" && m === "POST") return json(await releaseAnnounce(env, { force: true }));
  if (seg[0] === "lean") {
    if (m === "GET") { const b = await bgHeld(env); return json({ ok: true, ...b, rules: { haiku_for: "internal reports and reviews", skipped_while_lean: [...LEAN_SKIP_SHIFTS], fortnightly_while_lean: [...LEAN_FORTNIGHTLY] } }); }
    if (m === "POST") { const b = body || {}; const r = await select(env, "team_settings", "key=eq.ai_lean&select=value&limit=1").catch(() => []); const st = r?.[0]?.value || {}; if (["auto", "on", "off"].includes(b.mode)) st.mode = b.mode; if (b.bg_cap_usd != null) st.bg_cap_usd = Math.max(0, Math.min(200, Number(b.bg_cap_usd) || 0)); st.checked = null; await saveSetting(env, "ai_lean", st); return json({ ok: true, ...(await bgHeld(env)) }); }
  }
  if (seg[0] === "inbox-sweep") { if (m === "POST") return json(await inboxSweep(env, { force: true })); if (m === "GET") return json(await inboxHealth(env)); }
  if (seg[0] === "billing") { if (p === "/billing/check" && m === "POST") return json(await billingDesk(env, { force: true })); if (p === "/billing" && m === "GET") { const d = (await linkGet(env, "billing_desk").catch(() => null)) || {}; const all = Object.values(d.inv || {}); return json({ ok: true, open: all.filter((r) => !r.closed).map((r) => ({ name: r.name, amount: r.amount, invoice: r.number, reminders: (r.sent || []).length, call: !!r.call })), paid_recently: all.filter((r) => r.closed).map((r) => r.name).slice(0, 20) }); } }
  if (seg[0] === "reviews") { const J95 = (o, st = 200) => json(o, st); if (p === "/reviews/check" && m === "POST") return J95(await reviewDesk(env, { force: true })); if (p === "/reviews" && m === "GET") { const d = (await linkGet(env, "review_desk").catch(() => null)) || {}; const as = Object.values(d.asked || {}); return J95({ ok: true, rating: d.rating || null, count: d.count || null, watching: !!env.GOOGLE_PLACES_KEY, asked: as.length, reviewed: as.filter((a) => a.reviewed).length, chased: as.filter((a) => a.chased).length, waiting: as.filter((a) => !a.reviewed).map((a) => a.name).slice(0, 30) }); } }
  if (seg[0] === "mac-link") { const r54 = await v54Route(p, m, body, env); if (r54) return r54; }
  if (seg[0] === "voice-style" || seg[0] === "away") { const r52 = await v52Route(p, m, body, env); if (r52) return r52; }
  if (seg[0] === "goal" || seg[0] === "scout") { const r48 = await v48Route(p, m, body, env); if (r48) return r48; }
  if (seg[0] === "outreach") { const orr = await outreachRoute(p, m, body, env); if (orr) return orr; }
  if (seg[0] === "phone") { const pr = await phoneRoute(p, m, body, env, url); if (pr) return pr; }
  if (seg[0] === "fleet" || seg[0] === "fleet-info" || seg[0] === "fair-use-check") { const fr = await fleetRoute(p, m, body, env, url, seg); if (fr) return fr; }
  if(p==='/records'&&m==='GET')return json(await recordsSearch(env,Object.fromEntries(url.searchParams)));
  if(p==='/records/transcripts'&&m==='POST')return json(await voiceRecords(env,body));
  if(p==='/records/backfill'&&m==='POST')return json(await archiveBackfill(env,body));
  if(p==='/records/import-telegram'&&m==='POST')return json(await importTelegramExport(env,body));
  if(seg[0]==='records'&&seg[1]&&m==='GET')return json(await recordRead(env,seg[1],{full:true}));
  if(p==='/jobs'&&m==='GET')return json(await commandJobs(env,Object.fromEntries(url.searchParams)));
  if (p === "/departments") return json({ ok: true, departments: publicDepartments() });
  if (p === "/health") return json(await health(env));
  if (p === "/summary") return json(await summary(env));


  if (p === "/offers" && m === "GET") {
    const state=await offersState(env);
    return json({ok:true,state:{catalog:state.catalog,public:offersPublicData(state),revision:state.revision},public_url:String(env.PUBLIC_ORIGIN||DEFAULT_ORIGIN).replace(/\/+$/,"")+"/offers"});
  }
  if (p === "/offers" && m === "POST") {
    try {return json(await offersSave(env,body.changes,body.revision));}catch(e){return json({ok:false,error:e.message},400);}
  }
  if (p === "/offers/preview" && m === "POST") {
    try {const state=await offersState(env);if(body.revision!==state.revision)throw new Error("The offers changed. Refresh before previewing.");const patch=offersChanges(body.changes);const catalog={...state.catalog,...patch,items:{...state.catalog.items}};for(const[id,item]of Object.entries(patch.items||{}))catalog.items[id]={...catalog.items[id],...item};return json({ok:true,html:offersPageHtml(offersPublicData({...state,catalog}),{preview:true})});}catch(e){return json({ok:false,error:e.message},400);}
  }

  if (p === "/workday" && m === "GET") return json(await workflowToday(env));
  if (seg[0] === "business" && seg[1] && seg.length === 2) {
    try { if(m === "GET") return json(await workflowRecord(env,seg[1])); if(m === "POST") return json(await workflowSave(env,seg[1],body)); }
    catch(e) { return json({ok:false,error:e.message},400); }
  }
  if(seg[0] === "business" && seg[1] && seg[2] === "tasks" && seg[3] && seg.length === 4 && m === "POST") {
    try {return json(await workflowFinish(env,seg[1],seg[3],body.cancel===true));}catch(e){return json({ok:false,error:e.message},400);}
  }

  if (p === "/chat" && m === "POST") { const mh = request.headers.get("x-sf-member") || ""; return json(await chat2(env, { ...body, learn: !mh || mh.split("|")[1] === "owner" })); }
  if (p === "/threads" && m === "GET") {
    const dept = url.searchParams.get("department");
    const q2 = [`order=updated_at.desc`, `limit=30`];
    if (dept) q2.push(`department=eq.${enc3(dept)}`);
    return json({ ok: true, threads: await select(env, "team_threads", q2.join("&")) });
  }
  if (seg[0] === "threads" && seg[1] && m === "GET") {
    const [thread] = await select(env, "team_threads", `id=eq.${enc3(seg[1])}&limit=1`);
    if (!thread) return json({ ok: false, error: "Not found" }, 404);
    const messages = await select(env, "team_messages", `thread_id=eq.${enc3(seg[1])}&order=created_at.asc&limit=200`);
    return json({ ok: true, thread, messages });
  }
  if (p === "/actions" && m === "GET") {
    const status = url.searchParams.get("status") || "pending";
    const q2 = status === "history" ? "status=in.(done,failed,rejected)&order=decided_at.desc&limit=50" : `status=eq.${enc3(status)}&order=created_at.asc&limit=100`;
    return json({ ok: true, actions: await select(env, "team_actions", q2) });
  }
  if (p === "/actions/bulk-approve" && m === "POST") {
    const ids = Array.isArray(body.ids) ? body.ids.slice(0, 25) : [];
    const rows = ids.length ? await select(env, "team_actions", `id=in.(${ids.map(enc3).join(",")})&status=eq.pending&select=id,type`) : [];
    const results = [];
    for (const r of rows) {
      if (r.type !== "campaign_enrol") {
        results.push({ id: r.id, ok: false, error: "Only campaign enrolments can be bulk-approved." });
        continue;
      }
      try {
        await approveAction(env, r.id);
        results.push({ id: r.id, ok: true });
      } catch (e) {
        results.push({ id: r.id, ok: false, error: e.message });
      }
    }
    return json({ ok: true, approved: results.filter((x) => x.ok).length, results });
  }
  if (seg[0] === "actions" && seg[1] && seg[2] === "approve" && m === "POST") {
    try {
      return json({ ok: true, action: await approveAction(env, seg[1], body.params) });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (seg[0] === "actions" && seg[1] && seg[2] === "reject" && m === "POST") {
    try {
      const action = await rejectAction(env, seg[1], body.note);
      if (body.note) await insert(env, "team_memory", [{ fact: `Ty rejected "${action.title}" (${action.type}, from ${action.department}). His reason: ${String(body.note).slice(0, 400)}`, category: "feedback", department: "owner" }]).catch(() => {
      });
      return json({ ok: true, action });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (p === "/reports" && m === "GET") {
    const q2 = ["order=created_at.desc", `limit=${Math.min(+url.searchParams.get("limit") || 30, 100)}`, "select=id,department,kind,subkind,title,created_at"];
    for (const k of ["department", "kind"]) if (url.searchParams.get(k)) q2.push(`${k}=eq.${enc3(url.searchParams.get(k))}`);
    return json({ ok: true, reports: await select(env, "team_reports", q2.join("&")) });
  }
  if (seg[0] === "reports" && seg[1] && m === "GET") {
    const [r] = await select(env, "team_reports", `id=eq.${enc3(seg[1])}&limit=1`);
    return r ? json({ ok: true, report: r }) : json({ ok: false, error: "Not found" }, 404);
  }
  if (p === "/memory" && m === "GET") return json({ ok: true, memory: await select(env, "team_memory", "order=created_at.desc&limit=300") });
  if (p === "/memory" && m === "POST") {
    if (!body.fact) return json({ ok: false, error: "fact required" }, 400);
    const [row] = await insert(env, "team_memory", [{ fact: String(body.fact).slice(0, 1e3), category: body.category || "other", department: "owner" }]);
    return json({ ok: true, memory: row });
  }
  if (seg[0] === "memory" && seg[1] && m === "DELETE") {
    await fetch(`${env.SUPABASE_URL}/rest/v1/team_memory?id=eq.${enc3(seg[1])}`, {
      method: "DELETE",
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
    });
    return json({ ok: true });
  }
  if (p === "/settings" && m === "GET") {
    return json({ ok: true, settings: await getSettings(env), autopilot_types: AUTOPILOT_TYPES, always_ask: ALWAYS_ASK, now: brisbaneNow(), inbox_key: await inboxKey(env) });
  }
  if (p === "/settings" && m === "POST") {
    const cur = await getSettings(env);
    await audit(env, { actor: "Ty", action: "settings", summary: "Changed: " + Object.keys(body).join(", "), details: body });
    if (body.autopilot && typeof body.autopilot === "object") {
      const next = { ...cur.autopilot };
      for (const [k, v] of Object.entries(body.autopilot)) if (AUTOPILOT_TYPES[k] && (v === "auto" || v === "ask")) next[k] = v;
      await saveSetting(env, "autopilot", next);
    }
    if (Array.isArray(body.shifts)) {
      const byId = Object.fromEntries(body.shifts.map((s) => [s.id, s]));
      const next = cur.shifts.map((s) => {
        const u = byId[s.id];
        if (!u) return { id: s.id, enabled: s.enabled, hour: s.hour, days: s.days, last_run: s.last_run || null };
        return {
          id: s.id,
          enabled: typeof u.enabled === "boolean" ? u.enabled : s.enabled,
          hour: Number.isInteger(u.hour) && u.hour >= 0 && u.hour <= 23 ? u.hour : s.hour,
          days: Array.isArray(u.days) && u.days.length && u.days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7) ? u.days : s.days,
          last_run: s.last_run || null
        };
      });
      await saveSetting(env, "shifts", next);
    }
    if (body.mission && Number(body.mission.target_monthly_aud) > 0) {
      const t = Math.round(Number(body.mission.target_monthly_aud));
      await saveSetting(env, "mission", { target_monthly_aud: t, label: "$" + (t >= 1e3 ? Math.round(t / 100) / 10 + "k" : t) + " a month" });
    }
    if (body.outreach && Array.isArray(body.outreach.on)) {
      const on = [...new Set(body.outreach.on.filter((v) => OUTREACH[v]))];
      if (!on.length) return json({ ok: false, error: "Keep at least one industry switched on." }, 400);
      const tg = {};
      for (const [v, n] of Object.entries(body.outreach.targets || {})) if (OUTREACH[v] && Number(n) >= 1 && Number(n) <= 500) tg[v] = Math.round(Number(n));
      await saveSetting(env, "outreach", { on, updated_at: new Date().toISOString() });
      if (Object.keys(tg).length) await saveSetting(env, "campaign", { ...cur.campaign || {}, targets: { ...(cur.campaign || {}).targets || {}, ...tg } });
    }
    if (body.campaign && typeof body.campaign === "object") {
      const c = { ...cur.campaign || {} };
      for (const k of ["name", "workflow_name", "entry_tag"]) if (typeof body.campaign[k] === "string" && body.campaign[k].trim()) c[k] = body.campaign[k].trim().slice(0, 120);
      if (["tag", "api"].includes(body.campaign.enrol_method)) c.enrol_method = body.campaign.enrol_method;
      if (typeof body.campaign.workflow_confirmed === "boolean") c.workflow_confirmed = body.campaign.workflow_confirmed;
      if (Number(body.campaign.daily_cap) >= 1 && Number(body.campaign.daily_cap) <= 200) c.daily_cap = Math.round(Number(body.campaign.daily_cap));
      await saveSetting(env, "campaign", c);
    }
    if (typeof body.charter === "string") {
      const c = body.charter.trim();
      if (c.length < 200) return json({ ok: false, error: "The charter looks too short; keep the key sections." }, 400);
      await saveSetting(env, "charter", c.slice(0, 2e4));
    }
    if (body.offer && typeof body.offer === "object") {
      const o = {};
      for (const k of ["payment_link", "payment_link_voice"]) {
        const link2 = body.offer[k];
        if (typeof link2 === "string") {
          if (link2 && !/^https:\/\/[^\s"<>]+$/.test(link2.trim())) return json({ ok: false, error: "The payment link must start with https://" }, 400);
          o[k] = link2.trim();
        }
      }
      for (const k of ["pilot_price", "monthly", "pilot_price_voice", "monthly_voice", "setup_voice", "pilot_days", "live_hours", "refund_days"]) if (Number.isFinite(+body.offer[k]) && +body.offer[k] >= 0 && body.offer[k] !== "" && body.offer[k] != null) o[k] = Math.round(+body.offer[k]);
      if (body.offer.chat_enabled != null) o.chat_enabled = !!body.offer.chat_enabled;
      // v129 saving the offer confirms the new price list (and any new Stripe links are for the new prices)
      const was = cur.offer || {}, migrated = !(+was.prices_v >= 2);
      await saveSetting(env, "offer", { ...(migrated ? { ...was, pilot_price_voice: 2197, monthly_voice: 697, setup_voice: 1500, chat_enabled: false, payment_link: "", payment_link_voice: "" } : was), ...o, prices_v: 2 });
      await audit(env, { actor: "Ty", action: "offer_updated", summary: `Offer updated: ${Object.keys(o).join(", ")}` }).catch(() => {
      });
    }
    if (body.inbox && typeof body.inbox === "object") {
      const ib = { ...inboxSettings(cur) };
      for (const k of INBOX_MODE_KEYS) if (["off", "approve", "auto"].includes(body.inbox[k])) ib[k] = body.inbox[k];
      if (typeof body.inbox.sms_live === "boolean") ib.sms_live = body.inbox.sms_live;
      if (typeof body.inbox.review_link === "string") { const rl = body.inbox.review_link.trim(); if (rl && !/^https:\/\/\S{8,300}$/.test(rl)) throw new Error("The review link should start with https://"); ib.review_link = rl; }
      await saveSetting(env, "inbox", ib);
      await audit(env, { actor: "Ty", action: "inbox_updated", summary: "Message replies: " + Object.entries(ib).map(([k, v]) => k + " " + v).join(", ") }).catch(() => {});
    }
    if (body.command && typeof body.command.auto === "boolean") await saveSetting(env, "command", { ...cur.command || {}, auto: body.command.auto });
    if (body.pricing && typeof body.pricing === "object") {
      const next = { ...pricing(cur) };
      for (const k of PRICING_KEYS) {
        const v = Number(body.pricing[k]);
        if (Number.isFinite(v) && v >= 0 && v < 1e5) next[k] = v;
      }
      await saveSetting(env, "pricing", next);
    }
    if (body.site && typeof body.site === "object") {
      const next = { ...cur.site };
      for (const k of ["public_v2", "command_v2", "command_classic"]) if (typeof body.site[k] === "boolean") next[k] = body.site[k];
      await saveSetting(env, "site", next);
      clearSiteCache();
    }
    return json({ ok: true, settings: await getSettings(env) });
  }
  if (p === "/prospects" && m === "GET") {
    const status = url.searchParams.get("status");
    const q2 = ["order=score.desc.nullslast,created_at.desc", "limit=60"];
    if (status) q2.push(`status=eq.${enc3(status)}`);
    return json({ ok: true, prospects: await select(env, "agent_prospects", q2.join("&")) });
  }
  if (p === "/campaign" && m === "GET") {
    const settings = await getSettings(env);
    const [setup, stats] = await Promise.all([campaignSetup(env, settings, { fresh: url.searchParams.get("fresh") === "1" }).catch((e) => ({ ok: false, problems: [e.message] })), campaignStats(env, settings).catch((e) => ({ ok: false, error: e.message }))]);
    return json({ ok: true, setup, stats, config: campaignConfig(settings) });
  }
  if (p === "/hunt" && m === "GET") return json({ ok: true, hunts: ((await getSettings(env)).hunts || []).map(({ candidates, ...j }) => ({ ...j, candidates: (candidates || []).map((c) => ({ name: c.business_name, state: c.state })) })) });
  if (p === "/hunt/start" && m === "POST") {
    if (!env.ANTHROPIC_API_KEY) return json({ ok: false, error: "ANTHROPIC_API_KEY is missing." }, 503);
    const job = await startHunt(env, { vertical: body.vertical, city: body.city, count: body.count, source: "prospect_hunt" });
    await audit(env, { actor: "Ty", action: "hunt_started", target_type: "hunt", target_id: job.id, summary: `${job.vertical} in ${job.city}: ${job.candidates.length} candidates` });
    return json({ ok: true, hunt: slim(job) });
  }
  if (p === "/hunt/step" && m === "POST") {
    try {
      return json({ ok: true, hunt: slim(await huntStep(env, String(body.id || ""))) });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (p === "/telegram" && m === "GET") return json(await telegramStatus(env));
  if (p === "/telegram/setup" && m === "POST") {
    try {
      return json(await setupTelegram(env, url.origin));
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (p === "/telegram/test" && m === "POST") return json({ ok: true, ...await notify(env, await digest(env), { urgent: true }) });
  if (p === "/charter" && m === "GET") {
    const st = await getSettings(env);
    { const i130 = await instGet(env).catch(() => null); if (i130?.custom && charterOf(st) === DEFAULT_CHARTER) { await instBrief(env, i130).catch(() => ""); return json({ ok: true, charter: instSwapCharter(DEFAULT_CHARTER), is_default: true, command_auto: st.command?.auto !== false }); } }
    return json({ ok: true, charter: charterOf(st), is_default: charterOf(st) === DEFAULT_CHARTER, command_auto: st.command?.auto !== false });
  }
  if (p === "/rescan" && m === "GET") return json({ ok: true, ...await rescanStatus(env), renderer: rendererReady(env) });
  if (p === "/rescan" && m === "POST") {
    const job = await startRescan(env, { limit: body.limit });
    await audit(env, { actor: "Ty", action: "rescan_started", target_type: "hunt", target_id: job.id, summary: `Re-scanning ${job.candidates.length} prospects with the new scanner` });
    return json({ ok: true, hunt: slim(job) });
  }
  if (seg[0] === "book") return bookRoute(env, m, seg, body);
  if (seg[0] === "money") return moneyRoute(env, m, seg, body);
  if (seg[0] === "brain") return brainRoute(env, m, seg, body);
  if (p === "/clients" && m === "GET") {
    try {
      return json(await listClients(env));
    } catch (e) {
      return json({ ok: false, clients: [], totals: null, note: "Run supabase/009_clients.sql to switch on Clients." });
    }
  }
  if (p === "/clients" && m === "POST") {
    try {
      const c = await createClient(env, { prospect_id: body.prospect_id, demo_token: body.demo_token, website: body.website, name: body.name, vertical: body.vertical, plan_monthly: body.plan_monthly, pilot_price: body.pilot_price, paid: !!body.paid });
      await audit(env, { actor: "Ty", action: "client_added", target_type: "client", target_id: c.id, summary: `${c.business_name} added as a client` }).catch(() => {
      });
      return json({ ok: true, client: c });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (seg[0] === "clients" && seg[1] && !seg[2] && m === "GET") {
    try {
      return json(await clientDetail(env, seg[1]));
    } catch (e) {
      return json({ ok: false, error: e.message }, 404);
    }
  }
  if (seg[0] === "clients" && seg[1] && !seg[2] && m === "POST") {
    try {
      return json({ ok: true, client: await updateClient(env, seg[1], body) });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (seg[0] === "clients" && seg[1] && seg[2] === "safety" && m === "POST") {
    try {
      return json(await runSafety(env, seg[1], { from: body.from, to: body.to }));
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (seg[0] === "clients" && seg[1] && seg[2] === "refresh" && m === "POST") {
    try {
      return json(await refreshKnowledge(env, seg[1]));
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (seg[0] === "clients" && seg[1] && seg[2] === "test-alert" && m === "POST") {
    try {
      return json(await testAlert(env, seg[1]));
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (p === "/demos" && m === "GET") {
    try {
      const rows = await listDemos(env, +url.searchParams.get("limit") || 50);
      return json({ ok: true, demos: rows.map((d) => ({ ...d, url: demoUrl(env, d.token) })) });
    } catch (e) {
      return json({ ok: false, demos: [], note: "Run supabase/007_demos.sql to switch on demos." });
    }
  }
  if (p === "/demos/build" && m === "POST") {
    try {
      if (body.prospect_id) {
        const [pr] = await select(env, "agent_prospects", `id=eq.${enc(body.prospect_id)}&select=id,business_name,website,vertical,phone&limit=1`);
        if (!pr) return json({ ok: false, error: "Prospect not found." }, 404);
        const d = await buildDemo(env, pr, { force: !!body.force });
        return json({ ok: true, url: d.url + "?preview=1", quality: d.quality, existing: !!d.existing });
      }
      if (body.website) {
        const d = await buildDemo(env, { website: body.website, business_name: body.name || body.website, vertical: body.vertical || "allied" }, { force: true });
        return json({ ok: true, url: d.url + "?preview=1", quality: d.quality });
      }
      return json({ ok: true, ...await continueDemos(env, Math.min(3, +body.limit || 2)) });
    } catch (e) {
      return json({ ok: false, error: String(e.message).slice(0, 300) }, 400);
    }
  }
  if (p === "/scan" && m === "POST") {
    try {
      const { rep, leak } = await scanClinic(env, { url: body.url, vertical: body.vertical || "allied" });
      return json({ ok: true, renderer: rendererReady(env), leak, contact: rep.home ? { emails: rep.home.emails, phones: rep.home.phones } : null });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (p === "/audit" && m === "GET") {
    const rows = await listAudit(env, +url.searchParams.get("limit") || 60);
    return json({ ok: rows !== null, audit: rows || [], note: rows === null ? "Run supabase/006_audit.sql to switch on the audit trail." : void 0 });
  }
  if (p === "/system-check" && m === "GET") return json(await systemCheck(env, Math.min(Math.max(+url.searchParams.get("days") || 7, 1), 60)));
  if (p === "/snapshot" && m === "GET") return json(await outreachSnapshot(env));
  if (seg[0] === "prospects" && seg[1] && seg[2] === "queue" && m === "POST") {
    try {
      return json(await queueProspect(env, seg[1]));
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (p === "/prospects/reconcile" && m === "POST") {
    const r = await reconcileProspects(env, { ghl: ghl_exports });
    await audit(env, { actor: "Ty", action: "tidy", summary: `Re-linked ${r.relinked.length}, back to call list ${r.reset_to_call.length}, skipped ${r.skipped_off_target.length}, holds queued ${r.holds_queued.length}`, details: r });
    return json(r);
  }
  if (p === "/costs" && m === "GET") return json(await costSummary(env, await getSettings(env), Math.min(Math.max(+url.searchParams.get("days") || 30, 1), 365)));
  if (p === "/imports" && m === "GET") return json(await manualImports(env, await getSettings(env), 40));
  if (p === "/replies/check" && m === "POST") return json({ ok: true, ...await checkReplies(env, runAgent, { force: true }) });

  if (p === "/demo-followups" && m === "GET") {
    const rows = await select(env,"team_actions","type=eq.ghl_email&params->>source=eq.demo_followup&order=created_at.desc&limit=100");
    return json({ok:true,paused:await demoFollowupsPaused(env),actions:rows});
  }
  if (p === "/demo-followups" && m === "POST") {
    if (typeof body.paused !== "boolean") return json({ok:false,error:"Choose pause or resume."},400);
    await saveSetting(env,"demo_followups",{paused:body.paused});
    return json({ok:true,paused:body.paused});
  }
  if (seg[0] === "demo-followups" && seg[1] && seg[2] === "cancel" && m === "POST") {
    const [a] = await select(env,"team_actions","id=eq."+enc(seg[1])+"&limit=1");
    if (a?.params?.source !== "demo_followup") return json({ok:false,error:"Follow-up not found."},404);
    return json({ok:true,action:await rejectAction(env,a.id,"Cancelled by Ty")});
  }

  if (p === "/calls" && m === "GET") return json(await callList(env, Math.min(+url.searchParams.get("limit") || 20, 40)));
  if (seg[0] === "prospects" && seg[1] && seg[2] === "demo-email" && seg.length === 3 && m === "POST") {
    try { return json(await callDemoEmailAction(env, seg[1], body)); } catch (e) { return json({ok: false, error: e.message}, 400); }
  }
  if (seg[0] === "prospects" && seg[1] && !seg[2] && m === "POST") {
    const patch = { updated_at: now4() };
    if (["to_send", "sent", "replied", "skipped", "won", "nurture", "needs_research", "queued", "do_not_contact"].includes(body.status)) patch.status = body.status;
    if (typeof body.call_email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.call_email.trim())) {
      const [cur0] = await select(env, "agent_prospects", `id=eq.${enc3(seg[1])}&select=decision_maker&limit=1`);
      patch.email = body.call_email.trim().toLowerCase();
      patch.email_source_url = "given on call";
      patch.consent_basis = `Given by ${cur0?.decision_maker || "the clinic"} on a call with Ty on ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane" })}.`;
    }
    if (["awaiting_decision_maker", "connected", "interested", "booked", "voicemail", "no_answer", "not_interested", "wrong_number"].includes(body.call_status)) {
      patch.call_status = body.call_status==='awaiting_decision_maker'?'connected':body.call_status;
      patch.call_outcome=body.call_status;
      patch.last_call_at = now4();
      if (body.call_notes) patch.call_notes = String(body.call_notes).slice(0, 2e3);
      if (["interested","booked","awaiting_decision_maker"].includes(body.call_status)) patch.status = "replied";
      if (body.call_status === "not_interested" || body.call_status === "wrong_number") patch.status = "skipped";
    }
    const rows = await update(env, "agent_prospects", `id=eq.${enc3(seg[1])}`, patch);
    if (rows[0] && (["replied","won","skipped","do_not_contact","nurture"].includes(body.status) || ["booked","not_interested","wrong_number"].includes(body.call_status))) {
      await stopDemoFollowups(env,seg[1],"Stopped after Ty updated the clinic's outcome.");
    }
    // Saving a call or email never silently enrols a clinic in a cold-outreach campaign.
    if (rows[0]) await audit(env, { actor: "Ty", action: "prospect_status", target_type: "prospect", target_id: seg[1], summary: `${rows[0].business_name}: ${[patch.status, patch.call_outcome && "call " + patch.call_outcome].filter(Boolean).join(", ")}`, details:{note:patch.call_notes||"",call_outcome:patch.call_outcome||null} });
    // v117: nobody picked up → Command drafts one email about the call (published address only, Ty approves)
    if (rows[0] && ["no_answer", "voicemail"].includes(body.call_status)) { const job = noAnswerEmail(env, seg[1], body.call_status).catch((e) => console.error("no-answer email:", e.message)); if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job; }
    return json({ ok: rows.length > 0, prospect: rows[0] || null, ...(rows[0] && ["no_answer", "voicemail"].includes(body.call_status) ? { no_answer_email: "Command is checking their published email and drafting one for your OK on Telegram." } : {}) });
  }
  if (p === "/email-preview" && m === "POST") {
    if (typeof body.body !== "string" || !body.body.trim()) return json({ ok: false, error: "Nothing to preview." }, 400);
    return json({ ok: true, html: brandedEmail({ body: body.body.slice(0, 8e3), cold: !!body.cold, businessName: String(body.business_name || "").slice(0, 120), origin: new URL(request.url).origin }) });
  }
  if (p === "/analyse" && m === "POST") {
    try {
      return json({ ok: true, report: await analyseWebsite(body.url, { pages: Math.min(Math.max(Number(body.pages) || 1, 1), 7) }) });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
  }
  if (p === "/mission" && m === "GET") return json({ ok: true, mission: await computeMission(env, await getSettings(env)) });
  if (seg[0] === "shifts" && seg[1] && seg[2] === "run" && m === "POST") {
    const settings = await getSettings(env);
    const shift = settings.shifts.find((s) => s.id === seg[1]);
    if (!shift) return json({ ok: false, error: "Unknown shift" }, 404);
    const report = await runShift(env, shift, settings);
    return json({ ok: true, report });
  }
  if (p === "/run/briefing" && m === "POST") {
    const { report } = await dailyBriefing(env);
    return json({ ok: true, report: { id: report.id, title: report.title } });
  }
  if (p === "/run/report" && m === "POST") {
    if (!HEADS.includes(body.department)) return json({ ok: false, error: "Unknown department" }, 400);
    const row = await weeklyReportFor(env, body.department);
    return json({ ok: true, report: { id: row.id, title: row.title } });
  }
  if (p === "/run/ceo" && m === "POST") {
    const row = await ceoReview(env);
    return json({ ok: true, report: { id: row.id, title: row.title } });
  }
  return json({ ok: false, error: "Not found" }, 404);
}
async function chat2(env, { department = "chief_of_staff", thread_id, message, maxSteps, job_id, learn = true }) {
  if (!DEPARTMENTS[department]) return { ok: false, error: "Unknown department" };
  message = String(message || "").trim().slice(0, 8e3);
  if (!message) return { ok: false, error: "Empty message" };
  let thread;
  if (thread_id) [thread] = await select(env, "team_threads", `id=eq.${enc3(thread_id)}&limit=1`);
  if (!thread) {
    [thread] = await insert(env, "team_threads", [{ department, title: message.slice(0, 80) }]);
  }
  await insert(env, "team_messages", [{ thread_id: thread.id, role: "user", content: message }]);
  const history = await select(env, "team_messages", `thread_id=eq.${thread.id}&order=created_at.desc&limit=30&select=role,content`);
  const messages = normalise(history.reverse());
  const prevA = history.slice().reverse().filter((h) => h.role === "assistant").pop();
  const learnP = !learn ? Promise.resolve(null) : learnFromTy(env, message, { source: "chat", dept: thread.department, asked: prevA && /\?\s*$/.test(String(prevA.content || "").trim()) ? "The " + (DEPARTMENTS[thread.department]?.name || "team") + " had just asked: " + String(prevA.content).slice(-300) : "" }).catch(() => null);
  const { reply: reply0, run, stopped } = await runAgent(env, thread.department, { messages, threadId: thread.id, maxSteps, source: job_id ? "command_job" : "chat", run:job_id?{actions:[],deliverables:[],consulted:[],tools_used:[],job_id}:null });
  const ln84 = learnNote(await learnP), reply = reply0 + (ln84 ? "\n\n" + ln84 : "");
  const meta2 = { actions: run.actions, deliverables: run.deliverables, consulted: [...new Set(run.consulted)] };
  await insert(env, "team_messages", [{ thread_id: thread.id, role: "assistant", content: reply, meta: meta2 }]);
  await update(env, "team_threads", `id=eq.${thread.id}`, { updated_at: now4() });
  return { ok: true, thread_id: thread.id, department: thread.department, reply, stopped, ...meta2 };
}
function normalise(rows) {
  const out = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.role === r.role) last.content += `

${r.content}`;
    else out.push({ role: r.role, content: r.content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}
async function dailyBriefing(env) {
  const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "long", day: "numeric", month: "long" });
  const { reply, run, stopped } = await runAgent(env, "chief_of_staff", {
    source: "morning_briefing",
    messages: [{
      role: "user",
      content: `It's the morning of ${date}. Write today's MORNING BRIEFING for the owner, using the briefing format in your playbook.
Get what you need yourself first (outreach_snapshot, call_list or leads, mission progress, appointments). Consult another head only if
something in their area looks urgent. Queue any follow-up that clearly needs doing today as an approval action. Keep it short: Ty reads it on his phone.`
    }]
  });
  const [row] = await insert(env, "team_reports", [{ department: "chief_of_staff", kind: "briefing", title: `Morning briefing \u2014 ${date}`, body: reply }]);
  if (reply && !stopped) await voiceBriefing(env, reply).catch((e) => console.error("voice briefing:", e.message));
  return { report: row, run, stopped };
}
var weekEnding = () => (/* @__PURE__ */ new Date()).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", year: "numeric" });
async function weeklyReportFor(env, id) {
  const d = DEPARTMENTS[id];
  const date = weekEnding();
  const { reply, stopped } = await runAgent(env, id, { source: "weekly_reports", messages: [{ role: "user", content: `${d.weekly}
The week ending ${date}. Use your tools for the real numbers.` }], depth: 1 });
  const [row] = await insert(env, "team_reports", [{ department: id, kind: "weekly", title: `${d.name} \u2014 week ending ${date}`, body: reply }]);
  if(stopped)throw Error(stopped);
  return row;
}
async function ceoReview(env) {
  const date = weekEnding();
  const { reply, stopped } = await runAgent(env, "chief_of_staff", {
    source: "weekly_reports",
    messages: [{ role: "user", content: `${DEPARTMENTS.chief_of_staff.weekly}
The department heads have just saved their weekly reports \u2014 read them with get_recent_reports (kind weekly, include_body true) rather than re-consulting everyone.` }]
  });
  const [row] = await insert(env, "team_reports", [{ department: "chief_of_staff", kind: "weekly", title: `Weekly CEO review \u2014 week ending ${date}`, body: reply }]);
  if(stopped)throw Error(stopped);
  return row;
}
async function weeklyReports(env) {
  const results = {};
  const queue = [...HEADS];
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const id = queue.shift();
      try {
        await weeklyReportFor(env, id);
        results[id] = "ok";
      } catch (e) {
        results[id] = e.message;
        console.error(`weekly ${id}:`, e.message);
      }
    }
  }));
  try {
    await ceoReview(env); results.ceo_review="ok";
  } catch (e) {
    results.ceo_review=e.message; console.error("weekly CEO:", e.message);
  }
  return results;
}
async function runShiftLegacy(env, shift, settings, slot = brisbaneNow().slot) {
  try {
    return await runShiftInner(env, shift, settings, slot);
  } catch (e) {
    const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short" });
    const [row] = await insert(env, "team_reports", [{ department: shift.department, kind: "shift", subkind: shift.id, title: `${shift.label} FAILED (${date})`, body: `**This shift stopped with an error.**

- Error: ${String(e.message || e).slice(0, 600)}
- When: ${(/* @__PURE__ */ new Date()).toISOString()}

Anything saved before the error is still in Prospects and Approvals. If it keeps happening, send this report to your developer.` }]).catch(() => []);
    console.error(`shift ${shift.id}:`, e.message);
    return row ? { id: row.id, title: row.title, failed: true } : { failed: true, error: e.message };
  }
}
async function runShiftInner(env, shift, settings, slot) {
  let report;
  if (shift.kind === "hunt") {
    await reconcileProspects(env, { ghl: ghl_exports }).catch(() => {
    });
    const job = await startHunt(env, { source: shift.id });
    let j = job;
    for (let i = 0; i < 2 && j.status === "running"; i++) j = await huntStep(env, job.id);
    report = j.report_id ? { id: j.report_id, title: "Clinic hunt finished" } : { id: null, title: `Clinic hunt running: ${j.done || 0} of ${j.candidates?.length || 0} clinics done`, hunt_id: job.id };
  } else if (shift.kind === "briefing") {
    const briefing=await dailyBriefing(env);report=briefing.report;if(briefing.stopped)return {id:report.id,title:report.title,failed:true,error:briefing.stopped};
  } else if (shift.kind === "weekly") {
    const results=await weeklyReports(env);const failed=Object.values(results).some(x=>x!=="ok");const [summary]=await insert(env,"team_reports",[{department:"chief_of_staff",kind:"shift",subkind:"weekly_reports",title:failed?"Weekly reports need review":"Weekly reports complete",body:JSON.stringify(results,null,2)}]);if(failed)return {id:summary.id,title:summary.title,failed:true,error:"One or more weekly reports stopped. Review the saved summary."};report=summary;
  } else {
    const d = DEPARTMENTS[shift.department];
    let extra = "";
    if (shift.id === "import_review") {
      const imp = await manualImports(env, settings, 15).catch((e) => ({ error: e.message }));
      if (!imp.error && !imp.waiting) {
        const date2 = (/* @__PURE__ */ new Date()).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short" });
        return { id: null, title: `${shift.label}: nothing waiting (${date2})`, skipped: true };
      }
      if (imp.pending) extra = `

Waiting now (from manual_imports): ${JSON.stringify(imp.pending)}`;
    }
    const { reply, stopped } = await runAgent(env, shift.department, { source: shift.id, messages: [{ role: "user", content: `[Scheduled shift: ${shift.label}] ${shift.prompt}${extra}` }] });
    const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short" });
    [report] = await insert(env, "team_reports", [{ department: d.id, kind: "shift", subkind: shift.id, title: `${shift.label}${stopped ? " (stopped early)" : ""} \u2014 ${date}`, body: reply }]);
    if(stopped)return {id:report.id,title:report.title,failed:true,error:stopped};
  }
  try {
    const fresh = await getSettings(env);
    await saveSetting(env, "shifts", fresh.shifts.map((s) => ({ id: s.id, enabled: s.enabled, hour: s.hour, days: s.days, last_run: s.id === shift.id ? slot : s.last_run || null })));
  } catch (e) {
    console.error("shift last_run:", e.message);
  }
  return report ? { ...report } : null;
}

// ── v102 AI cost saver ──
function cacheMore(body) {
  try {
    const count = (x) => (JSON.stringify(x || "").match(/"cache_control"/g) || []).length;
    let n = count(body.system) + count(body.tools) + count(body.messages);
    if (n >= 4) return body;
    let out = body;
    if (Array.isArray(body.system) && body.system.length > 1) {
      const last = body.system[body.system.length - 1];
      const len = body.system.reduce((a, b) => a + String(b?.text || "").length, 0);
      if (last && last.type === "text" && last.text && !last.cache_control && len > 4000) { out = { ...out, system: [...body.system.slice(0, -1), { ...last, cache_control: { type: "ephemeral" } }] }; n++; }
    }
    const msgs = out.messages;
    if (n < 4 && Array.isArray(msgs) && msgs.length >= 3) {
      const i = msgs.length - 1, m = msgs[i];
      const parts = typeof m.content === "string" ? (m.content ? [{ type: "text", text: m.content }] : null) : Array.isArray(m.content) ? m.content.slice() : null;
      if (parts && parts.length) {
        const j = parts.length - 1, lp = parts[j];
        if (lp && !lp.cache_control && ["text", "tool_result", "image", "document"].includes(lp.type) && !(lp.type === "text" && !lp.text)) {
          parts[j] = { ...lp, cache_control: { type: "ephemeral" } };
          out = { ...out, messages: [...msgs.slice(0, i), { ...m, content: parts }] };
        }
      }
    }
    return out;
  } catch { return body; }
}
var LEAN_HAIKU_SOURCES = /^(market_research|marketing_review|finance_check|client_health|brand_radar|systems_review|ops_health|weekly_reports|content_plan|team_leader|coach)/;
var LEAN_SKIP_SHIFTS = new Set(["prospect_hunt_pm", "prospect_hunt_eve"]);
var LEAN_FORTNIGHTLY = new Set(["market_research", "brand_radar", "authority_content", "email_nurture"]);
var leanFast = (env) => env.LEAN_MODEL || "claude-haiku-5-5";
async function leanState(env, { refresh = false } = {}) {
  const r = await select(env, "team_settings", "key=eq.ai_lean&select=value&limit=1").catch(() => []);
  const st = r?.[0]?.value || {};
  const mode = ["on", "off"].includes(st.mode) ? st.mode : "auto";
  const today = brisbaneNow().date;
  if (mode === "auto" && (refresh || st.checked !== today)) {
    const inst = await instGet(env).catch(() => null);
    if (inst?.custom || inst?.modules?.outreach === false) { st.revenue_30d = null; st.auto_lean = false; st.note = "client copy"; }
    else if (!env.STRIPE_SECRET_KEY) { st.revenue_30d = null; st.auto_lean = false; st.note = "Stripe not connected"; }
    else {
      try { const rv = await revenueSummary(env, 30); st.revenue_30d = Number(rv?.current?.net) || 0; st.auto_lean = st.revenue_30d <= 0; st.note = ""; }
      catch (e) { st.auto_lean = false; st.note = "couldn't read Stripe: " + String(e.message).slice(0, 100); }
    }
    st.checked = today;
    await saveSetting(env, "ai_lean", st).catch(() => {});
  }
  const lean = mode === "on" ? true : mode === "off" ? false : !!st.auto_lean;
  const cap = Number(st.bg_cap_usd) > 0 ? Number(st.bg_cap_usd) : lean ? 3 : 12;
  return { mode, lean, revenue_30d: st.revenue_30d ?? null, note: st.note || "", bg_cap_usd: cap, checked: st.checked || null };
}
async function aiSpendToday(env) {
  const b = brisbaneNow();
  const start = new Date(Date.parse(b.date + "T00:00:00+10:00")).toISOString();
  const rows = await select(env, "team_usage", "created_at=gte." + encodeURIComponent(start) + "&select=cost_usd,source&limit=5000").catch(() => []);
  return Math.round(rows.reduce((a, x) => a + (Number(x.cost_usd) || 0), 0) * 100) / 100;
}
async function bgHeld(env) {
  const ls = await leanState(env).catch(() => ({ lean: false, bg_cap_usd: 12 }));
  const spent = await aiSpendToday(env).catch(() => 0);
  return { held: spent >= ls.bg_cap_usd, spent, ...ls };
}
function leanShiftSkip(id, lean, dateStr) {
  if (!lean) return false;
  if (LEAN_SKIP_SHIFTS.has(id)) return true;
  if (LEAN_FORTNIGHTLY.has(id)) { const d = new Date(Date.parse(dateStr + "T00:00:00Z")); const wk = Math.floor((d.getTime() / 864e5 + 3) / 7); return wk % 2 === 1; }
  return false;
}

async function runDueShifts(env, when = /* @__PURE__ */ new Date()) {
  const settings = await getSettings(env);
  const t = brisbaneNow(when);
  const ls102 = await leanState(env).catch(() => ({ lean: false }));
  const due = settings.shifts.filter((s) => s.enabled && s.hour === t.hour && s.days.includes(t.dow) && s.last_run !== t.slot && !leanShiftSkip(s.id, ls102.lean, t.date) && !(s.monthly && Number(String(t.date).slice(8, 10)) > 7));
  const results = {};
  for (const s of due) {
    try {
      await runShift(env, s, settings, t.slot);
      results[s.id] = "ok";
    } catch (e) {
      results[s.id] = e.message;
      console.error(`shift ${s.id}:`, e.message);
    }
  }
  return { slot: t.slot, ran: results };
}
async function summary(env) {
  const [pending, reports, briefing, autoToday] = await Promise.all([
    select(env, "team_actions", "status=eq.pending&type=neq.owner_task&select=id,department,title,created_at&order=created_at.desc&limit=100"),
    select(env, "team_reports", "select=department,kind,title,created_at&order=created_at.desc&limit=100"),
    select(env, "team_reports", "kind=eq.briefing&order=created_at.desc&limit=1"),
    select(env, "team_actions", `auto=is.true&created_at=gte.${enc3(hoursAgo3(24))}&select=id`).catch(() => [])
  ]);
  const departments = publicDepartments().map((d) => {
    const last = reports.find((r) => r.department === d.id);
    return { ...d, pending_approvals: pending.filter((a) => a.department === d.id).length, last_report: last ? { title: last.title, at: last.created_at } : null };
  });
  const b = briefing[0];
  return {
    ok: true,
    pending_approvals: pending.length,
    autopilot_24h: autoToday.length,
    latest_briefing: b ? { id: b.id, title: b.title, at: b.created_at, preview: b.body.slice(0, 600) } : null,
    departments
  };
}
async function health(env) {
  const out = { ok: Boolean(env.ANTHROPIC_API_KEY), claude: Boolean(env.ANTHROPIC_API_KEY), stripe_write: env.STRIPE_CAN_WRITE === "true", ghl: enabled(env), ghl_calendar: true, calendars: 3, stripe: enabled2(env), web_search: env.ENABLE_WEB_SEARCH === "true" };
  try {
    await select(env, "team_memory", "limit=1&select=id");
    out.supabase_team_tables = true;
  } catch (e) {
    out.supabase_team_tables = false;
    out.ok = false;
    out.error = "Team tables missing: run supabase/002_team.sql";
  }
  out.departments = DEPARTMENT_IDS.length;
  out.ai_gateway = Boolean(aigTarget(env)) && Date.now() >= (globalThis.__sfAigDown || 0);
  return out;
}
var slim = ({ candidates, ...j }) => ({ ...j, candidates: (candidates || []).map((c) => ({ name: c.business_name, state: c.state })) });



// ── v132 Get set up: a client's own guided onboarding. Every step is checked live (not just ticked),
// keys are pasted in the app (checked first, stored sealed in their own copy, never shown again),
// and Studio's console sees their progress over the fleet link (never their keys or data). ──
var SG_STEPS = [
  { id: "brand", title: "Your brand", why: "Your name, logo and colours on every screen.", how: "Settings › Brand & features: upload your logo and pick your colours.", go: "brand" },
  { id: "brief", title: "What your business does", why: "Your AI team works from this: services, prices and who you help.", how: "Settings › Brand & features › What the business does. Two or three sentences is plenty.", go: "brand" },
  { id: "faceid", title: "Face ID sign-in", why: "Signing in with your face or fingerprint, no passwords.", how: "Settings › Security › Add Face ID on this device.", go: "security" },
  { id: "team", title: "Your team", why: "Invite the people who'll use it, each with their own sign-in.", how: "Settings › Security › Invite someone. Just you? Tap “It's just me”.", go: "security", manual: "It's just me" },
  { id: "telegram", title: "Telegram on your phone", why: "Your morning brief, alerts and one-tap approvals.", how: "Paste your Telegram bot token below, then tap the link it gives you.", key: "telegram" },
  { id: "ghl", title: "Your CRM (GoHighLevel)", why: "So your AI can answer enquiries, follow up and book.", how: "In GoHighLevel: Settings › Private Integrations › Create, tick contacts, conversations, calendars and opportunities, then copy the token. Your Location ID is in Settings › Business Profile.", key: "ghl" },
  { id: "stripe", title: "Payments (Stripe)", why: "So it can see what's paid and chase what isn't. Read-only: it can never move money.", how: "In Stripe: Developers › API keys › Create restricted key, set everything to Read, then copy the key (it starts rk_).", key: "stripe" },
  { id: "phone", title: "Phone and missed-call text-back", why: "Every missed call gets a text back in seconds.", how: "We switch this on with you on your onboarding call. Tick it once it's working.", manual: "It's working" },
  { id: "website", title: "Chat on your website", why: "Visitors get answers and book at any hour.", how: "We add it to your website with you. Tick it once you've seen it live.", manual: "It's on my website" },
  { id: "goal", title: "Your first goal", why: "Your team plans every week around it.", how: "Today › Goals: set what you want each week (for example 20 new bookings).", go: "goals" },
  { id: "test", title: "Try it", why: "Send it a test enquiry and see how it answers.", how: "Talk to it like a customer would: “Hi, do you have anything Thursday?”", go: "studio", manual: "I've tried it" }
];
async function sgLive(env, kind) {
  try {
    if (kind === "ghl") { if (!env.GHL_TOKEN || !env.GHL_LOCATION_ID) return false; const r = await fetch("https://services.leadconnectorhq.com/locations/" + encodeURIComponent(env.GHL_LOCATION_ID), { headers: { Authorization: "Bearer " + env.GHL_TOKEN, Version: "2021-07-28", Accept: "application/json" }, signal: AbortSignal.timeout(8e3) }); return r.ok; }
    if (kind === "stripe") { const k = env.STRIPE_READ_KEY; if (!k) return false; const r = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: "Bearer " + k }, signal: AbortSignal.timeout(8e3) }); return r.ok; }
    if (kind === "telegram") { if (!env.TELEGRAM_BOT_TOKEN) return false; const r = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/getMe", { signal: AbortSignal.timeout(8e3) }); return !!(await r.json().catch(() => ({}))).ok; }
  } catch {}
  return false;
}
async function setupGuideState(env, { live = true } = {}) {
  const st = await secGet(env, "setup_guide").catch(() => null) || {};
  const raw = await secGet(env, "instance").catch(() => null) || {};
  const kb = await secGet(env, "instance_kb").catch(() => null) || {};
  const settings = await getSettings(env).catch(() => ({}));
  const M = await memLoad(env).catch(() => ({ users: [], invites: [] }));
  const people = (M.users || []).filter((u) => !u.disabled && u.id !== SUPPORT_ID);
  let goal = false; try { goal = !!(await goalCfg(env)); } catch {}
  let livec = st.live || {};
  if (live && (!st.live_at || Date.now() - st.live_at > 10 * 6e4)) {
    const [ghl, stripe, telegram] = await Promise.all(["ghl", "stripe", "telegram"].map((k) => sgLive(env, k)));
    livec = { ghl, stripe, telegram };
    await secPut(env, "setup_guide", { ...st, live: livec, live_at: Date.now() }).catch(() => {});
  }
  const manual = st.done || {};
  const check = {
    brand: !!(raw.colours?.primary || raw.assets_v),
    brief: String(raw.brief || "").trim().length >= 40 || (Array.isArray(kb.services) && kb.services.length > 0),
    faceid: people.some((u) => u.role === "owner" && (u.creds || []).length),
    team: people.length > 1 || (M.invites || []).some((x) => !x.existing) || !!manual.team,
    telegram: !!livec.telegram && !!settings.telegram?.chat_id,
    ghl: !!livec.ghl, stripe: !!livec.stripe,
    phone: !!manual.phone, website: !!manual.website, goal, test: !!manual.test
  };
  const steps = SG_STEPS.map((x) => ({ ...x, done: !!check[x.id], connected_by: x.key && st.keys_by?.[x.key] ? st.keys_by[x.key] : null }));
  const done = steps.filter((x) => x.done).length;
  return { ok: true, steps, done, total: steps.length, complete: done === steps.length, next: (steps.find((x) => !x.done) || {}).title || null, dismissed: !!st.dismissed, started_at: st.started_at || null, telegram_bot: settings.telegram?.bot || null, telegram_linked: !!settings.telegram?.chat_id };
}
async function setupGuideRoute(p, m, body, env, request, url) {
  const J = (o, s = 200) => json(o, s);
  const mh = request.headers.get("x-sf-member") || "", owner = !mh || mh.split("|")[1] === "owner";
  if (p === "/setup-guide" && m === "GET") { const st = await secGet(env, "setup_guide").catch(() => null) || {}; if (!st.started_at) await secPut(env, "setup_guide", { ...st, started_at: new Date().toISOString() }).catch(() => {}); return J(await setupGuideState(env, { live: url.searchParams.get("fresh") !== "0" })); }
  if (!owner) return J({ ok: false, error: "Only the owner can change the set-up." }, 403);
  if (p === "/setup-guide/tick" && m === "POST") {
    const id = String(body.id || ""); if (!SG_STEPS.some((x) => x.id === id && x.manual)) return J({ ok: false, error: "That step is checked automatically." }, 400);
    const st = await secGet(env, "setup_guide").catch(() => null) || {};
    await secPut(env, "setup_guide", { ...st, done: { ...(st.done || {}), [id]: body.done !== false } });
    return J(await setupGuideState(env, { live: false }));
  }
  if (p === "/setup-guide/dismiss" && m === "POST") { const st = await secGet(env, "setup_guide").catch(() => null) || {}; await secPut(env, "setup_guide", { ...st, dismissed: body.dismissed !== false }); return J({ ok: true }); }
  if (p === "/setup-guide/key" && m === "POST") {
    const kind = String(body.kind || ""), tok = String(body.token || "").trim(), who = mh ? decodeURIComponent(mh.split("|")[2] || "") : "Owner";
    if (!["ghl", "stripe", "telegram"].includes(kind)) return J({ ok: false, error: "Unknown connection." }, 400);
    if (!tok || tok.length > 400 || /\s/.test(tok)) return J({ ok: false, error: "Paste the whole key, with no spaces." }, 400);
    const set = {};
    if (kind === "stripe") {
      if (/^sk_live_/.test(tok)) return J({ ok: false, error: "That's your secret key, which can move money. Make a restricted key with Read access instead (it starts rk_live_)." }, 400);
      if (!/^rk_(live|test)_/.test(tok)) return J({ ok: false, error: "That doesn't look like a Stripe restricted key (it starts rk_live_)." }, 400);
      if (!await sgLive({ STRIPE_READ_KEY: tok }, "stripe")) return J({ ok: false, error: "Stripe didn't accept that key. Check it has Read access to Balance, then paste it again." }, 400);
      set.STRIPE_READ_KEY = tok;
    }
    if (kind === "ghl") {
      const loc = String(body.location_id || "").trim();
      if (!/^[A-Za-z0-9]{10,40}$/.test(loc)) return J({ ok: false, error: "Add your Location ID too (Settings › Business Profile in GoHighLevel)." }, 400);
      if (!await sgLive({ GHL_TOKEN: tok, GHL_LOCATION_ID: loc }, "ghl")) return J({ ok: false, error: "GoHighLevel didn't accept that token for that Location ID. Check the token's scopes and the ID, then try again." }, 400);
      set.GHL_TOKEN = tok; set.GHL_LOCATION_ID = loc;
    }
    if (kind === "telegram") {
      if (!/^\d{5,15}:[A-Za-z0-9_-]{30,50}$/.test(tok)) return J({ ok: false, error: "That doesn't look like a Telegram bot token (it looks like 123456789:ABC...). Get it from @BotFather." }, 400);
      if (!await sgLive({ TELEGRAM_BOT_TOKEN: tok }, "telegram")) return J({ ok: false, error: "Telegram didn't accept that token. Copy it again from @BotFather." }, 400);
      set.TELEGRAM_BOT_TOKEN = tok;
    }
    const cur = await secGet(env, "client_keys").catch(() => null) || {};
    for (const [k, v] of Object.entries(set)) cur[k] = await seal(env, v);
    await secPut(env, "client_keys", cur);
    globalThis.__SF_CLIENT_KEYS = null;
    const st = await secGet(env, "setup_guide").catch(() => null) || {};
    await secPut(env, "setup_guide", { ...st, live_at: 0, keys_by: { ...(st.keys_by || {}), [kind]: { by: who, at: new Date().toISOString(), ends: tok.slice(-4) } } });
    await secLog(env, { actor: who, action: "key_connected", summary: `${who} connected ${({ ghl: "GoHighLevel", stripe: "Stripe (read-only)", telegram: "Telegram" })[kind]} (key ending ${tok.slice(-4)})` }).catch(() => {});
    const out = { ok: true, connected: kind, ends: tok.slice(-4) };
    if (kind === "telegram") { try { out.telegram = await setupTelegram({ ...env, ...set }, url.origin); } catch (e) { out.telegram_error = String(e.message).slice(0, 160); } }
    return J(out);
  }
  return null;
}
// For the Studio console: progress only (no keys, no data).
async function setupProgress(env) {
  if (!(await instGet(env).catch(() => ({}))).custom) return null;
  const s = await setupGuideState(env, { live: false }).catch(() => null);
  return s ? { done: s.done, total: s.total, next: s.next, started_at: s.started_at, stuck: s.steps.filter((x) => !x.done).map((x) => x.id) } : null;
}
// Daily: a gentle nudge to the client if set-up has stalled for 2 days, and a heads-up to Studio (via the console).
async function setupNudge(env) {
  if (!(await instGet(env).catch(() => ({}))).custom) return CRON_NOT_DUE;
  const st = await secGet(env, "setup_guide").catch(() => null) || {};
  if (!st.started_at || Date.now() - Date.parse(st.started_at) < 2 * 864e5) return CRON_NOT_DUE;
  if (st.nudged_at && Date.now() - Date.parse(st.nudged_at) < 2 * 864e5) return CRON_NOT_DUE;
  const s = await setupGuideState(env, { live: true });
  if (s.complete) return { complete: true };
  await secPut(env, "setup_guide", { ...(await secGet(env, "setup_guide").catch(() => null) || {}), nudged_at: new Date().toISOString() });
  await notify(env, `🧭 <b>You're ${s.done} of ${s.total} steps set up</b>\nNext: ${esc2(s.next)}. Open Command › Settings › Get set up, or reply here if you're stuck and we'll help.`).catch(() => {});
  return { nudged: true, done: s.done };
}
