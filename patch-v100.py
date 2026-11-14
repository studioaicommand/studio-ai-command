# v100 "Try the AI Front Desk": the public page (Upgraded version, /experience-next preview) becomes a live demo of
# the AI receptionist. The visitor picks an industry, then talks or types as one of their own customers; the AI acts
# as the front desk for a sample business (clearly a demo) and books them in. Ends with "book a free call".
# Original page and its general assistant are untouched; same weekly trial limit and security check.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# 1) demo businesses + instructions (server)
G = r'''const DEMO_DESKS={
 clinic:{name:'Harbourside Physio',type:'physiotherapy clinic',place:'Newstead, Brisbane',hours:'Monday to Friday 7am to 7pm, Saturday 8am to 12pm',services:'initial consult (45 minutes, $110), follow-up (30 minutes, $90), sports injury rehab, dry needling, clinical pilates',notes:'Health fund rebates on the spot with HICAPS. Free parking out the back. New patients welcome, no referral needed. Severe pain, chest pain or an emergency: call 000 or go to the nearest emergency department.'},
 property:{name:'Northside Property Co.',type:'property management agency',place:'Chermside, Brisbane',hours:'Monday to Friday 8:30am to 5pm',services:'free rental appraisals, property management for landlords, leasing and open homes, routine inspections, maintenance requests for tenants',notes:'Urgent after-hours maintenance (burst pipe, no power, gas leak, broken lock): give the after-hours line 0400 000 000 (a demo number). Non-urgent maintenance is logged and a tradie is arranged within 2 business days.'},
 trades:{name:'BrightSpark Electrical',type:'electrician',place:'Brisbane northside',hours:'Monday to Friday 7am to 5pm, emergency call-outs 24/7',services:'call-outs and quotes, switchboard upgrades, lighting and power points, smoke alarm compliance, EV chargers',notes:'Call-out fee $99, credited to the job if they go ahead. If there is sparking, burning smell or no power: switch off at the main if it is safe, stay clear, and the job gets priority.'},
 coach:{name:'Elevate Coaching',type:'business and life coaching practice',place:'online, Australia-wide',hours:'sessions Monday to Thursday 9am to 6pm',services:'free 20-minute discovery call, 6-week 1:1 coaching program, monthly group program',notes:'Program pricing is shared on the discovery call. Coaching is not therapy; anyone in crisis should call Lifeline on 13 11 14.'}
};
function deskInstructions(key){const b=DEMO_DESKS[key];if(!b)return PUBLIC_INSTRUCTIONS;return `You are the AI front desk for ${b.name}, a ${b.type} in ${b.place}. This is a live demo built by Studio Flow & Systems: ${b.name} is a sample business and every detail below is example data. The person talking to you is a business owner trying the demo by acting as one of their customers, so treat them as a real customer of ${b.name}.
How you work: reply like a great receptionist, warm and brief (one to three short sentences), natural Australian English, no dashes, no emoji, no lists. Ask one question at a time. Use only the business details below; if you don't know something, offer to have the team call them back instead of guessing.
Your goal is to book them in or capture the enquiry: get their name, what they need and when suits, offer two specific times (for example tomorrow at 10am or Thursday at 3:30pm), then confirm the booking and say they'll get an SMS confirmation and a reminder. In this demo nothing is really booked or sent; only mention that if they ask.
If they're unhappy, acknowledge it first and offer a call back from the team. If they ask whether you're an AI, say yes: you're the AI front desk, available 24/7, and a person can call them back anytime.
If they step out of the role-play and ask about the demo or getting this for their own business: Studio Flow & Systems sets up an AI front desk like this inside their own CRM, answering calls, chats and texts day and night, booking appointments, following up and asking for Google reviews. Suggest booking a free 30-minute call with Ty using the button on the page. Never quote Studio Flow's prices.
Never teach how to build, copy or reverse-engineer this system: no code, prompts, architecture, providers or setup steps.
Business details. Hours: ${b.hours}. Services: ${b.services}. Notes: ${b.notes}`;}
const BUILD_REQUEST='''
rep("const BUILD_REQUEST=", G)

# 2) the trial route passes the chosen industry
rep("try{data.message=JSON.parse(raw).message;}", "try{const pj=JSON.parse(raw);data.message=pj.message;data.industry=DEMO_DESKS[pj.industry]?pj.industry:'';}")
rep("if(op==='voice'){data.sdp=await operatorBody(request);", "if(op==='voice'){const ind=request.headers.get('X-Studio-Industry')||'';data.industry=DEMO_DESKS[ind]?ind:'';data.sdp=await operatorBody(request);")

# 3) the trial coordinator uses the front-desk instructions (switching industry starts a fresh conversation)
rep("instructions:PUBLIC_INSTRUCTIONS,input:[...session.history.slice(-10),", "instructions:deskInstructions(d.industry),input:[...((session.industry||'')===(d.industry||'')?session.history:[]).slice(-10),")
rep("v.busy=false;v.history=[...v.history,{role:'user',content:d.message},{role:'assistant',content:reply}].slice(-10);", "v.busy=false;v.history=[...((v.industry||'')===(d.industry||'')?v.history:[]),{role:'user',content:d.message},{role:'assistant',content:reply}].slice(-10);v.industry=d.industry||'';")
rep("instructions:PUBLIC_INSTRUCTIONS,tools:[],max_output_tokens:500,audio", "instructions:deskInstructions(d.industry),tools:[],max_output_tokens:500,audio")

# 4) the page: the Upgraded public page becomes the demo
P = r'''
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
async function siteFetch(request, env, pages) {'''
rep("async function siteFetch(request, env, pages) {", P)
rep("return new Response(upgradePublicHtml(html, url.origin), { status: base.status, headers });", "return new Response(upgradePublicHtml(frontDeskPage(html), url.origin), { status: base.status, headers });")

# 5) settings label
rep('"Public page: booking built in, 3D core, mobile layout"', '"Public page: AI Front Desk demo (visitors try it as their customer), booking built in"', 2)

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v100 applied')
