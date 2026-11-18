// v140 leak reports use words that fit the business: a real estate agency gets "agency" and "landlord", never "clinic" or "patient".
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const src = (await import("node:fs")).readFileSync(W, "utf8");
const a = src.indexOf("function shell("), b = src.indexOf("function reportV2("), e = src.indexOf("\n}\n", b) + 3;
const k = src.indexOf("var BIZ_WORDS"), k2 = src.indexOf("var LOSS");
const fns = new Function("esc", "money", "FREE_CALL", src.slice(k, k2) + src.slice(a, src.indexOf("\n}\n", a) + 3) + src.slice(b, e) + "; return reportV2;");
const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const money = (n) => "$" + Math.round(n).toLocaleString("en-AU");
const reportV2 = fns(esc, money, "https://x");
const L = (v) => ({ vertical: v, rendered: true, scanned_at: "2026-11-18", pages_checked: ["https://x.com.au"], strengths: [], estimate: { missed_per_month: [1, 2], monthly_aud: [1500, 3000], value_per: 1500, unit: "new landlord (first-year fees)" },
  checks: [{ confidence: "confirmed", status: "fail", label: "Mobile experience", finding: "The site isn't set up for phones.", why: "Most clinic searches happen on a phone; slow or awkward pages lose people before they enquire." }] });
const html = reportV2({ business_name: "Coast Realty", website: "https://x.com.au", location: "Sunshine Coast" }, "https://studioflowandsystems.app", L("property"));
assert(!/clinic|patient/i.test(html), "A real estate report never says clinic or patient");
assert(/not a measurement of your agency/.test(html) && /the way a landlord or vendor would/.test(html) && /a few enquiries/.test(html), "It says agency, landlord or vendor, and enquiries");
const dent = reportV2({ business_name: "Smile Co", website: "https://x.com.au" }, "https://studioflowandsystems.app", L("dental"));
assert(/your practice/.test(dent) && /the way a patient would/.test(dent), "A dental report still talks about the practice and patients");
const tr = reportV2({ business_name: "Fix It Plumbing", website: "https://x.com.au" }, "https://studioflowandsystems.app", L("trades"));
assert(/your business/.test(tr) && /a customer would/.test(tr) && !/clinic|patient/i.test(tr), "A trades report says business and customer");
