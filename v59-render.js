// ── v59: the Playball standard. Booking finder, quote builder and founder sections, plus "more of our work". ──
WSD_VARIANTS.finder = ["tabs"];
WSD_VARIANTS.quote = ["sliders"];
WSD_VARIANTS.founder = ["portrait"];
(function () {
  const head = (s) => `<div class="sec-head">${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title, s.highlight)}</h2>${s.sub ? `<p class="lead" data-up>${wsdE(s.sub)}</p>` : ""}</div>`;
  // Booking finder: filter by age / service / suburb, live "only 3 left", Book or Join waitlist
  WSD_SECTIONS.finder = (s) => {
    const it = wsdArr(s.items, 12);
    if (!it.length || !s.title) return "";
    const tabs = [...new Set(it.map((x) => x && x.tab).filter(Boolean))].slice(0, 6);
    return `<section class="sec fnd" id="book"><div class="wrap">${head(s)}${tabs.length > 1 ? `<div class="fnd-tabs" role="tablist"><button type="button" class="on" data-fnd="*">${wsdE(s.all_label || "All")}</button>${tabs.map((t) => `<button type="button" data-fnd="${wsdE(t)}">${wsdE(t)}</button>`).join("")}</div>` : ""}<div class="fnd-grid">${it.map((x) => {
      const sp = x.spots == null || x.spots === "" ? null : Math.max(0, +x.spots || 0);
      return `<article class="fnd-c" data-tab="${wsdE(x.tab || "")}"><div class="fnd-t"><b>${wsdE(x.title)}</b>${sp != null && sp <= 3 ? `<span class="fnd-hot">${sp === 0 ? "Full" : "Only " + sp + " left"}</span>` : ""}</div>${x.when || x.where ? `<p class="fnd-m">${[x.when, x.where].filter(Boolean).map(wsdE).join(" · ")}</p>` : ""}${x.text ? `<p class="fnd-x">${wsdE(x.text)}</p>` : ""}${wsdBtn(sp === 0 ? (x.cta_full || "Join waitlist") : (x.cta || s.cta || "Book a spot"), "#contact", sp === 0 ? "g" : "p")}</article>`;
    }).join("")}</div></div></section>`;
  };
  // Quote builder: sliders and a few questions, instant "we'll send your quote" moment
  WSD_SECTIONS.quote = (s, spec) => {
    if (!s.title) return "";
    const sl = wsdArr(s.sliders, 3), f = wsdArr(s.fields, 4);
    return `<section class="sec qt"><div class="wrap qt-grid">${wsdUrl(s.image) ? wsdImg(s.image, s.title, "qt-im") : ""}<div class="qt-card">${wsdKick(s.kicker)}<h2 class="h2">${wsdHl(s.title, s.highlight)}</h2>${s.sub ? `<p class="lead">${wsdE(s.sub)}</p>` : ""}<form class="qt-f" data-qt onsubmit="return false">${sl.map((x) => {
      const mn = Math.max(0, Math.round(+x.min || 1)), mx = Math.max(mn + 1, Math.round(+x.max || 20)), v = Math.round(+x.value || (mn + mx) / 2);
      return `<label class="qt-r"><span>${wsdE(x.label)}</span><b data-qv>${v}${x.unit ? " " + wsdE(x.unit) : ""}</b><input type="range" min="${mn}" max="${mx}" value="${v}" data-unit="${wsdE(x.unit || "")}"></label>`;
    }).join("")}${f.map((l) => `<label class="qt-l"><span>${wsdE(l)}</span><input class="in" type="text"></label>`).join("")}<button class="btn btn-p" type="submit">${wsdE(s.button || "Send me a quote")}</button><p class="qt-ok" hidden>${wsdE(s.ok_text || "Done! On your live site this lands straight in your inbox, and the AI receptionist confirms it with them.")}</p></form></div></div></section>`;
  };
  // Founder: the real person behind the business (never an AI portrait)
  WSD_SECTIONS.founder = (s) => {
    if (!s.title || !s.text) return "";
    return `<section class="sec fdr"><div class="wrap fdr-grid">${wsdUrl(s.image) ? wsdImg(s.image, s.name || s.title, "fdr-im") : `<div class="fdr-av" aria-hidden="true">${wsdE(String(s.name || s.title).trim().slice(0, 1))}</div>`}<div>${wsdKick(s.kicker)}<h2 class="h2" data-lines>${wsdHl(s.title, s.highlight)}</h2><p class="lead" data-up>${wsdE(s.text)}</p>${s.quote ? `<blockquote class="fdr-q" data-up>“${wsdE(s.quote)}”</blockquote>` : ""}${s.name ? `<p class="fdr-sig">${wsdE(s.name)}${s.role ? ` <span>· ${wsdE(s.role)}</span>` : ""}</p>` : ""}</div></div></section>`;
  };
})();
// "Not capped at this design": real sites we've built, on every demo
var WSD_WORK = [
  { slug: "katia", name: "Katia Trotsenko", url: "https://www.katiatrotsenko.com", line: "Coaching brand: story-led homepage, funnels and booking." },
  { slug: "plf", name: "Pure Life Force", url: "https://www.purelifeforce.com.au", line: "Wellness clinic: online booking, automations and local SEO." }
];
function WSD_SHOWCASE(opt) {
  return `<section class="sec wk" id="our-work"><div class="wrap"><div class="sec-head"><p class="kick">More of our work</p><h2 class="h2">This is one direction. <em class="hl">You're not capped at it.</em></h2><p class="lead">Every Studio Flow site is designed from scratch. Here are two we've built recently. Yours can look like these, like this concept, or something new entirely.</p></div><div class="wk-grid">${WSD_WORK.map((w) => `<a class="wk-c" href="${w.url}" target="_blank" rel="noopener"><div class="wk-im"><img src="/demo/img/work/${w.slug}.jpg" alt="${wsdE(w.name)} website" loading="lazy" onerror="this.parentNode.classList.add('nx')"><span class="wk-url">${wsdE(w.url.replace(/^https:\/\/(www\.)?/, ""))}</span></div><div class="wk-b"><b>${wsdE(w.name)}</b><span>${wsdE(w.line)}</span><i>Visit the live site ↗</i></div></a>`).join("")}</div></div></section>`;
}
function WSD_CSS3() {
  return `
.fnd-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}.fnd-tabs button{font:600 14px/1 var(--fb);padding:11px 16px;border-radius:999px;border:1.5px solid var(--ln);background:var(--sf);color:var(--ink);cursor:pointer}.fnd-tabs button.on{background:var(--p);border-color:var(--p);color:var(--onp)}
.fnd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:14px}.fnd-c{display:flex;flex-direction:column;gap:8px;padding:20px;border-radius:var(--r);background:var(--sf);border:1px solid var(--ln)}.fnd-c[hidden]{display:none}
.fnd-t{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.fnd-t b{font-size:18px;line-height:1.25}.fnd-hot{flex:none;font-size:12px;font-weight:700;padding:5px 9px;border-radius:999px;background:color-mix(in srgb,var(--a) 22%,transparent);color:var(--ink)}
.fnd-m{font-weight:600;color:var(--p)}.fnd-x{color:var(--mu);font-size:15px}.fnd-c .btn{margin-top:auto;align-self:flex-start}
.qt-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(20px,4vw,56px);align-items:center}.qt-im{border-radius:var(--r);overflow:hidden;aspect-ratio:4/5}.qt-im img{width:100%;height:100%;object-fit:cover}
.qt-card{padding:clamp(22px,3vw,40px);border-radius:var(--r);background:var(--sf);border:1px solid var(--ln)}.qt-f{display:grid;gap:16px;margin-top:18px}.qt-r,.qt-l{display:grid;gap:8px;font-weight:600}.qt-r{grid-template-columns:1fr auto}.qt-r input{grid-column:1/-1;accent-color:var(--p);width:100%}
.qt-r b{color:var(--p)}.qt-ok{padding:12px 14px;border-radius:12px;background:color-mix(in srgb,var(--p) 12%,transparent);font-weight:600}
@media(max-width:820px){.qt-grid{grid-template-columns:1fr}.qt-im{aspect-ratio:16/10}}
.fdr-grid{display:grid;grid-template-columns:minmax(0,.8fr) 1.2fr;gap:clamp(22px,4vw,64px);align-items:center}.fdr-im{border-radius:var(--r);overflow:hidden;aspect-ratio:4/5}.fdr-im img{width:100%;height:100%;object-fit:cover}
.fdr-av{aspect-ratio:1;max-width:320px;border-radius:50%;display:grid;place-items:center;font:var(--dw) clamp(80px,12vw,160px)/1 var(--fd);background:color-mix(in srgb,var(--p) 14%,var(--sf));color:var(--p)}
.fdr-q{font:italic var(--dw) clamp(20px,2.2vw,28px)/1.35 var(--fd);margin:18px 0 0;padding-left:18px;border-left:3px solid var(--a)}.fdr-sig{margin-top:14px;font-weight:700}.fdr-sig span{font-weight:400;color:var(--mu)}
@media(max-width:820px){.fdr-grid{grid-template-columns:1fr}.fdr-im{aspect-ratio:16/12}}
.wk{background:color-mix(in srgb,var(--ink) 94%,var(--p));color:#fff}.wk .lead{color:rgba(255,255,255,.78)}.wk .h2{color:#fff}.wk .hl{color:var(--a)}
.wk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:18px}.wk-c{display:block;border-radius:var(--r);overflow:hidden;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#fff;text-decoration:none;transition:transform .4s,border-color .4s}.wk-c:hover{transform:translateY(-6px);border-color:var(--a)}
.wk-im{position:relative;aspect-ratio:16/10;overflow:hidden;background:linear-gradient(135deg,var(--p),var(--a))}.wk-im img{width:100%;height:100%;object-fit:cover;object-position:top;transition:transform 1.2s}.wk-c:hover .wk-im img{transform:scale(1.04)}.wk-im.nx img{display:none}
.wk-url{position:absolute;left:12px;top:12px;padding:6px 10px;border-radius:999px;background:rgba(0,0,0,.6);font-size:12px}.wk-b{display:grid;gap:4px;padding:16px 18px}.wk-b span{color:rgba(255,255,255,.75);font-size:15px}.wk-b i{font-style:normal;color:var(--a);font-weight:600;margin-top:4px}`;
}
var WSD_MOTION3 = `(function(){var d=document;d.querySelectorAll('.fnd').forEach(function(f){var bs=f.querySelectorAll('[data-fnd]');bs.forEach(function(b){b.addEventListener('click',function(){bs.forEach(function(x){x.classList.toggle('on',x===b)});var t=b.getAttribute('data-fnd');f.querySelectorAll('.fnd-c').forEach(function(c){c.hidden=t!=='*'&&c.getAttribute('data-tab')!==t})})})});
d.querySelectorAll('[data-qt]').forEach(function(f){f.querySelectorAll('input[type=range]').forEach(function(r){var o=r.parentNode.querySelector('[data-qv]'),u=r.getAttribute('data-unit');r.addEventListener('input',function(){o.textContent=r.value+(u?' '+u:'')})});f.addEventListener('submit',function(e){e.preventDefault();var ok=f.querySelector('.qt-ok');if(ok)ok.hidden=false;var b=f.querySelector('button[type=submit]');if(b)b.disabled=true})})})();`;
