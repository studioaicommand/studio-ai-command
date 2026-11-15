// v44 fleet link: how Studio's console talks to each client copy. Uses a per-copy FLEET_TOKEN.
// It can read health numbers (never client conversations or data) and ask for support access,
// which the client's owner must approve. Support access lasts 24 hours, is logged, and can't send, pay or delete.
var SUPPORT_ID = "5f0c0a11ab1e5ea7";
var SUPPORT_HOURS = 24;
function fleetAuthed(request, env) {
  const h = request.headers.get("Authorization") || "";
  return !!env.FLEET_TOKEN && h.startsWith("Bearer ") && secEq(h.slice(7).trim(), String(env.FLEET_TOKEN));
}
async function supportState(env) {
  const s = await secGet(env, "support").catch(() => null) || {};
  if (s.status === "approved" && s.until && s.until < Date.now()) s.status = "expired";
  return s;
}
async function supportEnd(env, why, by) {
  const M = await memLoad(env, true);
  const u = M.users.find((x) => x.id === SUPPORT_ID);
  if (u) { u.disabled = true; u.gen = (u.gen || 1) + 1; await memSave(env, M); }
  const s = await secGet(env, "support").catch(() => null) || {};
  await secPut(env, "support", { ...s, status: why, ended_at: new Date().toISOString(), ended_by: by || null });
}
async function fleetGate(request, env, ctx) {
  const url = new URL(request.url), p = url.pathname.replace(/^\/api\/v1\/fleet\/?/, "");
  if (!fleetAuthed(request, env)) return secJson({ ok: false, error: "Not found." }, 404);
  const origin = url.origin;
  if (p === "status" && request.method === "GET") {
    const r = await teamFetch(new Request(origin + "/api/v1/team/fleet-info", { headers: { Authorization: "Bearer " + memSecret(env) } }), env, ctx);
    const info = await r.json().catch(() => ({}));
    const i = await instGet(env);
    const s = await supportState(env);
    return secJson({ ok: true, business: i.business_name, product: i.product_name, custom: i.custom, template: i.template, ...info, support: { status: s.status || "none", until: s.until ? new Date(s.until).toISOString() : null, requested_at: s.requested_at || null } });
  }
  if (p === "support-request" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const s = await supportState(env);
    if (s.status === "approved") return secJson({ ok: true, status: "approved", until: new Date(s.until).toISOString() });
    const by = String(b.by || "Studio Flow").slice(0, 60), reason = String(b.reason || "").slice(0, 300);
    await secPut(env, "support", { status: "pending", requested_at: new Date().toISOString(), by, reason });
    await secLog(env, { actor: by, action: "support_requested", summary: `${by} asked for 24-hour support access${reason ? ": " + reason : ""}` });
    await secTg(env, "🛟 <b>Studio Flow is asking for 24-hour support access</b>" + (reason ? "\nWhy: " + memEsc(reason) : "") + "\nApprove or decline in Command › Settings › Security. They can't send messages, take payments or delete anything.").catch(() => {});
    return secJson({ ok: true, status: "pending" });
  }
  if (p === "support-session" && request.method === "GET") {
    const s = await supportState(env);
    if (s.status !== "approved") return secJson({ ok: false, status: s.status || "none", error: s.status === "pending" ? "Waiting for the owner to approve." : "Support access isn't approved." }, 403);
    const M = await memLoad(env, true);
    const u = M.users.find((x) => x.id === SUPPORT_ID);
    if (!u || u.disabled) return secJson({ ok: false, error: "Support access isn't active." }, 403);
    const exp = s.until, gen = u.gen || 1;
    const token = ["m1", u.id, exp, gen, await memSig(env, "session", u.id + "|" + exp + "|" + gen)].join(".");
    await secLog(env, { actor: "Studio Flow support", action: "support_opened", summary: "Studio Flow opened Command with support access" });
    await secTg(env, "\uD83D\uDEDF <b>Studio Flow just opened your Command with support access</b> (ends " + new Date(exp).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", hour: "numeric", minute: "2-digit" }) + "). End it any time in Settings \u203A Security.").catch(() => {});
    return secJson({ ok: true, url: origin + "/command-next#support=" + token, until: new Date(exp).toISOString() });
  }
  return secJson({ ok: false, error: "Not found." }, 404);
}
// Owner side: approve, decline or end support access (from Settings > Security).
async function supportAdmin(env, request, who, body) {
  const s = await supportState(env);
  if (request.method === "GET") return secJson({ ok: true, ...s, until: s.until ? new Date(s.until).toISOString() : null, linked: !!env.FLEET_TOKEN });
  const action = String(body.action || "");
  if (action === "approve") {
    if (s.status !== "pending") return secJson({ ok: false, error: "There's no request waiting." }, 400);
    const M = await memLoad(env, true);
    let u = M.users.find((x) => x.id === SUPPORT_ID);
    if (!u) { u = { id: SUPPORT_ID, name: "Studio Flow support", role: "support", gen: 1, creds: [], created: new Date().toISOString() }; M.users.push(u); }
    u.disabled = false; u.role = "support"; u.gen = (u.gen || 1) + 1;
    await memSave(env, M);
    const until = Date.now() + SUPPORT_HOURS * 36e5;
    await secPut(env, "support", { ...s, status: "approved", approved_at: new Date().toISOString(), approved_by: who.name, until });
    await secLog(env, { actor: who.name, action: "support_approved", summary: `${who.name} gave Studio Flow support access for ${SUPPORT_HOURS} hours` });
    return secJson({ ok: true, status: "approved", until: new Date(until).toISOString() });
  }
  if (action === "decline" || action === "end") {
    await supportEnd(env, action === "decline" ? "declined" : "ended", who.name);
    await secLog(env, { actor: who.name, action: "support_" + (action === "decline" ? "declined" : "ended"), summary: `${who.name} ${action === "decline" ? "declined" : "ended"} Studio Flow's support access` });
    return secJson({ ok: true, status: action === "decline" ? "declined" : "ended" });
  }
  return secJson({ ok: false, error: "Choose approve, decline or end." }, 400);
}
