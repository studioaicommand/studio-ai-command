// v145 Weekends off: Studio's own background AI rests on Saturday and Sunday daytime, then preps Monday from 6pm Sunday.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [], agent_prospects: [{ id: "p1", business_name: "Harbour Physio", phone: "0400000001", status: "sent", website: "https://harbour.test", vertical: "allied" }] };
let seq = 0; const asks = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { let m; if ((m = v.match(/^eq\.(.*)$/))) return String(r[k] ?? "") === m[1]; if (v === "is.null") return r[k] == null; if (v === "not.is.null") return r[k] != null; return true; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = JSON.parse(init.body); } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body || []).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); }
    return Response.json([]); }
  if (u.includes("api.anthropic.com")) { asks.push(body); return Response.json({ content: [{ type: "tool_use", id: "t", name: "save_owner", input: { found: false } }], stop_reason: "tool_use", usage: { input_tokens: 1, output_tokens: 1 } }); }
  return Response.json({ ok: true }); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const bg = []; const ctx = { waitUntil(p) { bg.push(p); } };
const tick = async (iso) => { await w.scheduled({ cron: "0 * * * *", scheduledTime: Date.parse(iso) }, env, ctx); await Promise.all(bg.splice(0)); };
const ownerAsks = () => asks.filter((a) => JSON.stringify(a.messages || "").includes("Who owns or runs it")).length;
await tick("2026-11-21T02:00:00Z"); // Saturday noon, Brisbane
assert(ownerAsks() === 0, "Saturday: the background AI rests (no owner lookups)");
await tick("2026-11-22T02:00:00Z"); // Sunday noon, Brisbane
assert(ownerAsks() === 0, "Sunday daytime: still resting");
await tick("2026-11-22T08:00:00Z"); // Sunday 6pm, Brisbane
assert(ownerAsks() > 0, "Sunday from 6pm: it preps Monday's calls (owner names)");
