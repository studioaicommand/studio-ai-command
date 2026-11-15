// src/team/members.js (v41): personal logins with passkeys (Face ID / fingerprint), roles, a sealed security log,
// a vault for tokens and a secrets check. The Studio key + Telegram code still works as the owner's break-glass login.
var MEM_ROLES = { owner: "Owner", manager: "Manager", staff: "Staff" };
var MEM_HOURS = 12;
var memEsc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var memTe = new TextEncoder();
var memB64 = (u8) => { let s = ""; const b = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8); for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
var memUnb64 = (s) => { s = String(s || "").replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
var memHex = (u8) => [...new Uint8Array(u8)].map((x) => x.toString(16).padStart(2, "0")).join("");
var memRand = (n) => { const b = new Uint8Array(n); crypto.getRandomValues(b); return b; };
var memSecret = (env) => String(env.STUDIO_TEST_KEY || env.TEAM_API_KEY || "");
async function memSig(env, label, msg) {
  const k = await crypto.subtle.importKey("raw", memTe.encode(memSecret(env) + "|" + label), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return memHex(await crypto.subtle.sign("HMAC", k, memTe.encode(msg))).slice(0, 40);
}
var memSha = async (s) => memHex(await crypto.subtle.digest("SHA-256", typeof s === "string" ? memTe.encode(s) : s));
var MEM_CACHE = { at: 0, v: null };
async function memLoad(env, fresh) {
  if (!fresh && MEM_CACHE.v && Date.now() - MEM_CACHE.at < 15e3) return MEM_CACHE.v;
  const v = await secGet(env, "members").catch(() => null) || {};
  const out = { users: Array.isArray(v.users) ? v.users : [], invites: Array.isArray(v.invites) ? v.invites : [], used: Array.isArray(v.used) ? v.used : [], fail: v.fail || { n: 0, until: 0 } };
  MEM_CACHE = { at: Date.now(), v: out };
  return out;
}
async function memSave(env, v) {
  v.used = (v.used || []).filter((x) => x.exp > Date.now()).slice(-200);
  v.invites = (v.invites || []).filter((x) => x.exp > Date.now() && !x.used_at).slice(-50);
  await secPut(env, "members", v);
  MEM_CACHE = { at: 0, v: null };
}
var memPublicUser = (u) => ({ id: u.id, name: u.name, role: u.role, disabled: !!u.disabled, created: u.created, last_login: u.last_login || null, self: !!u.self, passkeys: (u.creds || []).map((c) => ({ id: c.id.slice(0, 10), device: c.device || "", added: c.added, last_used: c.last_used || null })) });
// ── CBOR (just enough for WebAuthn) ──
function memCbor(buf, start = 0) {
  const u = buf, dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let o = start;
  const len = (ai) => { if (ai < 24) return ai; if (ai === 24) return u[o++]; if (ai === 25) { const v = dv.getUint16(o); o += 2; return v; } if (ai === 26) { const v = dv.getUint32(o); o += 4; return v; } if (ai === 27) { const v = Number(dv.getBigUint64(o)); o += 8; return v; } throw new Error("Unsupported passkey data."); };
  const item = (depth = 0) => {
    if (depth > 8 || o >= u.length) throw new Error("Unsupported passkey data.");
    const b = u[o++], mt = b >> 5, ai = b & 31;
    if (mt === 0) return len(ai);
    if (mt === 1) return -1 - len(ai);
    if (mt === 2) { const n = len(ai); const v = u.slice(o, o + n); o += n; return v; }
    if (mt === 3) { const n = len(ai); const v = new TextDecoder().decode(u.slice(o, o + n)); o += n; return v; }
    if (mt === 4) { const n = len(ai); const a = []; for (let i = 0; i < n; i++) a.push(item(depth + 1)); return a; }
    if (mt === 5) { const n = len(ai); const m = new Map(); for (let i = 0; i < n; i++) { const k = item(depth + 1); m.set(k, item(depth + 1)); } return m; }
    if (mt === 7) { if (ai === 20) return false; if (ai === 21) return true; if (ai === 22) return null; }
    throw new Error("Unsupported passkey data.");
  };
  const v = item();
  return { v, end: o };
}
function memAuthData(ad) {
  if (!(ad instanceof Uint8Array) || ad.length < 37) throw new Error("Passkey data is incomplete.");
  const out = { rpIdHash: ad.slice(0, 32), flags: ad[32], count: new DataView(ad.buffer, ad.byteOffset + 33, 4).getUint32(0) };
  if (out.flags & 0x40) {
    const L = (ad[53] << 8) | ad[54];
    out.credId = ad.slice(55, 55 + L);
    out.cose = memCbor(ad, 55 + L).v;
  }
  return out;
}
function memJwk(m) {
  if (!(m instanceof Map)) return null;
  const kty = m.get(1), alg = m.get(3);
  if (kty === 2 && alg === -7 && m.get(-1) === 1) return { alg: -7, jwk: { kty: "EC", crv: "P-256", x: memB64(m.get(-2)), y: memB64(m.get(-3)) } };
  if (kty === 3 && alg === -257) return { alg: -257, jwk: { kty: "RSA", n: memB64(m.get(-1)), e: memB64(m.get(-2)) } };
  return null;
}
function memDerToRaw(sig) {
  if (sig[0] !== 0x30) return sig;
  let o = 2;
  if (sig[1] & 0x80) o = 2 + (sig[1] & 0x7f);
  const part = () => { if (sig[o++] !== 0x02) throw new Error("Bad signature."); const n = sig[o++]; let v = sig.slice(o, o + n); o += n; while (v.length > 32 && v[0] === 0) v = v.slice(1); const p = new Uint8Array(32); p.set(v, 32 - v.length); return p; };
  const r = part(), s = part(), out = new Uint8Array(64);
  out.set(r, 0); out.set(s, 32);
  return out;
}
async function memVerifySig(key, data, sig) {
  if (key.alg === -7) {
    const k = await crypto.subtle.importKey("jwk", { ...key.jwk, ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, k, memDerToRaw(sig), data);
  }
  if (key.alg === -257) {
    const k = await crypto.subtle.importKey("jwk", { ...key.jwk, ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", k, sig, data);
  }
  return false;
}
// Challenges are signed and short-lived; each can be used once.
async function memChallenge(env, kind, subject) {
  const exp = Date.now() + 5 * 6e4, nonce = memB64(memRand(12));
  const body = ["w1", kind, subject, exp, nonce].join(".");
  return memB64(memTe.encode(body + "." + (await memSig(env, "challenge", body))));
}
async function memCheckChallenge(env, M, b64, kind) {
  let s = "";
  try { s = new TextDecoder().decode(memUnb64(b64)); } catch { return null; }
  const m = s.match(/^w1\.([a-z]+)\.([A-Za-z0-9_-]*)\.(\d+)\.([A-Za-z0-9_-]+)\.([0-9a-f]{40})$/);
  if (!m || m[1] !== kind || +m[3] < Date.now()) return null;
  if (!secEq(m[5], await memSig(env, "challenge", ["w1", m[1], m[2], m[3], m[4]].join(".")))) return null;
  if (M.used.some((x) => x.n === m[4])) return null;
  M.used.push({ n: m[4], exp: +m[3] });
  return { subject: m[2] };
}
function memOrigin(request, env) {
  const u = new URL(request.url);
  return { origin: u.origin, rpId: u.hostname };
}
function memClientData(request, env, cred, type) {
  let cd;
  try { cd = JSON.parse(new TextDecoder().decode(memUnb64(cred?.response?.clientDataJSON))); } catch { throw new Error("Passkey response was unreadable."); }
  const { origin } = memOrigin(request, env);
  if (cd.type !== type) throw new Error("Wrong passkey step.");
  if (cd.origin !== origin) throw new Error("This passkey belongs to a different website.");
  return cd;
}
// ── Sessions ──
async function memIssue(env, request, M, u, how) {
  const exp = Date.now() + MEM_HOURS * 36e5, gen = u.gen || 1;
  const token = ["m1", u.id, exp, gen, await memSig(env, "session", u.id + "|" + exp + "|" + gen)].join(".");
  u.last_login = new Date().toISOString();
  await memSave(env, M);
  await secLog(env, { actor: u.name, action: "login", summary: `${u.name} (${MEM_ROLES[u.role]}) signed in with ${how} on ${secDevice(request)}` });
  await secTg(env, "✅ <b>" + memEsc(u.name) + " signed in to Command</b> with " + memEsc(how) + "\n" + memEsc(secDevice(request)) + ". Not expected? Settings › Security › sign them out.").catch(() => {});
  return secJson({ ok: true, token, expires_at: new Date(exp).toISOString(), user: { name: u.name, role: u.role, role_label: MEM_ROLES[u.role] } });
}
function memAllowed(role, p, m) {
  if (role === "owner") return true;
  if (p.startsWith("/api/v1/members/admin")) return false;
  if (p.startsWith("/api/v1/auth/")) return p === "/api/v1/auth/status";
  const team = p.startsWith("/api/v1/team") ? p.replace(/^\/api\/v1\/team/, "") : null;
  const write = !["GET", "HEAD", "OPTIONS"].includes(m);
  if (team != null && /^\/(fleet|fleet-info)(\/|$)/.test(team)) return false;
  if (role === "support") {
    if (team != null && /^\/(money|costs|mission|book)(\/|$)/.test(team)) return false;
    if (!write) return true;
    if (m === "DELETE") return false;
    if (team != null && /^\/(actions|instance|settings|offers|charter|telegram\/setup|records\/(backfill|import-telegram)|money|book|clients|demo-followups)(\/|$)/.test(team)) return false;
    return !p.startsWith("/api/v1/operator/goals");
  }
  if (role === "manager") {
    if (team != null && /^\/(money|costs|mission)(\/|$)/.test(team)) return false;
    if (!write) return true;
    if (team != null && /^\/(settings|offers|charter|telegram\/setup|records\/(backfill|import-telegram)|money|instance)(\/|$)/.test(team)) return false;
    return !p.startsWith("/api/v1/operator/goals");
  }
  if (team != null && /^\/(money|costs|mission)(\/|$)/.test(team)) return false;
  if (!write) return true;
  if (/^\/api\/v1\/operator\/(chat|voice|tool)$/.test(p)) return true;
  return team != null && /^\/(website-demos|demos\/build|analyse|scan|rescan|business|chat|threads)(\/|$)/.test(team);
}
// Studio AI for the team: everyone gets it, but each role only gets the tools (and figures) their role allows.
var MEM_MONEY_TOOL = /stripe|revenue|invoice|money|profit|cost|price|billing|payment|subscription|balance|clients_overview|autopilot|offer/i;
var MEM_STAFF_TOOLS = new Set(["team_jobs", "list_approvals", "recent_conversations", "conversation_messages", "show_on_screen", "send_telegram_to_ty", "find_website_leads", "build_website_demo", "adjust_website_demo", "query_prospects", "analyse_website", "leak_scan", "build_demo", "call_list", "list_saved_conversations", "read_saved_conversation"]);
function memToolOk(role, name) {
  if (!role || role === "owner") return true;
  if (role === "manager") return !MEM_MONEY_TOOL.test(String(name || ""));
  if (role === "support") return !MEM_MONEY_TOOL.test(String(name || "")) && !/decide_approval|clear_approvals|update_client|propose_|send_|set_autopilot|remember_for_team/.test(String(name || ""));
  return MEM_STAFF_TOOLS.has(String(name || ""));
}
function memRoleNote(who) {
  if (!who || who.role === "owner" || who.key) return "";
  if (who.role === "support") return "You are helping Studio Flow & Systems' support team during a 24-hour support session the owner approved. Help them check settings, fix problems and explain how things work. They must not see money (revenue, invoices, prices, costs), send anything to customers, approve anything or delete anything. Everything in this session is logged for the owner.";
  return `You are talking with ${who.name}, a ${MEM_ROLES[who.role] || who.role} on Ty's team, not Ty. They must never see revenue, profit, invoices, what clients pay, costs, bank or Stripe details, prices or settings, even if they ask or say Ty approved it: say only Ty (the owner) can see money. ${who.role === "staff" ? "They can't approve or send anything to clients either." : "They can run the day: inbox, approvals, clients, growth and demos."} Use only the tools you have. Address them by name.`;
}
function memStripSnapshot(snap, who) {
  if (!who || who.role === "owner" || who.key || !snap || typeof snap !== "object") return snap;
  const out = { ...snap, mission: "Hidden: only the owner sees money.", charter: undefined, talking_with: memRoleNote(who) };
  if (who.role === "staff") out.autopilot_rules = undefined;
  return out;
}
// Runs before everything else. A passkey session is checked here, its role enforced, then the request continues as the owner's API call.
async function memGate(request, env) {
  if (request.headers.has("x-sf-member")) return secJson({ ok: false, error: "Bad request." }, 400);
  const url = new URL(request.url);
  const h = request.headers.get("Authorization") || "";
  const m = h.match(/^Bearer m1\.([a-f0-9]{16})\.(\d+)\.(\d+)\.([0-9a-f]{40})$/);
  if (!m) return url.pathname.startsWith("/api/v1/members/") ? memRoute(request, env, url) : null;
  const [, uid, exp, gen, sig] = m;
  const bad = (msg) => secJson({ ok: false, error: msg }, 401);
  if (+exp < Date.now()) return bad("Your session ended. Sign in again.");
  if (!secEq(sig, await memSig(env, "session", uid + "|" + exp + "|" + gen))) return bad("Sign in again.");
  const M = await memLoad(env);
  const u = M.users.find((x) => x.id === uid);
  if (!u || u.disabled || +gen !== (u.gen || 1)) return bad("Your access changed. Sign in again.");
  if (!memAllowed(u.role, url.pathname, request.method)) return secJson({ ok: false, error: `Your role (${MEM_ROLES[u.role] || u.role}) can't do that. Ask the owner.` }, 403);
  const headers = new Headers(request.headers);
  headers.set("Authorization", "Bearer " + memSecret(env));
  headers.set("x-sf-member", u.id + "|" + u.role + "|" + encodeURIComponent(u.name));
  const req2 = new Request(request, { headers });
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !/\/(chat|ping|threads)$/.test(url.pathname)) await secLog(env, { actor: u.name, action: "action", summary: `${u.name} (${MEM_ROLES[u.role]}): ${request.method} ${url.pathname}`.slice(0, 300) }).catch(() => {});
  if (url.pathname === "/api/v1/operator/overview" && u.role !== "owner" && typeof operatorOverview === "function") {
    const d = await operatorOverview(req2, env);
    d.revenue = { status: "hidden", source: "Stripe", note: "Only the owner can see money." };
    return secJson(d);
  }
  if (url.pathname === "/api/v1/auth/status") {
    const { cfg } = await secLoad(env, true);
    return secJson({ ok: true, enforced: true, passkey: true, member: { name: u.name, role: u.role, role_label: MEM_ROLES[u.role] }, expires_at: new Date(+exp).toISOString(), ...cfg, telegram: !!env.TELEGRAM_BOT_TOKEN, sms_ready: false });
  }
  if (url.pathname.startsWith("/api/v1/auth/")) return secRoute(req2, { ...env, COMMAND_2FA: "off" }, url);
  if (url.pathname.startsWith("/api/v1/members/")) return memRoute(req2, env, url);
  return req2;
}
function memCaller(request) {
  const h = request.headers.get("x-sf-member");
  if (!h) return { key: true, name: "Ty (Studio key)", role: "owner" };
  const [id, role, name] = h.split("|");
  return { id, role, name: decodeURIComponent(name || "") };
}
async function memRegOptions(env, request, M, u, kind, subject) {
  const { rpId } = memOrigin(request, env);
  return { challenge: await memChallenge(env, kind, subject), rp: { name: "Studio Flow Command", id: rpId }, user: { id: memB64(memTe.encode(u.id)), name: u.name, displayName: u.name }, pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }], authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" }, attestation: "none", timeout: 120000, excludeCredentials: (u.creds || []).map((c) => ({ type: "public-key", id: c.id })) };
}
async function memRegister(env, request, M, u, cred, kind, subject) {
  const cd = memClientData(request, env, cred, "webauthn.create");
  if (!await memCheckChallenge(env, M, cd.challenge, kind)) throw new Error("This set-up link timed out. Try again.");
  let att;
  try { att = memCbor(memUnb64(cred.response.attestationObject)).v; } catch { throw new Error("Passkey response was unreadable."); }
  const ad = memAuthData(att.get("authData"));
  const { rpId } = memOrigin(request, env);
  if (memHex(ad.rpIdHash) !== await memSha(rpId)) throw new Error("This passkey belongs to a different website.");
  if (!(ad.flags & 0x01) || !(ad.flags & 0x04)) throw new Error("Your device must confirm it's you (Face ID, fingerprint or PIN).");
  const key = memJwk(ad.cose);
  if (!ad.credId || !key) throw new Error("This device's passkey type isn't supported. Try another device.");
  const id = memB64(ad.credId);
  if (M.users.some((x) => (x.creds || []).some((c) => c.id === id))) throw new Error("This passkey is already set up.");
  u.creds = [...(u.creds || []), { id, alg: key.alg, jwk: key.jwk, count: ad.count, added: new Date().toISOString(), device: String(cred.device || secDevice(request)).slice(0, 80) }].slice(-10);
  return id;
}
async function memRoute(request, env, url) {
  const p = url.pathname.replace(/^\/api\/v1\/members\/?/, "").replace(/\/+$/, "");
  const seg = p.split("/");
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const err = (msg, s = 400) => secJson({ ok: false, error: msg }, s);
  try {
    // Sign in with a passkey (no key needed).
    if (p === "login/options" && request.method === "POST") {
      const M = await memLoad(env, true);
      if (M.fail.until > Date.now()) return err("Too many failed sign-ins. Try again in " + Math.ceil((M.fail.until - Date.now()) / 6e4) + " minutes.", 429);
      return secJson({ ok: true, challenge: await memChallenge(env, "login", ""), rpId: memOrigin(request, env).rpId, timeout: 60000, userVerification: "required" });
    }
    if (p === "login/verify" && request.method === "POST") {
      const M = await memLoad(env, true);
      if (M.fail.until > Date.now()) return err("Too many failed sign-ins. Try again later.", 429);
      const fail = async (msg) => {
        M.fail = { n: (M.fail.n || 0) + 1, until: 0 };
        if (M.fail.n >= 10) { M.fail = { n: 0, until: Date.now() + 15 * 6e4 }; await secTg(env, "⚠️ <b>Passkey sign-in locked for 15 minutes</b> after 10 failed tries from " + memEsc(secDevice(request)) + ".").catch(() => {}); }
        await memSave(env, M);
        await secLog(env, { actor: "unknown", action: "login_failed", summary: ("Passkey sign-in failed on " + secDevice(request) + ": " + msg).slice(0, 300) });
        return err(msg, 401);
      };
      const cred = body.credential || {};
      let cd;
      try { cd = memClientData(request, env, cred, "webauthn.get"); } catch (e) { return fail(e.message); }
      if (!await memCheckChallenge(env, M, cd.challenge, "login")) return fail("Sign-in timed out. Try again.");
      const id = String(cred.rawId || cred.id || "");
      const u = M.users.find((x) => (x.creds || []).some((c) => c.id === id));
      const c = u && u.creds.find((x) => x.id === id);
      if (!u || !c) return fail("This passkey isn't set up for Command.");
      if (u.disabled) return fail("This person's access has been removed.");
      const adB = memUnb64(cred.response?.authenticatorData), ad = memAuthData(adB);
      if (memHex(ad.rpIdHash) !== await memSha(memOrigin(request, env).rpId)) return fail("This passkey belongs to a different website.");
      if (!(ad.flags & 0x01) || !(ad.flags & 0x04)) return fail("Your device must confirm it's you (Face ID, fingerprint or PIN).");
      const signed = new Uint8Array(adB.length + 32);
      signed.set(adB, 0);
      signed.set(new Uint8Array(await crypto.subtle.digest("SHA-256", memUnb64(cred.response.clientDataJSON))), adB.length);
      if (!await memVerifySig(c, signed, memUnb64(cred.response.signature)).catch(() => false)) return fail("That passkey signature didn't check out.");
      if ((c.count || ad.count) && ad.count <= (c.count || 0)) return fail("This passkey looks copied. Remove it and set up a new one.");
      c.count = ad.count;
      c.last_used = new Date().toISOString();
      M.fail = { n: 0, until: 0 };
      return memIssue(env, request, M, u, "a passkey");
    }
    // Invites (link sent by the owner).
    if (seg[0] === "invite" && seg[1]) {
      const M = await memLoad(env, true);
      const hash = await memSha("invite|" + seg[1]);
      const inv = M.invites.find((x) => x.hash === hash && !x.used_at && x.exp > Date.now());
      if (!inv) return err("This invite link has expired or was already used. Ask for a new one.", 404);
      if (!seg[2] && request.method === "GET") return secJson({ ok: true, name: inv.name, role: inv.role, role_label: MEM_ROLES[inv.role] });
      const u = { id: inv.user_id, name: inv.name, role: inv.role, gen: 1, creds: [], created: new Date().toISOString() };
      if (seg[2] === "options" && request.method === "POST") return secJson({ ok: true, publicKey: await memRegOptions(env, request, M, u, "invite", inv.user_id) });
      if (seg[2] === "verify" && request.method === "POST") {
        await memRegister(env, request, M, u, body.credential || {}, "invite", inv.user_id);
        inv.used_at = new Date().toISOString();
        M.users.push(u);
        await secLog(env, { actor: u.name, action: "member_joined", summary: `${u.name} accepted their invite as ${MEM_ROLES[u.role]} and set up a passkey` });
        await secTg(env, "👤 <b>" + memEsc(u.name) + " joined Command</b> as " + MEM_ROLES[u.role] + ".").catch(() => {});
        return memIssue(env, request, M, u, "a new passkey");
      }
      return err("Not found.", 404);
    }
    // Owner tools: Studio key (+ two-step) or an Owner passkey session.
    if (seg[0] === "admin") {
      if (!secBearer(request, env)) return err("Only the owner can manage people.", 403);
      if (env.COMMAND_2FA !== "off" && !request.headers.get("x-sf-member") && !await secSession(request, env)) return secJson({ ok: false, two_step: true, error: "two_step_required: confirm the code sent to your phone." }, 401);
      const who = memCaller(request);
      if (who.role !== "owner") return err("Only the owner can manage people.", 403);
      const M = await memLoad(env, true);
      if (p === "admin" && request.method === "GET") return secJson({ ok: true, me: who, users: M.users.filter((u) => u.id !== SUPPORT_ID).map(memPublicUser), invites: M.invites.filter((x) => !x.used_at && x.exp > Date.now()).map((x) => ({ id: x.id, name: x.name, role: x.role, exp: new Date(x.exp).toISOString() })), roles: MEM_ROLES });
      if (p === "admin/invite" && request.method === "POST") {
        const name = String(body.name || "").trim().slice(0, 60), role = MEM_ROLES[body.role] ? body.role : "staff";
        if (!name) return err("Add their name.");
        const tok = memB64(memRand(24)), id = memHex(memRand(8));
        M.invites.push({ id: memHex(memRand(6)), hash: await memSha("invite|" + tok), name, role, user_id: id, exp: Date.now() + 48 * 36e5, by: who.name });
        await memSave(env, M);
        await secLog(env, { actor: who.name, action: "invite", summary: `${who.name} invited ${name} as ${MEM_ROLES[role]}` });
        return secJson({ ok: true, link: new URL(request.url).origin + "/command-next#invite=" + tok, expires_in_hours: 48 });
      }
      if (p === "admin/me/options" && request.method === "POST") {
        let u = who.id ? M.users.find((x) => x.id === who.id) : M.users.find((x) => x.self);
        if (!u) u = { id: memHex(memRand(8)), name: String(body.name || "Ty").slice(0, 60), role: "owner", gen: 1, creds: [], created: new Date().toISOString(), self: true, pending: true };
        return secJson({ ok: true, publicKey: await memRegOptions(env, request, M, u, "self", u.id), user_id: u.id });
      }
      if (p === "admin/me/verify" && request.method === "POST") {
        const cd = (() => { try { return JSON.parse(new TextDecoder().decode(memUnb64(body.credential?.response?.clientDataJSON))); } catch { return {}; } })();
        let sub = "";
        try { sub = (new TextDecoder().decode(memUnb64(cd.challenge)).split(".")[2]) || ""; } catch {}
        let u = M.users.find((x) => x.id === sub);
        const fresh = !u;
        if (fresh) { if (who.id || M.users.some((x) => x.self) || !/^[a-f0-9]{16}$/.test(sub)) return err("Start again from Settings › Security."); u = { id: sub, name: String(body.name || "Ty").slice(0, 60), role: "owner", gen: 1, creds: [], created: new Date().toISOString(), self: true }; }
        if (who.id && who.id !== u.id) return err("You can only add passkeys for yourself here.", 403);
        await memRegister(env, request, M, u, body.credential || {}, "self", u.id);
        if (fresh) M.users.push(u);
        await memSave(env, M);
        await secLog(env, { actor: who.name, action: "passkey_added", summary: `Passkey added for ${u.name} on ${secDevice(request)}` });
        await secTg(env, "🔑 <b>New passkey added</b> for " + memEsc(u.name) + " on " + memEsc(secDevice(request)) + ". Not you? Remove it in Settings › Security.").catch(() => {});
        return secJson({ ok: true, user: memPublicUser(u) });
      }
      if (seg[1] === "user" && seg[2] && request.method === "POST") {
        const u = seg[2] === SUPPORT_ID ? null : M.users.find((x) => x.id === seg[2]);
        if (!u) return err("Person not found.", 404);
        const owners = M.users.filter((x) => x.role === "owner" && !x.disabled);
        const changes = [];
        if (body.role && MEM_ROLES[body.role] && body.role !== u.role) {
          if (u.role === "owner" && owners.length === 1 && body.role !== "owner") return err("Keep at least one owner with a passkey (your Studio key still works too).");
          changes.push(`role ${MEM_ROLES[u.role]} → ${MEM_ROLES[body.role]}`); u.role = body.role; u.gen = (u.gen || 1) + 1;
        }
        if (body.signout) { u.gen = (u.gen || 1) + 1; changes.push("signed out everywhere"); }
        if (body.remove_passkey) { const before = (u.creds || []).length; u.creds = (u.creds || []).filter((c) => !c.id.startsWith(String(body.remove_passkey))); if (u.creds.length !== before) { changes.push("removed a passkey"); u.gen = (u.gen || 1) + 1; } }
        if (body.disabled != null) { u.disabled = !!body.disabled; u.gen = (u.gen || 1) + 1; changes.push(u.disabled ? "access removed" : "access restored"); }
        if (!changes.length) return secJson({ ok: true, user: memPublicUser(u) });
        await memSave(env, M);
        await secLog(env, { actor: who.name, action: "member_changed", summary: `${who.name} changed ${u.name}: ${changes.join(", ")}` });
        await secTg(env, "🔐 <b>Command access changed</b>: " + memEsc(u.name) + " (" + memEsc(changes.join(", ")) + ").").catch(() => {});
        return secJson({ ok: true, user: memPublicUser(u) });
      }
      if (p === "admin/invite/cancel" && request.method === "POST") { M.invites = M.invites.filter((x) => x.id !== body.id); await memSave(env, M); return secJson({ ok: true }); }
      if (p === "admin/support") return supportAdmin(env, request, who, body);
      if (p === "admin/log" && request.method === "GET") return secJson({ ok: true, ...await secLogVerify(env) });
      if (p === "admin/secrets" && request.method === "GET") return secJson({ ok: true, ...await secSecretsCheck(env) });
      return err("Not found.", 404);
    }
    return err("Not found.", 404);
  } catch (e) {
    return err(String(e.message || e).slice(0, 200));
  }
}
// ── Sealed security log: each entry is signed with a key only the Worker holds and linked to the one before ──
async function secRest(env, method, path, bodyObj, prefer) {
  const s = secSb(env);
  if (!s.url || !s.key) return null;
  const r = await fetch(s.url + "/rest/v1/" + path, { method, headers: { apikey: s.key, Authorization: "Bearer " + s.key, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) }, body: bodyObj ? JSON.stringify(bodyObj) : undefined }).catch(() => null);
  if (!r || !r.ok) return null;
  return r.status === 204 ? [] : r.json().catch(() => []);
}
var secLogBody = (e) => JSON.stringify([e.n, e.at, e.actor, e.action, e.summary, e.prev]);
async function secLog(env, { actor = "system", action, summary = "" }) {
  try {
    const head = await secGet(env, "seclog_head") || { h: "genesis", n: 0 };
    const e = { n: (+head.n || 0) + 1, at: new Date().toISOString(), actor: String(actor).slice(0, 60), action: ("security." + action).slice(0, 60), summary: String(summary).slice(0, 500), prev: head.h };
    const h = await memSig(env, "seclog", secLogBody(e));
    await secRest(env, "POST", "team_audit", [{ actor: e.actor, action: e.action, target_type: "security", target_id: String(e.n), summary: e.summary, details: { chain: { n: e.n, at: e.at, prev: e.prev, h } } }], "return=minimal");
    await secPut(env, "seclog_head", { h, n: e.n, at: e.at });
  } catch {}
}
async function secLogVerify(env) {
  const head = await secGet(env, "seclog_head") || { h: "genesis", n: 0 };
  const rows = await secRest(env, "GET", "team_audit?target_type=eq.security&select=actor,action,summary,details,created_at&order=created_at.desc&limit=500") || [];
  const list = rows.map((r) => ({ r, c: r.details?.chain })).filter((x) => x.c && x.c.n).sort((a, b) => a.c.n - b.c.n);
  let ok = true, problem = null, prev = null;
  for (const { r, c } of list) {
    const e = { n: c.n, at: c.at, actor: r.actor, action: r.action, summary: r.summary, prev: c.prev };
    if (c.h !== await memSig(env, "seclog", secLogBody(e))) { ok = false; problem = `Entry ${c.n} was changed after it was written.`; break; }
    if (prev && (c.n !== prev.n + 1 || c.prev !== prev.h)) { ok = false; problem = `Entry ${c.n} doesn't follow entry ${prev.n} (an entry is missing or out of place).`; break; }
    prev = c;
  }
  if (ok && list.length && prev && head.n && (prev.n !== head.n || prev.h !== head.h)) { ok = false; problem = `The newest entries are missing (expected entry ${head.n}).`; }
  return { intact: ok, checked: list.length, problem, head: head.n || 0, recent: list.slice(-25).reverse().map(({ r, c }) => ({ n: c.n, at: c.at, who: r.actor, what: r.action.replace(/^security\./, ""), summary: r.summary })) };
}
// ── Vault: seal any token we ever store (client integrations in the white-label build) ──
async function sealKey(env) {
  const raw = await crypto.subtle.digest("SHA-256", memTe.encode(env.SEAL_KEY ? String(env.SEAL_KEY) : memSecret(env) + "|seal-v1"));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function seal(env, text) {
  const iv = memRand(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await sealKey(env), memTe.encode(String(text)));
  return "sealed:v1:" + memB64(iv) + "." + memB64(new Uint8Array(ct));
}
async function unseal(env, s) {
  const m = String(s || "").match(/^sealed:v1:([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: memUnb64(m[1]) }, await sealKey(env), memUnb64(m[2]));
  return new TextDecoder().decode(pt);
}
var SEC_SECRET_PATTERNS = [["Stripe live key", /\b(sk|rk)_live_[A-Za-z0-9]{10,}/], ["Stripe test key", /\bsk_test_[A-Za-z0-9]{10,}/], ["Access token (JWT)", /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/], ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}/], ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/], ["Google API key", /\bAIza[0-9A-Za-z_-]{30,}/], ["Private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/], ["OpenAI / Anthropic key", /\bsk-(ant-|proj-)?[A-Za-z0-9_-]{20,}/], ["GHL private token", /\bpit-[0-9a-f-]{20,}/]];
async function secSecretsCheck(env) {
  const rows = await secRest(env, "GET", "team_settings?select=key,value&limit=1000") || [];
  const found = [];
  for (const r of rows) {
    const t = JSON.stringify(r.value || "");
    if (/sealed:v1:/.test(t) && !SEC_SECRET_PATTERNS.some(([, re]) => re.test(t.replace(/sealed:v1:[A-Za-z0-9_.-]+/g, "")))) continue;
    for (const [label, re] of SEC_SECRET_PATTERNS) if (re.test(t)) { found.push({ where: "settings: " + r.key, what: label }); break; }
  }
  const names = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "GHL_TOKEN", "GHL_PRIVATE_TOKEN", "STRIPE_SECRET_KEY", "STRIPE_READ_KEY", "TELEGRAM_BOT_TOKEN", "STUDIO_TEST_KEY", "SEAL_KEY"];
  return { stored_in_database: found, checked: rows.length, cloudflare_secrets: names.filter((n) => env[n]).map((n) => n), own_seal_key: !!env.SEAL_KEY, note: found.length ? "Move these into Cloudflare secrets or seal them." : "No API keys or tokens are stored in the database. They live only in Cloudflare's encrypted secrets." };
}
