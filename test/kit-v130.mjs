// v130: the Client setup kit makes a SEPARATE client copy from Studio's LIVE version, with plan and brief.
import http from "node:http"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { spawn } from "node:child_process";
let pass = 0, fail = 0; const assert = (c, m) => { if (c) { pass++; console.log("✓ " + m); } else { fail++; console.log("FAIL: " + m); } };
const LIVE = 'var APP = { "v": "abcdef1234" };\n' + "x".repeat(600000) + "\nexport default {};";
const seen = { uploads: {}, setup: null, liveFetched: 0 };
const srv = http.createServer(async (q, r) => {
  let b = ""; for await (const c of q) b += c;
  const u = new URL(q.url, "http://x"), p = u.pathname, J = (o, s = 200) => { r.writeHead(s, { "content-type": "application/json" }); r.end(JSON.stringify(o)); };
  if (p === "/sb/v1/organizations") return J([{ slug: "org" }]);
  if (p === "/sb/v1/projects" && q.method === "POST") return J({ id: "ref1" });
  if (p === "/sb/v1/projects/ref1") return J({ status: "ACTIVE_HEALTHY" });
  if (p === "/sb/v1/projects/ref1/database/query") return J([]);
  if (p === "/sb/v1/projects/ref1/api-keys") return J([{ name: "service_role", api_key: "svc" }]);
  if (p === "/cf/accounts") return J({ success: true, result: [{ id: "acc" }] });
  if (p === "/cf/accounts/acc/workers/scripts/studio-intelligence-core-cb9c/content/v2") { seen.liveFetched++; r.writeHead(200); return r.end(LIVE); }
  if (/^\/cf\/accounts\/acc\/workers\/scripts\/command-[a-z0-9-]+\/schedules$/.test(p)) return J({ success: true });
  if (/^\/cf\/accounts\/acc\/workers\/scripts\/command-[a-z0-9-]+$/.test(p) && q.method === "PUT") { seen.uploads[p.split("/").pop()] = b; return J({ success: true }); }
  if (p === "/cf/zones") return J({ success: true, result: [{ id: "z" }] });
  if (p === "/cf/accounts/acc/workers/domains") return J({ success: true, result: {} });
  if (p === "/client/health") return J({ ok: true });
  if (p === "/client/api/v1/setup") { seen.setup = JSON.parse(b); return J({ ok: true, invites: [{ name: "Sam Lee", role: "owner", link: "https://harbour-physio.studioflowandsystems.app/command-next#invite=t" }] }); }
  J({ error: "unknown " + p }, 404);
});
await new Promise((ok) => srv.listen(0, ok));
const port = srv.address().port, base = "http://127.0.0.1:" + port;
const root = fs.mkdtempSync(path.join(os.tmpdir(), "kit-")), kit = path.join(root, "Client setup kit");
fs.mkdirSync(kit); for (const f of ["New client Command.command", "install.sql"]) fs.copyFileSync(path.join("kit", f), path.join(kit, f));
fs.mkdirSync(path.join(root, "1 Deploy Now")); fs.writeFileSync(path.join(root, "1 Deploy Now", "worker-v56-old.js"), 'var APP = { "v": "0ld0ld0ld0" };\n};');
const answers = ["Harbour Physio", "", "Sam Lee", "", "allied_health", "physiotherapy clinic", "https://harbourphysio.com.au", "", "Noosa QLD", "#1f7a8c", "", "", "growth", "Physio clinic. Initial consult $110, follow-up $90.", "sbtok", "cftok", "anth", "", "", "", ""].join("\n") + "\n";
const run = await new Promise((ok) => { const c = spawn("bash", [path.join(kit, "New client Command.command")], { env: { ...process.env, SB_API: base + "/sb", CF_API: base + "/cf", CLIENT_URL_BASE: base + "/client", POLL_SECONDS: "0", NO_OPEN: "1" } }); let so = "", se = ""; c.stdout.on("data", (d) => so += d); c.stderr.on("data", (d) => se += d); const t = setTimeout(() => c.kill(), 60000); c.on("close", (code) => { clearTimeout(t); ok({ status: code, stdout: so, stderr: se }); }); c.stdin.end(answers); });
const out = (run.stdout || "") + (run.stderr || "");
assert(run.status === 0, "Kit finishes (exit " + run.status + ")" + (run.status ? "\n" + out.slice(-800) : ""));
assert(seen.liveFetched === 1 && /abcdef1234/.test(out), "Kit copies Studio's LIVE Command version, not the old file in 1 Deploy Now");
const up = seen.uploads["command-harbour-physio"] || "";
assert(up.includes('"v": "abcdef1234"') && !up.includes("0ld0ld0ld0"), "Client's own worker gets the live code");
assert(/SETUP_TOKEN/.test(up) && /FLEET_TOKEN/.test(up) && /SUPABASE_URL/.test(up) && /ref1\.supabase\.co/.test(up), "Client's worker has its own database and its own keys");
assert(seen.setup?.tier === "company" && /Initial consult \$110/.test(seen.setup?.instance?.brief || ""), "Plan (Growth) and the business brief are sent to the new copy");
const m = seen.setup?.instance?.modules || {};
assert(m.outreach === false && m.social_outreach === false && m.offers_page === false, "Studio-only features are off on the new copy");
const saved = fs.existsSync(path.join(root, "Client setups")) ? fs.readdirSync(path.join(root, "Client setups")) : [];
assert(saved.some((f) => /harbour-physio/.test(f)), "Private details saved in Client setups");
srv.close(); fs.rmSync(root, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`); if (fail) process.exit(1);
