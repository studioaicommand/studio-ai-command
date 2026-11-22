// v152 add businesses Ty names himself (a screenshot, a link): no search, straight into the hunt's research, concept, email and approval
// steps, with a new "Full front desk" pitch. Businesses Ty picks are never dropped for a low score.
import { readFileSync } from "node:fs";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [], team_audit: [], agent_prospects: [{ id: "p0", website: "knowndental.com.au", business_name: "Known Dental" }] }; let seq = 0;
const val = (r, k) => r[k] == null ? "" : String(r[k]);
const one = (r, part) => { const i = part.indexOf("="); if (i < 0) return true; const k = part.slice(0, i), v = part.slice(i + 1); if (["select", "limit", "order", "offset", "on_conflict"].includes(k)) return true; const m = v.match(/^eq\.(.*)$/); return m ? val(r, k) === m[1] : true; };
let anthropic = 0;
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = JSON.parse(init.body); } catch {}
  if (u.includes("api.anthropic.com")) { anthropic++; return Response.json({ content: [], usage: {} }); }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const parts = decodeURIComponent(qs).split("&"); const ok = (r) => parts.every((p) => one(r, p));
    if (m === "GET") return Response.json(t.filter(ok));
    if (m === "POST") { const rows = [].concat(body || []).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const hit = t.filter(ok); for (const r of hit) Object.assign(r, body); return Response.json(hit); }
    return Response.json([]); }
  return Response.json({ ok: true }); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const base = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const call = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), base, { waitUntil() {} }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

let x = await call("/api/v1/team/prospects/add", { pitch: "front_desk", vertical: "dental", note: "Assistant answers the phone between patients", businesses: [
  { business_name: "Bronte Dental Centre", website: "https://www.brontedentalcentre.com.au/", email: "INFO@brontedentalcentre.com.au" },
  { business_name: "Wellness Dental Bronte", website: "wellnessdentalbronte.com.au", note: "Book online, but no email" },
  { business_name: "Known Dental", website: "knowndental.com.au" },
  { business_name: "No Site Plumbing", website: "" },
  { business_name: "", website: "x.com.au" },
  { business_name: "Bronte Again", website: "brontedentalcentre.com.au" }] });
const h = x.j.hunt;
assert(x.j.ok && h.status === "running" && h.source === "manual_add" && h.pitch === "front_desk" && h.vertical === "dental", "Added businesses start straight away with the Full front desk pitch");
assert(anthropic === 0, "No search is run for businesses Ty names");
const hv = DB.team_settings.find((r) => r.key === "hunts")?.value; const job = ((Array.isArray(hv) ? hv : hv?.list || hv?.value || []).find((j) => j.id === h.id)) || {};
const cand = job.candidates || [];
assert(cand.length === 2 && cand[0].website === "https://brontedentalcentre.com.au" && cand[1].website === "https://wellnessdentalbronte.com.au", "Websites are cleaned (with or without https and www)");
assert(cand[0].email === "info@brontedentalcentre.com.au" && cand[1].email === null && cand[1].note === "Book online, but no email" && cand[0].note === "Assistant answers the phone between patients", "Emails and Ty's angle are kept per business");
const why = Object.fromEntries(h.results.skipped.map((s) => [s.name, s.why]));
assert(/already in prospects/.test(why["Known Dental"]) && /no-website finder/.test(why["No Site Plumbing"]) && /business name/.test(why["x.com.au"]) && /duplicate/.test(why["Bronte Again"]), "Known, duplicate, unnamed and no-website entries are skipped with a reason");
assert(DB.team_audit.some((a) => a.action === "prospects_added" && /Bronte Dental Centre, Wellness Dental Bronte/.test(a.summary)), "The add is written to History");
x = await call("/api/v1/team/prospects/add", { businesses: [] });
assert(x.s === 400, "An empty list is refused");
x = await call("/api/v1/team/outreach/daily");
assert((x.j.pitches || []).some((p) => p.id === "front_desk" && /Full front desk/.test(p.name)), "Full front desk is one of the pitches");

const src = readFileSync(W, "utf8");
assert(/THIS CAMPAIGN SELLS THE FULL FRONT DESK/.test(src) && /dental assistant, nurse or practitioner\) in between clients/.test(src) && /never as a fact about them unless their research confirms it/.test(src), "The pitch covers the assistant-on-the-front-desk angle without claiming it as fact");
assert(/Google review automatically/.test(src) && /past clients come back|so they come back/.test(src) && /new website comes with it/.test(src), "It offers reviews, past-client recalls and a new website when theirs is dated");
assert(/job\.manual \? "high" : sc\.band/.test(src) && (src.match(/job\.manual \? "high" : scoreProspect/g) || []).length === 2, "Businesses Ty picks are never dropped for a low score");
assert(/job\.pitch === "command" \|\| job\.pitch === "front_desk" \? outCommandDemo/.test(src), "Front desk emails carry the live demo link");
assert(/var ACQUIRE = \["find_no_website_businesses", "add_businesses_to_outreach"/.test(src) && /"find_no_website_businesses",\s*"add_businesses_to_outreach",/.test(src), "Studio AI can add businesses from a screenshot");
const app = await (await w.fetch(new Request("https://studioflowandsystems.app/app/app.js"), base, { waitUntil() {} })).text();
assert(app.includes("ADD BUSINESSES YOURSELF") && app.includes('"/prospects/add"') && app.includes("v152add(el, d.pitches)"), "Outreach has an Add businesses yourself box");
