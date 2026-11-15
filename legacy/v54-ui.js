  // v54 Command Link card (Settings > Brand & features)
  const linkCard = async (host) => {
    let d; try { d = await team('/mac-link'); } catch (e) { return; }
    const box = document.createElement('section'); box.className = 'wf-glass v54-link';
    const seen = d.last_seen ? new Date(d.last_seen).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }) : '';
    box.innerHTML = '<span class="wf-eyebrow">COMMAND LINK</span><h3 style="margin:4px 0 6px">Let Command open pages on your Mac</h3><p class="mu sm">Say “pull up their website” or “open my GHL calendar” in Studio AI (voice, chat or Telegram) and it opens in Chrome on your Mac. It also runs browser tasks in its own Command Chrome window (below). It can’t read your files or see the rest of your screen.</p>' +
      (d.linked ? '<p class="v54-st"><i class="' + (d.online ? 'on' : '') + '"></i>' + (d.online ? 'Linked and online' : 'Linked, Mac offline or asleep') + (seen ? ' · last seen ' + esc(seen) : '') + '</p><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn pri" id="v54t">Test: open Command on my Mac</button><button class="btn" id="v54off">Unlink</button></div>'
        : '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn pri" id="v54go">Set up on this Mac</button></div><div id="v54cmd"></div>');
    const v52 = $('.v52-voice', host); if (v52) v52.after(box); else host.prepend(box);
    const go = $('#v54go', box);
    if (go) go.onclick = async () => { try { const r = await team('/mac-link/setup', { method: 'POST', body: {} }); $('#v54cmd', box).innerHTML = '<ol class="v54-steps"><li>Open <b>Terminal</b> on your Mac (Cmd+Space, type Terminal, Enter).</li><li>Copy this line, paste it into Terminal and press Enter:<pre class="v54-pre">' + esc(r.command) + '</pre><button class="btn sm" id="v54cp">Copy</button></li><li>Come back here and tap Test. (The code works once, for 15 minutes.)</li></ol>'; $('#v54cp', box).onclick = () => { navigator.clipboard.writeText(r.command).then(() => toast('Copied', 'ok')); }; } catch (e) { toast(e.message, 'bad'); } };
    const t = $('#v54t', box); if (t) t.onclick = async () => { try { const r = await team('/mac-link/test', { method: 'POST', body: {} }); toast(r.opened ? 'Sent: Chrome should open in a few seconds' : r.reason, r.opened ? 'ok' : 'bad'); } catch (e) { toast(e.message, 'bad'); } };
    const off = $('#v54off', box); if (off) off.onclick = async () => { try { await team('/mac-link/off', { method: 'POST', body: {} }); toast('Unlinked', 'ok'); box.remove(); linkCard(host); } catch (e) { toast(e.message, 'bad'); } };
  };
  queueMicrotask(() => { const B54 = VIEWS.brand; if (B54) VIEWS.brand = async (el) => { await B54(el); if (still('brand', el)) linkCard(el); }; });
