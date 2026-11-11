  // v52 Voice & personality (Settings › Brand & features) and the Away banner on Today
  const voiceCard = async (host) => {
    let d; try { d = await team('/voice-style'); } catch (e) { return; }
    const c = d.cfg, box = document.createElement('section'); box.className = 'wf-glass v52-voice';
    const opt = (sel) => d.voices.map((v) => '<option value="' + esc(v.id) + '"' + (v.id === sel ? ' selected' : '') + '>' + esc(v.name + ' — ' + v.note) + '</option>').join('');
    const awayUntil = c.away && c.away.until && Date.parse(c.away.until) > Date.now() ? c.away.until : null;
    box.innerHTML = '<span class="wf-eyebrow">VOICE &amp; PERSONALITY</span><h3 style="margin:4px 0 6px">How your Command sounds</h3><p class="mu sm">Choose the voice and personality for Studio AI (voice, chat and Telegram), and the default voice for your AI receptionists. The Jarvis style is a calm, witty, British-voiced right hand.' + (d.has_openai ? '' : ' Voices need the OPENAI_API_KEY secret in Cloudflare.') + '</p>' +
      '<div class="v52-personas">' + Object.entries(d.personas).map(([k, p]) => '<label class="v52-p' + (k === c.persona ? ' on' : '') + '"><input type="radio" name="v52p" value="' + esc(k) + '"' + (k === c.persona ? ' checked' : '') + '><b>' + esc(p.name) + '</b><small>' + esc(p.desc) + '</small></label>').join('') + '</div>' +
      '<div class="row" style="gap:12px;flex-wrap:wrap;margin-top:12px"><label class="lab" style="flex:1 1 260px">Command voice<select class="in" id="v52cv">' + opt(c.command_voice) + '</select></label><label class="lab" style="flex:1 1 260px">AI receptionist voice (default)<select class="in" id="v52rv">' + opt(c.receptionist_voice) + '</select></label></div>' +
      '<label class="or-switch" style="margin-top:12px"><input type="checkbox" id="v52bn"' + (c.briefing_voice_note ? ' checked' : '') + '> <b>Send the morning briefing as a voice note on Telegram</b></label>' +
      '<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn pri" id="v52save">Save</button><button class="btn" id="v52test">Send me a voice test on Telegram</button></div>' +
      '<hr class="v52-hr"><span class="wf-eyebrow">AWAY MODE</span><h3 style="margin:4px 0 6px">' + (awayUntil ? 'You’re away until ' + esc(new Date(awayUntil).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })) : 'Going off-grid?') + '</h3><p class="mu sm">While you’re away, Command keeps working, holds every non-urgent message, keeps anything client-facing or money-related waiting for your yes, and only interrupts you for something genuinely urgent. When you’re back you get a welcome-back report (as a voice note if voice notes are on).</p>' +
      (awayUntil ? '<button class="btn" id="v52back">I’m back now</button>' : '<div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="lab" style="flex:0 1 220px">Back on<input class="in" type="datetime-local" id="v52until"></label><label class="lab" style="flex:1 1 220px">Note (optional)<input class="in" id="v52note" placeholder="e.g. camping, no signal"></label><button class="btn pri" id="v52go">Go away</button></div>');
    host.prepend(box);
    const val = () => ({ persona: ($('input[name=v52p]:checked', box) || {}).value, command_voice: $('#v52cv', box).value, receptionist_voice: $('#v52rv', box).value, briefing_voice_note: $('#v52bn', box).checked });
    $$('.v52-p', box).forEach((l) => l.onclick = () => { $$('.v52-p', box).forEach((x) => x.classList.remove('on')); l.classList.add('on'); const pv = ($('input', l) || {}).value; if (pv === 'jarvis') { $('#v52cv', box).value = 'cedar'; toast('Jarvis voice selected: tap Save', 'ok'); } });
    $('#v52save', box).onclick = async () => { try { await team('/voice-style', { method: 'POST', body: val() }); toast('Saved', 'ok'); } catch (e) { toast(e.message, 'bad'); } };
    $('#v52test', box).onclick = async (e) => { const b = e.currentTarget; b.disabled = true; try { await team('/voice-style', { method: 'POST', body: val() }); const r = await team('/voice-style/test', { method: 'POST', body: {}, long: true }); toast(r.sent ? 'Sent: check Telegram' : 'Telegram isn’t linked yet', r.sent ? 'ok' : 'bad'); } catch (x) { toast(x.message, 'bad'); } b.disabled = false; };
    const go = $('#v52go', box); if (go) go.onclick = async () => { const v = $('#v52until', box).value; if (!v) return toast('Pick when you’re back', 'bad'); try { await team('/away', { method: 'POST', body: { until: new Date(v).toISOString(), note: $('#v52note', box).value } }); toast('Away mode on', 'ok'); box.remove(); voiceCard(host); } catch (e) { toast(e.message, 'bad'); } };
    const bk = $('#v52back', box); if (bk) bk.onclick = async () => { try { await team('/away', { method: 'POST', body: { off: true } }); toast('Welcome back', 'ok'); box.remove(); voiceCard(host); } catch (e) { toast(e.message, 'bad'); } };
  };
  queueMicrotask(() => {
    const B52 = VIEWS.brand;
    if (B52) VIEWS.brand = async (el) => { await B52(el); if (still('brand', el)) voiceCard(el); };
    const T52 = VIEWS.today;
    VIEWS.today = async (el) => {
      await T52(el);
      if (el.dataset.embed || !still('today', el)) return;
      try { const d = await team('/voice-style'); if (d.away && d.cfg.away) { const b = document.createElement('div'); b.className = 'v52-away'; b.innerHTML = '\u{1F3DD} <b>Away mode is on</b> until ' + esc(new Date(d.cfg.away.until).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })) + '. Command is holding non-urgent messages for you. <a href="#/brand">Change</a>'; el.prepend(b); } } catch (e) {}
    };
  });
