// src/team/fleet.js (v44): Studio console. Every client copy, its health, version, AI spend and support access.
async function fleetInfo(env) {
  const month = new Date(); month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0);
  const [usage, pending, last, M] = await Promise.all([
    select(env, "team_usage", `created_at=gte.${month.toISOString()}&select=cost_aud&limit=5000`).catch(() => []),
    select(env, "team_actions", "status=eq.pending&select=id&limit=500").catch(() => []),
    select(env, "studio_command_records", "select=occurred_at&order=occurred_at.desc&limit=1").catch(() => []),
    memLoad(env).catch(() => ({ users: [] }))
  ]);
  const fuCap = Number((await secGet(env, "fair_use").catch(() => null) || {}).monthly_aud) || null;
  const setup = await setupProgress(env).catch(() => null);
  return { ok: true, version: APP.v, setup, fair_use_aud: fuCap, ai_spend_month_aud: Math.round(usage.reduce((a, r) => a + (+r.cost_aud || 0), 0) * 100) / 100, approvals_waiting: pending.length, last_activity_at: last[0]?.occurred_at || null, people: M.users.filter((u) => !u.disabled && u.id !== SUPPORT_ID).length, passkeys: M.users.reduce((a, u) => a + (u.id === SUPPORT_ID ? 0 : (u.creds || []).length), 0) };
}
async function fleetFairUseWatch(env) {
  const seen = await secGet(env, "fleet_fair_use_alerts").catch(() => null) || {};
  if (seen.checked_at && Date.now() - Date.parse(seen.checked_at) < 6 * 36e5) return;
  const items = await fleetList(env), month = aiMonth(), sent = seen.month === month ? seen.sent || {} : {};
  for (const it of items) {
    const st = await fleetCall(env, it, "status").catch(() => null);
    // v132 heads-up when a client's set-up has stalled for 2+ days (once a day per client)
    const su = st?.setup, day = new Date().toISOString().slice(0, 10);
    if (su && su.done < su.total && su.started_at && Date.now() - Date.parse(su.started_at) > 2 * 864e5 && (seen.setup || {})[it.id] !== day) {
      seen.setup = { ...(seen.setup || {}), [it.id]: day };
      await notify(env, "🧭 <b>" + String(it.business || "").replace(/[<>&]/g, "") + " is " + su.done + " of " + su.total + " set up</b>\nStuck on: " + String(su.next || "").replace(/[<>&]/g, "") + ". Worth a quick call. (Clients › Client Commands)").catch(() => {});
    }
    const cap = Number(st?.fair_use_aud) || 0, spend = Number(st?.ai_spend_month_aud) || 0;
    if (!cap) continue;
    const pct = Math.round(spend / cap * 100), level = pct >= 100 ? 100 : pct >= 80 ? 80 : 0;
    if (!level || (sent[it.id] || 0) >= level) continue;
    sent[it.id] = level;
    await notify(env, (level >= 100 ? "⏸ <b>" + String(it.business || "").replace(/[<>&]/g, "") + " hit their fair-use AI cap</b>\nTheir background AI work is paused until the 1st (chat, inbox and phone keep running)." : "📈 <b>" + String(it.business || "").replace(/[<>&]/g, "") + " is at " + pct + "% of their fair-use AI cap</b>") + "\nAI cost this month $" + spend.toFixed(2) + " of a $" + cap.toFixed(0) + " cap" + (it.plan_aud ? " · they pay $" + it.plan_aud + "/mo" : "") + ". Raise the cap or talk about the next plan up in Clients › Client Commands.").catch(() => {});
  }
  await secPut(env, "fleet_fair_use_alerts", { month, sent, setup: seen.setup || {}, checked_at: new Date().toISOString() });
}
async function fleetList(env) { const x = await secGet(env, "fleet").catch(() => null); return Array.isArray(x?.items) ? x.items : []; }
async function fleetCall(env, item, path, init = {}) {
  const token = await unseal(env, item.token);
  const r = await fetch(item.host + "/api/v1/fleet/" + path, { ...init, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, signal: AbortSignal.timeout(8e3) });
  const j = await r.json().catch(() => ({ ok: false, error: "No answer (HTTP " + r.status + ")" }));
  return { status: r.status, ...j };
}
function fleetDecode(code) {
  const c = String(code || "").trim().replace(/^SFC1\./, "");
  let o;
  try { o = JSON.parse(atob(c.replace(/-/g, "+").replace(/_/g, "/"))); } catch { throw new Error("That connect code isn't right. Copy it again from the client's setup file."); }
  const host = String(o.h || "").replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(host) || !/^[a-f0-9]{32,64}$/.test(o.t || "")) throw new Error("That connect code isn't right.");
  return { host, token: o.t, business: String(o.b || "").slice(0, 80) };
}
async function fleetRoute(p, m, body, env, url, seg) {
  const J = (o, s = 200) => json(o, s);
  if (p === "/fleet-info" && m === "GET") return J(await fleetInfo(env));
  if (p === "/fair-use-check" && m === "POST") return J({ ok: true, status: await fairUseCheck(env) });
  if (seg[0] !== "fleet") return null;
  if ((await instGet(env)).custom) return J({ ok: false, error: "Not found." }, 404);
  try {
    const items = await fleetList(env);
    if (p === "/fleet" && m === "GET") {
      const live = await Promise.all(items.map((it) => fleetCall(env, it, "status").catch((e) => ({ ok: false, error: String(e.message || e).slice(0, 120) }))));
      return J({ ok: true, my_version: APP.v, items: items.map((it, i) => ({ id: it.id, business: live[i].business || it.business, host: it.host, added: it.added, plan_aud: Number(it.plan_aud) > 0 ? Number(it.plan_aud) : null, tier: (live[i].ok && live[i].tier) || it.tier || "core", hosting_aud: FLEET_HOSTING_AUD, live: live[i].ok ? live[i] : null, error: live[i].ok ? null : live[i].error || "Not reachable", up_to_date: live[i].ok ? live[i].version === APP.v : null })) });
    }
    if (p === "/fleet/add" && m === "POST") {
      const c = fleetDecode(body.code);
      if (items.some((x) => x.host === c.host)) return J({ ok: false, error: "That client is already connected." }, 400);
      if (c.host === url.origin) return J({ ok: false, error: "That's this Command." }, 400);
      const item = { id: crypto.randomUUID().slice(0, 8), host: c.host, business: c.business, token: await seal(env, c.token), added: new Date().toISOString() };
      const test = await fleetCall(env, item, "status").catch((e) => ({ ok: false, error: e.message }));
      if (!test.ok) return J({ ok: false, error: "Couldn't reach that client's Command: " + (test.error || "no answer") }, 400);
      item.business = test.business || c.business;
      await secPut(env, "fleet", { items: [...items, item] });
      await secLog(env, { actor: "Ty", action: "fleet_added", summary: `Connected ${item.business} (${item.host}) to the Studio console` });
      return J({ ok: true, business: item.business });
    }
    const it = items.find((x) => x.id === seg[1]);
    if (!it) return J({ ok: false, error: "Client not found." }, 404);
    if (seg[2] === "support" && m === "POST") {
      const r = await fleetCall(env, it, "support-request", { method: "POST", body: JSON.stringify({ by: "Studio Flow (Ty)", reason: String(body.reason || "").slice(0, 300) }) });
      await secLog(env, { actor: "Ty", action: "fleet_support_requested", summary: `Asked ${it.business} for 24-hour support access` });
      return J({ ok: r.ok !== false, state: r.status, until: r.until || null, error: r.error || null });
    }
    if (seg[2] === "open" && m === "POST") {
      const r = await fleetCall(env, it, "support-session");
      if (!r.ok) return J({ ok: false, error: r.error || "Support access isn't approved yet." }, 403);
      return J({ ok: true, url: r.url, until: r.until });
    }
    if (seg[2] === "fair-use" && m === "POST") {
      const r = await fleetCall(env, it, "fair-use", { method: "POST", body: JSON.stringify({ monthly_aud: Number(body.monthly_aud) }) }).catch((e) => ({ ok: false, error: e.message }));
      if (!r.ok) return J({ ok: false, error: r.error || "Couldn't reach their Command. Is it updated to v70?" }, 502);
      await secLog(env, { actor: "Ty", action: "fleet_fair_use_set", summary: `Set ${it.business}'s fair-use AI cap to $${Number(body.monthly_aud)}/month` });
      return J({ ok: true });
    }
    if (seg[2] === "plan" && m === "POST" && (body.tier === "core" || body.tier === "company")) {
      const r = await fleetCall(env, it, "plan", { method: "POST", body: JSON.stringify({ tier: body.tier }) }).catch((e) => ({ ok: false, error: e.message }));
      if (!r.ok) return J({ ok: false, error: r.error || "Couldn't reach their Command. Is it updated to v49?" }, 502);
      await secPut(env, "fleet", { items: items.map((x) => x.id === it.id ? { ...x, tier: body.tier } : x) });
      await secLog(env, { actor: "Ty", action: "fleet_tier_set", summary: `Set ${it.business}'s plan to ${body.tier === "company" ? "Full Company" : "Core Team"}` });
      return J({ ok: true, tier: body.tier });
    }
    if (seg[2] === "plan" && m === "POST") {
      const v = Number(body.plan_aud);
      if (!(v >= 0 && v <= 1e5)) return J({ ok: false, error: "Enter what they pay per month, in dollars." }, 400);
      await secPut(env, "fleet", { items: items.map((x) => x.id === it.id ? { ...x, plan_aud: Math.round(v * 100) / 100 } : x) });
      await secLog(env, { actor: "Ty", action: "fleet_plan_set", summary: `Set ${it.business}'s plan to $${v}/month` });
      return J({ ok: true });
    }
    if (seg[2] === "remove" && m === "POST") {
      await secPut(env, "fleet", { items: items.filter((x) => x.id !== it.id) });
      await secLog(env, { actor: "Ty", action: "fleet_removed", summary: `Disconnected ${it.business} from the Studio console` });
      return J({ ok: true });
    }
  } catch (e) {
    return J({ ok: false, error: String(e.message || e).slice(0, 200) }, 400);
  }
  return null;
}

