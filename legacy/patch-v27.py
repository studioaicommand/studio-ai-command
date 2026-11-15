# v27: one full price book in Command + premium /offers page.
# Receptionist prices/links come from the `offer` setting (Command > Settings).
# Website, monthly, systems prices come from the offers page catalogue (Command > Offers), editable there.
import sys
f = sys.argv[1]
s = open(f).read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:140])
    s = s.replace(old, new)

def between(start, end, new):
    global s
    a = s.index(start); b = s.index(end, a)
    s = s[:a] + new + s[b:]

# ---------------------------------------------------------------- 1) catalogue items
between('var OFFER_PAGE_ITEMS = [', 'var DEFAULT_OFFERS_PAGE = ', r'''var OFFER_PAGE_ITEMS = [
  {id:'chat',group:'receptionist',title:'Chat Receptionist',description:'A receptionist on your website, trained on your business, that answers enquiries in seconds and guides people to book.',features:['Answers 24/7 from your approved information','Books them in or hands them to your team','New enquiries sent to your team by SMS and email','Set up, tuned and looked after by Ty'],enabled:true},
  {id:'web_voice',group:'receptionist',title:'Front Desk',description:'Your AI front desk: chat and voice on your website, plus the follow-up that turns enquiries into bookings.',features:['Everything in Chat Receptionist, plus website voice','Missed-call text-back in seconds','SMS follow-up until new enquiries book','Google review requests after each visit','Monthly results report'],enabled:true,featured:true},
  {id:'phone',group:'receptionist',title:'Phone AI receptionist',description:'An AI receptionist that answers your business phone line, takes details and books the next step.',features:['Answers calls day and night','Call routing and human transfer rules','Booking where your system supports it'],enabled:true,price:697,from:true,unit:'month'},
  {id:'website_launch',group:'website',title:'Launch website',description:'A custom-coded, fast, mobile-first website in your brand, ready to win enquiries.',features:['6–8 custom-coded pages','SEO foundations and booking links','AI receptionist installed'],enabled:true,price:3500,was:4900},
  {id:'website_growth',group:'website',title:'Growth website',description:'Our main build: a page for every service, premium motion and search set up properly.',features:['10–20 pages, one per service or treatment','Premium motion design','SEO plus AI-search schema','GoHighLevel forms, tracking and receptionist set up'],enabled:true,price:6900,was:9500,featured:true},
  {id:'website_signature',group:'website',title:'Signature website',description:'A cinematic flagship site: video, 3D, copywriting and integrations, like the Studio Flow website.',features:['Cinematic video and 3D motion','Copywriting and photo direction','Multi-location and custom integrations'],enabled:true,price:12000,was:18000,from:true},
  {id:'care',group:'monthly',title:'Care plan',description:'Hosting, speed and security looked after, with small updates whenever you need them.',features:['Hosting and uptime monitoring','Speed and security checks','Small content updates each month'],enabled:true,price:149,was:249,unit:'month'},
  {id:'seo',group:'monthly',title:'SEO & AI visibility',description:'Be the business Google and AI assistants recommend in your area.',features:['Local SEO and Google Business Profile','New service and location content','AI-search tracking and monthly report'],enabled:true,price:690,was:990,from:true,unit:'month'},
  {id:'audit',group:'systems',title:'Business Systems Audit',description:'Two hours mapping how your enquiries, bookings and follow-up really work, with a written plan of what to fix first.',features:['Your leaks, in plain English','What to fix first and why','Credited to a build if you go ahead'],enabled:true,price:350,cta:'audit'},
  {id:'systems_build',group:'systems',title:'Backend systems build',description:'CRM, automations, bookings and payments connected into one system that runs without you chasing it.',features:['GoHighLevel CRM and pipelines','Automations and follow-up','Bookings, reminders and payments'],enabled:true},
  {id:'command_centre',group:'systems',title:'Your own Command Centre',description:'A private command centre for your business: connected to your CRM, bookings and payments, showing where revenue leaks and what to do next, with an AI assistant that briefs you daily.',features:['Your data, your private setup','Revenue-leak alerts and daily briefings','Built around how your business runs'],enabled:true,featured:true}
];
var OFFER_GROUPS = [['receptionist','01 · AI RECEPTION','Every enquiry answered. Day and night.','Start with a founding pilot: set up, tuned with you and live on your website within 48 hours.'],['website','02 · WEBSITES','A website that feels like your business.','Custom-coded, fast and built to turn visitors into booked clients. Founding prices for our first clients.'],['monthly','03 · MONTHLY PLANS','Keep it fast. Get found first.','Care for your site and grow your visibility on Google and AI search.'],['systems','04 · SYSTEMS & COMMAND','Connect everything behind the scenes.','From a two-hour audit to your own private command centre.']];
''')

# ---------------------------------------------------------------- 2) catalogue load/save carries prices
rep("items[item.id]={...item,title:typeof saved.title==='string'?saved.title.slice(0,100):item.title,description:typeof saved.description==='string'?saved.description.slice(0,500):item.description,enabled:typeof saved.enabled==='boolean'?saved.enabled:item.enabled};",
    "const num=(v,d)=>v===null?null:typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=1e7?v:d;items[item.id]={...item,title:typeof saved.title==='string'?saved.title.slice(0,100):item.title,description:typeof saved.description==='string'?saved.description.slice(0,500):item.description,enabled:typeof saved.enabled==='boolean'?saved.enabled:item.enabled,price:item.group==='receptionist'&&item.id!=='phone'?null:num(saved.price,item.price??null),was:item.group==='receptionist'?null:num(saved.was,item.was??null)};")
rep("const item={};for(const key of Object.keys(changes))if(!['title','description','enabled'].includes(key))throw new Error('Offer cards support title, description and visibility; no unapproved prices or checkout links.');",
    "const item={};const base=OFFER_PAGE_ITEMS.find(i=>i.id===id);for(const key of Object.keys(changes))if(!['title','description','enabled','price','was'].includes(key))throw new Error('Offer cards support title, description, visibility and price.');\n    for(const key of ['price','was'])if(key in changes){if(base.group==='receptionist'&&id!=='phone')throw new Error('Chat Receptionist and Front Desk prices are set in Settings (pilot prices and payment links).');const v=changes[key];if(v===null||v===''){item[key]=null;continue;}if(typeof v!=='number'||!Number.isFinite(v)||v<=0||v>1e7)throw new Error(base.title+': enter a price in whole dollars.');item[key]=Math.round(v);}")
rep("Object.fromEntries(Object.entries(next.items).map(([id,item])=>[id,{title:item.title,description:item.description,enabled:item.enabled}]))",
    "Object.fromEntries(Object.entries(next.items).map(([id,item])=>[id,{title:item.title,description:item.description,enabled:item.enabled,price:item.price??null,was:item.was??null}]))")
rep("// Store editable copy only; never duplicate pilot prices or payment links here.", "// Receptionist pilot prices/links live in the offer setting; other prices live here.")
rep("summary:'Offers page '+(next.published?'published':'saved as draft')+'. Receptionist pricing unchanged.'", "summary:'Offers page '+(next.published?'published':'saved as draft')+' (copy and prices).'")

# old default card copy saved in Command is replaced by the new copy
rep("const num=(v,d)=>v===null?null:", "const OLD=new Set(['AI receptionist · website chat','AI receptionist · chat + website voice','AI phone reception','Done-for-you website build','Website + AI chat receptionist','Website + chat & website voice','Help website visitors get answers and find the right next step, including when the front desk is busy.','Let visitors type or speak with your receptionist directly on your website.','Explore an AI receptionist that answers calls to a business phone number.']);const num=(v,d)=>v===null?null:")
rep("title:typeof saved.title==='string'?saved.title.slice(0,100):item.title,description:typeof saved.description==='string'?saved.description.slice(0,500):item.description,enabled:typeof saved.enabled==='boolean'?saved.enabled:item.enabled,price:",
    "title:typeof saved.title==='string'&&!OLD.has(saved.title)?saved.title.slice(0,100):item.title,description:typeof saved.description==='string'&&!OLD.has(saved.description)?saved.description.slice(0,500):item.description,enabled:typeof saved.enabled==='boolean'?saved.enabled:item.enabled,price:")

# ---------------------------------------------------------------- 3) state + public data use migrated prices
rep("const rawPricing=pricingRow?.value || {}, pricing={...DEFAULT_OFFER,...rawPricing};",
    "const rawPricing=pricingRow?.value || {}, pricing=offerOf({offer:rawPricing});")
between('function offersPublicData(state) {', 'async function offersSave(env,changes,revision) {', r'''function offersPublicData(state) {
  return {published:state.catalog.published,headline:state.catalog.headline,intro:state.catalog.intro,items:OFFER_PAGE_ITEMS.map(base=>{
    const i=state.catalog.items[base.id],voice=base.id==='web_voice',rec=base.id==='chat'||voice;
    const pilot=base.id==='chat'?offersPrice(state.pricing.pilot_price):voice?offersPrice(state.pricing.pilot_price_voice):null;
    const monthly=base.id==='chat'?offersPrice(state.pricing.monthly):voice?offersPrice(state.pricing.monthly_voice):null;
    return {id:base.id,group:base.group,title:i.title,description:i.description,features:base.features,enabled:i.enabled,featured:!!base.featured,cta:base.cta||'',pilot,monthly,
      price:rec?null:offersPrice(i.price),was:rec?null:offersPrice(i.was),from:!!base.from,unit:base.unit||'',
      pilot_days:Number.isInteger(+state.pricing.pilot_days)&&+state.pricing.pilot_days>0?+state.pricing.pilot_days:30,refund_days:+state.pricing.refund_days||0,live_hours:+state.pricing.live_hours||48,
      payment_link:pilot&&rec?offersPaymentLink(voice?state.pricing.payment_link_voice:state.pricing.payment_link):''};
  })};
}
''')

# ---------------------------------------------------------------- 4) new public page
between('function offersPageHtml(data,{preview=false}={}) {', 'async function offersPublic(request,env) {', r'''function offersPageHtml(data,{preview=false}={}) {
  const esc=esc6,book=offersLink(FREE_CALL3),audit='https://links.studioflowandsystems.com/widget/booking/letd3kiR8QpsaVL6SXkJ',cash=n=>'$'+Number(n).toLocaleString('en-AU',{maximumFractionDigits:0});
  const btn=(href,label,primary)=>'<a class="o-btn'+(primary?' pri':'')+'" href="'+esc(href)+'" target="_blank" rel="noopener">'+esc(label)+'</a>';
  const priceHtml=i=>{
    if(i.pilot&&i.monthly)return '<div class="o-price"><strong>'+cash(i.pilot)+'</strong><span>'+i.pilot_days+'-day founding pilot</span><em>then '+cash(i.monthly)+' a month</em></div>';
    if(i.price)return '<div class="o-price"><strong>'+(i.from?'<small>from </small>':'')+cash(i.price)+(i.unit?'<small> / '+esc(i.unit)+'</small>':'')+'</strong>'+(i.was?'<span>Founding price · normally <s>'+cash(i.was)+'</s></span>':i.unit?'<span>Month to month</span>':'<span>One-off</span>')+'</div>';
    return '<div class="o-price"><strong>Quoted</strong><span>Scoped on a free call</span></div>';
  };
  const card=i=>{
    const go=i.payment_link?btn(i.payment_link,i.id==='chat'?'Start the chat pilot':'Start the Front Desk pilot',true):i.cta==='audit'?btn(audit,'Book the audit',true):btn(book,i.price?'Book a call to start':'Book a call',!!i.featured);
    return '<article class="o-card'+(i.featured?' feat':'')+'" id="'+esc(i.id)+'">'+(i.featured?'<span class="o-badge">'+(i.group==='receptionist'?'Most popular':i.group==='website'?'Most chosen':'Flagship')+'</span>':'')+'<h3>'+esc(i.title)+'</h3><p>'+esc(i.description)+'</p>'+priceHtml(i)+'<ul>'+i.features.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><div class="o-go">'+go+'</div></article>';
  };
  const groups=OFFER_GROUPS.filter(([g])=>data.items.some(i=>i.group===g&&i.enabled));
  const rec=data.items.find(i=>i.id==='chat');
  const nav=groups.map(([g])=>'<a href="#'+g+'">'+({receptionist:'AI reception',website:'Websites',monthly:'Monthly plans',systems:'Systems'})[g]+'</a>').join('');
  return '<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offers & founding prices | Studio Flow & Systems</title><meta name="description" content="AI receptionists, premium websites, monthly care and SEO, and connected business systems from Studio Flow & Systems in Brisbane. Founding prices for our first clients."><meta name="robots" content="index,follow"><style>'+OFFERS_V27_CSS+'</style></head><body>'+
  '<div class="o-bg" aria-hidden="true"><i></i><i></i></div><header class="o-top"><a class="o-brand" href="https://www.studioflowandsystems.com/"><img src="/app/logo.webp?v='+APP.v+'" alt="Studio Flow & Systems" width="210" height="33"></a><nav>'+nav+btn(book,'Book a free call',true)+'</nav></header>'+(preview?'<p class="o-preview">Private preview · not published until you save</p>':'')+
  '<main><section class="o-hero"><div class="o-hero-copy"><p class="o-eyebrow">STUDIO FLOW &amp; SYSTEMS · BRISBANE</p><h1>'+esc(data.headline)+'</h1><p class="o-lead">'+esc(data.intro)+'</p><div class="o-acts">'+btn(book,'Book a free 30-minute call',true)+'<a class="o-btn ghost" href="#'+(groups[0]?.[0]||'receptionist')+'">See the offers ↓</a></div><ul class="o-proof"><li>Live in 48 hours</li><li>'+(rec&&rec.refund_days?rec.refund_days+'-day money-back guarantee':'Money-back guarantee')+'</li><li>Founding prices for our first clients</li></ul></div><div class="o-orb-wrap" aria-hidden="true"><div class="o-ring r1"></div><div class="o-ring r2"></div><div class="o-orb"></div><div class="o-chip c1">New enquiry · answered in 4s</div><div class="o-chip c2">Booked · Thu 10:30am</div></div></section>'+
  groups.map(([g,label,h,sub])=>'<section class="o-sec" id="'+g+'"><div class="o-head"><p class="o-eyebrow">'+label+'</p><h2>'+esc(h)+'</h2><p>'+esc(sub)+'</p></div><div class="o-grid n'+data.items.filter(i=>i.group===g&&i.enabled).length+'">'+data.items.filter(i=>i.group===g&&i.enabled).map(card).join('')+'</div></section>').join('')+
  '<section class="o-sec o-faq"><div class="o-head"><p class="o-eyebrow">GOOD TO KNOW</p><h2>A few straight answers.</h2></div><details><summary>What does the pilot cover?</summary><p>Setup, tuning with you and your first '+(rec?rec.pilot_days:30)+' days. After that it moves to the monthly price, month to month, and you can cancel anytime.</p></details><details><summary>Does website voice answer my phone?</summary><p>No. Website voice lets visitors talk to your receptionist on your website. Answering your phone line is the Phone AI receptionist, set up and tested separately.</p></details><details><summary>Why founding prices?</summary><p>We are taking on our first clients in each offer at a lower price in exchange for honest feedback and, where you are happy to, a case study. Prices move to the normal rate after that.</p></details><details><summary>Are prices in AUD and do they include GST?</summary><p>All prices are in Australian dollars. GST, scope and terms are confirmed in writing before any work starts. Website builds are 50% upfront and 50% at launch, and you own your domain, content and files.</p></details><details><summary>Do you guarantee Google rankings?</summary><p>No one honestly can. We build the foundations properly, keep improving them and report on what changes every month.</p></details></section>'+
  '<section class="o-close"><h2>Not sure where to start?</h2><p>Tell us what happens when someone visits, enquires or calls. In 30 minutes we will show you the one thing worth fixing first.</p>'+btn(book,'Book a free 30-minute call',true)+'</section></main><footer class="o-foot"><p>© '+new Date().getUTCFullYear()+' Studio Flow &amp; Systems · Brisbane, Australia · Prices in AUD.</p></footer></body></html>';
}
var OFFERS_V27_CSS = ":root{--bg:#030912;--ink:#eef6fc;--mu:#a9bdd0;--c:#7fd4ff;--ln:rgba(160,205,235,.16);--card:rgba(12,27,46,.72)}*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{background:var(--bg);color:var(--ink);font:400 16px/1.6 'Hanken Grotesk',Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}a{color:inherit;text-decoration:none}h1,h2,h3{font-family:Sora,'Hanken Grotesk',system-ui,sans-serif;letter-spacing:-.035em;line-height:1.05;font-weight:600}"
  + ".o-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(60% 50% at 80% 0%,rgba(40,120,200,.22),transparent 70%),radial-gradient(50% 40% at 0% 60%,rgba(20,90,170,.16),transparent 70%),linear-gradient(#030912,#040c18)}.o-bg i{position:absolute;inset:auto;width:60vw;height:60vw;border-radius:50%;filter:blur(90px);opacity:.25;background:#1b6fd1;top:-20vw;right:-20vw;animation:o-drift 18s ease-in-out infinite alternate}.o-bg i+i{background:#0ea5e9;left:-25vw;top:40vh;opacity:.12;animation-duration:24s}"
  + ".o-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px clamp(18px,4vw,48px);background:linear-gradient(#030912e6,#03091299);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--ln)}.o-brand img{display:block;width:190px;height:auto}.o-top nav{display:flex;align-items:center;gap:22px}.o-top nav>a:not(.o-btn){font-size:13px;color:#c5d6e4}.o-top nav>a:not(.o-btn):hover{color:#fff}"
  + ".o-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 22px;border-radius:999px;border:1px solid rgba(190,230,255,.35);color:#e9f6ff;font-weight:600;font-size:14px;transition:transform .18s cubic-bezier(.23,1,.32,1),background .2s,box-shadow .25s}.o-btn:active{transform:scale(.97)}.o-btn.pri{background:linear-gradient(180deg,#e9f8ff,#bfe7fb);color:#06162b;border-color:transparent;box-shadow:0 10px 30px -10px rgba(127,212,255,.6)}.o-btn.pri:hover{box-shadow:0 14px 40px -10px rgba(127,212,255,.85)}.o-btn.ghost:hover{background:rgba(200,235,255,.08)}"
  + ".o-preview{text-align:center;padding:10px;background:#12304f;font-size:12px;letter-spacing:.08em}main{max-width:1240px;margin:0 auto;padding:0 clamp(18px,4vw,48px)}.o-eyebrow{font-size:11px;letter-spacing:.18em;color:var(--c);font-weight:600}"
  + ".o-hero{display:grid;grid-template-columns:1.15fr .85fr;gap:40px;align-items:center;min-height:calc(100svh - 80px);padding:60px 0}.o-hero h1{font-size:clamp(46px,6.4vw,92px);margin:18px 0 24px;max-width:780px}.o-lead{font-size:clamp(16px,1.4vw,19px);color:#c6d6e4;max-width:560px}.o-acts{display:flex;gap:14px;flex-wrap:wrap;margin:32px 0 26px}.o-proof{list-style:none;display:flex;flex-wrap:wrap;gap:10px 22px;font-size:13px;color:var(--mu)}.o-proof li:before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--c);box-shadow:0 0 10px var(--c);margin-right:9px;vertical-align:middle}"
  + ".o-orb-wrap{position:relative;aspect-ratio:1;max-width:460px;width:100%;justify-self:center}.o-orb{position:absolute;inset:22%;border-radius:50%;background:radial-gradient(circle at 32% 28%,#f0fdff 0,#9ae6ff 10%,#2aa7f0 32%,#0b4fa8 58%,#041633 82%);box-shadow:inset -18px -26px 50px rgba(0,6,30,.8),inset 8px 10px 30px rgba(190,245,255,.5),0 0 90px rgba(40,170,255,.45),0 0 0 1px rgba(170,230,255,.4);animation:o-float 7s ease-in-out infinite}.o-orb:after{content:'';position:absolute;inset:-20%;border-radius:50%;background:conic-gradient(from 0deg,transparent,rgba(120,230,255,.35),transparent 40%,rgba(40,120,255,.3),transparent 75%);mix-blend-mode:screen;animation:o-spin 14s linear infinite;-webkit-mask:radial-gradient(circle,#000 58%,transparent 60%);mask:radial-gradient(circle,#000 58%,transparent 60%)}.o-ring{position:absolute;inset:6%;border-radius:50%;border:1px solid rgba(140,215,255,.22);transform:rotateX(68deg) rotateZ(0);animation:o-spin2 22s linear infinite}.o-ring.r2{inset:14%;border-color:rgba(140,215,255,.14);animation-duration:30s;animation-direction:reverse}.o-chip{position:absolute;padding:10px 14px;border-radius:12px;background:rgba(8,22,40,.85);border:1px solid var(--ln);font-size:12px;color:#d9eefb;box-shadow:0 18px 40px -16px #000;backdrop-filter:blur(10px);animation:o-float 8s ease-in-out infinite}.o-chip.c1{left:-4%;top:18%}.o-chip.c2{right:-2%;bottom:16%;animation-delay:-3s}.o-chip:before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#5ef0b0;margin-right:8px;box-shadow:0 0 10px #5ef0b0}"
  + ".o-sec{padding:110px 0 20px;scroll-margin-top:70px}.o-head{max-width:760px;margin-bottom:44px}.o-head h2{font-size:clamp(34px,4.4vw,60px);margin:14px 0 16px}.o-head p:not(.o-eyebrow){color:var(--mu);font-size:17px;max-width:620px}"
  + ".o-grid{display:grid;gap:18px;grid-template-columns:repeat(3,minmax(0,1fr))}.o-grid.n2{grid-template-columns:repeat(2,minmax(0,1fr))}.o-card{position:relative;display:flex;flex-direction:column;padding:30px 28px;border-radius:20px;background:var(--card);border:1px solid var(--ln);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);transition:transform .35s cubic-bezier(.23,1,.32,1),border-color .3s,box-shadow .35s}.o-card:hover{transform:translateY(-4px);border-color:rgba(127,212,255,.4);box-shadow:0 30px 60px -30px rgba(0,0,0,.8),0 0 40px -10px rgba(40,160,255,.25)}.o-card.feat{background:linear-gradient(160deg,rgba(28,78,130,.55),rgba(8,22,40,.85) 60%);border-color:rgba(127,212,255,.45)}.o-badge{position:absolute;top:-12px;left:26px;padding:5px 12px;border-radius:999px;background:linear-gradient(90deg,#7fd4ff,#3b82f6);color:#04101f;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.o-card h3{font-size:26px;margin-bottom:12px}.o-card>p{color:var(--mu);font-size:15px;min-height:72px}"
  + ".o-price{margin:22px 0;padding:20px 0;border-top:1px solid var(--ln);border-bottom:1px solid var(--ln)}.o-price strong{display:block;font:600 44px/1 Sora,system-ui,sans-serif;letter-spacing:-.04em}.o-price strong small{font-size:15px;font-weight:500;letter-spacing:0;color:var(--mu)}.o-price span{display:block;margin-top:10px;font-size:13px;color:var(--mu)}.o-price s{opacity:.7}.o-price em{display:block;font-style:normal;margin-top:4px;font-size:15px;color:#dff3ff;font-weight:600}"
  + ".o-card ul{list-style:none;display:grid;gap:10px;margin-bottom:26px}.o-card li{position:relative;padding-left:24px;font-size:14px;color:#d6e5f1}.o-card li:before{content:'';position:absolute;left:0;top:.5em;width:12px;height:7px;border-left:2px solid var(--c);border-bottom:2px solid var(--c);transform:rotate(-45deg)}.o-go{margin-top:auto}.o-go .o-btn{width:100%}"
  + ".o-faq details{border-bottom:1px solid var(--ln);padding:20px 0;max-width:860px}.o-faq summary{cursor:pointer;font-size:18px;font-weight:600;list-style:none;display:flex;justify-content:space-between;gap:20px}.o-faq summary:after{content:'+';color:var(--c);font-size:22px;line-height:1}.o-faq details[open] summary:after{content:'–'}.o-faq details p{color:var(--mu);margin-top:12px;max-width:760px}"
  + ".o-close{margin:110px 0 60px;padding:clamp(36px,6vw,80px);border-radius:28px;text-align:center;background:radial-gradient(70% 90% at 50% 0%,rgba(40,140,230,.35),transparent 70%),rgba(10,24,42,.8);border:1px solid var(--ln)}.o-close h2{font-size:clamp(32px,4.2vw,56px);margin-bottom:16px}.o-close p{color:var(--mu);max-width:560px;margin:0 auto 28px}.o-foot{text-align:center;padding:30px 20px 50px;color:#7f97ad;font-size:13px}"
  + "@keyframes o-float{50%{transform:translateY(-12px)}}@keyframes o-spin{to{transform:rotate(360deg)}}@keyframes o-spin2{to{transform:rotateX(68deg) rotateZ(360deg)}}@keyframes o-drift{to{transform:translate(-8vw,6vh) scale(1.1)}}"
  + "@media(max-width:1000px){.o-hero{grid-template-columns:1fr;min-height:0;padding:50px 0 10px}.o-orb-wrap{max-width:340px;order:-1}.o-grid,.o-grid.n2{grid-template-columns:1fr}.o-top nav>a:not(.o-btn){display:none}.o-card>p{min-height:0}.o-sec{padding-top:80px}}"
  + "@media(max-width:540px){.o-brand img{width:150px}.o-top .o-btn{min-height:40px;padding:0 14px;font-size:13px}.o-hero h1{font-size:44px}.o-chip{font-size:11px}.o-price strong{font-size:38px}}"
  + "@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}html{scroll-behavior:auto}}";
''')
rep("var DEFAULT_OFFERS_PAGE = {published:false,headline:'Smarter reception. Better websites.',intro:'AI receptionists, done-for-you websites and connected packages for established businesses. Choose a starting point, then we will shape it around how your business works.',items:{}};",
    "var DEFAULT_OFFERS_PAGE = {published:true,headline:'Everything your business needs to win the next enquiry.',intro:'AI receptionists, premium websites and connected systems for established Australian service businesses. Founding prices for our first clients.',items:{}};")
# old default headline saved in Command? map it to the new one
rep("headline:typeof raw.headline==='string'?raw.headline.slice(0,140):DEFAULT_OFFERS_PAGE.headline,intro:typeof raw.intro==='string'?raw.intro.slice(0,600):DEFAULT_OFFERS_PAGE.intro,items};",
    "headline:typeof raw.headline==='string'&&raw.headline!=='Smarter reception. Better websites.'?raw.headline.slice(0,140):DEFAULT_OFFERS_PAGE.headline,intro:typeof raw.intro==='string'&&!/^AI receptionists, done-for-you websites and connected packages/.test(raw.intro)?raw.intro.slice(0,600):DEFAULT_OFFERS_PAGE.intro,items};")

# ---------------------------------------------------------------- 5) Command > Offers admin: price inputs
rep("<p class=\"of-admin-price\">'+(fixed?money(price.pilot)+' pilot → '+money(price.monthly)+'/month':'Request a quote')+'</p><p class=\"mu sm\">'+(i.id==='web_voice'?'Voice in the website widget. Does not answer a business phone line.':i.id==='phone'?'A separate phone number, routing and test are needed before launch.':i.group==='bundle'?'No fixed bundle price or saving is assumed. Agree build and monthly scope in writing.':i.group==='website'?'Advanced motion, 3D and ongoing local SEO need an agreed scope.':'Current pilot pricing is shared with existing demo pages.')+'</p>'",
    "'+(fixed?'<p class=\"of-admin-price\">'+money(price.pilot)+' pilot → '+money(price.monthly)+'/month</p><p class=\"mu sm\">Set in Settings → pilot prices &amp; payment links. Demos, website and Studio AI use the same price.</p>':'<div class=\"row\" style=\"gap:10px;flex-wrap:wrap\"><label class=\"lab\" style=\"flex:1\">Price ($)<input class=\"in\" type=\"number\" min=\"0\" step=\"1\" data-offer-price value=\"'+esc(i.price==null?'':i.price)+'\" placeholder=\"Quoted\"></label><label class=\"lab\" style=\"flex:1\">Normal price ($)<input class=\"in\" type=\"number\" min=\"0\" step=\"1\" data-offer-was value=\"'+esc(i.was==null?'':i.was)+'\" placeholder=\"none\"></label></div><p class=\"mu sm\">Leave price empty to show \"Quoted\". Normal price shows crossed out as the founding discount.</p>')")
rep("{title:$('[data-offer-title]',box).value,description:$('[data-offer-description]',box).value,enabled:$('[data-offer-enabled]',box).checked}",
    "Object.assign({title:$('[data-offer-title]',box).value,description:$('[data-offer-description]',box).value,enabled:$('[data-offer-enabled]',box).checked},(()=>{const p=$('[data-offer-price]',box),w=$('[data-offer-was]',box);return p?{price:p.value===''?null:Math.round(+p.value),was:w.value===''?null:Math.round(+w.value)}:{};})())")
rep("<span class=\"chip\">'+esc(i.group==='receptionist'?'AI receptionist':i.group==='website'?'Website build':'Bundle')+'</span>",
    "<span class=\"chip\">'+esc(({receptionist:'AI receptionist',website:'Website',monthly:'Monthly plan',systems:'Systems'})[i.group]||i.group)+'</span>")
rep("<p class=\"mu\">Receptionists, website builds and connected packages. Review the page, then publish when the scope and links are ready.</p>",
    "<p class=\"mu\">Every price you sell at. Receptionist prices and Stripe links live in Settings; website, monthly and systems prices are set here. Your public offers page, Studio AI and the team all read them.</p>")
rep("<p class=\"mu sm\">Website voice and phone answering are separate offers. Websites and bundles are quote-based; this page does not invent package discounts.</p>",
    "<p class=\"mu sm\">Founding prices show with the normal price crossed out. Website voice and phone answering are separate offers.</p>")
rep("Prices below come from the existing receptionist offer settings. Check payment links and written terms before publishing.",
    "Receptionist prices come from Settings; edit website, monthly and systems prices on each card below, then Save page.")

# ---------------------------------------------------------------- 6) Team knowledge: the real price book
between('OFFERS AND PRICING (agreed 28 Oct 2026; starting ranges, AUD)', 'POSITIONING (WHERE WE\'RE GOING)', '''OFFERS AND PRICING (founding prices agreed 4 Nov 2026, AUD; the live list is Command > Offers and Settings)
0. Free 30-minute systems call (the main call to action).
1. AI receptionist: Chat Receptionist $497 pilot (setup + first 30 days) then $297/month. Front Desk (lead with this) $697 pilot then $497/month:
   chat + website voice, missed-call text-back, SMS follow-up, Google review requests, monthly results report. 14-day money-back guarantee, live in 48 hours.
   Phone AI receptionist (answers their phone line): quoted, from about $697/month.
2. Websites (founding / normal): Launch $3,500 / $4,900; Growth $6,900 / $9,500 (main offer); Signature from $12,000 / $18,000. 50% upfront, 50% at launch.
3. Monthly: Care plan $149 / $249 a month; SEO & AI visibility from $690 / $990 a month.
4. Business Systems Audit $350 (2 hours, credited to a build). Backend systems builds and the white-label Command Centre are quoted after a call.
Founding prices apply to the first 5 clients in each offer. Never prices in cold emails; never promise rankings or ROI.

''')

# ---------------------------------------------------------------- 7) Studio AI on the website quotes the full list
rep("• Websites, CRM (GoHighLevel), automation, bookings & payments, customer journeys, local SEO foundations, and bundles (website + AI receptionist; website + CRM + automation): scoped and quoted after a call. SEO foundations never mean guaranteed rankings.",
    "• Websites (founding prices for our first clients, AUD): Launch A$3,500 (normally A$4,900), Growth A$6,900 (normally A$9,500, our main build), Signature from A$12,000 (normally from A$18,000). 50% upfront, 50% at launch; final scope confirmed on a call.\n• Monthly plans: Care plan A$149/month (normally A$249); SEO & AI visibility from A$690/month (normally A$990). SEO never means guaranteed rankings.\n• CRM (GoHighLevel), automation, bookings & payments, customer journeys, and a business's own private command centre (dashboard + AI briefings): scoped and quoted after a call.")
rep("• Systems Audit: a 2-hour paid session with Ty to map the business's enquiry, booking and follow-up systems (book via the audit calendar; Ty confirms the fee on booking).",
    "• Business Systems Audit: A$350, a 2-hour session with Ty mapping the business's enquiry, booking and follow-up systems, credited to a build (book via the audit calendar).")

open(f, 'w').write(s)
print('v27 price book + premium offers page applied')

# 8) Old Stripe links saved in Command are swapped for the new subscription links automatically
s = open(f).read()
OLDNEW = "var LINK_SWAP = { 'https://buy.stripe.com/8x214oggZ72I5ENboOeZ204': 'https://buy.stripe.com/3cI5kE7Kteva3wF8cCeZ207', 'https://buy.stripe.com/8x24gAe8Rcn20ktakKeZ205': 'https://buy.stripe.com/cNidRaaWFdr69V31OeeZ206' };\n"
old = "var OLD_MONTHLY = { 597: 297, 797: 497 };\n"
assert s.count(old) == 1
s = s.replace(old, old + OLDNEW, 1)
old2 = "o.plan_chat = o.plan_chat || DEFAULT_OFFER.plan_chat;"
assert s.count(old2) == 1
s = s.replace(old2, "o.payment_link = LINK_SWAP[o.payment_link] || o.payment_link; o.payment_link_voice = LINK_SWAP[o.payment_link_voice] || o.payment_link_voice; " + old2, 1)
old3 = "if (okLink(v.payment_link)) { base.payment_link = v.payment_link;"
assert s.count(old3) == 1
s = s.replace(old3, "for (const k of ['payment_link', 'payment_link_voice']) if (typeof v[k] === 'string') v[k] = ({ 'https://buy.stripe.com/8x214oggZ72I5ENboOeZ204': 'https://buy.stripe.com/3cI5kE7Kteva3wF8cCeZ207', 'https://buy.stripe.com/8x24gAe8Rcn20ktakKeZ205': 'https://buy.stripe.com/cNidRaaWFdr69V31OeeZ206' })[v[k]] || v[k];\n    " + old3, 1)
open(f, 'w').write(s)
print('v27 stripe link swap applied')

# 9) Hero: the real Studio AI WebGL orb (same engine as the receptionist), CSS orb as fallback
s = open(f).read()
def r2(old, new, count=1):
    global s
    assert s.count(old) == count, (s.count(old), old[:100])
    s = s.replace(old, new)
r2("function offersPageHtml(data,{preview=false}={}) {", "function offersPageHtml(data,{preview=false,nonce=''}={}) {")
r2('<div class="o-orb"></div><div class="o-chip c1">', '<div class="o-orb"></div><div class="o-gl" id="ogl"></div><div class="o-chip c1">')
r2("</footer></body></html>';\n}\nvar OFFERS_V27_CSS", "</footer>'+(nonce?'<script nonce=\"'+nonce+'\">'+ORB_ENGINE+';(function(){try{var t=document.createElement(\"canvas\");if(!(t.getContext(\"webgl\")||t.getContext(\"experimental-webgl\")))return;SFO.add(document.getElementById(\"ogl\"),\"#38bdf8\",{big:true});document.querySelector(\".o-orb-wrap\").classList.add(\"gl\")}catch(e){}})();</script>':'')+'</body></html>';\n}\nvar OFFERS_V27_CSS")
r2('".o-orb-wrap{position:relative;aspect-ratio:1;max-width:460px;width:100%;justify-self:center}', '".o-orb-wrap{position:relative;aspect-ratio:1;max-width:580px;width:115%;justify-self:end;margin-right:-6%}.o-gl{position:absolute;inset:18%;border-radius:50%;animation:o-float 7s ease-in-out infinite}.o-orb-wrap.gl .o-orb{opacity:0}.o-orb-wrap.gl .o-gl{filter:drop-shadow(0 0 60px rgba(40,170,255,.45))}')
r2(".o-orb{position:absolute;inset:22%;", ".o-orb{position:absolute;inset:18%;")
r2("const state=await offersState(env),data=offersPublicData(state);", "const state=await offersState(env),data=offersPublicData(state),nonce=crypto.randomUUID().replace(/-/g,'');")
r2("offersPageHtml(data),{headers:{'Content-Type':'text/html; charset=utf-8'", "offersPageHtml(data,{nonce}),{headers:{'Content-Type':'text/html; charset=utf-8'")
r2("'Content-Security-Policy':\"default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'\"", "'Content-Security-Policy':\"default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; script-src 'nonce-\"+nonce+\"'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'\"")
r2("@media(max-width:1000px){.o-hero{grid-template-columns:1fr;min-height:0;padding:50px 0 10px}.o-orb-wrap{max-width:340px;order:-1}", "@media(max-width:1000px){.o-hero{grid-template-columns:1fr;min-height:0;padding:50px 0 10px}.o-orb-wrap{max-width:360px;width:100%;margin:0 auto;justify-self:center;order:-1}")
open(f, 'w').write(s)
print('v27 webgl orb applied')

# 10) Settings: a proper "Receptionist plans" panel (names, prices and Stripe links in one place)
s = open(f).read()
a = s.index("'<div class=\"rule\" style=\"flex-wrap:wrap\"><div class=\"grow\"><b>Pilot payment links (Stripe)</b>")
b = s.index("'<div class=\"rule\"><div class=\"grow\"><b>Telegram</b>", a)
panel = r"""'<div class="rule" style="flex-wrap:wrap;align-items:flex-start"><div class="grow" style="flex:1 1 260px"><b>Receptionist plans &amp; Stripe links</b><span class="mu xs">The master price. Demo pages (including ones already sent), your website, the offers page, Studio AI and the team all use these. The pilot covers setup + the first 30 days, then the monthly price starts automatically in Stripe.</span></div><div class="stack" style="flex:2 1 520px;gap:14px">' + [["", "Chat Receptionist", "pilot_price", "monthly", "payment_link", 497, 297], ["V", "Front Desk (most popular)", "pilot_price_voice", "monthly_voice", "payment_link_voice", 697, 497]].map(function (p) { var o = s.offer || {}, SW = { "https://buy.stripe.com/8x214oggZ72I5ENboOeZ204": "https://buy.stripe.com/3cI5kE7Kteva3wF8cCeZ207", "https://buy.stripe.com/8x24gAe8Rcn20ktakKeZ205": "https://buy.stripe.com/cNidRaaWFdr69V31OeeZ206" }, MO = { 597: 297, 797: 497 }, link = o[p[4]] ? (SW[o[p[4]]] || o[p[4]]) : (p[0] ? "https://buy.stripe.com/cNidRaaWFdr69V31OeeZ206" : "https://buy.stripe.com/3cI5kE7Kteva3wF8cCeZ207"); return '<div style="border:1px solid var(--ln);border-radius:14px;padding:14px 16px;background:rgba(255,255,255,.02)"><div class="row sp" style="margin-bottom:10px"><b>' + p[1] + '</b><span class="chip ok">Live on demos</span></div><div class="row" style="gap:10px;flex-wrap:wrap"><label class="lab" style="flex:1 1 120px;margin:0">Pilot ($, setup + 30 days)<input class="in" type="number" min="0" step="1" id="pp' + p[0] + '" value="' + esc(o[p[2]] || p[5]) + '"></label><label class="lab" style="flex:1 1 120px;margin:0">Then monthly ($)<input class="in" type="number" min="0" step="1" id="pm' + p[0] + '" value="' + esc(MO[o[p[3]]] || o[p[3]] || p[6]) + '"></label></div><label class="lab" style="margin:10px 0 0">Stripe payment link<input class="in" type="url" id="payLink' + p[0] + '" placeholder="https://buy.stripe.com/…" value="' + esc(link) + '"></label></div>'; }).join("") + '<div class="row" style="gap:10px;align-items:center"><button class="btn sm pri" id="paySave">Save plans</button><span class="mu xs">If you change a price here, change the matching price in Stripe too.</span></div></div></div>' +
      """
s = s[:a] + panel + s[b:]
old = 'const v = $("#payLink", el).value.trim(), vv = $("#payLinkV", el).value.trim(); try { await team("/settings", { method: "POST", body: { offer: { payment_link: v, payment_link_voice: vv } } }); toast("Payment links saved \\u2713 Both demo buttons now take payment" + (vv ? "" : " (voice button books a call until you add its link)"), "ok");'
assert s.count(old) == 1, 'paySave'
s = s.replace(old, 'const v = $("#payLink", el).value.trim(), vv = $("#payLinkV", el).value.trim(); try { await team("/settings", { method: "POST", body: { offer: { payment_link: v, payment_link_voice: vv, pilot_price: $("#pp", el).value, monthly: $("#pm", el).value, pilot_price_voice: $("#ppV", el).value, monthly_voice: $("#pmV", el).value } } }); toast("Plans saved \\u2713 Demos, website and offers page now use these prices and links", "ok");', 1)

# 11) Bust the browser's year-long cache of the Command app on every build
import hashlib, re
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
newv = hashlib.sha1(s.encode()).hexdigest()[:10]
s = s.replace(oldv, newv)
open(f, 'w').write(s)
print('v27 settings panel + app cache version', oldv, '->', newv)
