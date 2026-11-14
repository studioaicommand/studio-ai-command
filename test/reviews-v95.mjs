// v95 Review desk: the GHL workflow sends the ask; Command watches Google reviews, tags review-left (stops the SMS),
// and sends ONE personal nudge after 9 days, only with Ty's yes. No double handling.
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const old = new Date(Date.now() - 10 * 864e5).toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }, { key: "inbox", value: { review_link: "https://g.page/r/Cd-T_xxq_oQHEAI/review", sms_live: true } }, { key: "review_desk", value: { asked: { ct: { name: "Tom Lee", first_seen: old } }, seen: {} } }], team_actions: [], team_audit: [], team_memory: [] };
let seq = 0;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String((k.includes("->>") ? (r[k.split("->>")[0]] || {})[k.split("->>")[1]] : r[k]) ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "is") return m[2] === "null" ? r[k] == null : true; return true; });
const tgs = [], tags = [], sent = [], ai = [];
const people = { cj: { id: "cj", firstName: "Jess", lastName: "Smith", email: "jess@x.test", tags: ["ask-for-review"] }, ct: { id: "ct", firstName: "Tom", lastName: "Lee", phone: "+61400000000", email: "tom@x.test", tags: ["ask-for-review"] } };
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 900 + tgs.length } }); }
  if (u.includes("places.googleapis.com")) {
    if (u.includes(":searchText")) return Response.json({ places: [{ id: "P1", displayName: { text: "Studio Flow & Systems" } }] });
    return Response.json({ rating: 5, userRatingCount: 3, reviews: [{ authorAttribution: { displayName: "Jess Smith" }, rating: 5, text: { text: "Ty built our whole booking system, amazing." }, publishTime: "2026-11-13T01:00:00Z" }, { authorAttribution: { displayName: "Random Person" }, rating: 5, text: { text: "Great" }, publishTime: "2026-11-01T01:00:00Z" }] }); }
  if (u.includes("leadconnectorhq.com")) {
    if (u.includes("/contacts/search")) return Response.json({ contacts: Object.values(people), total: 2 });
    const tg = u.match(/\/contacts\/([^/]+)\/tags/); if (tg && m === "POST") { tags.push([tg[1], ...body.tags]); return Response.json({ tags: body.tags }); }
    if (u.includes("/conversations/messages") && m === "POST") { sent.push(body); return Response.json({ messageId: "m" }); }
    const c = u.match(/\/contacts\/([^/?]+)$/); if (c) return Response.json({ contact: people[c[1]] || { id: c[1] } });
    if (u.includes("/conversations/search")) return Response.json({ conversations: [] });
    return Response.json({}); }
  if (u.includes("api.anthropic.com")) { const sys = typeof body.system === "string" ? body.system : JSON.stringify(body.system || ""); ai.push(sys); return Response.json({ content: [{ type: "text", text: JSON.stringify({ reply: "Hey Tom, hope the new site's treating you well! If you get a sec, a quick Google review would mean a lot. No worries either way. Reply STOP to opt out.", handoff: false }) }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  return new Response("{}", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", GOOGLE_PLACES_KEY: "gk" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const call = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); await flush(); return { s: r.status, j: await r.json().catch(() => ({})) }; };

// A "job done" event from GHL just tags ask-for-review, so the GHL workflow sends the branded ask (Command doesn't write its own)
const KEY = crypto.createHash("sha256").update("inbox:k").digest("hex").slice(0, 28);
await w.fetch(new Request("https://studioflowandsystems.app/api/v1/inbox/ghl/" + KEY, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact_id: "cz", event: "review" }) }), env, ctx); await flush();
assert(tags.some((t) => t[0] === "cz" && t.includes("ask-for-review")) && !DB.team_actions.length && !sent.length, "A 'job done' event tags ask-for-review for the GHL workflow; Command writes no second request");

let r = await call("/reviews/check", {});
assert(r.s === 200 && r.j.ok && r.j.watching, "Check reviews runs and can see the Google listing");
assert(tags.some((t) => t[0] === "cj" && t.includes("review-left")), "Jess left a Google review, so she's tagged review-left (her SMS reminder won't go out)");
assert(tgs.some((t) => /New Google review/.test(t) && /Jess Smith/.test(t) && /won't go out/.test(t) && /Random Person/.test(t)), "Ty hears about new reviews, and which one was a client");
const nudge = DB.team_actions.find((a) => a.params?.kind === "review_chase");
assert(nudge && nudge.params.contact_id === "ct" && nudge.status === "pending" && /one only/.test(nudge.title) && nudge.params.message.includes("g.page/r/Cd-T_xxq_oQHEAI/review"), "Tom was asked 10 days ago with no review: ONE personal nudge waits for Ty's yes, with the review link");
assert(ai.some((s) => /OWN VOICE/.test(s)), "The nudge is written in Ty's own voice");
assert(!sent.length && tags.some((t) => t[0] === "ct" && t.includes("review-chased")), "Nothing is sent before Ty approves, and Tom is marked so he's never chased twice");
assert(!DB.team_actions.some((a) => a.params?.kind === "review_chase" && a.params.contact_id === "cj"), "Jess (who reviewed) and anyone asked under 9 days ago get no nudge");

const n0 = tgs.length, a0 = DB.team_actions.length;
r = await call("/reviews/check", {});
assert(DB.team_actions.length === a0 && !tgs.slice(n0).some((t) => /New Google review/.test(t)), "Running it again doesn't repeat reviews or nudges");
r = await call("/reviews");
assert(r.j.asked >= 2 && r.j.reviewed >= 1 && r.j.chased >= 1 && r.j.rating === 5, "Command can report: asked, reviewed, nudged, rating");
console.log("reviews-v95 OK");
