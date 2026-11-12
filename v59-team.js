// ── v59: the Playball standard for the design team, delete demos, live screenshots of our real work. ──
var WSD_STANDARD = `THE STANDARD (our benchmark demo: Playball Sunny Coast, studioflowandsystems.app/demo/playball-sunny-coast). Match its QUALITY, never its look. Every design must have:
1. Real photos everywhere: the hero, every service card, the split, the gallery. No empty image boxes, no plain gradient blocks, no big blank gaps between sections. If their photos are thin, ask for gen_images.
2. A headline in the business's own voice that a local customer would say out loud ("Sunny Coast kids, let's play!"), not corporate filler.
3. A tool that does the job for the visitor, built for THIS business: a finder (book a class / appointment / service by age, type or suburb with "Only 3 left" and "Join waitlist"), or a quote builder with sliders (how many, how big, when, where), or both.
4. The ways to buy, as clear cards with photos ("Four ways to get moving": classes, camps, parties, centres).
5. A founder section with the real person (their own photo only, never an AI face) when the site names them.
6. Local proof: suburbs, real review lines, a local FAQ answering what people actually ask.
7. The AI receptionist moment and a final CTA that books a call.
8. Fast to scan on a phone: short lines, big tap targets, nothing cut off.
`;
var WSD_STANDARD_CRIT = `\nJudge against THE STANDARD: photos in every visual section (no empty boxes or gradient blocks), a visitor tool built for this business (finder or quote builder), the ways-to-buy as photo cards, a founder section if the site names one, local proof and FAQ, booking CTA. Name any gap plainly in the issues, and write a lesson when a gap repeats.\n`;
async function wsdDelete(env, t) {
  const rec = await wsdGet(env, t).catch(() => null);
  const imgs = rec?.spec ? wsdSpecImages(rec.spec).map((u) => (String(u).match(/\/demo\/img\/([0-9a-f]{16})\.webp$/) || [])[1]).filter(Boolean) : [];
  for (const k of ["wsd:" + t, ...imgs.map((i) => "wsdimg:" + i)]) await secRest(env, "DELETE", "team_settings?key=eq." + encodeURIComponent(k)).catch(() => {});
  const all = await wsdIndex(env), it = all.find((x) => x.token === t);
  await secPut(env, "wsd_index", { items: all.filter((x) => x.token !== t) });
  if (it?.lead_id) await wsdLeadSet(env, it.lead_id, { token: null }).catch(() => {});
  return { ok: true, deleted: t, images: imgs.length };
}
// Live screenshots of our real work for the "more of our work" section (refreshed weekly)
async function wsdWorkShot(env, slug) {
  const w = WSD_WORK.find((x) => x.slug === slug);
  if (!w) return null;
  const key = "wsdimg:work-" + slug;
  let v = await secGet(env, key).catch(() => null);
  if (!v?.b64 || Date.now() - Date.parse(v.at || 0) > 7 * 864e5) {
    const b64 = await screenshot(env, w.url).catch(() => null);
    if (b64) { v = { mime: "image/jpeg", b64, at: new Date().toISOString() }; await secPut(env, key, v).catch(() => {}); }
  }
  if (!v?.b64) return null;
  return new Response(Uint8Array.from(atob(v.b64), (c) => c.charCodeAt(0)), { headers: { "Content-Type": v.mime || "image/jpeg", "Cache-Control": "public, max-age=86400", "X-Robots-Tag": "noindex" } });
}
