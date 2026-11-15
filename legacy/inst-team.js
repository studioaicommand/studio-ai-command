// src/team/instance.js (v43): brand, features and industry templates for a client's own copy of Command.
var INDUSTRY_TEMPLATES = {
  allied_health: { label: "Allied health clinic (physio, chiro, podiatry, psychology)", customers: "patients", services: "appointments and treatment plans", wins: ["Answer every enquiry and missed call within minutes, day and night, and get them booked", "Fill gaps in the diary: waitlists, cancellations and recall reminders for patients due back", "Turn happy patients into 5-star Google reviews", "Reactivate patients who haven't booked in 3+ months", "Keep the front desk's admin down: confirmations, forms and FAQs handled automatically"], compliance: ["AHPRA advertising rules: no testimonials in advertising, no claims of guaranteed outcomes, no clinical advice from the AI", "Health privacy: never repeat or store health details in messages; move them to the practice software", "Emergencies: tell people to call 000"], urgent: "a new patient enquiry, a cancellation that can be filled, an unhappy patient, a booking request after hours" },
  dental: { label: "Dental practice", customers: "patients", services: "check-ups, treatments and emergency appointments", wins: ["Answer every enquiry and dental emergency fast, and book them in", "Fill cancellations and recall patients overdue for a check-up and clean", "Grow 5-star Google reviews", "Follow up treatment plans that weren't booked", "Cut front-desk admin with automatic confirmations and FAQs"], compliance: ["AHPRA advertising rules: no testimonials in advertising, no guaranteed outcomes, no clinical advice from the AI", "Health privacy: no health details in messages", "Dental pain or trauma after hours: give the emergency option the practice offers, or 000 when it's life-threatening"], urgent: "a dental emergency, a new patient enquiry, a cancellation to fill, an unhappy patient" },
  aesthetics_beauty: { label: "Salon, beauty or aesthetics", customers: "clients", services: "appointments, packages and products", wins: ["Reply to every Instagram, Facebook and website enquiry within minutes and book them", "Fill empty chairs: last-minute openings, waitlists, rebooking reminders", "Turn regulars into 5-star reviews and referrals", "Win back clients who haven't rebooked in 8+ weeks", "Promote packages and products to the right clients"], compliance: ["Cosmetic injectables and medical aesthetics: follow AHPRA and TGA rules, no before/after promises", "Patch tests and contraindications: never give medical advice; the practitioner decides", "Respect unsubscribe and do-not-contact requests"], urgent: "a new booking enquiry, a same-day opening that can be filled, an unhappy client" },
  property_management: { label: "Property management / real estate", customers: "landlords, tenants and buyers", services: "rentals, sales, maintenance and inspections", wins: ["Answer every rental, sales and maintenance enquiry fast, day and night", "Triage maintenance: capture details and photos, flag urgent repairs straight away", "Book inspections and appraisals without phone tag", "Keep landlords updated and win new management listings", "Turn happy owners and tenants into reviews and referrals"], compliance: ["Follow the state's property and tenancy law (QLD: RTA and Property Occupations Act); never give legal advice", "Urgent repairs (gas, flooding, electrical, security) go to the property manager immediately", "No discrimination in tenant selection; privacy of tenant information"], urgent: "an urgent repair, a new management listing or appraisal request, an unhappy landlord, a hot buyer" },
  trades: { label: "Trades and home services", customers: "customers", services: "quotes, jobs and call-outs", wins: ["Answer every call, text and quote request fast, even on the tools", "Book quotes and jobs straight into the calendar", "Follow up every quote that hasn't been accepted", "Ask every happy customer for a 5-star review", "Turn one-off jobs into maintenance and repeat work"], compliance: ["Never quote a firm price without the owner's yes; give ranges only if the owner has set them", "Licensing and safety: urgent gas, electrical or water emergencies get the emergency number straight away", "Respect do-not-contact requests"], urgent: "an emergency job, a big quote request, a quote ready to accept, an unhappy customer" },
  childcare_education: { label: "Childcare, kindy or education", customers: "families", services: "enrolments, tours and programs", wins: ["Answer every family's enquiry fast and book a tour", "Keep the waitlist warm and fill vacancies the day they open", "Make enrolment simple: reminders for forms and documents", "Turn happy families into reviews and referrals", "Keep families informed with clear, warm updates"], compliance: ["Child safety and privacy first: never share or ask for a child's full name, health or custody details in messages", "Never promise a vacancy or a fee outcome; the director confirms", "Child Care Subsidy amounts depend on the family: point to the government estimator"], urgent: "a tour request, a vacancy that can be filled, a concerned parent" },
  fitness_wellness: { label: "Gym, fitness or wellness studio", customers: "members", services: "memberships, classes and sessions", wins: ["Answer every trial and membership enquiry fast and book a first session", "Follow up trials until they join", "Win back members who stopped coming", "Fill classes and sessions with reminders and waitlists", "Grow reviews and referrals from happy members"], compliance: ["No medical or injury advice; refer to a GP or physio", "Clear, honest membership terms; never pressure", "Respect do-not-contact requests"], urgent: "a trial booking, a membership enquiry, a member about to cancel" },
  professional_services: { label: "Professional services (accounting, legal, consulting)", customers: "clients", services: "consultations and engagements", wins: ["Answer every enquiry fast and book a consultation", "Qualify enquiries so the team spends time on the right work", "Chase documents and signatures automatically", "Follow up proposals that haven't been accepted", "Stay in touch with past clients for repeat and referral work"], compliance: ["Never give legal, tax or financial advice in messages; book a consultation", "Confidentiality: no client details in messages", "Follow the profession's advertising and conduct rules"], urgent: "a new enquiry with a deadline, a proposal ready to sign, an unhappy client" },
  hospitality: { label: "Cafe, restaurant or hospitality", customers: "guests", services: "bookings, functions and events", wins: ["Answer every booking and function enquiry fast", "Fill quiet nights with offers to regulars", "Turn happy guests into 5-star reviews", "Win more functions and events with quick, clear quotes", "Keep the team's admin light"], compliance: ["Allergies: never guarantee a dish is allergen-free; the kitchen confirms", "Responsible service of alcohol", "Respect do-not-contact requests"], urgent: "a large booking or function enquiry, a complaint, a review that needs a reply" },
  other: { label: "Other local business", customers: "customers", services: "enquiries and bookings", wins: ["Answer every enquiry fast, day and night", "Turn enquiries into bookings and sales", "Follow up everyone who didn't book", "Grow 5-star reviews", "Win back past customers"], compliance: ["Never invent prices, availability or guarantees", "Respect do-not-contact requests"], urgent: "a hot enquiry, an unhappy customer, a big opportunity" }
};
var INST_SHIFTS_ON = ["morning_briefing", "sales_am", "sales_pm", "weekly_reports", "marketing_review", "finance_check", "client_health", "content_plan", "brand_radar", "authority_content", "email_nurture", "systems_review", "ops_health"];
function instCharter(p, t, target) {
  const owner = p.owner_name || p.owner_first || "the owner", first = p.owner_first || String(owner).split(" ")[0];
  return `${p.product_name || p.business_name + " Command"} CHARTER (owner: ${owner}, ${p.business_name}${p.location ? ", " + p.location : ""})

MISSION
Help ${p.business_name} grow: every enquiry answered fast, more bookings, more repeat ${t.customers}, more 5-star reviews, and less admin for ${first}.${target ? " Revenue goal: $" + Math.round(target).toLocaleString("en-AU") + " a month." : ""} Every agent judges its work by one question: does this win ${p.business_name} more booked ${t.customers} or save ${first} time?

WHO WE SERVE
${p.business_name} is a ${p.industry || t.label} business${p.website ? " (" + p.website + ")" : ""}. Its ${t.customers} come for ${t.services}.${p.booking_link ? " Booking link: " + p.booking_link + "." : ""}

WHAT THE TEAM WORKS ON (in this order)
${t.wins.map((w, n) => n + 1 + ". " + w).join("\n")}

WHAT COMMAND MAY DO WITHOUT ASKING
- Research, reports, notes, tasks, tags, tidying CRM data.
- Draft replies, follow-ups, content and review requests for ${first}'s approval.

WHAT NEEDS ${first.toUpperCase()}'S YES (sent with Approve / Reject buttons)
- Any message to a ${t.customers.replace(/s$/, "")} or contact, unless ${first} has switched that channel to automatic in Settings.
- Anything involving money (invoices, refunds, prices, discounts, spending).
- Deleting anything, new team rules, settings or system changes.
URGENT (ping ${first} straight away): ${t.urgent}. Everything else goes in the morning briefing.

BRAND AND COMPLIANCE (never break these)
${t.compliance.map((c) => "- " + c).join("\n")}
- Never invent prices, availability, results, reviews or guarantees. If unsure, ask.
- Australian English. Warm, local, clear, never pushy.

HOW THE TEAM GETS BETTER
- Learn from evidence: replies, bookings, reviews, ${first}'s edits and rejections.
- Propose small experiments with a clear measure, keep what works, drop what doesn't.
- Keep ${first}'s day simple: one short task list from the Chief of Staff.
`;
}
async function instApplyTemplate(env, p, key, target) {
  const t = INDUSTRY_TEMPLATES[key] || INDUSTRY_TEMPLATES.other;
  await saveSetting(env, "charter", instCharter(p, t, target));
  await saveSetting(env, "shifts", DEFAULT_SHIFTS.map((s) => ({ id: s.id, enabled: INST_SHIFTS_ON.includes(s.id), hour: s.hour, days: s.days })));
  if (target > 0) await saveSetting(env, "mission", { target_monthly_aud: Math.round(target), label: "$" + Math.round(target).toLocaleString("en-AU") + " a month" });
  const facts = [`The business is ${p.business_name}${p.industry ? ", a " + p.industry : ""}${p.location ? " in " + p.location : ""}.`, `The owner is ${p.owner_name || p.owner_first}.`, p.website && `Website: ${p.website}`, p.booking_link && `Booking link: ${p.booking_link}`].filter(Boolean);
  await insert(env, "team_memory", facts.map((fact) => ({ category: "business", fact }))).catch(() => {});
  return { template: key, label: t.label, shifts_on: INST_SHIFTS_ON.length };
}
async function instRoute(p, m, body, env, request) {
  const raw = await secGet(env, "instance").catch(() => null) || {};
  if (p === "/instance" && m === "GET") {
    const clientModules = Object.fromEntries(Object.entries(INST_MODULES).filter(([k]) => k !== "outreach"));
    const assets = await secGet(env, "instance_assets").catch(() => null) || {};
    const kb = await secGet(env, "instance_kb").catch(() => null);
    return json({ ok: true, profile: raw, computed: await instGet(env, true), modules: clientModules, templates: Object.fromEntries(Object.entries(INDUSTRY_TEMPLATES).map(([k, t]) => [k, t.label])), assets: Object.fromEntries(Object.entries(assets).map(([k, a]) => [k, { type: a.type, kb: Math.round((a.b64 || "").length * 0.75 / 1024) }])), knows_business: !!kb, knows: kb ? { services: (kb.services || []).length, faqs: (kb.faqs || []).length } : null });
  }
  if (p === "/instance" && m === "POST") {
    const next = { ...raw };
    for (const k of ["business_name", "product_name", "owner_name", "owner_first", "industry", "website", "booking_link", "location", "login_headline"]) if (body[k] != null) next[k] = String(body[k]).trim().slice(0, k === "website" || k === "booking_link" ? 300 : 120);
    if (body.colours) next.colours = { primary: /^#[0-9a-f]{6}$/i.test(body.colours.primary || "") ? body.colours.primary : raw.colours?.primary || null, accent: /^#[0-9a-f]{6}$/i.test(body.colours.accent || "") ? body.colours.accent : raw.colours?.accent || null };
    if (body.modules && typeof body.modules === "object") next.modules = Object.fromEntries(Object.keys(INST_MODULES).map((k) => [k, k === "outreach" ? false : body.modules[k] === true]));
    if (next.modules && !body.is_studio) next.modules.outreach = false;
    if (body.is_studio != null) next.is_studio = !!body.is_studio;
    if (next.is_studio) next.modules = Object.fromEntries(Object.keys(INST_MODULES).map((k) => [k, true]));
    if (!next.is_studio && !next.business_name) return json({ ok: false, error: "Add the business name." }, 400);
    next.updated = new Date().toISOString();
    if (body.template && INDUSTRY_TEMPLATES[body.template]) next.template = body.template;
    await secPut(env, "instance", next);
    INST_CACHE = { at: 0, v: null };
    const out = { ok: true, profile: next };
    if (body.apply_template && next.template && !next.is_studio) out.applied = await instApplyTemplate(env, next, next.template, +body.mission_target || 0);
    if (body.learn_website && next.website && !next.is_studio) {
      try {
        const d = await buildDemo(env, { website: next.website, business_name: next.business_name, vertical: "other" }, { force: true });
        await secPut(env, "instance_kb", { ...d.kb, built: new Date().toISOString() });
        out.learned = { services: (d.kb?.services || []).length, faqs: (d.kb?.faqs || []).length, quality: d.quality };
      } catch (e) { out.learn_error = String(e.message).slice(0, 160); }
    }
    return json(out);
  }
  if (p === "/instance/asset" && m === "POST") {
    const kind = ["logo", "mark", "icon"].includes(body.kind) ? body.kind : null, type = String(body.type || "");
    if (!kind) return json({ ok: false, error: "Choose logo, mark or icon." }, 400);
    if (!/^image\/(png|webp|jpeg)$/.test(type)) return json({ ok: false, error: "Use a PNG, WebP or JPEG image." }, 400);
    const b64 = String(body.b64 || "").replace(/^data:[^,]+,/, "");
    if (!/^[A-Za-z0-9+/=]+$/.test(b64) || b64.length > 560e3) return json({ ok: false, error: "That image is too big. Keep it under 400 KB." }, 400);
    const assets = await secGet(env, "instance_assets").catch(() => null) || {};
    assets[kind] = { type, b64 };
    await secPut(env, "instance_assets", assets);
    await secPut(env, "instance", { ...raw, assets_v: (raw.assets_v || 0) + 1 });
    INST_CACHE = { at: 0, v: null };
    return json({ ok: true });
  }
  return null;
}
