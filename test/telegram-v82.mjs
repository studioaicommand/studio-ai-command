// v82: type your own reply, or tell the team what to change, straight from a Telegram approval card.
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_actions: [
  { id: "a1", type: "ghl_sms", title: "Text Jess about Saturday", department: "head_of_sales", status: "pending", params: { contact_id: "c1", message: "Hi Jess, are you free Saturday?" }, created_at: new Date().toISOString() },
  { id: "a2", type: "owner_task", title: "Call Matty", department: "chief_of_staff", status: "pending", params: { details: "Call him" }, created_at: new Date().toISOString() },
  { id: "a3", type: "ghl_sms", title: "Text Sam", department: "head_of_sales", status: "pending", params: { contact_id: "c2", message: "Hi Sam" }, created_at: new Date().toISOString() }], team_audit: [], team_memory: [] };
let seq = 0; const log = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "is") return m[2] === "null" ? r[k] == null : true; return true; });
let tgId = 100; const tgs = []; const ghl = []; const ai = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.telegram.org")) { const meth = u.split("/").pop(); const id = ++tgId; tgs.push({ meth, id, ...body }); return Response.json({ ok: true, result: { message_id: id } }); }
  if (u.includes("leadconnectorhq.com")) { ghl.push(body); return Response.json({ ok: true, messageId: "m1", conversationId: "cv1" }); }
  if (u.includes("api.anthropic.com")) { ai.push(JSON.stringify(body.messages).slice(0, 3000)); return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  return new Response("{}", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const SECRET = crypto.createHash("sha256").update("k|telegram").digest("hex").slice(0, 48);
const hook = async (upd) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/telegram/hook", { method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": SECRET }, body: JSON.stringify({ update_id: ++seq, ...upd }) }), env, ctx); await flush(); return r; };
const from = { username: "studioflowandsystems", id: 42 };

await hook({ callback_query: { id: "cb1", data: "rw:a1", from, message: { message_id: 5, chat: { id: 42 }, text: "Text Jess" } } });
const prompt = tgs.find((x) => x.meth === "sendMessage" && x.reply_markup && x.reply_markup.force_reply);
assert(prompt && /Type your reply/.test(prompt.text), "Tapping \"Reply in my words\" opens a reply box on Telegram");
await hook({ message: { message_id: 9, chat: { id: 42 }, from, text: "Hey Jess! Saturday 10am works, see you then", reply_to_message: { message_id: prompt.id } } });
const a1 = DB.team_actions.find((a) => a.id === "a1");
assert(a1.status === "done" && a1.params.message === "Hey Jess! Saturday 10am works, see you then" && JSON.stringify(ghl).includes("Saturday 10am works"), "What Ty types is sent word for word, and the card is done");

tgs.length = 0;
await hook({ callback_query: { id: "cb2", data: "rn:a2", from, message: { message_id: 6, chat: { id: 42 }, text: "Call Matty" } } });
const p2 = tgs.find((x) => x.meth === "sendMessage" && x.reply_markup && x.reply_markup.force_reply);
assert(p2 && /What should change/.test(p2.text), "Tapping \"Change it\" asks what to change");
ai.length = 0;
await hook({ message: { message_id: 10, chat: { id: 42 }, from, text: "Make it Monday morning instead, not today", reply_to_message: { message_id: p2.id } } });
const a2 = DB.team_actions.find((a) => a.id === "a2");
assert(a2.status === "rejected" && /Monday morning/.test(JSON.stringify(a2.result)) && ai.some((x) => /Monday morning instead/.test(x) && /Call Matty/.test(x)), "The team redoes it with Ty's note (the old one is set aside)");
assert(tgs.some((x) => x.meth === "sendMessage" && /redoing it with your note/.test(x.text || "")), "Ty is told the new version is on its way");

await hook({ callback_query: { id: "cb3", data: "rw:a2", from, message: { message_id: 6, chat: { id: 42 }, text: "x" } } });
assert(tgs.some((x) => x.meth === "answerCallbackQuery" && /already been handled/.test(x.text)), "A card that's already handled says so");

// replying straight to the card: "send: ..." sends exact words
const sp = DB.team_settings.find((x) => x.key === "tg_prompts"); sp.value["777"] = { id: "a3", mode: "card", at: new Date().toISOString() };
await hook({ message: { message_id: 11, chat: { id: 42 }, from, text: "send: Hi Sam, all sorted for Friday", reply_to_message: { message_id: 777 } } });
assert(DB.team_actions.find((a) => a.id === "a3").params.message === "Hi Sam, all sorted for Friday", "Replying to a card with \"send: …\" sends those exact words");
console.log("telegram-v82 OK");
