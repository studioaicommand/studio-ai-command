// ── v58: demo images that always show. (1) Their own photos load through Command, so hotlink blocking can't
// break them. (2) Missing, blocked or tiny photos are replaced with AI images made for the brand (OpenAI GPT Image),
// stored once and served from /demo/img/<id>. Max 4 per demo, labelled as AI concept imagery. ──
var WSD_IMG_MODELS = ["gpt-image-2.5-flare", "gpt-image-1"];
var WSD_IMG_MAX = 4;
var wsdH8 = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };
var WSD_IMG_KEYS = new Set(["image", "images", "hero_images", "logo", "before", "after"]);
// rewrite every outside image url in a spec (deep) to go through Command
function wsdProxySpec(spec, token, origin) {
  const own = (u) => String(u).startsWith(origin + "/");
  const walk = (v, key) => {
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    if (typeof v === "string" && WSD_IMG_KEYS.has(key) && /^https:\/\//.test(v) && !own(v)) return `${origin}/demo/img/p/${token}/${wsdH8(v)}`;
    return v;
  };
  return walk(spec, "");
}
function wsdSpecImages(spec) {
  const out = new Set();
  const walk = (v, key) => { if (Array.isArray(v)) v.forEach((x) => walk(x, key)); else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => walk(x, k)); else if (typeof v === "string" && WSD_IMG_KEYS.has(key) && /^https:\/\//.test(v)) out.add(v); };
  walk(spec, ""); return [...out];
}
var WSD_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
async function wsdFetchImg(u, referer) {
  const r = await fetch(u, { headers: { "User-Agent": WSD_UA, Accept: "image/avif,image/webp,image/*,*/*;q=0.8", ...(referer ? { Referer: referer } : {}) }, redirect: "follow", signal: AbortSignal.timeout(12e3), cf: { cacheTtl: 604800, cacheEverything: true } });
  const type = (r.headers.get("content-type") || "").split(";")[0].trim();
  if (!r.ok || !/^image\//.test(type) || /svg/.test(type)) return null;
  const buf = await r.arrayBuffer();
  if (buf.byteLength > 9e6) return null;
  return { buf, type };
}
async function wsdImgRoute(request, env, url, ctx, parts) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const hit = cache ? await cache.match(request).catch(() => null) : null;
  if (hit) return hit;
  const H = { "Cache-Control": "public, max-age=2592000, immutable", "X-Robots-Tag": "noindex", "Access-Control-Allow-Origin": "*" };
  let res = null;
  if (parts[2] === "p" && tokenOk(parts[3]) && /^[0-9a-f]{8}$/.test(parts[4] || "")) {
    const rec = await wsdGet(env, parts[3]).catch(() => null);
    const src = rec?.spec ? wsdSpecImages(rec.spec).find((u) => wsdH8(u) === parts[4]) : null;
    if (src) {
      let ref = ""; try { ref = new URL(rec.website || src).origin + "/"; } catch {}
      const got = await wsdFetchImg(src, ref).catch(() => null) || await wsdFetchImg(src, "").catch(() => null);
      if (got) res = new Response(got.buf, { headers: { "Content-Type": got.type, ...H } });
      else res = new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=3600" } });
    }
  } else if (/^[0-9a-f]{16}\.(webp|png|jpe?g)$/.test(parts[2] || "")) {
    const v = await secGet(env, "wsdimg:" + parts[2].split(".")[0]).catch(() => null);
    if (v?.b64) { const bin = Uint8Array.from(atob(v.b64), (c) => c.charCodeAt(0)); res = new Response(bin, { headers: { "Content-Type": v.mime || "image/webp", ...H } }); }
  }
  if (!res) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=600" } });
  if (cache && res.ok && ctx?.waitUntil) ctx.waitUntil(cache.put(request, res.clone()).catch(() => {}));
  return res;
}
// Is this photo usable? (loads from our side, is a real image, and isn't a tiny icon)
async function wsdImgOk(u, referer) {
  try { const g = await wsdFetchImg(u, referer) || await wsdFetchImg(u, ""); return !!g && g.buf.byteLength >= 14000; } catch { return false; }
}
async function wsdGenImage(env, prompt) {
  if (!env.OPENAI_API_KEY) return null;
  const models = [env.WSD_IMAGE_MODEL, ...WSD_IMG_MODELS].filter(Boolean);
  for (const model of [...new Set(models)]) {
    const r = await fetch("https://api.openai.com/v1/images/generations", { method: "POST", headers: { Authorization: "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ model, prompt: String(prompt).slice(0, 3000), size: "1536x1024", quality: "medium", output_format: "webp", output_compression: 72, n: 1 }), signal: AbortSignal.timeout(110e3) }).catch(() => null);
    if (!r) continue;
    const j = await r.json().catch(() => ({}));
    const b64 = j?.data?.[0]?.b64_json;
    if (b64) {
      const id = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, "0")).join("");
      await secPut(env, "wsdimg:" + id, { mime: "image/webp", b64, model, at: new Date().toISOString(), prompt: String(prompt).slice(0, 400) });
      return { id, model };
    }
    if (r.status === 400 && /model/i.test(JSON.stringify(j))) continue; // try the next model
    if (r.status === 401 || r.status === 429) break;
  }
  return null;
}
// After the design: drop photos that won't load or are too small, then fill the important empty spots with AI images.
async function wsdImagesFix(env, spec, { name, industry, area, website, origin }) {
  const ref = (() => { try { return new URL(website).origin + "/"; } catch { return ""; } })();
  const all = wsdSpecImages(spec).filter((u) => u !== spec.brand?.logo);
  const checks = await Promise.all(all.slice(0, 24).map(async (u) => [u, await wsdImgOk(u, ref)]));
  const bad = new Set(checks.filter(([, ok]) => !ok).map(([u]) => u));
  const clean = (v, key) => { if (Array.isArray(v)) return v.map((x) => clean(x, key)).filter((x) => x !== ""); if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x, k)])); return typeof v === "string" && WSD_IMG_KEYS.has(key) && key !== "logo" && bad.has(v) ? "" : v; };
  const sections = clean(spec.sections || [], "");
  spec.sections = sections;
  if (!env.OPENAI_API_KEY) return { removed: bad.size, generated: 0 };
  const p = spec.brand?.primary || "", a2 = spec.brand?.accent || "";
  const asks = Array.isArray(spec.gen_images) ? spec.gen_images : [];
  const promptFor = (slot, subject) => {
    const own = asks.find((x) => x && x.slot === slot && x.prompt);
    return `${own ? own.prompt : subject}. For ${name}, a ${industry || "local"} business${area ? " in " + area : ""}, Australia. Authentic, premium editorial photograph, natural light, real people and places, shallow depth of field, ${p ? "subtle colour accents in " + p + (a2 ? " and " + a2 : "") + ", " : ""}no text, no words, no logos, no watermarks.`;
  };
  const jobs = [];
  for (const s of sections) {
    if (jobs.length >= WSD_IMG_MAX) break;
    if (s.type === "hero" && !(s.images || []).filter(Boolean).length) jobs.push({ set: (u) => { s.images = [u]; }, prompt: promptFor("hero", s.title || "The business at its best") });
    else if ((s.type === "split" || s.type === "expand") && !s.image) jobs.push({ set: (u) => { s.image = u; }, prompt: promptFor(s.type, s.title || "A welcoming scene") });
    else if (s.type === "features" && ["list", "panels", "flip", "rail", "bento"].includes(s.variant) && Array.isArray(s.items)) {
      for (const x of s.items.slice(0, 3)) if (x && !x.image && jobs.length < WSD_IMG_MAX) jobs.push({ set: (u) => { x.image = u; }, prompt: promptFor("features", x.title + ": " + (x.text || "")) });
    }
  }
  const made = await Promise.all(jobs.map(async (j) => { const g = await wsdGenImage(env, j.prompt).catch(() => null); if (g) j.set(`${origin}/demo/img/${g.id}.webp`); return g; }));
  const n = made.filter(Boolean).length;
  if (n) {
    spec.ai_images = n;
    await insert(env, "team_usage", [{ department: "head_of_marketing", source: "demo_images", model: made.find(Boolean).model, calls: n, cost_usd: +(n * 0.03).toFixed(3), cost_aud: +(n * 0.046).toFixed(3) }]).catch(() => {});
  }
  return { removed: bad.size, generated: n };
}
