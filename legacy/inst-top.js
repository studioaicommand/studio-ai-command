// v43 instance profile: whose Command this is (Studio's own, or a client's white-label copy).
// No profile saved = Studio Flow's own Command, exactly as before.
var INST_MODULES = {
  outreach: { label: "Lead finding and outreach (Studio only, never on client copies)", desc: "Prospect hunts, call lists, cold email campaign, receptionist and website demos, leak reports" },
  receptionist_product: { label: "Sell AI receptionists", desc: "Receptionist clients, website widgets, client book" },
  offers_page: { label: "Public offers page", desc: "A shareable page of your products and prices" },
  site_assistant: { label: "Website assistant", desc: "The Studio AI chat on your public website" }
};
var INST_CACHE = { at: 0, v: null };
async function instGet(env, fresh) {
  if (!fresh && INST_CACHE.v && Date.now() - INST_CACHE.at < 30e3) return INST_CACHE.v;
  const raw = await secGet(env, "instance").catch(() => null);
  const custom = !!(raw && raw.business_name && !raw.is_studio);
  const mods = {};
  for (const k of Object.keys(INST_MODULES)) mods[k] = custom ? k !== "outreach" && raw?.modules?.[k] === true : raw?.modules?.[k] !== false;
  const v = {
    custom,
    business_name: custom ? String(raw.business_name).slice(0, 80) : "Studio Flow & Systems",
    product_name: custom ? String(raw.product_name || raw.business_name + " Command").slice(0, 60) : "Studio AI",
    owner_name: custom ? String(raw.owner_name || "").slice(0, 80) : "Ty Brazel",
    owner_first: custom ? String(raw.owner_first || String(raw.owner_name || "").split(" ")[0] || "the owner").slice(0, 40) : "Ty",
    industry: custom ? String(raw.industry || "").slice(0, 60) : "AI systems studio",
    template: raw?.template || null,
    website: raw?.website || "", booking_link: raw?.booking_link || "", location: raw?.location || "",
    colours: { primary: /^#[0-9a-f]{6}$/i.test(raw?.colours?.primary || "") ? raw.colours.primary : null, accent: /^#[0-9a-f]{6}$/i.test(raw?.colours?.accent || "") ? raw.colours.accent : null },
    login_headline: custom ? String(raw.login_headline || "Your business, run by AI.").slice(0, 80) : null,
    assets_v: raw?.assets_v || 0,
    modules: mods,
    updated: raw?.updated || null
  };
  INST_CACHE = { at: Date.now(), v };
  return v;
}
async function instPublic(env) {
  const i = await instGet(env);
  return { ok: true, custom: i.custom, business_name: i.business_name, product_name: i.product_name, owner_first: i.owner_first, colours: i.colours, login_headline: i.login_headline, assets_v: i.assets_v, modules: i.modules };
}
// Every AI prompt in a client's copy is told whose business it is, and Studio's own names are swapped for theirs.
function instRewrite(t, i) {
  return String(t).replace(/Studio Flow (&|&amp;|and) Systems/g, i.business_name).replace(/Studio AI Command/g, i.product_name).replace(/Studio AI/g, i.product_name).replace(/Ty Brazel/g, i.owner_name || i.owner_first).replace(/\bTy's\b/g, i.owner_first + "'s").replace(/\bTy\b/g, i.owner_first);
}
function instBanner(i) {
  return `THIS COMMAND BELONGS TO ${i.business_name}${i.industry ? " (" + i.industry + ")" : ""}${i.location ? ", " + i.location : ""}. Owner: ${i.owner_name || i.owner_first}. You are ${i.product_name}, working only for ${i.business_name}${i.website ? " (" + i.website + ")" : ""}. Older instructions may describe an AI agency's own sales work (selling AI receptionists, websites, audits or demos to clinics): that is NOT this business. Never offer or mention those services; apply the same skills to ${i.business_name}'s own customers, enquiries, bookings, reviews and growth.${i.booking_link ? " Their booking link: " + i.booking_link + "." : ""}\n\n`;
}
async function instPrompt(env, body) {
  const i = await instGet(env).catch(() => null);
  if (!i || !i.custom || !body) return body;
  const out = { ...body };
  if (typeof out.system === "string") out.system = instBanner(i) + instRewrite(out.system, i);
  else if (Array.isArray(out.system)) out.system = [{ type: "text", text: instBanner(i) }, ...out.system.map((b) => b && b.type === "text" ? { ...b, text: instRewrite(b.text, i) } : b)];
  else out.system = instBanner(i).trim();
  return out;
}
async function instText(env, text) {
  const i = await instGet(env).catch(() => null);
  return i && i.custom ? instBanner(i) + instRewrite(text, i) : text;
}
// Features that are switched off for this copy answer "not found", on the API and in public.
var INST_RULES = [
  ["outreach", /^\/api\/v1\/team\/(prospects|hunt|campaign|calls|demos|demo-followups|website-demos|imports|replies|rescan|business|workday)(\/|$)|^\/(demo|demo-assets|leak-report)\/|^\/api\/v1\/demo\//],
  ["receptionist_product", /^\/api\/v1\/team\/(clients|book)(\/|$)|^\/w\/|^\/api\/v1\/w\//],
  ["offers_page", /^\/offers\/?$|^\/api\/v1\/team\/offers(\/|$)/],
  ["site_assistant", /^\/api\/v1\/site\/|^\/experience|^\/api\/v1\/public\//]
];
async function instGate(request, env, ctx) {
  const url = new URL(request.url), p = url.pathname;
  if (p === "/api/v1/setup" && request.method === "POST") return instSetup(request, env, ctx);
  if (p === "/api/v1/instance/brand" && request.method === "GET") return secJson(await instPublic(env));
  if (/^\/app\/(logo\.webp|mark\.webp|icon\.png|manifest\.webmanifest)$/.test(p) && request.method === "GET") {
    const i = await instGet(env);
    if (!i.custom) return null;
    if (p.endsWith("manifest.webmanifest")) return new Response(JSON.stringify({ name: i.product_name, short_name: i.product_name.slice(0, 12), start_url: "/command-next", scope: "/", display: "standalone", background_color: "#020711", theme_color: i.colours.primary || "#020711", icons: [{ src: "/app/icon.png?b=" + i.assets_v, sizes: "512x512", type: "image/png", purpose: "any maskable" }] }), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-cache" } });
    const assets = await secGet(env, "instance_assets").catch(() => null) || {};
    const a = assets[p.includes("logo") ? "logo" : p.includes("mark") ? "mark" : "icon"] || (p.includes("mark") ? assets.icon : null);
    if (!a?.b64) return null;
    return new Response(Uint8Array.from(atob(a.b64), (c) => c.charCodeAt(0)), { headers: { "Content-Type": a.type || "image/png", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
  }
  for (const [mod, re] of INST_RULES) {
    if (!re.test(p)) continue;
    const i = await instGet(env);
    if (!i.modules[mod]) return secJson({ ok: false, error: "This feature isn't switched on for this Command.", module: mod }, 404);
  }
  return null;
}
async function instKb(env) {
  const i = await instGet(env).catch(() => null);
  if (!i || !i.custom) return null;
  return await secGet(env, "instance_kb").catch(() => null);
}
// One-time setup of a new client copy, run by the setup script with a single-use SETUP_TOKEN.
async function instSetup(request, env, ctx) {
  const json2 = (o, s = 200) => secJson(o, s);
  const h = request.headers.get("Authorization") || "";
  if (!env.SETUP_TOKEN || !h.startsWith("Bearer ") || !secEq(h.slice(7).trim(), String(env.SETUP_TOKEN))) return json2({ ok: false, error: "Not found." }, 404);
  if (await secGet(env, "setup_done").catch(() => null)) return json2({ ok: false, error: "This Command is already set up. Use Settings > Brand & features." }, 409);
  const b = await request.json().catch(() => ({}));
  const origin = new URL(request.url).origin;
  const r = await teamFetch(new Request(origin + "/api/v1/team/instance", { method: "POST", headers: { Authorization: "Bearer " + (env.STUDIO_TEST_KEY || env.TEAM_API_KEY), "Content-Type": "application/json" }, body: JSON.stringify({ apply_template: true, ...(b.instance || {}), is_studio: false }) }), env, ctx);
  const inst = await r.json().catch(() => ({}));
  if (!r.ok || inst.ok === false) return json2({ ok: false, error: "Couldn't save the business profile: " + (inst.error || r.status) }, 400);
  const M = await memLoad(env, true);
  const people = [{ name: String(b.owner?.name || b.instance?.owner_name || "Owner").slice(0, 60), role: "owner" }, ...(Array.isArray(b.invites) ? b.invites : [])].slice(0, 10);
  const invites = [];
  for (const p of people) {
    const name = String(p.name || "").trim().slice(0, 60), role = MEM_ROLES[p.role] ? p.role : "staff";
    if (!name) continue;
    const tok = memB64(memRand(24));
    M.invites.push({ id: memHex(memRand(6)), hash: await memSha("invite|" + tok), name, role, user_id: memHex(memRand(8)), exp: Date.now() + 7 * 864e5, by: "Setup" });
    invites.push({ name, role, link: origin + "/command-next#invite=" + tok });
  }
  await memSave(env, M);
  await secPut(env, "setup_done", { at: new Date().toISOString() });
  await secLog(env, { actor: "Setup", action: "setup", summary: `Command set up for ${inst.profile?.business_name || "a client"} with ${invites.length} invite(s)` });
  return json2({ ok: true, business: inst.profile?.business_name, applied: inst.applied || null, learned: inst.learned || null, learn_error: inst.learn_error || null, invites });
}
