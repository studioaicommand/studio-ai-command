// v63: Leak Calculator -> Command: server-side maths, GHL contact + tags + note, report emailed, hosted report page.
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
const post = (body, origin = site) => w.fetch(new Request("https://studioflowandsystems.app/api/v1/leak", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" }, body: JSON.stringify(body) }), env, ctx);
const inputs = { job_value: 250, missed_calls_week: 10, enquiries_week: 20, reply_speed: "day", no_shows_month: 6, quotes_unfollowed_month: 8, unpaid_month: 3000 };
let r = await post({ preview: true, inputs }); let j = await r.json();
// 10*4.33*.3*250=3247.5 ; 20*4.33*.3*.3*250=1948.5 ; 6*.5*250=750 ; 8*.2*250=400 ; 3000*.1=300
assert(j.ok && j.calc.monthly === 6645 && j.calc.lines[0].key === "missed_calls", "Maths is done on the server, biggest leak first: " + j.calc.monthly);
r = await post({ preview: true, inputs }, "https://evil.example"); assert(r.status === 403, "Only the Studio Flow website can use it");
r = await post({ inputs, name: "Sarah King", email: "sarah@clinic.com.au", business: "Smile Co", industry: "Dental", consent: false, turnstile: "x" }); assert(r.status === 400, "Needs consent before emailing the report");
turnstileOk = false; r = await post({ inputs, name: "Sarah King", email: "sarah@clinic.com.au", business: "Smile Co", industry: "Dental", consent: true, turnstile: "x" }); assert(r.status === 403, "Bots are stopped by the security check"); turnstileOk = true;
ghl.length = 0;
r = await post({ inputs, name: "Sarah King", email: "Sarah@Clinic.com.au", business: "Smile Co", phone: "0412 345 678", industry: "Dental", consent: true, turnstile: "x" }); j = await r.json(); await flush();
assert(j.ok && /^https:\/\/studioflowandsystems\.app\/leak\/[a-f0-9]{24}$/.test(j.report_url), "Returns the report link");
const up = ghl.find((x) => x.p === "/contacts/upsert");
assert(up && up.body.email === "sarah@clinic.com.au" && up.body.tags.includes("leak-calculator") && up.body.tags.includes("leak-5k-10k") && up.body.tags.includes("industry-dental") && up.body.source === "Website Leak Calculator", "Saved in GHL with tags (leak-calculator, leak band, industry)");
assert(ghl.some((x) => x.p === "/contacts/c1/notes" && /Estimated leak: \$6,645\/month/.test(x.body.body)), "A note with the full breakdown goes on the contact");
const em = ghl.find((x) => x.p === "/conversations/messages");
assert(em && em.body.type === "Email" && /Your Leak Report/.test(em.body.subject) && em.body.html.includes(j.report_url), "Their Leak Report is emailed in the branded template");
assert(tg >= 1, "Ty gets a Telegram ping");
const page = await w.fetch(new Request(j.report_url), env, ctx); const html = await page.text();
assert(page.status === 200 && /Smile Co/.test(html) && /\$6,645 a month/.test(html) && /Missed calls/.test(html) && /noindex/.test(page.headers.get("X-Robots-Tag")), "The hosted report shows their number, leaks and fixes (noindex)");
assert(/Save as PDF/.test(html) && /Full Leak Report \(\$350\) or 2-hour Business Audit \(\$497\)/.test(html), "Report has Save as PDF and the Full Leak Report offer");
const bad = await w.fetch(new Request("https://studioflowandsystems.app/leak/" + "0".repeat(24)), env, ctx); assert(bad.status === 404, "Unknown reports 404");
console.log("leak-v63 OK");
