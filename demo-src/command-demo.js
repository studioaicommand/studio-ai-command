// v146 Command demo: a made-up clinic (Harbour Physio) with realistic sample data.
// Every /api/ call is answered here in the browser from fixtures. Nothing reaches a server, nothing is sent.
(function () {
  var F = window.SF_DEMO_FIX; if (!F) return;
  window.SF_DEMO = true;
  var shift = Date.now() - F.t0;
  var ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  function age(v) {
    if (typeof v === "string" && ISO.test(v)) return new Date(Date.parse(v) + shift).toISOString();
    if (Array.isArray(v)) return v.map(age);
    if (v && typeof v === "object") { var o = {}; for (var k in v) o[k] = age(v[k]); return o; }
    return v;
  }
  var DATA = age(F.data);
  var done = {};
  function hourGreeting() { var h = Number(new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane", hour: "numeric", hour12: false })); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
  function live(path) {
    var d = DATA[path] || DATA[path.split("?")[0]] || DATA[path.split("?")[0] + "?"];
    if (!d) return null;
    d = JSON.parse(JSON.stringify(d));
    if (Array.isArray(d.actions)) d.actions = d.actions.filter(function (a) { return !done[a.id]; });
    if (path.indexOf("/team/ceo-home") >= 0) { d.greeting = hourGreeting() + ", Sam"; var n = Object.keys(done).length; d.waiting.total = Math.max(0, d.waiting.total - n); d.done_today += n; }
    if (path.indexOf("/team/summary") >= 0 && typeof d.pending_approvals === "number") d.pending_approvals = Math.max(0, d.pending_approvals - Object.keys(done).length);
    return d;
  }
  function res(obj, status) { return Promise.resolve(new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json" } })); }
  function toast(t) {
    var box = document.querySelector(".toasts") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "toasts" }));
    var el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); el.textContent = t; box.append(el);
    setTimeout(function () { el.style.transition = "opacity .3s"; el.style.opacity = "0"; setTimeout(function () { el.remove(); }, 320); }, 4200);
  }
  function chatReply(msg) {
    var m = String(msg || "").toLowerCase(), C = F.chat;
    var k = /brief|today|morning/.test(m) ? "brief" : /approv|waiting|ok/.test(m) ? "approval" : /enquir|book|who/.test(m) ? "enquired" : /target|track|revenue|money/.test(m) ? "target" : /win.?back|past (client|patient)|draft/.test(m) ? "winback" : /overnight|team do|did the team/.test(m) ? "overnight" : "fallback";
    return C[k];
  }
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input.url;
    var u; try { u = new URL(url, location.origin); } catch (e) { return realFetch(input, init); }
    if (u.origin !== location.origin || u.pathname.indexOf("/api/") !== 0) return realFetch(input, init);
    var method = ((init && init.method) || "GET").toUpperCase(), path = u.pathname + u.search;
    if (method === "GET") { var d = live(path); return res(d || { ok: true, demo: true }); }
    var body = {}; try { body = JSON.parse((init && init.body) || "{}"); } catch (e) {}
    if (/\/operator\/voice$/.test(u.pathname)) return res({ ok: false, error: "Voice works in the real Command. In this demo, type a question or tap a suggestion." }, 400);
    if (/\/(operator|team)\/chat$/.test(u.pathname)) return new Promise(function (r) { setTimeout(function () { r(new Response(JSON.stringify({ ok: true, reply: chatReply(body.message), tools_used: [] }), { headers: { "Content-Type": "application/json" } })); }, 900); });
    if (/ui-usage|setup-guide/.test(u.pathname)) return res({ ok: true });
    var act = u.pathname.match(/\/actions\/([^/]+)\/(approve|reject|done|complete|decide|dismiss)/);
    if (act) { done[act[1]] = true; toast(act[2] === "reject" ? "Demo: rejected. The AI learns from that for next time." : "Demo: done. In the real Command this goes out now."); return res({ ok: true, demo: true }); }
    toast("Demo: in the real Command this would happen now. Nothing was sent.");
    return res({ ok: true, demo: true });
  };
  try { sessionStorage.setItem("sgSeen", "1"); } catch (e) {}
  function banner() {
    if (document.getElementById("sfDemoBar")) return;
    var b = document.createElement("div"); b.id = "sfDemoBar";
    b.setAttribute("style", "position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9999;padding:9px 16px;border-radius:999px;background:rgba(4,11,24,.88);border:1px solid rgba(90,168,240,.45);color:#cfe6ff;font:600 13px/1.3 Montserrat,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);max-width:calc(100vw - 32px);text-align:center");
    var small = window.innerWidth < 760;
    if (small) { b.style.bottom = "calc(88px + env(safe-area-inset-bottom))"; b.style.fontSize = "12px"; b.style.padding = "7px 12px"; }
    b.textContent = small ? "Demo clinic with sample data. Nothing is sent." : "Live demo: Harbour Physio is a made-up clinic with sample data. Nothing you click is sent.";
    document.body.appendChild(b);
  }
  var LOGO = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="100" viewBox="0 0 640 100"><rect x="4" y="14" width="72" height="72" rx="18" fill="#1fb5a8"/><text x="40" y="62" font-family="Montserrat,Arial,sans-serif" font-size="30" font-weight="800" fill="#04131a" text-anchor="middle">HP</text><text x="100" y="64" font-family="Montserrat,Arial,sans-serif" font-size="44" font-weight="800" fill="#ffffff">Harbour Physio</text></svg>');
  var MARK = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect x="4" y="4" width="92" height="92" rx="24" fill="#1fb5a8"/><text x="50" y="63" font-family="Montserrat,Arial,sans-serif" font-size="36" font-weight="800" fill="#04131a" text-anchor="middle">HP</text></svg>');
  function logos() {
    document.querySelectorAll('img[src*="/app/logo.webp"]').forEach(function (im) { im.src = LOGO; im.style.display = ""; });
    document.querySelectorAll('img[src*="/app/mark.webp"]').forEach(function (im) { im.src = MARK; im.style.display = ""; });
  }
  function enter() {
    var k = document.getElementById("gKey"), f = document.getElementById("gForm");
    if (!k || !f) return;
    var gate = document.getElementById("gate");
    if (gate && gate.hidden) return;
    k.value = "demo"; if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event("submit", { cancelable: true }));
  }
  function start() {
    banner(); logos(); setTimeout(enter, 60);
    document.body.style.paddingBottom = "56px";
    new MutationObserver(function () { if (document.querySelector('img[src*="/app/logo.webp"],img[src*="/app/mark.webp"]')) logos(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    var gate = document.getElementById("gate");
    if (gate) new MutationObserver(function () { if (!gate.hidden) setTimeout(enter, 60); }).observe(gate, { attributes: true, attributeFilter: ["hidden"] });
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", function () { setTimeout(start, 0); }) : setTimeout(start, 0);
})();
