// v54 Command Link: open pages in Chrome on Ty's Mac; Jarvis voice naming; web search in Command chat.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_usage: [] };
let seq = 0; const asks = []; let wantOpen = null;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "is") return m[2] === "null" ? r[k] == null : true; return true; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); if (path === "team_settings") { for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } } else t.push(...rows); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { asks.push(body); const last = body.messages.at(-1);
    if (wantOpen && typeof last.content === "string") return Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name: "show_on_screen", input: { url: wantOpen, open_in_chrome: true } }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } });
    return Response.json({ content: [{ type: "text", text: "Opened it in Chrome for you, Ty." }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 } }); }
  if (u.includes("api.telegram.org")) return Response.json({ ok: true, result: { message_id: 1 } });
  if (u.includes("moonmane.test")) return new Response("<html><head><title>Moonmane</title></head><body>Hair</body></html>", { headers: { "content-type": "text/html" } });
  return new Response("", { status: 404 }); };
let NOW = Date.parse("2026-11-12T03:00:00Z"); const realDate = Date;
globalThis.Date = class extends realDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const raw = async (path, init = {}) => { const r = await w.fetch(new Request("https://studioflowandsystems.app" + path, init), env, ctx); await flush(); return r; };
const call = async (path, b, key = "k") => { const r = await raw("/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { ...(key ? { Authorization: "Bearer " + key } : {}), "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const st = (k) => DB.team_settings.find((r) => r.key === k)?.value;

// Jarvis voice naming
let x = await call("/voice-style");
assert(x.j.voices.find((v) => v.id === "cedar").name.includes("Jarvis"), "Voice list shows 'Jarvis (Cedar)'");
await call("/voice-style", { persona: "jarvis" });
assert(st("voice_style").command_voice === "cedar", "Choosing Jarvis style switches the Command voice to the Jarvis voice");

// Mac link
x = await call("/mac-link");
assert(x.j.linked === false, "Not linked to start");
x = await call("/mac-link/setup", {}, "");
assert(x.s === 401, "Setup needs the Studio key");
x = await call("/mac-link/setup", {});
const code = x.j.command.match(/install\/([a-f0-9]{24}) \| zsh$/)?.[1];
assert(code && x.j.command.startsWith("curl -fsSL https://studioflowandsystems.app/link/install/"), "Setup gives a one-line Terminal command");
let r = await raw("/link/install/" + "0".repeat(24));
assert(r.status === 404, "Wrong setup codes don't install");
r = await raw("/link/install/" + code); const script = await r.text();
const token = script.match(/T="([a-f0-9]{64})"/)?.[1];
assert(r.status === 200 && token && /LaunchAgents/.test(script) && /open -a "Google Chrome"/.test(script), "Install script sets up the background helper with its own token");
r = await raw("/link/install/" + code);
assert(r.status === 404, "The setup code only works once");
const fs = await import("node:fs"); fs.writeFileSync("/tmp/claude-0/link-install.zsh", script);
r = await raw("/api/v1/link/next", { headers: { Authorization: "Bearer nope" } });
assert((await r.json()).unlinked === true, "A wrong token gets nothing (and that helper stops)");
const next = async () => (await raw("/api/v1/link/next", { headers: { Authorization: "Bearer " + token } })).json();
x = await next();
assert(x.ok && !x.url && st("mac_link").last_seen, "Helper checks in; Mac shows online");
x = await call("/mac-link");
assert(x.j.linked && x.j.online, "Status: linked and online");

// Command opens a page in Chrome
wantOpen = "https://moonmane.test/";
const cr = await raw("/api/v1/operator/chat", { method: "POST", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: JSON.stringify({ message: "open moonmane in chrome" }) });
const cj = await cr.json(); wantOpen = null;
assert(/Chrome/.test(cj.reply), "Command replies after opening it");
assert(asks.some((a) => (a.tools || []).some((t) => t.type === "web_search_20250305")), "Command chat can search the web");
const toolRes = JSON.stringify(asks.at(-1).messages);
assert(/opened_in_chrome\\":true/.test(toolRes), "show_on_screen reports it opened in Chrome");
x = await next();
assert(x.url === "https://moonmane.test/", "The Mac helper receives the page to open");
x = await next();
assert(!x.url, "Each page opens once");
// only web pages
const mod = DB.team_settings; 
x = await call("/mac-link/test", {});
assert(x.j.opened, "Test button queues Command to open");
// offline after 2 min without check-in
NOW += 5 * 6e4;
x = await call("/mac-link");
assert(x.j.linked && !x.j.online, "Mac shows offline when the helper stops checking in");
x = await call("/mac-link/test", {});
assert(!x.j.opened && /offline/.test(x.j.reason), "When the Mac is offline Command says so");
// stale queued pages don't open later
x = await next();
assert(!x.url, "Pages queued minutes ago don't suddenly open later");
x = await call("/mac-link/off", {});
x = await (await raw("/api/v1/link/next", { headers: { Authorization: "Bearer " + token } })).json();
assert(x.unlinked === true, "Unlink stops the helper (it exits)");
console.log("v54 mac link OK");
