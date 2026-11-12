// ── v61: save Claude tokens without losing quality.
// (1) Free AI (Cloudflare Workers AI, runs inside Cloudflare, needs the "AI" binding) does a few internal-only jobs.
//     Its answer must pass a strict check; otherwise Claude does the job as before. Nothing client-facing uses it.
// (2) Prompt caching on every long Claude prompt (in callClaude), so repeated instructions cost about a tenth. ──
var FREE_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
function freeValid(schema, o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  for (const k of schema?.required || []) if (o[k] == null || o[k] === "") return false;
  for (const [k, p] of Object.entries(schema?.properties || {})) {
    if (o[k] == null) continue;
    if (p.enum && !p.enum.includes(o[k])) return false;
    if (p.type === "string" && typeof o[k] !== "string") return false;
  }
  return true;
}
async function freeAsk(env, body, toolName) {
  if (!env.AI || typeof env.AI.run !== "function") return null;
  const tool = (body.tools || []).find((t) => t.name === toolName);
  if (!tool?.input_schema) return null;
  const msgs = body.messages || [];
  if (msgs.some((m) => typeof m.content !== "string")) return null; // text only
  const sys = (typeof body.system === "string" ? body.system : (body.system || []).map((b) => b.text || "").join("\n")) + `\n\nReply with ONLY a JSON object for "${toolName}" matching this schema: ${JSON.stringify(tool.input_schema)}`;
  try {
    const r = await Promise.race([
      env.AI.run(env.FREE_AI_MODEL || FREE_AI_MODEL, { messages: [{ role: "system", content: sys }, ...msgs], max_tokens: Math.min(body.max_tokens || 800, 1500), response_format: { type: "json_schema", json_schema: tool.input_schema } }),
      new Promise((_, no) => setTimeout(() => no(new Error("free AI timeout")), 2e4))
    ]);
    let o = r?.response ?? r;
    if (typeof o === "string") { const m = o.match(/\{[\s\S]*\}/); o = m ? JSON.parse(m[0]) : null; }
    if (!freeValid(tool.input_schema, o)) return null;
    await insert(env, "team_usage", [{ department: "chief_of_staff", source: "free_ai:" + toolName, model: env.FREE_AI_MODEL || FREE_AI_MODEL, calls: 1, cost_usd: 0, cost_aud: 0 }]).catch(() => {});
    return o;
  } catch (e) { console.error("free AI:", String(e.message || e).slice(0, 160)); return null; }
}
