// src/team/leak.js
var FREE_CALL = (CALENDARS.find((c) => c.id === "tfzrthnax3Ldpncejghq") || {}).link || "https://www.studioflowandsystems.com";
var VALUE = {
  allied: { value: 95, unit: "new patient (first visit)", who: "patients" },
  dental: { value: 250, unit: "new patient (first visit)", who: "patients" },
  aesthetics: { value: 350, unit: "new client (first treatment)", who: "clients" },
  psychology: { value: 200, unit: "new client (first session)", who: "clients" },
  medical: { value: 80, unit: "new patient (first visit)", who: "patients" },
  property: { value: 1500, unit: "new landlord (first-year fees)", who: "landlords" },
  trades: { value: 450, unit: "new customer (first job)", who: "customers" },
  coaching: { value: 1200, unit: "new client (first program)", who: "clients" },
  multi: { value: 200, unit: "new customer (first visit)", who: "customers" },
  other: { value: 150, unit: "new customer (first job)", who: "customers" }
};
// v140 words that fit the business: an agency is not a clinic, a landlord is not a patient.
var BIZ_WORDS = {
  allied: ["clinic", "patient", "bookings"], dental: ["practice", "patient", "bookings"], medical: ["practice", "patient", "bookings"],
  aesthetics: ["clinic", "client", "bookings"], psychology: ["practice", "client", "bookings"], property: ["agency", "landlord or vendor", "enquiries"],
  trades: ["business", "customer", "jobs"], coaching: ["business", "client", "enquiries"], multi: ["business", "customer", "bookings"], other: ["business", "customer", "enquiries"]
};
var LOSS = { booking: [2, 5], after_hours: [2, 5], mobile: [1, 3], capture: [2, 5], reviews: [1, 3], stale: [0, 1] };
var SCALE = { property: 0.25, coaching: 0.3, trades: 0.5, other: 0.6 };
var siteKey = (u) => {
  try {
    const x = new URL(/^https?:/i.test(u) ? u : "https://" + u);
    return x.origin.replace(/^http:/, "https:").replace("://www.", "://");
  } catch {
    return null;
  }
};
function scoreLeaks(rep, { vertical = "allied", google_rating, google_reviews } = {}) {
  const v = VALUE[vertical] ? vertical : "other";
  const h = rep.home || {};
  const who = VALUE[v].who;
  const checks = [];
  const checked = (h.pages_checked || [rep.url]).filter(Boolean);
  const add = (key, label, status, finding, why, fix, loss, evidence) => checks.push({ key, label, status, finding, why, fix, confidence: status === "unverified" || status === "unknown" ? "unverified" : "confirmed", evidence: evidence || null, loss: status === "pass" || status === "unverified" || !loss ? null : status === "warn" ? loss.map((n) => n / 2) : loss });
  const scripty = (h.platform || []).some((p) => /Wix|Squarespace|Framer|Webflow|Duda/.test(p)) || (h.word_count || 0) < 150;
  const where = checked.map((u) => String(u).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") || "homepage").join(", ");
  if (!rep.ok) {
    add("site", "Website", "fail", rep.error || "The website didn't load.", `${cap(who)} who look you up can't see your services or book.`, "A fast, reliable site with booking built in.", [4, 10]);
  } else {
    const booking = h.booking || [];
    const ext = (h.book_links || []).find((l) => !l.internal);
    if (booking.length) add("booking", "Online booking", "pass", `Online booking found (${booking.join(", ")}${h.booking_page ? ` on ${h.booking_page.replace(/^https?:\/\/(www\.)?/, "")}` : ""}).`, "", "", null, { page: h.booking_page || rep.url, element: booking.join(", ") });
    else if (ext) add("booking", "Online booking", "pass", `A "${ext.text || "Book"}" button links to ${new URL(ext.href).hostname}, which looks like an online booking page.`, "", "", null, { page: rep.url, element: ext.href });
    else if (scripty) add("booking", "Online booking", "unverified", "We couldn't confirm whether there's online booking: parts of this site load with scripts our check can't run.", `Many ${who} book after hours on their phone.`, "Online booking on every page, connected to your diary and CRM.", null, { page: where });
    else add(
      "booking",
      "Online booking",
      "fail",
      h.cta_book ? `The site asks people to book, but we couldn't find an online booking system on ${where}: booking seems to rely on calls or forms.` : `We couldn't find online booking on ${where}.`,
      `Many ${who} book after hours on their phone; if they can't book in a few taps, they often book elsewhere.`,
      "Online booking on every page, connected to your diary and CRM.",
      LOSS.booking,
      { page: where }
    );
    const chat3 = h.chat || [];
    if (chat3.length) add("after_hours", "After-hours enquiries", "pass", `Live chat or an assistant is on the site (${chat3.join(", ")}).`, "", "", null, { page: rep.url, element: chat3.join(", ") });
    else if (h.gtm || scripty) add("after_hours", "After-hours enquiries", "unverified", "We didn't see live chat or an AI assistant, but this site loads tools through a tag manager, so one may still appear.", "The first business to reply usually wins the booking.", "A front desk that answers and books every enquiry 24/7, with instant SMS replies.", null, { page: where });
    else add(
      "after_hours",
      "After-hours enquiries",
      "fail",
      `No live chat or AI assistant on ${where}: enquiries outside opening hours wait until someone is back.`,
      "The first business to reply usually wins the booking.",
      "A front desk that answers and books every enquiry 24/7, with instant SMS replies.",
      LOSS.after_hours,
      { page: where }
    );
    const slow = (rep.load_ms || 0) > 3500;
    add(
      "mobile",
      "Mobile experience",
      !h.viewport ? "fail" : slow ? "warn" : "pass",
      !h.viewport ? "The site isn't set up for phones." : slow ? `The homepage took ${(rep.load_ms / 1e3).toFixed(1)}s to load from Australia.` : `Mobile-ready and loaded in ${((rep.load_ms || 0) / 1e3).toFixed(1)}s.`,
      "Most searches happen on a phone; slow or awkward pages lose people before they enquire.",
      "A fast, mobile-first site.",
      LOSS.mobile
    );
    const forms = (h.forms || 0) + (h.form_embeds || []).length;
    const canBook = booking.length > 0 || !!ext;
    if (canBook) add("capture", "Enquiry capture and follow-up", "pass", "Enquiries and bookings can be made on the site.", "", "", null, { page: rep.url });
    else if (forms) add("capture", "Enquiry capture and follow-up", "warn", `There's an enquiry form${(h.form_embeds || []).length ? ` (${h.form_embeds.join(", ")})` : ""}, but replies depend on someone checking the inbox.`, "Enquiries that wait hours for a reply book far less often.", "Every enquiry lands in a CRM with an instant reply and follow-up until they book.", LOSS.capture, { page: where });
    else if (scripty) add("capture", "Enquiry capture and follow-up", "unverified", "We couldn't confirm an enquiry form: it may load with scripts our check can't run.", "Enquiries that wait hours for a reply book far less often.", "Every enquiry lands in a CRM with an instant reply and follow-up until they book.", null, { page: where });
    else add("capture", "Enquiry capture and follow-up", "fail", `No enquiry form or booking found on ${where}: visitors can only call or email.`, "Enquiries that wait hours for a reply book far less often.", "Every enquiry lands in a CRM with an instant reply and follow-up until they book.", LOSS.capture, { page: where });
    add(
      "tracking",
      "Marketing tracking",
      (h.tracking || []).length ? (h.tracking || []).includes("Meta Pixel") ? "pass" : "warn" : "fail",
      (h.tracking || []).length ? `Tracking found (${h.tracking.join(", ")}).${(h.tracking || []).includes("Meta Pixel") ? "" : " No Meta Pixel for Instagram/Facebook."}` : "No analytics or ad tracking found.",
      "Without tracking you can't see which marketing brings in bookings.",
      "Analytics and conversion tracking tied to bookings, not just clicks.",
      null
    );
    const stale = h.copyright_year && h.copyright_year < (/* @__PURE__ */ new Date()).getFullYear() - 1;
    add(
      "trust",
      "Trust and upkeep",
      !rep.https ? "fail" : stale ? "warn" : "pass",
      !rep.https ? "The site isn't secure (no HTTPS): browsers warn visitors." : stale ? `The footer still says \xA9 ${h.copyright_year}, so the site can look unmaintained.` : "Secure and looks maintained.",
      "Small trust signals decide whether a first-time visitor enquires.",
      "Security, upkeep and fresh content handled for you.",
      LOSS.stale
    );
  }
  const rating = Number(google_rating), count2 = Number(google_reviews);
  if (Number.isFinite(rating) && rating > 0) {
    const st = rating >= 4.6 && count2 >= 100 ? "pass" : rating >= 4.3 && count2 >= 30 ? "warn" : "fail";
    add(
      "reviews",
      "Google reviews",
      st,
      `${rating.toFixed(1)}\u2605 from ${Number.isFinite(count2) ? count2 : "an unknown number of"} Google reviews.`,
      `Reviews are the first thing new ${who} compare.`,
      "Automatic review requests after every visit.",
      LOSS.reviews
    );
  } else add("reviews", "Google reviews", "unknown", "Not checked yet.", `Reviews are the first thing new ${who} compare.`, "Automatic review requests after every visit.", null);
  const scale = SCALE[v] || 1;
  let lo = 0, hi = 0;
  for (const c of checks) if (c.loss) {
    lo += c.loss[0];
    hi += c.loss[1];
  }
  lo = Math.round(Math.min(lo, 12) * scale);
  hi = Math.round(Math.min(hi, 20) * scale);
  const val = VALUE[v].value;
  const weight = { fail: 1, warn: 0.5, pass: 0, unknown: 0, unverified: 0.25 };
  const W = { booking: 26, after_hours: 20, mobile: 12, capture: 18, tracking: 8, trust: 6, reviews: 10, site: 60 };
  const score = Math.min(100, Math.round(checks.reduce((s, c) => s + (W[c.key] || 0) * weight[c.status], 0)));
  const fails = checks.filter((c) => c.status === "fail" || c.status === "warn").sort((a, b) => (W[b.key] || 0) * weight[b.status] - (W[a.key] || 0) * weight[a.status]);
  return {
    vertical: v,
    leak_score: score,
    estimate: lo ? { missed_per_month: [lo, hi], monthly_aud: [lo * val, hi * val], yearly_aud: [lo * val * 12, hi * val * 12], value_per: val, unit: VALUE[v].unit } : null,
    checks,
    top: fails.slice(0, 3).map((c) => ({ label: c.label, finding: c.finding, fix: c.fix })),
    scanned_at: (/* @__PURE__ */ new Date()).toISOString(),
    url: rep.url,
    load_ms: rep.load_ms ?? null,
    platform: rep.home && rep.home.platform || [],
    booking: rep.home && rep.home.booking || [],
    pages_checked: checked,
    unverified: checks.filter((c) => c.status === "unverified").map((c) => c.label)
  };
}
async function leakScan({ url, vertical, google_rating, google_reviews, env }) {
  if (env) return scanClinic(env, { url, vertical, google_rating, google_reviews });
  return leakScanV1({ url, vertical, google_rating, google_reviews });
}
async function leakScanV1({ url, vertical, google_rating, google_reviews }) {
  const rep = await analyseWebsite(url, { pages: 1, light: true });
  if (rep.ok && rep.home) {
    const h = rep.home;
    h.pages_checked = [rep.url];
    const needBooking = !(h.booking || []).length && !(h.book_links || []).some((l) => !l.internal);
    const needChat = !(h.chat || []).length;
    const needForm = !(h.forms || 0) && !(h.form_embeds || []).length;
    if (needBooking || needForm || needChat) {
      const links = [...(h.book_links || []).filter((l) => l.internal).map((l) => l.href), ...(h.internal_links || []).filter((u) => /contact|book|appointment|enquir/i.test(u))];
      const targets = [...new Set(links)].filter((u) => u.replace(/\/$/, "") !== String(rep.url).replace(/\/$/, "")).slice(0, 2);
      for (const t of targets) {
        try {
          const x = await fetchPage(t);
          if (x.status >= 400) continue;
          h.pages_checked.push(x.url);
          const p = x.page;
          if (p.booking.length && !h.booking.length) {
            h.booking = p.booking;
            h.booking_page = x.url;
          }
          if (p.chat.length && !h.chat.length) h.chat = p.chat;
          h.forms = (h.forms || 0) + (p.forms || 0);
          h.form_embeds = [.../* @__PURE__ */ new Set([...h.form_embeds || [], ...p.form_embeds || []])];
          h.book_links = [...h.book_links || [], ...(p.book_links || []).filter((l) => !l.internal)];
          h.emails = [.../* @__PURE__ */ new Set([...h.emails || [], ...p.emails || []])].slice(0, 6);
          h.phones = [.../* @__PURE__ */ new Set([...h.phones || [], ...p.phones || []])].slice(0, 4);
          h.gtm = h.gtm || p.gtm;
        } catch {
        }
      }
    }
  }
  const leak = scoreLeaks(rep, { vertical, google_rating, google_reviews });
  return { rep, leak };
}
function leakForAgent(rep, leak) {
  const h = rep.home || {};
  if (leak.scan_version === 2) return {
    ok: rep.ok !== false,
    url: rep.url,
    scanned_in_real_browser: !!leak.rendered,
    leak_score: leak.leak_score,
    strengths: leak.strengths.map((x) => x.finding),
    opportunities: leak.checks.filter((c) => c.confidence === "confirmed").map((c) => ({ key: c.key, finding: c.finding, evidence: c.evidence, angle: c.angle })),
    couldnt_confirm: leak.checks.filter((c) => c.confidence !== "confirmed").map((c) => c.finding),
    signals: leak.signals,
    estimated_missed_bookings_per_month: leak.estimate?.missed_per_month || null,
    pages_checked: leak.pages_checked,
    contact: { emails: h.emails || [], phones: h.phones || [] },
    note: "Only 'opportunities' may be stated in outreach, in their own words. Mention a strength first when it's true. Never claim anything in couldnt_confirm. The $ estimate is never stated in emails."
  };
  return {
    ok: rep.ok !== false,
    url: rep.url,
    leak_score: leak.leak_score,
    estimated_missed_enquiries_per_month: leak.estimate?.missed_per_month || null,
    estimated_monthly_leak_aud: leak.estimate?.monthly_aud || null,
    checks: leak.checks.map((c) => ({ check: c.label, status: c.status, confidence: c.confidence, finding: c.finding, evidence: c.evidence })),
    pages_checked: leak.pages_checked,
    top_leaks: leak.top,
    contact: { emails: h.emails || [], phones: h.phones || [], socials: h.socials || {} },
    platform: h.platform || [],
    booking: h.booking || [],
    title: h.title || null,
    text_sample: (h.text_sample || "").slice(0, 500),
    note: "Only CONFIRMED fail/warn findings may be stated in outreach; 'unverified' ones can only be asked about as a question. Findings are observations from the public website. The dollar range is an ESTIMATE from typical clinic numbers: never state it as their actual loss. save_prospect stores this scan and creates their one-page leak report."
  };
}
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
var money = (n) => "$" + Math.round(n).toLocaleString("en-AU");
function reportHtml(p, origin) {
  const L = p.leak_report || {};
  if (L.scan_version !== 2) return updatingHtml(p, origin);
  return reportV2(p, origin, L);
}
function shell(title, inner) {
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title>
<style>
:root{--navy:#0B1F3A;--ink:#0E1B2C;--slate:#3C4D63;--line:#D7E0EA;--paper:#F4F7FB;--flow:#19B4F0;--blue:#2B6BF3;--good:#1f9d63;--warn:#d98a1c}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
.page{max-width:820px;margin:0 auto;padding:24px 16px 48px}
header{background:var(--navy);color:#fff;border-radius:18px;padding:22px 24px;display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}
header img{height:30px;width:auto}header .d{color:#A9C2DD;font-size:13px}
h1{font-size:28px;line-height:1.2;margin:26px 0 4px}h2{font-size:19px;margin:0 0 12px}.mu{color:var(--slate)}
section.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px;margin-top:16px}
.item{display:grid;grid-template-columns:30px 1fr;gap:12px;padding:14px 0;border-top:1px solid var(--line)}.item:first-of-type{border-top:0;padding-top:4px}
.dot{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;font-size:13px}
.item b{display:block}.item p{margin:4px 0 0;color:var(--slate);font-size:15px}.item .why{font-size:14px;color:#5b6b80}.item .src{font-size:12.5px;color:#7a8899;margin-top:6px}
.fix{margin-top:8px;font-size:14px;background:var(--paper);border-radius:10px;padding:8px 12px}
.est{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px;margin-top:16px}.big{font-size:24px;font-weight:700}
.cta{background:var(--navy);color:#fff;border-radius:18px;padding:24px;margin-top:16px;text-align:center}.cta p{color:#A9C2DD;margin:6px 0 16px}
.btn{display:inline-block;background:linear-gradient(90deg,var(--blue),var(--flow));color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:12px}
.fine{font-size:12.5px;color:#6b7a8d;margin-top:18px}
@media(max-width:560px){h1{font-size:24px}}
@media print{body{background:#fff}.page{padding:0}section.card,.est{break-inside:avoid}}
</style></head><body><div class="page">${inner}</div></body></html>`;
}
function updatingHtml(p, origin) {
  return shell(`Revenue Leak Review \xB7 ${p.business_name}`, `<header><img src="${esc(origin)}/app/email-logo.png" alt="Studio Flow &amp; Systems" width="192" height="30"></header><h1>${esc(p.business_name)}</h1><section class="card"><h2>This review is being updated</h2><p class="mu">We're re-checking this clinic's website with our updated review so everything in it is accurate. Please check back shortly, or reply to the email you received and we'll send the latest version.</p></section>`);
}
function reportV2(p, origin, L) {
  const date = new Date(L.scanned_at || p.updated_at || Date.now()).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" });
  const [bizWord, personWord, winWord] = BIZ_WORDS[L.vertical] || BIZ_WORDS.other;
  const fixWords = (t) => String(t || "").replace(/\bMost clinic searches\b/g, "Most searches").replace(/\bclinics?\b/gi, (m) => /^C/.test(m) ? bizWord[0].toUpperCase() + bizWord.slice(1) : bizWord).replace(/\bpatients\b/gi, personWord + "s").replace(/\bpatient\b/gi, personWord);
  const conf = (L.checks || []).filter((c) => c.confidence === "confirmed");
  const unc = (L.checks || []).filter((c) => c.confidence !== "confirmed" && c.finding);
  const strengths = (L.strengths || []).map((s) => `<div class="item"><span class="dot" style="background:var(--good)">\u2713</span><div><b>${esc(s.label)}</b><p>${esc(fixWords(s.finding))}</p></div></div>`).join("");
  const opps = conf.map((c) => `<div class="item"><span class="dot" style="background:${c.status === "fail" ? "var(--blue)" : "var(--warn)"}">\u2192</span><div><b>${esc(c.label)}</b><p>${esc(fixWords(c.finding))}</p>${c.why ? `<p class="why">${esc(fixWords(c.why))}</p>` : ""}${c.fix ? `<div class="fix"><b style="display:inline">What we'd set up:</b> ${esc(c.fix)}</div>` : ""}${c.evidence?.page ? `<div class="src">Seen on ${esc(String(c.evidence.page).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</div>` : ""}</div></div>`).join("");
  const est = L.estimate;
  const pagesTxt = (L.pages_checked || [p.website]).map((u) => String(u || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")).join(", ");
  return shell(`Revenue Leak Review \xB7 ${p.business_name}`, `
<header><img src="${esc(origin)}/app/email-logo.png" alt="Studio Flow &amp; Systems" width="192" height="30"><span class="d">Revenue Leak Review \xB7 ${esc(date)}</span></header>
<h1>${esc(p.business_name)}</h1><p class="mu">${esc([p.location, String(p.website || "").replace(/^https?:\/\//, "")].filter(Boolean).join(" \xB7 "))}</p>
${strengths ? `<section class="card"><h2>What's already working</h2>${strengths}</section>` : ""}
<section class="card"><h2>${conf.length ? "Where enquiries can slip through" : "Where enquiries can slip through"}</h2>${opps || `<p class="mu">We didn't find clear gaps on your website. The bigger wins are usually in follow-up, recalls and reactivation, which a short call can map.</p>`}</section>
${est ? `<div class="est"><div class="mu">If these gaps cost even a few ${winWord}, that's roughly</div><div class="big">${est.missed_per_month[0]}\u2013${est.missed_per_month[1]} new ${esc(est.unit.split(" (")[0].replace("new ", ""))}s a month</div><div class="mu">about ${money(est.monthly_aud[0])}\u2013${money(est.monthly_aud[1])} a month at ${money(est.value_per)} per ${esc(est.unit)}. This is an estimate from typical numbers, not a measurement of your ${esc(bizWord)}.</div></div>` : ""}
<div class="cta"><h2 style="color:#fff;margin:0">Want to see what it would look like for you?</h2><p>A free 30-minute call: we'll walk through this and map what's worth fixing (and what isn't).</p><a class="btn" href="${esc(FREE_CALL)}">Book a free 30-minute call</a></div>
<p class="fine">How this was made: we viewed ${esc(pagesTxt)} ${L.rendered ? "in a real browser, the way a " + esc(personWord) + " would," : ""} on ${esc(date)}, using only public information.${unc.length ? ` We couldn't confirm: ${esc(unc.map((c) => c.label.toLowerCase()).join(", "))}, so they're not included.` : ""} Studio Flow &amp; Systems, Brisbane \xB7 studioflowandsystems.com</p>`);
}

