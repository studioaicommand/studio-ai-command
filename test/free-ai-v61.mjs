// v61: free Workers AI for internal jobs (validated, Claude fallback), Claude confirms before any email is deleted, prompt caching.
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "mail_rules", value: { rules: [], pitch_filter: true } }], team_usage: [] };
const asks = [], deletes = []; let claudeKind = "real";
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const q = decodeURIComponent(qs); const key = (q.match(/key=eq\.([^&]+)/) || [])[1]; const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(key ? t.filter((r) => r.key === key) : t);
    if (m === "POST") { for (const r of [].concat(body)) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json([].concat(body)); }
    return Response.json([]); }
  if (u.includes("services.leadconnectorhq.com")) { const p = u.split(".com")[1];
    if (/^\/contacts\/\w+$/.test(p)) return Response.json({ contact: { email: "x@y.test", firstName: "X", tags: [] } });
    if (m === "DELETE") { deletes.push(p); return Response.json({}); }
    if (/^\/conversations\/search/.test(p)) return Response.json({ conversations: [{ id: "cv1", contactId: "c1" }] });
    if (/\/messages/.test(p)) return Response.json({ messages: { messages: [{ id: "m1", direction: "inbound", messageType: "TYPE_EMAIL", body: globalThis.MAILBODY, dateAdded: new Date().toISOString() }] } });
    return Response.json({}); }
  if (u.includes("api.anthropic.com")) { asks.push(body); const names = (body.tools || []).map((t) => t.name);
    if (names.includes("classify_email")) return Response.json({ content: [{ type: "tool_use", id: "t", name: "classify_email", input: { kind: claudeKind } }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 } });
    return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  return new Response("{}", { status: 404 }); };
const w = (await import(W)).default;
let freeAnswer = { kind: "real" }; const freeCalls = [];
const AI = { run: async (model, inp) => { freeCalls.push({ model, inp }); return { response: freeAnswer }; } };
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", AI };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const key = crypto.createHash("sha256").update("inbox:k").digest("hex").slice(0, 28);
const cls = () => asks.filter((a) => (a.tools || []).some((t) => t.name === "classify_email")).length;
const hook = async (text) => { globalThis.MAILBODY = text; asks.length = 0; deletes.length = 0; freeCalls.length = 0; await w.fetch(new Request("https://studioflowandsystems.app/api/v1/inbox/ghl/" + key, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact_id: "c1", message: { type: "Email", body: "x" } }) }), env, ctx); await flush(); };
await hook("Hi, can you build a site for my cafe?");
assert(freeCalls.length === 1 && freeCalls[0].model === "@cf/meta/llama-3.3-70b-instruct-fp8-fast" && cls() === 0 && deletes.length === 0, "Normal email: the free model clears it, Claude isn't needed, nothing deleted");
assert(DB.team_usage.some((r) => r.source === "free_ai:classify_email" && r.cost_usd === 0), "Free calls are logged at $0");
freeAnswer = { kind: "sales_pitch" }; claudeKind = "real";
await hook("We do SEO, page 1 guaranteed");
assert(cls() === 1 && deletes.length === 0, "Free model flags it, but Claude disagrees, so the email stays (the free model can never delete on its own)");
claudeKind = "sales_pitch";
await hook("We do SEO, page 1 guaranteed");
assert(deletes.length === 1, "Only when Claude confirms is it deleted");
freeAnswer = { kind: "banana" }; claudeKind = "real";
await hook("Hello there");
assert(cls() === 1 && deletes.length === 0, "A bad free answer fails the check and Claude does the job instead");
env.AI = undefined;
await hook("Hello there");
assert(cls() === 1, "Without the AI binding everything works exactly as before (Claude)");
// prompt caching
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/if \(typeof body\.system === "string" && body\.system\.length > 3500\) body = \{ \.\.\.body, system: \[\{ type: "text", text: body\.system, cache_control: \{ type: "ephemeral" \} \}\] \};/.test(src), "Long Claude prompts are cached automatically");
assert(/wsdAsk\(env, u, "fast", \{ free: true, max_tokens: 900, system: `You turn Ty/.test(src), "The spoken briefing script tries the free model first");
console.log("v61 free AI OK");
