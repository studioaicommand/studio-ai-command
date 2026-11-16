// src/team/website-demo-render.js (v40): turns a design spec (written by Claude from a prospect's own website)
// into a full-motion concept homepage + leak report, in their brand. Many styles x many section variants,
// so no two demos look the same. Everything is escaped; images fall back to brand art if they fail.
var WSD_BOOK = "https://links.studioflowandsystems.com/widget/booking/tfzrthnax3Ldpncejghq";
var WSD_STYLES = {
  editorial: { name: "Editorial", mood: "magazine-like, confident serif headlines, thin rules, numbered sections, generous white space, mask line reveals and image wipes", fits: "professional services, clinics, architects, law, boutique brands", fonts: ["Fraunces", "Inter"], hero: ["giant-type", "split-arch"], features: ["rail", "bento"], journey: ["timeline", "pinned"] },
  playful: { name: "Playful", mood: "bright, rounded, bouncy shapes and stickers, velocity marquee, wobbly hover, joyful copy", fits: "kids, sport, pets, cafes, family services", fonts: ["Lexend", "Nunito Sans"], hero: ["collage", "split-arch"], features: ["fan", "bento"], journey: ["pinned", "timeline"] },
  luxe: { name: "Luxe", mood: "dark, cinematic, gold or jewel accent, slow zooms, letter-spaced kickers, film grain, cursor ring", fits: "aesthetics, salons, spas, real estate, hospitality, jewellery", fonts: ["Cormorant Garamond", "Manrope"], hero: ["fullbleed", "giant-type"], features: ["stack", "rail"], journey: ["pinned"] },
  clinical: { name: "Clean care", mood: "light, airy, calm gradients, glass cards, trustworthy, smooth stacking cards and count-ups", fits: "allied health, dental, medical, psychology, NDIS, physio", fonts: ["Plus Jakarta Sans", "Inter"], hero: ["split-arch", "fullbleed"], features: ["stack", "bento"], journey: ["pinned", "timeline"] },
  bold: { name: "Bold", mood: "huge uppercase condensed type, diagonal sections, outline marquees, hard shadows, punchy", fits: "trades, gyms, automotive, construction, events", fonts: ["Anton", "Inter"], hero: ["giant-type", "fullbleed"], features: ["rail", "fan"], journey: ["timeline"] },
  organic: { name: "Organic", mood: "earthy palette, arched images, drifting leaves and sun, soft serif, hand-made warmth, a day-in-the-life sky pin", fits: "childcare, wellness, yoga, natural therapies, farms, florists", fonts: ["Fraunces", "Nunito Sans"], hero: ["split-arch", "collage"], features: ["fan", "stack"], journey: ["sky", "pinned"] },
  modern: { name: "Modern tech", mood: "dark gradient mesh, glowing borders, bento grid with 3D tilt, beam lines, precise and fast", fits: "tech, SaaS, agencies, finance, consulting, coworking", fonts: ["Space Grotesk", "Inter"], hero: ["fullbleed", "giant-type"], features: ["bento", "rail"], journey: ["pinned", "timeline"] },
  coastal: { name: "Coastal", mood: "sun-washed, airy, wave dividers, relaxed sans, horizontal drifting galleries, salt-light colours", fits: "Sunshine Coast lifestyle, surf, tourism, cafes, property, fitness outdoors", fonts: ["DM Serif Display", "DM Sans"], hero: ["fullbleed", "collage"], features: ["rail", "bento"], journey: ["timeline", "sky"] }
};
var WSD_VARIANTS = {
  hero: ["split-arch", "fullbleed", "giant-type", "collage"],
  marquee: ["velocity", "outline"],
  statement: ["fill", "mask"],
  features: ["rail", "stack", "bento", "fan"],
  stats: ["count"],
  journey: ["pinned", "timeline", "sky"],
  split: ["reveal", "zoom"],
  gallery: ["drift", "zoom"],
  testimonials: ["marquee", "spotlight", "wall", "stack"],
  faq: ["accordion"],
  cta: ["form", "big"],
  receptionist: ["chat", "phone"],
  area: ["orbit", "chips"]
};
var wsdE = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function wsdHex(h, d) { h = String(h || "").trim(); if (/^#[0-9a-f]{3}$/i.test(h)) h = "#" + h.slice(1).split("").map((c) => c + c).join(""); return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : d; }
function wsdLum(h) { const n = parseInt(h.slice(1), 16), f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255); }
var wsdOn = (h) => wsdLum(h) > 0.42 ? "#111111" : "#ffffff";
function wsdMix(a, b, k) { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); const c = (s) => Math.round((x >> s & 255) * (1 - k) + (y >> s & 255) * k); return "#" + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1); }
var wsdFont = (f, d) => /^[A-Za-z0-9 ]{2,40}$/.test(String(f || "").trim()) ? String(f).trim() : d;
var wsdUrl = (u) => /^https:\/\/[^\s"'<>]{4,600}$/.test(String(u || "")) ? String(u) : "";
var wsdArr = (a, n) => (Array.isArray(a) ? a : []).slice(0, n);
function wsdTheme(spec) {
  const st = WSD_STYLES[spec.style] ? spec.style : "clinical";
  const b = spec.brand || {};
  const dark = !!b.dark;
  const p = wsdHex(b.primary, "#2f6feb");
  const bg = wsdHex(b.bg, dark ? "#0d0f14" : "#fbf8f3");
  const ink = wsdHex(b.ink, dark ? "#f4f1ea" : "#16181d");
  const s2 = wsdHex(b.secondary, wsdMix(p, ink, 0.55));
  const a = wsdHex(b.accent, wsdMix(p, "#ffffff", 0.35));
  const sf = wsdHex(b.surface, dark ? wsdMix(bg, "#ffffff", 0.06) : wsdMix(bg, "#ffffff", 0.6));
  const fd = wsdFont(b.display_font, WSD_STYLES[st].fonts[0]), fb = wsdFont(b.body_font, WSD_STYLES[st].fonts[1]);
  const r = Math.max(0, Math.min(40, +b.radius >= 0 ? +b.radius : 18));
  return { st, dark, p, s2, a, bg, ink, sf, mu: wsdMix(ink, bg, 0.42), line: wsdMix(ink, bg, 0.85), onp: wsdOn(p), ona: wsdOn(a), fd, fb, r, up: b.display_case === "upper", w: [400, 500, 600, 700, 800, 900].includes(+b.display_weight) ? +b.display_weight : st === "bold" ? 400 : 600 };
}
function wsdFonts(t) {
  const fam = [...new Set([t.fd, t.fb])].map((f) => "family=" + f.replace(/ /g, "+") + ":wght@300;400;500;600;700;800").join("&");
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${fam}&display=swap" rel="stylesheet">`;
}
function wsdImg(u, alt, cls = "", attrs = "") {
  const src = wsdUrl(u);
  return `<div class="im ${cls}${src ? "" : " noimg"}" ${attrs}>${src ? `<img src="${wsdE(src)}" alt="${wsdE(alt || "")}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg');this.remove()">` : ""}<i class="art" aria-hidden="true"></i></div>`;
}
function wsdHl(title, hl) {
  const t = wsdE(title || ""), h = wsdE(hl || "");
  if (h && t.includes(h)) { const i = t.indexOf(h), tail = (t.slice(i + h.length).match(/^[.,!?;:]+/) || [""])[0]; return t.slice(0, i) + `<em class="hl">${h}${tail}</em>` + t.slice(i + h.length + tail.length); }
  return t;
}
var wsdBtn = (label, href, kind = "p", extra = "") => label ? `<a class="btn btn-${kind}" href="${wsdE(href || "#contact")}" ${extra}><span>${wsdE(label)}</span></a>` : "";
var wsdKick = (k) => k ? `<p class="kick" data-up>${wsdE(k)}</p>` : "";
// ── Sections ──
var WSD_SECTIONS = {
  hero(s, spec, t) {
    const im = wsdArr(s.images, 4), v = WSD_VARIANTS.hero.includes(s.variant) ? s.variant : WSD_STYLES[t.st].hero[0];
    const badges = wsdArr(s.badges, 3).map((b, i) => `<span class="badge b${i}">${wsdE(b)}</span>`).join("");
    const copy = `<div class="hero-copy">${s.kicker ? `<p class="kick hero-kick">${wsdE(s.kicker)}</p>` : ""}<h1 class="h-hero" data-words>${wsdHl(s.title, s.highlight)}</h1>${s.sub ? `<p class="lead" data-fadein>${wsdE(s.sub)}</p>` : ""}<div class="acts" data-fadein>${wsdBtn(s.cta || "Get in touch", "#contact", "p", "data-mag")}${wsdBtn(s.cta2, s.cta2_href || "#features", "g", "data-mag")}</div></div>`;
    if (v === "fullbleed") return `<section class="hero hero-full" id="top"><div class="hero-bg">${wsdImg(im[0], s.title, "full", "data-zoomout")}<i class="shade"></i></div><div class="wrap">${copy}</div>${badges ? `<div class="badges">${badges}</div>` : ""}<div class="scrollcue" aria-hidden="true"><i></i></div></section>`;
    if (v === "giant-type") {
      const words = String(s.giant || spec.brand?.logo_text || s.title || "").split(/\s+/).slice(0, 4);
      return `<section class="hero hero-giant" id="top"><div class="giant" aria-hidden="true">${words.map((w, i) => `<div class="g-row" data-gx="${i % 2 ? 1 : -1}">${wsdE(w)}<span class="g-dot"></span>${wsdE(w)}</div>`).join("")}</div><div class="wrap hero-grid">${copy}${wsdImg(im[0], s.title, "hero-img round", "data-clipin")}</div>${badges ? `<div class="badges">${badges}</div>` : ""}</section>`;
    }
    if (v === "collage") return `<section class="hero hero-collage" id="top"><div class="wrap hero-grid">${copy}<div class="collage">${wsdImg(im[0], "", "c0", 'data-par="-12"')}${wsdImg(im[1] || im[0], "", "c1", 'data-par="10"')}${wsdImg(im[2] || im[0], "", "c2", 'data-par="-20"')}<span class="blob bl1" data-float></span><span class="blob bl2" data-float></span></div></div>${badges ? `<div class="badges">${badges}</div>` : ""}</section>`;
    return `<section class="hero hero-arch" id="top"><div class="wrap hero-grid">${copy}<div class="arch-wrap">${wsdImg(im[0], s.title, "hero-img arch", "data-archin")}${badges}<span class="ring" aria-hidden="true"></span></div></div></section>`;
  },
  marquee(s, spec, t) {
    const items = wsdArr(s.items, 12).map((x) => `<span>${wsdE(x)}</span><b aria-hidden="true">${t.st === "playful" ? "●" : t.st === "luxe" ? "◆" : "✦"}</b>`).join("");
    if (!items) return "";
    const v = s.variant === "outline" ? "outline" : "velocity";
    return `<section class="mq mq-${v}" aria-label="${wsdE(wsdArr(s.items, 12).join(", "))}"><div class="mq-track" data-vel><div class="mq-in">${items}${items}</div></div></section>`;
  },
  statement(s) {
    if (!s.text) return "";
    return `<section class="sec stmt"><div class="wrap">${wsdKick(s.kicker)}<p class="stmt-t" ${s.variant === "mask" ? "data-lines" : "data-fill"}>${wsdE(s.text)}</p></div></section>`;
  },
  features(s, spec, t) {
    const it = wsdArr(s.items, 8);
    if (!it.length) return "";
    const v = WSD_VARIANTS.features.includes(s.variant) ? s.variant : WSD_STYLES[t.st].features[0];
    const head = `<div class="sec-head">${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title, s.highlight)}</h2>${s.sub ? `<p class="lead" data-up>${wsdE(s.sub)}</p>` : ""}</div>`;
    const card = (x, i, cls = "") => `<article class="card ${cls}">${wsdImg(x.image, x.title, "card-im")}<div class="card-b">${x.tag ? `<span class="tag">${wsdE(x.tag)}</span>` : `<span class="num">${String(i + 1).padStart(2, "0")}</span>`}<h3>${wsdE(x.title)}</h3><p>${wsdE(x.text)}</p></div></article>`;
    if (v === "rail") return `<section class="sec feat feat-rail" id="features"><div class="wrap">${head}</div><div class="rail" data-rail><div class="rail-stick"><div class="rail-track">${it.map((x, i) => card(x, i, "rail-card")).join("")}</div><div class="rail-bar"><i></i></div></div></div></section>`;
    if (v === "stack") return `<section class="sec feat feat-stack" id="features"><div class="wrap">${head}<div class="stack">${it.map((x, i) => `<div class="stk" style="--i:${i}">${card(x, i, "stk-card")}</div>`).join("")}</div></div></section>`;
    if (v === "fan") return `<section class="sec feat feat-fan" id="features"><div class="wrap">${head}<div class="fan" data-fan>${it.slice(0, 5).map((x, i) => card(x, i, "fan-card")).join("")}</div></div></section>`;
    return `<section class="sec feat feat-bento" id="features"><div class="wrap">${head}<div class="bento">${it.map((x, i) => card(x, i, "bento-card b" + i)).join("")}</div></div></section>`;
  },
  stats(s) {
    const it = wsdArr(s.items, 4).filter((x) => x && x.label && Number.isFinite(+x.value));
    if (!it.length) return "";
    return `<section class="sec stats"><div class="wrap">${s.title ? `<h2 class="h2 sm" data-lines>${wsdE(s.title)}</h2>` : ""}<div class="stat-row">${it.map((x) => `<div class="stat" data-up><b><span>${wsdE(x.prefix || "")}</span><span data-count="${+x.value}">${+x.value}</span><span>${wsdE(x.suffix || "")}</span></b><p>${wsdE(x.label)}</p></div>`).join("")}</div></div></section>`;
  },
  journey(s, spec, t) {
    const st = wsdArr(s.steps, 6);
    if (!st.length) return "";
    const v = WSD_VARIANTS.journey.includes(s.variant) ? s.variant : WSD_STYLES[t.st].journey[0];
    const head = `<div class="sec-head">${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title, s.highlight)}</h2></div>`;
    if (v === "timeline") return `<section class="sec jr jr-time"><div class="wrap">${head}<div class="tl"><i class="tl-line"><b></b></i>${st.map((x, i) => `<div class="tl-it" data-up><span class="tl-dot">${i + 1}</span><div><small>${wsdE(x.label || "")}</small><h3>${wsdE(x.title)}</h3><p>${wsdE(x.text)}</p></div></div>`).join("")}</div></div></section>`;
    const steps = st.map((x, i) => `<div class="pj-step${i ? "" : " on"}"><small>${wsdE(x.label || String(i + 1).padStart(2, "0"))}</small><h3>${wsdE(x.title)}</h3><p>${wsdE(x.text)}</p></div>`).join("");
    const imgs = st.map((x, i) => wsdImg(x.image || wsdArr(spec.hero_images, 6)[i], x.title, "pj-im" + (i ? "" : " on"))).join("");
    const sky = v === "sky" ? `<div class="sky" aria-hidden="true"><i class="sun"></i><i class="cloud c1"></i><i class="cloud c2"></i></div>` : "";
    return `<section class="jr jr-pin jr-${v}" data-pinj style="--n:${st.length}"><div class="pj-stick">${sky}<div class="wrap pj-grid"><div>${head}<div class="pj-steps">${steps}</div><div class="pj-dots">${st.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div></div><div class="pj-media">${imgs}</div></div></div></section>`;
  },
  split(s) {
    if (!s.title) return "";
    const bl = wsdArr(s.bullets, 6);
    return `<section class="sec split ${s.flip ? "flip" : ""}"><div class="wrap split-grid">${wsdImg(s.image, s.title, "split-im", s.variant === "zoom" ? "data-zoomin" : "data-clip")}<div>${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title, s.highlight)}</h2>${s.text ? `<p class="lead" data-up>${wsdE(s.text)}</p>` : ""}${bl.length ? `<ul class="ticks">${bl.map((b) => `<li data-up>${wsdE(b)}</li>`).join("")}</ul>` : ""}${wsdBtn(s.cta, "#contact", "p", "data-mag")}</div></div></section>`;
  },
  gallery(s) {
    const im = wsdArr(s.images, 10).filter(wsdUrl);
    if (im.length < 3) return "";
    if (s.variant === "zoom") return `<section class="gz" data-gzoom><div class="gz-stick"><div class="gz-grid">${im.slice(0, 5).map((u, i) => wsdImg(u, "", "gz-" + i)).join("")}</div>${s.title ? `<h2 class="gz-t">${wsdE(s.title)}</h2>` : ""}</div></section>`;
    const half = Math.ceil(im.length / 2), r1 = im.slice(0, half), r2 = im.slice(half).length ? im.slice(half) : im.slice(0, half);
    return `<section class="sec gal">${s.title ? `<div class="wrap"><h2 class="h2" data-lines>${wsdE(s.title)}</h2></div>` : ""}<div class="gal-row" data-gx="-1">${[...r1, ...r1].map((u) => wsdImg(u, "", "gal-im")).join("")}</div><div class="gal-row" data-gx="1">${[...r2, ...r2].map((u) => wsdImg(u, "", "gal-im")).join("")}</div></section>`;
  },
  testimonials(s, spec) {
    const rv = spec.reviews || {};
    const pool = [...wsdArr(s.items, 10), ...wsdArr(rv.items, 10)].filter((x) => x && x.quote);
    const seen = new Set(), it = pool.filter((x) => { const k = String(x.quote).slice(0, 40); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 10);
    if (!it.length) return "";
    const src = (x) => x.source || rv.source || "";
    const stars = (n) => n ? `<span class="stars" aria-label="${+n} stars">${"\u2605".repeat(Math.max(1, Math.min(5, Math.round(+n))))}</span>` : "";
    const q = (x) => `<figure class="quote">${stars(x.stars)}<blockquote>\u201C${wsdE(x.quote)}\u201D</blockquote><figcaption>${wsdE(x.name || "")}${src(x) ? ` <small>\u00B7 ${wsdE(src(x))}</small>` : ""}</figcaption></figure>`;
    const badge = rv.rating ? `<a class="rv-badge" ${wsdUrl(rv.url) ? `href="${wsdE(rv.url)}" target="_blank" rel="noopener"` : ""} data-up><b data-count="${+rv.rating}">${+rv.rating}</b><span><i class="stars">\u2605\u2605\u2605\u2605\u2605</i>${wsdE(rv.source || "Google")} rating${rv.count ? ` \u00B7 ${+rv.count} reviews` : ""}</span></a>` : "";
    const head = `<div class="tst-head">${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title || "Kind words", s.highlight)}</h2>${badge}</div>`;
    const v = ["marquee", "spotlight", "wall", "stack"].includes(s.variant) ? s.variant : it.length < 3 ? "stack" : "marquee";
    if (v === "spotlight") return `<section class="sec tst tst-spot"><div class="wrap">${head}<div class="spot" data-spot>${it.map((x, i) => `<figure class="spot-q${i ? "" : " on"}">${stars(x.stars || 5)}<blockquote>\u201C${wsdE(x.quote)}\u201D</blockquote><figcaption>${wsdE(x.name || "")}${src(x) ? ` \u00B7 ${wsdE(src(x))}` : ""}</figcaption></figure>`).join("")}<div class="spot-dots">${it.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div></div></div></section>`;
    if (v === "wall") return `<section class="sec tst tst-wall"><div class="wrap">${head}<div class="wall">${it.map((x, i) => `<div class="wall-c" style="--rt:${(i % 3 - 1) * 1.6}deg" data-up>${q(x)}</div>`).join("")}</div></div></section>`;
    if (v === "stack") return `<section class="sec tst tst-stack"><div class="wrap">${head}<div class="tst-grid">${it.map((x) => `<div data-up>${q(x)}</div>`).join("")}</div></div></section>`;
    const half = Math.ceil(it.length / 2), r1 = it.length > 3 ? it.slice(0, half) : it, r2 = it.length > 3 ? it.slice(half) : it;
    return `<section class="sec tst"><div class="wrap">${head}</div><div class="tst-mq"><div class="tst-in">${[...r1, ...r1].map(q).join("")}</div>${it.length > 3 ? `<div class="tst-in rev">${[...r2, ...r2].map(q).join("")}</div>` : ""}</div></section>`;
  },
  faq(s) {
    const it = wsdArr(s.items, 10).filter((x) => x && x.q);
    if (!it.length) return "";
    return `<section class="sec faq"><div class="wrap faq-grid"><div>${wsdKick(s.kicker || "Questions")}<h2 class="h2" data-lines>${wsdE(s.title || "Good to know")}</h2><p class="mu-t" data-up>Can't see yours? Ask our receptionist, bottom right.</p></div><div>${it.map((x, i) => `<details${i ? "" : " open"} data-up><summary>${wsdE(x.q)}<i></i></summary><p>${wsdE(x.a)}</p></details>`).join("")}</div></div></section>`;
  },
  cta(s, spec) {
    const c = spec.contact || {};
    const fields = wsdArr(s.fields, 5).length ? wsdArr(s.fields, 5) : ["Your name", "Best phone number", "How can we help?"];
    const info = [c.phone && `<a href="tel:${wsdE(String(c.phone).replace(/[^+\d]/g, ""))}">${wsdE(c.phone)}</a>`, c.email && `<a href="mailto:${wsdE(c.email)}">${wsdE(c.email)}</a>`, c.address && `<span>${wsdE(c.address)}</span>`, c.hours && `<span>${wsdE(c.hours)}</span>`].filter(Boolean).join("");
    const form = `<form class="demo-form" data-demo-form>${fields.map((f, i) => i === fields.length - 1 && fields.length > 2 ? `<label><span>${wsdE(f)}</span><textarea rows="3"></textarea></label>` : `<label><span>${wsdE(f)}</span><input></label>`).join("")}<button class="btn btn-p" data-mag><span>${wsdE(s.button || "Send")}</span></button><p class="form-note" hidden>Concept preview: nothing was sent. On the live site this lands straight in your inbox and CRM.</p></form>`;
    if (s.variant === "big") return `<section class="sec cta cta-big" id="contact"><div class="wrap"><h2 class="cta-giant" data-words>${wsdHl(s.title || "Let's talk", s.highlight)}</h2>${s.sub ? `<p class="lead" data-up>${wsdE(s.sub)}</p>` : ""}<div class="cta-grid">${form}<div class="cinfo" data-up>${info}</div></div></div></section>`;
    return `<section class="sec cta" id="contact"><div class="wrap cta-grid"><div>${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title || "Get in touch", s.highlight)}</h2>${s.sub ? `<p class="lead" data-up>${wsdE(s.sub)}</p>` : ""}<div class="cinfo" data-up>${info}</div></div>${form}</div></section>`;
  },
  // v48: their AI receptionist, shown working inside their own homepage (the moment that sells it)
  receptionist(s, spec) {
    const qa = wsdArr(s.items, 3).filter((x) => x && x.q && x.a);
    if (!qa.length) return "";
    const nm = wsdE(spec.receptionist_name || "our receptionist");
    const v = s.variant === "phone" ? "phone" : "chat";
    const bubbles = qa.map((x, i) => `<div class="rc-q" style="--d:${i * 2.6}s">${wsdE(x.q)}</div><div class="rc-a" style="--d:${i * 2.6 + 1.1}s"><i class="rc-dots"><b></b><b></b><b></b></i><span>${wsdE(x.a)}</span></div>`).join("");
    const screen = v === "phone" ? `<div class="rc-phone"><div class="rc-call"><span class="rc-pulse">${wsdUrl(spec.brand?.logo) ? `<img src="${wsdE(spec.brand.logo)}" alt="">` : ""}</span><b>${nm}</b><small>Answering ${wsdE(spec.brand?.logo_text || "")} · 24/7</small></div><div class="rc-feed">${bubbles}</div></div>` : `<div class="rc-chat"><div class="rc-top"><span class="rc-av">${wsdUrl(spec.brand?.logo) ? `<img src="${wsdE(spec.brand.logo)}" alt="">` : nm.slice(0, 1)}</span><div><b>${nm}</b><small><i></i>Online now · replies in seconds</small></div></div><div class="rc-feed">${bubbles}</div></div>`;
    return `<section class="sec rcp rcp-${v}" data-rcp><div class="wrap rcp-grid"><div>${wsdKick(s.kicker || "Open day and night")}<h2 class="h2" data-lines>${wsdHl(s.title || "Ask us anything, any time", s.highlight)}</h2>${s.sub ? `<p class="lead" data-up>${wsdE(s.sub)}</p>` : ""}<ul class="ticks">${wsdArr(s.bullets, 4).map((b) => `<li data-up>${wsdE(b)}</li>`).join("")}</ul><button class="btn btn-p rc-try" type="button" data-mag onclick="var b=document.querySelector('.sfw-b');if(b)b.click()"><span>${wsdE(s.cta || "Try it now")}</span></button></div><div class="rcp-screen" data-up>${screen}</div></div><script>(function(){var s=document.currentScript.parentNode;if(!('IntersectionObserver' in window)){s.classList.add('go');return}var o=new IntersectionObserver(function(e){if(e[0].isIntersecting){s.classList.add('go');o.disconnect()}},{threshold:.35});o.observe(s)})()</script></section>`;
  },
  // v48: the suburbs they serve, so locals see themselves
  area(s, spec) {
    const it = wsdArr(s.items, 14).map((x) => String(x || "").trim()).filter(Boolean);
    if (it.length < 3) return "";
    const head = `${wsdKick(s.kicker || "Local")}<h2 class="h2" data-lines>${wsdHl(s.title || "Proudly local", s.highlight)}</h2>${s.sub ? `<p class="lead" data-up>${wsdE(s.sub)}</p>` : ""}`;
    if (s.variant === "chips") return `<section class="sec area area-chips"><div class="wrap">${head}<div class="ar-chips">${it.map((x, i) => `<span data-up style="--i:${i}">${wsdE(x)}</span>`).join("")}</div></div></section>`;
    const n = Math.min(it.length, 10);
    return `<section class="sec area area-orbit"><div class="wrap ar-grid"><div>${head}</div><div class="ar-orbit" data-up><div class="ar-core">${wsdE(s.centre || spec.brand?.logo_text || "Home base")}</div><div class="ar-ring">${it.slice(0, n).map((x, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return `<span style="left:${(50 + 46 * Math.cos(a)).toFixed(2)}%;top:${(50 + 46 * Math.sin(a)).toFixed(2)}%"><b>${wsdE(x)}</b></span>`; }).join("")}</div></div></div></section>`;
  }
};
// ── v58 design engine: 7 new scroll moments, a per-brand "design DNA" so no two demos look alike, tighter spacing ──
WSD_VARIANTS.hero.push("zoomthrough");
WSD_VARIANTS.features.push("list", "panels", "flip");
WSD_VARIANTS.split.push("circle");
WSD_VARIANTS.expand = ["grow"];
WSD_VARIANTS.compare = ["slider"];
var WSD_DNA = {
  c: ["soft", "sharp", "pill"],            // corners
  k: ["glass", "outline", "solid", "lift"], // cards
  i: ["round", "arch", "tilt", "frame"],    // image treatment
  b: ["plain", "bands", "dark"],            // section backgrounds
  h: ["left", "center", "split"],           // section headings
  n: ["pill", "square", "underline"],       // buttons
  x: ["none", "grain", "grid", "dots"]      // background texture
};
function wsdDnaPick(seed, avoid = []) {
  let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const pickOne = (k, i) => WSD_DNA[k][(h >>> (i * 3)) % WSD_DNA[k].length];
  let dna = Object.fromEntries(Object.keys(WSD_DNA).map((k, i) => [k, pickOne(k, i)]));
  // never repeat the last few demos' look: change the most visible traits if it matches one
  for (const a of avoid) {
    if (!a) continue;
    const same = Object.keys(WSD_DNA).filter((k) => a[k] === dna[k]).length;
    if (same >= 4) for (const k of ["k", "i", "b", "h"]) if (a[k] === dna[k]) { const l = WSD_DNA[k]; dna[k] = l[(l.indexOf(dna[k]) + 1 + (h % (l.length - 1))) % l.length]; }
  }
  return dna;
}
var wsdDnaClass = (dna) => dna && typeof dna === "object" ? Object.keys(WSD_DNA).map((k) => WSD_DNA[k].includes(dna[k]) ? "dna-" + k + "-" + dna[k] : "").join(" ") : "";
(function () {
  const H = WSD_SECTIONS.hero, F = WSD_SECTIONS.features, S = WSD_SECTIONS.split;
  const head = (s) => `<div class="sec-head">${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title, s.highlight)}</h2>${s.sub ? `<p class="lead" data-up>${wsdE(s.sub)}</p>` : ""}</div>`;
  // 1. Zoom-through hero: a giant word grows until you fly through it into their photo
  WSD_SECTIONS.hero = (s, spec, t) => {
    if (s.variant !== "zoomthrough") return H(s, spec, t);
    const im = wsdArr(s.images, 2), word = String(s.giant || spec.brand?.logo_text || s.title || "").split(/\s+/).slice(0, 2).join(" ");
    return `<section class="hero hero-zt" id="top" data-zt><div class="zt-stick"><div class="zt-bg">${wsdImg(im[0], s.title, "full")}<i class="shade"></i></div><div class="zt-word" aria-hidden="true">${wsdE(word)}</div><div class="wrap zt-copy">${s.kicker ? `<p class="kick hero-kick">${wsdE(s.kicker)}</p>` : ""}<h1 class="h-hero">${wsdHl(s.title, s.highlight)}</h1>${s.sub ? `<p class="lead">${wsdE(s.sub)}</p>` : ""}<div class="acts">${wsdBtn(s.cta || "Get in touch", "#contact", "p", "data-mag")}${wsdBtn(s.cta2, s.cta2_href || "#features", "g", "data-mag")}</div></div></div></section>`;
  };
  WSD_SECTIONS.features = (s, spec, t) => {
    const it = wsdArr(s.items, 8);
    if (!it.length || !["list", "panels", "flip"].includes(s.variant)) return F(s, spec, t);
    // 2. Big-type service list: hover (or tap) a service and its photo slides in
    if (s.variant === "list") return `<section class="sec feat feat-list" id="features"><div class="wrap">${head(s)}<ol class="fl">${it.map((x, i) => `<li class="fl-it" data-up tabindex="0"><span class="fl-n">${String(i + 1).padStart(2, "0")}</span><div class="fl-b"><h3>${wsdE(x.title)}</h3><p>${wsdE(x.text)}</p></div>${wsdImg(x.image, x.title, "fl-im")}</li>`).join("")}</ol></div></section>`;
    // 3. Expanding panels: photos side by side, the one you hover opens up with its story
    if (s.variant === "panels") return `<section class="sec feat feat-panels" id="features"><div class="wrap">${head(s)}<div class="pn">${it.slice(0, 5).map((x, i) => `<article class="pn-it${i ? "" : " on"}" tabindex="0">${wsdImg(x.image, x.title, "pn-im")}<div class="pn-b"><span>${wsdE(x.tag || String(i + 1).padStart(2, "0"))}</span><h3>${wsdE(x.title)}</h3><p>${wsdE(x.text)}</p></div></article>`).join("")}</div></div></section>`;
    // 4. Flip cards: each card turns over as it scrolls into view to reveal the detail
    return `<section class="sec feat feat-flip" id="features"><div class="wrap">${head(s)}<div class="fp">${it.slice(0, 6).map((x, i) => `<div class="fp-c" data-flip style="--i:${i}"><div class="fp-in"><div class="fp-f">${wsdImg(x.image, x.title, "fp-im")}<h3>${wsdE(x.title)}</h3></div><div class="fp-bk"><span class="num">${String(i + 1).padStart(2, "0")}</span><h3>${wsdE(x.title)}</h3><p>${wsdE(x.text)}</p></div></div></div>`).join("")}</div></div></section>`;
  };
  // 5. Circle reveal: their photo opens out of a circle as you scroll
  WSD_SECTIONS.split = (s, spec, t) => {
    if (s.variant !== "circle" || !s.title) return S(s, spec, t);
    const bl = wsdArr(s.bullets, 6);
    return `<section class="sec split split-circle ${s.flip ? "flip" : ""}"><div class="wrap split-grid">${wsdImg(s.image, s.title, "split-im", "data-circle")}<div>${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title, s.highlight)}</h2>${s.text ? `<p class="lead" data-up>${wsdE(s.text)}</p>` : ""}${bl.length ? `<ul class="ticks">${bl.map((b) => `<li data-up>${wsdE(b)}</li>`).join("")}</ul>` : ""}${wsdBtn(s.cta, "#contact", "p", "data-mag")}</div></div></section>`;
  };
  // 6. Expand: a framed photo grows to fill the screen with a headline over it
  WSD_SECTIONS.expand = (s) => {
    if (!s.title) return "";
    return `<section class="xp" data-xp><div class="xp-stick">${wsdImg(s.image || wsdArr(s.images, 1)[0], s.title, "xp-im")}<div class="xp-copy">${wsdKick(s.kicker)}<h2 class="h2">${wsdHl(s.title, s.highlight)}</h2>${s.text ? `<p class="lead">${wsdE(s.text)}</p>` : ""}${wsdBtn(s.cta, "#contact", "p", "data-mag")}</div></div></section>`;
  };
  // 7. Before / after: drag the handle to compare (results, a makeover, their old site vs the new)
  WSD_SECTIONS.compare = (s) => {
    const a = s.before || wsdArr(s.images, 2)[0], b = s.after || wsdArr(s.images, 2)[1];
    if (!wsdUrl(a) || !wsdUrl(b) || !s.title) return "";
    return `<section class="sec cmp"><div class="wrap">${head(s)}<div class="cmp-box" data-cmp style="--x:50%">${wsdImg(b, s.after_label || "After", "cmp-b")}<div class="cmp-a">${wsdImg(a, s.before_label || "Before", "cmp-im")}</div><span class="cmp-l l1">${wsdE(s.before_label || "Before")}</span><span class="cmp-l l2">${wsdE(s.after_label || "After")}</span><i class="cmp-h" aria-hidden="true"></i><input type="range" min="0" max="100" value="50" aria-label="Compare before and after"></div></div></section>`;
  };
})();
function WSD_CSS2(t) {
  return `
/* v58 spacing: no big empty gaps between sections */
.sec{padding:clamp(44px,5.5vw,84px) 0}.sec+.sec{padding-top:clamp(8px,1.6vw,24px)}.dna-b-bands .sec+.sec,.dna-b-dark .sec+.sec{padding-top:clamp(44px,5.5vw,84px)}
.hero{padding-bottom:clamp(36px,4vw,60px)}.jr-pin{height:calc(var(--n) * 62vh + 30vh)}.gz{height:170vh}.sec-head{margin-bottom:clamp(22px,3vw,40px)}
@media(max-width:820px){.sec{padding:40px 0}.sec+.sec{padding-top:8px}.dna-b-bands .sec+.sec,.dna-b-dark .sec+.sec{padding-top:40px}.jr-pin{height:auto}}
/* design DNA */
.dna-c-sharp{--r:3px}.dna-c-pill{--r:30px}.dna-c-pill .btn{border-radius:999px}.dna-c-sharp .btn{border-radius:2px}
.dna-k-glass .card,.dna-k-glass .quote,.dna-k-glass .pn-b{background:color-mix(in srgb,var(--sf) 62%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid color-mix(in srgb,var(--ink) 10%,transparent)}
.dna-k-outline .card,.dna-k-outline .quote{background:transparent;border:1.5px solid var(--ink);box-shadow:none}
.dna-k-solid .card,.dna-k-solid .quote{background:var(--p);color:var(--onp);border:0}.dna-k-solid .card p,.dna-k-solid .quote figcaption{color:inherit;opacity:.85}
.dna-k-lift .card,.dna-k-lift .quote{border:0;box-shadow:0 30px 60px -28px color-mix(in srgb,var(--ink) 45%,transparent),0 2px 6px color-mix(in srgb,var(--ink) 8%,transparent)}
.dna-i-arch .split-im,.dna-i-arch .card-im{border-radius:999px 999px var(--r) var(--r)!important;overflow:hidden}
.dna-i-tilt .split-im{transform:rotate(-2.2deg)}.dna-i-tilt .card-im{transform:rotate(1.2deg)}
.dna-i-frame .split-im{box-shadow:18px 18px 0 -2px var(--a);border-radius:var(--r);overflow:hidden}
.dna-i-round .split-im{border-radius:calc(var(--r) * 1.6);overflow:hidden}
.dna-b-bands main>section:nth-of-type(even):not(.hero):not(.mq){background:var(--sf)}
.dna-b-dark main>section:nth-of-type(4n+3):not(.hero):not(.mq){background:color-mix(in srgb,var(--ink) 92%,var(--p));color:var(--bg)}.dna-b-dark main>section:nth-of-type(4n+3) .lead,.dna-b-dark main>section:nth-of-type(4n+3) p{color:color-mix(in srgb,var(--bg) 78%,transparent)}
.dna-h-center .sec-head,.dna-h-center .tst-head{text-align:center;margin-inline:auto;max-width:860px}.dna-h-center .sec-head .kick{justify-content:center}
.dna-h-split .sec-head{display:grid;grid-template-columns:1fr 1fr;gap:12px 48px;align-items:end;max-width:none}.dna-h-split .sec-head .kick{grid-column:1/-1}@media(max-width:820px){.dna-h-split .sec-head{display:block}}
.dna-n-square .btn{border-radius:0;letter-spacing:.06em;text-transform:uppercase;font-size:.86em}.dna-n-underline .btn-g{background:none;border:0;border-bottom:2px solid currentColor;border-radius:0;padding-inline:2px}
.dna-x-grain body::before,body.dna-x-grain::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:1;opacity:.06;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
body.dna-x-grid{background-image:linear-gradient(color-mix(in srgb,var(--ink) 5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--ink) 5%,transparent) 1px,transparent 1px);background-size:64px 64px}
body.dna-x-dots{background-image:radial-gradient(color-mix(in srgb,var(--ink) 9%,transparent) 1.2px,transparent 1.4px);background-size:26px 26px}
/* 1 zoom-through hero */
.hero-zt{padding:0;min-height:0;height:190vh;display:block;color:#fff}.zt-stick{position:sticky;top:0;height:100svh;overflow:hidden;display:flex;align-items:flex-end}
.zt-bg{position:absolute;inset:0}.zt-bg .im{position:absolute;inset:0;border-radius:0}.zt-bg img{width:100%;height:100%;object-fit:cover}.zt-bg .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.62))}
.zt-word{position:absolute;inset:0;display:grid;place-items:center;font:var(--dw) clamp(64px,16vw,250px)/.9 var(--fd);letter-spacing:-.04em;color:var(--p);z-index:2;text-align:center;padding:0 3vw;will-change:transform,opacity;overflow-wrap:anywhere}
.zt-word::before{content:"";position:absolute;inset:-50%;background:var(--bg);z-index:-1;opacity:var(--zb,1)}
.zt-copy{position:relative;z-index:3;padding-bottom:clamp(48px,8vh,96px);opacity:0;transform:translateY(30px)}.zt-copy .h-hero{color:#fff;max-width:16ch}.zt-copy .lead{color:rgba(255,255,255,.88);max-width:56ch}
@media(prefers-reduced-motion:reduce){.hero-zt{height:auto}.zt-stick{position:relative;min-height:92svh}.zt-word{display:none}.zt-copy{opacity:1;transform:none}}
/* 2 big-type list */
.fl{list-style:none;border-top:1px solid var(--ln)}.fl-it{position:relative;display:grid;grid-template-columns:70px 1fr;gap:18px;padding:clamp(18px,2.4vw,30px) 0;border-bottom:1px solid var(--ln);cursor:default;outline:none}
.fl-n{font:600 14px/1 var(--fb);color:var(--p);padding-top:.7em}.fl-b h3{font-size:clamp(28px,4.4vw,64px);line-height:1;letter-spacing:-.03em;transition:color .35s,transform .45s cubic-bezier(.2,.8,.2,1)}.fl-b p{max-width:52ch;color:var(--mu);margin-top:10px}
.fl-im{position:absolute;right:0;top:50%;width:min(30vw,380px);aspect-ratio:4/3;border-radius:var(--r);overflow:hidden;opacity:0;transform:translateY(-50%) rotate(-4deg) scale(.86);transition:opacity .4s,transform .55s cubic-bezier(.2,.8,.2,1);pointer-events:none;z-index:2;box-shadow:0 30px 60px -20px rgba(0,0,0,.35)}.fl-im img{width:100%;height:100%;object-fit:cover}
.fl-it:hover .fl-b h3,.fl-it:focus .fl-b h3{color:var(--p);transform:translateX(14px)}.fl-it:hover .fl-im,.fl-it:focus .fl-im{opacity:1;transform:translateY(-50%) rotate(-2deg) scale(1)}
@media(max-width:820px){.fl-it{grid-template-columns:44px 1fr}.fl-im{position:relative;grid-column:2;top:auto;right:auto;width:100%;opacity:1;transform:none;margin-top:12px}}
/* 3 expanding panels */
.pn{display:flex;gap:12px;height:clamp(420px,62vh,620px)}.pn-it{position:relative;flex:1;min-width:0;border-radius:var(--r);overflow:hidden;transition:flex .7s cubic-bezier(.2,.8,.2,1);cursor:pointer;outline:none;background:var(--sf)}
.pn-it.on,.pn-it:hover,.pn-it:focus{flex:3.6}.pn-im{position:absolute;inset:0;border-radius:0}.pn-im img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s}.pn-it.on .pn-im img{transform:scale(1.06)}
.pn-b{position:absolute;left:0;right:0;bottom:0;padding:22px;color:#fff;background:linear-gradient(180deg,transparent,rgba(0,0,0,.72))}.pn-b span{font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85}.pn-b h3{margin:6px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pn-b p{max-height:0;opacity:0;overflow:hidden;transition:max-height .6s,opacity .5s;color:rgba(255,255,255,.88)}
.pn-it.on .pn-b p,.pn-it:hover .pn-b p{max-height:160px;opacity:1}.pn-it.on .pn-b h3{white-space:normal}
@media(max-width:820px){.pn{flex-direction:column;height:auto}.pn-it{min-height:120px;flex:none}.pn-it.on{min-height:340px}}
/* 4 flip cards */
.fp{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:18px;perspective:1400px}.fp-c{height:clamp(300px,34vw,380px)}.fp-in{position:relative;height:100%;transform-style:preserve-3d;transition:transform .9s cubic-bezier(.2,.8,.2,1)}
.fp-c.on .fp-in{transform:rotateY(180deg)}.fp-f,.fp-bk{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:var(--r);overflow:hidden}
.fp-f .im{position:absolute;inset:0;border-radius:0}.fp-f img{width:100%;height:100%;object-fit:cover}.fp-f h3{position:absolute;left:0;right:0;bottom:0;padding:22px;color:#fff;background:linear-gradient(180deg,transparent,rgba(0,0,0,.7))}
.fp-bk{transform:rotateY(180deg);background:var(--p);color:var(--onp);padding:28px;display:flex;flex-direction:column;justify-content:flex-end;gap:10px}.fp-bk p{opacity:.9}
@media(prefers-reduced-motion:reduce){.fp-c.on .fp-in{transform:none}.fp-bk{position:relative;transform:none}}
/* 5 circle reveal */
[data-circle]{clip-path:circle(18% at 50% 50%)}
/* 6 expand */
.xp{height:210vh;position:relative}.xp-stick{position:sticky;top:0;height:100svh;overflow:hidden;display:grid;place-items:center}.xp-im{position:absolute;inset:0;border-radius:0;clip-path:inset(18% 22% round 28px)}.xp-im img{width:100%;height:100%;object-fit:cover}
.xp-copy{position:relative;z-index:2;color:#fff;text-align:center;max-width:860px;padding:0 20px;opacity:0;transform:translateY(40px)}.xp-copy .h2{color:#fff}.xp-copy .lead{color:rgba(255,255,255,.9);margin-inline:auto}.xp-stick::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,.4);opacity:var(--xo,0);pointer-events:none;z-index:1}
@media(max-width:820px),(prefers-reduced-motion:reduce){.xp{height:auto}.xp-stick{position:relative;min-height:80svh}.xp-im{clip-path:none}.xp-copy{opacity:1;transform:none}.xp-stick::after{opacity:1}}
/* 7 before / after */
.cmp-box{position:relative;aspect-ratio:16/9;border-radius:var(--r);overflow:hidden;user-select:none}.cmp-box .im{position:absolute;inset:0;border-radius:0}.cmp-box img{width:100%;height:100%;object-fit:cover}
.cmp-a{position:absolute;inset:0;clip-path:inset(0 calc(100% - var(--x)) 0 0)}.cmp-h{position:absolute;top:0;bottom:0;left:var(--x);width:3px;margin-left:-1.5px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.15)}
.cmp-h::after{content:"\\2194";position:absolute;top:50%;left:50%;width:46px;height:46px;margin:-23px;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;font-size:20px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.cmp-box input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize}.cmp-l{position:absolute;top:14px;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:13px}.cmp-l.l1{left:14px}.cmp-l.l2{right:14px}
.zt-copy .hl,.xp-copy .hl,.pn-b .hl{color:var(--a)}.zt-copy .kick,.xp-copy .kick{color:rgba(255,255,255,.9)}
.ai-note{font-size:12px;opacity:.7}`;
}
var WSD_MOTION2 = `(function(){var d=document;d.querySelectorAll('[data-cmp]').forEach(function(b){var r=b.querySelector('input');if(r)r.addEventListener('input',function(){b.style.setProperty('--x',r.value+'%')})});
d.querySelectorAll('.pn').forEach(function(p){var its=[].slice.call(p.querySelectorAll('.pn-it'));its.forEach(function(it){var on=function(){its.forEach(function(x){x.classList.toggle('on',x===it)})};it.addEventListener('mouseenter',on);it.addEventListener('click',on);it.addEventListener('focus',on)})});
var R=matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var c=e.target;setTimeout(function(){c.classList.add('on')},R?0:300+(+getComputedStyle(c).getPropertyValue('--i')||0)*160);io.unobserve(c)}})},{threshold:.55});d.querySelectorAll('[data-flip]').forEach(function(c){io.observe(c)})}
if(!window.gsap||!window.ScrollTrigger||R)return;var g=gsap,ST=ScrollTrigger;g.registerPlugin(ST);var mob=matchMedia('(max-width:820px)').matches;
d.querySelectorAll('[data-zt]').forEach(function(s){var w=s.querySelector('.zt-word'),c=s.querySelector('.zt-copy'),bg=s.querySelector('.zt-bg');var tl=g.timeline({scrollTrigger:{trigger:s,start:'top top',end:'bottom bottom',scrub:.6}});tl.to(w,{scale:mob?9:14,ease:'power2.in',duration:1},0).to(w,{'--zb':0,duration:.35},.1).to(w,{opacity:0,duration:.25},.75).fromTo(bg,{scale:1.25},{scale:1,duration:1},0).to(c,{opacity:1,y:0,duration:.3},.72)});
d.querySelectorAll('[data-circle]').forEach(function(el){g.fromTo(el,{clipPath:'circle(18% at 50% 50%)'},{clipPath:'circle(75% at 50% 50%)',ease:'none',scrollTrigger:{trigger:el,start:'top 85%',end:'center 45%',scrub:.5}})});
if(!mob)d.querySelectorAll('[data-xp]').forEach(function(s){var im=s.querySelector('.xp-im'),c=s.querySelector('.xp-copy'),st=s.querySelector('.xp-stick');var tl=g.timeline({scrollTrigger:{trigger:s,start:'top top',end:'bottom bottom',scrub:.6}});tl.fromTo(im,{clipPath:'inset(18% 22% round 28px)'},{clipPath:'inset(0% 0% round 0px)',ease:'none',duration:1},0).to(st,{'--xo':1,duration:.4},.5).to(c,{opacity:1,y:0,duration:.35},.62)});
})();`;

// ── v59: the Playball standard. Booking finder, quote builder and founder sections, plus "more of our work". ──
WSD_VARIANTS.finder = ["tabs"];
WSD_VARIANTS.quote = ["sliders"];
WSD_VARIANTS.founder = ["portrait"];
(function () {
  const head = (s) => `<div class="sec-head">${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title, s.highlight)}</h2>${s.sub ? `<p class="lead" data-up>${wsdE(s.sub)}</p>` : ""}</div>`;
  // Booking finder: filter by age / service / suburb, live "only 3 left", Book or Join waitlist
  WSD_SECTIONS.finder = (s) => {
    const it = wsdArr(s.items, 12);
    if (!it.length || !s.title) return "";
    const tabs = [...new Set(it.map((x) => x && x.tab).filter(Boolean))].slice(0, 6);
    return `<section class="sec fnd" id="book"><div class="wrap">${head(s)}${tabs.length > 1 ? `<div class="fnd-tabs" role="tablist"><button type="button" class="on" data-fnd="*">${wsdE(s.all_label || "All")}</button>${tabs.map((t) => `<button type="button" data-fnd="${wsdE(t)}">${wsdE(t)}</button>`).join("")}</div>` : ""}<div class="fnd-grid">${it.map((x) => {
      const sp = x.spots == null || x.spots === "" ? null : Math.max(0, +x.spots || 0);
      return `<article class="fnd-c" data-tab="${wsdE(x.tab || "")}"><div class="fnd-t"><b>${wsdE(x.title)}</b>${sp != null && sp <= 3 ? `<span class="fnd-hot">${sp === 0 ? "Full" : "Only " + sp + " left"}</span>` : ""}</div>${x.when || x.where ? `<p class="fnd-m">${[x.when, x.where].filter(Boolean).map(wsdE).join(" · ")}</p>` : ""}${x.text ? `<p class="fnd-x">${wsdE(x.text)}</p>` : ""}${wsdBtn(sp === 0 ? (x.cta_full || "Join waitlist") : (x.cta || s.cta || "Book a spot"), "#contact", sp === 0 ? "g" : "p")}</article>`;
    }).join("")}</div></div></section>`;
  };
  // Quote builder: sliders and a few questions, instant "we'll send your quote" moment
  WSD_SECTIONS.quote = (s, spec) => {
    if (!s.title) return "";
    const sl = wsdArr(s.sliders, 3), f = wsdArr(s.fields, 4);
    return `<section class="sec qt"><div class="wrap qt-grid">${wsdUrl(s.image) ? wsdImg(s.image, s.title, "qt-im") : ""}<div class="qt-card">${wsdKick(s.kicker)}<h2 class="h2">${wsdHl(s.title, s.highlight)}</h2>${s.sub ? `<p class="lead">${wsdE(s.sub)}</p>` : ""}<form class="qt-f" data-qt onsubmit="return false">${sl.map((x) => {
      const mn = Math.max(0, Math.round(+x.min || 1)), mx = Math.max(mn + 1, Math.round(+x.max || 20)), v = Math.round(+x.value || (mn + mx) / 2);
      return `<label class="qt-r"><span>${wsdE(x.label)}</span><b data-qv>${v}${x.unit ? " " + wsdE(x.unit) : ""}</b><input type="range" min="${mn}" max="${mx}" value="${v}" data-unit="${wsdE(x.unit || "")}"></label>`;
    }).join("")}${f.map((l) => `<label class="qt-l"><span>${wsdE(l)}</span><input class="in" type="text"></label>`).join("")}<button class="btn btn-p" type="submit">${wsdE(s.button || "Send me a quote")}</button><p class="qt-ok" hidden>${wsdE(s.ok_text || "Done! On your live site this lands straight in your inbox, and the AI receptionist confirms it with them.")}</p></form></div></div></section>`;
  };
  // Founder: the real person behind the business (never an AI portrait)
  WSD_SECTIONS.founder = (s) => {
    if (!s.title || !s.text) return "";
    return `<section class="sec fdr"><div class="wrap fdr-grid">${wsdUrl(s.image) ? wsdImg(s.image, s.name || s.title, "fdr-im") : `<div class="fdr-av" aria-hidden="true">${wsdE(String(s.name || s.title).trim().slice(0, 1))}</div>`}<div>${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title, s.highlight)}</h2><p class="lead" data-up>${wsdE(s.text)}</p>${s.quote ? `<blockquote class="fdr-q" data-up>“${wsdE(s.quote)}”</blockquote>` : ""}${s.name ? `<p class="fdr-sig">${wsdE(s.name)}${s.role ? ` <span>· ${wsdE(s.role)}</span>` : ""}</p>` : ""}</div></div></section>`;
  };
})();
// "Not capped at this design": real sites we've built, on every demo
var WSD_WORK = [
  { slug: "katia", name: "Katia Trotsenko", url: "https://www.katiatrotsenko.com", line: "Coaching brand: story-led homepage, funnels and booking." },
  { slug: "plf", name: "Pure Life Force", url: "https://www.purelifeforce.com.au", line: "Wellness clinic: online booking, automations and local SEO." }
];
function WSD_SHOWCASE(opt) {
  return `<section class="sec wk" id="our-work"><div class="wrap"><div class="sec-head"><p class="kick">More of our work</p><h2 class="h2">This is one direction. <em class="hl">You're not capped at it.</em></h2><p class="lead">Every Studio Flow site is designed from scratch. Here are two we've built recently. Yours can look like these, like this concept, or something new entirely.</p></div><div class="wk-grid">${WSD_WORK.map((w) => `<a class="wk-c" href="${w.url}" target="_blank" rel="noopener"><div class="wk-im"><img src="/demo/img/work/${w.slug}.jpg" alt="${wsdE(w.name)} website" loading="lazy" onerror="this.parentNode.classList.add('nx')"><span class="wk-url">${wsdE(w.url.replace(/^https:\/\/(www\.)?/, ""))}</span></div><div class="wk-b"><b>${wsdE(w.name)}</b><span>${wsdE(w.line)}</span><i>Visit the live site ↗</i></div></a>`).join("")}</div></div></section>`;
}
function WSD_CSS3() {
  return `
.fnd-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}.fnd-tabs button{font:600 14px/1 var(--fb);padding:11px 16px;border-radius:999px;border:1.5px solid var(--ln);background:var(--sf);color:var(--ink);cursor:pointer}.fnd-tabs button.on{background:var(--p);border-color:var(--p);color:var(--onp)}
.fnd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:14px}.fnd-c{display:flex;flex-direction:column;gap:8px;padding:20px;border-radius:var(--r);background:var(--sf);border:1px solid var(--ln)}.fnd-c[hidden]{display:none}
.fnd-t{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.fnd-t b{font-size:18px;line-height:1.25}.fnd-hot{flex:none;font-size:12px;font-weight:700;padding:5px 9px;border-radius:999px;background:color-mix(in srgb,var(--a) 22%,transparent);color:var(--ink)}
.fnd-m{font-weight:600;color:var(--p)}.fnd-x{color:var(--mu);font-size:15px}.fnd-c .btn{margin-top:auto;align-self:flex-start}
.qt-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(20px,4vw,56px);align-items:center}.qt-im{border-radius:var(--r);overflow:hidden;aspect-ratio:4/5}.qt-im img{width:100%;height:100%;object-fit:cover}
.qt-card{padding:clamp(22px,3vw,40px);border-radius:var(--r);background:var(--sf);border:1px solid var(--ln)}.qt-f{display:grid;gap:16px;margin-top:18px}.qt-r,.qt-l{display:grid;gap:8px;font-weight:600}.qt-r{grid-template-columns:1fr auto}.qt-r input{grid-column:1/-1;accent-color:var(--p);width:100%}
.qt-r b{color:var(--p)}.qt-ok{padding:12px 14px;border-radius:12px;background:color-mix(in srgb,var(--p) 12%,transparent);font-weight:600}
@media(max-width:820px){.qt-grid{grid-template-columns:1fr}.qt-im{aspect-ratio:16/10}}
.fdr-grid{display:grid;grid-template-columns:minmax(0,.8fr) 1.2fr;gap:clamp(22px,4vw,64px);align-items:center}.fdr-im{border-radius:var(--r);overflow:hidden;aspect-ratio:4/5}.fdr-im img{width:100%;height:100%;object-fit:cover}
.fdr-av{aspect-ratio:1;max-width:320px;border-radius:50%;display:grid;place-items:center;font:var(--dw) clamp(80px,12vw,160px)/1 var(--fd);background:color-mix(in srgb,var(--p) 14%,var(--sf));color:var(--p)}
.fdr-q{font:italic var(--dw) clamp(20px,2.2vw,28px)/1.35 var(--fd);margin:18px 0 0;padding-left:18px;border-left:3px solid var(--a)}.fdr-sig{margin-top:14px;font-weight:700}.fdr-sig span{font-weight:400;color:var(--mu)}
@media(max-width:820px){.fdr-grid{grid-template-columns:1fr}.fdr-im{aspect-ratio:16/12}}
.wk{background:color-mix(in srgb,#0b111c 90%,var(--p));color:#fff}.wk .lead{color:rgba(255,255,255,.78)}.wk .h2{color:#fff}.wk .hl{color:var(--a)}
.wk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:18px}.wk-c{display:block;border-radius:var(--r);overflow:hidden;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#fff;text-decoration:none;transition:transform .4s,border-color .4s}.wk-c:hover{transform:translateY(-6px);border-color:var(--a)}
.wk-im{position:relative;aspect-ratio:16/10;overflow:hidden;background:linear-gradient(135deg,var(--p),var(--a))}.wk-im img{width:100%;height:100%;object-fit:cover;object-position:top;transition:transform 1.2s}.wk-c:hover .wk-im img{transform:scale(1.04)}.wk-im.nx img{display:none}
.wk-url{position:absolute;left:12px;top:12px;padding:6px 10px;border-radius:999px;background:rgba(0,0,0,.6);font-size:12px}.wk-b{display:grid;gap:4px;padding:16px 18px}.wk-b span{color:rgba(255,255,255,.75);font-size:15px}.wk-b i{font-style:normal;color:var(--a);font-weight:600;margin-top:4px}`;
}
var WSD_MOTION3 = `(function(){var d=document;d.querySelectorAll('.fnd').forEach(function(f){var bs=f.querySelectorAll('[data-fnd]');bs.forEach(function(b){b.addEventListener('click',function(){bs.forEach(function(x){x.classList.toggle('on',x===b)});var t=b.getAttribute('data-fnd');f.querySelectorAll('.fnd-c').forEach(function(c){c.hidden=t!=='*'&&c.getAttribute('data-tab')!==t})})})});
d.querySelectorAll('[data-qt]').forEach(function(f){f.querySelectorAll('input[type=range]').forEach(function(r){var o=r.parentNode.querySelector('[data-qv]'),u=r.getAttribute('data-unit');r.addEventListener('input',function(){o.textContent=r.value+(u?' '+u:'')})});f.addEventListener('submit',function(e){e.preventDefault();var ok=f.querySelector('.qt-ok');if(ok)ok.hidden=false;var b=f.querySelector('button[type=submit]');if(b)b.disabled=true})})})();`;

var WSD_DEFAULT_OFFERS = [
  { title: "Front desk, chat and phone", text: "Answers every question in your voice, day and night, and books or passes on every enquiry." },
  { title: "Missed-call text-back", text: "Every missed call gets a friendly text within seconds, so callers don't ring the next business." },
  { title: "Booking and enquiry workflows", text: "Online booking, waitlists and follow-ups that run themselves and land in one place." },
  { title: "Review requests", text: "Happy customers get a timely nudge, so your Google rating keeps climbing." },
  { title: "SEO and AI-search setup", text: "Show up on page one and in ChatGPT, Gemini and Google AI answers for what people actually search." },
  { title: "Your own command centre", text: "One AI hub connected to your CRM and inbox that spots revenue leaks and runs the busywork." }
];
function wsdOffers(spec, opt) {
  if (spec.offers === false) return "";
  const it = wsdArr(spec.offers?.items, 6).filter((x) => x && x.title).length ? wsdArr(spec.offers.items, 6) : WSD_DEFAULT_OFFERS;
  return WSD_SHOWCASE(opt) + `<section class="sfo" id="studio-flow"><div class="wrap"><p class="sfo-k">Built for ${wsdE(opt.name)} by Studio Flow &amp; Systems</p><h2 class="sfo-h" data-lines>${wsdE(spec.offers?.title || "What we can switch on for you")}</h2><p class="sfo-l" data-up>${wsdE(spec.offers?.sub || "This page is a concept. Here's what can sit behind it, so every visitor becomes a booking.")}</p><div class="sfo-grid">${it.map((x, i) => `<div class="sfo-c" data-up><span>${String(i + 1).padStart(2, "0")}</span><h3>${wsdE(x.title)}</h3><p>${wsdE(x.text)}</p>${x.leak ? `<small>Fixes: ${wsdE(x.leak)}</small>` : ""}</div>`).join("")}</div><div class="sfo-acts"><a class="sfo-btn" href="${WSD_BOOK}" target="_blank" rel="noopener">Book a free 30-minute call</a><a class="sfo-lnk" href="${wsdE(opt.reportHref)}">${wsdE(opt.linkLabel || "See what your current site is missing")} →</a></div><div class="sfo-cal" id="book"><p class="sfo-k">Pick a time that suits you</p><iframe src="${WSD_BOOK}" loading="lazy" title="Book a free call with Studio Flow &amp; Systems"></iframe></div><p class="sfo-f">We can also take this concept further into full 3D motion graphics.</p></div></section>`;
}
function wsdCss(t) {
  return `:root{--p:${t.p};--s2:${t.s2};--a:${t.a};--bg:${t.bg};--sf:${t.sf};--ink:${t.ink};--mu:${t.mu};--ln:${t.line};--onp:${t.onp};--ona:${t.ona};--r:${t.r}px;--fd:"${t.fd}",Georgia,serif;--fb:"${t.fb}",system-ui,sans-serif;--dw:${t.w}}
*{box-sizing:border-box;margin:0;padding:0}html{-webkit-text-size-adjust:100%}html.lenis{height:auto}.lenis.lenis-smooth{scroll-behavior:auto}
body{background:var(--bg);color:var(--ink);font:400 17px/1.6 var(--fb);overflow-x:hidden;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%}a{color:inherit}
.wrap{width:min(1240px,100% - 40px);margin:0 auto}
h1,h2,h3,.h-hero,.cta-giant{font-family:var(--fd);font-weight:var(--dw);line-height:1.04;letter-spacing:-.025em;${t.up ? "text-transform:uppercase;" : ""}overflow-wrap:break-word}
h3{font-family:var(--fd);font-size:1.35rem;line-height:1.15;letter-spacing:-.01em;text-transform:none}
.kick{font:600 .78rem/1.2 var(--fb);letter-spacing:.18em;text-transform:uppercase;color:var(--p);margin-bottom:18px;display:flex;gap:10px;align-items:center}.kick:before{content:"";width:28px;height:1.5px;background:currentColor}
.lead{font-size:clamp(1.05rem,1.4vw,1.25rem);color:var(--mu);max-width:56ch;margin-top:20px}
.hl{font-style:${t.st === "editorial" || t.st === "luxe" || t.st === "organic" ? "italic" : "normal"};color:var(--p);position:relative;white-space:normal}
.btn{display:inline-flex;align-items:center;gap:10px;padding:16px 28px;border-radius:calc(var(--r) + 40px);font:600 1rem var(--fb);text-decoration:none;border:1.5px solid transparent;cursor:pointer;transition:background .3s,color .3s,box-shadow .3s;will-change:transform}
.btn-p{background:var(--p);color:var(--onp);box-shadow:0 14px 30px -14px var(--p)}.btn-p:hover{box-shadow:0 20px 40px -14px var(--p)}
.btn-g{border-color:var(--ln);color:var(--ink)}.btn-g:hover{border-color:var(--ink)}
.acts{display:flex;flex-wrap:wrap;gap:12px;margin-top:34px}
.im{position:relative;overflow:hidden;background:var(--sf);border-radius:var(--r)}.im img{width:100%;height:100%;object-fit:cover}
.im .art{position:absolute;inset:0;display:none;background:radial-gradient(circle at 25% 30%,var(--a),transparent 55%),radial-gradient(circle at 80% 75%,var(--p),transparent 60%),linear-gradient(135deg,var(--s2),var(--p))}.im.noimg .art{display:block}
/* concept bar + header */
.concept{position:relative;z-index:60;background:var(--ink);color:var(--bg);font:500 13px/1.4 var(--fb);text-align:center;padding:8px 16px}.concept a{color:var(--a);font-weight:700}
header.top{position:sticky;top:0;z-index:50;transition:background .4s,box-shadow .4s,transform .5s}header.top.scr{background:color-mix(in srgb,var(--bg) 86%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 1px 0 var(--ln)}header.top.hide{transform:translateY(-100%)}
.nav{display:flex;align-items:center;justify-content:space-between;height:78px;gap:16px}.logo{display:flex;align-items:center;gap:12px;font:700 1.15rem var(--fd);text-decoration:none;min-width:0}.logo img{height:46px;width:auto;max-width:170px;object-fit:contain}.logo span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nav nav{display:flex;gap:26px}.nav nav a{text-decoration:none;font-weight:500;font-size:.95rem;opacity:.8}.nav nav a:hover{opacity:1;color:var(--p)}.nav .btn{padding:12px 22px;white-space:nowrap}
.prog{position:fixed;left:0;top:0;height:3px;width:100%;background:var(--p);transform-origin:0 50%;transform:scaleX(0);z-index:70}
/* hero */
.hero{position:relative;min-height:calc(100svh - 110px);display:flex;align-items:center;padding:60px 0 80px;overflow:hidden}
.h-hero{font-size:clamp(2.7rem,6.6vw,6.2rem)}
.hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:60px;align-items:center}
.hero-img{aspect-ratio:4/5}.arch-wrap{position:relative}.hero-img.arch{border-radius:999px 999px var(--r) var(--r)}
.ring{position:absolute;inset:-22px;border:1.5px dashed color-mix(in srgb,var(--p) 50%,transparent);border-radius:999px 999px calc(var(--r) + 22px) calc(var(--r) + 22px);pointer-events:none;animation:spin 60s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.badge{position:absolute;background:var(--sf);color:var(--ink);padding:12px 18px;border-radius:calc(var(--r) + 10px);font:600 .9rem var(--fb);box-shadow:0 18px 40px -18px rgba(0,0,0,.35);z-index:3;max-width:240px}.badge.b0{left:-40px;top:16%}.badge.b1{right:-24px;bottom:18%}.badge.b2{left:6%;bottom:-10px}
.hero-full{min-height:calc(100svh - 112px);padding-bottom:90px;color:#fff;align-items:flex-end}.hero-full .hero-bg{position:absolute;inset:0}.hero-full .im.full{position:absolute;inset:0;border-radius:0}.hero-full .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.25) 40%,rgba(0,0,0,.72))}.hero-full .wrap{position:relative;z-index:2}.hero-full .lead{color:rgba(255,255,255,.85)}.hero-full .kick{color:#fff}.hero-full .hl{color:var(--a)}.hero-full .btn-g{color:#fff;border-color:rgba(255,255,255,.5)}.hero-full .badges{position:absolute;right:4%;top:22%;z-index:2;display:grid;gap:18px}.hero-full .badge{position:static}
.scrollcue{position:absolute;left:50%;bottom:22px;width:26px;height:42px;border:2px solid rgba(255,255,255,.6);border-radius:20px;z-index:2}.scrollcue i{position:absolute;left:50%;top:8px;width:4px;height:8px;margin-left:-2px;border-radius:4px;background:#fff;animation:cue 1.8s infinite}@keyframes cue{0%{opacity:0;transform:translateY(0)}40%{opacity:1}100%{opacity:0;transform:translateY(14px)}}
.hero-giant{flex-direction:column;align-items:stretch;justify-content:center}.giant{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;pointer-events:none;opacity:.07}.g-row{font:var(--dw) clamp(6rem,18vw,17rem)/.9 var(--fd);white-space:nowrap;text-transform:uppercase;display:flex;align-items:center;gap:.25em}.g-dot{width:.18em;height:.18em;border-radius:50%;background:currentColor;display:inline-block}
.hero-giant .wrap{position:relative}.hero-giant .hero-img{border-radius:var(--r)}.hero-giant .badges{position:absolute;left:4%;bottom:6%;display:flex;gap:10px}.hero-giant .badge,.hero-collage .badge{position:static}.hero-collage .badges{position:absolute;left:4%;bottom:5%;display:flex;gap:10px;flex-wrap:wrap}
.collage{position:relative;height:min(68vh,620px)}.collage .im{position:absolute;box-shadow:0 30px 60px -30px rgba(0,0,0,.4)}.collage .c0{left:0;top:6%;width:58%;height:64%}.collage .c1{right:0;top:0;width:44%;height:46%}.collage .c2{right:8%;bottom:0;width:52%;height:46%}
.blob{position:absolute;border-radius:50%;z-index:2}.bl1{width:90px;height:90px;background:var(--a);left:44%;top:-4%}.bl2{width:54px;height:54px;background:var(--p);left:-3%;bottom:10%}
/* marquee */
.mq{padding:26px 0;overflow:hidden;border-block:1px solid var(--ln);background:var(--sf)}.mq-track{display:flex;will-change:transform}.mq-in{display:flex;gap:34px;align-items:center;white-space:nowrap;animation:mq 34s linear infinite;padding-right:34px}.mq-in span{font:var(--dw) clamp(1.6rem,3.6vw,3rem) var(--fd)}.mq-in b{color:var(--p);font-size:1.2rem}
.mq-outline{background:var(--p)}.mq-outline .mq-in span{color:transparent;-webkit-text-stroke:1.5px var(--onp);text-transform:uppercase}.mq-outline .mq-in b{color:var(--onp)}
@keyframes mq{to{transform:translateX(-50%)}}
/* sections */
.sec{padding:clamp(80px,11vw,150px) 0}.sec-head{max-width:820px;margin-bottom:56px}.h2{font-size:clamp(2.1rem,4.6vw,4.2rem)}.h2.sm{font-size:clamp(1.8rem,3.4vw,3rem);margin-bottom:40px}
.stmt-t{font:var(--dw) clamp(1.8rem,4.2vw,3.8rem)/1.18 var(--fd);letter-spacing:-.02em;max-width:24ch}.stmt-t .w{opacity:.16}
.card{background:var(--sf);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--ln);height:100%}.card-im{aspect-ratio:4/3;border-radius:0}.card-b{padding:26px 26px 30px}.card-b p{color:var(--mu);margin-top:10px;font-size:.98rem}.num{font:600 .85rem var(--fb);color:var(--p);display:block;margin-bottom:10px;letter-spacing:.1em}.tag{display:inline-block;font:600 .75rem var(--fb);letter-spacing:.1em;text-transform:uppercase;background:color-mix(in srgb,var(--p) 14%,transparent);color:var(--p);padding:6px 12px;border-radius:30px;margin-bottom:12px}
.rail{position:relative}.rail-stick{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;justify-content:center;overflow:hidden}.rail-track{display:flex;gap:26px;padding:0 max(20px,calc((100vw - 1240px)/2));will-change:transform}.rail-card{flex:0 0 min(420px,78vw)}.rail-bar{width:min(1240px,100% - 40px);margin:40px auto 0;height:2px;background:var(--ln)}.rail-bar i{display:block;height:100%;background:var(--p);transform-origin:0 50%;transform:scaleX(0)}
.stack{display:grid;gap:0}.stk{position:sticky;top:calc(100px + var(--i) * 18px);padding-bottom:40px}.stk-card{flex-direction:row;min-height:min(62vh,520px);box-shadow:0 -20px 50px -30px rgba(0,0,0,.35)}.stk-card .card-im{flex:1.1;aspect-ratio:auto}.stk-card .card-b{flex:1;display:flex;flex-direction:column;justify-content:center;padding:clamp(28px,4vw,60px)}.stk-card h3{font-size:clamp(1.6rem,3vw,2.6rem)}
.bento{display:grid;grid-template-columns:repeat(6,1fr);gap:20px;perspective:1200px}.bento-card{grid-column:span 2;transform-style:preserve-3d;transition:transform .5s cubic-bezier(.2,.8,.2,1),box-shadow .5s}.bento-card.b0{grid-column:span 4;grid-row:span 2}.bento-card.b0 .card-im{aspect-ratio:auto;flex:1}.bento-card.b3{grid-column:span 3}.bento-card.b4{grid-column:span 3}.bento-card:hover{box-shadow:0 30px 60px -30px rgba(0,0,0,.4)}
.feat-fan,.hero{overflow:clip}.fan{position:relative;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}
.stats{background:var(--p);color:var(--onp)}.stats .h2{color:var(--onp)}.stat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:30px}.stat b{font:var(--dw) clamp(3rem,6vw,5.4rem)/1 var(--fd);display:block}.stat p{opacity:.85;margin-top:10px}
.tl{position:relative;display:grid;gap:44px;padding-left:70px;max-width:820px}.tl-line{position:absolute;left:21px;top:8px;bottom:8px;width:2px;background:var(--ln)}.tl-line b{display:block;width:100%;height:100%;background:var(--p);transform-origin:50% 0;transform:scaleY(0)}.tl-it{position:relative}.tl-dot{position:absolute;left:-70px;top:0;width:44px;height:44px;border-radius:50%;background:var(--bg);border:2px solid var(--p);display:grid;place-items:center;font-weight:700;color:var(--p)}.tl-it small{color:var(--p);font-weight:700;letter-spacing:.1em;text-transform:uppercase}.tl-it p{color:var(--mu);margin-top:6px}
.jr-pin{position:relative;height:calc(var(--n) * 85vh + 40vh)}.pj-stick{position:sticky;top:0;height:100vh;display:flex;align-items:center;overflow:hidden}.pj-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;position:relative;z-index:2}.pj-steps{position:relative;min-height:220px}.pj-step{position:absolute;inset:0 0 auto 0;opacity:0;transform:translateY(30px);transition:opacity .6s,transform .7s cubic-bezier(.2,.8,.2,1)}.pj-step.on{opacity:1;transform:none}.pj-step small{color:var(--p);font-weight:700;letter-spacing:.12em;text-transform:uppercase}.pj-step h3{font-size:clamp(1.6rem,3vw,2.4rem);margin:8px 0 10px}.pj-step p{color:var(--mu);max-width:46ch}.pj-dots{display:flex;gap:8px;margin-top:20px}.pj-dots i{width:28px;height:4px;border-radius:4px;background:var(--ln);transition:background .4s,width .4s}.pj-dots i.on{background:var(--p);width:52px}
.pj-media{position:relative;aspect-ratio:4/5;max-height:72vh}.pj-media .im{position:absolute;inset:0;opacity:0;transform:scale(1.08);transition:opacity .8s,transform 1.4s cubic-bezier(.2,.8,.2,1)}.pj-media .im.on{opacity:1;transform:none}
.jr-sky .pj-stick{background:linear-gradient(180deg,#f6d9b8,#fbefe2)}.sky{position:absolute;inset:0;z-index:1}.sun{position:absolute;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,#fff6d6,#ffc85a 60%,transparent 70%);left:8%;top:70%;filter:blur(1px);box-shadow:0 0 120px 40px rgba(255,200,90,.35)}.cloud{position:absolute;height:40px;border-radius:40px;background:rgba(255,255,255,.7);filter:blur(2px)}.cloud.c1{width:180px;top:16%;left:62%}.cloud.c2{width:120px;top:30%;left:20%}
.split-grid{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center}.split.flip .split-grid>.im{order:2}.split-im{aspect-ratio:5/6}.ticks{list-style:none;margin:26px 0 30px;display:grid;gap:12px}.ticks li{padding-left:34px;position:relative}.ticks li:before{content:"";position:absolute;left:0;top:.35em;width:20px;height:20px;border-radius:50%;background:var(--p);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M0 0h20v20H0z'/%3E%3Cpath fill='%23fff' d='M8.5 13.6 5 10.1l1.2-1.2 2.3 2.3 5.3-5.3L15 7.1z'/%3E%3C/svg%3E") center/contain;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M0 0h20v20H0z'/%3E%3Cpath fill='%23fff' d='M8.5 13.6 5 10.1l1.2-1.2 2.3 2.3 5.3-5.3L15 7.1z'/%3E%3C/svg%3E") center/contain}
.gal{overflow:hidden}.gal .h2{margin-bottom:40px}.gal-row{display:flex;gap:18px;width:max-content;margin-bottom:18px;will-change:transform}.gal-im{width:clamp(220px,26vw,380px);aspect-ratio:4/3;flex:none}
.gz{height:220vh;position:relative}.gz-stick{position:sticky;top:0;height:100vh;overflow:hidden;display:grid;place-items:center}.gz-grid{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1.4fr 1fr;grid-template-rows:1fr 1fr;gap:16px;padding:16px}.gz-grid .im{border-radius:var(--r)}.gz-0{grid-column:2;grid-row:1/3;z-index:2}.gz-t{position:relative;z-index:3;color:#fff;font-size:clamp(2.4rem,6vw,5.4rem);text-align:center;text-shadow:0 10px 40px rgba(0,0,0,.5);padding:0 20px;opacity:0}
.tst-mq{overflow:hidden;margin-top:50px;mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);-webkit-mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}.tst-in{display:flex;gap:22px;width:max-content;animation:mq 60s linear infinite}.tst-in:hover{animation-play-state:paused}.quote{background:var(--sf);border:1px solid var(--ln);border-radius:var(--r);padding:32px;width:min(420px,80vw)}.quote blockquote{font:500 1.12rem/1.5 var(--fb)}.quote figcaption{margin-top:18px;font-weight:700;color:var(--p)}.quote small{color:var(--mu);font-weight:500}.tst-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px;margin-top:44px}.tst-grid .quote{width:auto;height:100%}
.tst-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:24px}.tst-head>div,.tst-head .h2{flex:1 1 420px}.rv-badge{display:flex;align-items:center;gap:14px;text-decoration:none;background:var(--sf);border:1px solid var(--ln);border-radius:calc(var(--r) + 20px);padding:14px 22px}.rv-badge b{font:var(--dw) 2.6rem/1 var(--fd);color:var(--p)}.rv-badge span{font-size:.9rem;color:var(--mu);display:grid}.stars{color:#f5b301;letter-spacing:2px;font-style:normal;display:block;margin-bottom:8px}
.tst-in.rev{animation-direction:reverse;margin-top:22px;animation-duration:70s}
.spot{position:relative;min-height:330px;margin-top:50px;max-width:980px}.spot-q{position:absolute;inset:0;opacity:0;transform:translateY(24px);transition:opacity .8s,transform .9s cubic-bezier(.2,.8,.2,1);pointer-events:none}.spot-q.on{opacity:1;transform:none;pointer-events:auto}.spot-q blockquote{font:var(--dw) clamp(1.6rem,3.4vw,3rem)/1.2 var(--fd);letter-spacing:-.015em}.spot-q figcaption{margin-top:24px;font-weight:700;color:var(--p)}.spot-dots{position:absolute;left:0;bottom:0;display:flex;gap:8px}.spot-dots i{width:26px;height:4px;border-radius:4px;background:var(--ln);transition:all .4s}.spot-dots i.on{background:var(--p);width:48px}
.wall{columns:3 300px;column-gap:22px;margin-top:50px}.wall-c{break-inside:avoid;margin-bottom:22px;transform:rotate(var(--rt))}.wall-c .quote{width:auto}.st-playful .wall-c .quote{border:2px solid var(--ink);box-shadow:5px 5px 0 var(--p)}
.faq-grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:70px}.mu-t{color:var(--mu);margin-top:16px}details{border-bottom:1px solid var(--ln);padding:22px 0}summary{list-style:none;cursor:pointer;font:600 1.12rem var(--fb);display:flex;justify-content:space-between;gap:20px}summary::-webkit-details-marker{display:none}summary i{width:30px;height:30px;flex:none;border-radius:50%;border:1.5px solid var(--ln);position:relative;transition:transform .4s}summary i:before,summary i:after{content:"";position:absolute;left:50%;top:50%;width:12px;height:1.5px;background:currentColor;transform:translate(-50%,-50%)}summary i:after{transform:translate(-50%,-50%) rotate(90deg);transition:transform .4s}details[open] summary i:after{transform:translate(-50%,-50%)}details p{color:var(--mu);padding-top:12px;max-width:62ch}
.cta{background:var(--sf)}.cta-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:start}.cta-giant{font-size:clamp(3rem,9vw,8.4rem);margin-bottom:20px}.cta-big .cta-grid{margin-top:50px}
.cinfo{display:grid;gap:10px;margin-top:30px;font-weight:600}.cinfo a{text-decoration:none;color:var(--p)}
.demo-form{background:var(--bg);border:1px solid var(--ln);border-radius:var(--r);padding:clamp(24px,3vw,40px);display:grid;gap:16px}.demo-form label span{display:block;font:600 .85rem var(--fb);margin-bottom:6px}.demo-form input,.demo-form textarea{width:100%;font:inherit;padding:14px 16px;border-radius:calc(var(--r) / 2 + 4px);border:1.5px solid var(--ln);background:var(--sf);color:var(--ink)}.demo-form input:focus,.demo-form textarea:focus{outline:none;border-color:var(--p)}.demo-form .btn{justify-content:center}.form-note{font-size:.9rem;color:var(--p);font-weight:600}
footer.foot{padding:50px 0 120px;border-top:1px solid var(--ln);font-size:.9rem;color:var(--mu)}footer .wrap{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}
/* Studio Flow offers band (our brand, clearly separate) */
.sfo{background:#06101f;color:#eaf2ff;padding:clamp(44px,6vw,88px) 0;font-family:Inter,system-ui,sans-serif;position:relative;overflow:hidden}.sfo:before{content:"";position:absolute;width:700px;height:700px;right:-200px;top:-260px;background:radial-gradient(circle,rgba(56,189,248,.22),transparent 65%)}.sfo .wrap{position:relative}.sfo-k{color:#7dd3fc;font:600 .78rem/1 Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase}.sfo-h{font:700 clamp(2.2rem,4.6vw,4rem)/1.05 Inter,sans-serif;letter-spacing:-.03em;margin:18px 0 14px;text-transform:none}.sfo-l{color:#a9bcd6;max-width:60ch;font-size:1.1rem}.sfo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:50px}.sfo-c{border:1px solid rgba(125,211,252,.18);background:rgba(255,255,255,.03);border-radius:18px;padding:26px;transition:border-color .3s,transform .3s}.sfo-c:hover{border-color:rgba(125,211,252,.55);transform:translateY(-4px)}.sfo-c span{color:#38bdf8;font-weight:700;font-size:.85rem}.sfo-c h3{font:700 1.15rem/1.25 Inter,sans-serif;margin:10px 0 8px;text-transform:none}.sfo-c p{color:#a9bcd6;font-size:.96rem}.sfo-c small{display:block;margin-top:12px;color:#7dd3fc;font-size:.82rem}.sfo-acts{display:flex;flex-wrap:wrap;gap:18px;align-items:center;margin-top:44px}.sfo-btn{background:linear-gradient(135deg,#38bdf8,#2563eb);color:#fff;text-decoration:none;font-weight:700;padding:17px 30px;border-radius:40px;box-shadow:0 18px 40px -16px #2563eb}.sfo-lnk{color:#7dd3fc;font-weight:600}.sfo-f{margin-top:26px;color:#6f86a6;font-size:.9rem}
/* style flavours */
.st-luxe{letter-spacing:.005em}.st-luxe .kick{letter-spacing:.32em}.st-luxe .h-hero,.st-luxe .h2{font-weight:500}
.st-luxe:after,.st-modern:after{content:"";position:fixed;inset:-50%;pointer-events:none;z-index:90;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");animation:grain 1.2s steps(6) infinite}@keyframes grain{0%{transform:translate(0)}50%{transform:translate(-4%,3%)}100%{transform:translate(3%,-2%)}}
.st-playful .card{border-width:2px;border-color:var(--ink);box-shadow:6px 6px 0 var(--ink)}.st-playful .btn-p{box-shadow:4px 4px 0 var(--ink)}.st-playful .tag{transform:rotate(-3deg)}.st-playful .card:hover{transform:rotate(-1deg) translateY(-4px)}.st-playful .card{transition:transform .4s cubic-bezier(.3,1.6,.5,1)}
.st-bold .h-hero,.st-bold .h2,.st-bold .cta-giant{text-transform:uppercase;letter-spacing:0;line-height:.95}.st-bold .card{box-shadow:8px 8px 0 var(--p);border-color:var(--ink)}.st-bold .stats{clip-path:polygon(0 4vw,100% 0,100% calc(100% - 4vw),0 100%)}.st-bold .stats .wrap{padding:3vw 0}
.st-modern .card{background:linear-gradient(var(--sf),var(--sf)) padding-box,linear-gradient(135deg,color-mix(in srgb,var(--p) 70%,transparent),transparent 50%,color-mix(in srgb,var(--a) 60%,transparent)) border-box;border:1px solid transparent}.st-modern body{background-image:radial-gradient(circle at 80% -10%,color-mix(in srgb,var(--p) 30%,transparent),transparent 40%)}
.st-editorial .sec-head{border-top:1px solid var(--ink);padding-top:24px}.st-editorial .kick:before{display:none}.st-editorial .card{border-radius:0;border:0;border-top:1px solid var(--ink);background:none}.st-editorial .card-im{border-radius:0}.st-editorial .card-b{padding:22px 0 0}
.st-organic .card{border-radius:calc(var(--r) + 14px)}.st-organic .card-im{border-radius:200px 200px 0 0}.st-organic .split-im{border-radius:999px 999px var(--r) var(--r)}
.st-coastal .sec:nth-of-type(even){position:relative}.st-coastal .stats{border-radius:60px 60px 0 0}.st-coastal .cta{border-radius:60px 60px 0 0}
.st-clinical .card{box-shadow:0 20px 50px -34px rgba(20,40,80,.4);border-color:transparent}.st-clinical .stats{background:linear-gradient(135deg,var(--p),var(--s2))}
.cursor{position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border:1.5px solid var(--p);border-radius:50%;pointer-events:none;z-index:95;transition:width .3s,height .3s,margin .3s,background .3s;mix-blend-mode:difference}.cursor.big{width:70px;height:70px;margin:-35px 0 0 -35px;background:color-mix(in srgb,var(--p) 25%,transparent)}
.curtain{position:fixed;inset:0;z-index:100;background:var(--p);display:grid;place-items:center;color:var(--onp);font:var(--dw) clamp(1.6rem,4vw,3rem) var(--fd);pointer-events:none}
/* mobile */
@media(max-width:900px){.nav nav{display:none}.hero-grid,.split-grid,.faq-grid,.cta-grid,.pj-grid{grid-template-columns:1fr;gap:40px}.split.flip .split-grid>.im{order:0}.badge.b0{left:-6px}.badge.b1{right:-6px}.hero{min-height:auto;padding:40px 0 70px}.hero-full{min-height:92svh}.hero-full .badges{display:none}.collage{height:420px}
.rail-stick{position:relative;height:auto;padding:10px 0 20px}.rail-track{overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:10px;transform:none!important}.rail-card{scroll-snap-align:center}.rail-bar{display:none}
.stk-card{flex-direction:column}.stk-card .card-im{aspect-ratio:16/10;flex:none}.bento{grid-template-columns:1fr}.bento-card,.bento-card.b0,.bento-card.b3,.bento-card.b4{grid-column:auto;grid-row:auto}.bento-card.b0 .card-im{aspect-ratio:4/3}
.jr-pin{height:auto}.pj-stick{position:relative;height:auto;padding:90px 0}.pj-steps{min-height:0;display:grid;gap:28px}.pj-step{position:relative;opacity:1;transform:none}.pj-dots,.pj-media{display:none}.gz{height:auto}.gz-stick{position:relative;height:70vh}.gz-t{opacity:1}
.ring{inset:-10px}.nav .btn{padding:11px 16px;font-size:.9rem}.logo img{height:38px}.concept{font-size:12px}}
.rcp-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,6vw,90px);align-items:center}.rc-try{margin-top:26px;border:0;cursor:pointer;font:inherit}
.rc-chat,.rc-phone{background:var(--sf);border:1px solid var(--ln);border-radius:calc(var(--r) + 10px);box-shadow:0 40px 80px -40px rgba(0,0,0,.45);overflow:hidden;max-width:440px;margin-left:auto}
.rc-phone{border-radius:44px;padding:14px;background:#0b0d12;border:1px solid rgba(255,255,255,.12)}.rc-phone .rc-feed{background:var(--bg);border-radius:32px;min-height:420px}
.rc-call{display:flex;flex-direction:column;align-items:center;gap:4px;padding:22px 10px 18px;color:#fff}.rc-call b{font:600 1.1rem var(--fb)}.rc-call small{opacity:.7;font-size:.8rem}
.rc-pulse{width:58px;height:58px;border-radius:50%;background:var(--p);margin-bottom:10px;box-shadow:0 0 0 0 var(--p);animation:rcp 2s infinite}@keyframes rcp{70%{box-shadow:0 0 0 18px transparent}}
.rc-top{display:flex;gap:12px;align-items:center;padding:16px 18px;border-bottom:1px solid var(--ln)}.rc-top b{display:block;font-size:1rem}.rc-top small{color:var(--mu);font-size:.8rem;display:flex;align-items:center;gap:6px}.rc-top small i{width:7px;height:7px;border-radius:50%;background:#22c55e}
.rc-pulse img,.rc-av img{width:100%;height:100%;object-fit:contain;border-radius:50%;background:#fff;padding:5px;display:block}.rc-pulse{overflow:hidden}.rc-av{overflow:hidden;background:var(--p);color:var(--onp);display:grid;place-items:center;font-weight:700;text-transform:uppercase}
.rc-feed{display:flex;flex-direction:column;gap:10px;padding:20px 18px 26px;min-height:340px}
.rc-q,.rc-a{max-width:86%;padding:11px 15px;border-radius:18px;font-size:.95rem;line-height:1.45;opacity:0;transform:translateY(10px)}
.rc-q{align-self:flex-end;background:var(--p);color:var(--onp);border-bottom-right-radius:6px}.rc-a{align-self:flex-start;background:var(--bg);border:1px solid var(--ln);border-bottom-left-radius:6px;position:relative}
.rc-a span{display:block;opacity:0}.rc-dots{position:absolute;left:15px;top:14px;display:flex;gap:4px}.rc-dots b{width:6px;height:6px;border-radius:50%;background:var(--mu);animation:rcd 1s infinite}.rc-dots b:nth-child(2){animation-delay:.15s}.rc-dots b:nth-child(3){animation-delay:.3s}@keyframes rcd{50%{opacity:.25}}
.go .rc-q,.go .rc-a{animation:rcin .5s var(--d) forwards}.go .rc-a span{animation:rcin .4s calc(var(--d) + .9s) forwards}.go .rc-a .rc-dots{animation:rcout .2s calc(var(--d) + .85s) forwards}
@keyframes rcin{to{opacity:1;transform:none}}@keyframes rcout{to{opacity:0;visibility:hidden}}
.ar-grid{display:grid;grid-template-columns:1fr 1.1fr;gap:40px;align-items:center}.ar-orbit{position:relative;aspect-ratio:1;max-width:520px;margin:auto;width:100%}
.ar-core{position:absolute;inset:34%;border-radius:50%;background:var(--p);color:var(--onp);display:grid;place-items:center;text-align:center;font:600 clamp(.9rem,1.4vw,1.15rem)/1.2 var(--fd);padding:10px;box-shadow:0 0 0 14px color-mix(in srgb,var(--p) 18%,transparent),0 0 0 32px color-mix(in srgb,var(--p) 8%,transparent)}
.ar-ring{position:absolute;inset:0;border:1px dashed var(--ln);border-radius:50%;animation:arspin 60s linear infinite}.ar-ring span{position:absolute;transform:translate(-50%,-50%)}
.ar-ring b{display:inline-block;animation:arspin 60s linear infinite reverse;background:var(--sf);border:1px solid var(--ln);padding:7px 13px;border-radius:99px;font:500 .85rem var(--fb);white-space:nowrap;box-shadow:0 8px 20px -12px rgba(0,0,0,.3)}
@keyframes arspin{to{transform:rotate(360deg)}}
.sfo-cal{margin-top:34px;border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 30px 60px -30px rgba(0,0,0,.5)}.sfo-cal .sfo-k{padding:16px 20px 0;color:#0b0f17}.sfo-cal iframe{display:block;width:100%;height:760px;border:0}
.ar-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px}.ar-chips span{padding:12px 20px;border-radius:99px;border:1px solid var(--ln);background:var(--sf);font-weight:500;transition:background .3s,color .3s}.ar-chips span:hover{background:var(--p);color:var(--onp)}
/* v48 pitch bar: the one clear next step for the owner, shown once they've scrolled into the concept */
.pitch{position:fixed;left:50%;bottom:18px;transform:translate(-50%,140%);z-index:2147482000;display:flex;align-items:center;gap:14px;padding:10px 10px 10px 20px;border-radius:99px;background:#0b0f17;color:#fff;box-shadow:0 20px 50px -12px rgba(0,0,0,.55);font:500 14px/1.3 system-ui,-apple-system,sans-serif;transition:transform .6s cubic-bezier(.2,.8,.2,1);max-width:calc(100vw - 24px)}
.pitch.on{transform:translate(-50%,0)}.pitch-t{min-width:0}.pitch-t b{font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pitch small{display:block;opacity:.65;font-size:12px}.pitch a{background:#fff;color:#0b0f17;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:99px;white-space:nowrap}.pitch button{background:none;border:0;color:#fff;opacity:.5;font-size:18px;cursor:pointer;padding:0 6px}
@media(max-width:900px){.rcp-grid,.ar-grid{grid-template-columns:1fr}.rc-chat,.rc-phone{margin:0 auto}.ar-ring b{font-size:.75rem;padding:5px 9px}.pitch{left:12px;right:92px;transform:translateY(140%);bottom:12px;padding:8px 8px 8px 16px}.pitch.on{transform:none}.pitch-t{flex:1}.pitch-t b{font-size:12px;line-height:1.2;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.ar-orbit{width:76%;margin:30px auto 10px}.ar-core{font-size:.72rem;inset:31%}.pitch a{padding:11px 14px;font-size:13px}.pitch small{display:none}}
/* v48.1 type that never cuts off: big headings shrink to fit their longest word in their own column */
.hero-copy,.sec-head,.split-grid>div,.cta-grid>div,.faq-grid>div,.tst-head,.rcp-grid>div,.ar-grid>div,.stmt .wrap,.cta-big .wrap,.stats .wrap,.gz-stick{container-type:inline-size}
.h-hero{font-size:min(clamp(2.6rem,6.6vw,6.2rem),calc(100cqi / (var(--lw,10) * ${t.up || t.st === "bold" ? ".7" : ".6"})))}
.h2{font-size:min(clamp(2rem,4.6vw,4.2rem),calc(100cqi / (var(--lw,10) * ${t.up || t.st === "bold" ? ".68" : ".58"})))}
.h2.sm{font-size:min(clamp(1.7rem,3.2vw,2.8rem),calc(100cqi / (var(--lw,10) * .58)))}
.cta-giant{font-size:min(clamp(2.8rem,9vw,8.4rem),calc(100cqi / (var(--lw,10) * ${t.up || t.st === "bold" ? ".72" : ".62"})))}
.stmt-t{font-size:min(clamp(1.7rem,4.2vw,3.8rem),calc(100cqi / (var(--lw,10) * .58)))}
.h-hero,.h2,.cta-giant,.stmt-t,.gz-t,.card h3,.rail-card h3{text-wrap:balance;overflow-wrap:break-word;hyphens:manual}
.lead,.card p,.quote blockquote,.faq p,.tl-it p,.pj-step p{text-wrap:pretty;overflow-wrap:break-word}
.h-hero,.cta-giant{padding-block:.04em .08em}
.hl{padding-inline-end:.06em}
/* v48.1 rhythm: one spacing scale, no dead gaps between sections */
.sec{padding:clamp(56px,7vw,104px) 0}
.sec+.sec,.mq+.sec,.sec+.mq{padding-top:clamp(28px,3.6vw,60px)}
.sec-head{margin-bottom:clamp(28px,3.4vw,48px)}
.sec-head .h2,.tst-head .h2{margin-bottom:0}
.sec-head .lead{margin-top:14px}
.jr-pin{height:calc(var(--n) * 72vh + 28vh)}
.gz{height:180vh}
.hero{min-height:min(calc(100svh - 110px),920px)}
@media(max-width:900px){.sec{padding:52px 0}.sec+.sec,.mq+.sec,.sec+.mq{padding-top:24px}.hero{min-height:auto;padding:28px 0 52px}.pj-stick{padding:56px 0}.sec-head{margin-bottom:26px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}`;
}
var WSD_MOTION = `(function(){var d=document,R=matchMedia('(prefers-reduced-motion: reduce)').matches,M=matchMedia('(max-width:900px)').matches;
var hd=d.querySelector('header.top'),ly=0;addEventListener('scroll',function(){var y=scrollY;if(hd){hd.classList.toggle('scr',y>30);hd.classList.toggle('hide',y>ly&&y>500);}ly=y},{passive:true});
d.querySelectorAll('[data-spot]').forEach(function(sp){var q=sp.querySelectorAll('.spot-q'),dt=sp.querySelectorAll('.spot-dots i'),k=0;if(q.length<2)return;setInterval(function(){k=(k+1)%q.length;q.forEach(function(x,i){x.classList.toggle('on',i===k)});dt.forEach(function(x,i){x.classList.toggle('on',i===k)})},5200)});\nd.querySelectorAll('[data-demo-form]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();var n=f.querySelector('.form-note');if(n)n.hidden=false})});
var cur=d.querySelector('.curtain');
if(R||!window.gsap){if(cur)cur.remove();return}
var g=gsap,ST=window.ScrollTrigger;g.registerPlugin(ST);ST.config({ignoreMobileResize:true});
if(window.Lenis&&!M){var l=new Lenis({lerp:.09});l.on('scroll',ST.update);g.ticker.add(function(t){l.raf(t*1000)});g.ticker.lagSmoothing(0)}
var pr=d.querySelector('.prog');if(pr)g.to(pr,{scaleX:1,ease:'none',scrollTrigger:{start:0,end:'max',scrub:.3}});
function split(el,cls){var out=[];var walk=function(n){[].slice.call(n.childNodes).forEach(function(c){if(c.nodeType===3){var f=d.createDocumentFragment();c.textContent.split(/(\\s+)/).forEach(function(w){if(!w)return;if(/^\\s+$/.test(w)){f.appendChild(d.createTextNode(w));return}var o=d.createElement('span');o.className='wo';o.style.cssText='display:inline-block;overflow:hidden;vertical-align:top;padding:.08em .1em .2em;margin:-.08em -.1em -.2em';var i=d.createElement('span');i.className=cls;i.style.display='inline-block';i.textContent=w;o.appendChild(i);f.appendChild(o);out.push(i)});n.replaceChild(f,c)}else if(c.nodeType===1)walk(c)})};walk(el);return out}
var t0=g.timeline({delay:cur?.15:0});
if(cur){t0.to(cur,{yPercent:-100,duration:.9,ease:'expo.inOut',delay:.35}).set(cur,{display:'none'})}
d.querySelectorAll('[data-words]').forEach(function(h,k){var w=split(h,'w');var inHero=!!h.closest('.hero');var a={yPercent:110,rotate:4},b={yPercent:0,rotate:0,duration:1.1,ease:'expo.out',stagger:.06};if(inHero){t0.fromTo(w,a,b,cur?'-=.35':0)}else{g.fromTo(w,a,Object.assign({},b,{scrollTrigger:{trigger:h,start:'top 82%'}}))}});
var hk=d.querySelector('.hero-kick');if(hk)t0.fromTo(hk,{opacity:0,y:20},{opacity:1,y:0,duration:.8},'<');
d.querySelectorAll('.hero [data-fadein]').forEach(function(el,i){t0.fromTo(el,{opacity:0,y:30},{opacity:1,y:0,duration:1,ease:'power3.out'},'-=.75')});
d.querySelectorAll('.badge').forEach(function(b,i){t0.fromTo(b,{opacity:0,y:30,scale:.85},{opacity:1,y:0,scale:1,duration:.9,ease:'back.out(1.7)'},'-=.6');if(!b.parentNode.classList.contains('badges'))g.to(b,{y:i%2?14:-14,duration:2.6+i*.4,repeat:-1,yoyo:true,ease:'sine.inOut',delay:2})});
d.querySelectorAll('[data-archin]').forEach(function(el){t0.fromTo(el,{clipPath:'inset(40% 25% 0% 25% round 999px 999px 0 0)'},{clipPath:'inset(0% 0% 0% 0% round 999px 999px 0 0)',duration:1.6,ease:'expo.out'},cur?.4:0);var im=el.querySelector('img');if(im){t0.fromTo(im,{scale:1.3},{scale:1,duration:2.2,ease:'expo.out'},'<');g.to(im,{yPercent:10,ease:'none',scrollTrigger:{trigger:el,start:'top top',end:'bottom top',scrub:true}})}});
d.querySelectorAll('[data-clipin]').forEach(function(el){t0.fromTo(el,{clipPath:'inset(100% 0 0 0)'},{clipPath:'inset(0% 0 0 0)',duration:1.4,ease:'expo.inOut'},cur?.4:0)});
d.querySelectorAll('[data-zoomout]').forEach(function(el){t0.fromTo(el,{scale:1.25},{scale:1.08,duration:2.4,ease:'expo.out'},0);g.to(el,{scale:1,yPercent:12,ease:'none',scrollTrigger:{trigger:el.closest('section'),start:'top top',end:'bottom top',scrub:true}})});
d.querySelectorAll('.hero-full .hero-copy').forEach(function(el){g.to(el,{yPercent:-30,opacity:.2,ease:'none',scrollTrigger:{trigger:el.closest('section'),start:'top top',end:'bottom top',scrub:true}})});
d.querySelectorAll('[data-gx]').forEach(function(r){var dir=+r.getAttribute('data-gx');g.fromTo(r,{xPercent:dir>0?-30:0},{xPercent:dir>0?0:-30,ease:'none',scrollTrigger:{trigger:r.closest('section'),start:'top bottom',end:'bottom top',scrub:.6}})});
d.querySelectorAll('[data-par]').forEach(function(el){var v=+el.getAttribute('data-par');g.fromTo(el,{yPercent:-v/2},{yPercent:v,ease:'none',scrollTrigger:{trigger:el.closest('section'),start:'top bottom',end:'bottom top',scrub:true}})});
d.querySelectorAll('.collage .im').forEach(function(el,i){t0.fromTo(el,{opacity:0,y:80,rotate:i%2?6:-6},{opacity:1,y:0,rotate:0,duration:1.3,ease:'expo.out'},(cur?.5:.1)+i*.12)});
d.querySelectorAll('[data-float]').forEach(function(el,i){g.to(el,{y:i?24:-24,x:i?-10:12,duration:3+i,repeat:-1,yoyo:true,ease:'sine.inOut'})});
d.querySelectorAll('[data-lines]').forEach(function(h){var w=split(h,'w');g.fromTo(w,{yPercent:115},{yPercent:0,duration:1,ease:'expo.out',stagger:.035,scrollTrigger:{trigger:h,start:'top 85%'}})});
d.querySelectorAll('[data-fill]').forEach(function(p){var w=split(p,'w');g.fromTo(w,{opacity:.16},{opacity:1,stagger:.1,ease:'none',scrollTrigger:{trigger:p,start:'top 78%',end:'bottom 45%',scrub:.4}})});
g.utils.toArray('[data-up]').forEach(function(el){if(el.closest('.hero'))return;g.fromTo(el,{opacity:0,y:40},{opacity:1,y:0,duration:1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 90%'}})});
d.querySelectorAll('.bento-card,.fan-card,.stk-card,.rail-card').forEach(function(el){if(!el.closest('.feat-fan'))el.classList.add('cardin')});
g.utils.toArray('.feat-bento .bento-card').forEach(function(el,i){g.fromTo(el,{opacity:0,y:60,rotateX:14,transformPerspective:1000},{opacity:1,y:0,rotateX:0,duration:1.1,ease:'expo.out',delay:(i%3)*.08,scrollTrigger:{trigger:el,start:'top 92%'}});if(!M){el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;g.to(el,{rotateY:x*10,rotateX:-y*10,duration:.5,ease:'power2.out'})});el.addEventListener('pointerleave',function(){g.to(el,{rotateY:0,rotateX:0,duration:.8,ease:'elastic.out(1,.5)'})})}});
d.querySelectorAll('[data-fan]').forEach(function(f){var cs=f.querySelectorAll('.fan-card'),n=cs.length;g.fromTo(cs,{y:function(i){return 120+i*20},rotate:function(i){return (i-(n-1)/2)*-9},x:function(i){return (i-(n-1)/2)*-60},opacity:0},{y:0,rotate:0,x:0,opacity:1,ease:'power3.out',stagger:.06,scrollTrigger:{trigger:f,start:'top 88%',end:'top 35%',scrub:.8}})});
d.querySelectorAll('.stk').forEach(function(s,i,all){if(i===all.length-1)return;var c=s.querySelector('.card');g.to(c,{scale:.92,filter:'brightness(.75)',ease:'none',scrollTrigger:{trigger:all[i+1],start:'top bottom',end:'top '+(100+(i+1)*18)+'px',scrub:true}})});
if(!M)d.querySelectorAll('[data-rail]').forEach(function(r){var tr=r.querySelector('.rail-track'),bar=r.querySelector('.rail-bar i');var dist=function(){return Math.max(0,tr.scrollWidth-innerWidth)};var set=function(){r.style.height=(innerHeight+dist())+'px'};set();addEventListener('resize',set);g.to(tr,{x:function(){return -dist()},ease:'none',scrollTrigger:{trigger:r,start:'top top',end:function(){return '+='+dist()},scrub:.5,invalidateOnRefresh:true}});if(bar)g.to(bar,{scaleX:1,ease:'none',scrollTrigger:{trigger:r,start:'top top',end:function(){return '+='+dist()},scrub:.5}});tr.querySelectorAll('.card-im img').forEach(function(im){g.fromTo(im,{scale:1.2},{scale:1,ease:'none',scrollTrigger:{trigger:r,start:'top top',end:function(){return '+='+dist()},scrub:true}})})});
d.querySelectorAll('[data-count]').forEach(function(b){var n=+b.getAttribute('data-count'),dec=(String(n).split('.')[1]||'').length,o={v:0};g.to(o,{v:n,duration:1.8,ease:'power2.out',scrollTrigger:{trigger:b,start:'top 90%'},onUpdate:function(){b.textContent=o.v.toLocaleString('en-AU',{minimumFractionDigits:dec,maximumFractionDigits:dec})}})});
d.querySelectorAll('.tl').forEach(function(t){var b=t.querySelector('.tl-line b');g.to(b,{scaleY:1,ease:'none',scrollTrigger:{trigger:t,start:'top 70%',end:'bottom 60%',scrub:.4}});t.querySelectorAll('.tl-dot').forEach(function(dt){g.fromTo(dt,{scale:.4,backgroundColor:'transparent'},{scale:1,duration:.6,ease:'back.out(2)',scrollTrigger:{trigger:dt,start:'top 70%'}})})});
if(!M)d.querySelectorAll('[data-pinj]').forEach(function(sec){var st=sec.querySelectorAll('.pj-step'),im=sec.querySelectorAll('.pj-media .im'),dt=sec.querySelectorAll('.pj-dots i'),sun=sec.querySelector('.sun'),stick=sec.querySelector('.pj-stick'),n=st.length,cur2=0;var show=function(k){if(k===cur2)return;cur2=k;[st,im,dt].forEach(function(L){L.forEach(function(x,i){x.classList.toggle('on',i===k)})})};
var skies=['#f6d9b8','#cfe6f5','#bfe0f7','#f9d4a8','#2d3a5c','#1b2440'];
ST.create({trigger:sec,start:'top top',end:'bottom bottom',scrub:.5,onUpdate:function(s){var p=s.progress;show(Math.min(n-1,Math.floor(p*n*0.999)));if(sun){var a=Math.PI*(1-p);sun.style.left=(50-Math.cos(a)*42)+'%';sun.style.top=(78-Math.sin(a)*58)+'%';var k=Math.min(skies.length-2,Math.floor(p*(skies.length-1))),f=p*(skies.length-1)-k;stick.style.background='linear-gradient(180deg,'+mix(skies[k],skies[k+1],f)+','+mix('#fbefe2','#e9eef7',p)+')'}}})});
function mix(a,b,k){var x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);var c=function(s){return Math.round((x>>s&255)*(1-k)+(y>>s&255)*k)};return 'rgb('+c(16)+','+c(8)+','+c(0)+')'}
d.querySelectorAll('[data-clip]').forEach(function(el){g.fromTo(el,{clipPath:'inset(14% 14% 14% 14% round 40px)'},{clipPath:'inset(0% 0% 0% 0% round 0px)',ease:'none',scrollTrigger:{trigger:el,start:'top 90%',end:'top 35%',scrub:.6}});var im=el.querySelector('img');if(im)g.fromTo(im,{scale:1.25,yPercent:-6},{scale:1,yPercent:6,ease:'none',scrollTrigger:{trigger:el,start:'top bottom',end:'bottom top',scrub:true}})});
d.querySelectorAll('[data-zoomin]').forEach(function(el){var im=el.querySelector('img');if(im)g.fromTo(im,{scale:1.4},{scale:1,ease:'none',scrollTrigger:{trigger:el,start:'top bottom',end:'center center',scrub:true}})});
if(!M)d.querySelectorAll('[data-gzoom]').forEach(function(sec){var c=sec.querySelector('.gz-0'),o=sec.querySelectorAll('.gz-grid .im:not(.gz-0)'),t=sec.querySelector('.gz-t');var tl=g.timeline({scrollTrigger:{trigger:sec,start:'top top',end:'bottom bottom',scrub:.6}});tl.to(o,{opacity:0,scale:.8,stagger:.03,duration:.5},0).to(c,{scale:1.7,borderRadius:0,duration:1},0);if(t)tl.to(t,{opacity:1,y:-20,duration:.4},.6)});
d.querySelectorAll('[data-vel]').forEach(function(m){var sk=g.quickTo(m,'skewX',{duration:.4,ease:'power3'});ST.create({onUpdate:function(s){sk(Math.max(-12,Math.min(12,s.getVelocity()/-260)))}})});
d.querySelectorAll('.stats').forEach(function(s){g.fromTo(s,{clipPath:'inset(6% 4% 6% 4% round 40px)'},{clipPath:'inset(0% 0% 0% 0% round 0px)',ease:'none',scrollTrigger:{trigger:s,start:'top 95%',end:'top 40%',scrub:.5}})});
if(!M){d.querySelectorAll('[data-mag]').forEach(function(b){var qx=g.quickTo(b,'x',{duration:.5,ease:'power3'}),qy=g.quickTo(b,'y',{duration:.5,ease:'power3'});b.addEventListener('pointermove',function(e){var r=b.getBoundingClientRect();qx((e.clientX-r.left-r.width/2)*.3);qy((e.clientY-r.top-r.height/2)*.3)});b.addEventListener('pointerleave',function(){qx(0);qy(0)})});
var cr=d.querySelector('.cursor');if(cr){var cx=g.quickTo(cr,'x',{duration:.35,ease:'power3'}),cy=g.quickTo(cr,'y',{duration:.35,ease:'power3'});addEventListener('pointermove',function(e){cx(e.clientX);cy(e.clientY)});d.querySelectorAll('a,button,.card,summary').forEach(function(a){a.addEventListener('pointerenter',function(){cr.classList.add('big')});a.addEventListener('pointerleave',function(){cr.classList.remove('big')})})}}
addEventListener('load',function(){ST.refresh()});setTimeout(function(){ST.refresh()},1500)})();`;
// v48.1: every big heading knows its longest word, so the CSS can always fit it inside its column (no cut-off text)
function wsdFit(html) {
  return html.replace(/<(h1|h2|p) class="(h-hero|h2(?: sm)?|cta-giant|stmt-t|gz-t)"([^>]*)>([\s\S]*?)<\/\1>/g, (m, tag, cls, rest, inner) => {
    const words = inner.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, "x").split(/\s+/).filter(Boolean);
    const lw = Math.max(4, ...words.map((w) => w.length));
    return `<${tag} class="${cls}"${rest} style="--lw:${Math.min(lw, 24)}">${inner}</${tag}>`;
  });
}
function wsdRender(spec, opt) {
  const t = wsdTheme(spec);
  const name = opt.name || spec.brand?.logo_text || "Your business";
  const logo = wsdUrl(spec.brand?.logo);
  const nav = wsdArr(spec.nav?.links, 4);
  const secs = wsdFit(wsdArr(spec.sections, 14).map((s) => {
    const f = s && WSD_SECTIONS[s.type];
    try { return f ? f(s, spec, t) : ""; } catch { return ""; }
  }).join("\n"));
  const c = spec.contact || {};
  const cursor = ["luxe", "modern", "editorial"].includes(t.st) ? '<div class="cursor" aria-hidden="true"></div>' : "";
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>${wsdE(name)} · concept homepage</title><meta name="theme-color" content="${t.p}">${wsdFonts(t)}<style>${wsdCss(t)}${WSD_CSS2(t)}${WSD_CSS3()}</style></head>
<body class="st-${t.st} ${wsdDnaClass(spec.dna)}">
<div class="curtain" aria-hidden="true">${wsdE(name)}</div><div class="prog" aria-hidden="true"></div>${cursor}
<div class="concept">Concept homepage made for ${wsdE(name)} by Studio Flow &amp; Systems. Not live.${spec.ai_images ? " Some photos are AI concept images." : ""} <a href="${wsdE(opt.reportHref)}">See your leak report →</a></div>
<header class="top"><div class="wrap nav"><a class="logo" href="#top">${logo ? `<img src="${wsdE(logo)}" alt="${wsdE(name)}" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<span${logo && spec.brand?.logo_has_name ? ' hidden' : ""}>${wsdE(spec.brand?.logo_text || name)}</span></a><nav>${nav.map((n) => `<a href="${wsdE(n.href && /^#[a-z-]+$/.test(n.href) ? n.href : "#features")}">${wsdE(n.label || n)}</a>`).join("")}</nav>${wsdBtn(spec.nav?.cta || "Contact us", "#contact", "p", "data-mag")}</div></header>
<main>
${secs}
</main>
${wsdOffers(spec, opt)}
${spec.offers === false ? "" : `<div class="pitch" id="sfPitch" role="complementary" aria-label="About this concept"><span class="pitch-t"><b>Made for ${wsdE(name)}</b><small>${wsdE(String(spec.report?.money_title || "Like it? I'll walk you through it, and what it would take to go live, in 15 minutes.").slice(0, 120))}</small></span><a href="#book">Book a free call</a><button type="button" aria-label="Hide">×</button></div><script>(function(){var p=document.getElementById('sfPitch');if(!p)return;var shut=false,shown=false;p.querySelector('button').onclick=function(){shut=true;p.classList.remove('on')};addEventListener('scroll',function(){if(shut)return;var k=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight);var near=document.getElementById('studio-flow');var inOffer=near&&near.getBoundingClientRect().top<innerHeight*.6;var on=k>.22&&!inOffer;if(on!==shown){shown=on;p.classList.toggle('on',on)}},{passive:true})})()</script>`}
<footer class="foot"><div class="wrap"><span>© ${new Date().getFullYear()} ${wsdE(name)}${c.address ? " · " + wsdE(c.address) : ""}</span><span>Concept by <a href="https://www.studioflowandsystems.com" target="_blank" rel="noopener">Studio Flow &amp; Systems</a></span></div></footer>
<script src="${wsdE(opt.motionUrl)}"></script>
<script>${WSD_MOTION}</script>
<script>${WSD_MOTION2}</script>
<script>${WSD_MOTION3}</script>
${opt.widget ? `<script src="${wsdE(opt.widget)}" async></script>` : ""}
${opt.back && typeof WSD_BACK === "string" ? WSD_BACK : ""}
</body></html>`;
}
function wsdReport(spec, opt) {
  const t = wsdTheme(spec);
  const r = spec.report || {};
  const name = opt.name || "your business";
  const leaks = wsdArr(r.leaks, 8).filter((x) => x && x.title);
  const strengths = wsdArr(r.strengths, 4);
  const checked = wsdArr(r.checked, 10);
  const logo = wsdUrl(spec.brand?.logo);
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${wsdE(name)} · website leak report</title>${wsdFonts(t)}<style>${wsdCss(t)}
.rp-hero{padding:80px 0 50px}.rp-hero h1{font-size:clamp(2.4rem,5.6vw,5rem);max-width:18ch}.rp-sum{font-size:1.2rem;color:var(--mu);max-width:62ch;margin-top:22px}
.rp-good{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}.rp-good span{background:color-mix(in srgb,#16a34a 12%,transparent);color:#15803d;border-radius:30px;padding:8px 14px;font-weight:600;font-size:.9rem}
.leaks{display:grid;gap:18px;padding-bottom:40px}.leak{display:grid;grid-template-columns:70px 1fr 1fr;gap:28px;background:var(--sf);border:1px solid var(--ln);border-radius:var(--r);padding:30px}.leak .n{font:var(--dw) 2.6rem/1 var(--fd);color:var(--p)}.leak h3{font-size:1.4rem;margin-bottom:8px}.leak p{color:var(--mu)}.leak .ev{font-size:.88rem;margin-top:10px;color:var(--mu);opacity:.85}.fix{border-left:2px solid var(--p);padding-left:22px}.fix b{display:block;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--p);margin-bottom:6px}.fix strong{display:block;font-size:1.05rem;margin-bottom:6px}
.money{background:var(--p);color:var(--onp);border-radius:var(--r);padding:clamp(28px,4vw,50px);margin:30px 0 60px}.money h2{font-size:clamp(1.8rem,3.6vw,3rem)}.money p{opacity:.9;margin-top:12px;max-width:70ch}
.chk{color:var(--mu);font-size:.9rem;padding-bottom:60px}.chk li{margin-left:18px}
@media(max-width:900px){.leak{grid-template-columns:1fr;gap:14px}}</style></head>
<body class="st-${t.st}"><div class="prog" aria-hidden="true"></div>
<div class="concept">Private leak report for ${wsdE(name)} by Studio Flow &amp; Systems. <a href="${wsdE(opt.siteHref)}">See your concept homepage →</a></div>
<header class="top"><div class="wrap nav"><span class="logo">${logo ? `<img src="${wsdE(logo)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}<span>${wsdE(name)}</span></span><a class="btn btn-p" href="${WSD_BOOK}" target="_blank" rel="noopener" data-mag><span>Book a free call</span></a></div></header>
<main><section class="rp-hero"><div class="wrap"><p class="kick">Website leak report · ${wsdE(opt.date || "")}</p><h1 data-words>${wsdHl(r.headline || "Where enquiries are slipping through", r.highlight)}</h1>${r.summary ? `<p class="rp-sum" data-up>${wsdE(r.summary)}</p>` : ""}${strengths.length ? `<div class="rp-good" data-up>${strengths.map((s) => `<span>✓ ${wsdE(s)}</span>`).join("")}</div>` : ""}</div></section>
<section><div class="wrap leaks">${leaks.map((x, i) => `<article class="leak" data-up><span class="n">${String(i + 1).padStart(2, "0")}</span><div><h3>${wsdE(x.title)}</h3><p>${wsdE(x.detail)}</p>${x.evidence ? `<p class="ev">What we saw: ${wsdE(x.evidence)}</p>` : ""}</div><div class="fix"><b>The fix</b><strong>${wsdE(x.fix_title || "")}</strong><p>${wsdE(x.fix || "")}</p></div></article>`).join("")}</div>
${r.money ? `<div class="wrap"><div class="money" data-up><h2>${wsdE(r.money_title || "What it could be costing")}</h2><p>${wsdE(r.money)}</p></div></div>` : ""}
<div class="wrap chk">${checked.length ? `<p><b>What we checked</b></p><ul>${checked.map((c) => `<li>${wsdE(c)}</li>`).join("")}</ul>` : ""}<p style="margin-top:14px">Checked from public pages on ${wsdE(opt.date || "")}. Nothing on your site was changed.</p></div></section></main>
${wsdOffers({ ...spec, offers: spec.offers }, { ...opt, reportHref: opt.siteHref, linkLabel: "See your concept homepage" })}
<script src="${wsdE(opt.motionUrl)}"></script><script>${WSD_MOTION}</script>
</body></html>`;
}

