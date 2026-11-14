// v92: reels, shared posts and attachments in Instagram and Facebook DMs: Command decides if it is a lead before it bothers Ty.
const assert=(c,m)=>{if(!c){console.error("FAIL:",m);process.exit(1)}console.log("✓",m)};
const crypto=await import("crypto");
const env={SUPABASE_URL:"https://sb.test",SUPABASE_SECRET_KEY:"s",GHL_TOKEN:"g",GHL_LOCATION_ID:"loc",ANTHROPIC_API_KEY:"a",COMMAND_2FA: "off", STUDIO_TEST_KEY: "teamkey",TELEGRAM_BOT_TOKEN:"t",INBOX_DEBUG:"1"};
const KEY=crypto.createHash("sha256").update("inbox:teamkey").digest("hex").slice(0,28);
let state, sent, modelReply, convo, lastSystem="", tgSent=[], lead={lead:false,needs_ty:false,why:"a shared reel, no question"}, leadAsks=0, notes=[];
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
  if(u.match(/\/contacts\/[^/]+\/notes/)&&m==="POST"){notes.push(body&&body.body);return J({note:{id:"n1"}})}
  if(u.match(/\/contacts\/[^/]+$/))return J({contact:{id:"ct1",firstName:"Sarah"}});
  return J({})}
 if(u.includes("api.anthropic.com")){const b=JSON.parse(o.body);if((b.tools||[]).some(t=>t.name==="lead_check")){leadAsks++;return J({content:[{type:"tool_use",id:"t1",name:"lead_check",input:lead}],stop_reason:"tool_use",usage:{input_tokens:300,output_tokens:20}})}const _s=b.system;if(/QA reviewer/.test(_s))return J({content:[{type:"text",text:"{\"verdict\":\"ok\",\"notes\":\"fine\"}"}],stop_reason:"end_turn"});lastSystem=_s;return J({content:[{type:"text",text:typeof modelReply==="string"?modelReply:JSON.stringify(modelReply)}],stop_reason:"end_turn"})}
 if(u.includes("api.telegram.org")){tgSent.push(body);return J({ok:true,result:{message_id:900+tgSent.length}})}
 return J({})};
const w=(await import(process.argv[2]||"/home/claude/w/worker.mjs")).default;
const hook=async(b,key=KEY)=>{const jobs=[];const r=await w.fetch(new Request("https://studioflowandsystems.app/api/v1/inbox/ghl/"+key,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)}),env,{waitUntil(p){jobs.push(p)}});await Promise.all(jobs);return r};
const quiet=()=>(state.settings.find(x=>x.key==="inbox_quiet")||{value:{items:[]}}).value.items;
const inb=(id,body,type="TYPE_INSTAGRAM",mins=1)=>({id,direction:"inbound",body,messageType:type,dateAdded:new Date(Date.now()-mins*6e4).toISOString()});

reset({ig:"approve",sms:"approve",fb:"approve",chat:"approve"},[inb("m1","https://www.instagram.com/reel/DAbc123/")],{reply:"",handoff:true,reason:"personal or not about the business"});
await hook({contact_id:"ct1"});
assert(leadAsks===1&&state.actions.length===0&&tgSent.length===0,"A reel on its own (the lady in the red dress) doesn't come to Ty on Telegram");
assert(quiet().length===1&&notes.some(n=>/didn't bother Ty/.test(n)),"It's noted on the contact and in the quiet list instead");

reset({ig:"approve",sms:"approve",fb:"approve",chat:"approve"},[{...inb("m2","Codei sent an attachment","TYPE_FACEBOOK"),attachments:["https://scontent.xx.fbcdn.net/v/x.jpg"]}],{reply:"Ha nice one",handoff:false});
await hook({contact_id:"ct1"});
assert(state.actions.length===0&&tgSent.length===0,"A photo or attachment with no question doesn't ask Ty either");

lead={lead:true,needs_ty:false,why:"asks what it would cost"};
reset({ig:"approve",sms:"approve",fb:"approve",chat:"approve"},[inb("m3","https://www.instagram.com/reel/DXyz/ could you build me something like this?")],{reply:"Yes we can! Want a quick call to look at it?",handoff:false});
await hook({contact_id:"ct1"});
assert(state.actions.length===1&&state.actions[0].type==="ghl_reply"&&tgSent.length===1,"A reel that comes with a real enquiry still comes to Ty");

lead={lead:false,needs_ty:false,why:"birthday wishes"};
reset({ig:"approve",sms:"approve",fb:"approve",chat:"approve"},[inb("m4","Happy birthday mate!! hope you have the best day")],{reply:"",handoff:true,reason:"it is personal or not about the business"});
await hook({contact_id:"ct1"});
assert(state.actions.length===0&&tgSent.length===0,"Friendly chit-chat that isn't a lead doesn't page Ty");

leadAsks=0;
reset({ig:"approve",sms:"approve",fb:"approve",chat:"approve"},[inb("m5","I want a refund, the site has been down all day")],{reply:"",handoff:true,reason:"refund and a complaint"});
await hook({contact_id:"ct1"});
assert(leadAsks===0&&state.actions.length===1&&state.actions[0].params.handoff&&tgSent.length===1,"Complaints and refunds always go straight to Ty (no check needed)");
convo=[inb("m6","Hello?? are you there")];
await hook({contact_id:"ct1"});
assert(state.actions.length===1&&tgSent.length===1,"No second Telegram while Ty already has an open card for the same person");
console.log("v92 leads OK");
