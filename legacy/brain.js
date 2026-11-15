
// ===== v38: Team brain. The AI team learns from Ty, checks each other's work and shares context. =====
var BRAIN_CACHE = { at: 0, rules: null };
var QA_TYPES = new Set(['ghl_reply', 'ghl_followup', 'campaign_enrol', 'ghl_invoice', 'ghl_email', 'send_email', 'ghl_sms', 'stripe_draft_invoice']);
async function brainGet(env, key) { return (await select(env, 'team_settings', 'key=eq.' + key + '&select=value&limit=1').catch(() => []))?.[0]?.value || null; }
async function brainPut(env, key, value) { await upsert(env, 'team_settings', [{ key, value, updated_at: new Date().toISOString() }], 'key'); if (key === 'team_rules') BRAIN_CACHE = { at: 0, rules: null }; }
async function brainRules(env) {
  if (BRAIN_CACHE.rules && Date.now() - BRAIN_CACHE.at < 60000) return BRAIN_CACHE.rules;
  const v = await brainGet(env, 'team_rules').catch(() => null);
  const rules = Array.isArray(v?.rules) ? v.rules.filter((r) => r && r.rule) : [];
  BRAIN_CACHE = { at: Date.now(), rules };
  return rules;
}
function brainRulesText(rules, scope) {
  const list = (rules || []).filter((r) => !scope || !Array.isArray(r.applies_to) || !r.applies_to.length || r.applies_to.includes('all') || r.applies_to.includes(scope));
  return list.length ? '\nTEAM RULES (learned from how Ty edits and rejects drafts; follow them):\n' + list.slice(0, 20).map((r) => '- ' + r.rule).join('\n') + '\n' : '';
}
function brainJson(text) {
  const t = String(text || '');
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { try { return JSON.parse(m[0].replace(/[\u0000-\u001f]+/g, ' ')); } catch { return null; } }
}
async function brainAsk(env, system, user, max = 1500) {
  const d = await callClaude(env, { model: env.BRAIN_MODEL || env.TEAM_MODEL || MODEL, max_tokens: max, system, messages: [{ role: 'user', content: user }] });
  return (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
}

// 1) Learning loop: Ty's edits and rejections become short team rules every agent follows.
async function brainLearn(env, { notify: tell = true } = {}) {
  const fb = await select(env, 'team_memory', 'category=eq.feedback&order=created_at.desc&limit=60&select=fact,created_at').catch(() => []);
  const old = await brainRules(env);
  if (!fb.length) return { ok: true, rules: old, learned: 0, note: 'No feedback yet: approve, edit or reject a few drafts and the team learns from them.' };
  const text = await brainAsk(env,
    'You turn an owner\'s feedback on AI drafts into a short list of clear, durable rules for an AI team (sales replies, follow-ups, outreach emails, invoices, content). Keep rules that still hold, merge duplicates, drop one-offs that only applied to a single message. Each rule: one plain sentence, specific and actionable (e.g. "Never say \'just checking in\'", "Mention the 14-day money-back guarantee when someone hesitates on price"). Max 15 rules. applies_to uses any of: all, inbox, outreach, invoice, content. Reply with JSON only: {"rules":[{"rule":"...","applies_to":["all"],"why":"short reason from the feedback"}],"new":["the rules that are new or changed this time"]}',
    'CURRENT RULES:\n' + (old.length ? old.map((r) => '- ' + r.rule + ' [' + (r.applies_to || ['all']).join(',') + ']').join('\n') : '(none yet)') + '\n\nTY\'S FEEDBACK (newest first):\n' + fb.map((f) => '- ' + String(f.fact).slice(0, 500)).join('\n'), 2500);
  const j = brainJson(text);
  if (!j || !Array.isArray(j.rules)) throw new Error('The learning step didn\'t return rules.');
  const rules = j.rules.filter((r) => r && typeof r.rule === 'string' && r.rule.trim()).slice(0, 15).map((r) => ({ rule: r.rule.trim().slice(0, 300), applies_to: (Array.isArray(r.applies_to) ? r.applies_to : ['all']).filter((x) => ['all', 'inbox', 'outreach', 'invoice', 'content'].includes(x)), why: String(r.why || '').slice(0, 200) }));
  await brainPut(env, 'team_rules', { rules, updated_at: new Date().toISOString(), from_feedback: fb.length });
  const fresh = (Array.isArray(j.new) ? j.new : []).filter(Boolean).slice(0, 6);
  if (tell && fresh.length) await notify(env, '\u{1F9E0} <b>The team learned from your feedback</b>\n' + fresh.map((r) => '• ' + esc2(String(r))).join('\n') + '\n\nEvery agent follows these now. Change them in Command › Studio AI › Team brain.').catch(() => {});
  return { ok: true, rules, learned: fresh.length };
}

// 2) QA agent: checks client-facing drafts before they reach Ty or a client.
function brainDraftText(a) {
  const p = a.params || {};
  const parts = [];
  for (const k of ['subject', 'message', 'body', 'follow_up_1', 'follow_up_2', 'email_body', 'note']) if (p[k]) parts.push(k.toUpperCase() + ': ' + String(p[k]).slice(0, 2000));
  if (Array.isArray(p.items)) parts.push('INVOICE ITEMS: ' + p.items.map((i) => (i.name || i.description) + ' x' + (i.qty || 1) + ' = A$' + (i.amount ?? i.amount_aud)).join('; ') + (p.total != null ? ' (total A$' + p.total + ')' : ''));
  if (Array.isArray(p.lines)) parts.push('INVOICE LINES: ' + p.lines.map((l) => l.description + ' A$' + l.amount_aud).join('; '));
  return parts.join('\n');
}
async function qaCheck(env, a) {
  const draft = brainDraftText(a);
  if (!draft) return null;
  const [rules, cat] = await Promise.all([brainRules(env), brainGet(env, 'offer_catalog').catch(() => ({}))]);
  const scope = a.type === 'campaign_enrol' ? 'outreach' : /invoice/.test(a.type) ? 'invoice' : 'inbox';
  const text = await brainAsk(env,
    'You are the QA reviewer on an AI team at Studio Flow & Systems (Brisbane). Check ONE draft before it goes to a client. Look for: prices or offers that don\'t match the price list; invented facts, results, guarantees or availability; promises we can\'t keep; wrong name or business; anything that breaks the team rules; pushy, robotic or unclear wording; typos; no clear next step (for messages). For invoices: amounts that look wrong, duplicated or missing items. Be practical: small style points are not problems. Reply with JSON only: {"verdict":"ok"|"check"|"stop","notes":"one short sentence for the owner"}. "stop" only for something that would mislead or embarrass (wrong price, invented fact, wrong person). "check" for something worth a glance.' + brainRulesText(rules, scope) + inboxPriceBook(cat || {}),
    'DRAFT TYPE: ' + a.type + '\nTITLE: ' + (a.title || '') + '\nCONTEXT: ' + String(a.reason || '').slice(0, 600) + '\n\n' + draft, 400);
  const j = brainJson(text);
  if (!j || !['ok', 'check', 'stop'].includes(j.verdict)) return null;
  return { verdict: j.verdict, notes: String(j.notes || '').slice(0, 300), at: new Date().toISOString() };
}
function qaLine(qa) { return !qa ? '' : qa.verdict === 'ok' ? 'QA ✓ ' + (qa.notes || 'looks good') : (qa.verdict === 'stop' ? 'QA ⛔ ' : 'QA ⚠ ') + qa.notes; }
async function qaAttach(env, a) {
  if (!QA_TYPES.has(a.type) || (a.params || {}).qa || env.BRAIN_QA === 'off') return a;
  const qa = await qaCheck(env, a).catch(() => null);
  if (!qa) return a;
  const params = { ...a.params || {}, qa };
  const reason = (String(a.reason || '') + ' · ' + qaLine(qa)).slice(0, 1000);
  await update(env, 'team_actions', 'id=eq.' + a.id, { params, reason }).catch(() => {});
  a.params = params; a.reason = reason;
  return a;
}

// 3) Shared brain: what the rest of the team knows about this person.
async function brainContactContext(env, contact) {
  const email = String(contact.email || '').toLowerCase(), phone = String(contact.phone || '').replace(/[^\d+]/g, '');
  const out = [];
  try {
    const book = (await brainGet(env, 'client_book'))?.items || {};
    const cl = Object.values(book).find((c) => c && ((email && String(c.billing_email || '').toLowerCase() === email) || (phone && String(c.billing_phone || '').replace(/[^\d+]/g, '').slice(-9) === phone.slice(-9))));
    if (cl) out.push('EXISTING CLIENT: ' + cl.name + ' (' + (cl.products || []).map((p) => p.title || p.id).join(', ') + '). Questions about their own project, account or billing go to Ty (handoff).');
  } catch {}
  try {
    if (email || phone) {
      const q = email ? 'email=eq.' + encodeURIComponent(email) : 'phone=ilike.*' + encodeURIComponent(phone.slice(-9));
      const [pr] = await select(env, 'agent_prospects', q + '&select=business_name,vertical,status,leak,enrolled_at,call_status&limit=1').catch(() => []);
      if (pr) out.push('SALES ALREADY KNOWS THEM: ' + pr.business_name + ' (' + (pr.vertical || 'business') + '), status ' + pr.status + (pr.enrolled_at ? ', in our email campaign since ' + String(pr.enrolled_at).slice(0, 10) : '') + (pr.leak ? '. What we noticed on their website: ' + String(pr.leak).slice(0, 200) : '') + '. Build on that; don\'t repeat the pitch.');
    }
  } catch {}
  return out.length ? '\nWHAT THE TEAM ALREADY KNOWS:\n' + out.join('\n') + '\n' : '';
}
async function brainInboxExtras(env, contact) {
  const [rules, ctx] = await Promise.all([brainRules(env).catch(() => []), brainContactContext(env, contact || {}).catch(() => '')]);
  return brainRulesText(rules, 'inbox') + ctx +
    '\nAlso add "intent" to your JSON: "hot" (ready to buy or book now, asking price/start date/how to pay), "warm" (interested, asking questions), "cold" (browsing, not a fit) or "client" (an existing client). Example: {"reply":"...","handoff":false,"reason":"","intent":"warm"}';
}
async function brainMarket(env, vertical) {
  const rows = await select(env, 'team_memory', 'category=eq.market&order=created_at.desc&limit=40&select=fact').catch(() => []);
  const name = ((typeof OUTREACH !== 'undefined' && OUTREACH[vertical]) || {}).name || vertical || '';
  const hits = rows.filter((r) => !name || new RegExp(name.split(' ')[0], 'i').test(r.fact)).slice(0, 5);
  return hits.length ? '\nMARKET RESEARCH FOR THIS INDUSTRY (from the Research shift; use only if it fits):\n' + hits.map((r) => '- ' + String(r.fact).slice(0, 300)).join('\n') + '\n' : '';
}

// 4) Scheduled: nightly learning, weekly receptionist safety re-checks.
async function brainTick(env) {
  if (!env.ANTHROPIC_API_KEY) return;
  const now = brisbaneNow();
  const st = (await brainGet(env, 'brain_state').catch(() => null)) || {};
  const today = new Date(Date.now() + 10 * 36e5).toISOString().slice(0, 10);
  const next = { ...st };
  if (now.hour >= 20 && st.learned_on !== today) {
    next.learned_on = today;
    await brainPut(env, 'brain_state', next);
    await brainLearn(env).catch((e) => console.error('brain learn:', e.message));
  }
  if (now.dow === 7 && now.hour >= 19) {
    if (st.safety_week !== today) { next.safety_week = today; next.safety_queue = (await select(env, 'agent_clients', 'status=eq.live&select=id&limit=20').catch(() => [])).map((c) => c.id); next.safety_failed = []; }
    const id = (next.safety_queue || []).shift();
    if (id) {
      try {
        let r = await runSafety(env, id, { from: 0, to: 12 });
        for (let i = 0; i < 5 && r && !r.done && r.next; i++) r = await runSafety(env, id, r.next);
        if (r && r.done && !r.pass) {
          const [c] = await select(env, 'agent_clients', 'id=eq.' + id + '&select=business_name&limit=1').catch(() => []);
          next.safety_failed = [...next.safety_failed || [], id];
          await notify(env, '\u{1F6E1} <b>Weekly safety re-check: ' + esc2(c?.business_name || 'a receptionist') + ' needs a look</b>\n' + r.passed + '/' + r.total + ' passed' + (r.critical_failed?.length ? ', critical: ' + esc2(r.critical_failed.join(', ')) : '') + '.\nOpen Command › Clients to see the answers. It stays live.').catch(() => {});
        }
      } catch (e) { console.error('weekly safety:', e.message); }
      if (!(next.safety_queue || []).length && !(next.safety_failed || []).length) await notify(env, '\u{1F6E1} Weekly safety re-check: every live AI receptionist passed.').catch(() => {});
    }
    await brainPut(env, 'brain_state', next);
  }
}

// 5) Command routes: /api/v1/team/brain
async function brainRoute(env, m, seg, body) {
  if (m === 'GET' && !seg[1]) {
    const [v, st, fb, qa] = await Promise.all([brainGet(env, 'team_rules'), brainGet(env, 'brain_state'), select(env, 'team_memory', 'category=eq.feedback&order=created_at.desc&limit=8&select=fact,created_at').catch(() => []), select(env, 'team_actions', 'order=created_at.desc&limit=200&select=params,status').catch(() => [])]);
    const checked = qa.filter((a) => a.params?.qa);
    return json({ ok: true, rules: v?.rules || [], updated_at: v?.updated_at || null, state: st || {}, recent_feedback: fb, qa: { checked: checked.length, flagged: checked.filter((a) => a.params.qa.verdict !== 'ok').length, stopped: checked.filter((a) => a.params.qa.verdict === 'stop').length } });
  }
  if (m === 'POST' && seg[1] === 'learn') return json(await brainLearn(env, { notify: false }));
  if (m === 'POST' && seg[1] === 'rules') {
    const list = Array.isArray(body.rules) ? body.rules : [];
    const rules = list.filter((r) => r && typeof r.rule === 'string' && r.rule.trim()).slice(0, 20).map((r) => ({ rule: r.rule.trim().slice(0, 300), applies_to: Array.isArray(r.applies_to) && r.applies_to.length ? r.applies_to.filter((x) => ['all', 'inbox', 'outreach', 'invoice', 'content'].includes(x)) : ['all'], why: String(r.why || 'Added by Ty').slice(0, 200) }));
    await brainPut(env, 'team_rules', { rules, updated_at: new Date().toISOString(), edited_by_ty: true });
    return json({ ok: true, rules });
  }
  return json({ ok: false, error: 'Not found.' }, 404);
}
