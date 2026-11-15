// ── v66: Client onboarding intake. The website /start/ page posts here once a client has paid for setup.
// Saves everything to their GHL contact as a note + custom tag, tags onboarding-intake-done (which the GHL onboarding
// workflow waits on), emails them a branded confirmation and pings Ty on Telegram with the summary.
// Never collects passwords: access is handled by invites on the onboarding call. ──
const ONB_SYSTEMS = ["GoHighLevel", "Cliniko", "Xero", "MYOB", "QuickBooks", "Stripe", "Square", "Google Workspace", "Microsoft 365", "Shopify", "WordPress", "Wix", "Squarespace", "Fresha", "Timely", "Calendly", "ServiceM8", "Tradify", "Simpro", "PropertyMe", "Other"];
function onbClean(v, n) { return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b-\u001f<>]/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, n); }
function onbUrl(v) { const s = onbClean(v, 300); if (!s) return ""; try { const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s); return /^https?:$/.test(u.protocol) ? u.href : ""; } catch { return ""; } }
async function onboardPublic(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/v1/onboard") return null;
  const origin = request.headers.get("Origin") || "";
  const H = { ...siteCors(env, origin), "Content-Type": "application/json" };
  const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: H });
  if (request.method === "OPTIONS") return new Response(null, { status: siteOriginAllowed(env, origin) ? 204 : 403, headers: siteCors(env, origin) });
  if (request.method !== "POST") return J({ ok: false, error: "Use POST." }, 405);
  if (!siteOriginAllowed(env, origin)) return J({ ok: false, error: "This form only runs on the Studio Flow website." }, 403);
  let b = {};
  try { const t = await request.text(); if (t.length > 16000) throw 0; b = JSON.parse(t); } catch { return J({ ok: false, error: "Invalid request." }, 400); }
  const f = {
    name: onbClean(b.name, 80), email: onbClean(b.email, 120).toLowerCase(), phone: onbClean(b.phone, 30), business: onbClean(b.business, 120),
    website: onbUrl(b.website), abn: onbClean(b.abn, 20), address: onbClean(b.address, 200), hours: onbClean(b.hours, 300),
    services: onbClean(b.services, 1500), faqs: onbClean(b.faqs, 1500), tone: onbClean(b.tone, 300), goals: onbClean(b.goals, 1000),
    brand: onbUrl(b.brand), booking: onbUrl(b.booking), team: onbClean(b.team, 600), notes: onbClean(b.notes, 1500),
    systems: (Array.isArray(b.systems) ? b.systems : []).map((x) => onbClean(x, 40)).filter((x) => ONB_SYSTEMS.includes(x)).slice(0, 20),
    other_systems: onbClean(b.other_systems, 200),
  };
  if (f.name.length < 2) return J({ ok: false, error: "Add your name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) return J({ ok: false, error: "Add a valid email." }, 400);
  if (f.phone && !/^\+?[\d\s()-]{8,18}$/.test(f.phone)) return J({ ok: false, error: "That phone number doesn't look right." }, 400);
  if (f.business.length < 2) return J({ ok: false, error: "Add your business name." }, 400);
  if (f.services.length < 5) return J({ ok: false, error: "Tell us the main services you offer." }, 400);
  // Passwords never belong in this form. Refuse anything that looks like one so it never lands in the CRM.
  const all = Object.values(f).flat().join(" \n ");
  if (/\b(pass(word|wd|code)?|pwd|pin)\s*[:=]/i.test(all)) return J({ ok: false, error: "Please don't put passwords in this form. We'll set up secure access with you on the onboarding call." }, 400);
  if (b.consent !== true) return J({ ok: false, error: "Please tick the box so we can use this to set up your system." }, 400);
  const ip = request.headers.get("CF-Connecting-IP") || "";
  try { await siteTurnstile(env, b.turnstile, ip); } catch (e) { return J({ ok: false, error: e.message }, e.status || 403); }
  const te = teamEnv(env);
  const pub = (env.PUBLIC_ORIGIN || env.STUDIO_PUBLIC_ORIGIN || "https://studioflowandsystems.app").replace(/\/+$/, "");
  const when = new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane" });
  const note = [
    `ONBOARDING INTAKE (${when} Brisbane)`,
    `Business: ${f.business}${f.abn ? " · ABN " + f.abn : ""}`, `Contact: ${f.name} · ${f.email}${f.phone ? " · " + f.phone : ""}`,
    f.website && `Website: ${f.website}`, f.address && `Address / service area: ${f.address}`, f.hours && `Hours: ${f.hours}`,
    `\nSERVICES\n${f.services}`, f.faqs && `\nTOP QUESTIONS CUSTOMERS ASK\n${f.faqs}`, f.tone && `\nTONE OF VOICE\n${f.tone}`,
    f.goals && `\nGOALS FOR THE FIRST 90 DAYS\n${f.goals}`,
    `\nSYSTEMS THEY USE\n${[...f.systems, f.other_systems].filter(Boolean).join(", ") || "-"}`,
    f.booking && `Current booking link: ${f.booking}`, f.brand && `Brand files: ${f.brand}`, f.team && `\nTEAM\n${f.team}`, f.notes && `\nANYTHING ELSE\n${f.notes}`,
    `\nAccess: no passwords collected. Set up invites on the onboarding call.`,
  ].filter(Boolean).join("\n");
  let contactId = null;
  try {
    const [first, ...rest] = f.name.split(" ");
    const d = await req(te, "POST", "/contacts/upsert", { locationId: te.GHL_LOCATION_ID, email: f.email, phone: f.phone || undefined, firstName: first, lastName: rest.join(" ") || undefined, companyName: f.business, website: f.website || undefined, source: "Onboarding intake", tags: ["onboarding-intake-done", "client"] });
    contactId = d?.contact?.id || null;
    if (contactId) {
      await req(te, "POST", `/contacts/${contactId}/notes`, { body: note }).catch(() => {});
      const body = `Hi ${first},\n\nThanks, we've got everything. Here's what happens next:\n\n1. On your onboarding call we set up secure access to your systems with you. We never ask for passwords by email or form.\n2. We build your system and keep you posted at each step.\n3. You approve everything before it goes live.\n\nIf you think of anything else, just reply to this email.`;
      await sendEmail(te, contactId, "Got it: your onboarding details are in", brandedEmail({ body, origin: pub, kind: "message", closing: "Cheers," })).catch(() => {});
    }
  } catch (e) { /* fall through: Ty still gets the Telegram summary */ }
  ctx?.waitUntil?.(siteNotifyTy(env, `🚀 <b>Onboarding intake in</b>\n${siteEsc(f.business)} · ${siteEsc(f.name)}\n${siteEsc(f.email)}${f.phone ? " · " + siteEsc(f.phone) : ""}\nSystems: ${siteEsc([...f.systems, f.other_systems].filter(Boolean).join(", ") || "-")}\n${contactId ? "Saved to GHL (tag onboarding-intake-done). Book access setup on the onboarding call." : "⚠️ GHL save failed. Full details below."}\n\n${siteEsc(note.slice(0, 2500))}`));
  return J({ ok: true });
}
