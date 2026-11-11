// Rough monthly hosting per client copy (its own Supabase database); Cloudflare is shared.
var FLEET_HOSTING_AUD = 15;
// src/team/fleet.js (v44): Studio console. Every client copy, its health, version, AI spend and support access.
async function fleetInfo(env) {
  const month = new Date(); month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0);
  const [usage, pending, last, M] = await Promise.all([
    select(env, "team_usage", `created_at=gte.${month.toISOString()}&select=cost_aud&limit=5000`).catch(() => []),
    select(env, "team_actions", "status=eq.pending&select=id&limit=500").catch(() => []),
    select(env, "studio_command_records", "select=occurred_at&order=occurred_at.desc&limit=1").catch(() => []),
    memLoad(env).catch(() => ({ users: [] }))
  ]);
  return { ok: true, version: APP.v, ai_spend_month_aud: Math.round(usage.reduce((a, r) => a + (+r.cost_aud || 0), 0) * 100) / 100, approvals_waiting: pending.length, last_activity_at: last[0]?.occurred_at || null, people: M.users.filter((u) => !u.disabled && u.id !== SUPPORT_ID).length, passkeys: M.users.reduce((a, u) => a + (u.id === SUPPORT_ID ? 0 : (u.creds || []).length), 0) };
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
  if (seg[0] !== "fleet") return null;
  if ((await instGet(env)).custom) return J({ ok: false, error: "Not found." }, 404);
  try {
    const items = await fleetList(env);
    if (p === "/fleet" && m === "GET") {
      const live = await Promise.all(items.map((it) => fleetCall(env, it, "status").catch((e) => ({ ok: false, error: String(e.message || e).slice(0, 120) }))));
      return J({ ok: true, my_version: APP.v, items: items.map((it, i) => ({ id: it.id, business: live[i].business || it.business, host: it.host, added: it.added, plan_aud: Number(it.plan_aud) > 0 ? Number(it.plan_aud) : null, hosting_aud: FLEET_HOSTING_AUD, live: live[i].ok ? live[i] : null, error: live[i].ok ? null : live[i].error || "Not reachable", up_to_date: live[i].ok ? live[i].version === APP.v : null })) });
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
