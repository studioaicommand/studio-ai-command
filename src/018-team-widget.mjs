// src/team/widget.js
var CLIENT_DAILY_LIMIT = 800;
var SESSION_LIMIT = 40;
var ACTIVE = /* @__PURE__ */ new Set(["onboarding", "live"]);
var model = (env) => env.FRONT_DESK_MODEL || env.DEMO_MODEL || "claude-haiku-5-5";
var esc4 = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var brisDay = () => (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });
var LEAD_TOOL = {
  name: "pass_to_team",
  description: "Pass an enquiry to the business's team. Use ONLY once you have the person's name AND a phone number or email, and they want a booking, a callback, or something you couldn't answer. Then tell them warmly the team will be in touch.",
  input_schema: { type: "object", properties: {
    name: { type: "string" },
    phone: { type: "string" },
    email: { type: "string" },
    reason: { type: "string", description: "What they need, in one line (e.g. 'Wants a balayage on Saturday morning')." },
    preferred_time: { type: "string" },
    urgent: { type: "boolean", description: "True only if they said it's urgent." }
  }, required: ["name", "reason"] }
};

var SAFE_LINES = ["131114", "131126", "1300224636", "1800551800", "1800737732", "132281", "1800022222"];
function guardPhones(reply, allowedText) {
  const digits = (x) => String(x).replace(/\D/g, "");
  const allowed = new Set([...SAFE_LINES]);
  for (const m of String(allowedText || "").matchAll(/(?:\+?61|0)[\d\s().-]{7,16}\d|1[38]00[\d\s-]{5,9}\d|13[\d\s]{4,6}\d/g)) allowed.add(digits(m[0]).replace(/^61/, "0"));
  const re = /(?:\+?61|0)[\d\s().-]{7,16}\d|1[38]00[\d\s-]{5,9}\d/g;
  let removed = false;
  const parts = String(reply).split(/(?<=[.!?])\s+|\n/);
  const kept = parts.filter((p) => {
    for (const m of p.matchAll(re)) {
      const d = digits(m[0]).replace(/^61/, "0");
      if (d.length < 8) continue;
      if (!allowed.has(d) || /^0?4?0{6,}$|(\d)\1{6,}/.test(d)) { removed = true; return false; }
    }
    return true;
  });
  return removed ? kept.join(" ").replace(/\s{2,}/g, " ").trim() : reply;
}
async function frontDeskReply(env, c, msgs, { dry = false } = {}) {
  const system = [{ type: "text", text: receptionistPrompt(c.kb || {}, "chat", { live: true, extra: c.extra_facts || "", vertical: c.vertical, knowledge: c.knowledge, assistant: c.look?.name }), cache_control: { type: "ephemeral" } }];
  const usage = { in: 0, out: 0 };
  const add = (u) => {
    usage.in += (u?.input_tokens || 0) + (u?.cache_read_input_tokens || 0) + (u?.cache_creation_input_tokens || 0);
    usage.out += u?.output_tokens || 0;
  };
  const ask = (messages) => callClaude(env, { model: model(env), max_tokens: 2000, system, tools: [LEAD_TOOL], messages }).catch(() => callClaude(env, { model: env.TEAM_MODEL || "claude-sonnet-5-5", max_tokens: 2000, system, tools: [LEAD_TOOL], messages }));
  let r = await ask(msgs);
  add(r.usage);
  let lead = null;
  const call2 = (r.content || []).find((b) => b.type === "tool_use" && b.name === "pass_to_team");
  if (call2) {
    const i = call2.input || {};
    lead = { name: String(i.name || "").slice(0, 80), phone: String(i.phone || "").slice(0, 30), email: String(i.email || "").slice(0, 120), reason: String(i.reason || "").slice(0, 300), preferred_time: String(i.preferred_time || "").slice(0, 80), urgent: !!i.urgent };
    if (!lead.phone && !lead.email) lead = null;
    const result = lead ? "Passed to the team. Now tell them warmly that the team will be in touch soon." : "Not passed: you still need a phone number or email. Ask for it.";
    r = await ask([...msgs, { role: "assistant", content: r.content }, { role: "user", content: [{ type: "tool_result", tool_use_id: call2.id, content: result }] }]);
    add(r.usage);
  }
  const text = (r.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s*/gm, "").replace(/^\s*[-*]\s+/gm, "\u2022 ").trim();
  const known = JSON.stringify(c.kb || {}) + " " + knowledgeText(c.knowledge) + " " + (c.extra_facts || "") + " " + msgs.filter((m) => m.role === "user").map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)).join(" ");
  let whole = text;
  if (r.stop_reason === "max_tokens" && whole && !/[.!?)]\s*$/.test(whole)) { const cut = whole.match(/^[\s\S]*[.!?](?=\s|$)/); whole = cut ? cut[0] : whole; }
  const safe = guardPhones(whole, known);
  return { reply: safe || "Sorry, could you say that another way?", lead, usage };
}
async function widgetPublic(request, env, url, ctx) {
  const parts = url.pathname.split("/").filter(Boolean);
  const isApi = parts[0] === "api";
  const keyRaw = isApi ? parts[3] : parts[1] || "";
  const key = keyRaw.replace(/\.js$/, "");
  if (/^demo-[a-z0-9-]{3,60}$/.test(key)) return wsdWidget(request, env, url, ctx, parts, isApi, keyRaw, key);
  const c = await clientByKey(env, key);
  const nf = (msg = "Not found") => new Response(msg, { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" } });
  if (!isApi && keyRaw.endsWith(".js")) return loaderResponse(env, url, c);
  if (!c) return nf();
  if (!isApi && !parts[2]) return panelResponse(env, url, c);
  if (!isApi && parts[2] === "test") return testPage(env, url, c);
  if (!isApi) return nf();
  if (request.method === "OPTIONS") return new Response(null, { headers: cors() });
  if (request.method !== "POST") return nf();
  if (parts[4] === "ping") return ping(request, env, c, ctx);
  if (parts[4] === "chat") return chat(request, env, url, c, ctx);
  if (parts[4] === "voice") return voiceStart(request, env, url, c, ctx);
  if (parts[4] === "voice-lead") return voiceLead(request, env, url, c, ctx);
  if (parts[4] === "voice-end") return voiceEnd(request, env, url, c, ctx);
  return nf();
}
var cors = () => ({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" });
async function ping(request, env, c, ctx) {
  let b = {};
  try {
    b = JSON.parse((await request.text()).slice(0, 2e3));
  } catch {
  }
  const page = String(b.page || "").slice(0, 500);
  let host2 = "";
  try {
    host2 = new URL(page).hostname;
  } catch {
  }
  const ours = !host2 || /workers\.dev$|studioflowandsystems\.app$|^localhost$/.test(host2) || b.preview;
  if (!ours) {
    const patch = { last_seen_at: now() };
    if (!c.checklist?.installed) {
      patch.installed_url = page;
      patch.installed_at = now();
      patch.checklist = { ...c.checklist || {}, installed: true };
    }
    const work = (async () => {
      await update(env, "agent_clients", `id=eq.${c.id}`, patch).catch(() => {
      });
      if (!c.checklist?.installed) await notify(env, `\u2705 <b>${esc4(c.business_name)}'s receptionist is installed</b> on ${esc4(host2)}.`, { urgent: false }).catch(() => {
      });
    })();
    ctx?.waitUntil ? ctx.waitUntil(work) : await work;
  }
  return Response.json({ ok: true }, { headers: cors() });
}
async function chat(request, env, url, c, ctx) {
  const json2 = (o, s = 200) => Response.json(o, { status: s, headers: { ...cors(), "Cache-Control": "no-store" } });
  if (!ACTIVE.has(c.status)) return json2({ ok: true, reply: "Sorry, our online assistant is unavailable right now. Please call or email us and the team will help." });
  let b;
  try {
    b = JSON.parse((await request.text()).slice(0, 24e3));
  } catch {
    return json2({ ok: false, error: "Invalid message." }, 400);
  }
  const session = /^[a-z0-9]{12,40}$/i.test(b.session || "") ? b.session : null;
  if (!session) return json2({ ok: false, error: "Invalid session." }, 400);
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-14).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 700) })).filter((m) => m.content.trim());
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json2({ ok: false, error: "Type a message." }, 400);
  const preview2 = url.searchParams.get("preview") === "1" || !!b.preview;
  const day = brisDay(), used = c.day === day ? c.day_count || 0 : 0;
  if (used >= CLIENT_DAILY_LIMIT) return json2({ ok: true, reply: "Sorry, our online assistant is very busy right now. Please call us and the team will help." });
  const [conv] = await select(env, "client_conversations", `client_id=eq.${c.id}&session=eq.${session}&limit=1`).catch(() => []);
  if ((conv?.messages || []).length >= SESSION_LIMIT * 2) return json2({ ok: true, reply: "We've covered a lot! To keep things simple, please call us or leave your name and number and the team will get back to you." });
  let out;
  try {
    out = await frontDeskReply(env, c, msgs);
  } catch (e) {
    return json2({ ok: true, reply: "Sorry, I'm having trouble right now. Please try again in a moment, or call us." });
  }
  const last = msgs[msgs.length - 1].content;
  const messages = [...conv?.messages || [], { r: "u", t: last.slice(0, 700), at: now() }, { r: "a", t: out.reply.slice(0, 900), at: now() }].slice(-SESSION_LIMIT * 2);
  const cost = convCost(out.usage.in, out.usage.out);
  const row = { client_id: c.id, session, last_at: now(), page: String(b.page || conv?.page || "").slice(0, 300) || null, messages, cost_aud: Math.round(((+conv?.cost_aud || 0) + cost) * 1e4) / 1e4, preview: preview2 };
  const work = (async () => {
    if (conv) await update(env, "client_conversations", `id=eq.${conv.id}`, row).catch(() => {
    });
    else await insert(env, "client_conversations", [{ ...row, started_at: now() }]).catch(() => {
    });
    await update(env, "agent_clients", `id=eq.${c.id}`, { day, day_count: used + 1, last_chat_at: now() }).catch(() => {
    });
    if (out.lead) {
      const alert = preview2 ? { email: "preview: not sent", sms: "preview: not sent" } : await sendLeadAlert(env, c, out.lead).catch((e) => ({ email: String(e.message).slice(0, 100), sms: null }));
      await update(env, "client_conversations", `client_id=eq.${c.id}&session=eq.${session}`, { lead: { ...out.lead, alert }, lead_at: now(), escalated: !!out.lead.urgent }).catch(() => {
      });
      if (!preview2) {
        const firstEver = (await select(env, "client_conversations", `client_id=eq.${c.id}&lead_at=not.is.null&preview=eq.false&select=id&limit=2`).catch(() => [])).length === 1;
        const patch = { checklist: { ...c.checklist || {}, test_enquiry: true } };
        await update(env, "agent_clients", `id=eq.${c.id}`, patch).catch(() => {
        });
        if (firstEver) await notify(env, `\u{1F389} <b>${esc4(c.business_name)}'s receptionist captured its first lead:</b> ${esc4(out.lead.name)}, \u201C${esc4(out.lead.reason)}\u201D. Their team has been alerted.`, { urgent: false }).catch(() => {
        });
      }
    }
  })();
  ctx?.waitUntil ? ctx.waitUntil(work) : await work;
  return json2({ ok: true, reply: out.reply, lead: !!out.lead });
}
var CLIENT_VOICE_DAILY = 20;
var VOICE_MONTHLY_CAP_AUD = 40;
var CLIENT_VOICE_MAX_SECONDS = 300;
var dayStartIso = () => {
  const b = new Date(Date.now() + 10 * 36e5);
  b.setUTCHours(0, 0, 0, 0);
  return new Date(b.getTime() - 10 * 36e5).toISOString();
};
var vSession = (s) => /^v[a-z0-9]{12,40}$/i.test(s || "") ? s : null;
async function voiceStart(request, env, url, c, ctx) {
  const jerr2 = (error, status) => Response.json({ ok: false, error }, { status, headers: cors() });
  if (!ACTIVE.has(c.status)) return jerr2("Voice is unavailable right now.", 503);
  if (!env.OPENAI_API_KEY || !c.voice_enabled) return jerr2("Voice isn't switched on for this receptionist.", 403);
  const sdp = (await request.text()).slice(0, 2e4);
  if (!sdp.startsWith("v=0") || !sdp.includes("m=audio")) return jerr2("Invalid voice connection.", 400);
  const today = await select(env, "client_conversations", `client_id=eq.${c.id}&session=like.v*&started_at=gte.${dayStartIso()}&select=id&limit=${CLIENT_VOICE_DAILY + 1}`).catch(() => []);
  if (today.length >= CLIENT_VOICE_DAILY) return jerr2("Voice is very busy right now: please type your message instead.", 429);
  const ms = (() => {
    const b = new Date(Date.now() + 10 * 36e5);
    b.setUTCDate(1);
    b.setUTCHours(0, 0, 0, 0);
    return new Date(b.getTime() - 10 * 36e5).toISOString();
  })();
  const month = await select(env, "client_conversations", `client_id=eq.${c.id}&session=like.v*&started_at=gte.${ms}&select=cost_aud&limit=5000`).catch(() => []);
  const cap2 = Number.isFinite(+env.VOICE_MONTHLY_CAP_AUD) ? +env.VOICE_MONTHLY_CAP_AUD : VOICE_MONTHLY_CAP_AUD;
  if (month.reduce((a, x) => a + (+x.cost_aud || 0), 0) >= cap2) return jerr2("Voice is resting for now: please type your message and I'll help straight away.", 429);
  const form2 = new FormData();
  form2.set("sdp", sdp);
  form2.set("session", JSON.stringify({
    type: "realtime",
    model: env.CLIENT_VOICE_MODEL || "gpt-realtime-2.1",
    instructions: receptionistPrompt(c.kb || {}, "voice", { live: true, extra: c.extra_facts || "", vertical: c.vertical, knowledge: c.knowledge, assistant: c.look?.name }),
    max_output_tokens: 400,
    tools: [{ type: "function", name: LEAD_TOOL.name, description: LEAD_TOOL.description, parameters: LEAD_TOOL.input_schema }],
    tool_choice: "auto",
    audio: { input: realtimeInput(env, { transcription: { model: (globalThis.__SF_TRANSCRIBE || "gpt-transcribe") } }), output: { voice: await clientVoiceFor(env, c) } }
  }));
  const r = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", headers: { Authorization: "Bearer " + env.OPENAI_API_KEY }, body: form2, signal: AbortSignal.timeout(3e4) }).catch(() => null);
  if (!r || !r.ok) return jerr2("Voice is busy right now: please try again or type instead.", 502);
  return new Response(await r.text(), { headers: { ...cors(), "Content-Type": "application/sdp", "Cache-Control": "no-store" } });
}
async function voiceLead(request, env, url, c, ctx) {
  let b = {};
  try {
    b = JSON.parse((await request.text()).slice(0, 4e3));
  } catch {
  }
  const session = vSession(b.session);
  if (!session || !ACTIVE.has(c.status)) return Response.json({ ok: false }, { status: 400, headers: cors() });
  const i = b.args || {};
  const lead = { name: String(i.name || "").slice(0, 80), phone: String(i.phone || "").slice(0, 30), email: String(i.email || "").slice(0, 120), reason: String(i.reason || "").slice(0, 300), preferred_time: String(i.preferred_time || "").slice(0, 80), urgent: !!i.urgent, channel: "voice" };
  if (!lead.name || !lead.phone && !lead.email) return Response.json({ ok: true, passed: false, output: "Not passed: you still need their name and a phone number or email." }, { headers: cors() });
  const preview2 = url.searchParams.get("preview") === "1" || !!b.preview;
  const [conv] = await select(env, "client_conversations", `client_id=eq.${c.id}&session=eq.${session}&limit=1`).catch(() => []);
  if (conv?.lead_at) return Response.json({ ok: true, passed: true, output: "Already passed to the team." }, { headers: cors() });
  const alert = preview2 ? { email: "preview: not sent", sms: "preview: not sent" } : await sendLeadAlert(env, c, lead).catch((e) => ({ email: String(e.message).slice(0, 100), sms: null }));
  const row = { client_id: c.id, session, last_at: now(), lead: { ...lead, alert }, lead_at: now(), escalated: lead.urgent, preview: preview2, page: String(b.page || "").slice(0, 300) || null };
  if (conv) await update(env, "client_conversations", `id=eq.${conv.id}`, row).catch(() => {
  });
  else await insert(env, "client_conversations", [{ ...row, started_at: now(), messages: [] }]).catch(() => {
  });
  if (!preview2) await update(env, "agent_clients", `id=eq.${c.id}`, { checklist: { ...c.checklist || {}, test_enquiry: true } }).catch(() => {
  });
  return Response.json({ ok: true, passed: true, output: "Passed to the team. Tell them warmly the team will be in touch soon." }, { headers: cors() });
}
async function voiceEnd(request, env, url, c, ctx) {
  let b = {};
  try {
    b = JSON.parse((await request.text()).slice(0, 3e4));
  } catch {
  }
  const session = vSession(b.session);
  if (!session) return Response.json({ ok: false }, { status: 400, headers: cors() });
  const secs = Math.max(0, Math.min(CLIENT_VOICE_MAX_SECONDS + 30, +b.seconds || 0));
  const lines = (Array.isArray(b.transcript) ? b.transcript : []).slice(-80).map((x) => ({ r: x.r === "u" ? "u" : "a", t: "\u{1F399} " + String(x.t || "").slice(0, 600), at: now() })).filter((x) => x.t.length > 3);
  const preview2 = url.searchParams.get("preview") === "1" || !!b.preview;
  const cost = Math.round(secs / 60 * COST.voice_per_min * 1e4) / 1e4;
  const [conv] = await select(env, "client_conversations", `client_id=eq.${c.id}&session=eq.${session}&limit=1`).catch(() => []);
  const row = { client_id: c.id, session, last_at: now(), messages: [...conv?.messages || [], ...lines].slice(-SESSION_LIMIT * 2), cost_aud: Math.round(((+conv?.cost_aud || 0) + cost) * 1e4) / 1e4, preview: preview2, page: String(b.page || conv?.page || "").slice(0, 300) || null };
  if (conv) await update(env, "client_conversations", `id=eq.${conv.id}`, row).catch(() => {
  });
  else await insert(env, "client_conversations", [{ ...row, started_at: new Date(Date.now() - secs * 1e3).toISOString() }]).catch(() => {
  });
  return Response.json({ ok: true }, { headers: cors() });
}
function lookOf(c) {
  const kb = c.kb || {}, L = c.look || {};
  const name = shortName(kb.clinic_name || c.business_name);
  const col = usableColour(L.accent) || usableColour(kb.brand?.colour) || "#2F6FEB";
  return {
    name,
    col,
    logo: L.logo || kb.brand?.icon || "",
    assistant: L.name || "",
    theme: L.theme === "light" ? "light" : "dark",
    launcher: L.launcher || "",
    pos: L.position === "left" ? "left" : "right",
    greeting: L.greeting || `Hi, welcome to ${name}! ${L.name ? `I'm ${L.name}, ` : "I'm "}the AI receptionist. I can answer questions${kb.booking?.how || kb.booking?.url ? " and help you book" : ""}. How can I help?`,
    book: /^https:\/\//.test(kb.booking?.url || "") ? kb.booking.url : ""
  };
}
var ORB_ENGINE = "/* Studio receptionist orb: the Studio AI glass core, tinted with each business's brand colour.\n   ES5 so it runs on any client website. Usage: SFO.add(el, \"#hex\", {big:true}) ; SFO.state(\"speaking\") */\n(function(){if(window.SFO)return;\nvar N=400,P=null,orbs=[],st=\"idle\",t=0,ry=0,last=0,run=false,calm=false;\ntry{calm=matchMedia(\"(prefers-reduced-motion: reduce)\").matches}catch(e){}\nfunction hex(h){h=String(h||\"#2f6feb\").replace(\"#\",\"\");if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[0,2,4].map(function(i){return parseInt(h.slice(i,i+2),16)/255})}\nfunction toHsl(c){var r=c[0],g=c[1],b=c[2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,h=0,s=0;if(mx!==mn){var d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}return[h,s,l]}\nfunction fromHsl(x){var h=x[0],s=x[1],l=x[2];function f(n){var k=(n+h*12)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1))}return[f(0),f(8),f(4)]}\n/* keep the brand hue, guarantee enough colour + glow to read as a living orb */\nfunction pal(a){var A=toHsl(hex(a));var s=A[1]<.08?.18:Math.max(A[1],.55);return[fromHsl([A[0],s,Math.min(Math.max(A[2],.34),.46)]),fromHsl([(A[0]+.02)%1,Math.max(s*.85,.45),.74])]}\nvar VS=\"attribute vec2 a;varying vec2 p;uniform float S;void main(){p=a*S;gl_Position=vec4(a,0.,1.);}\";\nvar NOISE=\"vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i);vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}\";\nvar FS=\"precision highp float;varying vec2 p;uniform float T,L,E,Q;uniform vec3 C1,C2;uniform mat3 Rm;\"+NOISE+\"float ridge(vec3 q){return pow(1.-abs(snoise(q)),5.);}void main(){float r=length(p);float rr=1.+L*.05;vec3 col=vec3(0.);float a=0.;if(r<rr){vec2 u=p/rr;float z=sqrt(max(0.,1.-dot(u,u)));vec3 n=vec3(u,z);vec3 em=vec3(0.);float fl=T*(.10+E*.10);for(int k=0;k<3;k++){float d=float(k)/2.;vec3 q=Rm*vec3(u,z*(1.-d*1.6));float f=ridge(q*(2.3+d*.9)+vec3(0.,fl,fl*.6));f+=.5*ridge(q*(4.8+d)+vec3(fl*1.3,0.,-fl));f*=(.55+.75*Q);em+=mix(C1,C2,clamp(f*.9+d*.3,0.,1.))*f*(1.-d*.42);}em*=(.6+L*.55+E*.2);float fres=pow(1.-z,2.4);vec3 base=mix(C1*.10,C1*.30+vec3(.01,.02,.04),z*.6);vec3 Ld=normalize(vec3(-.45,.55,.7));float rd=max(dot(reflect(-Ld,n),vec3(0.,0.,1.)),0.);float spec=pow(rd,48.)*.9+pow(rd,8.)*.12;float core=exp(-dot(u,u)*3.2)*(.14+L*.22);col=base+em*(.35+.65*z)+C2*fres*(.9+L*.45)+vec3(1.)*spec+mix(C2,vec3(1.),.5)*core;col=1.-exp(-col*1.25);float edge=smoothstep(rr,rr-.012,r);a=edge;col*=edge;}float h=exp(-max(r-rr,0.)*5.5)*(.30+L*.28+Q*.08)*smoothstep(rr-.02,rr+.01,r)*smoothstep(1.4,1.12,r);col+=C2*h*.9;a=max(a,h*.7);gl_FragColor=vec4(col,clamp(a,0.,1.));}\";\nvar PVS=\"attribute vec3 a;attribute float s;uniform mat3 Rm;uniform float T,Px,L;varying float al;void main(){vec3 q=Rm*a;q*=1.+.04*sin(T*1.7+s*40.);float depth=q.z*.5+.5;float hide=(length(q.xy)<1.04&&q.z<0.)?0.:1.;al=hide*(.25+.75*depth)*(.35+L*.8);gl_Position=vec4(q.xy/1.4,0.,1.);gl_PointSize=Px*(.6+s*1.6)*(.7+depth*.6);}\";\nvar PFS=\"precision mediump float;varying float al;uniform vec3 C2;void main(){vec2 d=gl_PointCoord-.5;float f=smoothstep(.5,0.,length(d));gl_FragColor=vec4(C2*f*al,f*al);}\";\nvar AC=null,AN=[],amp=null;\nfunction meter(stream,kind){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.resume)AC.resume();var src=AC.createMediaStreamSource(stream),a=AC.createAnalyser();a.fftSize=512;src.connect(a);AN.push({a:a,k:kind,d:new Uint8Array(a.fftSize)});kick()}catch(e){}}\nfunction levels(){var o={\"in\":0,out:0};for(var j=0;j<AN.length;j++){var x=AN[j];x.a.getByteTimeDomainData(x.d);var q=0;for(var i=0;i<x.d.length;i++){var v=(x.d[i]-128)/128;q+=v*v}var r=Math.sqrt(q/x.d.length);if(r>o[x.k])o[x.k]=r}return o}\nfunction pts(){if(P)return P;P=new Float32Array(N*4);for(var i=0;i<N;i++){var u=Math.random()*2-1,th=Math.random()*6.2832,rad=1.12+Math.pow(Math.random(),2.2)*.26,k=Math.sqrt(1-u*u);P[i*4]=Math.cos(th)*k*rad;P[i*4+1]=u*rad*.82;P[i*4+2]=Math.sin(th)*k*rad;P[i*4+3]=Math.random()}return P}\nfunction rot(ax,ay){var cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay);return new Float32Array([cy,0,-sy,sx*sy,cx,sx*cy,cx*sy,-sx,cx*cy])}\nfunction fallback(el,c){var a=c[0],b=c[1];function css(x){return\"rgb(\"+x.map(function(v){return Math.round(v*255)}).join(\",\")+\")\"}el.style.borderRadius=\"50%\";el.style.background=\"radial-gradient(circle at 36% 30%,#fff 0,\"+css(b)+\" 18%,\"+css(a)+\" 58%,#050a14 100%)\";el.style.boxShadow=\"0 0 28px \"+css(b)}\nfunction add(el,col,o){o=o||{};var c=pal(col),cv=document.createElement(\"canvas\");cv.setAttribute(\"aria-hidden\",\"true\");cv.style.cssText=\"position:absolute;left:-14%;top:-14%;width:128%;height:128%;pointer-events:none\";\nvar gl=null;try{gl=cv.getContext(\"webgl\",{premultipliedAlpha:true,alpha:true,antialias:true})}catch(e){}\nif(!gl){fallback(el,c);return null}\nfunction sh(t,s){var x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);return x}\nfunction pr(v,f){var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,v));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);return gl.getProgramParameter(p,gl.LINK_STATUS)?p:null}\nvar A=pr(VS,FS),B=pr(PVS,PFS);if(!A||!B){fallback(el,c);return null}\nif(getComputedStyle(el).position===\"static\")el.style.position=\"relative\";el.appendChild(cv);\nvar q=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,q);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);\nvar pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,pts(),gl.STATIC_DRAW);\nfunction U(p,n){return gl.getUniformLocation(p,n)}\nvar R={el:el,cv:cv,gl:gl,A:A,B:B,q:q,pb:pb,c:c,big:!!o.big,vis:true,L:0,E:0,Q:0,\nu:{S:U(A,\"S\"),T:U(A,\"T\"),L:U(A,\"L\"),E:U(A,\"E\"),Q:U(A,\"Q\"),C1:U(A,\"C1\"),C2:U(A,\"C2\"),Rm:U(A,\"Rm\")},\npu:{Rm:U(B,\"Rm\"),T:U(B,\"T\"),Px:U(B,\"Px\"),L:U(B,\"L\"),C2:U(B,\"C2\")},aQ:gl.getAttribLocation(A,\"a\"),aP:gl.getAttribLocation(B,\"a\"),aS:gl.getAttribLocation(B,\"s\")};\nif(\"IntersectionObserver\" in window){new IntersectionObserver(function(es){R.vis=es[0].isIntersecting;kick()}).observe(el)}\norbs.push(R);kick();return R}\nfunction draw(R,dt){var gl=R.gl,el=R.el,box=el.clientWidth*1.28,dpr=Math.min(window.devicePixelRatio||1,2),px=Math.round(box*dpr);if(!box||!el.isConnected)return;\nif(R.cv.width!==px){R.cv.width=R.cv.height=px}\nvar k=1-Math.pow(.02,dt),talk=st===\"speaking\"?.45+.3*Math.abs(Math.sin(t*3.1)*Math.sin(t*1.7)):st===\"listening\"?.3+.06*Math.sin(t*2.2):st===\"thinking\"?.3+.1*Math.sin(t*8):(R.big?.16:.26)+.07*Math.sin(t*1.2);\nif(amp!==null)talk=amp;R.L+=(talk-R.L)*Math.min(1,dt*(amp!==null?14:6));R.E+=((st===\"thinking\"?1:st===\"speaking\"?.6:R.big?.2:.35)-R.E)*k;R.Q+=((st===\"idle\"?(R.big?.4:.75):1)-R.Q)*k;\ngl.viewport(0,0,px,px);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);\ngl.useProgram(R.A);gl.bindBuffer(gl.ARRAY_BUFFER,R.q);gl.enableVertexAttribArray(R.aQ);gl.vertexAttribPointer(R.aQ,2,gl.FLOAT,false,0,0);\ngl.uniform1f(R.u.S,1.4);gl.uniform1f(R.u.T,t);gl.uniform1f(R.u.L,R.L);gl.uniform1f(R.u.E,R.E);gl.uniform1f(R.u.Q,R.Q);gl.uniform3fv(R.u.C1,R.c[0]);gl.uniform3fv(R.u.C2,R.c[1]);gl.uniformMatrix3fv(R.u.Rm,false,rot(.32,ry));\ngl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.disableVertexAttribArray(R.aQ);\ngl.useProgram(R.B);gl.blendFunc(gl.ONE,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,R.pb);gl.enableVertexAttribArray(R.aP);gl.vertexAttribPointer(R.aP,3,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(R.aS);gl.vertexAttribPointer(R.aS,1,gl.FLOAT,false,16,12);\ngl.uniformMatrix3fv(R.pu.Rm,false,rot(.32,-ry*.6));gl.uniform1f(R.pu.T,t);gl.uniform1f(R.pu.Px,Math.max(1.4,box/150)*dpr);gl.uniform1f(R.pu.L,Math.max(R.L,R.Q*.3));gl.uniform3fv(R.pu.C2,R.c[1]);\ngl.drawArrays(gl.POINTS,0,N);gl.disableVertexAttribArray(R.aP);gl.disableVertexAttribArray(R.aS)}\nfunction frame(now){var on=orbs.filter(function(R){return R.vis&&R.el.isConnected&&R.el.getClientRects().length>0});if(!on.length||document.hidden){run=false;return}\nrequestAnimationFrame(frame);var dt=Math.min((now-last)/1000,.05)*(calm?.6:1);last=now;t+=dt;ry+=dt*(.22+(st===\"thinking\"?.25:st===\"speaking\"?.15:0));\namp=null;if(AN.length){var lv=levels();if(lv.out>.015){st=\"speaking\";amp=Math.min(1,.4+lv.out*4)}else if(lv[\"in\"]>.02){st=\"listening\";amp=Math.min(.9,.3+lv[\"in\"]*3.2)}else if(st===\"speaking\"||st===\"listening\"){amp=.26}}\ndocument.documentElement.style.setProperty(\"--sfo-spin\",(ry*57.3%360).toFixed(1)+\"deg\");for(var i=0;i<on.length;i++)draw(on[i],dt)}\nfunction kick(){if(!run&&!document.hidden){run=true;last=performance.now();requestAnimationFrame(frame)}}\ndocument.addEventListener(\"visibilitychange\",kick);\nwindow.SFO={add:add,state:function(s){st=s||\"idle\";kick()},kick:kick,now:function(){return{st:st,amp:amp}},meter:meter,unmeter:function(){AN=[];amp=null;st=\"idle\"}};})();";
function loaderResponse(env, url, c) {
  const origin = env.PUBLIC_ORIGIN || url.origin || DEFAULT_ORIGIN;
  const headers = { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" };
  if (!c || !ACTIVE.has(c.status)) return new Response("/* Studio Flow receptionist: not active */", { headers });
  const lk = lookOf(c);
  const cfg = { o: origin, k: c.widget_key, col: lk.col, name: lk.name, logo: lk.logo, pos: lk.pos, label: lk.launcher, hi: lk.assistant ? `Hi! I'm ${lk.assistant} \u{1F44B} Questions or want to book? I'm here 24/7.` : `Hi! \u{1F44B} Questions or want to book? I can help, any time.` };
  const js = ORB_ENGINE + `
(function(){if(window.__sfw)return;window.__sfw=1;var C=${JSON.stringify(cfg).replace(/</g, "\\u003c")};var P=/[?&]sfpreview=1/.test(location.search)||document.currentScript&&/preview=1/.test(document.currentScript.src)?1:0;
var d=document,S=C.pos==="left"?"left":"right",st=d.createElement("style");st.textContent="#sfw-root{all:initial}.sfw-b{position:fixed;"+S+":22px;bottom:24px;width:68px;height:68px;border-radius:50%;border:0;padding:0;margin:0;background:none;cursor:pointer;z-index:2147483646;-webkit-tap-highlight-color:transparent;animation:sfwh 4.6s ease-in-out infinite;transition:filter .2s}.sfw-b:hover{filter:brightness(1.12)}.sfw-b:focus-visible{outline:2px solid "+C.col+";outline-offset:6px}.sfw-o{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 45%,"+C.col+" 0,color-mix(in srgb,"+C.col+" 55%,#000) 58%,#04080f 100%);box-shadow:0 16px 32px -10px rgba(0,0,0,.5),0 0 26px -6px "+C.col+",inset 0 0 0 1px rgba(255,255,255,.28)}.sfw-b:after{content:'';position:absolute;left:18%;right:18%;bottom:-17px;height:9px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.26),transparent);animation:sfws 4.6s ease-in-out infinite;pointer-events:none}.sfw-x{position:absolute;right:-3px;top:-3px;width:24px;height:24px;border-radius:50%;background:#fff;color:#13233D;display:none;place-items:center;box-shadow:0 4px 12px rgba(0,0,0,.25);z-index:2}.sfw-x svg{width:13px;height:13px}.sfw-b.o .sfw-x{display:grid}.sfw-b.o{animation:none}@keyframes sfwh{50%{transform:translateY(-6px)}}@keyframes sfws{50%{transform:scale(.78);opacity:.5}}.sfw-l{display:flex;align-items:center;gap:7px;position:fixed;"+S+":98px;bottom:40px;z-index:2147483645;max-width:calc(100vw - 130px);padding:10px 24px 10px 15px;border-radius:999px;background:rgba(255,255,255,.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);color:#13233D;font:600 14px/1.2 -apple-system,Segoe UI,Arial,sans-serif;border:0;box-shadow:0 10px 26px -10px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.9);cursor:pointer;white-space:normal;overflow:visible;text-align:left;overflow-wrap:break-word;line-height:1.25;animation:sfwi .35s ease-out}@media(max-width:600px){.sfw-b{width:60px;height:60px;"+S+":16px;bottom:18px}.sfw-l{"+S+":84px;bottom:30px;font-size:13.5px;padding:9px 20px 9px 14px;max-width:calc(100vw - 110px)}}.sfw-l:before{content:'';width:7px;height:7px;flex:none;border-radius:50%;background:#20c37a;box-shadow:0 0 0 3px rgba(32,195,122,.18)}.sfw-l.o{display:none}@media(prefers-reduced-motion:reduce){.sfw-b,.sfw-b:after{animation-duration:9s}}.sfw-p{position:fixed;"+S+":22px;bottom:112px;width:400px;max-width:calc(100vw - 32px);height:640px;max-height:calc(100vh - 122px);border:0;border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.35);z-index:2147483647;background:#fff;opacity:0;transform:translateY(16px) scale(.98);pointer-events:none;transition:opacity .22s,transform .22s}.sfw-p.on{opacity:1;transform:none;pointer-events:auto}.sfw-t{position:fixed;"+S+":22px;bottom:112px;max-width:270px;background:#fff;color:#13233D;font:14px/1.45 -apple-system,Segoe UI,Arial,sans-serif;padding:12px 14px 12px 12px;border-radius:16px;box-shadow:0 14px 36px rgba(0,0,0,.22);z-index:2147483646;cursor:pointer;display:flex;gap:10px;align-items:flex-start;animation:sfwi .35s ease-out}.sfw-t img,.sfw-t i{width:30px;height:30px;border-radius:50%;flex:none;object-fit:cover;background:"+C.col+"}@keyframes sfwi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@media(max-width:520px){.sfw-p{"+S+":0;bottom:0;width:100vw;max-width:100vw;height:100%;max-height:100%;border-radius:0}.sfw-p.on~.sfw-b{display:none}.sfw-b .sfw-old{display:none}.sfw-b{padding:0;width:60px}}";d.head.appendChild(st);
var f=d.createElement("iframe");f.className="sfw-p";f.title=C.name+" receptionist";f.setAttribute("allow","microphone; autoplay");var b=d.createElement("button");b.className="sfw-b";b.type="button";b.setAttribute("aria-label","Chat with "+C.name);b.setAttribute("aria-expanded","false");b.innerHTML='<span class="sfw-o"></span><span class="sfw-x" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span>';
var lb=d.createElement("button");lb.type="button";lb.className="sfw-l";lb.textContent="Chat with "+String(C.name||"us").replace(/ +(Pty|Ltd|Limited|Group)( .*)?$/i,"").slice(0,48);lb.setAttribute("aria-hidden","true");lb.tabIndex=-1;
var tip=null,open=false,X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
function toggle(){open=!open;if(open&&!f.src)f.src=C.o+"/w/"+C.k+"?page="+encodeURIComponent(location.href)+(P?"&preview=1":"");f.classList.toggle("on",open);b.classList.toggle("o",open);lb.classList.toggle("o",open);b.setAttribute("aria-expanded",open?"true":"false");if(tip){tip.remove();tip=null}}
b.onclick=toggle;lb.onclick=toggle;window.addEventListener("message",function(e){if(e.origin===C.o&&e.data==="sfw-close"&&open)toggle()});
function mount(){d.body.appendChild(f);d.body.appendChild(lb);d.body.appendChild(b);try{SFO.add(b.querySelector(".sfw-o"),C.col)}catch(e){}try{if(!sessionStorage.getItem("sfw-tip")){setTimeout(function(){if(open)return;tip=d.createElement("div");tip.className="sfw-t";var av=C.logo?d.createElement("img"):d.createElement("i");if(C.logo){av.src=C.logo;av.alt=""}var tx=d.createElement("span");tx.textContent=C.hi;tip.appendChild(av);tip.appendChild(tx);tip.onclick=toggle;d.body.appendChild(tip);sessionStorage.setItem("sfw-tip","1");setTimeout(function(){if(tip){tip.remove();tip=null}},10000)},3500)}}catch(e){}
try{fetch(C.o+"/api/v1/w/"+C.k+"/ping",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({page:location.href,preview:P}),keepalive:true}).catch(function(){})}catch(e){}}
if(d.body)mount();else d.addEventListener("DOMContentLoaded",mount)})();`;
  return new Response(js, { headers });
}
function panelResponse(env, url, c) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const kb = c.kb || {};
  const lk = lookOf(c);
  const svc = modeOf(kb, c.vertical) === "service";
  const initials = lk.name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(and|the|of|&)$/i.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "AI";
  const chips = (kb.suggested_questions || []).slice(0, 3);
  const active = ACTIVE.has(c.status);
  const voice = active && !!c.voice_enabled && !!env.OPENAI_API_KEY;
  const dark = lk.theme === "dark";
  const cfg = { col: lk.col, k: c.widget_key, greet: lk.greeting, page: (url.searchParams.get("page") || "").slice(0, 300), p: url.searchParams.get("preview") === "1" ? 1 : 0, logo: lk.logo || null, vmax: CLIENT_VOICE_MAX_SECONDS };
  const T = dark ? { bg: "#060b14", bg2: "#0a1322", ink: "#EEF4FF", mu: "#9DB0C9", line: "rgba(255,255,255,.08)", bot: "rgba(255,255,255,.07)", input: "rgba(255,255,255,.06)" } : { bg: "#FFFFFF", bg2: "#F6F8FB", ink: "#13233D", mu: "#5B6B82", line: "#E6EBF2", bot: "#FFFFFF", input: "#F6F8FB" };
  const mic = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc4(lk.name)}</title>
<style>:root{--b:${lk.col};--bg:${T.bg};--bg2:${T.bg2};--ink:${T.ink};--mu:${T.mu};--line:${T.line};--bot:${T.bot};--in:${T.input}}*{box-sizing:border-box}html,body{margin:0;height:100%}body{font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;color:var(--ink);display:flex;flex-direction:column;background:var(--bg);overflow:hidden}
.h{background:linear-gradient(135deg,var(--b),color-mix(in srgb,var(--b) 65%,#000));color:#fff;padding:16px 14px 18px;display:flex;align-items:center;gap:11px;position:relative}.h:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:14px;background:var(--bg);border-radius:14px 14px 0 0}
.av{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center;font-weight:800;font-size:14px;overflow:hidden;flex:none;border:2px solid rgba(255,255,255,.85)}.av img{width:100%;height:100%;object-fit:cover;background:#fff}.ti{flex:1;min-width:0}.ti b{display:block;font-size:15.5px;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ti small{font-size:12px;opacity:.9}.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#3DDC97;margin-right:5px;box-shadow:0 0 6px #3DDC97}
.hb{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:99px;padding:6px 11px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;text-decoration:none;white-space:nowrap}.x{background:transparent;border:0;color:#fff;font-size:24px;cursor:pointer;line-height:1;padding:2px 4px;opacity:.9}
.log{flex:1;overflow-y:auto;padding:12px 14px 14px;display:flex;flex-direction:column;gap:10px;background:var(--bg)}.r{display:flex;gap:8px;align-items:flex-end;animation:in .25s ease-out}.r.u{justify-content:flex-end}.mi{width:26px;height:26px;border-radius:50%;flex:none;background:var(--b);color:#fff;font-size:10px;font-weight:800;display:grid;place-items:center;overflow:hidden}.mi img{width:100%;height:100%;object-fit:cover;background:#fff}
.m a.lnk{color:var(--b);font-weight:600;text-decoration:underline;text-underline-offset:2px;word-break:break-all}.r.u .m a.lnk{color:#fff}.m{max-width:80%;padding:10px 13px;border-radius:18px;white-space:pre-wrap;word-wrap:break-word}.r.b .m{background:var(--bot);border:1px solid var(--line);border-bottom-left-radius:6px;box-shadow:0 2px 8px rgba(16,24,40,.05)}.r.u .m{background:var(--b);color:#fff;border-bottom-right-radius:6px;box-shadow:0 6px 16px color-mix(in srgb,var(--b) 30%,transparent)}.cap{font-size:13.5px;opacity:.92}
.ty{display:flex;gap:4px;padding:13px 14px}.ty i{width:7px;height:7px;border-radius:50%;background:var(--mu);opacity:.5;animation:bl 1.2s infinite}.ty i:nth-child(2){animation-delay:.15s}.ty i:nth-child(3){animation-delay:.3s}@keyframes bl{30%{opacity:1;transform:translateY(-3px)}}@keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.chips{display:flex;gap:6px;flex-wrap:wrap;padding:0 14px 10px;background:var(--bg)}.chip{border:1px solid color-mix(in srgb,var(--b) 35%,transparent);background:color-mix(in srgb,var(--b) 7%,transparent);color:var(--ink);border-radius:99px;padding:7px 11px;cursor:pointer;font:inherit;font-size:13px}.chip:hover{border-color:var(--b)}
form{display:flex;gap:8px;align-items:center;padding:10px 12px;border-top:1px solid var(--line);background:var(--bg)}input{flex:1;border:1px solid var(--line);background:var(--in);color:var(--ink);border-radius:99px;padding:11px 15px;font:inherit;font-size:16px;min-width:0;outline:none}input:focus{border-color:var(--b);box-shadow:0 0 0 3px color-mix(in srgb,var(--b) 18%,transparent)}
.ib{width:42px;height:42px;border-radius:50%;border:0;background:var(--b);color:#fff;display:grid;place-items:center;cursor:pointer;flex:none}.ib svg{width:19px;height:19px}.ib.mic{background:color-mix(in srgb,var(--b) 12%,transparent);color:var(--b);border:1px solid color-mix(in srgb,var(--b) 30%,transparent)}
.vo{position:absolute;inset:0;top:76px;background:var(--bg);display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;text-align:center;z-index:3}.vo.on{display:flex}.orb{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff8,transparent 45%),var(--b);box-shadow:0 0 0 0 color-mix(in srgb,var(--b) 45%,transparent);animation:pu 1.6s infinite}@keyframes pu{70%{box-shadow:0 0 0 26px transparent}100%{box-shadow:0 0 0 0 transparent}}.vo .st{font-weight:700}.vo .lc{color:var(--mu);font-size:14px;min-height:42px;max-width:300px}.end{background:#E5484D;color:#fff;border:0;border-radius:99px;padding:11px 20px;font:inherit;font-weight:800;cursor:pointer}
.ft{font-size:11px;color:var(--mu);text-align:center;padding:0 10px 8px;background:var(--bg)}.ft a{color:inherit}.dk{background:radial-gradient(130% 55% at 50% -8%,color-mix(in srgb,var(--b) 55%,transparent),transparent 62%),linear-gradient(175deg,color-mix(in srgb,var(--b) 30%,#060b14),#060b14 55%,#04070d)}.dk .h{background:transparent;padding:16px 14px 12px}.dk .h:after{display:none}.dk .log,.dk .chips,.dk form,.dk .ft{background:transparent}.dk form{border-top-color:var(--line)}.hob{position:relative;width:46px;height:46px;flex:none;border-radius:50%}.dk .r.b .m{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:none}.dk .mi{display:none}.dk .r.u .m{box-shadow:0 8px 22px -8px color-mix(in srgb,var(--b) 70%,transparent)}.dk .chip{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14);color:var(--ink)}.dk .chip:hover{border-color:color-mix(in srgb,var(--b) 70%,#fff)}.dk .ib.mic{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.18)}.dk input:focus{border-color:color-mix(in srgb,var(--b) 70%,#fff)}.dk .vo{background:radial-gradient(120% 70% at 50% 0%,color-mix(in srgb,var(--b) 45%,transparent),transparent 60%),linear-gradient(170deg,color-mix(in srgb,var(--b) 40%,#060b14),#04070d);top:0;padding-top:70px}.dk .orb{width:190px;height:190px;background:none;box-shadow:none;animation:none;position:relative;margin-bottom:44px}.dk .orb:before,.dk .orb:after{content:"";position:absolute;border-radius:50%;pointer-events:none}.dk .orb:before{inset:-12%;border:1px dashed rgba(255,255,255,.2);transform:rotate(calc(var(--sfo-spin,0deg)*-1.6))}.dk .orb:after{inset:-24%;border:1px solid rgba(255,255,255,.13);background:radial-gradient(circle at 50% 0,color-mix(in srgb,var(--b) 40%,#fff) 0 2.5px,transparent 8px);transform:rotate(var(--sfo-spin,0deg))}.dk .vo .st{color:#fff}.dk .vo .lc{color:#cfdcef}.vs{display:grid;justify-items:center;gap:8px;padding:18px 12px 8px;transition:padding .35s}.vso{position:relative;width:92px;height:92px;border-radius:50%;animation:sfwh 4.6s ease-in-out infinite;transition:width .45s cubic-bezier(.2,.8,.2,1),height .45s cubic-bezier(.2,.8,.2,1)}.vso:after{content:"";position:absolute;left:20%;right:20%;bottom:-14px;height:7px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.45),transparent);animation:sfws 4.6s ease-in-out infinite}.vs .vt{font-size:12.5px;color:#BFD0E6;text-align:center;max-width:260px;line-height:1.4}.vs.c{padding:10px 12px 2px}.vs.c .vso{width:58px;height:58px}.vs.c .vt{display:none}.vs.on{padding:22px 12px 10px}.vs.on .vso{width:156px;height:156px;animation:none}.vs.on .vso:after{display:none}.vs.on .vt{display:block;color:#fff;font-weight:600;font-size:13.5px}.vs .vx{display:none;border:0;border-radius:99px;padding:8px 16px;background:#E5484D;color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.vs.on .vx{display:inline-block}@keyframes sfwh{50%{transform:translateY(-6px)}}@keyframes sfws{50%{transform:scale(.78);opacity:.5}}@media(prefers-reduced-motion:reduce){.vso,.vso:after{animation-duration:9s}}.dk .vo{display:none!important}.hob.lg{background:#fff;border:2px solid rgba(255,255,255,.9);overflow:hidden;display:grid;place-items:center}.hob.lg img{width:100%;height:100%;object-fit:cover}.hob.lg canvas{display:none}</style></head><body${dark ? ' class="dk"' : ""}>
<div class="h">${dark ? '<div class="hob" id="hob" aria-hidden="true"></div>' : `<div class="av" id="av">${esc4(initials)}</div>`}<div class="ti"><b>${esc4(lk.assistant ? `${lk.assistant} \xB7 ${lk.name}` : lk.name)}</b><small>${active ? '<span class="dot"></span>Online \xB7 replies instantly' : "Currently unavailable"}</small></div>${lk.book && active ? `<a class="hb" href="${esc4(lk.book)}" target="_blank" rel="noopener">Book</a>` : ""}<button class="x" id="x" aria-label="Close">\xD7</button></div>
<div class="vo" id="vo" aria-live="polite"><div class="orb" id="vorb"></div><div class="st" id="vst">Connecting\u2026</div><div class="lc" id="vlc">Allow the microphone when asked, then just talk.</div><button class="end" id="vend" type="button">End call</button></div>
${dark ? `<div class="vs" id="vs"><div class="vso" id="vso" aria-hidden="true"></div><div class="vt" id="vt">${voice ? "Tap the mic to talk, or type below" : "Ask anything below"}</div><button class="vx" id="vx" type="button">End call</button></div>` : ""}<div class="log" id="log" aria-live="polite"></div>
${active && chips.length ? `<div class="chips" id="chips">${chips.map((q2) => `<button class="chip" type="button">${esc4(q2)}</button>`).join("")}</div>` : ""}
<form id="f"><input id="q" maxlength="600" placeholder="${active ? "Type your message\u2026" : "Unavailable right now"}" autocomplete="off" aria-label="Your message"${active ? "" : " disabled"}>${voice ? `<button class="ib mic" type="button" id="talk" aria-label="Talk to the receptionist">${mic}</button>` : ""}<button class="ib" aria-label="Send"${active ? "" : " disabled"}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>
<div class="ft">AI receptionist \xB7 ${svc ? "Please don't share card or ID details." : "For emergencies call 000. Please don't share medical details here."}</div>
<script nonce="${nonce}">${ORB_ENGINE}
(function(){var C=${JSON.stringify({ ...cfg, active, ini: initials }).replace(/</g, "\\u003c")},H=[{role:"assistant",content:C.greet}],busy=false,S="";
try{S=sessionStorage.getItem("sfw-s")||""}catch(e){}if(!/^[a-z0-9]{16,40}$/.test(S)){S=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now()).replace(/[^a-z0-9]/gi,"").slice(0,32);try{sessionStorage.setItem("sfw-s",S)}catch(e){}}
var $=function(i){return document.getElementById(i)},log=$("log"),q=$("q"),Q=C.p?"?preview=1":"";
function avatar(el){if(C.logo){var im=new Image();im.alt="";im.onload=function(){if(im.naturalWidth>=24){el.textContent="";el.appendChild(im)}};im.src=C.logo}}
if($("av"))avatar($("av"));try{if($("hob")){SFO.add($("hob"),C.col);if(C.logo){var lim=new Image();lim.alt="";lim.onload=function(){if(lim.naturalWidth>=24){var h=$("hob");h.className="hob lg";h.appendChild(lim)}};lim.src=C.logo}}if($("vso"))SFO.add($("vso"),C.col)}catch(e){}
${LINKIFY_JS}
function add(t,who,cap){try{if($("vs")&&!$("vs").classList.contains("on"))$("vs").classList.add("c")}catch(e){}var r=document.createElement("div");r.className="r "+who;if(who==="b"){var mi=document.createElement("div");mi.className="mi";mi.textContent=C.ini;avatar(mi);r.appendChild(mi)}var m=document.createElement("div");m.className="m"+(cap?" cap":"");lk(m,t);r.appendChild(m);log.appendChild(r);log.scrollTop=log.scrollHeight;return r}
function typing(){var r=document.createElement("div");r.className="r b";r.innerHTML='<div class="mi"></div><div class="m ty"><i></i><i></i><i></i></div>';r.firstChild.textContent=C.ini;log.appendChild(r);log.scrollTop=log.scrollHeight;return r}
add(C.active?C.greet:"Sorry, our online assistant is unavailable right now. Please call us and the team will help.","b");
function ask(t){if(busy||!t.trim())return;busy=true;add(t,"u");H.push({role:"user",content:t});var w=typing();
fetch("/api/v1/w/"+C.k+"/chat"+Q,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session:S,page:C.page,messages:H.slice(-14)})}).then(function(r){return r.json()}).then(function(j){w.remove();var a=j.reply||j.error||"Sorry, please try again.";add(a,"b");H.push({role:"assistant",content:a})}).catch(function(){w.remove();add("Sorry, I couldn't connect. Please try again.","b")}).then(function(){busy=false;q.focus()})}
$("f").addEventListener("submit",function(e){e.preventDefault();var t=q.value;q.value="";ask(t)});
var ch=$("chips");if(ch)ch.addEventListener("click",function(e){if(e.target.classList.contains("chip")&&!busy){ask(e.target.textContent);e.target.remove()}});
$("x").addEventListener("click",function(){try{parent.postMessage("sfw-close","*")}catch(e){}});
// \u2500\u2500 Talk (voice) \u2500\u2500
var talk=$("talk"),pc=null,mic=null,dc=null,timer=null,t0=0,VS="",TX=[];
function vui(on,st,lc){try{SFO.state(on?"listening":"idle");if(!on)SFO.unmeter()}catch(e){}var vs=$("vs");if(vs){vs.classList.toggle("on",on);$("vt").textContent=on?(st||"Listening\u2026"):"Tap the mic to talk again, or type below"}$("vo").classList.toggle("on",on);if(st)$("vst").textContent=st;if(lc!=null)$("vlc").textContent=lc}
function hang(msg){var secs=t0?Math.round((Date.now()-t0)/1000):0;try{pc&&pc.close()}catch(e){}try{mic&&mic.getTracks().forEach(function(t){t.stop()})}catch(e){}if(VS&&t0){try{fetch("/api/v1/w/"+C.k+"/voice-end"+Q,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session:VS,seconds:secs,transcript:TX,page:C.page}),keepalive:true})}catch(e){}}pc=null;mic=null;dc=null;clearTimeout(timer);t0=0;vui(false);if(msg)add(msg,"b")}
function onEv(ev){var t=ev.type||"";
if(t==="conversation.item.input_audio_transcription.completed"&&ev.transcript){TX.push({r:"u",t:ev.transcript});add(ev.transcript,"u",1);$("vlc").textContent="\u201C"+ev.transcript+"\u201D"}
else if((t==="response.output_audio_transcript.done"||t==="response.audio_transcript.done")&&ev.transcript){TX.push({r:"a",t:ev.transcript});add(ev.transcript,"b",1);$("vlc").textContent=ev.transcript}
else if(t==="response.function_call_arguments.done"&&ev.name==="pass_to_team"){var args={};try{args=JSON.parse(ev.arguments||"{}")}catch(e){}
fetch("/api/v1/w/"+C.k+"/voice-lead"+Q,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({session:VS,args:args,page:C.page})}).then(function(r){return r.json()}).catch(function(){return{output:"Couldn't pass it on: ask them to call the business."}}).then(function(j){
if(!dc)return;dc.send(JSON.stringify({type:"conversation.item.create",item:{type:"function_call_output",call_id:ev.call_id,output:String(j.output||"Done")}}));dc.send(JSON.stringify({type:"response.create"}))})}
else if(t==="input_audio_buffer.speech_started"){try{SFO.state("listening")}catch(e){}$("vst").textContent="Listening\u2026"}
else if(t==="response.created"){try{SFO.state("speaking")}catch(e){}$("vst").textContent="Speaking\u2026"}}
if(talk)talk.addEventListener("click",async function(){if(pc){hang();return}
VS="v"+(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now()).replace(/[^a-z0-9]/gi,"").slice(0,30);TX=[];
vui(true,"Connecting\u2026","Allow the microphone when asked, then just talk.");try{mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});try{SFO.meter(mic,"in")}catch(e){}pc=new RTCPeerConnection();var au=new Audio();au.autoplay=true;pc.ontrack=function(e){try{SFO.meter(e.streams[0],"out")}catch(x){}au.srcObject=e.streams[0]};
pc.addTrack(mic.getTracks()[0],mic);dc=pc.createDataChannel("oai-events");dc.onmessage=function(m){try{onEv(JSON.parse(m.data))}catch(e){}};dc.onopen=function(){t0=Date.now();vui(true,"Live: say hello","");dc.send(JSON.stringify({type:"response.create"}))};
var of=await pc.createOffer();await pc.setLocalDescription(of);var r=await fetch("/api/v1/w/"+C.k+"/voice"+Q,{method:"POST",headers:{"content-type":"application/sdp"},body:of.sdp});
if(!r.ok){var j=await r.json().catch(function(){return{}});throw new Error(j.error||"Voice isn't available right now.")}
await pc.setRemoteDescription({type:"answer",sdp:await r.text()});timer=setTimeout(function(){hang("That's our time for this call. Feel free to keep chatting here, or leave your number and the team will call you.")},C.vmax*1000)}
catch(e){hang(e&&e.name==="NotAllowedError"?"Voice needs microphone access. You can type instead.":(e.message||"Voice isn't available right now. You can type instead."))}});
$("vend").addEventListener("click",function(){hang()});if($("vx"))$("vx").addEventListener("click",function(){hang()});})();</script></body></html>`;
  return new Response(html, { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
    "Referrer-Policy": "strict-origin",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; media-src 'self' blob: mediastream:; base-uri 'none'; form-action 'none'; frame-ancestors *`
  } });
}
function testPage(env, url, c) {
  const kb = c.kb || {};
  const name = kb.clinic_name || c.business_name;
  const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Test: ${esc4(name)} receptionist</title>
<style>body{margin:0;font:16px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#13233D;background:#F5F7FB}.bar{background:#0B1B33;color:#fff;padding:10px 16px;font-size:13px}.wrap{max-width:820px;margin:0 auto;padding:40px 16px}h1{font-size:34px;margin:0 0 8px}.card{background:#fff;border:1px solid #E3E8F0;border-radius:14px;padding:18px;margin-top:18px}</style></head><body>
<div class="bar">TEST PAGE \xB7 Studio Flow &amp; Systems \xB7 this is how ${esc4(name)}'s receptionist behaves on their website. Leads from this page are not sent.</div>
<div class="wrap"><h1>${esc4(name)}</h1><p>${esc4(kb.summary || "Pretend homepage.")}</p><div class="card">Tap the floating orb in the bottom-right corner and talk to it like a customer would.</div></div>
<script src="/w/${c.widget_key}.js?preview=1" async></script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}

