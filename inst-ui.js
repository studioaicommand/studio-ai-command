  // White-label (v43): this copy's brand and switched-on features. Studio Flow's own Command has no profile and is unchanged.
  let INST = null, INST_HOME = 'today';
  const INST_OFF = new Set();
  const INST_VIEWS = { outreach: ['today', 'growth', 'demos', 'business'], receptionist_product: ['clients'], offers_page: ['offers'] };
  function instWalk(root) {
    if (!INST || !INST.custom || !root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const re = /Studio AI Command|Studio AI|Studio Flow (&|and) Systems|Studio Flow|\bTy\b/;
    let n;
    while ((n = w.nextNode())) {
      const t = n.nodeValue;
      if (!t || !re.test(t) || (n.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName))) continue;
      n.nodeValue = t.replace(/Studio AI Command/g, INST.product_name).replace(/Studio AI/g, INST.product_name).replace(/Studio Flow (&|and) Systems/g, INST.business_name).replace(/Studio Flow/g, INST.business_name).replace(/\bTy\b/g, INST.owner_first);
    }
    document.querySelectorAll('img[alt*="Studio Flow"]').forEach((im) => { im.alt = INST.business_name; });
  }
  let instQueued = false;
  const instSoon = () => { if (instQueued) return; instQueued = true; requestAnimationFrame(() => { instQueued = false; instWalk(document.body); if (/Studio/.test(document.title)) document.title = document.title.replace(/Studio AI/g, INST.product_name); }); };
  function instApply(b) {
    if (!b || !b.ok) return;
    INST = b;
    for (const [mod, views] of Object.entries(INST_VIEWS)) if (b.modules && b.modules[mod] === false) views.forEach((v) => INST_OFF.add(v));
    if (INST_OFF.has('today')) INST_HOME = 'home';
    HUBS.forEach((h) => { const keep = h[3].filter((s) => !INST_OFF.has(s[0])); if (keep.length) h[3] = keep; });
    Object.keys(b.modules || {}).forEach((k) => { document.documentElement.dataset['mod' + k.replace(/(^|_)([a-z])/g, (m, a, c) => c.toUpperCase())] = b.modules[k] ? 'on' : 'off'; });
    if (!b.custom) return;
    const r = document.documentElement.style;
    if (b.colours && b.colours.primary) { r.setProperty('--c', b.colours.primary); r.setProperty('--c3', b.colours.primary); }
    if (b.colours && b.colours.accent) r.setProperty('--c2', b.colours.accent);
    const h1 = document.querySelector('.gate-card h1'); if (h1 && b.login_headline) h1.textContent = b.login_headline;
    const k = document.querySelector('.gate-card .k'); if (k) k.textContent = (b.business_name + ' · private command centre').toUpperCase();
    document.querySelectorAll('img[src*="/app/logo.webp"],img[src*="/app/mark.webp"]').forEach((im) => { im.src = im.src.replace(/\?.*$/, '') + '?b=' + b.assets_v; im.onerror = () => { im.style.display = 'none'; }; });
    document.title = b.product_name;
    instWalk(document.body);
    new MutationObserver(instSoon).observe(document.body, { childList: true, subtree: true, characterData: true });
    if (!INST_OFF.has(parse().view) && KEY) render();
  }
  fetch('/api/v1/instance/brand').then((r) => r.json()).then(instApply).catch(() => {});
  VIEWS.brand = async (el) => {
    el.innerHTML = '<section class="wf-glass">' + sk(260) + '</section>';
    const d = await team('/instance');
    if (!still('brand', el)) return;
    const p = d.profile || {}, c = d.computed, studio = !c.custom;
    const f = (id, label, val, ph) => '<label class="lab">' + esc(label) + '<input class="in" id="ib-' + id + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"></label>';
    el.innerHTML = '<section class="wf-glass wf-intro"><div><span class="wf-eyebrow">WHITE-LABEL</span><h2>' + (studio ? 'This is Studio Flow’s own Command.' : esc(c.business_name) + '’s Command') + '</h2><p class="mu">' + (studio ? 'Use this page on a client’s copy to give it their name, logo, colours, industry and features. Leave it as is on your own Command.' : 'Everything here is this client’s own: their brand on every screen and in every AI reply, and only the features they bought.') + '</p></div></section>' +
      '<section class="wf-glass"><h3>Business</h3><div class="ib-grid">' + f('business_name', 'Business name', p.business_name, 'e.g. Sunny Paws Vet Clinic') + f('product_name', 'What they call their AI', p.product_name, 'e.g. Sunny Paws Command') + f('owner_name', 'Owner’s full name', p.owner_name) + f('owner_first', 'Owner’s first name', p.owner_first) + f('location', 'Location', p.location, 'e.g. Maroochydore QLD') + f('website', 'Website', p.website, 'https://…') + f('booking_link', 'Booking link', p.booking_link) + f('login_headline', 'Login screen headline', p.login_headline, 'Your business, run by AI.') +
      '<label class="lab">Industry template<select class="in" id="ib-template">' + Object.entries(d.templates).map(([k, v]) => '<option value="' + k + '"' + (k === (p.template || 'other') ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select></label>' + f('industry', 'Industry in their words', p.industry, 'e.g. veterinary clinic') +
      '<label class="lab">Main colour<input class="in" type="color" id="ib-primary" value="' + esc((p.colours && p.colours.primary) || '#38bdf8') + '"></label><label class="lab">Accent colour<input class="in" type="color" id="ib-accent" value="' + esc((p.colours && p.colours.accent) || '#7dd3fc') + '"></label><label class="lab">Monthly revenue goal (AUD)<input class="in" id="ib-target" inputmode="numeric" placeholder="e.g. 60000"></label></div></section>' +
      '<section class="wf-glass"><h3>Logo and app icon</h3><p class="mu sm">PNG, WebP or JPEG under 400 KB. The icon is what shows on their phone’s home screen (square, at least 512×512).</p><div class="ib-grid">' + ['logo', 'mark', 'icon'].map((k) => '<label class="lab">' + ({ logo: 'Wide logo', mark: 'Small square mark', icon: 'App icon' })[k] + (d.assets[k] ? ' <span class="chip">uploaded · ' + d.assets[k].kb + ' KB</span>' : '') + '<input class="in" type="file" accept="image/png,image/webp,image/jpeg" data-asset="' + k + '"></label>').join('') + '</div></section>' +
      '<section class="wf-glass"><h3>Features switched on</h3>' + Object.entries(d.modules).map(([k, m]) => '<label class="ib-mod"><input type="checkbox" data-mod="' + k + '"' + (c.modules[k] ? ' checked' : '') + '><span><b>' + esc(m.label) + '</b><small class="mu">' + esc(m.desc) + '</small></span></label>').join('') + '<p class="mu xs">Always on: Inbox and approvals, ' + esc(c.product_name) + ' (chat and voice), the AI team, reports, goals, money, records, security and people.</p></section>' +
      '<section class="wf-glass"><h3>Set it up</h3><label class="ib-mod"><input type="checkbox" id="ib-apply"' + (studio ? '' : ' checked') + '><span><b>Apply the industry template</b><small class="mu">Writes their team charter, switches on the right daily shifts and saves the basics to team memory.</small></span></label><label class="ib-mod"><input type="checkbox" id="ib-learn"' + (d.knows_business ? '' : ' checked') + '><span><b>Learn the business from its website</b><small class="mu">' + (d.knows_business ? 'Already knows ' + d.knows.services + ' services and ' + d.knows.faqs + ' FAQs. Tick to refresh.' : 'Reads their site so inbox replies use their real services, hours and FAQs (about a minute).') + '</small></span></label>' +
      '<div class="acts" style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn pri" id="ib-save">Save' + (studio ? ' as a client copy' : '') + '</button>' + (studio ? '' : '<button class="btn bad" id="ib-studio">Turn back into Studio Flow’s own Command</button>') + '</div><p class="mu sm" id="ib-msg"></p></section>';
    const msg = $('#ib-msg', el);
    $$('[data-asset]', el).forEach((inp) => inp.onchange = () => { const file = inp.files[0]; if (!file) return; if (file.size > 400 * 1024) return toast('Keep it under 400 KB', 'bad'); const rd = new FileReader(); rd.onload = async () => { try { await team('/instance/asset', { method: 'POST', body: { kind: inp.dataset.asset, type: file.type, b64: String(rd.result) } }); toast('Uploaded', 'ok'); } catch (e) { toast(e.message, 'bad'); } }; rd.readAsDataURL(file); });
    $('#ib-save', el).onclick = async () => {
      const body = { modules: {}, colours: { primary: $('#ib-primary', el).value, accent: $('#ib-accent', el).value }, template: $('#ib-template', el).value, apply_template: $('#ib-apply', el).checked, learn_website: $('#ib-learn', el).checked, mission_target: +String($('#ib-target', el).value).replace(/[^0-9]/g, '') || 0, is_studio: false };
      ['business_name', 'product_name', 'owner_name', 'owner_first', 'location', 'website', 'booking_link', 'login_headline', 'industry'].forEach((k) => { body[k] = $('#ib-' + k, el).value; });
      $$('[data-mod]', el).forEach((x) => { body.modules[x.dataset.mod] = x.checked; });
      if (studio && !(await modal({ title: 'Turn this into a client’s copy?', text: 'Every screen and AI reply will use ' + (body.business_name || 'their') + ' brand, and switched-off features will disappear. Only do this on a client’s copy, not your own Command.', ok: 'Yes, it’s a client copy', danger: true }))) return;
      const b = $('#ib-save', el); b.disabled = true; msg.textContent = body.learn_website ? 'Saving and reading their website… (about a minute)' : 'Saving…';
      try { const r = await team('/instance', { method: 'POST', body, long: true }); msg.textContent = 'Saved.' + (r.applied ? ' Template applied: ' + r.applied.label + '.' : '') + (r.learned ? ' Learned ' + r.learned.services + ' services and ' + r.learned.faqs + ' FAQs from their website.' : '') + (r.learn_error ? ' Couldn’t read the website: ' + r.learn_error : '') + ' Reloading…'; setTimeout(() => location.reload(), 1600); }
      catch (e) { b.disabled = false; msg.textContent = 'Not saved: ' + e.message; }
    };
    const back = $('#ib-studio', el);
    if (back) back.onclick = async () => { if (!(await modal({ title: 'Turn back into Studio Flow’s own Command?', text: 'The Studio brand and every feature come back.', ok: 'Turn back', danger: true }))) return; try { await team('/instance', { method: 'POST', body: { is_studio: true } }); location.reload(); } catch (e) { toast(e.message, 'bad'); } };
  };

