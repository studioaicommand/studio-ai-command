// v35: two-step login. Key alone is refused; key + code from Telegram/SMS gives a signed session cookie.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_actions: [], agent_clients: [] };
const tg = [], ghl = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = init.method || "GET"; const body = init.body ? JSON.parse(init.body) : undefined;
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") { const k = (qs.match(/key=eq\.([a-z_]+)/) || [])[1]; return Response.json(k ? t.filter((r) => r.key === k) : t); }
    if (m === "POST") { const rows = [].concat(body); if (path === "team_settings") for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(...rows); return Response.json(rows); }
    return Response.json([]); }
  if (u.includes("api.telegram.org")) { tg.push(body.text); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("leadconnectorhq.com")) { ghl.push({ u, body }); if (u.includes("/contacts/upsert")) return Response.json({ contact: { id: "ty1" } }); return Response.json({ ok: true }); }
  return Response.json({}); };
const w = (await import(W)).default;
const env = { STUDIO_TEST_KEY: "real-key", SUPABASE_URL: "https://sb.test", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", TELEGRAM_BOT_TOKEN: "t" };
const call = async (path, { key = "real-key", body, cookie, method, e = env } = {}) => { const h = { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1" }; if (key) h.Authorization = "Bearer " + key; if (cookie) h.Cookie = cookie; const r = await w.fetch(new Request("https://x.app" + path, { method: method || (body ? "POST" : "GET"), headers: h, body: body ? JSON.stringify(body) : undefined }), e, { waitUntil() {} }); return { status: r.status, d: await r.json().catch(() => ({})), set: r.headers.get("set-cookie") || "" }; };
const code = () => (tg.at(-1).match(/<code>(\d{6})<\/code>/) || [])[1];
const cookieOf = (set) => set.split(";")[0];
let r = await call("/api/v1/team/money");
assert(r.status === 401 && r.d.two_step, "The Studio key alone is refused");
r = await call("/api/v1/operator/overview");
assert(r.status === 401 && r.d.two_step, "Operator routes refuse the key alone too");
r = await call("/api/v1/auth/start", { key: "wrong", body: {} });
assert(r.status === 401 && tg.length === 0, "Wrong key: no code sent");
r = await call("/api/v1/auth/start", { body: {} });
const ch = r.d.challenge; const c1 = code();
assert(r.d.ok && /^c1\./.test(ch) && c1 && r.d.sent_to[0] === "Telegram" && !JSON.stringify(r.d).includes(c1), "Right key: 6-digit code goes to Telegram (never back to the browser)");
r = await call("/api/v1/auth/verify", { body: { challenge: ch, code: c1 === "000000" ? "111111" : "000000" } });
assert(r.status === 401 && /4 tries left/.test(r.d.error), "Wrong code: 4 tries left");
r = await call("/api/v1/auth/verify", { key: "wrong", body: { challenge: ch, code: c1 } });
assert(r.status === 401 && !r.set, "Right code with the wrong key: refused");
r = await call("/api/v1/auth/verify", { body: { challenge: ch, code: c1 } });
const ck = cookieOf(r.set);
assert(r.d.ok && /sfcs=s1\./.test(ck) && /HttpOnly/.test(r.set) && /Secure/.test(r.set) && /SameSite=Strict/.test(r.set) && /Max-Age=86400/.test(r.set), "Right code: secure 24-hour session cookie");
assert(/New Command login/.test(tg.at(-1)) && /iPhone/.test(tg.at(-1)), "Telegram reports the new login and device");
r = await call("/api/v1/team/money", { cookie: ck });
assert(r.status !== 401, "Key + session opens Command");
r = await call("/api/v1/team/money", { key: "", cookie: ck });
assert(r.status === 401, "Session cookie without the key opens nothing");
r = await call("/api/v1/auth/verify", { body: { challenge: ch, code: c1 } });
assert(r.status === 400 && /expired/.test(r.d.error), "A code can only be used once");
r = await call("/api/v1/team/money", { cookie: "sfcs=s1.9999999999999.1." + "a".repeat(40) });
assert(r.status === 401, "A forged session is refused");
await call("/api/v1/auth/start", { body: {} }); const ch2 = (await call("/api/v1/auth/start", { body: {} })).d.challenge;
for (let i = 0; i < 4; i++) await call("/api/v1/auth/verify", { body: { challenge: ch2, code: "999999" === code() ? "888888" : "999999" } });
r = await call("/api/v1/auth/verify", { body: { challenge: ch2, code: "999999" === code() ? "888888" : "999999" } });
assert(r.status === 429 && /locked for 15 minutes/.test(tg.at(-1)), "5 wrong codes: login locked 15 minutes + Telegram alert");
r = await call("/api/v1/auth/start", { body: {} });
assert(r.status === 429, "While locked, no new codes");
DB.team_settings.find((x) => x.key === "security_state").value.locked_until = 0;
r = await call("/api/v1/auth/settings", { cookie: ck, body: { hours: 8, channel: "sms", sms_phone: "0495 105 377" } });
assert(r.d.ok && r.d.sms_phone === "+61495105377" && r.d.hours === 8, "Settings: 8 hours, codes by SMS to 0495 105 377");
tg.length = 0;
r = await call("/api/v1/auth/start", { body: {} });
const sms = ghl.find((g) => g.u.includes("/conversations/messages"));
const smsCode = (sms?.body.message.match(/(\d{6})/) || [])[1];
assert(r.d.sent_to[0] === "phone (SMS)" && ghl.some((g) => g.body?.phone === "+61495105377") && smsCode && tg.length === 0, "SMS code sent through GHL to your mobile");
r = await call("/api/v1/auth/verify", { body: { challenge: r.d.challenge, code: smsCode } });
assert(/Max-Age=28800/.test(r.set), "New logins now last 8 hours");
const ck8 = cookieOf(r.set);
r = await call("/api/v1/auth/signout-all", { cookie: ck8, body: {} });
assert(r.d.ok && /Max-Age=0/.test(r.set), "Sign out every device");
r = await call("/api/v1/team/money", { cookie: ck8 }); const r2 = await call("/api/v1/team/money", { cookie: ck });
assert(r.status === 401 && r2.status === 401, "Every old session is dead after sign-out");
r = await call("/api/v1/team/money", { e: { ...env, COMMAND_2FA: "off" } });
assert(r.status !== 401, "Emergency switch COMMAND_2FA = off lets the key in");
const app = await (await w.fetch(new Request("https://x.app/app/app.js"), env, { waitUntil() {} })).text();
try { new Function(app); console.log("✓ Command app script parses"); } catch (e) { console.error("FAIL: app.js", e.message); process.exit(1); }
assert(/startTwo/.test(app) && /VIEWS.security = /.test(app) && /"security", "Security"/.test(app), "Login screen asks for the code; Settings has a Security tab");
console.log("All v35 two-step tests passed.");
