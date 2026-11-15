// src/team/hub-panel.js
var HUB_PANEL = `
<!-- Studio AI Executive Team -->
<style>/* Executive Team \u2014 styled with the hub's own tokens (--c, --c2, --ln, --gl, --tx, --mu) */
#stNav{position:relative}
#stNav .st-n{position:absolute;top:4px;right:8px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:#ffb547;color:#1a1200;font:700 10px/16px Inter,system-ui,sans-serif;text-align:center;box-shadow:0 0 10px rgba(255,181,71,.6)}
#stNav .st-n:empty{display:none}
.st-card .st-mini{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:2px}
.st-mini button{all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border:1px solid var(--ln);border-radius:12px;background:rgba(5,20,45,.5);font-size:10px;color:var(--mu);text-align:center;line-height:1.15;transition:.25s;position:relative}
.st-mini button:hover,.st-mini button:focus-visible{border-color:var(--hc);color:var(--tx);box-shadow:0 0 16px color-mix(in srgb,var(--hc) 35%,transparent)}
.st-mini i{font-style:normal;font-size:16px;color:var(--hc);text-shadow:0 0 12px var(--hc)}
.st-mini b{position:absolute;top:3px;right:4px;width:7px;height:7px;border-radius:50%;background:#ffb547;box-shadow:0 0 8px #ffb547}
.st-brief{margin-top:12px;font-size:12px;color:var(--mu);line-height:1.45;border-left:2px solid var(--c);padding-left:10px;cursor:pointer;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.st-brief b{color:var(--c2);font-weight:600}
.st-row{display:flex;gap:8px;margin-top:12px}.st-row .b{flex:1}
.st-warnb{border-color:rgba(255,181,71,.55)!important;color:#ffd79a!important}

#stSheet{position:fixed;z-index:6;inset:16px 24px 16px 104px;display:none;flex-direction:column;background:linear-gradient(180deg,rgba(4,14,34,.96),rgba(2,8,20,.98));border:1px solid var(--ln);border-radius:18px;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:0 0 0 1px rgba(56,189,248,.06) inset,0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(20,120,255,.12);color:var(--tx);font:400 14px/1.5 'Space Grotesk',Inter,system-ui,sans-serif;overflow:hidden}
#stSheet.on{display:flex;animation:stIn .32s cubic-bezier(.2,.8,.2,1)}
@keyframes stIn{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}
#stSheet::before{content:"";position:absolute;top:-1px;left:24px;width:90px;height:2px;background:var(--c);box-shadow:0 0 14px var(--c)}
.st-h{display:flex;align-items:center;gap:16px;padding:16px 20px;border-bottom:1px solid var(--ln);flex-wrap:wrap}
.st-h h2{font-size:15px;letter-spacing:.14em;font-weight:700;margin:0}
.st-h .sub{margin:0}
.st-tabs{display:flex;gap:4px;margin-left:auto;background:rgba(5,20,45,.6);border:1px solid var(--ln);border-radius:12px;padding:4px}
.st-tabs button{all:unset;cursor:pointer;padding:7px 12px;border-radius:9px;font-size:12px;letter-spacing:.06em;color:var(--mu);display:flex;gap:6px;align-items:center}
.st-tabs button.on{color:var(--c2);background:rgba(56,189,248,.14);box-shadow:0 0 0 1px var(--ln) inset}
.st-tabs .st-n{min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:#ffb547;color:#1a1200;font:700 10px/16px Inter,sans-serif;text-align:center}
.st-tabs .st-n:empty{display:none}
.st-x{all:unset;cursor:pointer;width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--ln);border-radius:10px;color:var(--mu)}
.st-x:hover{color:var(--tx);border-color:var(--c)}
.st-body{flex:1;min-height:0;overflow-y:auto;padding:20px;scrollbar-width:thin;scrollbar-color:rgba(56,189,248,.3) transparent}
.st-ask{display:flex;gap:10px;margin-bottom:18px}
.st-ask input,.st-in{flex:1;min-width:0;background:rgba(3,12,28,.75);border:1px solid var(--ln);color:var(--tx);border-radius:12px;padding:12px 14px;font:inherit;outline:none}
.st-ask input:focus,.st-in:focus,.st-act textarea:focus,.st-act input:focus{border-color:var(--c);box-shadow:0 0 16px rgba(56,189,248,.22)}
.st-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
@media (max-width:1180px){.st-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:600px){.st-grid{grid-template-columns:1fr}}
.st-dept{all:unset;cursor:pointer;position:relative;display:flex;flex-direction:column;gap:6px;padding:16px;border:1px solid var(--ln);border-radius:16px;background:var(--gl);transition:.25s;min-height:132px}
.st-dept:hover,.st-dept:focus-visible{border-color:var(--hc);box-shadow:0 0 28px color-mix(in srgb,var(--hc) 28%,transparent),0 0 40px rgba(20,120,255,.08) inset;transform:translateY(-2px)}
.st-dept::before{content:"";position:absolute;top:-1px;left:16px;width:40px;height:2px;background:var(--hc);box-shadow:0 0 10px var(--hc)}
.st-dept.cos{grid-column:1/-1;flex-direction:row;align-items:center;gap:16px;min-height:0;background:radial-gradient(120% 140% at 0% 50%,rgba(56,189,248,.16),transparent 60%),var(--gl)}
.st-ic{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-size:18px;color:var(--hc);background:color-mix(in srgb,var(--hc) 16%,transparent);box-shadow:0 0 18px color-mix(in srgb,var(--hc) 30%,transparent)}
.st-dept.cos .st-ic{width:52px;height:52px;font-size:26px;border-radius:50%}
.st-dept h3{margin:0;font-size:14px;font-weight:600;letter-spacing:.02em}
.st-dept p{margin:0;font-size:12px;color:var(--mu);line-height:1.4}
.st-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto}
.st-chip{font-size:10.5px;letter-spacing:.04em;padding:2px 8px;border-radius:99px;background:rgba(56,189,248,.1);color:var(--c2);border:1px solid var(--ln)}
.st-chip.w{background:rgba(255,181,71,.12);color:#ffd79a;border-color:rgba(255,181,71,.4)}
.st-sec{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 14px}
.st-sec h3{margin:0;font-size:13px;letter-spacing:.12em;color:var(--c2)}
.st-empty{color:var(--mu);text-align:center;padding:36px 12px;font-size:13px}
.st-item{border:1px solid var(--ln);border-radius:14px;background:var(--gl);padding:14px 16px;margin-bottom:12px;position:relative}
.st-item::before{content:"";position:absolute;left:-1px;top:14px;bottom:14px;width:2px;background:var(--hc,var(--c));box-shadow:0 0 10px var(--hc,var(--c));border-radius:2px}
.st-k{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--hc,var(--c2))}
.st-item h4{margin:4px 0 4px;font-size:14px;font-weight:600}
.st-mu{color:var(--mu);font-size:12px}
.st-act label{display:block;font-size:11px;letter-spacing:.08em;color:var(--mu);margin-top:10px;text-transform:uppercase}
.st-act textarea,.st-act input{width:100%;margin-top:4px;background:rgba(3,12,28,.75);border:1px solid var(--ln);color:var(--tx);border-radius:10px;padding:9px 11px;font:inherit;font-size:13px;outline:none;resize:vertical}
.st-btns{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.st-ok{background:linear-gradient(#2a7fe0,#1b5fc0)!important;border-color:#5cc8ff!important;box-shadow:0 0 18px rgba(56,189,248,.35)}
.st-no{border-color:rgba(255,120,150,.45)!important;color:#ffc2cf!important}
.st-status{font-size:10.5px;padding:2px 8px;border-radius:99px;margin-left:6px}
.st-status.done{background:rgba(125,255,181,.12);color:#7dffb5}.st-status.failed{background:rgba(255,120,150,.14);color:#ff9fb4}.st-status.rejected{background:rgba(143,176,207,.14);color:var(--mu)}

.st-chat{display:grid;grid-template-rows:auto 1fr auto auto;height:100%;min-height:0;gap:10px}
.st-chat-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.st-chat-h select{background:rgba(3,12,28,.75);color:var(--tx);border:1px solid var(--ln);border-radius:10px;padding:7px 9px;font:inherit;font-size:12px;max-width:220px;margin-left:auto}
.st-msgs{overflow-y:auto;min-height:0;display:flex;flex-direction:column;gap:10px;padding:4px 2px;scrollbar-width:thin;scrollbar-color:rgba(56,189,248,.3) transparent}
.st-m{max-width:min(760px,92%);padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.55;overflow-wrap:anywhere}
.st-m.u{align-self:flex-end;background:rgba(40,110,230,.38);border:1px solid rgba(92,200,255,.35)}
.st-m.a{align-self:flex-start;background:rgba(56,189,248,.08);border:1px solid var(--ln)}
.st-m h3,.st-m h4{font-size:13.5px;margin:10px 0 4px;color:var(--c2);letter-spacing:.02em}.st-m p{margin:5px 0}.st-m ul,.st-m ol{margin:5px 0;padding-left:20px}
.st-m code{background:rgba(3,12,28,.8);padding:1px 5px;border-radius:5px;font-size:12px}
.st-m pre{background:rgba(3,12,28,.8);padding:10px;border-radius:8px;overflow:auto}
.st-m table{border-collapse:collapse;font-size:12px;margin:6px 0;display:block;overflow-x:auto}.st-m td{border:1px solid var(--ln);padding:4px 8px}
.st-m a{color:var(--c2)}
.st-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.st-think{align-self:flex-start;color:var(--mu);font-size:12.5px;display:flex;align-items:center;gap:10px}
.st-think i{width:18px;height:18px;border-radius:50%;border:2px solid rgba(56,189,248,.25);border-top-color:var(--c);animation:stSpin .8s linear infinite}
@keyframes stSpin{to{transform:rotate(360deg)}}
.st-sugg{display:flex;gap:6px;flex-wrap:wrap}
.st-sugg button{all:unset;cursor:pointer;font-size:12px;padding:6px 11px;border-radius:99px;border:1px solid var(--ln);color:var(--mu)}
.st-sugg button:hover{color:var(--tx);border-color:var(--c)}
.st-comp{display:flex;gap:10px}
.st-comp textarea{flex:1;height:52px;resize:none;background:rgba(3,12,28,.75);border:1px solid var(--ln);color:var(--tx);border-radius:12px;padding:10px 12px;font:inherit;outline:none}
.st-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.st-filters select{background:rgba(3,12,28,.75);color:var(--tx);border:1px solid var(--ln);border-radius:10px;padding:8px 9px;font:inherit;font-size:12px}
.st-rep{cursor:pointer}.st-rep:hover{border-color:var(--c)}
.st-prog{font-size:12px;color:var(--c2);margin:-4px 0 12px}
.st-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9;background:rgba(6,18,40,.95);border:1px solid var(--c);border-radius:12px;padding:10px 16px;font-size:13px;color:var(--tx);box-shadow:0 0 24px rgba(56,189,248,.35);display:none;max-width:90vw}
@media (max-width:820px){
  #stSheet{inset:0;border-radius:0}
  .st-h{padding:12px 14px;gap:10px}
  .st-tabs{order:3;width:100%;margin-left:0;overflow-x:auto}
  .st-body{padding:14px}
  .st-dept.cos{flex-direction:column;align-items:flex-start}
}
@media (prefers-reduced-motion:reduce){#stSheet.on{animation:none}.st-dept:hover{transform:none}}

#stSheet [hidden],.st-card [hidden]{display:none!important}

/* \u2500\u2500 v2: mission, autopilot, shifts \u2500\u2500 */
.st-mission{all:unset;cursor:pointer;display:grid;gap:5px;margin:2px 0 12px;padding:12px;border:1px solid var(--ln);border-radius:12px;background:linear-gradient(135deg,rgba(56,189,248,.12),rgba(5,20,45,.55));transition:.25s}
.st-mission:hover,.st-mission:focus-visible{border-color:var(--c);box-shadow:0 0 18px rgba(56,189,248,.28)}
.st-mk{font-size:10px;letter-spacing:.18em;color:var(--c)}
.st-mission b{font-size:15px;font-weight:600;color:var(--tx)}
.st-bar{display:block;height:5px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden}
.st-bar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#2a7fe0,#38bdf8,#7dffb5);box-shadow:0 0 12px rgba(56,189,248,.7);transition:width 1s cubic-bezier(.2,.8,.2,1)}
.st-bar.big{height:8px;margin:10px 0 14px}
.st-mbig .st-mnum{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.st-mbig .st-mnum b{font-size:32px;font-weight:700;letter-spacing:-.02em;background:linear-gradient(90deg,#e8f4ff,#9be4ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.st-mbig .st-mnum span{color:var(--mu)}
.st-mgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.st-mgrid div{border:1px solid var(--ln);border-radius:12px;padding:10px;background:rgba(5,20,45,.5)}
.st-mgrid span{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--mu)}
.st-mgrid b{font-size:18px;font-weight:600}
#stTgt{max-width:200px}
.st-rule{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid rgba(56,189,248,.1)}
.st-rule:last-child{border-bottom:0}
.st-rule b{font-weight:600;font-size:13.5px}
.st-rule.locked{opacity:.75}
.st-seg{display:flex;background:rgba(3,12,28,.75);border:1px solid var(--ln);border-radius:10px;padding:3px;flex-shrink:0}
.st-seg button{all:unset;cursor:pointer;padding:6px 12px;border-radius:8px;font-size:12px;color:var(--mu)}
.st-seg button.on{background:rgba(56,189,248,.18);color:var(--c2);box-shadow:0 0 0 1px var(--ln) inset}
.st-seg button[data-v=auto].on{background:rgba(125,255,181,.14);color:#7dffb5;box-shadow:0 0 0 1px rgba(125,255,181,.35) inset}
.st-shift{display:flex;align-items:center;gap:14px;padding:12px 14px;border:1px solid var(--ln);border-left:2px solid var(--hc);border-radius:12px;background:var(--gl);margin-bottom:10px}
.st-sh-main{flex:1;min-width:0}
.st-sh-main b{font-weight:600;font-size:13.5px}
.st-sh-main select{background:rgba(3,12,28,.75);color:var(--tx);border:1px solid var(--ln);border-radius:7px;padding:1px 4px;font:inherit;font-size:12px}
.st-sw{position:relative;width:38px;height:22px;flex-shrink:0;cursor:pointer}
.st-sw input{opacity:0;width:0;height:0;position:absolute}
.st-sw span{position:absolute;inset:0;border-radius:99px;background:rgba(143,176,207,.25);transition:.2s}
.st-sw span::after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#cfe6ff;transition:.2s}
.st-sw input:checked+span{background:rgba(56,189,248,.55);box-shadow:0 0 12px rgba(56,189,248,.45)}
.st-sw input:checked+span::after{transform:translateX(16px);background:#fff}
.st-sw input:focus-visible+span{outline:2px solid var(--c);outline-offset:2px}
.st-status.auto{background:rgba(125,255,181,.12);color:#7dffb5}
@media (max-width:820px){.st-mgrid{grid-template-columns:repeat(2,1fr)}.st-shift{flex-wrap:wrap}.st-rule{flex-wrap:wrap}}
/* Goals & connections views */
.st-goals{display:grid;gap:10px}
.st-goal{padding:14px 16px;border:1px solid var(--ln);border-radius:14px;background:rgba(6,22,48,.55)}
.st-goal-top{display:flex;align-items:center;gap:10px;justify-content:space-between}
.st-goal-top b{font-family:Montserrat,Inter,sans-serif;font-size:14px}
.st-goal-num{margin:6px 0 8px;color:var(--mu)}
.st-goal-num strong{color:var(--tx);font:700 20px Montserrat,Inter,sans-serif}
.st-goal .st-row{margin-top:10px}
.st-gform{display:grid;gap:10px}
.st-gform input,.st-gform select{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--ln);background:rgba(3,12,28,.7);color:var(--tx);font:inherit}
.st-gfrow{display:grid;grid-template-columns:2fr 1fr 1fr 1.3fr 1.3fr;gap:8px}
.st-gfrow [hidden]{display:none!important}
.st-conns{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.st-conn{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--ln);border-radius:14px;background:rgba(6,22,48,.55)}
.st-conn>i{flex:none;width:10px;height:10px;border-radius:50%;background:#64748b}
.st-conn.ok>i{background:#4ade80;box-shadow:0 0 10px #4ade80}
.st-conn.warn>i{background:#fbbf24;box-shadow:0 0 10px #fbbf24}
.st-conn>div{flex:1;min-width:0}
.st-conn b{font-family:Montserrat,Inter,sans-serif;font-size:13.5px}
.st-conn>span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}
.st-conn.ok>span{color:#86efac}
.st-conn.warn>span{color:#fcd34d}
@media (max-width:700px){.st-gfrow{grid-template-columns:1fr 1fr}.st-gfrow select{grid-column:1/-1}}
.st-h .st-x{margin-left:auto}
/* Growth tab */
.st-gactions{display:flex;flex-wrap:wrap;gap:8px}
.st-gactions .b{flex:1 1 180px}
.st-prosl{display:grid;gap:10px}
.st-pros{padding:14px 16px;border:1px solid var(--ln);border-radius:14px;background:rgba(6,22,48,.55)}
.st-pros-top{display:flex;align-items:flex-start;gap:12px}
.st-pros-top>div{flex:1;min-width:0}
.st-pros-top b{font-family:Montserrat,Inter,sans-serif;font-size:14px}
.st-pros-top a{color:var(--c2)}
.st-pscore{flex:none;display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:rgba(56,189,248,.14);border:1px solid rgba(56,189,248,.4);color:#e8f4ff;font:700 15px Montserrat,Inter,sans-serif}
.st-leak{margin:10px 0 6px;color:var(--tx)}
.st-pros details{margin:6px 0;color:var(--mu)}
.st-pros summary{cursor:pointer;color:var(--c2);font-size:12.5px}
.st-opener{padding:10px 12px;border-left:2px solid var(--c);background:rgba(56,189,248,.06);border-radius:8px;color:var(--tx)}
.st-pros .st-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.st-pros .st-row .b{flex:1 1 100px;padding:8px 10px}
.st-scan{margin-top:10px}
.st-scan-top{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}
.st-score{text-align:center;min-width:76px;padding:8px;border-radius:12px;border:1px solid rgba(56,189,248,.4);background:rgba(56,189,248,.1)}
.st-score b{display:block;font:700 24px Montserrat,Inter,sans-serif}
.st-score span{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu)}
.st-scan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:12px 0}
.st-scan-grid>div>span{display:block;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);margin-bottom:4px}
.st-gaps{display:grid;gap:4px;margin:8px 0 10px}
/* Campaign, enrol queue, calls */
.st-camp-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.st-camp-top b{font-family:Montserrat,Inter,sans-serif}
.st-chip.ok{color:#86efac;border-color:rgba(74,222,128,.45)}
.st-chip.warn{color:#fcd34d;border-color:rgba(251,191,36,.45)}
.st-cgrid{display:grid;gap:8px;margin:12px 0}
.st-cprog{display:grid;grid-template-columns:120px 1fr 64px;gap:10px;align-items:center;font-size:12.5px}
.st-cprog b{text-align:right;font-weight:600}
.st-qbar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;font-size:13px}
.st-qbar label{display:flex;gap:8px;align-items:center;color:var(--mu)}
.st-q{display:flex;gap:12px;padding:14px 16px;border:1px solid var(--ln);border-radius:14px;background:rgba(6,22,48,.55);margin-bottom:10px}
.st-qck input,.st-qbar input{width:18px;height:18px;accent-color:#38bdf8}
.st-qmain{flex:1;min-width:0}
.st-call{padding:14px 16px;border:1px solid var(--ln);border-radius:14px;background:rgba(6,22,48,.55);margin-bottom:10px}
.st-call .st-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.st-call .st-row .b{flex:1 1 90px;padding:8px}
.st-dial{flex:none;text-decoration:none;padding:9px 14px;border-radius:10px;white-space:nowrap}
.st-call ul{margin:6px 0 8px 18px;padding:0}
@media (max-width:700px){.st-cprog{grid-template-columns:96px 1fr 54px}.st-pros-top{flex-wrap:wrap}.st-dial{width:100%;text-align:center}}
.st-dial{display:inline-block;border:1px solid #38bdf8;background:#38bdf8;color:#02101f!important;font:600 13px Montserrat,Inter,sans-serif;box-shadow:0 0 18px rgba(56,189,248,.25)}
.st-dial:hover{background:#7dd3fc}
.st-q .st-row .b{flex:0 0 auto;padding:7px 14px}
</style>
<script>// Executive Team panel for the Studio AI Intelligence /command page.
// Runs after the hub's own script and reuses its unlocked session (operatorKey).
(() => {
  const DEPTS = [{"id":"chief_of_staff","name":"Chief of Staff","short":"Chief of Staff","icon":"\u25CE","color":"#5aa2ff","tagline":"Runs the team, briefs you daily, routes every request"},{"id":"head_of_marketing","name":"Head of Marketing","short":"Marketing","icon":"\u25C8","color":"#2f6bff","tagline":"Fills the funnel with the right people"},{"id":"head_of_sales","name":"Head of Sales","short":"Sales","icon":"\u25C6","color":"#00c2ff","tagline":"Turns hand-raisers into booked calls and clients"},{"id":"head_of_finance","name":"Head of Finance","short":"Finance","icon":"\u25C7","color":"#36e2b4","tagline":"Knows the numbers, protects the cash"},{"id":"head_of_operations","name":"Head of Operations","short":"Operations","icon":"\u2B21","color":"#a78bfa","tagline":"Makes delivery smooth, systems solid and work repeatable"},{"id":"head_of_client_success","name":"Head of Client Success","short":"Client Success","icon":"\u2726","color":"#f472b6","tagline":"Keeps clients thrilled, retained and referring"},{"id":"head_of_content","name":"Head of Content & Brand","short":"Content & Brand","icon":"\u25C9","color":"#facc15","tagline":"Makes @studioflowandsystems the most valuable feed in the niche"},{"id":"head_of_systems","name":"Head of Systems","short":"Systems","icon":"\u2318","color":"#a78bfa","tagline":"Finds what's breaking, proposes fixes, keeps the team improving"}];
  const BY = Object.fromEntries(DEPTS.map((d) => [d.id, d]));
  const API = "/api/v1/team";
  const SUGGEST = {
    chief_of_staff: ["Give me today's briefing", "What should I focus on this week?", "Plan next month across every department"],
    head_of_marketing: ["Break down my funnel: MAP vs AI", "Plan a 30-day campaign", "Research what my ideal clients struggle with"],
    head_of_sales: ["What should I do in sales today?", "Who are my hottest leads?", "Draft follow-ups for anyone who went quiet"],
    head_of_finance: ["How's revenue vs last month?", "Any overdue invoices?", "Forecast the next 90 days"],
    head_of_operations: ["Is everything in the stack healthy?", "Write my client onboarding SOP", "What should I automate next?"],
    head_of_client_success: ["Which clients are at risk?", "Write my onboarding email sequence", "Who should I ask for a testimonial?"],
    head_of_content: ["Build next week's content calendar", "Write a carousel script on missed calls", "5 Reel hooks for the MAP"],
  };
  const q = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ago = (iso) => {
    if (!iso) return "";
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    return m < 1 ? "just now" : m < 60 ? m + "m ago" : m < 1440 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago";
  };
  const key = () => (typeof operatorKey === "string" ? operatorKey : "");
  const unlocked = () => !!key() && !q("#app").hidden;

  // \u2500\u2500 API (same Studio key as the hub; long timeout for agent work) \u2500\u2500
  async function api(path, { method = "GET", body, long = false } = {}) {
    const k = key();
    if (!k) throw new Error("Unlock the command centre first.");
    const r = await fetch(API + path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + k },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(long ? 300000 : 30000),
    });
    const d = await r.json().catch(() => ({ ok: false, error: "Unexpected response (HTTP " + r.status + ")." }));
    if (k !== key()) throw new Error("Command centre was locked.");
    if (!r.ok || d.ok === false) throw new Error(d.error || "Request failed.");
    return d;
  }

  // \u2500\u2500 Small safe markdown \u2500\u2500
  function md(src) {
    const s = esc(src);
    const blocks = [];
    const t = s.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, (_, c) => { blocks.push("<pre><code>" + c + "</code></pre>"); return "\\u0000" + (blocks.length - 1) + "\\u0000"; });
    const inline = (x) => x
      .replace(/\`([^\`]+)\`/g, "<code>$1</code>")
      .replace(/\\*\\*([^*]+)\\*\\*/g, "<b>$1</b>")
      .replace(/(^|[^*])\\*([^*\\n]+)\\*/g, "$1<i>$2</i>")
      .replace(/\\[([^\\]]+)\\]\\((https?:[^)\\s]+)\\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    const out = [];
    let list = null, table = false;
    const flush = () => { if (list) { out.push("</" + list + ">"); list = null; } if (table) { out.push("</table>"); table = false; } };
    for (const raw of t.split("\\n")) {
      const l = raw.trimEnd();
      let m;
      if (/^\\|.*\\|$/.test(l.trim())) {
        if (/^\\|[\\s:|-]+\\|$/.test(l.trim())) continue;
        if (!table) { flush(); out.push("<table>"); table = true; }
        out.push("<tr>" + l.trim().slice(1, -1).split("|").map((c) => "<td>" + inline(c.trim()) + "</td>").join("") + "</tr>");
        continue;
      }
      if ((m = l.match(/^#{1,4}\\s+(.*)/))) { flush(); out.push("<h4>" + inline(m[1]) + "</h4>"); continue; }
      if ((m = l.match(/^\\s*[-*\u2022]\\s+(.*)/))) { if (list !== "ul") { flush(); out.push("<ul>"); list = "ul"; } out.push("<li>" + inline(m[1]) + "</li>"); continue; }
      if ((m = l.match(/^\\s*\\d+[.)]\\s+(.*)/))) { if (list !== "ol") { flush(); out.push("<ol>"); list = "ol"; } out.push("<li>" + inline(m[1]) + "</li>"); continue; }
      flush();
      if (l.trim()) out.push("<p>" + inline(l) + "</p>");
    }
    flush();
    return out.join("").replace(/\\u0000(\\d+)\\u0000/g, (_, i) => blocks[i]);
  }

  // \u2500\u2500 Toast \u2500\u2500
  const toastEl = document.createElement("div");
  toastEl.className = "st-toast";
  document.body.append(toastEl);
  function toast(t) { toastEl.textContent = t; toastEl.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => (toastEl.style.display = "none"), 4200); }

  // \u2500\u2500 Nav button \u2500\u2500
  const nav = q("#app nav");
  const navBtn = document.createElement("button");
  navBtn.id = "stNav";
  navBtn.type = "button";
  navBtn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="3"></circle><circle cx="5" cy="15" r="2.4"></circle><circle cx="19" cy="15" r="2.4"></circle><path d="M12 10v4M7 14l3-2M17 14l-3-2"></path><circle cx="12" cy="17" r="2.4"></circle></svg>Team<span class="st-n" id="stNavN"></span>';
  navBtn.onclick = () => (sheet.classList.contains("on") && !HUB_VIEWS[VIEW] ? close() : open("team"));
  nav && nav.append(navBtn);

  // \u2500\u2500 Left-column card \u2500\u2500
  const card = document.createElement("div");
  card.className = "p rise st-card";
  card.style.animationDelay = ".5s";
  card.innerHTML =
    '<h2>EXECUTIVE TEAM</h2><div class="sub">Your AI department heads. Nothing reaches a client without your approval.</div>' +
    '<button type="button" class="st-mission" id="stMission" hidden><span class="st-mk">MISSION</span><b id="stMT">$20k a month</b><span class="st-bar"><i id="stMB"></i></span><span class="st-mu" id="stMS"></span></button>' +
    '<div class="st-mini">' +
    DEPTS.map((d) => '<button type="button" data-d="' + d.id + '" style="--hc:' + d.color + '" title="' + esc(d.name) + '"><i>' + d.icon + "</i>" + esc(d.short) + '<b hidden></b></button>').join("") +
    '<button type="button" data-v="reports" style="--hc:var(--c)"><i>\u2630</i>Reports</button></div>' +
    '<div class="st-brief" id="stBrief" hidden></div>' +
    '<div class="st-row"><button class="b" type="button" id="stOpen">Open team</button><button class="b" type="button" id="stAppr">Approvals</button></div>';
  const left = q("#l");
  left && left.append(card);
  card.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => openChat(b.dataset.d)));
  q("[data-v=reports]", card).onclick = () => open("reports");
  q("#stOpen", card).onclick = () => open("team");
  q("#stAppr", card).onclick = () => open("approvals");
  q("#stBrief", card).onclick = () => SUMMARY?.latest_briefing && showReport(SUMMARY.latest_briefing.id);
  q("#stMission", card).onclick = () => open("autopilot");

  // \u2500\u2500 Sheet \u2500\u2500
  const sheet = document.createElement("section");
  sheet.id = "stSheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", "Executive team");
  sheet.innerHTML =
    '<div class="st-h"><div><h2>EXECUTIVE TEAM</h2><div class="sub" id="stSub">Chief of Staff and six department heads</div></div>' +
    '<div class="st-tabs" role="tablist">' +
    '<button data-t="team" class="on">Team</button><button data-t="approvals">Approvals <span class="st-n" id="stTabN"></span></button><button data-t="growth">Growth</button><button data-t="reports">Reports</button><button data-t="autopilot">Autopilot</button><button data-t="memory">Memory</button></div>' +
    '<button class="st-x" type="button" aria-label="Close team">\u2715</button></div><div class="st-body" id="stBody"></div>';
  document.body.append(sheet);
  const body = q("#stBody", sheet);
  q(".st-x", sheet).onclick = close;
  sheet.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => open(b.dataset.t)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sheet.classList.contains("on")) close(); });

  let VIEW = "team";
  function setTab(t) { sheet.querySelectorAll("[data-t]").forEach((b) => b.classList.toggle("on", b.dataset.t === t)); }
  const HUB_VIEWS = { goals: ["GOALS & KPIS", "Your mission and the targets your team works toward"], connections: ["CONNECTIONS", "Every system Studio AI and your team can see"] };
  function setHead(view) {
    const hv = HUB_VIEWS[view];
    q(".st-h h2", sheet).textContent = hv ? hv[0] : "EXECUTIVE TEAM";
    q("#stSub", sheet).textContent = hv ? hv[1] : "Chief of Staff and six department heads";
    q(".st-tabs", sheet).hidden = !!hv;
    sheet.setAttribute("aria-label", hv ? hv[0].toLowerCase() : "Executive team");
  }
  async function open(view) {
    if (!unlocked()) { if (typeof unlock === "function") unlock(); return; }
    VIEW = view;
    sheet.classList.add("on");
    navBtn.classList.toggle("on", !HUB_VIEWS[view]);
    setHead(view);
    if (view === "goals") return renderGoals();
    if (view === "connections") return renderConnections();
    setTab(view === "chat" ? "team" : view);
    if (view === "team") renderTeam();
    if (view === "approvals") renderApprovals();
    if (view === "reports") renderReports();
    if (view === "memory") renderMemory();
    if (view === "growth") renderGrowth();
    if (view === "autopilot") renderAutopilot();
  }
  function close() { sheet.classList.remove("on"); navBtn.classList.remove("on"); document.dispatchEvent(new CustomEvent("st:close")); }
  window.studioTeam = { open: (v) => open(v), close: () => close(), isOpen: () => sheet.classList.contains("on"), view: () => VIEW };

  // \u2500\u2500 Growth: prospects, website scanner, brand radar \u2500\u2500
  async function runShiftNow(id, label, btn) {
    btn.disabled = true;
    toast(label + " started. It takes a few minutes; results land in Reports and Approvals.");
    try { const r = await api("/shifts/" + id + "/run", { method: "POST", body: {}, long: true }); toast(label + " done \u2713"); loadSummary(); if (VIEW === "growth") renderGrowth(); if (r.report?.id) setTimeout(() => showReport(r.report.id), 400); }
    catch (e) { toast(e.message); }
    btn.disabled = false;
  }
  function scanHtml(rep) {
    if (!rep.ok && rep.error) return '<div class="st-item"><b>' + esc(rep.url || "") + '</b><div class="st-mu">' + esc(rep.error) + "</div></div>";
    const h = rep.home || {};
    const chips = (arr, none) => (arr && arr.length ? arr.map((x) => '<span class="st-chip">' + esc(x) + "</span>").join(" ") : '<span class="st-mu">' + none + "</span>");
    return '<div class="st-item st-scan"><div class="st-scan-top"><div><b>' + esc(h.title || rep.url) + '</b><div class="st-mu">' + esc(rep.url) + " \xB7 " + (rep.load_ms / 1000).toFixed(1) + "s \xB7 " + (rep.https ? "HTTPS" : "not secure") + (h.viewport ? " \xB7 mobile-ready" : " \xB7 not mobile-ready") + '</div></div><div class="st-score"><b>' + rep.opportunity_score + '</b><span>opportunity</span></div></div>' +
      '<div class="st-scan-grid"><div><span>Booking</span>' + chips(h.booking, "none") + '</div><div><span>Chat</span>' + chips(h.chat, "none") + '</div><div><span>Tracking</span>' + chips(h.tracking, "none") + '</div><div><span>Platform</span>' + chips(h.platform, "unknown") + "</div></div>" +
      '<div class="st-gaps">' + (rep.gaps || []).map((g) => "<div>\u2022 " + esc(g.text) + "</div>").join("") + "</div>" +
      '<div class="st-mu">SEO: title ' + (h.title_length || 0) + " chars \xB7 meta description " + (h.meta_description_length ? h.meta_description_length + " chars" : "missing") + " \xB7 H1 " + (h.h1 && h.h1.length ? "\u2713" : "missing") + " \xB7 schema " + (h.local_business_schema ? "\u2713" : "missing") + " \xB7 sitemap " + (rep.sitemap_xml ? "\u2713" : "missing") + (h.emails && h.emails.length ? " \xB7 email " + esc(h.emails[0]) : "") + "</div></div>";
  }
  const VNAME = { allied: "Allied health", dental: "Dental", aesthetics: "Aesthetics", psychology: "Psychology", medical: "Medical", property: "Property mgmt", trades: "Trades & services", coaching: "Coaches & consultants", multi: "Multi-location", other: "Other" };
  function campaignHtml(C) {
    if (!C || !C.setup) return "";
    const st = C.setup, stats = C.stats || {}, cfg = C.config || {};
    const prog = Object.entries(cfg.targets || {}).map(([v, t]) => {
      const n = (stats.enrolled_by_vertical || {})[v] || 0;
      return '<div class="st-cprog"><span>' + esc(VNAME[v] || v) + '</span><span class="st-bar"><i style="width:' + Math.max(2, Math.min(100, (n / t) * 100)) + '%"></i></span><b>' + n + " / " + t + "</b></div>";
    }).join("");
    const tc = stats.ghl_tag_counts || {};
    return '<div class="st-item st-camp"><div class="st-camp-top"><div><b>' + esc(st.campaign || cfg.name || "Outreach campaign") + '</b><div class="st-mu">' + esc(cfg.workflow_name || "") + " \xB7 sends from your GHL templates</div></div>" +
      '<span class="st-chip ' + (st.ready ? "ok" : "warn") + '">' + (st.ready ? "Ready" : "Setup needed") + "</span></div>" +
      (st.ready ? "" : '<div class="st-gaps">' + (st.problems || []).map((x) => "<div>\u2022 " + esc(x) + "</div>").join("") + "</div>") +
      '<div class="st-cgrid">' + prog + "</div>" +
      '<div class="st-mu">Sydney 100: ' + (tc["sf-sydney-oct2026"] ?? "\u2013") + " \xB7 replied " + (tc["outreach-replied"] ?? "\u2013") + " \xB7 booked " + (tc["outreach-booked"] ?? "\u2013") + " \xB7 opted out " + (tc["outreach-opted-out"] ?? "\u2013") + '</div>' +
      '<div class="st-row" style="margin-top:10px"><button class="b" type="button" id="stCampChk">Re-check GHL setup</button></div></div>';
  }
  function queueHtml(Q) {
    if (!Q.length) return '<div class="st-empty">Nothing waiting. Run a prospect hunt and Sales will queue researched businesses here.</div>';
    return '<div class="st-qbar"><label><input type="checkbox" id="stQAll"> Select all</label><button class="b go" type="button" id="stQGo" disabled>Approve selected</button></div>' +
      Q.map((a) => { const p = a.params || {}; return '<div class="st-q" data-id="' + esc(a.id) + '"><label class="st-qck"><input type="checkbox" value="' + esc(a.id) + '"></label><div class="st-qmain"><div class="st-pros-top"><div><b>' + esc(p.business_name) + '</b><div class="st-mu">' + esc(VNAME[p.vertical] || p.vertical || "") + " \xB7 " + esc(p.email) + (p.phone ? " \xB7 " + esc(p.phone) : "") + '</div></div></div><div class="st-leak"><b>' + esc(p.subject) + '</b></div><details><summary>Email 01 + evidence</summary><p class="st-opener" style="white-space:pre-wrap">' + esc(p.body) + "</p><p>" + esc(p.evidence || "") + (p.evidence_url ? ' <a href="' + esc(p.evidence_url) + '" target="_blank" rel="noopener">source</a>' : "") + '</p><p class="st-mu">' + esc(p.consent_basis || "") + '</p></details><div class="st-row"><button class="b" data-rej>Reject\u2026</button></div></div></div>'; }).join("");
  }
  function callsHtml(K) {
    if (!K.length) return '<div class="st-empty">No calls due yet. Prospects appear here a day after their first email (with a published phone).</div>';
    return K.map((c) => '<div class="st-call" data-id="' + esc(c.id) + '"><div class="st-pros-top"><span class="st-pscore">' + (c.score ?? "\u2013") + '</span><div><b>' + esc(c.business_name) + '</b><div class="st-mu">' + esc(VNAME[c.vertical] || c.vertical || "") + (c.location ? " \xB7 " + esc(c.location) : "") + (c.emailed_days_ago != null ? " \xB7 emailed " + c.emailed_days_ago + "d ago" : " \xB7 not emailed yet") + '</div></div><a class="b go st-dial" href="tel:' + esc(String(c.phone).replace(/[^+\\d]/g, "")) + '">Call ' + esc(c.phone) + "</a></div>" +
      '<details><summary>Call notes</summary><p><b>Noticed:</b> ' + esc(c.observation || "") + '</p><p class="st-opener">' + esc(c.opener) + "</p><ul>" + c.questions.map((x) => "<li>" + esc(x) + "</li>").join("") + '</ul><p class="st-mu">' + esc(c.close) + "</p></details>" +
      '<div class="st-row"><button class="b" data-o="booked">Booked</button><button class="b" data-o="interested">Interested</button><button class="b" data-o="voicemail">Voicemail</button><button class="b" data-o="no_answer">No answer</button><button class="b" data-o="not_interested">Not interested</button></div></div>').join("");
  }
  async function renderGrowth() {
    body.innerHTML = '<div class="st-empty">Loading growth\u2026</div>';
    let P = [], radar = null, C = null, Q = [], K = [];
    try {
      const [p, r, c, a, k] = await Promise.all([api("/prospects"), api("/reports?kind=shift&limit=30").catch(() => ({ reports: [] })), api("/campaign").catch(() => null), api("/actions?status=pending").catch(() => ({ actions: [] })), api("/calls").catch(() => ({ calls: [] }))]);
      P = p.prospects || [];
      radar = (r.reports || []).find((x) => x.subkind === "brand_radar") || null;
      C = c; Q = (a.actions || []).filter((x) => x.type === "campaign_enrol"); K = k.calls || [];
    } catch (e) { body.innerHTML = '<div class="st-empty">' + esc(e.message) + "</div>"; return; }
    if (VIEW !== "growth") return;
    const counts = P.reduce((m, x) => ((m[x.status] = (m[x.status] || 0) + 1), m), {});
    const rows = P.filter((x) => x.status !== "skipped").map((x) =>
      '<div class="st-pros" data-id="' + esc(x.id) + '"><div class="st-pros-top"><span class="st-pscore">' + (x.score ?? "\u2013") + '</span><div><b>' + esc(x.business_name) + '</b><div class="st-mu">' + [x.niche, x.location].filter(Boolean).map(esc).join(" \xB7 ") + ' \xB7 <a href="' + esc(x.website) + '" target="_blank" rel="noopener">' + esc(String(x.website).replace(/^https?:\\/\\//, "")) + '</a></div></div><span class="st-chip">' + esc(x.status.replace("_", " ")) + "</span></div>" +
      '<div class="st-leak">' + esc(x.leak || "") + "</div>" + (x.evidence ? '<details><summary>Evidence & opener</summary><p>' + esc(x.evidence) + '</p><p class="st-opener">' + esc(x.opener || "") + "</p></details>" : "") +
      '<div class="st-row"><button class="b" data-a="draft">Draft email</button><button class="b" data-a="sent">Mark sent</button><button class="b" data-a="replied">Replied</button><button class="b" data-a="skipped">Skip</button></div></div>').join("");
    body.innerHTML =
      '<div class="st-sec"><h3>GROWTH ENGINE</h3><span class="st-mu">Find businesses we can help, and make sure we look like the go-to team.</span></div>' +
      '<div class="st-item st-gactions"><button class="b go" id="stHunt">Run prospect hunt</button><button class="b" id="stRadar">Run brand radar</button>' +
      (radar ? '<button class="b" id="stRadarOpen">Latest brand radar \xB7 ' + esc(ago(radar.created_at)) + "</button>" : "") + "</div>" +
      '<div class="st-sec" style="margin-top:22px"><h3>OUTREACH CAMPAIGN</h3><span class="st-mu">Health clinics first, property managers second.</span></div>' + campaignHtml(C) +
      '<div class="st-sec" style="margin-top:22px"><h3>READY TO ENROL</h3><span class="st-mu">' + Q.length + " researched and written, waiting for your OK</span></div>" + queueHtml(Q) +
      '<div class="st-sec" style="margin-top:22px"><h3>CALLS TODAY</h3><span class="st-mu">Call 1\u20133 days after their first email.</span></div><div class="st-calls">' + callsHtml(K) + "</div>" +
      '<div class="st-sec" style="margin-top:22px"><h3>SCAN ANY WEBSITE</h3><span class="st-mu">A prospect, a competitor, or ours.</span></div>' +
      '<form class="st-ask" id="stScanF"><input id="stScanU" placeholder="e.g. www.studioflowandsystems.com" autocomplete="off"><button class="b">Scan</button></form><div id="stScanOut"></div>' +
      '<div class="st-sec" style="margin-top:22px"><h3>PROSPECTS</h3><span class="st-mu">' + (counts.to_send || 0) + " to contact \xB7 " + (counts.sent || 0) + " contacted \xB7 " + (counts.replied || 0) + " replied</span></div>" +
      '<div class="st-prosl">' + (rows || '<div class="st-empty">No prospects yet. Run a prospect hunt and Sales will find, analyse and score Australian businesses for you.</div>') + "</div>";
    q("#stHunt", body).onclick = (e) => runShiftNow("prospect_hunt", "Prospect hunt", e.target);
    const chk = q("#stCampChk", body);
    if (chk) chk.onclick = async () => { chk.disabled = true; try { await api("/campaign?fresh=1"); renderGrowth(); } catch (e) { toast(e.message); chk.disabled = false; } };
    const boxes = () => [...body.querySelectorAll(".st-qck input")];
    const go = q("#stQGo", body), all = q("#stQAll", body);
    const sync = () => { if (go) { const n = boxes().filter((b) => b.checked).length; go.disabled = !n; go.textContent = n ? "Approve " + n + " for the campaign" : "Approve selected"; } };
    boxes().forEach((b) => (b.onchange = sync));
    if (all) all.onchange = () => { boxes().forEach((b) => (b.checked = all.checked)); sync(); };
    if (go) go.onclick = async () => {
      const ids = boxes().filter((b) => b.checked).map((b) => b.value);
      if (!ids.length || !confirm("Enrol " + ids.length + " business" + (ids.length > 1 ? "es" : "") + " in your GHL outreach campaign? Email 01 goes out per the workflow's schedule.")) return;
      go.disabled = true; go.textContent = "Enrolling\u2026";
      try {
        const r = await api("/actions/bulk-approve", { method: "POST", body: { ids }, long: true });
        const bad = r.results.filter((x) => !x.ok);
        toast(r.approved + " enrolled" + (bad.length ? " \xB7 " + bad.length + " held back: " + bad[0].error : ""));
        loadSummary(); renderGrowth();
      } catch (e) { toast(e.message); go.disabled = false; }
    };
    body.querySelectorAll(".st-q [data-rej]").forEach((b) => (b.onclick = async () => {
      const row = b.closest(".st-q"), why = prompt("Why not? (the team learns from this)") ;
      if (why === null) return;
      try { await api("/actions/" + row.dataset.id + "/reject", { method: "POST", body: { note: why } }); toast("Rejected. The team will learn from it."); renderGrowth(); } catch (e) { toast(e.message); }
    }));
    body.querySelectorAll(".st-call [data-o]").forEach((b) => (b.onclick = async () => {
      const row = b.closest(".st-call"), o = b.dataset.o;
      const notes = ["booked", "interested", "not_interested"].includes(o) ? prompt("Quick notes from the call (optional)") : "";
      if (notes === null) return;
      try { await api("/prospects/" + row.dataset.id, { method: "POST", body: { call_status: o, call_notes: notes || "" } }); toast(o === "booked" ? "Booked! Logged \u2713" : "Logged \u2713"); renderGrowth(); } catch (e) { toast(e.message); }
    }));
    q("#stRadar", body).onclick = (e) => runShiftNow("brand_radar", "Brand radar", e.target);
    if (radar) q("#stRadarOpen", body).onclick = () => showReport(radar.id);
    q("#stScanF", body).onsubmit = async (e) => {
      e.preventDefault();
      const u = q("#stScanU", body).value.trim();
      if (!u) return;
      const out = q("#stScanOut", body);
      out.innerHTML = '<div class="st-empty">Scanning ' + esc(u) + "\u2026</div>";
      try { const r = await api("/analyse", { method: "POST", body: { url: u, pages: 1 } }); out.innerHTML = scanHtml(r.report); }
      catch (err) { out.innerHTML = '<div class="st-empty">' + esc(err.message) + "</div>"; }
    };
    body.querySelectorAll(".st-pros").forEach((row) => row.querySelectorAll("[data-a]").forEach((b) => (b.onclick = async () => {
      const id = row.dataset.id, a = b.dataset.a, x = P.find((p) => p.id === id);
      if (a === "draft") { openChat("head_of_sales", "Draft a personalised outreach email for prospect " + x.business_name + " (" + x.website + ", prospect id " + id + "). Their biggest leak: " + x.leak + ". If they publish a business email on their site, propose it with propose_outreach_email; if not, give me the best way to reach them."); return; }
      b.disabled = true;
      try { await api("/prospects/" + id, { method: "POST", body: { status: a } }); toast(x.business_name + ": " + a.replace("_", " ")); renderGrowth(); } catch (err) { toast(err.message); b.disabled = false; }
    })));
  }

  // \u2500\u2500 Hub goals (the hub's own goals API) \u2500\u2500
  async function hub(path, opts = {}) {
    const k = key();
    if (!k) throw new Error("Unlock the command centre first.");
    const r = await fetch(path, { method: opts.method || "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer " + k }, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: AbortSignal.timeout(30000) });
    const d = await r.json().catch(() => ({ ok: false, error: "HTTP " + r.status }));
    if (!r.ok || d.ok === false) throw new Error(d.error || "Request failed.");
    return d;
  }
  const METRICS = { manual: "Manual (I update it)", new_opportunities_today: "Live: new GHL opportunities today", open_opportunities: "Live: open GHL pipeline" };
  async function renderGoals(editing) {
    body.innerHTML = '<div class="st-empty">Loading goals\u2026</div>';
    let goals = [], ov = null;
    try { [goals, ov] = await Promise.all([hub("/api/v1/operator/goals").then((d) => d.goals || []), hub("/api/v1/operator/overview").catch(() => null)]); } catch (e) { body.innerHTML = '<div class="st-empty">' + esc(e.message) + "</div>"; return; }
    if (VIEW !== "goals") return;
    const m = MISSION, ghl = ov && ov.ghl;
    const actualOf = (g) => g.metric === "manual" ? Number(g.actual || 0) : ghl && ghl.status === "connected" ? Number(ghl[g.metric] || 0) : null;
    const rows = goals.map((g) => {
      const a = actualOf(g), pct = a == null ? 0 : Math.max(2, Math.min(100, (a / g.target) * 100));
      return '<div class="st-goal" data-id="' + esc(g.id) + '"><div class="st-goal-top"><b>' + esc(g.title) + '</b><span class="st-chip">' + (g.metric === "manual" ? "Manual" : "Live GHL") + "</span></div>" +
        '<div class="st-goal-num"><strong>' + (a == null ? "\u2014" : Number(a).toLocaleString("en-AU")) + "</strong> / " + Number(g.target).toLocaleString("en-AU") + " " + esc(g.unit || "") + (g.due_date ? ' <span class="st-mu">\xB7 due ' + esc(g.due_date) + "</span>" : "") + "</div>" +
        '<span class="st-bar"><i style="width:' + pct + '%"></i></span>' +
        '<div class="st-row"><button class="b" type="button" data-edit>Edit</button><button class="b" type="button" data-arch>Archive</button></div></div>';
    }).join("");
    const g = editing ? goals.find((x) => x.id === editing) : null;
    body.innerHTML =
      '<div class="st-sec"><h3>MISSION</h3><span class="st-mu">Revenue this month, live from Stripe.</span></div>' +
      '<div class="st-item st-mbig">' + (m && m.connected
        ? '<div class="st-mnum"><b>' + money(m.revenue_month_to_date) + "</b><span>of " + money(m.target) + " in " + esc(m.month) + '</span></div><span class="st-bar big"><i style="width:' + Math.max(2, Math.min(100, m.percent_of_target)) + '%"></i></span><div class="st-mu" style="margin-top:8px">On pace for ' + money(m.projected_this_month) + " \xB7 " + m.days_left + " days left \xB7 change the target in Team \u2192 Autopilot</div>"
        : '<div class="st-mu">Revenue tracking needs Stripe connected.</div>') + "</div>" +
      '<div class="st-sec" style="margin-top:22px"><h3>GOALS & KPIS</h3><span class="st-mu">Studio AI and every department head can see these.</span></div>' +
      '<div class="st-goals">' + (rows || '<div class="st-empty">No goals yet. Add your first one below.</div>') + "</div>" +
      '<div class="st-sec" style="margin-top:22px"><h3>' + (g ? "EDIT GOAL" : "ADD A GOAL") + '</h3></div>' +
      '<form class="st-item st-gform" id="stGoalF"><input id="stGT" placeholder="e.g. 8 discovery calls this week" maxlength="140" required value="' + esc(g ? g.title : "") + '">' +
      '<div class="st-gfrow"><select id="stGM">' + Object.entries(METRICS).map(([k, l]) => '<option value="' + k + '"' + ((g ? g.metric : "manual") === k ? " selected" : "") + ">" + l + "</option>").join("") + "</select>" +
      '<input id="stGTg" type="number" min="1" step="any" placeholder="Target" required value="' + (g ? g.target : "") + '">' +
      '<input id="stGA" type="number" min="0" step="any" placeholder="Current" value="' + (g && g.metric === "manual" ? g.actual || 0 : "") + '">' +
      '<input id="stGU" placeholder="Unit (calls, $, clients)" maxlength="24" value="' + esc(g ? g.unit || "" : "") + '">' +
      '<input id="stGD" type="date" value="' + esc(g && g.due_date ? g.due_date : "") + '"></div>' +
      '<div class="st-row"><button class="b go" type="submit">' + (g ? "Save changes" : "Add goal") + "</button>" + (g ? '<button class="b" type="button" id="stGC">Cancel</button>' : "") + "</div></form>";
    const syncManual = () => { q("#stGA", body).hidden = q("#stGM", body).value !== "manual"; };
    q("#stGM", body).onchange = syncManual; syncManual();
    body.querySelectorAll(".st-goal").forEach((row) => {
      q("[data-edit]", row).onclick = () => renderGoals(row.dataset.id);
      q("[data-arch]", row).onclick = async (e) => {
        e.target.disabled = true;
        try { await hub("/api/v1/operator/goals", { method: "POST", body: { archive: true, id: row.dataset.id } }); toast("Goal archived"); renderGoals(); refreshHubGoals(); } catch (err) { toast(err.message); e.target.disabled = false; }
      };
    });
    if (g) q("#stGC", body).onclick = () => renderGoals();
    q("#stGoalF", body).onsubmit = async (e) => {
      e.preventDefault();
      const metric = q("#stGM", body).value;
      const b = { title: q("#stGT", body).value.trim(), metric, target: +q("#stGTg", body).value, unit: q("#stGU", body).value.trim() || "count", due_date: q("#stGD", body).value || null };
      if (metric === "manual") b.actual = +(q("#stGA", body).value || 0);
      if (g) b.id = g.id;
      try { await hub("/api/v1/operator/goals", { method: "POST", body: b }); toast(g ? "Goal updated" : "Goal added"); renderGoals(); refreshHubGoals(); } catch (err) { toast(err.message); }
    };
  }
  function refreshHubGoals() { try { if (typeof loadGoals === "function") loadGoals(); } catch {} }

  // \u2500\u2500 Connections \u2500\u2500
  async function renderConnections() {
    body.innerHTML = '<div class="st-empty">Checking every connection\u2026</div>';
    const [ov, th, db] = await Promise.all([
      hub("/api/v1/operator/overview").catch(() => null),
      api("/health").catch(() => null),
      fetch("/api/v1/db/health").then((r) => r.json()).catch(() => null),
    ]);
    if (VIEW !== "connections") return;
    let site = null;
    try { site = (await api("/settings")).settings.site; } catch {}
    const ok = (b) => (b ? "ok" : "off");
    const tiles = [
      ["CRM \xB7 GoHighLevel", ok(ov && ov.ghl && ov.ghl.status === "connected") , ov && ov.ghl && ov.ghl.status === "connected" ? (ov.ghl.open_opportunities ?? "\u2014") + " open opportunities" : "Check GHL_PRIVATE_TOKEN in Cloudflare"],
      ["Calendars", ok(th && th.ghl), "Free 30-min call \xB7 2-hr audit \xB7 Onboarding"],
      ["Payments \xB7 Stripe", ok(th && th.stripe), th && th.stripe ? "Read-only key \xB7 revenue, invoices, subscriptions" : "Check STRIPE_READ_KEY"],
      ["Executive team \xB7 Claude", ok(th && th.claude), th && th.claude ? "7 department heads online" : "Add ANTHROPIC_API_KEY"],
      ["Database \xB7 Supabase", ok((db && db.ok !== false) && th && th.supabase_team_tables), "Memory, reports, approvals, goals"],
      ["Voice \xB7 OpenAI realtime", "ok", "Private voice in this command centre"],
      ["Public page booking", site && site.public_v2 ? "ok" : "warn", site && site.public_v2 ? "Upgraded page is live" : "Preview ready, switch on in Team \u2192 Autopilot"],
      ["Instagram DMs", "warn", "Waiting on the Meta app review"],
      ["Advertising", "off", "Not connected yet"],
    ];
    body.innerHTML = '<div class="st-sec"><h3>SYSTEMS</h3><span class="st-mu">Live status, checked just now.</span></div><div class="st-conns">' +
      tiles.map(([n, s, d]) => '<div class="st-conn ' + s + '"><i></i><div><b>' + esc(n) + '</b><div class="st-mu">' + esc(d) + '</div></div><span>' + (s === "ok" ? "Connected" : s === "warn" ? "Needs you" : "Off") + "</span></div>").join("") + "</div>";
  }

  // \u2500\u2500 Mission ($20k/month) \u2500\u2500
  const money = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("en-AU");
  let MISSION = null;
  async function loadMission() {
    if (!unlocked()) return;
    try {
      MISSION = (await api("/mission")).mission;
      const el = q("#stMission", card);
      if (!MISSION?.connected) { el.hidden = true; return; }
      el.hidden = false;
      const pct = Math.max(0, Math.min(100, MISSION.percent_of_target || 0));
      q("#stMT", card).textContent = money(MISSION.revenue_month_to_date) + " of " + money(MISSION.target) + " \xB7 " + MISSION.month;
      q("#stMB", card).style.width = Math.max(2, pct) + "%";
      q("#stMS", card).textContent = pct + "% \xB7 on pace for " + money(MISSION.projected_this_month) + (MISSION.days_left ? " \xB7 " + MISSION.days_left + " days left" : "");
    } catch (e) { q("#stMission", card).hidden = true; }
  }

  // \u2500\u2500 Summary (badges, briefing line, tiles) \u2500\u2500
  let SUMMARY = null;
  async function loadSummary() {
    if (!unlocked()) return;
    try {
      SUMMARY = await api("/summary");
      const n = SUMMARY.pending_approvals || "";
      q("#stNavN").textContent = n;
      q("#stTabN").textContent = n;
      const ab = q("#stAppr", card);
      ab.textContent = n ? n + " to approve" : "Approvals";
      ab.classList.toggle("st-warnb", !!n);
      for (const d of SUMMARY.departments) {
        const dot = q('[data-d="' + d.id + '"] b', card);
        if (dot) dot.hidden = !d.pending_approvals;
      }
      const br = SUMMARY.latest_briefing, el = q("#stBrief", card);
      el.hidden = !br;
      if (br) el.innerHTML = "<b>" + esc(br.title) + "</b> \xB7 " + ago(br.at) + "<br>" + esc(br.preview.replace(/[#*|\`>-]/g, " ").replace(/\\s+/g, " ").slice(0, 220));
      if (sheet.classList.contains("on") && VIEW === "team") renderTeam();
    } catch (e) {
      const el = q("#stBrief", card);
      el.hidden = false;
      el.textContent = e.message;
    }
  }

  // \u2500\u2500 Team view \u2500\u2500
  function renderTeam() {
    const depts = SUMMARY?.departments || DEPTS;
    body.innerHTML =
      '<form class="st-ask" id="stAskF"><input id="stAskI" placeholder="Ask your whole team\u2026 e.g. \u201CHow are we tracking this week, and what should I focus on?\u201D" autocomplete="off"><button class="b st-ok">Ask</button></form>' +
      '<div class="st-grid">' +
      depts.map((d) =>
        '<button type="button" class="st-dept' + (d.id === "chief_of_staff" ? " cos" : "") + '" data-d="' + d.id + '" style="--hc:' + d.color + '">' +
        '<span class="st-ic">' + d.icon + "</span><span><h3>" + esc(d.name) + "</h3><p>" + esc(d.tagline) + "</p></span>" +
        '<span class="st-chips">' + (d.pending_approvals ? '<span class="st-chip w">' + d.pending_approvals + " to approve</span>" : "") +
        '<span class="st-chip">' + (d.last_report ? "report " + ago(d.last_report.at) : "ready") + "</span></span></button>"
      ).join("") + "</div>";
    body.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => openChat(b.dataset.d)));
    q("#stAskF", body).onsubmit = (e) => { e.preventDefault(); const v = q("#stAskI", body).value.trim(); openChat("chief_of_staff", v || undefined); };
  }

  // \u2500\u2500 Chat \u2500\u2500
  let CUR = { dept: "chief_of_staff", thread: null, busy: false };
  async function openChat(dept, first) {
    if (!unlocked()) { if (typeof unlock === "function") unlock(); return; }
    if (!sheet.classList.contains("on")) { sheet.classList.add("on"); navBtn.classList.add("on"); }
    VIEW = "chat";
    setTab("team");
    const d = BY[dept];
    CUR = { dept, thread: null, busy: false };
    body.innerHTML =
      '<div class="st-chat" style="--hc:' + d.color + '"><div class="st-chat-h"><button class="b" type="button" id="stBack">\u2190 Team</button>' +
      '<span class="st-ic">' + d.icon + '</span><div><h3 style="margin:0;font-size:15px">' + esc(d.name) + '</h3><div class="st-mu">' + esc(d.tagline) + "</div></div>" +
      '<select id="stThreads" aria-label="Conversation"><option value="">New conversation</option></select></div>' +
      '<div class="st-msgs" id="stMsgs"><div class="st-m a">' + md("Hi Ty, I'm your **" + d.name + "**. What do you need?") + "</div></div>" +
      '<div class="st-sugg" id="stSugg">' + (SUGGEST[dept] || []).map((s) => '<button type="button">' + esc(s) + "</button>").join("") + "</div>" +
      '<form class="st-comp" id="stComp"><textarea id="stIn" placeholder="Message your ' + esc(d.short) + ' head\u2026"></textarea><button class="b st-ok" id="stSend">Send</button></form></div>';
    q("#stBack", body).onclick = () => open("team");
    q("#stSugg", body).querySelectorAll("button").forEach((b) => (b.onclick = () => send(b.textContent)));
    q("#stComp", body).onsubmit = (e) => { e.preventDefault(); const v = q("#stIn", body).value; q("#stIn", body).value = ""; send(v); };
    q("#stIn", body).onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); q("#stComp", body).requestSubmit(); } };
    q("#stThreads", body).onchange = (e) => loadThread(e.target.value);
    api("/threads?department=" + dept).then(({ threads }) => {
      const sel = q("#stThreads", body);
      if (!sel || CUR.dept !== dept) return;
      sel.innerHTML = '<option value="">New conversation</option>' + threads.map((t) => '<option value="' + t.id + '">' + esc((t.title || "Conversation").slice(0, 42)) + " \xB7 " + ago(t.updated_at) + "</option>").join("");
    }).catch(() => {});
    if (first) send(first); else q("#stIn", body).focus();
  }
  async function loadThread(id) {
    if (!id) return openChat(CUR.dept);
    CUR.thread = id;
    const { messages } = await api("/threads/" + id);
    q("#stSugg", body).innerHTML = "";
    q("#stMsgs", body).innerHTML = messages.map((m) => bubble(m.role, m.content, m.meta)).join("");
    scroll();
  }
  function bubble(role, text, meta = {}) {
    if (role === "user") return '<div class="st-m u">' + esc(text).replace(/\\n/g, "<br>") + "</div>";
    const tags = [];
    (meta.consulted || []).forEach((id) => BY[id] && tags.push('<span class="st-chip" style="color:' + BY[id].color + '">consulted ' + esc(BY[id].short) + "</span>"));
    (meta.actions || []).forEach((a) => tags.push('<span class="st-chip w">awaiting approval \xB7 ' + esc(a.title) + "</span>"));
    (meta.deliverables || []).forEach((r) => tags.push('<span class="st-chip" data-r="' + r.id + '" style="cursor:pointer">saved \xB7 ' + esc(r.title) + "</span>"));
    return '<div class="st-m a">' + md(text) + (tags.length ? '<div class="st-tags">' + tags.join("") + "</div>" : "") + "</div>";
  }
  const scroll = () => { const m = q("#stMsgs", body); if (m) m.scrollTop = m.scrollHeight; };
  body.addEventListener("click", (e) => { const r = e.target.closest("[data-r]"); if (r) showReport(r.dataset.r); });
  async function send(text) {
    text = String(text || "").trim();
    if (!text || CUR.busy) return;
    const dept = CUR.dept;
    CUR.busy = true;
    q("#stSend", body).disabled = true;
    q("#stSugg", body).innerHTML = "";
    const msgs = q("#stMsgs", body);
    msgs.insertAdjacentHTML("beforeend", bubble("user", text));
    msgs.insertAdjacentHTML("beforeend", '<div class="st-think" id="stThink"><i></i>' + esc(BY[dept].short) + " is working on it. Checking live data\u2026</div>");
    scroll();
    try {
      const r = await api("/chat", { method: "POST", body: { department: dept, thread_id: CUR.thread, message: text }, long: true });
      if (CUR.dept !== dept || !q("#stMsgs", body)) return;
      CUR.thread = r.thread_id;
      q("#stThink", body)?.remove();
      q("#stMsgs", body).insertAdjacentHTML("beforeend", bubble("assistant", r.reply, r));
      if (r.actions?.length) { toast(r.actions.length + " action" + (r.actions.length > 1 ? "s" : "") + " waiting for your approval"); loadSummary(); }
    } catch (e) {
      q("#stThink", body)?.remove();
      q("#stMsgs", body)?.insertAdjacentHTML("beforeend", '<div class="st-m a" style="border-color:rgba(255,120,150,.5)">' + esc(e.message) + "</div>");
    } finally {
      CUR.busy = false;
      const s = q("#stSend", body);
      if (s) s.disabled = false;
      scroll();
    }
  }

  // \u2500\u2500 Approvals \u2500\u2500
  const FIELDS = { ghl_reply: [["message", "textarea"]], ghl_followup: [["subject", "input"], ["message", "textarea"]], ghl_email: [["subject", "input"], ["body", "textarea"]], ghl_sms: [["message", "textarea"]], ghl_note: [["note", "textarea"]], ghl_task: [["title", "input"], ["details", "textarea"]], owner_task: [["title", "input"], ["details", "textarea"]] };
  let HISTORY = false;
  async function renderApprovals() {
    body.innerHTML = '<div class="st-sec"><h3>' + (HISTORY ? "ACTIVITY LOG" : "WAITING FOR YOUR APPROVAL") + '</h3><button class="b" type="button" id="stHist">' + (HISTORY ? "Show waiting" : "Activity log") + '</button></div><div id="stList"><div class="st-empty">Loading\u2026</div></div>';
    q("#stHist", body).onclick = () => { HISTORY = !HISTORY; renderApprovals(); };
    const list = q("#stList", body);
    try {
      const { actions } = await api("/actions?status=" + (HISTORY ? "history" : "pending"));
      if (!actions.length) { list.innerHTML = '<div class="st-empty">' + (HISTORY ? "Nothing decided yet." : "Nothing waiting. When a department head prepares an email, SMS, tag or task, it lands here for you.") + "</div>"; return; }
      list.innerHTML = actions.map((a) => {
        const d = BY[a.department] || {}, p = a.params || {};
        const fields = (FIELDS[a.type] || []).map(([k, t]) => "<label>" + k + "</label>" + (t === "input" ? '<input data-k="' + k + '" value="' + esc(p[k]) + '"' + (HISTORY ? " disabled" : "") + ">" : '<textarea data-k="' + k + '" rows="' + (k === "body" ? 7 : 3) + '"' + (HISTORY ? " disabled" : "") + ">" + esc(p[k]) + "</textarea>")).join("");
        let extra = "";
        if (a.type === "ghl_tags") extra = '<div class="st-mu">' + (p.add || []).map((t) => "+ " + esc(t)).join(", ") + " " + (p.remove || []).map((t) => "\u2212 " + esc(t)).join(", ") + "</div>";
        if (a.type === "ghl_opportunity_status") extra = '<div class="st-mu">' + esc(p.opportunity_name || p.opportunity_id) + " \u2192 <b>" + esc(p.status) + "</b></div>";
        if (a.type === "stripe_draft_invoice") extra = '<div class="st-mu">' + esc(p.customer_name || "") + " &lt;" + esc(p.customer_email) + "&gt;</div><ul>" + (p.lines || []).map((l) => "<li>" + esc(l.description) + " \u2014 $" + Number(l.amount_aud).toFixed(2) + "</li>").join("") + '</ul><div class="st-mu">Created as a DRAFT in Stripe. You review and send it there.</div>';
        const st = HISTORY ? '<span class="st-status ' + a.status + '">' + a.status + "</span>" + (a.auto ? ' <span class="st-status auto">autopilot</span>' : "") + (a.result?.error ? ' <span class="st-mu">' + esc(a.result.error) + "</span>" : "") : "";
        return '<div class="st-item st-act" style="--hc:' + (d.color || "var(--c)") + '" data-id="' + a.id + '"><div class="st-k">' + esc(d.short || a.department) + " \xB7 " + esc(TYPE_NAMES[a.type] || a.type.replace(/_/g, " ")) + '<span class="st-mu" style="float:right;letter-spacing:0;text-transform:none">' + ago(a.created_at) + st + "</span></div><h4>" + esc(a.title) + "</h4>" + (a.reason ? '<div class="st-mu">' + esc(a.reason) + "</div>" : "") + extra + fields +
          (HISTORY ? "" : '<div class="st-btns"><button class="b st-ok" data-do="approve">' + (a.type === "owner_task" ? "Mark done" : "Approve") + '</button><button class="b st-no" data-do="reject">Reject</button></div>') + "</div>";
      }).join("");
      list.querySelectorAll("[data-do]").forEach((b) => (b.onclick = async () => {
        const item = b.closest(".st-act"), params = {};
        item.querySelectorAll("[data-k]").forEach((f) => (params[f.dataset.k] = f.value));
        item.querySelectorAll("button").forEach((x) => (x.disabled = true));
        try {
          await api("/actions/" + item.dataset.id + "/" + b.dataset.do, { method: "POST", body: b.dataset.do === "approve" ? { params } : {}, long: true });
          toast(b.dataset.do === "approve" ? "Done \u2713" : "Rejected");
          item.remove();
          if (!list.querySelector(".st-act")) renderApprovals();
          loadSummary();
        } catch (e) {
          toast(e.message);
          item.querySelectorAll("button").forEach((x) => (x.disabled = false));
        }
      }));
    } catch (e) { list.innerHTML = '<div class="st-empty">' + esc(e.message) + "</div>"; }
  }

  // \u2500\u2500 Reports \u2500\u2500
  let RUNNING = false;
  async function renderReports(openId) {
    body.innerHTML =
      '<div class="st-sec"><h3>BRIEFINGS, REPORTS &amp; DOCUMENTS</h3><div class="st-filters">' +
      '<select id="stFD"><option value="">All departments</option>' + DEPTS.map((d) => '<option value="' + d.id + '">' + esc(d.name) + "</option>").join("") + "</select>" +
      '<select id="stFK"><option value="">All types</option><option value="briefing">Briefings</option><option value="weekly">Weekly reports</option><option value="deliverable">Documents</option></select>' +
      '<button class="b" type="button" id="stRunB">Run briefing now</button><button class="b" type="button" id="stRunW">Run weekly reports</button></div></div>' +
      '<div class="st-prog" id="stProg"></div><div id="stReps"><div class="st-empty">Loading\u2026</div></div>';
    q("#stFD", body).onchange = () => listReports();
    q("#stFK", body).onchange = () => listReports();
    q("#stRunB", body).onclick = runBriefing;
    q("#stRunW", body).onclick = runWeekly;
    await listReports();
    if (openId) expand(openId);
  }
  async function listReports() {
    const el = q("#stReps", body);
    if (!el) return;
    const p = new URLSearchParams();
    if (q("#stFD", body).value) p.set("department", q("#stFD", body).value);
    if (q("#stFK", body).value) p.set("kind", q("#stFK", body).value);
    try {
      const { reports } = await api("/reports?" + p);
      el.innerHTML = reports.length ? reports.map((r) => { const d = BY[r.department] || {}; return '<div class="st-item st-rep" style="--hc:' + (d.color || "var(--c)") + '" data-id="' + r.id + '"><div class="st-k">' + esc(d.short || r.department) + " \xB7 " + esc(r.subkind || r.kind) + '<span class="st-mu" style="float:right;letter-spacing:0;text-transform:none">' + ago(r.created_at) + "</span></div><h4>" + esc(r.title) + '</h4><div class="st-rb"></div></div>'; }).join("") : '<div class="st-empty">No reports yet. Your Chief of Staff writes a briefing every morning at 7am (Brisbane), and every head reports on Monday mornings.</div>';
      el.querySelectorAll(".st-rep").forEach((c) => (c.onclick = (e) => { if (!e.target.closest("a,button")) expand(c.dataset.id); }));
    } catch (e) { el.innerHTML = '<div class="st-empty">' + esc(e.message) + "</div>"; }
  }
  async function expand(id) {
    const c = q('.st-rep[data-id="' + id + '"]', body);
    if (!c) return;
    const b = q(".st-rb", c);
    if (b.innerHTML) { b.innerHTML = ""; return; }
    b.innerHTML = '<div class="st-mu">Loading\u2026</div>';
    const { report } = await api("/reports/" + id);
    b.innerHTML = '<div class="st-m a" style="max-width:100%;margin-top:10px">' + md(report.body) + '</div><div class="st-btns"><button class="b" type="button">Copy</button></div>';
    q("button", b).onclick = () => { navigator.clipboard.writeText(report.body); toast("Copied"); };
    c.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  async function showReport(id) { await open("reports"); expand(id); }
  async function runBriefing() {
    if (RUNNING) return;
    RUNNING = true;
    const prog = q("#stProg", body);
    prog.textContent = "Chief of Staff is gathering numbers and consulting the team (1\u20132 minutes)\u2026";
    try { const r = await api("/run/briefing", { method: "POST", body: {}, long: true }); prog.textContent = "Briefing ready \u2713"; loadSummary(); await listReports(); expand(r.report.id); }
    catch (e) { prog.textContent = e.message; }
    RUNNING = false;
  }
  async function runWeekly() {
    if (RUNNING) return;
    RUNNING = true;
    const heads = DEPTS.filter((d) => d.id !== "chief_of_staff");
    const done = [];
    const prog = () => (q("#stProg", body) || {});
    try {
      for (const d of heads) {
        prog().textContent = "Writing weekly reports: " + d.short + "\u2026 " + (done.length ? "(" + done.join(", ") + " \u2713)" : "");
        await api("/run/report", { method: "POST", body: { department: d.id }, long: true });
        done.push(d.short);
      }
      prog().textContent = "All heads done \u2713 Chief of Staff is writing the CEO review\u2026";
      await api("/run/ceo", { method: "POST", body: {}, long: true });
      prog().textContent = "Weekly reports ready \u2713";
      loadSummary();
      listReports();
    } catch (e) { prog().textContent = e.message; }
    RUNNING = false;
  }

  // \u2500\u2500 Autopilot: mission, rules, shifts \u2500\u2500
  const DAYN = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hourLabel = (h) => (h % 12 || 12) + (h < 12 ? "am" : "pm");
  const daysLabel = (d) => d.length === 7 ? "Every day" : d.join(",") === "1,2,3,4,5" ? "Weekdays" : d.map((x) => DAYN[x]).join(", ");
  async function renderAutopilot() {
    body.innerHTML = '<div class="st-empty">Loading\u2026</div>';
    let S;
    try { S = await api("/settings"); } catch (e) { body.innerHTML = '<div class="st-empty">' + esc(e.message) + "</div>"; return; }
    const s = S.settings;
    const m = MISSION;
    const rules = Object.entries(S.autopilot_types).map(([k, v]) =>
      '<div class="st-rule"><div><b>' + esc(v.label) + "</b>" + (v.warn ? '<div class="st-mu">' + esc(v.warn) + "</div>" : "") + "</div>" +
      '<div class="st-seg" data-k="' + k + '"><button type="button" data-v="ask" class="' + (s.autopilot[k] !== "auto" ? "on" : "") + '">Ask me</button><button type="button" data-v="auto" class="' + (s.autopilot[k] === "auto" ? "on" : "") + '">Just do it</button></div></div>').join("") +
      Object.values(S.always_ask).map((l) => '<div class="st-rule locked"><div><b>' + esc(l) + '</b><div class="st-mu">Always waits for your approval.</div></div><span class="st-chip">Always ask</span></div>').join("");
    const shifts = s.shifts.map((sh) => {
      const d = BY[sh.department] || {};
      return '<div class="st-shift" style="--hc:' + (d.color || "var(--c)") + '" data-id="' + sh.id + '">' +
        '<label class="st-sw"><input type="checkbox" ' + (sh.enabled ? "checked" : "") + '><span></span></label>' +
        '<div class="st-sh-main"><b>' + esc(sh.label) + '</b><div class="st-mu">' + esc(d.short || "") + " \xB7 " + daysLabel(sh.days) + " \xB7 " +
        '<select aria-label="Hour">' + Array.from({ length: 24 }, (_, h) => '<option value="' + h + '"' + (h === sh.hour ? " selected" : "") + ">" + hourLabel(h) + "</option>").join("") + "</select>" +
        (sh.last_run ? " \xB7 last ran " + esc(sh.last_run.replace("T", " ") + ":00") : "") + "</div></div>" +
        '<button class="b" type="button" data-run>Run now</button></div>';
    }).join("");
    body.innerHTML =
      '<div class="st-sec"><h3>MISSION</h3><span class="st-mu">The North Star every head plans toward.</span></div>' +
      '<div class="st-item st-mbig">' +
      (m && m.connected
        ? '<div class="st-mnum"><b>' + money(m.revenue_month_to_date) + '</b><span>of ' + money(m.target) + " in " + esc(m.month) + '</span></div><span class="st-bar big"><i style="width:' + Math.max(2, Math.min(100, m.percent_of_target)) + '%"></i></span>' +
          '<div class="st-mgrid"><div><span>On pace for</span><b>' + money(m.projected_this_month) + '</b></div><div><span>Gap</span><b>' + money(m.gap_to_target) + '</b></div><div><span>Needed / day</span><b>' + (m.needed_per_remaining_day == null ? "\u2014" : money(m.needed_per_remaining_day)) + '</b></div><div><span>Last month</span><b>' + money(m.revenue_last_month) + "</b></div></div>"
        : '<div class="st-mu">Revenue tracking needs Stripe connected.</div>') +
      '<form class="st-ask" id="stTgtF" style="margin:14px 0 0"><input id="stTgt" type="number" min="1000" step="500" value="' + s.mission.target_monthly_aud + '" aria-label="Monthly target in AUD"><button class="b">Set monthly target</button></form></div>' +
      '<div class="st-sec" style="margin-top:22px"><h3>AUTOPILOT RULES</h3><span class="st-mu">Choose what your team can just do. Everything is logged in Activity.</span></div><div class="st-item">' + rules + "</div>" +
      '<div class="st-sec" style="margin-top:22px"><h3>SCHEDULED SHIFTS</h3><span class="st-mu">Brisbane time. Results land in Reports; actions in Approvals.</span></div><div id="stShifts">' + shifts + "</div>" +
      '<div class="st-prog" id="stShProg"></div>' +
      '<div class="st-sec" style="margin-top:22px"><h3>WEBSITE</h3><span class="st-mu">Upgrades go live only when you switch them on.</span></div>' +
      '<div class="st-item">' +
      [["public_v2", "Public page: AI Front Desk demo (visitors try it as their customer), booking built in", "/experience-next"], ["command_v2", "Command centre: working menu, Goals & Connections views, 3D core, app-style mobile", "/command-next"]].map(([k, label, href]) =>
        '<div class="st-rule"><div><b>' + label + '</b><div class="st-mu"><a href="' + href + '" target="_blank" rel="noopener" style="color:var(--c2)">Preview \u2197</a></div></div>' +
        '<div class="st-seg" data-site="' + k + '"><button type="button" data-v="off" class="' + (s.site && s.site[k] ? "" : "on") + '">Original</button><button type="button" data-v="on" class="' + (s.site && s.site[k] ? "on" : "") + '">Upgraded</button></div></div>').join("") + "</div>";
    body.querySelectorAll("[data-site]").forEach((g) => g.querySelectorAll("button").forEach((b) => (b.onclick = async () => {
      const on = b.dataset.v === "on", k = g.dataset.site;
      g.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      try {
        await api("/settings", { method: "POST", body: { site: { [k]: on } } });
        toast(on ? "Upgrade is live. Reload the page to see it." : "Back to the original");
      } catch (e) { toast(e.message); }
    })));
    body.querySelectorAll(".st-seg[data-k]").forEach((g) => g.querySelectorAll("button").forEach((b) => (b.onclick = async () => {
      const v = b.dataset.v, k = g.dataset.k;
      if (v === "auto" && S.autopilot_types[k].warn && !confirm(S.autopilot_types[k].warn + "\\n\\nTurn on autopilot for this?")) return;
      g.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      try { await api("/settings", { method: "POST", body: { autopilot: { [k]: v } } }); toast(v === "auto" ? "Autopilot on: " + S.autopilot_types[k].label : "Back to asking you first"); } catch (e) { toast(e.message); }
    })));
    const saveShift = async (row) => {
      const id = row.dataset.id;
      const sh = s.shifts.find((x) => x.id === id);
      sh.enabled = q("input", row).checked;
      sh.hour = +q("select", row).value;
      try { await api("/settings", { method: "POST", body: { shifts: [{ id, enabled: sh.enabled, hour: sh.hour, days: sh.days }] } }); toast("Saved: " + sh.label); } catch (e) { toast(e.message); }
    };
    body.querySelectorAll(".st-shift").forEach((row) => {
      q("input", row).onchange = () => saveShift(row);
      q("select", row).onchange = () => saveShift(row);
      q("[data-run]", row).onclick = async (e) => {
        const b = e.target, sh = s.shifts.find((x) => x.id === row.dataset.id);
        b.disabled = true;
        q("#stShProg", body).textContent = sh.label + " is running (1\u20133 minutes)\u2026";
        try { const r = await api("/shifts/" + sh.id + "/run", { method: "POST", body: {}, long: true }); q("#stShProg", body).textContent = "Done \u2713 " + (r.report?.title || ""); loadSummary(); if (r.report?.id) setTimeout(() => showReport(r.report.id), 600); }
        catch (err) { q("#stShProg", body).textContent = err.message; }
        b.disabled = false;
      };
    });
    q("#stTgtF", body).onsubmit = async (e) => {
      e.preventDefault();
      const t = +q("#stTgt", body).value;
      if (!(t > 0)) return;
      await api("/settings", { method: "POST", body: { mission: { target_monthly_aud: t } } });
      toast("Mission target set to " + money(t) + " a month");
      await loadMission();
      renderAutopilot();
    };
  }

  // \u2500\u2500 Memory \u2500\u2500
  async function renderMemory() {
    body.innerHTML =
      '<div class="st-sec"><h3>TEAM MEMORY</h3><span class="st-mu">Facts every head knows: offers, prices, goals, rules.</span></div>' +
      '<form class="st-ask" id="stMemF"><select id="stMemC" class="st-in" style="flex:0 0 130px"><option>offer</option><option>pricing</option><option>goal</option><option>decision</option><option>rule</option><option>finance</option><option>client</option><option>other</option></select>' +
      '<input id="stMemI" placeholder="e.g. Core offer: Backend Rebuild, $X" autocomplete="off"><button class="b st-ok">Save</button></form><div id="stMemL"><div class="st-empty">Loading\u2026</div></div>';
    q("#stMemF", body).onsubmit = async (e) => {
      e.preventDefault();
      const fact = q("#stMemI", body).value.trim();
      if (!fact) return;
      await api("/memory", { method: "POST", body: { fact, category: q("#stMemC", body).value } });
      toast("Saved to team memory");
      renderMemory();
    };
    try {
      const { memory } = await api("/memory");
      const el = q("#stMemL", body);
      el.innerHTML = memory.length ? memory.map((m) => '<div class="st-item"><span class="st-chip">' + esc(m.category) + "</span> " + esc(m.fact) + '<div class="st-btns" style="margin-top:6px;justify-content:space-between;align-items:center"><span class="st-mu">' + (m.department === "owner" ? "you" : esc(BY[m.department]?.short || m.department || "")) + " \xB7 " + ago(m.created_at) + '</span><button class="b st-no" type="button" data-del="' + m.id + '">Remove</button></div></div>').join("") : '<div class="st-empty">Nothing saved yet. Start with your offers, prices and goals so every department head knows them.</div>';
      el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => { await api("/memory/" + b.dataset.del, { method: "DELETE" }); renderMemory(); }));
    } catch (e) { q("#stMemL", body).innerHTML = '<div class="st-empty">' + esc(e.message) + "</div>"; }
  }

  // \u2500\u2500 Follow the hub's lock state \u2500\u2500
  let timer = null, mtimer = null;
  function onLockChange() {
    if (unlocked()) {
      loadSummary();
      loadMission();
      clearInterval(timer);
      timer = setInterval(loadSummary, 60000);
      clearInterval(mtimer);
      mtimer = setInterval(loadMission, 600000);
    } else {
      clearInterval(timer);
      clearInterval(mtimer);
      MISSION = null;
      q("#stMission", card).hidden = true;
      close();
      body.innerHTML = "";
      SUMMARY = null;
      q("#stNavN").textContent = "";
      q("#stTabN").textContent = "";
      q("#stBrief", card).hidden = true;
      card.querySelectorAll("[data-d] b").forEach((b) => (b.hidden = true));
    }
  }
  new MutationObserver(onLockChange).observe(q("#app"), { attributes: true, attributeFilter: ["hidden"] });
  onLockChange();
})();
</script>
`;

