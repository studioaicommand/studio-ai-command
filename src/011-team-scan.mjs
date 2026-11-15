// src/team/scan.js
var SCAN_VERSION = 2;
var UA2 = "Mozilla/5.0 (compatible; StudioAI-SiteCheck/2.0; +https://www.studioflowandsystems.com)";
var ACCOUNT = "0e52355511052baaabe9e3298735d557";
var BOOKING_DOMAINS = [
  ["Cliniko", /cliniko\.com|cliniko-\d|cliniko/i],
  ["Nookal", /nookal/i],
  ["Halaxy", /halaxy/i],
  ["HotDoc", /hotdoc\.com\.au|hotdoc/i],
  ["HealthEngine", /healthengine/i],
  ["Zanda (Power Diary)", /zandahealth|powerdiary/i],
  ["Splose", /splose/i],
  ["Coreplus", /coreplus/i],
  ["Gensolve", /gensolve/i],
  ["Core Practice", /corepracticeonline|corepractice\.com/i],
  ["Centaur", /centaurportal|d4w/i],
  ["Dentally", /dentally/i],
  ["Jane", /janeapp/i],
  ["Calendly", /calendly\.com/i],
  ["Acuity", /acuityscheduling/i],
  ["Fresha", /fresha\.com/i],
  ["Timely", /gettimely|timely\.com\.au/i],
  ["Setmore", /setmore/i],
  ["Square Appointments", /squareup\.com\/appointments|square\.site/i],
  ["Mindbody", /mindbodyonline|healcode/i],
  ["SimplyBook", /simplybook/i],
  ["Bookeo", /bookeo/i],
  ["Pabau", /pabau/i],
  ["Kitomba", /kitomba/i],
  ["Shortcuts", /shortcutssoftware/i],
  ["GoHighLevel", /leadconnectorhq\.com\/widget\/(booking|bookings|appointment)|msgsndr.*booking/i],
  ["Practice Hub", /practicehub/i],
  ["Physitrack", /physitrack/i]
];
var CHAT = [
  ["Intercom", /widget\.intercom|intercomcdn|intercom-frame/i],
  ["Drift", /js\.driftt|drift-frame/i],
  ["Tawk", /embed\.tawk\.to|tawk-messenger/i],
  ["Crisp", /client\.crisp\.chat/i],
  ["LiveChat", /livechatinc\.com/i],
  ["Tidio", /code\.tidio|tidio-chat/i],
  ["HubSpot chat", /js\.usemessages|hubspot-messages/i],
  ["Zendesk chat", /static\.zdassets|zopim/i],
  ["GHL chat", /leadconnectorhq\.com\/(loader|chat)|chat-widget|msgsndr.*chat/i],
  ["Messenger chat", /customerchat|fb-customerchat/i],
  ["Podium", /podium\.com|podium-website-widget/i],
  ["Freshchat", /wchat\.freshchat/i],
  ["Chatbase", /chatbase\.co/i],
  ["Voiceflow", /voiceflow/i],
  ["Birdeye", /birdeye/i],
  ["Olark", /olark/i],
  ["Smartsupp", /smartsupp/i],
  ["WhatsApp chat", /wa\.me\/|api\.whatsapp\.com\/send/i],
  ["Simplified SmartBot", /simplified\.io\/widget|smartbot\.js|smartbot-pane/i],
  ["Trengo", /trengo/i],
  ["Userlike", /userlike/i],
  ["Gorgias", /gorgias/i],
  ["Re:amaze", /reamaze/i],
  ["Botpress", /botpress/i],
  ["Landbot", /landbot/i],
  ["ManyChat", /manychat/i],
  ["Kommunicate", /kommunicate/i],
  ["Zoho SalesIQ", /salesiq\.zoho|zsiqchat|zsiq_float/i],
  ["JivoChat", /jivosite|jivochat/i],
  ["Pure Chat", /purechat/i],
  ["Social Intents", /socialintents/i],
  ["Collect.chat", /collect\.chat/i],
  ["Chatbot.com", /chatbot\.com|widget\.chatbot/i],
  ["Botsonic", /botsonic|writesonic/i],
  ["Ada", /ada-embed|static\.ada\.support/i],
  ["Front chat", /chat-assets\.frontapp/i],
  ["Help Scout Beacon", /beacon-v2\.helpscout/i],
  ["Freshworks chat", /fw-cdn\.com|freshworks.*widget/i],
  ["Brevo chat", /conversations-widget\.brevo|sibautomation.*conversations/i],
  ["Gist", /widget\.getgist/i],
  ["Customerly", /customerly/i],
  ["Weave", /getweave\.com.*(chat|text)|weave-widget/i],
  ["NexHealth", /nexhealth/i],
  ["Chaty", /chaty-widget|chaty-channel/i],
  ["GetButton", /getbutton\.io/i],
  ["Elfsight chat", /elfsight.*(chat|whatsapp)/i],
  ["Tars", /hellotars/i],
  ["Quriobot", /quriobot/i],
  ["Voiceflow", /voiceflow/i],
  ["Chat widget", /class=["'][^"']*\b(chatbot|chat-widget|chat-launcher|chat-bubble|webchat|live-chat|livechat-widget)\b/i]
];
// Who the existing bot is (name, AI or human), for the "upgrade your current chat" pitch.
function chatInfo(html) {
  const vendors = CHAT.filter(([, re]) => re.test(html)).map(([k]) => k);
  const named = vendors.filter((v) => v !== "Chat widget" && v !== "WhatsApp chat");
  const list = named.length ? named : vendors;
  if (!list.length) return null;
  const txt = String(html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const nm = txt.match(/\b(?:Hello|Hi|Hey)[!,]?\s+(?:I am|I'm|I\u2019m|my name is)\s+([A-Z][a-z]{1,14})\b/);
  const bot = nm && !/^(The|Your|Here|An?|Happy|Glad|So|Not|Just|Available|Online|Sorry)$/.test(nm[1]) ? nm[1] : "";
  const ai = /simplified|chatbase|botpress|botsonic|voiceflow|landbot|ada|tars|chatbot|smartbot/i.test(list.join(" ")) || /\b(AI|virtual assistant|chatbot)\b/.test(txt.slice(0, 2e5)) || /type ['\u2018\u2019]?human/i.test(txt);
  return { vendors: list.slice(0, 3), bot_name: bot, ai: !!ai, human_handoff: /type ['\u2018\u2019]?human|talk to (a )?(human|person|real)/i.test(txt) };
}
var FORM_EMBED2 = [
  ["Jotform", /jotform/i],
  ["Typeform", /typeform/i],
  ["WPForms", /wpforms/i],
  ["Gravity Forms", /gform_|gravityforms/i],
  ["HubSpot form", /hsforms|hbspt\.forms/i],
  ["Formstack", /formstack/i],
  ["Cognito", /cognitoforms/i],
  ["GHL form", /leadconnectorhq\.com\/widget\/form|msgsndr.*\/form/i],
  ["Paperform", /paperform/i],
  ["Tally", /tally\.so/i],
  ["Contact Form 7", /wpcf7/i],
  ["Elementor form", /elementor-form/i],
  ["Ninja Forms", /ninja-forms/i],
  ["Fluent Forms", /fluentform/i],
  ["Netlify form", /data-netlify/i]
];
var HIGH_VALUE = [
  ["dental implants", /implant/i],
  ["Invisalign", /invisalign|clear aligner/i],
  ["orthodontics", /orthodont/i],
  ["veneers", /veneer/i],
  ["cosmetic treatments", /cosmetic (injectable|treatment|dentistry)|anti-wrinkle|dermal filler/i],
  ["sleep apnoea treatment", /sleep apn/i],
  ["NDIS services", /\bndis\b/i],
  ["WorkCover claims", /workcover|work cover/i],
  ["shockwave therapy", /shockwave/i],
  ["laser treatments", /laser (hair|skin|treatment)/i]
];
var PROMISE = /((?:we|we'll|we will|our team will|someone will)[^.<>"]{0,40}(?:be in touch|get back to you|contact you|respond|call you|reply)[^.<>"]{0,60}|(?:respond|reply|get back to you|contact you)[^.<>"]{0,30}within[^.<>"]{0,40}(?:hours?|days?|business day))/i;
var CALL_TO_BOOK = /(call|phone|ring)( us)?( today)? to (book|make an appointment|schedule)|bookings? (are )?(by|via) (phone|calling)/i;
var strip2 = (s) => String(s || "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
var host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
var short = (u) => String(u || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") || "homepage";
var rendererReady = (env) => !!(env.BROWSER || env.CF_BROWSER_TOKEN);
async function renderPage(env, url) {
  const body = { url, gotoOptions: { waitUntil: "networkidle2", timeout: 25e3 }, rejectResourceTypes: ["image", "media", "font"], userAgent: UA2 };
  if (env.BROWSER && typeof env.BROWSER.quickAction === "function") {
    const r = await env.BROWSER.quickAction("content", body);
    if (typeof r === "string") return r;
    if (r && typeof r.text === "function") return r.text();
    return r?.result || r?.html || r?.content || null;
  }
  if (!env.CF_BROWSER_TOKEN) return null;
  const acct = env.CF_ACCOUNT_ID || ACCOUNT;
  let last = "";
  for (const path of ["browser-run", "browser-rendering"]) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/${path}/content`, { method: "POST", headers: { Authorization: `Bearer ${env.CF_BROWSER_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(45e3) });
    if (r.status === 404) {
      last = "404";
      continue;
    }
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.success) throw new Error(`Browser rendering ${r.status}: ${JSON.stringify(j?.errors || j || "").slice(0, 160)}`);
    return typeof j.result === "string" ? j.result : j.result?.content || j.result?.html || null;
  }
  throw new Error("Browser rendering endpoint not found (" + last + ")");
}
async function rawPage(url, ms = 9e3) {
  const t0 = Date.now();
  const r = await fetch(url, { headers: { "User-Agent": UA2, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
  return { status: r.status, url: r.url || url, html: (await r.text()).slice(0, 2e6), ms: Date.now() - t0 };
}
async function getPage(env, url, wantRender) {
  const raw = await rawPage(url).catch((e) => ({ status: 0, url, html: "", ms: 0, error: e.message }));
  if (raw.status >= 400 || !raw.html && raw.error) return { ...raw, rendered: false, failed: true };
  if (wantRender && rendererReady(env)) {
    try {
      const html = await renderPage(env, raw.url);
      if (html && html.length > 500) return { ...raw, html: html + "\n<!--raw-->\n" + raw.html, rendered: true };
    } catch (e) {
      return { ...raw, rendered: false, render_error: String(e.message).slice(0, 160) };
    }
  }
  return { ...raw, rendered: false };
}
function inspect(html, url) {
  const base = readPage(html, url);
  const text = strip2(html);
  const hidden = strip2(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " "));
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: m[1], text: strip2(m[2]).slice(0, 60) }));
  const abs = (h) => {
    try {
      return new URL(h, url).href;
    } catch {
      return null;
    }
  };
  const srcs = [...html.matchAll(/<(?:iframe|script)\b[^>]*src=["']([^"']+)["']/gi)].map((m) => m[1]);
  const bookingSystems = BOOKING_DOMAINS.filter(([, re]) => re.test(html)).map(([k]) => k);
  const bookLinks2 = links.filter((l) => /\bbook|appointment|schedule/i.test(l.text + " " + l.href)).map((l) => ({ href: abs(l.href), text: l.text })).filter((l) => l.href && /^https?:/.test(l.href));
  const bookButtons = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map((m) => strip2(m[1])).filter((t) => /\bbook|appointment/i.test(t)).slice(0, 6);
  const extBook = bookLinks2.filter((l) => host(l.href) && host(l.href) !== host(url));
  for (const l of extBook) {
    const k = BOOKING_DOMAINS.find(([, re]) => re.test(l.href));
    if (k && !bookingSystems.includes(k[0])) bookingSystems.push(k[0]);
  }
  const chat3 = CHAT.filter(([, re]) => re.test(html)).map(([k]) => k);
  const formEmbeds = FORM_EMBED2.filter(([, re]) => re.test(html)).map(([k]) => k);
  const pm = PROMISE.exec(hidden);
  let promise = null;
  if (pm) {
    const a = Math.max(hidden.lastIndexOf(". ", pm.index), hidden.lastIndexOf("! ", pm.index), hidden.lastIndexOf("? ", pm.index));
    const ends = [". ", "! ", "? "].map((x) => hidden.indexOf(x, pm.index + pm[0].length - 1)).filter((i) => i > 0);
    const b = ends.length ? Math.min(...ends) + 1 : pm.index + pm[0].length;
    promise = hidden.slice(a >= 0 && pm.index - a < 160 ? a + 2 : pm.index, Math.min(b, pm.index + 200)).trim();
  }
  const phones = [...new Set([...html.matchAll(/tel:([+\d\s()-]{8,})/gi)].map((m) => m[1].replace(/[^\d+]/g, "").replace(/^\+?61/, "0")))].filter((p) => p.length >= 8);
  const locSlugs = new Set(links.map((l) => (abs(l.href) || "").match(/\/(?:locations?|clinics?|our-clinics?|practices?)\/([a-z0-9-]{3,})\/?$/i)?.[1]).filter(Boolean));
  const locWord = (text.match(/\b(two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\s+(clinics|locations|practices)\b/i) || [])[1];
  const WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const team = new Set(links.map((l) => (abs(l.href) || "").match(/\/(?:about|team|our-team|practitioners?|staff|meet-the-team|people)\/(dr-)?([a-z]+-[a-z-]+)\/?$/i)?.[0]).filter(Boolean));
  const drs = new Set(text.match(/\bDr\.? [A-Z][a-z]+ [A-Z][a-z'-]+/g) || []);
  const reviews = text.match(/([45]\.\d)\s*(?:stars?|★|\/\s*5)?[^.\d]{0,40}?\+?\s*([\d,]{2,6})\+?\s*(?:Google\s+)?review(?:s|ers)\b/i);
  return {
    url,
    title: base.title,
    words: base.word_count,
    viewport: base.viewport,
    emails: base.emails,
    phones,
    platform: base.platform,
    tracking: base.tracking,
    bookingSystems,
    bookLinks: bookLinks2.slice(0, 10),
    bookButtons,
    extBook: extBook.slice(0, 4),
    chat: chat3,
    forms: (html.match(/<form\b/gi) || []).length,
    formEmbeds,
    promise: promise ? promise.trim().slice(0, 140) : null,
    callToBook: (text.match(CALL_TO_BOOK) || [])[0] || null,
    locations: Math.max(locSlugs.size, WORDS[String(locWord || "").toLowerCase()] || +locWord || 0),
    locationNames: [...locSlugs].slice(0, 8),
    practitioners: Math.max(team.size, drs.size),
    highValue: HIGH_VALUE.filter(([, re]) => re.test(text)).map(([k]) => k),
    reviewsClaim: reviews ? { rating: +reviews[1], count: +reviews[2].replace(/,/g, "") } : null,
    internal: [...new Set(links.map((l) => abs(l.href)).filter((h) => h && /^https?:/.test(h) && host(h) === host(url) && !/\.(jpg|jpeg|png|gif|svg|webp|pdf|css|js|ico|xml|zip)(\?|$)/i.test(h)).map((h) => h.split("#")[0]))],
    srcs: srcs.slice(0, 40),
    copyright: base.copyright_year
  };
}
function pickPages(home, origin) {
  const pool = [...home.bookLinks.filter((l) => host(l.href) === host(origin)).map((l) => l.href), ...home.internal];
  const want = [/book|appointment/i, /contact/i, /new-?patient|first-?visit/i, /locations?\/?$|our-clinics|find-us/i];
  const out = [];
  for (const re of want) {
    const u = pool.find((x) => re.test(x) && !out.includes(x) && x.replace(/\/$/, "") !== origin.replace(/\/$/, ""));
    if (u) out.push(u);
  }
  return out.slice(0, 3);
}
async function scanClinic(env, { url, vertical = "allied", google_rating, google_reviews }) {
  const start = normaliseUrl(url);
  const home = await getPage(env, start.href, true);
  if (home.failed) return { rep: { ok: false, url: start.href, error: home.error || `Website returned HTTP ${home.status}.`, home: {} }, leak: failedLeak(start.href, vertical) };
  const H = inspect(home.html, home.url);
  const extra = pickPages(H, new URL(home.url).origin);
  const pages = await Promise.all(extra.map((u, i) => getPage(env, u, i < 2).then((p) => p.failed ? null : { p, f: inspect(p.html, p.url) }).catch(() => null)));
  const all = [{ p: home, f: H }, ...pages.filter(Boolean)];
  const rendered = all.filter((x) => x.p.rendered && (x.f.words || 0) >= 120).length >= Math.min(2, all.length);
  const S = merge(all.map((x) => x.f));
  S.rendered = rendered;
  S.render_error = all.map((x) => x.p.render_error).find(Boolean) || null;
  S.pages = all.map((x) => ({ url: x.p.url, rendered: !!x.p.rendered }));
  S.load_ms = home.ms;
  const leak = buildFindings(S, { vertical, google_rating, google_reviews, url: home.url });
  const rep = { ok: true, url: home.url, load_ms: home.ms, https: home.url.startsWith("https://"), home: { title: H.title, emails: S.emails, phones: S.phones, platform: H.platform, booking: S.bookingSystems, chat: S.chat, text_sample: "" }, signals: S };
  return { rep, leak };
}
function merge(fs) {
  const u = (k) => [...new Set(fs.flatMap((f) => f[k] || []))];
  const first = (k) => fs.map((f) => f[k]).find(Boolean) || null;
  const where = (k) => fs.find((f) => Array.isArray(f[k]) ? f[k].length : f[k])?.url || null;
  return {
    bookingSystems: u("bookingSystems"),
    bookingPage: where("bookingSystems"),
    bookButtons: u("bookButtons"),
    bookLinks: fs.flatMap((f) => f.bookLinks),
    extBook: fs.flatMap((f) => f.extBook),
    chat: u("chat"),
    forms: fs.reduce((s, f) => s + f.forms, 0),
    formEmbeds: u("formEmbeds"),
    formPage: fs.find((f) => f.forms || f.formEmbeds.length)?.url || null,
    promise: first("promise"),
    promisePage: where("promise"),
    callToBook: first("callToBook"),
    callToBookPage: where("callToBook"),
    emails: u("emails").slice(0, 6),
    phones: u("phones"),
    locations: Math.max(...fs.map((f) => f.locations || 0)),
    locationNames: u("locationNames"),
    practitioners: Math.max(...fs.map((f) => f.practitioners || 0)),
    highValue: u("highValue"),
    reviewsClaim: first("reviewsClaim"),
    homeHasBook: !!(fs[0].bookLinks.length || fs[0].bookButtons.length),
    tracking: u("tracking"),
    viewport: fs[0].viewport,
    copyright: fs[0].copyright
  };
}
function failedLeak(url, vertical) {
  return { scan_version: SCAN_VERSION, rendered: false, vertical, leak_score: 0, estimate: null, strengths: [], checks: [{ key: "site", label: "Website", status: "unverified", confidence: "unverified", finding: "The website didn't load for our check, so we couldn't review it.", evidence: { page: url } }], top: [], pages_checked: [url], scanned_at: (/* @__PURE__ */ new Date()).toISOString(), url, signals: {} };
}
function buildFindings(S, { vertical = "allied", google_rating, google_reviews, url }) {
  const v = VALUE[vertical] ? vertical : "other";
  const who = VALUE[v].who;
  const strengths = [], checks = [];
  const names = (S.pages || []).map((p) => {
    const path = new URL(p.url).pathname.replace(/\/$/, "");
    return path ? path.split("/").pop().replace(/-/g, " ") : "home";
  });
  const pages = names.length > 1 ? `the ${names.length} pages we checked (${names.join(", ")})` : "the homepage";
  const R = S.rendered;
  const opp = (key, label, status, finding, evidence, why, fix, angle, weight2, loss) => checks.push({ key, label, status, confidence: status === "unverified" ? "unverified" : "confirmed", finding, evidence, why, fix, angle, weight: weight2, loss: status === "unverified" ? null : loss });
  const hasBooking = S.bookingSystems.length > 0 || S.extBook.length > 0;
  if (S.bookingSystems.length) strengths.push({ label: "Online booking", finding: `Patients can book online (${S.bookingSystems.join(", ")})${S.bookingPage ? ` on ${short(S.bookingPage)}` : ""}.`, evidence: { page: S.bookingPage } });
  else if (S.extBook.length) strengths.push({ label: "Online booking", finding: `A "${S.extBook[0].text || "Book"}" button takes patients to ${host(S.extBook[0].href)} to book.`, evidence: { page: S.extBook[0].href } });
  if (S.chat.length) strengths.push({ label: "Live chat", finding: `Visitors can chat on the site (${S.chat.join(", ")}). Pitch it as an upgrade: voice, booking the next step, and brand-matched answers from their own site.`, evidence: {} });
  const rating = +google_rating || S.reviewsClaim?.rating || 0, count2 = +google_reviews || S.reviewsClaim?.count || 0;
  if (rating >= 4.5 && count2 >= 50) strengths.push({ label: "Reputation", finding: `${rating.toFixed(1)}\u2605 from ${count2.toLocaleString("en-AU")} reviews.`, evidence: {} });
  if (S.locations >= 2) strengths.push({ label: "Locations", finding: `${S.locations} clinic locations${S.locationNames.length ? ` (${S.locationNames.slice(0, 6).map((n) => n.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ")})` : ""}.`, evidence: {} });
  const hv = S.highValue.length ? ` That includes enquiries about ${S.highValue.slice(0, 2).join(" and ")}, where a fast reply matters most.` : "";
  if (S.promise && !S.chat.length) opp(
    "form_callback",
    "Enquiry follow-up",
    "fail",
    `Your website tells people: "${S.promise.replace(/[.!?]+$/, "")}." Until someone replies, a new ${who.replace(/s$/, "")} is still free to book elsewhere.${hv}`,
    { page: S.promisePage, quote: S.promise },
    "The first clinic to reply usually wins the booking; replies within minutes book far more often than replies the next day.",
    "An instant SMS and email reply to every enquiry, with a booking link and follow-up until they book.",
    "speed to lead on enquiries",
    25,
    [1, 3]
  );
  if (S.locations >= 3 && S.phones.length === 1) opp(
    "shared_number",
    "Phone load across clinics",
    "warn",
    `All ${S.locations} clinics share one phone number (${S.phones[0].replace(/^(1[38]00)(\d{3})(\d{3})$/, "$1 $2 $3")}), so busy periods at one clinic can mean missed calls for all of them.`,
    { page: url, quote: S.phones[0] },
    "Missed calls during busy periods are often new patients who don't leave a voicemail.",
    "Missed-call text-back on the main number, so every unanswered call gets an instant reply with a booking link.",
    "missed calls on a shared number",
    15,
    [1, 3]
  );
  if (!hasBooking && !S.bookButtons.length) {
    if (R) opp(
      "phone_only_booking",
      "Online booking",
      "fail",
      S.callToBook ? `The site asks patients to "${S.callToBook}", and we couldn't find online booking on ${pages}.` : `We couldn't find a way to book online on ${pages}: booking is by phone${S.forms ? " or enquiry form" : ""}.`,
      { page: S.callToBookPage || url, quote: S.callToBook || null },
      `Many ${who} book after hours on their phone; if they can't book in a few taps, they often book elsewhere.`,
      "Online booking on every page, connected to your existing system.",
      "after-hours bookings",
      30,
      [2, 5]
    );
    else opp("phone_only_booking", "Online booking", "unverified", "We couldn't confirm how patients book online: parts of this site load in a way our quick check can't see.", { page: url }, "", "", null, 30, null);
  }
  if (!S.chat.length) {
    if (R && (S.forms || S.formEmbeds.length || S.phones.length)) opp(
      "no_instant_reply",
      "After-hours enquiries",
      "warn",
      `We didn't see live chat or an instant-reply assistant on ${pages}, so questions outside opening hours wait for the team.`,
      { page: url },
      "Patients with a quick question (cost, health fund, availability) often move on if nobody answers.",
      "An AI assistant that answers common questions 24/7 and hands anything clinical to your team.",
      "instant answers after hours",
      15,
      [1, 3]
    );
    else if (!R) opp("no_instant_reply", "After-hours enquiries", "unverified", "We couldn't confirm whether there's live chat: some chat tools only load in a full browser.", { page: url }, "", "", null, 15, null);
  }
  if (!hasBooking && S.bookButtons.length && !R) opp("booking_unknown", "Online booking", "unverified", `There's a "${S.bookButtons[0]}" button, but we couldn't see where it leads without a full browser.`, { page: url }, "", "", null, 0, null);
  if (!S.viewport) opp("not_mobile", "Mobile experience", "fail", "The site isn't set up for phones (no mobile viewport).", { page: url }, "Most clinic searches happen on a phone.", "A fast, mobile-first site.", "mobile visitors", 10, [1, 2]);
  const weight = { fail: 1, warn: 0.6, unverified: 0.15 };
  const score = Math.min(100, Math.round(checks.reduce((s, c) => s + (c.weight || 0) * (weight[c.status] || 0), 0) * 1.4));
  const conf = checks.filter((c) => c.confidence === "confirmed" && c.loss);
  const scale = { property: 0.25, other: 0.6 }[v] || 1, val = VALUE[v].value;
  let lo = Math.round(Math.min(conf.reduce((s, c) => s + c.loss[0] * (c.status === "warn" ? 0.6 : 1), 0), 10) * scale), hi = Math.round(Math.min(conf.reduce((s, c) => s + c.loss[1] * (c.status === "warn" ? 0.6 : 1), 0), 16) * scale);
  if (hi < 1) lo = hi = 0;
  const top = checks.filter((c) => c.confidence === "confirmed").sort((a, b) => b.weight - a.weight).slice(0, 3).map((c) => ({ label: c.label, finding: c.finding, fix: c.fix, angle: c.angle }));
  return {
    scan_version: SCAN_VERSION,
    rendered: !!R,
    vertical: v,
    leak_score: score,
    estimate: lo ? { missed_per_month: [lo, Math.max(lo, hi)], monthly_aud: [lo * val, Math.max(lo, hi) * val], yearly_aud: [lo * val * 12, Math.max(lo, hi) * val * 12], value_per: val, unit: VALUE[v].unit } : null,
    strengths,
    checks,
    top,
    pages_checked: (S.pages || []).map((p) => p.url),
    scanned_at: (/* @__PURE__ */ new Date()).toISOString(),
    url,
    unverified: checks.filter((c) => c.status === "unverified").map((c) => c.label),
    signals: { locations: S.locations || 0, practitioners: S.practitioners || 0, phones: S.phones?.length || 0, booking: S.bookingSystems || [], chat: S.chat || [], high_value: S.highValue || [], reviews: S.reviewsClaim || null, rendered: !!R, render_error: S.render_error || null }
  };
}
var CLAIMS = [
  [/(no|don'?t have|doesn'?t have|without|lack(s|ing)? (of )?|missing)\s+(an? )?online booking|can'?t book online|phone[- ]only|only (book|booking) by phone/i, "phone_only_booking"],
  [/(no|without|missing|don'?t have)\s+(a |any )?(live )?chat|no (instant|after[- ]hours) (reply|response)|nobody (answers|replies)/i, "no_instant_reply"],
  [/(share|shared|one) (phone )?number/i, "shared_number"],
  [/(we'?ll be in touch|be in touch soon|get back to you|call you back|callback)/i, "form_callback"]
];
function claimProblems(texts, leak) {
  const ok = new Set((leak?.checks || []).filter((c) => c.confidence === "confirmed").map((c) => c.key));
  const all = texts.filter(Boolean).join("\n");
  const bad = [];
  for (const [re, key] of CLAIMS) if (re.test(all) && !ok.has(key)) bad.push(`mentions "${(all.match(re) || [""])[0]}" but that isn't a confirmed finding`);
  if (/\$\s?\d|\d+\s?%|\bROI\b|guarantee/i.test(all)) bad.push("uses dollar figures, percentages, ROI or guarantees");
  if (/(you'?re|you are) (losing|missing)\s+\d/i.test(all)) bad.push("states a specific number they're losing");
  return bad;
}

