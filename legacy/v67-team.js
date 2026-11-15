// ── v67: The Web Design Director talks first, then builds only what you agreed.
// /talk: it replies with its plan for the exact sections (numbered page map) and asks if anything is unclear. Nothing changes yet.
// /build-plan: it changes only those sections, makes new photos when asked (AI photo, or a stock photo if PEXELS_API_KEY is set),
// re-checks every photo loads and fills any empty photo spot, then reports each change as done or not done, honestly. ──
var WSD_PHOTO_TYPES = new Set(["hero", "split", "expand", "quote", "gallery"]);
function wsdSecImgs(s) { return [...(Array.isArray(s.images) ? s.images : []), s.image, ...(Array.isArray(s.items) ? s.items.map((x) => x && x.image) : [])].filter(Boolean); }
function wsdMap(spec) {
  return (spec.sections || []).map((s, i) => {
    const imgs = wsdSecImgs(s);
    const photo = imgs.length ? (imgs.some((u) => /\/demo\/img\/[0-9a-f]{16}\.webp/.test(u)) ? "AI or stock photo" : "photo from their site") : WSD_PHOTO_TYPES.has(s.type) ? "NO PHOTO (shows a plain colour block)" : "";
    return { n: i + 1, type: s.type, variant: s.variant || "", title: String(s.title || "").replace(/\s+/g, " ").slice(0, 90), photo, missing: !imgs.length && WSD_PHOTO_TYPES.has(s.type) };
  });
}
var wsdMapText = (spec) => wsdMap(spec).map((m) => `${m.n}. ${m.type}${m.variant ? " (" + m.variant + ")" : ""}: "${m.title}"${m.photo ? " · " + m.photo : ""}`).join("\n");
var WSD_TALK_TOOL = {
  name: "director_reply",
  description: "Reply to Ty about his demo BEFORE anything is changed.",
  input_schema: { type: "object", properties: {
    reply: { type: "string", description: "Talk to Ty like a senior designer, in plain words, under 90 words. Say back what you understood, name each section you'll touch by its number and name from the PAGE MAP, and say exactly what you'll do. If anything is unclear, ask ONE short question. If something can't be done, say so plainly and offer the closest option. Never say it's done: nothing has changed yet." },
    changes: { type: "array", description: "The plan. One entry per concrete change.", items: { type: "object", properties: {
      section: { type: "integer", description: "Section number from the PAGE MAP. Use 0 for page-wide brand changes (colours, fonts, corner roundness)." },
      what: { type: "string", description: "The exact change, one sentence a designer could follow." },
      new_photo: { type: "string", description: "If this change needs a new or different photo: describe the photo to make (their niche, setting, people, mood, light). Empty if no new photo." },
      photo_url: { type: "string", description: "Only if Ty pasted a photo link to use: that link. Otherwise empty." }
    }, required: ["section", "what"] } },
    ready: { type: "boolean", description: "true when you know exactly what to change and have no open question for Ty." },
    lesson: { type: "string", description: "If Ty's message shows a lasting taste or rule for FUTURE demos, one line. Empty if a one-off." }
  }, required: ["reply", "changes", "ready"] }
};
var wsdSectionsTool = () => ({
  name: "save_sections",
  description: "Save ONLY the sections you were asked to change, plus a result for every change.",
  input_schema: { type: "object", properties: {
    sections: { type: "array", items: { type: "object", properties: { n: { type: "integer", description: "Section number, as given." }, section: WSD_SECTION_SCHEMA }, required: ["n", "section"] } },
    brand: { type: "object", description: "Only when a section 0 (brand) change was asked: the full updated brand object. Otherwise leave out." },
    results: { type: "array", items: { type: "object", properties: { change: { type: "string" }, done: { type: "boolean" }, note: { type: "string", description: "If not done: why, in plain words." } }, required: ["change", "done"] } }
  }, required: ["sections", "results"] }
});
var WSD_YES = /^(yes|yep|yeah|yup|go|go ahead|do it|build( it)?|ok(ay)?|perfect|sounds good|send it|let'?s go|approved?|lock it in)\b[\s.!]*$/i;
function wsdTyUrls(text) { return [...new Set((String(text || "").match(/https:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp|avif)(?:\?[^\s"'<>]*)?/gi) || []))].slice(0, 4); }
// Free stock photo (Pexels) when an AI photo can't be made. Stored with our own photos so it always loads.
async function wsdStockImage(env, query) {
  if (!env.PEXELS_API_KEY || !query) return null;
  const r = await fetch("https://api.pexels.com/v1/search?per_page=5&orientation=landscape&query=" + encodeURIComponent(String(query).slice(0, 80)), { headers: { Authorization: env.PEXELS_API_KEY }, signal: AbortSignal.timeout(15e3) }).catch(() => null);
  const j = r && r.ok ? await r.json().catch(() => ({})) : {};
  for (const p of (j.photos || []).slice(0, 3)) {
    const src = p?.src?.large2x || p?.src?.large; if (!src) continue;
    const g = await fetch(src, { signal: AbortSignal.timeout(20e3) }).catch(() => null);
    if (!g || !g.ok) continue;
    const buf = new Uint8Array(await g.arrayBuffer());
    if (buf.byteLength < 14000 || buf.byteLength > 2.5e6) continue;
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    const id = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, "0")).join("");
    await secPut(env, "wsdimg:" + id, { mime: g.headers.get("content-type") || "image/jpeg", b64: btoa(bin), model: "pexels", credit: p.photographer || "", source: p.url || "", at: new Date().toISOString(), prompt: String(query).slice(0, 200) });
    return { id, model: "pexels" };
  }
  return null;
}
async function wsdNewPhoto(env, rec, prompt) {
  const origin = (env.PUBLIC_ORIGIN || "https://studioflowandsystems.app").replace(/\/+$/, "");
  const p = rec.spec.brand?.primary || "";
  const full = `${prompt}. For ${rec.name}, a ${rec.industry || "local"} business in Australia. Authentic, premium editorial photograph, natural light, real people and places, shallow depth of field${p ? ", subtle colour accents in " + p : ""}, no text, no words, no logos, no watermarks.`;
  const g = await wsdGenImage(env, full).catch(() => null) || await wsdStockImage(env, ((rec.industry || "") + " " + prompt).slice(0, 80)).catch(() => null);
  return g ? { url: `${origin}/demo/img/${g.id}.webp`, model: g.model } : null;
}
function wsdPutPhoto(s, url) {
  if (!s || !url) return false;
  if (s.type === "hero" || s.type === "gallery") { s.images = [url, ...(Array.isArray(s.images) ? s.images.filter((u) => u !== url) : [])].slice(0, 6); return true; }
  if ("image" in s || ["split", "expand", "quote", "founder"].includes(s.type)) { s.image = url; return true; }
  if (Array.isArray(s.items) && s.items.length) { const it = s.items.find((x) => x && typeof x === "object" && !x.image) || s.items[0]; if (it && typeof it === "object") { it.image = url; return true; } }
  s.images = [url, ...(Array.isArray(s.images) ? s.images : [])].slice(0, 6); return true;
}
async function wsdTalk(env, token, message) {
  const ask = String(message || "").trim().slice(0, 2e3);
  if (!ask) throw new Error("Say what you'd like to change.");
  const rec = await wsdGet(env, token);
  if (!rec) throw new Error("Demo not found.");
  if (rec.pending?.changes?.length && WSD_YES.test(ask)) {
    rec.chat = [...(rec.chat || []), { at: wsdNow(), r: "ty", t: ask }].slice(-40);
    await wsdPut(env, token, rec);
    return { ...(await wsdBuildPlan(env, token)), built: true };
  }
  const u = wsdUsage();
  const brain = await wsdBrain(env);
  const urls = wsdTyUrls(ask);
  const asked = (rec.chat || []).filter((c) => c.r === "ty").slice(-10).map((c) => "- " + c.t).join("\n");
  const msg = `PAGE MAP (number. type (variant): "title" · photo):\n${wsdMapText(rec.spec)}\n(Also on every demo, fixed and not editable here: a "More of our work" band and the Studio Flow offer.)\n\nCURRENT DESIGN (JSON):\n${JSON.stringify({ ...rec.spec, reviews: undefined, report: undefined, offers: undefined }).slice(0, 16e3)}\n\nPHOTOS FROM THEIR SITE you may use: ${JSON.stringify((rec.look?.images || []).slice(0, 30))}\nYou can ALSO make a brand-new photo for any section (describe it in new_photo): use this whenever Ty wants a different image, a section has NO PHOTO, or their own photos don't fit. ${urls.length ? "Ty pasted these photo links (use them where he says): " + urls.join(" ") : ""}\n\n${wsdBrainText(brain)}\n\nWHAT TY HAS ASKED BEFORE ON THIS DEMO (if he's repeating himself, the last attempt didn't land: say so and fix it properly this time):\n${asked || "(nothing yet)"}\n\nRECENT CHAT:\n${(rec.chat || []).slice(-8).map((c) => (c.r === "ty" ? "Ty: " : "You: ") + c.t).join("\n")}\n\nTY SAYS NOW: ${ask}\n${WSD_BRAND_RULE}\n\nReply with director_reply. You are planning only; nothing changes until Ty says build.`;
  const out = await wsdAsk(env, u, "smart", { max_tokens: 1800, system: WSD_DIRECTOR, tools: [WSD_TALK_TOOL], messages: [{ role: "user", content: msg }] }, "director_reply");
  const n = (rec.spec.sections || []).length;
  const changes = (Array.isArray(out.changes) ? out.changes : []).filter((c) => c && Number.isInteger(c.section) && c.section >= 0 && c.section <= n && String(c.what || "").trim()).slice(0, 10).map((c) => ({ section: c.section, what: String(c.what).slice(0, 300), new_photo: String(c.new_photo || "").slice(0, 400), photo_url: urls.includes(c.photo_url) ? c.photo_url : "" }));
  const cost = await wsdLog(env, u, "website_demo_talk");
  const reply = String(out.reply || "").trim().slice(0, 900) || "Tell me a bit more about what you'd like changed.";
  rec.pending = changes.length ? { changes, lesson: String(out.lesson || "").slice(0, 240), ask, at: wsdNow() } : null;
  rec.cost_aud = round((+rec.cost_aud || 0) + cost, 4);
  rec.chat = [...(rec.chat || []), { at: wsdNow(), r: "ty", t: ask }, { at: wsdNow(), r: "ai", t: reply }].slice(-40);
  await wsdPut(env, token, rec);
  return { ok: true, reply, changes, ready: !!out.ready && changes.length > 0, cost_aud: cost, map: wsdMap(rec.spec) };
}
async function wsdBuildPlan(env, token) {
  const rec = await wsdGet(env, token);
  if (!rec) throw new Error("Demo not found.");
  const plan = rec.pending;
  if (!plan?.changes?.length) throw new Error("There's no plan to build yet. Tell the Director what to change first.");
  const u = wsdUsage();
  const brain = await wsdBrain(env);
  const spec = JSON.parse(JSON.stringify(rec.spec));
  const before = JSON.stringify(spec.sections || []);
  const targets = [...new Set(plan.changes.map((c) => c.section).filter((x) => x > 0))];
  const brandAsked = plan.changes.some((c) => c.section === 0);
  // 1) photos first, so the designer can place them
  const photoNotes = [], photoResults = new Map();
  for (const c of plan.changes) {
    if (c.section < 1 || (!c.new_photo && !c.photo_url)) continue;
    let url = "";
    if (c.photo_url && await wsdImgOk(c.photo_url, "")) { url = c.photo_url; rec.look = { ...(rec.look || {}), images: [...(rec.look?.images || []), { src: url, alt: "Photo Ty chose" }] }; }
    else if (c.new_photo) { const p = await wsdNewPhoto(env, rec, c.new_photo); if (p) url = p.url; }
    photoResults.set(c, url);
    if (url) photoNotes.push(`Section ${c.section}: put this photo in the main image spot: ${url}`);
  }
  // 2) the designer changes ONLY the targeted sections
  let edited = { sections: [], results: [] };
  if (targets.length || brandAsked) {
    const parts = targets.map((n) => ({ n, section: spec.sections[n - 1] }));
    const msg = `Change ONLY these sections of ${rec.name}'s concept homepage. Keep everything you aren't asked to change exactly the same, including copy.\n\nSECTIONS TO CHANGE (JSON):\n${JSON.stringify(parts)}\n${brandAsked ? "\nCURRENT BRAND (JSON): " + JSON.stringify(spec.brand) + "\n" : ""}\nTHE AGREED CHANGES:\n${plan.changes.map((c) => `- Section ${c.section}${c.section ? "" : " (brand)"}: ${c.what}`).join("\n")}\n${photoNotes.length ? "\nNEW PHOTOS READY TO USE:\n" + photoNotes.join("\n") + "\n" : ""}\nPHOTOS FROM THEIR SITE you may also use: ${JSON.stringify((rec.look?.images || []).slice(0, 30))}\n\nCall save_sections with the changed sections (same numbers), ${brandAsked ? "the full updated brand, " : ""}and a result for EVERY agreed change. Only mark done: true if you actually changed it.`;
    edited = await wsdAsk(env, u, "smart", { max_tokens: 7e3, system: WSD_DIRECTOR, tools: [wsdSectionsTool()], messages: [{ role: "user", content: msg }] }, "save_sections");
  }
  for (const e of Array.isArray(edited.sections) ? edited.sections : []) {
    if (!e || !targets.includes(e.n) || !e.section || !WSD_SECTIONS[e.section.type]) continue;
    spec.sections[e.n - 1] = e.section;
  }
  if (brandAsked && edited.brand && typeof edited.brand === "object") spec.brand = { ...spec.brand, ...edited.brand, logo: spec.brand?.logo || edited.brand.logo || "" };
  // make sure every new photo actually landed where it was meant to
  for (const [c, url] of photoResults) if (url && !wsdSecImgs(spec.sections[c.section - 1] || {}).includes(url)) wsdPutPhoto(spec.sections[c.section - 1], url);
  let clean = wsdStyleFor(wsdClean(spec, rec.look), brain);
  if (!brandAsked) wsdBrandGuard(clean, rec.look);
  if (rec.reviews?.rating || rec.reviews?.items?.length) clean.reviews = rec.reviews;
  // 3) every photo must load; any empty photo spot gets a niche photo
  await wsdImagesFix(env, clean, { name: rec.name, industry: rec.industry || "", area: rec.area || "", website: rec.website || "", origin: (env.PUBLIC_ORIGIN || "https://studioflowandsystems.app").replace(/\/+$/, "") }).catch((e) => console.error("demo images:", e.message));
  // 4) honest results: a change only counts if its section really changed
  const afterSecs = clean.sections || [];
  const changedSec = (n) => JSON.stringify(JSON.parse(before)[n - 1] || null) !== JSON.stringify(afterSecs[n - 1] || null);
  const said = Array.isArray(edited.results) ? edited.results : [];
  const results = plan.changes.map((c, i) => {
    const r = said[i] || {};
    let done = c.section === 0 ? !!(brandAsked && edited.brand) : changedSec(c.section);
    let note = String(r.note || "");
    if ((c.new_photo || c.photo_url) && c.section > 0) { const url = photoResults.get(c); if (!url) { done = false; note = c.photo_url ? "That photo link wouldn't load, so I couldn't use it." : "I couldn't make a new photo this time (the photo service didn't answer). Try again in a minute."; } else if (!wsdSecImgs(afterSecs[c.section - 1] || {}).includes(url)) { done = false; note = "The new photo was made but didn't stay in place."; } }
    if (!done && !note) note = r.done === false ? "" : "Nothing changed in that section.";
    return { section: c.section, what: c.what, done, note: note.slice(0, 200) };
  });
  const cost = await wsdLog(env, u, "website_demo_build_plan");
  const ok = results.filter((r) => r.done).length;
  const summary = (ok === results.length ? "Done. " : ok ? `Done ${ok} of ${results.length}. ` : "I couldn't make those changes. ") + results.map((r) => `${r.done ? "✓" : "✗"} ${r.section ? "Section " + r.section : "Brand"}: ${r.what}${r.done ? "" : " (" + (r.note || "not done") + ")"}`).join(" ");
  if (ok) { rec.versions = [...(rec.versions || []), rec.spec].slice(-6); rec.spec = clean; }
  rec.pending = ok === results.length ? null : { ...plan, changes: plan.changes.filter((c, i) => !results[i].done) };
  rec.cost_aud = round((+rec.cost_aud || 0) + cost, 4);
  rec.chat = [...(rec.chat || []), { at: wsdNow(), r: "ai", t: summary.slice(0, 1200) }].slice(-40);
  await wsdPut(env, token, rec);
  await wsdIndexPut(env, token, { style: rec.spec.style, cost_aud: rec.cost_aud });
  const lesson = plan.lesson;
  if (ok && lesson && !brain.lessons.some((l) => l.text.toLowerCase() === lesson.toLowerCase())) { brain.lessons.push({ id: wsdId(), at: wsdNow(), text: lesson, from: rec.name }); await wsdBrainSave(env, brain); }
  return { ok: true, summary, results, lesson: ok && lesson ? lesson : null, cost_aud: cost, total_aud: rec.cost_aud, map: wsdMap(rec.spec), ...wsdLinks(env, token) };
}
// Brand colours must come from THEIR brand (theme colour + the colours their site actually uses), unless Ty asks otherwise.
function wsdHue(hex) {
  const c = hexRgb(hex); if (!c) return null;
  const [r, g, b] = c.map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  const s = d === 0 ? 0 : l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
function wsdNear(a, b) { const x = wsdHue(a), y = wsdHue(b); if (!x || !y) return false; const dh = Math.min(Math.abs(x.h - y.h), 360 - Math.abs(x.h - y.h)); return dh <= 22 && Math.abs(x.s - y.s) <= 0.35 && Math.abs(x.l - y.l) <= 0.25; }
function wsdBrandColours(look) {
  const theme = /^#[0-9a-f]{6}$/i.test(look?.brand?.colour || "") ? [look.brand.colour.toLowerCase()] : [];
  const used = (look?.colours || []).filter((c) => c && c.n >= 3 && /^#[0-9a-f]{6}$/i.test(c.v)).map((c) => c.v.toLowerCase());
  return [...new Set([...theme, ...used])].slice(0, 5);
}
function wsdBrandGuard(spec, look) {
  const mine = wsdBrandColours(look);
  if (!mine.length || !spec?.brand) return { changed: false, palette: mine };
  const fits = (hex) => mine.some((m) => wsdNear(hex, m));
  let changed = false;
  if (!fits(spec.brand.primary)) { spec.brand.primary = mine[0]; changed = true; }
  if (spec.brand.accent && !fits(spec.brand.accent) && mine.length > 1) { spec.brand.accent = mine.find((m) => !wsdNear(m, spec.brand.primary)) || spec.brand.accent; changed = true; }
  if (spec.brand.secondary && !fits(spec.brand.secondary) && mine.length > 1) { spec.brand.secondary = mine.find((m) => m !== spec.brand.primary) || spec.brand.secondary; changed = true; }
  if (changed) spec.brand_from_site = mine;
  return { changed, palette: mine };
}
var WSD_BRAND_RULE = "\nBRAND RULE: the primary and accent colours MUST come from THEIR BRAND (their theme colour and the colours their own site uses), so the owner instantly recognises their brand. Do not invent a new brand colour unless Ty asks for one. Their brand, but better: premium, modern and appealing enough that the owner wants it, with the AI receptionist as a clear, inviting moment on the page.";
