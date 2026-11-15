# v25: chat header shows the business's logo (orb if none); a voice orb bobs above the conversation and
# reacts to the real audio (caller + receptionist) on demos and client websites.
import sys
f = sys.argv[1]
s = open(f).read()

STAGE_CSS = ('.vs{display:grid;justify-items:center;gap:8px;padding:18px 12px 8px;transition:padding .35s}'
  '.vso{position:relative;width:92px;height:92px;border-radius:50%;animation:sfwh 4.6s ease-in-out infinite;transition:width .45s cubic-bezier(.2,.8,.2,1),height .45s cubic-bezier(.2,.8,.2,1)}'
  '.vso:after{content:"";position:absolute;left:20%;right:20%;bottom:-14px;height:7px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.45),transparent);animation:sfws 4.6s ease-in-out infinite}'
  '.vs .vt{font-size:12.5px;color:#BFD0E6;text-align:center;max-width:260px;line-height:1.4}'
  '.vs.c{padding:10px 12px 2px}.vs.c .vso{width:58px;height:58px}.vs.c .vt{display:none}'
  '.vs.on{padding:22px 12px 10px}.vs.on .vso{width:156px;height:156px;animation:none}.vs.on .vso:after{display:none}.vs.on .vt{display:block;color:#fff;font-weight:600;font-size:13.5px}'
  '.vs .vx{display:none;border:0;border-radius:99px;padding:8px 16px;background:#E5484D;color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.vs.on .vx{display:inline-block}'
  '@keyframes sfwh{50%{transform:translateY(-6px)}}@keyframes sfws{50%{transform:scale(.78);opacity:.5}}'
  '@media(prefers-reduced-motion:reduce){.vso,.vso:after{animation-duration:9s}}')

# ---------- Demo page ----------
a = s.index('// src/team/demo.js'); b = s.index('// src/team/mission.js'); seg = s[a:b]
def r(old, new):
    global seg
    assert seg.count(old) == 1, old[:90]
    seg = seg.replace(old, new)
r('</style></head><body>', STAGE_CSS + '.vbar{display:none!important}.av.lg{background:#fff!important;border:2px solid rgba(255,255,255,.9)!important}.av.lg canvas{display:none}\n</style></head><body>')
r('<div class="vbar" id="vbar">', '<div class="vs" id="vs"><div class="vso" id="vso" aria-hidden="true"></div><div class="vt" id="vt">${voice ? "Tap Talk to speak with us, or type below" : "Ask anything below"}</div><button class="vx" id="vx" type="button">End call</button></div>\n<div class="vbar" id="vbar">')
# header: their logo (orb when there's no usable logo)
r('SFO.add($("av"),bc);', 'SFO.add($("av"),bc);SFO.add($("vso"),bc);' + '''${kb.brand?.icon ? `(function(){var im=new Image();im.alt="";im.onload=function(){if(im.naturalWidth>=32){var a=$("av");a.className="av lg";a.appendChild(im)}};im.src=${JSON.stringify(kb.brand.icon).replace(/</g, "\\\\u003c")}})();` : ""}''')
# voice stage follows the call
r('function vstate(on,txt){$("vbar").classList.toggle("on",on);if(txt)$("vst").textContent=txt;',
  'function vstate(on,txt){$("vbar").classList.toggle("on",on);if(txt)$("vst").textContent=txt;var vs=$("vs");vs.classList.toggle("on",on);$("vt").textContent=on?(txt||"Listening\\u2026"):"Tap Talk to speak again, or type below";try{SFO.state(on?"listening":"idle");if(!on)SFO.unmeter()}catch(e){}')
r('function add(t,c){var e=document.createElement("div");', 'function add(t,c){try{$("vs").classList.add("c")}catch(e){}var e=document.createElement("div");')
r('pc=new RTCPeerConnection();var au=new Audio();au.autoplay=true;pc.', 'try{SFO.meter(mic,"in")}catch(e){}pc=new RTCPeerConnection();var au=new Audio();au.autoplay=true;pc.')
s = s[:a] + seg + s[b:]
# demo: mirror the remote audio into the meter, and End button in the stage
a = s.index('// src/team/demo.js'); b = s.index('// src/team/mission.js'); seg = s[a:b]
i = seg.index('pc.ontrack=function(e){au.srcObject=e.streams[0]', seg.index('function vstate'))
seg = seg[:i] + 'pc.ontrack=function(e){try{SFO.meter(e.streams[0],"out")}catch(x){}au.srcObject=e.streams[0]' + seg[i + len('pc.ontrack=function(e){au.srcObject=e.streams[0]'):]
r('if(talk)talk.addEventListener("click",async function(){if(pc){hang("Call ended. Thanks for trying the voice receptionist!");return}',
  'if($("vx"))$("vx").addEventListener("click",function(){if(pc)hang("Call ended. Thanks for trying the voice receptionist!")});\nif(talk)talk.addEventListener("click",async function(){if(pc){hang("Call ended. Thanks for trying the voice receptionist!");return}')
s = s[:a] + seg + s[b:]

# ---------- Client chat panel (their website) ----------
i = s.index('function panelResponse'); j = s.index('function testPage', i); seg = s[i:j]
r(PREMIUM_ANCHOR := '.dk .vo .st{color:#fff}.dk .vo .lc{color:#cfdcef}', PREMIUM_ANCHOR + STAGE_CSS + '.dk .vo{display:none!important}.hob.lg{background:#fff;border:2px solid rgba(255,255,255,.9);overflow:hidden;display:grid;place-items:center}.hob.lg img{width:100%;height:100%;object-fit:cover}.hob.lg canvas{display:none}')
r('<div class="log" id="log" aria-live="polite"></div>', '${dark ? `<div class="vs" id="vs"><div class="vso" id="vso" aria-hidden="true"></div><div class="vt" id="vt">${voice ? "Tap the mic to talk, or type below" : "Ask anything below"}</div><button class="vx" id="vx" type="button">End call</button></div>` : ""}<div class="log" id="log" aria-live="polite"></div>')
r('try{if($("hob"))SFO.add($("hob"),C.col);if(document.body.className==="dk"&&$("vorb"))SFO.add($("vorb"),C.col,{big:true})}catch(e){}',
  'try{if($("hob")){SFO.add($("hob"),C.col);if(C.logo){var lim=new Image();lim.alt="";lim.onload=function(){if(lim.naturalWidth>=24){var h=$("hob");h.className="hob lg";h.appendChild(lim)}};lim.src=C.logo}}if($("vso"))SFO.add($("vso"),C.col)}catch(e){}')
r('function vui(on,st,lc){try{SFO.state(on?"listening":"idle")}catch(e){}',
  'function vui(on,st,lc){try{SFO.state(on?"listening":"idle");if(!on)SFO.unmeter()}catch(e){}var vs=$("vs");if(vs){vs.classList.toggle("on",on);$("vt").textContent=on?(st||"Listening\\u2026"):"Tap the mic to talk again, or type below"}')
k = seg.index('pc.ontrack=function(e){au.sr')
seg = seg[:k] + 'pc.ontrack=function(e){try{SFO.meter(e.streams[0],"out")}catch(x){}au.sr' + seg[k + len('pc.ontrack=function(e){au.sr'):]
r('mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});pc=new RTCPeerConnection();',
  'mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});try{SFO.meter(mic,"in")}catch(e){}pc=new RTCPeerConnection();')
r('$("vend").addEventListener("click",function(){hang()});', '$("vend").addEventListener("click",function(){hang()});if($("vx"))$("vx").addEventListener("click",function(){hang()});')
s = s[:i] + seg + s[j:]
# compact the stage once a conversation starts (client panel add())
i = s.index('function panelResponse'); j = s.index('function testPage', i); seg = s[i:j]
r('function add(t,who,cap){', 'function add(t,who,cap){try{if($("vs")&&!$("vs").classList.contains("on"))$("vs").classList.add("c")}catch(e){}')
s = s[:i] + seg + s[j:]
open(f, 'w').write(s)
print('v25 logo header + reactive voice orb applied')
