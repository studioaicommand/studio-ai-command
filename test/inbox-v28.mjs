// v28 Command Inbox tests: GHL webhook → Command reply (approve / auto / hand-off / quiet / dupes) + app panel.
const assert=(c,m)=>{if(!c){console.error("FAIL:",m);process.exit(1)}console.log("✓",m)};
const crypto=await import("crypto");
const env={SUPABASE_URL:"https://sb.test",SUPABASE_SECRET_KEY:"s",GHL_TOKEN:"g",GHL_LOCATION_ID:"loc",ANTHROPIC_API_KEY:"a",COMMAND_2FA: "off", STUDIO_TEST_KEY: "teamkey",TELEGRAM_BOT_TOKEN:"t",INBOX_DEBUG:"1"};
const KEY=crypto.createHash("sha256").update("inbox:teamkey").digest("hex").slice(0,28);
let state, sent, modelReply, convo, lastSystem="", tgSent=[];
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
   return J(state.actions)}
  return J([])}
 if(u.includes("leadconnectorhq.com")){
  if(u.includes("/conversations/search"))return J({conversations:[{id:"c1"}]});
  if(u.includes("/conversations/c1/messages"))return J({messages:{messages:convo}});
  if(u.includes("/conversations/messages")&&m==="POST"){sent.push(body);return J({messageId:"m-out"})}
  if(u.match(/\/contacts\/[^/]+$/))return J({contact:{id:"ct1",firstName:"Sarah"}});
  return J({})}
 if(u.includes("api.anthropic.com")){{const _s=JSON.parse(o.body).system;if(/QA reviewer/.test(_s))return J({content:[{type:"text",text:"{\"verdict\":\"ok\",\"notes\":\"fine\"}"}],stop_reason:"end_turn"});lastSystem=_s;}return J({content:[{type:"text",text:typeof modelReply==="string"?modelReply:JSON.stringify(modelReply)}],stop_reason:"end_turn"})}
 if(u.includes("api.telegram.org")){tgSent.push(body);return J({ok:true,result:{message_id:900+tgSent.length}})}
 return J({})};
const w=(await import(process.argv[2]||"/home/claude/w/worker.mjs")).default;
const hook=async(b,key=KEY)=>{const jobs=[];const r=await w.fetch(new Request("https://studioflowandsystems.app/api/v1/inbox/ghl/"+key,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)}),env,{waitUntil(p){jobs.push(p)}});await Promise.all(jobs);return r};
const inb=(id,body,type="TYPE_INSTAGRAM",mins=1)=>({id,direction:"inbound",body,messageType:type,dateAdded:new Date(Date.now()-mins*6e4).toISOString()});

reset({ig:"approve",sms:"approve",fb:"approve",chat:"approve"},[inb("m1","Hi, how much is the AI receptionist?")],{reply:"Chat Receptionist is $497 to start, then $297 a month. Want to book a quick call?",handoff:false});
let r=await hook({contact_id:"ct1"});
assert(r.status===200,"Webhook accepted");
assert(state.actions.length===1&&state.actions[0].type==="ghl_reply"&&state.actions[0].status==="pending","Approve-first: reply waits for Ty");
assert(state.actions[0].params.send_type==="IG"&&/\$297/.test(state.actions[0].params.message),"Draft is an Instagram reply with the right price");
assert(sent.length===0,"Nothing sent before approval");
await hook({contact_id:"ct1"});
assert(state.actions.length===1,"Same message never handled twice");

reset({ig:"auto",sms:"approve",fb:"approve",chat:"approve"},[inb("m2","Do you build websites for salons?")],{reply:"Yes, we do. Want to see a few?",handoff:false});
await hook({contact_id:"ct1"});
assert(sent.length===1&&sent[0].type==="IG"&&sent[0].contactId==="ct1","Auto-send: reply sent on Instagram");
assert(state.actions[0].status==="done","Auto-send logged as done");

reset({sms:"auto",ig:"auto",fb:"auto",chat:"auto"},[inb("m3","I want a refund","TYPE_SMS")],{reply:"",handoff:true,reason:"refund request"});
await hook({contact_id:"ct1"});
assert(sent.length===0,"Hand-off: nothing sent to a refund request");
assert(state.actions[0].params.handoff===true&&/Needs you/.test(state.actions[0].title),"Hand-off card for Ty");

reset({fb:"auto",ig:"auto",sms:"auto",chat:"auto"},[{id:"o1",direction:"outbound",userId:"ty",body:"Hey, Ty here",messageType:"TYPE_FACEBOOK",dateAdded:new Date(Date.now()-10*6e4).toISOString()},inb("m4","Thanks Ty!","TYPE_FACEBOOK")],{reply:"You're welcome",handoff:false});
await hook({contact_id:"ct1"});
assert(sent.length===0&&state.actions.length===0,"Command stays quiet when Ty replied recently");

reset({fb:"auto",ig:"auto",sms:"auto",chat:"auto"},[inb("m5","hello","TYPE_FACEBOOK"),{id:"o2",direction:"outbound",body:"Hi!",messageType:"TYPE_FACEBOOK",dateAdded:new Date().toISOString()}],{reply:"x",handoff:false});
await hook({contact_id:"ct1"});
assert(sent.length===0,"No reply when the last message is already ours");

reset({sms:"off",ig:"auto",fb:"auto",chat:"auto"},[inb("m6","hi","TYPE_SMS")],{reply:"hi",handoff:false});
await hook({contact_id:"ct1"});
assert(sent.length===0&&state.actions.length===0,"Channel switched off: ignored");

r=await hook({contact_id:"ct1"},"wrongkey");
assert(r.status===404,"Wrong webhook key refused");

reset({},[inb("m7","STOP","TYPE_SMS")],{reply:"ok",handoff:false});
await hook({contact_id:"ct1"});
assert(state.actions.length===0,"Opt-out words never answered");


// Model writes a real line break inside the JSON string: still a reply, not a hand-off.
reset({ig:"approve",sms:"approve",fb:"approve",chat:"approve"},[inb("m8","Do you build command centres?")],'{"reply": "Yes, we do.\nWant to book a call?", "handoff": false}');
await hook({contact_id:"ct1"});
assert(state.actions[0]&&!state.actions[0].params.handoff&&/Yes, we do/.test(state.actions[0].params.message),"Messy JSON from the model still becomes a reply");
assert(/Reflect first/.test(lastSystem)&&/blank line between them/.test(lastSystem)&&/Feels heard/.test(lastSystem),"Replies are told to reflect, space out and walk cold to booked");
assert(/CURRENT PRODUCTS AND PRICES/.test(lastSystem)&&/Command Centre/.test(lastSystem),"Replies know every product on the Offers page");
assert(state.actions[0].params.tg_msg,"Telegram card remembered so Ty can reply to it");
const SECRET=crypto.createHash("sha256").update("teamkey|telegram").digest("hex").slice(0,48);
const tgPost=(m)=>w.fetch(new Request("https://studioflowandsystems.app/api/v1/telegram/hook",{method:"POST",headers:{"content-type":"application/json","X-Telegram-Bot-Api-Secret-Token":SECRET},body:JSON.stringify({update_id:7,message:{message_id:55,chat:{id:42},from:{username:"ty"},text:m,reply_to_message:{message_id:state.actions[0].params.tg_msg}}})}),env,{waitUntil(){}});
modelReply={reply:"Yes! We build private command centres from A$X, quoted on a call. Book here: link",handoff:false};
await tgPost("tell them yes, quoted on a call, and send the booking link");
assert(/TY \(THE OWNER\) HAS TOLD YOU/.test(lastSystem)&&/booking link/.test(lastSystem),"Ty's Telegram reply becomes Command's direction");
assert(state.actions[0].status==="pending"&&/private command centres/.test(state.actions[0].params.message)&&sent.length===0,"Rewritten draft waits for one more tap");
assert(tgSent.some(t=>/private command centres/.test(t.text||"")),"New draft sent back to Telegram");
await tgPost("send: Yes we do! Book a call: https://example.com");
assert(sent.length===1&&sent[0].message==="Yes we do! Book a call: https://example.com"&&state.actions[0].status==="done","\"send:\" sends Ty's exact words");
r=await w.fetch(new Request("https://studioflowandsystems.app/app/app.js"),env,{waitUntil(){}});const js=await r.text();
try{new Function(js);console.log("✓ Command app script parses ("+js.length+" chars)")}catch(e){console.error("FAIL: app.js",e.message);process.exit(1)}
assert(/Message replies \(SMS, Instagram, Facebook, web chat\)/.test(js)&&/ibSave/.test(js)&&/api\/v1\/inbox\/ghl\//.test(js),"Autopilot has the Message replies panel + webhook URL");
console.log("All v28 inbox tests passed.");
