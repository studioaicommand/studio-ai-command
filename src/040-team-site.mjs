// src/team/site.js
var BOOKING_HOST = "https://links.studioflowandsystems.com";
var SITE_PATHS = /* @__PURE__ */ new Set(["/experience", "/experience-next", "/command", "/command-next", "/command-classic"]);
var cache = { at: 0, site: {} };
async function siteFlags(env) {
  if (Date.now() - cache.at < 3e4) return cache.site;
  let site = {};
  try {
    site = (await getSettings(env)).site || {};
  } catch {
  }
  cache = { at: Date.now(), site };
  return site;
}
function clearSiteCache() {
  cache = { at: 0, site: {} };
}
function meta(origin) {
  const title = "Studio AI Intelligence \xB7 Studio Flow & Systems";
  const desc = "Talk to Studio AI and see what connected systems, automation and AI could do for your service business. Then book a free 30-minute call with Ty.";
  const img = origin + "/assets/studio-logo.png";
  const esc7 = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return [
    `<meta name="description" content="${esc7(desc)}">`,
    `<meta name="theme-color" content="#020711">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Studio Flow &amp; Systems">`,
    `<meta property="og:title" content="${esc7(title)}">`,
    `<meta property="og:description" content="${esc7(desc)}">`,
    `<meta property="og:url" content="${esc7(origin)}/experience">`,
    `<meta property="og:image" content="${esc7(img)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc7(title)}">`,
    `<meta name="twitter:description" content="${esc7(desc)}">`,
    `<meta name="twitter:image" content="${esc7(img)}">`
  ].join("\n");
}
function injectBeforeBody(html, layer) {
  const body = html.lastIndexOf("</body>");
  return body < 0 ? html + layer : html.slice(0, body) + layer + html.slice(body);
}
function upgradeCommandHtml(html) {
  return injectBeforeBody(html, SITE_COMMAND);
}
function upgradePublicHtml(html, origin) {
  let out = html;
  const head = out.indexOf("</head>");
  if (head > 0 && !out.includes('property="og:title"')) out = out.slice(0, head) + meta(origin) + "\n" + out.slice(head);
  const body = out.lastIndexOf("</body>");
  out = body < 0 ? out + SITE_PUBLIC : out.slice(0, body) + SITE_PUBLIC + out.slice(body);
  return out;
}
function widenCsp(csp) {
  if (!csp) return csp;
  if (/frame-src /.test(csp)) return csp.replace(/frame-src ([^;]*)/, (m, v) => v.includes(BOOKING_HOST) ? m : `frame-src ${v} ${BOOKING_HOST}`);
  return csp.replace(/;?\s*$/, `; frame-src ${BOOKING_HOST}`);
}

// v100 public page as the AI Front Desk demo (Upgraded version only)
function frontDeskPage(html){
 const sw=(a,b)=>{if(html.includes(a))html=html.split(a).join(b);};
 sw('<title>Studio AI Intelligence</title>','<title>Try the AI Front Desk | Studio Flow &amp; Systems</title>');
 sw('YOUR BUSINESS / YOUR NEXT CHAPTER','AI FRONT DESK / LIVE DEMO');
 sw('<h1>STUDIO AI <b>INTELLIGENCE</b></h1>','<h1>AI FRONT <b>DESK</b></h1>');
 sw('<div class="badge">Public experience</div>','<div class="badge">Try it as your customer</div>');
 const q0=html.indexOf('<h2>YOUR NEXT QUICK WIN</h2>'),q1=html.indexOf('</section>',q0);
 if(q0>0&&q1>q0)html=html.slice(0,q0)+'<h2>1. PICK YOUR INDUSTRY</h2><p class="sub">The front desk answers for a sample business like yours.</p><div class="fd-inds"><button class="b fd-ind" data-ind="clinic" aria-pressed="true">Health clinic</button><button class="b fd-ind" data-ind="property" aria-pressed="false">Property management</button><button class="b fd-ind" data-ind="trades" aria-pressed="false">Trades</button><button class="b fd-ind" data-ind="coach" aria-pressed="false">Coach or consultant</button></div><h2 style="margin-top:22px">2. TALK LIKE YOUR CUSTOMER</h2><p class="sub">Tap one to start, or say anything.</p><button class="b public-choice" data-q="Hi, I&#39;d like to book in this week. What times have you got?">Book an appointment</button><button class="b public-choice" data-q="Hi, how much does it cost and what&#39;s included?">Ask about prices</button><button class="b public-choice" data-q="I called earlier and nobody picked up. Pretty frustrating.">Missed call, unhappy</button><button class="b public-choice" data-q="Are you open on the weekend?">After-hours question</button>'+html.slice(q1);
 sw('<h2>BUILD MORE SPACE</h2>','<h2>THIS COULD BE YOUR BUSINESS</h2>');
 sw('<p class="sub">Websites, connected systems, automation and AI for service businesses.</p><p>Tell Studio what you do, what takes your time, and what you want to improve.</p>','<p class="sub">Answers every call, chat and text in seconds, day or night.</p><p>Books them in, follows up, chases no-shows and asks for Google reviews, all inside your own CRM. You approve anything that matters.</p>');
 sw('>Explore working with Ty</a>','>Book a free 30-minute call</a>');
 sw('The neural core responds to your voice.','Speak to the front desk. It answers the way it would for your customers.');
 sw('<button class="b" data-q="Show me a practical AI quick win. Ask about my business first."><b>Explore AI for my business</b><small>Start with something useful today</small></button>','<button class="b" data-q="Hi, I&#39;d like to book in this week. What times have you got?"><b>Book an appointment</b><small>See it fill your calendar</small></button>');
 sw('<button class="b" data-q="Help me map my business from enquiry to delivery, one question at a time."><b>Map my business</b><small>See where your systems could connect</small></button>','<button class="b" data-q="I called earlier and nobody picked up. Pretty frustrating."><b>Test a tricky one</b><small>An unhappy customer</small></button>');
 sw('<b>Talk with Ty</b><small>Explore your next step</small>','<b>Get this for my business</b><small>Free 30-minute call with Ty</small>');
 sw('<h2>MEET STUDIO AI</h2>','<h2>YOUR AI FRONT DESK</h2>');
 sw('An AI assistant for exploring your business. Audio is sent to OpenAI during voice calls.','A live demo receptionist for a sample business. Nothing is really booked. Audio is sent to OpenAI during voice calls.');
 sw('<div class="m">What do you do, and what would you like to improve?</div>','<div class="m">Pick your industry, then say hi as if you were one of your customers.</div>');
 sw('placeholder="Tell Studio about your business…"','placeholder="Type as your customer would…"');
 sw('You’ve experienced Studio AI.','That’s your AI front desk.');
 sw('Ready to explore what it could do inside your business?','It could be answering your customers tonight, inside your own CRM.');
 sw('>Explore Studio AI for my business</a>','>Book a free 30-minute call</a>');
 sw("setVoiceState('Listening. Tell Studio about your business.')","setVoiceState('Listening. Talk like your customer.')");
 const js=`<style>.fd-inds{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px}.fd-ind{width:auto!important;flex:1 1 140px}.fd-ind[aria-pressed="true"]{border-color:#39b8ff!important;background:rgba(57,184,255,.16)!important;color:#fff!important}</style><script>(function(){'use strict';var NAMES=${JSON.stringify(Object.fromEntries(Object.entries(DEMO_DESKS).map(([k,v])=>[k,v.name])))};window.__fdInd='clinic';var of=window.fetch.bind(window);window.fetch=function(u,o){o=o||{};try{if(typeof u==='string'&&u.indexOf('/api/v1/public/')===0){if(/\\/chat$/.test(u)&&o.body){var b=JSON.parse(o.body);b.industry=window.__fdInd;o=Object.assign({},o,{body:JSON.stringify(b)});}if(/\\/voice$/.test(u)){var h=Object.assign({},o.headers||{});h['X-Studio-Industry']=window.__fdInd;o=Object.assign({},o,{headers:h});}}}catch(e){}return of(u,o);};function note(t){var log=document.getElementById('log');if(!log)return;var d=document.createElement('div');d.className='m';d.textContent=t;log.appendChild(d);log.scrollTop=log.scrollHeight;}document.querySelectorAll('.fd-ind').forEach(function(btn){btn.addEventListener('click',function(){var k=btn.getAttribute('data-ind');if(!NAMES[k]||k===window.__fdInd)return;window.__fdInd=k;document.querySelectorAll('.fd-ind').forEach(function(x){x.setAttribute('aria-pressed',x===btn?'true':'false');});note('Now answering for '+NAMES[k]+' (a sample business). Say hi as their customer.');});});note('Demo business: '+NAMES.clinic+'. Pick another industry any time.');})();<\/script>`;
 const end=html.lastIndexOf('</body>');html=end>0?html.slice(0,end)+js+html.slice(end):html+js;
 return html;
}
async function siteFetch(request, env, pages) {
  const url = new URL(request.url);
  const isCommand = url.pathname.startsWith("/command");
  if (isCommand && url.pathname !== "/command-classic") {
    if (url.pathname === "/command-next") return appShell(request);
    const f = await siteFlags(env);
    if (f.command_classic !== true) return appShell(request);
  }
  const render = isCommand ? pages.command : pages.public;
  const base = render();
  if (request.method !== "GET") return base;
  const preview2 = url.pathname === "/experience-next";
  const flags = preview2 ? {} : await siteFlags(env);
  const upgrade = preview2 || (isCommand ? flags.command_v2 === true : flags.public_v2 === true);
  if (!upgrade) return base;
  try {
    const html = await base.text();
    const headers = new Headers(base.headers);
    if (preview2) headers.set("X-Robots-Tag", "noindex");
    if (isCommand) return new Response(upgradeCommandHtml(html), { status: base.status, headers });
    headers.set("Content-Security-Policy", widenCsp(headers.get("Content-Security-Policy") || ""));
    return new Response(upgradePublicHtml(frontDeskPage(html), url.origin), { status: base.status, headers });
  } catch (e) {
    console.error("site upgrade:", e.message);
    return render();
  }
}

