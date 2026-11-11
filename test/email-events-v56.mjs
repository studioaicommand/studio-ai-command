// v56 tests: GHL email events reach Command through the inbox webhook, are counted (unique per person per day),
// tag bounces/unsubscribes, never trigger a reply, and show in the outreach snapshot.
const assert=(c,m)=>{if(!c){console.error("FAIL:",m);process.exit(1)}console.log("✓",m)};
const crypto=await import("crypto");
const env={SUPABASE_URL:"https://sb.test",SUPABASE_SECRET_KEY:"s",GHL_TOKEN:"g",GHL_LOCATION_ID:"loc",ANTHROPIC_API_KEY:"a",COMMAND_2FA:"off",STUDIO_TEST_KEY:"teamkey",TELEGRAM_BOT_TOKEN:"t"};
const KEY=crypto.createHash("sha256").update("inbox:teamkey").digest("hex").slice(0,28);
const state={settings:[{key:"inbox",value:{sms:"auto",ig:"auto",fb:"auto",chat:"auto"}}]};
const calls={msgs:0,ai:0,tags:[]};
const J=(x)=>new Response(JSON.stringify(x),{headers:{"content-type":"application/json"}});
globalThis.fetch=async(u,o={})=>{u=String(u);const m=(o.method||"GET").toUpperCase();const body=o.body&&typeof o.body==="string"?JSON.parse(o.body||"null"):null;
 if(u.includes("sb.test")){
  if(u.includes("team_settings")){if(m!=="GET"){const rows=Array.isArray(body)?body:[body];for(const r of rows){const i=state.settings.findIndex(x=>x.key===r.key);if(i>=0)state.settings[i]=r;else state.settings.push(r)}return J(rows)}const k=(u.match(/key=eq\.([a-z_]+)/)||[])[1];return J(k?state.settings.filter(x=>x.key===k):state.settings)}
  return J([])}
 if(u.includes("leadconnectorhq.com")){
  if(u.match(/\/contacts\/[^/]+\/tags/)&&m==="POST"){calls.tags.push([u.match(/contacts\/([^/]+)\/tags/)[1],...body.tags]);return J({})}
  if(u.includes("/conversations/messages")&&m==="POST"){calls.msgs++;return J({messageId:"x"})}
  if(u.includes("/conversations/search"))return J({conversations:[{id:"c1"}]});
  if(u.includes("/conversations/c1/messages"))return J({messages:{messages:[{direction:"inbound",messageType:"TYPE_SMS",body:"hi",dateAdded:new Date().toISOString()}]}});
  return J({})}
 if(u.includes("api.anthropic.com")){calls.ai++;return J({content:[{type:"text",text:"{}"}],stop_reason:"end_turn"})}
 return J({ok:true,result:{}})};
const w=(await import(process.argv[2]||"/home/claude/w/worker.mjs")).default;
const post=async(event,cid)=>{const jobs=[];const r=await w.fetch(new Request("https://studioflowandsystems.app/api/v1/inbox/ghl/"+KEY,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contact_id:cid,full_name:"Test "+cid,email:cid+"@x.com",customData:{contact_id:cid,event}})}),env,{waitUntil(p){jobs.push(p)}});await Promise.all(jobs);return r.json()};
assert((await post("email_opened","a")).ok,"opened accepted");
await post("email_opened","a"); await post("email_opened","b"); await post("email_clicked","a");
await post("email_bounced","c"); await post("email_unsubscribed","d"); await post("email_complained","e");
const st=state.settings.find(x=>x.key==="email_stats")?.value;
assert(st&&st.updated_at,"email_stats saved");
const day=Object.keys(st.days).at(-1), d=st.days[day];
assert(d.opened===2,"opens unique per person per day (2, not 3): "+d.opened);
assert(d.opened_total===3,"raw open total kept");
assert(d.clicked===1&&d.bounced===1&&d.unsubscribed===1&&d.complained===1,"clicked/bounced/unsubscribed/complained counted");
assert(calls.tags.some(t=>t[0]==="c"&&t.includes("email-bounced")&&t.includes("hold-do-not-send")),"bounce tagged email-bounced + hold-do-not-send");
assert(calls.tags.some(t=>t[0]==="d"&&t.includes("outreach-opted-out"))&&calls.tags.some(t=>t[0]==="e"&&t.includes("outreach-opted-out")),"unsubscribe + complaint tagged outreach-opted-out");
assert(calls.msgs===0&&calls.ai===0,"email events never draft or send a reply");
const log=state.settings.find(x=>x.key==="inbox_log")?.value||[];
assert(log[0]?.result?.email_event==="complained","inbox log shows the email event");
console.log("v56 email events: all good");
