// ── v68: A smarter, less repetitive designer.
// 1) Art Director: before designing, it studies THIS business and writes a one-off concept (big idea, mood, font pairing,
//    hero, section flow, photo direction and a shot list from their real services), told what the last 8 demos looked like.
// 2) The code then enforces variety: style, hero, fonts and section flow can't repeat the recent demos.
// 3) Photo Director: no photo twice on a page, every photo spot filled, each photo briefed from its own section and the shot list,
//    and Ty's photo rules ("Photos: ...") are saved once and applied to every photo from then on. ──
var WSD_FONT_PAIRS = [
  ["Fraunces", "Inter", "warm editorial"], ["Playfair Display", "Source Sans 3", "classic, elegant"], ["Cormorant Garamond", "Montserrat", "luxury beauty"],
  ["DM Serif Display", "DM Sans", "boutique"], ["Bodoni Moda", "Jost", "fashion, aesthetics"], ["Libre Caslon Display", "Karla", "heritage, established"],
  ["Instrument Serif", "Inter Tight", "modern editorial"], ["Gloock", "Figtree", "confident, contemporary"], ["Syne", "Manrope", "creative, bold"],
  ["Space Grotesk", "Inter", "tech, precise"], ["Sora", "Nunito Sans", "friendly tech"], ["Outfit", "Inter", "clean modern"],
  ["Plus Jakarta Sans", "Plus Jakarta Sans", "clean, professional"], ["Archivo Black", "Archivo", "bold trades"], ["Bebas Neue", "Barlow", "sport, trades, energy"],
  ["Oswald", "Roboto", "industrial, strong"], ["Anton", "Work Sans", "high-energy coach"], ["Unbounded", "Onest", "youthful, bold"],
  ["Bricolage Grotesque", "Inter", "playful modern"], ["Fredoka", "Nunito", "kids, childcare"], ["Baloo 2", "Mulish", "playful, family"],
  ["Lora", "Open Sans", "calm care"], ["Merriweather", "Lato", "trustworthy, medical, legal"], ["Libre Baskerville", "Source Sans 3", "professional services"],
  ["Marcellus", "Raleway", "spa, wellness"], ["Cinzel", "Lato", "premium, formal"], ["Tenor Sans", "Questrial", "minimal wellness"],
  ["Albert Sans", "Albert Sans", "Scandi minimal"], ["Red Hat Display", "Red Hat Text", "modern health"], ["Zilla Slab", "Rubik", "craft, makers, trades"],
  ["Abril Fatface", "Poppins", "bold retail, hospitality"], ["Young Serif", "Inter", "warm cafe, hospitality"]
];
var WSD_PHOTO_TYPES2 = ["hero", "split", "expand", "quote", "gallery", "features"];
function wsdPhotoRules(brain) { return (brain?.lessons || []).map((l) => String(l.text || "")).filter((t) => /^photos?:/i.test(t) || /\b(photo|image|picture|pic)s?\b/i.test(t)).map((t) => t.replace(/^photos?:\s*/i, "")).slice(-15); }
var WSD_CONCEPT_TOOL = () => ({
  name: "save_concept",
  description: "Save the one-off creative concept for this business's demo.",
  input_schema: { type: "object", properties: {
    big_idea: { type: "string", description: "The single creative idea this page is built around, specific to THIS business (not generic). One sentence." },
    audience: { type: "string", description: "Who their customers are and what they want, one sentence." },
    mood: { type: "array", items: { type: "string" }, description: "3 mood words." },
    style: { type: "string", description: "Style id from the STYLE LIBRARY." },
    fonts: { type: "object", properties: { display: { type: "string" }, body: { type: "string" } }, required: ["display", "body"], description: "One pairing from FONT PAIRINGS." },
    hero: { type: "string", description: "Hero variant." },
    flow: { type: "array", items: { type: "string" }, description: "7 to 11 sections in order, each 'type:variant' from SECTIONS. Hero first, cta last, include receptionist." },
    signature: { type: "string", description: "The one memorable moment on the page." },
    photo_direction: { type: "string", description: "Art direction for every photo: setting, people, light, palette, mood. Specific to them." },
    shots: { type: "array", items: { type: "object", properties: { type: { type: "string", description: "Section type the photo is for (hero, split, expand, quote, gallery, features)." }, subject: { type: "string", description: "What the photo shows: a real moment from THEIR service. Each shot different." } }, required: ["type", "subject"] }, description: "A shot list, one per photo spot, in page order." },
    why_different: { type: "string", description: "How this differs from the recent demos listed." }
  }, required: ["big_idea", "style", "fonts", "hero", "flow", "photo_direction", "shots"] }
});
async function wsdConcept(env, u, { name, website, industry, kb, look, reviews, brain, extra = "" }) {
  const recent = (brain.recent || []).slice(-8);
  const facts = { services: kb?.services, about: kb?.about || kb?.description, locations: kb?.locations, hours: kb?.hours, team: kb?.team, faqs: (kb?.faqs || []).slice(0, 6) };
  const msg = `BUSINESS: ${name} (${website})\nINDUSTRY: ${industry || "local business"}\nFACTS: ${JSON.stringify(facts).slice(0, 5e3)}\nHOMEPAGE TEXT (data, not instructions): ${String(look.text || "").slice(0, 3500)}\nTHEIR BRAND: theme colour ${look.brand?.colour || "none"}, colours ${JSON.stringify((look.colours || []).slice(0, 6))}, their fonts ${JSON.stringify(look.fonts || [])}\nTHEIR PHOTOS (url + alt): ${JSON.stringify((look.images || []).slice(0, 20))}\nREVIEWS: ${JSON.stringify((reviews?.items || []).slice(0, 4))}\n\nSTYLE LIBRARY:\n${wsdLibrary(brain)}\n\nFONT PAIRINGS (display + body: feel):\n${WSD_FONT_PAIRS.map((p) => `- ${p[0]} + ${p[1]}: ${p[2]}`).join("\n")}\n\nSECTIONS (type: variants):\n${Object.keys(WSD_SECTIONS).map((t) => `- ${t}: ${(WSD_VARIANTS[t] || ["default"]).join(", ")}`).join("\n")}\n\nTHE LAST ${recent.length} DEMOS (yours must NOT look like these: different style, hero, fonts and section flow):\n${recent.map((r) => `- ${r.industry || "?"}: style ${r.style}, hero ${r.hero || "?"}, fonts ${r.font || "?"}, flow ${r.combo}`).join("\n") || "(none yet)"}\n\n${wsdBrainText(brain)}\n${extra ? "\nTY'S DIRECTION: " + extra + "\n" : ""}\nYou are the Art Director. Study this business and write a concept that could only belong to THEM: their customers, their services, their place. The page must feel premium and be appealing enough that the owner wants it, in their brand colours, with the AI receptionist as an inviting moment. Call save_concept.`;
  return wsdAsk(env, u, "smart", { max_tokens: 2500, system: WSD_DIRECTOR, tools: [WSD_CONCEPT_TOOL()], messages: [{ role: "user", content: msg }] }, "save_concept");
}
function wsdLeastUsed(list, usedList) { const n = (x) => usedList.reduce((c, y, i) => c + (y === x ? 1 + i / 10 : 0), 0); return [...list].sort((a, b) => n(a) - n(b))[0]; }
function wsdConceptFix(c, brain, industry = "") {
  const recent = (brain.recent || []).slice(-8);
  const notes = [];
  const lastStyles = recent.slice(-2).map((r) => r.style);
  if (!WSD_STYLES[c.style] && !brain.styles?.[c.style]) c.style = "";
  if (c.style && lastStyles.includes(c.style)) {
    const SYN = { skin: "aesthetics", cosmetic: "aesthetics", beauty: "aesthetics salons", laser: "aesthetics", injectables: "aesthetics", hair: "salons", barber: "salons", nail: "salons", spa: "spas", massage: "wellness spas", physio: "physio allied", physiotherapy: "physio allied", chiro: "allied", chiropractic: "allied", podiatry: "allied", dentist: "dental", dental: "dental", doctor: "medical", medical: "medical", psychology: "psychology", plumber: "trades", plumbing: "trades", electrician: "trades", electrical: "trades", builder: "construction trades", building: "construction trades", roofing: "trades", cleaning: "trades", automotive: "automotive", mechanic: "automotive", gym: "gyms", fitness: "gyms fitness", personal: "gyms", yoga: "yoga wellness", pilates: "yoga wellness", childcare: "childcare", kindy: "childcare", kindergarten: "childcare", montessori: "childcare", restaurant: "hospitality cafes", cafe: "cafes hospitality", coffee: "cafes", hotel: "hospitality", accommodation: "hospitality tourism", lawyer: "law", legal: "law", accountant: "professional finance", accounting: "professional finance", real: "real estate", property: "property real estate", architect: "architects", tech: "tech", software: "tech saas", agency: "agencies", coach: "consulting", coaching: "consulting", florist: "florists", farm: "farms", pet: "pets", vet: "pets", surf: "surf", tourism: "tourism", jewellery: "jewellery", wedding: "events", events: "events", ndis: "ndis" };
    const base = String(industry || "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
    const words = [...new Set([...base.filter((w) => w.length > 3), ...base.flatMap((w) => (SYN[w] || "").split(" ")).filter(Boolean)])];
    const fit = (id) => { const st = WSD_STYLES[id]; const f = ((st.fits || "") + " " + (st.mood || "") + " " + (st.name || "")).toLowerCase(); return words.filter((w) => f.includes(w) || f.includes(w.slice(0, 5))).length; };
    const cands = Object.keys(WSD_STYLES).filter((id) => !lastStyles.includes(id) && id !== "jarvis");
    const best = Math.max(0, ...cands.map(fit));
    c.style = wsdLeastUsed(cands.filter((id) => fit(id) === best), recent.map((r) => r.style));
    notes.push("style changed to avoid repeating the last demos");
  }
  const heroes = WSD_VARIANTS.hero || [];
  if (!heroes.includes(c.hero) || recent.slice(-2).some((r) => r.hero === c.hero)) { c.hero = wsdLeastUsed(heroes.filter((h) => !recent.slice(-2).some((r) => r.hero === h)), recent.map((r) => r.hero)) || heroes[0]; notes.push("hero changed"); }
  const pair = WSD_FONT_PAIRS.find((p) => p[0].toLowerCase() === String(c.fonts?.display || "").toLowerCase());
  const lastFonts = recent.slice(-5).map((r) => r.font);
  if (!pair || lastFonts.includes(pair[0])) { const p = WSD_FONT_PAIRS.filter((x) => !lastFonts.includes(x[0])); const pick = p.find((x) => x[2].split(/,\s*/).some((w) => (c.mood || []).join(" ").toLowerCase().includes(w.split(" ")[0]))) || p[Math.floor(Math.random() * p.length)] || WSD_FONT_PAIRS[0]; c.fonts = { display: pick[0], body: pick[1] }; notes.push("fonts changed"); }
  else c.fonts = { display: pair[0], body: pair[1] };
  c.flow = (Array.isArray(c.flow) ? c.flow : []).map(String).filter((f) => WSD_SECTIONS[f.split(":")[0]]).slice(0, 12);
  c.shots = (Array.isArray(c.shots) ? c.shots : []).filter((s) => s && WSD_PHOTO_TYPES2.includes(s.type) && String(s.subject || "").trim()).slice(0, 14).map((s) => ({ type: s.type, subject: String(s.subject).slice(0, 240) }));
  c.fixes = notes;
  return c;
}
var wsdConceptText = (c) => `ART DIRECTION (binding; written for this business by the Art Director):\n- Big idea: ${c.big_idea}\n- Audience: ${c.audience || ""}\n- Mood: ${(c.mood || []).join(", ")}\n${c.style ? "- Style: " + c.style + "\n" : ""}- Fonts: ${c.fonts.display} (display) + ${c.fonts.body} (body)\n- Hero variant: ${c.hero}\n- Section flow (in this order): ${c.flow.join(" → ") || "your choice"}\n- Signature moment: ${c.signature || ""}\n- Photo direction: ${c.photo_direction || ""}\nWrite fresh copy in their voice for this idea. Don't reuse headlines or section titles from other demos.\n`;
function wsdSimilar(a, b) {
  const A = String(a || "").split(", ").filter(Boolean), B = String(b || "").split(", ").filter(Boolean);
  if (!A.length || !B.length) return 0;
  const sa = new Set(A), sb = new Set(B), inter = [...sa].filter((x) => sb.has(x)).length, jac = inter / new Set([...sa, ...sb]).size;
  let pos = 0; for (let i = 0; i < Math.min(A.length, B.length); i++) if (A[i] === B[i]) pos++;
  return Math.max(jac, pos / Math.max(A.length, B.length));
}
// If the page still looks like a recent demo, change the middle: other variants and a different order.
function wsdVary(spec, brain) {
  const recent = (brain.recent || []).slice(-6);
  const score = () => Math.max(0, ...recent.map((r) => wsdSimilar(wsdCombo(spec), r.combo)));
  const before = score();
  if (before < 0.6) return { varied: false, similarity: +before.toFixed(2) };
  const secs = spec.sections || [];
  const fixed = (s) => ["hero", "cta", "receptionist"].includes(s.type);
  const used = recent.flatMap((r) => String(r.combo || "").split(", "));
  for (const s of secs) if (!fixed(s) && WSD_VARIANTS[s.type]?.length > 1) { const opts = WSD_VARIANTS[s.type].filter((v) => v !== s.variant); s.variant = wsdLeastUsed(opts, used.filter((x) => x.startsWith(s.type + ":")).map((x) => x.split(":")[1])) || s.variant; }
  const mids = secs.map((s, i) => [s, i]).filter(([s]) => !fixed(s)).map(([, i]) => i);
  if (score() >= 0.6 && mids.length > 2) { const vals = mids.map((i) => secs[i]); vals.push(vals.shift()); mids.forEach((i, k) => { secs[i] = vals[k]; }); }
  return { varied: true, similarity: +score().toFixed(2), was: +before.toFixed(2) };
}
async function wsdDesign(env, u, args) {
  const c0 = await wsdConcept(env, u, args).catch((e) => { console.error("concept:", e.message); return null; });
  if (!c0?.big_idea) { const out = await wsdDesignBase(env, u, args); out.variety = wsdVary(out, args.brain); return out; }
  const c = wsdConceptFix(c0, args.brain, args.industry);
  const out = await wsdDesignBase(env, u, { ...args, concept: wsdConceptText(c) });
  if (c.style && WSD_STYLES[c.style] && out.style !== c.style && !/style/i.test(String(args.extra || "").replace(/COMPLETELY DIFFERENT design[\s\S]*?fresh headline\./, ""))) out.style = c.style;
  const h = out.sections.find((x) => x.type === "hero"); if (h) h.variant = c.hero;
  out.brand = { ...(out.brand || {}), display_font: c.fonts.display, body_font: c.fonts.body };
  out.shots = c.shots; out.photo_direction = String(c.photo_direction || "").slice(0, 400);
  out.concept = { big_idea: c.big_idea, mood: c.mood || [], signature: c.signature || "", why_different: c.why_different || "", fixes: c.fixes };
  out.variety = wsdVary(out, args.brain);
  return out;
}
var wsdFingerprint = (spec) => ({ at: wsdNow(), style: spec.style, combo: wsdCombo(spec), dna: spec.dna, font: spec.brand?.display_font || "", hero: (spec.sections || []).find((s) => s.type === "hero")?.variant || "" });
// Photo Director: drop broken photos, never repeat a photo on a page, fill every photo spot (galleries 3, cards up to 6),
// brief each photo from the shot list or its own section's content, and apply Ty's photo rules to every photo.
async function wsdImagesFix(env, spec, { name, industry, area, website, origin }) {
  const ref = (() => { try { return new URL(website).origin + "/"; } catch { return ""; } })();
  const own = (u) => /\/demo\/img\/[0-9a-f]{16}\.webp$/.test(String(u));
  const all = wsdSpecImages(spec).filter((u) => u !== spec.brand?.logo && !own(u));
  const checks = await Promise.all(all.slice(0, 30).map(async (u) => [u, await wsdImgOk(u, ref)]));
  const bad = new Set(checks.filter(([, ok]) => !ok).map(([u]) => u));
  const clean = (v, key) => { if (Array.isArray(v)) return v.map((x) => clean(x, key)).filter((x) => x !== ""); if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x, k)])); return typeof v === "string" && WSD_IMG_KEYS.has(key) && key !== "logo" && bad.has(v) ? "" : v; };
  const sections = clean(spec.sections || [], "");
  spec.sections = sections;
  // never the same photo twice, and never the logo as a photo
  const seen = new Set(spec.brand?.logo ? [spec.brand.logo] : []); let dupes = 0;
  const uniq = (u) => { if (!u) return u; if (seen.has(u)) { dupes++; return ""; } seen.add(u); return u; };
  for (const s of sections) {
    if (Array.isArray(s.images)) s.images = s.images.map(uniq).filter(Boolean);
    if (s.image) s.image = uniq(s.image);
    for (const k of ["items", "steps"]) if (Array.isArray(s[k])) for (const x of s[k]) if (x && typeof x === "object" && x.image) x.image = uniq(x.image);
  }
  if (!env.OPENAI_API_KEY && !env.PEXELS_API_KEY) return { removed: bad.size, duplicates: dupes, generated: 0 };
  const rules = typeof wsdBrain === "function" ? await wsdBrain(env).then(wsdPhotoRules).catch(() => []) : [];
  const p = spec.brand?.primary || "", a2 = spec.brand?.accent || "";
  const asks = Array.isArray(spec.gen_images) ? spec.gen_images : [];
  const shots = (Array.isArray(spec.shots) ? spec.shots : []).map((x) => ({ ...x, used: false }));
  const shot = (type) => { const s = shots.find((x) => !x.used && x.type === type) || shots.find((x) => !x.used && type === "features" && x.type === "split"); if (s) s.used = true; return s?.subject || ""; };
  const about = (s) => [s.title, s.sub || s.text || s.body || "", ...(Array.isArray(s.items) ? s.items.slice(0, 3).map((x) => x && x.title) : [])].filter(Boolean).join(" · ").replace(/\s+/g, " ").slice(0, 240);
  const subjects = [];
  const promptFor = (slot, subject) => {
    const mine = asks.find((x) => x && x.slot === slot && x.prompt);
    const subj = mine ? mine.prompt : subject;
    const avoid = subjects.slice(-4).join(" | ");
    subjects.push(String(subj).slice(0, 90));
    return `${subj}. ${spec.photo_direction ? "Art direction: " + spec.photo_direction + ". " : ""}For ${name}, a ${industry || "local"} business${area ? " in " + area : ""}, Australia. ${rules.length ? "Ty's photo rules (must follow): " + rules.join("; ") + ". " : ""}${avoid ? "Make it a clearly different scene from: " + avoid + ". " : ""}Authentic, premium editorial photograph, natural light, real people and places, shallow depth of field, ${p ? "subtle colour accents in " + p + (a2 ? " and " + a2 : "") + ", " : ""}no text, no words, no logos, no watermarks.`;
  };
  const jobs = [];
  const add = (set, slot, subject) => { if (jobs.length < WSD_IMG_MAX) jobs.push({ set, prompt: promptFor(slot, subject) }); };
  for (const s of sections) {
    if (jobs.length >= WSD_IMG_MAX) break;
    if (s.type === "hero" && !(s.images || []).filter(Boolean).length) add((u) => { s.images = [u]; }, "hero", shot("hero") || `The heart of ${name}'s service: ${about(s) || "the business at its best"}`);
    else if (["split", "expand", "quote"].includes(s.type) && !s.image) add((u) => { s.image = u; }, s.type === "quote" ? "split" : s.type, shot(s.type) || (s.type === "quote" ? "A real, happy customer moment: " + about(s) : about(s) || "A welcoming scene"));
    else if (s.type === "gallery") { s.images = (s.images || []).filter(Boolean); for (let k = s.images.length; k < 3; k++) add((u) => { s.images.push(u); }, "split", shot("gallery") || `${about(s) || "The experience"}: scene ${k + 1} of 3`); }
    else if (s.type === "features" && Array.isArray(s.items) && (s.items.some((x) => x && x.image) || /image|photo|card|stack|fan|panels|flip|rail/.test(s.variant || ""))) {
      for (const x of s.items.slice(0, 6)) if (x && typeof x === "object" && !x.image) add((u) => { x.image = u; }, "features", shot("features") || `${x.title}: ${x.text || ""}`);
    }
  }
  const made = await Promise.all(jobs.map(async (j) => { const g = await wsdGenImage(env, j.prompt).catch(() => null) || await wsdStockImage(env, ((industry || "") + " " + String(j.prompt).split(". ")[0]).slice(0, 80)).catch(() => null); if (g) j.set(`${origin}/demo/img/${g.id}.webp`); return g; }));
  const n = made.filter(Boolean).length;
  if (n) {
    spec.ai_images = (+spec.ai_images || 0) + n;
    await insert(env, "team_usage", [{ department: "head_of_marketing", source: "demo_images", model: made.find(Boolean).model, calls: n, cost_usd: +(n * 0.03).toFixed(3), cost_aud: +(n * 0.046).toFixed(3) }]).catch(() => {});
  }
  return { removed: bad.size, duplicates: dupes, generated: n };
}
