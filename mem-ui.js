  // Personal logins (v41): passkeys (Face ID / fingerprint), invites, roles, sealed security log.
  let ME = null;
  const pkB64 = (buf) => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, ''); };
  const pkBin = (s) => { s = String(s || '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
  const pkOk = () => !!(window.PublicKeyCredential && navigator.credentials);
  const pkPost = async (path, body) => { const r = await fetch('/api/v1/members/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); const d = await r.json().catch(() => ({ ok: false, error: 'Unexpected response.' })); if (!r.ok || d.ok === false) throw new Error(d.error || 'Request failed.'); return d; };
  const pkDevice = () => { const ua = navigator.userAgent; return /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android phone' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows PC' : 'this device'; };
  const pkCreatePayload = (cred) => ({ id: cred.id, rawId: pkB64(cred.rawId), type: cred.type, device: pkDevice(), response: { clientDataJSON: pkB64(cred.response.clientDataJSON), attestationObject: pkB64(cred.response.attestationObject) } });
  async function pkCreate(pub) {
    const o = Object.assign({}, pub, { challenge: pkBin(pub.challenge), user: Object.assign({}, pub.user, { id: pkBin(pub.user.id) }), excludeCredentials: (pub.excludeCredentials || []).map((c) => ({ type: 'public-key', id: pkBin(c.id) })) });
    const cred = await navigator.credentials.create({ publicKey: o });
    if (!cred) throw new Error('Passkey set-up was cancelled.');
    return pkCreatePayload(cred);
  }
  async function pkSignIn() {
    const btn = $('#gPass'); if (btn) btn.disabled = true;
    $('#gMsg').textContent = 'Waiting for Face ID or your passkey…'; $('#gMsg').className = 'msg';
    try {
      const o = await pkPost('login/options');
      const cred = await navigator.credentials.get({ publicKey: { challenge: pkBin(o.challenge), rpId: o.rpId, userVerification: 'required', timeout: o.timeout || 60000 } });
      if (!cred) throw new Error('Sign-in was cancelled.');
      const r = await pkPost('login/verify', { credential: { id: cred.id, rawId: pkB64(cred.rawId), type: cred.type, response: { clientDataJSON: pkB64(cred.response.clientDataJSON), authenticatorData: pkB64(cred.response.authenticatorData), signature: pkB64(cred.response.signature), userHandle: cred.response.userHandle ? pkB64(cred.response.userHandle) : null } } });
      ME = r.user; KEY = r.token; document.documentElement.dataset.role = r.user.role;
      setOrb('thinking');
      await finishUnlock();
      toast('Welcome back, ' + r.user.name, 'ok');
    } catch (e) {
      KEY = '';
      setOrb('idle');
      gate(/NotAllowed|cancel|timed out/i.test(String(e.name) + ' ' + e.message) ? 'Passkey sign-in was cancelled. Try again or use your Studio key.' : e.message, true);
    } finally { if (btn) btn.disabled = false; }
  }
  async function pkInvite(tok) {
    let info;
    try { info = await (await fetch('/api/v1/members/invite/' + encodeURIComponent(tok))).json(); } catch { info = null; }
    const card = $('.gate-card'); if (!card) return;
    const h1 = $('h1', card), form = $('#gForm'), msg = $('#gMsg');
    if (!info || !info.ok) { if (msg) { msg.textContent = (info && info.error) || 'This invite link has expired. Ask for a new one.'; msg.className = 'msg bad'; } return; }
    if (h1) h1.textContent = 'Welcome, ' + info.name + '.';
    if (form) form.hidden = true;
    const box = document.createElement('div');
    box.innerHTML = '<p class="sm" style="margin:6px 0 14px">You’ve been invited to Studio Flow Command as <b>' + esc(info.role_label) + '</b>. Set up Face ID, fingerprint or your device PIN to sign in. No password needed, and nobody else can use it.</p><button class="btn pri lg block" id="gJoin" type="button">Set up my passkey</button><p class="msg" id="gJoinMsg" role="status"></p>';
    card.append(box);
    $('#gJoin').onclick = async () => {
      const b = $('#gJoin'), m = $('#gJoinMsg'); b.disabled = true; m.textContent = 'Follow the prompt on your device…'; m.className = 'msg';
      try {
        if (!pkOk()) throw new Error('This browser can’t use passkeys. Open the link in Safari or Chrome.');
        const o = await pkPost('invite/' + encodeURIComponent(tok) + '/options');
        const r = await pkPost('invite/' + encodeURIComponent(tok) + '/verify', { credential: await pkCreate(o.publicKey) });
        history.replaceState(null, '', location.pathname);
        ME = r.user; KEY = r.token; document.documentElement.dataset.role = r.user.role; box.remove(); if (form) form.hidden = false;
        await finishUnlock();
        toast('You’re in. Next time just tap Sign in with Face ID.', 'ok');
      } catch (e) { b.disabled = false; m.textContent = /NotAllowed/.test(e.name) ? 'Set-up was cancelled. Tap the button to try again.' : e.message; m.className = 'msg bad'; }
    };
  }
  function pkGateSetup() {
    const form = $('#gForm');
    if (!form || $('#gPass')) return;
    if (pkOk()) {
      const b = document.createElement('button');
      b.type = 'button'; b.id = 'gPass'; b.className = 'btn lg block'; b.style.marginTop = '10px';
      b.textContent = 'Sign in with Face ID, Touch ID or passkey';
      b.onclick = pkSignIn;
      const msg = $('#gMsg'); msg ? form.insertBefore(b, msg) : form.append(b);
    }
    const sp = location.hash.match(/^#support=(m1\.[a-f0-9]{16}\.\d+\.\d+\.[0-9a-f]{40})$/);
    if (sp) { history.replaceState(null, '', location.pathname); KEY = sp[1]; ME = { name: 'support team', role: 'support' }; document.documentElement.dataset.role = 'support'; const until = new Date(+sp[1].split('.')[2]); const bar = document.createElement('div'); bar.className = 'sup-bar'; bar.setAttribute('data-nobrand', ''); document.body.classList.add('has-sup'); bar.textContent = 'Studio Flow support \u00B7 ends ' + until.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' \u00B7 logged for the owner'; document.body.append(bar); finishUnlock().catch((e) => { KEY = ''; bar.remove(); gate(e.message, true); }); return; }
    const m = location.hash.match(/^#invite=([A-Za-z0-9_-]{20,})$/);
    if (m) pkInvite(m[1]);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', pkGateSetup) : setTimeout(pkGateSetup, 0);
  function pkPeopleHtml(d) {
    const roleSel = (u) => '<select class="in sm pk-role" data-id="' + esc(u.id) + '">' + Object.keys(d.roles).map((r) => '<option value="' + r + '"' + (r === u.role ? ' selected' : '') + '>' + esc(d.roles[r]) + '</option>').join('') + '</select>';
    const when = (v) => v ? new Date(v).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'never';
    return '<section class="p" id="pkPeople"><div class="ph"><div><h2>People and passkeys</h2><p class="mu sm">Everyone signs in as themselves with Face ID, fingerprint or a device PIN. No shared key, and the security log shows who did what. Your Studio key + code still works as your backup.</p></div></div>' +
      (pkOk() ? '<div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:14px"><button class="btn pri" id="pkMe">Add Face ID / Touch ID on this device (for me)</button></div>' : '<p class="mu sm">This browser can’t create passkeys. Use Safari on your iPhone or Chrome.</p>') +
      (d.users.length ? d.users.map((u) => '<div class="pk-user" data-id="' + esc(u.id) + '"><div><b>' + esc(u.name) + '</b>' + (u.disabled ? ' <span class="chip">Access removed</span>' : '') + '<div class="mu xs">' + esc(u.passkeys.length) + ' passkey' + (u.passkeys.length === 1 ? '' : 's') + (u.passkeys.length ? ': ' + u.passkeys.map((k) => esc(k.device || 'device')).join(', ') : '') + ' · last sign-in ' + esc(when(u.last_login)) + '</div></div><div class="row" style="gap:6px;flex-wrap:wrap">' + roleSel(u) + '<button class="btn sm ghost pk-out">Sign out</button><button class="btn sm ' + (u.disabled ? '' : 'bad') + ' pk-dis">' + (u.disabled ? 'Restore access' : 'Remove access') + '</button></div></div>').join('') : '<p class="mu sm">Nobody has a passkey yet. Start with yourself.</p>') +
      '<h3 style="margin:18px 0 6px">Invite someone</h3><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="lab" style="flex:1 1 180px">Name<input class="in" id="pkName" placeholder="e.g. Sarah"></label><label class="lab">Role<select class="in" id="pkRole"><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select></label><button class="btn pri" id="pkInvite">Create invite link</button></div><div id="pkLink"></div>' +
      (d.invites.length ? '<p class="mu xs" style="margin-top:8px">Open invites: ' + d.invites.map((i) => esc(i.name) + ' (' + esc(d.roles[i.role]) + ')').join(', ') + '</p>' : '') +
      '<table class="pk-roles"><tr><td><b>Owner</b></td><td>Everything, including people, security, money and settings</td></tr><tr><td><b>Manager</b></td><td>Runs the day: inbox, approvals, clients, growth, demos. No money, offers, people or security settings</td></tr><tr><td><b>Staff</b></td><td>Sees the work and builds demos, scans and notes. Can’t approve sending, see money or change settings</td></tr></table></section>';
  }
  function pkLogHtml(l, s) {
    const when = (v) => new Date(v).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    return '<section class="p"><div class="ph"><div><h2>Security log</h2><p class="mu sm">Every sign-in, invite, access change and team action is written here and sealed with a key only Command holds. Each entry is linked to the one before, so a change or a deleted entry shows up straight away.</p></div></div>' +
      '<div class="pk-seal ' + (l.intact ? 'good' : 'bad') + '">' + (l.intact ? '✓ Log intact: ' + esc(l.checked) + ' entries checked, nothing altered or missing.' : '⚠ ' + esc(l.problem || 'The log failed its check.')) + '</div>' +
      (l.recent.length ? '<div class="pk-log">' + l.recent.map((e) => '<div><span class="mu xs">#' + esc(e.n) + ' · ' + esc(when(e.at)) + '</span><span>' + esc(e.summary || e.what) + '</span></div>').join('') + '</div>' : '<p class="mu sm">No entries yet.</p>') + '</section>' +
      '<section class="p"><div class="ph"><div><h2>Secrets check</h2><p class="mu sm">Looks through everything Command stores for API keys or tokens that shouldn’t be there.</p></div></div><div class="pk-seal ' + (s.stored_in_database.length ? 'bad' : 'good') + '">' + (s.stored_in_database.length ? '⚠ ' + esc(s.stored_in_database.length) + ' found: ' + s.stored_in_database.map((x) => esc(x.what + ' in ' + x.where)).join(', ') : '✓ ' + esc(s.note)) + '</div><p class="mu xs" style="margin-top:8px">' + esc(s.checked) + ' stored settings checked. In Cloudflare secrets: ' + esc(s.cloudflare_secrets.join(', ') || 'none') + '. Anything we ever store for clients (like their CRM token) is sealed with AES-256 first' + (s.own_seal_key ? ' using your own SEAL_KEY.' : '. Add a SEAL_KEY secret in Cloudflare to give the vault its own key.') + '</p></section>';
  }
  async function pkSecurityExtras(el) {
    const host = document.createElement('div'); host.style.cssText = 'display:grid;gap:18px;margin-top:18px'; el.append(host);
    let st = null;
    try { st = await req('/api/v1/auth/status'); } catch {}
    if (st && st.member) { const chip = document.createElement('p'); chip.className = 'sm'; chip.style.margin = '0 0 12px'; chip.innerHTML = 'Signed in as <b>' + esc(st.member.name) + '</b> (' + esc(st.member.role_label) + ') with a passkey.'; el.prepend(chip); }
    let d;
    try { d = await req('/api/v1/members/admin'); } catch (e) { host.innerHTML = '<section class="p"><p class="mu sm">' + esc(/owner/i.test(e.message) ? 'Only the owner can manage people and see the security log.' : e.message) + '</p></section>'; return; }
    if (!still('security', el)) return;
    const [l, s] = await Promise.all([req('/api/v1/members/admin/log').catch(() => ({ intact: false, checked: 0, problem: 'Couldn’t read the log.', recent: [] })), req('/api/v1/members/admin/secrets').catch(() => ({ stored_in_database: [], checked: 0, cloudflare_secrets: [], note: 'Couldn’t run the check.' }))]);
    if (!still('security', el)) return;
    host.innerHTML = pkPeopleHtml(d) + pkLogHtml(l, s);
    pkSupportExtras(host);
    const again = () => { host.remove(); pkSecurityExtras(el); };
    const me = $('#pkMe', host);
    if (me) me.onclick = async () => { me.disabled = true; try { const o = await req('/api/v1/members/admin/me/options', { method: 'POST', body: {} }); const c = await pkCreate(o.publicKey); await req('/api/v1/members/admin/me/verify', { method: 'POST', body: { credential: c } }); toast('Face ID added. Next time tap Sign in with Face ID.', 'ok'); again(); } catch (e) { me.disabled = false; toast(/NotAllowed/.test(e.name) ? 'Set-up was cancelled.' : e.message, 'bad'); } };
    $('#pkInvite', host).onclick = async () => { const name = $('#pkName', host).value.trim(); if (!name) return toast('Add their name', 'bad'); try { const r = await req('/api/v1/members/admin/invite', { method: 'POST', body: { name, role: $('#pkRole', host).value } }); $('#pkLink', host).innerHTML = '<div class="pk-seal good" style="margin-top:10px">Send this link to ' + esc(name) + ' privately. It works once, for 48 hours:<br><code style="word-break:break-all">' + esc(r.link) + '</code><br><button class="btn sm" id="pkCopy" style="margin-top:8px">Copy link</button></div>'; $('#pkCopy', host).onclick = async () => { try { await navigator.clipboard.writeText(r.link); toast('Invite link copied', 'ok'); } catch { toast(r.link); } }; } catch (e) { toast(e.message, 'bad'); } };
    $$('.pk-user', host).forEach((row) => {
      const id = row.dataset.id, set = async (body, msg) => { try { await req('/api/v1/members/admin/user/' + id, { method: 'POST', body }); toast(msg, 'ok'); again(); } catch (e) { toast(e.message, 'bad'); again(); } };
      $('.pk-role', row).onchange = (e) => set({ role: e.target.value }, 'Role changed. They’ll sign in again.');
      $('.pk-out', row).onclick = () => set({ signout: true }, 'Signed out on every device');
      const dis = $('.pk-dis', row); dis.onclick = async () => { const off = /Remove/.test(dis.textContent); if (off && !(await modal({ title: 'Remove access?', text: 'They’ll be signed out straight away and their passkeys stop working.', ok: 'Remove access', danger: true }))) return; set({ disabled: off }, off ? 'Access removed' : 'Access restored'); };
    });
  }
  { const pkSecBase = VIEWS.security; VIEWS.security = async (el) => { await pkSecBase(el); if (still('security', el)) await pkSecurityExtras(el); }; }

