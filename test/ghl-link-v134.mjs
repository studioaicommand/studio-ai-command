// v134 Command accepts a GoHighLevel payment link (links.studioflowandsystems.com/payment-link/...) as well as Stripe
import { readFileSync } from "node:fs";
const assert = (c, m) => { if (!c) { console.error("FAIL " + m); process.exit(1); } console.log("ok " + m); };
const camp = readFileSync(new URL("../src/030-team-campaign.mjs", import.meta.url), "utf8");
const fnSrc = camp.match(/function offersLink\(value\) \{[\s\S]*?\n\}\n/)[0] + camp.match(/function offersPaymentLink\(value\)[^\n]*/)[0];
const f = new Function(fnSrc + "; return offersPaymentLink;")();
assert(f("https://links.studioflowandsystems.com/payment-link/6afc3493906a8b62055d72ac"), "GHL payment link on our domain accepted");
assert(f("https://link.fastpaydirect.com/payment-link/6afc3493906a8b62055d72ac"), "GHL fastpaydirect link accepted");
assert(f("https://buy.stripe.com/abc123"), "Stripe link still accepted");
assert(!f("https://links.studioflowandsystems.com/widget/booking/abc"), "booking link is not a payment link");
assert(!f("https://evil.example/payment-link/abc"), "other hosts refused");
const hub = readFileSync(new URL("../src/044-team-hub.mjs", import.meta.url), "utf8");
const ok = new Function("return " + hub.match(/const okLink = (\(u\) => [^\n]*?);\n/)[1])();
assert(ok("https://links.studioflowandsystems.com/payment-link/6afc3493906a8b62055d72ac") && ok("https://buy.stripe.com/x") && !ok("https://evil.example/payment-link/x"), "site assistant checkout accepts GHL and Stripe links only");
assert(!/Start the Front Desk pilot/.test(camp), "offers page button no longer says pilot");
assert(!/What does the pilot cover/.test(camp), "offers FAQ no longer says pilot");
