// ── v58 design engine: 7 new scroll moments, a per-brand "design DNA" so no two demos look alike, tighter spacing ──
WSD_VARIANTS.hero.push("zoomthrough");
WSD_VARIANTS.features.push("list", "panels", "flip");
WSD_VARIANTS.split.push("circle");
WSD_VARIANTS.expand = ["grow"];
WSD_VARIANTS.compare = ["slider"];
var WSD_DNA = {
  c: ["soft", "sharp", "pill"],            // corners
  k: ["glass", "outline", "solid", "lift"], // cards
  i: ["round", "arch", "tilt", "frame"],    // image treatment
  b: ["plain", "bands", "dark"],            // section backgrounds
  h: ["left", "center", "split"],           // section headings
  n: ["pill", "square", "underline"],       // buttons
  x: ["none", "grain", "grid", "dots"]      // background texture
};
function wsdDnaPick(seed, avoid = []) {
  let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const pickOne = (k, i) => WSD_DNA[k][(h >>> (i * 3)) % WSD_DNA[k].length];
  let dna = Object.fromEntries(Object.keys(WSD_DNA).map((k, i) => [k, pickOne(k, i)]));
  // never repeat the last few demos' look: change the most visible traits if it matches one
  for (const a of avoid) {
    if (!a) continue;
    const same = Object.keys(WSD_DNA).filter((k) => a[k] === dna[k]).length;
    if (same >= 4) for (const k of ["k", "i", "b", "h"]) if (a[k] === dna[k]) { const l = WSD_DNA[k]; dna[k] = l[(l.indexOf(dna[k]) + 1 + (h % (l.length - 1))) % l.length]; }
  }
  return dna;
}
var wsdDnaClass = (dna) => dna && typeof dna === "object" ? Object.keys(WSD_DNA).map((k) => WSD_DNA[k].includes(dna[k]) ? "dna-" + k + "-" + dna[k] : "").join(" ") : "";
(function () {
  const H = WSD_SECTIONS.hero, F = WSD_SECTIONS.features, S = WSD_SECTIONS.split;
  const head = (s) => `<div class="sec-head">${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title, s.highlight)}</h2>${s.sub ? `<p class="lead" data-up>${wsdE(s.sub)}</p>` : ""}</div>`;
  // 1. Zoom-through hero: a giant word grows until you fly through it into their photo
  WSD_SECTIONS.hero = (s, spec, t) => {
    if (s.variant !== "zoomthrough") return H(s, spec, t);
    const im = wsdArr(s.images, 2), word = String(s.giant || spec.brand?.logo_text || s.title || "").split(/\s+/).slice(0, 2).join(" ");
    return `<section class="hero hero-zt" id="top" data-zt><div class="zt-stick"><div class="zt-bg">${wsdImg(im[0], s.title, "full")}<i class="shade"></i></div><div class="zt-word" aria-hidden="true">${wsdE(word)}</div><div class="wrap zt-copy">${s.kicker ? `<p class="kick hero-kick">${wsdE(s.kicker)}</p>` : ""}<h1 class="h-hero">${wsdHl(s.title, s.highlight)}</h1>${s.sub ? `<p class="lead">${wsdE(s.sub)}</p>` : ""}<div class="acts">${wsdBtn(s.cta || "Get in touch", "#contact", "p", "data-mag")}${wsdBtn(s.cta2, s.cta2_href || "#features", "g", "data-mag")}</div></div></div></section>`;
  };
  WSD_SECTIONS.features = (s, spec, t) => {
    const it = wsdArr(s.items, 8);
    if (!it.length || !["list", "panels", "flip"].includes(s.variant)) return F(s, spec, t);
    // 2. Big-type service list: hover (or tap) a service and its photo slides in
    if (s.variant === "list") return `<section class="sec feat feat-list" id="features"><div class="wrap">${head(s)}<ol class="fl">${it.map((x, i) => `<li class="fl-it" data-up tabindex="0"><span class="fl-n">${String(i + 1).padStart(2, "0")}</span><div class="fl-b"><h3>${wsdE(x.title)}</h3><p>${wsdE(x.text)}</p></div>${wsdImg(x.image, x.title, "fl-im")}</li>`).join("")}</ol></div></section>`;
    // 3. Expanding panels: photos side by side, the one you hover opens up with its story
    if (s.variant === "panels") return `<section class="sec feat feat-panels" id="features"><div class="wrap">${head(s)}<div class="pn">${it.slice(0, 5).map((x, i) => `<article class="pn-it${i ? "" : " on"}" tabindex="0">${wsdImg(x.image, x.title, "pn-im")}<div class="pn-b"><span>${wsdE(x.tag || String(i + 1).padStart(2, "0"))}</span><h3>${wsdE(x.title)}</h3><p>${wsdE(x.text)}</p></div></article>`).join("")}</div></div></section>`;
    // 4. Flip cards: each card turns over as it scrolls into view to reveal the detail
    return `<section class="sec feat feat-flip" id="features"><div class="wrap">${head(s)}<div class="fp">${it.slice(0, 6).map((x, i) => `<div class="fp-c" data-flip style="--i:${i}"><div class="fp-in"><div class="fp-f">${wsdImg(x.image, x.title, "fp-im")}<h3>${wsdE(x.title)}</h3></div><div class="fp-bk"><span class="num">${String(i + 1).padStart(2, "0")}</span><h3>${wsdE(x.title)}</h3><p>${wsdE(x.text)}</p></div></div></div>`).join("")}</div></div></section>`;
  };
  // 5. Circle reveal: their photo opens out of a circle as you scroll
  WSD_SECTIONS.split = (s, spec, t) => {
    if (s.variant !== "circle" || !s.title) return S(s, spec, t);
    const bl = wsdArr(s.bullets, 6);
    return `<section class="sec split split-circle ${s.flip ? "flip" : ""}"><div class="wrap split-grid">${wsdImg(s.image, s.title, "split-im", "data-circle")}<div>${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title, s.highlight)}</h2>${s.text ? `<p class="lead" data-up>${wsdE(s.text)}</p>` : ""}${bl.length ? `<ul class="ticks">${bl.map((b) => `<li data-up>${wsdE(b)}</li>`).join("")}</ul>` : ""}${wsdBtn(s.cta, "#contact", "p", "data-mag")}</div></div></section>`;
  };
  // 6. Expand: a framed photo grows to fill the screen with a headline over it
  WSD_SECTIONS.expand = (s) => {
    if (!s.title) return "";
    return `<section class="xp" data-xp><div class="xp-stick">${wsdImg(s.image || wsdArr(s.images, 1)[0], s.title, "xp-im")}<div class="xp-copy">${wsdKick(s.kicker)}<h2 class="h2">${wsdHl(s.title, s.highlight)}</h2>${s.text ? `<p class="lead">${wsdE(s.text)}</p>` : ""}${wsdBtn(s.cta, "#contact", "p", "data-mag")}</div></div></section>`;
  };
  // 7. Before / after: drag the handle to compare (results, a makeover, their old site vs the new)
  WSD_SECTIONS.compare = (s) => {
    const a = s.before || wsdArr(s.images, 2)[0], b = s.after || wsdArr(s.images, 2)[1];
    if (!wsdUrl(a) || !wsdUrl(b) || !s.title) return "";
    return `<section class="sec cmp"><div class="wrap">${head(s)}<div class="cmp-box" data-cmp style="--x:50%">${wsdImg(b, s.after_label || "After", "cmp-b")}<div class="cmp-a">${wsdImg(a, s.before_label || "Before", "cmp-im")}</div><span class="cmp-l l1">${wsdE(s.before_label || "Before")}</span><span class="cmp-l l2">${wsdE(s.after_label || "After")}</span><i class="cmp-h" aria-hidden="true"></i><input type="range" min="0" max="100" value="50" aria-label="Compare before and after"></div></div></section>`;
  };
})();
function WSD_CSS2(t) {
  return `
/* v58 spacing: no big empty gaps between sections */
.sec{padding:clamp(44px,5.5vw,84px) 0}.sec+.sec{padding-top:clamp(8px,1.6vw,24px)}.dna-b-bands .sec+.sec,.dna-b-dark .sec+.sec{padding-top:clamp(44px,5.5vw,84px)}
.hero{padding-bottom:clamp(36px,4vw,60px)}.jr-pin{height:calc(var(--n) * 62vh + 30vh)}.gz{height:170vh}.sec-head{margin-bottom:clamp(22px,3vw,40px)}
@media(max-width:820px){.sec{padding:40px 0}.sec+.sec{padding-top:8px}.dna-b-bands .sec+.sec,.dna-b-dark .sec+.sec{padding-top:40px}.jr-pin{height:auto}}
/* design DNA */
.dna-c-sharp{--r:3px}.dna-c-pill{--r:30px}.dna-c-pill .btn{border-radius:999px}.dna-c-sharp .btn{border-radius:2px}
.dna-k-glass .card,.dna-k-glass .quote,.dna-k-glass .pn-b{background:color-mix(in srgb,var(--sf) 62%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid color-mix(in srgb,var(--ink) 10%,transparent)}
.dna-k-outline .card,.dna-k-outline .quote{background:transparent;border:1.5px solid var(--ink);box-shadow:none}
.dna-k-solid .card,.dna-k-solid .quote{background:var(--p);color:var(--onp);border:0}.dna-k-solid .card p,.dna-k-solid .quote figcaption{color:inherit;opacity:.85}
.dna-k-lift .card,.dna-k-lift .quote{border:0;box-shadow:0 30px 60px -28px color-mix(in srgb,var(--ink) 45%,transparent),0 2px 6px color-mix(in srgb,var(--ink) 8%,transparent)}
.dna-i-arch .split-im,.dna-i-arch .card-im{border-radius:999px 999px var(--r) var(--r)!important;overflow:hidden}
.dna-i-tilt .split-im{transform:rotate(-2.2deg)}.dna-i-tilt .card-im{transform:rotate(1.2deg)}
.dna-i-frame .split-im{box-shadow:18px 18px 0 -2px var(--a);border-radius:var(--r);overflow:hidden}
.dna-i-round .split-im{border-radius:calc(var(--r) * 1.6);overflow:hidden}
.dna-b-bands main>section:nth-of-type(even):not(.hero):not(.mq){background:var(--sf)}
.dna-b-dark main>section:nth-of-type(4n+3):not(.hero):not(.mq){background:color-mix(in srgb,var(--ink) 92%,var(--p));color:var(--bg)}.dna-b-dark main>section:nth-of-type(4n+3) .lead,.dna-b-dark main>section:nth-of-type(4n+3) p{color:color-mix(in srgb,var(--bg) 78%,transparent)}
.dna-h-center .sec-head,.dna-h-center .tst-head{text-align:center;margin-inline:auto;max-width:860px}.dna-h-center .sec-head .kick{justify-content:center}
.dna-h-split .sec-head{display:grid;grid-template-columns:1fr 1fr;gap:12px 48px;align-items:end;max-width:none}.dna-h-split .sec-head .kick{grid-column:1/-1}@media(max-width:820px){.dna-h-split .sec-head{display:block}}
.dna-n-square .btn{border-radius:0;letter-spacing:.06em;text-transform:uppercase;font-size:.86em}.dna-n-underline .btn-g{background:none;border:0;border-bottom:2px solid currentColor;border-radius:0;padding-inline:2px}
.dna-x-grain body::before,body.dna-x-grain::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:1;opacity:.06;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
body.dna-x-grid{background-image:linear-gradient(color-mix(in srgb,var(--ink) 5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--ink) 5%,transparent) 1px,transparent 1px);background-size:64px 64px}
body.dna-x-dots{background-image:radial-gradient(color-mix(in srgb,var(--ink) 9%,transparent) 1.2px,transparent 1.4px);background-size:26px 26px}
/* 1 zoom-through hero */
.hero-zt{padding:0;min-height:0;height:190vh;display:block;color:#fff}.zt-stick{position:sticky;top:0;height:100svh;overflow:hidden;display:flex;align-items:flex-end}
.zt-bg{position:absolute;inset:0}.zt-bg .im{position:absolute;inset:0;border-radius:0}.zt-bg img{width:100%;height:100%;object-fit:cover}.zt-bg .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.62))}
.zt-word{position:absolute;inset:0;display:grid;place-items:center;font:var(--dw) clamp(64px,16vw,250px)/.9 var(--fd);letter-spacing:-.04em;color:var(--p);z-index:2;text-align:center;padding:0 3vw;will-change:transform,opacity;overflow-wrap:anywhere}
.zt-word::before{content:"";position:absolute;inset:-50%;background:var(--bg);z-index:-1;opacity:var(--zb,1)}
.zt-copy{position:relative;z-index:3;padding-bottom:clamp(48px,8vh,96px);opacity:0;transform:translateY(30px)}.zt-copy .h-hero{color:#fff;max-width:16ch}.zt-copy .lead{color:rgba(255,255,255,.88);max-width:56ch}
@media(prefers-reduced-motion:reduce){.hero-zt{height:auto}.zt-stick{position:relative;min-height:92svh}.zt-word{display:none}.zt-copy{opacity:1;transform:none}}
/* 2 big-type list */
.fl{list-style:none;border-top:1px solid var(--ln)}.fl-it{position:relative;display:grid;grid-template-columns:70px 1fr;gap:18px;padding:clamp(18px,2.4vw,30px) 0;border-bottom:1px solid var(--ln);cursor:default;outline:none}
.fl-n{font:600 14px/1 var(--fb);color:var(--p);padding-top:.7em}.fl-b h3{font-size:clamp(28px,4.4vw,64px);line-height:1;letter-spacing:-.03em;transition:color .35s,transform .45s cubic-bezier(.2,.8,.2,1)}.fl-b p{max-width:52ch;color:var(--mu);margin-top:10px}
.fl-im{position:absolute;right:0;top:50%;width:min(30vw,380px);aspect-ratio:4/3;border-radius:var(--r);overflow:hidden;opacity:0;transform:translateY(-50%) rotate(-4deg) scale(.86);transition:opacity .4s,transform .55s cubic-bezier(.2,.8,.2,1);pointer-events:none;z-index:2;box-shadow:0 30px 60px -20px rgba(0,0,0,.35)}.fl-im img{width:100%;height:100%;object-fit:cover}
.fl-it:hover .fl-b h3,.fl-it:focus .fl-b h3{color:var(--p);transform:translateX(14px)}.fl-it:hover .fl-im,.fl-it:focus .fl-im{opacity:1;transform:translateY(-50%) rotate(-2deg) scale(1)}
@media(max-width:820px){.fl-it{grid-template-columns:44px 1fr}.fl-im{position:relative;grid-column:2;top:auto;right:auto;width:100%;opacity:1;transform:none;margin-top:12px}}
/* 3 expanding panels */
.pn{display:flex;gap:12px;height:clamp(420px,62vh,620px)}.pn-it{position:relative;flex:1;min-width:0;border-radius:var(--r);overflow:hidden;transition:flex .7s cubic-bezier(.2,.8,.2,1);cursor:pointer;outline:none;background:var(--sf)}
.pn-it.on,.pn-it:hover,.pn-it:focus{flex:3.6}.pn-im{position:absolute;inset:0;border-radius:0}.pn-im img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s}.pn-it.on .pn-im img{transform:scale(1.06)}
.pn-b{position:absolute;left:0;right:0;bottom:0;padding:22px;color:#fff;background:linear-gradient(180deg,transparent,rgba(0,0,0,.72))}.pn-b span{font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85}.pn-b h3{margin:6px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pn-b p{max-height:0;opacity:0;overflow:hidden;transition:max-height .6s,opacity .5s;color:rgba(255,255,255,.88)}
.pn-it.on .pn-b p,.pn-it:hover .pn-b p{max-height:160px;opacity:1}.pn-it.on .pn-b h3{white-space:normal}
@media(max-width:820px){.pn{flex-direction:column;height:auto}.pn-it{min-height:120px;flex:none}.pn-it.on{min-height:340px}}
/* 4 flip cards */
.fp{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:18px;perspective:1400px}.fp-c{height:clamp(300px,34vw,380px)}.fp-in{position:relative;height:100%;transform-style:preserve-3d;transition:transform .9s cubic-bezier(.2,.8,.2,1)}
.fp-c.on .fp-in{transform:rotateY(180deg)}.fp-f,.fp-bk{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:var(--r);overflow:hidden}
.fp-f .im{position:absolute;inset:0;border-radius:0}.fp-f img{width:100%;height:100%;object-fit:cover}.fp-f h3{position:absolute;left:0;right:0;bottom:0;padding:22px;color:#fff;background:linear-gradient(180deg,transparent,rgba(0,0,0,.7))}
.fp-bk{transform:rotateY(180deg);background:var(--p);color:var(--onp);padding:28px;display:flex;flex-direction:column;justify-content:flex-end;gap:10px}.fp-bk p{opacity:.9}
@media(prefers-reduced-motion:reduce){.fp-c.on .fp-in{transform:none}.fp-bk{position:relative;transform:none}}
/* 5 circle reveal */
[data-circle]{clip-path:circle(18% at 50% 50%)}
/* 6 expand */
.xp{height:210vh;position:relative}.xp-stick{position:sticky;top:0;height:100svh;overflow:hidden;display:grid;place-items:center}.xp-im{position:absolute;inset:0;border-radius:0;clip-path:inset(18% 22% round 28px)}.xp-im img{width:100%;height:100%;object-fit:cover}
.xp-copy{position:relative;z-index:2;color:#fff;text-align:center;max-width:860px;padding:0 20px;opacity:0;transform:translateY(40px)}.xp-copy .h2{color:#fff}.xp-copy .lead{color:rgba(255,255,255,.9);margin-inline:auto}.xp-stick::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,.4);opacity:var(--xo,0);pointer-events:none;z-index:1}
@media(max-width:820px),(prefers-reduced-motion:reduce){.xp{height:auto}.xp-stick{position:relative;min-height:80svh}.xp-im{clip-path:none}.xp-copy{opacity:1;transform:none}.xp-stick::after{opacity:1}}
/* 7 before / after */
.cmp-box{position:relative;aspect-ratio:16/9;border-radius:var(--r);overflow:hidden;user-select:none}.cmp-box .im{position:absolute;inset:0;border-radius:0}.cmp-box img{width:100%;height:100%;object-fit:cover}
.cmp-a{position:absolute;inset:0;clip-path:inset(0 calc(100% - var(--x)) 0 0)}.cmp-h{position:absolute;top:0;bottom:0;left:var(--x);width:3px;margin-left:-1.5px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.15)}
.cmp-h::after{content:"\\2194";position:absolute;top:50%;left:50%;width:46px;height:46px;margin:-23px;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;font-size:20px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.cmp-box input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize}.cmp-l{position:absolute;top:14px;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:13px}.cmp-l.l1{left:14px}.cmp-l.l2{right:14px}
.zt-copy .hl,.xp-copy .hl,.pn-b .hl{color:var(--a)}.zt-copy .kick,.xp-copy .kick{color:rgba(255,255,255,.9)}
.ai-note{font-size:12px;opacity:.7}`;
}
var WSD_MOTION2 = `(function(){var d=document;d.querySelectorAll('[data-cmp]').forEach(function(b){var r=b.querySelector('input');if(r)r.addEventListener('input',function(){b.style.setProperty('--x',r.value+'%')})});
d.querySelectorAll('.pn').forEach(function(p){var its=[].slice.call(p.querySelectorAll('.pn-it'));its.forEach(function(it){var on=function(){its.forEach(function(x){x.classList.toggle('on',x===it)})};it.addEventListener('mouseenter',on);it.addEventListener('click',on);it.addEventListener('focus',on)})});
var R=matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var c=e.target;setTimeout(function(){c.classList.add('on')},R?0:300+(+getComputedStyle(c).getPropertyValue('--i')||0)*160);io.unobserve(c)}})},{threshold:.55});d.querySelectorAll('[data-flip]').forEach(function(c){io.observe(c)})}
if(!window.gsap||!window.ScrollTrigger||R)return;var g=gsap,ST=ScrollTrigger;g.registerPlugin(ST);var mob=matchMedia('(max-width:820px)').matches;
d.querySelectorAll('[data-zt]').forEach(function(s){var w=s.querySelector('.zt-word'),c=s.querySelector('.zt-copy'),bg=s.querySelector('.zt-bg');var tl=g.timeline({scrollTrigger:{trigger:s,start:'top top',end:'bottom bottom',scrub:.6}});tl.to(w,{scale:mob?9:14,ease:'power2.in',duration:1},0).to(w,{'--zb':0,duration:.35},.1).to(w,{opacity:0,duration:.25},.75).fromTo(bg,{scale:1.25},{scale:1,duration:1},0).to(c,{opacity:1,y:0,duration:.3},.72)});
d.querySelectorAll('[data-circle]').forEach(function(el){g.fromTo(el,{clipPath:'circle(18% at 50% 50%)'},{clipPath:'circle(75% at 50% 50%)',ease:'none',scrollTrigger:{trigger:el,start:'top 85%',end:'center 45%',scrub:.5}})});
if(!mob)d.querySelectorAll('[data-xp]').forEach(function(s){var im=s.querySelector('.xp-im'),c=s.querySelector('.xp-copy'),st=s.querySelector('.xp-stick');var tl=g.timeline({scrollTrigger:{trigger:s,start:'top top',end:'bottom bottom',scrub:.6}});tl.fromTo(im,{clipPath:'inset(18% 22% round 28px)'},{clipPath:'inset(0% 0% round 0px)',ease:'none',duration:1},0).to(st,{'--xo':1,duration:.4},.5).to(c,{opacity:1,y:0,duration:.35},.62)});
})();`;
