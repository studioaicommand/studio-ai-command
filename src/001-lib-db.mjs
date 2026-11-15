// src/lib/db.js
var db_exports = {};
__export(db_exports, {
  enc: () => enc,
  hoursAgo: () => hoursAgo,
  insert: () => insert,
  insertIgnore: () => insertIgnore,
  now: () => now,
  remove: () => remove,
  select: () => select,
  update: () => update,
  upsert: () => upsert
});
var enc = encodeURIComponent;
var shortName = (n) => { const v = String(n || "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+(Pty\.?\s*Ltd\.?|Pty|Ltd)\.?$/i, "").replace(/\s+/g, " ").trim(); return v.length >= 3 ? v : String(n || "").trim(); };
// Keep ONE callable number: "(07) 3839 8228 (CBD); (07) 3207 9000" -> "(07) 3839 8228".
function onePhone(v) {
  if (v == null) return v;
  const raw = String(v).trim();
  if (!raw) return null;
  for (const part of raw.split(/\s*(?:;|,|\/|\||\bor\b|&|\band\b|\n)\s*/i)) {
    const clean = part.replace(/\([^)]*[a-z][^)]*\)/gi, " ").replace(/[a-z:]+/gi, " ").replace(/[^\d+()\s-]/g, " ").replace(/\s+/g, " ").trim();
    if (clean.replace(/\D/g, "").length >= 8) return clean.replace(/^[-\s]+|[-\s(]+$/g, "");
  }
  return raw.slice(0, 40);
}
const phoneRows = (b) => Array.isArray(b) ? b.map((r) => r && typeof r === "object" && "phone" in r ? { ...r, phone: onePhone(r.phone) } : r) : b && typeof b === "object" && "phone" in b ? { ...b, phone: onePhone(b.phone) } : b;
async function call(env, method, path, body, prefer) {
  if (body && /^agent_prospects(\?|$)/.test(path) && (method === "POST" || method === "PATCH")) body = phoneRows(body);
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body === void 0 ? void 0 : JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`Supabase ${method} ${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}
var select = (env, table, query = "") => call(env, "GET", `${table}?${query}`);
var insert = async (env,table,rows) => {
  const saved=await call(env,"POST",table,rows,"return=representation");
  if(['team_messages','team_reports','team_audit','team_actions'].includes(table))await archiveExistingRows(env,table,saved).catch(e=>console.error('Archive copy needs backfill:',table,e.message));
  return saved;
};
var upsert = (env, table, rows, onConflict) => call(env, "POST", `${table}?on_conflict=${onConflict}`, rows, "resolution=merge-duplicates,return=representation");
var insertIgnore = async (env,table,rows,onConflict) => { const saved=await call(env,"POST",`${table}?on_conflict=${onConflict}`,rows,"resolution=ignore-duplicates,return=representation");if(table==="team_actions")await archiveExistingRows(env,table,saved).catch(e=>console.error("Action archive:",e.message));return saved; };
var update = async (env,table,query,patch) => { const saved=await call(env,"PATCH",`${table}?${query}`,patch,"return=representation");if(table==="team_actions")await archiveExistingRows(env,table,saved).catch(e=>console.error("Action archive:",e.message));return saved; };
var now = () => (/* @__PURE__ */ new Date()).toISOString();
var hoursAgo = (h) => new Date(Date.now() - h * 36e5).toISOString();
var remove = (env, table, query) => call(env, "DELETE", `${table}?${query}`);

