// v29 tests: follow-ups until they book + Google review requests.
const assert=(c,m)=>{if(!c){console.error("FAIL:",m);process.exit(1)}console.log("✓",m)};
const crypto=await import("crypto");
const env={SUPABASE_URL:"https://sb.test",SUPABASE_SECRET_KEY:"s",GHL_TOKEN:"g",GHL_LOCATION_ID:"loc",ANTHROPIC_API_KEY:"a",COMMAND_2FA: "off", STUDIO_TEST_KEY: "teamkey",TELEGRAM_BOT_TOKEN:"t",INBOX_DEBUG:"1"};
const KEY=crypto.createHash("sha256").update("inbox:teamkey").digest("hex").slice(0,28);
let appts=[], contactData={id:"ct1",firstName:"Sarah",email:"sarah@clinic.com.au",phone:"+61400000000",tags:[]}; let state, sent, modelReply, convo, lastSystem="", tgSent=[];
function reset(modes,messages,reply){state={settings:[{key:"inbox",value:modes},{key:"telegram",value:{chat_id:42,bot:"b"}}],actions:[]};sent=[];tgSent=[];convo=messages;modelReply=reply}
const J=(x)=>new Response(JSON.stringify(x),{headers:{"content-type":"application/json"}});
globalThis.fetch=async(u,o={})=>{u=String(u);const m=(o.method||"GET").toUpperCase();const body=o.body&&typeof o.body==="string"?JSON.parse(o.body||"null"):null;
 if(u.includes("sb.test")){
  if(u.includes("team_settings")){if(m!=="GET"){const rows=Array.isArray(body)?body:[body];for(const r of rows){const i=state.settings.findIndex(x=>x.key===r.key);if(i>=0)state.settings[i]=r;else state.settings.push(r)}return J(rows)}const k=(u.match(/key=eq\.([a-z_]+)/)||[])[1];return J(k?state.settings.filter(x=>x.key===k):state.settings)}
  if(u.includes("team_actions")){
   if(m==="POST"){const rows=(Array.isArray(body)?body:[body]).map((r,i)=>({id:"a"+(state.actions.length+i+1),created_at:new Date().toISOString(),...r}));state.actions.push(...rows);return J(rows)}
   if(m==="PATCH"){const id=(u.match(/id=eq\.([^&]+)/)||[])[1];const want=(u.match(/status=eq\.([a-z]+)/)||[])[1];const rows=state.actions.filter(a=>a.id===id&&(!want||a.status===want));rows.forEach(a=>Object.assign(a,body));return J(rows)}
   const mid=(u.match(/message_id=eq\.([^&]+)/)||[])[1];if(mid)return J(state.actions.filter(a=>a.params?.message_id===decodeURIComponent(mid)));
   const tgm=(u.match(/tg_msg=eq\.([^&]+)/)||[])[1];if(tgm)return J(state.actions.filter(a=>String(a.params?.tg_msg)===tgm&&a.status==="pending"));
   let rows=state.actions;const ti=(u.match(/type=in\.\(([^)]+)\)/)||[])[1];if(ti)rows=rows.filter(a=>ti.split(",").includes(a.type));const te=(u.match(/[?&]type=eq\.([a-z_]+)/)||[])[1];if(te)rows=rows.filter(a=>a.type===te);const kd=(u.match(/kind=eq\.([a-z]+)/)||[])[1];if(kd)rows=rows.filter(a=>a.params?.kind===kd);const ci=(u.match(/contact_id=eq\.([^&]+)/)||[])[1];if(ci)rows=rows.filter(a=>a.params?.contact_id===decodeURIComponent(ci));return J(rows)}
  return J([])}
 if(u.includes("leadconnectorhq.com")){
  if(u.includes("/conversations/search"))return J({conversations:[{id:"c1"}]});
  if(u.includes("/conversations/c1/messages"))return J({messages:{messages:convo}});
  if(u.includes("/conversations/messages")&&m==="POST"){sent.push(body);return J({messageId:"m-out"})}
  if(u.match(/\/contacts\/[^/]+\/appointments/))return J({events:appts});
  if(u.match(/\/contacts\/[^/]+$/))return J({contact:contactData});
  return J({})}
 if(u.includes("api.anthropic.com")){{const _s=JSON.parse(o.body).system;if(/QA reviewer/.test(_s))return J({content:[{type:"text",text:"{\"verdict\":\"ok\",\"notes\":\"fine\"}"}],stop_reason:"end_turn"});lastSystem=_s;}return J({content:[{type:"text",text:typeof modelReply==="string"?modelReply:JSON.stringify(modelReply)}],stop_reason:"end_turn"})}
 if(u.includes("api.telegram.org")){tgSent.push(body);return J({ok:true,result:{message_id:900+tgSent.length}})}
 return J({})};
const w=(await import(process.argv[2]||"/home/claude/w/worker.mjs")).default;
const run=async(at)=>{const r=await w.fetch(new Request("https://studioflowandsystems.app/api/v1/inbox/ghl/"+KEY+"?run=followups&at="+encodeURIComponent(at)),env,{waitUntil(){}});return r.json()};
const hook=async(b,key=KEY)=>{const jobs=[];const r=await w.fetch(new Request("https://studioflowandsystems.app/api/v1/inbox/ghl/"+key,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)}),env,{waitUntil(p){jobs.push(p)}});await Promise.all(jobs);return r};

const hoursAgo=(h)=>new Date(Date.now()-h*36e5).toISOString();
// Tuesday 10:30am Brisbane = 00:30 UTC Tuesday
const TUE=(()=>{const d=new Date();d.setUTCHours(0,30,0,0);while(d.getUTCDay()!==2)d.setUTCDate(d.getUTCDate()+1);return d})();
const ago=(h)=>new Date(TUE.getTime()-h*36e5).toISOString();
const seed=(h,extra={})=>({id:"s1",type:"lead_seed",status:"done",created_at:ago(h),params:{contact_id:"ct1",contact_name:"Sarah K",email:"sarah@clinic.com.au",phone:"+61400000000",interest:"AI receptionist",message_from_lead:"We miss calls all day",source:"website",...extra}});

// 1) Website lead, 26 hours old, no SMS number yet → email follow-up 1, waiting for approval
reset({followup:"approve"},[],"Subject: Quick one about missed calls\n\nHi Sarah,\n\nYou mentioned calls slipping through. Is that mostly during appointments?");
state.actions.push(seed(26));appts=[];contactData={id:"ct1",firstName:"Sarah",email:"sarah@clinic.com.au",phone:"+61400000000",tags:[]};
let r=await run(TUE.toISOString());
let f=state.actions.filter(a=>a.type==="ghl_followup");
assert(r.made===1&&f.length===1&&f[0].status==="pending","Website lead gets follow-up 1 after a day, waiting for Ty");
assert(f[0].params.send_type==="Email"&&f[0].params.subject==="Quick one about missed calls"&&!/Subject:/.test(f[0].params.message),"No SMS number yet: goes by email with a proper subject");
assert(/follow-up 1/i.test(lastSystem)&&/Reflect first/.test(lastSystem),"Written in the same human style, told it's follow-up 1");
assert(sent.length===0&&f[0].params.tg_msg,"Nothing sent before approval; Telegram card sent");
r=await run(TUE.toISOString());
assert(state.actions.filter(a=>a.type==="ghl_followup").length===1,"No second draft while one is waiting");

// 2) Too soon (10 hours) → nothing
reset({followup:"approve"},[],"x");state.actions.push(seed(10));
r=await run(TUE.toISOString());assert(r.made===0,"Not before a day has passed");

// 3) Booked → stop
reset({followup:"auto"},[],"x");state.actions.push(seed(30));appts=[{startTime:new Date(TUE.getTime()+2*864e5).toISOString(),appointmentStatus:"confirmed"}];
r=await run(TUE.toISOString());assert(r.made===0,"Stops once they've booked a call");appts=[];

// 4) Sunday / night → nothing
reset({followup:"auto"},[],"x");state.actions.push(seed(30));
r=await run(new Date(TUE.getTime()-2*864e5).toISOString());assert(r.made===0||r.skipped,"No follow-ups on Sundays");
r=await run(new Date(TUE.getTime()+12*36e5).toISOString());assert(r.skipped,"No follow-ups at night");

// 5) SMS live + auto → sent as SMS
reset({followup:"auto",sms_live:true,sms:"approve"},[],"Hey Sarah, still chasing those missed calls? Happy to show you how we'd catch them.");state.actions.push(seed(28));
r=await run(TUE.toISOString());
assert(sent.length===1&&sent[0].type==="SMS"&&state.actions.find(a=>a.type==="ghl_followup").status==="done","Auto mode with SMS live: follow-up texted");

// 6) Third follow-up then stop
reset({followup:"approve"},[],"x");state.actions.push(seed(8*24));
state.actions.push({id:"f1",type:"ghl_followup",status:"done",created_at:ago(7*24-2),params:{kind:"followup",contact_id:"ct1"}},{id:"f2",type:"ghl_followup",status:"done",created_at:ago(5*24),params:{kind:"followup",contact_id:"ct1"}});
modelReply="Subject: Leaving it with you\n\nHi Sarah,\n\nI'll leave it with you.";
r=await run(TUE.toISOString());let f3=state.actions.filter(a=>a.type==="ghl_followup"&&a.status==="pending");
assert(f3.length===1&&f3[0].params.step===3&&/the last one/.test(lastSystem),"Day 7: third and last check-in");
f3[0].status="done";r=await run(new Date(TUE.getTime()+3*864e5).toISOString());
assert(state.actions.filter(a=>a.type==="ghl_followup").length===3,"Never more than 3");

// 7) Instagram conversation: one nudge inside 24h, never after
const ig=(h)=>({id:"r1",type:"ghl_reply",status:"done",created_at:ago(h),params:{contact_id:"ct1",contact_name:"Sarah",channel:"ig",inbound:"How much for a site?"}});
reset({followup:"approve"},[{id:"i1",direction:"inbound",body:"How much for a site?",messageType:"TYPE_INSTAGRAM",dateAdded:ago(20)},{id:"o1",direction:"outbound",body:"What's the business?",messageType:"TYPE_INSTAGRAM",dateAdded:ago(19.9)}],"Hey, just checking in. What's the business?");
state.actions.push(ig(19.9));
r=await run(TUE.toISOString());assert(state.actions.filter(a=>a.type==="ghl_followup").length===1&&state.actions.find(a=>a.type==="ghl_followup").params.send_type==="IG","Instagram: one nudge inside the 24-hour window");
reset({followup:"approve"},[{id:"i1",direction:"inbound",body:"hi",messageType:"TYPE_INSTAGRAM",dateAdded:ago(30)},{id:"o1",direction:"outbound",body:"hey",messageType:"TYPE_INSTAGRAM",dateAdded:ago(29.9)}],"x");state.actions.push(ig(29.9));
r=await run(TUE.toISOString());assert(r.made===0,"Instagram: nothing after 24 hours (Meta rule)");

// 8) They replied → follow-ups wait (reply flow handles it); hand-off tag → never
reset({followup:"auto"},[{id:"i2",direction:"inbound",body:"yes keen",messageType:"TYPE_SMS",dateAdded:ago(1)}],"x");state.actions.push({id:"r2",type:"ghl_reply",status:"done",created_at:ago(30),params:{contact_id:"ct1",channel:"sms"}});
r=await run(TUE.toISOString());assert(r.made===0,"They spoke last: no follow-up");
reset({followup:"auto"},[],"x");state.actions.push(seed(30));contactData={...contactData,tags:["needs-ty"]};
r=await run(TUE.toISOString());assert(r.made===0,"Tagged needs-ty: never followed up");contactData={...contactData,tags:[]};

// 9) Review request from a GHL workflow event
reset({reviews:"approve",review_flow:"command",review_link:"https://g.page/r/abc123/review"},[],"Subject: Thank you, Sarah\n\nHi Sarah,\n\nLoved working with you. Would you mind leaving a quick review?\n\nTy");
await hook({contact_id:"ct1",customData:{event:"review"}});
let rv=state.actions.filter(a=>a.params?.kind==="review");
assert(rv.length===1&&rv[0].status==="pending"&&rv[0].params.message.includes("https://g.page/r/abc123/review"),"Review request drafted with the Google link");
await hook({contact_id:"ct1",customData:{event:"review"}});
assert(state.actions.filter(a=>a.params?.kind==="review").length===1,"Only ever one review request per person");
reset({reviews:"approve"},[],"x");await hook({contact_id:"ct1",customData:{event:"review"}});
assert(!state.actions.some(a=>a.params?.kind==="review"),"No review link set: nothing drafted");

// 10) Approving sends on the right channel
reset({reviews:"auto",review_flow:"command",review_link:"https://g.page/r/abc123/review"},[],"Subject: Thanks\n\nHi Sarah,\n\nThanks heaps!\n\nTy");
await hook({contact_id:"ct1",customData:{event:"review"}});
assert(sent.length===1&&sent[0].type==="Email"&&sent[0].subject==="Thanks"&&/g\.page/.test(sent[0].html),"Auto review request emailed with the link");

// 11) Settings + panel
r=await w.fetch(new Request("https://studioflowandsystems.app/app/app.js"),env,{waitUntil(){}});const js=await r.text();
try{new Function(js);console.log("✓ Command app script parses")}catch(e){console.error("FAIL: app.js",e.message);process.exit(1)}
assert(/Follow-ups until they book/.test(js)&&/ib_smslive/.test(js)&&/ib_review/.test(js),"Autopilot panel has follow-ups, reviews, SMS switch and review link");
console.log("All v29 follow-up and review tests passed.");
