// Local stand-in for studioflowandsystems.app: the real worker code, mocked upstream services.
import http from "node:http";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const BOOKED = [];
export const log = { anthropic: [], ghl: [], tg: [], voice: [], hang: [] };
const f0 = globalThis.fetch;
globalThis.MOCK = { down: false };
globalThis.fetch = async (u, init = {}) => {
  u = String(u);
  if (u.includes("challenges.cloudflare.com/turnstile/v0/siteverify")) return Response.json({ success: true, hostname: "www.studioflowandsystems.com", action: "studio_site" });
  if (u.startsWith("https://api.anthropic.com")) {
    const b = JSON.parse(init.body); log.anthropic.push(b);
    if (globalThis.MOCK.down) return new Response("{}", { status: 529 });
    const last = b.messages[b.messages.length - 1];
    if (Array.isArray(last.content)) {
      const name = b.messages[b.messages.length - 2].content.find((c) => c.type === "tool_use")?.name;
      return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: name === "prepare_enquiry" ? "I've put your details below. Check them and tap **Send to Ty** when you're happy." : "Here you go. Ty's calendar is below: once you pick a time, the calendar sends your confirmation." }] });
    }
    const q = String(last.content).toLowerCase();
    if (q.startsWith("i'd like ")) {
      const hist = b.messages.map((m) => typeof m.content === "string" ? m.content : "").join("\n");
      const note = hist.match(/\[Times offered[^\]]*\]/g)?.pop() || "";
      const label = String(last.content).slice(9).trim();
      const m = note.split("; ").map((x) => x.replace(/^\[Times offered[^:]*: /, "").replace(/\]$/, "")).find((x) => x.startsWith(label));
      return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tb", name: "prepare_booking", input: { start: m ? m.split(" = ")[1] : "bad", name: "Sam Lee", email: "sam@leephysio.com.au", business: "Lee Physio", answers: "3-physio clinic; phone enquiries go to voicemail after 5pm" } }] });
    }
    if (q.includes("times")) return Response.json({ stop_reason: "tool_use", content: [{ type: "text", text: "Here are Ty's next free times." }, { type: "tool_use", id: "tf", name: "find_times", input: { days: 5 } }] });
    if (q.includes("book")) return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "suggest_next_step", input: { steps: ["book_call"] } }] });
    if (q.includes("pilot") || q.includes("price")) return Response.json({ stop_reason: "tool_use", content: [{ type: "text", text: "For clinics there are two founding pilots:\n- **Chat AI**: A$497 for 30 days\n- **Chat + Voice**: A$697 for 30 days, then A$797/month\n\nNeither connects your phone line; that's a separate, scoped service." }, { type: "tool_use", id: "t2", name: "suggest_next_step", input: { steps: ["checkout_voice", "book_call"] } }] });
    if (q.includes("contact me") || q.includes("my details")) return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t3", name: "prepare_enquiry", input: { name: "Sam Lee", business: "Lee Physio", email: "sam@leephysio.com.au", interest: "voice_receptionist", message: "After-hours enquiries for a 3-practitioner physio clinic." } }] });
    return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "Great question. I'm Studio AI: I answer enquiries, explain services and guide people to book, day or night. What kind of business do you run?" }] });
  }
  if (u === "https://api.openai.com/v1/realtime/calls") { log.voice.push(JSON.parse(init.body.get("session"))); return new Response("v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n", { status: 201, headers: { Location: "/v1/realtime/calls/rtc_local1" } }); }
  if (u.includes("/hangup")) { log.hang.push(u); return new Response("{}"); }
  if (u.includes("sb.test")) { if (u.includes("key=eq.offer")) return Response.json([{ value: {} }]); if (u.includes("key=eq.telegram")) return Response.json([{ value: { chat_id: 1 } }]); return Response.json([]); }
  if (u.includes("/free-slots")) { const t = new Date(Date.now() + 86400000); t.setUTCHours(0, 0, 0, 0); return Response.json({ x: { slots: [0, 1, 4, 5, 6].map((h) => new Date(t.getTime() + h * 3600000).toISOString()).filter((x) => !BOOKED.includes(x)) } }); }
  if (u.includes("/appointments") && (init.method || "GET") === "GET") return Response.json({ events: [] });
  if (u.endsWith("/calendars/events/appointments")) { log.ghl.push({ u }); BOOKED.push(JSON.parse(init.body).startTime); return Response.json({ id: "appt1" }); }
  if (u.startsWith("https://services.leadconnectorhq.com")) { log.ghl.push({ u, body: init.body && JSON.parse(init.body) }); return Response.json(u.endsWith("/upsert") ? { contact: { id: "c1" } } : { ok: true }); }
  if (u.startsWith("https://api.telegram.org")) { log.tg.push(JSON.parse(init.body)); return Response.json({ ok: true }); }
  return f0(u, init);
};
const mod = await import(W);
const inst = new Map();
function storage() { const m = new Map(); const api = { get: async (k) => structuredClone(m.get(k)), put: async (k, v) => { m.set(k, structuredClone(v)); }, setAlarm: async () => {}, transaction: async (fn) => fn(api) }; return api; }
export const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "studio-key", ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", TURNSTILE_SITE_KEY: "1x00000000000000000000AA", TURNSTILE_SECRET_KEY: "s", STUDIO_PUBLIC_LIMIT_SECRET: "x".repeat(40), SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", GHL_PRIVATE_TOKEN: "g", GHL_LOCATION_ID: "loc", TELEGRAM_BOT_TOKEN: "1:b", STUDIO_SITE_ORIGINS: "http://127.0.0.1:8900", STUDIO_SITE_SESSION_MINUTES: process.env.SESSION_MIN || "20", STUDIO_SITE_VISITOR_DAILY: "50" };
env.STUDIO_PUBLIC_TRIALS = { idFromName: (n) => n, get: (id) => { if (!inst.has(id)) { const ctx = { storage: storage() }; inst.set(id, { ctx, obj: new mod.PublicTrialGuard(ctx, env) }); } const i = inst.get(id); return { fetch: (u, x) => i.obj.fetch(new Request(u, x)) }; } };
export const instances = inst;
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  if (req.url === "/__log") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ booked: BOOKED.length, ghl: log.ghl.length, tg: log.tg.length, voice: log.voice.length, hang: log.hang.length, sys: log.anthropic[0]?.system?.slice(0, 80) })); }
  if (req.url === "/__down") { globalThis.MOCK.down = !globalThis.MOCK.down; res.end(String(globalThis.MOCK.down)); return; }
  if (req.url === "/__expire") { const i = inst.get("studio-site-assistant-v1"); const s = await i.ctx.storage.get("site"); for (const v of Object.values(s.sessions)) v.expires = Date.now() - 1; await i.ctx.storage.put("site", s); res.end("ok"); return; }
  const headers = { ...req.headers, "cf-connecting-ip": "203.0.113.9" };
  const r = await mod.default.fetch(new Request("https://studioflowandsystems.app" + req.url, { method: req.method, headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(chunks) }), env, { waitUntil() {} });
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8901, () => console.log("backend on 8901"));
