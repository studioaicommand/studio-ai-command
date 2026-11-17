// v130: a client copy on its own web address: domain set over the fleet link, Face ID re-set-up on the new address for the same people, links use it.
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
const ORIGIN = "https://harbour-physio.studioflowandsystems.app", NEW = "https://command.harbourphysio.com.au", FT = "ab".repeat(24);
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "studio-key", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: ORIGIN, FLEET_TOKEN: FT };
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
const callAt = async (base, path, { method = "GET", body, auth, headers = {} } = {}) => { const r = await w.fetch(new Request(base + path, { method, headers: { "Content-Type": "application/json", ...(auth ? { Authorization: "Bearer " + auth } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined }), env, ctx); return { s: r.status, j: await r.json().catch(() => ({})) }; };
async function attestAt(k, pub, base) {
  const rp = new URL(base).hostname, cd = te.encode(JSON.stringify({ type: "webauthn.create", challenge: pub.challenge, origin: base }));
  const cose = cb(new Map([[1, 2], [3, -7], [-1, 1], [-2, k.x], [-3, k.y]]));
  const ad = cat(await rpHash(rp), new Uint8Array([0x45, 0, 0, 0, 0]), new Uint8Array(16), new Uint8Array([0, k.id.length]), k.id, cose);
  return { id: b64(k.id), rawId: b64(k.id), type: "public-key", device: "Test iPhone", response: { clientDataJSON: b64(cd), attestationObject: b64(cb(new Map([["fmt", "none"], ["attStmt", new Map()], ["authData", ad]]))) } };
}
async function assertAt(k, challenge, base) {
  const cd = te.encode(JSON.stringify({ type: "webauthn.get", challenge, origin: base })), count = ++k.count;
  const ad = cat(await rpHash(new URL(base).hostname), new Uint8Array([0x05, count >> 24 & 255, count >> 16 & 255, count >> 8 & 255, count & 255]));
  const raw = new Uint8Array(await sub.sign({ name: "ECDSA", hash: "SHA-256" }, k.kp.privateKey, cat(ad, new Uint8Array(await sub.digest("SHA-256", cd)))));
  return { id: b64(k.id), rawId: b64(k.id), type: "public-key", response: { clientDataJSON: b64(cd), authenticatorData: b64(ad), signature: b64(toDer(raw)), userHandle: null } };
}
const loginAt = async (k, base) => { const o = await callAt(base, "/api/v1/members/login/options", { method: "POST", body: {} }); return callAt(base, "/api/v1/members/login/verify", { method: "POST", body: { credential: await assertAt(k, o.j.challenge, base) } }); };
// a client's copy, its owner with Face ID on the Studio Flow address
let x = await callAt(ORIGIN, "/api/v1/team/instance", { method: "POST", auth: "studio-key", body: { business_name: "Harbour Physio", product_name: "Harbour Command", owner_name: "Sam Lee", owner_first: "Sam", colours: { primary: "#0f766e", accent: "#f59e0b", mode: "light" } } });
assert(x.s === 200, "Client copy set up");
x = await callAt(ORIGIN, "/api/v1/instance/brand");
assert(x.j.colours.primary === "#0f766e" && x.j.colours.accent === "#f59e0b" && x.j.colours.mode === "light", "Their colours and light/dark choice are saved for the whole app");
x = await callAt(ORIGIN, "/api/v1/members/admin/me/options", { method: "POST", body: {}, auth: "studio-key" });
const k1 = await makeKey();
x = await callAt(ORIGIN, "/api/v1/members/admin/me/verify", { method: "POST", body: { credential: await attestAt(k1, x.j.publicKey, ORIGIN) }, auth: "studio-key" });
assert(x.s === 200, "Owner has Face ID on the Studio Flow address");
x = await loginAt(k1, ORIGIN); const tok = x.j.token;
assert(x.s === 200 && tok, "Owner signs in on the old address");
x = await callAt(ORIGIN, "/api/v1/members/admin/address-link", { method: "POST", body: {}, auth: tok });
assert(x.s === 400, "No new-address links before a domain is connected");
// Studio connects their own domain over the fleet link
x = await callAt(ORIGIN, "/api/v1/fleet/domain", { method: "POST", body: { host: "command.harbourphysio.com.au" }, auth: "wrong" });
assert(x.s === 404, "Only Studio's fleet link can set the address");
x = await callAt(ORIGIN, "/api/v1/fleet/domain", { method: "POST", body: { host: "evil.studioflowandsystems.app" }, auth: FT });
assert(x.s === 400, "Studio's own domains can't be used as a client address");
x = await callAt(ORIGIN, "/api/v1/fleet/domain", { method: "POST", body: { host: "https://Command.HarbourPhysio.com.au/" }, auth: FT });
assert(x.s === 200 && x.j.host === "command.harbourphysio.com.au" && tgs.some((t) => /its own web address/.test(t)), "Fleet link sets their address and tells their owner on Telegram");
x = await callAt(ORIGIN, "/api/v1/fleet/status", { auth: FT });
assert(x.j.custom_domain === "command.harbourphysio.com.au", "Studio console sees their address");
// owner moves to the new address
x = await callAt(ORIGIN, "/api/v1/members/admin/address-link", { method: "POST", body: {}, auth: tok });
assert(x.s === 200 && x.j.link.startsWith(NEW + "/command-next#invite="), "Owner gets a Face ID link on the new address");
const inv = x.j.link.split("#invite=")[1];
x = await callAt(NEW, "/api/v1/members/invite/" + inv);
assert(x.s === 200 && x.j.role === "owner", "The link opens on their own domain");
x = await callAt(NEW, "/api/v1/members/invite/" + inv + "/options", { method: "POST", body: {} });
assert(x.j.publicKey?.rp?.id === "command.harbourphysio.com.au", "Face ID is set up for their own domain");
const k2 = await makeKey();
x = await callAt(NEW, "/api/v1/members/invite/" + inv + "/verify", { method: "POST", body: { credential: await attestAt(k2, x.j.publicKey, NEW) } });
assert(x.s === 200 && x.j.user.role === "owner", "Same owner, now with Face ID on the new address");
const M = DB.team_settings.find((s) => s.key === "members").value;
assert(M.users.filter((u) => u.role === "owner").length === 1 && M.users.find((u) => u.role === "owner").creds.length === 2, "No duplicate person: the owner now has Face ID on both addresses");
x = await loginAt(k2, NEW);
assert(x.s === 200 && x.j.user.role === "owner", "Owner signs in on their own domain");
x = await loginAt(k1, ORIGIN);
assert(x.s === 200, "The old address keeps working");
x = await callAt(NEW, "/api/v1/members/invite/" + inv);
assert(x.s === 404, "Each new-address link works once");
x = await callAt(NEW, "/api/v1/members/admin/invite", { method: "POST", body: { name: "Jess", role: "staff" }, auth: tok });
assert(x.s === 200 && x.j.link.startsWith(NEW + "/"), "New staff invites use their own domain");
console.log("\ndomain-v130 passed");
