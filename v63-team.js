// ── v63: Leak Report engine. The website's free Leak Calculator posts here; Command works out the money each leak
// costs (on the server, with conservative stated assumptions), saves the contact in GHL with tags, emails the
// branded Leak Report they asked for, pings Ty on Telegram, and hosts the report at /leak/<token> (save as PDF). ──
var LEAK_SPEEDS = {
  "5m": { label: "Within 5 minutes", loss: 0 },
  "1h": { label: "Within an hour", loss: 0.1 },
  "4h": { label: "A few hours", loss: 0.2 },
  "day": { label: "Same day", loss: 0.3 },
  "next": { label: "Next day or later", loss: 0.45 }
};
var LEAK_WEEKS = 4.33;
// Conservative assumptions, shown on every report so the owner can see exactly how the number was made.
var LEAK_RULES = {
  missed_book: 0.3,      // 3 in 10 missed callers would have booked
  close_rate: 0.3,       // 3 in 10 enquiries normally become a booking
  noshow_recover: 0.5,   // reminders and rebooking recover half of no-shows
  quote_uplift: 0.2,     // following up wins 1 in 5 of the quotes that went quiet
  unpaid_risk: 0.1       // 1 in 10 overdue dollars is never collected without chasing
};
function leakNum(v, max) { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0; }
function leakCompute(inp) {
  const job = leakNum(inp.job_value, 100000);
  const missed = leakNum(inp.missed_calls_week, 500);
  const enq = leakNum(inp.enquiries_week, 2000);
  const sp = LEAK_SPEEDS[inp.reply_speed] || LEAK_SPEEDS["4h"];
  const noshow = leakNum(inp.no_shows_month, 500);
  const quotes = leakNum(inp.quotes_unfollowed_month, 1000);
  const unpaid = leakNum(inp.unpaid_month, 5000000);
  const R = LEAK_RULES;
  const lines = [
    { key: "missed_calls", label: "Missed calls", agent: "AI receptionist answers every call and texts back in seconds", monthly: missed * LEAK_WEEKS * R.missed_book * job, how: `${missed} missed a week × ${LEAK_WEEKS} weeks × ${R.missed_book * 100}% who would have booked × $${job}` },
    { key: "slow_replies", label: "Slow replies", agent: "Inbox agent replies to every message in your voice, day and night", monthly: enq * LEAK_WEEKS * sp.loss * R.close_rate * job, how: `${enq} enquiries a week × ${LEAK_WEEKS} × ${Math.round(sp.loss * 100)}% who move on when the reply takes "${sp.label.toLowerCase()}" × ${R.close_rate * 100}% booking rate × $${job}` },
    { key: "no_shows", label: "No-shows", agent: "Reminders, confirmations and same-day rebooking", monthly: noshow * R.noshow_recover * job, how: `${noshow} no-shows a month × ${R.noshow_recover * 100}% recoverable with reminders and rebooking × $${job}` },
    { key: "quotes", label: "Quotes never followed up", agent: "Follow-up agent checks in on day 1, 3 and 7", monthly: quotes * R.quote_uplift * job, how: `${quotes} quiet quotes a month × ${R.quote_uplift * 100}% won back with follow-up × $${job}` },
    { key: "unpaid", label: "Unpaid invoices", agent: "Finance agent chases overdue invoices politely, on schedule", monthly: unpaid * R.unpaid_risk, how: `$${unpaid} overdue a month × ${R.unpaid_risk * 100}% that is never collected without chasing` }
  ].map((l) => ({ ...l, monthly: Math.round(l.monthly) }));
  const monthly = lines.reduce((a, l) => a + l.monthly, 0);
  return { inputs: { job, missed, enq, speed: sp.label, noshow, quotes, unpaid }, lines: lines.sort((a, b) => b.monthly - a.monthly), monthly, yearly: monthly * 12 };
}
function leakBand(m) { return m >= 20000 ? "20k-plus" : m >= 10000 ? "10k-20k" : m >= 5000 ? "5k-10k" : m >= 2000 ? "2k-5k" : "under-2k"; }
var leakAud = (n) => "$" + Math.round(n).toLocaleString("en-AU");
var leakE = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function leakClean(v, n) { return String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n); }
function leakReportHtml(r, origin) {
  const top = r.calc.lines.filter((l) => l.monthly > 0);
  const max = Math.max(1, ...top.map((l) => l.monthly));
  const book = "https://links.studioflowandsystems.com/widget/booking/tfzrthnax3Ldpncejghq";
  const audit = "https://links.studioflowandsystems.com/widget/booking/letd3kiR8QpsaVL6SXkJ";
  const date = new Date(r.at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" });
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Leak Report · ${leakE(r.business || r.name)} · Studio Flow & Systems</title>
<style>
:root{--bg:#050c18;--card:#0b1a30;--ln:rgba(127,212,255,.18);--ink:#fff;--mu:#a9c2dd;--a:#7fd4ff;--b:#2f7df6;--red:#ff6b6b}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:var(--bg);color:var(--mu);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif}
.w{max-width:860px;margin:0 auto;padding:28px 20px 60px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:34px}.top img{height:30px}.top span{font-size:12px;letter-spacing:.16em;color:var(--a);text-transform:uppercase}
.k{font-size:12px;letter-spacing:.22em;color:var(--a);text-transform:uppercase;margin:0 0 10px}
h1{color:var(--ink);font-size:clamp(34px,6vw,58px);line-height:1.02;letter-spacing:-.03em;margin:0 0 14px}
h1 em{font-style:normal;background:linear-gradient(90deg,#9fdcff,#2f7df6);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{font-size:18px;max-width:58ch;margin:0 0 28px}
.hero{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 30px}
.stat{padding:22px;border-radius:20px;background:linear-gradient(160deg,#112a4a,#0a1729);border:1px solid var(--ln)}
.stat b{display:block;color:var(--ink);font-size:clamp(30px,5vw,44px);letter-spacing:-.03em;line-height:1.05}.stat small{font-size:13px}
.stat.big{border-color:rgba(255,107,107,.4);box-shadow:0 0 40px -16px rgba(255,107,107,.6)}.stat.big b{color:#ffb4b4}
h2{color:var(--ink);font-size:24px;letter-spacing:-.02em;margin:34px 0 14px}
.leak{padding:18px 18px 16px;border-radius:18px;background:var(--card);border:1px solid var(--ln);margin-bottom:12px;break-inside:avoid}
.lh{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.lh b{color:var(--ink);font-size:18px}.lh strong{color:#ffb4b4;font-size:20px;white-space:nowrap}
.bar{height:8px;border-radius:8px;background:rgba(255,255,255,.06);margin:10px 0 10px;overflow:hidden}.bar i{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,#ff8a8a,#ff4d6d)}
.fix{font-size:14.5px;color:#cfe6f7}.fix:before{content:"Fix: ";color:#4ade80;font-weight:700}
.how{font-size:12.5px;color:#7f97ab;margin-top:6px}
.cta{margin-top:30px;padding:24px;border-radius:22px;background:linear-gradient(135deg,#123a6e,#0a1d38);border:1px solid rgba(127,212,255,.35)}
.cta h3{color:var(--ink);font-size:22px;margin:0 0 8px}.cta p{margin:0 0 16px}
.btns{display:flex;gap:10px;flex-wrap:wrap}.btn{display:inline-block;padding:13px 20px;border-radius:999px;font-weight:700;text-decoration:none;font-size:15px}
.btn.p{background:#e3f4ff;color:#05101f}.btn.g{border:1px solid rgba(127,212,255,.5);color:#e6f6ff}
.note{font-size:12.5px;color:#7f97ab;margin-top:26px}
.print{position:fixed;right:16px;bottom:16px;padding:12px 18px;border-radius:999px;background:#2f7df6;color:#fff;border:0;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.5)}
@media(max-width:620px){.hero{grid-template-columns:1fr}}
@media print{.print,.btns{display:none}.w{padding:10px}body{font-size:13px}.leak{page-break-inside:avoid}}
</style></head><body><div class="w">
<div class="top"><img src="https://www.studioflowandsystems.com/img/logo.webp" alt="Studio Flow & Systems"><span>Leak Report · ${leakE(date)}</span></div>
<p class="k">Prepared for ${leakE(r.business || r.name)}</p>
<h1>Your business is leaking about <em>${leakAud(r.calc.monthly)} a month.</em></h1>
<p class="lead">That's roughly <b style="color:#fff">${leakAud(r.calc.yearly)} a year</b> in bookings and payments that walk out the door, based on your answers. Here's where it's going, biggest first, and how each one gets fixed.</p>
<div class="hero"><div class="stat big"><b>${leakAud(r.calc.monthly)}</b><small>estimated lost each month</small></div><div class="stat"><b>${leakAud(r.calc.yearly)}</b><small>estimated lost each year</small></div></div>
<h2>Where it's leaking</h2>
${top.map((l) => `<div class="leak"><div class="lh"><b>${leakE(l.label)}</b><strong>${leakAud(l.monthly)}/mo</strong></div><div class="bar"><i style="width:${Math.max(4, Math.round(l.monthly / max * 100))}%"></i></div><div class="fix">${leakE(l.agent)}</div><div class="how">How we worked it out: ${leakE(l.how)}</div></div>`).join("")}
<div class="cta"><h3>Want these leaks plugged?</h3><p>Studio AI Command runs an AI team that answers, follows up, books and chases payments for you, and you approve anything that matters from your phone. Book a free 30-minute call and we'll show you which leak to fix first. If you go ahead within 30 days, the cost of a Full Leak Report or Business Audit comes off your setup price.</p><div class="btns"><a class="btn p" href="${book}">Book a free call</a><a class="btn g" href="${audit}">Full Leak Report ($350) or 2-hour Business Audit ($497)</a></div></div>
<p class="note">These are estimates using conservative assumptions (shown under each leak) and the numbers you entered. The Full Leak Report checks your real phone, inbox, CRM and invoices for exact figures. Studio Flow & Systems · Brisbane · 0495 105 377 · studioflowandsystems.com</p>
</div><button class="print" onclick="window.print()">Save as PDF</button></body></html>`;
}
async function leakPublic(request, env, ctx) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin") || "";
  if (request.method === "GET" && /^\/leak\/[a-f0-9]{24}$/.test(url.pathname)) {
    const r = await secGet(env, "wsdlk:" + url.pathname.slice(6)).catch(() => null);
    if (!r) return new Response("This report has expired or doesn't exist.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" } });
    return new Response(leakReportHtml(r, env.PUBLIC_ORIGIN), { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex", "Cache-Control": "private, max-age=300", "Content-Security-Policy": "default-src 'none'; img-src https://www.studioflowandsystems.com; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" } });
  }
  if (url.pathname !== "/api/v1/leak") return null;
  const H = { ...siteCors(env, origin), "Content-Type": "application/json" };
  const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: H });
  if (request.method === "OPTIONS") return new Response(null, { status: siteOriginAllowed(env, origin) ? 204 : 403, headers: siteCors(env, origin) });
  if (request.method !== "POST") return J({ ok: false, error: "Use POST." }, 405);
  if (!siteOriginAllowed(env, origin)) return J({ ok: false, error: "This calculator only runs on the Studio Flow website." }, 403);
  let b = {};
  try { const t = await request.text(); if (t.length > 6000) throw 0; b = JSON.parse(t); } catch { return J({ ok: false, error: "Invalid request." }, 400); }
  const calc = leakCompute(b.inputs || {});
  if (b.preview === true) return J({ ok: true, calc });
  const name = leakClean(b.name, 80), email = leakClean(b.email, 120).toLowerCase(), business = leakClean(b.business, 120), phone = leakClean(b.phone, 30), industry = leakClean(b.industry, 60);
  if (name.length < 2) return J({ ok: false, error: "Add your name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return J({ ok: false, error: "Add a valid email so your report reaches you." }, 400);
  if (phone && !/^\+?[\d\s()-]{8,18}$/.test(phone)) return J({ ok: false, error: "That phone number doesn't look right." }, 400);
  if (b.consent !== true) return J({ ok: false, error: "Please tick the box so we can send your report." }, 400);
  const ip = request.headers.get("CF-Connecting-IP") || "";
  try { await siteTurnstile(env, b.turnstile, ip); } catch (e) { return J({ ok: false, error: e.message }, e.status || 403); }
  const token = Array.from(crypto.getRandomValues(new Uint8Array(12))).map((x) => x.toString(16).padStart(2, "0")).join("");
  const pub = (env.PUBLIC_ORIGIN || env.STUDIO_PUBLIC_ORIGIN || "https://studioflowandsystems.app").replace(/\/+$/, "");
  const reportUrl = pub + "/leak/" + token;
  const rec = { at: new Date().toISOString(), name, email, business, phone, industry, calc, report_url: reportUrl };
  await secPut(env, "wsdlk:" + token, rec);
  const te = teamEnv(env);
  let contactId = null;
  try {
    const [first, ...rest] = name.split(" ");
    const d = await req(te, "POST", "/contacts/upsert", { locationId: te.GHL_LOCATION_ID, email, phone: phone || undefined, firstName: first, lastName: rest.join(" ") || undefined, companyName: business || undefined, source: "Website Leak Calculator", tags: ["leak-calculator", "leak-" + leakBand(calc.monthly), industry ? "industry-" + industry.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) : "industry-other"] });
    contactId = d?.contact?.id || null;
    if (contactId) {
      await req(te, "POST", `/contacts/${contactId}/notes`, { body: `Leak Calculator (${new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane" })} Brisbane)\nEstimated leak: ${leakAud(calc.monthly)}/month (${leakAud(calc.yearly)}/year)\n${calc.lines.map((l) => `• ${l.label}: ${leakAud(l.monthly)}/mo`).join("\n")}\nIndustry: ${industry || "-"} · Avg job: ${leakAud(calc.inputs.job)} · Reply speed: ${calc.inputs.speed}\nReport: ${reportUrl}\n\nConsent: they asked for their Leak Report by email.` }).catch(() => {});
      const top = calc.lines.filter((l) => l.monthly > 0).slice(0, 3);
      const body = `Hi ${first},\n\nThanks for running the Leak Calculator. Here's your Leak Report for ${business || "your business"}:\n\n${reportUrl}\n\nBased on your answers, you're losing about ${leakAud(calc.monthly)} a month (${leakAud(calc.yearly)} a year). The biggest leaks:\n\n${top.map((l) => `${l.label}: about ${leakAud(l.monthly)} a month`).join("\n")}\n\nThe good news: every one of these can be fixed, mostly on autopilot. If you'd like, book a free 30-minute call and I'll show you which leak to fix first:\n\nhttps://links.studioflowandsystems.com/widget/booking/tfzrthnax3Ldpncejghq`;
      await sendEmail(te, contactId, `Your Leak Report: about ${leakAud(calc.monthly)} a month`, brandedEmail({ body, origin: pub, kind: "message", closing: "Cheers," })).catch(() => {});
    }
  } catch (e) { rec.ghl_error = String(e.message || e).slice(0, 200); await secPut(env, "wsdlk:" + token, rec).catch(() => {}); }
  ctx?.waitUntil?.(siteNotifyTy(env, `💧 <b>Leak Calculator lead</b>\n${siteEsc(name)}${business ? " · " + siteEsc(business) : ""}${industry ? " · " + siteEsc(industry) : ""}\n${siteEsc(email)}${phone ? " · " + siteEsc(phone) : ""}\nLeaking about <b>${leakAud(calc.monthly)}/mo</b> (${leakAud(calc.yearly)}/yr)\nTop: ${siteEsc(calc.lines[0].label)} ${leakAud(calc.lines[0].monthly)}/mo\n${contactId ? "Saved in GHL (tag leak-calculator) and report emailed." : "⚠️ GHL save failed, follow up by hand."}\n${reportUrl}`));
  return J({ ok: true, token, report_url: reportUrl, calc });
}
