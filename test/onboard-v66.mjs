// v66: onboarding intake -> GHL note + tags + branded confirmation + Telegram. No passwords accepted.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [] }; const ghl = []; let tg = 0, turnstileOk = true;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq)\.(.*)$/); return !m || String(r[k]) === m[2]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { for (const r of [].concat(body)) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } return Response.json([]); }
    return Response.json([]); }
  if (u.includes("challenges.cloudflare.com")) return Response.json({ success: turnstileOk, hostname: "www.studioflowandsystems.com", action: "studio_site" });
  if (u.includes("services.leadconnectorhq.com")) { const p = u.split(".com")[1]; ghl.push({ m, p, body });
    if (p === "/contacts/upsert") return Response.json({ contact: { id: "c1" } }); return Response.json({ ok: true }); }
  if (u.includes("api.telegram.org")) { tg++; return Response.json({ ok: true }); }
  return new Response("{}", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", TURNSTILE_SECRET_KEY: "t", TELEGRAM_BOT_TOKEN: "b", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
DB.team_settings.push({ key: "telegram", value: { chat_id: 1 } });
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const site = "https://www.studioflowandsystems.com";
const post = (body, origin = site) => w.fetch(new Request("https://studioflowandsystems.app/api/v1/onboard", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" }, body: JSON.stringify(body) }), env, ctx);
const good = { name: "Mat Kitching", email: "Mat@PLF.com.au", phone: "0412 345 678", business: "Pure Life Force", website: "purelifeforce.com.au", services: "Massage, breathwork, coaching", faqs: "How long is a session?", systems: ["Cliniko", "Stripe", "Hackertool"], other_systems: "Canva", brand: "drive.google.com/x", consent: true, turnstile: "x" };
let r = await post(good, "https://evil.example"); assert(r.status === 403, "Only the Studio Flow website can use it");
r = await post({ ...good, consent: false }); assert(r.status === 400, "Needs consent");
r = await post({ ...good, notes: "Cliniko login mat@plf.com.au password: hunter2" }); let j = await r.json();
assert(r.status === 400 && /passwords/.test(j.error), "Refuses anything that looks like a password");
assert(!ghl.length, "Nothing saved when a password is pasted");
turnstileOk = false; r = await post(good); assert(r.status === 403, "Bots are stopped"); turnstileOk = true;
r = await post(good); j = await r.json(); await flush();
assert(j.ok, "Accepts a good intake");
const up = ghl.find((x) => x.p === "/contacts/upsert");
assert(up && up.body.email === "mat@plf.com.au" && up.body.tags.includes("onboarding-intake-done") && up.body.website === "https://purelifeforce.com.au/", "Contact updated + tagged onboarding-intake-done");
const note = ghl.find((x) => x.p === "/contacts/c1/notes");
assert(note && /SERVICES\nMassage/.test(note.body.body) && /Cliniko, Stripe, Canva/.test(note.body.body) && !/Hackertool/.test(note.body.body) && /https:\/\/drive\.google\.com\/x/.test(note.body.body), "Full intake saved as a note (unknown systems dropped)");
const em = ghl.find((x) => x.p === "/conversations/messages");
assert(em && /onboarding details/.test(em.body.subject) && /never ask for passwords/.test(em.body.html), "Branded confirmation email sent");
assert(tg >= 1, "Ty gets a Telegram summary");
console.log("onboard-v66 OK");
