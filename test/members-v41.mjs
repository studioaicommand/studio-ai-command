// v41: passkeys (real WebAuthn maths), invites, roles, sealed security log, secrets check, Studio key still works.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_audit: [] };
const tgs = [], asks = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^eq\.(.*)$/); return !m || String(r[k] ?? "") === m[1]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); const body = init.body ? JSON.parse(init.body) : undefined;
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { for (const r of [].concat(body)) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push({ created_at: new Date().toISOString(), ...r }); } return Response.json([]); }
    return Response.json([]); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true }); }
  if (u.includes("api.anthropic.com")) { asks.push(body); return Response.json({ content: [{ type: "text", text: "Hi Sarah, here's today." }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  return Response.json({}); };
const w = (await import(W)).default;
const ORIGIN = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "studio-key", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: ORIGIN };
const ctx = { waitUntil() {} };
const call = async (path, { method = "GET", body, auth, headers = {} } = {}) => { const r = await w.fetch(new Request(ORIGIN + path, { method, headers: { "Content-Type": "application/json", ...(auth ? { Authorization: "Bearer " + auth } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined }), env, ctx); return { s: r.status, j: await r.json().catch(() => ({})) }; };
// ── a tiny software authenticator ──
const te = new TextEncoder(), sub = crypto.subtle;
const b64 = (u8) => Buffer.from(u8).toString("base64url"), unb64 = (s) => new Uint8Array(Buffer.from(s, "base64url"));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const cb = (v) => { const head = (mt, n) => n < 24 ? [mt << 5 | n] : n < 256 ? [mt << 5 | 24, n] : [mt << 5 | 25, n >> 8, n & 255];
  if (typeof v === "number") return new Uint8Array(v >= 0 ? head(0, v) : head(1, -1 - v));
  if (v instanceof Uint8Array) return cat(new Uint8Array(head(2, v.length)), v);
  if (typeof v === "string") { const b = te.encode(v); return cat(new Uint8Array(head(3, b.length)), b); }
  if (v instanceof Map) return cat(new Uint8Array(head(5, v.size)), ...[...v].flatMap(([k, x]) => [cb(k), cb(x)])); throw new Error("cbor"); };
const rpHash = async (rp = "studioflowandsystems.app") => new Uint8Array(await sub.digest("SHA-256", te.encode(rp)));
const toDer = (raw) => { const int = (b) => { let i = 0; while (i < b.length - 1 && b[i] === 0) i++; b = b.slice(i); if (b[0] & 0x80) b = cat(new Uint8Array([0]), b); return cat(new Uint8Array([2, b.length]), b); }; const r = int(raw.slice(0, 32)), s = int(raw.slice(32)); return cat(new Uint8Array([0x30, r.length + s.length]), r, s); };
async function makeKey() { const kp = await sub.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]); const jwk = await sub.exportKey("jwk", kp.publicKey); return { kp, id: crypto.getRandomValues(new Uint8Array(16)), x: unb64(jwk.x), y: unb64(jwk.y), count: 0 }; }
async function attest(k, pub, origin = ORIGIN) {
  const cd = te.encode(JSON.stringify({ type: "webauthn.create", challenge: pub.challenge, origin }));
  const cose = cb(new Map([[1, 2], [3, -7], [-1, 1], [-2, k.x], [-3, k.y]]));
  const ad = cat(await rpHash(), new Uint8Array([0x45, 0, 0, 0, 0]), new Uint8Array(16), new Uint8Array([0, k.id.length]), k.id, cose);
  return { id: b64(k.id), rawId: b64(k.id), type: "public-key", device: "Test iPhone", response: { clientDataJSON: b64(cd), attestationObject: b64(cb(new Map([["fmt", "none"], ["attStmt", new Map()], ["authData", ad]]))) } };
}
async function assertion(k, challenge, { origin = ORIGIN, count = ++k.count, tamper = false } = {}) {
  const cd = te.encode(JSON.stringify({ type: "webauthn.get", challenge, origin }));
  const ad = cat(await rpHash(), new Uint8Array([0x05, count >> 24 & 255, count >> 16 & 255, count >> 8 & 255, count & 255]));
  const raw = new Uint8Array(await sub.sign({ name: "ECDSA", hash: "SHA-256" }, k.kp.privateKey, cat(ad, new Uint8Array(await sub.digest("SHA-256", cd)))));
  if (tamper) raw[5] ^= 1;
  return { id: b64(k.id), rawId: b64(k.id), type: "public-key", response: { clientDataJSON: b64(cd), authenticatorData: b64(ad), signature: b64(toDer(raw)), userHandle: null } };
}
const login = async (k, opt = {}) => { const o = await call("/api/v1/members/login/options", { method: "POST", body: {} }); return call("/api/v1/members/login/verify", { method: "POST", body: { credential: await assertion(k, o.j.challenge, opt) } }); };

// 1. Ty adds Face ID for himself (signed in with the Studio key)
let x = await call("/api/v1/members/admin", { auth: "wrong" });
assert(x.s === 403, "Managing people needs the Studio key");
x = await call("/api/v1/members/admin/me/options", { method: "POST", body: {}, auth: "studio-key" });
assert(x.s === 200 && x.j.publicKey.authenticatorSelection.userVerification === "required" && x.j.publicKey.rp.id === "studioflowandsystems.app", "Passkey set-up requires Face ID / fingerprint and is bound to Command's domain");
const tyKey = await makeKey();
x = await call("/api/v1/members/admin/me/verify", { method: "POST", body: { credential: await attest(tyKey, x.j.publicKey) }, auth: "studio-key" });
assert(x.s === 200 && x.j.user.role === "owner" && x.j.user.passkeys.length === 1, "Ty's passkey is saved as the owner");
assert(/New passkey added/.test(tgs.at(-1)), "Telegram alert when a passkey is added");
// 2. Sign in with it
x = await login(tyKey);
assert(x.s === 200 && /^m1\./.test(x.j.token) && x.j.user.role === "owner", "Ty signs in with Face ID: no key, no code");
const tyTok = x.j.token;
x = await call("/api/v1/team/summary", { auth: tyTok });
assert(x.s !== 401 && x.s !== 403, "The passkey session opens Command's APIs");
x = await call("/api/v1/auth/status", { auth: tyTok });
assert(x.j.member?.name === "Ty" && x.j.passkey, "Security screen knows who's signed in");
// 3. Attacks on sign-in
const o1 = await call("/api/v1/members/login/options", { method: "POST", body: {} });
x = await call("/api/v1/members/login/verify", { method: "POST", body: { credential: await assertion(tyKey, o1.j.challenge) } });
x = await call("/api/v1/members/login/verify", { method: "POST", body: { credential: await assertion(tyKey, o1.j.challenge) } });
assert(x.s === 401 && /timed out/.test(x.j.error), "A sign-in challenge can't be replayed");
x = await login(tyKey, { origin: "https://studioflowandsystems.app.evil.com" });
assert(x.s === 401 && /different website/.test(x.j.error), "A phishing site can't use Ty's passkey");
x = await login(tyKey, { tamper: true });
assert(x.s === 401 && /signature/.test(x.j.error), "A forged signature is rejected");
x = await login(tyKey, { count: 1 });
assert(x.s === 401 && /copied/.test(x.j.error), "A cloned passkey (old counter) is rejected");
const strangerKey = await makeKey();
x = await login(strangerKey);
assert(x.s === 401 && /isn't set up/.test(x.j.error), "Unknown passkeys can't sign in");
x = await call("/api/v1/team/summary", { headers: { "x-sf-member": "x|owner|Ty" } });
assert(x.s === 400, "Nobody can fake the member header");
x = await call("/api/v1/team/summary", { auth: tyTok.slice(0, -3) + "000" });
assert(x.s === 401, "A tampered session token is rejected");
// 4. Invite staff
x = await call("/api/v1/members/admin/invite", { method: "POST", body: { name: "Sarah", role: "staff" }, auth: tyTok });
assert(x.s === 200 && /\/command-next#invite=/.test(x.j.link), "Ty (signed in with Face ID) creates an invite link");
const inv = x.j.link.split("#invite=")[1];
x = await call("/api/v1/members/invite/" + inv);
assert(x.j.name === "Sarah" && x.j.role === "staff", "The invite shows who it's for");
x = await call("/api/v1/members/invite/" + inv + "/options", { method: "POST", body: {} });
const sarahKey = await makeKey();
x = await call("/api/v1/members/invite/" + inv + "/verify", { method: "POST", body: { credential: await attest(sarahKey, x.j.publicKey) } });
assert(x.s === 200 && x.j.user.role === "staff", "Sarah sets up her passkey from the link and is signed in");
const sarahTok = x.j.token;
x = await call("/api/v1/members/invite/" + inv);
assert(x.s === 404, "An invite link only works once");
// 5. Roles
x = await call("/api/v1/team/summary", { auth: sarahTok });
assert(x.s !== 401 && x.s !== 403, "Staff can see the work");
x = await call("/api/v1/team/settings", { method: "POST", body: {}, auth: sarahTok });
assert(x.s === 403 && /Staff/.test(x.j.error), "Staff can't change settings");
x = await call("/api/v1/team/actions/bulk-approve", { method: "POST", body: {}, auth: sarahTok });
assert(x.s === 403, "Staff can't approve sending");
x = await call("/api/v1/team/money", { auth: sarahTok });
assert(x.s === 403, "Staff can't see money");
x = await call("/api/v1/members/admin", { auth: sarahTok });
assert(x.s === 403, "Staff can't manage people");
x = await call("/api/v1/auth/signout-all", { method: "POST", body: {}, auth: sarahTok });
assert(x.s === 403, "Staff can't touch login security");
x = await call("/api/v1/operator/chat", { method: "POST", body: { message: "What's our revenue this month and who should I call?" }, auth: sarahTok });
const ask = asks.at(-1), names = (ask?.tools || []).map((t) => t.name), sent = JSON.stringify(ask?.messages || []) + JSON.stringify(ask?.system || []);
assert(x.s === 200 && x.j.reply && names.length > 0, "Staff can talk to Studio AI");
assert(!names.some((n) => /stripe|revenue|invoice|clients_overview|autopilot|offer|decide_approval/.test(n)) && names.includes("build_website_demo"), "Staff's Studio AI has no money, settings or approval tools");
assert(/You are talking with Sarah, a Staff/.test(sent) && /only Ty \(the owner\) can see money/.test(sent) && /Hidden: only the owner sees money/.test(sent), "Studio AI knows it's talking to Sarah and hides money from her");
x = await call("/api/v1/operator/tool", { method: "POST", body: { name: "clients_overview", arguments: {} }, auth: sarahTok });
assert(x.j.result?.ok === false && /role/.test(x.j.result.error), "Staff voice can't call money tools either");
x = await call("/api/v1/operator/chat", { method: "POST", body: { message: "hi" }, auth: tyTok });
assert(asks.at(-1).tools.some((t) => t.name === "clients_overview") && !/You are talking with/.test(JSON.stringify(asks.at(-1).messages)), "Ty's Studio AI keeps every tool");
const sarahId = (await call("/api/v1/members/admin", { auth: tyTok })).j.users.find((u) => u.name === "Sarah").id;
x = await call("/api/v1/members/admin/user/" + sarahId, { method: "POST", body: { role: "manager" }, auth: tyTok });
x = await call("/api/v1/team/summary", { auth: sarahTok });
assert(x.s === 401, "Changing someone's role signs them out straight away");
x = await login(sarahKey);
const sarahTok2 = x.j.token;
x = await call("/api/v1/team/settings", { method: "POST", body: {}, auth: sarahTok2 });
assert(x.s === 403, "Managers still can't change settings");
x = await call("/api/v1/members/admin/user/" + sarahId, { method: "POST", body: { disabled: true }, auth: tyTok });
x = await login(sarahKey);
assert(x.s === 401 && /removed/.test(x.j.error), "Removed people can't sign in");
const tyId = (await call("/api/v1/members/admin", { auth: tyTok })).j.users.find((u) => u.self).id;
x = await call("/api/v1/members/admin/user/" + tyId, { method: "POST", body: { role: "staff" }, auth: tyTok });
assert(x.s === 400, "Can't demote the last owner");
// 6. Studio key still works
x = await call("/api/v1/auth/start", { method: "POST", body: {}, auth: "studio-key" });
assert(x.s === 200 && x.j.session, "The Studio key still opens Command as the backup login");
// 7. Sealed security log
x = await call("/api/v1/members/admin/log", { auth: tyTok });
assert(x.j.intact && x.j.checked >= 8 && x.j.recent.some((e) => /Sarah/.test(e.summary)), "Security log is intact and shows who did what");
const row = DB.team_audit.find((r) => r.target_type === "security" && /invited Sarah/.test(r.summary));
const orig = row.summary; row.summary = "nothing to see here";
x = await call("/api/v1/members/admin/log", { auth: tyTok });
assert(!x.j.intact && /changed after it was written/.test(x.j.problem), "Editing a log entry in the database is detected");
row.summary = orig;
const idx = DB.team_audit.findIndex((r) => r.target_type === "security" && /signed in with/.test(r.summary));
const [gone] = DB.team_audit.splice(idx, 1);
x = await call("/api/v1/members/admin/log", { auth: tyTok });
assert(!x.j.intact && /missing/.test(x.j.problem), "Deleting a log entry is detected");
DB.team_audit.splice(idx, 0, gone);
x = await call("/api/v1/members/admin/log", { auth: tyTok });
assert(x.j.intact, "Log checks out again once restored");
// 8. Secrets check
x = await call("/api/v1/members/admin/secrets", { auth: tyTok });
assert(x.j.stored_in_database.length === 0 && x.j.cloudflare_secrets.includes("ANTHROPIC_API_KEY"), "Secrets check: nothing sensitive stored in the database");
DB.team_settings.push({ key: "oops", value: { stripe: "sk_live_abcdefghijklmnopqrst" } });
x = await call("/api/v1/members/admin/secrets", { auth: tyTok });
assert(x.j.stored_in_database.length === 1 && /Stripe live key/.test(x.j.stored_in_database[0].what), "A leaked key in the database is flagged");
console.log("v41 passkeys + roles + sealed log: all passed");
process.exit(0);
