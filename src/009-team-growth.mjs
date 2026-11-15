// src/team/growth.js
var UA = "Mozilla/5.0 (compatible; StudioAI-SiteCheck/1.0; +https://www.studioflowandsystems.com)";
var DETECT = {
  booking: { "GoHighLevel/LeadConnector": /leadconnectorhq|msgsndr|\/widget\/(booking|bookings|appointment|group-booking)\//i, Calendly: /calendly\.com/i, Acuity: /acuityscheduling/i, Fresha: /fresha\.com/i, Timely: /gettimely|timely\.com\.au/i, Setmore: /setmore/i, "Square Appointments": /squareup\.com\/appointments|square\.site/i, SimplyBook: /simplybook/i, Cliniko: /cliniko/i, Mindbody: /mindbodyonline|healcode/i, Booksy: /booksy\.com/i, ServiceM8: /servicem8/i, Tradify: /tradifyhq/i, "Jobber": /getjobber|jobber\.com/i, Bookwell: /bookwell/i, HotDoc: /hotdoc\.com\.au/i, Nookal: /nookal/i, Halaxy: /halaxy/i, HealthEngine: /healthengine/i, "Zanda (Power Diary)": /zandahealth|powerdiary/i, Splose: /splose/i, Coreplus: /coreplus/i, Gensolve: /gensolve/i, "Core Practice": /corepracticeonline|corepractice\.com/i, Centaur: /centaurportal|d4w/i, Dentally: /dentally/i, Bookeo: /bookeo/i, Jane: /janeapp/i },
  chat: { "GHL chat widget": /leadconnector.*chat|chat-widget|msgsndr.*widget/i, Intercom: /intercom/i, Drift: /drift\.com|js\.driftt/i, Tawk: /tawk\.to/i, Crisp: /crisp\.chat/i, LiveChat: /livechatinc/i, "Messenger chat": /connect\.facebook\.net.*customerchat/i, Tidio: /tidio/i, HubSpot: /hs-scripts|hubspot/i, Zendesk: /zdassets|zendesk/i },
  tracking: { "Google Analytics": /gtag\(|google-analytics\.com|googletagmanager\.com\/gtag/i, "Google Tag Manager": /googletagmanager\.com\/gtm/i, "Meta Pixel": /connect\.facebook\.net.*fbevents|fbq\(/i, Hotjar: /hotjar/i, "Microsoft Clarity": /clarity\.ms/i, "TikTok Pixel": /analytics\.tiktok/i, LinkedIn: /snap\.licdn/i },
  cms: { WordPress: /wp-content|wp-includes/i, Wix: /wix\.com|wixstatic/i, Squarespace: /squarespace/i, Shopify: /cdn\.shopify|myshopify/i, Webflow: /webflow/i, "GoHighLevel site": /leadconnectorhq|msgsndr|gohighlevel/i, Framer: /framer\.com|framerusercontent/i, Duda: /dudaone|multiscreensite/i, Weebly: /weebly/i },
  reviews: { "Google reviews widget": /elfsight|trustindex|google.*reviews|reviews-widget/i, Trustpilot: /trustpilot/i, ProductReview: /productreview\.com\.au/i }
};
var pick = (re, html) => (html.match(re) || [])[1];
var strip = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();
var detect = (group, html) => Object.entries(DETECT[group]).filter(([, re]) => re.test(html)).map(([k]) => k);
function normaliseUrl(u) {
  let s = String(u || "").trim();
  if (!s) throw new Error("No website given.");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  const url = new URL(s);
  if (!/^https?:$/.test(url.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname) || !url.hostname.includes(".")) throw new Error("That doesn't look like a public website.");
  return url;
}
async function get(url, ms = 9e3) {
  const t0 = Date.now();
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
  const text = (await r.text()).slice(0, 15e5);
  return { status: r.status, finalUrl: r.url || String(url), ms: Date.now() - t0, text, type: r.headers.get("content-type") || "" };
}
var FORM_EMBED = [["Jotform", /jotform/i], ["Typeform", /typeform/i], ["WPForms", /wpforms/i], ["Gravity Forms", /gform_|gravityforms/i], ["HubSpot form", /hsforms|hbspt\.forms/i], ["Formstack", /formstack/i], ["Cognito", /cognitoforms/i], ["GHL form", /leadconnectorhq\.com\/widget\/form|msgsndr.*\/form/i], ["Paperform", /paperform/i], ["Tally", /tally\.so/i], ["Google Form", /docs\.google\.com\/forms/i], ["Contact Form 7", /wpcf7/i], ["Elementor form", /elementor-form/i], ["Ninja Forms", /ninja-forms/i], ["Fluent Forms", /fluentform/i], ["Wix form", /wixforms|form-builder/i]];
function bookLinks(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = strip(m[2]).slice(0, 60);
    if (!/\bbook|appointment|schedule|reserve/i.test(text + " " + m[1])) continue;
    try {
      const u = new URL(m[1], base);
      if (!/^https?:$/.test(u.protocol)) continue;
      out.push({ href: u.href, text, internal: u.hostname.replace(/^www\./, "") === new URL(base).hostname.replace(/^www\./, "") });
    } catch {
    }
    if (out.length >= 8) break;
  }
  return out;
}
async function fetchPage(url, ms = 7e3) {
  const x = await get(url, ms);
  return { url: x.finalUrl, status: x.status, page: readPage(x.text, x.finalUrl) };
}
function readPage(html, base) {
  const head = html.slice(0, 2e5);
  const title = strip(pick(/<title[^>]*>([\s\S]*?)<\/title>/i, head));
  const desc = pick(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i, head) || pick(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i, head) || "";
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => strip(m[1])).filter(Boolean).slice(0, 4);
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => strip(m[1])).filter(Boolean).slice(0, 10);
  const body = strip(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " "));
  const links = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  const abs = (h) => {
    try {
      return new URL(h, base).href;
    } catch {
      return null;
    }
  };
  const host2 = new URL(base).hostname.replace(/^www\./, "");
  const internal = [...new Set(links.map(abs).filter((h) => h && new URL(h).hostname.replace(/^www\./, "") === host2 && !/\.(jpg|jpeg|png|gif|svg|webp|pdf|css|js|ico|xml|zip)(\?|$)/i.test(h)))];
  const socials = {};
  for (const [k, re] of Object.entries({ instagram: /instagram\.com\/([A-Za-z0-9_.]+)/i, facebook: /facebook\.com\/([A-Za-z0-9_.-]+)/i, linkedin: /linkedin\.com\/(company|in)\/([A-Za-z0-9_-]+)/i, tiktok: /tiktok\.com\/@([A-Za-z0-9_.]+)/i, youtube: /youtube\.com\/(@?[A-Za-z0-9_-]+)/i })) {
    const m = links.find((l) => re.test(l));
    if (m) socials[k] = m;
  }
  const emails = [...new Set([...html.matchAll(/mailto:([^"'?\s>]+)/gi)].map((m) => m[1].toLowerCase()).concat((body.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).map((e) => e.toLowerCase())))].filter((e) => !/\.(png|jpg|webp|svg)$|sentry|wixpress|example\.|domain\./.test(e)).slice(0, 5);
  const phones = [...new Set([...html.matchAll(/tel:([+\d\s()-]{8,})/gi)].map((m) => m[1].replace(/\s+/g, " ").trim()))].slice(0, 3);
  const schema = [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const years = (body.match(/(?:©|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/i) || [])[1];
  return {
    title,
    title_length: title.length,
    meta_description: strip(desc),
    meta_description_length: strip(desc).length,
    h1,
    h2,
    word_count: body ? body.split(" ").length : 0,
    viewport: /<meta[^>]+name=["']viewport["']/i.test(head),
    canonical: pick(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i, head) || null,
    open_graph: /property=["']og:(title|image)["']/i.test(head),
    schema_types: [...new Set(schema)].slice(0, 12),
    local_business_schema: schema.some((s) => /LocalBusiness|Organization|ProfessionalService|HomeAndConstructionBusiness|MedicalBusiness|BeautySalon|HealthAndBeautyBusiness|Dentist|Restaurant/i.test(s)),
    forms: (html.match(/<form\b/gi) || []).length,
    images: imgs.length,
    images_missing_alt: imgs.filter((i) => !/\balt=["'][^"']+["']/i.test(i)).length,
    booking: detect("booking", html),
    chat: detect("chat", html),
    tracking: detect("tracking", html),
    platform: detect("cms", html),
    reviews: detect("reviews", html),
    socials,
    emails,
    phones,
    copyright_year: years ? Number(years) : null,
    internal_links: internal.slice(0, 40),
    cta_book: /book (now|online|a|an|your)|schedule (a|your)|make an appointment|get a quote|free quote/i.test(body),
    book_links: bookLinks(html, base),
    form_embeds: FORM_EMBED.filter(([, re]) => re.test(html)).map(([k]) => k),
    gtm: /googletagmanager\.com\/gtm|gtm\.js/i.test(html),
    scripts: (html.match(/<script\b/gi) || []).length,
    text_sample: body.slice(0, 1200)
  };
}
function findGaps(p, meta2) {
  const g = [];
  const add = (key, text, weight) => g.push({ key, text, weight });
  if (!meta2.https) add("no_https", "Site isn't on HTTPS: browsers show it as 'Not secure'.", 10);
  if (meta2.ms > 3500) add("slow", `Homepage took ${(meta2.ms / 1e3).toFixed(1)}s to load from Australia: likely losing mobile visitors.`, 8);
  if (!p.viewport) add("not_mobile", "No mobile viewport tag: the site probably isn't built for phones.", 10);
  if (!p.booking.length) add("no_online_booking", p.cta_book ? "Says 'book' but has no online booking system: bookings rely on calls or forms." : "No online booking: customers have to call or email to book.", 14);
  if (!p.chat.length) add("no_chat", "No live chat or AI assistant: after-hours enquiries go unanswered.", 7);
  if (!p.tracking.length) add("no_tracking", "No analytics or ad pixel: they can't measure where customers come from.", 8);
  else if (!p.tracking.includes("Meta Pixel")) add("no_pixel", "No Meta Pixel: they can't retarget Instagram or Facebook visitors.", 4);
  if (!p.forms && !p.booking.length) add("no_capture", "No enquiry form or booking: no way to capture leads on the site.", 12);
  if (!p.meta_description) add("no_meta_description", "No meta description: weak Google listing.", 5);
  if (!p.title || p.title_length < 15) add("weak_title", "Page title is missing or too short for Google.", 5);
  if (!p.h1.length) add("no_h1", "No main heading (H1): hurts SEO and clarity.", 3);
  if (!p.local_business_schema) add("no_schema", "No LocalBusiness schema: missing rich results and map-pack signals.", 4);
  if (p.copyright_year && p.copyright_year < (/* @__PURE__ */ new Date()).getFullYear() - 1) add("stale", `Footer says \xA9 ${p.copyright_year}: the site looks unmaintained.`, 6);
  if (p.word_count < 250) add("thin_content", "Very little text on the homepage: hard to rank on Google.", 4);
  if (p.images && p.images_missing_alt / p.images > 0.5) add("alt_text", `${p.images_missing_alt} of ${p.images} images have no alt text.`, 2);
  if (!Object.keys(p.socials).length) add("no_socials", "No social links on the site.", 2);
  if (!p.reviews.length) add("no_reviews", "No reviews shown on the site: missing social proof.", 3);
  if (p.platform.includes("Wix") || p.platform.includes("Weebly")) add("diy_platform", `Built on ${p.platform.join("/")}: limited automation and integrations.`, 3);
  g.sort((a, b) => b.weight - a.weight);
  const score = Math.min(100, g.reduce((s, x) => s + x.weight, 0));
  return { gaps: g.map(({ key, text }) => ({ key, text })), opportunity_score: score };
}
async function analyseWebsite(url, { pages = 1, light = false } = {}) {
  const u = normaliseUrl(url);
  let r;
  try {
    r = await get(u.href);
  } catch (e) {
    return { ok: false, url: u.href, error: `Couldn't load the site (${String(e.message).slice(0, 120)}). It may be down, very slow, or blocking bots.`, gaps: [{ key: "unreachable", text: "Website didn't load within 9 seconds." }], opportunity_score: 60 };
  }
  if (r.status >= 400) return { ok: false, url: u.href, status: r.status, error: `Site returned HTTP ${r.status}.`, gaps: [{ key: "broken", text: `Website returns an error (HTTP ${r.status}).` }], opportunity_score: 70 };
  const meta2 = { https: r.finalUrl.startsWith("https://"), ms: r.ms, final_url: r.finalUrl };
  const home = readPage(r.text, r.finalUrl);
  const { gaps, opportunity_score } = findGaps(home, meta2);
  const out = { ok: true, url: r.finalUrl, load_ms: r.ms, https: meta2.https, home, gaps, opportunity_score };
  const origin = new URL(r.finalUrl).origin;
  if (light) {
    out.home.internal_links = out.home.internal_links.slice(0, 15);
    return out;
  }
  const [robots, sitemap] = await Promise.all([
    get(origin + "/robots.txt", 5e3).then((x) => x.status < 400 && /user-agent/i.test(x.text)).catch(() => false),
    get(origin + "/sitemap.xml", 5e3).then((x) => x.status < 400 && /<(urlset|sitemapindex)/i.test(x.text)).catch(() => false)
  ]);
  out.robots_txt = robots;
  out.sitemap_xml = sitemap;
  if (pages > 1) {
    const targets = home.internal_links.filter((h) => h !== r.finalUrl && h !== r.finalUrl + "/").slice(0, Math.min(pages - 1, 6));
    out.pages = await Promise.all(targets.map(async (h) => {
      try {
        const x = await get(h, 7e3);
        const p = readPage(x.text, x.finalUrl);
        return { url: x.finalUrl, status: x.status, load_ms: x.ms, title: p.title, meta_description: p.meta_description, h1: p.h1, word_count: p.word_count, schema_types: p.schema_types, missing: [!p.meta_description && "meta description", !p.h1.length && "H1", p.word_count < 300 && "thin content"].filter(Boolean) };
      } catch (e) {
        return { url: h, error: String(e.message).slice(0, 100) };
      }
    }));
  }
  for (const k of ["internal_links"]) out.home[k] = out.home[k].slice(0, 15);
  return out;
}

