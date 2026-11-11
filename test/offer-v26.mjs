const assert=(c,m)=>{if(!c){console.error("FAIL:",m);process.exit(1)}console.log("✓",m)};
const TOKEN="a".repeat(40);
globalThis.fetch=async(u,init={})=>{u=String(u);
 if(u.includes("sb.test")){
  if(u.includes("team_settings")) return Response.json([{key:"offer",value:{pilot_price:497,monthly:597,pilot_price_voice:697,monthly_voice:797,payment_link:"https://buy.stripe.com/chat",payment_link_voice:"https://buy.stripe.com/voice"}}]);
  if(u.includes("agent_demos")&&(init.method||"GET")==="GET") return Response.json([{token:TOKEN,business_name:"Clear Dental",website:"https://cleardental.example",vertical:"dental",has_shot:false,kb:{clinic_name:"Clear Dental",services:["Check-ups"],brand:{colour:"#1a6"}},created_at:new Date().toISOString(),expires_at:new Date(Date.now()+864e6).toISOString()}]);
  return Response.json([]);}
 return Response.json({ok:true});};
const mod=await import("/home/claude/w/worker.mjs");const w=mod.default;
const env={SUPABASE_URL:"https://sb.test",SUPABASE_SECRET_KEY:"s",COMMAND_2FA: "off", STUDIO_TEST_KEY: "k"};
let r=await w.fetch(new Request("https://studioflowandsystems.app/api/v1/site/offer"),env,{waitUntil(){}});
const j=await r.json();assert(r.status===200&&j.offer.monthly===297&&j.offer.monthly_voice===497&&j.offer.pilot_price===497&&j.offer.pilot_price_voice===697,"Public offer: old saved 597/797 shows as 297/497 "+JSON.stringify(j.offer));
assert(r.headers.get("access-control-allow-origin")==="*","Website can read it");
r=await w.fetch(new Request("https://studioflowandsystems.app/demo/"+TOKEN),env,{waitUntil(){}});const h=await r.text();
console.log("demo status",r.status);
assert(/Chat Receptionist/.test(h)&&/Front Desk/.test(h),"Demo shows both plan names");
assert(/\$297/.test(h)&&/\$497 a month/.test(h)&&/\$697/.test(h)&&!/\$597|\$797/.test(h),"Demo prices are the new ones");
assert(/Missed-call text-back/.test(h)&&/Google review requests/.test(h)&&/Monthly results report/.test(h),"Front Desk extras listed");
console.log("All v26 offer tests passed.");
