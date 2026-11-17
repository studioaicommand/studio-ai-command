const assert=(c,m)=>{if(!c){console.error("FAIL:",m);process.exit(1)}console.log("✓",m)};
const SETTINGS=[{key:"offer",value:{pilot_price:497,monthly:597,pilot_price_voice:697,monthly_voice:797,payment_link:"https://buy.stripe.com/8x214oggZ72I5ENboOeZ204",payment_link_voice:"https://buy.stripe.com/8x24gAe8Rcn20ktakKeZ205"},updated_at:"2026-11-04T00:00:00Z"},{key:"offer_catalog",value:{published:true,headline:"Smarter reception. Better websites.",intro:"AI receptionists, done-for-you websites and connected packages for established businesses.",items:{chat:{title:"AI receptionist · website chat",description:"Help website visitors get answers and find the right next step, including when the front desk is busy.",enabled:true}}},updated_at:"2026-11-04T00:00:00Z"}];
globalThis.fetch=async(u)=>{u=String(u);if(u.includes("sb.test"))return Response.json(u.includes("team_settings")?SETTINGS:[]);return Response.json({})};
const w=(await import(process.argv[2]||"/home/claude/w/worker.mjs")).default;
const env={SUPABASE_URL:"https://sb.test",SUPABASE_SECRET_KEY:"s"};
let r=await w.fetch(new Request("https://studioflowandsystems.app/offers"),env,{waitUntil(){}});const h=await r.text();
assert(r.status===200,"Offers page loads ("+r.status+")");
assert(!/\$597|\$797/.test(h),"No old prices");
assert(/\$697/.test(h)&&!/\$297 a month/.test(h)&&/AI Front Desk/.test(h)&&/\$1,997/.test(h)&&/Leak Report &amp; Systems Audit|Leak Report & Systems Audit/.test(h),"Premium prices: AI Front Desk $697/month, no $297 plan, Command Core $1,997, Leak Report & Systems Audit");
assert(/\$3,500/.test(h)&&/\$6,900/.test(h)&&/\$12,000/.test(h)&&/<s>\$9,500<\/s>/.test(h),"Website founding prices with normal price crossed out");
assert(/\$149/.test(h)&&/\$690/.test(h)&&/\$497/.test(h)&&!/\$350/.test(h),"Care, SEO and Leak Report & Audit ($497) prices");
assert(/Custom Backend Build/.test(h)&&/Quoted/.test(h),"Custom Backend Build quoted");
assert(!h.includes("buy.stripe.com/cNidRaaWFdr69V31OeeZ206")&&!h.includes("buy.stripe.com/3cI5kE7Kteva3wF8cCeZ207")&&!h.includes("8x214oggZ72I5ENboOeZ204"),"Old Stripe links (old prices) are never shown: the button books a call until new links are saved");
assert(/Everything your business needs/.test(h)&&!/AI receptionist · website chat/.test(h)&&!/Chat Receptionist/.test(h)&&/AI Front Desk/.test(h),"Old default headline and card names replaced (chat plan retired, Front Desk shown)");
r=await w.fetch(new Request("https://studioflowandsystems.app/app/app.js"),env,{waitUntil(){}});const js=await r.text();
try{new Function(js);console.log("✓ Command app script parses ("+js.length+" chars)")}catch(e){console.error("FAIL: app.js",e.message);process.exit(1)}
assert(/data-offer-price/.test(js)&&/Monthly plan/.test(js),"Command > Offers has price fields");
(await import("fs")).writeFileSync("/tmp/claude-0/offers.html",h.replaceAll("/app/logo.webp","https://studioflowandsystems.app/app/logo.webp"));
console.log("All v27 offers tests passed.");
