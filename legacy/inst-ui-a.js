  // White-label (v43): this copy's brand and switched-on features. Studio Flow's own Command has no profile and is unchanged.
  let INST = null, INST_HOME = 'today';
  const INST_OFF = new Set();
  const INST_VIEWS = { outreach: ['today', 'growth', 'demos', 'business'], receptionist_product: ['clients'], offers_page: ['offers'] };
  function instWalk(root) {
    if (!INST || !INST.custom || !root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const re = /Studio|\bTy\b/;
    let n;
    while ((n = w.nextNode())) {
      const t = n.nodeValue;
      if (!t || !re.test(t) || (n.parentNode && (/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) || (n.parentNode.closest && n.parentNode.closest('[data-nobrand]'))))) continue;
      n.nodeValue = t.replace(/Studio AI Command/g, INST.product_name).replace(/Studio AI/g, INST.product_name).replace(/Studio Flow (&|and) Systems/g, INST.business_name).replace(/Studio Flow/g, INST.business_name).replace(/Studio access key/g, 'Access key').replace(/Studio key/g, 'access key').replace(/\bStudio\b/g, INST.product_name).replace(/\bTy\b/g, INST.owner_first);
    }
    document.querySelectorAll('img[alt*="Studio Flow"]').forEach((im) => { im.alt = INST.business_name; });
    document.querySelectorAll('input[placeholder*="Studio"]').forEach((i2) => { i2.placeholder = i2.placeholder.replace(/Studio key/g, 'access key').replace(/Studio/g, INST.product_name); });
  }
  let instQueued = false;
  const instSoon = () => { if (instQueued) return; instQueued = true; requestAnimationFrame(() => { instQueued = false; instWalk(document.body); if (/Studio/.test(document.title)) document.title = document.title.replace(/Studio AI/g, INST.product_name); }); };
  function instApply(b) {
    if (!b || !b.ok) return;
    INST = b;
    for (const [mod, views] of Object.entries(INST_VIEWS)) if (b.modules && b.modules[mod] === false) views.forEach((v) => INST_OFF.add(v));
    if (b.custom) INST_OFF.add('fleet');
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
