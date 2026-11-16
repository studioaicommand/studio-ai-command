// v126 Command Link on Windows: setup gives a PowerShell line, the installer (run for real in PowerShell, with the Windows-only bits stood in) downloads the helper, starts at login, opens pages, and removes itself when unlinked.
let AG = "6";
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
let seq = 0;
const TOK = "a".repeat(64), now = () => new Date().toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }, { key: "mac_link", value: { token_hash: crypto.createHash("sha256").update(TOK).digest("hex"), last_seen: now(), agent: 5 } }], team_actions: [], team_audit: [], team_usage: [], agent_prospects: [] };
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|in|is)\.(.*)$/); if (!m) return true; if (m[1] === "eq") return String(r[k] ?? "") === m[2]; if (m[1] === "is") return m[2] === "true" ? r[k] === true : r[k] == null; return m[2].replace(/[()]/g, "").split(",").includes(String(r[k])); });
let nextAct = null; const tg = [];
const toolUse = (name, input) => Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name, input }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } });
let writer = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { let rows = t.filter((r) => match(r, q)); const lim = +(q.match(/limit=(\d+)/) || [])[1]; return Response.json(lim ? rows.slice(0, lim) : rows); }
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), created_at: now(), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { const s = JSON.stringify(body.system || "");
    if ((body.tools || []).some((t) => t.name === "browser_action")) return toolUse("browser_action", nextAct);
    if (s.includes("You are the DM Reviewer")) return toolUse("review_dm", { score: 9 });
    if (s.includes("You are the DM Writer")) return toolUse("save_dm", writer.shift() || { found: false });
    return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: O };
const call = (path, b) => w.fetch(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) }));
const agent = (path, b) => w.fetch(new Request(O + "/api/v1/link/" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOK, "X-SF-Agent": AG }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then((r) => r.json());
const task = () => DB.team_settings.find((x) => x.key === "browser_task")?.value;
const page = (url, els = []) => ({ url, title: "page", text: "page", elements: els });
import http from "node:http"; import { execFileSync, spawn } from "node:child_process"; import fs from "node:fs"; import path from "node:path";
const pwsh = ["/opt/pwsh/pwsh", "/usr/bin/pwsh", "/usr/local/bin/pwsh"].find((f) => fs.existsSync(f));
DB.team_settings.find((x) => x.key === "mac_link").value = { token_hash: null };

// a local copy of Command that PowerShell can talk to
const srv = http.createServer(async (req, res) => { const chunks = []; for await (const c of req) chunks.push(c);
  const r = await w.fetch(new Request(O + req.url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined }), env, { waitUntil() {} });
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); });
await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
const LOCAL = "http://127.0.0.1:" + srv.address().port;
const lget = (u) => new Promise((ok, no) => http.get(u, (rs) => { let b = ""; rs.on("data", (c) => (b += c)); rs.on("end", () => ok({ status: rs.statusCode, ok: rs.statusCode < 300, text: async () => b })); }).on("error", no));

let r = await call("/mac-link/setup", {});
assert(r.j.ok && /^powershell -NoProfile -ExecutionPolicy Bypass -Command "irm '.+\/link\/install\/[a-f0-9]{24}\?os=win' \| iex"$/.test(r.j.command_win) && /\| zsh$/.test(r.j.command), "Setup gives a Mac line and a Windows PowerShell line");
const code = r.j.command_win.match(/install\/([a-f0-9]{24})/)[1];
const res = await lget(LOCAL + "/link/install/" + code + "?os=win");
let script = await res.text();
const token = (script.match(/\$T = '([a-f0-9]{64})'/) || [])[1];
assert(res.ok && token && !/__TOKEN__|__ORIGIN__/.test(script) && /Startup/.test(script) && /api\/v1\/link\/agent/.test(script), "The Windows installer comes with this PC's own token, and fetches the helper from Command");
assert(DB.team_settings.find((x) => x.key === "mac_link").value.os === "win32", "Command remembers it's a Windows PC");
const again = await lget(LOCAL + "/link/install/" + code + "?os=win");
assert(again.status === 404 && /^Write-Host/.test(await again.text()), "The code works once (an expired code gives a PowerShell-friendly message)");
let st = await call("/mac-link");
assert(st.j.os === "win32" && st.j.linked, "Settings shows it as a linked PC");
const app = await (await w.fetch(new Request(O + "/command-next"), env, { waitUntil() {} })).text().catch(() => "");

if (!pwsh) console.log("(PowerShell isn't installed here, so the installer run is skipped; CI runs it)");
else {
  // stand-ins for the Windows-only parts: AppData, the Startup folder, other processes, and starting things
  const tmp = fs.mkdtempSync("/tmp/claude-0/win-"), startup = path.join(tmp, "Startup");
  fs.mkdirSync(startup); fs.mkdirSync(path.join(tmp, "AppData"));
  const pre = "function Get-CimInstance { @() }\nfunction Start-Process { param($FilePath, $ArgumentList) Add-Content -Path '" + tmp + "/started.txt' -Value ([string]$FilePath + ' ' + [string]$ArgumentList) }\n";
  const win = (s) => pre + s.split("[Environment]::GetFolderPath('Startup')").join("'" + startup + "'").split("$env:LOCALAPPDATA").join("'" + tmp + "/AppData'").replace(/'https:\/\/studioflowandsystems\.app'/g, "'" + LOCAL + "'");
  fs.writeFileSync(tmp + "/install.ps1", win(script));
  const out = await new Promise((ok) => { let o = ""; const ch = spawn(pwsh, ["-NoProfile", "-File", tmp + "/install.ps1"]); ch.stdout.on("data", (d) => (o += d)); ch.stderr.on("data", (d) => (o += d)); ch.on("close", () => ok(o)); });
  if (process.env.DBG) console.log(out);
  const dir = tmp + "/AppData/StudioCommandLink";
  const agentSrc = fs.existsSync(dir + "/agent.mjs") ? fs.readFileSync(dir + "/agent.mjs", "utf8") : "";
  assert(agentSrc === fs.readFileSync(new URL("../link-agent.mjs", import.meta.url), "utf8"), "With Node.js there, the installer downloads the latest helper");
  const vbs = fs.readFileSync(startup + "/StudioCommandLink.vbs", "utf8");
  assert(/WScript\.Shell"\)\.Run "powershell\.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & ".+StudioCommandLink[\\/](run|link)\.ps1" & """", 0, False/.test(vbs), "It starts hidden whenever Windows starts (Startup folder)");
  assert(/wscript\.exe/.test(fs.readFileSync(tmp + "/started.txt", "utf8")) && /Command Link is on/.test(out), "And it starts straight away");
  // the basic loop (runs everywhere): opens a page Command asks for, then removes itself when unlinked
  const lp = fs.readFileSync(dir + "/link.ps1", "utf8");
  assert(lp.includes(token) && !/__TOKEN__/.test(lp), "The page opener has this PC's token");
  fs.writeFileSync(tmp + "/link-test.ps1", win(lp));
  DB.team_settings.find((x) => x.key === "mac_link").value.last_seen = now();
  const op = await call("/mac-link/test", {});
  assert(op.j.opened, "Command sends a page to open");
  const child = spawn(pwsh, ["-NoProfile", "-File", tmp + "/link-test.ps1"]);
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await f(); if (v) return v; await new Promise((ok) => setTimeout(ok, 300)); } return null; };
  const opened = await until(() => fs.existsSync(tmp + "/started.txt") && /command-next/.test(fs.readFileSync(tmp + "/started.txt", "utf8")), 30000);
  assert(opened, "The PC opens it in the browser");
  await call("/mac-link/off", {});
  const gone = await until(() => !fs.existsSync(startup + "/StudioCommandLink.vbs") && child.exitCode !== null, 30000);
  assert(gone, "Unlink stops it and removes it from Windows startup");
  child.kill();

  // full mode: Node.js + npm present, so the browser helper is installed and run (npm.cmd stood in by the real npm)
  const bin = fs.mkdtempSync("/tmp/claude-0/winbin-"); fs.symlinkSync(process.execPath, bin + "/node"); fs.symlinkSync(path.join(path.dirname(process.execPath), "npm"), bin + "/npm.cmd");
  r = await call("/mac-link/setup", {});
  const code2 = r.j.command_win.match(/install\/([a-f0-9]{24})/)[1];
  script = await (await lget(LOCAL + "/link/install/" + code2 + "?os=win")).text();
  const tmp2 = fs.mkdtempSync("/tmp/claude-0/win2-"); fs.mkdirSync(tmp2 + "/Startup"); fs.mkdirSync(tmp2 + "/AppData");
  const win2 = (s) => win(s).split(tmp + "/").join(tmp2 + "/");
  fs.writeFileSync(tmp2 + "/install.ps1", win2(script));
  const out2 = await new Promise((ok) => { let o = ""; const ch = spawn(pwsh, ["-NoProfile", "-File", tmp2 + "/install.ps1"], { env: { ...process.env, PATH: bin + ":" + process.env.PATH } }); ch.stdout.on("data", (d) => (o += d)); ch.stderr.on("data", (d) => (o += d)); ch.on("close", () => ok(o)); });
  const dir2 = tmp2 + "/AppData/StudioCommandLink";
  assert(/Command Link is on\. Command can open pages in Chrome and run browser tasks/.test(out2) && fs.existsSync(dir2 + "/node_modules/playwright-core") && fs.existsSync(dir2 + "/run.ps1"), "With Node.js, it installs the browser helper too (full mode)");
  assert(/run\.ps1/.test(fs.readFileSync(tmp2 + "/Startup/StudioCommandLink.vbs", "utf8")), "Windows starts the browser helper at login");
  fs.writeFileSync(tmp2 + "/run-test.ps1", win2(fs.readFileSync(dir2 + "/run.ps1", "utf8")));
  const ch2 = spawn(pwsh, ["-NoProfile", "-File", tmp2 + "/run-test.ps1"], { env: { ...process.env, SF_HEADLESS: "1" } });
  const checked = await until(() => { const c = DB.team_settings.find((x) => x.key === "mac_link").value; return c.token_hash && c.agent >= 6 && c.last_seen; }, 40000);
  assert(checked, "The browser helper checks in with Command");
  await call("/mac-link/off", {});
  const gone2 = await until(() => !fs.existsSync(tmp2 + "/Startup/StudioCommandLink.vbs") && ch2.exitCode !== null, 40000);
  assert(gone2, "Unlink stops the browser helper for good and removes it from Windows startup");
  ch2.kill();
}
const agentCode = fs.readFileSync(new URL("../link-agent.mjs", import.meta.url), "utf8");
assert(/function openInChrome/.test(agentCode) && /chrome\.exe/.test(agentCode) && /rundll32\.exe/.test(agentCode) && !/execFile\('cmd/.test(agentCode), "On Windows the helper opens Chrome directly (never through a shell)");
assert(/X-SF-OS/.test(agentCode), "The helper tells Command which kind of computer it's on");
srv.close();
console.log("v126 windows OK");
