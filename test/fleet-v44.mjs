// v44: Studio's console and a client's copy talking to each other (two separate Commands in one test).
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DBS = { "sb-studio.test": { team_settings: [] }, "sb-client.test": { team_settings: [{ key: "telegram", value: { chat_id: 7 } }] } };
const tg = [], asks = [];
let seq = 0;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|gte)\.(.*)$/); if (!m) return true; return m[1] === "eq" ? String(r[k] ?? "") === m[2] : String(r[k] ?? "") >= m[2]; });
let studio, client, envS, envC;
const ctx = { waitUntil() {} };
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  const host = (u.match(/^https:\/\/([^/]+)/) || [])[1];
  if (DBS[host]) { const DB = DBS[host]; const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (host === "client.test") return client.fetch(new Request(u, init), envC, ctx);
  if (u.includes("api.telegram.org")) { tg.push(body?.chat_id + ":" + (body?.text || "")); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("api.anthropic.com")) { asks.push(body); return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  return Response.json({}); };
studio = (await import(W + "?studio")).default;
client = (await import(W + "?client")).default;
const FT = "ab".repeat(24);
envS = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "studio-key", SEAL_KEY: "s".repeat(64), SUPABASE_URL: "https://sb-studio.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
envC = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "client-key", FLEET_TOKEN: FT, SEAL_KEY: "c".repeat(64), SUPABASE_URL: "https://sb-client.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: "https://client.test" };
const callS = async (path, b) => { const r = await studio.fetch(new Request("https://studioflowandsystems.app" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer studio-key", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), envS, ctx); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const callC = async (path, b, key = "client-key") => { const r = await client.fetch(new Request("https://client.test" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), envC, ctx); return { s: r.status, j: await r.json().catch(() => ({})) }; };
await callC("/api/v1/team/instance", { business_name: "Harbour Physio", owner_name: "Sam Ng", template: "allied_health", apply_template: true, modules: {} });
await callC("/api/v1/team/chat", { department: "chief_of_staff", message: "hi" });
const code = "SFC1." + Buffer.from(JSON.stringify({ h: "https://client.test", t: FT, b: "Harbour Physio" })).toString("base64url");
let x = await callS("/api/v1/team/fleet/add", { code: "SFC1.nonsense" });
assert(x.s === 400, "A bad connect code is refused");
x = await callS("/api/v1/team/fleet/add", { code });
assert(x.j.ok && x.j.business === "Harbour Physio", "Ty connects a client's Command with its connect code");
const stored = DBS["sb-studio.test"].team_settings.find((r) => r.key === "fleet").value.items[0];
assert(/^sealed:v1:/.test(stored.token) && !JSON.stringify(stored).includes(FT), "The client's fleet key is sealed in the vault, never stored in plain text");
x = await callS("/api/v1/team/fleet");
const it = x.j.items[0];
assert(it.live && it.up_to_date === true && it.live.business === "Harbour Physio" && typeof it.live.ai_spend_month_aud === "number" && it.live.people === 0, "Console shows the client's health, version and AI cost");
assert(!JSON.stringify(it.live).match(/charter|message|content|transcript/i), "The console gets numbers only, never the client's messages or data");
x = await callS(`/api/v1/team/fleet/${it.id}/plan`, { plan_aud: 997 });
x = await callS("/api/v1/team/fleet");
assert(x.j.ok && x.j.items[0].plan_aud === 997 && x.j.items[0].hosting_aud === 15, "Ty sets what the client pays, so the console can show his margin");
x = await callS(`/api/v1/team/fleet/${it.id}/plan`, { plan_aud: "lots" });
assert(x.s === 400, "A plan price must be a number");
x = await callC("/api/v1/team/fleet");
assert(x.s === 404, "A client's copy has no console of its own");
let r = await client.fetch(new Request("https://client.test/api/v1/fleet/status", { headers: { Authorization: "Bearer " + "cd".repeat(24) } }), envC, ctx);
assert(r.status === 404, "The fleet link is invisible without the right key");
x = await callS(`/api/v1/team/fleet/${it.id}/open`, {});
assert(x.s === 403, "Ty can't get in without the owner's approval");
tg.length = 0;
x = await callS(`/api/v1/team/fleet/${it.id}/support`, { reason: "Set up your GHL connection" });
assert(x.j.ok && x.j.state === "pending", "Ty asks for support access");
assert(tg.some((t) => /^7:/.test(t) && /asking for 24-hour support access/.test(t) && /GHL connection/.test(t)), "The client's owner gets a Telegram message asking to approve");
x = await callC("/api/v1/members/admin/support");
assert(x.j.status === "pending" && x.j.linked, "Their owner sees the request in Settings > Security");
x = await callC("/api/v1/members/admin/support", { action: "approve" });
assert(x.j.status === "approved", "The owner approves 24 hours");
x = await callS(`/api/v1/team/fleet/${it.id}/open`, {});
assert(x.j.ok && /#support=m1\./.test(x.j.url), "Ty gets a one-click support link");
const tok = x.j.url.split("#support=")[1];
assert(tg.some((t) => /just opened your Command with support access/.test(t)), "The owner is told the moment Studio opens their Command");
x = await callC("/api/v1/team/summary", null, tok);
assert(x.s === 200, "Support access opens their Command");
for (const [path, body, what] of [["/api/v1/team/money", null, "money"], ["/api/v1/team/actions/bulk-approve", {}, "approving/sending"], ["/api/v1/team/settings", {}, "settings"], ["/api/v1/members/admin", null, "people and security"], ["/api/v1/team/instance", { business_name: "x" }, "their brand"]]) { x = await callC(path, body, tok); assert(x.s === 403, `Support can't touch ${what}`); }
x = await callC("/api/v1/operator/chat", { message: "approve everything" }, tok);
const names = (asks.at(-1).tools || []).map((t) => t.name);
assert(!names.some((n) => /decide_approval|clear_approvals|stripe|send_/.test(n)) && /support team during a 24-hour support session/.test(JSON.stringify(asks.at(-1).messages)), "Their AI knows it's a support session and has no approve, send or money tools");
x = await callC("/api/v1/members/admin");
assert(!x.j.users.some((u) => /support/i.test(u.name)), "Support doesn't show up as one of their people");
x = await callC("/api/v1/members/admin/support", { action: "end" });
x = await callC("/api/v1/team/summary", null, tok);
assert(x.s === 401, "The owner can end it instantly");
x = await callC("/api/v1/members/admin/log");
assert(x.j.intact && ["asked for 24-hour support", "gave Studio Flow support access", "opened Command with support access", "ended Studio Flow's support access"].every((t) => x.j.recent.some((e) => e.summary.includes(t))), "Every step is in their sealed security log");
console.log("v44 Studio console + support access: all passed");
process.exit(0);
